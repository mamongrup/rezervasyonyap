//// Turna canlı uçuş arama + rezervasyon — public API proxy.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/option.{type Option}
import gleam/result
import gleam/string
import pog
import travel/integrations/turna
import travel/integrations/turna_config
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

fn route_ref(origin: String, destination: String) -> String {
  string.lowercase(string.trim(origin)) <> "-" <> string.lowercase(string.trim(destination))
}

fn turna_origin_is_city(code: String) -> Bool {
  case string.uppercase(string.trim(code)) {
    "IST" | "AYT" | "LON" | "MAD" | "BER" | "AMS" | "KWI" | "DXB" -> True
    _ -> False
  }
}

fn turna_destination_is_city(code: String) -> Bool {
  case string.uppercase(string.trim(code)) {
    "IST" | "LON" | "MAD" | "BER" | "AMS" | "KWI" | "DXB" -> True
    _ -> False
  }
}

/// Postman sertifikasyon koleksiyonlarına göre şehir bayrakları (sunucu tek kaynak).
fn normalize_city_flags(p: turna.FlightSearchParams) -> turna.FlightSearchParams {
  turna.FlightSearchParams(
    origin: p.origin,
    destination: p.destination,
    departure_day: p.departure_day,
    origin_is_city: turna_origin_is_city(p.origin),
    destination_is_city: turna_destination_is_city(p.destination),
    adult_count: p.adult_count,
    child_count: p.child_count,
    infant_count: p.infant_count,
    cabin_class: p.cabin_class,
    only_directs: p.only_directs,
  )
}

fn find_turna_listing_id(db: pog.Connection, origin: String, destination: String) -> Option(String) {
  let ref = route_ref(origin, destination)
  case
    pog.query(
      "select l.id::text from listings l "
        <> "where l.external_provider_code = 'turna' "
        <> "and l.external_listing_ref = $1 "
        <> "and l.status = 'published' "
        <> "limit 1",
    )
    |> pog.parameter(pog.text(ref))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> pog.execute(db)
  {
    Error(_) -> option.None
    Ok(ret) ->
      case ret.rows {
        [id] -> option.Some(id)
        _ -> option.None
      }
  }
}

