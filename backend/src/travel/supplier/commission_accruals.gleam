//// Tedarikçi — satır kalemlerinden tahmini komisyon + acente kırılımı (G3.3; canlı hesap).

import gleam/dynamic/decode
import gleam/json
import gleam/list
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

fn by_agency_row() -> decode.Decoder(#(String, String, String)) {
  use aid <- decode.field(0, decode.string)
  use g <- decode.field(1, decode.string)
  use comm <- decode.field(2, decode.string)
  decode.success(#(aid, g, comm))
}

pub fn response(
  conn: pog.Connection,
  supplier_org_id: String,
  from_q: String,
  to_q: String,
) -> Response {
  let sum_sql =
    string.concat([
      "select count(distinct r.id)::text, coalesce(sum(li.line_total), 0)::text, coalesce(sum(li.line_total * (coalesce((select sac.commission_percent from supplier_agency_commissions sac where sac.supplier_organization_id = l.organization_id and sac.agency_organization_id is not distinct from r.agency_organization_id limit 1), (select sac.commission_percent from supplier_agency_commissions sac where sac.supplier_organization_id = l.organization_id and sac.agency_organization_id is null limit 1), 0::numeric) + coalesce((select sum(spr.extra_commission_percent) from supplier_promotion_fee_rules spr where spr.supplier_organization_id = l.organization_id), 0::numeric)) / 100.0), 0)::text from reservation_line_items li inner join reservations r on r.id = li.reservation_id inner join listings l on l.id = li.listing_id where l.organization_id = $1::uuid and r.status in ('confirmed','completed') and r.created_at >= (case when trim($2) = '' then (current_date - interval '30 days')::timestamptz else trim($2)::date::timestamptz end) and r.created_at < (case when trim($3) = '' then (current_date + interval '1 day')::timestamptz else (trim($3)::date + interval '1 day')::timestamptz end)",
    ])
  let grp_sql =
    string.concat([
      "select coalesce(r.agency_organization_id::text, ''), coalesce(sum(li.line_total), 0)::text, coalesce(sum(li.line_total * (coalesce((select sac.commission_percent from supplier_agency_commissions sac where sac.supplier_organization_id = l.organization_id and sac.agency_organization_id is not distinct from r.agency_organization_id limit 1), (select sac.commission_percent from supplier_agency_commissions sac where sac.supplier_organization_id = l.organization_id and sac.agency_organization_id is null limit 1), 0::numeric) + coalesce((select sum(spr.extra_commission_percent) from supplier_promotion_fee_rules spr where spr.supplier_organization_id = l.organization_id), 0::numeric)) / 100.0), 0)::text from reservation_line_items li inner join reservations r on r.id = li.reservation_id inner join listings l on l.id = li.listing_id where l.organization_id = $1::uuid and r.status in ('confirmed','completed') and r.created_at >= (case when trim($2) = '' then (current_date - interval '30 days')::timestamptz else trim($2)::date::timestamptz end) and r.created_at < (case when trim($3) = '' then (current_date + interval '1 day')::timestamptz else (trim($3)::date + interval '1 day')::timestamptz end) group by r.agency_organization_id order by r.agency_organization_id nulls last",
    ])
  case
    pog.query(sum_sql)
    |> pog.parameter(pog.text(supplier_org_id))
    |> pog.parameter(pog.text(from_q))
    |> pog.parameter(pog.text(to_q))
    |> pog.returning(totals_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "commission_accruals_failed")
    Ok(tot_ret) ->
      case tot_ret.rows {
        [] -> json_err(500, "unexpected_accruals")
        [#(cnt, gross, comm)] ->
          case
            pog.query(grp_sql)
            |> pog.parameter(pog.text(supplier_org_id))
            |> pog.parameter(pog.text(from_q))
            |> pog.parameter(pog.text(to_q))
            |> pog.returning(by_agency_row())
            |> pog.execute(conn)
          {
            Error(_) -> json_err(500, "commission_accruals_by_agency_failed")
            Ok(grp_ret) -> {
              let arr =
                list.map(grp_ret.rows, fn(row) {
                  let #(aid, g, c) = row
                  let agency_j = case string.trim(aid) == "" {
                    True -> json.null()
                    False -> json.string(string.trim(aid))
                  }
                  json.object([
                    #("agency_organization_id", agency_j),
                    #("gross_total", json.string(g)),
                    #("commission_total", json.string(c)),
                  ])
                })
              let body =
                json.object([
                  #("reservation_count", json.string(cnt)),
                  #("gross_total", json.string(gross)),
                  #("commission_total", json.string(comm)),
                  #("by_agency", json.preprocessed_array(arr)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        _ -> json_err(500, "unexpected_accruals")
      }
  }
}
