//// Yolcu360 Agency API istemcisi — JWT auth + konum araması.
//// https://apidocs.yolcu360.com/getting-started

import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/string
import travel/integrations/yolcu360_config.{type Yolcu360Config}
import travel/net/http_client

pub type AuthResult {
  AuthResult(access_token: String, raw_response: String)
}

pub type LocationsResult {
  LocationsResult(raw_response: String)
}

fn login_body(cfg: Yolcu360Config) -> String {
  json.object([
    #("key", json.string(cfg.api_key)),
    #("secret", json.string(cfg.api_secret)),
  ])
  |> json.to_string
}

fn access_token_from_raw(raw: String) -> Result(String, Nil) {
  let decoder = {
    use t <- decode.field("accessToken", decode.string)
    decode.success(t)
  }
  case json.parse(raw, decoder) {
    Ok(t) ->
      case string.trim(t) {
        "" -> Error(Nil)
        s -> Ok(s)
      }
    Error(_) -> Error(Nil)
  }
}

fn error_from_raw(raw: String) -> String {
  let code_dec = {
    use c <- decode.field("code", decode.int)
    decode.success(c)
  }
  let desc_dec = {
    use d <- decode.field("description", decode.string)
    decode.success(d)
  }
  let code_s = case json.parse(raw, code_dec) {
    Ok(c) -> int.to_string(c)
    Error(_) -> ""
  }
  let desc = case json.parse(raw, desc_dec) {
    Ok(d) -> string.trim(d)
    Error(_) -> ""
  }
  case desc != "" && code_s != "" {
    True -> "yolcu360_api_error:" <> code_s <> ":" <> desc
    False ->
      case desc != "" {
        True -> "yolcu360_api_error:" <> desc
        False -> "yolcu360_api_error"
      }
  }
}

pub fn login(cfg: Yolcu360Config) -> Result(AuthResult, String) {
  case yolcu360_config.credentials_ready(cfg) {
    False -> Error("yolcu360_credentials_missing")
    True -> {
      let url = yolcu360_config.login_url(cfg)
      let body = login_body(cfg)
      case http_client.post_json(url, body, "") {
        Error(e) -> Error("yolcu360_http_failed:" <> e)
        Ok(raw) ->
          case access_token_from_raw(raw) {
            Ok(token) -> Ok(AuthResult(access_token: token, raw_response: raw))
            Error(_) -> Error(error_from_raw(raw))
          }
      }
    }
  }
}

pub fn search_locations(
  cfg: Yolcu360Config,
  query: String,
) -> Result(LocationsResult, String) {
  case login(cfg) {
    Error(e) -> Error(e)
    Ok(auth) -> {
      let url = yolcu360_config.locations_url(cfg, query)
      let bearer = "Bearer " <> auth.access_token
      case http_client.get_url_with_auth(url, bearer) {
        Error(e) -> Error("yolcu360_http_failed:" <> e)
        Ok(raw) -> Ok(LocationsResult(raw_response: raw))
      }
    }
  }
}

/// Ping: login + örnek konum araması (istanbul).
pub fn ping(cfg: Yolcu360Config) -> Result(#(AuthResult, LocationsResult), String) {
  case login(cfg) {
    Error(e) -> Error(e)
    Ok(auth) -> {
      let url = yolcu360_config.locations_url(cfg, "istanbul")
      let bearer = "Bearer " <> auth.access_token
      case http_client.get_url_with_auth(url, bearer) {
        Error(e) -> Error("yolcu360_http_failed:" <> e)
        Ok(raw) -> Ok(#(auth, LocationsResult(raw_response: raw)))
      }
    }
  }
}
