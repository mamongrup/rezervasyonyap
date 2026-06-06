//// Turna uçak API — login, search, allocate, reserve, checkout proxy.

import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import travel/integrations/turna_config.{type TurnaConfig}
import travel/net/http_client

pub type LoginResult {
  LoginResult(session_id: String, raw_response: String)
}

pub type TurnaSession {
  TurnaSession(session_id: String, session_token: String)
}

pub type TurnaHttpResult {
  TurnaHttpResult(
    body: String,
    session: TurnaSession,
  )
}

fn login_body(cfg: TurnaConfig) -> String {
  json.object([
    #("ApiKey", json.string(cfg.api_key)),
    #("CountryCode", json.string(cfg.country_code)),
    #("CurrencyCode", json.string(cfg.currency_code)),
    #("LanguageCode", json.string(cfg.language_code)),
  ])
  |> json.to_string
}

pub fn login_form_object(cfg: TurnaConfig) -> json.Json {
  json.object([
    #("ApiKey", json.string(cfg.api_key)),
    #("CountryCode", json.string(cfg.country_code)),
    #("CurrencyCode", json.string(cfg.currency_code)),
    #("LanguageCode", json.string(cfg.language_code)),
  ])
}

fn session_id_from_raw(raw: String) -> String {
  let str_decoder = {
    use v <- decode.field("SessionId", decode.string)
    decode.success(v)
  }
  let int_decoder = {
    use v <- decode.field("SessionId", decode.int)
    decode.success(int.to_string(v))
  }
  case json.parse(raw, str_decoder) {
    Ok(v) ->
      case string.trim(v) {
        "" -> ""
        s -> s
      }
    Error(_) ->
      case json.parse(raw, int_decoder) {
        Ok(v) -> string.trim(v)
        Error(_) -> ""
      }
  }
}

fn has_error(raw: String) -> Bool {
  let bool_decoder = {
    use v <- decode.field("HasError", decode.bool)
    decode.success(v)
  }
  case json.parse(raw, bool_decoder) {
    Ok(True) -> True
    Ok(False) -> False
    Error(_) -> {
      let str_decoder = {
        use v <- decode.field("HasError", decode.string)
        decode.success(v)
      }
      case json.parse(raw, str_decoder) {
        Ok(s) -> s == "true" || s == "True" || s == "1"
        Error(_) -> False
      }
    }
  }
}

fn has_nonempty_flight_legs(raw: String) -> Bool {
  case string.contains(raw, "\"FlightLegs\":[") {
    False -> False
    True ->
      case string.contains(raw, "\"FlightLegs\":[]") {
        True -> False
        False -> True
      }
  }
}

fn has_nonempty_combinable_legs(raw: String) -> Bool {
  case string.contains(raw, "\"CombinableLegsList\":[") {
    False -> False
    True ->
      case string.contains(raw, "\"CombinableLegsList\":[]") {
        True -> False
        False -> True
      }
  }
}

pub fn has_flight_inventory(raw: String) -> Bool {
  has_nonempty_flight_legs(raw) || has_nonempty_combinable_legs(raw)
}

fn alternate_flight_masks(primary: Int) -> List(Int) {
  let candidates = [primary, 105, 109, 41, 127, 255, 511, 1023]
  list.unique(candidates)
}

fn raw_body_preview(raw: String) -> String {
  let compact =
    raw
    |> string.replace("\n", "")
    |> string.replace("\r", "")
  case string.length(compact) > 240 {
    True -> string.slice(compact, 0, 240) <> "…"
    False -> compact
  }
}

