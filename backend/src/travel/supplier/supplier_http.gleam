//// Tedarikçi — kurum, ilanlar, acente komisyonları, öne çıkarma oranları (G3.3).

import backend/context.{type Context}
import travel/identity/permissions
import travel/agency/sales_summary as agency_sales
import travel/supplier/commission_accruals as supplier_commission_accruals
import travel/supplier/supplier_invoices
import gleam/bit_array
import gleam/dynamic/decode
import gleam/float
import gleam/result
import gleam/http
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

fn supplier_context_row() -> decode.Decoder(#(String, String, String, String)) {
  use oid <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use created <- decode.field(3, decode.string)
  decode.success(#(oid, slug, name, created))
}

fn require_supplier_org(
  conn: pog.Connection,
  user_id: String,
) -> Result(#(String, String, String, String), Nil) {
  case
    pog.query(
      "select o.id::text, o.slug, o.name, to_char(sp.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from supplier_profiles sp inner join organizations o on o.id = sp.organization_id where sp.user_id = $1::uuid and o.org_type = 'supplier' limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(supplier_context_row())
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

fn auth_supplier(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String, String, String, String), Response) {
  let token = auth_header_token(req)
  case token == "" {
    True -> Error(json_err(401, "missing_token"))
    False ->
      case session_user_id(conn, token) {
        Error(_) -> Error(json_err(401, "invalid_session"))
        Ok(uid) ->
          case require_supplier_org(conn, uid) {
            Error(_) -> Error(json_err(403, "not_supplier"))
            Ok(#(oid, slug, name, created)) ->
              Ok(#(uid, oid, slug, name, created))
          }
      }
  }
}

fn auth_supplier_portal(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String, String, String, String), Response) {
  case auth_supplier(req, conn) {
    Error(r) -> Error(r)
    Ok(#(uid, oid, slug, name, created)) ->
      case permissions.user_has_permission(conn, uid, "supplier.portal") {
        False -> Error(json_err(403, "forbidden"))
        True -> Ok(#(uid, oid, slug, name, created))
      }
  }
}

/// GET /api/v1/supplier/me
pub fn me(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, slug, name, created)) -> {
      let body =
        json.object([
          #("organization_id", json.string(oid)),
          #("slug", json.string(slug)),
          #("name", json.string(name)),
          #("profile_created_at", json.string(created)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn listing_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String, Bool, Bool),
) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use cur <- decode.field(3, decode.string)
  use comm <- decode.field(4, decode.string)
  use prep_a <- decode.field(5, decode.string)
  use prep_p <- decode.field(6, decode.string)
  use ts <- decode.field(7, decode.string)
  use sh <- decode.field(8, decode.bool)
  use ai <- decode.field(9, decode.bool)
  decode.success(#(id, slug, st, cur, comm, prep_a, prep_p, ts, sh, ai))
}

/// GET /api/v1/supplier/listings?search= — kurum ilanları; isteğe bağlı slug / UUID filtresi.
pub fn list_listings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) -> {
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
          "select l.id::text, l.slug, l.status::text, l.currency_code::text, coalesce(l.commission_percent::text, ''), coalesce(l.prepayment_amount::text, ''), coalesce(l.prepayment_percent::text, ''), to_char(l.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), coalesce(l.share_to_social, false), coalesce(l.allow_ai_caption, false) from listings l where l.organization_id = $1::uuid and ($2::text is null or l.slug ilike $2 or l.id::text ilike $2) order by l.created_at desc limit 200",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.parameter(like_param)
        |> pog.returning(listing_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, slug, st, cur, comm, prep_a, prep_p, ts, sh, ai) = row
              json.object([
                #("id", json.string(id)),
                #("slug", json.string(slug)),
                #("status", json.string(st)),
                #("currency_code", json.string(cur)),
                #("commission_percent", json.string(comm)),
                #("prepayment_amount", json.string(prep_a)),
                #("prepayment_percent", json.string(prep_p)),
                #("created_at", json.string(ts)),
                #("share_to_social", json.bool(sh)),
                #("allow_ai_caption", json.bool(ai)),
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

/// Ön ödeme yüzdesi, komisyon oranından küçük olamaz (aynı anda gönderildiğinde).
fn validate_prepayment_vs_commission(comm: String, prep_p: String) -> Result(Nil, String) {
  let c = string.trim(comm)
  let p = string.trim(prep_p)
  case c != "" && p != "" {
    True ->
      case float.parse(c), float.parse(p) {
        Ok(cf), Ok(pf) ->
          case pf >=. cf {
            True -> Ok(Nil)
            False -> Error("prepayment_percent_must_be_gte_commission_percent")
          }
        _, _ -> Error("invalid_prepayment_or_commission_percent")
      }
    False -> Ok(Nil)
  }
}

fn patch_listing_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.optional_field("commission_percent", "", decode.string, fn(c) {
    decode.optional_field("prepayment_amount", "", decode.string, fn(a) {
      decode.optional_field("prepayment_percent", "", decode.string, fn(p) {
        decode.success(#(c, a, p))
      })
    })
  })
}

fn patch_listing_ret_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use c <- decode.field(1, decode.string)
  use a <- decode.field(2, decode.string)
  use p <- decode.field(3, decode.string)
  decode.success(#(id, c, a, p))
}

/// PATCH /api/v1/supplier/listings/:id — komisyon % ve ön ödeme (gönderilmeyen alan değişmez).
pub fn patch_listing(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_listing_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(c_raw, a_raw, p_raw)) -> {
              let comm = string.trim(c_raw)
              let prep_a = string.trim(a_raw)
              let prep_p = string.trim(p_raw)
              case comm == "" && prep_a == "" && prep_p == "" {
                True -> json_err(400, "no_fields")
                False ->
                  case validate_prepayment_vs_commission(comm, prep_p) {
                    Error(e) -> json_err(400, e)
                    Ok(Nil) ->
                  case
                    pog.query(
                      "update listings set commission_percent = case when trim($3::text) = '' then commission_percent else trim($3)::numeric end, prepayment_amount = case when trim($4::text) = '' then prepayment_amount else nullif(trim($4), '')::numeric end, prepayment_percent = case when trim($5::text) = '' then prepayment_percent else nullif(trim($5), '')::numeric end, updated_at = now() where id = $1::uuid and organization_id = $2::uuid returning id::text, coalesce(commission_percent::text, ''), coalesce(prepayment_amount::text, ''), coalesce(prepayment_percent::text, '')",
                    )
                    |> pog.parameter(pog.text(listing_id))
                    |> pog.parameter(pog.text(oid))
                    |> pog.parameter(pog.text(comm))
                    |> pog.parameter(pog.text(prep_a))
                    |> pog.parameter(pog.text(prep_p))
                    |> pog.returning(patch_listing_ret_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "patch_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [] -> json_err(404, "listing_not_found")
                        [#(lid, c, a, p)] -> {
                          let out =
                            json.object([
                              #("id", json.string(lid)),
                              #("commission_percent", json.string(c)),
                              #("prepayment_amount", json.string(a)),
                              #("prepayment_percent", json.string(p)),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                        _ -> json_err(500, "patch_unexpected")
                      }
                  }
                  }
              }
            }
          }
      }
  }
}

fn sac_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use aid <- decode.field(1, decode.string)
  use pct <- decode.field(2, decode.string)
  decode.success(#(id, aid, pct))
}

/// GET /api/v1/supplier/agency-commissions — acente bazlı komisyon (`supplier_agency_commissions`).
pub fn agency_commissions(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case
        pog.query(
          "select id::text, coalesce(agency_organization_id::text, ''), commission_percent::text from supplier_agency_commissions where supplier_organization_id = $1::uuid order by agency_organization_id nulls last",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.returning(sac_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(rid, ag, pct) = row
              json.object([
                #("id", json.string(rid)),
                #("agency_organization_id", json.string(ag)),
                #("commission_percent", json.string(pct)),
              ])
            })
          let body =
            json.object([#("agency_commissions", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn sac_row_to_json(row: #(String, String, String)) -> json.Json {
  let #(rid, ag, pct) = row
  json.object([
    #("id", json.string(rid)),
    #("agency_organization_id", json.string(ag)),
    #("commission_percent", json.string(pct)),
  ])
}

fn agency_commission_upsert_decoder() -> decode.Decoder(#(String, String)) {
  decode.optional_field("agency_organization_id", "", decode.string, fn(aid) {
    decode.field("commission_percent", decode.string, fn(pct) {
      decode.success(#(aid, pct))
    })
  })
}

fn sac_upsert_json_response(row: #(String, String, String), status: Int) -> Response {
  let out =
    json.object([#("agency_commission", sac_row_to_json(row))])
    |> json.to_string
  wisp.json_response(out, status)
}

/// POST /api/v1/supplier/agency-commissions — acente veya varsayılan (`agency_organization_id` boş) komisyon upsert.
pub fn upsert_agency_commission(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, agency_commission_upsert_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(aid_raw, pct_raw)) -> {
              let aid = string.trim(aid_raw)
              let pct = string.trim(pct_raw)
              case pct == "" {
                True -> json_err(400, "empty_percent")
                False ->
                  case aid == "" {
                    True ->
                      case
                        pog.query(
                          "delete from supplier_agency_commissions where supplier_organization_id = $1::uuid and agency_organization_id is null",
                        )
                        |> pog.parameter(pog.text(oid))
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "delete_failed")
                        Ok(_) ->
                          case
                            pog.query(
                              "insert into supplier_agency_commissions (supplier_organization_id, agency_organization_id, commission_percent) values ($1::uuid, null, trim($2)::numeric) returning id::text, coalesce(agency_organization_id::text, ''), commission_percent::text",
                            )
                            |> pog.parameter(pog.text(oid))
                            |> pog.parameter(pog.text(pct))
                            |> pog.returning(sac_row())
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(400, "insert_failed")
                            Ok(ins) ->
                              case ins.rows {
                                [row] -> sac_upsert_json_response(row, 201)
                                _ -> json_err(500, "insert_unexpected")
                              }
                          }
                      }
                    False ->
                      case
                        pog.query(
                          "insert into supplier_agency_commissions (supplier_organization_id, agency_organization_id, commission_percent) values ($1::uuid, $2::uuid, trim($3)::numeric) on conflict (supplier_organization_id, agency_organization_id) do update set commission_percent = excluded.commission_percent returning id::text, coalesce(agency_organization_id::text, ''), commission_percent::text",
                        )
                        |> pog.parameter(pog.text(oid))
                        |> pog.parameter(pog.text(aid))
                        |> pog.parameter(pog.text(pct))
                        |> pog.returning(sac_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(400, "upsert_failed")
                        Ok(upd) ->
                          case upd.rows {
                            [row] -> sac_upsert_json_response(row, 200)
                            _ -> json_err(500, "upsert_unexpected")
                          }
                      }
                  }
              }
            }
          }
      }
  }
}

/// DELETE /api/v1/supplier/agency-commissions/:id — kuruma ait satırı siler.
pub fn delete_agency_commission(
  req: Request,
  ctx: Context,
  commission_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case
        pog.query(
          "delete from supplier_agency_commissions where id = $1::uuid and supplier_organization_id = $2::uuid",
        )
        |> pog.parameter(pog.text(commission_id))
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

fn promo_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use rt <- decode.field(1, decode.string)
  use pct <- decode.field(2, decode.string)
  use ts <- decode.field(3, decode.string)
  decode.success(#(id, rt, pct, ts))
}

/// GET /api/v1/supplier/commission-accruals?from=&to= — tahmini komisyon + acente kırılımı.
pub fn commission_accruals(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) -> {
      let #(from_q, to_q) = agency_sales.query_range(req)
      supplier_commission_accruals.response(ctx.db, oid, from_q, to_q)
    }
  }
}

fn persisted_accrual_row() -> decode.Decoder(#(String, String, String)) {
  use n <- decode.field(0, decode.string)
  use g <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  decode.success(#(n, g, c))
}

/// GET /api/v1/supplier/persisted-commission-accruals — kayıtlı tahakkuk satırları (özet).
pub fn persisted_commission_accruals(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) -> {
      let #(from_q, to_q) = agency_sales.query_range(req)
      case
        pog.query(
          "select count(*)::text, coalesce(sum(gross_amount), 0)::text, coalesce(sum(commission_amount), 0)::text from commission_accrual_lines where supplier_organization_id = $1::uuid and created_at >= (case when trim($2) = '' then (current_date - interval '30 days')::timestamptz else trim($2)::date::timestamptz end) and created_at < (case when trim($3) = '' then (current_date + interval '1 day')::timestamptz else (trim($3)::date + interval '1 day')::timestamptz end)",
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

/// GET /api/v1/supplier/promotion-fee-rules — reklam / öne çıkarma ek oranları.
pub fn promotion_fee_rules(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case
        pog.query(
          "select id::text, rule_type::text, extra_commission_percent::text, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from supplier_promotion_fee_rules where supplier_organization_id = $1::uuid order by rule_type",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.returning(promo_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(rid, rt, pct, ts) = row
              json.object([
                #("id", json.string(rid)),
                #("rule_type", json.string(rt)),
                #("extra_commission_percent", json.string(pct)),
                #("created_at", json.string(ts)),
              ])
            })
          let body =
            json.object([#("promotion_fee_rules", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn valid_promotion_rule_type(rt: String) -> Bool {
  rt == "ads_support"
  || rt == "category_featured"
  || rt == "homepage_feature"
}

fn promotion_fee_rule_upsert_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("rule_type", decode.string, fn(rt) {
    decode.field("extra_commission_percent", decode.string, fn(pct) {
      decode.success(#(rt, pct))
    })
  })
}

fn promo_row_to_json(row: #(String, String, String, String)) -> json.Json {
  let #(rid, rt, pct, ts) = row
  json.object([
    #("id", json.string(rid)),
    #("rule_type", json.string(rt)),
    #("extra_commission_percent", json.string(pct)),
    #("created_at", json.string(ts)),
  ])
}

/// POST /api/v1/supplier/promotion-fee-rules — tek kural upsert (`ads_support` | `category_featured` | `homepage_feature`).
pub fn upsert_promotion_fee_rule(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, promotion_fee_rule_upsert_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(rt_raw, pct_raw)) -> {
              let rt = string.lowercase(string.trim(rt_raw))
              let pct = string.trim(pct_raw)
              case valid_promotion_rule_type(rt) {
                False -> json_err(400, "invalid_rule_type")
                True ->
                  case pct == "" {
                    True -> json_err(400, "empty_percent")
                    False ->
                      case
                        pog.query(
                          "update supplier_promotion_fee_rules set extra_commission_percent = trim($3)::numeric where supplier_organization_id = $1::uuid and rule_type = $2 returning id::text, rule_type::text, extra_commission_percent::text, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')",
                        )
                        |> pog.parameter(pog.text(oid))
                        |> pog.parameter(pog.text(rt))
                        |> pog.parameter(pog.text(pct))
                        |> pog.returning(promo_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(400, "upsert_failed")
                        Ok(upd) ->
                          case upd.rows {
                            [row] -> {
                              let out =
                                json.object([#("promotion_fee_rule", promo_row_to_json(row))])
                                |> json.to_string
                              wisp.json_response(out, 200)
                            }
                            [] ->
                              case
                                pog.query(
                                  "insert into supplier_promotion_fee_rules (supplier_organization_id, rule_type, extra_commission_percent) values ($1::uuid, $2, trim($3)::numeric) returning id::text, rule_type::text, extra_commission_percent::text, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')",
                                )
                                |> pog.parameter(pog.text(oid))
                                |> pog.parameter(pog.text(rt))
                                |> pog.parameter(pog.text(pct))
                                |> pog.returning(promo_row())
                                |> pog.execute(ctx.db)
                              {
                                Error(_) -> json_err(400, "insert_failed")
                                Ok(ins) ->
                                  case ins.rows {
                                    [row] -> {
                                      let out =
                                        json.object([
                                          #(
                                            "promotion_fee_rule",
                                            promo_row_to_json(row),
                                          ),
                                        ])
                                        |> json.to_string
                                      wisp.json_response(out, 201)
                                    }
                                    _ -> json_err(500, "insert_unexpected")
                                  }
                              }
                            _ -> json_err(500, "update_unexpected")
                          }
                      }
                  }
              }
            }
          }
      }
  }
}

/// DELETE /api/v1/supplier/promotion-fee-rules/:id — kuruma ait kuralı siler.
pub fn delete_promotion_fee_rule(
  req: Request,
  ctx: Context,
  rule_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case
        pog.query(
          "delete from supplier_promotion_fee_rules where id = $1::uuid and supplier_organization_id = $2::uuid returning id::text",
        )
        |> pog.parameter(pog.text(rule_id))
        |> pog.parameter(pog.text(oid))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          decode.success(a)
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "not_found")
            [_] -> {
              let body = json.object([#("ok", json.bool(True))]) |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "delete_unexpected")
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

/// GET /api/v1/supplier/invoices/:id — başlık + satır kalemleri.
pub fn get_invoice(req: Request, ctx: Context, invoice_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      supplier_invoices.get_invoice_response(ctx.db, oid, invoice_id)
  }
}

/// GET /api/v1/supplier/invoices
pub fn list_invoices(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) -> supplier_invoices.list_response(ctx.db, oid)
  }
}

/// POST /api/v1/supplier/invoices/preview — { period_from, period_to, currency_code? }
pub fn preview_invoice(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, invoice_period_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(pf, pt, cc)) ->
              supplier_invoices.preview_response(
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

/// POST /api/v1/supplier/invoices — { period_from, period_to, currency_code?, notes? }
pub fn create_invoice(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, invoice_create_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(pf, pt, cc, notes)) ->
              supplier_invoices.create_response(
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

/// POST /api/v1/supplier/invoices/:id/cancel
pub fn cancel_invoice(req: Request, ctx: Context, invoice_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      supplier_invoices.cancel_response(ctx.db, oid, invoice_id, ctx.invoice_notify)
  }
}

/// PATCH /api/v1/supplier/invoices/:id — { "notes": "..." }
pub fn patch_invoice_notes(req: Request, ctx: Context, invoice_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid, _, _, _)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, invoice_notes_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(notes) ->
              supplier_invoices.patch_notes_response(ctx.db, oid, invoice_id, notes)
          }
      }
  }
}
