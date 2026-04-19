//// Public iCal feed üretimi — bir ilanın **dışarı** verdiği takvim:
////  - aktif rezervasyonlar (`reservations.status in ('held','confirmed','completed')`)
////  - manuel olarak `is_available=false` işaretlenen takvim günleri
////    (`listing_availability_calendar`); ical_imported_blocks'tan gelenler
////    HARİÇ tutulur (mirror loop'unu önler).
////
//// Çıktı RFC 5545 uyumludur; Airbnb / Booking / Apple / Google Calendar bu
//// URL'i ekledikten sonra gelecek 365 günü periyodik olarak okur.

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/int
import gleam/list
import gleam/string
import pog
import travel/ical/ical_codec.{type IcalEvent, IcalEvent}

const horizon_days: Int = 365

/// Bir listing'in tüm bloklarını VEVENT olarak üretir.
/// Hata olursa boş VCALENDAR döner (HTTP katmanı yine geçerli yanıt verir).
pub fn build_listing_calendar(
  ctx: Context,
  listing_id: String,
  prodid: String,
) -> String {
  let res_events = load_reservations(ctx, listing_id)
  let manual_events = load_manual_blocks(ctx, listing_id)
  let all = list.append(res_events, manual_events)
  ical_codec.build_calendar(prodid, all)
}

// ──────────────────────────────────────────────────────────────────────────
// Reservations → events
// ──────────────────────────────────────────────────────────────────────────

fn res_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use s <- decode.field(1, decode.string)
  use e <- decode.field(2, decode.string)
  use status <- decode.field(3, decode.string)
  decode.success(#(id, s, e, status))
}

fn load_reservations(ctx: Context, listing_id: String) -> List(IcalEvent) {
  case
    pog.query(
      "select id::text, starts_on::text, ends_on::text, status "
      <> "from reservations "
      <> "where listing_id = $1::uuid "
      <> "  and status in ('held','confirmed','completed') "
      <> "  and ends_on >= current_date "
      <> "  and starts_on <= current_date + ($2::int || ' days')::interval "
      <> "order by starts_on",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.int(horizon_days))
    |> pog.returning(res_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> []
    Ok(qr) ->
      list.map(qr.rows, fn(row) {
        let #(id, s, e, status) = row
        IcalEvent(
          uid: "reservation-" <> id <> "@travel",
          starts_on: s,
          ends_on: e,
          summary: "Booked (" <> status <> ")",
        )
      })
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Manual blocks → events (ardışık günleri tek event'e birleştirir)
// ──────────────────────────────────────────────────────────────────────────

fn day_row() -> decode.Decoder(String) {
  use d <- decode.field(0, decode.string)
  decode.success(d)
}

fn load_manual_blocks(ctx: Context, listing_id: String) -> List(IcalEvent) {
  case
    pog.query(
      "select day::text from listing_availability_calendar lac "
      <> "where lac.listing_id = $1::uuid "
      <> "  and lac.is_available = false "
      <> "  and lac.day >= current_date "
      <> "  and lac.day <= current_date + ($2::int || ' days')::interval "
      <> "  and not exists ( "
      <> "    select 1 from ical_imported_blocks ib "
      <> "    join ical_feeds f on f.id = ib.feed_id "
      <> "   where f.listing_id = $1::uuid "
      <> "     and lac.day >= ib.starts_on "
      <> "     and lac.day <  ib.ends_on "
      <> "  ) "
      <> "order by lac.day",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.int(horizon_days))
    |> pog.returning(day_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> []
    Ok(qr) -> merge_consecutive(qr.rows, listing_id)
  }
}

/// Ardışık günleri tek bir VEVENT'e birleştirir (DTEND = son gün + 1, exclusive).
fn merge_consecutive(days: List(String), listing_id: String) -> List(IcalEvent) {
  case days {
    [] -> []
    [first, ..rest] -> do_merge(rest, first, first, [], listing_id)
  }
}

fn do_merge(
  remaining: List(String),
  range_start: String,
  range_last: String,
  acc: List(IcalEvent),
  listing_id: String,
) -> List(IcalEvent) {
  case remaining {
    [] -> {
      let ev = make_block_event(range_start, range_last, listing_id)
      list.reverse([ev, ..acc])
    }
    [d, ..rest] ->
      case is_next_day(range_last, d) {
        True -> do_merge(rest, range_start, d, acc, listing_id)
        False -> {
          let ev = make_block_event(range_start, range_last, listing_id)
          do_merge(rest, d, d, [ev, ..acc], listing_id)
        }
      }
  }
}

fn make_block_event(
  start_iso: String,
  last_iso: String,
  listing_id: String,
) -> IcalEvent {
  IcalEvent(
    uid: "manual-" <> listing_id <> "-" <> start_iso <> "@travel",
    starts_on: start_iso,
    ends_on: add_one_day(last_iso),
    summary: "Blocked",
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Tarih aritmetiği — Fliegel-Van Flandern Julian Day
// ──────────────────────────────────────────────────────────────────────────

fn is_next_day(prev_iso: String, next_iso: String) -> Bool {
  case days_since_epoch(prev_iso), days_since_epoch(next_iso) {
    Ok(a), Ok(b) -> b - a == 1
    _, _ -> False
  }
}

fn add_one_day(iso: String) -> String {
  case days_since_epoch(iso) {
    Ok(d) -> from_julian_offset(d + 1)
    Error(_) -> iso
  }
}

fn days_since_epoch(iso: String) -> Result(Int, Nil) {
  case string.split(iso, "-") {
    [y, m, d] ->
      case int.parse(y), int.parse(m), int.parse(d) {
        Ok(yy), Ok(mm), Ok(dd) -> Ok(julian_day(yy, mm, dd) - epoch_julian())
        _, _, _ -> Error(Nil)
      }
    _ -> Error(Nil)
  }
}

fn epoch_julian() -> Int {
  julian_day(1970, 1, 1)
}

fn julian_day(y: Int, m: Int, d: Int) -> Int {
  let a = { 14 - m } / 12
  let y2 = y + 4800 - a
  let m2 = m + 12 * a - 3
  d + { 153 * m2 + 2 } / 5 + 365 * y2 + y2 / 4 - y2 / 100 + y2 / 400 - 32_045
}

fn from_julian_offset(days: Int) -> String {
  let jd = days + epoch_julian()
  let l1 = jd + 68_569
  let n = 4 * l1 / 146_097
  let l2 = l1 - { 146_097 * n + 3 } / 4
  let i = 4000 * { l2 + 1 } / 1_461_001
  let l3 = l2 - 1461 * i / 4 + 31
  let j = 80 * l3 / 2447
  let day = l3 - 2447 * j / 80
  let l4 = j / 11
  let month = j + 2 - 12 * l4
  let year = 100 * { n - 49 } + i + l4
  pad4(year) <> "-" <> pad2(month) <> "-" <> pad2(day)
}

fn pad2(n: Int) -> String {
  case n < 10 {
    True -> "0" <> int.to_string(n)
    False -> int.to_string(n)
  }
}

fn pad4(n: Int) -> String {
  case n < 10 {
    True -> "000" <> int.to_string(n)
    False ->
      case n < 100 {
        True -> "00" <> int.to_string(n)
        False ->
          case n < 1000 {
            True -> "0" <> int.to_string(n)
            False -> int.to_string(n)
          }
      }
  }
}
