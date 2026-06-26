//// Yolcu360 araç — ödeme sonrası POST /order + limit ödeme.

import gleam/dynamic/decode
import gleam/json
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/integrations/yolcu360
import travel/integrations/yolcu360_config

fn meta_provider_is_yolcu360(meta: String) -> Bool {
  let dec = {
    use v <- decode.field("provider", decode.string)
    decode.success(v)
  }
  case json.parse(meta, dec) {
    Ok(p) -> string.lowercase(string.trim(p)) == "yolcu360"
    Error(_) -> False
  }
}

fn yolcu360_booking_done(meta: String) -> Bool {
  case json.parse(meta, decode.at(["yolcu360_booking", "status"], decode.string)) {
    Ok(s) -> string.lowercase(string.trim(s)) == "completed"
    Error(_) -> False
  }
}

fn checkout_meta_from_breakdown(breakdown_raw: String) -> String {
  let dec = {
    use v <- decode.field("checkout_meta", decode.string)
    decode.success(v)
  }
  case json.parse(breakdown_raw, dec) {
    Ok(s) -> s
    Error(_) -> "{}"
  }
}

fn guest_row_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("first_name", decode.string, fn(first) {
    decode.field("last_name", decode.string, fn(last) {
      decode.optional_field("national_id", "", decode.string, fn(tc) {
        decode.success(#(first, last, tc))
      })
    })
  })
}

fn primary_guest(checkout_meta: String) -> #(String, String, String) {
  let guests_dec = {
    use rows <- decode.field("guests", decode.list(guest_row_decoder()))
    decode.success(rows)
  }
  case json.parse(checkout_meta, guests_dec) {
    Error(_) -> #("", "", "")
    Ok([]) -> #("", "", "")
    Ok([row, ..]) -> row
  }
}

fn invoice_email(checkout_meta: String) -> String {
  case json.parse(checkout_meta, decode.at(["invoice", "email"], decode.string)) {
    Ok(s) -> string.trim(s)
    Error(_) -> ""
  }
}

fn invoice_phone(checkout_meta: String) -> String {
  case json.parse(checkout_meta, decode.at(["invoice", "phone"], decode.string)) {
    Ok(s) -> string.trim(s)
    Error(_) -> ""
  }
}

fn car_search_id(meta: String) -> String {
  case json.parse(meta, decode.at(["car", "yolcu360SearchId"], decode.string)) {
    Ok(s) -> string.trim(s)
    Error(_) -> ""
  }
}

fn car_product_code(meta: String) -> String {
  case json.parse(meta, decode.at(["car", "yolcu360ProductCode"], decode.string)) {
    Ok(s) -> string.trim(s)
    Error(_) -> ""
  }
}

fn normalize_phone_e164(raw: String) -> String {
  let t = string.trim(raw)
  case t {
    "" -> "+905000000000"
    other ->
      case string.starts_with(other, "+") {
        True -> other
        False ->
          case string.starts_with(other, "0") {
            True -> "+90" <> string.drop_start(other, 1)
            False -> "+90" <> other
          }
      }
  }
}

fn build_order_body(
  search_id: String,
  product_code: String,
  tracking_id: String,
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  national_id: String,
) -> String {
  let id_part = case string.trim(national_id) {
    "" -> []
    id -> [#("identityNumber", json.string(id))]
  }
  json.object([
    #("paymentType", json.string("limit")),
    #("searchID", json.string(search_id)),
    #("code", json.string(product_code)),
    #("isFullCredit", json.bool(True)),
    #("isLimitedCredit", json.bool(False)),
    #("trackingID", json.string(tracking_id)),
    #(
      "passenger",
      json.object([
        #("firstName", json.string(first_name)),
        #("lastName", json.string(last_name)),
        #("email", json.string(email)),
        #("nationality", json.string("TR")),
        #("phone", json.string(phone)),
        #("birthDate", json.string("1990-01-01")),
        ..id_part
      ]),
    ),
  ])
  |> json.to_string
}

fn vendor_reservation_id(raw: String) -> String {
  case
    json.parse(
      raw,
      decode.at(["orderedCarProduct", "vendorReservationID"], decode.string),
    )
  {
    Ok(s) -> string.trim(s)
    Error(_) -> ""
  }
}

fn car_product_status(raw: String) -> String {
  case
    json.parse(raw, decode.at(["orderedCarProduct", "status"], decode.string))
  {
    Ok(s) -> string.lowercase(string.trim(s))
    Error(_) -> ""
  }
}

fn yolcu360_booking_patch(
  status: String,
  order_id: String,
  vendor_ref: String,
  order_raw: String,
  payment_raw: String,
  err: String,
) -> String {
  json.object([
    #(
      "yolcu360_booking",
      json.object([
        #("status", json.string(status)),
        #("order_id", json.string(order_id)),
        #("vendor_reservation_id", json.string(vendor_ref)),
        #("order_raw", json.string(order_raw)),
        #("payment_raw", json.string(payment_raw)),
        #("error", json.string(err)),
      ]),
    ),
  ])
  |> json.to_string
}

fn persist_patch(conn: pog.Connection, line_item_id: String, patch_json: String) -> Nil {
  let _ =
    pog.query(
      "update reservation_line_items set meta_json = coalesce(meta_json, '{}'::jsonb) || $2::jsonb where id = $1::uuid",
    )
    |> pog.parameter(pog.text(line_item_id))
    |> pog.parameter(pog.text(patch_json))
    |> pog.execute(conn)
  Nil
}

