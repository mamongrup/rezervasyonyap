//// Gezi rotaları (trip_planner) + mavi yolculuk (blue_cruise_routes) — AI kuyruk ve işleme.
////
//// GET  /api/v1/ai/trip-routes/stats?profile=trip_planner|blue_cruise_routes
//// POST /api/v1/ai/trip-routes/queue-all?profile=...
//// POST /api/v1/ai/trip-routes/process-next?profile=...
//// POST /api/v1/ai/trip-routes/reset-stuck?profile=...

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

const profile_trip_planner = "trip_planner"
const profile_blue_cruise = "blue_cruise_routes"
const col_trip_routes = "trip_routes_json"
const col_blue_cruise = "blue_cruise_routes_json"

const coastal_region_slugs =
  "('mugla','antalya','izmir','aydin','balikesir','canakkale','mersin','hatay','istanbul','tekirdag')"

pub type RouteProfileKind {
  TripPlanner
  BlueCruiseRoutes
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn profile_from_query(req: Request) -> Result(RouteProfileKind, Response) {
  case list.key_find(wisp.get_query(req), "profile") {
    Error(_) -> Error(json_err(400, "profile_query_required"))
    Ok(raw) ->
      case string.lowercase(string.trim(raw)) {
        "trip_planner" -> Ok(TripPlanner)
        "blue_cruise_routes" -> Ok(BlueCruiseRoutes)
        _ -> Error(json_err(400, "invalid_profile"))
      }
  }
}

fn profile_code(kind: RouteProfileKind) -> String {
  case kind {
    TripPlanner -> profile_trip_planner
    BlueCruiseRoutes -> profile_blue_cruise
  }
}

fn json_column(kind: RouteProfileKind) -> String {
  case kind {
    TripPlanner -> col_trip_routes
    BlueCruiseRoutes -> col_blue_cruise
  }
}

fn stats_row() -> decode.Decoder(#(String, Int)) {
  use status <- decode.field(0, decode.string)
  use cnt <- decode.field(1, decode.int)
  decode.success(#(status, cnt))
}

fn location_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use lp_id <- decode.field(0, decode.string)
  use loc_name <- decode.field(1, decode.string)
  use region_name <- decode.field(2, decode.string)
  use country_name <- decode.field(3, decode.string)
  use region_type <- decode.field(4, decode.string)
  use ideas_json <- decode.field(5, decode.string)
  decode.success(#(lp_id, loc_name, region_name, country_name, region_type, ideas_json))
}

fn job_output_row() -> decode.Decoder(#(String, String, String)) {
  use job_id <- decode.field(0, decode.string)
  use lp_id <- decode.field(1, decode.string)
  use out_text <- decode.field(2, decode.string)
  decode.success(#(job_id, lp_id, out_text))
}

fn coastal_filter_sql(kind: RouteProfileKind) -> String {
  case kind {
    TripPlanner -> ""
    BlueCruiseRoutes ->
      "
        and (
          lower(coalesce(reg.slug, '')) in "
      <> coastal_region_slugs
      <> "
          or lower(coalesce(pr.slug, '')) in "
      <> coastal_region_slugs
      <> "
        )
      "
  }
}

fn find_locations_sql(kind: RouteProfileKind) -> String {
  let col = json_column(kind)
  let coastal = coastal_filter_sql(kind)
  "
    select
      lp.id::text,
      coalesce(nullif(trim(lp.title), ''), d.name, reg.name, dest.name, lp.slug_path) as location_name,
      coalesce(reg.name, pr.name, '') as region_name,
      coalesce(co.name, '') as country_name,
      coalesce(lp.region_type, 'district') as region_type,
      coalesce(lp.travel_ideas_json::text, '[]') as ideas_json
    from location_pages lp
    left join districts d on d.id = lp.district_id
    left join regions reg on reg.id = coalesce(lp.region_id, d.region_id)
    left join regions pr on pr.id = d.region_id
    left join regions dest on dest.id = lp.region_id and lp.region_type = 'destination'
    left join countries co on co.id = coalesce(reg.country_id, pr.country_id)
    where lp.region_type in ('district', 'province', 'destination')
      and coalesce(jsonb_array_length(lp."
    <> col
    <> "), 0) = 0"
    <> coastal
    <> "
      and lp.id::text not in (
        select input_json->>'location_page_id'
        from ai_jobs
        where profile_code = $1
          and status in ('queued','running')
      )
    order by co.name, region_name, location_name
    limit 500
    "
}

fn trip_instruction() -> String {
  "Görev: Verilen bölge için 1–2 günlük gezi rotası JSON dizisi üret. travel_ideas_json içindeki mekanları mümkünse durak olarak kullan. Sadece JSON array döndür."
}

fn cruise_instruction() -> String {
  "Görev: Verilen kıyı bölgesi için mavi yolculuk rotası JSON dizisi üret. Denize uzak ise []. Sadece JSON array döndür."
}

fn instruction_for(kind: RouteProfileKind) -> String {
  case kind {
    TripPlanner -> trip_instruction()
    BlueCruiseRoutes -> cruise_instruction()
  }
}

pub fn get_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case profile_from_query(req) {
        Error(r) -> r
        Ok(kind) -> get_stats_for(ctx, kind)
      }
  }
}

fn get_stats_for(ctx: Context, kind: RouteProfileKind) -> Response {
  let pc = profile_code(kind)
  let col = json_column(kind)
  let total_sql =
    "select count(*)::int from location_pages where region_type in ('district','province','destination')"
  let has_sql =
    "select count(*)::int from location_pages where region_type in ('district','province','destination') and coalesce(jsonb_array_length("
    <> col
    <> "), 0) > 0"
  let empty_sql =
    "select count(*)::int from location_pages where region_type in ('district','province','destination') and coalesce(jsonb_array_length("
    <> col
    <> "), 0) = 0"
  let jobs_sql =
    "select status, count(*)::int from ai_jobs where profile_code = $1 group by status"
  let int_col0 = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case pog.query(total_sql) |> pog.returning(int_col0) |> pog.execute(ctx.db) {
    Error(_) -> json_err(500, "trip_routes_stats_total_failed")
    Ok(tr) -> {
      let total = case tr.rows {
        [n] -> n
        _ -> 0
      }
      case
        pog.query(has_sql)
        |> pog.returning(int_col0)
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "trip_routes_stats_has_failed")
        Ok(hr) -> {
          let has_routes = case hr.rows {
            [n] -> n
            _ -> 0
          }
          case pog.query(empty_sql) |> pog.returning(int_col0) |> pog.execute(ctx.db) {
            Error(_) -> json_err(500, "trip_routes_stats_empty_failed")
            Ok(er) -> {
              let empty_n = case er.rows {
                [n] -> n
                _ -> 0
              }
              case
                pog.query(jobs_sql)
                |> pog.parameter(pog.text(pc))
                |> pog.returning(stats_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "trip_routes_stats_jobs_failed")
                Ok(jr) -> {
                  let job_counts =
                    list.map(jr.rows, fn(row) {
                      let #(status, cnt) = row
                      #(status, json.int(cnt))
                    })
                  let body =
                    json.object([
                      #("profile", json.string(pc)),
                      #("total_locations", json.int(total)),
                      #("locations_with_routes", json.int(has_routes)),
                      #("locations_routes_empty", json.int(empty_n)),
                      #("jobs", json.object(job_counts)),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
              }
            }
          }
        }
      }
    }
  }
}

pub fn queue_all(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case profile_from_query(req) {
        Error(r) -> r
        Ok(kind) -> queue_all_for(ctx, kind)
      }
  }
}

fn queue_all_for(ctx: Context, kind: RouteProfileKind) -> Response {
  let pc = profile_code(kind)
  let sql = find_locations_sql(kind)
  case
    pog.query(sql)
    |> pog.parameter(pog.text(pc))
    |> pog.returning(location_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "trip_routes_find_failed")
    Ok(ret) -> {
      let rows = ret.rows
      let count = list.length(rows)
      case count {
        0 -> {
          let body =
            json.object([
              #("queued", json.int(0)),
              #("total_found", json.int(0)),
              #("message", json.string("no_locations_need_routes")),
              #("profile", json.string(pc)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> {
          let enqueue_results =
            list.map(rows, fn(row) {
              let #(
                lp_id,
                location_name,
                region_name,
                country_name,
                region_type,
                ideas_json,
              ) = row
              let input =
                json.object([
                  #("location_page_id", json.string(lp_id)),
                  #("location_name", json.string(location_name)),
                  #("region_name", json.string(region_name)),
                  #("country_name", json.string(country_name)),
                  #("region_type", json.string(region_type)),
                  #("locale", json.string("tr")),
                  #("travel_ideas_json", json.string(string.slice(ideas_json, 0, 4000))),
                  #("instruction", json.string(instruction_for(kind))),
                ])
                |> json.to_string
              pog.query(
                "insert into ai_jobs (profile_code, input_json) values ($1, $2::jsonb)",
              )
              |> pog.parameter(pog.text(pc))
              |> pog.parameter(pog.text(input))
              |> pog.execute(ctx.db)
            })
          let ok_count = list.count(enqueue_results, fn(r) { result.is_ok(r) })
          let body =
            json.object([
              #("queued", json.int(ok_count)),
              #("total_found", json.int(count)),
              #("profile", json.string(pc)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

pub fn process_next(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case profile_from_query(req) {
        Error(r) -> r
        Ok(kind) -> process_next_for(ctx, kind)
      }
  }
}

fn process_next_for(ctx: Context, kind: RouteProfileKind) -> Response {
  let pc = profile_code(kind)
  case
    pog.query(
      "select id::text from ai_jobs where profile_code = $1 and status = 'queued' order by created_at limit 1",
    )
    |> pog.parameter(pog.text(pc))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "trip_routes_queue_poll_failed")
    Ok(ret) ->
      case ret.rows {
        [] ->
          wisp.json_response(
            "{\"done\":true,\"message\":\"queue_empty\"}",
            200,
          )
        [job_id] -> run_and_apply(ctx, kind, job_id)
        _ -> json_err(500, "unexpected_queue_rows")
      }
  }
}

fn clean_json_text(s: String) -> String {
  let trimmed = string.trim(s)
  trimmed
  |> strip_prefix("```json")
  |> strip_prefix("```")
  |> strip_suffix("```")
  |> string.trim
}

fn strip_prefix(s: String, prefix: String) -> String {
  case string.starts_with(s, prefix) {
    True -> string.drop_start(s, string.length(prefix))
    False -> s
  }
}

fn strip_suffix(s: String, suffix: String) -> String {
  case string.ends_with(s, suffix) {
    True -> string.drop_end(s, string.length(suffix))
    False -> s
  }
}

fn slice_json_array_loose(s: String) -> Result(String, Nil) {
  let t = string.trim(s)
  case string.split_once(t, "[") {
    Error(_) -> Error(Nil)
    Ok(#(_, after_first)) -> {
      let closing_opt =
        list.index_fold(string.to_graphemes(after_first), None, fn(acc, g, idx) {
          case g == "]" {
            True -> Some(idx)
            False -> acc
          }
        })
      case closing_opt {
        None -> Error(Nil)
        Some(end_idx) ->
          Ok("[" <> string.slice(from: after_first, at_index: 0, length: end_idx + 1))
      }
    }
  }
}

fn normalize_routes_json(raw: String) -> #(String, Bool) {
  let cleaned = clean_json_text(raw)
  case json.parse(cleaned, decode.list(decode.dynamic)) {
    Ok(_) -> #(cleaned, True)
    Error(_) ->
      case slice_json_array_loose(cleaned) {
        Ok(slice) ->
          case json.parse(string.trim(slice), decode.list(decode.dynamic)) {
            Ok(_) -> #(string.trim(slice), True)
            Error(_) -> #("[]", False)
          }
        Error(_) -> #("[]", False)
      }
  }
}

fn apply_routes_to_db(
  ctx: Context,
  kind: RouteProfileKind,
  lp_id: String,
  routes_json: String,
) -> Result(Bool, String) {
  let col = json_column(kind)
  let #(json_to_store, stored) = normalize_routes_json(routes_json)
  let sql =
    "update location_pages set "
    <> col
    <> " = $2::jsonb where id = $1::uuid"
  case
    pog.query(sql)
    |> pog.parameter(pog.text(string.trim(lp_id)))
    |> pog.parameter(pog.text(json_to_store))
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("location_page_routes_update_failed")
    Ok(_) -> Ok(stored)
  }
}

fn run_and_apply(ctx: Context, kind: RouteProfileKind, job_id: String) -> Response {
  case ai_job_run.run_ai_job(ctx, job_id) {
    Error(e) -> json_err(500, "job_run_failed: " <> e)
    Ok(Nil) -> {
      case
        pog.query(
          "select id::text, input_json->>'location_page_id', coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid and status = 'succeeded'",
        )
        |> pog.parameter(pog.text(job_id))
        |> pog.returning(job_output_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "trip_routes_output_fetch_failed")
        Ok(or) ->
          case or.rows {
            [] -> json_err(500, "trip_routes_job_not_succeeded")
            [#(jid, lp_id, raw_text)] ->
              case apply_routes_to_db(ctx, kind, lp_id, clean_json_text(raw_text)) {
                Error(msg) -> json_err(500, msg)
                Ok(routes_stored) -> {
                  let body =
                    json.object([
                      #("done", json.bool(False)),
                      #("job_id", json.string(jid)),
                      #("location_page_id", json.string(lp_id)),
                      #("routes_stored", json.bool(routes_stored)),
                      #("profile", json.string(profile_code(kind))),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
              }
            _ -> json_err(500, "unexpected_output_rows")
          }
      }
    }
  }
}

pub fn reset_stuck_jobs(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case profile_from_query(req) {
        Error(r) -> r
        Ok(kind) -> reset_stuck_for(ctx, kind)
      }
  }
}

fn reset_stuck_for(ctx: Context, kind: RouteProfileKind) -> Response {
  let pc = profile_code(kind)
  case
    pog.query(
      "update ai_jobs set status = 'failed', error = 'reset_stuck', finished_at = now() where profile_code = $1 and status = 'running' returning id",
    )
    |> pog.parameter(pog.text(pc))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "trip_routes_reset_stuck_failed")
    Ok(ret) -> {
      let body =
        json.object([
          #("reset", json.int(list.length(ret.rows))),
          #("profile", json.string(pc)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

pub fn worker_try_route_job(ctx: Context, kind: RouteProfileKind) -> Result(Bool, String) {
  let pc = profile_code(kind)
  case
    pog.query(
      "select id::text from ai_jobs where profile_code = $1 and status = 'queued' order by created_at limit 1",
    )
    |> pog.parameter(pog.text(pc))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("trip_routes_queue_poll_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> Ok(False)
        [job_id] ->
          case ai_job_run.run_ai_job(ctx, job_id) {
            Error(e) -> Error("trip_routes_job_run_failed: " <> e)
            Ok(_) ->
              case
                pog.query(
                  "select id::text, input_json->>'location_page_id', coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid and status = 'succeeded'",
                )
                |> pog.parameter(pog.text(job_id))
                |> pog.returning(job_output_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> Error("trip_routes_output_fetch_failed")
                Ok(or) ->
                  case or.rows {
                    [] -> Ok(False)
                    [#(_jid, lp_id, raw_text)] ->
                      case apply_routes_to_db(ctx, kind, lp_id, clean_json_text(raw_text)) {
                        Error(msg) -> Error(msg)
                        Ok(_) -> Ok(True)
                      }
                    _ -> Error("unexpected_output_rows")
                  }
              }
          }
        _ -> Error("unexpected_queue_rows")
      }
  }
}
