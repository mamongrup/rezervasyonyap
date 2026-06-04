//// Turna uçak API — anonymousLogin (bağlantı testi).

import gleam/dynamic/decode
import gleam/json
import gleam/string
import travel/integrations/turna_config.{type TurnaConfig}
import travel/net/http_client

pub type LoginResult {
  LoginResult(session_id: String, raw_response: String)
}

fn login_body(cfg: TurnaConfig) -> String {
  json.object([
    #("ApiKey", json.string(cfg.api_key)),
    #("CountryCode", json.string(cfg.country_code)),
    #("CurrencyCode", json.string(cfg.currency_code)),
    #("LanguageCode", json.string(cfg.language_code)),
  ])
  |> json.to_string
}

fn session_id_from_raw(raw: String) -> String {
  let decoder = {
    use v <- decode.field("SessionId", decode.string)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(v) -> string.trim(v)
    Error(_) -> ""
  }
}

fn has_error(raw: String) -> Bool {
  let decoder = {
    use v <- decode.field("HasError", decode.bool)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(True) -> True
    _ -> False
  }
}

fn error_message_from_raw(raw: String) -> String {
  let decoder = {
    use v <- decode.field("Message", decode.string)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(m) ->
      case string.trim(m) {
        "" -> "turna_api_error"
        t -> "turna_api_error:" <> t
      }
    Error(_) -> "turna_api_error"
  }
}

pub fn login(cfg: TurnaConfig) -> Result(LoginResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True -> {
      let url = turna_config.login_url(cfg)
      let body = login_body(cfg)
      case http_client.post_json(url, body, "") {
        Error(e) -> Error("turna_http_failed:" <> e)
        Ok(raw) -> {
          case has_error(raw) {
            True -> Error(error_message_from_raw(raw))
            False -> {
              let session_id = session_id_from_raw(raw)
              Ok(LoginResult(session_id: session_id, raw_response: raw))
            }
          }
        }
      }
    }
  }
}