fn error_message_from_raw(raw: String) -> String {
  let msg_decoder = {
    use v <- decode.field("Message", decode.string)
    decode.success(v)
  }
  let err_decoder = {
    use v <- decode.field("ErrorMessage", decode.string)
    decode.success(v)
  }
  let msg_lower_decoder = {
    use v <- decode.field("message", decode.string)
    decode.success(v)
  }
  let code_str_decoder = {
    use v <- decode.field("ErrorCode", decode.string)
    decode.success(v)
  }
  let code_int_decoder = {
    use v <- decode.field("ErrorCode", decode.int)
    decode.success(int.to_string(v))
  }
  let text =
    case json.parse(raw, msg_decoder) {
      Ok(m) ->
        case string.trim(m) {
          "" -> ""
          t -> t
        }
      Error(_) -> ""
    }
  let text = case text {
    "" ->
      case json.parse(raw, err_decoder) {
        Ok(m) ->
          case string.trim(m) {
            "" -> ""
            t -> t
          }
        Error(_) -> ""
      }
    _ -> text
  }
  let text = case text {
    "" ->
      case json.parse(raw, msg_lower_decoder) {
        Ok(m) ->
          case string.trim(m) {
            "" -> ""
            t -> t
          }
        Error(_) -> ""
      }
    _ -> text
  }
  case text {
    "" -> {
      case json.parse(raw, code_str_decoder) {
        Ok(c) ->
          case string.trim(c) {
            "" -> {
              case json.parse(raw, code_int_decoder) {
                Ok(ci) ->
                  case string.trim(ci) {
                    "" -> "turna_api_error:" <> raw_body_preview(raw)
                    t -> "turna_api_error:" <> t
                  }
                Error(_) -> "turna_api_error:" <> raw_body_preview(raw)
              }
            }
            t -> "turna_api_error:" <> t
          }
        Error(_) ->
          case json.parse(raw, code_int_decoder) {
            Ok(ci) ->
              case string.trim(ci) {
                "" -> "turna_api_error:" <> raw_body_preview(raw)
                t -> "turna_api_error:" <> t
              }
            Error(_) -> "turna_api_error:" <> raw_body_preview(raw)
          }
      }
    }
    t -> "turna_api_error:" <> t
  }
}

fn session_from_result(result: TurnaHttpResult) -> TurnaSession {
  TurnaSession(
    session_id: case string.trim(result.session.session_id) {
      "" -> session_id_from_raw(result.body)
      s -> s
    },
    session_token: result.session.session_token,
  )
}

fn login_turna_result(cfg: TurnaConfig) -> Result(TurnaHttpResult, String) {
  post_turna(
    cfg,
    "/v1/accounts/auth/anonymousLogin",
    login_body(cfg),
    TurnaSession("", ""),
  )
}

fn envelope_decoder() -> decode.Decoder(TurnaHttpResult) {
  decode.field("body", decode.string, fn(body) {
    decode.field("session_id", decode.string, fn(session_id) {
      decode.field("session_token", decode.string, fn(session_token) {
        decode.success(TurnaHttpResult(
          body: body,
          session: TurnaSession(
            session_id: string.trim(session_id),
            session_token: string.trim(session_token),
          ),
        ))
      })
    })
  })
}

fn parse_envelope(raw: String) -> Result(TurnaHttpResult, String) {
  case json.parse(raw, envelope_decoder()) {
    Ok(r) -> Ok(r)
    Error(_) -> Error("turna_envelope_parse_failed")
  }
}

fn post_turna(
  cfg: TurnaConfig,
  path: String,
  body: String,
  session: TurnaSession,
) -> Result(TurnaHttpResult, String) {
  let url = turna_config.join_path(cfg.base_url, path)
  case
    http_client.post_json_turna(
      url,
      body,
      session.session_id,
      session.session_token,
      180_000,
    )
  {
    Error(e) ->
      case parse_envelope(e) {
        Ok(parsed) -> Error(error_message_from_raw(parsed.body))
        Error(_) ->
          case string.length(e) > 400 {
            True -> Error("turna_http_failed:" <> string.slice(e, 0, 400))
            False -> Error("turna_http_failed:" <> e)
          }
      }
    Ok(raw) ->
      case parse_envelope(raw) {
        Ok(parsed) ->
          case has_error(parsed.body) {
            True ->
              case has_flight_inventory(parsed.body) {
                True -> Ok(parsed)
                False -> Error(error_message_from_raw(parsed.body))
              }
            False -> Ok(parsed)
          }
        Error(_) -> Error("turna_envelope_parse_failed")
      }
  }
}

pub fn login(cfg: TurnaConfig) -> Result(LoginResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True ->
      case login_turna_result(cfg) {
        Error(e) -> Error(e)
        Ok(result) -> {
          let session = session_from_result(result)
          Ok(LoginResult(
            session_id: session.session_id,
            raw_response: result.body,
          ))
        }
      }
  }
}

pub type FlightSearchParams {
  FlightSearchParams(
    origin: String,
    destination: String,
    departure_day: String,
    origin_is_city: Bool,
    destination_is_city: Bool,
    adult_count: Int,
    child_count: Int,
    infant_count: Int,
    cabin_class: String,
    only_directs: Bool,
  )
}

