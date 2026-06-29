//// Sepet kur kilidi — currency_rates (TRY karşılığı) anlık görüntüsü.

import gleam/dict
import gleam/dynamic/decode
import gleam/float
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import travel/db/resilient_pog as db_exec

fn rate_row() -> decode.Decoder(#(String, Float)) {
  use code <- decode.field(0, decode.string)
  use r <- decode.field(1, decode.float)
  decode.success(#(code, r))
}

fn norm_code(raw: String) -> String {
  string.uppercase(string.trim(raw))
}

/// `rates_to_try`: 1 birim `code` = `rate` TRY.
fn rate_to_try(code: String, rates: dict.Dict(String, Float)) -> option.Option(Float) {
  let c = norm_code(code)
  case c == "TRY" {
    True -> Some(1.0)
    False ->
      case dict.get(rates, c) {
        Ok(r) ->
          case r >. 0.0 {
            True -> Some(r)
            False -> None
          }
        Error(_) -> None
      }
  }
}

pub fn parse_rates_to_try_from_snapshot(snap_text: String) -> dict.Dict(String, Float) {
  case json.parse(snap_text, decode.at(["rates_to_try"], decode.dict(decode.string, decode.float))) {
    Ok(raw) ->
      dict.fold(raw, dict.new(), fn(acc, k, v) {
        dict.insert(acc, norm_code(k), v)
      })
    Error(_) -> dict.new()
  }
}

pub fn can_convert_between(
  from_code: String,
  to_code: String,
  snap_text: String,
) -> Bool {
  let rates = parse_rates_to_try_from_snapshot(snap_text)
  case rate_to_try(from_code, rates), rate_to_try(to_code, rates) {
    Some(_), Some(_) -> True
    _, _ -> False
  }
}

pub fn convert_amount_with_snapshot(
  amount: Float,
  from_code: String,
  to_code: String,
  snap_text: String,
) -> Result(Float, String) {
  let from = norm_code(from_code)
  let to = norm_code(to_code)
  case from == to {
    True -> Ok(amount)
    False -> {
      let rates = parse_rates_to_try_from_snapshot(snap_text)
      case rate_to_try(from, rates), rate_to_try(to, rates) {
        Some(rf), Some(rt) -> Ok(amount *. rf /. rt)
        _, _ -> Error("fx_rate_missing")
      }
    }
  }
}

pub fn load_cart_fx_snapshot(conn: pog.Connection, cart_id: String) -> String {
  case
    pog.query(
      "select coalesce(fx_snapshot_json::text, '{}') from carts where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> "{}"
    Ok(ret) ->
      case ret.rows {
        [s] -> s
        _ -> "{}"
      }
  }
}

fn price_close_enough(client: Float, expected: Float) -> Bool {
  let diff = float.absolute_value(client -. expected)
  let tol = case expected >. 0.0 {
    True -> float.max(0.5, expected *. 0.02)
    False -> 0.5
  }
  diff <=. tol
}

pub fn price_matches_cart_currency(
  client_price: String,
  expected_listing_amount: Float,
  listing_cc: String,
  cart_cc: String,
  snap_text: String,
) -> Bool {
  case float.parse(string.trim(client_price)) {
    Error(_) -> False
    Ok(client_total) ->
      case norm_code(listing_cc) == norm_code(cart_cc) {
        True -> price_close_enough(client_total, expected_listing_amount)
        False ->
          case convert_amount_with_snapshot(
            expected_listing_amount,
            listing_cc,
            cart_cc,
            snap_text,
          ) {
            Ok(expected_cart) -> price_close_enough(client_total, expected_cart)
            Error(_) -> False
          }
      }
  }
}

/// Veritabanı zamanı ile kur kilidini uygular (sepet oluşturma).
pub fn build_fx_snapshot_value(pairs: List(#(String, Float)), locked_at_iso: String) -> json.Json {
  let rates_dict =
    list.fold(pairs, dict.new(), fn(d, pair) {
      let #(code, rate) = pair
      dict.insert(d, code, json.float(rate))
    })
    |> dict.insert("TRY", json.float(1.0))
  let rates_json = json.object(dict.to_list(rates_dict))
  json.object([
    #("policy", json.string("reference_try")),
    #("quote_currency", json.string("TRY")),
    #("locked_at", json.string(locked_at_iso)),
    #("rates_to_try", rates_json),
  ])
}

/// Veritabanı zamanı ile kur kilidini uygular (sepet oluşturma).
pub fn lock_cart_fx(conn: pog.Connection, cart_id: String) -> Result(json.Json, String) {
  case
    pog.query(
      "select to_char(statement_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')",
    )
    |> pog.returning({
      use s <- decode.field(0, decode.string)
      decode.success(s)
    })
    |> pog.execute(conn)
  {
    Error(_) -> Error("fx_timestamp_failed")
    Ok(ts_row) ->
      case ts_row.rows {
        [] -> Error("fx_timestamp_empty")
        [locked_at_iso] -> {
          case
            pog.query(
              "select base_code::text, rate::float8 from ( select distinct on (base_code) base_code, rate from currency_rates where quote_code = 'TRY' order by base_code, fetched_at desc ) q",
            )
            |> pog.returning(rate_row())
            |> pog.execute(conn)
          {
            Error(_) -> Error("fx_rates_query_failed")
            Ok(rows_ret) -> {
              let snap_value = build_fx_snapshot_value(rows_ret.rows, locked_at_iso)
              let snap = json.to_string(snap_value)
              case
                pog.query(
                  "update carts set fx_locked_at = statement_timestamp(), fx_snapshot_json = $1::jsonb where id = $2::uuid",
                )
                |> pog.parameter(pog.text(snap))
                |> pog.parameter(pog.text(cart_id))
                |> pog.execute(conn)
              {
                Ok(_) -> Ok(snap_value)
                Error(_) -> Error("fx_cart_update_failed")
              }
            }
          }
        }
        _ -> Error("fx_timestamp_unexpected")
      }
  }
}
