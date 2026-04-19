//// CMS sayfaları, bloklar, curated filtre sayfaları (080_content_seo).

import backend/context.{type Context}
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
import travel/db/decode_helpers as row_dec
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

fn require_admin_users_read(req: Request, ctx: Context) -> Result(String, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        True -> Ok(uid)
        False -> Error(json_err(403, "forbidden"))
      }
  }
}

fn page_row_full() -> decode.Decoder(#(String, String, String, String, Bool, String)) {
  use id <- decode.field(0, decode.string)
  use org <- decode.field(1, decode.string)
  use slug <- decode.field(2, decode.string)
  use tmpl <- decode.field(3, decode.string)
  use is_published <- decode.field(4, decode.bool)
  use created <- decode.field(5, decode.string)
  decode.success(#(id, org, slug, tmpl, is_published, created))
}

fn page_json(row: #(String, String, String, String, Bool, String)) -> json.Json {
  let #(id, org, slug, tmpl, is_published, created) = row
  let orgj = case org == "" {
    True -> json.null()
    False -> json.string(org)
  }
  json.object([
    #("id", json.string(id)),
    #("organization_id", orgj),
    #("slug", json.string(slug)),
    #("template_code", json.string(tmpl)),
    #("is_published", json.bool(is_published)),
    #("created_at", json.string(created)),
  ])
}

fn block_row() -> decode.Decoder(#(String, Int, String, String)) {
  use id <- decode.field(0, decode.string)
  use so <- decode.field(1, decode.int)
  use bt <- decode.field(2, decode.string)
  use cj <- decode.field(3, decode.string)
  decode.success(#(id, so, bt, cj))
}

fn block_json(row: #(String, Int, String, String)) -> json.Json {
  let #(id, so, bt, cj) = row
  json.object([
    #("id", json.string(id)),
    #("sort_order", json.int(so)),
    #("block_type", json.string(bt)),
    #("config_json", json.string(cj)),
  ])
}

/// GET /api/v1/cms/pages?organization_id=&published_only= — `admin.users.read`
pub fn list_pages(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org_f =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  let pub_f =
    list.key_find(qs, "published_only")
    |> result.unwrap("")
    |> string.trim
  case
    pog.query(
      "select id::text, coalesce(organization_id::text,''), slug, template_code, is_published, created_at::text from cms_pages where ($1 = '' or organization_id = $1::uuid) and ($2 = '' or ($2 = 'true' and is_published = true) or ($2 = 'false' and is_published = false)) order by created_at desc limit 500",
    )
    |> pog.parameter(pog.text(org_f))
    |> pog.parameter(pog.text(pub_f))
    |> pog.returning(page_row_full())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "pages_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, page_json)
      let body =
        json.object([#("pages", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
    }
  }
}

fn create_page_decoder() -> decode.Decoder(
  #(String, Option(String), String, Bool),
) {
  decode.field("slug", decode.string, fn(slug) {
    decode.optional_field("organization_id", "", decode.string, fn(oid) {
      decode.optional_field("template_code", "default", decode.string, fn(tmpl) {
        decode.optional_field("is_published", False, decode.bool, fn(is_published) {
          let org = case string.trim(oid) == "" {
            True -> None
            False -> Some(string.trim(oid))
          }
          decode.success(#(string.trim(slug), org, string.trim(tmpl), is_published))
        })
      })
    })
  })
}

/// POST /api/v1/cms/pages — `admin.users.read`
pub fn create_page(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_page_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug, org_opt, tmpl, is_published)) ->
          case slug == "" {
            True -> json_err(400, "slug_required")
            False -> {
              let org_p = case org_opt {
                Some(o) -> pog.text(o)
                None -> pog.null()
              }
              case
                pog.query(
                  "insert into cms_pages (organization_id, slug, template_code, is_published) values ($1::uuid, $2, $3, $4) returning id::text",
                )
                |> pog.parameter(org_p)
                |> pog.parameter(pog.text(slug))
                |> pog.parameter(pog.text(tmpl))
                |> pog.parameter(pog.bool(is_published))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "page_create_failed")
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

/// GET /api/v1/cms/pages/:id — `admin.users.read`
pub fn get_page(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select id::text, coalesce(organization_id::text,''), slug, template_code, is_published, created_at::text from cms_pages where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.returning(page_row_full())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "page_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [row] -> {
          let body =
            json.object([#("page", page_json(row))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
    }
  }
}

/// GET /api/v1/cms/pages/by-slug?slug=&organization_id= — yalnızca yayımlanmış (`is_published`)
pub fn get_by_slug(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let slug =
    list.key_find(qs, "slug")
    |> result.unwrap("")
    |> string.trim
  let org =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  case slug == "" {
    True -> json_err(400, "slug_required")
    False ->
      case
        pog.query(
          "select id::text, coalesce(organization_id::text,''), slug, template_code, is_published, created_at::text from cms_pages where slug = $1 and is_published = true and (($2 = '' and organization_id is null) or ($2 <> '' and organization_id = $2::uuid)) limit 1",
        )
        |> pog.parameter(pog.text(slug))
        |> pog.parameter(pog.text(org))
        |> pog.returning(page_row_full())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "page_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "not_found")
            [row] -> {
              let #(page_id, _, _, _, _, _) = row
              case
                pog.query(
                  "select id::text, sort_order, block_type, config_json::text from cms_page_blocks where page_id = $1::uuid order by sort_order asc, id asc",
                )
                |> pog.parameter(pog.text(page_id))
                |> pog.returning(block_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "blocks_query_failed")
                Ok(bret) -> {
                  let blocks = list.map(bret.rows, block_json)
                  let body =
                    json.object([
                      #("page", page_json(row)),
                      #("blocks", json.array(from: blocks, of: fn(x) { x })),
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
}

fn patch_page_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(Bool)),
) {
  decode.optional_field("slug", None, decode.optional(decode.string), fn(slug_opt) {
    decode.optional_field("template_code", None, decode.optional(decode.string), fn(
      tmpl_opt,
    ) {
      decode.optional_field("is_published", None, decode.optional(decode.bool), fn(
        is_published_opt,
      ) { decode.success(#(slug_opt, tmpl_opt, is_published_opt)) })
    })
  })
}

/// PATCH /api/v1/cms/pages/:id — `admin.users.read`
pub fn patch_page(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_page_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug_opt, tmpl_opt, is_published_opt)) ->
          case slug_opt, tmpl_opt, is_published_opt {
            None, None, None -> json_err(400, "no_fields")
            _, _, _ -> {
              let p_slug = case slug_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_tmpl = case tmpl_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_pub = case is_published_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              case
                pog.query(
                  "update cms_pages set slug = coalesce($2::text, slug), template_code = coalesce($3::text, template_code), is_published = coalesce($4::boolean, is_published) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(page_id)))
                |> pog.parameter(p_slug)
                |> pog.parameter(p_tmpl)
                |> pog.parameter(p_pub)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "update_failed")
                Ok(r) ->
                  case r.rows {
                    [] -> json_err(404, "not_found")
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

/// GET /api/v1/cms/pages/:id/blocks — `admin.users.read`
pub fn list_blocks(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select id::text, sort_order, block_type, config_json::text from cms_page_blocks where page_id = $1::uuid order by sort_order asc, id asc",
    )
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.returning(block_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "blocks_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, block_json)
      let body =
        json.object([#("blocks", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
  }
}

fn add_block_decoder() -> decode.Decoder(#(String, Int, String)) {
  decode.field("block_type", decode.string, fn(bt) {
    decode.optional_field("sort_order", 0, decode.int, fn(so) {
      decode.field("config_json", decode.string, fn(cj) {
        decode.success(#(string.trim(bt), so, string.trim(cj)))
      })
    })
  })
}

/// POST /api/v1/cms/pages/:id/blocks — `admin.users.read`
pub fn add_block(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, add_block_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(bt, so, cj)) ->
          case bt == "" {
            True -> json_err(400, "block_type_required")
            False -> {
              let cfg = case cj == "" {
                True -> "{}"
                False -> cj
              }
              case
                pog.query(
                  "insert into cms_page_blocks (page_id, sort_order, block_type, config_json) values ($1::uuid, $2, $3, $4::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(page_id)))
                |> pog.parameter(pog.int(so))
                |> pog.parameter(pog.text(bt))
                |> pog.parameter(pog.text(cfg))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "block_create_failed")
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

fn patch_block_decoder() -> decode.Decoder(#(Option(String), Option(Int), Option(String))) {
  decode.optional_field("block_type", None, decode.optional(decode.string), fn(bt_opt) {
    decode.optional_field("sort_order", None, decode.optional(decode.int), fn(so_opt) {
      decode.optional_field("config_json", None, decode.optional(decode.string), fn(
        cj_opt,
      ) { decode.success(#(bt_opt, so_opt, cj_opt)) })
    })
  })
}

/// PATCH /api/v1/cms/pages/:page_id/blocks/:block_id — `admin.users.read`
pub fn patch_block(
  req: Request,
  ctx: Context,
  page_id: String,
  block_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_block_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(bt_opt, so_opt, cj_opt)) ->
          case bt_opt, so_opt, cj_opt {
            None, None, None -> json_err(400, "no_fields")
            _, _, _ -> {
              let p_bt = case bt_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_so = case so_opt {
                None -> pog.null()
                Some(i) -> pog.int(i)
              }
              let p_cj = case cj_opt {
                None -> pog.null()
                Some(s) -> pog.text(case string.trim(s) == "" {
                  True -> "{}"
                  False -> string.trim(s)
                })
              }
              case
                pog.query(
                  "update cms_page_blocks set block_type = coalesce($3::text, block_type), sort_order = coalesce($4::int, sort_order), config_json = coalesce($5::jsonb, config_json) where id = $1::uuid and page_id = $2::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(block_id)))
                |> pog.parameter(pog.text(string.trim(page_id)))
                |> pog.parameter(p_bt)
                |> pog.parameter(p_so)
                |> pog.parameter(p_cj)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "block_update_failed")
                Ok(r) ->
                  case r.rows {
                    [] -> json_err(404, "not_found")
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

/// DELETE /api/v1/cms/pages/:page_id/blocks/:block_id — `admin.users.read`
pub fn delete_block(
  req: Request,
  ctx: Context,
  page_id: String,
  block_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "delete from cms_page_blocks where id = $1::uuid and page_id = $2::uuid",
        )
        |> pog.parameter(pog.text(string.trim(block_id)))
        |> pog.parameter(pog.text(string.trim(page_id)))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "block_delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}

fn reorder_blocks_decoder() -> decode.Decoder(List(String)) {
  decode.field("ordered_block_ids", decode.list(decode.string), fn(ids) {
    decode.success(ids)
  })
}

fn reorder_loop(
  ids: List(String),
  idx: Int,
  page_id: String,
  ctx: Context,
) -> Result(Nil, Nil) {
  case ids {
    [] -> Ok(Nil)
    [bid, ..rest] ->
      case
        pog.query(
          "update cms_page_blocks set sort_order = $1 where id = $2::uuid and page_id = $3::uuid",
        )
        |> pog.parameter(pog.int(idx))
        |> pog.parameter(pog.text(string.trim(bid)))
        |> pog.parameter(pog.text(string.trim(page_id)))
        |> pog.execute(ctx.db)
      {
        Error(_) -> Error(Nil)
        Ok(_) -> reorder_loop(rest, idx + 1, page_id, ctx)
      }
  }
}

/// PATCH /api/v1/cms/pages/:id/blocks/reorder — `admin.users.read`
pub fn reorder_blocks(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, reorder_blocks_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(ids) ->
          case list.is_empty(ids) {
            True -> json_err(400, "ordered_block_ids_required")
            False ->
              case reorder_loop(ids, 0, page_id, ctx) {
                Error(_) -> json_err(500, "reorder_failed")
                Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
    }
  }
}

/// GET /api/v1/cms/pages/:id/curated-filter — `admin.users.read`
pub fn get_curated_filter(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let row = {
    use fj <- decode.field(0, decode.string)
    decode.success(fj)
  }
  case
    pog.query(
      "select filter_json::text from curated_filter_pages where page_id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "curated_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> {
          let body =
            json.object([#("filter_json", json.null())])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        [fj] -> {
          let body =
            json.object([#("filter_json", json.string(fj))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
    }
    }
  }
}

fn curated_put_decoder() -> decode.Decoder(String) {
  decode.field("filter_json", decode.string, fn(s) { decode.success(string.trim(s)) })
}

/// PUT /api/v1/cms/pages/:id/curated-filter — `admin.users.read`
pub fn put_curated_filter(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Put)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, curated_put_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(raw) -> {
          let fj = case raw == "" {
            True -> "{}"
            False -> raw
          }
          case
            pog.query(
              "insert into curated_filter_pages (page_id, filter_json) values ($1::uuid, $2::jsonb) on conflict (page_id) do update set filter_json = excluded.filter_json returning id::text",
            )
            |> pog.parameter(pog.text(string.trim(page_id)))
            |> pog.parameter(pog.text(fj))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "curated_upsert_failed")
            Ok(r) ->
              case r.rows {
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
