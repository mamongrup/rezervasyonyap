//// Acente — satır kalemlerinden tahmini komisyon (G3.2/G3.3; canlı hesap, tablo yok).

import gleam/dynamic/decode
import gleam/json
import gleam/string
import pog
import wisp.{type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn totals_row() -> decode.Decoder(#(String, String, String)) {
  use c <- decode.field(0, decode.string)
  use g <- decode.field(1, decode.string)
  use comm <- decode.field(2, decode.string)
  decode.success(#(c, g, comm))
}

/// `from` / `to` — `YYYY-MM-DD`; boşsa satış özeti ile aynı varsayılan aralık.
pub fn response(
  conn: pog.Connection,
  agency_org_id: String,
  from_q: String,
  to_q: String,
) -> Response {
  let sql =
    string.concat([
      "select count(distinct r.id)::text, coalesce(sum(li.line_total), 0)::text, coalesce(sum(li.line_total * (coalesce((select sac.commission_percent from supplier_agency_commissions sac where sac.supplier_organization_id = l.organization_id and sac.agency_organization_id is not distinct from r.agency_organization_id limit 1), (select sac.commission_percent from supplier_agency_commissions sac where sac.supplier_organization_id = l.organization_id and sac.agency_organization_id is null limit 1), 0::numeric) + coalesce((select sum(spr.extra_commission_percent) from supplier_promotion_fee_rules spr where spr.supplier_organization_id = l.organization_id), 0::numeric)) / 100.0), 0)::text from reservation_line_items li inner join reservations r on r.id = li.reservation_id inner join listings l on l.id = li.listing_id where r.agency_organization_id = $1::uuid and r.status in ('confirmed','completed') and r.created_at >= (case when trim($2) = '' then (current_date - interval '30 days')::timestamptz else trim($2)::date::timestamptz end) and r.created_at < (case when trim($3) = '' then (current_date + interval '1 day')::timestamptz else (trim($3)::date + interval '1 day')::timestamptz end)",
    ])
  case
    pog.query(sql)
    |> pog.parameter(pog.text(agency_org_id))
    |> pog.parameter(pog.text(from_q))
    |> pog.parameter(pog.text(to_q))
    |> pog.returning(totals_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "commission_accruals_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(500, "unexpected_accruals")
        [#(cnt, gross, comm)] -> {
          let body =
            json.object([
              #("reservation_count", json.string(cnt)),
              #("gross_total", json.string(gross)),
              #("commission_total", json.string(comm)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected_accruals")
      }
  }
}
