//// Ödeme onayı sonrası `commission_accrual_lines` senkronu (satır kalemi başına).

import gleam/string
import pog

/// Silip yeniden yazar; rezervasyonda satır yoksa yalnızca siler.
pub fn sync_reservation(conn: pog.Connection, reservation_id: String) -> Result(Nil, String) {
  let rid = string.trim(reservation_id)
  case rid == "" {
    True -> Error("empty_reservation_id")
    False ->
      case
        pog.query("delete from commission_accrual_lines where reservation_id = $1::uuid")
        |> pog.parameter(pog.text(rid))
        |> pog.execute(conn)
      {
        Error(_) -> Error("commission_accrual_delete_failed")
        Ok(_) ->
          case
            pog.query(
              "insert into commission_accrual_lines (reservation_id, reservation_line_item_id, supplier_organization_id, agency_organization_id, currency_code, gross_amount, commission_percent, commission_amount, status, source) select r.id, li.id, l.organization_id, r.agency_organization_id, l.currency_code, li.line_total, fn_effective_commission_pct(l.organization_id, r.agency_organization_id), round(li.line_total * fn_effective_commission_pct(l.organization_id, r.agency_organization_id) / 100.0, 2), 'final', 'payment_capture' from reservation_line_items li inner join reservations r on r.id = li.reservation_id inner join listings l on l.id = li.listing_id where r.id = $1::uuid",
            )
            |> pog.parameter(pog.text(rid))
            |> pog.execute(conn)
          {
            Error(_) -> Error("commission_accrual_insert_failed")
            Ok(_) -> Ok(Nil)
          }
      }
  }
}
