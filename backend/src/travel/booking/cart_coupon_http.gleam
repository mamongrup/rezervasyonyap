//// Sepete kupon iliştirme / kaldırma + indirimli toplam.
////
//// Tek sepette tek kupon kuralı (cart_coupons.cart_id PRIMARY KEY).
//// Backend, kuponun aktif & süresi içinde olduğunu doğrular; UI yalnızca
//// kullanıcı tarafına `is_public` filtreli kuponları listeler ama burada
//// `code` üzerinden gizli kuponlar da uygulanabilir.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/float
import gleam/http
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import wisp.{type Request, type Response}

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

fn parse_numeric_text(s: String) -> Float {
  case float.parse(s) {
    Ok(f) -> f
    Error(_) ->
      case int.parse(s) {
        Ok(n) -> int.to_float(n)
        Error(_) -> 0.0
      }
  }
}

fn round_2(x: Float) -> Float {
  let n = float.round(x *. 100.0)
  int.to_float(n) /. 100.0
}

fn calc_discount(
  discount_type: String,
  discount_value: Float,
  subtotal: Float,
) -> Float {
  case string.lowercase(discount_type) {
    "percent" -> round_2(subtotal *. discount_value /. 100.0)
    "fixed" ->
      case discount_value >. subtotal {
        True -> subtotal
        False -> discount_value
      }
    _ -> 0.0
  }
}

fn cart_subtotal(conn: pog.Connection, cart_id: String) -> Result(Float, String) {
  case
    pog.query(
      "select coalesce(sum(quantity * unit_price), 0)::text from cart_lines where cart_id = $1::uuid",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("cart_subtotal_failed")
    Ok(r) ->
      case r.rows {
        [s] -> Ok(parse_numeric_text(s))
        _ -> Ok(0.0)
      }
  }
}

fn apply_decoder() -> decode.Decoder(String) {
  decode.field("code", decode.string, fn(c) { decode.success(string.trim(c)) })
}

/// POST /api/v1/carts/:id/apply-coupon { code }
/// 200 → { ok, code, discount_amount, subtotal, total }
/// 4xx → { error: 'coupon_not_found' | 'coupon_expired' | 'coupon_max_uses' }
pub fn apply_coupon(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, apply_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(code_raw) -> {
          let code = string.uppercase(code_raw)
          case code {
            "" -> json_err(400, "code_required")
            _ -> apply_inner(ctx, cart_id, code)
          }
        }
      }
  }
}

