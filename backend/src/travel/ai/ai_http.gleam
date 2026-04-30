//// AI sağlayıcılar, profiller, iş kuyruğu, bölge/geo görevleri (170_ai).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/ai/ops_agent_enqueue
import travel/ai/region_provinces_sync
import travel/db/decode_helpers as row_dec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

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

fn prov_row() -> decode.Decoder(#(String, String, String, String, Bool)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use dn <- decode.field(2, decode.string)
  use dm <- decode.field(3, decode.string)
  use ia <- decode.field(4, decode.bool)
  decode.success(#(id, code, dn, dm, ia))
}

fn prov_json(row: #(String, String, String, String, Bool)) -> json.Json {
  let #(id, code, dn, dm, ia) = row
  let dmj = case dm == "" {
    True -> json.null()
    False -> json.string(dm)
  }
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("display_name", json.string(dn)),
    #("default_model", dmj),
    #("is_active", json.bool(ia)),
  ])
}

/// GET /api/v1/ai/providers — `admin.users.read`
pub fn list_ai_providers(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select id::text, code, display_name, coalesce(default_model,''), is_active from ai_providers order by id",
    )
    |> pog.returning(prov_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "ai_providers_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, prov_json)
      let body =
        json.object([#("providers", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
  }
}

fn fp_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use pid <- decode.field(2, decode.string)
  use sp <- decode.field(3, decode.string)
  use temp <- decode.field(4, decode.string)
  decode.success(#(id, code, pid, sp, temp))
}

fn fp_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, code, pid, sp, temp) = row
  let spj = case sp == "" {
    True -> json.null()
    False -> json.string(sp)
  }
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("provider_id", json.string(pid)),
    #("system_prompt", spj),
    #("temperature", json.string(temp)),
  ])
}

fn patch_fp_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("system_prompt", decode.string, fn(sp) {
    decode.field("temperature", decode.string, fn(tp) {
      decode.success(#(sp, tp))
    })
  })
}

/// PATCH /api/v1/ai/feature-profiles/:code — `admin.users.read`
/// Gövde: `{"system_prompt":"...","temperature":"0.7"}` — model talimatı ve örnekleme (“eğitim”) burada saklanır.
pub fn patch_feature_profile(req: Request, ctx: Context, code: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case string.trim(code) == "" {
        True -> json_err(400, "code_required")
        False ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, patch_fp_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(sp, tp_raw)) -> {
                  let tp = case string.trim(tp_raw) == "" {
                    True -> "0.70"
                    False -> string.trim(tp_raw)
                  }
                  case
                    pog.query(
                      "update ai_feature_profiles set system_prompt = $2, temperature = $3::numeric where code = $1 returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(code)))
                    |> pog.parameter(pog.text(sp))
                    |> pog.parameter(pog.text(tp))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "ai_profile_patch_failed")
                    Ok(r) ->
                      case r.rows {
                        [] -> json_err(404, "unknown_profile_code")
                        [_] -> {
                          let out =
                            json.object([#("ok", json.bool(True))])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                        _ -> json_err(500, "unexpected")
                      }
                  }
                }
              }
          }
      }
  }
}

/// GET /api/v1/ai/feature-profiles — `admin.users.read`
pub fn list_feature_profiles(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select p.id::text, p.code, p.provider_id::text, coalesce(p.system_prompt,''), p.temperature::text from ai_feature_profiles p order by p.code",
    )
    |> pog.returning(fp_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "ai_profiles_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, fp_json)
      let body =
        json.object([#("profiles", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
  }
}

fn job_row() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use pc <- decode.field(1, decode.string)
  use ij <- decode.field(2, decode.string)
  use oj <- decode.field(3, decode.string)
  use st <- decode.field(4, decode.string)
  use er <- decode.field(5, decode.string)
  use ca <- decode.field(6, decode.string)
  decode.success(#(id, pc, ij, oj, st, er, ca))
}

fn job_json(row: #(String, String, String, String, String, String, String)) -> json.Json {
  let #(id, pc, ij, oj, st, er, ca) = row
  let ojj = case oj == "" {
    True -> json.null()
    False -> json.string(oj)
  }
  let erj = case er == "" {
    True -> json.null()
    False -> json.string(er)
  }
  json.object([
    #("id", json.string(id)),
    #("profile_code", json.string(pc)),
    #("input_json", json.string(ij)),
    #("output_json", ojj),
    #("status", json.string(st)),
    #("error", erj),
    #("created_at", json.string(ca)),
  ])
}

fn create_job_decoder() -> decode.Decoder(#(String, String, Bool)) {
  decode.field("profile_code", decode.string, fn(pc) {
    decode.field("input_json", decode.string, fn(ij) {
      decode.optional_field("run", True, decode.bool, fn(run) {
        decode.success(#(string.trim(pc), string.trim(ij), run))
      })
    })
  })
}

/// POST /api/v1/ai/jobs — `admin.users.read`
pub fn create_ai_job(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_job_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(pc, ij_raw, run_now)) ->
          case pc == "" || ij_raw == "" {
            True -> json_err(400, "profile_code_and_input_json_required")
            False -> {
              let ij = case ij_raw == "" {
                True -> "{}"
                False -> ij_raw
              }
              case
                pog.query(
                  "insert into ai_jobs (profile_code, input_json, status) values ($1, $2::jsonb, 'queued') returning id::text",
                )
                |> pog.parameter(pog.text(pc))
                |> pog.parameter(pog.text(ij))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "ai_job_insert_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      case run_now {
                        True -> {
                          let _ = ai_job_run.run_ai_job(ctx, id)
                          Nil
                        }
                        False -> Nil
                      }
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
                      wisp.json_response(out, 201)
                    }
                    _ -> json_err(500, "unexpected")
                  }
              }
            }
          }
      }
  }
  }
}

