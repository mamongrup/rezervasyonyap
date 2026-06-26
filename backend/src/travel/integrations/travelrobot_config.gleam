//// Travelrobot / KPlus — panel `listing_api_providers` + env fallback.

import envoy
import gleam/dynamic/decode
import gleam/string
import pog
import travel/db/resilient_pog as db_exec

pub type TravelrobotConfig {
  TravelrobotConfig(
    enabled: Bool,
    base_url: String,
    channel_code: String,
    channel_password: String,
    listing_status: String,
    import_tours: Bool,
    import_hotels: Bool,
    import_flights: Bool,
    import_car_rental: Bool,
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

/// `site_settings.value_json->'travelrobot'->>field` — iç içe JSON nesnesi (panel kaydı).
fn fetch_travelrobot_json_text(db: pog.Connection, field: String) -> String {
  case
    pog.query(
      "select coalesce(trim(value_json->'travelrobot'->>$1), '') from site_settings "
      <> "where key = 'listing_api_providers' and organization_id is null "
      <> "order by id desc limit 1",
    )
    |> pog.parameter(pog.text(field))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> db_exec.execute(db)
  {
    Error(_) -> ""
    Ok(ret) ->
      case ret.rows {
        [s] -> s
        _ -> ""
      }
  }
}

fn fetch_travelrobot_bool(db: pog.Connection, field: String, default: Bool) -> Bool {
  let raw = fetch_travelrobot_json_text(db, field)
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

fn fetch_travelrobot_enabled(db: pog.Connection) -> Bool {
  fetch_travelrobot_bool(db, "enabled", False)
    || env_or("TRAVELROBOT_ENABLED", "0") == "1"
}

pub fn load(db: pog.Connection) -> TravelrobotConfig {
  let get = fn(field: String, env_key: String, default: String) -> String {
    let from_db = fetch_travelrobot_json_text(db, field)
    case from_db {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  TravelrobotConfig(
    enabled: fetch_travelrobot_enabled(db),
    base_url: get(
      "base_url",
      "TRAVELROBOT_BASE_URL",
      "https://api.bookingagora.com/v0",
    ),
    channel_code: get("channel_code", "TRAVELROBOT_CHANNEL_CODE", ""),
    channel_password: get("channel_password", "TRAVELROBOT_CHANNEL_PASSWORD", ""),
    listing_status: get("listing_status", "TRAVELROBOT_LISTING_STATUS", "published"),
    import_tours: fetch_travelrobot_bool(db, "import_tours", True),
    import_hotels: fetch_travelrobot_bool(db, "import_hotels", False),
    import_flights: fetch_travelrobot_bool(db, "import_flights", False),
    import_car_rental: fetch_travelrobot_bool(db, "import_car_rental", False),
  )
}

pub fn credentials_ready(cfg: TravelrobotConfig) -> Bool {
  cfg.channel_code != "" && cfg.channel_password != ""
}

pub fn create_token_url(base_url: String) -> String {
  let base = string.trim(base_url)
  let base = case string.ends_with(base, "/") {
    True -> string.drop_end(base, 1)
    False -> base
  }
  base <> "/General.svc/Rest/Json/CreateTokenV2"
}
