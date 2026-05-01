//// DeepSeek Agent Merkezi — supervisor ve özel gün popup önerileri.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

const popup_profile = "special_day_popup_agent"
const supervisor_profile = "supervisor_agent"
const special_day_agent = "special_day_popup"

type RecommendationRow {
  RecommendationRow(
    id: String,
    agent: String,
    kind: String,
    target: String,
    title: String,
    reason: String,
    payload: String,
    status: String,
    job: String,
    created: String,
    updated: String,
    reviewer: String,
    note: String,
    reviewed: String,
    applied: String,
  )
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn agent_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String, String)) {
  use code <- decode.field(0, decode.string)
  use profile <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use desc <- decode.field(3, decode.string)
  use mode <- decode.field(4, decode.string)
  use status <- decode.field(5, decode.string)
  use risk <- decode.field(6, decode.string)
  use schedule <- decode.field(7, decode.string)
  use last_run <- decode.field(8, decode.string)
  decode.success(#(code, profile, name, desc, mode, status, risk, schedule, last_run))
}

fn run_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use trigger <- decode.field(2, decode.string)
  use status <- decode.field(3, decode.string)
  use started <- decode.field(4, decode.string)
  use finished <- decode.field(5, decode.string)
  use input <- decode.field(6, decode.string)
  use summary <- decode.field(7, decode.string)
  decode.success(#(id, code, trigger, status, started, finished, input, summary))
}

fn count_row() -> decode.Decoder(#(String, Int)) {
  use status <- decode.field(0, decode.string)
  use cnt <- decode.field(1, decode.int)
  decode.success(#(status, cnt))
}

fn agent_json(row: #(String, String, String, String, String, String, String, String, String)) -> json.Json {
  let #(code, profile, name, desc, mode, status, risk, schedule, last_run) = row
  json.object([
    #("code", json.string(code)),
    #("feature_profile_code", nullable_string(profile)),
    #("display_name", json.string(name)),
    #("description", json.string(desc)),
    #("mode", json.string(mode)),
    #("status", json.string(status)),
    #("risk_level", json.string(risk)),
    #("schedule_json", json.string(schedule)),
    #("last_run_at", nullable_string(last_run)),
  ])
}

fn run_json(row: #(String, String, String, String, String, String, String, String)) -> json.Json {
  let #(id, code, trigger, status, started, finished, input, summary) = row
  json.object([
    #("id", json.string(id)),
    #("agent_code", json.string(code)),
    #("trigger_type", json.string(trigger)),
    #("status", json.string(status)),
    #("started_at", json.string(started)),
    #("finished_at", nullable_string(finished)),
    #("input_json", json.string(input)),
    #("summary_json", json.string(summary)),
  ])
}

fn nullable_string(s: String) -> json.Json {
  case string.trim(s) == "" {
    True -> json.null()
    False -> json.string(s)
  }
}

/// GET /api/v1/agents/overview — Agent merkezi durumu.
pub fn overview(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let agents_sql =
        "select code, coalesce(feature_profile_code,''), display_name, description, mode, status, risk_level, schedule_json::text, coalesce(last_run_at::text,'') from ai_agents order by code"
      let runs_sql =
        "select id::text, agent_code, trigger_type, status, started_at::text, coalesce(finished_at::text,''), input_json::text, summary_json::text from ai_agent_runs order by started_at desc limit 20"
      let counts_sql =
        "select status, count(*)::int from ai_agent_recommendations group by status"

      case
        pog.query(agents_sql)
        |> pog.returning(agent_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "agents_query_failed")
        Ok(ar) ->
          case
            pog.query(runs_sql)
            |> pog.returning(run_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "agent_runs_query_failed")
            Ok(rr) ->
              case
                pog.query(counts_sql)
                |> pog.returning(count_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "agent_recommendation_counts_failed")
                Ok(cr) -> {
                  let count_pairs =
                    list.map(cr.rows, fn(row) {
                      let #(status, cnt) = row
                      #(status, json.int(cnt))
                    })
                  let body =
                    json.object([
                      #("agents", json.array(from: list.map(ar.rows, agent_json), of: fn(x) { x })),
                      #("recent_runs", json.array(from: list.map(rr.rows, run_json), of: fn(x) { x })),
                      #("recommendation_counts", json.object(count_pairs)),
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

fn upcoming_row() -> decode.Decoder(#(String, String, String, String, String, Int, String, String, String, String)) {
  use key <- decode.field(0, decode.string)
  use name <- decode.field(1, decode.string)
  use category <- decode.field(2, decode.string)
  use href <- decode.field(3, decode.string)
  use icon <- decode.field(4, decode.string)
  use year <- decode.field(5, decode.int)
  use event_date <- decode.field(6, decode.string)
  use start_at <- decode.field(7, decode.string)
  use end_at <- decode.field(8, decode.string)
  use target_key <- decode.field(9, decode.string)
  decode.success(#(key, name, category, href, icon, year, event_date, start_at, end_at, target_key))
}

fn popup_ai_decoder() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  decode.field("title", decode.string, fn(title) {
    decode.field("body", decode.string, fn(body) {
      decode.field("cta_text", decode.string, fn(cta) {
        decode.field("cta_href", decode.string, fn(href) {
          decode.optional_field("tone", "warm", decode.string, fn(tone) {
            decode.optional_field("icon", "", decode.string, fn(icon) {
              decode.optional_field("accent_color", "#0EA5E9", decode.string, fn(color) {
                decode.success(#(title, body, cta, href, tone, icon, color))
              })
            })
          })
        })
      })
    })
  })
}

fn clean_json_text(s: String) -> String {
  string.trim(s)
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

fn create_and_run_job(
  ctx: Context,
  profile_code: String,
  input_json: String,
) -> Result(#(String, String), String) {
  case
    pog.query("insert into ai_jobs (profile_code, input_json, status) values ($1, $2::jsonb, 'queued') returning id::text")
    |> pog.parameter(pog.text(profile_code))
    |> pog.parameter(pog.text(input_json))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("agent_ai_job_insert_failed")
    Ok(ret) ->
      case ret.rows {
        [job_id] -> {
          let _ = ai_job_run.run_ai_job(ctx, job_id)
          case
            pog.query("select coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid and status = 'succeeded' limit 1")
            |> pog.parameter(pog.text(job_id))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> Error("agent_ai_job_output_failed")
            Ok(out) ->
              case out.rows {
                [txt] -> Ok(#(job_id, string.trim(txt)))
                _ -> Error("agent_ai_job_not_succeeded")
              }
          }
        }
        _ -> Error("agent_ai_job_unexpected_rows")
      }
  }
}

fn popup_payload_json(
  day: #(String, String, String, String, String, Int, String, String, String, String),
  ai_text: String,
) -> json.Json {
  let #(key, name, category, href, default_icon, year, event_date, start_at, end_at, _target_key) = day
  let parsed =
    case json.parse(clean_json_text(ai_text), popup_ai_decoder()) {
      Ok(v) -> v
      Error(_) ->
        #(
          name <> " Tatil Fırsatları",
          name <> " için seyahat planınızı erken yapın; öne çıkan konaklama ve rota seçeneklerini keşfedin.",
          "Fırsatları Gör",
          href,
          "warm",
          default_icon,
          "#0EA5E9",
        )
    }
  let #(title, body, cta, ai_href, tone, ai_icon, color) = parsed
  let icon = case string.trim(ai_icon) == "" { True -> default_icon False -> ai_icon }
  let cta_href = case string.starts_with(string.trim(ai_href), "/") { True -> ai_href False -> href }
  json.object([
    #("popup", json.object([
      #("id", json.string("special-day-" <> key <> "-" <> int.to_string(year))),
      #("enabled", json.bool(True)),
      #("name", json.string(name <> " " <> int.to_string(year) <> " - Agent önerisi")),
      #("preset", json.string("special_day")),
      #("layout", json.string("modal_center")),
      #("priority", json.int(90)),
      #("eyebrow", json.object([#("tr", json.string(name))])),
      #("title", json.object([#("tr", json.string(title))])),
      #("body", json.object([#("tr", json.string(body))])),
      #("ctaText", json.object([#("tr", json.string(cta))])),
      #("ctaHref", json.string(cta_href)),
      #("ctaText2", json.object([#("tr", json.string("Daha Sonra"))])),
      #("ctaHref2", json.string("")),
      #("imageUrl", json.string("")),
      #("mobileImageUrl", json.string("")),
      #("accentColor", json.string(color)),
      #("theme", json.string("light")),
      #("align", json.string("center")),
      #("overlay", json.int(55)),
      #("icon", json.string(icon)),
      #("cards", json.array(from: [], of: json.string)),
      #("targeting", json.object([
        #("pages", json.array(from: ["homepage"], of: json.string)),
        #("locales", json.array(from: ["*"], of: json.string)),
        #("device", json.string("all")),
        #("audience", json.string("all")),
      ])),
      #("schedule", json.object([
        #("startAt", json.string(start_at)),
        #("endAt", json.string(end_at)),
        #("daysOfWeek", json.array(from: [], of: json.int)),
        #("hourStart", json.string("")),
        #("hourEnd", json.string("")),
      ])),
      #("trigger", json.object([
        #("type", json.string("delay")),
        #("delayMs", json.int(2200)),
        #("scrollPercent", json.int(40)),
      ])),
      #("frequency", json.object([
        #("mode", json.string("once_per_visitor")),
        #("everyNDays", json.int(14)),
      ])),
      #("allowDismissForever", json.bool(True)),
    ])),
    #("source", json.object([
      #("special_day_key", json.string(key)),
      #("special_day_name", json.string(name)),
      #("category", json.string(category)),
      #("event_year", json.int(year)),
      #("event_date", json.string(event_date)),
      #("tone", json.string(tone)),
      #("ai_raw", json.string(ai_text)),
    ])),
  ])
}

