//// Sepet kur kilidi — currency_rates (TRY karşılığı) anlık görüntüsü.

import gleam/dict
import gleam/dynamic/decode
import gleam/json
import gleam/list
import pog

fn rate_row() -> decode.Decoder(#(String, Float)) {
  use code <- decode.field(0, decode.string)
  use r <- decode.field(1, decode.float)
  decode.success(#(code, r))
}

/// `currency_rates` içinden quote=TRY için son kurları çeker, JSON nesnesi üretir.
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
