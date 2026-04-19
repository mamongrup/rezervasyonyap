//// Minimal RFC 5545 (iCalendar) codec — Airbnb / Booking.com / Apple / Google
//// arasında availability senkronizasyonu için yeterli alt küme.
////
//// **Parse**:
////  - VEVENT bloklarını tarar
////  - Her event'ten `UID`, `DTSTART`, `DTEND`, opsiyonel `SUMMARY` çıkarır
////  - Tarih formatları desteklenen:
////      `YYYYMMDD`               (DATE — all-day)
////      `YYYYMMDDTHHMMSSZ`       (DATETIME UTC)
////      `YYYYMMDDTHHMMSS`        (floating local — gün kısmı kullanılır)
////  - Çoklu satıra yayılan değerler için RFC 5545 line-folding kuralı:
////      bir sonraki satır boşluk veya tab ile başlıyorsa önceki satırın
////      sonuna eklenir (folded).
////
//// **Build**:
////  - VCALENDAR + VEVENT'leri tek bir CRLF-ayraçlı string olarak üretir
////  - DTSTART;VALUE=DATE / DTEND;VALUE=DATE (all-day) — booking siteleriyle
////    en uyumlu format.
////
//// Bu modül DB / HTTP / availability mantığından bağımsızdır; sadece string
//// dönüşümleri yapar.

import gleam/list
import gleam/result
import gleam/string

/// Tek bir event — tarih sınırları yalnız `Date` (gün) seviyesinde tutulur.
/// `ends_on` iCal mantığında **dışlayıcı** (exclusive). Yani `DTSTART=20260101`,
/// `DTEND=20260103` → blok 1 ve 2 Ocak günleri (3 Ocak değil).
pub type IcalEvent {
  IcalEvent(
    uid: String,
    starts_on: String,
    ends_on: String,
    summary: String,
  )
}

// ──────────────────────────────────────────────────────────────────────────
// PARSE
// ──────────────────────────────────────────────────────────────────────────

/// iCalendar gövdesinden VEVENT'leri çıkarır.
/// Hatalı / eksik event'ler sessizce atlanır (`UID` veya tarih yoksa).
pub fn parse_events(body: String) -> List(IcalEvent) {
  body
  |> normalize_line_endings
  |> unfold_lines
  |> string.split("\n")
  |> collect_events([], False, [])
}

fn normalize_line_endings(s: String) -> String {
  s
  |> string.replace("\r\n", "\n")
  |> string.replace("\r", "\n")
}

/// RFC 5545 line-folding: bir satır boşluk/tab ile başlıyorsa önceki satıra
/// eklenir (baştaki tek karakter atılır).
fn unfold_lines(s: String) -> String {
  s
  |> string.split("\n")
  |> do_unfold([])
  |> list.reverse
  |> string.join("\n")
}

fn do_unfold(lines: List(String), acc: List(String)) -> List(String) {
  case lines {
    [] -> acc
    [head, ..rest] ->
      case string.starts_with(head, " ") || string.starts_with(head, "\t") {
        True ->
          case acc {
            [] -> do_unfold(rest, [string.drop_start(head, 1)])
            [prev, ..tail] ->
              do_unfold(rest, [prev <> string.drop_start(head, 1), ..tail])
          }
        False -> do_unfold(rest, [head, ..acc])
      }
  }
}

