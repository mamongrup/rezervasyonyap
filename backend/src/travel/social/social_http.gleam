//// Sosyal paylaşım — şablonlar, kuyruk, ilan bayrakları (085_social + listings.share_to_social).

import backend/context.{type Context}
import travel/identity/permissions
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
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

const networks: List(String) = [
  "instagram", "facebook", "twitter", "pinterest",
]

fn valid_network(n: String) -> Bool {
  let x = string.lowercase(string.trim(n))
  list.contains(networks, x)
}

fn template_row_full() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use net <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use body <- decode.field(3, decode.string)
  use created <- decode.field(4, decode.string)
  decode.success(#(id, net, name, body, created))
}

fn template_to_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, net, name, body, created) = row
  json.object([
    #("id", json.string(id)),
    #("network", json.string(net)),
    #("name", json.string(name)),
    #("template_body", json.string(body)),
    #("created_at", json.string(created)),
  ])
}

fn social_listing_row() ->
  decode.Decoder(#(String, String, String, String, String, String, String, Bool, Bool, String)) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use cur <- decode.field(3, decode.string)
  use cat <- decode.field(4, decode.string)
  use title <- decode.field(5, decode.string)
  use created <- decode.field(6, decode.string)
  use sh <- decode.field(7, decode.bool)
  use ai <- decode.field(8, decode.bool)
  use themes <- decode.field(9, decode.string)
  decode.success(#(id, slug, st, cur, cat, title, created, sh, ai, themes))
}

fn social_listing_to_json(
  row: #(String, String, String, String, String, String, String, Bool, Bool, String),
) -> json.Json {
  let #(id, slug, st, cur, cat, title, created, sh, ai, themes) = row
  json.object([
    #("id", json.string(id)),
    #("slug", json.string(slug)),
    #("status", json.string(st)),
    #("currency_code", json.string(cur)),
    #("category_code", json.string(cat)),
    #("title", json.string(title)),
    #("commission_percent", json.string("")),
    #("prepayment_amount", json.string("")),
    #("prepayment_percent", json.string("")),
    #("created_at", json.string(created)),
    #("listing_source", json.string("")),
    #("share_to_social", json.bool(sh)),
    #("allow_ai_caption", json.bool(ai)),
    #("category_contract_id", json.string("")),
    #("theme_codes", json.string(themes)),
  ])
}

fn parse_limit(raw: String) -> Int {
  case int.parse(string.trim(raw)) {
    Ok(n) ->
      case n < 1 {
        True -> 20
        False ->
          case n > 500 {
            True -> 500
            False -> n
          }
      }
    Error(_) -> 20
  }
}

fn supplier_org_id_for_user(
  conn: pog.Connection,
  user_id: String,
) -> Result(String, Nil) {
  case
    pog.query(
      "select organization_id::text from supplier_profiles where user_id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [oid] -> Ok(oid)
        _ -> Error(Nil)
      }
  }
}

