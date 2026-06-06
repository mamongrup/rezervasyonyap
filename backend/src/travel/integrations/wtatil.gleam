//// Wtatil Tour API — token (get-token-async).

import gleam/dynamic/decode
import gleam/json
import gleam/string
import gleam/uri
import travel/integrations/wtatil_config.{type WtatilConfig}
import travel/net/http_client

pub type TokenResult {
  TokenResult(token: String, expire_date: String, raw_response: String)
}

fn qp(key: String, value: String) -> String {
  uri.percent_encode(key) <> "=" <> uri.percent_encode(value)
}

fn token_request_url(cfg: WtatilConfig) -> String {
  let base = wtatil_config.token_url(cfg)
  base
  <> "?"
  <> qp("applicationSecretKey", cfg.application_secret_key)
  <> "&"
  <> qp("userName", cfg.username)
  <> "&"
  <> qp("password", cfg.password)
}

fn token_from_raw(raw: String) -> Result(#(String, String), Nil) {
  let nested = decode.field(
    "data",
    decode.field("token", decode.string, fn(token) {
      decode.field("expireDate", decode.string, fn(exp) {
        decode.success(#(token, exp))
      })
    }),
    fn(pair) { decode.success(pair) },
  )
  case json.parse(raw, nested) {
    Ok(#(t, exp)) ->
      case string.trim(t) {
        "" -> Error(Nil)
        tok -> Ok(#(tok, string.trim(exp)))
      }
    Error(_) -> Error(Nil)
  }
}

fn error_message_from_raw(raw: String) -> String {
  case json.parse(raw, decode.field("message", decode.string, decode.success)) {
    Ok(m) ->
      case string.trim(m) {
        "" -> "wtatil_api_error"
        t -> "wtatil_api_error:" <> t
      }
    Error(_) -> "wtatil_api_error"
  }
}

fn response_status_bad(raw: String) -> Bool {
  case json.parse(raw, decode.field("responseStatus", decode.int, decode.success)) {
    Ok(2) | Ok(3) -> True
    _ -> False
  }
}

pub fn fetch_token(cfg: WtatilConfig) -> Result(TokenResult, String) {
  case wtatil_config.credentials_ready(cfg) {
    False -> Error("wtatil_credentials_missing")
    True -> {
      let url = token_request_url(cfg)
      case http_client.post_json(url, "{}", "") {
        Error(e) -> Error("wtatil_http_failed:" <> e)
        Ok(raw) -> {
          case response_status_bad(raw) {
            True -> Error(error_message_from_raw(raw))
            False ->
              case token_from_raw(raw) {
                Error(Nil) -> Error("wtatil_token_missing")
                Ok(#(token, exp)) ->
                  Ok(TokenResult(token: token, expire_date: exp, raw_response: raw))
              }
          }
        }
      }
    }
  }
}
