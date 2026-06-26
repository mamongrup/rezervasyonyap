//// Partner API — rezervasyon webhook bildirimi (agency_api_settings).

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/json
import gleam/option.{type Option, None, Some}
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/net/http_client

fn settings_row() -> decode.Decoder(#(String, String)) {
  use url <- decode.field(0, decode.string)
  use secret <- decode.field(1, decode.string)
  decode.success(#(url, secret))
}

fn load_webhook(conn: pog.Connection, org_id: String) -> Option(#(String, String)) {
  case
    pog.query(
      "select coalesce(webhook_url, ''), coalesce(webhook_secret, '') "
      <> "from agency_api_settings where organization_id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(org_id))
    |> pog.returning(settings_row())
    |> pog.execute(conn)
  {
    Error(_) -> None
    Ok(ret) ->
      case ret.rows {
        [#(url, secret)] ->
          case string.trim(url) == "" {
            True -> None
            False -> Some(#(string.trim(url), string.trim(secret)))
          }
        _ -> None
      }
  }
}

fn post_event(
  ctx: Context,
  org_id: String,
  event: String,
  reservation_id: String,
  public_code: String,
  listing_id: String,
  status: String,
) -> Nil {
  case load_webhook(ctx.db, org_id) {
    None -> Nil
    Some(#(url, secret)) -> {
      let payload =
        json.object([
          #("event", json.string(event)),
          #("reservation_id", json.string(reservation_id)),
          #("public_code", json.string(public_code)),
          #("listing_id", json.string(listing_id)),
          #("status", json.string(status)),
          #("agency_organization_id", json.string(org_id)),
        ])
      let auth = case secret == "" {
        True -> ""
        False -> string.append("Bearer ", secret)
      }
      let _ = http_client.post_json(url, json.to_string(payload), auth)
      Nil
    }
  }
}

pub fn dispatch_reservation_created(
  ctx: Context,
  org_id: String,
  reservation_id: String,
  public_code: String,
  listing_id: String,
  status: String,
) -> Nil {
  post_event(ctx, org_id, "reservation.created", reservation_id, public_code, listing_id, status)
}

pub fn dispatch_reservation_cancelled(
  ctx: Context,
  org_id: String,
  reservation_id: String,
  public_code: String,
  listing_id: String,
) -> Nil {
  post_event(ctx, org_id, "reservation.cancelled", reservation_id, public_code, listing_id, "cancelled")
}
