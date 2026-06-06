//// Yolcu360 Agency API istemcisi — JWT auth + konum araması.
//// https://apidocs.yolcu360.com/getting-started

import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/string
import travel/integrations/yolcu360_config.{type Yolcu360Config}
import travel/net/http_client

pub type AuthResult {
  AuthResult(access_token: String, raw_response: String)
}

pub type LocationsResult {
  LocationsResult(raw_response: String)
}

pub type CarsResult {
  CarsResult(raw_response: String)
}

pub type LocationIdResult {
  LocationIdResult(id: String, name: String)
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

fn first_nonempty(a: String, b: String) -> String {
  case string.trim(a) {
    "" -> string.trim(b)
    s -> s
  }
}

/// Agency API v1 konum kaydı — `placeId`/`mainText` veya eski `id`/`name`.
fn location_item_decoder() -> decode.Decoder(LocationIdResult) {
  use id0 <- decode.optional_field("id", "", decode.string)
  use place_id <- decode.optional_field("placeId", "", decode.string)
  use name0 <- decode.optional_field("name", "", decode.string)
  use main_text <- decode.optional_field("mainText", "", decode.string)
  use description <- decode.optional_field("description", "", decode.string)
  let id = first_nonempty(id0, place_id)
  let name =
    first_nonempty(
      first_nonempty(name0, main_text),
      first_nonempty(description, id),
    )
  decode.success(LocationIdResult(id: id, name: name))
}

fn first_valid_location(items: List(LocationIdResult)) -> Result(LocationIdResult, Nil) {
  case list.filter(items, fn(i) { i.id != "" }) {
    [first, ..] -> Ok(first)
    _ -> Error(Nil)
  }
}

fn locations_from_raw(raw: String) -> Result(LocationIdResult, Nil) {
  let item_dec = location_item_decoder()
  case json.parse(raw, decode.list(item_dec)) {
    Ok(items) -> first_valid_location(items)
    Error(_) -> {
      let data_dec =
        decode.field("data", decode.list(item_dec), fn(items) {
          decode.success(items)
        })
      case json.parse(raw, data_dec) {
        Ok(items) -> first_valid_location(items)
        Error(_) -> Error(Nil)
      }
    }
  }
}

/// Konumlar JSON'ından ilk sonucun id ve name alanlarını çöz.
pub fn first_location_id(raw: String) -> Result(LocationIdResult, Nil) {
  locations_from_raw(raw)
}

/// Konum adından ID'yi çözerek araç araması yapar.
/// pickup_query / return_query: kullanıcının girdiği metin (ör. "Istanbul")
/// checkin / checkout: ISO datetime string (ör. "2024-06-10T10:00")
pub fn search_cars(
  cfg: Yolcu360Config,
  pickup_query: String,
  return_query: String,
  checkin: String,
  checkout: String,
) -> Result(CarsResult, String) {
  case login(cfg) {
    Error(e) -> Error(e)
    Ok(auth) -> {
      let bearer = "Bearer " <> auth.access_token
      // 1. pickup location ID
      let pickup_url = yolcu360_config.locations_url(cfg, pickup_query)
      case http_client.get_url_with_auth(pickup_url, bearer) {
        Error(e) -> Error("yolcu360_http_failed:" <> e)
        Ok(pickup_raw) ->
          case first_location_id(pickup_raw) {
            Error(_) -> Error("yolcu360_location_not_found:" <> pickup_query)
            Ok(pickup_loc) -> {
              // 2. return location ID (aynı nokta ise tekrar aramaya gerek yok)
              let return_id = case
                string.trim(return_query) == ""
                || string.trim(return_query) == string.trim(pickup_query)
              {
                True -> pickup_loc.id
                False -> {
                  let ret_url =
                    yolcu360_config.locations_url(cfg, return_query)
                  case http_client.get_url_with_auth(ret_url, bearer) {
                    Error(_) -> pickup_loc.id
                    Ok(ret_raw) ->
                      case first_location_id(ret_raw) {
                        Ok(r) -> r.id
                        Error(_) -> pickup_loc.id
                      }
                  }
                }
              }
              // 3. araç araması
              let cars_url =
                yolcu360_config.cars_search_url(
                  cfg,
                  pickup_loc.id,
                  return_id,
                  checkin,
                  checkout,
                )
              case http_client.get_url_with_auth(cars_url, bearer) {
                Error(e) -> Error("yolcu360_http_failed:" <> e)
                Ok(raw) -> Ok(CarsResult(raw_response: raw))
              }
            }
          }
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
