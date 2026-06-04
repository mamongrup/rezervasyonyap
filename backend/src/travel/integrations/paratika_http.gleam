//// Paratika: SESSIONTOKEN (JSON) + RETURNURL (form POST, yönlendirme).

import backend/context.{type Context}
import envoy
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/response
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import gleam/uri
import pog
import travel/db/decode_helpers as row_dec
import wisp.{type Request, type Response}

import travel/integrations/paratika.{
  type ParatikaConfig, type SessionTokenInput, ParatikaConfig, SessionTokenInput,
  payment_page_url, request_session_token,
}
import travel/integrations/paratika_notify

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

fn env_or(key: String, fallback: String) -> String {
  case envoy.get(key) {
    Ok(v) ->
      case string.trim(v) {
        "" -> fallback
        s -> s
      }
    Error(_) -> fallback
  }
}

/// Sandbox / canlı API ve HPP kök URL'leri (Paratika dokümanı).
fn paratika_bases_for_mode(mode: String) -> #(String, String) {
  case string.lowercase(string.trim(mode)) {
    "production" | "live" | "prod" -> #(
      "https://vpos.paratika.com.tr/paratika/api/v2",
      "https://vpos.paratika.com.tr/payment/",
    )
    _ -> #(
      "https://entegrasyon.paratika.com.tr/paratika/api/v2",
      "https://entegrasyon.paratika.com.tr/payment/",
    )
  }
}

/// payment_gateways site_settings satırından Paratika alt-objesini okur.
/// Döner: (merchant_id, merchant_user_key, merchant_password_salt, sd_secret, mode).
fn paratika_settings_from_db(
  db: pog.Connection,
) -> #(String, String, String, String, String) {
  let raw =
    case
      pog.query(
        "select value_json::text from site_settings"
        <> " where key = 'payment_gateways' and organization_id is null limit 1",
      )
      |> pog.returning({
        use a <- decode.field(0, decode.string)
        decode.success(a)
      })
      |> pog.execute(db)
    {
      Ok(ret) ->
        case ret.rows {
          [r] -> r
          _ -> ""
        }
      Error(_) -> ""
    }

  let decoder =
    decode.field(
      "paratika",
      {
        use mid <- decode.optional_field("merchant_id", "", decode.string)
        use mkey <- decode.optional_field("merchant_key", "", decode.string)
        use msalt <- decode.optional_field("merchant_salt", "", decode.string)
        use msd <- decode.optional_field(
          "merchant_sd_secret",
          "",
          decode.string,
        )
        use mode <- decode.optional_field("mode", "sandbox", decode.string)
        decode.success(#(mid, mkey, msalt, msd, mode))
      },
      fn(v) { decode.success(v) },
    )

  case json.parse(raw, decoder) {
    Ok(#(mid, mkey, msalt, msd, mode)) -> #(
      string.trim(mid),
      string.trim(mkey),
      string.trim(msalt),
      string.trim(msd),
      string.trim(mode),
    )
    Error(_) -> #("", "", "", "", "")
  }
}

/// DB-first, env fallback ile ParatikaConfig yükler.
/// Panel → DB → env var sırasıyla okunur.
fn load_config_db_first(db: pog.Connection) -> Result(ParatikaConfig, String) {
  let #(db_merchant, db_user, db_salt, db_sd, db_mode) =
    paratika_settings_from_db(db)
  let merchant = case db_merchant {
    "" -> env_or("PARATIKA_MERCHANT", "")
    v -> v
  }
  let merchant_user = case db_user {
    "" -> env_or("PARATIKA_MERCHANT_USER", "")
    v -> v
  }
  let merchant_password = case db_salt {
    "" -> env_or("PARATIKA_MERCHANT_PASSWORD", "")
    v -> v
  }
  // SD Secret: önce ayrı alan, yoksa merchant_salt, yoksa env.
  let sd_secret = case db_sd {
    "" ->
      case db_salt {
        "" -> env_or("PARATIKA_SD_SECRET", "")
        v -> v
      }
    v -> v
  }
  let #(mode_api, mode_hpp) = paratika_bases_for_mode(db_mode)
  let api_base = case string.trim(env_or("PARATIKA_API_BASE", "")) {
    "" -> mode_api
    v -> v
  }
  let hpp_base = case string.trim(env_or("PARATIKA_HPP_BASE", "")) {
    "" -> mode_hpp
    v -> v
  }
  case
    merchant != ""
    && merchant_user != ""
    && merchant_password != ""
    && sd_secret != ""
  {
    True ->
      Ok(ParatikaConfig(
        merchant:,
        merchant_user:,
        merchant_password:,
        api_base:,
        hpp_base:,
        sd_secret:,
      ))
    False ->
      Error("paratika_not_configured_set_PARATIKA_MERCHANT_USER_PASSWORD_SD_SECRET")
  }
}

