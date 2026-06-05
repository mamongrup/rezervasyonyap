//// Turna uçak API — login, search, allocate, reserve, checkout proxy.

import gleam/dynamic/decode
import gleam/json
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
  let decoder = {
    use v <- decode.field("SessionId", decode.string)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(v) -> string.trim(v)
    Error(_) -> ""
  }
}

fn has_error(raw: String) -> Bool {
  let decoder = {
    use v <- decode.field("HasError", decode.bool)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(True) -> True
    _ -> False
  }
}

fn error_message_from_raw(raw: String) -> String {
  let decoder = {
    use v <- decode.field("Message", decode.string)
    decode.success(v)
  }
  case json.parse(raw, decoder) {
    Ok(m) ->
      case string.trim(m) {
        "" -> "turna_api_error"
        t -> "turna_api_error:" <> t
      }
    Error(_) -> "turna_api_error"
  }
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
            True -> Error(error_message_from_raw(parsed.body))
            False -> Ok(parsed)
          }
        Error(_) -> Error("turna_envelope_parse_failed")
      }
  }
}

pub fn login(cfg: TurnaConfig) -> Result(LoginResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True -> {
      let url = turna_config.login_url(cfg)
      let body = login_body(cfg)
      case http_client.post_json(url, body, "") {
        Error(e) -> Error("turna_http_failed:" <> e)
        Ok(raw) -> {
          case has_error(raw) {
            True -> Error(error_message_from_raw(raw))
            False -> {
              let session_id = session_id_from_raw(raw)
              Ok(LoginResult(session_id: session_id, raw_response: raw))
            }
          }
        }
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

pub fn flight_search_body(cfg: TurnaConfig, p: FlightSearchParams) -> String {
  json.object([
    #("LoginForm", login_form_object(cfg)),
    #(
      "SearchForm",
      json.object([
        #(
          "Legs",
          json.array(
            [
              json.object([
                #("Origin", json.string(string.uppercase(string.trim(p.origin)))),
                #(
                  "Destination",
                  json.string(string.uppercase(string.trim(p.destination))),
                ),
                #("OriginIsCity", json.bool(p.origin_is_city)),
                #("DestinationIsCity", json.bool(p.destination_is_city)),
                #("DepartureDay", json.string(string.trim(p.departure_day))),
              ]),
            ],
            fn(x) { x },
          ),
        ),
        #("Paxes", json.array(pax_rows(p.adult_count, p.child_count, p.infant_count), fn(x) {
          x
        })),
        #(
          "Preferences",
          json.object([
            #("OnlyDirects", json.bool(p.only_directs)),
            #("CabinClass", json.string(p.cabin_class)),
          ]),
        ),
      ]),
    ),
    #("ResponseMask", json.object([#("FlightLegMask", json.int(109))])),
  ])
  |> json.to_string
}

pub fn flight_search(
  cfg: TurnaConfig,
  p: FlightSearchParams,
) -> Result(TurnaHttpResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True -> {
      let body = flight_search_body(cfg, p)
      post_turna(cfg, "/v1/flight/booking/search", body, TurnaSession("", ""))
    }
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

pub fn flight_allocate(
  cfg: TurnaConfig,
  session: TurnaSession,
  allocate_form_json: String,
) -> Result(TurnaHttpResult, String) {
  case turna_config.credentials_ready(cfg) {
    False -> Error("turna_api_key_missing")
    True ->
      post_turna(
        cfg,
        "/v1/flight/booking/allocate",
        merge_login_and_form(cfg, "AllocateForm", allocate_form_json),
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
