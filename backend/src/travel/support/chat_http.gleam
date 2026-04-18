//// Canlı destek oturumu ve mesajlar (150_support_chat).

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
import travel/db/decode_helpers as row_dec
import wisp.{type Request, type Response}

import travel/support/chat_ai_reply

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

fn bearer_token(req: Request) -> String {
  case request.get_header(req, "authorization") {
    Error(_) -> ""
    Ok(h) -> {
      let t = string.trim(h)
      case string.starts_with(string.lowercase(t), "bearer ") {
        True ->
          t
          |> string.drop_start(7)
          |> string.trim
        False -> ""
      }
    }
  }
}

fn user_id_for_token(ctx: Context, token: String) -> Option(String) {
  case string.trim(token) == "" {
    True -> None
    False ->
      case
        pog.query(
          "select u.id::text from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
        )
        |> pog.parameter(pog.text(token))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Ok(ret) ->
          case ret.rows {
            [id] -> Some(id)
            _ -> None
          }
        Error(_) -> None
      }
  }
}

fn channel_id_for_code(ctx: Context, code: String) -> Result(Int, Nil) {
  let row = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case
    pog.query("select id from support_channels where code = $1 limit 1")
    |> pog.parameter(pog.text(string.trim(code)))
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Ok(ret) ->
      case ret.rows {
        [n] -> Ok(n)
        _ -> Error(Nil)
      }
    Error(_) -> Error(Nil)
  }
}

fn channel_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use cj <- decode.field(2, decode.string)
  decode.success(#(id, code, cj))
}

fn channel_json(row: #(String, String, String)) -> json.Json {
  let #(id, code, cj) = row
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("config_json", json.string(cj)),
  ])
}