fn insert_recommendation(
  ctx: Context,
  run_id: String,
  day: #(String, String, String, String, String, Int, String, String, String, String),
) -> Result(String, String) {
  let #(key, name, category, href, _icon, year, event_date, _start_at, _end_at, target_key) = day
  let input =
    json.object([
      #("task", json.string("special_day_popup")),
      #("locale", json.string("tr")),
      #("special_day_key", json.string(key)),
      #("special_day_name", json.string(name)),
      #("category", json.string(category)),
        #("event_year", json.int(year)),
      #("event_date", json.string(event_date)),
      #("default_cta_href", json.string(href)),
      #("instruction", json.string("Yaklaşan özel gün için rezervasyonyap.tr ana sayfasında kullanılacak kısa, güven veren popup metni üret.")),
    ])
    |> json.to_string
  case create_and_run_job(ctx, popup_profile, input) {
    Error(e) -> Error(e)
    Ok(#(job_id, ai_text)) -> {
      let payload = popup_payload_json(day, ai_text) |> json.to_string
      case
        pog.query(
          "insert into ai_agent_recommendations (agent_code, run_id, ai_job_id, kind, target_key, title, reason, payload_json, status) values ($7, $1::uuid, $2::uuid, 'popup', $3, $4, $5, $6::jsonb, 'pending') returning id::text",
        )
        |> pog.parameter(pog.text(run_id))
        |> pog.parameter(pog.text(job_id))
        |> pog.parameter(pog.text(target_key))
        |> pog.parameter(pog.text(name <> " " <> int.to_string(year) <> " popup önerisi"))
        |> pog.parameter(pog.text("Supervisor yaklaşan özel günü tespit etti: " <> name <> " (" <> event_date <> ")."))
        |> pog.parameter(pog.text(payload))
        |> pog.parameter(pog.text(special_day_agent))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> Error("recommendation_insert_failed")
        Ok(ret) ->
          case ret.rows {
            [id] -> {
              let _ =
                pog.query(
                  "insert into ai_agent_decisions (agent_code, run_id, recommendation_id, decision_key, decision_type, risk_level, requires_approval, decision_json) values ($1, $2::uuid, $3::uuid, $4, 'create_popup_recommendation', 'low', true, $5::jsonb)",
                )
                |> pog.parameter(pog.text(special_day_agent))
                |> pog.parameter(pog.text(run_id))
                |> pog.parameter(pog.text(id))
                |> pog.parameter(pog.text(target_key))
                |> pog.parameter(pog.text(payload))
                |> pog.execute(ctx.db)
              Ok(id)
            }
            _ -> Error("recommendation_unexpected_rows")
          }
      }
    }
  }
}

