//// NetGSM SMS, Resend e-posta, WhatsApp (Meta veya kuyruk) — ortak gönderim.

import gleam/io
import gleam/json
import gleam/string
import pog
import travel/net/http_client
import travel/site/integration_config.{type IntegrationConfig}

pub fn log_notif(msg: String) -> Nil {
  io.println("[NOTIF] " <> msg)
}

pub fn send_sms(cfg: IntegrationConfig, phone: String, message: String) -> Nil {
  case string.trim(phone), string.trim(cfg.netgsm_usercode) {
    "", _ | _, "" -> log_notif("SMS atlandı — telefon veya API key yok")
    p, uc -> {
      let pw = cfg.netgsm_password
      let hdr = cfg.netgsm_msgheader
      let url =
        "https://api.netgsm.com.tr/sms/send/get/?usercode="
        <> uc
        <> "&password="
        <> pw
        <> "&gsmno="
        <> string.replace(p, "+", "")
        <> "&message="
        <> message
        <> "&msgheader="
        <> hdr
        <> "&dil=TR"
      case http_client.get_url(url) {
        Ok(_) -> log_notif("SMS gönderildi → " <> p)
        Error(e) -> log_notif("SMS hatası → " <> p <> " | " <> e)
      }
    }
  }
}

pub fn send_email(
  cfg: IntegrationConfig,
  to: String,
  subject: String,
  body: String,
) -> Nil {
  case string.trim(to), string.trim(cfg.resend_api_key) {
    "", _ | _, "" -> log_notif("Email atlandı — adres veya API key yok")
    email, key -> {
      let auth = "Bearer " <> key
      let from = case string.trim(cfg.supplier_notify_from) {
        "" -> "rezervasyon@rezervasyonyap.com.tr"
        f -> f
      }
      let payload =
        json.object([
          #("from", json.string(from)),
          #("to", json.array([email], of: json.string)),
          #("subject", json.string(subject)),
          #("text", json.string(body)),
        ])
        |> json.to_string
      case http_client.post_json("https://api.resend.com/emails", payload, auth) {
        Ok(_) -> log_notif("Email gönderildi → " <> email)
        Error(e) -> log_notif("Email hatası → " <> email <> " | " <> e)
      }
    }
  }
}

pub fn send_whatsapp(
  db: pog.Connection,
  cfg: IntegrationConfig,
  phone: String,
  message: String,
  queue_trigger_code: String,
) -> Nil {
  case string.trim(phone) {
    "" -> Nil
    p -> {
      case string.trim(cfg.whatsapp_api_key), string.trim(cfg.whatsapp_phone_id) {
        key, phone_id if key != "" && phone_id != "" -> {
          let url =
            "https://graph.facebook.com/v18.0/" <> phone_id <> "/messages"
          let auth = "Bearer " <> key
          let payload =
            json.object([
              #("messaging_product", json.string("whatsapp")),
              #("to", json.string(string.replace(p, "+", ""))),
              #("type", json.string("text")),
              #("text", json.object([#("body", json.string(message))])),
            ])
            |> json.to_string
          case http_client.post_json(url, payload, auth) {
            Ok(_) -> log_notif("WhatsApp (Meta API) gönderildi → " <> p)
            Error(e) -> {
              log_notif("WhatsApp (Meta API) hatası → " <> p <> " | " <> e)
              queue_whatsapp_fallback(db, p, message, queue_trigger_code)
            }
          }
        }
        _, _ -> queue_whatsapp_fallback(db, p, message, queue_trigger_code)
      }
    }
  }
}

pub fn queue_whatsapp_fallback(
  db: pog.Connection,
  phone: String,
  message: String,
  trigger_code: String,
) -> Nil {
  let wa_link =
    "https://wa.me/"
    <> string.replace(phone, "+", "")
    <> "?text="
    <> string.slice(message, 0, 100)
  let payload =
    json.object([
      #("phone", json.string(phone)),
      #("message", json.string(message)),
      #("wa_link", json.string(wa_link)),
    ])
    |> json.to_string
  let _ =
    pog.query(
      "insert into notification_jobs (trigger_id, channel, payload_json, scheduled_at, status, recipient)"
      <> " select t.id, 'whatsapp', $1::jsonb, now(), 'pending', $2"
      <> " from notification_triggers t where t.code = $3 limit 1",
    )
    |> pog.parameter(pog.text(payload))
    |> pog.parameter(pog.text(phone))
    |> pog.parameter(pog.text(trigger_code))
    |> pog.execute(db)
  log_notif("WhatsApp kuyruğa alındı → " <> phone)
}
