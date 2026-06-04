//// Turna uçak API — panel `listing_api_providers.turna` + env fallback.
//// API: https://api.turna.com / test: https://apitest.turna.com

import envoy
import gleam/dynamic/decode
import gleam/json
import gleam/list
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

fn fetch_raw(db: pog.Connection) -> String {
  case
    pog.query(
      "select value_json::text from site_settings"
      <> " where key = 'listing_api_providers' and organization_id is null limit 1",
    )
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> pog.execute(db)
  {
    Error(_) -> ""
    Ok(ret) ->
      case ret.rows {
        [raw] -> raw
        _ -> ""
      }
  }
}

fn pick_string(raw: String, path: List(String)) -> String {
  case path {
    [] -> ""
    [field] -> {
      let decoder = {
        use v <- decode.field(field, decode.string)
        decode.success(v)
      }
      case json.parse(raw, decoder) {
        Ok(v) -> string.trim(v)
        Error(_) -> ""
      }
    }
    [head, ..tail] -> {
      let decoder = {
        use nested <- decode.field(head, decode.string)
        decode.success(nested)
      }
      case json.parse(raw, decoder) {
        Ok(nested) -> pick_string(nested, tail)
        Error(_) -> ""
      }
    }
  }
}

fn pick_bool(raw: String, path: List(String), default: Bool) -> Bool {
  case path {
    [] -> default
    [field] -> {
      let decoder = {
        use v <- decode.field(field, decode.bool)
        decode.success(v)
      }
      case json.parse(raw, decoder) {
        Ok(v) -> v
        Error(_) -> default
      }
    }
    [head, ..tail] -> {
      let decoder = {
        use nested <- decode.field(head, decode.string)
        decode.success(nested)
      }
      case json.parse(raw, decoder) {
        Ok(nested) -> pick_bool(nested, tail, default)
        Error(_) -> default
      }
    }
  }
}

pub fn load(db: pog.Connection) -> TurnaConfig {
  let raw = fetch_raw(db)
  let t_path = ["turna"]
  let get = fn(field: String, env_key: String, default: String) -> String {
    let from_db = pick_string(raw, list.append(t_path, [field]))
    case from_db {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  let enabled =
    pick_bool(raw, list.append(t_path, ["enabled"]), False)
    || env_or("TURNA_ENABLED", "0") == "1"
  TurnaConfig(
    enabled: enabled,
    base_url: get("base_url", "TURNA_BASE_URL", "https://api.turna.com"),
    api_key: get("api_key", "TURNA_API_KEY", ""),
    country_code: get("country_code", "TURNA_COUNTRY_CODE", "TR"),
    currency_code: get("currency_code", "TURNA_CURRENCY_CODE", "TRY"),
    language_code: get("language_code", "TURNA_LANGUAGE_CODE", "tr"),
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
