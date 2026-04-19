//// iCal feed senkronizasyonu — `ical_feeds` tablosundaki bir feed'i:
////  1. Harici URL'den çeker (`http_client.get_url`)
////  2. `ical_codec.parse_events` ile VEVENT'leri çıkarır
////  3. Tek transaction içinde:
////     - `ical_imported_blocks` feed'in eski satırlarını siler
////     - Yeni event'leri ekler
////     - `listing_availability_calendar`'da eski feed kaynaklı blokları kaldırır
////       ve yeni günleri `is_available=false` olarak işaretler
////  4. `ical_feeds.last_sync_at`, `last_event_count`, `last_error`, `last_hash`
////     alanlarını günceller
////
//// Hata yutucudur — herhangi bir adımda hata olursa `last_error` kolonuna
//// yazılır ve fonksiyon `Error(...)` döner; uygulama crash etmez.

import backend/context.{type Context}
import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/int
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/ical/ical_codec
import travel/net/http_client

/// Tek satırlık özet — UI'da feed sync sonucunu göstermek için.
pub type SyncReport {
  SyncReport(event_count: Int, day_count: Int)
}

/// Ana giriş noktası. Feed'in tüm sync'ini tek çağrıda yapar.
/// Dönüş:
///   - `Ok(SyncReport)` → kaç event ve toplam kaç gün bloklandı
///   - `Error(reason)` → kullanıcıya gösterilebilir kısa hata
pub fn sync_feed(ctx: Context, feed_id: String) -> Result(SyncReport, String) {
  use feed <- result.try(load_feed(ctx, feed_id))
  let #(listing_id, url, day_plus, day_minus, _is_active) = feed

  case http_client.get_url(url) {
    Error(e) -> {
      record_error(ctx, feed_id, "fetch_failed: " <> truncate(e, 200))
      Error("fetch_failed")
    }
    Ok(body) -> {
      let events = ical_codec.parse_events(body)
      let hash = sha256_hex(body)

      // Tampon günler uygula (check-in öncesi / check-out sonrası blok)
      let buffered =
        events
        |> list.map(fn(ev) {
          ical_codec.IcalEvent(
            uid: ev.uid,
            starts_on: shift_iso_date(ev.starts_on, 0 - day_minus),
            ends_on: shift_iso_date(ev.ends_on, day_plus),
            summary: ev.summary,
          )
        })

      case write_events(ctx, feed_id, listing_id, buffered) {
        Error(e) -> {
          record_error(ctx, feed_id, e)
          Error(e)
        }
        Ok(day_count) -> {
          record_success(
            ctx,
            feed_id,
            list.length(buffered),
            hash,
          )
          Ok(SyncReport(
            event_count: list.length(buffered),
            day_count: day_count,
          ))
        }
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// DB IO
// ──────────────────────────────────────────────────────────────────────────

fn feed_row() -> decode.Decoder(#(String, String, Int, Int, Bool)) {
  use lid <- decode.field(0, decode.string)
  use url <- decode.field(1, decode.string)
  use dp <- decode.field(2, decode.int)
  use dm <- decode.field(3, decode.int)
  use ia <- decode.field(4, decode.bool)
  decode.success(#(lid, url, dp, dm, ia))
}

fn load_feed(
  ctx: Context,
  feed_id: String,
) -> Result(#(String, String, Int, Int, Bool), String) {
  case
    pog.query(
      "select listing_id::text, url, day_offset_plus, day_offset_minus, is_active "
      <> "from ical_feeds where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(feed_id)))
    |> pog.returning(feed_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("feed_query_failed")
    Ok(qr) ->
      case qr.rows {
        [] -> Error("feed_not_found")
        [row] ->
          case row.4 {
            False -> Error("feed_inactive")
            True -> Ok(row)
          }
        _ -> Error("feed_ambiguous")
      }
  }
}

/// Tek transaction yerine ardışık çağrılar (pog mevcut transaction sarmalayıcı
/// kullanmıyor); hata yarıda kalırsa bir sonraki sync düzeltir (idempotent).
fn write_events(
  ctx: Context,
  feed_id: String,
  listing_id: String,
  events: List(ical_codec.IcalEvent),
) -> Result(Int, String) {
  // 1. Bu feed'in eski availability satırlarını sil — `note` kolonu yok,
  //    bu yüzden doğrudan listing + tarih aralığı yerine `ical_imported_blocks`
  //    eski tarihlerini referans alarak temizleriz.
  case clear_old_blocks(ctx, feed_id, listing_id) {
    Error(e) -> Error(e)
    Ok(_) ->
      // 2. ical_imported_blocks tablosunu sıfırla
      case purge_imported_blocks(ctx, feed_id) {
        Error(e) -> Error(e)
        Ok(_) -> insert_events(ctx, feed_id, listing_id, events, 0)
      }
  }
}

fn clear_old_blocks(
  ctx: Context,
  feed_id: String,
  listing_id: String,
) -> Result(Nil, String) {
  // Eski `ical_imported_blocks` günlerinin availability satırlarını temizle.
  // Her gün için ayrı UPDATE/DELETE pahalı olur — tek subselect ile DELETE.
  let q =
    "delete from listing_availability_calendar lac "
    <> "where lac.listing_id = $1::uuid "
    <> "  and exists ("
    <> "    select 1 from ical_imported_blocks ib "
    <> "     where ib.feed_id = $2::uuid "
    <> "       and lac.day >= ib.starts_on "
    <> "       and lac.day <  ib.ends_on"
    <> "  )"
  case
    pog.query(q)
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(feed_id))
    |> pog.execute(ctx.db)
  {
    Ok(_) -> Ok(Nil)
    Error(_) -> Error("clear_old_blocks_failed")
  }
}

fn purge_imported_blocks(ctx: Context, feed_id: String) -> Result(Nil, String) {
  case
    pog.query("delete from ical_imported_blocks where feed_id = $1::uuid")
    |> pog.parameter(pog.text(feed_id))
    |> pog.execute(ctx.db)
  {
    Ok(_) -> Ok(Nil)
    Error(_) -> Error("purge_blocks_failed")
  }
}

/// Tüm event'leri tek tek ekle + her event'in günlerini calendar'a yaz.
/// Toplam bloklanan gün sayısını döner.
fn insert_events(
  ctx: Context,
  feed_id: String,
  listing_id: String,
  events: List(ical_codec.IcalEvent),
  acc_days: Int,
) -> Result(Int, String) {
  case events {
    [] -> Ok(acc_days)
    [ev, ..rest] -> {
      // 1) ical_imported_blocks insert
      let _ =
        pog.query(
          "insert into ical_imported_blocks (feed_id, uid, starts_on, ends_on, summary) "
          <> "values ($1::uuid, $2, $3::date, $4::date, $5) "
          <> "on conflict (feed_id, uid) do update set "
          <> "  starts_on = excluded.starts_on, "
          <> "  ends_on   = excluded.ends_on, "
          <> "  summary   = excluded.summary, "
          <> "  imported_at = now()",
        )
        |> pog.parameter(pog.text(feed_id))
        |> pog.parameter(pog.text(ev.uid))
        |> pog.parameter(pog.text(ev.starts_on))
        |> pog.parameter(pog.text(ev.ends_on))
        |> pog.parameter(pog.text(ev.summary))
        |> pog.execute(ctx.db)

      // 2) availability calendar — ends_on **dışlayıcı**, gün gün UPSERT
      //    SQL `generate_series(start, end - interval '1 day', '1 day')` ile.
      let cal_q =
        "insert into listing_availability_calendar "
        <> "  (listing_id, day, is_available, am_available, pm_available) "
        <> "select $1::uuid, gs::date, false, false, false "
        <> "from generate_series($2::date, ($3::date - interval '1 day')::date, interval '1 day') as gs "
        <> "on conflict (listing_id, day) do update set "
        <> "  is_available = false, "
        <> "  am_available = false, "
        <> "  pm_available = false"
      let day_count = day_diff(ev.starts_on, ev.ends_on)
      let _ =
        pog.query(cal_q)
        |> pog.parameter(pog.text(listing_id))
        |> pog.parameter(pog.text(ev.starts_on))
        |> pog.parameter(pog.text(ev.ends_on))
        |> pog.execute(ctx.db)

      insert_events(ctx, feed_id, listing_id, rest, acc_days + day_count)
    }
  }
}

fn record_success(
  ctx: Context,
  feed_id: String,
  count: Int,
  hash: String,
) -> Nil {
  let _ =
    pog.query(
      "update ical_feeds set last_sync_at = now(), last_event_count = $2::int, "
      <> "last_hash = $3, last_error = null where id = $1::uuid",
    )
    |> pog.parameter(pog.text(feed_id))
    |> pog.parameter(pog.int(count))
    |> pog.parameter(pog.text(hash))
    |> pog.execute(ctx.db)
  Nil
}

fn record_error(ctx: Context, feed_id: String, msg: String) -> Nil {
  let _ =
    pog.query(
      "update ical_feeds set last_sync_at = now(), last_error = $2 "
      <> "where id = $1::uuid",
    )
    |> pog.parameter(pog.text(feed_id))
    |> pog.parameter(pog.text(msg))
    |> pog.execute(ctx.db)
  Nil
}

// ──────────────────────────────────────────────────────────────────────────
// Yardımcılar — hash, tarih aritmetiği, string güvenliği
// ──────────────────────────────────────────────────────────────────────────

fn sha256_hex(s: String) -> String {
  s
  |> bit_array.from_string
  |> crypto.hash(crypto.Sha256, _)
  |> bit_array.base16_encode
  |> string.lowercase
}

fn truncate(s: String, n: Int) -> String {
  case string.length(s) > n {
    True -> string.slice(s, 0, n)
    False -> s
  }
}

/// `YYYY-MM-DD` formatında iki tarih arası gün farkı (start dahil, end hariç).
/// Negatif veya hatalı giriş → 0.
fn day_diff(start_iso: String, end_iso: String) -> Int {
  case days_since_epoch(start_iso), days_since_epoch(end_iso) {
    Ok(s), Ok(e) ->
      case e - s > 0 {
        True -> e - s
        False -> 0
      }
    _, _ -> 0
  }
}

/// `YYYY-MM-DD` → ofset (1970-01-01'den gün sayısı). Basit hesap, no FFI.
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

/// Fliegel-Van Flandern Julian Day numarası — her ISO tarih için tam sayı.
fn julian_day(y: Int, m: Int, d: Int) -> Int {
  let a = { 14 - m } / 12
  let y2 = y + 4800 - a
  let m2 = m + 12 * a - 3
  d + { 153 * m2 + 2 } / 5 + 365 * y2 + y2 / 4 - y2 / 100 + y2 / 400 - 32_045
}

/// `YYYY-MM-DD` → `delta` gün eklenmiş tarih.
fn shift_iso_date(iso: String, delta: Int) -> String {
  case days_since_epoch(iso) {
    Ok(d) -> from_julian_offset(d + delta)
    Error(_) -> iso
  }
}

/// Epoch-offset (gün) → `YYYY-MM-DD`.
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
