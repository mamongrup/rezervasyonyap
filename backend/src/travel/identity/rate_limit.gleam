//// Auth uçları için Postgres tabanlı rate-limit.
////
//// Sözleşme:
////  - `check(ctx, action, key)` → `Allowed` veya `Blocked(retry_after_seconds)`
////  - `record_failure(ctx, action, key)` → başarısız denemeyi sayar; eşik
////    aşılırsa kayıdı `blocked_until` ile işaretler
////  - `record_success(ctx, action, key)` → kovayı sıfırlar
////
//// Anahtar formatı: `<action>:<rest>` (rest genelde `<ip>|<email>`).
//// Tablo `auth_rate_limit` (migration 248) — `key text primary key`.
////
//// Strateji:
////  - Pencere: 15 dakika (`window_seconds`)
////  - Eşik:    `max_failures` başarısız denemeden sonra blok
////  - Blok:    `block_seconds` boyunca tüm istekler reddedilir
////  - Hot path tek bir `select … upsert` ile çalışır; eski kayıt aktif
////    sayım dışıdır (`updated_at < now() - 15 min` → sıfırdan başla).

import backend/context.{type Context}
import gleam/dynamic/decode
import pog

pub type Decision {
  Allowed
  Blocked(retry_after_seconds: Int)
}

const window_seconds: Int = 900

const max_failures: Int = 5

const block_seconds: Int = 900

fn key(action: String, raw: String) -> String {
  action <> ":" <> raw
}

/// İsteği işleme almadan önce çağrılır. Bloklu ise `Blocked(...)` döner.
pub fn check(ctx: Context, action: String, raw: String) -> Decision {
  let k = key(action, raw)
  let q =
    "select coalesce(extract(epoch from (blocked_until - now()))::int, 0) "
    <> "from auth_rate_limit "
    <> "where key = $1 and blocked_until is not null and blocked_until > now() "
    <> "limit 1"
  let row_int = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case
    pog.query(q)
    |> pog.parameter(pog.text(k))
    |> pog.returning(row_int)
    |> pog.execute(ctx.db)
  {
    Ok(qr) ->
      case qr.rows {
        [] -> Allowed
        [seconds] ->
          case seconds > 0 {
            True -> Blocked(seconds)
            False -> Allowed
          }
        _ -> Allowed
      }
    Error(_) -> Allowed
  }
}

/// Başarısız denemeyi kaydet. Pencere içindeki sayaç `max_failures` ya
/// da daha fazla olursa `blocked_until` set edilir.
pub fn record_failure(ctx: Context, action: String, raw: String) -> Nil {
  let k = key(action, raw)
  let q =
    "insert into auth_rate_limit (key, failures, updated_at) "
    <> "values ($1, 1, now()) "
    <> "on conflict (key) do update set "
    <> "  failures = case "
    <> "    when auth_rate_limit.updated_at < now() - ($2::int * interval '1 second') then 1 "
    <> "    else auth_rate_limit.failures + 1 "
    <> "  end, "
    <> "  blocked_until = case "
    <> "    when (case "
    <> "            when auth_rate_limit.updated_at < now() - ($2::int * interval '1 second') then 1 "
    <> "            else auth_rate_limit.failures + 1 "
    <> "          end) >= $3 "
    <> "    then now() + ($4::int * interval '1 second') "
    <> "    else auth_rate_limit.blocked_until "
    <> "  end, "
    <> "  updated_at = now()"
  let _ =
    pog.query(q)
    |> pog.parameter(pog.text(k))
    |> pog.parameter(pog.int(window_seconds))
    |> pog.parameter(pog.int(max_failures))
    |> pog.parameter(pog.int(block_seconds))
    |> pog.execute(ctx.db)
  Nil
}

/// Başarılı işlem — kovayı sıfırla (tek isabette yeniden saymaya başlamamak için).
pub fn record_success(ctx: Context, action: String, raw: String) -> Nil {
  let k = key(action, raw)
  let _ =
    pog.query("delete from auth_rate_limit where key = $1")
    |> pog.parameter(pog.text(k))
    |> pog.execute(ctx.db)
  Nil
}

/// Bloklu olup olmadığı zaten `check`/`Allowed-Blocked` ile döner; bu yardımcı
/// `Blocked` durumundaki saniyeyi hızlıca okumaya yarar.
pub fn retry_after(decision: Decision) -> Int {
  case decision {
    Allowed -> 0
    Blocked(s) -> s
  }
}