fn search_decoder() -> decode.Decoder(turna.FlightSearchParams) {
  decode.field("origin", decode.string, fn(origin) {
    decode.field("destination", decode.string, fn(destination) {
      decode.field("departure_date", decode.string, fn(departure_date) {
        decode.optional_field("origin_is_city", False, decode.bool, fn(origin_is_city) {
          decode.optional_field("destination_is_city", False, decode.bool, fn(
            destination_is_city,
          ) {
            decode.optional_field("adults", 1, decode.int, fn(adults) {
              decode.optional_field("children", 0, decode.int, fn(children) {
                decode.optional_field("infants", 0, decode.int, fn(infants) {
                  decode.optional_field("cabin_class", "Any", decode.string, fn(cabin_class) {
                    decode.optional_field("only_directs", False, decode.bool, fn(only_directs) {
                      let adt = case adults < 1 {
                        True -> 1
                        False -> adults
                      }
                      decode.success(turna.FlightSearchParams(
                        origin: origin,
                        destination: destination,
                        departure_day: departure_date,
                        origin_is_city: origin_is_city,
                        destination_is_city: destination_is_city,
                        adult_count: adt,
                        child_count: children,
                        infant_count: infants,
                        cabin_class: cabin_class,
                        only_directs: only_directs,
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
}

fn session_action_decoder(
  form_field: String,
) -> decode.Decoder(#(turna.TurnaSession, String)) {
  decode.field("session_id", decode.string, fn(session_id) {
    decode.field("session_token", decode.string, fn(session_token) {
      decode.field(form_field, decode.string, fn(form_json) {
        decode.success(#(
          turna.TurnaSession(
            session_id: session_id,
            session_token: session_token,
          ),
          form_json,
        ))
      })
    })
  })
}

/// Allocate: oturum + allocate_form + arama parametreleri (SearchForm için).
fn allocate_decoder() -> decode.Decoder(#(
  turna.TurnaSession,
  String,
  turna.FlightSearchParams,
)) {
  decode.field("session_id", decode.string, fn(session_id) {
    decode.field("session_token", decode.string, fn(session_token) {
      decode.field("allocate_form", decode.string, fn(allocate_form) {
        use params <- decode.then(search_decoder())
        decode.success(#(
          turna.TurnaSession(
            session_id: session_id,
            session_token: session_token,
          ),
          allocate_form,
          params,
        ))
      })
    })
  })
}

fn turna_proxy_ok(result: turna.TurnaHttpResult) -> Response {
  let out =
    json.object([
      #("ok", json.bool(True)),
      #("turna_raw", json.string(result.body)),
      #("session", turna.session_to_json(result.session)),
    ])
    |> json.to_string
  wisp.json_response(out, 200)
}

/// POST /api/v1/flights/turna/search — canlı uçuş arama
pub fn post_search(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let cfg = turna_config.load(ctx.db)
  case turna_config.credentials_ready(cfg) {
    False -> json_err(503, "turna_not_configured")
    True ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, search_decoder()) {
            Error(_) -> json_err(400, "invalid_search_body")
            Ok(params) ->
              case string.trim(params.origin) == "" || string.trim(params.destination) == "" {
                True -> json_err(400, "origin_destination_required")
                False ->
                  case string.trim(params.departure_day) == "" {
                    True -> json_err(400, "departure_date_required")
                    False -> {
                      let params = normalize_city_flags(params)
                      case turna.flight_search(cfg, params) {
                        Error(e) -> json_err(502, e)
                        Ok(result) -> {
                          let listing_id =
                            find_turna_listing_id(
                              ctx.db,
                              params.origin,
                              params.destination,
                            )
                          let lid_j = case listing_id {
                            option.Some(id) -> json.string(id)
                            option.None -> json.null()
                          }
                          let search_url =
                            turna.search_response_url_from_raw(result.body)
                          let search_url_j = case search_url {
                            "" -> json.null()
                            u -> json.string(u)
                          }
                          let turna_msg = turna.turna_message_from_raw(result.body)
                          let turna_msg_j = case turna_msg {
                            "" -> json.null()
                            m -> json.string(m)
                          }
                          let out =
                            json.object([
                              #("ok", json.bool(True)),
                              #("turna_raw", json.string(result.body)),
                              #("session", turna.session_to_json(result.session)),
                              #("listing_id", lid_j),
                              #(
                                "route_ref",
                                json.string(route_ref(params.origin, params.destination)),
                              ),
                              #("search_response_url", search_url_j),
                              #(
                                "has_inventory",
                                json.bool(turna.has_flight_inventory(result.body)),
                              ),
                              #(
                                "search_meta",
                                json.object([
                                  #(
                                    "origin_is_city",
                                    json.bool(params.origin_is_city),
                                  ),
                                  #(
                                    "destination_is_city",
                                    json.bool(params.destination_is_city),
                                  ),
                                  #("base_url", json.string(cfg.base_url)),
                                  #(
                                    "flight_leg_mask",
                                    json.int(cfg.flight_leg_mask),
                                  ),
                                  #(
                                    "turna_has_error",
                                    json.bool(turna.turna_has_error_flag(result.body)),
                                  ),
                                  #("turna_message", turna_msg_j),
                                  #("enabled", json.bool(cfg.enabled)),
                                ]),
                              ),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                      }
                    }
                  }
              }
          }
      }
  }
}

/// POST /api/v1/flights/turna/allocate — fiyat kilitle
pub fn post_allocate(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let cfg = turna_config.load(ctx.db)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, allocate_decoder()) {
        Error(_) -> json_err(400, "invalid_allocate_body")
        Ok(#(session, form_json, params)) -> {
          let params = normalize_city_flags(params)
          case turna.flight_allocate(cfg, session, params, form_json) {
            Error(e) -> json_err(502, e)
            Ok(result) -> turna_proxy_ok(result)
          }
        }
      }
  }
}

/// POST /api/v1/flights/turna/reserve — rezervasyon
pub fn post_reserve(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let cfg = turna_config.load(ctx.db)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, session_action_decoder("reserve_form")) {
        Error(_) -> json_err(400, "invalid_reserve_body")
        Ok(#(session, form_json)) ->
          case turna.flight_reserve(cfg, session, form_json) {
            Error(e) -> json_err(502, e)
            Ok(result) -> turna_proxy_ok(result)
          }
      }
  }
}

/// POST /api/v1/flights/turna/checkout — bilet kesim
pub fn post_checkout(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let cfg = turna_config.load(ctx.db)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, session_action_decoder("checkout_form")) {
        Error(_) -> json_err(400, "invalid_checkout_body")
        Ok(#(session, form_json)) ->
          case turna.flight_checkout(cfg, session, form_json) {
            Error(e) -> json_err(502, e)
            Ok(result) -> turna_proxy_ok(result)
          }
      }
  }
}

fn book_decoder() -> decode.Decoder(#(turna.TurnaSession, String, String, String)) {
  decode.field("session_id", decode.string, fn(session_id) {
    decode.field("session_token", decode.string, fn(session_token) {
      decode.field("reserve_form", decode.string, fn(reserve_form) {
        decode.optional_field("payment_form", "{}", decode.string, fn(payment_form) {
          decode.optional_field("checkout_form", "{}", decode.string, fn(checkout_form) {
            decode.success(#(
              turna.TurnaSession(
                session_id: session_id,
                session_token: session_token,
              ),
              reserve_form,
              payment_form,
              checkout_form,
            ))
          })
        })
      })
    })
  })
}

/// POST /api/v1/flights/turna/book — reserve (+ opsiyonel ödeme + checkout)
pub fn post_book(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let cfg = turna_config.load(ctx.db)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, book_decoder()) {
        Error(_) -> json_err(400, "invalid_book_body")
        Ok(#(session0, reserve_form, payment_form, checkout_form)) ->
          case turna.flight_reserve(cfg, session0, reserve_form) {
            Error(e) -> json_err(502, e)
            Ok(reserve_result) -> {
              let session1 = reserve_result.session
              let pay_trim = string.trim(payment_form)
              let chk_trim = string.trim(checkout_form)
              case pay_trim == "" || pay_trim == "{}" {
                False ->
                  case turna.flight_make_balance_payment(cfg, session1, payment_form) {
                    Error(e) -> json_err(502, e)
                    Ok(pay_result) -> {
                      let session2 = pay_result.session
                      case chk_trim == "" || chk_trim == "{}" {
                        True -> {
                          let out =
                            json.object([
                              #("ok", json.bool(True)),
                              #("reserve_raw", json.string(reserve_result.body)),
                              #("payment_raw", json.string(pay_result.body)),
                              #("session", turna.session_to_json(session2)),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                        False ->
                          case turna.flight_checkout(cfg, session2, checkout_form) {
                            Error(e) -> json_err(502, e)
                            Ok(chk_result) -> {
                              let out =
                                json.object([
                                  #("ok", json.bool(True)),
                                  #("reserve_raw", json.string(reserve_result.body)),
                                  #("payment_raw", json.string(pay_result.body)),
                                  #("checkout_raw", json.string(chk_result.body)),
                                  #("session", turna.session_to_json(chk_result.session)),
                                ])
                                |> json.to_string
                              wisp.json_response(out, 200)
                            }
                          }
                      }
                    }
                  }
                True ->
                  case chk_trim == "" || chk_trim == "{}" {
                    True -> {
                      let out =
                        json.object([
                          #("ok", json.bool(True)),
                          #("reserve_raw", json.string(reserve_result.body)),
                          #("session", turna.session_to_json(session1)),
                        ])
                        |> json.to_string
                      wisp.json_response(out, 200)
                    }
                    False ->
                      case turna.flight_checkout(cfg, session1, checkout_form) {
                        Error(e) -> json_err(502, e)
                        Ok(chk_result) -> {
                          let out =
                            json.object([
                              #("ok", json.bool(True)),
                              #("reserve_raw", json.string(reserve_result.body)),
                              #("checkout_raw", json.string(chk_result.body)),
                              #("session", turna.session_to_json(chk_result.session)),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                      }
                  }
              }
            }
          }
      }
  }
}
