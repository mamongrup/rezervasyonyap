//// Entegrasyon Yapılandırması — DB-first, env fallback
////
//// Admin panelinde site_settings tablosuna kaydedilen entegrasyon
//// ayarlarını okur. Değer yoksa ortam değişkenine (env) bakar.
////
//// site_settings key = "integrations", value_json = JSON objesi

import envoy
import gleam/dynamic/decode
import gleam/io
import gleam/json
import gleam/string
import pog

pub type IntegrationConfig {
  IntegrationConfig(
    netgsm_usercode: String,
    netgsm_password: String,
    netgsm_msgheader: String,
    resend_api_key: String,
    supplier_notify_from: String,
    invoice_notify_from: String,
    whatsapp_api_key: String,
    whatsapp_phone_id: String,
    whatsapp_template: String,
    site_url: String,
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

/// DB'deki ham JSON string'inden bir alan değerini çeker.
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

/// DB'den "integrations" ayarlarını ham JSON string olarak çeker.
fn fetch_raw(db: pog.Connection) -> String {
  case
    pog.query(
      "select value_json::text from site_settings"
      <> " where key = 'integrations' and organization_id is null limit 1",
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

/// DB-first, env fallback ile IntegrationConfig yükler.
/// Her bildirim gönderiminden önce çağrılır (caching istenirse üst katmanda yapılabilir).
pub fn load(db: pog.Connection) -> IntegrationConfig {
  let raw = fetch_raw(db)
  let get = fn(db_field: String, env_key: String, default: String) -> String {
    case pick(raw, db_field) {
      "" -> env_or(env_key, default)
      v -> v
    }
  }
  IntegrationConfig(
    netgsm_usercode: get("netgsm_usercode", "NETGSM_USERCODE", ""),
    netgsm_password: get("netgsm_password", "NETGSM_PASSWORD", ""),
    netgsm_msgheader: get("netgsm_msgheader", "NETGSM_MSGHEADER", "REZERVASYON"),
    resend_api_key: get("resend_api_key", "RESEND_API_KEY", ""),
    supplier_notify_from: get(
      "supplier_notify_from",
      "SUPPLIER_NOTIFY_FROM",
      env_or("INVOICE_NOTIFY_FROM", "rezervasyon@rezervasyonyap.com.tr"),
    ),
    invoice_notify_from: get(
      "invoice_notify_from",
      "INVOICE_NOTIFY_FROM",
      "fatura@rezervasyonyap.com.tr",
    ),
    whatsapp_api_key: get("whatsapp_api_key", "WHATSAPP_API_KEY", ""),
    whatsapp_phone_id: get("whatsapp_phone_id", "WHATSAPP_PHONE_ID", ""),
    whatsapp_template: get(
      "whatsapp_template_new_reservation",
      "WHATSAPP_TEMPLATE",
      "yeni_rezervasyon",
    ),
    site_url: get("site_url", "SITE_URL", "https://rezervasyonyap.com.tr"),
  )
}

pub fn log_status(cfg: IntegrationConfig) -> Nil {
  io.println(
    "[NOTIF-CONFIG] SMS:"
    <> case cfg.netgsm_usercode != "" && cfg.netgsm_password != "" {
      True -> "✓"
      False -> "✗"
    }
    <> " | Email:"
    <> case cfg.resend_api_key != "" {
      True -> "✓"
      False -> "✗"
    }
    <> " | WhatsApp:"
    <> case cfg.whatsapp_api_key != "" {
      True -> "✓"
      False -> "kuyruk"
    }
    <> " | SiteURL:"
    <> cfg.site_url,
  )
}

/// Yalnızca env değişkenlerinden yapılandırma yükler (test için).
pub fn from_env() -> IntegrationConfig {
  IntegrationConfig(
    netgsm_usercode: env_or("NETGSM_USERCODE", ""),
    netgsm_password: env_or("NETGSM_PASSWORD", ""),
    netgsm_msgheader: env_or("NETGSM_MSGHEADER", "REZERVASYON"),
    resend_api_key: env_or("RESEND_API_KEY", ""),
    supplier_notify_from: env_or(
      "SUPPLIER_NOTIFY_FROM",
      env_or("INVOICE_NOTIFY_FROM", ""),
    ),
    invoice_notify_from: env_or("INVOICE_NOTIFY_FROM", ""),
    whatsapp_api_key: env_or("WHATSAPP_API_KEY", ""),
    whatsapp_phone_id: env_or("WHATSAPP_PHONE_ID", ""),
    whatsapp_template: env_or("WHATSAPP_TEMPLATE", "yeni_rezervasyon"),
    site_url: env_or("SITE_URL", "https://rezervasyonyap.com.tr"),
  )
}

