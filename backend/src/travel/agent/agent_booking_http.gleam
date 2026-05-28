//// Partner API — rezervasyon oluşturma ve sorgu (otel, tatil evi, yat, aktivite).

import backend/context.{type Context}
import travel/agent/agent_auth
import travel/agent/agent_catalog_http
import travel/agent/agent_webhook
import travel/booking/booking_http
import travel/messaging/notification_runtime
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/option.{None, Some}
import gleam/result
import gleam/string
import pog
import wisp.{type Request, type Response}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn booking_create_decoder() -> decode.Decoder(
  #(
    String,
    Int,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    Int,
    String,
    Int,
    Bool,
  ),
) {
  decode.field("listing_id", decode.string, fn(listing_id) {
    decode.field("quantity", decode.int, fn(quantity) {
      decode.field("starts_on", decode.string, fn(starts_on) {
        decode.field("ends_on", decode.string, fn(ends_on) {
          decode.field("unit_price", decode.string, fn(unit_price) {
            decode.field("currency_code", decode.string, fn(currency_code) {
              decode.field("guest_email", decode.string, fn(guest_email) {
                decode.field("guest_name", decode.string, fn(guest_name) {
                  decode.optional_field("guest_phone", "", decode.string, fn(phone_raw) {
                    decode.optional_field("hold_minutes", 15, decode.int, fn(hold_minutes) {
                      decode.optional_field("payment_type", "full", decode.string, fn(pt_raw) {
                        decode.optional_field("installments", 1, decode.int, fn(inst_raw) {
                          decode.field("contract_accepted", decode.bool, fn(contract_accepted) {
                            let phone = case string.trim(phone_raw) {
                              "" -> ""
                              p -> p
                            }
                            let payment_type = case string.trim(pt_raw) {
                              "partial" -> "partial"
                              _ -> "full"
                            }
                            let installments = case inst_raw < 1 || inst_raw > 12 {
                              True -> 1
                              False -> inst_raw
                            }
                            decode.success(#(
                              listing_id,
                              quantity,
                              starts_on,
                              ends_on,
                              unit_price,
                              currency_code,
                              guest_email,
                              guest_name,
                              phone,
                              hold_minutes,
                              payment_type,
                              installments,
                              contract_accepted,
                            ))
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/agent/bookings — sepet + satır + checkout (tek istek).
pub fn create_booking(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "bookings.write") {
        Error(r) -> r
        Ok(Nil) ->
          case read_body_string(req) {
            Error(_) -> agent_auth.json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, booking_create_decoder()) {
                Error(_) -> agent_auth.json_err(400, "invalid_json")
                Ok(#(
                  listing_id,
                  quantity,
                  starts_on,
                  ends_on,
                  unit_price,
                  currency_code,
                  guest_email,
                  guest_name,
                  guest_phone_raw,
                  hold_minutes,
                  payment_type,
                  installments,
                  contract_accepted,
                )) ->
                  case quantity < 1 {
                    True -> agent_auth.json_err(400, "invalid_quantity")
                    False ->
                      case contract_accepted {
                        False -> agent_auth.json_err(400, "contract_not_accepted")
                        True ->
                          case agent_catalog_http.assert_agent_listing_access(
                            ctx.db,
                            listing_id,
                            oid,
                          ) {
                            Error(r) -> r
                            Ok(_cat) -> {
                              let cur = string.uppercase(string.trim(currency_code))
                              case cur == "" {
                                True -> agent_auth.json_err(400, "currency_required")
                                False -> {
                                  let phone = case string.trim(guest_phone_raw) {
                                    "" -> None
                                    p -> Some(p)
                                  }
                                  let hm = case hold_minutes < 5 || hold_minutes > 120 {
                                    True -> 15
                                    False -> hold_minutes
                                  }
                                  case
                                    booking_http.agent_booking_from_api(
                                      ctx.db,
                                      oid,
                                      listing_id,
                                      quantity,
                                      starts_on,
                                      ends_on,
                                      string.trim(unit_price),
                                      cur,
                                      guest_email,
                                      guest_name,
                                      phone,
                                      hm,
                                      payment_type,
                                      installments,
                                    )
                                  {
                                    Ok(#(rid, pcode, pay_kurus, currency)) -> {
                                      let _ =
                                        notification_runtime.dispatch_agency_reservation_created(
                                          ctx.db,
                                          rid,
                                        )
                                      let _ =
                                        agent_webhook.dispatch_reservation_created(
                                          ctx,
                                          oid,
                                          rid,
                                          pcode,
                                          listing_id,
                                          "held",
                                        )
                                      let out =
                                        json.object([
                                          #("reservation_id", json.string(rid)),
                                          #("public_code", json.string(pcode)),
                                          #("status", json.string("held")),
                                          #("payment_amount", json.string(pay_kurus)),
                                          #("currency_code", json.string(currency)),
                                          #("payment_type", json.string(payment_type)),
                                          #("agency_organization_id", json.string(oid)),
                                        ])
                                        |> json.to_string
                                      wisp.json_response(out, 201)
                                    }
                                    Error(msg) ->
                                      case msg {
                                        "guest_fields_required" ->
                                          agent_auth.json_err(400, msg)
                                        "listing_unavailable_or_currency_mismatch" ->
                                          agent_auth.json_err(400, msg)
                                        "invalid_agency_organization" ->
                                          agent_auth.json_err(400, msg)
                                        "agency_category_not_granted" ->
                                          agent_auth.json_err(403, msg)
                                        "agency_documents_not_approved" ->
                                          agent_auth.json_err(403, msg)
                                        "cart_empty" -> agent_auth.json_err(400, msg)
                                        "contract_not_accepted" ->
                                          agent_auth.json_err(400, msg)
                                        _ -> agent_auth.json_err(400, msg)
                                      }
                                  }
                                }
                              }
                            }
                          }
                      }
                  }
              }
          }
      }
  }
}

fn reservation_row() -> decode.Decoder(
  #(
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
  ),
) {
  use rid <- decode.field(0, decode.string)
  use pcode <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use ge <- decode.field(3, decode.string)
  use gn <- decode.field(4, decode.string)
  use s1 <- decode.field(5, decode.string)
  use s2 <- decode.field(6, decode.string)
  use pj <- decode.field(7, decode.string)
  use ts <- decode.field(8, decode.string)
  decode.success(#(rid, pcode, st, ge, gn, s1, s2, pj, ts))
}

/// GET /api/v1/agent/bookings/:code
pub fn get_booking(req: Request, ctx: Context, code: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "reservations.read") {
        Error(r) -> r
        Ok(Nil) ->
          case
            pog.query(
              "select r.id::text, r.public_code, r.status::text, coalesce(r.guest_email, ''), "
              <> "coalesce(r.guest_name, ''), coalesce(r.starts_on::text, ''), "
              <> "coalesce(r.ends_on::text, ''), coalesce(r.price_breakdown_json::text, '{}'), "
              <> "to_char(r.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') "
              <> "from reservations r "
              <> "where r.public_code = $1 and r.agency_organization_id = $2::uuid limit 1",
            )
            |> pog.parameter(pog.text(code))
            |> pog.parameter(pog.text(oid))
            |> pog.returning(reservation_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> agent_auth.json_err(500, "load_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> agent_auth.json_err(404, "not_found")
                [#(rid, pcode, st, ge, gn, s1, s2, pj, ts)] -> {
                  let body =
                    json.object([
                      #("id", json.string(rid)),
                      #("public_code", json.string(pcode)),
                      #("status", json.string(st)),
                      #("guest_email", json.string(ge)),
                      #("guest_name", json.string(gn)),
                      #("starts_on", json.string(s1)),
                      #("ends_on", json.string(s2)),
                      #("price_breakdown_json", json.string(pj)),
                      #("created_at", json.string(ts)),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
                _ -> agent_auth.json_err(500, "unexpected")
              }
          }
      }
  }
}

/// GET /api/v1/agent/bookings?status=&limit=
pub fn list_bookings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "reservations.read") {
        Error(r) -> r
        Ok(Nil) -> booking_http.list_agency_reservations_response(ctx.db, oid)
      }
  }
}

/// DELETE /api/v1/agent/bookings/:code
pub fn cancel_booking(req: Request, ctx: Context, code: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "bookings.write") {
        Error(r) -> r
        Ok(Nil) ->
          case booking_http.agent_cancel_reservation(ctx.db, oid, code) {
            Ok(#(rid, pcode, lid)) -> {
              let _ =
                agent_webhook.dispatch_reservation_cancelled(ctx, oid, rid, pcode, lid)
              let body =
                json.object([
                  #("public_code", json.string(pcode)),
                  #("status", json.string("cancelled")),
                  #("reservation_id", json.string(rid)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            Error(msg) ->
              case msg {
                "not_cancellable" -> agent_auth.json_err(409, msg)
                _ -> agent_auth.json_err(400, msg)
              }
          }
      }
  }
}
