//// Ürün kategorileri ve yönetim ilan listesi / taslak oluşturma.

import backend/context.{type Context}
import gleam/bit_array
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import gleam/dynamic/decode
import pog
import travel/identity/permissions
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

fn category_row() -> decode.Decoder(#(Int, String, String, String, Int, Bool, Bool, Bool)) {
  use id <- decode.field(0, decode.int)
  use code <- decode.field(1, decode.string)
  use name_key <- decode.field(2, decode.string)
  use parent_raw <- decode.field(3, decode.string)
  use sort <- decode.field(4, decode.int)
  use active <- decode.field(5, decode.bool)
  use manual <- decode.field(6, decode.bool)
  use api_ok <- decode.field(7, decode.bool)
  decode.success(#(id, code, name_key, parent_raw, sort, active, manual, api_ok))
}

fn parent_json(raw: String) -> json.Json {
  case int.parse(string.trim(raw)) {
    Ok(n) -> json.int(n)
    Error(_) -> json.null()
  }
}

fn supplier_org_row() -> decode.Decoder(#(String, String, String, String)) {
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
    |> pog.returning(supplier_org_row())
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

fn staff_org_row() -> decode.Decoder(#(String, String, String)) {
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
    |> pog.returning(staff_org_row())
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

fn require_agency_org(
  conn: pog.Connection,
  user_id: String,
) -> Result(#(String, String, String), Nil) {
  case
    pog.query(
      "select o.id::text, o.slug, o.name
         from user_roles ur
         inner join roles r on r.id = ur.role_id
         inner join organizations o on o.id = ur.organization_id and o.org_type = 'agency'
        where ur.user_id = $1::uuid and r.code = 'agency'
        order by ur.created_at desc nulls last, o.id
        limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(staff_org_row())
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

/// Tedarikçi → kendi kurumu; personel → atanmış kurum; yönetici → `organization_id` sorgu parametresi zorunlu.
pub fn resolve_manage_listings_scope(
  req: Request,
  ctx: Context,
) -> Result(#(String, String), Response) {
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "supplier.portal") {
        True ->
          case require_supplier_org(ctx.db, uid) {
            Ok(#(oid, _, _, _)) -> Ok(#(uid, oid))
            Error(_) -> resolve_staff_or_admin(uid, qs, ctx)
          }
        False -> resolve_staff_or_admin(uid, qs, ctx)
      }
  }
}

fn resolve_staff_or_admin(
  uid: String,
  qs: List(#(String, String)),
  ctx: Context,
) -> Result(#(String, String), Response) {
  case permissions.user_has_permission(ctx.db, uid, "staff.reservations.read") {
    True ->
      case require_staff_org(ctx.db, uid) {
        Ok(#(oid, _, _)) -> Ok(#(uid, oid))
        Error(_) -> resolve_agency_or_admin(uid, qs, ctx)
      }
    False -> resolve_agency_or_admin(uid, qs, ctx)
  }
}

fn resolve_agency_or_admin(
  uid: String,
  qs: List(#(String, String)),
  ctx: Context,
) -> Result(#(String, String), Response) {
  case permissions.user_has_permission(ctx.db, uid, "agency.portal") {
    True ->
      case require_agency_org(ctx.db, uid) {
        Ok(#(oid, _, _)) -> Ok(#(uid, oid))
        Error(_) -> resolve_admin_org(uid, qs, ctx)
      }
    False -> resolve_admin_org(uid, qs, ctx)
  }
}

fn resolve_admin_org(
  uid: String,
  qs: List(#(String, String)),
  ctx: Context,
) -> Result(#(String, String), Response) {
  case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
    True -> {
      let org_raw =
        list.key_find(qs, "organization_id")
        |> result.unwrap("")
        |> string.trim
      case org_raw == "" {
        True -> Error(json_err(400, "organization_id_required"))
        False -> Ok(#(uid, org_raw))
      }
    }
    False -> Error(json_err(403, "catalog_manage_forbidden"))
  }
}

fn resolve_create_scope(
  req: Request,
  ctx: Context,
  body_org_id: String,
) -> Result(#(String, String), Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "supplier.portal") {
        True ->
          case require_supplier_org(ctx.db, uid) {
            Ok(#(oid, _, _, _)) -> Ok(#(uid, oid))
            Error(_) -> resolve_create_staff_agency_admin(uid, body_org_id, ctx)
          }
        False -> resolve_create_staff_agency_admin(uid, body_org_id, ctx)
      }
  }
}

fn resolve_create_staff_agency_admin(
  uid: String,
  body_org_id: String,
  ctx: Context,
) -> Result(#(String, String), Response) {
  case permissions.user_has_permission(ctx.db, uid, "staff.reservations.read") {
    True ->
      case require_staff_org(ctx.db, uid) {
        Ok(#(oid, _, _)) -> Ok(#(uid, oid))
        Error(_) -> resolve_create_agency_admin(uid, body_org_id, ctx)
      }
    False -> resolve_create_agency_admin(uid, body_org_id, ctx)
  }
}

fn resolve_create_agency_admin(
  uid: String,
  body_org_id: String,
  ctx: Context,
) -> Result(#(String, String), Response) {
  case permissions.user_has_permission(ctx.db, uid, "agency.portal") {
    True ->
      case require_agency_org(ctx.db, uid) {
        Ok(#(oid, _, _)) -> Ok(#(uid, oid))
        Error(_) -> resolve_create_admin_only(uid, body_org_id, ctx)
      }
    False -> resolve_create_admin_only(uid, body_org_id, ctx)
  }
}

fn resolve_create_admin_only(
  uid: String,
  body_org_id: String,
  ctx: Context,
) -> Result(#(String, String), Response) {
  case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
    True -> {
      let oid = string.trim(body_org_id)
      case oid == "" {
        True -> Error(json_err(400, "organization_id_required"))
        False -> Ok(#(uid, oid))
      }
    }
    False -> Error(json_err(403, "catalog_manage_forbidden"))
  }
}

fn manage_listing_row() -> decode.Decoder(
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
    Bool,
    Bool,
    String,
  ),
) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use cur <- decode.field(3, decode.string)
  use cat <- decode.field(4, decode.string)
  use title <- decode.field(5, decode.string)
  use comm <- decode.field(6, decode.string)
  use prep_a <- decode.field(7, decode.string)
  use prep_p <- decode.field(8, decode.string)
  use ts <- decode.field(9, decode.string)
  use src <- decode.field(10, decode.string)
  use sh <- decode.field(11, decode.bool)
  use ai <- decode.field(12, decode.bool)
  use cc <- decode.field(13, decode.string)
  decode.success(#(id, slug, st, cur, cat, title, comm, prep_a, prep_p, ts, src, sh, ai, cc))
}

/// GET /api/v1/catalog/product-categories?active_only=true — yalnızca yayında kategoriler.
pub fn list_product_categories(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let active_only = case request.get_query(req) {
    Ok(qs) ->
      list.any(qs, fn(pair) {
        let #(k, v) = pair
        k == "active_only"
        && { v == "true" || v == "1" || string.lowercase(v) == "yes" }
      })
    Error(_) -> False
  }

  let sql =
    "select id::int, code, name_key, coalesce(parent_id::text, ''), sort_order, "
    <> "coalesce(is_active, true), coalesce(allows_manual_source, true), coalesce(allows_api_source, true) "
    <> "from product_categories "
    <> case active_only {
      True -> "where coalesce(is_active, true) = true "
      False -> ""
    }
    <> "order by sort_order, id"

  case
    pog.query(sql)
    |> pog.returning(category_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "product_categories_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(row) {
          let #(id, code, name_key, parent_raw, sort, active, manual, api_ok) = row
          json.object([
            #("id", json.int(id)),
            #("code", json.string(code)),
            #("name_key", json.string(name_key)),
            #("parent_id", parent_json(parent_raw)),
            #("sort_order", json.int(sort)),
            #("is_active", json.bool(active)),
            #("allows_manual_source", json.bool(manual)),
            #("allows_api_source", json.bool(api_ok)),
          ])
        })
      let body =
        json.object([#("categories", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/catalog/manage-listings?category_code=&search=&organization_id= (organization_id yalnız yönetici)
pub fn list_manage_listings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let search_raw =
        list.key_find(qs, "search")
        |> result.unwrap("")
        |> string.trim
      let cat_raw =
        list.key_find(qs, "category_code")
        |> result.unwrap("")
        |> string.trim
        |> string.lowercase
      let like_param = case search_raw == "" {
        True -> pog.null()
        False -> pog.text("%" <> search_raw <> "%")
      }
      let cat_param = case cat_raw == "" {
        True -> pog.null()
        False -> pog.text(cat_raw)
      }
      let title_loc_raw =
        list.key_find(qs, "title_locale")
        |> result.unwrap("tr")
        |> string.trim
        |> string.lowercase
      let title_loc = case title_loc_raw == "" {
        True -> "tr"
        False -> title_loc_raw
      }

      let sql =
        "select l.id::text, l.slug, l.status::text, l.currency_code::text, pc.code::text, "
        <> "coalesce((select lt.title from listing_translations lt join locales loc on loc.id = lt.locale_id where lt.listing_id = l.id and lower(loc.code) = lower($4::text) limit 1), ''), "
        <> "coalesce(l.commission_percent::text, ''), coalesce(l.prepayment_amount::text, ''), coalesce(l.prepayment_percent::text, ''), "
        <> "to_char(l.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), coalesce(l.listing_source::text, 'manual'), "
        <> "coalesce(l.share_to_social, false), coalesce(l.allow_ai_caption, false), coalesce(l.category_contract_id::text, '') "
        <> "from listings l "
        <> "join product_categories pc on pc.id = l.category_id "
        <> "where l.organization_id = $1::uuid "
        <> "and ($2::text is null or l.slug ilike $2 or l.id::text ilike $2) "
        <> "and ($3::text is null or pc.code = $3) "
        <> "order by l.created_at desc limit 200"

      case
        pog.query(sql)
        |> pog.parameter(pog.text(org_id))
        |> pog.parameter(like_param)
        |> pog.parameter(cat_param)
        |> pog.parameter(pog.text(title_loc))
        |> pog.returning(manage_listing_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "manage_listings_query_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(
                id,
                slug,
                st,
                cur,
                cat,
                title,
                comm,
                prep_a,
                prep_p,
                ts,
                src,
                sh,
                ai,
                cc_id,
              ) = row
              json.object([
                #("id", json.string(id)),
                #("slug", json.string(slug)),
                #("status", json.string(st)),
                #("currency_code", json.string(cur)),
                #("category_code", json.string(cat)),
                #("title", json.string(title)),
                #("commission_percent", json.string(comm)),
                #("prepayment_amount", json.string(prep_a)),
                #("prepayment_percent", json.string(prep_p)),
                #("created_at", json.string(ts)),
                #("listing_source", json.string(src)),
                #("share_to_social", json.bool(sh)),
                #("allow_ai_caption", json.bool(ai)),
                #("category_contract_id", json.string(cc_id)),
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

fn create_listing_body_decoder() -> decode.Decoder(
  #(String, String, String, String, String, String, Option(String)),
) {
  decode.optional_field("organization_id", "", decode.string, fn(org) {
    decode.field("category_code", decode.string, fn(cat) {
      decode.field("slug", decode.string, fn(slug) {
        decode.field("currency_code", decode.string, fn(cur) {
          decode.field("title", decode.string, fn(title) {
            decode.optional_field("title_locale", "tr", decode.string, fn(tloc) {
              decode.optional_field("category_contract_id", "", decode.string, fn(cc_raw) {
                let cc_opt = case string.trim(cc_raw) {
                  "" -> None
                  x -> Some(x)
                }
                decode.success(#(org, cat, slug, cur, title, tloc, cc_opt))
              })
            })
          })
        })
      })
    })
  })
}

fn slug_ok(s: String) -> Bool {
  let t = string.trim(s)
  let allowed = string.to_graphemes("abcdefghijklmnopqrstuvwxyz0123456789-")
  t != ""
  && string.length(t) <= 200
  && list.all(string.to_graphemes(string.lowercase(t)), fn(ch) { list.contains(allowed, ch) })
}

fn one_string_row() -> decode.Decoder(String) {
  use s <- decode.field(0, decode.string)
  decode.success(s)
}

fn pg_bool_row() -> decode.Decoder(Bool) {
  use b <- decode.field(0, decode.bool)
  decode.success(b)
}

fn translation_upsert_return_row() -> decode.Decoder(Int) {
  use n <- decode.field(0, decode.int)
  decode.success(n)
}

/// POST /api/v1/catalog/manage-listings — taslak ilan + `title_locale` (varsayılan tr) başlık çevirisi.
pub fn create_manage_listing(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_listing_body_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(org_body, cat_raw, slug_raw, cur_raw, title_raw, tloc_raw, cc_opt)) -> {
          let cat = string.lowercase(string.trim(cat_raw))
          let slug = string.lowercase(string.trim(slug_raw))
          let cur = string.uppercase(string.trim(cur_raw))
          let title = string.trim(title_raw)
          let tloc = string.lowercase(string.trim(tloc_raw))
          let title_locale = case tloc == "" {
            True -> "tr"
            False -> tloc
          }
          let contract_param = case cc_opt {
            None -> pog.null()
            Some(cid) -> pog.text(cid)
          }
          case cat == "" || cur == "" || title == "" {
            True -> json_err(400, "category_currency_title_required")
            False ->
              case slug_ok(slug) {
                False -> json_err(400, "invalid_slug")
                True ->
                  case resolve_create_scope(req, ctx, org_body) {
                    Error(r) -> r
                    Ok(#(_, org_id)) -> {
                      case
                        pog.query(
                          "insert into listings (organization_id, category_id, slug, status, currency_code, category_contract_id) "
                          <> "select $1::uuid, pc.id, $3, 'draft', $4, "
                          <> "case when $5::text is null or btrim($5::text) = '' then null else $5::uuid end "
                          <> "from product_categories pc where lower(pc.code) = lower($2) "
                          <> "and ( $5::text is null or btrim($5::text) = '' or exists ( "
                          <> "select 1 from category_contracts cc where cc.id = $5::uuid "
                          <> "and cc.contract_scope = 'category' "
                          <> "and cc.category_id = pc.id and cc.is_active = true "
                          <> "and (cc.organization_id is null or cc.organization_id = $1::uuid) "
                          <> ") ) limit 1 returning id::text",
                        )
                        |> pog.parameter(pog.text(org_id))
                        |> pog.parameter(pog.text(cat))
                        |> pog.parameter(pog.text(slug))
                        |> pog.parameter(pog.text(cur))
                        |> pog.parameter(contract_param)
                        |> pog.returning(one_string_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "listing_insert_failed")
                        Ok(ret) ->
                          case ret.rows {
                            [] ->
                              json_err(400, "unknown_category_code_or_invalid_contract")
                            [lid] -> {
                              case
                                pog.query(
                                  "insert into listing_translations (listing_id, locale_id, title, description) "
                                  <> "select $1::uuid, loc.id, $2, null from locales loc where lower(loc.code) = lower($3) "
                                  <> "and coalesce(loc.is_active, true) = true limit 1 "
                                  <> "on conflict (listing_id, locale_id) do update set title = excluded.title "
                                  <> "returning 1",
                                )
                                |> pog.parameter(pog.text(lid))
                                |> pog.parameter(pog.text(title))
                                |> pog.parameter(pog.text(title_locale))
                                |> pog.returning(translation_upsert_return_row())
                                |> pog.execute(ctx.db)
                              {
                                Error(_) -> json_err(500, "listing_translation_insert_failed")
                                Ok(tret) ->
                                  case tret.rows {
                                    [] -> json_err(400, "unknown_title_locale")
                                    [_] -> {
                              let out =
                                json.object([
                                  #("id", json.string(lid)),
                                  #("slug", json.string(slug)),
                                  #("status", json.string("draft")),
                                ])
                                |> json.to_string
                              wisp.json_response(out, 201)
                                    }
                                    _ -> json_err(500, "listing_translation_insert_unexpected")
                                  }
                              }
                            }
                            _ -> json_err(500, "listing_insert_unexpected")
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

pub fn listing_in_manage_org(
  conn: pog.Connection,
  listing_id: String,
  org_id: String,
) -> Result(Bool, Nil) {
  case
    pog.query(
      "select exists(select 1 from listings where id = $1::uuid and organization_id = $2::uuid)",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(org_id))
    |> pog.returning(pg_bool_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [b] -> Ok(b)
        _ -> Error(Nil)
      }
  }
}

fn lt_locale_row() -> decode.Decoder(#(String, String, String)) {
  use code <- decode.field(0, decode.string)
  use title <- decode.field(1, decode.string)
  use desc <- decode.field(2, decode.string)
  decode.success(#(code, title, desc))
}

/// GET /api/v1/catalog/listings/:id/translations — aktif diller + mevcut başlık/açıklama.
pub fn get_listing_translations(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select loc.code::text, coalesce(lt.title, ''), coalesce(lt.description, '') "
              <> "from locales loc "
              <> "left join listing_translations lt on lt.locale_id = loc.id and lt.listing_id = $1::uuid "
              <> "where coalesce(loc.is_active, true) = true order by loc.id",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(lt_locale_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "listing_translations_query_failed")
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(row) {
                  let #(code, title, desc) = row
                  json.object([
                    #("locale_code", json.string(code)),
                    #("title", json.string(title)),
                    #("description", json.string(desc)),
                  ])
                })
              let body =
                json.object([#("translations", json.preprocessed_array(arr))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn put_translation_entry_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("locale_code", decode.string, fn(lc) {
    decode.field("title", decode.string, fn(t) {
      decode.optional_field("description", "", decode.string, fn(d) {
        decode.success(#(lc, t, d))
      })
    })
  })
}

fn put_listing_translations_body_decoder() -> decode.Decoder(
  List(#(String, String, String)),
) {
  decode.field("entries", decode.list(put_translation_entry_decoder()), fn(entries) {
    decode.success(entries)
  })
}

fn upsert_listing_translation_row(
  conn: pog.Connection,
  listing_id: String,
  locale_code: String,
  title: String,
  description: String,
) -> Result(Nil, Nil) {
  let desc_param = case description == "" {
    True -> pog.null()
    False -> pog.text(description)
  }
  case
    pog.query(
      "insert into listing_translations (listing_id, locale_id, title, description) "
      <> "select $1::uuid, loc.id, $3::text, $4::text from locales loc "
      <> "where lower(loc.code) = lower($2) and coalesce(loc.is_active, true) = true limit 1 "
      <> "on conflict (listing_id, locale_id) do update set title = excluded.title, description = excluded.description "
      <> "returning 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(locale_code))
    |> pog.parameter(pog.text(title))
    |> pog.parameter(desc_param)
    |> pog.returning(translation_upsert_return_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        _ -> Error(Nil)
      }
  }
}

/// PUT /api/v1/catalog/listings/:id/translations — toplu başlık/açıklama (aktif locale kodları).
pub fn put_listing_translations(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, put_listing_translations_body_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(entries) -> {
                  let applied =
                    list.try_map(entries, fn(ent) {
                      let #(lc_raw, title_raw, desc_raw) = ent
                      let lc = string.lowercase(string.trim(lc_raw))
                      let title = string.trim(title_raw)
                      let desc = string.trim(desc_raw)
                      case lc == "" || title == "" {
                        True -> Error(Nil)
                        False ->
                          case
                            upsert_listing_translation_row(
                              ctx.db,
                              listing_id,
                              lc,
                              title,
                              desc,
                            )
                          {
                            Ok(Nil) -> Ok(Nil)
                            Error(_) -> Error(Nil)
                          }
                      }
                    })
                  case applied {
                    Error(_) ->
                      json_err(
                        400,
                        "invalid_translation_entries_or_unknown_locale",
                      )
                    Ok(_) -> {
                      let body =
                        json.object([#("ok", json.bool(True))])
                        |> json.to_string
                      wisp.json_response(body, 200)
                    }
                  }
                }
              }
          }
      }
  }
}

fn contract_public_row() -> decode.Decoder(#(String, String, String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  decode.success(#(a, b, c, d))
}

fn manage_contract_row() -> decode.Decoder(
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

/// GET /api/v1/catalog/public/listings/:id/contract?locale=tr — yayında ilanın seçili sözleşmesi (vitrin).
pub fn get_public_listing_contract(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  let loc_raw = case request.get_query(req) {
    Ok(qs) ->
      list.key_find(qs, "locale")
      |> result.unwrap("tr")
    Error(_) -> "tr"
  }
  let loc_use = case string.trim(string.lowercase(loc_raw)) == "" {
    True -> "tr"
    False -> string.lowercase(string.trim(loc_raw))
  }
  case
    pog.query(
      "select cc.id::text, cc.version::text, "
      <> "coalesce((select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
      <> "(select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
      <> "(select t.title from category_contract_translations t where t.contract_id = cc.id limit 1), ''), "
      <> "coalesce((select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
      <> "(select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
      <> "(select t.body_text from category_contract_translations t where t.contract_id = cc.id limit 1), '') "
      <> "from listings l "
      <> "inner join category_contracts cc on cc.id = l.category_contract_id and cc.is_active = true and cc.contract_scope = 'category' "
      <> "where l.id = $1::uuid and l.status = 'published' limit 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(loc_use))
    |> pog.returning(contract_public_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "listing_contract_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "listing_contract_not_found")
        [#(cid, ver, title, body)] -> {
          let out =
            json.object([
              #("contract_id", json.string(cid)),
              #("version", json.string(ver)),
              #("title", json.string(title)),
              #("body_text", json.string(body)),
              #("locale", json.string(loc_use)),
            ])
            |> json.to_string
          wisp.json_response(out, 200)
        }
        _ -> json_err(500, "listing_contract_unexpected")
      }
  }
}

fn listing_org_and_category_contract_row() -> decode.Decoder(#(String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  decode.success(#(a, b))
}

fn json_optional_contract_block(row: Option(#(String, String, String, String))) -> json.Json {
  case row {
    None -> json.null()
    Some(#(cid, ver, title, body)) ->
      json.object([
        #("contract_id", json.string(cid)),
        #("version", json.string(ver)),
        #("title", json.string(title)),
        #("body_text", json.string(body)),
      ])
  }
}

fn fetch_scoped_contract_for_org(
  db: pog.Connection,
  org_text: String,
  locale: String,
  scope: String,
) -> Result(Option(#(String, String, String, String)), Nil) {
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
    |> pog.returning(contract_public_row())
    |> pog.execute(db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [] -> Ok(None)
        [row] -> Ok(Some(row))
        _ -> Error(Nil)
      }
  }
}

/// GET /api/v1/catalog/public/checkout-contracts?listing_id=&locale= — vitrin + checkout: genel, satış, kategori blokları.
pub fn get_public_checkout_contract_bundle(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let lid_raw = list.key_find(qs, "listing_id") |> result.unwrap("") |> string.trim
  let loc_raw = list.key_find(qs, "locale") |> result.unwrap("tr") |> string.trim
  let loc_use = case string.lowercase(loc_raw) == "" {
    True -> "tr"
    False -> string.lowercase(loc_raw)
  }
  case lid_raw == "" {
    True -> json_err(400, "listing_id_required")
    False ->
      case
        pog.query(
          "select coalesce(l.organization_id::text, ''), coalesce(l.category_contract_id::text, '') "
          <> "from listings l where l.id = $1::uuid and l.status = 'published' limit 1",
        )
        |> pog.parameter(pog.text(lid_raw))
        |> pog.returning(listing_org_and_category_contract_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "checkout_contracts_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "listing_not_found")
            [#(org_text, cc_id_raw)] -> {
              let category_block = case string.trim(cc_id_raw) == "" {
                True -> Ok(None)
                False ->
                  case
                    pog.query(
                      "select cc.id::text, cc.version::text, "
                      <> "coalesce((select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
                      <> "(select t.title from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
                      <> "(select t.title from category_contract_translations t where t.contract_id = cc.id limit 1), ''), "
                      <> "coalesce((select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = lower($2) limit 1), "
                      <> "(select t.body_text from category_contract_translations t join locales loc on loc.id = t.locale_id where t.contract_id = cc.id and lower(loc.code) = 'en' limit 1), "
                      <> "(select t.body_text from category_contract_translations t where t.contract_id = cc.id limit 1), '') "
                      <> "from category_contracts cc where cc.id = $1::uuid and cc.is_active = true and cc.contract_scope = 'category' limit 1",
                    )
                    |> pog.parameter(pog.text(string.trim(cc_id_raw)))
                    |> pog.parameter(pog.text(loc_use))
                    |> pog.returning(contract_public_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> Error(Nil)
                    Ok(cr) ->
                      case cr.rows {
                        [] -> Ok(None)
                        [r] -> Ok(Some(r))
                        _ -> Error(Nil)
                      }
                  }
              }
              case category_block {
                Error(_) -> json_err(500, "checkout_contracts_category_failed")
                Ok(cat_opt) -> {
                  let gen_res = fetch_scoped_contract_for_org(ctx.db, org_text, loc_use, "general")
                  let sal_res = fetch_scoped_contract_for_org(ctx.db, org_text, loc_use, "sales")
                  case gen_res, sal_res {
                    Ok(gen_opt), Ok(sal_opt) -> {
                      let body =
                        json.object([
                          #("listing_id", json.string(lid_raw)),
                          #("locale", json.string(loc_use)),
                          #("organization_id", json.string(org_text)),
                          #("category", json_optional_contract_block(cat_opt)),
                          #("general", json_optional_contract_block(gen_opt)),
                          #("sales", json_optional_contract_block(sal_opt)),
                        ])
                        |> json.to_string
                      wisp.json_response(body, 200)
                    }
                    _, _ -> json_err(500, "checkout_contracts_scope_failed")
                  }
                }
              }
            }
            _ -> json_err(500, "checkout_contracts_unexpected")
          }
      }
  }
}

/// GET /api/v1/catalog/manage/category-contracts?contract_scope=general|sales|category&category_code=
pub fn list_manage_category_contracts(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let scope_raw =
        list.key_find(qs, "contract_scope")
        |> result.unwrap("category")
        |> string.trim
        |> string.lowercase
      let scope_use = case scope_raw == "" {
        True -> "category"
        False -> scope_raw
      }
      let cat_raw =
        list.key_find(qs, "category_code")
        |> result.unwrap("")
        |> string.trim
        |> string.lowercase
      let sel =
        "select cc.id::text, cc.code, cc.version::text, cc.sort_order::text, cc.is_active::text, coalesce(cc.organization_id::text, ''), cc.contract_scope::text "
        <> "from category_contracts cc where "
      let respond_rows = fn(rows: List(#(String, String, String, String, String, String, String))) {
        let arr =
          list.map(rows, fn(row) {
            let #(id, code, ver, sort, active, oid, sc) = row
            json.object([
              #("id", json.string(id)),
              #("code", json.string(code)),
              #("version", json.string(ver)),
              #("sort_order", json.string(sort)),
              #("is_active", json.string(active)),
              #("organization_id", json.string(oid)),
              #("contract_scope", json.string(sc)),
            ])
          })
        let body =
          json.object([#("contracts", json.preprocessed_array(arr))])
          |> json.to_string
        wisp.json_response(body, 200)
      }
      case scope_use {
        "general" ->
          case
            pog.query(
              sel <> "cc.contract_scope = 'general' "
                <> "and (cc.organization_id is null or cc.organization_id = $1::uuid) "
                <> "order by cc.sort_order, cc.code",
            )
            |> pog.parameter(pog.text(org_id))
            |> pog.returning(manage_contract_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "category_contracts_list_failed")
            Ok(ret) -> respond_rows(ret.rows)
          }
        "sales" ->
          case
            pog.query(
              sel <> "cc.contract_scope = 'sales' "
                <> "and (cc.organization_id is null or cc.organization_id = $1::uuid) "
                <> "order by cc.sort_order, cc.code",
            )
            |> pog.parameter(pog.text(org_id))
            |> pog.returning(manage_contract_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "category_contracts_list_failed")
            Ok(ret) -> respond_rows(ret.rows)
          }
        "category" ->
          case cat_raw == "" {
            True -> json_err(400, "category_code_required")
            False ->
              case
                pog.query(
                  sel <> "cc.contract_scope = 'category' "
                    <> "and cc.category_id = (select id from product_categories where lower(code) = lower($1)) "
                    <> "and (cc.organization_id is null or cc.organization_id = $2::uuid) "
                    <> "order by cc.sort_order, cc.code",
                )
                |> pog.parameter(pog.text(cat_raw))
                |> pog.parameter(pog.text(org_id))
                |> pog.returning(manage_contract_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "category_contracts_list_failed")
                Ok(ret) -> respond_rows(ret.rows)
              }
          }
        _ -> json_err(400, "invalid_contract_scope")
      }
    }
  }
}

fn create_category_contract_body_decoder() -> decode.Decoder(
  #(String, String, String, String, String, String, String),
) {
  decode.optional_field("contract_scope", "category", decode.string, fn(scope_raw) {
    decode.optional_field("category_code", "", decode.string, fn(cat_raw) {
      decode.field("code", decode.string, fn(code) {
        decode.optional_field("organization_id", "", decode.string, fn(org) {
          decode.field("title", decode.string, fn(title) {
            decode.field("body_text", decode.string, fn(body) {
              decode.optional_field("locale_code", "tr", decode.string, fn(lc) {
                decode.success(#(scope_raw, cat_raw, code, org, title, body, lc))
              })
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/catalog/manage/category-contracts — yönetici: havuza şablon ekler.
pub fn create_manage_category_contract(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(resp) -> resp
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "catalog_manage_forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, create_category_contract_body_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(scope_raw, cat_raw, code_raw, org_raw, title_raw, body_raw, lc_raw)) -> {
                  let scope_t =
                    string.lowercase(string.trim(scope_raw))
                    |> fn(s) {
                      case s == "" {
                        True -> "category"
                        False -> s
                      }
                    }
                  let cat = string.lowercase(string.trim(cat_raw))
                  let code = string.trim(code_raw)
                  let org_t = string.trim(org_raw)
                  let title = string.trim(title_raw)
                  let body_t = string.trim(body_raw)
                  let lc =
                    string.lowercase(string.trim(case lc_raw == "" {
                      True -> "tr"
                      False -> lc_raw
                    }))
                  let org_param = case org_t == "" {
                    True -> pog.null()
                    False -> pog.text(org_t)
                  }
                  case scope_t == "general" || scope_t == "sales" {
                    True ->
                      case code == "" || title == "" || body_t == "" {
                        True -> json_err(400, "contract_fields_required")
                        False ->
                          case cat != "" {
                            True -> json_err(400, "category_code_not_for_general_sales")
                            False ->
                              case
                                pog.transaction(ctx.db, fn(conn) {
                                  case
                                    pog.query(
                                      "insert into category_contracts (category_id, organization_id, code, version, is_active, sort_order, contract_scope) "
                                      <> "values (null, case when $1::text is null or btrim($1::text) = '' then null else $1::uuid end, $2, 1, true, 0, $3) "
                                      <> "returning id::text",
                                    )
                                    |> pog.parameter(org_param)
                                    |> pog.parameter(pog.text(code))
                                    |> pog.parameter(pog.text(scope_t))
                                    |> pog.returning(one_string_row())
                                    |> pog.execute(conn)
                                  {
                                    Error(_) -> Error("contract_insert_failed")
                                    Ok(ir) ->
                                      case ir.rows {
                                        [cid] -> {
                                          case
                                            pog.query(
                                              "insert into category_contract_translations (contract_id, locale_id, title, body_text) "
                                              <> "select $1::uuid, loc.id, $2::text, $3::text from locales loc "
                                              <> "where lower(loc.code) = lower($4) and coalesce(loc.is_active, true) = true limit 1 "
                                              <> "returning 1",
                                            )
                                            |> pog.parameter(pog.text(cid))
                                            |> pog.parameter(pog.text(title))
                                            |> pog.parameter(pog.text(body_t))
                                            |> pog.parameter(pog.text(lc))
                                            |> pog.returning(translation_upsert_return_row())
                                            |> pog.execute(conn)
                                          {
                                            Error(_) -> Error("contract_translation_failed")
                                            Ok(tr) ->
                                              case tr.rows {
                                                [] -> Error("unknown_locale_code")
                                                _ -> Ok(cid)
                                              }
                                          }
                                        }
                                        _ -> Error("contract_insert_unexpected")
                                      }
                                  }
                                })
                              {
                                Ok(cid) -> {
                                  let out =
                                    json.object([
                                      #("id", json.string(cid)),
                                      #("ok", json.bool(True)),
                                    ])
                                    |> json.to_string
                                  wisp.json_response(out, 201)
                                }
                                Error(pog.TransactionQueryError(_)) ->
                                  json_err(500, "database_error")
                                Error(pog.TransactionRolledBack(msg)) ->
                                  json_err(400, msg)
                              }
                          }
                      }
                    False ->
                      case scope_t != "category" {
                        True -> json_err(400, "invalid_contract_scope")
                        False ->
                          case cat == "" || code == "" || title == "" || body_t == "" {
                            True -> json_err(400, "category_code_contract_fields_required")
                            False ->
                              case
                                pog.transaction(ctx.db, fn(conn) {
                                  case
                                    pog.query(
                                      "insert into category_contracts (category_id, organization_id, code, version, is_active, sort_order, contract_scope) "
                                      <> "select pc.id, case when $2::text is null or btrim($2::text) = '' then null else $2::uuid end, $3, 1, true, 0, 'category' "
                                      <> "from product_categories pc where lower(pc.code) = lower($1) returning id::text",
                                    )
                                    |> pog.parameter(pog.text(cat))
                                    |> pog.parameter(org_param)
                                    |> pog.parameter(pog.text(code))
                                    |> pog.returning(one_string_row())
                                    |> pog.execute(conn)
                                  {
                                    Error(_) -> Error("contract_insert_failed")
                                    Ok(ir) ->
                                      case ir.rows {
                                        [] -> Error("unknown_category_code")
                                        [cid] -> {
                                          case
                                            pog.query(
                                              "insert into category_contract_translations (contract_id, locale_id, title, body_text) "
                                              <> "select $1::uuid, loc.id, $2::text, $3::text from locales loc "
                                              <> "where lower(loc.code) = lower($4) and coalesce(loc.is_active, true) = true limit 1 "
                                              <> "returning 1",
                                            )
                                            |> pog.parameter(pog.text(cid))
                                            |> pog.parameter(pog.text(title))
                                            |> pog.parameter(pog.text(body_t))
                                            |> pog.parameter(pog.text(lc))
                                            |> pog.returning(translation_upsert_return_row())
                                            |> pog.execute(conn)
                                          {
                                            Error(_) -> Error("contract_translation_failed")
                                            Ok(tr) ->
                                              case tr.rows {
                                                [] -> Error("unknown_locale_code")
                                                _ -> Ok(cid)
                                              }
                                          }
                                        }
                                        _ -> Error("contract_insert_unexpected")
                                      }
                                  }
                                })
                              {
                                Ok(cid) -> {
                                  let out =
                                    json.object([
                                      #("id", json.string(cid)),
                                      #("ok", json.bool(True)),
                                    ])
                                    |> json.to_string
                                  wisp.json_response(out, 201)
                                }
                                Error(pog.TransactionQueryError(_)) ->
                                  json_err(500, "database_error")
                                Error(pog.TransactionRolledBack(msg)) ->
                                  json_err(400, msg)
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

fn patch_listing_contract_body_decoder() -> decode.Decoder(String) {
  decode.optional_field("category_contract_id", "", decode.string, fn(s) {
    decode.success(s)
  })
}

/// PATCH /api/v1/catalog/manage-listings/:id/contract — ilana havuzdan sözleşme bağla / kaldır.
pub fn patch_manage_listing_contract(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, patch_listing_contract_body_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(cc_raw) -> {
                  let cc_trim = string.trim(cc_raw)
                  let cc_param = case cc_trim == "" {
                    True -> pog.null()
                    False -> pog.text(cc_trim)
                  }
                  case
                    pog.query(
                      "update listings l set category_contract_id = "
                      <> "case when $3::text is null or btrim($3::text) = '' then null else $3::uuid end, "
                      <> "updated_at = now() "
                      <> "where l.id = $1::uuid and l.organization_id = $2::uuid "
                      <> "and ( $3::text is null or btrim($3::text) = '' or exists ( "
                      <> "select 1 from category_contracts cc "
                      <> "join product_categories pc on pc.id = l.category_id "
                      <> "where cc.id = $3::uuid and cc.contract_scope = 'category' "
                      <> "and cc.category_id = pc.id and cc.is_active = true "
                      <> "and (cc.organization_id is null or cc.organization_id = l.organization_id) "
                      <> ") ) returning l.id::text",
                    )
                    |> pog.parameter(pog.text(listing_id))
                    |> pog.parameter(pog.text(org_id))
                    |> pog.parameter(cc_param)
                    |> pog.returning(one_string_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "listing_contract_patch_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [] -> json_err(400, "invalid_category_contract_for_listing")
                        [_] -> {
                          let out =
                            json.object([#("ok", json.bool(True))])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                        _ -> json_err(500, "listing_contract_patch_unexpected")
                      }
                  }
                }
              }
          }
      }
  }
}

// --- Otel: odalar, takvim, dönemsel fiyat (listing_* tabloları + hotel_rooms) — yönetim kapsamı ---

fn hotel_room_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use nm <- decode.field(1, decode.string)
  use cap <- decode.field(2, decode.string)
  use bt <- decode.field(3, decode.string)
  use mj <- decode.field(4, decode.string)
  decode.success(#(id, nm, cap, bt, mj))
}

/// GET /api/v1/catalog/listings/:id/hotel-rooms
pub fn list_manage_hotel_rooms(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select id::text, name, coalesce(capacity::text,''), coalesce(board_type,''), coalesce(meta_json::text,'{}') from hotel_rooms where listing_id = $1::uuid order by name",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(hotel_room_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "hotel_rooms_query_failed")
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(r) {
                  let #(id, nm, cap, bt, mj) = r
                  let capj = case cap == "" {
                    True -> json.null()
                    False -> json.string(cap)
                  }
                  let btj = case bt == "" {
                    True -> json.null()
                    False -> json.string(bt)
                  }
                  json.object([
                    #("id", json.string(id)),
                    #("name", json.string(nm)),
                    #("capacity", capj),
                    #("board_type", btj),
                    #("meta_json", json.string(mj)),
                  ])
                })
              let body =
                json.object([#("rooms", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn hr_manage_create_decoder() -> decode.Decoder(#(String, Option(String), Option(String), String)) {
  decode.field("name", decode.string, fn(nm) {
    decode.optional_field("capacity", "", decode.string, fn(cap) {
      decode.optional_field("board_type", "", decode.string, fn(bt) {
        decode.optional_field("meta_json", "{}", decode.string, fn(mj) {
          let c = case string.trim(cap) == "" {
            True -> None
            False -> Some(string.trim(cap))
          }
          let b = case string.trim(bt) == "" {
            True -> None
            False -> Some(string.trim(bt))
          }
          decode.success(#(nm, c, b, string.trim(mj)))
        })
      })
    })
  })
}

/// POST /api/v1/catalog/listings/:id/hotel-rooms
pub fn add_manage_hotel_room(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, hr_manage_create_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(nm, cap_opt, bt_opt, mj_raw)) ->
                  case string.trim(nm) == "" {
                    True -> json_err(400, "name_required")
                    False -> {
                      let mj = case mj_raw == "" {
                        True -> "{}"
                        False -> mj_raw
                      }
                      let cap_p = case cap_opt {
                        None -> pog.null()
                        Some(s) -> pog.text(s)
                      }
                      let bt_p = case bt_opt {
                        None -> pog.null()
                        Some(s) -> pog.text(s)
                      }
                      case
                        pog.query(
                          "insert into hotel_rooms (listing_id, name, capacity, board_type, meta_json) values ($1::uuid, $2, $3::smallint, $4, $5::jsonb) returning id::text",
                        )
                        |> pog.parameter(pog.text(listing_id))
                        |> pog.parameter(pog.text(string.trim(nm)))
                        |> pog.parameter(cap_p)
                        |> pog.parameter(bt_p)
                        |> pog.parameter(pog.text(mj))
                        |> pog.returning(one_string_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "hotel_room_insert_failed")
                        Ok(r) ->
                          case r.rows {
                            [id] -> {
                              let out = json.object([#("id", json.string(id))]) |> json.to_string
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
  }
}

/// DELETE /api/v1/catalog/listings/:id/hotel-rooms/:room_id
pub fn delete_manage_hotel_room(
  req: Request,
  ctx: Context,
  listing_id: String,
  room_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "delete from hotel_rooms where id = $1::uuid and listing_id = $2::uuid",
            )
            |> pog.parameter(pog.text(string.trim(room_id)))
            |> pog.parameter(pog.text(listing_id))
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "hotel_room_delete_failed")
            Ok(ret) ->
              case ret.count {
                0 -> json_err(404, "not_found")
                _ -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
  }
}

fn hotel_detail_row() -> decode.Decoder(#(String, String, String)) {
  use sr <- decode.field(0, decode.string)
  use et <- decode.field(1, decode.string)
  use tc <- decode.field(2, decode.string)
  decode.success(#(sr, et, tc))
}

/// GET /api/v1/catalog/listings/:id/hotel-details
pub fn get_manage_hotel_details(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select coalesce(star_rating::text,''), coalesce(etstur_property_ref,''), coalesce(tatilcom_property_ref,'') from listing_hotel_details where listing_id = $1::uuid",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(hotel_detail_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "hotel_details_query_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> {
                  let j =
                    json.object([
                      #("star_rating", json.null()),
                      #("etstur_property_ref", json.null()),
                      #("tatilcom_property_ref", json.null()),
                    ])
                    |> json.to_string
                  wisp.json_response(j, 200)
                }
                [#(sr, et, tc)] -> {
                  let srj = case sr == "" {
                    True -> json.null()
                    False -> json.string(sr)
                  }
                  let etj = case et == "" {
                    True -> json.null()
                    False -> json.string(et)
                  }
                  let tcj = case tc == "" {
                    True -> json.null()
                    False -> json.string(tc)
                  }
                  let j =
                    json.object([
                      #("star_rating", srj),
                      #("etstur_property_ref", etj),
                      #("tatilcom_property_ref", tcj),
                    ])
                    |> json.to_string
                  wisp.json_response(j, 200)
                }
                _ -> json_err(500, "unexpected")
              }
          }
      }
  }
}

fn patch_hotel_details_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String)),
) {
  decode.optional_field("star_rating", "", decode.string, fn(sr) {
    decode.optional_field("etstur_property_ref", "", decode.string, fn(et) {
      decode.optional_field("tatilcom_property_ref", "", decode.string, fn(tc) {
        let sro = case string.trim(sr) == "" {
          True -> None
          False -> Some(string.trim(sr))
        }
        let eto = case string.trim(et) == "" {
          True -> None
          False -> Some(string.trim(et))
        }
        let tco = case string.trim(tc) == "" {
          True -> None
          False -> Some(string.trim(tc))
        }
        decode.success(#(sro, eto, tco))
      })
    })
  })
}

/// PATCH /api/v1/catalog/listings/:id/hotel-details
pub fn patch_manage_hotel_details(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, patch_hotel_details_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(sr_opt, et_opt, tc_opt)) ->
                  case sr_opt, et_opt, tc_opt {
                    None, None, None -> json_err(400, "no_fields")
                    _, _, _ -> {
                      let sr_p = case sr_opt {
                        None -> pog.null()
                        Some(s) -> pog.text(s)
                      }
                      let et_p = case et_opt {
                        None -> pog.null()
                        Some(s) -> pog.text(s)
                      }
                      let tc_p = case tc_opt {
                        None -> pog.null()
                        Some(s) -> pog.text(s)
                      }
                      case
                        pog.query(
                          "insert into listing_hotel_details (listing_id, star_rating, etstur_property_ref, tatilcom_property_ref) values ($1::uuid, $2::numeric, $3, $4) on conflict (listing_id) do update set star_rating = coalesce($2::numeric, listing_hotel_details.star_rating), etstur_property_ref = coalesce($3, listing_hotel_details.etstur_property_ref), tatilcom_property_ref = coalesce($4, listing_hotel_details.tatilcom_property_ref) returning listing_id::text",
                        )
                        |> pog.parameter(pog.text(listing_id))
                        |> pog.parameter(sr_p)
                        |> pog.parameter(et_p)
                        |> pog.parameter(tc_p)
                        |> pog.returning(one_string_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "hotel_details_upsert_failed")
                        Ok(r) ->
                          case r.rows {
                            [_] -> wisp.json_response("{\"ok\":true}", 200)
                            _ -> json_err(500, "unexpected")
                          }
                      }
                    }
                  }
              }
          }
      }
  }
}

fn avail_day_row() -> decode.Decoder(#(String, Bool, String, Bool, Bool)) {
  use d <- decode.field(0, decode.string)
  use av <- decode.field(1, decode.bool)
  use po <- decode.field(2, decode.string)
  use am <- decode.field(3, decode.bool)
  use pm <- decode.field(4, decode.bool)
  decode.success(#(d, av, po, am, pm))
}

/// GET /api/v1/catalog/listings/:id/availability-calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
pub fn get_listing_availability_calendar(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) -> {
          let qs = case request.get_query(req) {
            Ok(q) -> q
            Error(_) -> []
          }
          let from_d =
            list.key_find(qs, "from")
            |> result.unwrap("")
            |> string.trim
          let to_d =
            list.key_find(qs, "to")
            |> result.unwrap("")
            |> string.trim
          case from_d == "" || to_d == "" {
            True -> json_err(400, "from_to_required")
            False ->
              case
                pog.query(
                  "select day::text, (am_available or pm_available), coalesce(price_override::text,''), am_available, pm_available from listing_availability_calendar where listing_id = $1::uuid and day >= $2::date and day <= $3::date order by day",
                )
                |> pog.parameter(pog.text(listing_id))
                |> pog.parameter(pog.text(from_d))
                |> pog.parameter(pog.text(to_d))
                |> pog.returning(avail_day_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "availability_query_failed")
                Ok(ret) -> {
                  let arr =
                    list.map(ret.rows, fn(row) {
                      let #(d, av, po, am, pm) = row
                      let poj = case po == "" {
                        True -> json.null()
                        False -> json.string(po)
                      }
                      json.object([
                        #("day", json.string(d)),
                        #("is_available", json.bool(av)),
                        #("price_override", poj),
                        #("am_available", json.bool(am)),
                        #("pm_available", json.bool(pm)),
                      ])
                    })
                  let body =
                    json.object([#("days", json.array(from: arr, of: fn(x) { x }))])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
              }
          }
        }
      }
  }
}

fn day_patch_decoder() -> decode.Decoder(#(String, Bool, Bool, Bool, String)) {
  decode.field("day", decode.string, fn(day) {
    decode.field("is_available", decode.bool, fn(ia) {
      decode.optional_field("am_available", None, decode.optional(decode.bool), fn(am_opt) {
        decode.optional_field("pm_available", None, decode.optional(decode.bool), fn(pm_opt) {
          decode.optional_field("price_override", "", decode.string, fn(po) {
            let am = case am_opt {
              Some(a) -> a
              None -> ia
            }
            let pm = case pm_opt {
              Some(p) -> p
              None -> ia
            }
            let combined = am || pm
            decode.success(#(string.trim(day), combined, am, pm, string.trim(po)))
          })
        })
      })
    })
  })
}

fn put_availability_body_decoder() -> decode.Decoder(List(#(String, Bool, Bool, Bool, String))) {
  decode.field("days", decode.list(day_patch_decoder()), fn(days) { decode.success(days) })
}

fn upsert_availability_days(
  conn: pog.Connection,
  listing_id: String,
  days: List(#(String, Bool, Bool, Bool, String)),
) -> Result(Nil, String) {
  case days {
    [] -> Ok(Nil)
    [first, ..rest] -> {
      let #(day, combined, am, pm, po_raw) = first
      let po_p = case po_raw == "" {
        True -> pog.null()
        False -> pog.text(po_raw)
      }
      case
        pog.query(
          "insert into listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override) values ($1::uuid, $2::date, $3, $4, $5, case when $6::text is null or btrim($6::text) = '' then null else $6::numeric end) on conflict (listing_id, day) do update set is_available = excluded.is_available, am_available = excluded.am_available, pm_available = excluded.pm_available, price_override = excluded.price_override",
        )
        |> pog.parameter(pog.text(listing_id))
        |> pog.parameter(pog.text(day))
        |> pog.parameter(pog.bool(combined))
        |> pog.parameter(pog.bool(am))
        |> pog.parameter(pog.bool(pm))
        |> pog.parameter(po_p)
        |> pog.execute(conn)
      {
        Error(_) -> Error("availability_upsert_failed")
        Ok(_) -> upsert_availability_days(conn, listing_id, rest)
      }
    }
  }
}

/// PUT /api/v1/catalog/listings/:id/availability-calendar
pub fn put_listing_availability_calendar(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, put_availability_body_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(days) ->
                  case pog.transaction(ctx.db, fn(conn) {
                    upsert_availability_days(conn, listing_id, days)
                  }) {
                    Ok(Nil) -> wisp.json_response("{\"ok\":true}", 200)
                    Error(pog.TransactionQueryError(_)) ->
                      json_err(500, "availability_transaction_failed")
                    Error(pog.TransactionRolledBack(msg)) -> json_err(400, msg)
                  }
              }
          }
      }
  }
}

fn price_rule_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use rj <- decode.field(1, decode.string)
  use vf <- decode.field(2, decode.string)
  use vt <- decode.field(3, decode.string)
  decode.success(#(id, rj, vf, vt))
}

/// GET /api/v1/catalog/listings/:id/price-rules
pub fn list_listing_price_rules(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select id::text, coalesce(rule_json::text,'{}'), coalesce(valid_from::text,''), coalesce(valid_to::text,'') from listing_price_rules where listing_id = $1::uuid order by coalesce(valid_from, 'epoch'::date)",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(price_rule_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "price_rules_query_failed")
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(row) {
                  let #(id, rj, vf, vt) = row
                  let vfj = case vf == "" {
                    True -> json.null()
                    False -> json.string(vf)
                  }
                  let vtj = case vt == "" {
                    True -> json.null()
                    False -> json.string(vt)
                  }
                  json.object([
                    #("id", json.string(id)),
                    #("rule_json", json.string(rj)),
                    #("valid_from", vfj),
                    #("valid_to", vtj),
                  ])
                })
              let body =
                json.object([#("rules", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn create_price_rule_decoder() -> decode.Decoder(#(String, Option(String), Option(String))) {
  decode.field("rule_json", decode.string, fn(rj) {
    decode.optional_field("valid_from", "", decode.string, fn(vf) {
      decode.optional_field("valid_to", "", decode.string, fn(vt) {
        let vfo = case string.trim(vf) == "" {
          True -> None
          False -> Some(string.trim(vf))
        }
        let vto = case string.trim(vt) == "" {
          True -> None
          False -> Some(string.trim(vt))
        }
        decode.success(#(string.trim(rj), vfo, vto))
      })
    })
  })
}

/// POST /api/v1/catalog/listings/:id/price-rules
pub fn create_listing_price_rule(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, create_price_rule_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(rj, vf_opt, vt_opt)) ->
                  case rj == "" {
                    True -> json_err(400, "rule_json_required")
                    False -> {
                      let vf_p = case vf_opt {
                        None -> pog.null()
                        Some(s) -> pog.text(s)
                      }
                      let vt_p = case vt_opt {
                        None -> pog.null()
                        Some(s) -> pog.text(s)
                      }
                      case
                        pog.query(
                          "insert into listing_price_rules (listing_id, rule_json, valid_from, valid_to) values ($1::uuid, $2::jsonb, $3::date, $4::date) returning id::text",
                        )
                        |> pog.parameter(pog.text(listing_id))
                        |> pog.parameter(pog.text(rj))
                        |> pog.parameter(vf_p)
                        |> pog.parameter(vt_p)
                        |> pog.returning(one_string_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "price_rule_insert_failed")
                        Ok(r) ->
                          case r.rows {
                            [id] -> {
                              let out = json.object([#("id", json.string(id))]) |> json.to_string
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
  }
}

// ─── Listing Basics (PATCH) ──────────────────────────────────────────────────

type BasicsPatch {
  BasicsPatch(
    status: String,
    min_stay_nights: String,
    cleaning_fee_amount: String,
    first_charge_amount: String,
    prepayment_percent: String,
    pool_size_label: String,
    commission_percent: String,
    high_season_dates_json: String,
    confirm_deadline_normal_h: String,
    confirm_deadline_high_h: String,
    supplier_payment_note: String,
    avg_ad_cost_percent: String,
    cancellation_policy_text: String,
    ministry_license_ref: String,
    share_to_social: String,
    allow_ai_caption: String,
    allow_sub_min_stay_gap_booking: String,
  )
}

fn patch_basics_decoder() -> decode.Decoder(BasicsPatch) {
  decode.optional_field("status", "", decode.string, fn(status) {
    decode.optional_field("min_stay_nights", "", decode.string, fn(msn) {
      decode.optional_field("cleaning_fee_amount", "", decode.string, fn(cfa) {
        decode.optional_field("first_charge_amount", "", decode.string, fn(fca) {
          decode.optional_field("prepayment_percent", "", decode.string, fn(pp) {
            decode.optional_field("pool_size_label", "", decode.string, fn(psl) {
              decode.optional_field("commission_percent", "", decode.string, fn(comm) {
                decode.optional_field("high_season_dates_json", "", decode.string, fn(hsd) {
                  decode.optional_field("confirm_deadline_normal_h", "", decode.string, fn(cdn) {
                    decode.optional_field("confirm_deadline_high_h", "", decode.string, fn(cdh) {
                      decode.optional_field("supplier_payment_note", "", decode.string, fn(spn) {
                        decode.optional_field("avg_ad_cost_percent", "", decode.string, fn(aac) {
                          decode.optional_field("cancellation_policy_text", "", decode.string, fn(cpt) {
                            decode.optional_field("ministry_license_ref", "", decode.string, fn(mlr) {
                              decode.optional_field("share_to_social", False, decode.bool, fn(sts) {
                                decode.optional_field("allow_ai_caption", False, decode.bool, fn(aai) {
                                  decode.optional_field("allow_sub_min_stay_gap_booking", False, decode.bool, fn(asg) {
                                    decode.success(BasicsPatch(
                                      status: status,
                                      min_stay_nights: msn,
                                      cleaning_fee_amount: cfa,
                                      first_charge_amount: fca,
                                      prepayment_percent: pp,
                                      pool_size_label: psl,
                                      commission_percent: comm,
                                      high_season_dates_json: hsd,
                                      confirm_deadline_normal_h: cdn,
                                      confirm_deadline_high_h: cdh,
                                      supplier_payment_note: spn,
                                      avg_ad_cost_percent: aac,
                                      cancellation_policy_text: cpt,
                                      ministry_license_ref: mlr,
                                      share_to_social: case sts { True -> "true" False -> "" },
                                      allow_ai_caption: case aai { True -> "true" False -> "" },
                                      allow_sub_min_stay_gap_booking: case asg { True -> "true" False -> "" },
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
            })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/catalog/listings/:id/basics — temel ilan alanlarını güncelle.
pub fn patch_listing_basics(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, patch_basics_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(p) -> {
                  let status_t = string.trim(p.status)
                  let valid_statuses = ["", "draft", "published", "archived"]
                  case list.contains(valid_statuses, status_t) {
                    False -> json_err(400, "invalid_status")
                    True ->
                      case
                        pog.query(
                          "update listings set "
                          <> "status = case when $3 = '' then status else $3::text end, "
                          <> "min_stay_nights = case when $4 = '__null__' then null when $4 = '' then min_stay_nights else $4::integer end, "
                          <> "cleaning_fee_amount = case when $5 = '__null__' then null when $5 = '' then cleaning_fee_amount else $5::numeric end, "
                          <> "first_charge_amount = case when $6 = '__null__' then null when $6 = '' then first_charge_amount else $6::numeric end, "
                          <> "prepayment_percent = case when $7 = '__null__' then null when $7 = '' then prepayment_percent else $7::numeric end, "
                          <> "pool_size_label = case when $8 = '__null__' then null when $8 = '' then pool_size_label else $8::text end, "
                          <> "commission_percent = case when $9 = '__null__' then null when $9 = '' then commission_percent else $9::numeric end, "
                          <> "high_season_dates_json = case when $10 = '' then high_season_dates_json else $10::jsonb end, "
                          <> "confirm_deadline_normal_h = case when $11 = '' then confirm_deadline_normal_h else $11::integer end, "
                          <> "confirm_deadline_high_h = case when $12 = '' then confirm_deadline_high_h else $12::integer end, "
                          <> "supplier_payment_note = case when $13 = '' then supplier_payment_note else $13::text end, "
                          <> "avg_ad_cost_percent = case when $14 = '' then avg_ad_cost_percent else $14::numeric end, "
                          <> "cancellation_policy_text = case when $15 = '' then cancellation_policy_text else $15::text end, "
                          <> "ministry_license_ref = case when $16 = '' then ministry_license_ref else $16::text end, "
                          <> "share_to_social = case when $17 = '' then share_to_social when $17 = 'true' then true else false end, "
                          <> "allow_ai_caption = case when $18 = '' then allow_ai_caption when $18 = 'true' then true else false end, "
                          <> "allow_sub_min_stay_gap_booking = case when $19 = '' then allow_sub_min_stay_gap_booking when $19 = 'true' then true else false end, "
                          <> "updated_at = now() "
                          <> "where id = $1::uuid and organization_id = $2::uuid returning id::text",
                        )
                        |> pog.parameter(pog.text(listing_id))
                        |> pog.parameter(pog.text(org_id))
                        |> pog.parameter(pog.text(status_t))
                        |> pog.parameter(pog.text(string.trim(p.min_stay_nights)))
                        |> pog.parameter(pog.text(string.trim(p.cleaning_fee_amount)))
                        |> pog.parameter(pog.text(string.trim(p.first_charge_amount)))
                        |> pog.parameter(pog.text(string.trim(p.prepayment_percent)))
                        |> pog.parameter(pog.text(string.trim(p.pool_size_label)))
                        |> pog.parameter(pog.text(string.trim(p.commission_percent)))
                        |> pog.parameter(pog.text(string.trim(p.high_season_dates_json)))
                        |> pog.parameter(pog.text(string.trim(p.confirm_deadline_normal_h)))
                        |> pog.parameter(pog.text(string.trim(p.confirm_deadline_high_h)))
                        |> pog.parameter(pog.text(string.trim(p.supplier_payment_note)))
                        |> pog.parameter(pog.text(string.trim(p.avg_ad_cost_percent)))
                        |> pog.parameter(pog.text(string.trim(p.cancellation_policy_text)))
                        |> pog.parameter(pog.text(string.trim(p.ministry_license_ref)))
                        |> pog.parameter(pog.text(p.share_to_social))
                        |> pog.parameter(pog.text(p.allow_ai_caption))
                        |> pog.parameter(pog.text(p.allow_sub_min_stay_gap_booking))
                        |> pog.returning(one_string_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "basics_update_failed")
                        Ok(ret) ->
                          case ret.rows {
                            [] -> json_err(404, "listing_not_found")
                            _ -> wisp.json_response("{\"ok\":true}", 200)
                          }
                      }
                  }
                }
              }
          }
      }
  }
}

// ─── Owner Contact ────────────────────────────────────────────────────────────

fn owner_contact_row() -> decode.Decoder(#(String, String, String)) {
  use n <- decode.field(0, decode.string)
  use p <- decode.field(1, decode.string)
  use e <- decode.field(2, decode.string)
  decode.success(#(n, p, e))
}

fn put_owner_contact_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.optional_field("contact_name", "", decode.string, fn(n) {
    decode.optional_field("contact_phone", "", decode.string, fn(p) {
      decode.optional_field("contact_email", "", decode.string, fn(e) {
        decode.success(#(n, p, e))
      })
    })
  })
}

/// GET /api/v1/catalog/listings/:id/owner-contact
pub fn get_listing_owner_contact(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select coalesce(contact_name,''), coalesce(contact_phone,''), coalesce(contact_email,'') from listing_owner_contacts where listing_id = $1::uuid",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(owner_contact_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "owner_contact_query_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> {
                  let j =
                    json.object([
                      #("contact_name", json.null()),
                      #("contact_phone", json.null()),
                      #("contact_email", json.null()),
                    ])
                    |> json.to_string
                  wisp.json_response(j, 200)
                }
                [#(n, p, e)] -> {
                  let nj = case n == "" {
                    True -> json.null()
                    False -> json.string(n)
                  }
                  let pj = case p == "" {
                    True -> json.null()
                    False -> json.string(p)
                  }
                  let ej = case e == "" {
                    True -> json.null()
                    False -> json.string(e)
                  }
                  let j =
                    json.object([
                      #("contact_name", nj),
                      #("contact_phone", pj),
                      #("contact_email", ej),
                    ])
                    |> json.to_string
                  wisp.json_response(j, 200)
                }
                _ -> json_err(500, "unexpected")
              }
          }
      }
  }
}

/// PUT /api/v1/catalog/listings/:id/owner-contact
pub fn put_listing_owner_contact(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, put_owner_contact_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(n, p, e)) -> {
                  let np = case string.trim(n) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(n))
                  }
                  let pp = case string.trim(p) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(p))
                  }
                  let ep = case string.trim(e) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(e))
                  }
                  case
                    pog.query(
                      "insert into listing_owner_contacts (listing_id, contact_name, contact_phone, contact_email) values ($1::uuid, $2, $3, $4) on conflict (listing_id) do update set contact_name = excluded.contact_name, contact_phone = excluded.contact_phone, contact_email = excluded.contact_email",
                    )
                    |> pog.parameter(pog.text(listing_id))
                    |> pog.parameter(np)
                    |> pog.parameter(pp)
                    |> pog.parameter(ep)
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "owner_contact_save_failed")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                  }
                }
              }
          }
      }
  }
}

// ─── Listing Meta Attributes (GET / PUT) ─────────────────────────────────────

/// GET /api/v1/catalog/listings/:id/meta — listing_attributes group=listing_meta key=v1
pub fn get_listing_meta(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select value_json::text from listing_attributes where listing_id=$1::uuid and group_code='listing_meta' and key='v1'",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(one_string_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "listing_meta_query_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> wisp.json_response("{}", 200)
                [v] -> wisp.json_response(v, 200)
                _ -> json_err(500, "unexpected")
              }
          }
      }
  }
}

/// PUT /api/v1/catalog/listings/:id/meta — tüm meta alanları tek JSONB olarak sakla
pub fn put_listing_meta(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, decode.dynamic) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(_) ->
                  case
                    pog.query(
                      "insert into listing_attributes (listing_id, group_code, key, value_json) values ($1::uuid, 'listing_meta', 'v1', $2::jsonb) on conflict (listing_id, group_code, key) do update set value_json = excluded.value_json",
                    )
                    |> pog.parameter(pog.text(listing_id))
                    |> pog.parameter(pog.text(body))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "listing_meta_save_failed")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                  }
              }
          }
      }
  }
}

/// DELETE /api/v1/catalog/listings/:id/price-rules/:rule_id
pub fn delete_listing_price_rule(
  req: Request,
  ctx: Context,
  listing_id: String,
  rule_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "delete from listing_price_rules where id = $1::uuid and listing_id = $2::uuid",
            )
            |> pog.parameter(pog.text(string.trim(rule_id)))
            |> pog.parameter(pog.text(listing_id))
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "price_rule_delete_failed")
            Ok(ret) ->
              case ret.count {
                0 -> json_err(404, "not_found")
                _ -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ─── Öznitelik Grupları & Tanımları ──────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

fn attr_group_row() -> decode.Decoder(#(String, String, String, String, Int, Bool)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use cat_codes <- decode.field(3, decode.string)
  use sort <- decode.field(4, decode.int)
  use active <- decode.field(5, decode.bool)
  decode.success(#(id, code, name, cat_codes, sort, active))
}

/// GET /api/v1/catalog/attribute-groups?category_code=xxx&locale=tr
pub fn list_attribute_groups(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let loc_raw =
        list.key_find(qs, "locale")
        |> result.unwrap("tr")
        |> string.trim
      let cat_filter =
        list.find(qs, fn(p) { p.0 == "category_code" })
        |> result.map(fn(p) { p.1 })
        |> result.unwrap("")
      let cat_trim = string.trim(cat_filter)
      let where_extra = case cat_trim == "" {
        True -> ""
        False ->
          " and ($3 = any(g.category_codes) or array_length(g.category_codes,1) is null or array_length(g.category_codes,1) = 0)"
      }
      let q =
        pog.query(
          "select g.id::text, g.code, "
          <> "coalesce((select gt.name from listing_attribute_group_translations gt "
          <> "inner join locales loc on loc.id = gt.locale_id "
          <> "where gt.group_id = g.id and lower(loc.code) = lower($2) limit 1), g.name, g.code), "
          <> "array_to_string(g.category_codes,','), g.sort_order, g.is_active "
          <> "from listing_attribute_groups g "
          <> "where (g.organization_id = $1::uuid or g.organization_id is null)"
          <> where_extra
          <> " order by g.sort_order, g.code",
        )
        |> pog.parameter(pog.text(org_id))
        |> pog.parameter(pog.text(loc_raw))
      let q2 = case cat_trim == "" {
        True -> q
        False -> pog.parameter(q, pog.text(cat_trim))
      }
      case pog.returning(q2, attr_group_row()) |> pog.execute(ctx.db) {
        Error(_) -> json_err(500, "attr_groups_query_failed")
        Ok(ret) -> {
          let rows =
            list.map(ret.rows, fn(r) {
              let #(id, code, name, cats, sort, active) = r
              json.object([
                #("id", json.string(id)),
                #("code", json.string(code)),
                #("name", json.string(name)),
                #("category_codes", json.array(
                  list.filter(string.split(cats, ","), fn(s) { s != "" }),
                  json.string,
                )),
                #("sort_order", json.int(sort)),
                #("is_active", json.bool(active)),
              ])
            })
          let body =
            json.object([#("groups", json.array(rows, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn create_attr_group_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.optional_field("code", "", decode.string, fn(code) {
    decode.optional_field("name", "", decode.string, fn(name) {
      decode.optional_field("category_codes", "", decode.string, fn(cats) {
        decode.optional_field("sort_order", "0", decode.string, fn(sort) {
          decode.success(#(code, name, cats, sort))
        })
      })
    })
  })
}

/// POST /api/v1/catalog/attribute-groups
pub fn create_attribute_group(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_attr_group_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(code, name, cats, sort_raw)) -> {
              let code_t = string.trim(code)
              let name_t = string.trim(name)
              case code_t == "" || name_t == "" {
                True -> json_err(400, "code_and_name_required")
                False -> {
                  let sort = case int.parse(string.trim(sort_raw)) {
                    Ok(n) -> n
                    Error(_) -> 0
                  }
                  let cat_arr =
                    list.filter(
                      list.map(string.split(cats, ","), string.trim),
                      fn(s) { s != "" },
                    )
                  case
                    pog.query(
                      "insert into listing_attribute_groups (organization_id, code, name, category_codes, sort_order) "
                      <> "values ($1::uuid, $2, $3, $4::text[], $5) returning id::text",
                    )
                    |> pog.parameter(pog.text(org_id))
                    |> pog.parameter(pog.text(code_t))
                    |> pog.parameter(pog.text(name_t))
                    |> pog.parameter(pog.array(pog.text, cat_arr))
                    |> pog.parameter(pog.int(sort))
                    |> pog.returning(one_string_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "attr_group_insert_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [id] -> {
                          let out =
                            json.object([
                              #("id", json.string(id)),
                              #("ok", json.bool(True)),
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
  }
}

/// DELETE /api/v1/catalog/attribute-groups/:gid
pub fn delete_attribute_group(
  req: Request,
  ctx: Context,
  gid: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case
        pog.query(
          "delete from listing_attribute_groups where id = $1::uuid and organization_id = $2::uuid",
        )
        |> pog.parameter(pog.text(string.trim(gid)))
        |> pog.parameter(pog.text(org_id))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "attr_group_delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}

// ─── Öznitelik Tanımları ──────────────────────────────────────────────────────

fn attr_def_row() -> decode.Decoder(#(String, String, String, String, String, Int, Bool, Bool)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use label <- decode.field(2, decode.string)
  use ft <- decode.field(3, decode.string)
  use opts <- decode.field(4, decode.string)
  use sort <- decode.field(5, decode.int)
  use req_f <- decode.field(6, decode.bool)
  use active <- decode.field(7, decode.bool)
  decode.success(#(id, code, label, ft, opts, sort, req_f, active))
}

fn group_belongs_to_org(
  conn: pog.Connection,
  gid: String,
  org_id: String,
) -> Result(Bool, Nil) {
  case
    pog.query(
      "select exists(select 1 from listing_attribute_groups where id=$1::uuid and organization_id=$2::uuid)",
    )
    |> pog.parameter(pog.text(gid))
    |> pog.parameter(pog.text(org_id))
    |> pog.returning(pg_bool_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [b] -> Ok(b)
        _ -> Error(Nil)
      }
  }
}

/// GET /api/v1/catalog/attribute-groups/:gid/defs
pub fn list_attribute_defs(
  req: Request,
  ctx: Context,
  gid: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case group_belongs_to_org(ctx.db, gid, org_id) {
        Error(_) -> json_err(500, "group_scope_check_failed")
        Ok(False) -> json_err(404, "group_not_found")
        Ok(True) -> {
          let qs = case request.get_query(req) {
            Ok(q) -> q
            Error(_) -> []
          }
          let loc_raw =
            list.key_find(qs, "locale")
            |> result.unwrap("tr")
            |> string.trim
          case
            pog.query(
              "select d.id::text, d.code, "
              <> "coalesce((select dt.label from listing_attribute_def_translations dt "
              <> "inner join locales loc on loc.id = dt.locale_id "
              <> "where dt.def_id = d.id and lower(loc.code) = lower($2) limit 1), "
              <> "(select dt.label from listing_attribute_def_translations dt where dt.def_id = d.id order by dt.locale_id limit 1), "
              <> "d.label, d.code), "
              <> "d.field_type, coalesce(d.options_json::text,'null'), d.sort_order, d.is_required, d.is_active "
              <> "from listing_attribute_defs d where d.group_id=$1::uuid order by d.sort_order, d.code",
            )
            |> pog.parameter(pog.text(gid))
            |> pog.parameter(pog.text(loc_raw))
            |> pog.returning(attr_def_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "attr_defs_query_failed")
            Ok(ret) -> {
              let rows =
                list.map(ret.rows, fn(r) {
                  let #(id, code, label, ft, opts, sort, req_f, active) = r
                  json.object([
                    #("id", json.string(id)),
                    #("code", json.string(code)),
                    #("label", json.string(label)),
                    #("field_type", json.string(ft)),
                    #("options_json", case opts == "null" {
                      True -> json.null()
                      False -> json.string(opts)
                    }),
                    #("sort_order", json.int(sort)),
                    #("is_required", json.bool(req_f)),
                    #("is_active", json.bool(active)),
                  ])
                })
              let body =
                json.object([#("defs", json.array(rows, fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
      }
  }
}

fn create_attr_def_decoder() -> decode.Decoder(#(String, String, String, String, String)) {
  decode.optional_field("code", "", decode.string, fn(code) {
    decode.optional_field("label", "", decode.string, fn(label) {
      decode.optional_field("field_type", "text", decode.string, fn(ft) {
        decode.optional_field("options_json", "", decode.string, fn(opts) {
          decode.optional_field("sort_order", "0", decode.string, fn(sort) {
            decode.success(#(code, label, ft, opts, sort))
          })
        })
      })
    })
  })
}

/// POST /api/v1/catalog/attribute-groups/:gid/defs
pub fn create_attribute_def(
  req: Request,
  ctx: Context,
  gid: String,
) -> Response {
  use <- wisp.require_method(req, http.Post)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case group_belongs_to_org(ctx.db, gid, org_id) {
        Error(_) -> json_err(500, "group_scope_check_failed")
        Ok(False) -> json_err(404, "group_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, create_attr_def_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(code, label, ft, opts_raw, sort_raw)) -> {
                  let code_t = string.trim(code)
                  let label_t = string.trim(label)
                  case code_t == "" || label_t == "" {
                    True -> json_err(400, "code_and_label_required")
                    False -> {
                      let valid_fts = [
                        "text", "number", "boolean", "select", "multiselect",
                      ]
                      let ft_t = case list.contains(valid_fts, string.trim(ft)) {
                        True -> string.trim(ft)
                        False -> "text"
                      }
                      let sort = case int.parse(string.trim(sort_raw)) {
                        Ok(n) -> n
                        Error(_) -> 0
                      }
                      let opts_p = case string.trim(opts_raw) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(opts_raw))
                      }
                      case
                        pog.query(
                          "insert into listing_attribute_defs (group_id, code, label, field_type, options_json, sort_order) "
                          <> "values ($1::uuid, $2, $3, $4, $5::jsonb, $6) returning id::text",
                        )
                        |> pog.parameter(pog.text(gid))
                        |> pog.parameter(pog.text(code_t))
                        |> pog.parameter(pog.text(label_t))
                        |> pog.parameter(pog.text(ft_t))
                        |> pog.parameter(opts_p)
                        |> pog.parameter(pog.int(sort))
                        |> pog.returning(one_string_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "attr_def_insert_failed")
                        Ok(ret) ->
                          case ret.rows {
                            [id] -> {
                              let out =
                                json.object([
                                  #("id", json.string(id)),
                                  #("ok", json.bool(True)),
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
      }
  }
}

/// DELETE /api/v1/catalog/attribute-defs/:did
pub fn delete_attribute_def(
  req: Request,
  ctx: Context,
  did: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case
        pog.query(
          "delete from listing_attribute_defs d using listing_attribute_groups g "
          <> "where d.id=$1::uuid and d.group_id=g.id and g.organization_id=$2::uuid",
        )
        |> pog.parameter(pog.text(string.trim(did)))
        |> pog.parameter(pog.text(org_id))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "attr_def_delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}

// ─── Listing Öznitelik Değerleri ─────────────────────────────────────────────

fn attr_value_row() -> decode.Decoder(#(String, String, String)) {
  use gc <- decode.field(0, decode.string)
  use k <- decode.field(1, decode.string)
  use v <- decode.field(2, decode.string)
  decode.success(#(gc, k, v))
}

/// GET /api/v1/catalog/listings/:id/attribute-values
pub fn get_listing_attribute_values(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select group_code, key, value_json::text from listing_attributes where listing_id=$1::uuid and group_code != 'listing_meta'",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(attr_value_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "attr_values_query_failed")
            Ok(ret) -> {
              let rows =
                list.map(ret.rows, fn(r) {
                  let #(gc, k, v) = r
                  json.object([
                    #("group_code", json.string(gc)),
                    #("key", json.string(k)),
                    #("value_json", json.string(v)),
                  ])
                })
              let body =
                json.object([#("values", json.array(rows, fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

/// GET /api/v1/public/listings/:id/attributes
/// Vitrin tarafı — auth/scope yok. listing_meta hariç tüm öznitelik satırlarını döndürür.
pub fn get_public_listing_attributes(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select group_code, key, value_json::text from listing_attributes where listing_id=$1::uuid and group_code != 'listing_meta'",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(attr_value_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "attr_values_query_failed")
    Ok(ret) -> {
      let rows =
        list.map(ret.rows, fn(r) {
          let #(gc, k, v) = r
          json.object([
            #("group_code", json.string(gc)),
            #("key", json.string(k)),
            #("value_json", json.string(v)),
          ])
        })
      let body =
        json.object([#("values", json.array(rows, fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

// ─── Yemek Planları ────────────────────────────────────────────────────────────

fn meal_plan_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String, String, String)) {
  use id       <- decode.field(0, decode.string)
  use code     <- decode.field(1, decode.string)
  use label    <- decode.field(2, decode.string)
  use label_en <- decode.field(3, decode.string)
  use meals    <- decode.field(4, decode.string)
  use extras   <- decode.field(5, decode.string)
  use price    <- decode.field(6, decode.string)
  use currency <- decode.field(7, decode.string)
  use active   <- decode.field(8, decode.string)
  use sort     <- decode.field(9, decode.string)
  decode.success(#(id, code, label, label_en, meals, extras, price, currency, active, sort))
}

fn meal_plan_to_json(row: #(String, String, String, String, String, String, String, String, String, String)) -> json.Json {
  let #(id, code, label, label_en, meals, extras, price, currency, active, sort) = row
  json.object([
    #("id",              json.string(id)),
    #("plan_code",       json.string(code)),
    #("label",           json.string(label)),
    #("label_en",        json.string(label_en)),
    #("included_meals",  json.string(meals)),
    #("included_extras", json.string(extras)),
    #("price_per_night", json.string(price)),
    #("currency_code",   json.string(currency)),
    #("is_active",       json.string(active)),
    #("sort_order",      json.string(sort)),
  ])
}

/// GET /api/v1/catalog/listings/:id/meal-plans — Yönetim listesi
pub fn list_manage_meal_plans(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select id::text, plan_code, label, label_en, included_meals::text, included_extras::text, price_per_night::text, currency_code, is_active::text, sort_order::text from listing_meal_plans where listing_id = $1::uuid order by sort_order, created_at",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.returning(meal_plan_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "meal_plans_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, meal_plan_to_json)
              let body =
                json.object([#("meal_plans", json.array(arr, fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

/// GET /api/v1/catalog/public/listings/:id/meal-plans — Önyüz (herkese açık)
pub fn list_public_meal_plans(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, plan_code, label, label_en, included_meals::text, included_extras::text, price_per_night::text, currency_code, is_active::text, sort_order::text from listing_meal_plans where listing_id = $1::uuid and is_active = true order by sort_order, created_at",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(meal_plan_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "meal_plans_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, meal_plan_to_json)
      let body =
        json.object([#("meal_plans", json.array(arr, fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/catalog/public/listings/:id/price-rules — yayında ilanın dönemsel fiyat kuralları (vitrin)
pub fn list_public_listing_price_rules(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select r.id::text, coalesce(r.rule_json::text,'{}'), coalesce(r.valid_from::text,''), coalesce(r.valid_to::text,'') "
      <> "from listing_price_rules r "
      <> "inner join listings l on l.id = r.listing_id and l.status = 'published' "
      <> "where r.listing_id = $1::uuid "
      <> "order by coalesce(r.valid_from, 'epoch'::date)",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(price_rule_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "public_price_rules_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(row) {
          let #(id, rj, vf, vt) = row
          let vfj = case vf == "" {
            True -> json.null()
            False -> json.string(vf)
          }
          let vtj = case vt == "" {
            True -> json.null()
            False -> json.string(vt)
          }
          json.object([
            #("id", json.string(id)),
            #("rule_json", json.string(rj)),
            #("valid_from", vfj),
            #("valid_to", vtj),
          ])
        })
      let body =
        json.object([#("rules", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/catalog/public/listings/:id/availability-calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — vitrin (yayında ilan)
pub fn list_public_listing_availability_calendar(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let from_d =
    list.key_find(qs, "from")
    |> result.unwrap("")
    |> string.trim
  let to_d =
    list.key_find(qs, "to")
    |> result.unwrap("")
    |> string.trim
  case from_d == "" || to_d == "" {
    True -> json_err(400, "from_to_required")
    False ->
      case
        pog.query(
          "select c.day::text, (c.am_available or c.pm_available), coalesce(c.price_override::text,''), c.am_available, c.pm_available "
          <> "from listing_availability_calendar c "
          <> "inner join listings l on l.id = c.listing_id and l.status = 'published' "
          <> "where c.listing_id = $1::uuid and c.day >= $2::date and c.day <= $3::date "
          <> "order by c.day",
        )
        |> pog.parameter(pog.text(listing_id))
        |> pog.parameter(pog.text(from_d))
        |> pog.parameter(pog.text(to_d))
        |> pog.returning(avail_day_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "public_availability_query_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(d, av, po, am, pm) = row
              let poj = case po == "" {
                True -> json.null()
                False -> json.string(po)
              }
              json.object([
                #("day", json.string(d)),
                #("is_available", json.bool(av)),
                #("price_override", poj),
                #("am_available", json.bool(am)),
                #("pm_available", json.bool(pm)),
              ])
            })
          let body =
            json.object([#("days", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn vitrine_row() -> decode.Decoder(#(String, String, String)) {
  use title <- decode.field(0, decode.string)
  use description <- decode.field(1, decode.string)
  use contact_name <- decode.field(2, decode.string)
  decode.success(#(title, description, contact_name))
}

/// GET /api/v1/catalog/public/listings/:id/vitrine?locale=tr — yayında ilan başlığı, açıklaması, iletişim adı (vitrin)
pub fn get_public_listing_vitrine(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let locale_raw =
    list.key_find(qs, "locale")
    |> result.unwrap("tr")
    |> string.trim
  let locale = case locale_raw == "" {
    True -> "tr"
    False -> locale_raw
  }
  case
    pog.query(
      "select "
      <> "coalesce((select lt.title from listing_translations lt "
      <> "join locales lo on lo.id = lt.locale_id "
      <> "where lt.listing_id = l.id and lower(lo.code) = lower($2) limit 1), "
      <> "(select lt2.title from listing_translations lt2 where lt2.listing_id = l.id limit 1), "
      <> "l.slug), "
      <> "coalesce((select lt.description from listing_translations lt "
      <> "join locales lo on lo.id = lt.locale_id "
      <> "where lt.listing_id = l.id and lower(lo.code) = lower($2) limit 1), ''), "
      <> "coalesce((select c.contact_name from listing_owner_contacts c where c.listing_id = l.id limit 1), '') "
      <> "from listings l where l.id = $1::uuid and l.status = 'published'",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(locale))
    |> pog.returning(vitrine_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "vitrine_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "listing_not_found")
        [first, ..] -> {
          let #(title, description, contact_name) = first
          let cnj = case string.trim(contact_name) == "" {
            True -> json.null()
            False -> json.string(string.trim(contact_name))
          }
          let body =
            json.object([
              #("title", json.string(title)),
              #("description", json.string(description)),
              #("contact_name", cnj),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn meal_plan_create_decoder() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  decode.field("plan_code", decode.string, fn(code) {
    decode.field("label", decode.string, fn(label) {
      decode.optional_field("label_en", "", decode.string, fn(label_en) {
        decode.optional_field("included_meals", "[]", decode.string, fn(meals) {
          decode.optional_field("included_extras", "[]", decode.string, fn(extras) {
            decode.field("price_per_night", decode.string, fn(price) {
              decode.field("currency_code", decode.string, fn(currency) {
                decode.success(#(code, label, label_en, meals, extras, price, currency))
              })
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/catalog/listings/:id/meal-plans
pub fn create_manage_meal_plan(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Post)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, meal_plan_create_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(code, label, label_en, meals_raw, extras_raw, price_str, currency)) ->
                  case string.trim(code) == "" || string.trim(label) == "" || string.trim(price_str) == "" {
                    True -> json_err(400, "plan_code_label_price_required")
                    False ->
                      case
                        pog.query(
                          "insert into listing_meal_plans (listing_id, plan_code, label, label_en, included_meals, included_extras, price_per_night, currency_code) values ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7::numeric, $8) returning id::text",
                        )
                        |> pog.parameter(pog.text(listing_id))
                        |> pog.parameter(pog.text(string.trim(code)))
                        |> pog.parameter(pog.text(string.trim(label)))
                        |> pog.parameter(pog.text(string.trim(label_en)))
                        |> pog.parameter(pog.text(meals_raw))
                        |> pog.parameter(pog.text(extras_raw))
                        |> pog.parameter(pog.text(string.trim(price_str)))
                        |> pog.parameter(pog.text(string.trim(currency)))
                        |> pog.returning(one_string_row())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "meal_plan_insert_failed")
                        Ok(r) ->
                          case r.rows {
                            [id] -> wisp.json_response("{\"id\":\"" <> id <> "\"}", 201)
                            _ -> json_err(500, "unexpected")
                          }
                      }
                  }
              }
          }
      }
  }
}

fn meal_plan_update_decoder() -> decode.Decoder(#(String, String, String, String, String, String, String, String, String)) {
  decode.field("label", decode.string, fn(label) {
    decode.optional_field("label_en", "", decode.string, fn(label_en) {
      decode.optional_field("included_meals", "[]", decode.string, fn(meals) {
        decode.optional_field("included_extras", "[]", decode.string, fn(extras) {
          decode.field("price_per_night", decode.string, fn(price) {
            decode.field("currency_code", decode.string, fn(currency) {
              decode.optional_field("is_active", "true", decode.string, fn(active) {
                decode.optional_field("sort_order", "0", decode.string, fn(sort) {
                  decode.optional_field("notes", "", decode.string, fn(notes) {
                    decode.success(#(label, label_en, meals, extras, price, currency, active, sort, notes))
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

/// PUT /api/v1/catalog/listings/:id/meal-plans/:plan_id
pub fn update_manage_meal_plan(
  req: Request,
  ctx: Context,
  listing_id: String,
  plan_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, meal_plan_update_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(label, label_en, meals, extras, price, currency, active, sort_str, notes)) ->
                  case
                    pog.query(
                      "update listing_meal_plans set label=$3, label_en=$4, included_meals=$5::jsonb, included_extras=$6::jsonb, price_per_night=$7::numeric, currency_code=$8, is_active=$9::boolean, sort_order=$10::int, notes=$11 where id=$1::uuid and listing_id=$2::uuid",
                    )
                    |> pog.parameter(pog.text(string.trim(plan_id)))
                    |> pog.parameter(pog.text(listing_id))
                    |> pog.parameter(pog.text(string.trim(label)))
                    |> pog.parameter(pog.text(string.trim(label_en)))
                    |> pog.parameter(pog.text(meals))
                    |> pog.parameter(pog.text(extras))
                    |> pog.parameter(pog.text(string.trim(price)))
                    |> pog.parameter(pog.text(string.trim(currency)))
                    |> pog.parameter(pog.text(active))
                    |> pog.parameter(pog.text(sort_str))
                    |> pog.parameter(pog.text(notes))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "meal_plan_update_failed")
                    Ok(ret) ->
                      case ret.count {
                        0 -> json_err(404, "not_found")
                        _ -> wisp.json_response("{\"ok\":true}", 200)
                      }
                  }
              }
          }
      }
  }
}

/// DELETE /api/v1/catalog/listings/:id/meal-plans/:plan_id
pub fn delete_manage_meal_plan(
  req: Request,
  ctx: Context,
  listing_id: String,
  plan_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "delete from listing_meal_plans where id=$1::uuid and listing_id=$2::uuid",
            )
            |> pog.parameter(pog.text(string.trim(plan_id)))
            |> pog.parameter(pog.text(listing_id))
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "meal_plan_delete_failed")
            Ok(ret) ->
              case ret.count {
                0 -> json_err(404, "not_found")
                _ -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
  }
}

/// PUT /api/v1/catalog/listings/:id/attribute-values
/// Body: [{"group_code":"...","key":"...","value":"..."}]
pub fn put_listing_attribute_values(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, decode.dynamic) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(_) ->
                  case
                    pog.query(
                      "insert into listing_attributes (listing_id, group_code, key, value_json) "
                      <> "select $1::uuid, v->>'group_code', v->>'key', "
                      <> "case when v->>'value' is null then 'null'::jsonb "
                      <> "else to_jsonb(v->>'value') end "
                      <> "from jsonb_array_elements($2::jsonb) as v "
                      <> "where (v->>'group_code') is not null and (v->>'key') is not null "
                      <> "on conflict (listing_id, group_code, key) do update set value_json = excluded.value_json",
                    )
                    |> pog.parameter(pog.text(listing_id))
                    |> pog.parameter(pog.text(body))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "attr_values_save_failed")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                  }
              }
          }
      }
  }
}

// ─── Öznitelik grup / tanım çevirileri ───────────────────────────────────────

fn attr_label_entry_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("locale_code", decode.string, fn(lc) {
    decode.field("label", decode.string, fn(lb) {
      decode.success(#(lc, lb))
    })
  })
}

fn put_attr_def_translations_body_decoder(
) -> decode.Decoder(List(#(String, String))) {
  decode.field("entries", decode.list(attr_label_entry_decoder()), fn(entries) {
    decode.success(entries)
  })
}

fn attr_name_entry_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("locale_code", decode.string, fn(lc) {
    decode.field("name", decode.string, fn(nm) {
      decode.success(#(lc, nm))
    })
  })
}

fn put_attr_group_translations_body_decoder(
) -> decode.Decoder(List(#(String, String))) {
  decode.field("entries", decode.list(attr_name_entry_decoder()), fn(entries) {
    decode.success(entries)
  })
}

fn def_belongs_to_org(
  conn: pog.Connection,
  did: String,
  org_id: String,
) -> Result(Bool, Nil) {
  case
    pog.query(
      "select exists(select 1 from listing_attribute_defs d "
      <> "inner join listing_attribute_groups g on g.id = d.group_id "
      <> "where d.id = $1::uuid and g.organization_id = $2::uuid)",
    )
    |> pog.parameter(pog.text(did))
    |> pog.parameter(pog.text(org_id))
    |> pog.returning(pg_bool_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [b] -> Ok(b)
        _ -> Error(Nil)
      }
  }
}

fn upsert_attribute_def_translation(
  conn: pog.Connection,
  def_id: String,
  locale_code: String,
  label: String,
) -> Result(Nil, Nil) {
  case
    pog.query(
      "insert into listing_attribute_def_translations (def_id, locale_id, label) "
      <> "select $1::uuid, loc.id, $3::text from locales loc "
      <> "where lower(loc.code) = lower($2) and coalesce(loc.is_active, true) = true limit 1 "
      <> "on conflict (def_id, locale_id) do update set label = excluded.label "
      <> "returning 1",
    )
    |> pog.parameter(pog.text(def_id))
    |> pog.parameter(pog.text(locale_code))
    |> pog.parameter(pog.text(label))
    |> pog.returning(translation_upsert_return_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        _ -> Error(Nil)
      }
  }
}

fn upsert_attribute_group_translation(
  conn: pog.Connection,
  group_id: String,
  locale_code: String,
  name: String,
) -> Result(Nil, Nil) {
  case
    pog.query(
      "insert into listing_attribute_group_translations (group_id, locale_id, name) "
      <> "select $1::uuid, loc.id, $3::text from locales loc "
      <> "where lower(loc.code) = lower($2) and coalesce(loc.is_active, true) = true limit 1 "
      <> "on conflict (group_id, locale_id) do update set name = excluded.name "
      <> "returning 1",
    )
    |> pog.parameter(pog.text(group_id))
    |> pog.parameter(pog.text(locale_code))
    |> pog.parameter(pog.text(name))
    |> pog.returning(translation_upsert_return_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        _ -> Error(Nil)
      }
  }
}

/// PUT /api/v1/catalog/attribute-defs/:did/translations
pub fn put_attribute_def_translations(
  req: Request,
  ctx: Context,
  did: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case def_belongs_to_org(ctx.db, did, org_id) {
        Error(_) -> json_err(500, "def_scope_check_failed")
        Ok(False) -> json_err(404, "attr_def_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, put_attr_def_translations_body_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(entries) -> {
                  let applied =
                    list.try_map(entries, fn(ent) {
                      let #(lc_raw, lb_raw) = ent
                      let lc = string.lowercase(string.trim(lc_raw))
                      let lb = string.trim(lb_raw)
                      case lc == "" || lb == "" {
                        True -> Error(Nil)
                        False ->
                          case
                            upsert_attribute_def_translation(ctx.db, did, lc, lb)
                          {
                            Ok(_) -> Ok(Nil)
                            Error(_) -> Error(Nil)
                          }
                      }
                    })
                  case applied {
                    Error(_) -> json_err(400, "invalid_translation_entries")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                  }
                }
              }
          }
      }
  }
}

/// PUT /api/v1/catalog/attribute-groups/:gid/translations
pub fn put_attribute_group_translations(
  req: Request,
  ctx: Context,
  gid: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case group_belongs_to_org(ctx.db, gid, org_id) {
        Error(_) -> json_err(500, "group_scope_check_failed")
        Ok(False) -> json_err(404, "group_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, put_attr_group_translations_body_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(entries) -> {
                  let applied =
                    list.try_map(entries, fn(ent) {
                      let #(lc_raw, nm_raw) = ent
                      let lc = string.lowercase(string.trim(lc_raw))
                      let nm = string.trim(nm_raw)
                      case lc == "" || nm == "" {
                        True -> Error(Nil)
                        False ->
                          case
                            upsert_attribute_group_translation(ctx.db, gid, lc, nm)
                          {
                            Ok(_) -> Ok(Nil)
                            Error(_) -> Error(Nil)
                          }
                      }
                    })
                  case applied {
                    Error(_) -> json_err(400, "invalid_translation_entries")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                  }
                }
              }
          }
      }
  }
}

// ─── Fiyata dahil / hariç katalog kalemleri ───────────────────────────────────

fn price_line_item_row() -> decode.Decoder(
  #(String, String, String, String, Int, Bool),
) {
  use id <- decode.field(0, decode.string)
  use scope <- decode.field(1, decode.string)
  use code <- decode.field(2, decode.string)
  use lbl <- decode.field(3, decode.string)
  use sort <- decode.field(4, decode.int)
  use active <- decode.field(5, decode.bool)
  decode.success(#(id, scope, code, lbl, sort, active))
}

fn create_price_line_decoder() -> decode.Decoder(
  #(String, String, String, String, String),
) {
  decode.optional_field("category_code", "", decode.string, fn(cc) {
    decode.optional_field("scope", "", decode.string, fn(sc) {
      decode.optional_field("code", "", decode.string, fn(cd) {
        decode.optional_field("sort_order", "0", decode.string, fn(srt) {
          decode.optional_field("label", "", decode.string, fn(lb) {
            decode.success(#(cc, sc, cd, srt, lb))
          })
        })
      })
    })
  })
}

fn put_price_line_translations_body_decoder(
) -> decode.Decoder(List(#(String, String))) {
  decode.field("entries", decode.list(attr_label_entry_decoder()), fn(entries) {
    decode.success(entries)
  })
}

fn price_line_item_in_org(
  conn: pog.Connection,
  iid: String,
  org_id: String,
) -> Result(Bool, Nil) {
  case
    pog.query(
      "select exists(select 1 from category_price_line_items where id=$1::uuid and organization_id=$2::uuid)",
    )
    |> pog.parameter(pog.text(iid))
    |> pog.parameter(pog.text(org_id))
    |> pog.returning(pg_bool_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [b] -> Ok(b)
        _ -> Error(Nil)
      }
  }
}

fn upsert_price_line_translation(
  conn: pog.Connection,
  item_id: String,
  locale_code: String,
  label: String,
) -> Result(Nil, Nil) {
  case
    pog.query(
      "insert into category_price_line_item_translations (item_id, locale_id, label) "
      <> "select $1::uuid, loc.id, $3::text from locales loc "
      <> "where lower(loc.code) = lower($2) and coalesce(loc.is_active, true) = true limit 1 "
      <> "on conflict (item_id, locale_id) do update set label = excluded.label "
      <> "returning 1",
    )
    |> pog.parameter(pog.text(item_id))
    |> pog.parameter(pog.text(locale_code))
    |> pog.parameter(pog.text(label))
    |> pog.returning(translation_upsert_return_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        _ -> Error(Nil)
      }
  }
}

fn listing_category_code(conn: pog.Connection, listing_id: String) -> Result(
  String,
  Nil,
) {
  case
    pog.query(
      "select c.code::text from listings l "
      <> "join product_categories c on c.id = l.category_id where l.id = $1::uuid",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(one_string_row())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [c] -> Ok(c)
        _ -> Error(Nil)
      }
  }
}

/// GET /api/v1/catalog/price-line-items?category_code=x&locale=tr
pub fn list_price_line_items(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let cat =
        list.key_find(qs, "category_code")
        |> result.unwrap("")
        |> string.trim
      let loc_raw =
        list.key_find(qs, "locale")
        |> result.unwrap("tr")
        |> string.trim
      case cat == "" {
        True -> json_err(400, "category_code_required")
        False -> {
          case
            pog.query(
              "select i.id::text, i.scope, i.code, "
              <> "coalesce(t.label, ''), i.sort_order, i.is_active "
              <> "from category_price_line_items i "
              <> "left join category_price_line_item_translations t on t.item_id = i.id "
              <> "and t.locale_id = (select id from locales where lower(code) = lower($3) limit 1) "
              <> "where i.organization_id = $1::uuid and i.category_code = $2 "
              <> "order by i.scope, i.sort_order, i.code",
            )
            |> pog.parameter(pog.text(org_id))
            |> pog.parameter(pog.text(cat))
            |> pog.parameter(pog.text(loc_raw))
            |> pog.returning(price_line_item_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "price_line_items_query_failed")
            Ok(ret) -> {
              let rows =
                list.map(ret.rows, fn(r) {
                  let #(id, scope, code, lbl, sort, active) = r
                  json.object([
                    #("id", json.string(id)),
                    #("scope", json.string(scope)),
                    #("code", json.string(code)),
                    #("label", json.string(lbl)),
                    #("sort_order", json.int(sort)),
                    #("is_active", json.bool(active)),
                  ])
                })
              let body =
                json.object([#("items", json.array(rows, fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
      }
    }
  }
}

/// POST /api/v1/catalog/price-line-items
pub fn create_price_line_item(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_price_line_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(cc, sc, cd, srt_raw, lb)) -> {
              let cc_t = string.trim(cc)
              let sc_t = string.lowercase(string.trim(sc))
              let cd_t = string.trim(cd)
              let lb_t = string.trim(lb)
              case
                cc_t == ""
                || cd_t == ""
                || { sc_t != "included" && sc_t != "excluded" }
                || lb_t == ""
              {
                True -> json_err(400, "category_scope_code_label_required")
                False -> {
                  let sort = case int.parse(string.trim(srt_raw)) {
                    Ok(n) -> n
                    Error(_) -> 0
                  }
                  case
                    pog.query(
                      "insert into category_price_line_items (organization_id, category_code, scope, code, sort_order) "
                      <> "values ($1::uuid, $2, $3, $4, $5) returning id::text",
                    )
                    |> pog.parameter(pog.text(org_id))
                    |> pog.parameter(pog.text(cc_t))
                    |> pog.parameter(pog.text(sc_t))
                    |> pog.parameter(pog.text(cd_t))
                    |> pog.parameter(pog.int(sort))
                    |> pog.returning(one_string_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "price_line_item_insert_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [id] ->
                          case
                            upsert_price_line_translation(ctx.db, id, "tr", lb_t)
                          {
                            Error(_) -> json_err(500, "price_line_tr_insert_failed")
                            Ok(_) -> {
                              let out =
                                json.object([
                                  #("id", json.string(id)),
                                  #("ok", json.bool(True)),
                                ])
                                |> json.to_string
                              wisp.json_response(out, 201)
                            }
                          }
                        _ -> json_err(500, "unexpected")
                      }
                  }
                }
              }
            }
          }
      }
  }
}

/// DELETE /api/v1/catalog/price-line-items/:id
pub fn delete_price_line_item(
  req: Request,
  ctx: Context,
  iid: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case price_line_item_in_org(ctx.db, iid, org_id) {
        Error(_) -> json_err(500, "scope_check_failed")
        Ok(False) -> json_err(404, "not_found")
        Ok(True) ->
          case
            pog.query(
              "delete from category_price_line_items where id = $1::uuid and organization_id = $2::uuid",
            )
            |> pog.parameter(pog.text(string.trim(iid)))
            |> pog.parameter(pog.text(org_id))
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "price_line_delete_failed")
            Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}

/// PUT /api/v1/catalog/price-line-items/:id/translations
pub fn put_price_line_item_translations(
  req: Request,
  ctx: Context,
  iid: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case price_line_item_in_org(ctx.db, iid, org_id) {
        Error(_) -> json_err(500, "scope_check_failed")
        Ok(False) -> json_err(404, "not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, put_price_line_translations_body_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(entries) -> {
                  let applied =
                    list.try_map(entries, fn(ent) {
                      let #(lc_raw, lb_raw) = ent
                      let lc = string.lowercase(string.trim(lc_raw))
                      let lb = string.trim(lb_raw)
                      case lc == "" || lb == "" {
                        True -> Error(Nil)
                        False ->
                          case
                            upsert_price_line_translation(ctx.db, iid, lc, lb)
                          {
                            Ok(_) -> Ok(Nil)
                            Error(_) -> Error(Nil)
                          }
                      }
                    })
                  case applied {
                    Error(_) -> json_err(400, "invalid_translation_entries")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                  }
                }
              }
          }
      }
  }
}

/// GET /api/v1/catalog/listings/:id/price-line-selections
pub fn get_listing_price_line_selections(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case
            pog.query(
              "select s.item_id::text from listing_price_line_selections s "
              <> "inner join listings l on l.id = s.listing_id "
              <> "where s.listing_id = $1::uuid and l.organization_id = $2::uuid",
            )
            |> pog.parameter(pog.text(listing_id))
            |> pog.parameter(pog.text(org_id))
            |> pog.returning(one_string_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "price_line_sel_query_failed")
            Ok(ret) -> {
              let ids = list.map(ret.rows, fn(r) { r })
              let body =
                json.object([#(
                  "item_ids",
                  json.array(ids, json.string),
                )])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn put_price_line_sel_body_decoder() -> decode.Decoder(List(String)) {
  decode.field("item_ids", decode.list(decode.string), fn(ids) {
    decode.success(ids)
  })
}

/// PUT /api/v1/catalog/listings/:id/price-line-selections
pub fn put_listing_price_line_selections(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) ->
      case listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case listing_category_code(ctx.db, listing_id) {
            Error(_) -> json_err(500, "listing_cat_query_failed")
            Ok(cat_code) ->
              case read_body_string(req) {
                Error(_) -> json_err(400, "empty_body")
                Ok(body) ->
                  case json.parse(body, put_price_line_sel_body_decoder()) {
                    Error(_) -> json_err(400, "invalid_json")
                    Ok(item_ids) -> {
                      case
                        pog.query(
                          "delete from listing_price_line_selections where listing_id = $1::uuid",
                        )
                        |> pog.parameter(pog.text(listing_id))
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "price_line_sel_clear_failed")
                        Ok(_) ->
                          case item_ids {
                            [] -> wisp.json_response("{\"ok\":true}", 200)
                            _ -> {
                              let ids_sql = string.join(item_ids, ",")
                              case
                                pog.query(
                                  "insert into listing_price_line_selections (listing_id, item_id) "
                                  <> "select $1::uuid, x.id from category_price_line_items x "
                                  <> "where x.organization_id = $2::uuid "
                                  <> "and x.category_code = $3::text "
                                  <> "and x.id::text in (select trim(val) from unnest(string_to_array($4, ',')) val)",
                                )
                                |> pog.parameter(pog.text(listing_id))
                                |> pog.parameter(pog.text(org_id))
                                |> pog.parameter(pog.text(cat_code))
                                |> pog.parameter(pog.text(ids_sql))
                                |> pog.execute(ctx.db)
                              {
                                Error(_) ->
                                  json_err(500, "price_line_sel_insert_failed")
                                Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
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

fn acc_rules_one_text_row() -> decode.Decoder(String) {
  use a <- decode.field(0, decode.string)
  decode.success(a)
}

fn acc_rules_public_pair_row() -> decode.Decoder(#(String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  decode.success(#(a, b))
}

/// GET /api/v1/catalog/accommodation-rules?category_code=holiday_home — yönetim: kategori konaklama kuralları JSON
pub fn get_manage_category_accommodation_rules(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let cat =
        list.key_find(qs, "category_code")
        |> result.unwrap("")
        |> string.trim
      case cat == "" {
        True -> json_err(400, "category_code_required")
        False -> {
          case
            pog.query(
              "select coalesce(rules_json::text, '[]') from category_accommodation_rule_sets "
              <> "where organization_id = $1::uuid and category_code = $2 limit 1",
            )
            |> pog.parameter(pog.text(org_id))
            |> pog.parameter(pog.text(cat))
            |> pog.returning(acc_rules_one_text_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "accommodation_rules_manage_query_failed")
            Ok(ret) -> {
              let rules_text = case ret.rows {
                [] -> "[]"
                [rj] -> rj
                _ -> "[]"
              }
              let body =
                json.object([#("rules_json", json.string(rules_text))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
      }
    }
  }
}

/// PUT /api/v1/catalog/accommodation-rules?category_code=holiday_home — gövde: JSON dizi `[{...}]`
pub fn put_manage_category_accommodation_rules(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Put)
  case resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_, org_id)) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let cat =
        list.key_find(qs, "category_code")
        |> result.unwrap("")
        |> string.trim
      case cat == "" {
        True -> json_err(400, "category_code_required")
        False ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case
                pog.query(
                  "insert into category_accommodation_rule_sets (organization_id, category_code, rules_json, updated_at) "
                  <> "values ($1::uuid, $2::text, $3::jsonb, now()) "
                  <> "on conflict (organization_id, category_code) do update set rules_json = excluded.rules_json, updated_at = now()",
                )
                |> pog.parameter(pog.text(org_id))
                |> pog.parameter(pog.text(cat))
                |> pog.parameter(pog.text(body))
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "accommodation_rules_save_failed")
                Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
    }
  }
}

/// GET /api/v1/catalog/public/listings/:id/accommodation-rules — vitrin: kategori kuralları + ilan seçimi
pub fn get_public_listing_accommodation_rules(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select "
      <> "coalesce(s.rules_json::text, '[]'), "
      <> "coalesce((select value_json::text from listing_attributes "
      <> "where listing_id = $1::uuid and group_code = 'catalog' and key = 'accommodation_rule_ids' limit 1), '[]') "
      <> "from listings l "
      <> "join product_categories pc on pc.id = l.category_id "
      <> "left join category_accommodation_rule_sets s on s.organization_id = l.organization_id and lower(s.category_code) = lower(pc.code) "
      <> "where l.id = $1::uuid and l.status = 'published' limit 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(acc_rules_public_pair_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "accommodation_rules_public_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "listing_not_found")
        [#(rules_json, selected_ids_json)] -> {
          let body =
            json.object([
              #("rules_json", json.string(rules_json)),
              #("selected_ids_json", json.string(selected_ids_json)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "accommodation_rules_public_unexpected")
      }
  }
}