fn finish_run(ctx: Context, run_id: String, status: String, summary: String, err: String) -> Nil {
  let _ =
    pog.query(
      "update ai_agent_runs set status = $2, finished_at = now(), summary_json = $3::jsonb, error = nullif($4, '') where id = $1::uuid",
    )
    |> pog.parameter(pog.text(run_id))
    |> pog.parameter(pog.text(status))
    |> pog.parameter(pog.text(summary))
    |> pog.parameter(pog.text(err))
    |> pog.execute(ctx.db)
  let _ =
    pog.query("update ai_agents set last_run_at = now(), updated_at = now() where code in ('supervisor', $1)")
    |> pog.parameter(pog.text(special_day_agent))
    |> pog.execute(ctx.db)
  Nil
}

fn supervisor_enabled(ctx: Context) -> Result(Bool, String) {
  case
    pog.query("select case when status = 'active' and mode <> 'disabled' then 'yes' else 'no' end from ai_agents where code = 'supervisor' limit 1")
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("supervisor_status_query_failed")
    Ok(ret) ->
      case ret.rows {
        ["yes"] -> Ok(True)
        [_] -> Ok(False)
        [] -> Error("supervisor_agent_not_found")
        _ -> Error("unexpected_supervisor_status_rows")
      }
  }
}

