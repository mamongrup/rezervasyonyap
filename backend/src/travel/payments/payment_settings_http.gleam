//// Aktif sanal POS seçimi (payment_providers.is_active — tek aktif).
//// Vitrin checkout: havale / Western Union / Ria — `site_settings.checkout_payment_methods`.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import travel/identity/permissions
import wisp.{type Request, type Response}

const checkout_methods_key = "checkout_payment_methods"

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn trim_or_empty(s: String) -> String {
  string.trim(s)
}

fn checkout_bank_decoder() -> decode.Decoder(#(String, String, String, String, String)) {
  {
    use iban_try <- decode.optional_field("iban_try", "", decode.string)
    use eur <- decode.optional_field("iban_eur", "", decode.string)
    use usd <- decode.optional_field("iban_usd", "", decode.string)
    use gbp <- decode.optional_field("iban_gbp", "", decode.string)
    use note <- decode.optional_field("note", "", decode.string)
    decode.success(#(iban_try, eur, usd, gbp, note))
  }
}

fn checkout_methods_from_db(db: pog.Connection) -> #(
  String,
  String,
  String,
  String,
  String,
  String,
  String,
) {
  let raw =
    case
      pog.query(
        "select coalesce(value_json::text, '{}') from site_settings"
        <> " where key = $1 and organization_id is null limit 1",
      )
      |> pog.parameter(pog.text(checkout_methods_key))
      |> pog.returning({
        use a <- decode.field(0, decode.string)
        decode.success(a)
      })
      |> pog.execute(db)
    {
      Ok(ret) ->
        case ret.rows {
          [r] -> r
          _ -> "{}"
        }
      Error(_) -> "{}"
    }

  let bank_decoder =
    decode.field(
      "bank_transfer",
      checkout_bank_decoder(),
      fn(v) { decode.success(v) },
    )

  let wu_decoder =
    decode.field(
      "western_union",
      decode.string,
      fn(v) { decode.success(v) },
    )

  let ria_decoder =
    decode.field("ria", decode.string, fn(v) { decode.success(v) })

  let #(iban_try, iban_eur, iban_usd, iban_gbp, bank_note) = case
    json.parse(raw, bank_decoder)
  {
    Ok(v) -> v
    Error(_) -> #("", "", "", "", "")
  }

  let western_union = case json.parse(raw, wu_decoder) {
    Ok(v) -> trim_or_empty(v)
    Error(_) -> ""
  }

  let ria = case json.parse(raw, ria_decoder) {
    Ok(v) -> trim_or_empty(v)
    Error(_) -> ""
  }

  #(
    trim_or_empty(iban_try),
    trim_or_empty(iban_eur),
    trim_or_empty(iban_usd),
    trim_or_empty(iban_gbp),
    trim_or_empty(bank_note),
    western_union,
    ria,
  )
}

fn checkout_methods_json(
  iban_try: String,
  iban_eur: String,
  iban_usd: String,
  iban_gbp: String,
  bank_note: String,
  western_union: String,
  ria: String,
) -> String {
  json.object([
    #(
      "bank_transfer",
      json.object([
        #("iban_try", json.string(iban_try)),
        #("iban_eur", json.string(iban_eur)),
        #("iban_usd", json.string(iban_usd)),
        #("iban_gbp", json.string(iban_gbp)),
        #("note", json.string(bank_note)),
      ]),
    ),
    #("western_union", json.string(western_union)),
    #("ria", json.string(ria)),
  ])
  |> json.to_string
}

/// GET /api/v1/payments/checkout-methods — vitrin ödeme talimatları (herkese açık)
pub fn get_checkout_payment_methods(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let #(iban_try, iban_eur, iban_usd, iban_gbp, bank_note, western_union, ria) =
    checkout_methods_from_db(ctx.db)
  let body =
    checkout_methods_json(
      iban_try,
      iban_eur,
      iban_usd,
      iban_gbp,
      bank_note,
      western_union,
      ria,
    )
  wisp.json_response(body, 200)
}

/// GET /api/v1/payments/active-provider
pub fn get_active_provider(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select code::text, display_name::text from payment_providers where is_active = true limit 1",
    )
    |> pog.returning({
      use c <- decode.field(0, decode.string)
      use d <- decode.field(1, decode.string)
      decode.success(#(c, d))
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> {
          let body =
            json.object([#("active", json.null())])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        [#(code, name)] -> {
          let body =
            json.object([
              #("active", json.string(code)),
              #("display_name", json.string(name)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn set_decoder() -> decode.Decoder(String) {
  decode.field("code", decode.string, fn(code) { decode.success(code) })
}

/// POST /api/v1/payments/active-provider — `{ "code": "paytr" | "paratika" }` — `admin.integrations.write`
pub fn set_active_provider(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.write") {
        False -> json_err(403, "forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, set_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(code_raw) -> {
                  let code = string.lowercase(string.trim(code_raw))
                  case code == "paytr" || code == "paratika" {
                    False -> json_err(400, "invalid_code")
                    True ->
                      case
                        pog.transaction(ctx.db, fn(conn) {
                          case
                            pog.query(
                              "update payment_providers set is_active = false",
                            )
                            |> pog.execute(conn)
                          {
                            Error(_) -> Error("clear_failed")
                            Ok(_) ->
                              case
                                pog.query(
                                  "update payment_providers set is_active = true where code = $1 returning code::text",
                                )
                                |> pog.parameter(pog.text(code))
                                |> pog.returning(row_dec.col0_string())
                                |> pog.execute(conn)
                              {
                                Error(_) -> Error("update_failed")
                                Ok(ret) ->
                                  case ret.rows {
                                    [_] -> Ok(Nil)
                                    [] -> Error("unknown_provider")
                                    _ -> Error("unexpected_rows")
                                  }
                              }
                          }
                        })
                      {
                        Ok(_) -> {
                          let body =
                            json.object([
                              #("ok", json.bool(True)),
                              #("active", json.string(code)),
                            ])
                            |> json.to_string
                          wisp.json_response(body, 200)
                        }
                        Error(pog.TransactionQueryError(_)) ->
                          json_err(500, "transaction_failed")
                        Error(pog.TransactionRolledBack(msg)) ->
                          json_err(400, msg)
                      }
                  }
                }
              }
          }
      }
  }
}