/// GET /api/v1/support/chat/channels
pub fn list_channels(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, code, coalesce(config_json::text,'{}') from support_channels order by id",
    )
    |> pog.returning(channel_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "channels_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, channel_json)
      let body =
        json.object([#("channels", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn session_row() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use uid <- decode.field(1, decode.string)
  use cid <- decode.field(2, decode.string)
  use sa <- decode.field(3, decode.string)
  use ca <- decode.field(4, decode.string)
  use am <- decode.field(5, decode.string)
  use loc <- decode.field(6, decode.string)
  decode.success(#(id, uid, cid, sa, ca, am, loc))
}

fn session_json(row: #(String, String, String, String, String, String, String)) -> json.Json {
  let #(id, uid, cid, sa, ca, am, loc) = row
  let uidj = case uid == "" {
    True -> json.null()
    False -> json.string(uid)
  }
  let caj = case ca == "" {
    True -> json.null()
    False -> json.string(ca)
  }
  json.object([
    #("id", json.string(id)),
    #("user_id", uidj),
    #("channel_id", json.string(cid)),
    #("started_at", json.string(sa)),
    #("closed_at", caj),
    #("ai_mode", json.string(am)),
    #("locale", json.string(loc)),
  ])
}

fn create_session_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("channel_code", decode.string, fn(cc) {
    decode.optional_field("ai_mode", "off", decode.string, fn(am) {
      decode.optional_field("locale", "tr", decode.string, fn(loc) {
        decode.success(#(string.trim(cc), string.trim(am), string.trim(loc)))
      })
    })
  })
}

fn normalize_ai_mode(s: String) -> Result(String, Nil) {
  let l = string.lowercase(s)
  case l == "off" || l == "sales" || l == "cross_sell" || l == "concierge" {
    True -> Ok(l)
    False -> Error(Nil)
  }
}

/// Site locale kataloğu (231) ile uyumlu; bilinmeyen kod → tr.
fn normalize_chat_locale(s: String) -> String {
  let l = string.lowercase(string.trim(s))
  case l {
    "tr" | "en" | "de" | "ru" | "zh" | "fr" -> l
    _ -> "tr"
  }
}

/// POST /api/v1/support/chat/sessions
pub fn create_session(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_session_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(cc, am_raw, loc_raw)) ->
          case cc == "" {
            True -> json_err(400, "channel_code_required")
            False ->
              case normalize_ai_mode(am_raw) {
                Error(_) -> json_err(400, "invalid_ai_mode")
                Ok(am) ->
                  case channel_id_for_code(ctx, cc) {
                    Error(_) -> json_err(400, "unknown_channel")
                    Ok(ch_id) -> {
                      let loc = normalize_chat_locale(loc_raw)
                      let tok = bearer_token(req)
                      let uid_p = case user_id_for_token(ctx, tok) {
                        Some(u) -> pog.text(u)
                        None -> pog.null()
                      }
                      case
                        pog.query(
                          "insert into chat_sessions (user_id, channel_id, ai_mode, locale) values ($1::uuid, $2::smallint, $3, $4) returning id::text",
                        )
                        |> pog.parameter(uid_p)
                        |> pog.parameter(pog.int(ch_id))
                        |> pog.parameter(pog.text(am))
                        |> pog.parameter(pog.text(loc))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "session_create_failed")
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

/// GET /api/v1/support/chat/sessions — oturum açmış kullanıcıya göre
pub fn list_my_sessions(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case user_id_for_token(ctx, bearer_token(req)) {
    None -> json_err(401, "missing_or_invalid_session")
    Some(uid) ->
      case
        pog.query(
          "select id::text, coalesce(user_id::text,''), channel_id::text, started_at::text, coalesce(closed_at::text,''), ai_mode, coalesce(locale,'tr') from chat_sessions where user_id = $1::uuid order by started_at desc limit 50",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.returning(session_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "sessions_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, session_json)
          let body =
            json.object([#("sessions", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

/// GET /api/v1/support/chat/sessions/:session_id
pub fn get_session(req: Request, ctx: Context, session_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, coalesce(user_id::text,''), channel_id::text, started_at::text, coalesce(closed_at::text,''), ai_mode, coalesce(locale,'tr') from chat_sessions where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(session_id)))
    |> pog.returning(session_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "session_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [row] -> {
          let body = session_json(row) |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

/// PATCH /api/v1/support/chat/sessions/:session_id — { "close": true }
pub fn close_session(req: Request, ctx: Context, session_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, decode.field("close", decode.bool, fn(c) { decode.success(c) })) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(False) -> json_err(400, "close_required")
        Ok(True) ->
          case
            pog.query(
              "update chat_sessions set closed_at = now() where id = $1::uuid and closed_at is null returning id::text",
            )
            |> pog.parameter(pog.text(string.trim(session_id)))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "session_close_failed")
            Ok(r) ->
              case r.rows {
                [] -> json_err(404, "not_found_or_already_closed")
                [id] -> {
                  let out =
                    json.object([#("id", json.string(id)), #("ok", json.bool(True))])
                    |> json.to_string
                  wisp.json_response(out, 200)
                }
                _ -> json_err(500, "unexpected")
              }
          }
      }
  }
}

fn msg_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use role <- decode.field(1, decode.string)
  use bd <- decode.field(2, decode.string)
  use mj <- decode.field(3, decode.string)
  use ca <- decode.field(4, decode.string)
  decode.success(#(id, role, bd, mj, ca))
}

fn msg_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, role, bd, mj, ca) = row
  json.object([
    #("id", json.string(id)),
    #("role", json.string(role)),
    #("body", json.string(bd)),
    #("meta_json", json.string(mj)),
    #("created_at", json.string(ca)),
  ])
}

/// GET /api/v1/support/chat/sessions/:session_id/messages
pub fn list_messages(req: Request, ctx: Context, session_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, role, body, coalesce(meta_json::text,'{}'), created_at::text from chat_messages where session_id = $1::uuid order by id asc limit 500",
    )
    |> pog.parameter(pog.text(string.trim(session_id)))
    |> pog.returning(msg_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "messages_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, msg_json)
      let body =
        json.object([#("messages", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn post_msg_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("body", decode.string, fn(b) {
    decode.optional_field("meta_json", "{}", decode.string, fn(mj) {
      decode.success(#(string.trim(b), string.trim(mj)))
    })
  })
}

/// POST /api/v1/support/chat/sessions/:session_id/messages — istemci yalnızca user rolü
pub fn post_message(req: Request, ctx: Context, session_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, post_msg_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(bd, mj_raw)) ->
          case bd == "" {
            True -> json_err(400, "body_required")
            False -> {
              let cfg = case mj_raw == "" {
                True -> "{}"
                False -> mj_raw
              }
              case
                pog.query(
                  "insert into chat_messages (session_id, role, body, meta_json) values ($1::uuid, 'user', $2, $3::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(session_id)))
                |> pog.parameter(pog.text(bd))
                |> pog.parameter(pog.text(cfg))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "message_insert_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let assistant_id = chat_ai_reply.try_append_assistant_reply(
                        ctx,
                        string.trim(session_id),
                      )
                      let aid_j = case assistant_id {
                        Some(a) -> json.string(a)
                        None -> json.null()
                      }
                      let out =
                        json.object([
                          #("id", json.string(id)),
                          #("assistant_message_id", aid_j),
                        ])
                        |> json.to_string
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

fn fu_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use step <- decode.field(1, decode.string)
  use sa <- decode.field(2, decode.string)
  use sent <- decode.field(3, decode.string)
  use pj <- decode.field(4, decode.string)
  decode.success(#(id, step, sa, sent, pj))
}

fn fu_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, step, sa, sent, pj) = row
  let sentj = case sent == "" {
    True -> json.null()
    False -> json.string(sent)
  }
  json.object([
    #("id", json.string(id)),
    #("step", json.string(step)),
    #("scheduled_at", json.string(sa)),
    #("sent_at", sentj),
    #("payload_json", json.string(pj)),
  ])
}

/// GET /api/v1/support/chat/sessions/:session_id/followups
pub fn list_followups(req: Request, ctx: Context, session_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, step::text, scheduled_at::text, coalesce(sent_at::text,''), coalesce(payload_json::text,'{}') from chat_followup_sequences where session_id = $1::uuid order by step asc",
    )
    |> pog.parameter(pog.text(string.trim(session_id)))
    |> pog.returning(fu_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "followups_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, fu_json)
      let body =
        json.object([#("followups", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn fu_create_decoder() -> decode.Decoder(#(Int, String, String)) {
  decode.field("step", decode.int, fn(step) {
    decode.field("scheduled_at", decode.string, fn(sa) {
      decode.optional_field("payload_json", "{}", decode.string, fn(pj) {
        decode.success(#(step, string.trim(sa), string.trim(pj)))
      })
    })
  })
}

/// POST /api/v1/support/chat/sessions/:session_id/followups
pub fn create_followup(req: Request, ctx: Context, session_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, fu_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(step, sa, pj_raw)) ->
          case sa == "" {
            True -> json_err(400, "scheduled_at_required")
            False -> {
              let cfg = case pj_raw == "" {
                True -> "{}"
                False -> pj_raw
              }
              case
                pog.query(
                  "insert into chat_followup_sequences (session_id, step, scheduled_at, payload_json) values ($1::uuid, $2::smallint, $3::timestamptz, $4::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(session_id)))
                |> pog.parameter(pog.int(step))
                |> pog.parameter(pog.text(sa))
                |> pog.parameter(pog.text(cfg))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "followup_insert_failed")
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
