//// İlan API senkronizasyon işleri — CRUD + progress güncelleme.
////
//// GET  /api/v1/admin/sync/status?provider=wtatil   → son iş durumu
//// POST /api/v1/admin/sync/create                   → yeni iş oluştur
//// PUT  /api/v1/admin/sync/progress                 → script ilerlemesi raporla

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/db/decode_helpers as row_dec
import travel/identity/permissions
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  wisp.json_response(
    json.object([#("error", json.string(msg))]) |> json.to_string,
    status,
  )
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn require_admin(req: Request, ctx: Context) -> Result(Nil, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> Error(json_err(403, "forbidden"))
        True -> Ok(Nil)
      }
  }
}

/// GET /api/v1/admin/sync/status?provider=wtatil
pub fn get_status(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qs = request.get_query(req) |> result.unwrap([])
      let provider =
        list.key_find(qs, "provider")
        |> result.unwrap("")
        |> string.trim
      case provider == "" {
        True -> json_err(400, "provider_required")
        False -> {
          let row_dec = {
            use id <- decode.field(0, decode.string)
            use status <- decode.field(1, decode.string)
            use progress <- decode.field(2, decode.int)
            use total <- decode.field(3, decode.int)
            use log_tail <- decode.field(4, decode.string)
            use error_text <- decode.field(5, decode.string)
            use started_at <- decode.field(6, decode.string)
            use finished_at <- decode.field(7, decode.string)
            decode.success(#(id, status, progress, total, log_tail, error_text, started_at, finished_at))
          }
          case
            pog.query(
              "select id::text, status, progress, total, log_tail,
                      coalesce(error_text,''), to_char(started_at,'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'),
                      coalesce(to_char(finished_at,'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'),'')
               from provider_sync_jobs
               where provider = $1
               order by started_at desc
               limit 1",
            )
            |> pog.parameter(pog.text(provider))
            |> pog.returning(row_dec)
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> json_err(500, "db_error")
            Ok(ret) ->
              case ret.rows {
                [] ->
                  wisp.json_response(
                    json.object([#("job", json.null())]) |> json.to_string,
                    200,
                  )
                [#(id, status, progress, total, log_tail, error_text, started_at, finished_at), ..] -> {
                  let job =
                    json.object([
                      #("id", json.string(id)),
                      #("provider", json.string(provider)),
                      #("status", json.string(status)),
                      #("progress", json.int(progress)),
                      #("total", json.int(total)),
                      #("log_tail", json.string(log_tail)),
                      #(
                        "error_text",
                        case error_text == "" {
                          True -> json.null()
                          False -> json.string(error_text)
                        },
                      ),
                      #("started_at", json.string(started_at)),
                      #(
                        "finished_at",
                        case finished_at == "" {
                          True -> json.null()
                          False -> json.string(finished_at)
                        },
                      ),
                    ])
                  wisp.json_response(
                    json.object([#("job", job)]) |> json.to_string,
                    200,
                  )
                }
              }
          }
        }
      }
    }
  }
}

fn create_decoder() -> decode.Decoder(String) {
  decode.field("provider", decode.string, fn(p) { decode.success(p) })
}

/// POST /api/v1/admin/sync/create  { "provider": "wtatil" }
pub fn create_job(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(provider) ->
              case string.trim(provider) == "" {
                True -> json_err(400, "provider_required")
                False -> {
                  let p = string.trim(provider)
                  case
                    pog.query(
                      "insert into provider_sync_jobs (provider, status)
                       values ($1, 'pending')
                       returning id::text",
                    )
                    |> pog.parameter(pog.text(p))
                    |> pog.returning(row_dec.col0_string())
                    |> db_exec.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "db_error")
                    Ok(r) ->
                      case r.rows {
                        [id] ->
                          wisp.json_response(
                            json.object([
                              #("id", json.string(id)),
                              #("ok", json.bool(True)),
                            ])
                              |> json.to_string,
                            200,
                          )
                        _ -> json_err(500, "unexpected")
                      }
                  }
                }
              }
          }
      }
  }
}

fn update_decoder() -> decode.Decoder(
  #(String, String, Int, Int, String, String),
) {
  use job_id <- decode.field("job_id", decode.string)
  use status <- decode.field("status", decode.string)
  use progress <- decode.optional_field("progress", 0, decode.int)
  use total <- decode.optional_field("total", 0, decode.int)
  use log_line <- decode.optional_field("log_line", "", decode.string)
  use error_text <- decode.optional_field("error_text", "", decode.string)
  decode.success(#(job_id, status, progress, total, log_line, error_text))
}

/// PUT /api/v1/admin/sync/progress — script ilerleme raporu (dahili)
/// { job_id, status, progress?, total?, log_line?, error_text? }
pub fn update_progress(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Put)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, update_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(job_id, status, progress, total, log_line, error_text)) -> {
          let trimmed_id = string.trim(job_id)
          case trimmed_id == "" {
            True -> json_err(400, "job_id_required")
            False -> {
              let set_finished = case status {
                "done" | "error" -> ", finished_at = now()"
                _ -> ""
              }
              let q =
                "update provider_sync_jobs set
                   status = $2,
                   progress = case when $3 > 0 then $3 else progress end,
                   total = case when $4 > 0 then $4 else total end,
                   log_tail = case when $5 != '' then right(log_tail || E'\\n' || $5, 2000) else log_tail end,
                   error_text = case when $6 != '' then $6 else error_text end"
                <> set_finished
                <> " where id = $1::uuid"
              case
                pog.query(q)
                |> pog.parameter(pog.text(trimmed_id))
                |> pog.parameter(pog.text(status))
                |> pog.parameter(pog.int(progress))
                |> pog.parameter(pog.int(total))
                |> pog.parameter(pog.text(log_line))
                |> pog.parameter(pog.text(error_text))
                |> db_exec.execute(ctx.db)
              {
                Error(_) -> json_err(500, "db_error")
                Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
              }
            }
          }
        }
      }
  }
}
