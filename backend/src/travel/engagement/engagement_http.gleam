//// Favoriler, son gezilenler, karşılaştırma setleri, sesli arama günlüğü (140_engagement).

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

fn session_key_from_req(req: Request) -> String {
  let from_header =
    request.get_header(req, "x-session-key")
    |> result.unwrap("")
    |> string.trim
  case from_header != "" {
    True -> from_header
    False -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      list.key_find(qs, "session_key")
      |> result.unwrap("")
      |> string.trim
    }
  }
}

fn can_access_comparison_set(
  authed: Option(String),
  client_sk: String,
  db_user: String,
  db_sk: String,
) -> Bool {
  case authed {
    Some(uid) -> db_user != "" && db_user == uid
    None -> db_sk != "" && client_sk != "" && db_sk == client_sk
  }
}

// --- Favoriler (oturum zorunlu) ---

fn favorite_row() -> decode.Decoder(#(String, String, String, String)) {
  use lid <- decode.field(0, decode.string)
  use ca <- decode.field(1, decode.string)
  use slug <- decode.field(2, decode.string)
  use st <- decode.field(3, decode.string)
  decode.success(#(lid, ca, slug, st))
}

fn favorite_json(row: #(String, String, String, String)) -> json.Json {
  let #(lid, ca, slug, st) = row
  json.object([
    #("listing_id", json.string(lid)),
    #("created_at", json.string(ca)),
    #("slug", json.string(slug)),
    #("status", json.string(st)),
  ])
}

/// GET /api/v1/engagement/favorites
pub fn list_favorites(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case user_id_for_token(ctx, bearer_token(req)) {
    None -> json_err(401, "missing_or_invalid_session")
    Some(uid) ->
      case
        pog.query(
          "select f.listing_id::text, f.created_at::text, coalesce(l.slug, ''), coalesce(l.status::text, '') from favorites f left join listings l on l.id = f.listing_id where f.user_id = $1::uuid order by f.created_at desc limit 500",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.returning(favorite_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "favorites_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, favorite_json)
          let body =
            json.object([#("favorites", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn listing_id_decoder() -> decode.Decoder(String) {
  decode.field("listing_id", decode.string, fn(s) { decode.success(string.trim(s)) })
}

/// POST /api/v1/engagement/favorites  { "listing_id": "uuid" }
pub fn add_favorite(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case user_id_for_token(ctx, bearer_token(req)) {
    None -> json_err(401, "missing_or_invalid_session")
    Some(uid) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, listing_id_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(lid) ->
              case lid == "" {
                True -> json_err(400, "listing_id_required")
                False -> {
                  let _ =
                    pog.query(
                      "insert into favorites (user_id, listing_id) values ($1::uuid, $2::uuid) on conflict do nothing",
                    )
                    |> pog.parameter(pog.text(uid))
                    |> pog.parameter(pog.text(lid))
                    |> pog.execute(ctx.db)
                  wisp.json_response("{\"ok\":true}", 200)
                }
              }
          }
      }
  }
}

/// DELETE /api/v1/engagement/favorites/:listing_id
pub fn remove_favorite(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case user_id_for_token(ctx, bearer_token(req)) {
    None -> json_err(401, "missing_or_invalid_session")
    Some(uid) ->
      case
        pog.query(
          "delete from favorites where user_id = $1::uuid and listing_id = $2::uuid",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.parameter(pog.text(string.trim(listing_id)))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "favorite_delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}

// --- Son gezilenler (oturum veya session_key) ---

fn recent_row() -> decode.Decoder(#(String, String, String, String)) {
  use lid <- decode.field(0, decode.string)
  use va <- decode.field(1, decode.string)
  use slug <- decode.field(2, decode.string)
  use st <- decode.field(3, decode.string)
  decode.success(#(lid, va, slug, st))
}

fn recent_json(row: #(String, String, String, String)) -> json.Json {
  let #(lid, va, slug, st) = row
  json.object([
    #("listing_id", json.string(lid)),
    #("viewed_at", json.string(va)),
    #("slug", json.string(slug)),
    #("status", json.string(st)),
  ])
}

/// GET /api/v1/engagement/recently-viewed  (?session_key= veya X-Session-Key; girişliyse kullanıcıya göre)
pub fn list_recently_viewed(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let tok = bearer_token(req)
  case user_id_for_token(ctx, tok) {
    Some(uid) ->
      case
        pog.query(
          "select rv.listing_id::text, rv.viewed_at::text, coalesce(l.slug, ''), coalesce(l.status::text, '') from recently_viewed rv left join listings l on l.id = rv.listing_id where rv.user_id = $1::uuid order by rv.viewed_at desc limit 50",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.returning(recent_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "recently_viewed_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, recent_json)
          let body =
            json.object([#("items", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    None -> {
      let sk = session_key_from_req(req)
      case sk == "" {
        True -> json_err(400, "session_key_required")
        False ->
          case
            pog.query(
              "select rv.listing_id::text, rv.viewed_at::text, coalesce(l.slug, ''), coalesce(l.status::text, '') from recently_viewed rv left join listings l on l.id = rv.listing_id where rv.session_key = $1 order by rv.viewed_at desc limit 50",
            )
            |> pog.parameter(pog.text(sk))
            |> pog.returning(recent_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "recently_viewed_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, recent_json)
              let body =
                json.object([#("items", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
    }
  }
}

fn add_recent_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("listing_id", decode.string, fn(lid) {
    decode.optional_field("session_key", "", decode.string, fn(sk) {
      decode.success(#(string.trim(lid), string.trim(sk)))
    })
  })
}

/// POST /api/v1/engagement/recently-viewed  { "listing_id", "session_key"? }
pub fn add_recently_viewed(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, add_recent_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(lid, body_sk)) ->
          case lid == "" {
            True -> json_err(400, "listing_id_required")
            False -> {
              let tok = bearer_token(req)
              case user_id_for_token(ctx, tok) {
                Some(uid) ->
                  case
                    pog.query(
                      "insert into recently_viewed (user_id, session_key, listing_id) values ($1::uuid, null, $2::uuid)",
                    )
                    |> pog.parameter(pog.text(uid))
                    |> pog.parameter(pog.text(lid))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "recently_viewed_insert_failed")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 201)
                  }
                None -> {
                  let sk = case body_sk != "" {
                    True -> body_sk
                    False -> session_key_from_req(req)
                  }
                  case sk == "" {
                    True -> json_err(400, "session_key_required")
                    False ->
                      case
                        pog.query(
                          "insert into recently_viewed (user_id, session_key, listing_id) values (null, $1, $2::uuid)",
                        )
                        |> pog.parameter(pog.text(sk))
                        |> pog.parameter(pog.text(lid))
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "recently_viewed_insert_failed")
                        Ok(_) -> wisp.json_response("{\"ok\":true}", 201)
                      }
                  }
                }
              }
            }
          }
      }
  }
}

// --- Karşılaştırma setleri ---

fn set_summary_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use cj <- decode.field(1, decode.string)
  use ca <- decode.field(2, decode.string)
  decode.success(#(id, cj, ca))
}

fn set_summary_json(row: #(String, String, String)) -> json.Json {
  let #(id, cj, ca) = row
  json.object([
    #("id", json.string(id)),
    #("criteria_json", json.string(cj)),
    #("created_at", json.string(ca)),
  ])
}

fn get_set_owner(ctx: Context, set_id: String) -> Result(#(String, String), Nil) {
  case
    pog.query(
      "select coalesce(user_id::text,''), coalesce(session_key,'') from comparison_sets where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(set_id)))
    |> pog.returning({
      use u <- decode.field(0, decode.string)
      use s <- decode.field(1, decode.string)
      decode.success(#(u, s))
    })
    |> pog.execute(ctx.db)
  {
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error(Nil)
      }
    Error(_) -> Error(Nil)
  }
}

/// GET /api/v1/engagement/comparison-sets
pub fn list_comparison_sets(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let tok = bearer_token(req)
  let authed = user_id_for_token(ctx, tok)
  let sk = session_key_from_req(req)
  case authed {
    Some(uid) ->
      case
        pog.query(
          "select id::text, coalesce(criteria_json::text,'{}'), created_at::text from comparison_sets where user_id = $1::uuid order by created_at desc limit 50",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.returning(set_summary_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "comparison_sets_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, set_summary_json)
          let body =
            json.object([#("sets", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    None ->
      case sk == "" {
        True -> json_err(400, "session_key_required")
        False ->
          case
            pog.query(
              "select id::text, coalesce(criteria_json::text,'{}'), created_at::text from comparison_sets where session_key = $1 order by created_at desc limit 50",
            )
            |> pog.parameter(pog.text(sk))
            |> pog.returning(set_summary_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "comparison_sets_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, set_summary_json)
              let body =
                json.object([#("sets", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn create_set_decoder() -> decode.Decoder(#(String, String)) {
  decode.optional_field("criteria_json", "{}", decode.string, fn(cj) {
    decode.optional_field("session_key", "", decode.string, fn(sk) {
      decode.success(#(string.trim(cj), string.trim(sk)))
    })
  })
}

/// POST /api/v1/engagement/comparison-sets
pub fn create_comparison_set(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_set_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(cj_raw, body_sk)) -> {
          let cfg = case cj_raw == "" {
            True -> "{}"
            False -> cj_raw
          }
          let tok = bearer_token(req)
          case user_id_for_token(ctx, tok) {
            Some(uid) ->
              case
                pog.query(
                  "insert into comparison_sets (user_id, session_key, criteria_json) values ($1::uuid, null, $2::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(uid))
                |> pog.parameter(pog.text(cfg))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "comparison_set_create_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
                      wisp.json_response(out, 201)
                    }
                    _ -> json_err(500, "unexpected")
                  }
              }
            None -> {
              let sk = case body_sk != "" {
                True -> body_sk
                False -> session_key_from_req(req)
              }
              case sk == "" {
                True -> json_err(400, "session_key_required")
                False ->
                  case
                    pog.query(
                      "insert into comparison_sets (user_id, session_key, criteria_json) values (null, $1, $2::jsonb) returning id::text",
                    )
                    |> pog.parameter(pog.text(sk))
                    |> pog.parameter(pog.text(cfg))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "comparison_set_create_failed")
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

/// DELETE /api/v1/engagement/comparison-sets/:set_id
pub fn delete_comparison_set(req: Request, ctx: Context, set_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  let tok = bearer_token(req)
  let authed = user_id_for_token(ctx, tok)
  let sk = session_key_from_req(req)
  case get_set_owner(ctx, set_id) {
    Error(_) -> json_err(404, "not_found")
    Ok(#(db_u, db_s)) ->
      case can_access_comparison_set(authed, sk, db_u, db_s) {
        False -> json_err(403, "forbidden")
        True ->
          case
            pog.query("delete from comparison_sets where id = $1::uuid")
            |> pog.parameter(pog.text(string.trim(set_id)))
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "comparison_set_delete_failed")
            Ok(ret) ->
              case ret.count {
                0 -> json_err(404, "not_found")
                _ -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
  }
}

fn cmp_item_detail_row() -> decode.Decoder(#(String, String, String)) {
  use lid <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  decode.success(#(lid, slug, st))
}

/// GET /api/v1/engagement/comparison-sets/:set_id/items
pub fn list_comparison_items(req: Request, ctx: Context, set_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let tok = bearer_token(req)
  let authed = user_id_for_token(ctx, tok)
  let sk = session_key_from_req(req)
  case get_set_owner(ctx, set_id) {
    Error(_) -> json_err(404, "not_found")
    Ok(#(db_u, db_s)) ->
      case can_access_comparison_set(authed, sk, db_u, db_s) {
        False -> json_err(403, "forbidden")
        True ->
          case
            pog.query(
              "select ci.listing_id::text, coalesce(l.slug, ''), coalesce(l.status::text, '') from comparison_items ci left join listings l on l.id = ci.listing_id where ci.set_id = $1::uuid order by ci.id asc",
            )
            |> pog.parameter(pog.text(string.trim(set_id)))
            |> pog.returning(cmp_item_detail_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "comparison_items_query_failed")
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(row) {
                  let #(lid, slug, st) = row
                  json.object([
                    #("listing_id", json.string(lid)),
                    #("slug", json.string(slug)),
                    #("status", json.string(st)),
                  ])
                })
              let body =
                json.object([#("items", json.preprocessed_array(arr))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

/// POST /api/v1/engagement/comparison-sets/:set_id/items  { "listing_id" }
pub fn add_comparison_item(req: Request, ctx: Context, set_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  let tok = bearer_token(req)
  let authed = user_id_for_token(ctx, tok)
  let sk = session_key_from_req(req)
  case get_set_owner(ctx, set_id) {
    Error(_) -> json_err(404, "not_found")
    Ok(#(db_u, db_s)) ->
      case can_access_comparison_set(authed, sk, db_u, db_s) {
        False -> json_err(403, "forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, listing_id_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(lid) ->
                  case lid == "" {
                    True -> json_err(400, "listing_id_required")
                    False -> {
                      let _ =
                        pog.query(
                          "insert into comparison_items (set_id, listing_id) values ($1::uuid, $2::uuid) on conflict do nothing",
                        )
                        |> pog.parameter(pog.text(string.trim(set_id)))
                        |> pog.parameter(pog.text(lid))
                        |> pog.execute(ctx.db)
                      wisp.json_response("{\"ok\":true}", 200)
                    }
                  }
              }
          }
      }
  }
}

/// DELETE /api/v1/engagement/comparison-sets/:set_id/items/:listing_id
pub fn remove_comparison_item(
  req: Request,
  ctx: Context,
  set_id: String,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  let tok = bearer_token(req)
  let authed = user_id_for_token(ctx, tok)
  let sk = session_key_from_req(req)
  case get_set_owner(ctx, set_id) {
    Error(_) -> json_err(404, "not_found")
    Ok(#(db_u, db_s)) ->
      case can_access_comparison_set(authed, sk, db_u, db_s) {
        False -> json_err(403, "forbidden")
        True ->
          case
            pog.query(
              "delete from comparison_items where set_id = $1::uuid and listing_id = $2::uuid",
            )
            |> pog.parameter(pog.text(string.trim(set_id)))
            |> pog.parameter(pog.text(string.trim(listing_id)))
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "comparison_item_delete_failed")
            Ok(ret) ->
              case ret.count {
                0 -> json_err(404, "not_found")
                _ -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
  }
}

// --- Sesli arama günlüğü ---

fn voice_log_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("transcript", decode.string, fn(t) {
    decode.optional_field("resolved_query_json", "{}", decode.string, fn(rj) {
      decode.success(#(string.trim(t), string.trim(rj)))
    })
  })
}

/// POST /api/v1/engagement/voice-search-log
pub fn log_voice_search(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, voice_log_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(tr, rj_raw)) ->
          case tr == "" {
            True -> json_err(400, "transcript_required")
            False -> {
              let cfg = case rj_raw == "" {
                True -> "{}"
                False -> rj_raw
              }
              let tok = bearer_token(req)
              let uid_opt = user_id_for_token(ctx, tok)
              let uid_param = case uid_opt {
                Some(u) -> pog.text(u)
                None -> pog.null()
              }
              case
                pog.query(
                  "insert into voice_search_logs (user_id, transcript, resolved_query_json) values ($1::uuid, $2, $3::jsonb)",
                )
                |> pog.parameter(uid_param)
                |> pog.parameter(pog.text(tr))
                |> pog.parameter(pog.text(cfg))
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "voice_log_insert_failed")
                Ok(_) -> wisp.json_response("{\"ok\":true}", 201)
              }
            }
          }
      }
  }
}
