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
            |> pog.execute(ctx.db)
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
                            |> pog.execute(ctx.db)
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

fn job_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use et <- decode.field(1, decode.string)
  use eid <- decode.field(2, decode.string)
  use tid <- decode.field(3, decode.string)
  use status <- decode.field(4, decode.string)
  use cap <- decode.field(5, decode.string)
  use imgs <- decode.field(6, decode.string)
  use created <- decode.field(7, decode.string)
  decode.success(#(id, et, eid, tid, status, cap, imgs, created))
}

fn job_to_json(row: #(String, String, String, String, String, String, String, String)) -> json.Json {
  let #(id, et, eid, tid, status, cap, imgs, created) = row
  let template_field = case tid == "" {
    True -> json.null()
    False -> json.string(tid)
  }
  let cap_field = case cap == "" {
    True -> json.null()
    False -> json.string(cap)
  }
  let img_list =
    string.split(imgs, "\u{001F}")
    |> list.map(string.trim)
    |> list.filter(fn(s) { s != "" })
  json.object([
    #("id", json.string(id)),
    #("entity_type", json.string(et)),
    #("entity_id", json.string(eid)),
    #("template_id", template_field),
    #("status", json.string(status)),
    #("caption_ai_generated", cap_field),
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
    Ok(n) -> case n > 200 {
      True -> 200
      False -> case n < 1 {
        True -> 50
        False -> n
      }
    }
    Error(_) -> 50
  }
  let sel =
    "select id::text, entity_type, entity_id::text, coalesce(template_id::text, ''), status::text, coalesce(caption_ai_generated, ''), coalesce(array_to_string(image_keys, chr(31)), ''), created_at::text from social_share_jobs "
  case status_filter == "" {
    True ->
      case
        pog.query(
          sel
          <> "order by created_at desc limit "
          <> int.to_string(limit),
        )
        |> pog.returning(job_row())
        |> pog.execute(ctx.db)
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
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "jobs_query_failed")
        Ok(ret) -> jobs_response(ret.rows)
      }
  }
}

fn jobs_response(rows: List(#(String, String, String, String, String, String, String, String))) -> Response {
  let arr = list.map(rows, job_to_json)
  let body =
    json.object([#("jobs", json.array(from: arr, of: fn(x) { x }))])
    |> json.to_string
  wisp.json_response(body, 200)
}

fn create_job_decoder() -> decode.Decoder(#(String, String, Option(String), List(String), Option(String))) {
  decode.field("entity_type", decode.string, fn(entity_type) {
    decode.field("entity_id", decode.string, fn(entity_id) {
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
              decode.success(#(entity_type, entity_id, tid, image_keys, cap_opt))
            },
          )
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
                Ok(#(entity_type, entity_id, template_id, image_keys, caption_opt)) -> {
                  case string.trim(entity_type) == "" || string.trim(entity_id) == "" {
                    True -> json_err(400, "entity_required")
                    False ->
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
                              "insert into social_share_jobs (entity_type, entity_id, template_id, image_keys, caption_ai_generated) values ($1, $2::uuid, $3::uuid, $4::text[], $5) returning id::text",
                            )
                            |> pog.parameter(pog.text(string.trim(entity_type)))
                            |> pog.parameter(pog.text(string.trim(entity_id)))
                            |> pog.parameter(tpl_param)
                            |> pog.parameter(pog.array(pog.text, image_keys))
                            |> pog.parameter(cap_param)
                            |> pog.returning(row_dec.col0_string())
                            |> pog.execute(ctx.db)
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
        |> pog.execute(db)
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
        |> pog.execute(db)
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
        |> pog.execute(ctx.db)
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
        |> pog.execute(ctx.db)
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
                        |> pog.execute(ctx.db)
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
                            |> pog.execute(ctx.db)
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
                |> pog.execute(ctx.db)
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
