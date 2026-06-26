//// Turna uçuş — ödeme sonrası reserve + bakiye ödeme + checkout.

import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{type Option}
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/integrations/turna
import travel/integrations/turna_config

type TurnaLineMeta {
  TurnaLineMeta(
    session_id: String,
    session_token: String,
    allocate_raw: String,
    existing_meta: String,
  )
}

fn meta_provider_is_turna(meta: String) -> Bool {
  let dec = {
    use v <- decode.field("provider", decode.string)
    decode.success(v)
  }
  case json.parse(meta, dec) {
    Ok(p) -> string.lowercase(string.trim(p)) == "turna"
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

fn json_escape(s: String) -> String {
  s
  |> string.replace("\\", "\\\\")
  |> string.replace("\"", "\\\"")
}

fn passenger_json(first: String, last: String, tc: String) -> String {
  let id_part = case string.trim(tc) {
    "" -> ""
    id -> ",\"IdentityNumber\":\"" <> json_escape(id) <> "\""
  }
  "{\"Type\":\"ADT\",\"FirstName\":\""
    <> json_escape(string.trim(first))
    <> "\",\"LastName\":\""
    <> json_escape(string.trim(last))
    <> "\""
    <> id_part
    <> "}"
}

fn passengers_json_from_checkout_meta(checkout_meta: String) -> String {
  let guests_dec = {
    use rows <- decode.field("guests", decode.list(guest_row_decoder()))
    decode.success(rows)
  }
  case json.parse(checkout_meta, guests_dec) {
    Error(_) -> "[]"
    Ok(rows) -> {
      let parts =
        list.filter_map(rows, fn(row) {
          let #(first, last, tc) = row
          case string.trim(first) == "" && string.trim(last) == "" {
            True -> Error(Nil)
            False -> Ok(passenger_json(first, last, tc))
          }
        })
      "[" <> string.join(parts, ",") <> "]"
    }
  }
}

/// Allocate yanıtı + checkout misafirleri → ReserveForm JSON.
pub fn build_reserve_form(allocate_raw: String, checkout_meta: String) -> String {
  let base = case string.trim(allocate_raw) {
    "" -> "{}"
    other -> other
  }
  let passengers = passengers_json_from_checkout_meta(checkout_meta)
  case passengers == "[]" {
    True -> base
    False ->
      case string.ends_with(base, "}") && string.starts_with(base, "{") {
        True ->
          string.drop_end(base, 1)
            <> ",\"Passengers\":"
            <> passengers
            <> "}"
        False -> "{\"Passengers\":" <> passengers <> "}"
      }
  }
}

fn session_from_meta(meta: String) -> Option(turna.TurnaSession) {
  case #(
    json.parse(meta, decode.at(["session", "session_id"], decode.string)),
    json.parse(meta, decode.at(["session", "session_token"], decode.string)),
  ) {
    #(Ok(sid), Ok(tok)) ->
      case string.trim(sid) == "" || string.trim(tok) == "" {
        True -> option.None
        False ->
          option.Some(turna.TurnaSession(session_id: sid, session_token: tok))
      }
    _ -> option.None
  }
}

fn turna_line_meta(meta: String) -> Option(TurnaLineMeta) {
  case meta_provider_is_turna(meta) {
    False -> option.None
    True -> {
      let alloc_dec = {
        use v <- decode.field("allocate_raw", decode.string)
        decode.success(v)
      }
      case session_from_meta(meta) {
        option.None -> option.None
        option.Some(session) -> {
          let alloc =
            case json.parse(meta, alloc_dec) {
              Ok(v) -> v
              Error(_) -> ""
            }
          option.Some(TurnaLineMeta(
            session_id: session.session_id,
            session_token: session.session_token,
            allocate_raw: alloc,
            existing_meta: meta,
          ))
        }
      }
    }
  }
}

fn turna_booking_done(meta: String) -> Bool {
  case json.parse(meta, decode.at(["turna_booking", "status"], decode.string)) {
    Ok(s) -> string.lowercase(string.trim(s)) == "completed"
    Error(_) -> False
  }
}

fn turna_booking_patch(
  status: String,
  system_ref: String,
  pnr: String,
  reserve_raw: String,
  payment_raw: String,
  checkout_raw: String,
  err: String,
) -> String {
  json.object([
    #(
      "turna_booking",
      json.object([
        #("status", json.string(status)),
        #("system_ref", json.string(system_ref)),
        #("pnr", json.string(pnr)),
        #("reserve_raw", json.string(reserve_raw)),
        #("payment_raw", json.string(payment_raw)),
        #("checkout_raw", json.string(checkout_raw)),
        #("error", json.string(err)),
      ]),
    ),
  ])
  |> json.to_string
}

