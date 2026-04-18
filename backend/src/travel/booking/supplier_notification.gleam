//// Tedarikçi Bildirim Modülü
////
//// Yeni rezervasyon, onay, iptal ve deadline uyarısı olaylarında
//// tedarikçi + müşteriye 3 kanaldan bildirim gönderir:
////   1. SMS       — NetGSM
////   2. E-posta   — Resend
////   3. WhatsApp  — Meta API (varsa) veya notification_jobs kuyruğu
////
//// API kimlik bilgileri: DB site_settings["integrations"] → env fallback

import gleam/dynamic/decode
import gleam/string
import pog
import travel/messaging/notification_channels
import travel/site/integration_config.{type IntegrationConfig}

// ─────────────────────────────────────────────────────────────────────────────
// Rezervasyon verisi

type ReservationNotifData {
  ReservationNotifData(
    public_code: String,
    guest_name: String,
    guest_email: String,
    guest_phone: String,
    starts_on: String,
    ends_on: String,
    amount_paid: String,
    supplier_total: String,
    supplier_prepaid: String,
    guest_due: String,
    deadline: String,
    confirm_token: String,
    listing_title: String,
    payment_type: String,
    supplier_phone: String,
    supplier_email: String,
    supplier_whatsapp: String,
    supplier_name: String,
  )
}

