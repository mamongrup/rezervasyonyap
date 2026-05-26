//// Travelrobot / KPlus HTTP istemcisi — CreateTokenV2.

import gleam/dynamic/decode
import gleam/json
import gleam/string
import travel/integrations/travelrobot_config.{type TravelrobotConfig}
import travel/net/http_client

pub type TokenResult {
  TokenResult(token_code: String, raw_response: String)
}

fn token_body(cfg: TravelrobotConfig) -> String {
  json.object([
    #(
      "channelCredential",
      json.object([
        #("ChannelCode", json.string(cfg.channel_code)),
        #("ChannelPassword", json.string(cfg.channel_password)),
      ]),
    ),
  ])
  |> json.to_string
}

fn error_message_from_raw(raw: String) -> String {
  case json.parse(raw, decode.field("ErrorMessage", decode.string, decode.success)) {
    Ok(m) ->
      case string.trim(m) {
        "" -> "travelrobot_api_error"
        t -> "travelrobot_api_error:" <> t
      }
    Error(_) -> "travelrobot_api_error"
  }
}

fn token_code_from_raw(raw: String) -> Result(String, Nil) {
  let nested =
    decode.field(
      "Result",
      decode.field("TokenCode", decode.string, fn(c) { decode.success(c) }),
      fn(c) { decode.success(c) },
    )
  case json.parse(raw, nested) {
    Ok(t) ->
      case string.trim(t) {
        "" -> Error(Nil)
        s -> Ok(s)
      }
    Error(_) ->
      case json.parse(raw, decode.field("TokenCode", decode.string, fn(c) { decode.success(c) })) {
        Ok(t) ->
          case string.trim(t) {
            "" -> Error(Nil)
            s -> Ok(s)
          }
        Error(_) -> Error(Nil)
      }
  }
}

fn has_error(raw: String) -> Bool {
  case json.parse(raw, decode.field("HasError", decode.bool, decode.success)) {
    Ok(True) -> True
    _ -> False
  }
}

pub fn create_token(cfg: TravelrobotConfig) -> Result(TokenResult, String) {
  case travelrobot_config.credentials_ready(cfg) {
    False -> Error("travelrobot_credentials_missing")
    True -> {
      let url = travelrobot_config.create_token_url(cfg.base_url)
      let body = token_body(cfg)
      case http_client.post_json(url, body, "") {
        Error(e) -> Error("travelrobot_http_failed:" <> e)
        Ok(raw) -> {
          case has_error(raw) {
            True -> Error(error_message_from_raw(raw))
            False ->
              case token_code_from_raw(raw) {
                Ok(t) -> Ok(TokenResult(token_code: t, raw_response: raw))
                Error(_) -> Error("travelrobot_token_parse_failed")
              }
          }
        }
      }
    }
  }
}
