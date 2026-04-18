//// Paratika RETURNURL — form POST, sdSha512 doğrulama, ödeme + rezervasyon.

import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/booking/supplier_notification
import travel/db/decode_helpers as row_dec
import travel/integrations/paratika.{build_sd_sha512}

fn key_find_ci(pairs: List(#(String, String)), want: String) -> String {
  let w = string.lowercase(want)
  case list.find(pairs, fn(p) { string.lowercase(p.0) == w }) {
    Ok(#(_, v)) -> v
    Error(_) -> ""
  }
}

fn map_currency(code: String) -> String {
  case string.uppercase(string.trim(code)) {
    "TL" -> "TRY"
    c -> c
  }
}

pub fn apply_paratika_notification(
  conn: pog.Connection,
  pairs: List(#(String, String)),
  sd_secret: String,
) -> Result(Nil, String) {
  let merchant_payment_id = key_find_ci(pairs, "merchantPaymentId")
  let customer_id = key_find_ci(pairs, "customerId")
  let session_token = key_find_ci(pairs, "sessionToken")
  let response_code = key_find_ci(pairs, "responseCode")
  let random = key_find_ci(pairs, "random")
  let recv_sd = key_find_ci(pairs, "sdSha512")
  case string.trim(merchant_payment_id) == "" {
    True -> Error("missing_merchant_payment_id")
    False ->
      case
        pog.query(
          "select id::text from payments where reservation_id = $1::uuid and status = 'captured' limit 1",
        )
        |> pog.parameter(pog.text(merchant_payment_id))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(conn)
      {
        Error(_) -> Error("idempotency_check_failed")
        Ok(ret) ->
          case ret.rows {
            [_] -> Ok(Nil)
            [] -> {
              case string.trim(recv_sd) == "" {
                True -> Error("missing_sd_sha512")
                False -> {
                  let computed =
                    build_sd_sha512(
                      merchant_payment_id,
                      customer_id,
                      session_token,
                      response_code,
                      random,
                      sd_secret,
                    )
                  let hash_ok =
                    string.lowercase(string.trim(recv_sd))
                    == string.lowercase(string.trim(computed))
                  case hash_ok {
                    False -> Error("bad_sd_sha512")
                    True ->
                      case response_code == "00" {
                        True -> {
                          let amount = key_find_ci(pairs, "amount")
                          let currency =
                            key_find_ci(pairs, "currency")
                            |> map_currency
                          let cur = case currency == "" {
                            True -> "TRY"
                            False -> currency
                          }
                          let raw_json =
                            json.object(
                              list.map(pairs, fn(p) {
                                #(p.0, json.string(p.1))
                              }),
                            )
                            |> json.to_string
                          capture_paratika(
                            conn,
                            merchant_payment_id,
                            amount,
                            cur,
                            raw_json,
                          )
                        }
                        False ->
                          fail_paratika(conn, merchant_payment_id, pairs)
                      }
                  }
                }
              }
            }
            _ -> Error("unexpected_rows")
          }
      }
  }
}

fn get_paratika_provider_id(conn: pog.Connection) -> Result(Int, String) {
  let row = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case
    pog.query("select id from payment_providers where code = 'paratika' limit 1")
    |> pog.returning(row)
    |> pog.execute(conn)
  {
    Error(_) -> Error("provider_lookup_failed")
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error("paratika_provider_missing")
      }
  }
}

fn capture_paratika(
  conn: pog.Connection,
  reservation_id: String,
  amount_str: String,
  currency_code: String,
  raw_json: String,
) -> Result(Nil, String) {
  use provider_id <- result.try(get_paratika_provider_id(conn))
  let amount_trim = string.trim(amount_str)
  case amount_trim == "" {
    True -> Error("missing_amount")
    False ->
      case
        pog.query(
          "insert into payments (reservation_id, provider_id, provider_ref, amount, currency_code, status, raw_response_json) values ($1::uuid, $2, $3, $4::numeric, $5, 'captured', $6::jsonb)",
        )
        |> pog.parameter(pog.text(reservation_id))
        |> pog.parameter(pog.int(provider_id))
        |> pog.parameter(pog.text(reservation_id))
        |> pog.parameter(pog.text(amount_trim))
        |> pog.parameter(pog.text(currency_code))
        |> pog.parameter(pog.text(raw_json))
        |> pog.execute(conn)
      {
        Error(_) -> Error("payment_insert_failed")
        Ok(_) -> {
          let _ =
            pog.query(
              "update inventory_holds set status = 'converted' where reservation_id = $1::uuid and status = 'active'",
            )
            |> pog.parameter(pog.text(reservation_id))
            |> pog.execute(conn)
          let payload =
            json.object([
              #("amount", json.string(amount_trim)),
              #("currency", json.string(currency_code)),
            ])
            |> json.to_string
          case
            pog.query(
              "insert into reservation_events (reservation_id, event_type, payload_json) values ($1::uuid, 'paratika_captured', $2::jsonb)",
            )
            |> pog.parameter(pog.text(reservation_id))
            |> pog.parameter(pog.text(payload))
            |> pog.execute(conn)
          {
            Error(_) -> Error("event_insert_failed")
            Ok(_) -> {
              let _ = supplier_notification.notify_new_reservation(conn, reservation_id)
              Ok(Nil)
            }
          }
        }
      }
  }
}

fn fail_paratika(
  conn: pog.Connection,
  reservation_id: String,
  pairs: List(#(String, String)),
) -> Result(Nil, String) {
  use provider_id <- result.try(get_paratika_provider_id(conn))
  let amount = key_find_ci(pairs, "amount")
  let currency = key_find_ci(pairs, "currency") |> map_currency
  let cur = case currency == "" {
    True -> "TRY"
    False -> currency
  }
  let raw_json =
    json.object(list.map(pairs, fn(p) { #(p.0, json.string(p.1)) }))
    |> json.to_string
  let amt = case string.trim(amount) == "" {
    True -> "0"
    False -> amount
  }
  case
    pog.query(
      "insert into payments (reservation_id, provider_id, provider_ref, amount, currency_code, status, raw_response_json) values ($1::uuid, $2, $3, $4::numeric, $5, 'failed', $6::jsonb)",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.int(provider_id))
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.text(amt))
    |> pog.parameter(pog.text(cur))
    |> pog.parameter(pog.text(raw_json))
    |> pog.execute(conn)
  {
    Ok(_) -> Ok(Nil)
    Error(_) -> Error("failed_payment_insert")
  }
}
