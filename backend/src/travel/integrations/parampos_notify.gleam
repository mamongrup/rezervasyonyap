//// ParamPOS doğrulanmış TP_WMD_Pay sonucu — idempotent ödeme ve rezervasyon tamamlama.

import gleam/dynamic/decode
import gleam/json
import gleam/result
import pog
import travel/ai/commerce_ops_enqueue
import travel/booking/supplier_notification
import travel/db/decode_helpers as row_dec
import travel/integrations/booking_fulfillment

fn provider_id(conn: pog.Connection) -> Result(Int, String) {
  let row = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case
    pog.query(
      "select id from payment_providers where code = 'parampos' limit 1",
    )
    |> pog.returning(row)
    |> pog.execute(conn)
  {
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error("parampos_provider_missing")
      }
    Error(_) -> Error("provider_lookup_failed")
  }
}

pub fn capture(
  conn: pog.Connection,
  reservation_id: String,
  receipt_id: String,
  amount: String,
  currency: String,
  bank_code: Int,
  message: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "select id::text from payments where reservation_id = $1::uuid and status = 'captured' limit 1",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("idempotency_check_failed")
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        [] -> {
          use pid <- result.try(provider_id(conn))
          let raw =
            json.object([
              #("receipt_id", json.string(receipt_id)),
              #("bank_result_code", json.int(bank_code)),
              #("message", json.string(message)),
            ])
            |> json.to_string
          case
            pog.query(
              "insert into payments (reservation_id, provider_id, provider_ref, amount, currency_code, installments, status, raw_response_json) values ($1::uuid,$2,$3,$4::numeric,$5,1,'captured',$6::jsonb)",
            )
            |> pog.parameter(pog.text(reservation_id))
            |> pog.parameter(pog.int(pid))
            |> pog.parameter(pog.text(receipt_id))
            |> pog.parameter(pog.text(amount))
            |> pog.parameter(pog.text(currency))
            |> pog.parameter(pog.text(raw))
            |> pog.execute(conn)
          {
            Error(_) -> Error("payment_insert_failed")
            Ok(_) -> {
              let _ =
                pog.query(
                  "update inventory_holds set status='converted' where reservation_id=$1::uuid and status='active'",
                )
                |> pog.parameter(pog.text(reservation_id))
                |> pog.execute(conn)
              let _ =
                pog.query(
                  "insert into reservation_events (reservation_id,event_type,payload_json) values ($1::uuid,'parampos_captured',$2::jsonb)",
                )
                |> pog.parameter(pog.text(reservation_id))
                |> pog.parameter(pog.text(raw))
                |> pog.execute(conn)
              booking_fulfillment.fulfill_after_payment(conn, reservation_id)
              let _ =
                supplier_notification.notify_new_reservation(
                  conn,
                  reservation_id,
                )
              let _ =
                supplier_notification.notify_platform_ops(conn, reservation_id)
              let _ =
                commerce_ops_enqueue.enqueue_commerce_ops_jobs(
                  conn,
                  reservation_id,
                  "payment_confirmed",
                )
              Ok(Nil)
            }
          }
        }
        _ -> Error("unexpected_rows")
      }
  }
}
