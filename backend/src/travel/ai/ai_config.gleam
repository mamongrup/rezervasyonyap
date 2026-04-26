//// AI Yapılandırması — DB-first, env fallback
////
//// Admin paneli site_settings tablosuna key = "ai" olarak kaydeder.
//// Değer yoksa DEEPSEEK_API_KEY / DEEPSEEK_MODEL / DEEPSEEK_API_URL env'e bakar.

import envoy
import gleam/dynamic/decode
import gleam/json
import gleam/string
import pog

pub type AiConfig {
  AiConfig(
    deepseek_api_key: String,
    deepseek_model: String,
    deepseek_api_url: String,
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

fn pick(raw: String, field: String) -> String {
  let decoder = {
    use v <- decode.field(field, decode.string)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(v) -> string.trim(v)
    Error(_) -> ""
  }
}

fn fetch_raw(db: pog.Connection) -> String {
  case
    pog.query(
      "select value_json::text from site_settings"
      <> " where key = 'ai' and organization_id is null limit 1",
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

/// DB-first, env fallback ile AiConfig yükler.
pub fn load(db: pog.Connection) -> AiConfig {
  let raw = fetch_raw(db)
  let get = fn(db_field: String, env_key: String, default: String) -> String {
    case pick(raw, db_field) {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  AiConfig(
    deepseek_api_key: get("deepseek_api_key", "DEEPSEEK_API_KEY", ""),
    deepseek_model: get("deepseek_model", "DEEPSEEK_MODEL", "deepseek-chat"),
    deepseek_api_url: get(
      "deepseek_api_url",
      "DEEPSEEK_API_URL",
      "https://api.deepseek.com/v1/chat/completions",
    ),
  )
}

/// Yalnızca env değişkenlerinden yapılandırma yükler.
pub fn from_env() -> AiConfig {
  AiConfig(
    deepseek_api_key: env_or("DEEPSEEK_API_KEY", ""),
    deepseek_model: env_or("DEEPSEEK_MODEL", "deepseek-chat"),
    deepseek_api_url: env_or(
      "DEEPSEEK_API_URL",
      "https://api.deepseek.com/v1/chat/completions",
    ),
  )
}