/// GET /api/v1/ai/jobs?status= — `admin.users.read`
pub fn list_ai_jobs(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let st =
    list.key_find(qs, "status")
    |> result.unwrap("")
    |> string.trim
  let sql = case st == "" {
    True ->
      "select id::text, profile_code, input_json::text, coalesce(output_json::text,''), status, coalesce(error,''), created_at::text from ai_jobs order by created_at desc limit 100"
    False ->
      "select id::text, profile_code, input_json::text, coalesce(output_json::text,''), status, coalesce(error,''), created_at::text from ai_jobs where status = $1 order by created_at desc limit 100"
  }
  let exec = case st == "" {
    True ->
      pog.query(sql)
      |> pog.returning(job_row())
      |> pog.execute(ctx.db)
    False ->
      pog.query(sql)
      |> pog.parameter(pog.text(st))
      |> pog.returning(job_row())
      |> pog.execute(ctx.db)
  }
  case exec {
    Error(_) -> json_err(500, "ai_jobs_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, job_json)
      let body =
        json.object([#("jobs", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
    }
  }
}

/// GET /api/v1/ai/jobs/:job_id — `admin.users.read`
pub fn get_ai_job(req: Request, ctx: Context, job_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select id::text, profile_code, input_json::text, coalesce(output_json::text,''), status, coalesce(error,''), created_at::text from ai_jobs where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(job_id)))
    |> pog.returning(job_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "ai_job_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [row] -> {
          let body = job_json(row) |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
  }
}

