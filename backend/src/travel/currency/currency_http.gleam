//// Para birimleri ve güncel kurlar (040_currency + TCMB).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/string
import pog
import travel/currency/tcmb
import travel/db/decode_helpers as row_dec
import travel/identity/permissions
import travel/net/http_client
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn currency_row() -> decode.Decoder(#(String, String, String, Int, Bool, Int)) {
  use code <- decode.field(0, decode.string)
  use name <- decode.field(1, decode.string)
  use sym <- decode.field(2, decode.string)
  use dp <- decode.field(3, decode.int)
  use active <- decode.field(4, decode.bool)
  use so <- decode.field(5, decode.int)
  decode.success(#(code, name, sym, dp, active, so))
}

fn rate_row() -> decode.Decoder(#(String, String, Float, String, String)) {
  use b <- decode.field(0, decode.string)
  use q <- decode.field(1, decode.string)
  use r <- decode.field(2, decode.float)
  use src <- decode.field(3, decode.string)
  use at <- decode.field(4, decode.string)
  decode.success(#(b, q, r, src, at))
}

/// GET /api/v1/currency/currencies
pub fn list_currencies(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select code::text, name, coalesce(symbol, ''), decimal_places, is_active, sort_order from currencies order by sort_order asc, code asc",
    )
    |> pog.returning(currency_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "currencies_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(row) {
          let #(code, name, sym, dp, active, so) = row
          json.object([
            #("code", json.string(code)),
            #("name", json.string(name)),
            #("symbol", json.string(sym)),
            #("decimal_places", json.int(dp)),
            #("is_active", json.bool(active)),
            #("sort_order", json.int(so)),
          ])
        })
      let body =
        json.object([#("currencies", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/currency/rates — her çift için son kayıt.
pub fn list_latest_rates(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let sql =
    "select distinct on (base_code, quote_code) base_code::text, quote_code::text, rate::float8, source, fetched_at::text from currency_rates order by base_code, quote_code, fetched_at desc"
  case
    pog.query(sql)
    |> pog.returning(rate_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "rates_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(row) {
          let #(b, q, r, src, at) = row
          json.object([
            #("base_code", json.string(b)),
            #("quote_code", json.string(q)),
            #("rate", json.float(r)),
            #("source", json.string(src)),
            #("fetched_at", json.string(at)),
          ])
        })
      let body =
        json.object([#("rates", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn create_currency_decoder() -> decode.Decoder(#(String, String, String, Int, Bool)) {
  decode.field("code", decode.string, fn(code_raw) {
    decode.field("name", decode.string, fn(name_raw) {
      decode.optional_field("symbol", "", decode.string, fn(sym) {
        decode.optional_field("decimal_places", 2, decode.int, fn(dp) {
          decode.optional_field("is_active", True, decode.bool, fn(active) {
            decode.success(#(code_raw, name_raw, sym, dp, active))
          })
        })
      })
    })
  })
}

/// POST /api/v1/currency/currencies — yeni para birimi (yönetici oturumu).
pub fn create_currency(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "forbidden")
        True ->
          case wisp.read_body_bits(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(bits) ->
              case bit_array.to_string(bits) {
                Error(_) -> json_err(400, "invalid_body")
                Ok(body_str) ->
                  case json.parse(body_str, create_currency_decoder()) {
                    Error(_) -> json_err(400, "invalid_json")
                    Ok(#(code_raw, name_raw, sym_raw, dp, active)) -> {
                      let trimmed = string.uppercase(string.trim(code_raw))
                      let code = string.slice(trimmed, 0, 3)
                      let name = string.trim(name_raw)
                      let sym = string.trim(sym_raw)
                      case string.length(code) != 3 || name == "" {
                        True -> json_err(400, "invalid_code_or_name")
                        False -> {
                          let sym_param = case sym == "" {
                            True -> pog.null()
                            False -> pog.text(sym)
                          }
                          let dp_safe = case dp >= 0 && dp <= 8 {
                            True -> dp
                            False -> 2
                          }
                          case
                            pog.query(
                              "insert into currencies (code, name, symbol, decimal_places, is_active, sort_order) values ($1::bpchar, $2, $3, $4, $5, (select coalesce(max(sort_order), -1) + 1 from currencies c2)) on conflict (code) do update set name = excluded.name, symbol = excluded.symbol, decimal_places = excluded.decimal_places, is_active = excluded.is_active returning code::text, name, coalesce(symbol, ''), decimal_places, is_active, sort_order",
                            )
                            |> pog.parameter(pog.text(code))
                            |> pog.parameter(pog.text(name))
                            |> pog.parameter(sym_param)
                            |> pog.parameter(pog.int(dp_safe))
                            |> pog.parameter(pog.bool(active))
                            |> pog.returning(currency_row())
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "currency_save_failed")
                            Ok(ret) ->
                              case ret.rows {
                                [row] -> {
                                  let #(c, n, s, d, ia, so) = row
                                  let out =
                                    json.object([
                                      #("code", json.string(c)),
                                      #("name", json.string(n)),
                                      #("symbol", json.string(s)),
                                      #("decimal_places", json.int(d)),
                                      #("is_active", json.bool(ia)),
                                      #("sort_order", json.int(so)),
                                    ])
                                    |> json.to_string
                                  wisp.json_response(out, 201)
                                }
                                _ -> json_err(500, "unexpected_return")
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

fn patch_currency_active_decoder() -> decode.Decoder(Bool) {
  decode.field("is_active", decode.bool, fn(b) { decode.success(b) })
}

/// PATCH /api/v1/currency/currencies/:code — `{ "is_active": true|false }` (yönetici).
pub fn patch_currency_active(req: Request, ctx: Context, code_raw: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "forbidden")
        True ->
          case wisp.read_body_bits(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(bits) ->
              case bit_array.to_string(bits) {
                Error(_) -> json_err(400, "invalid_body")
                Ok(body_str) ->
                  case json.parse(body_str, patch_currency_active_decoder()) {
                    Error(_) -> json_err(400, "invalid_json")
                    Ok(is_active) -> {
                      let trimmed = string.uppercase(string.trim(code_raw))
                      let code = string.slice(trimmed, 0, 3)
                      case string.length(code) != 3 {
                        True -> json_err(400, "invalid_code")
                        False ->
                          case
                            pog.query(
                              "update currencies set is_active = $1 where code = $2::bpchar returning code::text, name, coalesce(symbol, ''), decimal_places, is_active, sort_order",
                            )
                            |> pog.parameter(pog.bool(is_active))
                            |> pog.parameter(pog.text(code))
                            |> pog.returning(currency_row())
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "patch_failed")
                            Ok(ret) ->
                              case ret.rows {
                                [] -> json_err(404, "currency_not_found")
                                [row] -> {
                                  let #(c, n, s, d, ia, so) = row
                                  let out =
                                    json.object([
                                      #("code", json.string(c)),
                                      #("name", json.string(n)),
                                      #("symbol", json.string(s)),
                                      #("decimal_places", json.int(d)),
                                      #("is_active", json.bool(ia)),
                                      #("sort_order", json.int(so)),
                                    ])
                                    |> json.to_string
                                  wisp.json_response(out, 200)
                                }
                                _ -> json_err(500, "unexpected")
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

fn reorder_codes_decoder() -> decode.Decoder(List(String)) {
  decode.field("codes", decode.list(decode.string), fn(codes) { decode.success(codes) })
}

fn apply_currency_order_loop(
  ctx: Context,
  codes: List(String),
  idx: Int,
) -> Result(Nil, String) {
  case codes {
    [] -> Ok(Nil)
    [raw, ..rest] -> {
      let trimmed = string.uppercase(string.trim(raw))
      let code = string.slice(trimmed, 0, 3)
      case string.length(code) != 3 {
        True -> Error("bad_code")
        False ->
          case
            pog.query(
              "update currencies set sort_order = $1 where code = $2::bpchar",
            )
            |> pog.parameter(pog.int(idx))
            |> pog.parameter(pog.text(code))
            |> pog.execute(ctx.db)
          {
            Error(_) -> Error("order_update_failed")
            Ok(_) -> apply_currency_order_loop(ctx, rest, idx + 1)
          }
      }
    }
  }
}

/// Ortak gövde: PUT ve POST (bazı proxy’lerde PUT 404 dönebiliyor).
fn save_currencies_order(req: Request, ctx: Context) -> Response {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "forbidden")
        True ->
          case wisp.read_body_bits(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(bits) ->
              case bit_array.to_string(bits) {
                Error(_) -> json_err(400, "invalid_body")
                Ok(body_str) ->
                  case json.parse(body_str, reorder_codes_decoder()) {
                    Error(_) -> json_err(400, "invalid_json")
                    Ok(codes) ->
                      case apply_currency_order_loop(ctx, codes, 0) {
                        Error(msg) -> json_err(500, msg)
                        Ok(_) -> {
                          let body =
                            json.object([#("ok", json.bool(True))])
                            |> json.to_string
                          wisp.json_response(body, 200)
                        }
                      }
                  }
              }
          }
      }
  }
}

/// PUT /api/v1/currency/currencies/order — `{ "codes": ["TRY","EUR",...] }`
pub fn put_currencies_order(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Put)
  save_currencies_order(req, ctx)
}

/// POST /api/v1/currency/currencies/order — PUT ile aynı gövde (önerilen; proxy uyumu).
pub fn post_currencies_order(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  save_currencies_order(req, ctx)
}

/// POST /api/v1/currency/rates/refresh — TCMB today.xml ile TRY karşılıklarını yazar — `admin.users.read`
pub fn refresh_tcmb_rates(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "forbidden")
        True ->
          case http_client.get_url(tcmb.tcmb_today_xml_url) {
            Error(e) -> json_err(502, string.append("tcmb_fetch_failed: ", e))
            Ok(body) -> {
              let parsed = tcmb.parse_today_xml(body)
              case
                pog.query("select now()::text")
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "timestamp_failed")
                Ok(ts_row) ->
                  case ts_row.rows {
                    [ts] -> insert_rates_batch(ctx, parsed, ts)
                    _ -> json_err(500, "no_timestamp")
                  }
              }
            }
          }
      }
  }
}

fn insert_rates_batch(
  ctx: Context,
  rates: List(#(String, Float)),
  fetched_at: String,
) -> Response {
  let try_pair =
    list.filter(rates, fn(p) { p.0 != "TRY" })
  case
    pog.query(
      "select code::text from currencies where is_active = true",
    )
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "currencies_lookup_failed")
    Ok(codes_ret) -> {
      let allowed = codes_ret.rows
      let to_insert =
        list.filter(try_pair, fn(p) {
          list.contains(allowed, p.0) || list.contains(allowed, string.uppercase(p.0))
        })      let count =
        list.fold(to_insert, 0, fn(acc, pair) {
          let #(code, rate) = pair
          case
            pog.query(
              "insert into currency_rates (base_code, quote_code, rate, source, fetched_at) values ($1::char(3), 'TRY'::char(3), $2::numeric, $3, now())",
            )
            |> pog.parameter(pog.text(code))
            |> pog.parameter(pog.float(rate))
            |> pog.parameter(pog.text("tcmb"))
            |> pog.execute(ctx.db)
          {
            Ok(_) -> acc + 1
            Error(_) -> acc
          }
        })
      let body =
        json.object([
          #("ok", json.bool(True)),
          #("inserted", json.int(count)),
          #("fetched_at", json.string(fetched_at)),
          #("pairs_seen", json.int(list.length(rates))),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}
