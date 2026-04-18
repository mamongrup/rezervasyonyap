//// Oturum `ai_mode` ≠ off iken kullanıcı mesajına DeepSeek ile asistan yanıtı ekler.

import backend/context.{type Context}
import gleam/dynamic/decode as decode
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import pog
import travel/ai/deepseek_chat
import travel/db/decode_helpers as row_dec

fn session_ai_state_row() -> decode.Decoder(#(String, String, String)) {
  use am <- decode.field(0, decode.string)
  use ca <- decode.field(1, decode.string)
  use loc <- decode.field(2, decode.string)
  decode.success(#(am, ca, loc))
}

/// Görev tanımı İngilizce; yanıt dili `locale` ile zorlanır (site dilleri: tr, en, de, ru, zh, fr).
fn locale_reply_rule(locale: String) -> String {
  let l = string.lowercase(string.trim(locale))
  case l {
    "tr" ->
      "Yanıtlarını her zaman doğal ve akıcı Türkçe ile ver; kısa ve nazik ol."
    "en" ->
      "Always respond in clear, natural English; keep answers concise and polite."
    "de" ->
      "Antworte immer auf klares, natürliches Deutsch; kurz und höflich."
    "ru" ->
      "Всегда отвечай на грамотном русском языке; кратко и вежливо."
    "zh" ->
      "请始终使用自然流畅的中文回答；简洁、礼貌。"
    "fr" ->
      "Réponds toujours en français clair et naturel ; sois bref et poli."
    _ ->
      "Yanıtlarını her zaman doğal ve akıcı Türkçe ile ver; kısa ve nazik ol."
  }
}

fn system_prompt_for_mode(mode: String, locale: String) -> String {
  let m = string.lowercase(string.trim(mode))
  let base = case m {
    "sales" ->
      "You are a sales assistant for a travel booking platform. Give short, clear, polite answers; guide the user by asking about listing types (accommodation, tour, vehicle, experience). Do not invent prices or availability; suggest they verify on the site."
    "cross_sell" ->
      "You are a cross-sell assistant for the same platform. You may suggest complementary services (transfers, activities, insurance, similar destinations); do not overpromise."
    "concierge" ->
      "You are a post-booking concierge assistant. Help with transport, airports, local activities, restaurants, and safety tips. Do not invent exact times or prices; suggest official sources or the booking screen."
    _ -> "You are a helpful travel assistant. Keep answers short and polite."
  }
  let rule = locale_reply_rule(locale)
  string.append(string.append(base, " "), rule)
}

fn ai_unavailable_fallback(locale: String) -> String {
  let l = string.lowercase(string.trim(locale))
  case l {
    "en" ->
      "Automatic replies are temporarily unavailable. Please try again later or contact live support."
    "de" ->
      "Automatische Antworten sind vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Live-Support."
    "ru" ->
      "Автоответы временно недоступны. Повторите попытку позже или обратитесь в службу поддержки."
    "zh" ->
      "暂时无法生成自动回复。请稍后再试或联系在线客服。"
    "fr" ->
      "Les réponses automatiques sont temporairement indisponibles. Réessayez plus tard ou contactez le support en direct."
    _ ->
      "Şu anda otomatik yanıt üretilemiyor. Lütfen bir süre sonra tekrar deneyin veya canlı destek ile iletişime geçin."
  }
}

fn msg_pair_row() -> decode.Decoder(#(String, String)) {
  use role <- decode.field(0, decode.string)
  use body <- decode.field(1, decode.string)
  decode.success(#(role, body))
}

/// Oturum açık ve AI açıksa son kullanıcı mesajından sonra asistan mesajı ekler; `Some(assistant_msg_id)` döner.
pub fn try_append_assistant_reply(ctx: Context, session_id: String) -> Option(String) {
  let sid = string.trim(session_id)
  case sid == "" {
    True -> None
    False ->
      case
        pog.query(
          "select ai_mode, coalesce(closed_at::text,''), coalesce(locale,'tr') from chat_sessions where id = $1::uuid limit 1",
        )
        |> pog.parameter(pog.text(sid))
        |> pog.returning(session_ai_state_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> None
        Ok(ret) ->
          case ret.rows {
            [] -> None
            [#(am, closed, loc)] -> {
              case closed == "" {
                False -> None
                True ->
                  case string.lowercase(string.trim(am)) {
                    "off" -> None
                    mode -> {
                      let sys = system_prompt_for_mode(mode, loc)
                      case
                        pog.query(
                          "select role, body from chat_messages where session_id = $1::uuid order by id asc limit 40",
                        )
                        |> pog.parameter(pog.text(sid))
                        |> pog.returning(msg_pair_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> None
                        Ok(mret) -> {
                          let pairs =
                            mret.rows
                            |> list.filter(fn(pr) {
                              let #(r, _) = pr
                              let rl = string.lowercase(string.trim(r))
                              rl == "user" || rl == "assistant"
                            })
                            |> list.map(fn(pr) {
                              let #(r, b) = pr
                              #(string.lowercase(string.trim(r)), b)
                            })
                          case deepseek_chat.chat_completion(sys, pairs) {
                            Ok(reply_text) -> insert_assistant(ctx, sid, reply_text)
                            Error(_) -> {
                              let fallback = ai_unavailable_fallback(loc)
                              insert_assistant(ctx, sid, fallback)
                            }
                          }
                        }
                      }
                    }
                  }
              }
            }
            _ -> None
          }
      }
  }
}

fn insert_assistant(ctx: Context, session_id: String, body: String) -> Option(String) {
  let meta = "{\"source\":\"ai\"}"
  case
    pog.query(
      "insert into chat_messages (session_id, role, body, meta_json) values ($1::uuid, 'assistant', $2, $3::jsonb) returning id::text",
    )
    |> pog.parameter(pog.text(session_id))
    |> pog.parameter(pog.text(body))
    |> pog.parameter(pog.text(meta))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> None
    Ok(r) ->
      case r.rows {
        [id] -> Some(id)
        _ -> None
      }
  }
}
