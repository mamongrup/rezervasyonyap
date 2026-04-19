//// Sepet, checkout (held rezervasyon), misafir kodu ile sorgu.

import backend/context.{type Context}
import travel/booking/cart_fx
import travel/messaging/notification_runtime
import travel/identity/admin_gate
import gleam/bit_array
import gleam/dynamic/decode
import gleam/float
import gleam/http
import gleam/http/request as http_request
import gleam/int
import gleam/json
import gleam/list
import gleam/order
import gleam/option.{type Option, None, Some}
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

fn create_cart_decoder() -> decode.Decoder(#(String, Option(String))) {
  decode.field("currency_code", decode.string, fn(currency_code) {
    decode.optional_field("session_key", "", decode.string, fn(sk) {
      let session = case string.trim(sk) {
        "" -> None
        s -> Some(s)
      }
      decode.success(#(currency_code, session))
    })
  })
}

pub fn create_cart(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_cart_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(currency, session_opt)) -> {
          let cur = string.uppercase(string.trim(currency))
          case cur == "" {
            True -> json_err(400, "currency_required")
            False -> {
              let session_param = case session_opt {
                Some(s) -> pog.text(s)
                None -> pog.null()
              }
              case
                pog.query(
                  "insert into carts (currency_code, session_key) values ($1, $2) returning id::text",
                )
                |> pog.parameter(pog.text(cur))
                |> pog.parameter(session_param)
                |> pog.returning(row_dec.col0_string())
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

fn add_line_decoder() -> decode.Decoder(#(String, Int, String, String, String, String)) {
  decode.field("listing_id", decode.string, fn(listing_id) {
    decode.field("quantity", decode.int, fn(quantity) {
      decode.field("starts_on", decode.string, fn(starts_on) {
        decode.field("ends_on", decode.string, fn(ends_on) {
          decode.field("unit_price", decode.string, fn(unit_price) {
            decode.optional_field("agency_organization_id", "", decode.string, fn(aid_raw) {
              decode.success(#(listing_id, quantity, starts_on, ends_on, unit_price, aid_raw))
            })
          })
        })
      })
    })
  })
}

pub fn add_cart_line(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  let session_token = auth_header_token(req)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, add_line_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(listing_id, quantity, starts_on, ends_on, unit_price, aid_raw)) -> {
          case quantity < 1 {
            True -> json_err(400, "invalid_quantity")
            False -> {
              let price_trim = string.trim(unit_price)
              let agency_for_line = string.trim(aid_raw)
              case price_trim == "" {
                True -> json_err(400, "unit_price_required")
                False -> {
                  let agency_opt = case agency_for_line == "" {
                    True -> None
                    False -> Some(agency_for_line)
                  }
                  case maybe_assert_agency_session(ctx.db, session_token, agency_opt) {
                    Error(e) ->
                      case e {
                        "agency_session_required" -> json_err(401, e)
                        "agency_membership_required" -> json_err(403, e)
                        _ -> json_err(500, e)
                      }
                    Ok(Nil) ->
                  case
                    pog.transaction(ctx.db, fn(conn) {
                      case
                        pog.query(
                          "select c.currency_code::text, l.currency_code::text, l.status::text from carts c inner join listings l on l.id = $2::uuid where c.id = $1::uuid",
                        )
                        |> pog.parameter(pog.text(cart_id))
                        |> pog.parameter(pog.text(listing_id))
                        |> pog.returning({
                          use a <- decode.field(0, decode.string)
                          use b <- decode.field(1, decode.string)
                          use st <- decode.field(2, decode.string)
                          decode.success(#(a, b, st))
                        })
                        |> pog.execute(conn)
                      {
                        Error(_) -> Error("cart_or_listing")
                        Ok(rows) ->
                          case rows.rows {
                            [#(cc, lc, st)] ->
                              case st == "published" && cc == lc {
                                False ->
                                  Error(
                                    "listing_unavailable_or_currency_mismatch",
                                  )
                                True -> {
                                  let gate = case agency_for_line == "" {
                                    True -> Ok(Nil)
                                    False ->
                                      case validate_agency_org(conn, agency_for_line) {
                                        False -> Error("invalid_agency_organization")
                                        True ->
                                          case
                                            assert_agency_document_approved_for_org(
                                              conn,
                                              agency_for_line,
                                            )
                                          {
                                            Error(e) -> Error(e)
                                            Ok(Nil) ->
                                              assert_agency_listing_category_allowed(
                                                conn,
                                                listing_id,
                                                agency_for_line,
                                              )
                                          }
                                      }
                                  }
                                  case gate {
                                    Error(e) -> Error(e)
                                    Ok(Nil) -> {
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
                                        |> pog.returning(row_dec.col0_string())
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

fn checkout_decoder() -> decode.Decoder(
  #(String, String, Option(String), Int, Option(String), Bool, String, Bool, Bool, String, Int),
) {
  decode.field("guest_email", decode.string, fn(guest_email) {
    decode.field("guest_name", decode.string, fn(guest_name) {
      decode.optional_field("guest_phone", "", decode.string, fn(phone_raw) {
        decode.optional_field("hold_minutes", 15, decode.int, fn(hold_minutes) {
          decode.optional_field("agency_organization_id", "", decode.string, fn(aid_raw) {
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
                    decode.optional_field("payment_type", "full", decode.string, fn(pt_raw) {
                      decode.optional_field("installments", 1, decode.int, fn(inst_raw) {
                        let phone = case string.trim(phone_raw) {
                          "" -> None
                          p -> Some(p)
                        }
                        let agency = case string.trim(aid_raw) {
                          "" -> None
                          a -> Some(a)
                        }
                        let payment_type = case string.trim(pt_raw) {
                          "partial" -> "partial"
                          _ -> "full"
                        }
                        let installments = case inst_raw < 1 || inst_raw > 12 {
                          True -> 1
                          False -> inst_raw
                        }
                        decode.success(#(
                          guest_email,
                          guest_name,
                          phone,
                          hold_minutes,
                          agency,
                          contract_accepted,
                          contract_locale,
                          general_contract_accepted,
                          sales_contract_accepted,
                          payment_type,
                          installments,
                        ))
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
}

fn contract_snap_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  use e <- decode.field(4, decode.string)
  decode.success(#(a, b, c, d, e))
}

fn scoped_contract_body_row() -> decode.Decoder(#(String, String, String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  decode.success(#(a, b, c, d))
}

fn json_optional_contract_snapshot(
  row: Option(#(String, String, String, String)),
) -> json.Json {
  case row {
    None -> json.null()
    Some(#(cid, ver, title, body)) ->
      json.object([
        #("contract_id", json.string(cid)),
        #("version", json.string(ver)),
        #("title", json.string(title)),
        #("body", json.string(body)),
      ])
  }
}

fn cart_primary_listing_org(
  conn: pog.Connection,
  cart_id: String,
) -> Result(String, String) {
  case
    pog.query(
      "select coalesce(l.organization_id::text, '') from cart_lines cl "
      <> "inner join listings l on l.id = cl.listing_id "
      <> "where cl.cart_id = $1::uuid order by cl.id limit 1",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("cart_org_resolve_failed")
    Ok(ret) ->
      case ret.rows {
        [org] -> Ok(org)
        _ -> Error("cart_org_resolve_failed")
      }
  }
}

fn fetch_scoped_contract_for_org(
  conn: pog.Connection,
  org_text: String,
  locale: String,
  scope: String,
) -> Result(Option(#(String, String, String, String)), String) {
  let sql =
    "select cc.id::text, cc.version::text, "
    <> "coalesce((select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
    <> "(select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
    <> "(select t.title from category_contract_translations t where t.contract_id = cc.id limit 1), ''), "
    <> "coalesce((select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
    <> "(select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
    <> "(select t.body_text from category_contract_translations t where t.contract_id = cc.id limit 1), '') "
    <> "from category_contracts cc "
    <> "where cc.contract_scope = $3::text and cc.is_active = true "
    <> "and (cc.organization_id is null or (btrim($1) <> '' and cc.organization_id = $1::uuid)) "
    <> "order by case when cc.organization_id is not null then 0 else 1 end, cc.sort_order, cc.code "
    <> "limit 1"
  case
    pog.query(sql)
    |> pog.parameter(pog.text(org_text))
    |> pog.parameter(pog.text(locale))
    |> pog.parameter(pog.text(scope))
    |> pog.returning(scoped_contract_body_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error("checkout_contract_extras_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> Ok(None)
        [row] -> Ok(Some(row))
        _ -> Error("checkout_contract_extras_failed")
      }
  }
}

fn require_acceptance_when_contract_present(
  contract: Option(a),
  accepted: Bool,
  err_code: String,
) -> Result(Nil, String) {
  case contract {
    None -> Ok(Nil)
    Some(_) ->
      case accepted {
        True -> Ok(Nil)
        False -> Error(err_code)
      }
  }
}

fn assert_cart_contracts_valid(
  conn: pog.Connection,
  cart_id: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "select count(*)::text from cart_lines cl "
      <> "inner join listings l on l.id = cl.listing_id "
      <> "where cl.cart_id = $1::uuid "
      <> "and ( l.category_contract_id is null "
      <> "  or not exists ( "
      <> "    select 1 from category_contracts c "
      <> "    where c.id = l.category_contract_id and c.contract_scope = 'category' "
      <> "    and c.is_active = true "
      <> "    and (c.organization_id is null or c.organization_id = l.organization_id) "
      <> "  ) )",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("contract_validation_failed")
    Ok(ret) ->
      case ret.rows {
        [cnt] ->
          case cnt == "0" {
            True -> Ok(Nil)
            False -> Error("listing_contract_required")
          }
        _ -> Error("contract_validation_failed")
      }
  }
}

fn build_contract_snapshots(
  conn: pog.Connection,
  cart_id: String,
  locale: String,
  org_text: String,
) -> Result(String, String) {
  let sql =
    "select distinct on (l.id) l.id::text, cc.id::text, cc.version::text, "
    <> "coalesce((select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
    <> "(select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
    <> "(select t.title from category_contract_translations t where t.contract_id = cc.id limit 1), '') , "
    <> "coalesce((select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
    <> "(select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
    <> "(select t.body_text from category_contract_translations t where t.contract_id = cc.id limit 1), '') "
    <> "from cart_lines cl "
    <> "inner join listings l on l.id = cl.listing_id "
    <> "inner join category_contracts cc on cc.id = l.category_contract_id "
    <> "and cc.is_active = true and cc.contract_scope = 'category' "
    <> "where cl.cart_id = $1::uuid "
    <> "order by l.id"
  case
    pog.query(sql)
    |> pog.parameter(pog.text(cart_id))
    |> pog.parameter(pog.text(locale))
    |> pog.returning(contract_snap_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error("contract_snapshot_failed")
    Ok(ret) -> {
      let line_objs =
        list.map(ret.rows, fn(row) {
          let #(lid, cid, ver, title, body) = row
          json.object([
            #("listing_id", json.string(lid)),
            #("contract_id", json.string(cid)),
            #("version", json.string(ver)),
            #("title", json.string(title)),
            #("body", json.string(body)),
          ])
        })
      case fetch_scoped_contract_for_org(conn, org_text, locale, "general") {
        Error(e) -> Error(e)
        Ok(gen_opt) ->
          case fetch_scoped_contract_for_org(conn, org_text, locale, "sales") {
            Error(e) -> Error(e)
            Ok(sal_opt) -> {
              let obj =
                json.object([
                  #("accepted", json.bool(True)),
                  #("locale", json.string(locale)),
                  #("lines", json.preprocessed_array(line_objs)),
                  #("general", json_optional_contract_snapshot(gen_opt)),
                  #("sales", json_optional_contract_snapshot(sal_opt)),
                ])
              Ok(json.to_string(obj))
            }
          }
      }
    }
  }
}

fn cart_line_row() -> decode.Decoder(
  #(String, Int, String, String, String, String),
) {
  use listing_id <- decode.field(0, decode.string)
  use qty <- decode.field(1, decode.int)
  use uprice <- decode.field(2, decode.string)
  use s1 <- decode.field(3, decode.string)
  use s2 <- decode.field(4, decode.string)
  use line_total <- decode.field(5, decode.string)
  decode.success(#(listing_id, qty, uprice, s1, s2, line_total))
}

fn validate_agency_org(conn: pog.Connection, aid: String) -> Bool {
  case
    pog.query(
      "select 1::text from organizations where id = $1::uuid and org_type = 'agency' limit 1",
    )
    |> pog.parameter(pog.text(aid))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Ok(ret) -> ret.rows != []
    Error(_) -> False
  }
}

fn resolve_agency_id(
  conn: pog.Connection,
  agency_org: Option(String),
) -> Result(Option(String), String) {
  case agency_org {
    None -> Ok(None)
    Some(aid) -> {
      let t = string.trim(aid)
      case t == "" {
        True -> Ok(None)
        False ->
          case validate_agency_org(conn, t) {
            True -> Ok(Some(t))
            False -> Error("invalid_agency_organization")
          }
      }
    }
  }
}

fn assert_agency_document_approved_for_org(
  conn: pog.Connection,
  agency_id: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "select 1::text from agency_profiles ap inner join organizations o on o.id = ap.organization_id where ap.organization_id = $1::uuid and o.org_type = 'agency' and lower(trim(ap.document_status::text)) = 'approved' limit 1",
    )
    |> pog.parameter(pog.text(agency_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("agency_document_check_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> Error("agency_document_not_approved")
        _ -> Ok(Nil)
      }
  }
}

fn agency_max_checkout_discount_factor(
  conn: pog.Connection,
  agency_id: String,
) -> Result(Float, String) {
  case
    pog.query(
      "select coalesce(max(ap.discount_percent), 0)::text from agency_profiles ap where ap.organization_id = $1::uuid and lower(trim(ap.document_status::text)) = 'approved'",
    )
    |> pog.parameter(pog.text(agency_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("agency_discount_load_failed")
    Ok(ret) ->
      case ret.rows {
        [s] -> {
          let pct = case float.parse(string.trim(s)) {
            Ok(p) -> {
              let clamped = case p <. 0.0 {
                True -> 0.0
                False ->
                  case p >. 100.0 {
                    True -> 100.0
                    False -> p
                  }
              }
              Ok(1.0 -. clamped /. 100.0)
            }
            Error(_) -> Ok(1.0)
          }
          pct
        }
        _ -> Error("agency_discount_load_failed")
      }
  }
}

fn line_total_with_agency_discount(lt_raw: String, factor: Float) -> String {
  case float.parse(string.trim(lt_raw)) {
    Ok(base) -> float.to_string(base *. factor)
    Error(_) -> string.trim(lt_raw)
  }
}

/// Acente için en az bir `agency_category_grants` satırı varsa, sepetteki tüm ilanların kategorisi onaylı olmalı.
/// Tek ilan için acente kategori yetkisi (sepet satırı eklerken).
fn assert_agency_listing_category_allowed(
  conn: pog.Connection,
  listing_id: String,
  agency_id: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "select count(*)::text from listings l inner join product_categories pc on pc.id = l.category_id where l.id = $1::uuid and exists (select 1 from agency_category_grants g where g.agency_organization_id = $2::uuid) and not exists (select 1 from agency_category_grants g2 where g2.agency_organization_id = $2::uuid and g2.approved = true and g2.category_code = pc.code)",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(agency_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("agency_cart_category_check_failed")
    Ok(ret) ->
      case ret.rows {
        [cnt] ->
          case cnt == "0" {
            True -> Ok(Nil)
            False -> Error("agency_category_not_granted")
          }
        _ -> Error("agency_cart_category_check_failed")
      }
  }
}

fn assert_agency_cart_categories_allowed(
  conn: pog.Connection,
  cart_id: String,
  agency_id: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "select count(*)::text from cart_lines cl inner join listings l on l.id = cl.listing_id inner join product_categories pc on pc.id = l.category_id where cl.cart_id = $1::uuid and exists (select 1 from agency_category_grants g where g.agency_organization_id = $2::uuid) and not exists (select 1 from agency_category_grants g2 where g2.agency_organization_id = $2::uuid and g2.approved = true and g2.category_code = pc.code)",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.parameter(pog.text(agency_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("agency_cart_category_check_failed")
    Ok(ret) ->
      case ret.rows {
        [cnt] ->
          case cnt == "0" {
            True -> Ok(Nil)
            False -> Error("agency_category_not_granted")
          }
        _ -> Error("agency_cart_category_check_failed")
      }
  }
}

fn maybe_assert_agency_checkout_allowed(
  conn: pog.Connection,
  cart_id: String,
  agency_id_opt: Option(String),
) -> Result(Nil, String) {
  case agency_id_opt {
    None -> Ok(Nil)
    Some(aid) ->
      case assert_agency_document_approved_for_org(conn, aid) {
        Error(e) -> Error(e)
        Ok(Nil) -> assert_agency_cart_categories_allowed(conn, cart_id, aid)
      }
  }
}

/// Oturumlu kullanıcının `user_roles` üzerinden verilen acente kurumu için
/// `agency` rolünde üye olduğunu doğrular. Bu kontrol, istemciden gönderilen
/// `agency_organization_id` ile başka bir acentenin adına rezervasyon yazdırılmasını engeller.
fn assert_agency_session_membership(
  conn: pog.Connection,
  user_id: String,
  agency_id: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "select 1::text
         from user_roles ur
         join roles r on r.id = ur.role_id and r.code = 'agency'
        where ur.user_id = $1::uuid and ur.organization_id = $2::uuid
        limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.parameter(pog.text(agency_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error("agency_membership_check_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> Error("agency_membership_required")
        _ -> Ok(Nil)
      }
  }
}

/// Acente kimliği gönderildiyse: oturum kullanıcısı zorunlu ve `user_roles` ile eşleşmeli.
/// Kimlik gönderilmediyse (None) hiçbir şey yapmaz.
fn maybe_assert_agency_session(
  conn: pog.Connection,
  token: String,
  agency_id_opt: Option(String),
) -> Result(Nil, String) {
  case agency_id_opt {
    None -> Ok(Nil)
    Some(aid) ->
      case user_id_email_from_session(conn, token) {
        Error(_) -> Error("agency_session_required")
        Ok(#(uid, _)) -> assert_agency_session_membership(conn, uid, aid)
      }
  }
}

/// Sepete iliştirilmiş kupon varsa:
///  1) reservations.discount_amount, coupon_id, coupon_code güncelle
///  2) coupons.used_count += 1
/// Hata durumunda sessizce geçer; kuponsuz akış bozulmasın.
fn apply_pending_coupon_to_reservation(
  conn: pog.Connection,
  cart_id: String,
  reservation_id: String,
  subtotal: Float,
) -> Nil {
  case
    pog.query(
      "select coupon_id::text, code, discount_type, discount_value::text from cart_coupons where cart_id = $1::uuid",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning({
      use cid <- decode.field(0, decode.string)
      use code <- decode.field(1, decode.string)
      use dt <- decode.field(2, decode.string)
      use dv <- decode.field(3, decode.string)
      decode.success(#(cid, code, dt, dv))
    })
    |> pog.execute(conn)
  {
    Error(_) -> Nil
    Ok(r) ->
      case r.rows {
        [#(coupon_id, code, dt, dv_raw)] -> {
          let dv = case float.parse(dv_raw) {
            Ok(f) -> f
            Error(_) ->
              case int.parse(dv_raw) {
                Ok(n) -> int.to_float(n)
                Error(_) -> 0.0
              }
          }
          let discount = case string.lowercase(dt) {
            "percent" -> {
              let raw = subtotal *. dv /. 100.0
              let cents = float.round(raw *. 100.0)
              int.to_float(cents) /. 100.0
            }
            "fixed" ->
              case dv >. subtotal {
                True -> subtotal
                False -> dv
              }
            _ -> 0.0
          }
          let _ =
            pog.query(
              "update reservations set discount_amount = $1::numeric, coupon_id = $2::uuid, coupon_code = $3 where id = $4::uuid",
            )
            |> pog.parameter(pog.text(float.to_string(discount)))
            |> pog.parameter(pog.text(coupon_id))
            |> pog.parameter(pog.text(code))
            |> pog.parameter(pog.text(reservation_id))
            |> pog.execute(conn)
          let _ =
            pog.query(
              "update coupons set used_count = used_count + 1 where id = $1::uuid",
            )
            |> pog.parameter(pog.text(coupon_id))
            |> pog.execute(conn)
          Nil
        }
        _ -> Nil
      }
  }
}

fn complete_checkout_with_snapshot(
  conn: pog.Connection,
  cart_id: String,
  lines: List(#(String, Int, String, String, String, String)),
  snap_json: String,
  email: String,
  name: String,
  guest_phone: Option(String),
  hold_minutes: Int,
  agency_id_opt: Option(String),
  payment_type: String,
  installments: Int,
) -> Result(#(String, String, String, String), String) {
  let agency_param = case agency_id_opt {
    None -> pog.null()
    Some(id) -> pog.text(id)
  }
  let agency_disc_factor = case agency_id_opt {
    None -> 1.0
    Some(aid) ->
      case agency_max_checkout_discount_factor(conn, aid) {
        Ok(f) -> f
        Error(_) -> 1.0
      }
  }
  let disc_pct_display = case agency_id_opt {
    None -> 0.0
    Some(_) ->
      case agency_disc_factor >=. 1.0 {
        True -> 0.0
        False -> {
          let off = 1.0 -. agency_disc_factor
          off *. 100.0
        }
      }
  }
  let fx_snap_text = case
    pog.query(
      "select coalesce(fx_snapshot_json::text, '{}') from carts where id = $1::uuid",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Ok(r) ->
      case r.rows {
        [s] -> s
        _ -> "{}"
      }
    Error(_) -> "{}"
  }
  let fx_lock_field = case string.trim(fx_snap_text) == "" || fx_snap_text == "{}" {
    True -> #("fx_lock", json.null())
    False -> #("fx_lock", json.string(string.trim(fx_snap_text)))
  }
  let currency_code = case
    pog.query(
      "select currency_code::text from carts where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Ok(cr) ->
      case cr.rows {
        [cc] -> cc
        _ -> "TRY"
      }
    Error(_) -> "TRY"
  }
  // Boş `lines` panik etmesin: do_checkout zaten engelliyor; bu defansif guard
  // bir bug nedeniyle buraya boş listeyle düşersek 500 yerine açıklayıcı hata döner.
  use first <- result.try(
    list.first(lines) |> result.replace_error("cart_empty"),
  )
  let #(lid0, _, _, s0, e0, _) = first
  let range = list.fold(lines, #(s0, e0), fn(acc, line) {
    let #(_, _, _, s, e, _) = line
    let #(a1, a2) = acc
    let min_s = case string.compare(s, a1) {
      order.Lt -> s
      _ -> a1
    }
    let max_e = case string.compare(e, a2) {
      order.Gt -> e
      _ -> a2
    }
    #(min_s, max_e)
  })
  let #(starts_min, ends_max) = range
  let phone_param = case guest_phone {
    Some(p) -> pog.text(p)
    None -> pog.null()
  }
  let lines_json =
    json.preprocessed_array(
      list.map(lines, fn(line) {
        let #(lid, qty, up, s, e, lt) = line
        let lt_out = line_total_with_agency_discount(lt, agency_disc_factor)
        json.object([
          #("listing_id", json.string(lid)),
          #("quantity", json.int(qty)),
          #("unit_price", json.string(up)),
          #("starts_on", json.string(s)),
          #("ends_on", json.string(e)),
          #("line_total", json.string(lt_out)),
        ])
      }),
    )
  let total_q =
    list.fold(lines, 0.0, fn(acc, line) {
      let #(_, _, _, _, _, lt) = line
      let lt_adj = line_total_with_agency_discount(lt, agency_disc_factor)
      case float.parse(string.trim(lt_adj)) {
        Ok(f) -> acc +. f
        Error(_) -> acc
      }
    })
  let total_str = float.to_string(total_q)
  let payment_amount_kurus = int.to_string(float.round(total_q *. 100.0))
  let breakdown_base = [
    #("version", json.int(1)),
    #("lines", lines_json),
    #("total", json.string(total_str)),
  ]
  let breakdown_base = case disc_pct_display >. 0.000001 {
    True ->
      list.append(breakdown_base, [
        #(
          "agency_discount_percent",
          json.string(float.to_string(disc_pct_display)),
        ),
      ])
    False -> breakdown_base
  }
  let breakdown_base = list.append(breakdown_base, [fx_lock_field])
  let breakdown = json.object(breakdown_base) |> json.to_string
  case
    pog.query(
      "insert into reservations (listing_id, user_id, agency_organization_id, guest_email, guest_name, guest_phone, starts_on, ends_on, status, price_breakdown_json, source_cart_id, contract_accepted_at, contract_snapshots_json, payment_type, installments) values ($1::uuid, (select user_id from carts where id = $8::uuid), $9, $2, $3, $4, case when $5 = '' then current_date else $5::date end, case when $6 = '' then current_date else $6::date end, 'held', $7::jsonb, $8::uuid, now(), $10::jsonb, $11, $12) returning id::text, public_code",
    )
    |> pog.parameter(pog.text(lid0))
    |> pog.parameter(pog.text(email))
    |> pog.parameter(pog.text(name))
    |> pog.parameter(phone_param)
    |> pog.parameter(pog.text(starts_min))
    |> pog.parameter(pog.text(ends_max))
    |> pog.parameter(pog.text(breakdown))
    |> pog.parameter(pog.text(cart_id))
    |> pog.parameter(agency_param)
    |> pog.parameter(pog.text(snap_json))
    |> pog.parameter(pog.text(payment_type))
    |> pog.parameter(pog.int(installments))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      use b <- decode.field(1, decode.string)
      decode.success(#(a, b))
    })
    |> pog.execute(conn)
  {
    Error(_) -> Error("reservation_insert_failed")
    Ok(r) ->
      case r.rows {
        [#(rid, pcode)] -> {
          let indexed =
            list.index_map(lines, fn(line, idx) {
              #(idx + 1, line)
            })
          let line_result =
            list.try_map(indexed, fn(pair) {
              let #(i, line) = pair
              let #(lid, qty, up, s1, s2, lt) = line
              let lt_adj = line_total_with_agency_discount(lt, agency_disc_factor)
              let meta = "{}"
              case
                pog.query(
                  "insert into reservation_line_items (reservation_id, listing_id, line_no, quantity, starts_on, ends_on, unit_price, line_total, tax_amount, fee_amount, meta_json) values ($1::uuid, $2::uuid, $3, $4, case when $5 = '' then null else $5::date end, case when $6 = '' then null else $6::date end, $7::numeric, $8::numeric, 0, 0, $9::jsonb)",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.parameter(pog.text(lid))
                |> pog.parameter(pog.int(i))
                |> pog.parameter(pog.int(qty))
                |> pog.parameter(pog.text(s1))
                |> pog.parameter(pog.text(s2))
                |> pog.parameter(pog.text(up))
                |> pog.parameter(pog.text(lt_adj))
                |> pog.parameter(pog.text(meta))
                |> pog.execute(conn)
              {
                Ok(_) -> Ok(Nil)
                Error(_) -> Error("line_item_row")
              }
            })
          case line_result {
            Error(_) -> Error("line_items_failed")
            Ok(_) -> {
              let event_payload =
                json.object([#("cart_id", json.string(cart_id))])
                |> json.to_string
              let _ =
                pog.query(
                  "insert into reservation_events (reservation_id, event_type, payload_json) values ($1::uuid, 'checkout_held', $2::jsonb)",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.parameter(pog.text(event_payload))
                |> pog.execute(conn)
              let hold_sql =
                "insert into inventory_holds (listing_id, starts_on, ends_on, quantity, cart_id, reservation_id, expires_at, status) values ($1::uuid, case when $2 = '' then current_date else $2::date end, case when $3 = '' then current_date else $3::date end, $4, $5::uuid, $6::uuid, now() + ($7::text || ' minutes')::interval, 'active')"
              let hold_result =
                list.try_map(lines, fn(line) {
                  let #(lid, qty, _, s1, s2, _) = line
                  case
                    pog.query(hold_sql)
                    |> pog.parameter(pog.text(lid))
                    |> pog.parameter(pog.text(s1))
                    |> pog.parameter(pog.text(s2))
                    |> pog.parameter(pog.int(qty))
                    |> pog.parameter(pog.text(cart_id))
                    |> pog.parameter(pog.text(rid))
                    |> pog.parameter(pog.text(int.to_string(hold_minutes)))
                    |> pog.execute(conn)
                  {
                    Ok(_) -> Ok(Nil)
                    Error(_) -> Error(Nil)
                  }
                })
              case hold_result {
                Error(_) -> Error("holds_failed")
                Ok(_) -> {
                  // Sepete iliştirilmiş kupon varsa rezervasyona snapshot olarak yansıt + used_count++.
                  let _ = apply_pending_coupon_to_reservation(conn, cart_id, rid, total_q)
                  let _ =
                    pog.query(
                      "delete from cart_lines where cart_id = $1::uuid",
                    )
                    |> pog.parameter(pog.text(cart_id))
                    |> pog.execute(conn)
                  let _ =
                    pog.query(
                      "delete from carts where id = $1::uuid",
                    )
                    |> pog.parameter(pog.text(cart_id))
                    |> pog.execute(conn)
                  // Provizyon tutarlarını hesapla; kısmi ödemede müşteri tutarı değişir
                  let payment_amount_kurus =
                    case
                      pog.query(
                        "select round(fn_compute_provizyon($1::uuid) * 100)::bigint::text",
                      )
                      |> pog.parameter(pog.text(rid))
                      |> pog.returning(row_dec.col0_string())
                      |> pog.execute(conn)
                    {
                      Ok(r2) ->
                        case r2.rows {
                          [s] -> s
                          _ -> payment_amount_kurus
                        }
                      Error(_) -> payment_amount_kurus
                    }
                  Ok(#(rid, pcode, payment_amount_kurus, currency_code))
                }
              }
            }
          }
        }
        _ -> Error("unexpected_reservation_return")
      }
  }
}

/// Personel POS vb. için aynı checkout iş kuralı (transaction içinde çağrılmalı).
pub fn do_checkout(
  conn: pog.Connection,
  cart_id: String,
  guest_email: String,
  guest_name: String,
  guest_phone: Option(String),
  hold_minutes: Int,
  agency_org: Option(String),
  contract_accepted: Bool,
  contract_locale: String,
  general_contract_accepted: Bool,
  sales_contract_accepted: Bool,
  payment_type: String,
  installments: Int,
) -> Result(#(String, String, String, String), String) {
  let email = string.lowercase(string.trim(guest_email))
  let name = string.trim(guest_name)
  case email == "" || name == "" {
    True -> Error("guest_fields_required")
    False -> {
      case resolve_agency_id(conn, agency_org) {
        Error(e) -> Error(e)
        Ok(agency_id_opt) -> {
          case maybe_assert_agency_checkout_allowed(conn, cart_id, agency_id_opt) {
            Error(e) -> Error(e)
            Ok(Nil) -> {
      case
        pog.query(
          "select cl.listing_id::text, cl.quantity, cl.unit_price::text, coalesce(cl.starts_on::text, ''), coalesce(cl.ends_on::text, ''), (cl.quantity * cl.unit_price)::text from cart_lines cl where cl.cart_id = $1::uuid order by cl.id",
        )
        |> pog.parameter(pog.text(cart_id))
        |> pog.returning(cart_line_row())
        |> pog.execute(conn)
      {
        Error(_) -> Error("load_lines_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> Error("cart_empty")
            lines -> {
              let loc = case string.trim(contract_locale) == "" {
                True -> "tr"
                False -> string.lowercase(string.trim(contract_locale))
              }
              case contract_accepted {
                False -> Error("contract_not_accepted")
                True ->
                  case assert_cart_contracts_valid(conn, cart_id) {
                    Error(e) -> Error(e)
                    Ok(Nil) ->
                      case cart_primary_listing_org(conn, cart_id) {
                        Error(e) -> Error(e)
                        Ok(org_text) ->
                          case fetch_scoped_contract_for_org(conn, org_text, loc, "general") {
                            Error(e) -> Error(e)
                            Ok(gen_opt) ->
                              case fetch_scoped_contract_for_org(conn, org_text, loc, "sales") {
                                Error(e) -> Error(e)
                                Ok(sal_opt) ->
                                  case
                                    require_acceptance_when_contract_present(
                                      gen_opt,
                                      general_contract_accepted,
                                      "general_contract_not_accepted",
                                    )
                                  {
                                    Error(e) -> Error(e)
                                    Ok(Nil) ->
                                      case
                                        require_acceptance_when_contract_present(
                                          sal_opt,
                                          sales_contract_accepted,
                                          "sales_contract_not_accepted",
                                        )
                                      {
                                        Error(e) -> Error(e)
                                        Ok(Nil) ->
                                          case build_contract_snapshots(
                                            conn,
                                            cart_id,
                                            loc,
                                            org_text,
                                          ) {
                                            Error(e) -> Error(e)
                                            Ok(snap_json) ->
                                              complete_checkout_with_snapshot(
                                                conn,
                                                cart_id,
                                                lines,
                                                snap_json,
                                                email,
                                                name,
                                                guest_phone,
                                                hold_minutes,
                                                agency_id_opt,
                                                payment_type,
                                                installments,
                                              )
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
            }
          }
        }
      }
    }
  }
}

fn cart_line_list_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String),
) {
  use line_id <- decode.field(0, decode.string)
  use listing_id <- decode.field(1, decode.string)
  use qty <- decode.field(2, decode.string)
  use up <- decode.field(3, decode.string)
  use s1 <- decode.field(4, decode.string)
  use s2 <- decode.field(5, decode.string)
  use lt <- decode.field(6, decode.string)
  decode.success(#(line_id, listing_id, qty, up, s1, s2, lt))
}

/// GET /api/v1/carts/:id — sepet + kur kilidi (gösterim politikası).
pub fn get_cart(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select c.currency_code::text, coalesce(c.fx_locked_at::text, ''), coalesce(c.fx_snapshot_json::text, '{}') from carts c where c.id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(cart_id))
    |> pog.returning({
      use cc <- decode.field(0, decode.string)
      use fx_at <- decode.field(1, decode.string)
      use fx_js <- decode.field(2, decode.string)
      decode.success(#(cc, fx_at, fx_js))
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "cart_load_failed")
    Ok(head) ->
      case head.rows {
        [] -> json_err(404, "cart_not_found")
        [#(cc, fx_at, fx_js)] -> {
          let fx_lock_val = case string.trim(fx_js) == "" || fx_js == "{}" {
            True -> json.null()
            False -> json.string(string.trim(fx_js))
          }
          case
            pog.query(
              "select cl.id::text, cl.listing_id::text, cl.quantity::text, cl.unit_price::text, coalesce(cl.starts_on::text, ''), coalesce(cl.ends_on::text, ''), (cl.quantity * cl.unit_price)::text from cart_lines cl where cl.cart_id = $1::uuid order by cl.id",
            )
            |> pog.parameter(pog.text(cart_id))
            |> pog.returning(cart_line_list_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "lines_failed")
            Ok(lr) -> {
              let line_arr =
                list.map(lr.rows, fn(row) {
                  let #(line_id, listing_id, qty, up, s1, s2, lt) = row
                  json.object([
                    #("id", json.string(line_id)),
                    #("listing_id", json.string(listing_id)),
                    #("quantity", json.string(qty)),
                    #("unit_price", json.string(up)),
                    #("starts_on", json.string(s1)),
                    #("ends_on", json.string(s2)),
                    #("line_total", json.string(lt)),
                  ])
                })
              let fx_at_field = case string.trim(fx_at) == "" {
                True -> json.null()
                False -> json.string(fx_at)
              }
              let body =
                json.object([
                  #("id", json.string(cart_id)),
                  #("currency_code", json.string(cc)),
                  #("fx_locked_at", fx_at_field),
                  #("fx_lock", fx_lock_val),
                  #("lines", json.preprocessed_array(line_arr)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

pub fn checkout(req: Request, ctx: Context, cart_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  let session_token = auth_header_token(req)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, checkout_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(
          guest_email,
          guest_name,
          guest_phone,
          hold_minutes,
          agency_org,
          contract_accepted,
          contract_locale,
          general_contract_accepted,
          sales_contract_accepted,
          payment_type,
          installments,
        )) -> {
          let hm = case hold_minutes < 5 || hold_minutes > 120 {
            True -> 15
            False -> hold_minutes
          }
          // Acente kimliği gönderildiyse oturum + üyelik şart (cross-agency booking guard).
          let agency_pre_opt = case agency_org {
            Some(a) ->
              case string.trim(a) == "" {
                True -> None
                False -> Some(string.trim(a))
              }
            None -> None
          }
          case maybe_assert_agency_session(ctx.db, session_token, agency_pre_opt) {
            Error("agency_session_required") -> json_err(401, "agency_session_required")
            Error("agency_membership_required") -> json_err(403, "agency_membership_required")
            Error(e) -> json_err(500, e)
            Ok(Nil) ->
          case
            pog.transaction(ctx.db, fn(conn) {
              do_checkout(
                conn,
                cart_id,
                guest_email,
                guest_name,
                guest_phone,
                hm,
                agency_org,
                contract_accepted,
                contract_locale,
                general_contract_accepted,
                sales_contract_accepted,
                payment_type,
                installments,
              )
            })
          {
            Ok(#(rid, pcode, pay_kurus, cur)) -> {
              // İlan sahibi bildirimi ödeme başarılı olduktan sonra (PayTR/Paratika callback).
              let _ = notification_runtime.dispatch_agency_reservation_created(ctx.db, rid)
              let out =
                json.object([
                  #("reservation_id", json.string(rid)),
                  #("public_code", json.string(pcode)),
                  #("status", json.string("held")),
                  #("payment_amount", json.string(pay_kurus)),
                  #("currency_code", json.string(cur)),
                  #("payment_type", json.string(payment_type)),
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
                "invalid_agency_organization" -> json_err(400, msg)
                "contract_not_accepted" -> json_err(400, msg)
                "general_contract_not_accepted" -> json_err(400, msg)
                "sales_contract_not_accepted" -> json_err(400, msg)
                "listing_contract_required" -> json_err(400, msg)
                "contract_validation_failed" -> json_err(500, msg)
                "contract_snapshot_failed" -> json_err(500, msg)
                "cart_org_resolve_failed" -> json_err(500, msg)
                "checkout_contract_extras_failed" -> json_err(500, msg)
                _ -> json_err(400, msg)
              }
          }
          }
        }
      }
  }
}

fn line_detail_decoder() -> decode.Decoder(
  #(String, String, String, String, String, String, String),
) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  use e <- decode.field(4, decode.string)
  use f <- decode.field(5, decode.string)
  use g <- decode.field(6, decode.string)
  decode.success(#(a, b, c, d, e, f, g))
}

pub fn get_by_public_code(req: Request, ctx: Context, code: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let email_result = case http_request.get_query(req) {
    Ok(q) -> list.key_find(q, "guest_email")
    Error(_) -> Error(Nil)
  }
  case email_result {
    Error(_) -> json_err(400, "guest_email_required")
    Ok(mail) ->
      case string.trim(mail) == "" {
        True -> json_err(400, "guest_email_required")
        False ->
          case
            pog.query(
              "select r.id::text, r.public_code, r.status, r.guest_email, r.guest_name, coalesce(r.starts_on::text, ''), coalesce(r.ends_on::text, ''), r.price_breakdown_json::text, to_char(r.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from reservations r where r.public_code = $1 and lower(r.guest_email) = lower($2) limit 1",
            )
            |> pog.parameter(pog.text(code))
            |> pog.parameter(pog.text(string.trim(mail)))
            |> pog.returning({
              use a <- decode.field(0, decode.string)
              use b <- decode.field(1, decode.string)
              use c <- decode.field(2, decode.string)
              use d <- decode.field(3, decode.string)
              use e <- decode.field(4, decode.string)
              use f <- decode.field(5, decode.string)
              use g <- decode.field(6, decode.string)
              use h <- decode.field(7, decode.string)
              use i <- decode.field(8, decode.string)
              decode.success(#(a, b, c, d, e, f, g, h, i))
            })
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "load_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> json_err(404, "not_found")
                [#(rid, pcode, st, ge, gn, s1, s2, pj, ts)] -> {
                  let lines = case
                    pog.query(
                      "select listing_id::text, line_no::text, quantity::text, unit_price::text, line_total::text, coalesce(starts_on::text, ''), coalesce(ends_on::text, '') from reservation_line_items where reservation_id = $1::uuid order by line_no",
                    )
                    |> pog.parameter(pog.text(rid))
                    |> pog.returning(line_detail_decoder())
                    |> pog.execute(ctx.db)
                  {
                    Ok(lr) -> lr.rows
                    Error(_) -> []
                  }
                  let line_json =
                    list.map(lines, fn(row) {
                      let #(lid, lno, qty, up, lt, ds, de) = row
                      json.object([
                        #("listing_id", json.string(lid)),
                        #("line_no", json.string(lno)),
                        #("quantity", json.string(qty)),
                        #("unit_price", json.string(up)),
                        #("line_total", json.string(lt)),
                        #("starts_on", json.string(ds)),
                        #("ends_on", json.string(de)),
                      ])
                    })
                  let body =
                    json.object([
                      #("id", json.string(rid)),
                      #("public_code", json.string(pcode)),
                      #("status", json.string(st)),
                      #("guest_email", json.string(ge)),
                      #("guest_name", json.string(gn)),
                      #("starts_on", json.string(s1)),
                      #("ends_on", json.string(s2)),
                      #("price_breakdown_json", json.string(pj)),
                      #("created_at", json.string(ts)),
                      #("lines", json.preprocessed_array(line_json)),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
                _ -> json_err(500, "unexpected")
              }
          }
      }
  }
}

fn auth_header_token(req: Request) -> String {
  case http_request.get_header(req, "authorization") {
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

fn user_id_email_from_session(
  conn: pog.Connection,
  token: String,
) -> Result(#(String, String), Nil) {
  case string.trim(token) == "" {
    True -> Error(Nil)
    False ->
      case
        pog.query(
          "select u.id::text, coalesce(u.email, '') from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
        )
        |> pog.parameter(pog.text(token))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          use b <- decode.field(1, decode.string)
          decode.success(#(a, b))
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

fn mine_reservation_row() -> decode.Decoder(
  #(
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
  ),
) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  use e <- decode.field(4, decode.string)
  use f <- decode.field(5, decode.string)
  use g <- decode.field(6, decode.string)
  use h <- decode.field(7, decode.string)
  use i <- decode.field(8, decode.string)
  use j <- decode.field(9, decode.string)
  use k <- decode.field(10, decode.string)
  use l <- decode.field(11, decode.string)
  decode.success(#(a, b, c, d, e, f, g, h, i, j, k, l))
}

/// Acente kurumuna bağlı rezervasyonlar (`agency_organization_id`).
pub fn list_agency_reservations_response(
  conn: pog.Connection,
  org_id: String,
) -> Response {
  case
    pog.query(
      "select r.id::text, r.public_code, r.status, coalesce(r.guest_name, ''), coalesce(r.starts_on::text, ''), coalesce(r.ends_on::text, ''), to_char(r.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), coalesce(l.slug, ''), coalesce(r.payment_status::text, ''), coalesce(r.amount_paid::text, '0'), coalesce(r.currency_code::text, ''), coalesce(pc.code, '') from reservations r left join listings l on l.id = r.listing_id left join product_categories pc on pc.id = l.category_id where r.agency_organization_id = $1::uuid order by r.created_at desc limit 100",
    )
    |> pog.parameter(pog.text(org_id))
    |> pog.returning(mine_reservation_row())
    |> pog.execute(conn)
  {
    Error(_) -> json_err(500, "list_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(row) {
          let #(rid, pcode, st, gn, s1, s2, ts, lslug, pay_st, amt, cur, cat) =
            row
          json.object([
            #("id", json.string(rid)),
            #("public_code", json.string(pcode)),
            #("status", json.string(st)),
            #("guest_name", json.string(gn)),
            #("starts_on", json.string(s1)),
            #("ends_on", json.string(s2)),
            #("created_at", json.string(ts)),
            #("listing_slug", json.string(lslug)),
            #("payment_status", json.string(pay_st)),
            #("amount_paid", json.string(amt)),
            #("currency_code", json.string(cur)),
            #("listing_category_code", json.string(cat)),
          ])
        })
      let body =
        json.object([#("reservations", json.preprocessed_array(arr))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn admin_resv_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  use e <- decode.field(4, decode.string)
  use f <- decode.field(5, decode.string)
  decode.success(#(a, b, c, d, e, f))
}

/// GET /api/v1/admin/reservations?status=&search=&limit= — Tüm rezervasyonlar (admin.users.read).
pub fn list_admin_reservations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_uid) -> {
      let qs = case http_request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let status_filter =
        list.key_find(qs, "status") |> result.unwrap("")
      let search_raw =
        list.key_find(qs, "search") |> result.unwrap("")
      let limit_str =
        list.key_find(qs, "limit") |> result.unwrap("200")
      let limit =
        int.parse(limit_str) |> result.unwrap(200) |> int.min(500) |> int.max(1)
      case
        pog.query(
          "select r.id::text, r.public_code, r.status::text, coalesce(r.guest_email, ''), coalesce(l.slug, ''), to_char(r.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from reservations r left join listings l on l.id = r.listing_id where ($1 = '' or r.status::text = $1) and ($2 = '' or lower(r.public_code) like lower('%' || $2 || '%') or lower(coalesce(r.guest_email,'')) like lower('%' || $2 || '%') or lower(coalesce(l.slug,'')) like lower('%' || $2 || '%')) order by r.created_at desc limit $3",
        )
        |> pog.parameter(pog.text(status_filter))
        |> pog.parameter(pog.text(search_raw))
        |> pog.parameter(pog.int(limit))
        |> pog.returning(admin_resv_row())
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
}

/// GET /api/v1/reservations/mine — oturumdaki kullanıcı (user_id veya misafir e-posta eşleşmesi).
pub fn list_my_reservations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let token = auth_header_token(req)
  case user_id_email_from_session(ctx.db, token) {
    Error(_) -> json_err(401, "unauthorized")
    Ok(#(uid, email)) ->
      case
        pog.query(
          "select r.id::text, r.public_code, r.status, coalesce(r.guest_name, ''), coalesce(r.starts_on::text, ''), coalesce(r.ends_on::text, ''), to_char(r.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), coalesce(l.slug, ''), coalesce(r.payment_status::text, ''), coalesce(r.amount_paid::text, '0'), coalesce(r.currency_code::text, ''), coalesce(pc.code, '') from reservations r left join listings l on l.id = r.listing_id left join product_categories pc on pc.id = l.category_id where r.user_id = $1::uuid or lower(r.guest_email) = lower($2) order by r.created_at desc limit 100",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.parameter(pog.text(email))
        |> pog.returning(mine_reservation_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(rid, pcode, st, gn, s1, s2, ts, lslug, pay_st, amt, cur, cat) =
                row
              json.object([
                #("id", json.string(rid)),
                #("public_code", json.string(pcode)),
                #("status", json.string(st)),
                #("guest_name", json.string(gn)),
                #("starts_on", json.string(s1)),
                #("ends_on", json.string(s2)),
                #("created_at", json.string(ts)),
                #("listing_slug", json.string(lslug)),
                #("payment_status", json.string(pay_st)),
                #("amount_paid", json.string(amt)),
                #("currency_code", json.string(cur)),
                #("listing_category_code", json.string(cat)),
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
