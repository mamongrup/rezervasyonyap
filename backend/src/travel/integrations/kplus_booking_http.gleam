//// Kplus / Travelrobot — Booking HTTP handler'ları (create booking, PNR sorgula, iptal)
//// POST /api/v1/integrations/kplus/booking
//// POST /api/v1/integrations/kplus/pnr-info
//// POST /api/v1/integrations/kplus/cancel-booking

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import travel/identity/permissions
import travel/integrations/kplus_booking
import travel/integrations/travelrobot
import travel/integrations/travelrobot_config
import wisp.{type Request, type Response}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn json_ok(data: json.Json) -> Response {
  let body =
    json.object([#("ok", json.bool(True)), #("data", data)])
    |> json.to_string
  wisp.json_response(body, 200)
}

/// POST body decoder: create booking için yolcu + uçuş bilgileri
fn create_booking_decoder() -> decode.Decoder(#(
  String,  // origin
  String,  // destination
  String,  // departure_date
  String,  // arrival_date
  String,  // flight_number
  String,  // contact_email
  String,  // contact_phone
  List(#(String, String, String, String, String, String, String, String)),
  // passengers: list of (first_name, last_name, type, birth_date, nationality, doc_no, doc_type, gender)
)) {
  decode.field("origin", decode.string, fn(origin) {
    decode.field("destination", decode.string, fn(destination) {
      decode.field("departure_date", decode.string, fn(departure_date) {
        decode.field("arrival_date", decode.string, fn(arrival_date) {
          decode.field("flight_number", decode.string, fn(flight_number) {
            decode.field("contact_email", decode.string, fn(contact_email) {
              decode.field("contact_phone", decode.string, fn(contact_phone) {
                decode.field("passengers", decode.list(
                  decode.field("first_name", decode.string, fn(first_name) {
                    decode.field("last_name", decode.string, fn(last_name) {
                      decode.field("passenger_type", decode.string, fn(passenger_type) {
                        decode.field("birth_date", decode.string, fn(birth_date) {
                          decode.field("nationality", decode.string, fn(nationality) {
                            decode.field("document_number", decode.string, fn(doc_number) {
                              decode.field("document_type", decode.string, fn(doc_type) {
                                decode.field("gender", decode.string, fn(gender) {
                                  decode.success(#(first_name, last_name, passenger_type, birth_date, nationality, doc_number, doc_type, gender))
                                })
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                ), fn(psg_list) {
                  decode.success(#(origin, destination, departure_date, arrival_date, flight_number, contact_email, contact_phone, psg_list))
                })
              })
            })
          })
        })
      })
    })
  })
}

/// POST body decoder: PNR sorgulama
fn pnr_info_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("pnr_code", decode.string, fn(pnr_code) {
    decode.optional_field("token_code", "", decode.string, fn(token_code) {
      decode.success(#(pnr_code, token_code))
    })
  })
}

/// POST body decoder: iptal
fn cancel_booking_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("pnr_code", decode.string, fn(pnr_code) {
    decode.optional_field("token_code", "", decode.string, fn(token_code) {
      decode.success(#(pnr_code, token_code))
    })
  })
}

/// Yardımcı: token al veya verileni kullan
fn resolve_token(cfg: travelrobot_config.TravelrobotConfig, token_code: String) -> Result(String, Response) {
  case string.trim(token_code) {
    "" -> {
      case travelrobot.create_token(cfg) {
        Error(e) -> Error(json_err(502, e))
        Ok(t) -> Ok(t.token_code)
      }
    }
    t -> Ok(t)
  }
}

/// POST /api/v1/integrations/kplus/booking — CreateBookingV2 (gerçek Kplus booking)
pub fn post_create_booking(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.write") {
        False -> json_err(403, "forbidden")
        True -> {
          let cfg = travelrobot_config.load(ctx.db)
          case travelrobot_config.credentials_ready(cfg) {
            False -> json_err(503, "travelrobot_not_configured")
            True -> {
              case read_body_string(req) {
                Error(_) -> json_err(400, "empty_body")
                Ok(body) ->
                  case json.parse(body, create_booking_decoder()) {
                    Error(_) -> json_err(400, "invalid_booking_body")
                    Ok(#(origin, destination, departure_date, arrival_date, flight_number, email, phone, psg_tuples)) ->
                      case resolve_token(cfg, "") {
                        Error(r) -> r
                        Ok(token) -> {
                          // PassengerInfo tuple'larını kplus_booking.PassengerInfo'ya dönüştür
                          let passengers = list.map(psg_tuples, fn(t) {
                            let #(first_name, ln, ptype, bd, nat, doc_no, doc_type, gender) = t
                            kplus_booking.PassengerInfo(
                              first_name: first_name,
                              last_name: ln,
                              passenger_type: ptype,
                              birth_date: bd,
                              nationality: nat,
                              document_number: doc_no,
                              document_type: doc_type,
                              gender: gender,
                            )
                          })
                          let contact = kplus_booking.ContactInfo(
                            email: email,
                            phone: phone,
                          )
                          case kplus_booking.create_booking(
                            cfg, token, origin, destination,
                            departure_date, arrival_date, flight_number,
                            passengers, contact,
                          ) {
                            Error(e) -> json_err(502, e)
                            Ok(result) -> {
                              let out = json.object([
                                #("pnr_code", json.string(result.pnr_code)),
                                #("booking_status", json.string(result.booking_status)),
                                #("raw_response", json.string(result.raw_response)),
                              ])
                              json_ok(out)
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

/// POST /api/v1/integrations/kplus/pnr-info — PNR sorgulama
pub fn post_pnr_info(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.read") {
        False -> json_err(403, "forbidden")
        True -> {
          let cfg = travelrobot_config.load(ctx.db)
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, pnr_info_decoder()) {
                Error(_) -> json_err(400, "invalid_pnr_body")
                Ok(#(pnr_code, token_code)) ->
                  case resolve_token(cfg, token_code) {
                    Error(r) -> r
                    Ok(token) ->
                      case kplus_booking.get_pnr_info(cfg, token, pnr_code) {
                        Error(e) -> json_err(502, e)
                        Ok(pnr) -> {
                          let out = json.object([
                            #("pnr_code", json.string(pnr.pnr_code)),
                            #("status", json.string(pnr.status)),
                            #("raw_response", json.string(pnr.raw_response)),
                          ])
                          json_ok(out)
                        }
                      }
                  }
              }
          }
        }
      }
  }
}

/// POST /api/v1/integrations/kplus/cancel-booking — PNR iptal
pub fn post_cancel_booking(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.write") {
        False -> json_err(403, "forbidden")
        True -> {
          let cfg = travelrobot_config.load(ctx.db)
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, cancel_booking_decoder()) {
                Error(_) -> json_err(400, "invalid_cancel_body")
                Ok(#(pnr_code, token_code)) ->
                  case resolve_token(cfg, token_code) {
                    Error(r) -> r
                    Ok(token) ->
                      case kplus_booking.cancel_booking(cfg, token, pnr_code) {
                        Error(e) -> json_err(502, e)
                        Ok(raw) -> {
                          let out = json.object([
                            #("pnr_code", json.string(pnr_code)),
                            #("cancelled", json.bool(True)),
                            #("raw_response", json.string(raw)),
                          ])
                          json_ok(out)
                        }
                      }
                  }
              }
          }
        }
      }
  }
}
