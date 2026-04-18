//// Aktif sanal POS seçimi (payment_providers.is_active — tek aktif).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
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

/// GET /api/v1/payments/active-provider
pub fn get_active_provider(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select code::text, display_name::text from payment_providers where is_active = true limit 1",
    )
    |> pog.returning({
      use c <- decode.field(0, decode.string)
      use d <- decode.field(1, decode.string)
      decode.success(#(c, d))
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> {
          let body =
            json.object([#("active", json.null())])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        [#(code, name)] -> {
          let body =
            json.object([
              #("active", json.string(code)),
              #("display_name", json.string(name)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn set_decoder() -> decode.Decoder(String) {
  decode.field("code", decode.string, fn(code) { decode.success(code) })
}

/// POST /api/v1/payments/active-provider — `{ "code": "paytr" | "paratika" }` — `admin.integrations.write`
pub fn set_active_provider(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.write") {
        False -> json_err(403, "forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, set_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(code_raw) -> {
                  let code = string.lowercase(string.trim(code_raw))
                  case code == "paytr" || code == "paratika" {
                    False -> json_err(400, "invalid_code")
                    True ->
                      case
                        pog.transaction(ctx.db, fn(conn) {
                          case
                            pog.query(
                              "update payment_providers set is_active = false",
                            )
                            |> pog.execute(conn)
                          {
                            Error(_) -> Error("clear_failed")
                            Ok(_) ->
                              case
                                pog.query(
                                  "update payment_providers set is_active = true where code = $1 returning code::text",
                                )
                                |> pog.parameter(pog.text(code))
                                |> pog.returning(row_dec.col0_string())
                                |> pog.execute(conn)
                              {
                                Error(_) -> Error("update_failed")
                                Ok(ret) ->
                                  case ret.rows {
                                    [_] -> Ok(Nil)
                                    [] -> Error("unknown_provider")
                                    _ -> Error("unexpected_rows")
                                  }
                              }
                          }
                        })
                      {
                        Ok(_) -> {
                          let body =
                            json.object([
                              #("ok", json.bool(True)),
                              #("active", json.string(code)),
                            ])
                            |> json.to_string
                          wisp.json_response(body, 200)
                        }
                        Error(pog.TransactionQueryError(_)) ->
                          json_err(500, "transaction_failed")
                        Error(pog.TransactionRolledBack(msg)) ->
                          json_err(400, msg)
                      }
                  }
                }
              }
          }
      }
  }
}