fn mark_confirmed(conn: pog.Connection, reservation_id: String) -> Nil {
  let _ =
    pog.query(
      "update reservations set status = 'confirmed', payment_status = 'supplier_notified', supplier_confirmed_at = now() where id = $1::uuid",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.execute(conn)
  Nil
}

fn insert_event(
  conn: pog.Connection,
  reservation_id: String,
  event_type: String,
  payload: String,
) -> Nil {
  let _ =
    pog.query(
      "insert into reservation_events (reservation_id, event_type, payload_json) values ($1::uuid, $2, $3::jsonb)",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.text(event_type))
    |> pog.parameter(pog.text(payload))
    |> pog.execute(conn)
  Nil
}

/// Paratika/PayTR ödeme sonrası Yolcu360 sipariş + limit ödeme.
pub fn fulfill_after_payment(
  conn: pog.Connection,
  reservation_id: String,
) -> Nil {
  let cfg = yolcu360_config.load(conn)
  case yolcu360_config.credentials_ready(cfg) {
    False -> Nil
    True ->
      case
        pog.query(
          "select rli.id::text, rli.meta_json::text, r.price_breakdown_json::text, "
            <> "coalesce(r.public_code, ''), coalesce(r.guest_email, ''), coalesce(r.guest_phone, '') "
            <> "from reservation_line_items rli "
            <> "inner join reservations r on r.id = rli.reservation_id "
            <> "where rli.reservation_id = $1::uuid "
            <> "order by rli.line_no limit 1",
        )
        |> pog.parameter(pog.text(reservation_id))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          use b <- decode.field(1, decode.string)
          use c <- decode.field(2, decode.string)
          use d <- decode.field(3, decode.string)
          use e <- decode.field(4, decode.string)
          use f <- decode.field(5, decode.string)
          decode.success(#(a, b, c, d, e, f))
        })
        |> pog.execute(conn)
      {
        Error(_) -> Nil
        Ok(ret) ->
          case ret.rows {
            [] -> Nil
            [#(line_id, meta, breakdown, public_code, guest_email, guest_phone)] -> {
              case yolcu360_booking_done(meta) || !meta_provider_is_yolcu360(meta) {
                True -> Nil
                False -> {
                  let search_id = car_search_id(meta)
                  let product_code = car_product_code(meta)
                  case search_id == "" || product_code == "" {
                    True -> {
                      persist_patch(
                        conn,
                        line_id,
                        yolcu360_booking_patch(
                          "failed",
                          "",
                          "",
                          "",
                          "",
                          "yolcu360_search_or_code_missing",
                        ),
                      )
                      insert_event(
                        conn,
                        reservation_id,
                        "yolcu360_booking_failed",
                        json.object([
                          #("error", json.string("yolcu360_search_or_code_missing")),
                        ])
                        |> json.to_string,
                      )
                      Nil
                    }
                    False -> {
                      let checkout_meta = checkout_meta_from_breakdown(breakdown)
                      let #(first, last, tc) = primary_guest(checkout_meta)
                      let email = case invoice_email(checkout_meta) {
                        "" -> guest_email
                        e -> e
                      }
                      let phone = normalize_phone_e164(case invoice_phone(checkout_meta) {
                        "" -> guest_phone
                        p -> p
                      })
                      let order_body =
                        build_order_body(
                          search_id,
                          product_code,
                          public_code,
                          first,
                          last,
                          email,
                          phone,
                          tc,
                        )
                      case yolcu360.create_order(cfg, order_body) {
                        Error(e) -> {
                          persist_patch(
                            conn,
                            line_id,
                            yolcu360_booking_patch(
                              "failed",
                              "",
                              "",
                              "",
                              "",
                              e,
                            ),
                          )
                          insert_event(
                            conn,
                            reservation_id,
                            "yolcu360_booking_failed",
                            json.object([#("error", json.string(e))]) |> json.to_string,
                          )
                          Nil
                        }
                        Ok(order_res) -> {
                          case
                            yolcu360.pay_order_with_limit(cfg, order_res.order_id)
                          {
                            Error(e) -> {
                              persist_patch(
                                conn,
                                line_id,
                                yolcu360_booking_patch(
                                  "failed",
                                  order_res.order_id,
                                  "",
                                  order_res.raw_response,
                                  "",
                                  e,
                                ),
                              )
                              insert_event(
                                conn,
                                reservation_id,
                                "yolcu360_booking_failed",
                                json.object([
                                  #("order_id", json.string(order_res.order_id)),
                                  #("error", json.string(e)),
                                ])
                                |> json.to_string,
                              )
                              Nil
                            }
                            Ok(pay_res) -> {
                              let detail_raw =
                                case yolcu360.get_order(cfg, order_res.order_id) {
                                  Ok(raw) -> raw
                                  Error(_) -> order_res.raw_response
                                }
                              let vendor_ref = vendor_reservation_id(detail_raw)
                              let product_status = car_product_status(detail_raw)
                              let completed =
                                product_status == "reserved"
                                || vendor_ref != ""
                                || pay_res.status == "success"
                              let status = case completed {
                                True -> "completed"
                                False -> "pending"
                              }
                              persist_patch(
                                conn,
                                line_id,
                                yolcu360_booking_patch(
                                  status,
                                  order_res.order_id,
                                  vendor_ref,
                                  detail_raw,
                                  pay_res.raw_response,
                                  "",
                                ),
                              )
                              case completed {
                                True -> mark_confirmed(conn, reservation_id)
                                False -> Nil
                              }
                              insert_event(
                                conn,
                                reservation_id,
                                case completed {
                                  True -> "yolcu360_booking_completed"
                                  False -> "yolcu360_booking_pending"
                                },
                                json.object([
                                  #("order_id", json.string(order_res.order_id)),
                                  #("vendor_reservation_id", json.string(vendor_ref)),
                                  #("car_status", json.string(product_status)),
                                ])
                                |> json.to_string,
                              )
                              Nil
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            _ -> Nil
          }
      }
  }
}
