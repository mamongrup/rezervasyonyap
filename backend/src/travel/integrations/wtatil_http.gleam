//// Wtatil panel test — POST /api/v1/integrations/wtatil/ping

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/result
import gleam/string
import travel/identity/permissions
import travel/integrations/wtatil
import travel/integrations/wtatil_config
import wisp.{type Request, type Response}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn ping_body_decoder() -> decode.Decoder(
  #(String, String, String, String),
) {
  decode.field("base_url", decode.string, fn(base_url) {
    decode.field("application_secret_key", decode.string, fn(secret) {
      decode.field("username", decode.string, fn(username) {
        decode.field("password", decode.string, fn(password) {
          decode.success(#(base_url, secret, username, password))
        })
      })
    })
  })
}

fn merge_ping_body(
  cfg: wtatil_config.WtatilConfig,
  body: #(String, String, String, String),
) -> wtatil_config.WtatilConfig {
  let #(base_url, secret, username, password) = body
  wtatil_config.WtatilConfig(
    enabled: cfg.enabled,
    base_url: case string.trim(base_url) {
      "" -> cfg.base_url
      s -> s
    },
    application_secret_key: case string.trim(secret) {
      "" -> cfg.application_secret_key
      s -> s
    },
    username: case string.trim(username) {
      "" -> cfg.username
      s -> s
    },
    password: case string.trim(password) {
      "" -> cfg.password
      s -> s
    },
    agency_id: cfg.agency_id,
    listing_status: cfg.listing_status,
  )
}

pub fn post_ping(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.write") {
        False -> json_err(403, "forbidden")
        True -> {
          let cfg0 = wtatil_config.load(ctx.db)
          let cfg = case read_body_string(req) {
            Ok(body) ->
              case string.trim(body) {
                "" -> cfg0
                _ ->
                  case json.parse(body, ping_body_decoder()) {
                    Ok(triple) -> merge_ping_body(cfg0, triple)
                    Error(_) -> cfg0
                  }
              }
            Error(_) -> cfg0
          }
          case wtatil.fetch_token(cfg) {
            Error(e) -> json_err(502, e)
            Ok(token) -> {
              let preview =
                case string.length(token.token) > 8 {
                  True -> string.slice(token.token, 0, 8) <> "…"
                  False -> token.token
                }
              let out =
                json.object([
                  #("ok", json.bool(True)),
                  #("token_preview", json.string(preview)),
                  #("expire_date", json.string(token.expire_date)),
                  #("base_url", json.string(cfg.base_url)),
                  #("enabled", json.bool(cfg.enabled)),
                ])
                |> json.to_string
              wisp.json_response(out, 200)
            }
          }
        }
      }
  }
}
