//// AI sağlayıcı yönlendirici: Gemini key havuzu → (kota bitince) sıradaki key → DeepSeek yedek.

import gleam/dynamic/decode
import gleam/float
import gleam/list
import gleam/string
import pog
import travel/ai/ai_config
import travel/ai/deepseek_chat
import travel/ai/gemini_chat
import travel/db/resilient_pog as db_exec

type KeySlot {
  KeySlot(id: String, api_key: String)
}

fn provider_active(db: pog.Connection, code: String) -> Bool {
  case
    pog.query("select is_active from ai_providers where code = $1 limit 1")
    |> pog.parameter(pog.text(code))
    |> pog.returning({
      use a <- decode.field(0, decode.bool)
      decode.success(a)
    })
    |> db_exec.execute(db)
  {
    Error(_) -> False
    Ok(ret) ->
      case ret.rows {
        [True] -> True
        _ -> False
      }
  }
}

fn gemini_model(db: pog.Connection) -> String {
  let raw_cfg = ai_config.load(db)
  // site_settings.ai.gemini_model — AiConfig'e eklemeden pick
  let _ = raw_cfg
  case pick_ai_field(db, "gemini_model") {
    "" -> gemini_chat.default_model()
    m -> m
  }
}

fn pick_ai_field(db: pog.Connection, field: String) -> String {
  case
    pog.query(
      "select coalesce(trim(value_json->>$1), '') from site_settings"
      <> " where key = 'ai' and organization_id is null order by id desc limit 1",
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
        [v] -> string.trim(v)
        _ -> ""
      }
  }
}

fn list_available_gemini_keys(db: pog.Connection) -> List(KeySlot) {
  case
    pog.query(
      "select id::text, api_key from ai_api_key_slots"
      <> " where provider_code = 'gemini' and is_enabled = true"
      <> " and (exhausted_until is null or exhausted_until <= now())"
      <> " order by sort_order asc, last_used_at nulls first, created_at asc",
    )
    |> pog.returning({
      use id <- decode.field(0, decode.string)
      use key <- decode.field(1, decode.string)
      decode.success(KeySlot(id, key))
    })
    |> db_exec.execute(db)
  {
    Error(_) -> []
    Ok(ret) -> ret.rows
  }
}

fn mark_key_used(db: pog.Connection, id: String) -> Nil {
  let _ =
    pog.query("update ai_api_key_slots set last_used_at = now() where id = $1::uuid")
    |> pog.parameter(pog.text(id))
    |> db_exec.execute(db)
  Nil
}

/// Kota bitince ertesi UTC günü 00:00'a kadar bu key'i atla (günlük RPD).
fn mark_key_exhausted(db: pog.Connection, id: String) -> Nil {
  let _ =
    pog.query(
      "update ai_api_key_slots set exhausted_until ="
      <> " ((date_trunc('day', timezone('UTC', now())) + interval '1 day'))"
      <> " where id = $1::uuid",
    )
    |> pog.parameter(pog.text(id))
    |> db_exec.execute(db)
  Nil
}

fn try_gemini_pool(
  db: pog.Connection,
  system_prompt: String,
  user_msg: String,
  temperature: Float,
  timeout_ms: Int,
) -> Result(String, String) {
  case provider_active(db, "gemini") {
    False -> Error("gemini_provider_inactive")
    True -> {
      let keys = list_available_gemini_keys(db)
      case keys {
        [] -> Error("gemini_no_available_keys")
        _ -> {
          let model = gemini_model(db)
          try_gemini_keys(db, keys, model, system_prompt, user_msg, temperature, timeout_ms, "")
        }
      }
    }
  }
}

fn try_gemini_keys(
  db: pog.Connection,
  keys: List(KeySlot),
  model: String,
  system_prompt: String,
  user_msg: String,
  temperature: Float,
  timeout_ms: Int,
  last_err: String,
) -> Result(String, String) {
  case keys {
    [] ->
      case last_err == "" {
        True -> Error("gemini_all_keys_failed")
        False -> Error(last_err)
      }
    [KeySlot(id, api_key), ..rest] ->
      case
        gemini_chat.generate_content(
          api_key,
          model,
          system_prompt,
          user_msg,
          temperature,
          timeout_ms,
        )
      {
        gemini_chat.GeminiOk(text) -> {
          mark_key_used(db, id)
          Ok(text)
        }
        gemini_chat.GeminiQuota(e) -> {
          mark_key_exhausted(db, id)
          try_gemini_keys(
            db,
            rest,
            model,
            system_prompt,
            user_msg,
            temperature,
            timeout_ms,
            "gemini_quota: " <> string.slice(e, 0, 200),
          )
        }
        gemini_chat.GeminiError(e) ->
          // Geçici/anahtar hatası — sıradakine geç; hepsi bitince son hatayı döndür
          try_gemini_keys(
            db,
            rest,
            model,
            system_prompt,
            user_msg,
            temperature,
            timeout_ms,
            e,
          )
      }
  }
}

fn try_deepseek(
  db: pog.Connection,
  system_prompt: String,
  user_msg: String,
  temperature: Float,
  timeout_ms: Int,
) -> Result(String, String) {
  case provider_active(db, "deepseek") {
    False -> Error("deepseek_provider_inactive")
    True -> {
      let cfg = ai_config.load(db)
      deepseek_chat.chat_completion_single_with_config(
        cfg,
        system_prompt,
        user_msg,
        temperature,
        timeout_ms,
      )
    }
  }
}

/// Gemini havuzu (ücretsiz) öncelikli; kota/key yoksa DeepSeek (aktifse).
pub fn complete(
  db: pog.Connection,
  system_prompt: String,
  user_msg: String,
  temperature: Float,
  timeout_ms: Int,
) -> Result(String, String) {
  case try_gemini_pool(db, system_prompt, user_msg, temperature, timeout_ms) {
    Ok(t) -> Ok(t)
    Error(gemini_err) ->
      case try_deepseek(db, system_prompt, user_msg, temperature, timeout_ms) {
        Ok(t) -> Ok(t)
        Error(deepseek_err) ->
          Error(
            "llm_unavailable: gemini="
            <> string.slice(gemini_err, 0, 120)
            <> "; deepseek="
            <> string.slice(deepseek_err, 0, 120),
          )
      }
  }
}

pub fn complete_with_temp_string(
  db: pog.Connection,
  system_prompt: String,
  user_msg: String,
  temp_str: String,
  timeout_ms: Int,
) -> Result(String, String) {
  let temp = case float.parse(string.trim(temp_str)) {
    Ok(f) -> gemini_chat.clamp_temperature(f)
    Error(_) -> 0.7
  }
  complete(db, system_prompt, user_msg, temp, timeout_ms)
}

/// Panel özeti: kaç Gemini key kullanılabilir.
pub fn gemini_available_count(db: pog.Connection) -> Int {
  list.length(list_available_gemini_keys(db))
}
