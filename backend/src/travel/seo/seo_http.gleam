//// SEO meta, schema.org JSON-LD, 301, sitemap özeti, 404 günlüğü (080_content_seo).

import backend/context.{type Context}
import travel/identity/permissions
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/http/response
import gleam/json
import gleam/list
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

/// Çoklu kiracı paneli: SEO meta / JSON-LD yazımı için oturum + katalog/CMS erişimi.
fn require_seo_writer(req: Request, ctx: Context) -> Result(Nil, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case
        permissions.user_has_permission(ctx.db, uid, "admin.users.read")
        || permissions.user_has_permission(ctx.db, uid, "supplier.portal")
        || permissions.user_has_permission(ctx.db, uid, "staff.reservations.read")
        || permissions.user_has_permission(ctx.db, uid, "agency.portal")
      {
        True -> Ok(Nil)
        False -> Error(json_err(403, "forbidden"))
      }
  }
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn locale_id_by_code(ctx: Context, code: String) -> Result(String, Nil) {
  case
    pog.query("select id::text from locales where lower(code) = lower($1) limit 1")
    |> pog.parameter(pog.text(string.trim(code)))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error(Nil)
      }
  }
}

/// GET /api/v1/seo/metadata?entity_type=listing&entity_id=uuid&locale=tr
pub fn get_metadata(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let et =
    list.key_find(qs, "entity_type")
    |> result.unwrap("")
    |> string.trim
  let eid =
    list.key_find(qs, "entity_id")
    |> result.unwrap("")
    |> string.trim
  let loc =
    list.key_find(qs, "locale")
    |> result.unwrap("tr")
    |> string.trim
  case et == "" || eid == "" {
    True -> json_err(400, "entity_type_and_entity_id_required")
    False ->
      case locale_id_by_code(ctx, loc) {
        Error(_) -> json_err(400, "invalid_locale")
        Ok(lid) -> {
          let row = {
            use id <- decode.field(0, decode.string)
            use title <- decode.field(1, decode.string)
            use desc <- decode.field(2, decode.string)
            use kw <- decode.field(3, decode.string)
            use can <- decode.field(4, decode.string)
            use og <- decode.field(5, decode.string)
            use robots <- decode.field(6, decode.string)
            decode.success(#(id, title, desc, kw, can, og, robots))
          }
          case
            pog.query(
              "select id::text, coalesce(title,''), coalesce(description,''), coalesce(keywords,''), coalesce(canonical_path,''), coalesce(og_image_storage_key,''), coalesce(robots,'') from seo_metadata where entity_type = $1 and entity_id = $2::uuid and locale_id = $3::smallint limit 1",
            )
            |> pog.parameter(pog.text(et))
            |> pog.parameter(pog.text(eid))
            |> pog.parameter(pog.text(lid))
            |> pog.returning(row)
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "query_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> {
                  let body =
                    json.object([#("metadata", json.null())])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
                [#(id, t, d, k, c, o, r)] -> {
                  let body =
                    json.object([
                      #(
                        "metadata",
                        json.object([
                          #("id", json.string(id)),
                          #("title", json.string(t)),
                          #("description", json.string(d)),
                          #("keywords", json.string(k)),
                          #("canonical_path", json.string(c)),
                          #("og_image_storage_key", json.string(o)),
                          #("robots", json.string(r)),
                        ]),
                      ),
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
}

fn upsert_metadata_decoder() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String, String),
) {
  decode.field("entity_type", decode.string, fn(et) {
    decode.field("entity_id", decode.string, fn(eid) {
      decode.field("locale", decode.string, fn(loc) {
        decode.optional_field("title", "", decode.string, fn(t) {
          decode.optional_field("description", "", decode.string, fn(d) {
            decode.optional_field("keywords", "", decode.string, fn(k) {
              decode.optional_field("canonical_path", "", decode.string, fn(c) {
                decode.optional_field("og_image_storage_key", "", decode.string, fn(o) {
                  decode.optional_field("robots", "", decode.string, fn(r) {
                    decode.success(#(et, eid, loc, t, d, k, c, o, r))
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

/// POST /api/v1/seo/metadata — upsert
pub fn upsert_metadata(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_seo_writer(req, ctx) {
    Error(r) -> r
    Ok(Nil) ->
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, upsert_metadata_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(et, eid, loc, t, d, k, c, o, r)) ->
          case locale_id_by_code(ctx, loc) {
            Error(_) -> json_err(400, "invalid_locale")
            Ok(lid) ->
              case
                pog.query(
                  "insert into seo_metadata (entity_type, entity_id, locale_id, title, description, keywords, canonical_path, og_image_storage_key, robots) values ($1, $2::uuid, $3::smallint, nullif($4,''), nullif($5,''), nullif($6,''), nullif($7,''), nullif($8,''), nullif($9,'')) on conflict (entity_type, entity_id, locale_id) do update set title = excluded.title, description = excluded.description, keywords = excluded.keywords, canonical_path = excluded.canonical_path, og_image_storage_key = excluded.og_image_storage_key, robots = excluded.robots returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(et)))
                |> pog.parameter(pog.text(string.trim(eid)))
                |> pog.parameter(pog.text(lid))
                |> pog.parameter(pog.text(t))
                |> pog.parameter(pog.text(d))
                |> pog.parameter(pog.text(k))
                |> pog.parameter(pog.text(c))
                |> pog.parameter(pog.text(o))
                |> pog.parameter(pog.text(r))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "upsert_failed")
                Ok(ret) ->
                  case ret.rows {
                    [id] -> {
                      let out =
                        json.object([#("id", json.string(id)), #("ok", json.bool(True))])
                        |> json.to_string
                      wisp.json_response(out, 200)
                    }
                    _ -> json_err(500, "unexpected")
                  }
              }
          }
      }
  }
  }
}

fn schema_row() -> decode.Decoder(#(String, String, String)) {
  use st <- decode.field(0, decode.string)
  use jd <- decode.field(1, decode.string)
  use u <- decode.field(2, decode.string)
  decode.success(#(st, jd, u))
}

/// GET /api/v1/seo/schema?entity_type=listing&entity_id=uuid
pub fn list_schema(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let et =
    list.key_find(qs, "entity_type")
    |> result.unwrap("")
    |> string.trim
  let eid =
    list.key_find(qs, "entity_id")
    |> result.unwrap("")
    |> string.trim
  case et == "" || eid == "" {
    True -> json_err(400, "entity_required")
    False ->
      case
        pog.query(
          "select schema_type::text, json_ld::text, updated_at::text from structured_data_snippets where entity_type = $1 and entity_id = $2::uuid order by schema_type",
        )
        |> pog.parameter(pog.text(et))
        |> pog.parameter(pog.text(eid))
        |> pog.returning(schema_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(st, jd, u) = row
              json.object([
                #("schema_type", json.string(st)),
                #("json_ld", json.string(jd)),
                #("updated_at", json.string(u)),
              ])
            })
          let body =
            json.object([#("snippets", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn upsert_schema_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.field("entity_type", decode.string, fn(et) {
    decode.field("entity_id", decode.string, fn(eid) {
      decode.field("schema_type", decode.string, fn(st) {
        decode.field("json_ld", decode.string, fn(j) {
          decode.success(#(et, eid, st, j))
        })
      })
    })
  })
}

/// POST /api/v1/seo/schema — json_ld gövdesi JSON string veya obje (stringify edilmiş)
pub fn upsert_schema(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_seo_writer(req, ctx) {
    Error(r) -> r
    Ok(Nil) ->
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, upsert_schema_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(et, eid, st, jraw)) -> {
          let jtrim = string.trim(jraw)
          case string.trim(et) == "" || string.trim(eid) == "" || string.trim(st) == ""
            || jtrim == ""
          {
            True -> json_err(400, "fields_required")
            False ->
              case
                pog.query(
                  "insert into structured_data_snippets (entity_type, entity_id, schema_type, json_ld) values ($1, $2::uuid, $3, $4::jsonb) on conflict (entity_type, entity_id, schema_type) do update set json_ld = excluded.json_ld, updated_at = now() returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(et)))
                |> pog.parameter(pog.text(string.trim(eid)))
                |> pog.parameter(pog.text(string.trim(st)))
                |> pog.parameter(pog.text(jtrim))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "upsert_failed")
                Ok(ret) ->
                  case ret.rows {
                    [id] -> {
                      let out =
                        json.object([#("id", json.string(id)), #("ok", json.bool(True))])
                        |> json.to_string
                      wisp.json_response(out, 200)
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

fn redirect_row() -> decode.Decoder(#(String, String, String, Int, String)) {
  use id <- decode.field(0, decode.string)
  use fp <- decode.field(1, decode.string)
  use tp <- decode.field(2, decode.string)
  use sc <- decode.field(3, decode.int)
  use loc <- decode.field(4, decode.string)
  decode.success(#(id, fp, tp, sc, loc))
}

/// GET /api/v1/seo/redirects  (yönetici oturumu: `admin.users.read`)
pub fn list_redirects(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "forbidden")
        True ->
          case
            pog.query(
              "select id::text, from_path, to_path, status_code::int, coalesce(locale_id::text, '') from url_redirects order by from_path limit 500",
            )
            |> pog.returning(redirect_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "query_failed")
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(row) {
                  let #(id, fp, tp, sc, loc) = row
                  let locj = case loc == "" {
                    True -> json.null()
                    False -> json.string(loc)
                  }
                  json.object([
                    #("id", json.string(id)),
                    #("from_path", json.string(fp)),
                    #("to_path", json.string(tp)),
                    #("status_code", json.int(sc)),
                    #("locale_id", locj),
                  ])
                })
              let body =
                json.object([#("redirects", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn create_redirect_decoder() -> decode.Decoder(
  #(String, String, Int, Option(String), Option(String)),
) {
  decode.field("from_path", decode.string, fn(fp) {
    decode.field("to_path", decode.string, fn(tp) {
      decode.optional_field("status_code", 301, decode.int, fn(sc) {
        decode.optional_field("organization_id", "", decode.string, fn(oid) {
          decode.optional_field("locale", "", decode.string, fn(loc) {
            let org = case string.trim(oid) == "" {
              True -> None
              False -> Some(string.trim(oid))
            }
            let lc = case string.trim(loc) == "" {
              True -> None
              False -> Some(string.trim(loc))
            }
            decode.success(#(fp, tp, sc, org, lc))
          })
        })
      })
    })
  })
}

/// POST /api/v1/seo/redirects  (yönetici oturumu: `admin.users.read`)
pub fn create_redirect(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "forbidden")
        True -> create_redirect_inner(req, ctx)
      }
  }
}

fn create_redirect_inner(req: Request, ctx: Context) -> Response {
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_redirect_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(fp, tp, sc, org_opt, loc_opt)) -> {
          case string.trim(fp) == "" || string.trim(tp) == "" {
            True -> json_err(400, "paths_required")
            False -> {
              let org_p = case org_opt {
                Some(o) -> pog.text(o)
                None -> pog.null()
              }
              let loc_p = case loc_opt {
                None -> pog.null()
                Some(code) ->
                  case locale_id_by_code(ctx, code) {
                    Error(_) -> pog.null()
                    Ok(lid) -> pog.text(lid)
                  }
              }
              case
                pog.query(
                  "insert into url_redirects (organization_id, from_path, to_path, status_code, locale_id) values ($1::uuid, $2, $3, $4::smallint, $5::smallint) returning id::text",
                )
                |> pog.parameter(org_p)
                |> pog.parameter(pog.text(string.trim(fp)))
                |> pog.parameter(pog.text(string.trim(tp)))
                |> pog.parameter(pog.int(sc))
                |> pog.parameter(loc_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "redirect_conflict_or_invalid")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out =
                        json.object([#("id", json.string(id))])
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

/// DELETE /api/v1/seo/redirects/:id  (yönetici oturumu: `admin.users.read`)
pub fn delete_redirect(req: Request, ctx: Context, rid: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case string.trim(rid) == "" {
    True -> json_err(400, "invalid_id")
    False ->
      case permissions.session_user_from_request(req, ctx.db) {
        Error(r) -> r
        Ok(uid) ->
          case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
            False -> json_err(403, "forbidden")
            True ->
              case
                pog.query(
                  "delete from url_redirects where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(rid)))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "delete_failed")
                Ok(ret) ->
                  case ret.rows {
                    [] -> json_err(404, "not_found")
                    [_] -> {
                      let body =
                        json.object([#("ok", json.bool(True))])
                        |> json.to_string
                      wisp.json_response(body, 200)
                    }
                    _ -> json_err(500, "unexpected")
                  }
              }
          }
      }
  }
}

fn not_found_log_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use p <- decode.field(1, decode.string)
  use loc <- decode.field(2, decode.string)
  use hits <- decode.field(3, decode.string)
  use seen <- decode.field(4, decode.string)
  decode.success(#(id, p, loc, hits, seen))
}

/// GET /api/v1/seo/not-found/logs — son 404 kayıtları (`admin.users.read`).
pub fn list_not_found_logs(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> json_err(403, "forbidden")
        True ->
          case
            pog.query(
              "select n.id::text, n.path, coalesce(n.locale_id::text, ''), n.hit_count::text, to_char(n.last_seen, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from not_found_logs n order by n.last_seen desc limit 200",
            )
            |> pog.returning(not_found_log_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "not_found_logs_query_failed")
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(row) {
                  let #(id, p, loc, hits, seen) = row
                  let locj = case loc == "" {
                    True -> json.null()
                    False -> json.string(loc)
                  }
                  json.object([
                    #("id", json.string(id)),
                    #("path", json.string(p)),
                    #("locale_id", locj),
                    #("hit_count", json.string(hits)),
                    #("last_seen", json.string(seen)),
                  ])
                })
              let body =
                json.object([#("logs", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn sitemap_union_sql() -> String {
  "select 'listing'::text, l.slug::text, l.organization_id::text, coalesce(pc.code, '')::text from listings l join product_categories pc on pc.id = l.category_id where l.status = 'published' union all select 'cms_page'::text, p.slug::text, coalesce(p.organization_id::text, ''), ''::text from cms_pages p where p.is_published = true union all select 'blog_post'::text, b.slug::text, ''::text, ''::text from blog_posts b where b.published_at is not null order by 1, 2 limit 5000"
}

fn sitemap_row_decoder() -> decode.Decoder(#(String, String, String, String)) {
  use k <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use oid <- decode.field(2, decode.string)
  use cat <- decode.field(3, decode.string)
  decode.success(#(k, slug, oid, cat))
}

/// Next.js App Router ilk segmenti — `fronted/src/lib/listing-detail-routes.ts` ile aynı anahtarlar.
fn listing_detail_path_prefix(category_code: String) -> String {
  let c =
    category_code
    |> string.trim
    |> string.lowercase
  case c {
    "hotel" -> "otel"
    "holiday_home" -> "tatil-evi"
    "yacht_charter" -> "yat"
    "tour" -> "tur"
    "activity" -> "aktivite"
    "cruise" -> "gemi-turu"
    "hajj" -> "hac-paket"
    "visa" -> "vize-basvuru"
    "flight" -> "ucak-ilan"
    "car_rental" -> "arac"
    "ferry" -> "feribot-rezervasyon"
    "transfer" -> "tasima"
    _ -> "otel"
  }
}

fn xml_escape_loc(s: String) -> String {
  s
  |> string.replace("&", "&amp;")
  |> string.replace("\"", "&quot;")
  |> string.replace("<", "&lt;")
  |> string.replace(">", "&gt;")
}

fn path_for_sitemap_row(kind: String, slug: String, category_code: String) -> String {
  case kind {
    "listing" ->
      "/" <> listing_detail_path_prefix(category_code) <> "/" <> slug
    "cms_page" -> "/p/" <> slug
    "blog_post" -> "/blog/" <> slug
    _ -> "/" <> slug
  }
}

/// GET /api/v1/seo/sitemap — yayınlanmış içerik özeti (JSON).
pub fn sitemap_entries(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(sitemap_union_sql())
    |> pog.returning(sitemap_row_decoder())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "sitemap_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(kind, slug, org, cat) = r
          let cat_field = case kind == "listing" {
            True -> json.string(cat)
            False -> json.null()
          }
          json.object([
            #("kind", json.string(kind)),
            #("slug", json.string(slug)),
            #("organization_id", json.string(org)),
            #("category_code", cat_field),
          ])
        })
      let body =
        json.object([#("entries", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/seo/sitemap.xml — aynı veri kümesi, sitemap.org XML.
pub fn sitemap_xml(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let proto =
    request.get_header(req, "x-forwarded-proto")
    |> result.unwrap("")
    |> string.lowercase
  let scheme = case proto == "http" || proto == "https" {
    True -> proto
    False -> "https"
  }
  let host = request.get_header(req, "host") |> result.unwrap("localhost")
  let base = scheme <> "://" <> host
  case
    pog.query(sitemap_union_sql())
    |> pog.returning(sitemap_row_decoder())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "sitemap_query_failed")
    Ok(ret) -> {
      let urls =
        list.map(ret.rows, fn(r) {
          let #(kind, slug, _org, cat) = r
          let path = path_for_sitemap_row(kind, slug, cat)
          let loc = base <> xml_escape_loc(path)
          "<url><loc>" <> loc <> "</loc></url>"
        })
      let inner = string.join(urls, "\n")
      let doc =
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
        <> inner
        <> "\n</urlset>"
      wisp.response(200)
      |> wisp.string_body(doc)
      |> response.set_header("content-type", "application/xml; charset=utf-8")
    }
  }
}

fn nf_log_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("path", decode.string, fn(path) {
    decode.optional_field("locale", "tr", decode.string, fn(loc) {
      decode.success(#(path, loc))
    })
  })
}

/// POST /api/v1/seo/not-found — 404 günlüğü
pub fn log_not_found(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, nf_log_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(path, loc_code)) -> {
            case string.trim(path) == "" {
            True -> json_err(400, "path_required")
            False ->
              case locale_id_by_code(ctx, loc_code) {
                Error(_) ->
                  case
                    pog.query(
                      "insert into not_found_logs (path, locale_id) values ($1, null)",
                    )
                    |> pog.parameter(pog.text(string.trim(path)))
                    |> pog.execute(ctx.db)
                  {
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                    Error(_) -> json_err(500, "log_failed")
                  }
                Ok(lid) ->
                  case
                    pog.query(
                      "insert into not_found_logs (path, locale_id) values ($1, $2::smallint)",
                    )
                    |> pog.parameter(pog.text(string.trim(path)))
                    |> pog.parameter(pog.text(lid))
                    |> pog.execute(ctx.db)
                  {
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                    Error(_) -> json_err(500, "log_failed")
                  }
              }
          }
        }
      }
  }
}
