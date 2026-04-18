//// Acente satış özeti — `price_breakdown_json.total` toplamı + durum kırılımı (G3.2).

import gleam/dynamic/decode
import gleam/http/request
import gleam/json
import gleam/list
import gleam/string
import pog
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn summary_totals_row() -> decode.Decoder(#(String, String, String, String)) {
  use c <- decode.field(0, decode.string)
  use g <- decode.field(1, decode.string)
  use avg_pct <- decode.field(2, decode.string)
  use est_comm <- decode.field(3, decode.string)
  decode.success(#(c, g, avg_pct, est_comm))
}

fn status_count_row() -> decode.Decoder(#(String, String)) {
  use st <- decode.field(0, decode.string)
  use n <- decode.field(1, decode.string)
  decode.success(#(st, n))
}

const where_range: String = "r.agency_organization_id = $1::uuid and r.created_at >= (case when trim($2) = '' then (current_date - interval '30 days')::timestamptz else trim($2)::date::timestamptz end) and r.created_at < (case when trim($3) = '' then (current_date + interval '1 day')::timestamptz else (trim($3)::date + interval '1 day')::timestamptz end)"

/// `from` / `to` sorgu parametreleri: `YYYY-MM-DD`; boşsa son 30 gün / yarın 00:00 üst sınır.
pub fn response(
  conn: pog.Connection,
  org_id: String,
  from_q: String,
  to_q: String,
) -> Response {
  let sum_sql =
    string.concat([
      "select count(*)::text, coalesce(sum(case when trim(coalesce(price_breakdown_json->>'total','')) = '' then 0::numeric else (nullif(trim(price_breakdown_json->>'total'),''))::numeric end), 0)::text, coalesce((select avg(commission_percent) from supplier_agency_commissions where agency_organization_id = $1::uuid), 0)::text, (coalesce(sum(case when trim(coalesce(price_breakdown_json->>'total','')) = '' then 0::numeric else (nullif(trim(price_breakdown_json->>'total'),''))::numeric end), 0) * coalesce((select avg(commission_percent) from supplier_agency_commissions where agency_organization_id = $1::uuid), 0) / 100.0)::text from reservations r where ",
      where_range,
    ])
  case
    pog.query(sum_sql)
    |> pog.parameter(pog.text(org_id))
    |> pog.parameter(pog.text(from_q))
    |> pog.parameter(pog.text(to_q))
    |> pog.returning(summary_totals_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "summary_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(500, "unexpected_summary")
        [#(cnt, gross, avg_pct, est_comm)] -> {
          let st_sql =
            string.append(
              "select r.status::text, count(*)::text from reservations r where ",
              string.append(where_range, " group by r.status order by r.status"),
            )
          case
            pog.query(st_sql)
            |> pog.parameter(pog.text(org_id))
            |> pog.parameter(pog.text(from_q))
            |> pog.parameter(pog.text(to_q))
            |> pog.returning(status_count_row())
            |> pog.execute(conn)
          {
            Error(_) -> json_err(500, "status_breakdown_failed")
            Ok(st_ret) -> {
              let pairs =
                list.map(st_ret.rows, fn(row) {
                  let #(st, n) = row
                  #(st, json.string(n))
                })
              let by_status = json.object(pairs)
              let body =
                json.object([
                  #("reservation_count", json.string(cnt)),
                  #("gross_total", json.string(gross)),
                  #(
                    "average_commission_percent",
                    json.string(avg_pct),
                  ),
                  #("estimated_commission", json.string(est_comm)),
                  #("by_status", by_status),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
        _ -> json_err(500, "unexpected_summary")
      }
  }
}

/// Sorgu: `from`, `to` — `YYYY-MM-DD`.
pub fn query_range(req: Request) -> #(String, String) {
  case request.get_query(req) {
    Error(_) -> #("", "")
    Ok(q) -> {
      let f = case list.key_find(q, "from") {
        Ok(s) -> string.trim(s)
        Error(_) -> ""
      }
      let t = case list.key_find(q, "to") {
        Ok(s) -> string.trim(s)
        Error(_) -> ""
      }
      #(f, t)
    }
  }
}