fn persist_turna_booking_patch(
  conn: pog.Connection,
  line_item_id: String,
  patch_json: String,
) -> Nil {
  let _ =
    pog.query(
      "update reservation_line_items set meta_json = coalesce(meta_json, '{}'::jsonb) || $2::jsonb where id = $1::uuid",
    )
    |> pog.parameter(pog.text(line_item_id))
    |> pog.parameter(pog.text(patch_json))
    |> pog.execute(conn)
  Nil
}

fn mark_flight_confirmed(conn: pog.Connection, reservation_id: String) -> Nil {
  let _ =
    pog.query(
      "update reservations set status = 'confirmed', payment_status = 'supplier_notified', supplier_confirmed_at = now() where id = $1::uuid",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.execute(conn)
  Nil
}

fn insert_turna_event(
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

/// Ödeme yakalandıktan sonra Turna bilet zincirini çalıştırır (idempotent).
pub fn fulfill_after_payment(
  conn: pog.Connection,
  reservation_id: String,
) -> Nil {
  let cfg = turna_config.load(conn)
  case turna_config.credentials_ready(cfg) {
    False -> Nil
    True -> {
      case
        pog.query(
          "select rli.id::text, rli.meta_json::text, r.price_breakdown_json::text "
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
          decode.success(#(a, b, c))
        })
        |> pog.execute(conn)
      {
        Error(_) -> Nil
        Ok(ret) ->
          case ret.rows {
            [] -> Nil
            [#(line_id, meta, breakdown)] -> {
              case turna_booking_done(meta) {
                True -> Nil
                False ->
                  case turna_line_meta(meta) {
                    option.None -> Nil
                    option.Some(tm) -> {
                      let checkout_meta = checkout_meta_from_breakdown(breakdown)
                      let reserve_form =
                        build_reserve_form(tm.allocate_raw, checkout_meta)
                      let session =
                        turna.TurnaSession(
                          session_id: tm.session_id,
                          session_token: tm.session_token,
                        )
                      case
                        turna.flight_fulfill_paid_booking(cfg, session, reserve_form)
                      {
                        Error(e) -> {
                          persist_turna_booking_patch(
                            conn,
                            line_id,
                            turna_booking_patch(
                              "failed",
                              "",
                              "",
                              "",
                              "",
                              "",
                              e,
                            ),
                          )
                          let payload =
                            json.object([#("error", json.string(e))])
                            |> json.to_string
                          insert_turna_event(
                            conn,
                            reservation_id,
                            "turna_booking_failed",
                            payload,
                          )
                          Nil
                        }
                        Ok(#(res, pay, chk)) -> {
                          let #(sys, pnr) = turna.extract_booking_refs(chk.body)
                          persist_turna_booking_patch(
                            conn,
                            line_id,
                            turna_booking_patch(
                              "completed",
                              sys,
                              pnr,
                              res.body,
                              pay.body,
                              chk.body,
                              "",
                            ),
                          )
                          mark_flight_confirmed(conn, reservation_id)
                          let payload =
                            json.object([
                              #("system_ref", json.string(sys)),
                              #("pnr", json.string(pnr)),
                            ])
                            |> json.to_string
                          insert_turna_event(
                            conn,
                            reservation_id,
                            "turna_booking_completed",
                            payload,
                          )
                          Nil
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
}