fn collect_events(
  lines: List(String),
  events: List(IcalEvent),
  inside: Bool,
  current_props: List(#(String, String)),
) -> List(IcalEvent) {
  case lines {
    [] -> list.reverse(events)
    [line, ..rest] -> {
      let trimmed = string.trim(line)
      case is_begin_event(trimmed), is_end_event(trimmed), inside {
        True, _, _ -> collect_events(rest, events, True, [])
        _, True, True ->
          case build_event(current_props) {
            Ok(ev) -> collect_events(rest, [ev, ..events], False, [])
            Error(_) -> collect_events(rest, events, False, [])
          }
        _, _, True ->
          case parse_property(trimmed) {
            Ok(kv) -> collect_events(rest, events, True, [kv, ..current_props])
            Error(_) -> collect_events(rest, events, True, current_props)
          }
        _, _, False -> collect_events(rest, events, False, current_props)
      }
    }
  }
}

fn is_begin_event(line: String) -> Bool {
  string.uppercase(line) == "BEGIN:VEVENT"
}

fn is_end_event(line: String) -> Bool {
  string.uppercase(line) == "END:VEVENT"
}

/// `KEY[;PARAM=VAL]:VALUE` → `#(KEY_UPPER, VALUE)`.
/// Parametreler şu an okunmuyor (TZID gibi); değer ham haliyle alınır.
fn parse_property(line: String) -> Result(#(String, String), Nil) {
  case string.split_once(line, ":") {
    Ok(#(key_part, value)) -> {
      let key_only = case string.split_once(key_part, ";") {
        Ok(#(k, _)) -> k
        Error(_) -> key_part
      }
      Ok(#(string.uppercase(string.trim(key_only)), string.trim(value)))
    }
    Error(_) -> Error(Nil)
  }
}

fn build_event(props: List(#(String, String))) -> Result(IcalEvent, Nil) {
  use uid <- result.try(prop(props, "UID"))
  use start_raw <- result.try(prop(props, "DTSTART"))
  use end_raw <- result.try(prop(props, "DTEND"))
  use start_iso <- result.try(parse_date(start_raw))
  use end_iso <- result.try(parse_date(end_raw))
  let summary = case prop(props, "SUMMARY") {
    Ok(s) -> s
    Error(_) -> ""
  }
  Ok(IcalEvent(
    uid: string.trim(uid),
    starts_on: start_iso,
    ends_on: end_iso,
    summary: summary,
  ))
}

fn prop(props: List(#(String, String)), key: String) -> Result(String, Nil) {
  case list.find(props, fn(p) { p.0 == key }) {
    Ok(#(_, v)) -> Ok(v)
    Error(_) -> Error(Nil)
  }
}

/// `YYYYMMDD` veya `YYYYMMDDT…` → `YYYY-MM-DD` (sadece tarih kısmı).
/// Diğer formatlar (boş, kısa) → `Error(Nil)`.
fn parse_date(raw: String) -> Result(String, Nil) {
  let cleaned = string.replace(string.trim(raw), "-", "")
  // İlk 8 karakter `YYYYMMDD` olmalı
  case string.length(cleaned) >= 8 {
    False -> Error(Nil)
    True -> {
      let yyyymmdd = string.slice(cleaned, 0, 8)
      // Sadece rakam içeriyorsa kabul et
      case all_digits(yyyymmdd) {
        False -> Error(Nil)
        True ->
          Ok(
            string.slice(yyyymmdd, 0, 4)
            <> "-"
            <> string.slice(yyyymmdd, 4, 2)
            <> "-"
            <> string.slice(yyyymmdd, 6, 2),
          )
      }
    }
  }
}

fn all_digits(s: String) -> Bool {
  s
  |> string.to_graphemes
  |> list.all(is_digit)
}

fn is_digit(c: String) -> Bool {
  case c {
    "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" -> True
    _ -> False
  }
}

// ──────────────────────────────────────────────────────────────────────────
// BUILD
// ──────────────────────────────────────────────────────────────────────────

/// CRLF (RFC 5545 zorunlu satır sonu).
const crlf: String = "\r\n"

/// Tüm event'leri içeren VCALENDAR string'i üretir.
/// `prodid`: yayıncı kimliği, ör. `-//Travel//Listing 123//EN`.
pub fn build_calendar(prodid: String, events: List(IcalEvent)) -> String {
  let header =
    "BEGIN:VCALENDAR" <> crlf
    <> "VERSION:2.0" <> crlf
    <> "PRODID:" <> prodid <> crlf
    <> "CALSCALE:GREGORIAN" <> crlf
    <> "METHOD:PUBLISH" <> crlf

  let body =
    events
    |> list.map(build_vevent)
    |> string.join("")

  header <> body <> "END:VCALENDAR" <> crlf
}

fn build_vevent(ev: IcalEvent) -> String {
  let dtstart = ical_date(ev.starts_on)
  let dtend = ical_date(ev.ends_on)
  "BEGIN:VEVENT" <> crlf
  <> "UID:" <> escape_text(ev.uid) <> crlf
  <> "DTSTAMP:" <> dtstart <> "T000000Z" <> crlf
  <> "DTSTART;VALUE=DATE:" <> dtstart <> crlf
  <> "DTEND;VALUE=DATE:" <> dtend <> crlf
  <> "SUMMARY:" <> escape_text(ev.summary) <> crlf
  <> "STATUS:CONFIRMED" <> crlf
  <> "TRANSP:OPAQUE" <> crlf
  <> "END:VEVENT" <> crlf
}

/// `YYYY-MM-DD` → `YYYYMMDD` (RFC 5545 DATE formu).
fn ical_date(iso: String) -> String {
  string.replace(iso, "-", "")
}

/// RFC 5545 metin escape: ters bölü, virgül, noktalı virgül, satır sonu.
fn escape_text(s: String) -> String {
  s
  |> string.replace("\\", "\\\\")
  |> string.replace(";", "\\;")
  |> string.replace(",", "\\,")
  |> string.replace("\n", "\\n")
  |> string.replace("\r", "")
}