/// GET /api/v1/social/templates
pub fn list_templates(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.social.read") {
        False -> json_err(403, "forbidden")
        True ->
          case
            pog.query(
              "select id::text, network::text, name, template_body, created_at::text from social_share_templates order by network, name",
            )
            |> pog.returning(template_row_full())
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> json_err(500, "templates_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, template_to_json)
              let body =
                json.object([#("templates", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

/// GET /api/v1/social/listings?category_code=&search=&limit=
/// Sosyal paylaşım paneli için admin kapsamındaki ilan seçici. Normal katalog
/// yönetim listesi admin'de organization_id istediği için burada tüm ilanlarda
/// `admin.social.read` yetkisiyle arama yapılır.
pub fn list_listings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let cat_raw =
    list.key_find(qs, "category_code")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let search_raw =
    list.key_find(qs, "search")
    |> result.unwrap("")
    |> string.trim
  let title_loc =
    list.key_find(qs, "title_locale")
    |> result.unwrap("tr")
    |> string.trim
    |> string.lowercase
  let limit_n =
    list.key_find(qs, "limit")
    |> result.unwrap("20")
    |> parse_limit
  let offset_n =
    case list.key_find(qs, "offset") {
      Error(_) -> 0
      Ok(v) ->
        case int.parse(string.trim(v)) {
          Ok(n) -> case n < 0 {
            True -> 0
            False -> n
          }
          Error(_) -> 0
        }
    }
  let cat_param = case cat_raw == "" {
    True -> pog.null()
    False -> pog.text(cat_raw)
  }
  let like_param = case search_raw == "" {
    True -> pog.null()
    False -> pog.text("%" <> search_raw <> "%")
  }

  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.social.read") {
        False -> json_err(403, "forbidden")
        True ->
          case
            pog.query(
              "select l.id::text, l.slug, l.status::text, l.currency_code::text, pc.code::text, "
              <> "coalesce((select lt.title from listing_translations lt join locales loc on loc.id = lt.locale_id where lt.listing_id = l.id and lower(loc.code) = lower($3::text) limit 1), ''), "
              <> "to_char(l.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), coalesce(l.share_to_social, false), coalesce(l.allow_ai_caption, false), "
              <> "coalesce(nullif(array_to_string(h.theme_codes, ','), ''), nullif(array_to_string(y.theme_codes, ','), ''), '') "
              <> "from listings l join product_categories pc on pc.id = l.category_id "
              <> "left join listing_holiday_home_details h on h.listing_id = l.id "
              <> "left join listing_yacht_details y on y.listing_id = l.id "
              <> "where ($1::text is null or pc.code = $1) "
              <> "and ($2::text is null or l.slug ilike $2 or l.id::text ilike $2 or exists (select 1 from listing_translations lt_search where lt_search.listing_id = l.id and lt_search.title ilike $2)) "
              <> "order by case when l.status::text = 'published' then 0 else 1 end, l.created_at desc limit $4::int offset $5::int",
            )
            |> pog.parameter(cat_param)
            |> pog.parameter(like_param)
            |> pog.parameter(pog.text(title_loc))
            |> pog.parameter(pog.int(limit_n))
            |> pog.parameter(pog.int(offset_n))
            |> pog.returning(social_listing_row())
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> json_err(500, "social_listings_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, social_listing_to_json)
              let body =
                json.object([
                  #("listings", json.array(from: arr, of: fn(x) { x })),
                  #("total", json.int(list.length(arr))),
                  #("page", json.int(1)),
                  #("per_page", json.int(limit_n)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn create_template_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("network", decode.string, fn(network) {
    decode.field("name", decode.string, fn(name) {
      decode.field("template_body", decode.string, fn(template_body) {
        decode.success(#(network, name, template_body))
      })
    })
  })
}

/// POST /api/v1/social/templates
pub fn create_template(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.social.write") {
        False -> json_err(403, "forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, create_template_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(net_raw, name, template_body)) -> {
                  let net = string.lowercase(string.trim(net_raw))
                  case valid_network(net) {
                    False -> json_err(400, "invalid_network")
                    True ->
                      case string.trim(name) == "" || string.trim(template_body) == "" {
                        True -> json_err(400, "name_and_body_required")
                        False ->
                          case
                            pog.query(
                              "insert into social_share_templates (network, name, template_body) values ($1, $2, $3) returning id::text, network::text, name, template_body, created_at::text",
                            )
                            |> pog.parameter(pog.text(net))
                            |> pog.parameter(pog.text(string.trim(name)))
                            |> pog.parameter(pog.text(template_body))
                            |> pog.returning(template_row_full())
                            |> db_exec.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "template_insert_failed")
                            Ok(r) ->
                              case r.rows {
                                [row] -> {
                                  let out = template_to_json(row) |> json.to_string
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
}

fn job_row() ->
  decode.Decoder(#(String, String, String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use et <- decode.field(1, decode.string)
  use eid <- decode.field(2, decode.string)
  use net <- decode.field(3, decode.string)
  use tid <- decode.field(4, decode.string)
  use status <- decode.field(5, decode.string)
  use cap <- decode.field(6, decode.string)
  use imgs <- decode.field(7, decode.string)
  use err <- decode.field(8, decode.string)
  use created <- decode.field(9, decode.string)
  decode.success(#(id, et, eid, net, tid, status, cap, imgs, err, created))
}

fn job_to_json(
  row: #(String, String, String, String, String, String, String, String, String, String),
) -> json.Json {
  let #(id, et, eid, net, tid, status, cap, imgs, err, created) = row
  let template_field = case tid == "" {
    True -> json.null()
    False -> json.string(tid)
  }
  let cap_field = case cap == "" {
    True -> json.null()
    False -> json.string(cap)
  }
  let err_field = case err == "" {
    True -> json.null()
    False -> json.string(err)
  }
  let img_list =
    string.split(imgs, "\u{001F}")
    |> list.map(string.trim)
    |> list.filter(fn(s) { s != "" })
  json.object([
    #("id", json.string(id)),
    #("entity_type", json.string(et)),
    #("entity_id", json.string(eid)),
    #("network", json.string(net)),
    #("template_id", template_field),
    #("status", json.string(status)),
    #("caption_ai_generated", cap_field),
    #("error_message", err_field),
    #("image_keys", json.array(from: img_list, of: json.string)),
    #("created_at", json.string(created)),
  ])
}

/// GET /api/v1/social/jobs?status=pending&limit=100
pub fn list_jobs(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.social.read") {
        False -> json_err(403, "forbidden")
        True -> list_jobs_inner(req, ctx)
      }
  }
}

fn list_jobs_inner(req: Request, ctx: Context) -> Response {
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let status_filter =
    list.key_find(qs, "status")
    |> result.unwrap("")
    |> string.trim
  let limit_str =
    list.key_find(qs, "limit")
    |> result.unwrap("50")
    |> string.trim
  let limit = case int.parse(limit_str) {
    Ok(n) -> case n > 1000 {
      True -> 1000
      False -> case n < 1 {
        True -> 50
        False -> n
      }
    }
    Error(_) -> 50
  }
  let sel =
    "select id::text, entity_type, entity_id::text, network::text, coalesce(template_id::text, ''), status::text, coalesce(caption_ai_generated, ''), coalesce(array_to_string(image_keys, chr(31)), ''), coalesce(error_message, ''), created_at::text from social_share_jobs "
  case status_filter == "" {
    True ->
      case
        pog.query(
          sel
          <> "order by created_at desc limit "
          <> int.to_string(limit),
        )
        |> pog.returning(job_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "jobs_query_failed")
        Ok(ret) -> jobs_response(ret.rows)
      }
    False ->
      case
        pog.query(
          sel
          <> "where status = $1 order by created_at desc limit "
          <> int.to_string(limit),
        )
        |> pog.parameter(pog.text(status_filter))
        |> pog.returning(job_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "jobs_query_failed")
        Ok(ret) -> jobs_response(ret.rows)
      }
  }
}

fn jobs_response(
  rows: List(#(String, String, String, String, String, String, String, String, String, String)),
) -> Response {
  let arr = list.map(rows, job_to_json)
  let body =
    json.object([#("jobs", json.array(from: arr, of: fn(x) { x }))])
    |> json.to_string
  wisp.json_response(body, 200)
}

fn create_job_decoder() ->
  decode.Decoder(#(String, String, String, Option(String), List(String), Option(String))) {
  decode.field("entity_type", decode.string, fn(entity_type) {
    decode.field("entity_id", decode.string, fn(entity_id) {
      decode.optional_field("network", "facebook", decode.string, fn(network) {
        decode.optional_field("template_id", "", decode.string, fn(tpl) {
          decode.field("image_keys", decode.list(decode.string), fn(image_keys) {
            decode.optional_field(
              "caption_ai_generated",
              "",
              decode.string,
              fn(cap) {
                let tid = case string.trim(tpl) == "" {
                  True -> None
                  False -> Some(string.trim(tpl))
                }
                let cap_opt = case string.trim(cap) == "" {
                  True -> None
                  False -> Some(string.trim(cap))
                }
                decode.success(#(
                  entity_type,
                  entity_id,
                  network,
                  tid,
                  image_keys,
                  cap_opt,
                ))
              },
            )
          })
        })
      })
    })
  })
}

/// POST /api/v1/social/jobs — kuyruğa ekle (worker “posted” yapacak).
pub fn create_job(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.social.write") {
        False -> json_err(403, "forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, create_job_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(entity_type, entity_id, network_raw, template_id, image_keys, caption_opt)) -> {
                  let network = string.lowercase(string.trim(network_raw))
                  case string.trim(entity_type) == "" || string.trim(entity_id) == "" {
                    True -> json_err(400, "entity_required")
                    False ->
                      case valid_network(network) {
                        False -> json_err(400, "invalid_network")
                        True ->
                          case list.is_empty(image_keys) {
                            True -> json_err(400, "image_keys_required")
                            False -> {
                              let tpl_param = case template_id {
                                Some(t) -> pog.text(t)
                                None -> pog.null()
                              }
                              let cap_param = case caption_opt {
                                Some(c) -> pog.text(c)
                                None -> pog.null()
                              }
                              case
                                pog.query(
                                  "with existing as ( "
                                  <> "update social_share_jobs set "
                                  <> "template_id = $4::uuid, image_keys = $5::text[], "
                                  <> "caption_ai_generated = $6, error_message = null "
                                  <> "where entity_type = trim($1::text) and entity_id = $2::uuid "
                                  <> "and network = $3 and status = 'pending' "
                                  <> "returning id::text "
                                  <> "), inserted as ( "
                                  <> "insert into social_share_jobs (entity_type, entity_id, network, template_id, image_keys, caption_ai_generated) "
                                  <> "select trim($1::text), $2::uuid, $3, $4::uuid, $5::text[], $6 "
                                  <> "where not exists (select 1 from existing) returning id::text "
                                  <> ") select id from existing union all select id from inserted limit 1",
                                )
                                |> pog.parameter(pog.text(string.trim(entity_type)))
                                |> pog.parameter(pog.text(string.trim(entity_id)))
                                |> pog.parameter(pog.text(network))
                                |> pog.parameter(tpl_param)
                                |> pog.parameter(pog.array(pog.text, image_keys))
                                |> pog.parameter(cap_param)
                                |> pog.returning(row_dec.col0_string())
                                |> db_exec.execute(ctx.db)
                              {
                                Error(_) -> json_err(500, "job_insert_failed")
                                Ok(r) ->
                                  case r.rows {
                                    [jid] -> {
                                      let body =
                                        json.object([
                                          #("id", json.string(jid)),
                                          #("status", json.string("pending")),
                                        ])
                                        |> json.to_string
                                      wisp.json_response(body, 201)
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
      }
  }
}

fn listing_social_decoder() -> decode.Decoder(#(Bool, Bool)) {
  decode.field("share_to_social", decode.bool, fn(share) {
    decode.field("allow_ai_caption", decode.bool, fn(allow_ai) {
      decode.success(#(share, allow_ai))
    })
  })
}

fn apply_listing_social_patch(
  db: pog.Connection,
  listing_id: String,
  share: Bool,
  allow_ai: Bool,
  restrict_org_id: Option(String),
) -> Response {
  let lid = string.trim(listing_id)
  case restrict_org_id {
    None ->
      case
        pog.query(
          "update listings set share_to_social = $2, allow_ai_caption = $3, updated_at = now() where id = $1::uuid returning id::text",
        )
        |> pog.parameter(pog.text(lid))
        |> pog.parameter(pog.bool(share))
        |> pog.parameter(pog.bool(allow_ai))
        |> pog.returning(row_dec.col0_string())
        |> db_exec.execute(db)
      {
        Error(_) -> json_err(500, "listing_update_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "listing_not_found")
            [_] -> {
              let out =
                json.object([
                  #("id", json.string(lid)),
                  #("share_to_social", json.bool(share)),
                  #("allow_ai_caption", json.bool(allow_ai)),
                ])
                |> json.to_string
              wisp.json_response(out, 200)
            }
            _ -> json_err(500, "unexpected")
          }
      }
    Some(oid) ->
      case
        pog.query(
          "update listings set share_to_social = $2, allow_ai_caption = $3, updated_at = now() where id = $1::uuid and organization_id = $4::uuid returning id::text",
        )
        |> pog.parameter(pog.text(lid))
        |> pog.parameter(pog.bool(share))
        |> pog.parameter(pog.bool(allow_ai))
        |> pog.parameter(pog.text(oid))
        |> pog.returning(row_dec.col0_string())
        |> db_exec.execute(db)
      {
        Error(_) -> json_err(500, "listing_update_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "listing_not_found")
            [_] -> {
              let out =
                json.object([
                  #("id", json.string(lid)),
                  #("share_to_social", json.bool(share)),
                  #("allow_ai_caption", json.bool(allow_ai)),
                ])
                |> json.to_string
              wisp.json_response(out, 200)
            }
            _ -> json_err(500, "unexpected")
          }
      }
  }
}

/// PATCH /api/v1/listings/:id/social — ilan paylaşım bayrakları (`admin.social.write` veya tedarikçi portal + kendi ilanı).
pub fn patch_listing_social(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, listing_social_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(share, allow_ai)) ->
          case permissions.session_user_from_request(req, ctx.db) {
            Error(r) -> r
            Ok(uid) -> {
              let as_admin =
                permissions.user_has_permission(ctx.db, uid, "admin.social.write")
              case as_admin {
                True -> apply_listing_social_patch(ctx.db, listing_id, share, allow_ai, None)
                False ->
                  case
                    permissions.user_has_permission(ctx.db, uid, "supplier.portal")
                  {
                    False -> json_err(403, "forbidden")
                    True ->
                      case supplier_org_id_for_user(ctx.db, uid) {
                        Error(_) -> json_err(403, "not_supplier")
                        Ok(oid) ->
                          apply_listing_social_patch(
                            ctx.db,
                            listing_id,
                            share,
                            allow_ai,
                            Some(oid),
                          )
                      }
                  }
              }
            }
          }
      }
  }
}

// --- Instagram Shop bağlantıları (085_social.instagram_shop_links) ---

fn session_user_id_opt(ctx: Context, token: String) -> Option(String) {
  case string.trim(token) == "" {
    True -> None
    False ->
      case
        pog.query(
          "select u.id::text from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
        )
        |> pog.parameter(pog.text(string.trim(token)))
        |> pog.returning(row_dec.col0_string())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> None
        Ok(ret) ->
          case ret.rows {
            [id] -> Some(id)
            _ -> None
          }
      }
  }
}

/// Tam liste (sync kapalı dahil) için `admin.social.read`; aksi halde anonim/oturum yalnızca sync açık linkler.
fn viewer_has_social_read(req: Request, ctx: Context) -> Bool {
  case session_user_id_opt(ctx, permissions.bearer_token(req)) {
    None -> False
    Some(uid) -> permissions.user_has_permission(ctx.db, uid, "admin.social.read")
  }
}

fn shop_link_row() -> decode.Decoder(#(String, String, String, Bool)) {
  use id <- decode.field(0, decode.string)
  use lid <- decode.field(1, decode.string)
  use mid <- decode.field(2, decode.string)
  use se <- decode.field(3, decode.bool)
  decode.success(#(id, lid, mid, se))
}

fn shop_link_json(row: #(String, String, String, Bool)) -> json.Json {
  let #(id, lid, mid, se) = row
  json.object([
    #("id", json.string(id)),
    #("listing_id", json.string(lid)),
    #("instagram_media_id", json.string(mid)),
    #("sync_enabled", json.bool(se)),
  ])
}

/// GET /api/v1/social/instagram-shop-links?listing_id= — `admin.social.read` ile tümü; aksi halde yalnızca sync_enabled.
pub fn list_instagram_shop_links(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let lid =
    list.key_find(qs, "listing_id")
    |> result.unwrap("")
    |> string.trim
  case lid == "" {
    True -> json_err(400, "listing_id_required")
    False -> {
      let full_list = viewer_has_social_read(req, ctx)
      let sql = case full_list {
        True ->
          "select id::text, listing_id::text, instagram_media_id, sync_enabled from instagram_shop_links where listing_id = $1::uuid order by id"
        False ->
          "select id::text, listing_id::text, instagram_media_id, sync_enabled from instagram_shop_links where listing_id = $1::uuid and sync_enabled = true order by id"
      }
      case
        pog.query(sql)
        |> pog.parameter(pog.text(lid))
        |> pog.returning(shop_link_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "instagram_shop_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, shop_link_json)
          let body =
            json.object([#("links", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn create_shop_link_decoder() -> decode.Decoder(#(String, String, Bool)) {
  decode.field("listing_id", decode.string, fn(lid) {
    decode.field("instagram_media_id", decode.string, fn(mid) {
      decode.optional_field("sync_enabled", True, decode.bool, fn(se) {
        decode.success(#(lid, mid, se))
      })
    })
  })
}

/// POST /api/v1/social/instagram-shop-links — `admin.social.write`.
pub fn create_instagram_shop_link(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.social.write") {
        False -> json_err(403, "forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, create_shop_link_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(lid_raw, mid_raw, se)) -> {
                  let lid = string.trim(lid_raw)
                  let mid = string.trim(mid_raw)
                  case lid == "" || mid == "" {
                    True -> json_err(400, "listing_id_and_media_id_required")
                    False ->
                      case
                        pog.query(
                          "insert into instagram_shop_links (listing_id, instagram_media_id, sync_enabled) values ($1::uuid, $2, $3) returning id::text",
                        )
                        |> pog.parameter(pog.text(lid))
                        |> pog.parameter(pog.text(mid))
                        |> pog.parameter(pog.bool(se))
                        |> pog.returning(row_dec.col0_string())
                        |> db_exec.execute(ctx.db)
                      {
                        Error(_) -> json_err(409, "instagram_shop_insert_failed")
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

fn patch_shop_link_decoder() -> decode.Decoder(#(Option(String), Option(Bool))) {
  decode.optional_field("instagram_media_id", None, decode.optional(decode.string), fn(
    mid,
  ) {
    decode.optional_field("sync_enabled", None, decode.optional(decode.bool), fn(se) {
      decode.success(#(mid, se))
    })
  })
}

/// PATCH /api/v1/social/instagram-shop-links/:link_id — `admin.social.write`.
pub fn patch_instagram_shop_link(
  req: Request,
  ctx: Context,
  link_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case string.trim(link_id) == "" {
    True -> json_err(400, "invalid_id")
    False ->
      case permissions.session_user_from_request(req, ctx.db) {
        Error(r) -> r
        Ok(uid) ->
          case permissions.user_has_permission(ctx.db, uid, "admin.social.write") {
            False -> json_err(403, "forbidden")
            True ->
              case read_body_string(req) {
                Error(_) -> json_err(400, "empty_body")
                Ok(body) ->
                  case json.parse(body, patch_shop_link_decoder()) {
                    Error(_) -> json_err(400, "invalid_json")
                    Ok(#(mid_opt, se_opt)) ->
                      case mid_opt, se_opt {
                        None, None -> json_err(400, "no_fields")
                        _, _ -> {
                          let p_mid = case mid_opt {
                            None -> pog.null()
                            Some(s) ->
                              case string.trim(s) == "" {
                                True -> pog.null()
                                False -> pog.text(string.trim(s))
                              }
                          }
                          let p_se = case se_opt {
                            None -> pog.null()
                            Some(b) -> pog.bool(b)
                          }
                          case
                            pog.query(
                              "update instagram_shop_links set instagram_media_id = coalesce($2::text, instagram_media_id), sync_enabled = coalesce($3::boolean, sync_enabled) where id = $1::uuid returning id::text",
                            )
                            |> pog.parameter(pog.text(string.trim(link_id)))
                            |> pog.parameter(p_mid)
                            |> pog.parameter(p_se)
                            |> pog.returning(row_dec.col0_string())
                            |> db_exec.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "instagram_shop_update_failed")
                            Ok(r) ->
                              case r.rows {
                                [] -> json_err(404, "not_found")
                                [id] -> {
                                  let out =
                                    json.object([
                                      #("id", json.string(id)),
                                      #("ok", json.bool(True)),
                                    ])
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
  }
}

/// DELETE /api/v1/social/instagram-shop-links/:link_id — `admin.social.write`.
pub fn delete_instagram_shop_link(
  req: Request,
  ctx: Context,
  link_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case string.trim(link_id) == "" {
    True -> json_err(400, "invalid_id")
    False ->
      case permissions.session_user_from_request(req, ctx.db) {
        Error(r) -> r
        Ok(uid) ->
          case permissions.user_has_permission(ctx.db, uid, "admin.social.write") {
            False -> json_err(403, "forbidden")
            True ->
              case
                pog.query(
                  "delete from instagram_shop_links where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(link_id)))
                |> pog.returning(row_dec.col0_string())
                |> db_exec.execute(ctx.db)
              {
                Error(_) -> json_err(500, "instagram_shop_delete_failed")
                Ok(r) ->
                  case r.rows {
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
