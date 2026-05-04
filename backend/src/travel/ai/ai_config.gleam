//// AI Yapılandırması — DB-first, env fallback
////
//// Admin paneli site_settings tablosuna key = "ai" olarak kaydeder.
//// Değer yoksa DEEPSEEK_API_KEY / DEEPSEEK_MODEL / DEEPSEEK_API_URL env'e bakar.

import envoy
import gleam/dict
import gleam/dynamic/decode
import gleam/float
import gleam/int
import gleam/json
import gleam/string
import pog

/// Panel ile uyumlu genel varsayılan; kayıt yoksa kullanılır.
const default_timeout_sec: Int = 3600

/// httpc üst sınırı ile aynı (10000 sn); daha uzun değerler kırpılır.
const max_timeout_sec: Int = 10_000

/// DeepSeek tek çağrıda kısa süreler (ör. 45 sn) pratikte hep timeout; panel alt sınırı 5 sn olsa da upstream için taban.
const min_upstream_timeout_ms: Int = 300_000

pub type AiConfig {
  AiConfig(
    deepseek_api_key: String,
    deepseek_model: String,
    deepseek_api_url: String,
  )
}

/// Panel / site_settings.ai ile uyumlu: 5–10000 sn → ms (DeepSeek upstream).
/// Kaynak tek: `site_settings.key = ai`; ortam değişkeni ile geçersiz kılınmaz.
pub fn profile_upstream_timeout_ms(db: pog.Connection, profile_code: String) -> Int {
  let ms = case fetch_raw(db) {
    "" -> default_timeout_sec * 1000
    raw ->
      case parse_ai_json_timeouts_ms(raw, string.trim(profile_code)) {
        Ok(m) -> m
        Error(_) -> default_timeout_sec * 1000
      }
  }
  case ms < min_upstream_timeout_ms {
    True -> min_upstream_timeout_ms
    False -> ms
  }
}

fn decode_sec_flexible(fallback_sec: Int) -> decode.Decoder(Int) {
  let from_float =
    decode.float
    |> decode.map(float.round)
  let from_string =
    decode.string
    |> decode.map(fn(s) {
      case int.parse(string.trim(s)) {
        Ok(n) -> n
        Error(_) -> fallback_sec
      }
    })
  decode.one_of(decode.int, [from_float, from_string])
}

fn timeout_sec_for_profile(
  mods: dict.Dict(String, Int),
  profile_code: String,
  def_sec: Int,
) -> Int {
  case dict.get(mods, profile_code) {
    Ok(s) -> s
    Error(_) ->
      case profile_code {
        "region_tourism_content" ->
          case dict.get(mods, "region_hierarchy") {
            Ok(s) -> s
            Error(_) -> def_sec
          }
        "region_blog_writer" ->
          case dict.get(mods, "content_writer") {
            Ok(s) -> s
            Error(_) -> def_sec
          }
        "place_blog_writer" ->
          case dict.get(mods, "content_writer") {
            Ok(s) -> s
            Error(_) -> def_sec
          }
        _ -> def_sec
      }
  }
}

fn clamp_sec_for_upstream(sec: Int) -> Int {
  case sec < 5 {
    True -> 5
    False ->
      case sec > max_timeout_sec {
        True -> max_timeout_sec
        False -> sec
      }
  }
}

fn clamp_sec_to_ms(sec: Int) -> Int {
  clamp_sec_for_upstream(sec) * 1000
}

fn parse_ai_json_timeouts_ms(raw: String, profile_code: String) -> Result(Int, Nil) {
  let decoder =
    decode.optional_field(
      "request_timeout_sec",
      default_timeout_sec,
      decode_sec_flexible(default_timeout_sec),
      fn(def_sec) {
        decode.optional_field(
          "module_timeouts_sec",
          dict.new(),
          decode.dict(decode.string, decode_sec_flexible(def_sec)),
          fn(mods) {
            let sec = timeout_sec_for_profile(mods, profile_code, def_sec)
            decode.success(clamp_sec_to_ms(sec))
          },
        )
      },
    )
  case json.parse(raw, decoder) {
    Ok(ms) -> Ok(ms)
    Error(_) -> Error(Nil)
  }
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
  case fetch_platform_ai_json(db) {
    "" -> fetch_any_org_ai_json(db)
    s -> s
  }
}

/// `organization_id` null platform kaydı (tercih).
fn fetch_platform_ai_json(db: pog.Connection) -> String {
  case
    pog.query(
      "select value_json::text from site_settings"
      <> " where key = 'ai' and organization_id is null"
      <> " order by id desc limit 1",
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

/// Platform satırı yoksa (eski / kiracı-only kurulum): key=ai olan en güncel satır.
fn fetch_any_org_ai_json(db: pog.Connection) -> String {
  case
    pog.query(
      "select value_json::text from site_settings"
      <> " where key = 'ai'"
      <> " order by case when organization_id is null then 0 else 1 end, id desc"
      <> " limit 1",
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
