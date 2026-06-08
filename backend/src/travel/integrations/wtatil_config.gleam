//// Wtatil / Reserwation Tour API — panel `listing_api_providers.wtatil` + env fallback.

import envoy
import gleam/dynamic/decode
import gleam/string
import pog

pub type WtatilConfig {
  WtatilConfig(
    enabled: Bool,
    base_url: String,
    application_secret_key: String,
    username: String,
    password: String,
    agency_id: String,
    listing_status: String,
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

fn fetch_wtatil_json_text(db: pog.Connection, field: String) -> String {
  case
    pog.query(
      "select coalesce(trim(value_json->'wtatil'->>$1), '') from site_settings "
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

fn fetch_wtatil_bool(db: pog.Connection, field: String, default: Bool) -> Bool {
  let raw = fetch_wtatil_json_text(db, field)
  case raw {
    "" -> default
    s ->
      case s {
        "true" | "t" | "1" -> True
        "false" | "f" | "0" -> False
        _ -> default
      }
  }
}

fn fetch_wtatil_enabled(db: pog.Connection) -> Bool {
  fetch_wtatil_bool(db, "enabled", False) || env_or("WTATIL_ENABLED", "0") == "1"
}

pub fn load(db: pog.Connection) -> WtatilConfig {
  let get = fn(field: String, env_key: String, default: String) -> String {
    let from_db = fetch_wtatil_json_text(db, field)
    case from_db {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  WtatilConfig(
    enabled: fetch_wtatil_enabled(db),
    base_url: get("base_url", "WTATIL_BASE_URL", "https://tour-api.reserwation.com"),
    application_secret_key: get(
      "application_secret_key",
      "WTATIL_APPLICATION_SECRET_KEY",
      "",
    ),
    username: get("username", "WTATIL_USERNAME", ""),
    password: get("password", "WTATIL_PASSWORD", ""),
    agency_id: get("agency_id", "WTATIL_AGENCY_ID", ""),
    listing_status: get("listing_status", "WTATIL_STATUS", "published"),
  )
}

pub fn credentials_ready(cfg: WtatilConfig) -> Bool {
  cfg.application_secret_key != "" && cfg.username != "" && cfg.password != ""
}

pub fn token_url(cfg: WtatilConfig) -> String {
  let base = string.trim(cfg.base_url)
  let base = case string.ends_with(base, "/") {
    True -> string.drop_end(base, 1)
    False -> base
  }
  base <> "/api/Auth/get-token-async"
}
