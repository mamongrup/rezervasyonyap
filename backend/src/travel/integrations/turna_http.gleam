//// Turna panel test — POST /api/v1/integrations/turna/ping

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/result
import gleam/string
import travel/identity/permissions
import travel/integrations/turna
import travel/integrations/turna_config
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

fn ping_body_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("base_url", decode.string, fn(base_url) {
    decode.field("api_key", decode.string, fn(api_key) {
      decode.success(#(base_url, api_key))
    })
  })
}

fn merge_ping_body(
  cfg: turna_config.TurnaConfig,
  body: #(String, String),
) -> turna_config.TurnaConfig {
  let #(base_url, api_key) = body
  turna_config.TurnaConfig(
    enabled: cfg.enabled,
    base_url: case string.trim(base_url) {
      "" -> cfg.base_url
      s -> s
    },
    api_key: case string.trim(api_key) {
      "" -> cfg.api_key
      s -> s
    },
    country_code: cfg.country_code,
    currency_code: cfg.currency_code,
    language_code: cfg.language_code,
    flight_leg_mask: cfg.flight_leg_mask,
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
          let cfg0 = turna_config.load(ctx.db)
          let cfg = case read_body_string(req) {
            Ok(body) ->
              case string.trim(body) {
                "" -> cfg0
                _ ->
                  case json.parse(body, ping_body_decoder()) {
                    Ok(pair) -> merge_ping_body(cfg0, pair)
                    Error(_) -> cfg0
                  }
              }
            Error(_) -> cfg0
          }
          case turna.login(cfg) {
            Error(e) -> json_err(502, e)
            Ok(result) -> {
              let preview =
                case string.length(result.session_id) > 8 {
                  True -> string.slice(result.session_id, 0, 8) <> "…"
                  False ->
                    case result.session_id {
                      "" -> "ok"
                      s -> s
                    }
                }
              let out =
                json.object([
                  #("ok", json.bool(True)),
                  #("session_preview", json.string(preview)),
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
