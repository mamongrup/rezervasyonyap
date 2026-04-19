//// Faz B: Listing detayında sosyal kanıt.
////
//// Endpoint'ler:
////   POST /api/v1/public/listings/:id/view-ping  body: { session_key: string }
////     - listing_view_pings'e UPSERT eder.
////   GET  /api/v1/public/listings/:id/social-proof
////     - viewers_now: son 5 dk distinct session_key
////     - last_booked_minutes_ago: son 24 saatteki en yeni rezervasyona dakika
////     - recent_bookings_24h: son 24 saatteki rezervasyon adedi

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/int
import gleam/json
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn ping_decoder() -> decode.Decoder(String) {
  decode.field("session_key", decode.string, fn(s) {
    decode.success(string.trim(s))
  })
}

pub fn view_ping(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, ping_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(sk) ->
          case sk == "" {
            True -> json_err(400, "session_key_required")
            False ->
              case
                pog.query(
                  "insert into listing_view_pings (listing_id, session_key, pinged_at) values ($1::uuid, $2, now()) on conflict (listing_id, session_key) do update set pinged_at = now()",
                )
                |> pog.parameter(pog.text(listing_id))
                |> pog.parameter(pog.text(sk))
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "ping_failed")
                Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
  }
}

pub fn social_proof(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  // Viewers (son 5 dk distinct session_key)
  let viewers = case
    pog.query(
      "select count(distinct session_key)::text from listing_view_pings where listing_id = $1::uuid and pinged_at > now() - interval '5 minutes'",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Ok(r) ->
      case r.rows {
        [s] -> {
          case int.parse(s) {
            Ok(n) -> n
            Error(_) -> 0
          }
        }
        _ -> 0
      }
    Error(_) -> 0
  }

  // Son rezervasyon kaç dakika önce (NULL → boş döneriz)
  let last_min = case
    pog.query(
      "select coalesce(extract(epoch from (now() - max(created_at)))::bigint::text, '') from reservations where listing_id = $1::uuid and created_at > now() - interval '24 hours'",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Ok(r) ->
      case r.rows {
        [s] ->
          case string.trim(s) == "" {
            True -> -1
            False ->
              case int.parse(s) {
                Ok(seconds) -> seconds / 60
                Error(_) -> -1
              }
          }
        _ -> -1
      }
    Error(_) -> -1
  }

  let bookings_24h = case
    pog.query(
      "select count(*)::text from reservations where listing_id = $1::uuid and created_at > now() - interval '24 hours'",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Ok(r) ->
      case r.rows {
        [s] ->
          case int.parse(s) {
            Ok(n) -> n
            Error(_) -> 0
          }
        _ -> 0
      }
    Error(_) -> 0
  }

  let last_min_field = case last_min < 0 {
    True -> json.null()
    False -> json.int(last_min)
  }
  let body =
    json.object([
      #("viewers_now", json.int(viewers)),
      #("last_booked_minutes_ago", last_min_field),
      #("recent_bookings_24h", json.int(bookings_24h)),
    ])
    |> json.to_string
  wisp.json_response(body, 200)
}
