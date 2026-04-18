//// Çok dilli URL segmentleri — localized_routes (080_content_seo).

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
import travel/db/decode_helpers as row_dec
import travel/identity/permissions
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

fn require_admin_users_read(req: Request, ctx: Context) -> Result(String, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        True -> Ok(uid)
        False -> Error(json_err(403, "forbidden"))
      }
  }
}

fn locale_id_by_code(ctx: Context, code: String) -> Result(String, Nil) {
  case
    pog.query("select id::text from locales where lower(code) = lower($1) limit 1")
    |> pog.parameter(pog.text(string.trim(code)))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error(Nil)
      }
  }
}

fn route_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use lk <- decode.field(2, decode.string)
  use ps <- decode.field(3, decode.string)
  decode.success(#(id, code, lk, ps))
}

fn route_json(row: #(String, String, String, String)) -> json.Json {
  let #(id, code, lk, ps) = row
  json.object([
    #("id", json.string(id)),
    #("locale", json.string(code)),
    #("logical_key", json.string(lk)),
    #("path_segment", json.string(ps)),
  ])
}

/// GET /api/v1/i18n/localized-routes?locale=
pub fn list_routes(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let loc =
    list.key_find(qs, "locale")
    |> result.unwrap("")
    |> string.trim
  case loc == "" {
    True ->
      case
        pog.query(
          "select r.id::text, l.code::text, r.logical_key, r.path_segment from localized_routes r join locales l on l.id = r.locale_id order by l.code, r.logical_key limit 2000",
        )
        |> pog.returning(route_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "routes_query_failed")
        Ok(ret) -> routes_response(ret.rows)
      }
    False ->
      case
        pog.query(
          "select r.id::text, l.code::text, r.logical_key, r.path_segment from localized_routes r join locales l on l.id = r.locale_id where lower(l.code) = lower($1) order by r.logical_key limit 2000",
        )
        |> pog.parameter(pog.text(loc))
        |> pog.returning(route_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "routes_query_failed")
        Ok(ret) -> routes_response(ret.rows)
      }
  }
}

fn routes_response(rows: List(#(String, String, String, String))) -> Response {
  let arr = list.map(rows, route_json)
  let body =
    json.object([#("routes", json.array(from: arr, of: fn(x) { x }))])
    |> json.to_string
  wisp.json_response(body, 200)
}

fn upsert_route_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("locale", decode.string, fn(loc) {
    decode.field("logical_key", decode.string, fn(lk) {
      decode.field("path_segment", decode.string, fn(ps) {
        decode.success(#(string.trim(loc), string.trim(lk), string.trim(ps)))
      })
    })
  })
}

/// POST /api/v1/i18n/localized-routes — aynı locale+logical_key varsa path güncellenir — `admin.users.read`
pub fn upsert_route(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, upsert_route_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(loc, lk, ps)) ->
              case loc == "" || lk == "" || ps == "" {
                True -> json_err(400, "locale_logical_key_path_required")
                False ->
                  case locale_id_by_code(ctx, loc) {
                    Error(_) -> json_err(400, "invalid_locale")
                    Ok(lid) ->
                      case
                        pog.query(
                          "insert into localized_routes (locale_id, logical_key, path_segment) values ($1::smallint, $2, $3) on conflict (locale_id, logical_key) do update set path_segment = excluded.path_segment returning id::text",
                        )
                        |> pog.parameter(pog.text(lid))
                        |> pog.parameter(pog.text(lk))
                        |> pog.parameter(pog.text(ps))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "upsert_failed")
                        Ok(r) ->
                          case r.rows {
                            [id] -> {
                              let out =
                                json.object([
                                  #("id", json.string(id)),
                                  #("ok", json.bool(True)),
                                ])
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

fn patch_route_decoder() -> decode.Decoder(#(String, String)) {
  decode.optional_field("logical_key", "", decode.string, fn(lk) {
    decode.optional_field("path_segment", "", decode.string, fn(ps) {
      decode.success(#(string.trim(lk), string.trim(ps)))
    })
  })
}

/// PATCH /api/v1/i18n/localized-routes/:id — `admin.users.read`
pub fn patch_route(req: Request, ctx: Context, route_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_route_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(lk, ps)) ->
              case lk == "" && ps == "" {
                True -> json_err(400, "no_fields")
                False -> {
                  let p_lk = case lk == "" {
                    True -> pog.null()
                    False -> pog.text(lk)
                  }
                  let p_ps = case ps == "" {
                    True -> pog.null()
                    False -> pog.text(ps)
                  }
                  case
                    pog.query(
                      "update localized_routes set logical_key = coalesce($2::text, logical_key), path_segment = coalesce($3::text, path_segment) where id = $1::uuid returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(route_id)))
                    |> pog.parameter(p_lk)
                    |> pog.parameter(p_ps)
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "update_failed")
                    Ok(r) ->
                      case r.rows {
                        [] -> json_err(404, "not_found")
                        [id] -> {
                          let out =
                            json.object([
                              #("id", json.string(id)),
                              #("ok", json.bool(True)),
                            ])
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

/// DELETE /api/v1/i18n/localized-routes/:id — `admin.users.read`
pub fn delete_route(req: Request, ctx: Context, route_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from localized_routes where id = $1::uuid")
        |> pog.parameter(pog.text(string.trim(route_id)))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}
