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

pub type LocationDetails {
  LocationDetails(
    place_id: String,
    lat: Float,
    lon: Float,
    country_code: String,
    timezone: String,
  )
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

fn point_decoder() -> decode.Decoder(#(Float, Float)) {
  use lat <- decode.field("lat", decode.float)
  use lon <- decode.field("lon", decode.float)
  decode.success(#(lat, lon))
}

fn location_details_decoder() -> decode.Decoder(LocationDetails) {
  use place_id <- decode.optional_field("placeId", "", decode.string)
  use country <- decode.optional_field("countryCode", "TR", decode.string)
  use tz <- decode.optional_field("timezone", "Europe/Istanbul", decode.string)
  use point <- decode.field("point", point_decoder())
  let #(lat, lon) = point
  decode.success(LocationDetails(
    place_id: place_id,
    lat: lat,
    lon: lon,
    country_code: country,
    timezone: tz,
  ))
}

fn fetch_location_details(
  cfg: Yolcu360Config,
  bearer: String,
  place_id: String,
) -> Result(LocationDetails, String) {
  let url = yolcu360_config.location_detail_url(cfg, place_id)
  case http_client.get_url_with_auth(url, bearer) {
    Error(e) -> Error("yolcu360_http_failed:" <> e)
    Ok(raw) ->
      case json.parse(raw, location_details_decoder()) {
        Ok(d) -> Ok(d)
        Error(_) -> Error("yolcu360_location_details_invalid")
      }
  }
}

fn resolve_place_id(
  cfg: Yolcu360Config,
  bearer: String,
  query: String,
) -> Result(String, String) {
  let url = yolcu360_config.locations_url(cfg, query)
  case http_client.get_url_with_auth(url, bearer) {
    Error(e) -> Error("yolcu360_http_failed:" <> e)
    Ok(raw) ->
      case first_location_id(raw) {
        Error(_) -> Error("yolcu360_location_not_found:" <> query)
        Ok(loc) -> Ok(loc.id)
      }
  }
}

fn search_point_body(
  checkin: String,
  checkout: String,
  pickup: LocationDetails,
  return_loc: LocationDetails,
) -> String {
  let country = case string.trim(pickup.country_code) {
    "" -> "TR"
    c -> c
  }
  json.object([
    #(
      "checkInDateTime",
      json.string(yolcu360_config.format_search_datetime(checkin, country)),
    ),
    #(
      "checkOutDateTime",
      json.string(yolcu360_config.format_search_datetime(checkout, country)),
    ),
    #("age", json.string("25")),
    #("country", json.string(country)),
    #("paymentType", json.string("creditCard")),
    #(
      "checkInLocation",
      json.object([
        #("lat", json.float(pickup.lat)),
        #("lon", json.float(pickup.lon)),
      ]),
    ),
    #(
      "checkOutLocation",
      json.object([
        #("lat", json.float(return_loc.lat)),
        #("lon", json.float(return_loc.lon)),
      ]),
    ),
    #("fullCredit", json.bool(False)),
  ])
  |> json.to_string
}

/// Konum metninden placeId çöz → detay (lat/lon) → POST /search/point.
/// pickup_query / return_query: kullanıcının girdiği metin (ör. "Istanbul")
/// checkin / checkout: ISO datetime string (ör. "2024-06-10T10:00")
pub fn search_cars(
  cfg: Yolcu360Config,
  pickup_query: String,
  return_query: String,
  checkin: String,
  checkout: String,
) -> Result(CarsResult, String) {
  let pickup_query = yolcu360_config.normalize_location_query(pickup_query)
  let return_query = yolcu360_config.normalize_location_query(return_query)
  case login(cfg) {
    Error(e) -> Error(e)
    Ok(auth) -> {
      let bearer = "Bearer " <> auth.access_token
      case resolve_place_id(cfg, bearer, pickup_query) {
        Error(e) -> Error(e)
        Ok(pickup_place_id) -> {
          let same_return = case
            string.trim(return_query) == ""
            || string.trim(return_query) == string.trim(pickup_query)
          {
            True -> True
            False -> False
          }
          let return_place_id = case same_return {
            True -> pickup_place_id
            False ->
              case resolve_place_id(cfg, bearer, return_query) {
                Ok(id) -> id
                Error(_) -> pickup_place_id
              }
          }
          case fetch_location_details(cfg, bearer, pickup_place_id) {
            Error(e) -> Error(e)
            Ok(pickup_detail) -> {
              let return_detail = case return_place_id == pickup_place_id {
                True -> pickup_detail
                False ->
                  case fetch_location_details(cfg, bearer, return_place_id) {
                    Ok(d) -> d
                    Error(_) -> pickup_detail
                  }
              }
              let body =
                search_point_body(checkin, checkout, pickup_detail, return_detail)
              let url = yolcu360_config.search_point_url(cfg)
              case http_client.post_json(url, body, bearer) {
                Error(e) -> Error("yolcu360_http_failed:" <> e)
                Ok(raw) -> Ok(CarsResult(raw_response: raw))
              }
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
