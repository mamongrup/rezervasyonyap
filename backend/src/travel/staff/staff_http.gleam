//// Personel — kurum kapsamında salt okuma (G3.4).

import backend/context.{type Context}
import travel/booking/booking_http
import travel/booking/cart_fx
import travel/identity/permissions
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn auth_header_token(req: Request) -> String {
  case request.get_header(req, "authorization") {
    Error(_) -> ""
    Ok(h) -> {
      let t = string.trim(h)
      case string.starts_with(string.lowercase(t), "bearer ") {
        True ->
          t
          |> string.drop_start(7)
          |> string.trim
        False -> ""
      }
    }
  }
}

fn session_user_id(conn: pog.Connection, token: String) -> Result(String, Nil) {
  case string.trim(token) == "" {
    True -> Error(Nil)
    False ->
      case
        pog.query(
          "select u.id::text from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
        )
        |> pog.parameter(pog.text(token))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          decode.success(a)
        })
        |> pog.execute(conn)
      {
        Error(_) -> Error(Nil)
        Ok(ret) ->
          case ret.rows {
            [row] -> Ok(row)
            _ -> Error(Nil)
          }
      }
  }
}

fn staff_context_row() -> decode.Decoder(#(String, String, String)) {
  use oid <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  decode.success(#(oid, slug, name))
}

fn require_staff_org(
  conn: pog.Connection,
  user_id: String,
) -> Result(#(String, String, String), Nil) {
  case
    pog.query(
      "select o.id::text, o.slug, o.name from user_roles ur inner join roles r on r.id = ur.role_id inner join organizations o on o.id = ur.organization_id where ur.user_id = $1::uuid and r.code = 'staff' order by o.id limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(staff_context_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error(Nil)
      }
  }
}

