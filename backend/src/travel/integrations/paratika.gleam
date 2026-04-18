//// Paratika API v2 — SESSIONTOKEN (HPP) ve sdSha512 doğrulama.

import envoy
import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/float
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import gleam/uri
import travel/net/http_client

pub type ParatikaConfig {
  ParatikaConfig(
    merchant: String,
    merchant_user: String,
    merchant_password: String,
    api_base: String,
    hpp_base: String,
    sd_secret: String,
  )
}

pub fn load_config() -> Result(ParatikaConfig, Nil) {
  use merchant <- result.try(envoy.get("PARATIKA_MERCHANT"))
  use merchant_user <- result.try(envoy.get("PARATIKA_MERCHANT_USER"))
  use merchant_password <- result.try(envoy.get("PARATIKA_MERCHANT_PASSWORD"))
  use sd_secret <- result.try(envoy.get("PARATIKA_SD_SECRET"))
  let api_base =
    envoy.get("PARATIKA_API_BASE")
    |> result.unwrap("https://entegrasyon.paratika.com.tr/paratika/api/v2")
  let hpp_base =
    envoy.get("PARATIKA_HPP_BASE")
    |> result.unwrap(
      "https://entegrasyon.paratika.com.tr/merchant/payment/",
    )
  Ok(ParatikaConfig(
    merchant:,
    merchant_user:,
    merchant_password:,
    api_base:,
    hpp_base:,
    sd_secret:,
  ))
}

pub type SessionTokenInput {
  SessionTokenInput(
    merchant_payment_id: String,
    /// PayTR ile uyum için kuruş string; Paratika AMOUNT için TL'ye çevrilir.
    payment_amount_kurus: String,
    currency: String,
    customer_id: String,
    customer_name: String,
    customer_email: String,
    customer_phone: String,
    customer_ip: String,
    return_url: String,
    order_title: String,
  )
}

fn encode_pair(key: String, value: String) -> String {
  uri.percent_encode(key) <> "=" <> uri.percent_encode(value)
}

fn urlencoded_form(fields: List(#(String, String))) -> String {
  list.map(fields, fn(p) { encode_pair(p.0, p.1) })
  |> string.join(with: "&")
}

fn kurus_to_amount_str(kurus: String) -> String {
  case int.parse(string.trim(kurus)) {
    Ok(k) -> {
      let major = k / 100
      case int.modulo(k, 100) {
        Ok(minor) -> {
          let frac = case minor < 10 {
            True -> "0" <> int.to_string(minor)
            False -> int.to_string(minor)
          }
          int.to_string(major) <> "." <> frac
        }
        Error(_) -> "0.00"
      }
    }
    Error(_) -> "0.00"
  }
}

fn order_items_json(amount_str: String, title: String) -> String {
  let amount_field = case float.parse(amount_str) {
    Ok(f) -> json.float(f)
    Error(_) -> json.float(0.0)
  }
  let body =
    json.array(
      from: [
        json.object([
          #("productCode", json.string("1")),
          #("name", json.string(title)),
          #("description", json.string("Rezervasyon")),
          #("quantity", json.int(1)),
          #("amount", amount_field),
        ]),
      ],
      of: fn(x) { x },
    )
  json.to_string(body)
}

/// Paratika: SHA512 hex ( merchantPaymentId|customerId|sessionToken|responseCode|random|secretKey )
pub fn build_sd_sha512(
  merchant_payment_id: String,
  customer_id: String,
  session_token: String,
  response_code: String,
  random: String,
  secret: String,
) -> String {
  let data_str =
    merchant_payment_id
    <> "|"
    <> customer_id
    <> "|"
    <> session_token
    <> "|"
    <> response_code
    <> "|"
    <> random
    <> "|"
    <> secret
  let digest = crypto.hash(crypto.Sha512, <<data_str:utf8>>)
  string.lowercase(bit_array.base16_encode(digest))
}

pub fn request_session_token(
  cfg: ParatikaConfig,
  input: SessionTokenInput,
) -> Result(#(String, String), String) {
  let amount_str = kurus_to_amount_str(input.payment_amount_kurus)
  let order_json = order_items_json(amount_str, input.order_title)
  let fields = [
    #("ACTION", "SESSIONTOKEN"),
    #("SESSIONTYPE", "PAYMENTSESSION"),
    #("MERCHANT", cfg.merchant),
    #("MERCHANTUSER", cfg.merchant_user),
    #("MERCHANTPASSWORD", cfg.merchant_password),
    #("MERCHANTPAYMENTID", input.merchant_payment_id),
    #("AMOUNT", amount_str),
    #("CURRENCY", string.uppercase(string.trim(input.currency))),
    #("RETURNURL", input.return_url),
    #("CUSTOMER", input.customer_id),
    #("CUSTOMERNAME", input.customer_name),
    #("CUSTOMEREMAIL", input.customer_email),
    #("CUSTOMERPHONE", input.customer_phone),
    #("CUSTOMERIP", input.customer_ip),
    #("ORDERITEMS", order_json),
    #("BILLTOADDRESSLINE", "-"),
    #("BILLTOCITY", "-"),
    #("BILLTOCOUNTRY", "TR"),
    #("BILLTOPOSTALCODE", "00000"),
    #("BILLTOPHONE", input.customer_phone),
    #("SHIPTOADDRESSLINE", "-"),
    #("SHIPTOCITY", "-"),
    #("SHIPTOCOUNTRY", "TR"),
    #("SHIPTOPOSTALCODE", "00000"),
    #("SHIPTOPHONE", input.customer_phone),
  ]
  let form = urlencoded_form(fields)
  use raw <- result.try(http_client.post_urlencoded(cfg.api_base, form))
  case json.parse(raw, session_token_response_decoder()) {
    Ok(#(code, token)) ->
      case code == "00", token {
        True, Some(t) -> Ok(#(t, raw))
        _, _ -> Error("paratika_session_error: " <> raw)
      }
    Error(_) -> Error("paratika_invalid_json: " <> raw)
  }
}

fn session_token_response_decoder() -> decode.Decoder(#(String, Option(String))) {
  decode.field("responseCode", decode.string, fn(response_code) {
    decode.optional_field("sessionToken", "", decode.string, fn(token_str) {
      let token = case string.trim(token_str) == "" {
        True -> None
        False -> Some(token_str)
      }
      decode.success(#(response_code, token))
    })
  })
}

pub fn payment_page_url(cfg: ParatikaConfig, session_token: String) -> String {
  cfg.hpp_base <> session_token
}