/// POST /api/v1/ai/jobs/:job_id/run — kuyruktaki işi hemen çalıştırır (`admin.users.read`).
pub fn post_run_ai_job(req: Request, ctx: Context, job_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case ai_job_run.run_ai_job(ctx, job_id) {
        Ok(_) -> {
          let body = json.object([#("ok", json.bool(True))]) |> json.to_string
          wisp.json_response(body, 200)
        }
        Error(msg) -> json_err(400, msg)
      }
  }
}

fn region_task_decoder() -> decode.Decoder(
  #(Option(String), String, String, Option(String)),
) {
  decode.optional_field("country_id", "", decode.string, fn(cid) {
    decode.field("country_name", decode.string, fn(cn) {
      decode.field("step", decode.string, fn(step) {
        decode.optional_field("parent_region_id", "", decode.string, fn(prid) {
          let c = case string.trim(cid) == "" {
            True -> None
            False -> Some(string.trim(cid))
          }
          let p = case string.trim(prid) == "" {
            True -> None
            False -> Some(string.trim(prid))
          }
          decode.success(#(c, string.trim(cn), string.trim(step), p))
        })
      })
    })
  })
}

fn gen_prov_decoder() -> decode.Decoder(#(String, Option(String))) {
  decode.field("country_name", decode.string, fn(cn) {
    decode.optional_field("country_id", "", decode.string, fn(cid) {
      let opt = case string.trim(cid) == "" {
        True -> None
        False -> Some(string.trim(cid))
      }
      decode.success(#(string.trim(cn), opt))
    })
  })
}

/// POST /api/v1/ai/region-tasks/generate-provinces — `admin.users.read` — ülke için illeri AI ile üretir ve DB’ye yazar (senkron).
pub fn generate_provinces_sync(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, gen_prov_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(cn, cid_opt)) ->
              case cn == "" {
                True -> json_err(400, "country_name_required")
                False ->
                  case region_provinces_sync.generate_and_insert_provinces(ctx, cn, cid_opt) {
                    Error(e) -> json_err(400, e)
                    Ok(out) -> {
                      let body =
                        json.object([
                          #("job_id", json.string(out.job_id)),
                          #("created", json.int(out.created)),
                          #("skipped", json.int(out.skipped)),
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

/// POST /api/v1/ai/region-tasks — `admin.users.read`
pub fn create_region_task(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, region_task_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(cid_opt, cn, step, prid_opt)) ->
          case cn == "" || step == "" {
            True -> json_err(400, "country_name_step_required")
            False ->
              case step == "provinces" || step == "districts" {
                False -> json_err(400, "invalid_step")
                True -> {
                  let c_p = case cid_opt {
                    None -> pog.null()
                    Some(s) -> pog.text(s)
                  }
                  let p_p = case prid_opt {
                    None -> pog.null()
                    Some(s) -> pog.text(s)
                  }
                  case
                    pog.query(
                      "insert into ai_region_generation_tasks (country_id, country_name, step, parent_region_id) values ($1::smallint, $2, $3, $4::int) returning id::text",
                    )
                    |> pog.parameter(c_p)
                    |> pog.parameter(pog.text(cn))
                    |> pog.parameter(pog.text(step))
                    |> pog.parameter(p_p)
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "region_task_insert_failed")
                    Ok(r) ->
                      case r.rows {
                        [id] -> {
                          let out = json.object([#("id", json.string(id))]) |> json.to_string
                          wisp.json_response(out, 201)
                        }
                        _ -> json_err(500, "unexpected")
                      }
                  }
                }
              }
          }
      }
  }
  }
}

fn rt_row() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use cid <- decode.field(1, decode.string)
  use cn <- decode.field(2, decode.string)
  use step <- decode.field(3, decode.string)
  use pr <- decode.field(4, decode.string)
  use jid <- decode.field(5, decode.string)
  use ca <- decode.field(6, decode.string)
  decode.success(#(id, cid, cn, step, pr, jid, ca))
}

/// GET /api/v1/ai/region-tasks — `admin.users.read`
pub fn list_region_tasks(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select id::text, coalesce(country_id::text,''), country_name, step, coalesce(parent_region_id::text,''), coalesce(job_id::text,''), created_at::text from ai_region_generation_tasks order by created_at desc limit 100",
    )
    |> pog.returning(rt_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "region_tasks_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(id, cid, cn, step, pr, jid, ca) = r
          let cidj = case cid == "" {
            True -> json.null()
            False -> json.string(cid)
          }
          let prj = case pr == "" {
            True -> json.null()
            False -> json.string(pr)
          }
          let jidr = case jid == "" {
            True -> json.null()
            False -> json.string(jid)
          }
          json.object([
            #("id", json.string(id)),
            #("country_id", cidj),
            #("country_name", json.string(cn)),
            #("step", json.string(step)),
            #("parent_region_id", prj),
            #("job_id", jidr),
            #("created_at", json.string(ca)),
          ])
        })
      let body =
        json.object([#("tasks", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
  }
}

fn geo_batch_decoder() -> decode.Decoder(#(String, String, Int)) {
  decode.field("location_page_id", decode.string, fn(lp) {
    decode.optional_field("category_slug", "gezi-fikirleri", decode.string, fn(cs) {
      decode.optional_field("posts_to_create", 5, decode.int, fn(n) {
        decode.success(#(lp, cs, n))
      })
    })
  })
}

/// POST /api/v1/ai/geo-blog-batches — `admin.users.read`
pub fn create_geo_blog_batch(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, geo_batch_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(lp, cs, n)) ->
          case string.trim(lp) == "" {
            True -> json_err(400, "location_page_id_required")
            False ->
              case
                pog.query(
                  "insert into ai_geo_blog_batches (location_page_id, category_slug, posts_to_create) values ($1::uuid, $2, $3) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(lp)))
                |> pog.parameter(pog.text(string.trim(cs)))
                |> pog.parameter(pog.int(n))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "geo_batch_insert_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
                      wisp.json_response(out, 201)
                    }
                    _ -> json_err(500, "unexpected")
                  }
              }
          }
      }
  }
  }
}