fn decode_one_string() -> decode.Decoder(String) {
  use s <- decode.field(0, decode.string)
  decode.success(s)
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn verify_pos_cart_lines_org(
  conn: pog.Connection,
  cart_id: String,
  staff_org_id: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "select 1::text from cart_lines cl inner join listings l on l.id = cl.listing_id where cl.cart_id = $1::uuid and l.organization_id <> $2::uuid limit 1",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.parameter(pog.text(staff_org_id))
    |> pog.returning(decode_one_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("pos_cart_verify_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> Ok(Nil)
        _ -> Error("pos_cart_foreign_listing")
      }
  }
}

fn pos_create_cart_decoder() -> decode.Decoder(String) {
  decode.field("currency_code", decode.string, fn(raw) {
    let cur = string.uppercase(string.trim(raw))
    decode.success(cur)
  })
}

fn pos_line_decoder() -> decode.Decoder(#(String, Int, String, String, String)) {
  decode.field("listing_id", decode.string, fn(listing_id) {
    decode.field("quantity", decode.int, fn(quantity) {
      decode.field("starts_on", decode.string, fn(starts_on) {
        decode.field("ends_on", decode.string, fn(ends_on) {
          decode.field("unit_price", decode.string, fn(unit_price) {
            decode.success(#(listing_id, quantity, starts_on, ends_on, unit_price))
          })
        })
      })
    })
  })
}

fn pos_checkout_decoder() -> decode.Decoder(
  #(String, String, Option(String), Int, Bool, String, Bool, Bool),
) {
  decode.field("guest_email", decode.string, fn(guest_email) {
    decode.field("guest_name", decode.string, fn(guest_name) {
      decode.optional_field("guest_phone", "", decode.string, fn(phone_raw) {
        decode.optional_field("hold_minutes", 15, decode.int, fn(hold_minutes) {
          decode.optional_field("contract_accepted", False, decode.bool, fn(
            contract_accepted,
          ) {
            decode.optional_field("contract_locale", "tr", decode.string, fn(
              contract_locale,
            ) {
              decode.optional_field("general_contract_accepted", False, decode.bool, fn(
                general_contract_accepted,
              ) {
                decode.optional_field("sales_contract_accepted", False, decode.bool, fn(
                  sales_contract_accepted,
                ) {
                  let phone = case string.trim(phone_raw) {
                    "" -> None
                    p -> Some(p)
                  }
                  decode.success(#(
                    guest_email,
                    guest_name,
                    phone,
                    hold_minutes,
                    contract_accepted,
                    contract_locale,
                    general_contract_accepted,
                    sales_contract_accepted,
                  ))
                })
              })
            })
          })
        })
      })
    })
  })
}

fn auth_staff(
  req: Request,
  conn: pog.Connection,
  need: String,
) -> Result(#(String, String, String, String), Response) {
  let token = auth_header_token(req)
  case token == "" {
    True -> Error(json_err(401, "missing_token"))
    False ->
      case session_user_id(conn, token) {
        Error(_) -> Error(json_err(401, "invalid_session"))
        Ok(uid) ->
          case permissions.user_has_permission(conn, uid, need) {
            False -> Error(json_err(403, "forbidden"))
            True ->
              case require_staff_org(conn, uid) {
                Error(_) -> Error(json_err(403, "not_staff"))
                Ok(#(oid, slug, name)) -> Ok(#(uid, oid, slug, name))
              }
          }
      }
  }
}

/// GET /api/v1/staff/me
pub fn me(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_staff(req, ctx.db, "staff.profile.read") {
    Error(r) -> r
    Ok(#(_, oid, slug, name)) -> {
      let body =
        json.object([
          #("organization_id", json.string(oid)),
          #("slug", json.string(slug)),
          #("name", json.string(name)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn resv_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use email <- decode.field(3, decode.string)
  use lslug <- decode.field(4, decode.string)
  use created <- decode.field(5, decode.string)
  decode.success(#(id, code, st, email, lslug, created))
}

fn inv_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String, String, String, String, String),
) {
  use kind <- decode.field(0, decode.string)
  use id <- decode.field(1, decode.string)
  use pf <- decode.field(2, decode.string)
  use pt <- decode.field(3, decode.string)
  use cur <- decode.field(4, decode.string)
  use g <- decode.field(5, decode.string)
  use c <- decode.field(6, decode.string)
  use n <- decode.field(7, decode.string)
  use st <- decode.field(8, decode.string)
  use num <- decode.field(9, decode.string)
  use notes <- decode.field(10, decode.string)
  use created <- decode.field(11, decode.string)
  decode.success(#(kind, id, pf, pt, cur, g, c, n, st, num, notes, created))
}

/// Birleşik fatura satırlarını JSON yanıtına çevirir.
fn invoices_rows_to_http_response(rows: List(
  #(String, String, String, String, String, String, String, String, String, String, String, String),
)) -> Response {
  let arr =
    list.map(rows, fn(row) {
      let #(kind, id, pf, pt, cur, g, c, n, st, num, notes, created) = row
      json.object([
        #("kind", json.string(kind)),
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
  let body =
    json.object([#("invoices", json.preprocessed_array(arr))])
    |> json.to_string
  wisp.json_response(body, 200)
}

/// Personel: tek kurum (`$1`). Yönetici: tüm kurumlar (filtre yok).
const invoices_sql_staff_org: String =
  "select kind, id, period_from, period_to, currency_code, gross_total, commission_total, line_count, status, invoice_number, notes, created_at from ( select 'agency'::text as kind, ai.id::text as id, ai.period_from::text as period_from, ai.period_to::text as period_to, ai.currency_code::text as currency_code, ai.gross_total::text as gross_total, ai.commission_total::text as commission_total, ai.line_count::text as line_count, ai.status::text as status, ai.invoice_number::text as invoice_number, coalesce(ai.notes, '')::text as notes, to_char(ai.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as created_at, ai.created_at as ts from agency_invoices ai where ai.agency_organization_id = $1::uuid union all select 'supplier'::text as kind, si.id::text, si.period_from::text, si.period_to::text, si.currency_code::text, si.gross_total::text, si.commission_total::text, si.line_count::text, si.status::text, si.invoice_number::text, coalesce(si.notes, '')::text, to_char(si.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), si.created_at from supplier_invoices si where si.supplier_organization_id = $1::uuid ) sub order by ts desc limit 80"

const invoices_sql_admin_all: String =
  "select kind, id, period_from, period_to, currency_code, gross_total, commission_total, line_count, status, invoice_number, notes, created_at from ( select 'agency'::text as kind, ai.id::text as id, ai.period_from::text as period_from, ai.period_to::text as period_to, ai.currency_code::text as currency_code, ai.gross_total::text as gross_total, ai.commission_total::text as commission_total, ai.line_count::text as line_count, ai.status::text as status, ai.invoice_number::text as invoice_number, coalesce(ai.notes, '')::text as notes, to_char(ai.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as created_at, ai.created_at as ts from agency_invoices ai union all select 'supplier'::text as kind, si.id::text, si.period_from::text, si.period_to::text, si.currency_code::text, si.gross_total::text, si.commission_total::text, si.line_count::text, si.status::text, si.invoice_number::text, coalesce(si.notes, '')::text, to_char(si.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), si.created_at from supplier_invoices si ) sub order by ts desc limit 80"

/// GET /api/v1/staff/invoices — acente + tedarikçi komisyon faturaları (birleşik, son 80).
/// `admin.users.read`: tüm kurumlar. Personel: `staff.invoices.read` + staff kurumu.
pub fn list_invoices(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let token = auth_header_token(req)
  case token == "" {
    True -> json_err(401, "missing_token")
    False ->
      case session_user_id(ctx.db, token) {
        Error(_) -> json_err(401, "invalid_session")
        Ok(uid) -> {
          let admin_global_invoices =
            permissions.user_has_permission(ctx.db, uid, "admin.users.read")
            || permissions.user_has_admin_role(ctx.db, uid)
          case admin_global_invoices {
            True ->
              case
                pog.query(invoices_sql_admin_all)
                |> pog.returning(inv_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "list_invoices_failed")
                Ok(ret) -> invoices_rows_to_http_response(ret.rows)
              }
            False ->
              case permissions.user_has_permission(ctx.db, uid, "staff.invoices.read") {
                False -> json_err(403, "forbidden")
                True ->
                  case require_staff_org(ctx.db, uid) {
                    Error(_) -> json_err(403, "not_staff")
                    Ok(#(oid, _, _)) ->
                      case
                        pog.query(invoices_sql_staff_org)
                        |> pog.parameter(pog.text(oid))
                        |> pog.returning(inv_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "list_invoices_failed")
                        Ok(ret) -> invoices_rows_to_http_response(ret.rows)
                      }
                  }
              }
          }
        }
      }
  }
}

/// GET /api/v1/staff/reservations — ilgili kurumun ilanlarına ait rezervasyonlar (son 80).
pub fn list_reservations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_staff(req, ctx.db, "staff.reservations.read") {
    Error(r) -> r
    Ok(#(_, oid, _, _)) ->
      case
        pog.query(
          "select r.id::text, r.public_code, r.status::text, coalesce(r.guest_email, ''), l.slug, to_char(r.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from reservations r inner join listings l on l.id = r.listing_id where l.organization_id = $1::uuid order by r.created_at desc limit 80",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.returning(resv_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, code, st, email, lslug, created) = row
              json.object([
                #("id", json.string(id)),
                #("public_code", json.string(code)),
                #("status", json.string(st)),
                #("guest_email", json.string(email)),
                #("listing_slug", json.string(lslug)),
                #("created_at", json.string(created)),
              ])
            })
          let body =
            json.object([#("reservations", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn staff_listing_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String),
) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use cur <- decode.field(3, decode.string)
  use comm <- decode.field(4, decode.string)
  use prep_a <- decode.field(5, decode.string)
  use prep_p <- decode.field(6, decode.string)
  use ts <- decode.field(7, decode.string)
  decode.success(#(id, slug, st, cur, comm, prep_a, prep_p, ts))
}

/// GET /api/v1/staff/listings?search= — kurum ilanları (salt okuma, `staff.reservations.read`).
pub fn list_listings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_staff(req, ctx.db, "staff.reservations.read") {
    Error(r) -> r
    Ok(#(_, oid, _, _)) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let search_raw =
        list.key_find(qs, "search")
        |> result.unwrap("")
        |> string.trim
      let like_param = case search_raw == "" {
        True -> pog.null()
        False -> pog.text("%" <> search_raw <> "%")
      }
      case
        pog.query(
          "select l.id::text, l.slug, l.status::text, l.currency_code::text, coalesce(l.commission_percent::text, ''), coalesce(l.prepayment_amount::text, ''), coalesce(l.prepayment_percent::text, ''), to_char(l.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from listings l where l.organization_id = $1::uuid and ($2::text is null or l.slug ilike $2 or l.id::text ilike $2) order by l.created_at desc limit 200",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.parameter(like_param)
        |> pog.returning(staff_listing_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, slug, st, cur, comm, prep_a, prep_p, ts) = row
              json.object([
                #("id", json.string(id)),
                #("slug", json.string(slug)),
                #("status", json.string(st)),
                #("currency_code", json.string(cur)),
                #("commission_percent", json.string(comm)),
                #("prepayment_amount", json.string(prep_a)),
                #("prepayment_percent", json.string(prep_p)),
                #("created_at", json.string(ts)),
              ])
            })
          let body =
            json.object([#("listings", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

/// POST /api/v1/staff/pos/carts — kasa sepeti (kur PB ile; yalnızca bu kurumun ilanları POS satırına eklenebilir).
pub fn pos_create_cart(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_staff(req, ctx.db, "staff.pos.write") {
    Error(r) -> r
    Ok(#(_, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, pos_create_cart_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(cur) -> {
              case cur == "" {
                True -> json_err(400, "currency_required")
                False -> {
                  case
                    pog.query(
                      "insert into carts (currency_code, session_key) values ($1, null) returning id::text",
                    )
                    |> pog.parameter(pog.text(cur))
                    |> pog.returning(decode_one_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "cart_create_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [id] -> {
                          let fx_field = case cart_fx.lock_cart_fx(ctx.db, id) {
                            Ok(j) -> #("fx_lock", j)
                            Error(_) -> #("fx_lock", json.object([]))
                          }
                          let out =
                            json.object([
                              #("id", json.string(id)),
                              #("currency_code", json.string(cur)),
                              fx_field,
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

/// POST /api/v1/staff/pos/carts/:id/lines
pub fn pos_add_cart_line(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_staff(req, ctx.db, "staff.pos.write") {
    Error(r) -> r
    Ok(#(_, oid, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, pos_line_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(listing_id, quantity, starts_on, ends_on, unit_price)) -> {
              case quantity < 1 {
                True -> json_err(400, "invalid_quantity")
                False -> {
                  let price_trim = string.trim(unit_price)
                  case price_trim == "" {
                    True -> json_err(400, "unit_price_required")
                    False -> {
                      case
                        pog.transaction(ctx.db, fn(conn) {
                          case
                            pog.query(
                              "select c.currency_code::text, l.currency_code::text, l.status::text, l.organization_id::text from carts c inner join listings l on l.id = $2::uuid where c.id = $1::uuid",
                            )
                            |> pog.parameter(pog.text(cart_id))
                            |> pog.parameter(pog.text(listing_id))
                            |> pog.returning({
                              use cc <- decode.field(0, decode.string)
                              use lc <- decode.field(1, decode.string)
                              use st <- decode.field(2, decode.string)
                              use org <- decode.field(3, decode.string)
                              decode.success(#(cc, lc, st, org))
                            })
                            |> pog.execute(conn)
                          {
                            Error(_) -> Error("cart_or_listing")
                            Ok(rows) ->
                              case rows.rows {
                                [#(cc, lc, st, org)] -> {
                                  case org != oid {
                                    True -> Error("listing_not_in_staff_org")
                                    False ->
                                      case st == "published" && cc == lc {
                                        False ->
                                          Error(
                                            "listing_unavailable_or_currency_mismatch",
                                          )
                                        True -> {
                                          let meta =
                                            json.object([])
                                            |> json.to_string
                                          case
                                            pog.query(
                                              "insert into cart_lines (cart_id, listing_id, quantity, starts_on, ends_on, flexible_dates, unit_price, tax_amount, fee_amount, meta_json) values ($1::uuid, $2::uuid, $3, $4::date, $5::date, false, $6::numeric, 0, 0, $7::jsonb) returning id::text",
                                            )
                                            |> pog.parameter(pog.text(cart_id))
                                            |> pog.parameter(pog.text(listing_id))
                                            |> pog.parameter(pog.int(quantity))
                                            |> pog.parameter(pog.text(starts_on))
                                            |> pog.parameter(pog.text(ends_on))
                                            |> pog.parameter(pog.text(price_trim))
                                            |> pog.parameter(pog.text(meta))
                                            |> pog.returning(decode_one_string())
                                            |> pog.execute(conn)
                                          {
                                            Error(_) -> Error("insert_line_failed")
                                            Ok(r) ->
                                              case r.rows {
                                                [lid] -> Ok(lid)
                                                _ -> Error("unexpected")
                                              }
                                          }
                                        }
                                      }
                                  }
                                }
                                _ -> Error("cart_or_listing_not_found")
                              }
                          }
                        })
                      {
                        Ok(lid) -> {
                          let out =
                            json.object([
                              #("id", json.string(lid)),
                              #("cart_id", json.string(cart_id)),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 201)
                        }
                        Error(pog.TransactionQueryError(_)) ->
                          json_err(500, "cart_or_listing_not_found")
                        Error(pog.TransactionRolledBack(msg)) ->
                          case msg {
                            "listing_unavailable_or_currency_mismatch" ->
                              json_err(400, msg)
                            "cart_or_listing_not_found" -> json_err(404, msg)
                            "listing_not_in_staff_org" -> json_err(403, msg)
                            _ -> json_err(400, msg)
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

/// POST /api/v1/staff/pos/carts/:id/checkout — misafir bilgisiyle held rezervasyon (acentesiz).
pub fn pos_checkout(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_staff(req, ctx.db, "staff.pos.write") {
    Error(r) -> r
    Ok(#(_, oid, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, pos_checkout_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(
              guest_email,
              guest_name,
              guest_phone,
              hold_minutes,
              contract_accepted,
              contract_locale,
              general_contract_accepted,
              sales_contract_accepted,
            )) -> {
              let hm = case hold_minutes < 5 || hold_minutes > 120 {
                True -> 15
                False -> hold_minutes
              }
              case
                pog.transaction(ctx.db, fn(conn) {
                  case verify_pos_cart_lines_org(conn, cart_id, oid) {
                    Error(e) -> Error(e)
                    Ok(Nil) ->
                      booking_http.do_checkout(
                        conn,
                        cart_id,
                        guest_email,
                        guest_name,
                        guest_phone,
                        hm,
                        None,
                        contract_accepted,
                        contract_locale,
                        general_contract_accepted,
                        sales_contract_accepted,
                        "full",
                        1,
                      )
                  }
                })
              {
                Ok(#(rid, pcode, pay_kurus, cur)) -> {
                  let out =
                    json.object([
                      #("reservation_id", json.string(rid)),
                      #("public_code", json.string(pcode)),
                      #("status", json.string("held")),
                      #("payment_amount", json.string(pay_kurus)),
                      #("currency_code", json.string(cur)),
                    ])
                    |> json.to_string
                  wisp.json_response(out, 201)
                }
                Error(pog.TransactionQueryError(_)) ->
                  json_err(500, "database_error")
                Error(pog.TransactionRolledBack(msg)) ->
                  case msg {
                    "cart_empty" -> json_err(400, msg)
                    "guest_fields_required" -> json_err(400, msg)
                    "contract_not_accepted" -> json_err(400, msg)
                    "general_contract_not_accepted" -> json_err(400, msg)
                    "sales_contract_not_accepted" -> json_err(400, msg)
                    "listing_contract_required" -> json_err(400, msg)
                    "pos_cart_foreign_listing" -> json_err(403, msg)
                    "pos_cart_verify_failed" -> json_err(500, msg)
                    _ -> json_err(400, msg)
                  }
              }
            }
          }
      }
  }
}