fn supervisor_due(ctx: Context) -> Result(Bool, String) {
  case
    pog.query("select case when status = 'active' and mode <> 'disabled' and (last_run_at is null or last_run_at < now() - interval '20 hours') then 'yes' else 'no' end from ai_agents where code = 'supervisor' limit 1")
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("supervisor_due_query_failed")
    Ok(ret) ->
      case ret.rows {
        ["yes"] -> Ok(True)
        [_] -> Ok(False)
        [] -> Error("supervisor_agent_not_found")
        _ -> Error("unexpected_supervisor_due_rows")
      }
  }
}

fn create_supervisor_run(ctx: Context, trigger_type: String, input_json: String) -> Result(String, String) {
  case
    pog.query("insert into ai_agent_runs (agent_code, trigger_type, status, input_json) values ('supervisor', $1, 'running', $2::jsonb) returning id::text")
    |> pog.parameter(pog.text(trigger_type))
    |> pog.parameter(pog.text(input_json))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("agent_run_insert_failed")
    Ok(ret) ->
      case ret.rows {
        [run_id] -> Ok(run_id)
        _ -> Error("agent_run_unexpected_rows")
      }
  }
}

/// POST /api/v1/agents/supervisor/run — yaklaşan özel günleri takip eder ve popup önerisi üretir.
pub fn run_supervisor(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case supervisor_enabled(ctx) {
        Error(e) -> json_err(500, e)
        Ok(False) -> json_err(409, "supervisor_disabled")
        Ok(True) ->
          case create_supervisor_run(ctx, "manual", "{\"source\":\"admin_manual\"}") {
            Error(e) -> json_err(500, e)
            Ok(run_id) -> run_supervisor_for_run(ctx, run_id)
          }
      }
  }
}

