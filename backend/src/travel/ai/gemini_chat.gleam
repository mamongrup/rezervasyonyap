//// Google AI Studio / Gemini generateContent (ücretsiz flash modeller).

import gleam/dynamic/decode
import gleam/float
import gleam/json
import gleam/string
import gleam/uri
import travel/net/http_client

fn resolve_model(model: String) -> String {
  case string.trim(model) {
    "" -> "gemini-2.5-flash"
    "gemini-1.5-flash" -> "gemini-2.5-flash"
    "gemini-2.0-flash" -> "gemini-2.5-flash"
    s -> s
  }
}

fn join_url(model: String, api_key: String) -> String {
  let m = resolve_model(model)
  let q = uri.percent_encode(string.trim(api_key))
  "https://generativelanguage.googleapis.com/v1beta/models/"
  <> m
  <> ":generateContent?key="
  <> q
}

fn text_from_response_decoder() -> decode.Decoder(String) {
  decode.field(
    "candidates",
    decode.list(
      decode.field(
        "content",
        decode.field(
          "parts",
          decode.list(
            decode.field("text", decode.string, fn(t) { decode.success(t) }),
          ),
          fn(parts) {
            case parts {
              [first, ..] -> decode.success(first)
              [] -> decode.success("")
            }
          },
        ),
        fn(text) { decode.success(text) },
      ),
    ),
    fn(texts) {
      case texts {
        [first, ..] -> decode.success(first)
        [] -> decode.success("")
      }
    },
  )
}

/// Kota / rate-limit gövdesi mi?
pub fn is_quota_error_body(err: String) -> Bool {
  let low = string.lowercase(err)
  string.contains(low, "resource_exhausted")
  || string.contains(low, "quota")
  || string.contains(low, "rate limit")
  || string.contains(low, "\"code\": 429")
  || string.contains(low, "\"status\": 429")
  || string.contains(low, "too many requests")
}

pub type GeminiResult {
  GeminiOk(String)
  GeminiQuota(String)
  GeminiError(String)
}

/// Tek anahtar ile generateContent.
pub fn generate_content(
  api_key: String,
  model: String,
  system_prompt: String,
  user_msg: String,
  temperature: Float,
  timeout_ms: Int,
) -> GeminiResult {
  case string.trim(api_key) == "" {
    True -> GeminiError("gemini_api_key_missing")
    False -> {
      let temp = case temperature >. 2.0 || temperature <. 0.0 {
        True -> 0.7
        False -> temperature
      }
      let payload =
        json.object([
          #(
            "system_instruction",
            json.object([
              #(
                "parts",
                json.array(
                  from: [json.object([#("text", json.string(system_prompt))])],
                  of: fn(x) { x },
                ),
              ),
            ]),
          ),
          #(
            "contents",
            json.array(
              from: [
                json.object([
                  #("role", json.string("user")),
                  #(
                    "parts",
                    json.array(
                      from: [json.object([#("text", json.string(user_msg))])],
                      of: fn(x) { x },
                    ),
                  ),
                ]),
              ],
              of: fn(x) { x },
            ),
          ),
          #(
            "generationConfig",
            json.object([#("temperature", json.float(temp))]),
          ),
        ])
        |> json.to_string
      let active_model = resolve_model(model)
      let url = join_url(active_model, api_key)
      case http_client.post_json_with_timeout(url, payload, "", timeout_ms) {
        Ok(raw) ->
          case json.parse(raw, text_from_response_decoder()) {
            Ok(text) ->
              case string.trim(text) == "" {
                True -> GeminiError("gemini_empty_content")
                False -> GeminiOk(string.trim(text))
              }
            Error(_) -> GeminiError("gemini_json_parse_failed")
          }
        Error(e) ->
          case is_quota_error_body(e) {
            True -> GeminiQuota(e)
            False -> {
              let is_model_404 =
                string.contains(e, "404")
                || string.contains(e, "no longer available")
                || string.contains(e, "not found")

              case is_model_404 && active_model != "gemini-2.5-flash" {
                True ->
                  // Otomatik güncel kararlı Flash modeline fallback yap.
                  generate_content(
                    api_key,
                    "gemini-2.5-flash",
                    system_prompt,
                    user_msg,
                    temperature,
                    timeout_ms,
                  )
                False ->
                  GeminiError(string.append(
                    "gemini_http: ",
                    string.slice(e, 0, 400),
                  ))
              }
            }
          }
      }
    }
  }
}

/// Tek anahtar ile metin + satır içi görsel analizi (20 MB altı istekler).
pub fn generate_content_with_image(
  api_key: String,
  model: String,
  system_prompt: String,
  user_msg: String,
  image_mime: String,
  image_base64: String,
  temperature: Float,
  timeout_ms: Int,
) -> GeminiResult {
  case string.trim(api_key) == "" || string.trim(image_base64) == "" {
    True -> GeminiError("gemini_api_key_or_image_missing")
    False -> {
      let temp = case temperature >. 2.0 || temperature <. 0.0 {
        True -> 0.1
        False -> temperature
      }
      let payload =
        json.object([
          #(
            "system_instruction",
            json.object([
              #(
                "parts",
                json.array(
                  from: [json.object([#("text", json.string(system_prompt))])],
                  of: fn(x) { x },
                ),
              ),
            ]),
          ),
          #(
            "contents",
            json.array(
              from: [
                json.object([
                  #("role", json.string("user")),
                  #(
                    "parts",
                    json.array(
                      from: [
                        json.object([#("text", json.string(user_msg))]),
                        json.object([
                          #(
                            "inlineData",
                            json.object([
                              #("mimeType", json.string(image_mime)),
                              #("data", json.string(image_base64)),
                            ]),
                          ),
                        ]),
                      ],
                      of: fn(x) { x },
                    ),
                  ),
                ]),
              ],
              of: fn(x) { x },
            ),
          ),
          #(
            "generationConfig",
            json.object([
              #("temperature", json.float(temp)),
              #("responseMimeType", json.string("application/json")),
            ]),
          ),
        ])
        |> json.to_string
      let active_model = resolve_model(model)
      let url = join_url(active_model, api_key)
      case http_client.post_json_with_timeout(url, payload, "", timeout_ms) {
        Ok(raw) ->
          case json.parse(raw, text_from_response_decoder()) {
            Ok(text) ->
              case string.trim(text) == "" {
                True -> GeminiError("gemini_empty_content")
                False -> GeminiOk(string.trim(text))
              }
            Error(_) -> GeminiError("gemini_json_parse_failed")
          }
        Error(e) ->
          case is_quota_error_body(e) {
            True -> GeminiQuota(e)
            False -> {
              let is_model_404 =
                string.contains(e, "404")
                || string.contains(e, "no longer available")
                || string.contains(e, "not found")
              case is_model_404 && active_model != "gemini-2.5-flash" {
                True ->
                  generate_content_with_image(
                    api_key,
                    "gemini-2.5-flash",
                    system_prompt,
                    user_msg,
                    image_mime,
                    image_base64,
                    temperature,
                    timeout_ms,
                  )
                False ->
                  GeminiError(string.append(
                    "gemini_http: ",
                    string.slice(e, 0, 400),
                  ))
              }
            }
          }
      }
    }
  }
}

pub fn default_model() -> String {
  "gemini-2.5-flash"
}

pub fn clamp_temperature(t: Float) -> Float {
  case t >. 2.0 || t <. 0.0 {
    True -> 0.7
    False -> t
  }
}

pub fn temperature_from_string(s: String) -> Float {
  case float.parse(string.trim(s)) {
    Ok(f) -> clamp_temperature(f)
    Error(_) -> 0.7
  }
}
