//// Kplus / Travelrobot — gerçek booking (CreateBookingV2) + PNR sorgulama.
//// Travelrobot CreateTokenV2 ile alınan token kullanılır.
////
//// Kplus API dökümantasyonu:
////   POST /General.svc/Rest/Json/CreateBookingV2
////   POST /General.svc/Rest/Json/GetPNRInfoV2
////   POST /General.svc/Rest/Json/CancelBookingV2

import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/string
import travel/integrations/travelrobot_config.{type TravelrobotConfig}
import travel/net/http_client

/// PNR durumu
pub type PnrStatus {
  PnrStatus(
    pnr_code: String,
    status: String,           // "Booked", "Cancelled", "Ticketed"
    reservation_date: String,
    passenger_count: Int,
    raw_response: String,
  )
}

/// Booking oluşturma sonucu
pub type BookingResult {
  BookingResult(
    pnr_code: String,
    booking_status: String,
    raw_response: String,
  )
}

/// Yolcu bilgisi
pub type PassengerInfo {
  PassengerInfo(
    first_name: String,
    last_name: String,
    passenger_type: String, // ADT, CHD, INF
    birth_date: String,
    nationality: String,
    document_number: String,
    document_type: String,  // "Passport", "IDCard"
    gender: String,         // "F", "M", "None"
  )
}

/// İletişim bilgisi
pub type ContactInfo {
  ContactInfo(
    email: String,
    phone: String,
  )
}

/// BookingCreateV2 istek gövdesi oluştur
fn create_booking_body(
  token: String,
  channel_code: String,
  origin: String,
  destination: String,
  departure_date: String,
  arrival_date: String,
  flight_number: String,
  passengers: List(PassengerInfo),
  contact: ContactInfo,
) -> String {
  let pax_arr = list.map(passengers, fn(p) {
    json.object([
      #("FirstName", json.string(p.first_name)),
      #("LastName", json.string(p.last_name)),
      #("PassengerType", json.string(p.passenger_type)),
      #("BirthDate", json.string(p.birth_date)),
      #("Nationality", json.string(p.nationality)),
      #("DocumentNumber", json.string(p.document_number)),
      #("DocumentType", json.string(p.document_type)),
      #("Gender", json.string(p.gender)),
    ])
  })

  json.object([
    #("ChannelCredential", json.object([
      #("ChannelCode", json.string(channel_code)),
      #("TokenCode", json.string(token)),
    ])),
    #("BookingItems", json.array([
      json.object([
        #("OriginPort", json.object([
          #("Code", json.string(origin)),
          #("Type", json.string("A")), // Airport
          #("Name", json.string("")),
        ])),
        #("DestinationPort", json.object([
          #("Code", json.string(destination)),
          #("Type", json.string("A")),
          #("Name", json.string("")),
        ])),
        #("DepartureDate", json.object([
          #("Date", json.string(departure_date)),
        ])),
        #("ArrivalDate", json.object([
          #("Date", json.string(arrival_date)),
        ])),
        #("FlightNumber", json.string(flight_number)),
        #("Passengers", json.array(pax_arr, fn(x) { x })),
      ]),
    ], fn(x) { x })),
    #("ContactInfo", json.object([
      #("Email", json.string(contact.email)),
      #("Phone", json.string(contact.phone)),
    ])),
  ])
  |> json.to_string
}

/// PNR sorgulama gövdesi
fn pnr_info_body(token: String, channel_code: String, pnr_code: String) -> String {
  json.object([
    #("ChannelCredential", json.object([
      #("ChannelCode", json.string(channel_code)),
      #("TokenCode", json.string(token)),
    ])),
    #("PNRCode", json.string(pnr_code)),
  ])
  |> json.to_string
}

/// İptal gövdesi (CancelBookingV2)
fn cancel_booking_body(token: String, channel_code: String, pnr_code: String) -> String {
  json.object([
    #("ChannelCredential", json.object([
      #("ChannelCode", json.string(channel_code)),
      #("TokenCode", json.string(token)),
    ])),
    #("PNRCode", json.string(pnr_code)),
  ])
  |> json.to_string
}

/// Booking URL
pub fn create_booking_url(base_url: String) -> String {
  let base = string.trim(base_url)
  let base = case string.ends_with(base, "/") {
    True -> string.drop_end(base, 1)
    False -> base
  }
  base <> "/General.svc/Rest/Json/CreateBookingV2"
}

/// PNR sorgulama URL
pub fn pnr_info_url(base_url: String) -> String {
  let base = string.trim(base_url)
  let base = case string.ends_with(base, "/") {
    True -> string.drop_end(base, 1)
    False -> base
  }
  base <> "/General.svc/Rest/Json/GetPNRInfoV2"
}

/// İptal URL
pub fn cancel_booking_url(base_url: String) -> String {
  let base = string.trim(base_url)
  let base = case string.ends_with(base, "/") {
    True -> string.drop_end(base, 1)
    False -> base
  }
  base <> "/General.svc/Rest/Json/CancelBookingV2"
}

/// Travelrobot/Kplus'tan hata mesajını parse et
fn error_message_from_raw(raw: String) -> String {
  case json.parse(raw, decode.field("ErrorMessage", decode.string, decode.success)) {
    Ok(m) ->
      case string.trim(m) {
        "" -> "kplus_api_error"
        t -> "kplus_api_error:" <> t
      }
    Error(_) -> "kplus_api_error"
  }
}

/// Yanıtta hata var mı?
fn has_error(raw: String) -> Bool {
  case json.parse(raw, decode.field("HasError", decode.bool, decode.success)) {
    Ok(True) -> True
    Ok(False) -> False
    Error(_) -> {
      case json.parse(raw, decode.field("HasError", decode.string, decode.success)) {
        Ok(s) -> s == "true" || s == "True" || s == "1"
        Error(_) -> False
      }
    }
  }
}

