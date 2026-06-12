//// Yolcu360 Agency API — panel `listing_api_providers` + env fallback.
//// Dokümantasyon: https://apidocs.yolcu360.com/getting-started

import envoy
import gleam/dynamic/decode
import gleam/string
import pog

pub type Yolcu360Config {
  Yolcu360Config(
    enabled: Bool,
    base_url: String,
    api_key: String,
    api_secret: String,
  )
}

fn env_or(key: String, default: String) -> String {
  case envoy.get(key) {
    Ok(v) ->
      case string.trim(v) {
        "" -> default
        s -> s
      }
    Error(_) -> default
  }
}

/// `site_settings.value_json->'yolcu360'->>field` — iç içe JSON nesnesi (panel kaydı).
fn fetch_yolcu360_json_text(db: pog.Connection, field: String) -> String {
  case
    pog.query(
      "select coalesce(trim(value_json->'yolcu360'->>$1), '') from site_settings "
      <> "where key = 'listing_api_providers' and organization_id is null "
      <> "order by id desc limit 1",
    )
    |> pog.parameter(pog.text(field))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> pog.execute(db)
  {
    Error(_) -> ""
    Ok(ret) ->
      case ret.rows {
        [s] -> s
        _ -> ""
      }
  }
}

fn fetch_yolcu360_enabled(db: pog.Connection) -> Bool {
  case
    pog.query(
      "select coalesce(value_json->'yolcu360'->>'enabled', 'false') from site_settings "
      <> "where key = 'listing_api_providers' and organization_id is null "
      <> "order by id desc limit 1",
    )
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> pog.execute(db)
  {
    Error(_) -> False
    Ok(ret) ->
      case ret.rows {
        [s] -> s == "true" || s == "t" || s == "1"
        _ -> False
      }
  }
}

pub fn load(db: pog.Connection) -> Yolcu360Config {
  let get = fn(field: String, env_key: String, default: String) -> String {
    let from_db = fetch_yolcu360_json_text(db, field)
    case from_db {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  let enabled = fetch_yolcu360_enabled(db) || env_or("YOLCU360_ENABLED", "0") == "1"
  Yolcu360Config(
    enabled: enabled,
    base_url: get(
      "base_url",
      "YOLCU360_BASE_URL",
      "https://api.pro.yolcu360.com/api/v1",
    ),
    api_key: get("api_key", "YOLCU360_API_KEY", ""),
    api_secret: get("api_secret", "YOLCU360_API_SECRET", ""),
  )
}

pub fn credentials_ready(cfg: Yolcu360Config) -> Bool {
  cfg.api_key != "" && cfg.api_secret != ""
}

fn trim_trailing_slash(url: String) -> String {
  case string.ends_with(url, "/") {
    True -> string.drop_end(url, 1)
    False -> url
  }
}

pub fn join_path(base_url: String, path: String) -> String {
  let base = trim_trailing_slash(string.trim(base_url))
  let path = string.trim(path)
  let path = case string.starts_with(path, "/") {
    True -> path
    False -> "/" <> path
  }
  base <> path
}

pub fn login_url(cfg: Yolcu360Config) -> String {
  join_path(cfg.base_url, "/auth/login")
}

/// Yolcu360 konum sorgusu — Türkçe harfler URI/arama hatasına yol açar (ör. İstanbul).
pub fn normalize_location_query(query: String) -> String {
  string.trim(query)
  |> string.replace("İ", "I")
  |> string.replace("ı", "i")
  |> string.replace("Ğ", "G")
  |> string.replace("ğ", "g")
  |> string.replace("Ü", "U")
  |> string.replace("ü", "u")
  |> string.replace("Ş", "S")
  |> string.replace("ş", "s")
  |> string.replace("Ö", "O")
  |> string.replace("ö", "o")
  |> string.replace("Ç", "C")
  |> string.replace("ç", "c")
}

pub fn locations_url(cfg: Yolcu360Config, query: String) -> String {
  let q = normalize_location_query(query)
  let encoded =
    string.replace(q, " ", "+")
    |> string.replace("&", "%26")
    |> string.replace("=", "%3D")
  join_path(cfg.base_url, "/locations?query=" <> encoded)
}

fn encode_param(s: String) -> String {
  string.replace(s, " ", "%20")
  |> string.replace(":", "%3A")
  |> string.replace("+", "%2B")
  |> string.replace("&", "%26")
}

/// GET /locations/{placeId} — koordinat ve timezone.
pub fn location_detail_url(cfg: Yolcu360Config, place_id: String) -> String {
  join_path(cfg.base_url, "/locations/" <> encode_param(string.trim(place_id)))
}

/// POST /search/point — araç araması (lat/lon + tarih).
pub fn search_point_url(cfg: Yolcu360Config) -> String {
  join_path(cfg.base_url, "/search/point")
}

pub fn order_url(cfg: Yolcu360Config) -> String {
  join_path(cfg.base_url, "/order")
}

pub fn order_detail_url(cfg: Yolcu360Config, order_id: String) -> String {
  join_path(cfg.base_url, "/order/" <> encode_param(string.trim(order_id)))
}

pub fn payment_pay_url(cfg: Yolcu360Config) -> String {
  join_path(cfg.base_url, "/payment/pay")
}

/// RFC3339 datetime; timezone yoksa ülkeye göre offset ekler.
pub fn format_search_datetime(date_str: String, country_code: String) -> String {
  let t = string.trim(date_str)
  let has_tz =
    string.contains(t, "+")
    || string.contains(t, "Z")
    || string.contains(t, "z")
  case has_tz {
    True -> t
    False -> {
      let with_time = case string.contains(t, "T") {
        True -> t
        False -> t <> "T10:00:00"
      }
      let with_seconds = case string.length(with_time) {
        n if n <= 16 -> with_time <> ":00"
        _ -> with_time
      }
      with_seconds <> country_datetime_offset(country_code)
    }
  }
}

fn country_datetime_offset(country_code: String) -> String {
  case string.uppercase(string.trim(country_code)) {
    "TR" -> "+03:00"
    _ -> "Z"
  }
}
