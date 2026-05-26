//// Travelrobot / KPlus — panel `listing_api_providers` + env fallback.

import envoy
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/string
import pog

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

pub fn load(db: pog.Connection) -> TravelrobotConfig {
  let raw = fetch_raw(db)
  let tr_path = ["travelrobot"]
  let get = fn(field: String, env_key: String, default: String) -> String {
    let from_db = pick_string(raw, list.append(tr_path, [field]))
    case from_db {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  let enabled =
    pick_bool(raw, list.append(tr_path, ["enabled"]), False)
    || env_or("TRAVELROBOT_ENABLED", "0") == "1"
  TravelrobotConfig(
    enabled: enabled,
    base_url: get("base_url", "TRAVELROBOT_BASE_URL", "http://sandbox.kplus.com.tr/kplus/v0"),
    channel_code: get("channel_code", "TRAVELROBOT_CHANNEL_CODE", ""),
    channel_password: get("channel_password", "TRAVELROBOT_CHANNEL_PASSWORD", ""),
    listing_status: get("listing_status", "TRAVELROBOT_LISTING_STATUS", "published"),
    import_tours: pick_bool(raw, list.append(tr_path, ["import_tours"]), True),
    import_hotels: pick_bool(raw, list.append(tr_path, ["import_hotels"]), False),
    import_flights: pick_bool(raw, list.append(tr_path, ["import_flights"]), False),
    import_car_rental: pick_bool(raw, list.append(tr_path, ["import_car_rental"]), False),
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
