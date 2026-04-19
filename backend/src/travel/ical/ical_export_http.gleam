//// iCal export HTTP katmanı:
////  - GET  /api/v1/catalog/listings/:lid/ical-export-token
////      → token yoksa otomatik üretir; var olanı döner
////  - POST /api/v1/catalog/listings/:lid/ical-export-token
////      → mevcut token'ı geçersizleştirir, yeni token üretir
////  - GET  /ical/listing/:token.ics
////      → public .ics yanıtı (Content-Type: text/calendar)
////
//// Token: 32 byte random (base16 hex, 64 karakter). `listings.ical_export_token`
//// kolonunda **unique partial index** ile saklanır → token tek bir listing'e
//// işaret eder; çakışma olasılığı pratik olarak sıfır.

import backend/context.{type Context}
import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/http
import gleam/http/response
import gleam/json
import gleam/string
import pog
import travel/ical/ical_export
import wisp.{type Request, type Response}

const prodid_prefix: String = "-//Travel//Listing "

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn token_row() -> decode.Decoder(String) {
  use t <- decode.field(0, decode.string)
  decode.success(t)
}

fn fresh_token() -> String {
  crypto.strong_random_bytes(32)
  |> bit_array.base16_encode
  |> string.lowercase
}

/// `SITE_URL` env'inden iCal public base'i türetir.
/// Default: `https://rezervasyonyap.com.tr` (api host'u değil — site host'u).
fn site_url() -> String {
  case env_get("SITE_URL") {
    "" -> "https://rezervasyonyap.com.tr"
    v -> trim_trailing_slash(v)
  }
}

fn trim_trailing_slash(s: String) -> String {
  case string.ends_with(s, "/") {
    True -> string.drop_end(s, 1)
    False -> s
  }
}

@external(erlang, "os", "getenv")
fn os_getenv(name: String) -> Result(String, Nil)

fn env_get(name: String) -> String {
  case os_getenv(name) {
    Ok(v) -> v
    Error(_) -> ""
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Token GET / POST
// ──────────────────────────────────────────────────────────────────────────

fn token_response(token: String) -> Response {
  let url = site_url() <> "/ical/listing/" <> token <> ".ics"
  let body =
    json.object([
      #("token", json.string(token)),
      #("url", json.string(url)),
    ])
    |> json.to_string
  wisp.json_response(body, 200)
}

/// GET /api/v1/catalog/listings/:lid/ical-export-token
/// Token yoksa üretir. Idempotent: aynı listing → aynı token.
pub fn get_or_create_token(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case load_token(ctx, listing_id) {
    Error(e) -> json_err(500, e)
    Ok(option_token) ->
      case option_token {
        Some(t) -> token_response(t)
        None ->
          case create_token(ctx, listing_id) {
            Error(e) -> json_err(500, e)
            Ok(t) -> token_response(t)
          }
      }
  }
}

/// POST /api/v1/catalog/listings/:lid/ical-export-token
/// Mevcut token'ı yenisiyle değiştirir → eski URL anında geçersizleşir.
pub fn rotate_token(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case create_token(ctx, listing_id) {
    Error(e) -> json_err(500, e)
    Ok(t) -> token_response(t)
  }
}

type Maybe {
  Some(value: String)
  None
}

fn load_token(ctx: Context, listing_id: String) -> Result(Maybe, String) {
  case
    pog.query(
      "select coalesce(ical_export_token, '') from listings "
      <> "where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(listing_id)))
    |> pog.returning(token_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("listing_query_failed")
    Ok(qr) ->
      case qr.rows {
        [] -> Error("listing_not_found")
        [""] -> Ok(None)
        [t] -> Ok(Some(t))
        _ -> Error("listing_ambiguous")
      }
  }
}

fn create_token(ctx: Context, listing_id: String) -> Result(String, String) {
  // 5 deneme: çakışma pratik olarak 2^256'da bir, ama yine de döngü.
  do_create_token(ctx, listing_id, 5)
}

fn do_create_token(
  ctx: Context,
  listing_id: String,
  attempts_left: Int,
) -> Result(String, String) {
  case attempts_left <= 0 {
    True -> Error("token_collision_unrecoverable")
    False -> {
      let token = fresh_token()
      case
        pog.query(
          "update listings set ical_export_token = $2 "
          <> "where id = $1::uuid returning ical_export_token",
        )
        |> pog.parameter(pog.text(string.trim(listing_id)))
        |> pog.parameter(pog.text(token))
        |> pog.returning(token_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> do_create_token(ctx, listing_id, attempts_left - 1)
        Ok(qr) ->
          case qr.rows {
            [t] -> Ok(t)
            _ -> Error("listing_not_found")
          }
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Public .ics endpoint
// ──────────────────────────────────────────────────────────────────────────

/// GET /ical/listing/:slug
/// `:slug` formatı: `<token>.ics`. Token bulunmazsa 404.
pub fn serve_public_ics(req: Request, ctx: Context, slug: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let token = case string.ends_with(slug, ".ics") {
    True -> string.drop_end(slug, 4)
    False -> slug
  }
  case lookup_listing_by_token(ctx, token) {
    Error(_) -> wisp.not_found()
    Ok(listing_id) -> {
      let prodid = prodid_prefix <> listing_id <> "//EN"
      let body = ical_export.build_listing_calendar(ctx, listing_id, prodid)
      wisp.response(200)
      |> wisp.string_body(body)
      |> response.set_header("content-type", "text/calendar; charset=utf-8")
      |> response.set_header(
        "content-disposition",
        "inline; filename=\"listing-" <> listing_id <> ".ics\"",
      )
      |> response.set_header("cache-control", "public, max-age=900")
    }
  }
}

fn lookup_listing_by_token(ctx: Context, token: String) -> Result(String, Nil) {
  let clean = string.trim(token) |> string.lowercase
  case clean == "" {
    True -> Error(Nil)
    False ->
      case
        pog.query(
          "select id::text from listings where ical_export_token = $1 limit 1",
        )
        |> pog.parameter(pog.text(clean))
        |> pog.returning(token_row())
        |> pog.execute(ctx.db)
      {
        Ok(qr) ->
          case qr.rows {
            [id] -> Ok(id)
            _ -> Error(Nil)
          }
        Error(_) -> Error(Nil)
      }
  }
}