fn pax_rows(adults: Int, children: Int, infants: Int) -> List(json.Json) {
  let rows = []
  let rows = case adults > 0 {
    True -> [json.object([#("Type", json.string("ADT")), #("Count", json.int(adults))]), ..rows]
    False -> rows
  }
  let rows = case children > 0 {
    True -> [json.object([#("Type", json.string("CHD")), #("Count", json.int(children))]), ..rows]
    False -> rows
  }
  let rows = case infants > 0 {
    True -> [json.object([#("Type", json.string("INF")), #("Count", json.int(infants))]), ..rows]
    False -> rows
  }
  case rows {
    [] -> [json.object([#("Type", json.string("ADT")), #("Count", json.int(1))])]
    _ -> rows
  }
}

fn search_form_object(p: FlightSearchParams) -> json.Json {
  json.object([
    #(
      "Legs",
      json.array(
        [
          json.object([
            #("Origin", json.string(string.uppercase(string.trim(p.origin)))),
            #("Destination", json.string(string.uppercase(string.trim(p.destination)))),
            #("OriginIsCity", json.bool(p.origin_is_city)),
            #("DestinationIsCity", json.bool(p.destination_is_city)),
            #("DepartureDay", json.string(string.trim(p.departure_day))),
          ]),
        ],
        fn(x) { x },
      ),
    ),
    #(
      "Paxes",
      json.array(pax_rows(p.adult_count, p.child_count, p.infant_count), fn(x) {
        x
      }),
    ),
    #(
      "Preferences",
      json.object([
        #("OnlyDirects", json.bool(p.only_directs)),
        #("CabinClass", json.string(p.cabin_class)),
      ]),
    ),
  ])
}

pub fn search_form_json(p: FlightSearchParams) -> String {
  search_form_object(p) |> json.to_string
}

pub fn flight_search_body(
  cfg: TurnaConfig,
  p: FlightSearchParams,
  flight_leg_mask: Int,
) -> String {
  json.object([
    #("LoginForm", login_form_object(cfg)),
    #("SearchForm", search_form_object(p)),
    #(
      "ResponseMask",
      json.object([#("FlightLegMask", json.int(flight_leg_mask))]),
    ),
  ])
  |> json.to_string
}

fn flight_search_with_mask(
  cfg: TurnaConfig,
  p: FlightSearchParams,
  session: TurnaSession,
  flight_leg_mask: Int,
) -> Result(TurnaHttpResult, String) {
  let body = flight_search_body(cfg, p, flight_leg_mask)
  post_turna(cfg, "/v1/flight/booking/search", body, session)
}

fn flight_search_try_masks(
  cfg: TurnaConfig,
  p: FlightSearchParams,
  session: TurnaSession,
  masks: List(Int),
) -> Result(TurnaHttpResult, String) {
  case masks {
    [] -> Error("turna_search_empty")
    [mask, ..rest] ->
      case flight_search_with_mask(cfg, p, session, mask) {
        Error(e) ->
          case rest {
            [] -> Error(e)
            _ -> flight_search_try_masks(cfg, p, session, rest)
          }
        Ok(result) ->
          case has_flight_inventory(result.body) {
            True -> Ok(result)
            False ->
              case rest {
                [] -> Ok(result)
                _ -> flight_search_try_masks(cfg, p, session, rest)
              }
          }
      }
  }
}

pub fn search_response_url_from_raw(raw: String) -> String {
  let decoder = {
    use v <- decode.field("SearchResponseUrl", decode.string)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(u) -> string.trim(u)
    Error(_) -> ""
  }
}

/// Postman / Node import: Search gövdesinde gömülü `LoginForm`; ön login ve oturum başlığı gerekmez.
pub fn flight_search(
  cfg: TurnaConfig,
  p: FlightSearchParams,
) -> Result(TurnaHttpResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True ->
      flight_search_try_masks(
        cfg,
        p,
        TurnaSession("", ""),
        alternate_flight_masks(cfg.flight_leg_mask),
      )
  }
}

pub fn turna_has_error_flag(raw: String) -> Bool {
  has_error(raw)
}

pub fn turna_message_from_raw(raw: String) -> String {
  let msg_decoder = {
    use v <- decode.field("Message", decode.string)
    decode.success(v)
  }
  let err_decoder = {
    use v <- decode.field("ErrorMessage", decode.string)
    decode.success(v)
  }
  let primary =
    case json.parse(raw, msg_decoder) {
      Ok(m) ->
        case string.trim(m) {
          "" -> ""
          t -> t
        }
      Error(_) -> ""
    }
  case primary {
    "" ->
      case json.parse(raw, err_decoder) {
        Ok(m) ->
          case string.trim(m) {
            "" -> ""
            t -> t
          }
        Error(_) -> ""
      }
    other -> other
  }
}

fn merge_login_and_form(
  cfg: TurnaConfig,
  top_key: String,
  form_json: String,
) -> String {
  let login = login_body(cfg)
  let form = string.trim(form_json)
  "{" <> "\"LoginForm\":" <> login <> ",\"" <> top_key <> "\":" <> form <> "}"
}

/// Turna V5 allocate: LoginForm + SearchForm + AllocateForm (Postman akışı).
fn merge_login_search_allocate(
  cfg: TurnaConfig,
  search_form_json: String,
  allocate_form_json: String,
) -> String {
  let login = login_body(cfg)
  let search = string.trim(search_form_json)
  let allocate = string.trim(allocate_form_json)
  "{"
    <> "\"LoginForm\":"
    <> login
    <> ",\"SearchForm\":"
    <> search
    <> ",\"AllocateForm\":"
    <> allocate
    <> "}"
}

pub fn flight_allocate(
  cfg: TurnaConfig,
  session: TurnaSession,
  search_params: FlightSearchParams,
  allocate_form_json: String,
) -> Result(TurnaHttpResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True ->
      post_turna(
        cfg,
        "/v1/flight/booking/allocate",
        merge_login_search_allocate(
          cfg,
          search_form_json(search_params),
          allocate_form_json,
        ),
        session,
      )
  }
}

pub fn flight_reserve(
  cfg: TurnaConfig,
  session: TurnaSession,
  reserve_form_json: String,
) -> Result(TurnaHttpResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True ->
      post_turna(
        cfg,
        "/v1/flight/booking/reserve",
        merge_login_and_form(cfg, "ReserveForm", reserve_form_json),
        session,
      )
  }
}

pub fn flight_make_balance_payment(
  cfg: TurnaConfig,
  session: TurnaSession,
  payment_form_json: String,
) -> Result(TurnaHttpResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True ->
      post_turna(
        cfg,
        "/v1/flight/booking/makebalancepayment",
        merge_login_and_form(cfg, "PaymentForm", payment_form_json),
        session,
      )
  }
}

pub fn flight_checkout(
  cfg: TurnaConfig,
  session: TurnaSession,
  checkout_form_json: String,
) -> Result(TurnaHttpResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True ->
      post_turna(
        cfg,
        "/v1/flight/booking/checkout",
        merge_login_and_form(cfg, "CheckoutForm", checkout_form_json),
        session,
      )
  }
}

pub fn session_to_json(session: TurnaSession) -> json.Json {
  json.object([
    #("session_id", json.string(session.session_id)),
    #("session_token", json.string(session.session_token)),
  ])
}

/// Reserve → bakiye ödeme → checkout (Turna acente bakiyesi).
pub fn flight_fulfill_paid_booking(
  cfg: TurnaConfig,
  session: TurnaSession,
  reserve_form_json: String,
) -> Result(
  #(
    TurnaHttpResult,
    TurnaHttpResult,
    TurnaHttpResult,
  ),
  String,
) {
  use reserve_result <- result.try(flight_reserve(cfg, session, reserve_form_json))
  use pay_result <- result.try(flight_make_balance_payment(
    cfg,
    reserve_result.session,
    "{}",
  ))
  use chk_result <- result.try(flight_checkout(cfg, pay_result.session, "{}"))
  Ok(#(reserve_result, pay_result, chk_result))
}

fn first_string_field(raw: String, keys: List(String)) -> String {
  list.fold(keys, "", fn(acc, key) {
    case acc != "" {
      True -> acc
      False -> {
        let dec = {
          use v <- decode.field(key, decode.string)
          decode.success(v)
        }
        case json.parse(raw, dec) {
          Ok(v) ->
            case string.trim(v) {
              "" -> ""
              s -> s
            }
          Error(_) -> ""
        }
      }
    }
  })
}

fn nested_string_field(raw: String, path: List(String)) -> String {
  case json.parse(raw, decode.at(path, decode.string)) {
    Ok(v) ->
      case string.trim(v) {
        "" -> ""
        s -> s
      }
    Error(_) -> ""
  }
}

/// Turna checkout / reserve yanıtından PNR benzeri referanslar.
pub fn extract_booking_refs(raw: String) -> #(String, String) {
  let pnr =
    nested_string_field(raw, ["Booking", "Pnr"])
    |> fn(v) {
      case v {
        "" ->
          nested_string_field(raw, ["Result", "Booking", "Pnr"])
          |> fn(v2) {
            case v2 {
              "" -> first_string_field(raw, ["Pnr", "PNR", "RecordLocator"])
              found -> found
            }
          }
        found -> found
      }
    }
  let sys =
    nested_string_field(raw, ["Booking", "SystemPnr"])
    |> fn(v) {
      case v {
        "" ->
          nested_string_field(raw, ["Result", "Booking", "SystemPnr"])
          |> fn(v2) {
            case v2 {
              "" -> first_string_field(raw, ["SystemPnr", "SystemPNR", "BookingId"])
              found -> found
            }
          }
        found -> found
      }
    }
  #(sys, pnr)
}