fn lookup_decoder() {
  use id <- decode.field(0, decode.string)
  use dt <- decode.field(1, decode.string)
  use dv <- decode.field(2, decode.string)
  use mx <- decode.field(3, decode.string)
  use uc <- decode.field(4, decode.string)
  use moa <- decode.field(5, decode.string)
  use cats <- decode.field(6, decode.string)
  decode.success(#(id, dt, dv, mx, uc, moa, cats))
}

const lookup_sql = "select id::text, discount_type, discount_value::text, coalesce(max_uses::text,''), used_count::text, coalesce(min_order_amount::text, '0'), coalesce(array_to_string(allowed_category_codes, ','), '') from coupons where upper(code) = $1 and (valid_from is null or valid_from <= now()) and (valid_to is null or valid_to >= now()) limit 1"

fn cart_category_codes(
  conn: pog.Connection,
  cart_id: String,
) -> List(String) {
  case
    pog.query(
      "select coalesce(string_agg(distinct pc.code, ','), '') from cart_lines cl join listings l on l.id = cl.listing_id join product_categories pc on pc.id = l.category_id where cl.cart_id = $1::uuid",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Ok(r) ->
      case r.rows {
        [s] ->
          string.split(s, ",")
          |> list.map(string.trim)
          |> list.filter(fn(x) { x != "" })
        _ -> []
      }
    Error(_) -> []
  }
}

fn allowed_categories_match(
  allowed_csv: String,
  cart_codes: List(String),
) -> Bool {
  let allowed =
    string.split(allowed_csv, ",")
    |> list.map(string.trim)
    |> list.filter(fn(x) { x != "" })
  case allowed {
    [] -> True
    _ -> list.any(cart_codes, fn(c) { list.contains(allowed, c) })
  }
}

fn apply_inner(ctx: Context, cart_id: String, code: String) -> Response {
  case
    pog.query(lookup_sql)
    |> pog.parameter(pog.text(code))
    |> pog.returning(lookup_decoder())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "coupon_lookup_failed")
    Ok(r) ->
      case r.rows {
        [] -> json_err(404, "coupon_not_found_or_expired")
        [#(coupon_id, dt, dv, mx_raw, uc_raw, moa_raw, cats_csv)] -> {
          let mx = case string.trim(mx_raw) == "" {
            True -> -1
            False ->
              case int.parse(mx_raw) {
                Ok(n) -> n
                Error(_) -> -1
              }
          }
          let uc = case int.parse(uc_raw) {
            Ok(n) -> n
            Error(_) -> 0
          }
          case mx > 0 && uc >= mx {
            True -> json_err(409, "coupon_max_uses")
            False ->
              persist_apply(
                ctx,
                cart_id,
                coupon_id,
                code,
                dt,
                dv,
                moa_raw,
                cats_csv,
              )
          }
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn persist_apply(
  ctx: Context,
  cart_id: String,
  coupon_id: String,
  code: String,
  dt: String,
  dv_raw: String,
  min_order_raw: String,
  allowed_cats_csv: String,
) -> Response {
  let dv = parse_numeric_text(dv_raw)
  case cart_subtotal(ctx.db, cart_id) {
    Error(e) -> json_err(500, e)
    Ok(sub) -> {
      let min_order = parse_numeric_text(min_order_raw)
      case sub <. min_order {
        True -> json_err(409, "coupon_min_order_not_met")
        False -> {
          let cart_cats = cart_category_codes(ctx.db, cart_id)
          case allowed_categories_match(allowed_cats_csv, cart_cats) {
            False -> json_err(409, "coupon_category_not_allowed")
            True -> persist_apply_inner(ctx, cart_id, coupon_id, code, dt, dv, sub)
          }
        }
      }
    }
  }
}

fn persist_apply_inner(
  ctx: Context,
  cart_id: String,
  coupon_id: String,
  code: String,
  dt: String,
  dv: Float,
  sub: Float,
) -> Response {
  let discount = calc_discount(dt, dv, sub)
  let total = sub -. discount
  case
    pog.query(
      "insert into cart_coupons (cart_id, coupon_id, code, discount_type, discount_value) values ($1::uuid, $2::uuid, $3, $4, $5::numeric) on conflict (cart_id) do update set coupon_id = EXCLUDED.coupon_id, code = EXCLUDED.code, discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, applied_at = now() returning cart_id::text",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.parameter(pog.text(coupon_id))
    |> pog.parameter(pog.text(code))
    |> pog.parameter(pog.text(dt))
    |> pog.parameter(pog.text(float.to_string(dv)))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "apply_failed")
    Ok(_) -> {
      let body =
        json.object([
          #("ok", json.bool(True)),
          #("code", json.string(code)),
          #("discount_amount", json.string(float.to_string(discount))),
          #("subtotal", json.string(float.to_string(sub))),
          #("total", json.string(float.to_string(total))),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// DELETE /api/v1/carts/:id/coupon
pub fn remove_coupon(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case
    pog.query("delete from cart_coupons where cart_id = $1::uuid")
    |> pog.parameter(pog.text(cart_id))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "remove_failed")
    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
  }
}

/// GET /api/v1/public/coupons/validate?code=XYZ&subtotal=1500.00
/// Sepet kimliğine ihtiyaç duymayan ön-doğrulama (UX: kullanıcı uygula öncesi anında geri bildirim alır).
pub fn validate_public(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qp = wisp.get_query(req)
  let code_raw =
    list.find(qp, fn(p) { p.0 == "code" })
    |> result.map(fn(p) { p.1 })
    |> result.unwrap("")
  let subtotal_raw =
    list.find(qp, fn(p) { p.0 == "subtotal" })
    |> result.map(fn(p) { p.1 })
    |> result.unwrap("0")
  let code = string.uppercase(string.trim(code_raw))
  case code == "" {
    True -> json_err(400, "code_required")
    False -> {
      let subtotal = parse_numeric_text(subtotal_raw)
      case
        pog.query(lookup_sql)
        |> pog.parameter(pog.text(code))
        |> pog.returning(lookup_decoder())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "validate_failed")
        Ok(r) ->
          case r.rows {
            [] -> json_err(404, "coupon_not_found_or_expired")
            [#(_id, dt, dv_raw, mx_raw, uc_raw, moa_raw, _cats)] -> {
              let mx = case string.trim(mx_raw) == "" {
                True -> -1
                False ->
                  case int.parse(mx_raw) {
                    Ok(n) -> n
                    Error(_) -> -1
                  }
              }
              let uc = case int.parse(uc_raw) {
                Ok(n) -> n
                Error(_) -> 0
              }
              let min_order = parse_numeric_text(moa_raw)
              case mx > 0 && uc >= mx {
                True -> json_err(409, "coupon_max_uses")
                False ->
                  case subtotal <. min_order && subtotal >. 0.0 {
                    True -> json_err(409, "coupon_min_order_not_met")
                    False -> {
                      let dv = parse_numeric_text(dv_raw)
                      let discount = calc_discount(dt, dv, subtotal)
                      let body =
                        json.object([
                          #("ok", json.bool(True)),
                          #("code", json.string(code)),
                          #("discount_type", json.string(dt)),
                          #("discount_value", json.string(dv_raw)),
                          #(
                            "discount_amount",
                            json.string(float.to_string(discount)),
                          ),
                          #(
                            "min_order_amount",
                            json.string(float.to_string(min_order)),
                          ),
                        ])
                        |> json.to_string
                      wisp.json_response(body, 200)
                    }
                  }
              }
            }
            _ -> json_err(500, "unexpected")
          }
      }
    }
  }
}

/// GET /api/v1/carts/:id/totals — alt toplam + uygulanmış kupon (varsa) + total.
pub fn get_totals(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case cart_subtotal(ctx.db, cart_id) {
    Error(e) -> json_err(500, e)
    Ok(sub) -> {
      case
        pog.query(
          "select code, discount_type, discount_value::text from cart_coupons where cart_id = $1::uuid",
        )
        |> pog.parameter(pog.text(cart_id))
        |> pog.returning({
          use code <- decode.field(0, decode.string)
          use dt <- decode.field(1, decode.string)
          use dv <- decode.field(2, decode.string)
          decode.success(#(code, dt, dv))
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "totals_failed")
        Ok(r) ->
          case r.rows {
            [#(code, dt, dv_raw)] -> {
              let dv = parse_numeric_text(dv_raw)
              let discount = calc_discount(dt, dv, sub)
              let total = sub -. discount
              let body =
                json.object([
                  #("subtotal", json.string(float.to_string(sub))),
                  #("discount_amount", json.string(float.to_string(discount))),
                  #("total", json.string(float.to_string(total))),
                  #(
                    "coupon",
                    json.object([
                      #("code", json.string(code)),
                      #("discount_type", json.string(dt)),
                      #("discount_value", json.string(dv_raw)),
                    ]),
                  ),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> {
              let body =
                json.object([
                  #("subtotal", json.string(float.to_string(sub))),
                  #("discount_amount", json.string("0")),
                  #("total", json.string(float.to_string(sub))),
                  #("coupon", json.null()),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
    }
  }
}
