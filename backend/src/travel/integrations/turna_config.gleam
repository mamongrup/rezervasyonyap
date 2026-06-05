//// Turna uçak API — panel `listing_api_providers.turna` + env fallback.
//// API: https://api.turna.com / test: https://apitest.turna.com

import envoy
import gleam/dynamic/decode
import gleam/int
import gleam/string
import pog

pub type TurnaConfig {
  TurnaConfig(
    enabled: Bool,
    base_url: String,
    api_key: String,
    country_code: String,
    currency_code: String,
    language_code: String,
    flight_leg_mask: Int,
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

/// `site_settings.value_json->'turna'->>field` — iç içe JSON nesnesi (panel kaydı).
fn fetch_turna_json_text(db: pog.Connection, field: String) -> String {
  case
    pog.query(
      "select coalesce(trim(value_json->'turna'->>$1), '') from site_settings "
        <> "where key = 'listing_api_providers' and organization_id is null limit 1",
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

fn fetch_turna_enabled(db: pog.Connection) -> Bool {
  case
    pog.query(
      "select coalesce(value_json->'turna'->>'enabled', 'false') from site_settings "
        <> "where key = 'listing_api_providers' and organization_id is null limit 1",
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

/// Turna CDN yalnızca HTTPS kabul eder; panelde http:// kayıtlıysa düzelt.
fn normalize_turna_base_url(raw: String) -> String {
  let u = trim_trailing_slash(string.trim(raw))
  let with_scheme = case
    string.starts_with(u, "http://") || string.starts_with(u, "https://")
  {
    True -> u
    False ->
      case u == "" {
        True -> ""
        False -> "https://" <> u
      }
  }
  case string.starts_with(with_scheme, "http://") {
    True ->
      case string.contains(with_scheme, "turna.com") {
        True -> "https://" <> string.drop_start(with_scheme, 7)
        False -> with_scheme
      }
    False -> with_scheme
  }
}

fn parse_int_field(raw: String, default: Int) -> Int {
  case int.parse(string.trim(raw)) {
    Ok(n) -> n
    Error(_) -> default
  }
}

pub fn load(db: pog.Connection) -> TurnaConfig {
  let get = fn(field: String, env_key: String, default: String) -> String {
    let from_db = fetch_turna_json_text(db, field)
    case from_db {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  let enabled = fetch_turna_enabled(db) || env_or("TURNA_ENABLED", "0") == "1"
  let base_raw = get("base_url", "TURNA_BASE_URL", "https://api.turna.com")
  let mask_raw = get("flight_leg_mask", "TURNA_FLIGHT_LEG_MASK", "105")
  TurnaConfig(
    enabled: enabled,
    base_url: normalize_turna_base_url(base_raw),
    api_key: get("api_key", "TURNA_API_KEY", ""),
    country_code: get("country_code", "TURNA_COUNTRY_CODE", "TR"),
    currency_code: get("currency_code", "TURNA_CURRENCY_CODE", "TRY"),
    language_code: get("language_code", "TURNA_LANGUAGE_CODE", "tr"),
    flight_leg_mask: parse_int_field(mask_raw, 105),
  )
}

pub fn credentials_ready(cfg: TurnaConfig) -> Bool {
  cfg.api_key != ""
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

pub fn login_url(cfg: TurnaConfig) -> String {
  join_path(cfg.base_url, "/v1/accounts/auth/anonymousLogin")
}
