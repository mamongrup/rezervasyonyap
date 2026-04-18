//// Acente — API anahtarları, kurum özeti, komisyon oranları (G3.2).

import backend/context.{type Context}
import travel/identity/permissions
import travel/agency/api_key
import travel/agency/agency_invoices
import travel/agency/commission_accruals as agency_commission_accruals
import travel/agency/sales_summary as agency_sales
import travel/booking/booking_http
import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
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

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
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

fn agency_context_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use oid <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use doc <- decode.field(3, decode.string)
  use disc <- decode.field(4, decode.string)
  decode.success(#(oid, slug, name, doc, disc))
}

fn require_agency_org(
  conn: pog.Connection,
  user_id: String,
) -> Result(#(String, String, String, String, String), Nil) {
  case
    pog.query(
      "select o.id::text, o.slug, o.name, coalesce(ap.document_status, ''), coalesce(ap.discount_percent::text, '0') from user_roles ur inner join roles r on r.id = ur.role_id inner join organizations o on o.id = ur.organization_id left join agency_profiles ap on ap.user_id = ur.user_id and ap.organization_id = ur.organization_id where ur.user_id = $1::uuid and r.code = 'agency' order by o.id limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(agency_context_row())
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

fn auth_agency(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String, String, String, String, String), Response) {
  let token = auth_header_token(req)
  case token == "" {
    True -> Error(json_err(401, "missing_token"))
    False ->
      case session_user_id(conn, token) {
        Error(_) -> Error(json_err(401, "invalid_session"))
        Ok(uid) ->
          case require_agency_org(conn, uid) {
            Error(_) -> Error(json_err(403, "not_agency"))
            Ok(#(oid, slug, name, doc, disc)) -> Ok(#(uid, oid, slug, name, doc, disc))
          }
      }
  }
}

fn auth_agency_portal_core(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String, String, String, String, String), Response) {
  case auth_agency(req, conn) {
    Error(r) -> Error(r)
    Ok(#(uid, oid, slug, name, doc, disc)) ->
      case permissions.user_has_permission(conn, uid, "agency.portal") {
        False -> Error(json_err(403, "forbidden"))
        True -> Ok(#(uid, oid, slug, name, doc, disc))
      }
  }
}

fn agency_document_approved(doc: String) -> Bool {
  string.lowercase(string.trim(doc)) == "approved"
}

/// Oturum + `agency.portal` + belge onayı (`approved`). `/agency/me` hariç tüm portal uçları.
fn auth_agency_portal(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String, String, String, String, String), Response) {
  case auth_agency_portal_core(req, conn) {
    Error(r) -> Error(r)
    Ok(#(uid, oid, slug, name, doc, disc)) ->
      case agency_document_approved(doc) {
        True -> Ok(#(uid, oid, slug, name, doc, disc))
        False ->
          case string.lowercase(string.trim(doc)) == "rejected" {
            True -> Error(json_err(403, "agency_document_rejected"))
            False -> Error(json_err(403, "agency_document_pending"))
          }
      }
  }
}

/// GET /api/v1/agency/me
pub fn me(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal_core(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, slug, name, doc, disc)) -> {
      let body =
        json.object([
          #("organization_id", json.string(oid)),
          #("slug", json.string(slug)),
          #("name", json.string(name)),
          #("document_status", json.string(doc)),
          #("discount_percent", json.string(disc)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn api_key_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use prefix <- decode.field(1, decode.string)
  use lab <- decode.field(2, decode.string)
  use scopes_str <- decode.field(3, decode.string)
  use created <- decode.field(4, decode.string)
  decode.success(#(id, prefix, lab, scopes_str, created))
}

/// GET /api/v1/agency/api-keys
pub fn list_api_keys(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      case
        pog.query(
          "select id::text, key_prefix, coalesce(label, ''), array_to_string(scopes, ','), to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from api_keys where organization_id = $1::uuid order by created_at desc",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.returning(api_key_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, prefix, lab, scopes_str, created) = row
              let scopes =
                string.split(scopes_str, ",")
                |> list.filter(fn(s) { string.trim(s) != "" })
              json.object([
                #("id", json.string(id)),
                #("key_prefix", json.string(prefix)),
                #("label", json.string(lab)),
                #("scopes", json.array(from: scopes, of: json.string)),
                #("created_at", json.string(created)),
              ])
            })
          let body =
            json.object([#("api_keys", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_key_decoder() -> decode.Decoder(String) {
  decode.optional_field("label", "", decode.string, fn(lab) { decode.success(lab) })
}

/// POST /api/v1/agency/api-keys — yanıtta `secret` yalnızca bir kez döner.
pub fn create_api_key(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_key_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(lab_raw) -> {
              let label_param = case string.trim(lab_raw) {
                "" -> pog.null()
                s -> pog.text(s)
              }
              let secret =
                string.append("trk_live_", bit_array.base16_encode(crypto.strong_random_bytes(24)))
              let prefix = slice_prefix(secret, 14)
              let hash = api_key.hash_api_secret(secret)
              let scopes = ["listings.read", "reservations.read"]
              case
                pog.query(
                  "insert into api_keys (organization_id, key_prefix, key_hash, label, scopes) values ($1::uuid, $2, $3, $4, $5::text[]) returning id::text",
                )
                |> pog.parameter(pog.text(oid))
                |> pog.parameter(pog.text(prefix))
                |> pog.parameter(pog.text(hash))
                |> pog.parameter(label_param)
                |> pog.parameter(pog.array(pog.text, scopes))
                |> pog.returning({
                  use a <- decode.field(0, decode.string)
                  decode.success(a)
                })
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "insert_failed")
                Ok(ret) ->
                  case ret.rows {
                    [kid] -> {
                      let out =
                        json.object([
                          #("id", json.string(kid)),
                          #("key_prefix", json.string(prefix)),
                          #("secret", json.string(secret)),
                          #("scopes", json.array(from: scopes, of: json.string)),
                        ])
                        |> json.to_string
                      wisp.json_response(out, 201)
                    }
                    _ -> json_err(500, "unexpected")
                  }
              }
            }
          }
      }
  }
}

fn slice_prefix(s: String, max_len: Int) -> String {
  let len = string.length(s)
  case len <= max_len {
    True -> s
    False -> string.slice(s, 0, max_len)
  }
}

/// DELETE /api/v1/agency/api-keys/:id
pub fn delete_api_key(req: Request, ctx: Context, key_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      case
        pog.query(
          "delete from api_keys where id = $1::uuid and organization_id = $2::uuid",
        )
        |> pog.parameter(pog.text(key_id))
        |> pog.parameter(pog.text(oid))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> {
              let body =
                json.object([#("ok", json.bool(True))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn rate_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use sup <- decode.field(1, decode.string)
  use pct <- decode.field(2, decode.string)
  decode.success(#(id, sup, pct))
}

/// GET /api/v1/agency/reservations — acente kurumuna atanmış rezervasyonlar (oturum).
pub fn list_reservations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      booking_http.list_agency_reservations_response(ctx.db, oid)
  }
}

/// GET /api/v1/agency/sales-summary?from=YYYY-MM-DD&to=YYYY-MM-DD — ciro özeti (`price_breakdown_json.total`).
pub fn sales_summary(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) -> {
      let #(from_q, to_q) = agency_sales.query_range(req)
      agency_sales.response(ctx.db, oid, from_q, to_q)
    }
  }
}

/// GET /api/v1/agency/commission-accruals?from=&to= — satır kalemlerinden tahmini komisyon (onaylı/tamamlanan).
pub fn commission_accruals(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) -> {
      let #(from_q, to_q) = agency_sales.query_range(req)
      agency_commission_accruals.response(ctx.db, oid, from_q, to_q)
    }
  }
}

fn persisted_accrual_row() -> decode.Decoder(#(String, String, String)) {
  use n <- decode.field(0, decode.string)
  use g <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  decode.success(#(n, g, c))
}

/// GET /api/v1/agency/persisted-commission-accruals — `commission_accrual_lines` (PayTR/Paratika capture sonrası).
pub fn persisted_commission_accruals(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) -> {
      let #(from_q, to_q) = agency_sales.query_range(req)
      case
        pog.query(
          "select count(*)::text, coalesce(sum(gross_amount), 0)::text, coalesce(sum(commission_amount), 0)::text from commission_accrual_lines where agency_organization_id = $1::uuid and created_at >= (case when trim($2) = '' then (current_date - interval '30 days')::timestamptz else trim($2)::date::timestamptz end) and created_at < (case when trim($3) = '' then (current_date + interval '1 day')::timestamptz else (trim($3)::date + interval '1 day')::timestamptz end)",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.parameter(pog.text(from_q))
        |> pog.parameter(pog.text(to_q))
        |> pog.returning(persisted_accrual_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "persisted_failed")
        Ok(ret) ->
          case ret.rows {
            [#(n, g, c)] -> {
              let body =
                json.object([
                  #("accrual_line_count", json.string(n)),
                  #("gross_total", json.string(g)),
                  #("commission_total", json.string(c)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected_persisted")
          }
      }
    }
  }
}

fn browse_listing_row() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use cur <- decode.field(2, decode.string)
  use title <- decode.field(3, decode.string)
  use fc <- decode.field(4, decode.string)
  use prep <- decode.field(5, decode.string)
  use sup <- decode.field(6, decode.string)
  decode.success(#(id, slug, cur, title, fc, prep, sup))
}

/// GET /api/v1/agency/browse-listings?search= — yayında ilanlar (ilan seçimi / satış akışı).
/// Kurum için `agency_category_grants` satırı varsa yalnızca onaylı kategori kodlarına göre filtrelenir.
pub fn browse_listings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) -> {
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
          "select l.id::text, l.slug, l.currency_code::text, coalesce((select lt.title from listing_translations lt inner join locales loc on loc.id = lt.locale_id where lt.listing_id = l.id and loc.code = 'tr' limit 1), l.slug), coalesce(l.first_charge_amount::text, ''), coalesce(l.prepayment_amount::text, ''), l.organization_id::text from listings l inner join product_categories pc on pc.id = l.category_id where l.status = 'published' and ($1::text is null or l.slug ilike $1 or l.id::text ilike $1) and (not exists (select 1 from agency_category_grants g where g.agency_organization_id = $2::uuid) or exists (select 1 from agency_category_grants g2 where g2.agency_organization_id = $2::uuid and g2.approved = true and g2.category_code = pc.code)) order by l.updated_at desc limit 40",
        )
        |> pog.parameter(like_param)
        |> pog.parameter(pog.text(oid))
        |> pog.returning(browse_listing_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "browse_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, slug, cur, title, fc, prep, sup) = row
              json.object([
                #("id", json.string(id)),
                #("slug", json.string(slug)),
                #("currency_code", json.string(cur)),
                #("title", json.string(title)),
                #("first_charge_amount", json.string(fc)),
                #("prepayment_amount", json.string(prep)),
                #("supplier_organization_id", json.string(sup)),
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

/// GET /api/v1/agency/commission-rates — tedarikçi başına anlaşmalı oranlar (`supplier_agency_commissions`).
pub fn commission_rates(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      case
        pog.query(
          "select id::text, supplier_organization_id::text, commission_percent::text from supplier_agency_commissions where agency_organization_id = $1::uuid order by supplier_organization_id",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.returning(rate_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(rid, sup, pct) = row
              json.object([
                #("id", json.string(rid)),
                #("supplier_organization_id", json.string(sup)),
                #("commission_percent", json.string(pct)),
              ])
            })
          let body =
            json.object([#("commission_rates", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn invoice_period_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("period_from", decode.string, fn(pf) {
    decode.field("period_to", decode.string, fn(pt) {
      decode.optional_field("currency_code", "", decode.string, fn(cc) {
        decode.success(#(pf, pt, cc))
      })
    })
  })
}

fn invoice_create_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.field("period_from", decode.string, fn(pf) {
    decode.field("period_to", decode.string, fn(pt) {
      decode.optional_field("currency_code", "", decode.string, fn(cc) {
        decode.optional_field("notes", "", decode.string, fn(notes) {
          decode.success(#(pf, pt, cc, notes))
        })
      })
    })
  })
}

fn invoice_notes_decoder() -> decode.Decoder(String) {
  decode.field("notes", decode.string, fn(n) { decode.success(n) })
}

/// GET /api/v1/agency/invoices/:id — başlık + satır kalemleri.
pub fn get_invoice(req: Request, ctx: Context, invoice_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      agency_invoices.get_invoice_response(ctx.db, oid, invoice_id)
  }
}

/// GET /api/v1/agency/invoices
pub fn list_invoices(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) -> agency_invoices.list_response(ctx.db, oid)
  }
}

/// POST /api/v1/agency/invoices/preview — { period_from, period_to, currency_code? }
pub fn preview_invoice(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, invoice_period_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(pf, pt, cc)) ->
              agency_invoices.preview_response(
                ctx.db,
                oid,
                string.trim(pf),
                string.trim(pt),
                string.trim(cc),
              )
          }
      }
  }
}

/// POST /api/v1/agency/invoices — { period_from, period_to, currency_code?, notes? }
pub fn create_invoice(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, invoice_create_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(pf, pt, cc, notes)) ->
              agency_invoices.create_response(
                ctx.db,
                oid,
                string.trim(pf),
                string.trim(pt),
                string.trim(cc),
                notes,
                ctx.invoice_notify,
              )
          }
      }
  }
}

/// POST /api/v1/agency/invoices/:id/cancel — iptal (tahakkuk bağları açılır).
pub fn cancel_invoice(req: Request, ctx: Context, invoice_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      agency_invoices.cancel_response(ctx.db, oid, invoice_id, ctx.invoice_notify)
  }
}

/// PATCH /api/v1/agency/invoices/:id — { "notes": "..." } (yalnızca issued)
pub fn patch_invoice_notes(req: Request, ctx: Context, invoice_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, invoice_notes_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(notes) ->
              agency_invoices.patch_notes_response(ctx.db, oid, invoice_id, notes)
          }
      }
  }
}
