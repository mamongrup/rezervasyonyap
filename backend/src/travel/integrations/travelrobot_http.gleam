//// Travelrobot panel test — POST /api/v1/integrations/travelrobot/ping

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/result
import gleam/string
import travel/identity/permissions
import travel/integrations/travelrobot
import travel/integrations/travelrobot_config
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

fn ping_body_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("base_url", decode.string, fn(base_url) {
    decode.field("channel_code", decode.string, fn(channel_code) {
      decode.field("channel_password", decode.string, fn(channel_password) {
        decode.success(#(base_url, channel_code, channel_password))
      })
    })
  })
}

fn merge_ping_body(
  cfg: travelrobot_config.TravelrobotConfig,
  body: #(String, String, String),
) -> travelrobot_config.TravelrobotConfig {
  let #(base_url, channel_code, channel_password) = body
  travelrobot_config.TravelrobotConfig(
    enabled: cfg.enabled,
    base_url: case string.trim(base_url) {
      "" -> cfg.base_url
      s -> s
    },
    channel_code: case string.trim(channel_code) {
      "" -> cfg.channel_code
      s -> s
    },
    channel_password: case string.trim(channel_password) {
      "" -> cfg.channel_password
      s -> s
    },
    listing_status: cfg.listing_status,
    import_tours: cfg.import_tours,
    import_hotels: cfg.import_hotels,
    import_flights: cfg.import_flights,
    import_car_rental: cfg.import_car_rental,
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
          let cfg0 = travelrobot_config.load(ctx.db)
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
          case travelrobot.create_token(cfg) {
            Error(e) -> json_err(502, e)
            Ok(token) -> {
              let preview =
                case string.length(token.token_code) > 8 {
                  True -> string.slice(token.token_code, 0, 8) <> "…"
                  False -> token.token_code
                }
              let out =
                json.object([
                  #("ok", json.bool(True)),
                  #("token_preview", json.string(preview)),
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
