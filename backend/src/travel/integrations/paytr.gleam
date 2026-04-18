//// PayTR iFrame API — 1. adım token (dev.paytr.com iframe-api).

import envoy
import gleam/bit_array
import gleam/crypto.{Sha256, hmac}
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import gleam/uri
import travel/net/http_client

pub type PaytrConfig {
  PaytrConfig(
    merchant_id: String,
    merchant_key: String,
    merchant_salt: String,
    test_mode: String,
  )
}

pub fn load_config() -> Result(PaytrConfig, Nil) {
  use merchant_id <- result.try(envoy.get("PAYTR_MERCHANT_ID"))
  use merchant_key <- result.try(envoy.get("PAYTR_MERCHANT_KEY"))
  use merchant_salt <- result.try(envoy.get("PAYTR_MERCHANT_SALT"))
  let test_mode = envoy.get("PAYTR_TEST_MODE") |> result.unwrap("1")
  Ok(PaytrConfig(merchant_id:, merchant_key:, merchant_salt:, test_mode:))
}

pub fn build_paytr_token(
  hash_str: String,
  merchant_salt: String,
  merchant_key: String,
) -> String {
  let data = <<hash_str:utf8, merchant_salt:utf8>>
  let key = <<merchant_key:utf8>>
  let mac = hmac(data, Sha256, key)
  bit_array.base64_encode(mac, True)
}

/// PayTR Bildirim URL (2. adım) — PHP örneğiyle aynı: HMAC-SHA256(merchant_key, data), Base64.
/// data = merchant_oid <> merchant_salt <> status <> total_amount
pub fn build_callback_hash(
  merchant_oid: String,
  merchant_salt: String,
  status: String,
  total_amount: String,
  merchant_key: String,
) -> String {
  let data_str = merchant_oid <> merchant_salt <> status <> total_amount
  let data = <<data_str:utf8>>
  let key = <<merchant_key:utf8>>
  let mac = hmac(data, Sha256, key)
  bit_array.base64_encode(mac, True)
}

pub fn hash_string(
  merchant_id: String,
  user_ip: String,
  merchant_oid: String,
  email: String,
  payment_amount: String,
  user_basket: String,
  no_installment: String,
  max_installment: String,
  currency: String,
  test_mode: String,
) -> String {
  merchant_id
  <> user_ip
  <> merchant_oid
  <> email
  <> payment_amount
  <> user_basket
  <> no_installment
  <> max_installment
  <> currency
  <> test_mode
}

fn encode_pair(key: String, value: String) -> String {
  uri.percent_encode(key) <> "=" <> uri.percent_encode(value)
}

pub fn urlencoded_form(fields: List(#(String, String))) -> String {
  list.map(fields, fn(p) { encode_pair(p.0, p.1) })
  |> string.join(with: "&")
}

pub type IframeTokenInput {
  IframeTokenInput(
    user_ip: String,
    merchant_oid: String,
    email: String,
    payment_amount: String,
    user_basket_b64: String,
    no_installment: String,
    max_installment: String,
    currency: String,
    user_name: String,
    user_address: String,
    user_phone: String,
    merchant_ok_url: String,
    merchant_fail_url: String,
    timeout_limit: String,
    debug_on: String,
    lang: String,
  )
}

pub fn request_iframe_token(
  cfg: PaytrConfig,
  input: IframeTokenInput,
) -> Result(String, String) {
  let hash_str =
    hash_string(
      cfg.merchant_id,
      input.user_ip,
      input.merchant_oid,
      input.email,
      input.payment_amount,
      input.user_basket_b64,
      input.no_installment,
      input.max_installment,
      input.currency,
      cfg.test_mode,
    )
  let paytr_token =
    build_paytr_token(hash_str, cfg.merchant_salt, cfg.merchant_key)
  let form =
    urlencoded_form([
      #("merchant_id", cfg.merchant_id),
      #("user_ip", input.user_ip),
      #("merchant_oid", input.merchant_oid),
      #("email", input.email),
      #("payment_amount", input.payment_amount),
      #("paytr_token", paytr_token),
      #("user_basket", input.user_basket_b64),
      #("debug_on", input.debug_on),
      #("no_installment", input.no_installment),
      #("max_installment", input.max_installment),
      #("user_name", input.user_name),
      #("user_address", input.user_address),
      #("user_phone", input.user_phone),
      #("merchant_ok_url", input.merchant_ok_url),
      #("merchant_fail_url", input.merchant_fail_url),
      #("timeout_limit", input.timeout_limit),
      #("currency", input.currency),
      #("test_mode", cfg.test_mode),
      #("lang", input.lang),
    ])
  use raw <- result.try(http_client.post_urlencoded(
    "https://www.paytr.com/odeme/api/get-token",
    form,
  ))
  case json.parse(raw, paytr_response_decoder()) {
    Ok(#(status, token)) ->
      case status == "success", token {
        True, Some(t) -> Ok(t)
        _, _ -> Error("paytr_error: " <> raw)
      }
    Error(_) -> Error("paytr_invalid_json: " <> raw)
  }
}

fn paytr_response_decoder() -> decode.Decoder(#(String, Option(String))) {
  decode.field("status", decode.string, fn(status) {
    decode.optional_field("token", "", decode.string, fn(token_str) {
      let token = case token_str == "" {
        True -> None
        False -> Some(token_str)
      }
      decode.success(#(status, token))
    })
  })
}