/// POST /api/v1/agents/supervisor/run-due — cron tarafından güvenle çağrılabilir; günde bir kez çalışır.
pub fn run_supervisor_due(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case supervisor_due(ctx) {
        Error(e) -> json_err(500, e)
        Ok(False) -> {
          let body = json.object([#("due", json.bool(False))]) |> json.to_string
          wisp.json_response(body, 200)
        }
        Ok(True) ->
          case create_supervisor_run(ctx, "scheduled", "{\"source\":\"scheduled_due\"}") {
            Error(e) -> json_err(500, e)
            Ok(run_id) -> run_supervisor_for_run(ctx, run_id)
          }
      }
  }
}

fn run_supervisor_for_run(ctx: Context, run_id: String) -> Response {
  let upcoming_sql =
    "
    with years as (
      select extract(year from current_date)::int as y
      union all
      select extract(year from current_date)::int + 1
    ),
    candidates as (
      select
        d.key,
        d.primary_name,
        d.category,
        d.default_cta_href,
        d.icon,
        y.y as event_year,
        coalesce(d.month, (d.dates_by_year -> (y.y::text) ->> 'month')::int) as event_month,
        coalesce(d.day, (d.dates_by_year -> (y.y::text) ->> 'day')::int) as event_day,
        d.lead_days,
        d.duration_days
      from ai_special_days d
      cross join years y
      where d.is_active = true
    ),
    upcoming as (
      select
        key,
        primary_name,
        category,
        default_cta_href,
        icon,
        event_year,
        make_date(event_year, event_month, event_day) as event_date,
        lead_days,
        duration_days
      from candidates
      where event_month is not null and event_day is not null
    )
    select
      key,
      primary_name,
      category,
      default_cta_href,
      icon,
      event_year,
      event_date::text,
      ((event_date - (lead_days || ' days')::interval)::date)::text || 'T09:00:00.000Z',
      ((event_date + (duration_days || ' days')::interval)::date)::text || 'T23:59:00.000Z',
      key || ':' || event_year::text as target_key
    from upcoming u
    where u.event_date between current_date and current_date + (u.lead_days || ' days')::interval
      and not exists (
        select 1
        from ai_agent_recommendations r
        where r.agent_code = 'special_day_popup'
          and r.kind = 'popup'
          and r.target_key = u.key || ':' || u.event_year::text
          and r.status in ('pending','approved','applied')
      )
    order by event_date asc
    limit 8
    "

  case
    pog.query(upcoming_sql)
    |> pog.returning(upcoming_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> {
      finish_run(ctx, run_id, "failed", "{\"error\":\"special_days_query_failed\"}", "special_days_query_failed")
      json_err(500, "special_days_query_failed")
    }
    Ok(ret) -> {
      let results = list.map(ret.rows, fn(day) { insert_recommendation(ctx, run_id, day) })
      let created = list.count(results, fn(r) { result.is_ok(r) })
      let failed = list.count(results, fn(r) { result.is_error(r) })
      let supervisor_input =
        json.object([
          #("task", json.string("supervisor_agent_review")),
          #("locale", json.string("tr")),
          #("run_id", json.string(run_id)),
          #("agent_code", json.string("supervisor")),
          #("scanned", json.int(list.length(ret.rows))),
          #("created", json.int(created)),
          #("failed", json.int(failed)),
          #("instruction", json.string("Bu agent koşusunu değerlendir. Tekrar üretim, yayın riski ve bir sonraki operasyon adımı için kısa JSON karar özeti üret.")),
        ])
        |> json.to_string
      let supervisor_ai =
        case create_and_run_job(ctx, supervisor_profile, supervisor_input) {
          Ok(#(job_id, text)) ->
            json.object([
              #("job_id", json.string(job_id)),
              #("text", json.string(text)),
            ])
          Error(e) ->
            json.object([#("error", json.string(e))])
        }
      let summary =
        json.object([
          #("scanned", json.int(list.length(ret.rows))),
          #("created", json.int(created)),
          #("failed", json.int(failed)),
          #("supervisor_ai", supervisor_ai),
        ])
        |> json.to_string
      finish_run(ctx, run_id, "succeeded", summary, "")
      let body =
        json.object([
          #("run_id", json.string(run_id)),
          #("scanned", json.int(list.length(ret.rows))),
          #("created", json.int(created)),
          #("failed", json.int(failed)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn recommendation_row() -> decode.Decoder(RecommendationRow) {
  use id <- decode.field(0, decode.string)
  use agent <- decode.field(1, decode.string)
  use kind <- decode.field(2, decode.string)
  use target <- decode.field(3, decode.string)
  use title <- decode.field(4, decode.string)
  use reason <- decode.field(5, decode.string)
  use payload <- decode.field(6, decode.string)
  use status <- decode.field(7, decode.string)
  use job <- decode.field(8, decode.string)
  use created <- decode.field(9, decode.string)
  use updated <- decode.field(10, decode.string)
  use reviewer <- decode.field(11, decode.string)
  use note <- decode.field(12, decode.string)
  use reviewed <- decode.field(13, decode.string)
  use applied <- decode.field(14, decode.string)
  decode.success(RecommendationRow(
    id:,
    agent:,
    kind:,
    target:,
    title:,
    reason:,
    payload:,
    status:,
    job:,
    created:,
    updated:,
    reviewer:,
    note:,
    reviewed:,
    applied:,
  ))
}

fn recommendation_json(row: RecommendationRow) -> json.Json {
  json.object([
    #("id", json.string(row.id)),
    #("agent_code", json.string(row.agent)),
    #("kind", json.string(row.kind)),
    #("target_key", json.string(row.target)),
    #("title", json.string(row.title)),
    #("reason", json.string(row.reason)),
    #("payload_json", json.string(row.payload)),
    #("status", json.string(row.status)),
    #("ai_job_id", nullable_string(row.job)),
    #("created_at", json.string(row.created)),
    #("updated_at", json.string(row.updated)),
    #("reviewer_user_id", nullable_string(row.reviewer)),
    #("review_note", nullable_string(row.note)),
    #("reviewed_at", nullable_string(row.reviewed)),
    #("applied_at", nullable_string(row.applied)),
  ])
}

/// GET /api/v1/agents/recommendations — Agent önerileri.
pub fn list_recommendations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "select id::text, agent_code, kind, target_key, title, reason, payload_json::text, status, coalesce(ai_job_id::text,''), created_at::text, updated_at::text, coalesce(reviewer_user_id::text,''), coalesce(review_note,''), coalesce(reviewed_at::text,''), coalesce(applied_at::text,'') from ai_agent_recommendations order by created_at desc limit 100",
        )
        |> pog.returning(recommendation_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "agent_recommendations_query_failed")
        Ok(ret) -> {
          let body =
            json.object([#("recommendations", json.array(from: list.map(ret.rows, recommendation_json), of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn patch_recommendation_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("status", decode.string, fn(status) {
    decode.optional_field("review_note", "", decode.string, fn(note) {
      decode.success(#(string.trim(status), string.trim(note)))
    })
  })
}

fn apply_popup_recommendation(
  ctx: Context,
  recommendation_id: String,
  reviewer_user_id: String,
  note: String,
) -> Result(String, String) {
  case
    pog.query(
      "with target as (
         select id
         from ai_agent_recommendations
         where id = $1::uuid
           and agent_code = $2
           and kind = 'popup'
           and status = 'approved'
           and applied_at is null
       )
       update ai_agent_recommendations r
       set status = 'applied',
           reviewer_user_id = $3::uuid,
           review_note = nullif($4, ''),
           reviewed_at = now(),
           applied_at = now(),
           updated_at = now()
       from target
       where r.id = target.id
       returning r.id::text",
    )
    |> pog.parameter(pog.text(string.trim(recommendation_id)))
    |> pog.parameter(pog.text(special_day_agent))
    |> pog.parameter(pog.text(string.trim(reviewer_user_id)))
    |> pog.parameter(pog.text(note))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("agent_popup_apply_failed")
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        [] -> Error("agent_popup_not_applicable")
        _ -> Error("unexpected")
      }
  }
}

fn patch_recommendation_status(
  ctx: Context,
  recommendation_id: String,
  reviewer_user_id: String,
  status: String,
  note: String,
) -> Result(String, String) {
  case
    pog.query(
      "update ai_agent_recommendations
       set status = $2,
           review_note = nullif($3, ''),
           reviewer_user_id = case when $2 in ('approved','rejected','expired') then $4::uuid else reviewer_user_id end,
           reviewed_at = case when $2 in ('approved','rejected','expired','applied') then now() else reviewed_at end,
           applied_at = case when $2 = 'applied' then coalesce(applied_at, now()) else applied_at end,
           updated_at = now()
       where id = $1::uuid
       returning id::text",
    )
    |> pog.parameter(pog.text(string.trim(recommendation_id)))
    |> pog.parameter(pog.text(status))
    |> pog.parameter(pog.text(note))
    |> pog.parameter(pog.text(string.trim(reviewer_user_id)))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("agent_recommendation_patch_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> Error("not_found")
        [id] -> Ok(id)
        _ -> Error("unexpected")
      }
  }
}

/// PATCH /api/v1/agents/recommendations/:id — öneriyi onayla/reddet/uygulandı işaretle.
pub fn patch_recommendation(req: Request, ctx: Context, recommendation_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(reviewer_user_id) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_recommendation_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(status, note)) ->
              case list.contains(["pending", "approved", "applied", "rejected", "expired"], status) {
                False -> json_err(400, "invalid_status")
                True ->
                  case status == "applied" {
                    True ->
                      case apply_popup_recommendation(ctx, recommendation_id, reviewer_user_id, note) {
                        Error("agent_popup_not_applicable") -> json_err(400, "recommendation_not_applicable")
                        Error(_) -> json_err(500, "agent_popup_apply_failed")
                        Ok(popup_id) -> {
                          let out =
                            json.object([
                              #("ok", json.bool(True)),
                              #("popup_id", json.string(popup_id)),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                      }
                    False ->
                      case patch_recommendation_status(ctx, recommendation_id, reviewer_user_id, status, note) {
                        Error("not_found") -> json_err(404, "not_found")
                        Error(e) -> json_err(500, e)
                        Ok(_) -> {
                          let out = json.object([#("ok", json.bool(True))]) |> json.to_string
                          wisp.json_response(out, 200)
                        }
                      }
                  }
              }
          }
      }
  }
}
