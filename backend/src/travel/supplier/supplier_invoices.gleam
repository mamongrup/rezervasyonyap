//// Tedarikçi faturaları — `commission_accrual_lines` üzerinden (191_supplier_invoices).

import backend/config.{type InvoiceNotifyConfig}
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/string
import pog
import travel/net/invoice_notify
import wisp.{type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn json_ok(obj: List(#(String, json.Json))) -> Response {
  let body =
    json.object(obj)
    |> json.to_string
  wisp.json_response(body, 200)
}

fn cal_date_filter() -> String {
  "cal.supplier_organization_id = $1::uuid and cal.supplier_invoice_id is null and cal.status = 'final' and cal.created_at >= (case when trim($2) = '' then (current_date - interval '30 days')::timestamptz else trim($2)::date::timestamptz end) and cal.created_at < (case when trim($3) = '' then (current_date + interval '1 day')::timestamptz else (trim($3)::date + interval '1 day')::timestamptz end)"
}

fn cal_date_filter_for_insert_lines() -> String {
  "cal.supplier_organization_id = $2::uuid and cal.supplier_invoice_id is null and cal.status = 'final' and cal.created_at >= (case when trim($3) = '' then (current_date - interval '30 days')::timestamptz else trim($3)::date::timestamptz end) and cal.created_at < (case when trim($4) = '' then (current_date + interval '1 day')::timestamptz else (trim($4)::date + interval '1 day')::timestamptz end) and cal.currency_code = $5"
}

fn cur_row() -> decode.Decoder(String) {
  use c <- decode.field(0, decode.string)
  decode.success(c)
}

fn sum_row() -> decode.Decoder(#(String, String, String)) {
  use n <- decode.field(0, decode.string)
  use g <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  decode.success(#(n, g, c))
}

fn invoice_list_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use pf <- decode.field(1, decode.string)
  use pt <- decode.field(2, decode.string)
  use cur <- decode.field(3, decode.string)
  use g <- decode.field(4, decode.string)
  use c <- decode.field(5, decode.string)
  use n <- decode.field(6, decode.string)
  use st <- decode.field(7, decode.string)
  use num <- decode.field(8, decode.string)
  use notes <- decode.field(9, decode.string)
  use created <- decode.field(10, decode.string)
  decode.success(#(id, pf, pt, cur, g, c, n, st, num, notes, created))
}

fn invoice_header_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use pf <- decode.field(1, decode.string)
  use pt <- decode.field(2, decode.string)
  use cur <- decode.field(3, decode.string)
  use g <- decode.field(4, decode.string)
  use c <- decode.field(5, decode.string)
  use n <- decode.field(6, decode.string)
  use st <- decode.field(7, decode.string)
  use num <- decode.field(8, decode.string)
  use notes <- decode.field(9, decode.string)
  use created <- decode.field(10, decode.string)
  decode.success(#(id, pf, pt, cur, g, c, n, st, num, notes, created))
}

fn invoice_line_row() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  use lid <- decode.field(0, decode.string)
  use cal_id <- decode.field(1, decode.string)
  use res_id <- decode.field(2, decode.string)
  use pcode <- decode.field(3, decode.string)
  use g <- decode.field(4, decode.string)
  use com <- decode.field(5, decode.string)
  use cur <- decode.field(6, decode.string)
  decode.success(#(lid, cal_id, res_id, pcode, g, com, cur))
}

fn id_row() -> decode.Decoder(String) {
  use id <- decode.field(0, decode.string)
  decode.success(id)
}

fn num_row() -> decode.Decoder(String) {
  use n <- decode.field(0, decode.string)
  decode.success(n)
}

fn normalize_currency(raw: String) -> String {
  string.trim(raw)
}

fn currency_ok_row() -> decode.Decoder(String) {
  use x <- decode.field(0, decode.string)
  decode.success(x)
}

fn currency_exists(conn: pog.Connection, code: String) -> Result(Bool, Response) {
  case
    pog.query(
      "select '1'::text from currencies where code = trim($1)::bpchar limit 1",
    )
    |> pog.parameter(pog.text(code))
    |> pog.returning(currency_ok_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(json_err(500, "currency_check_failed"))
    Ok(ret) ->
      case ret.rows {
        [] -> Ok(False)
        _ -> Ok(True)
      }
  }
}

pub fn list_response(conn: pog.Connection, supplier_org_id: String) -> Response {
  case
    pog.query(
      "select si.id::text, si.period_from::text, si.period_to::text, si.currency_code::text, si.gross_total::text, si.commission_total::text, si.line_count::text, si.status::text, si.invoice_number, coalesce(si.notes, '')::text, to_char(si.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from supplier_invoices si where si.supplier_organization_id = $1::uuid order by si.created_at desc limit 50",
    )
    |> pog.parameter(pog.text(supplier_org_id))
    |> pog.returning(invoice_list_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "list_invoices_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(row) {
          let #(id, pf, pt, cur, g, c, n, st, num, notes, created) = row
          json.object([
            #("id", json.string(id)),
            #("period_from", json.string(pf)),
            #("period_to", json.string(pt)),
            #("currency_code", json.string(cur)),
            #("gross_total", json.string(g)),
            #("commission_total", json.string(c)),
            #("line_count", json.string(n)),
            #("status", json.string(st)),
            #("invoice_number", json.string(num)),
            #("notes", json.string(notes)),
            #("created_at", json.string(created)),
          ])
        })
      json_ok([#("invoices", json.preprocessed_array(arr))])
    }
  }
}

pub fn get_invoice_response(
  conn: pog.Connection,
  supplier_org_id: String,
  invoice_id: String,
) -> Response {
  let head_sql =
    "select si.id::text, si.period_from::text, si.period_to::text, si.currency_code::text, si.gross_total::text, si.commission_total::text, si.line_count::text, si.status::text, si.invoice_number, coalesce(si.notes, '')::text, to_char(si.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from supplier_invoices si where si.id = $1::uuid and si.supplier_organization_id = $2::uuid"
  case
    pog.query(head_sql)
    |> pog.parameter(pog.text(invoice_id))
    |> pog.parameter(pog.text(supplier_org_id))
    |> pog.returning(invoice_header_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "get_invoice_failed")
    Ok(hret) ->
      case hret.rows {
        [] -> json_err(404, "invoice_not_found")
        [row] -> {
          let #(id, pf, pt, cur, g, c, n, st, num, notes, created) = row
          let inv_json =
            json.object([
              #("id", json.string(id)),
              #("period_from", json.string(pf)),
              #("period_to", json.string(pt)),
              #("currency_code", json.string(cur)),
              #("gross_total", json.string(g)),
              #("commission_total", json.string(c)),
              #("line_count", json.string(n)),
              #("status", json.string(st)),
              #("invoice_number", json.string(num)),
              #("notes", json.string(notes)),
              #("created_at", json.string(created)),
            ])
          let lines_sql =
            "select sil.id::text, sil.commission_accrual_line_id::text, sil.reservation_id::text, sil.public_code, sil.gross_amount::text, sil.commission_amount::text, sil.currency_code::text from supplier_invoice_lines sil where sil.invoice_id = $1::uuid order by sil.public_code"
          case
            pog.query(lines_sql)
            |> pog.parameter(pog.text(id))
            |> pog.returning(invoice_line_row())
            |> pog.execute(conn)
          {
            Error(_) -> json_err(500, "get_invoice_lines_failed")
            Ok(lret) -> {
              let line_arr =
                list.map(lret.rows, fn(ln) {
                  let #(lid, cal_id, res_id, pcode, lg, lcom, lcur) = ln
                  json.object([
                    #("id", json.string(lid)),
                    #("commission_accrual_line_id", json.string(cal_id)),
                    #("reservation_id", json.string(res_id)),
                    #("public_code", json.string(pcode)),
                    #("gross_amount", json.string(lg)),
                    #("commission_amount", json.string(lcom)),
                    #("currency_code", json.string(lcur)),
                  ])
                })
              json_ok([
                #("invoice", inv_json),
                #("lines", json.preprocessed_array(line_arr)),
              ])
            }
          }
        }
        _ -> json_err(500, "get_invoice_unexpected")
      }
  }
}

fn resolve_currency(
  conn: pog.Connection,
  supplier_org_id: String,
  from_q: String,
  to_q: String,
  currency_opt: String,
) -> Result(String, Response) {
  let cur_trim = normalize_currency(currency_opt)
  case cur_trim != "" {
    True ->
      case currency_exists(conn, cur_trim) {
        Error(r) -> Error(r)
        Ok(False) -> Error(json_err(400, "invalid_currency"))
        Ok(True) -> Ok(cur_trim)
      }
    False -> {
      let sql =
        string.concat([
          "select distinct cal.currency_code::text from commission_accrual_lines cal where ",
          cal_date_filter(),
        ])
      case
        pog.query(sql)
        |> pog.parameter(pog.text(supplier_org_id))
        |> pog.parameter(pog.text(from_q))
        |> pog.parameter(pog.text(to_q))
        |> pog.returning(cur_row())
        |> pog.execute(conn)
      {
        Error(_) -> Error(json_err(500, "currency_resolve_failed"))
        Ok(ret) ->
          case ret.rows {
            [] -> Error(json_err(400, "nothing_to_invoice"))
            [one] -> Ok(one)
            _ -> Error(json_err(400, "mixed_currency"))
          }
      }
    }
  }
}

pub fn preview_response(
  conn: pog.Connection,
  supplier_org_id: String,
  from_q: String,
  to_q: String,
  currency_opt: String,
) -> Response {
  case resolve_currency(conn, supplier_org_id, from_q, to_q, currency_opt) {
    Error(r) -> r
    Ok(cur) -> {
      let sql =
        string.concat([
          "select count(*)::text, coalesce(sum(cal.gross_amount), 0)::text, coalesce(sum(cal.commission_amount), 0)::text from commission_accrual_lines cal where ",
          cal_date_filter(),
          " and cal.currency_code = $4",
        ])
      case
        pog.query(sql)
        |> pog.parameter(pog.text(supplier_org_id))
        |> pog.parameter(pog.text(from_q))
        |> pog.parameter(pog.text(to_q))
        |> pog.parameter(pog.text(cur))
        |> pog.returning(sum_row())
        |> pog.execute(conn)
      {
        Error(_) -> json_err(500, "preview_failed")
        Ok(ret) ->
          case ret.rows {
            [#(n, g, c)] ->
              case n == "0" {
                True -> json_err(400, "nothing_to_invoice")
                False ->
                  json_ok([
                    #("period_from", json.string(from_q)),
                    #("period_to", json.string(to_q)),
                    #("currency_code", json.string(cur)),
                    #("line_count", json.string(n)),
                    #("gross_total", json.string(g)),
                    #("commission_total", json.string(c)),
                  ])
              }
            _ -> json_err(500, "preview_unexpected")
          }
      }
    }
  }
}

pub fn create_response(
  conn: pog.Connection,
  supplier_org_id: String,
  from_q: String,
  to_q: String,
  currency_opt: String,
  notes_opt: String,
  notify: InvoiceNotifyConfig,
) -> Response {
  case resolve_currency(conn, supplier_org_id, from_q, to_q, currency_opt) {
    Error(r) -> r
    Ok(cur) -> {
      let sum_sql =
        string.concat([
          "select count(*)::text, coalesce(sum(cal.gross_amount), 0)::text, coalesce(sum(cal.commission_amount), 0)::text from commission_accrual_lines cal where ",
          cal_date_filter(),
          " and cal.currency_code = $4",
        ])
      case
        pog.query(sum_sql)
        |> pog.parameter(pog.text(supplier_org_id))
        |> pog.parameter(pog.text(from_q))
        |> pog.parameter(pog.text(to_q))
        |> pog.parameter(pog.text(cur))
        |> pog.returning(sum_row())
        |> pog.execute(conn)
      {
        Error(_) -> json_err(500, "create_sum_failed")
        Ok(sum_ret) ->
          case sum_ret.rows {
            [#(n, g, c)] ->
              case n == "0" {
                True -> json_err(400, "nothing_to_invoice")
                False -> {
                  let ins_head =
                    "insert into supplier_invoices (supplier_organization_id, period_from, period_to, currency_code, gross_total, commission_total, line_count, status, invoice_number, notes) values ($1::uuid, (case when trim($2) = '' then current_date - interval '30 days' else trim($2)::date end)::date, (case when trim($3) = '' then current_date else trim($3)::date end)::date, $4::char(3), $5::numeric, $6::numeric, $7::int, 'issued', 'pending', nullif(trim($8::text), '')) returning id::text"
                  let line_count_int = case int.parse(n) {
                    Ok(i) -> i
                    Error(_) -> 0
                  }
                  case
                    pog.query(ins_head)
                    |> pog.parameter(pog.text(supplier_org_id))
                    |> pog.parameter(pog.text(from_q))
                    |> pog.parameter(pog.text(to_q))
                    |> pog.parameter(pog.text(cur))
                    |> pog.parameter(pog.text(g))
                    |> pog.parameter(pog.text(c))
                    |> pog.parameter(pog.int(line_count_int))
                    |> pog.parameter(pog.text(notes_opt))
                    |> pog.returning(id_row())
                    |> pog.execute(conn)
                  {
                    Error(_) -> json_err(500, "create_insert_failed")
                    Ok(ins_ret) ->
                      case ins_ret.rows {
                        [inv_id] -> {
                          let ins_lines =
                            string.concat([
                              "insert into supplier_invoice_lines (invoice_id, commission_accrual_line_id, reservation_id, public_code, gross_amount, commission_amount, currency_code) select $1::uuid, cal.id, cal.reservation_id, r.public_code, cal.gross_amount, cal.commission_amount, cal.currency_code from commission_accrual_lines cal inner join reservations r on r.id = cal.reservation_id where ",
                              cal_date_filter_for_insert_lines(),
                            ])
                          case
                            pog.query(ins_lines)
                            |> pog.parameter(pog.text(inv_id))
                            |> pog.parameter(pog.text(supplier_org_id))
                            |> pog.parameter(pog.text(from_q))
                            |> pog.parameter(pog.text(to_q))
                            |> pog.parameter(pog.text(cur))
                            |> pog.execute(conn)
                          {
                            Error(_) -> json_err(500, "create_lines_failed")
                            Ok(_) -> {
                              let upd_cal =
                                "update commission_accrual_lines cal set supplier_invoice_id = $1::uuid where cal.id in (select sil.commission_accrual_line_id from supplier_invoice_lines sil where sil.invoice_id = $1::uuid)"
                              case
                                pog.query(upd_cal)
                                |> pog.parameter(pog.text(inv_id))
                                |> pog.execute(conn)
                              {
                                Error(_) -> json_err(500, "create_link_failed")
                                Ok(_) -> {
                                  let upd_num =
                                    "update supplier_invoices set invoice_number = 'SPR-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(id::text,'-',''), 1, 8)) where id = $1::uuid and invoice_number = 'pending' returning invoice_number"
                                  case
                                    pog.query(upd_num)
                                    |> pog.parameter(pog.text(inv_id))
                                    |> pog.returning(num_row())
                                    |> pog.execute(conn)
                                  {
                                    Error(_) -> json_err(500, "create_number_failed")
                                    Ok(nr) ->
                                      case nr.rows {
                                        [inv_no] -> {
                                          invoice_notify.supplier_invoice_created(
                                            notify,
                                            supplier_org_id,
                                            inv_id,
                                            inv_no,
                                            from_q,
                                            to_q,
                                            cur,
                                            line_count_int,
                                            g,
                                            c,
                                          )
                                          json_ok([
                                            #("id", json.string(inv_id)),
                                            #("invoice_number", json.string(inv_no)),
                                            #("currency_code", json.string(cur)),
                                            #("line_count", json.int(line_count_int)),
                                            #("gross_total", json.string(g)),
                                            #("commission_total", json.string(c)),
                                          ])
                                        }
                                        _ -> json_err(500, "create_number_unexpected")
                                      }
                                  }
                                }
                              }
                            }
                          }
                        }
                        _ -> json_err(500, "create_no_id")
                      }
                  }
                }
              }
            _ -> json_err(500, "create_sum_unexpected")
          }
      }
    }
  }
}

fn status_invoice_num_row() -> decode.Decoder(#(String, String)) {
  use s <- decode.field(0, decode.string)
  use n <- decode.field(1, decode.string)
  decode.success(#(s, n))
}

pub fn cancel_response(
  conn: pog.Connection,
  supplier_org_id: String,
  invoice_id: String,
  notify: InvoiceNotifyConfig,
) -> Response {
  case
    pog.query(
      "select status::text, invoice_number::text from supplier_invoices where id = $1::uuid and supplier_organization_id = $2::uuid",
    )
    |> pog.parameter(pog.text(invoice_id))
    |> pog.parameter(pog.text(supplier_org_id))
    |> pog.returning(status_invoice_num_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "cancel_lookup_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "invoice_not_found")
        [#(st, inv_no)] ->
          case st {
            "cancelled" -> json_err(400, "already_cancelled")
            "issued" ->
              case
                pog.query(
                  "update commission_accrual_lines set supplier_invoice_id = null where supplier_invoice_id = $1::uuid",
                )
                |> pog.parameter(pog.text(invoice_id))
                |> pog.execute(conn)
              {
                Error(_) -> json_err(500, "cancel_unlink_failed")
                Ok(_) ->
                  case
                    pog.query(
                      "update supplier_invoices set status = 'cancelled' where id = $1::uuid and supplier_organization_id = $2::uuid and status = 'issued'",
                    )
                    |> pog.parameter(pog.text(invoice_id))
                    |> pog.parameter(pog.text(supplier_org_id))
                    |> pog.execute(conn)
                  {
                    Error(_) -> json_err(500, "cancel_status_failed")
                    Ok(_) -> {
                      invoice_notify.supplier_invoice_cancelled(
                        notify,
                        supplier_org_id,
                        invoice_id,
                        inv_no,
                      )
                      json_ok([
                        #("id", json.string(invoice_id)),
                        #("status", json.string("cancelled")),
                      ])
                    }
                  }
              }
            _ -> json_err(400, "cannot_cancel")
          }
        _ -> json_err(500, "cancel_unexpected")
      }
  }
}

pub fn patch_notes_response(
  conn: pog.Connection,
  supplier_org_id: String,
  invoice_id: String,
  notes_raw: String,
) -> Response {
  case
    pog.query(
      "update supplier_invoices set notes = case when trim($3::text) = '' then null else trim($3::text) end where id = $1::uuid and supplier_organization_id = $2::uuid and status = 'issued' returning id::text",
    )
    |> pog.parameter(pog.text(invoice_id))
    |> pog.parameter(pog.text(supplier_org_id))
    |> pog.parameter(pog.text(notes_raw))
    |> pog.returning(id_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "patch_notes_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(400, "cannot_patch_notes")
        [rid] ->
          json_ok([
            #("id", json.string(rid)),
            #("notes", json.string(string.trim(notes_raw))),
          ])
        _ -> json_err(500, "patch_notes_unexpected")
      }
  }
}