fn gbb_row() -> decode.Decoder(#(String, String, String, Int, String, String)) {
  use id <- decode.field(0, decode.string)
  use lpid <- decode.field(1, decode.string)
  use cs <- decode.field(2, decode.string)
  use n <- decode.field(3, decode.int)
  use jid <- decode.field(4, decode.string)
  use st <- decode.field(5, decode.string)
  decode.success(#(id, lpid, cs, n, jid, st))
}

/// GET /api/v1/ai/geo-blog-batches?location_page_id= — `admin.users.read`
pub fn list_geo_blog_batches(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let lp =
    list.key_find(qs, "location_page_id")
    |> result.unwrap("")
    |> string.trim
  let sql = case lp == "" {
    True ->
      "select id::text, location_page_id::text, category_slug, posts_to_create, coalesce(job_id::text,''), status from ai_geo_blog_batches order by id desc limit 100"
    False ->
      "select id::text, location_page_id::text, category_slug, posts_to_create, coalesce(job_id::text,''), status from ai_geo_blog_batches where location_page_id = $1::uuid order by id desc limit 100"
  }
  let exec = case lp == "" {
    True ->
      pog.query(sql)
      |> pog.returning(gbb_row())
      |> pog.execute(ctx.db)
    False ->
      pog.query(sql)
      |> pog.parameter(pog.text(lp))
      |> pog.returning(gbb_row())
      |> pog.execute(ctx.db)
  }
  case exec {
    Error(_) -> json_err(500, "geo_batches_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(id, lpid, cs, n, jid, st) = r
          let jidj = case jid == "" {
            True -> json.null()
            False -> json.string(jid)
          }
          json.object([
            #("id", json.string(id)),
            #("location_page_id", json.string(lpid)),
            #("category_slug", json.string(cs)),
            #("posts_to_create", json.int(n)),
            #("job_id", jidj),
            #("status", json.string(st)),
          ])
        })
      let body =
        json.object([#("batches", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
    }
  }
}

fn pbp_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use rid <- decode.field(1, decode.string)
  use pj <- decode.field(2, decode.string)
  use ej <- decode.field(3, decode.string)
  use ca <- decode.field(4, decode.string)
  decode.success(#(id, rid, pj, ej, ca))
}

/// GET /api/v1/ai/post-booking-plans?reservation_id= — `admin.users.read`
pub fn list_post_booking_plans(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let rid =
    list.key_find(qs, "reservation_id")
    |> result.unwrap("")
    |> string.trim
  case rid == "" {
    True -> json_err(400, "reservation_id_required")
    False ->
      case
        pog.query(
          "select id::text, reservation_id::text, plan_json::text, coalesce(email_job_id::text,''), created_at::text from ai_post_booking_plans where reservation_id = $1::uuid order by created_at desc limit 50",
        )
        |> pog.parameter(pog.text(rid))
        |> pog.returning(pbp_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "post_booking_plans_query_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(r) {
              let #(id, res_id, pj, ej, ca) = r
              let ejj = case ej == "" {
                True -> json.null()
                False -> json.string(ej)
              }
              json.object([
                #("id", json.string(id)),
                #("reservation_id", json.string(res_id)),
                #("plan_json", json.string(pj)),
                #("email_job_id", ejj),
                #("created_at", json.string(ca)),
              ])
            })
          let body =
            json.object([#("plans", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
    }
  }
}

fn ops_agent_body_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("reservation_id", decode.string, fn(rid) {
    decode.optional_field("event_type", "manual", decode.string, fn(et) {
      decode.success(#(string.trim(rid), string.trim(et)))
    })
  })
}

/// POST /api/v1/ai/ops-agent/run — operasyon ajanı (sohbet değil): rezervasyon + benzer ilanlar → `ops_agent` profili.
pub fn ops_agent_run(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, ops_agent_body_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(rid, et)) ->
              case string.trim(rid) == "" {
                True -> json_err(400, "reservation_id_required")
                False -> {
                  let ev = case string.trim(et) == "" {
                    True -> "manual"
                    False -> et
                  }
                  case ops_agent_enqueue.enqueue_ops_agent_job(ctx, rid, ev, True) {
                    Error(e) ->
                      case e {
                        "reservation_not_found" -> json_err(404, e)
                        _ -> json_err(500, e)
                      }
                    Ok(job_id) ->
                      case
                        pog.query(
                          "select id::text, profile_code, input_json::text, coalesce(output_json::text,''), status, coalesce(error,''), created_at::text from ai_jobs where id = $1::uuid limit 1",
                        )
                        |> pog.parameter(pog.text(job_id))
                        |> pog.returning(job_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "ops_agent_job_read_failed")
                        Ok(jret) ->
                          case jret.rows {
                            [row] -> {
                              let out =
                                json.object([#("job", job_json(row))])
                                |> json.to_string
                              wisp.json_response(out, 200)
                            }
                            _ -> json_err(500, "unexpected")
                          }
                      }
                  }
                }
              }
          }
      }
  }
}
