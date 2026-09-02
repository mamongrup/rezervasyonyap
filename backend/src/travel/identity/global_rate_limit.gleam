//// Tüm public API istekleri için IP bazlı rate-limit.
//// Auth rate-limit modülünden ayrı çalışır — daha geniş pencere, daha yüksek eşik.
////
//// Strateji:
////  - Pencere: 60 saniye
////  - Eşik:    120 istek (dakikada)
////  - Blok:    60 saniye
////  - Hot path: tek bir select … upsert

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/http/request
import gleam/result
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import wisp.{type Request}

pub type Decision {
  Allowed
  Blocked(retry_after_seconds: Int)
}

/// Dakikada maksimum istek
const max_requests: Int = 120

/// Pencere (saniye)
const window_seconds: Int = 60

/// Blok süresi (saniye)
const block_seconds: Int = 60

fn key(ip: String) -> String {
  "global:" <> ip
}

/// IP adresini istek başlığından çöz.
pub fn resolve_ip(req: Request) -> String {
  let forwarded =
    request.get_header(req, "x-forwarded-for")
    |> result.unwrap("")
    |> string.trim
  let real_ip =
    request.get_header(req, "x-real-ip")
    |> result.unwrap("")
    |> string.trim
  case forwarded == "" {
    True ->
      case real_ip == "" {
        True -> "unknown"
        False -> real_ip
      }
    False ->
      // İlk IP'yi al (proxy chain'de ilk olan gerçek client)
      case string.split(forwarded, ",") {
        [first, ..] -> string.trim(first)
        [] -> forwarded
      }
  }
}

/// İsteği kontrol et. Bloklu ise `Blocked(...)` döner.
pub fn check(ctx: Context, ip: String) -> Decision {
  let k = key(ip)
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
    |> db_exec.execute(ctx.db)
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

/// İsteği say. Eşik aşılırsa blokla.
pub fn record(ctx: Context, ip: String) -> Nil {
  let k = key(ip)
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
    |> pog.parameter(pog.int(max_requests))
    |> pog.parameter(pog.int(block_seconds))
    |> pog.execute(ctx.db)
  Nil
}
