//// PayTR: iFrame token (JSON) + Bildirim URL (form, düz metin OK).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode as decode
import gleam/http
import gleam/http/response
import gleam/json
import gleam/list
import gleam/result
import gleam/uri
import pog
import wisp.{type Request, type Response}

import travel/integrations/paytr.{
  type IframeTokenInput, IframeTokenInput, build_callback_hash, load_config,
  request_iframe_token,
}
import travel/integrations/paytr_notify
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

fn iframe_input_decoder() -> decode.Decoder(IframeTokenInput) {
  decode.field("user_ip", decode.string, fn(user_ip) {
    decode.field("merchant_oid", decode.string, fn(merchant_oid) {
      decode.field("email", decode.string, fn(email) {
        decode.field("payment_amount", decode.string, fn(payment_amount) {
          decode.field("user_basket", decode.string, fn(user_basket_b64) {
            decode.optional_field("no_installment", "0", decode.string, fn(no_installment) {
              decode.optional_field("max_installment", "12", decode.string, fn(max_installment) {
                decode.optional_field("currency", "TRY", decode.string, fn(currency) {
                  decode.optional_field("user_name", "", decode.string, fn(user_name) {
                    decode.optional_field("user_address", "", decode.string, fn(user_address) {
                      decode.optional_field("user_phone", "", decode.string, fn(user_phone) {
                        decode.optional_field("merchant_ok_url", "", decode.string, fn(merchant_ok_url) {
                          decode.optional_field("merchant_fail_url", "", decode.string, fn(merchant_fail_url) {
                            decode.optional_field("timeout_limit", "30", decode.string, fn(timeout_limit) {
                              decode.optional_field("debug_on", "0", decode.string, fn(debug_on) {
                                decode.optional_field("lang", "tr", decode.string, fn(lang) {
                                  decode.success(IframeTokenInput(
                                    user_ip:,
                                    merchant_oid:,
                                    email:,
                                    payment_amount:,
                                    user_basket_b64:,
                                    no_installment:,
                                    max_installment:,
                                    currency:,
                                    user_name:,
                                    user_address:,
                                    user_phone:,
                                    merchant_ok_url:,
                                    merchant_fail_url:,
                                    timeout_limit:,
                                    debug_on:,
                                    lang:,
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
      })
    })
  })
}

pub fn iframe_token(req: Request, _ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, iframe_input_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(input) ->
          case load_config() {
            Error(_) ->
              json_err(503, "paytr_not_configured_set_PAYTR_MERCHANT_ID_KEY_SALT")
            Ok(cfg) ->
              case request_iframe_token(cfg, input) {
                Ok(token) -> {
                  let out =
                    json.object([
                      #("status", json.string("success")),
                      #("token", json.string(token)),
                      #(
                        "iframe_url",
                        json.string(
                          "https://www.paytr.com/odeme/guvenli/" <> token,
                        ),
                      ),
                    ])
                    |> json.to_string
                  wisp.json_response(out, 200)
                }
                Error(e) -> json_err(502, e)
              }
          }
      }
  }
}

fn plain_text(body: String, status: Int) -> Response {
  wisp.response(status)
  |> response.set_header("content-type", "text/plain; charset=utf-8")
  |> wisp.set_body(wisp.Text(body))
}

fn plain_ok() -> Response {
  plain_text("OK", 200)
}

/// PayTR Mağaza Paneli → Bildirim URL = bu uç (POST, `application/x-www-form-urlencoded`).
/// `merchant_oid` = rezervasyon `id` (UUID); 1. adımdaki token isteğiyle aynı olmalı.
pub fn notification(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> plain_text("NO_BODY", 400)
    Ok(body) ->
      case uri.parse_query(body) {
        Error(_) -> plain_text("BAD_FORM", 400)
        Ok(pairs) ->
          case
            list.key_find(pairs, "merchant_oid"),
            list.key_find(pairs, "status"),
            list.key_find(pairs, "total_amount"),
            list.key_find(pairs, "hash")
          {
            Ok(merchant_oid), Ok(pay_status), Ok(total_amount), Ok(recv_hash) ->
              case load_config() {
                Error(_) -> plain_text("NO_CONFIG", 503)
                Ok(cfg) -> {
                  let computed =
                    build_callback_hash(
                      merchant_oid,
                      cfg.merchant_salt,
                      pay_status,
                      total_amount,
                      cfg.merchant_key,
                    )
                  case computed == recv_hash {
                    False -> plain_text("BAD_HASH", 400)
                    True ->
                      case
                        pog.transaction(ctx.db, fn(conn) {
                          paytr_notify.apply_paytr_notification(
                            conn,
                            pairs,
                            pay_status,
                            merchant_oid,
                            total_amount,
                          )
                        })
                      {
                        Ok(_) -> plain_ok()
                        Error(pog.TransactionQueryError(_)) ->
                          plain_text("DB", 500)
                        Error(pog.TransactionRolledBack(msg)) ->
                          plain_text(msg, 500)
                      }
                  }
                }
              }
            _, _, _, _ -> plain_text("MISSING_FIELD", 400)
          }
      }
  }
}
