//// TCMB kur yenileme — başlangıçta ve her 24 saatte bir otomatik çalışır.

import gleam/erlang/process
import gleam/int
import gleam/io
import pog
import travel/currency/currency_http
import travel/currency/tcmb
import travel/net/http_client

/// 24 saat (ms)
const refresh_interval_ms: Int = 86_400_000

/// Erlang FFI — bağımsız (unlinked) process başlatır.
@external(erlang, "backend_ffi_http", "spawn_unlinked")
fn spawn_unlinked(f: fn() -> Nil) -> Nil

/// Arka plan kur yenileme döngüsünü başlatır.
pub fn start(db: pog.Connection) -> Nil {
  spawn_unlinked(fn() { loop(db) })
}

fn loop(db: pog.Connection) -> Nil {
  fetch_and_store(db)
  process.sleep(refresh_interval_ms)
  loop(db)
}

fn fetch_and_store(db: pog.Connection) -> Nil {
  case http_client.get_url(tcmb.tcmb_today_xml_url) {
    Error(e) -> io.println("[tcmb] fetch hatası: " <> e)
    Ok(body) -> {
      let parsed = tcmb.parse_today_xml(body)
      case currency_http.do_insert_tcmb_rates(db, parsed) {
        Ok(n) -> io.println("[tcmb] " <> int.to_string(n) <> " kur güncellendi")
        Error(e) -> io.println("[tcmb] DB hatası: " <> e)
      }
    }
  }
}
