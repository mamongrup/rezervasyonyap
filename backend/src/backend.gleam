import gleam/erlang/process
import gleam/int
import gleam/io
import mist
import wisp
import wisp/wisp_mist

import backend/config
import backend/router
import travel/currency/currency_rates_runtime

pub fn main() {
  wisp.configure_logger()

  let cfg = config.load()

  let ctx = case router.create_context(cfg) {
    Ok(c) -> c
    Error(msg) -> panic as { "Travel backend: " <> msg }
  }

  // TCMB döviz kurlarını başlangıçta ve 24 saatte bir otomatik yenile
  currency_rates_runtime.start(ctx.db)

  let handle = fn(request: wisp.Request) {
    router.handle_request(request, ctx)
  }

  case
    handle
    |> wisp_mist.handler(cfg.secret_key_base)
    |> mist.new
    |> mist.port(cfg.port)
    |> mist.start
  {
    Ok(_) -> {
      io.println("Travel API listening on http://127.0.0.1:" <> int.to_string(cfg.port))
      process.sleep_forever()
    }
    Error(_) -> panic as "Could not start HTTP server (port in use?)"
  }
}
