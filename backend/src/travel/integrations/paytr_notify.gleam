//// PayTR Bildirim URL (2. adım) — form POST, hash doğrulama, ödeme + rezervasyon onayı.

import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/booking/supplier_notification
import travel/db/decode_helpers as row_dec

fn map_currency(code: String) -> String {
  case string.uppercase(string.trim(code)) {
    "TL" -> "TRY"
    c -> c
  }
}

/// Hash doğrulaması çağıran tarafta yapılmalı. `merchant_oid` = rezervasyon UUID.
pub fn apply_paytr_notification(
  conn: pog.Connection,
  pairs: List(#(String, String)),
  pay_status: String,
  merchant_oid: String,
  total_amount: String,
) -> Result(Nil, String) {
  let raw_json =
    json.object(list.map(pairs, fn(p) { #(p.0, json.string(p.1)) }))
    |> json.to_string
  let currency =
    list.key_find(pairs, "currency")
    |> result.unwrap("TRY")
    |> map_currency
  case
    pog.query(
      "select id::text from payments where reservation_id = $1::uuid and status = 'captured' limit 1",
    )
    |> pog.parameter(pog.text(merchant_oid))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("idempotency_check_failed")
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        [] ->
          case pay_status == "success" {
            True ->
              capture_payment(
                conn,
                merchant_oid,
                total_amount,
                currency,
                raw_json,
              )
            False -> fail_payment(conn, merchant_oid, total_amount, currency, raw_json)
          }
        _ -> Error("unexpected_rows")
      }
  }
}

fn get_paytr_provider_id(conn: pog.Connection) -> Result(Int, String) {
  let row = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case
    pog.query("select id from payment_providers where code = 'paytr' limit 1")
    |> pog.returning(row)
    |> pog.execute(conn)
  {
    Error(_) -> Error("provider_lookup_failed")
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error("paytr_provider_missing")
      }
  }
}

fn capture_payment(
  conn: pog.Connection,
  reservation_id: String,
  total_amount: String,
  currency_code: String,
  raw_json: String,
) -> Result(Nil, String) {
  use provider_id <- result.try(get_paytr_provider_id(conn))
  case
    pog.query(
      "insert into payments (reservation_id, provider_id, provider_ref, amount, currency_code, status, raw_response_json) values ($1::uuid, $2, $3, ($4::bigint)::numeric / 100.0, $5, 'captured', $6::jsonb)",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.int(provider_id))
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.text(total_amount))
    |> pog.parameter(pog.text(currency_code))
    |> pog.parameter(pog.text(raw_json))
    |> pog.execute(conn)
  {
    Error(_) -> Error("payment_insert_failed")
    Ok(_) -> {
      // Rezervasyon 'held' kalır; tedarikçi onayından sonra 'confirmed' (provizyon / escrow kurgusu).
      let _ =
        pog.query(
          "update inventory_holds set status = 'converted' where reservation_id = $1::uuid and status = 'active'",
        )
        |> pog.parameter(pog.text(reservation_id))
        |> pog.execute(conn)
      let payload =
        json.object([
          #("total_amount", json.string(total_amount)),
          #("currency", json.string(currency_code)),
        ])
        |> json.to_string
      case
        pog.query(
          "insert into reservation_events (reservation_id, event_type, payload_json) values ($1::uuid, 'paytr_captured', $2::jsonb)",
        )
        |> pog.parameter(pog.text(reservation_id))
        |> pog.parameter(pog.text(payload))
        |> pog.execute(conn)
      {
        Error(_) -> Error("event_insert_failed")
        Ok(_) -> {
          // Ödeme geldikten sonra ilan sahibine SMS / e-posta / WhatsApp (checkout'ta değil).
          let _ = supplier_notification.notify_new_reservation(conn, reservation_id)
          Ok(Nil)
        }
      }
    }
  }
}

fn fail_payment(
  conn: pog.Connection,
  reservation_id: String,
  total_amount: String,
  currency_code: String,
  raw_json: String,
) -> Result(Nil, String) {
  use provider_id <- result.try(get_paytr_provider_id(conn))
  case
    pog.query(
      "insert into payments (reservation_id, provider_id, provider_ref, amount, currency_code, status, raw_response_json) values ($1::uuid, $2, $3, ($4::bigint)::numeric / 100.0, $5, 'failed', $6::jsonb)",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.int(provider_id))
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.text(total_amount))
    |> pog.parameter(pog.text(currency_code))
    |> pog.parameter(pog.text(raw_json))
    |> pog.execute(conn)
  {
    Ok(_) -> Ok(Nil)
    Error(_) -> Error("failed_payment_insert")
  }
}