/// Yanıttan PNR kodunu parse et
fn pnr_code_from_raw(raw: String) -> Result(String, String) {
  let nested =
    decode.field(
      "Result",
      decode.field("PNRCode", decode.string, fn(c) { decode.success(c) }),
      fn(c) { decode.success(c) },
    )
  case json.parse(raw, nested) {
    Ok(t) ->
      case string.trim(t) {
        "" -> {
          // Direct PNRCode
          case json.parse(raw, decode.field("PNRCode", decode.string, fn(c) { decode.success(c) })) {
            Ok(t2) ->
              case string.trim(t2) {
                "" -> Error("kplus_pnr_empty")
                s -> Ok(s)
              }
            Error(_) -> Error("kplus_pnr_not_found")
          }
        }
        s -> Ok(s)
      }
    Error(_) -> {
      case json.parse(raw, decode.field("PNRCode", decode.string, fn(c) { decode.success(c) })) {
        Ok(t) ->
          case string.trim(t) {
            "" -> Error("kplus_pnr_not_found")
            s -> Ok(s)
          }
        Error(_) -> Error("kplus_pnr_not_found")
      }
    }
  }
}

/// Yanıttan booking status parse et
fn booking_status_from_raw(raw: String) -> String {
  let nested =
    decode.field(
      "Result",
      decode.field("Status", decode.string, fn(c) { decode.success(c) }),
      fn(c) { decode.success(c) },
    )
  case json.parse(raw, nested) {
    Ok(t) ->
      case string.trim(t) {
        "" -> "unknown"
        s -> s
      }
    Error(_) -> {
      case json.parse(raw, decode.field("Status", decode.string, fn(c) { decode.success(c) })) {
        Ok(t2) ->
          case string.trim(t2) {
            "" -> "unknown"
            s -> s
          }
        Error(_) -> "unknown"
      }
    }
  }
}

/// PNR bilgisinden status parse et
fn pnr_status_from_raw(raw: String) -> String {
  let nested =
    decode.field(
      "Result",
      decode.field("PNRStatus", decode.string, fn(c) { decode.success(c) }),
      fn(c) { decode.success(c) },
    )
  case json.parse(raw, nested) {
    Ok(t) ->
      case string.trim(t) {
        "" -> booking_status_from_raw(raw)
        s -> s
      }
    Error(_) -> booking_status_from_raw(raw)
  }
}

/// CreateBookingV2 — gerçek Kplus booking + PNR kodu alma
pub fn create_booking(
  cfg: TravelrobotConfig,
  token: String,
  origin: String,
  destination: String,
  departure_date: String,
  arrival_date: String,
  flight_number: String,
  passengers: List(PassengerInfo),
  contact: ContactInfo,
) -> Result(BookingResult, String) {
  case travelrobot_config.credentials_ready(cfg) {
    False -> Error("travelrobot_credentials_missing")
    True -> {
      let url = create_booking_url(cfg.base_url)
      let body = create_booking_body(
        token,
        cfg.channel_code,
        origin,
        destination,
        departure_date,
        arrival_date,
        flight_number,
        passengers,
        contact,
      )
      case http_client.post_json(url, body, "") {
        Error(e) -> Error("kplus_http_failed:" <> e)
        Ok(raw) -> {
          case has_error(raw) {
            True -> Error(error_message_from_raw(raw))
            False -> {
              case pnr_code_from_raw(raw) {
                Ok(pnr) -> {
                  let status = booking_status_from_raw(raw)
                  Ok(BookingResult(
                    pnr_code: pnr,
                    booking_status: status,
                    raw_response: raw,
                  ))
                }
                Error(e) -> Error(e)
              }
            }
          }
        }
      }
    }
  }
}

/// GetPNRInfoV2 — PNR sorgulama
pub fn get_pnr_info(
  cfg: TravelrobotConfig,
  token: String,
  pnr_code: String,
) -> Result(PnrStatus, String) {
  case travelrobot_config.credentials_ready(cfg) {
    False -> Error("travelrobot_credentials_missing")
    True -> {
      let url = pnr_info_url(cfg.base_url)
      let body = pnr_info_body(token, cfg.channel_code, pnr_code)
      case http_client.post_json(url, body, "") {
        Error(e) -> Error("kplus_http_failed:" <> e)
        Ok(raw) -> {
          case has_error(raw) {
            True -> Error(error_message_from_raw(raw))
            False -> {
              let pnr = case pnr_code_from_raw(raw) {
                Ok(p) -> p
                Error(_) -> pnr_code
              }
              let status = pnr_status_from_raw(raw)
              Ok(PnrStatus(
                pnr_code: pnr,
                status: status,
                reservation_date: "",
                passenger_count: 0,
                raw_response: raw,
              ))
            }
          }
        }
      }
    }
  }
}

/// CancelBookingV2 — PNR iptal
pub fn cancel_booking(
  cfg: TravelrobotConfig,
  token: String,
  pnr_code: String,
) -> Result(String, String) {
  case travelrobot_config.credentials_ready(cfg) {
    False -> Error("travelrobot_credentials_missing")
    True -> {
      let url = cancel_booking_url(cfg.base_url)
      let body = cancel_booking_body(token, cfg.channel_code, pnr_code)
      case http_client.post_json(url, body, "") {
        Error(e) -> Error("kplus_http_failed:" <> e)
        Ok(raw) -> {
          case has_error(raw) {
            True -> Error(error_message_from_raw(raw))
            False -> Ok(raw)
          }
        }
      }
    }
  }
}
