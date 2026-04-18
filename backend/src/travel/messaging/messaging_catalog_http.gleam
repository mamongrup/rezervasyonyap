//// E-posta şablonları, tetikleyiciler, bildirim kuyruğu okuma (100_messaging).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
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

fn decode_col0_int() -> decode.Decoder(Int) {
  use n <- decode.field(0, decode.int)
  decode.success(n)
}

// --- email_templates ---

fn email_tpl_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use sk <- decode.field(2, decode.string)
  use bk <- decode.field(3, decode.string)
  decode.success(#(id, code, sk, bk))
}

fn email_tpl_json(row: #(String, String, String, String)) -> json.Json {
  let #(id, code, sk, bk) = row
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("subject_key", json.string(sk)),
    #("body_key", json.string(bk)),
  ])
}

/// GET /api/v1/messaging/email-templates — `admin.users.read`
pub fn list_email_templates(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select id::text, code, subject_key, body_key from email_templates order by code",
    )
    |> pog.returning(email_tpl_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "email_templates_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, email_tpl_json)
      let body =
        json.object([#("templates", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
  }
}

// --- notification_triggers ---

fn trigger_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use desc <- decode.field(2, decode.string)
  decode.success(#(id, code, desc))
}

fn trigger_json(row: #(String, String, String)) -> json.Json {
  let #(id, code, desc) = row
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("description", json.string(desc)),
  ])
}

/// GET /api/v1/messaging/triggers — `admin.users.read`
pub fn list_triggers(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select id::text, code::text, coalesce(description,'') from notification_triggers order by id",
    )
    |> pog.returning(trigger_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "triggers_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, trigger_json)
      let body =
        json.object([#("triggers", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
  }
}

// --- notification_jobs ---

fn job_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use tid <- decode.field(1, decode.string)
  use uid <- decode.field(2, decode.string)
  use ch <- decode.field(3, decode.string)
  use pj <- decode.field(4, decode.string)
  use sch <- decode.field(5, decode.string)
  use sent <- decode.field(6, decode.string)
  use st <- decode.field(7, decode.string)
  decode.success(#(id, tid, uid, ch, pj, sch, sent, st))
}

fn job_json(row: #(String, String, String, String, String, String, String, String)) -> json.Json {
  let #(id, tid, uid, ch, pj, sch, sent, st) = row
  let uidj = case uid == "" {
    True -> json.null()
    False -> json.string(uid)
  }
  let sentj = case sent == "" {
    True -> json.null()
    False -> json.string(sent)
  }
  json.object([
    #("id", json.string(id)),
    #("trigger_id", json.string(tid)),
    #("user_id", uidj),
    #("channel", json.string(ch)),
    #("payload_json", json.string(pj)),
    #("scheduled_at", json.string(sch)),
    #("sent_at", sentj),
    #("status", json.string(st)),
  ])
}

/// GET /api/v1/messaging/jobs?status=&limit= — `admin.users.read`
pub fn list_jobs(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let st_f =
    list.key_find(qs, "status")
    |> result.unwrap("")
    |> string.trim
  let lim_str =
    list.key_find(qs, "limit")
    |> result.unwrap("100")
    |> string.trim
  let lim = case int.parse(lim_str) {
    Ok(n) ->
      case n > 500 {
        True -> 500
        False ->
          case n < 1 {
            True -> 100
            False -> n
          }
      }
    Error(_) -> 100
  }
  case
    pog.query(
      "select id::text, trigger_id::text, coalesce(user_id::text,''), channel, payload_json::text, scheduled_at::text, coalesce(sent_at::text,''), status from notification_jobs where ($1 = '' or status = $1) order by id desc limit $2",
    )
    |> pog.parameter(pog.text(st_f))
    |> pog.parameter(pog.int(lim))
    |> pog.returning(job_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "jobs_query_failed")
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

fn queue_job_decoder() -> decode.Decoder(
  #(String, Option(String), String, String, String),
) {
  decode.field("trigger_code", decode.string, fn(tc) {
    decode.optional_field("user_id", "", decode.string, fn(uid) {
      decode.field("channel", decode.string, fn(ch) {
        decode.field("payload_json", decode.string, fn(pj) {
          decode.field("scheduled_at", decode.string, fn(sch) {
            let u = case string.trim(uid) == "" {
              True -> None
              False -> Some(string.trim(uid))
            }
            decode.success(#(
              string.trim(tc),
              u,
              string.trim(ch),
              string.trim(pj),
              string.trim(sch),
            ))
          })
        })
      })
    })
  })
}

/// POST /api/v1/messaging/jobs — kuyruğa iş (worker gönderimi ayrı); `admin.users.read`
pub fn queue_job(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, queue_job_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(tc, uid_opt, ch, pj, sch)) -> {
          let ch_l = string.lowercase(ch)
          case tc == "" || pj == "" || sch == "" {
            True -> json_err(400, "trigger_payload_schedule_required")
            False ->
              case ch_l == "sms" || ch_l == "email" || ch_l == "whatsapp" {
                False -> json_err(400, "invalid_channel")
                True ->
                  case
                    pog.query(
                      "select id from notification_triggers where code = $1 limit 1",
                    )
                    |> pog.parameter(pog.text(tc))
                    |> pog.returning(decode_col0_int())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "trigger_lookup_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [] -> json_err(400, "unknown_trigger")
                        [tid] -> {
                          let uid_p = case uid_opt {
                            None -> pog.null()
                            Some(u) -> pog.text(u)
                          }
                          let cfg = case pj == "" {
                            True -> "{}"
                            False -> pj
                          }
                          case
                            pog.query(
                              "insert into notification_jobs (trigger_id, user_id, channel, payload_json, scheduled_at, status) values ($1, $2::uuid, $3, $4::jsonb, $5::timestamptz, 'pending') returning id::text",
                            )
                            |> pog.parameter(pog.int(tid))
                            |> pog.parameter(uid_p)
                            |> pog.parameter(pog.text(ch_l))
                            |> pog.parameter(pog.text(cfg))
                            |> pog.parameter(pog.text(sch))
                            |> pog.returning(row_dec.col0_string())
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "job_insert_failed")
                            Ok(r) ->
                              case r.rows {
                                [id] -> {
                                  let out =
                                    json.object([#("id", json.string(id))])
                                    |> json.to_string
                                  wisp.json_response(out, 201)
                                }
                                _ -> json_err(500, "unexpected")
                              }
                          }
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