fn session_input_decoder() -> decode.Decoder(SessionTokenInput) {
  decode.field("merchant_oid", decode.string, fn(merchant_oid) {
    decode.field("payment_amount", decode.string, fn(payment_amount) {
      decode.field("email", decode.string, fn(email) {
        decode.optional_field("user_name", "", decode.string, fn(user_name) {
          decode.optional_field("currency", "TRY", decode.string, fn(currency) {
            decode.field("user_ip", decode.string, fn(user_ip) {
              decode.optional_field("guest_phone", "0000000000", decode.string, fn(phone) {
                decode.optional_field(
                  "order_title",
                  "Rezervasyon",
                  decode.string,
                  fn(order_title) {
                    decode.success(SessionTokenInput(
                      merchant_payment_id: merchant_oid,
                      payment_amount_kurus: payment_amount,
                      currency: currency,
                      customer_id: merchant_oid,
                      customer_name: user_name,
                      customer_email: email,
                      customer_phone: phone,
                      customer_ip: user_ip,
                      return_url: "",
                      order_title: order_title,
                    ))
                  },
                )
              })
            })
          })
        })
      })
    })
  })
}

fn public_origin() -> String {
  envoy.get("TRAVEL_PUBLIC_ORIGIN")
  |> result.unwrap("http://127.0.0.1:3000")
}

fn api_public_base() -> String {
  let base =
    envoy.get("API_PUBLIC_URL")
    |> result.unwrap("http://127.0.0.1:8080")
  case string.ends_with(base, "/") {
    True -> string.drop_end(base, 1)
    False -> base
  }
}

/// POST /api/v1/integrations/paratika/session-token
pub fn session_token(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, session_input_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(input_base) -> {
          let return_url =
            api_public_base() <> "/api/v1/integrations/paratika/return"
          let input =
            SessionTokenInput(
              merchant_payment_id: input_base.merchant_payment_id,
              payment_amount_kurus: input_base.payment_amount_kurus,
              currency: input_base.currency,
              customer_id: input_base.customer_id,
              customer_name: input_base.customer_name,
              customer_email: input_base.customer_email,
              customer_phone: input_base.customer_phone,
              customer_ip: input_base.customer_ip,
              return_url: return_url,
              order_title: input_base.order_title,
            )
          case load_config_db_first(ctx.db) {
            Error(e) -> json_err(503, e)
            Ok(cfg) ->
              case request_session_token(cfg, input) {
                Ok(#(token, _raw)) -> {
                  let pay_url = payment_page_url(cfg, token)
                  let out =
                    json.object([
                      #("status", json.string("success")),
                      #("session_token", json.string(token)),
                      #("payment_url", json.string(pay_url)),
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
}

fn html_redirect(url: String) -> Response {
  wisp.response(303)
  |> response.set_header("location", url)
  |> response.set_header("content-type", "text/html; charset=utf-8")
  |> wisp.set_body(wisp.Text("OK"))
}

fn html_err(msg: String) -> Response {
  let body = "<!DOCTYPE html><html><body><p>" <> msg <> "</p></body></html>"
  wisp.response(400)
  |> response.set_header("content-type", "text/html; charset=utf-8")
  |> wisp.set_body(wisp.Text(body))
}

/// POST /api/v1/integrations/paratika/return — Paratika RETURNURL (browser).
pub fn payment_return(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> html_err("empty_body")
    Ok(body) ->
      case uri.parse_query(body) {
        Error(_) -> html_err("bad_form")
        Ok(pairs) ->
          case load_config_db_first(ctx.db) {
            Error(_) -> html_err("no_config")
            Ok(cfg) -> {
              case
                pog.transaction(ctx.db, fn(conn) {
                  paratika_notify.apply_paratika_notification(
                    conn,
                    pairs,
                    cfg.sd_secret,
                  )
                })
              {
                Ok(_) -> {
                  let mp = case list.find(pairs, fn(p) {
                    string.lowercase(p.0) == "merchantpaymentid"
                  }) {
                    Ok(#(_, v)) -> v
                    Error(_) -> ""
                  }
                  case string.trim(mp) == "" {
                    True ->
                      html_redirect(public_origin() <> "/checkout?pay=unknown")
                    False ->
                      case
                        pog.query(
                          "select public_code::text from reservations where id = $1::uuid limit 1",
                        )
                        |> pog.parameter(pog.text(string.trim(mp)))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) ->
                          html_redirect(public_origin() <> "/checkout?pay=error")
                        Ok(ret) ->
                          case ret.rows {
                            [code] -> {
                              let ok = case list.find(pairs, fn(p) {
                                string.lowercase(p.0) == "responsecode"
                              }) {
                                Ok(#(_, v)) -> string.trim(v) == "00"
                                Error(_) -> False
                              }
                              let path = case ok {
                                True ->
                                  "/pay-done?code="
                                  <> uri.percent_encode(code)
                                False ->
                                  "/checkout?pay=failed&code="
                                  <> uri.percent_encode(code)
                              }
                              html_redirect(public_origin() <> path)
                            }
                            _ ->
                              html_redirect(public_origin() <> "/checkout?pay=missing")
                          }
                      }
                  }
                }
                Error(pog.TransactionQueryError(_)) -> html_err("db")
                Error(pog.TransactionRolledBack(msg)) -> html_err(msg)
              }
            }
          }
      }
  }
}
