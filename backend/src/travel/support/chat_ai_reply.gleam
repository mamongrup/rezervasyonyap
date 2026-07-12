//// Oturum `ai_mode` ≠ off iken kullanıcı mesajına DeepSeek ile asistan yanıtı ekler.

import backend/context.{type Context}
import gleam/dynamic/decode as decode
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/ai/ai_config
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
      "You are the senior sales representative for a travel booking platform. Your goal is to help the guest confidently find and book the right option, without pressure or misleading claims. Follow this sequence: (1) understand trip intent, destination, dates, guest count, budget and key needs; ask only the one or two missing questions that most improve the recommendation, (2) summarize the need in one short sentence, (3) guide the guest to the most relevant category or site filters and explain what to compare, (4) answer objections clearly and suggest alternatives when there is no fit, (5) give a clear next step toward the listing or booking screen, (6) when appropriate, ask permission before a human follow-up. Be concise, warm and proactive. Never invent prices, availability, discounts, policies, ratings, phone numbers or reservation confirmations. Do not claim that a booking is made or payment is received. Never request card details, passwords or identity document numbers in chat. For cancellation, refund, payment dispute, legal, safety or urgent travel disruption requests, acknowledge the issue and offer human support instead of making a decision."
    "cross_sell" ->
      "You are a thoughtful travel sales representative for the same platform. After the primary need is clear, suggest at most two genuinely useful complementary services such as airport transfer, activity, insurance or a better-fitting alternative. Explain the benefit in the guest's context and never use pressure, urgency or invented discounts. Do not invent prices, availability or booking status; guide the guest to verify details on the site."
    "concierge" ->
      "You are a post-booking concierge assistant. Help with transport, airports, local activities, restaurants and safety tips. Prioritize the guest's confirmed booking information when it is available. Do not invent exact times, prices, booking changes or supplier promises; send the guest to the booking screen or official sources for confirmation. Escalate safety, cancellation, refund and major itinerary problems to human support."
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

fn live_catalog_context(ctx: Context) -> String {
  case pog.query("select coalesce(jsonb_agg(to_jsonb(x))::text,'[]') from (select l.id::text,coalesce(lt.title,l.slug) title,coalesce(l.location_name,'') location,l.slug,coalesce(l.vitrin_price::text,'') price,l.currency_code::text currency from listings l left join listing_translations lt on lt.listing_id=l.id left join locales loc on loc.id=lt.locale_id and lower(loc.code)='tr' where l.status='published' order by l.review_avg desc nulls last,l.updated_at desc limit 30) x")
    |> pog.returning(row_dec.col0_string()) |> db_exec.execute(ctx.db) {
    Ok(ret) -> case ret.rows { [catalog] -> catalog _ -> "[]" }
    Error(_) -> "[]"
  }
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
        |> db_exec.execute(ctx.db)
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
                        <> " Use only this live published catalog when naming or recommending a product. If no suitable item is present, say so and ask a clarifying question; never invent a listing. Catalog JSON: "
                        <> live_catalog_context(ctx)
                      case
                        pog.query(
                          "select role, body from chat_messages where session_id = $1::uuid order by id asc limit 40",
                        )
                        |> pog.parameter(pog.text(sid))
                        |> pog.returning(msg_pair_row())
                        |> db_exec.execute(ctx.db)
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
                          let cfg = ai_config.load(ctx.db)
                          let timeout_ms =
                            ai_config.profile_upstream_timeout_ms(
                              ctx.db,
                              "chat_sales",
                            )
                          case
                            deepseek_chat.chat_completion_with_config(
                              cfg,
                              sys,
                              pairs,
                              timeout_ms,
                            )
                          {
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
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> None
    Ok(r) ->
      case r.rows {
        [id] -> Some(id)
        _ -> None
      }
  }
}
