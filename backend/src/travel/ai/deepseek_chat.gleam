//// DeepSeek Chat Completions (OpenAI uyumlu) — canlı destek AI yanıtları.

import envoy
import gleam/dynamic/decode as decode
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import travel/ai/ai_config.{type AiConfig}
import travel/net/http_client

fn choice_content_decoder() -> decode.Decoder(String) {
  decode.field("message", decode.field("content", decode.string, fn(c) { decode.success(c) }), fn(
    content,
  ) { decode.success(content) })
}

fn choices_first_content_decoder() -> decode.Decoder(String) {
  decode.field("choices", decode.list(choice_content_decoder()), fn(contents) {
    case contents {
      [first, ..] -> decode.success(first)
      [] -> decode.success("")
    }
  })
}

fn message_json(role: String, content: String) -> json.Json {
  json.object([
    #("role", json.string(role)),
    #("content", json.string(content)),
  ])
}

/// Son kullanıcı mesajından sonra model yanıtı (Türkçe içerik için UTF-8).
pub fn chat_completion(
  system_prompt: String,
  transcript: List(#(String, String)),
) -> Result(String, String) {
  let key_res = case envoy.get("DEEPSEEK_API_KEY") {
    Ok(k) ->
      case string.trim(k) == "" {
        True -> Error("deepseek_api_key_missing")
        False -> Ok(string.trim(k))
      }
    Error(_) -> Error("deepseek_api_key_missing")
  }
  use key <- result.try(key_res)
  let model = case envoy.get("DEEPSEEK_MODEL") {
    Ok(m) ->
      case string.trim(m) == "" {
        True -> "deepseek-chat"
        False -> string.trim(m)
      }
    Error(_) -> "deepseek-chat"
  }
  let url = case envoy.get("DEEPSEEK_API_URL") {
    Ok(u) ->
      case string.trim(u) == "" {
        True -> "https://api.deepseek.com/v1/chat/completions"
        False -> string.trim(u)
      }
    Error(_) -> "https://api.deepseek.com/v1/chat/completions"
  }
  let hist =
    list.map(transcript, fn(pair) {
      let #(r, b) = pair
      message_json(r, b)
    })
  let msgs =
    list.append([message_json("system", system_prompt)], hist)
  let payload =
    json.object([
      #("model", json.string(model)),
      #("messages", json.array(from: msgs, of: fn(x) { x })),
      #("temperature", json.float(0.55)),
    ])
    |> json.to_string
  let auth = "Bearer " <> key
  case http_client.post_json(url, payload, auth) {
    Ok(raw) ->
      case json.parse(raw, choices_first_content_decoder()) {
        Ok(text) ->
          case string.trim(text) == "" {
            True -> Error("deepseek_empty_content")
            False -> Ok(string.trim(text))
          }
        Error(_) -> Error("deepseek_json_parse_failed")
      }
    Error(e) -> Error(string.append("deepseek_http: ", e))
  }
}

/// AiConfig ile chat completion — DB'den yüklenen key/model/url kullanır.
pub fn chat_completion_with_config(
  cfg: AiConfig,
  system_prompt: String,
  transcript: List(#(String, String)),
) -> Result(String, String) {
  case string.trim(cfg.deepseek_api_key) == "" {
    True -> Error("deepseek_api_key_missing")
    False -> {
      let hist = list.map(transcript, fn(pair) {
        let #(r, b) = pair
        message_json(r, b)
      })
      let msgs = list.append([message_json("system", system_prompt)], hist)
      let payload =
        json.object([
          #("model", json.string(cfg.deepseek_model)),
          #("messages", json.array(from: msgs, of: fn(x) { x })),
          #("temperature", json.float(0.55)),
        ])
        |> json.to_string
      let auth = "Bearer " <> cfg.deepseek_api_key
      case http_client.post_json(cfg.deepseek_api_url, payload, auth) {
        Ok(raw) ->
          case json.parse(raw, choices_first_content_decoder()) {
            Ok(text) ->
              case string.trim(text) == "" {
                True -> Error("deepseek_empty_content")
                False -> Ok(string.trim(text))
              }
            Error(_) -> Error("deepseek_json_parse_failed")
          }
        Error(e) -> Error(string.append("deepseek_http: ", e))
      }
    }
  }
}

/// AiConfig ile tek mesaj completion — DB'den yüklenen key/model/url kullanır.
pub fn chat_completion_single_with_config(
  cfg: AiConfig,
  system_prompt: String,
  user_content: String,
  temperature: Float,
) -> Result(String, String) {
  case string.trim(cfg.deepseek_api_key) == "" {
    True -> Error("deepseek_api_key_missing")
    False -> {
      let msgs =
        list.append(
          [message_json("system", system_prompt)],
          [message_json("user", user_content)],
        )
      let payload =
        json.object([
          #("model", json.string(cfg.deepseek_model)),
          #("messages", json.array(from: msgs, of: fn(x) { x })),
          #("temperature", json.float(temperature)),
        ])
        |> json.to_string
      let auth = "Bearer " <> cfg.deepseek_api_key
      case http_client.post_json(cfg.deepseek_api_url, payload, auth) {
        Ok(raw) ->
          case json.parse(raw, choices_first_content_decoder()) {
            Ok(text) ->
              case string.trim(text) == "" {
                True -> Error("deepseek_empty_content")
                False -> Ok(string.trim(text))
              }
            Error(_) -> Error("deepseek_json_parse_failed")
          }
        Error(e) -> Error(string.append("deepseek_http: ", e))
      }
    }
  }
}

/// Tek kullanıcı mesajı + sistem talimatı; sıcaklık profilden gelir.
pub fn chat_completion_single(
  system_prompt: String,
  user_content: String,
  temperature: Float,
) -> Result(String, String) {
  let key_res = case envoy.get("DEEPSEEK_API_KEY") {
    Ok(k) ->
      case string.trim(k) == "" {
        True -> Error("deepseek_api_key_missing")
        False -> Ok(string.trim(k))
      }
    Error(_) -> Error("deepseek_api_key_missing")
  }
  use key <- result.try(key_res)
  let model = case envoy.get("DEEPSEEK_MODEL") {
    Ok(m) ->
      case string.trim(m) == "" {
        True -> "deepseek-chat"
        False -> string.trim(m)
      }
    Error(_) -> "deepseek-chat"
  }
  let url = case envoy.get("DEEPSEEK_API_URL") {
    Ok(u) ->
      case string.trim(u) == "" {
        True -> "https://api.deepseek.com/v1/chat/completions"
        False -> string.trim(u)
      }
    Error(_) -> "https://api.deepseek.com/v1/chat/completions"
  }
  let msgs =
    list.append([message_json("system", system_prompt)], [message_json("user", user_content)])
  let payload =
    json.object([
      #("model", json.string(model)),
      #("messages", json.array(from: msgs, of: fn(x) { x })),
      #("temperature", json.float(temperature)),
    ])
    |> json.to_string
  let auth = "Bearer " <> key
  case http_client.post_json(url, payload, auth) {
    Ok(raw) ->
      case json.parse(raw, choices_first_content_decoder()) {
        Ok(text) ->
          case string.trim(text) == "" {
            True -> Error("deepseek_empty_content")
            False -> Ok(string.trim(text))
          }
        Error(_) -> Error("deepseek_json_parse_failed")
      }
    Error(e) -> Error(string.append("deepseek_http: ", e))
  }
}