fn fetch_notif_data(
  db: pog.Connection,
  reservation_id: String,
) -> Result(ReservationNotifData, String) {
  let sql =
    "select "
    <> "r.public_code, "
    <> "coalesce(r.guest_name, ''), "
    <> "coalesce(r.guest_email, ''), "
    <> "coalesce(r.guest_phone, ''), "
    <> "coalesce(r.starts_on::text, ''), "
    <> "coalesce(r.ends_on::text, ''), "
    <> "coalesce(r.amount_paid::text, '0'), "
    <> "coalesce(r.supplier_total_amount::text, '0'), "
    <> "coalesce(r.supplier_prepaid_amount::text, '0'), "
    <> "coalesce(r.guest_due_at_checkin::text, '0'), "
    <> "coalesce(r.supplier_confirm_deadline::text, ''), "
    <> "coalesce(r.supplier_confirm_token, ''), "
    <> "coalesce(lt.title, l.slug, ''), "
    <> "coalesce(r.payment_type, 'full'), "
    <> "coalesce(loc.contact_phone, ''), "
    <> "coalesce(loc.contact_email, ''), "
    <> "coalesce(loc.contact_whatsapp, ''), "
    <> "coalesce(loc.contact_name, '') "
    <> "from reservations r "
    <> "join listings l on l.id = r.listing_id "
    <> "left join ( select lt.listing_id, lt.title from listing_translations lt "
    <> "inner join locales loc on loc.id = lt.locale_id and lower(loc.code) = 'tr' ) lt on lt.listing_id = l.id "
    <> "left join listing_owner_contacts loc on loc.listing_id = l.id "
    <> "where r.id = $1::uuid limit 1"

  case
    pog.query(sql)
    |> pog.parameter(pog.text(reservation_id))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      use b <- decode.field(1, decode.string)
      use c <- decode.field(2, decode.string)
      use d <- decode.field(3, decode.string)
      use e <- decode.field(4, decode.string)
      use f <- decode.field(5, decode.string)
      use g <- decode.field(6, decode.string)
      use h <- decode.field(7, decode.string)
      use i <- decode.field(8, decode.string)
      use j <- decode.field(9, decode.string)
      use k <- decode.field(10, decode.string)
      use l2 <- decode.field(11, decode.string)
      use m <- decode.field(12, decode.string)
      use n <- decode.field(13, decode.string)
      use o <- decode.field(14, decode.string)
      use p <- decode.field(15, decode.string)
      use q <- decode.field(16, decode.string)
      use r2 <- decode.field(17, decode.string)
      decode.success(ReservationNotifData(
        public_code: a,
        guest_name: b,
        guest_email: c,
        guest_phone: d,
        starts_on: e,
        ends_on: f,
        amount_paid: g,
        supplier_total: h,
        supplier_prepaid: i,
        guest_due: j,
        deadline: k,
        confirm_token: l2,
        listing_title: m,
        payment_type: n,
        supplier_phone: o,
        supplier_email: p,
        supplier_whatsapp: q,
        supplier_name: r2,
      ))
    })
    |> pog.execute(db)
  {
    Error(_) -> Error("fetch_failed")
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error("not_found")
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mesaj şablonları

fn supplier_sms(cfg: IntegrationConfig, d: ReservationNotifData) -> String {
  let confirm_link = cfg.site_url <> "/provizyon/" <> d.confirm_token
  let payment_line = case d.payment_type {
    "partial" ->
      "Ön ödeme: "
      <> d.amount_paid
      <> " TL alindi. Giriş: "
      <> d.guest_due
      <> " TL misafirden."
    _ -> "Tam ödeme: " <> d.amount_paid <> " TL alındı."
  }
  string.concat([
    "YENİ REZERVASYON - ",
    d.public_code,
    "\n",
    d.listing_title,
    "\nMisafir: ",
    d.guest_name,
    "\nGiriş: ",
    d.starts_on,
    " / Çıkış: ",
    d.ends_on,
    "\n",
    payment_line,
    "\nOnay: ",
    confirm_link,
  ])
}

fn supplier_email_subject(d: ReservationNotifData) -> String {
  "Yeni Rezervasyon: " <> d.listing_title <> " — " <> d.public_code
}

fn supplier_email_body(cfg: IntegrationConfig, d: ReservationNotifData) -> String {
  let confirm_link = cfg.site_url <> "/provizyon/" <> d.confirm_token
  let payment_section = case d.payment_type {
    "partial" ->
      string.concat([
        "Ödeme Tipi     : Kısmi Ön Ödeme\n",
        "Müşteri Ödedi  : ",
        d.amount_paid,
        " TL\n",
        "Size Transfer  : ",
        d.supplier_prepaid,
        " TL (check-in'de)\n",
        "Girişte Misafirden: ",
        d.guest_due,
        " TL (nakit/kart)\n",
      ])
    _ ->
      string.concat([
        "Ödeme Tipi     : Tam Ödeme\n",
        "Müşteri Ödedi  : ",
        d.amount_paid,
        " TL\n",
        "Size Toplam    : ",
        d.supplier_total,
        " TL (check-in'de)\n",
      ])
  }
  string.concat([
    "Sayın ",
    d.supplier_name,
    ",\n\n",
    d.listing_title,
    " ilanınız için yeni bir rezervasyon alındı.\n\n",
    "=== REZERVASYON BİLGİLERİ ===\n",
    "Rezervasyon Kodu : ",
    d.public_code,
    "\nMisafir          : ",
    d.guest_name,
    "\nGiriş            : ",
    d.starts_on,
    "\nÇıkış            : ",
    d.ends_on,
    "\n\n=== ÖDEME CETVELİ ===\n",
    payment_section,
    "\n=== ONAY GEREKLİ ===\n",
    confirm_link,
    "\nSon: ",
    d.deadline,
    "\nZamanında onaylamazsanız müşteri temsilcimiz devreye girecektir.\n\n",
    "Saygılarımızla,\nRezervasyonYap.com.tr\n",
  ])
}

fn whatsapp_msg(cfg: IntegrationConfig, d: ReservationNotifData) -> String {
  let confirm_link = cfg.site_url <> "/provizyon/" <> d.confirm_token
  string.concat([
    "🏡 *YENİ REZERVASYON — ",
    d.public_code,
    "*\n\n*İlan:* ",
    d.listing_title,
    "\n*Misafir:* ",
    d.guest_name,
    "\n*Giriş:* ",
    d.starts_on,
    " | *Çıkış:* ",
    d.ends_on,
    "\n*Size Ödenecek:* ",
    d.supplier_total,
    " TL\n\n✅ Onaylamak için:\n",
    confirm_link,
    "\n\n⏰ Son: ",
    d.deadline,
  ])
}

fn guest_sms(d: ReservationNotifData) -> String {
  string.concat([
    "Rezervasyonunuz alındı! Kod: ",
    d.public_code,
    "\n",
    d.listing_title,
    "\nGiriş: ",
    d.starts_on,
    "\nTedarikçi onayı bekleniyor.\nRezervasyonYap.com.tr",
  ])
}

fn guest_email_body(d: ReservationNotifData) -> String {
  string.concat([
    "Sayın ",
    d.guest_name,
    ",\n\nRezervasyonunuz alındı.\n\n",
    "Kod    : ",
    d.public_code,
    "\nİlan   : ",
    d.listing_title,
    "\nGiriş  : ",
    d.starts_on,
    "\nÇıkış  : ",
    d.ends_on,
    "\nÖdedi  : ",
    d.amount_paid,
    " TL\n",
    case d.payment_type {
      "partial" -> "Girişte ödenecek: " <> d.guest_due <> " TL\n"
      _ -> "Ek ödeme gerekmez.\n"
    },
    "\nTedarikçi onayı bekleniyor. Onay gelince bildirim alacaksınız.\n\n",
    "Saygılarımızla,\nRezervasyonYap.com.tr\n",
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API

/// Yeni rezervasyon: tedarikçi + müşteriye bildirim gönder.
/// Checkout transaction commit sonrası çağrılmalı.
pub fn notify_new_reservation(
  db: pog.Connection,
  reservation_id: String,
) -> Nil {
  let cfg = integration_config.load(db)
  case fetch_notif_data(db, reservation_id) {
    Error(e) -> notification_channels.log_notif("Veri alınamadı: " <> e)
    Ok(d) -> {
      // Tedarikçiye
      notification_channels.send_sms(cfg, d.supplier_phone, supplier_sms(cfg, d))
      notification_channels.send_email(
        cfg,
        d.supplier_email,
        supplier_email_subject(d),
        supplier_email_body(cfg, d),
      )
      let wa_phone = case string.trim(d.supplier_whatsapp) {
        "" -> d.supplier_phone
        w -> w
      }
      notification_channels.send_whatsapp(
        db,
        cfg,
        wa_phone,
        whatsapp_msg(cfg, d),
        "new_reservation_supplier",
      )
      // Müşteriye
      notification_channels.send_sms(cfg, d.guest_phone, guest_sms(d))
      notification_channels.send_email(
        cfg,
        d.guest_email,
        "Rezervasyonunuz Alındı — " <> d.public_code,
        guest_email_body(d),
      )
    }
  }
}

/// Tedarikçi onayladığında müşteriye bildirim gönder.
pub fn notify_reservation_confirmed(
  db: pog.Connection,
  reservation_id: String,
) -> Nil {
  let cfg = integration_config.load(db)
  case fetch_notif_data(db, reservation_id) {
    Error(_) -> Nil
    Ok(d) -> {
      let sms_txt =
        "Rezervasyonunuz onaylandı! Kod: "
        <> d.public_code
        <> "\n"
        <> d.listing_title
        <> "\nGiriş: "
        <> d.starts_on
        <> "\nİyi tatiller! — RezervasyonYap.com.tr"
      notification_channels.send_sms(cfg, d.guest_phone, sms_txt)
      notification_channels.send_email(
        cfg,
        d.guest_email,
        "Rezervasyonunuz Onaylandı — " <> d.public_code,
        string.concat([
          "Sayın ",
          d.guest_name,
          ",\n\n",
          d.listing_title,
          " rezervasyonunuz onaylandı.\n\nKod: ",
          d.public_code,
          "\nGiriş: ",
          d.starts_on,
          "\nÇıkış: ",
          d.ends_on,
          "\n",
          case d.payment_type {
            "partial" -> "Girişte ödenecek: " <> d.guest_due <> " TL\n"
            _ -> "Ek ödeme gerekmez.\n"
          },
          "\nİyi tatiller!\nRezervasyonYap.com.tr\n",
        ]),
      )
    }
  }
}

/// Tedarikçi reddedince müşteriye bildirim gönder.
pub fn notify_reservation_cancelled_by_supplier(
  db: pog.Connection,
  reservation_id: String,
  supplier_note: String,
) -> Nil {
  let cfg = integration_config.load(db)
  case fetch_notif_data(db, reservation_id) {
    Error(_) -> Nil
    Ok(d) -> {
      notification_channels.send_sms(
        cfg,
        d.guest_phone,
        "Rezervasyonunuz iptal edildi. Kod: "
          <> d.public_code
          <> "\nMüşteri temsilcimiz sizi arayacak.",
      )
      notification_channels.send_email(
        cfg,
        d.guest_email,
        "Rezervasyonunuz Hakkında — " <> d.public_code,
        string.concat([
          "Sayın ",
          d.guest_name,
          ",\n\n",
          d.listing_title,
          " rezervasyonunuz (Kod: ",
          d.public_code,
          ") tedarikçi tarafından kabul edilemedi.\n\n",
          case string.trim(supplier_note) {
            "" -> ""
            n -> "Tedarikçi notu: " <> n <> "\n\n"
          },
          "Müşteri temsilcimiz en kısa sürede sizinle iletişime geçecektir.\n",
          "Ödemeniz güvende tutulmaktadır.\n\nSaygılarımızla,\nRezervasyonYap.com.tr\n",
        ]),
      )
    }
  }
}

/// Deadline yaklaşınca tedarikçiye son uyarı gönder.
pub fn notify_supplier_deadline_warning(
  db: pog.Connection,
  reservation_id: String,
) -> Nil {
  let cfg = integration_config.load(db)
  case fetch_notif_data(db, reservation_id) {
    Error(_) -> Nil
    Ok(d) ->
      case string.trim(d.confirm_token) {
        "" -> Nil
        _ -> {
          let confirm_link = cfg.site_url <> "/provizyon/" <> d.confirm_token
          notification_channels.send_sms(
            cfg,
            d.supplier_phone,
            "SON UYARI! Rezervasyon "
              <> d.public_code
              <> " için onay bekleniyor. Onay: "
              <> confirm_link,
          )
          let wa_phone = case string.trim(d.supplier_whatsapp) {
            "" -> d.supplier_phone
            w -> w
          }
          notification_channels.send_whatsapp(
            db,
            cfg,
            wa_phone,
            "⚠️ *SON UYARI — "
              <> d.public_code
              <> "*\n\n"
              <> d.listing_title
              <> " için onay bekleniyor!\n\n"
              <> confirm_link,
            "supplier_deadline_warning",
          )
        }
      }
  }
}
