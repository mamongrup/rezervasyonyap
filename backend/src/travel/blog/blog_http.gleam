//// Blog kategorileri, yazılar, çeviriler (080_content_seo + 216_blog_enrichment).

import backend/context.{type Context}
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
import travel/identity/admin_gate
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

// ─── Category ────────────────────────────────────────────────────────────────

fn category_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String, Int, Bool),
) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use pid <- decode.field(2, decode.string)
  use name <- decode.field(3, decode.string)
  use description <- decode.field(4, decode.string)
  use image_url <- decode.field(5, decode.string)
  use meta_title <- decode.field(6, decode.string)
  use sort_order <- decode.field(7, decode.int)
  use is_active <- decode.field(8, decode.bool)
  decode.success(#(id, slug, pid, name, description, image_url, meta_title, sort_order, is_active))
}

fn category_json(
  row: #(String, String, String, String, String, String, String, Int, Bool),
) -> json.Json {
  let #(id, slug, pid, name, description, image_url, meta_title, sort_order, is_active) = row
  let pj = case pid == "" {
    True -> json.null()
    False -> json.string(pid)
  }
  let nj = case name == "" { True -> json.null() False -> json.string(name) }
  let dj = case description == "" { True -> json.null() False -> json.string(description) }
  let ij = case image_url == "" { True -> json.null() False -> json.string(image_url) }
  let mj = case meta_title == "" { True -> json.null() False -> json.string(meta_title) }
  json.object([
    #("id", json.string(id)),
    #("slug", json.string(slug)),
    #("parent_id", pj),
    #("name", nj),
    #("description", dj),
    #("image_url", ij),
    #("meta_title", mj),
    #("sort_order", json.int(sort_order)),
    #("is_active", json.bool(is_active)),
  ])
}

/// GET /api/v1/blog/categories
pub fn list_categories(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, slug, coalesce(parent_id::text,''), coalesce(name,''), coalesce(description,''), coalesce(image_url,''), coalesce(meta_title,''), sort_order, is_active from blog_categories order by sort_order, slug limit 500",
    )
    |> pog.returning(category_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "categories_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, category_json)
      let body =
        json.object([#("categories", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn create_category_decoder() -> decode.Decoder(#(String, Option(String), String)) {
  decode.field("slug", decode.string, fn(slug) {
    decode.optional_field("parent_id", "", decode.string, fn(pid) {
      decode.optional_field("name", "", decode.string, fn(name) {
        let p = case string.trim(pid) == "" {
          True -> None
          False -> Some(string.trim(pid))
        }
        decode.success(#(string.trim(slug), p, string.trim(name)))
      })
    })
  })
}

/// POST /api/v1/blog/categories
pub fn create_category(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_category_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug, parent_opt, name)) ->
          case slug == "" {
            True -> json_err(400, "slug_required")
            False -> {
              let pp = case parent_opt {
                None -> pog.null()
                Some(p) -> pog.text(p)
              }
              let nm = case name == "" { True -> pog.null() False -> pog.text(name) }
              case
                pog.query(
                  "insert into blog_categories (slug, parent_id, name) values ($1, $2::uuid, $3) returning id::text",
                )
                |> pog.parameter(pog.text(slug))
                |> pog.parameter(pp)
                |> pog.parameter(nm)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "category_create_failed")
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

fn patch_category_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String), Option(String), Option(String), Option(String), Option(Int), Option(Bool)),
) {
  decode.optional_field("slug", None, decode.optional(decode.string), fn(slug_opt) {
    decode.optional_field("name", None, decode.optional(decode.string), fn(name_opt) {
      decode.optional_field("description", None, decode.optional(decode.string), fn(desc_opt) {
        decode.optional_field("image_url", None, decode.optional(decode.string), fn(img_opt) {
          decode.optional_field("meta_title", None, decode.optional(decode.string), fn(mt_opt) {
            decode.optional_field("meta_description", None, decode.optional(decode.string), fn(md_opt) {
              decode.optional_field("sort_order", None, decode.optional(decode.int), fn(so_opt) {
                decode.optional_field("is_active", None, decode.optional(decode.bool), fn(ia_opt) {
                  decode.success(#(slug_opt, name_opt, desc_opt, img_opt, mt_opt, md_opt, so_opt, ia_opt))
                })
              })
            })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/blog/categories/:id
pub fn patch_category(req: Request, ctx: Context, cat_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_category_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug_opt, name_opt, desc_opt, img_opt, mt_opt, md_opt, so_opt, ia_opt)) -> {
          let opt_text = fn(o: Option(String)) -> pog.Value {
            case o {
              None -> pog.null()
              Some(s) ->
                case string.trim(s) == "" {
                  True -> pog.null()
                  False -> pog.text(string.trim(s))
                }
            }
          }
          let p_slug = opt_text(slug_opt)
          let p_name = opt_text(name_opt)
          let p_desc = opt_text(desc_opt)
          let p_img = opt_text(img_opt)
          let p_mt = opt_text(mt_opt)
          let p_md = opt_text(md_opt)
          let p_so = case so_opt {
            None -> pog.null()
            Some(n) -> pog.int(n)
          }
          let p_ia = case ia_opt {
            None -> pog.null()
            Some(b) -> pog.bool(b)
          }
          case
            pog.query(
              "update blog_categories set slug = coalesce($2::text, slug), name = coalesce($3::text, name), description = coalesce($4::text, description), image_url = coalesce($5::text, image_url), meta_title = coalesce($6::text, meta_title), meta_description = coalesce($7::text, meta_description), sort_order = coalesce($8::int, sort_order), is_active = coalesce($9::boolean, is_active) where id = $1::uuid returning id::text",
            )
            |> pog.parameter(pog.text(string.trim(cat_id)))
            |> pog.parameter(p_slug)
            |> pog.parameter(p_name)
            |> pog.parameter(p_desc)
            |> pog.parameter(p_img)
            |> pog.parameter(p_mt)
            |> pog.parameter(p_md)
            |> pog.parameter(p_so)
            |> pog.parameter(p_ia)
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

// ─── Posts ────────────────────────────────────────────────────────────────────

fn post_row_list() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String, String, String, String),
) {
  use id <- decode.field(0, decode.string)
  use cat <- decode.field(1, decode.string)
  use slug <- decode.field(2, decode.string)
  use auth <- decode.field(3, decode.string)
  use published_at <- decode.field(4, decode.string)
  use created <- decode.field(5, decode.string)
  use featured_image_url <- decode.field(6, decode.string)
  use hero_gallery_json <- decode.field(7, decode.string)
  use tags_json <- decode.field(8, decode.string)
  use read_time <- decode.field(9, decode.string)
  use default_title <- decode.field(10, decode.string)
  decode.success(#(id, cat, slug, auth, published_at, created, featured_image_url, hero_gallery_json, tags_json, read_time, default_title))
}

fn post_json_list(
  row: #(String, String, String, String, String, String, String, String, String, String, String),
) -> json.Json {
  let #(id, cat, slug, auth, published_at, created, featured_image_url, hero_gallery_json, tags_json, read_time, default_title) = row
  let catj = case cat == "" { True -> json.null() False -> json.string(cat) }
  let authj = case auth == "" { True -> json.null() False -> json.string(auth) }
  let pubj = case published_at == "" { True -> json.null() False -> json.string(published_at) }
  let fij = case featured_image_url == "" { True -> json.null() False -> json.string(featured_image_url) }
  let rtj = case read_time == "" { True -> json.null() False -> json.string(read_time) }
  let dtj = case default_title == "" { True -> json.null() False -> json.string(default_title) }
  json.object([
    #("id", json.string(id)),
    #("category_id", catj),
    #("slug", json.string(slug)),
    #("author_user_id", authj),
    #("published_at", pubj),
    #("created_at", json.string(created)),
    #("featured_image_url", fij),
    #("hero_gallery_json", json.string(hero_gallery_json)),
    #("tags_json", json.string(tags_json)),
    #("read_time_minutes", rtj),
    #("title", dtj),
  ])
}

/// GET /api/v1/blog/posts?category_id=&published_only=&limit=
pub fn list_posts(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let cat_f =
    list.key_find(qs, "category_id")
    |> result.unwrap("")
    |> string.trim
  let pub_f_raw =
    list.key_find(qs, "published_only")
    |> result.unwrap("")
    |> string.trim
  let pub_f = case permissions.session_user_from_request(req, ctx.db) {
    Error(_) -> "true"
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        True -> pub_f_raw
        False -> "true"
      }
  }
  let lim_str =
    list.key_find(qs, "limit")
    |> result.unwrap("100")
    |> string.trim
  let lim = case int.parse(lim_str) {
    Ok(n) ->
      case n > 500 {
        True -> 500
        False ->
          case n < 1 {
            True -> 100
            False -> n
          }
      }
    Error(_) -> 100
  }
  case
    pog.query(
      "select p.id::text, coalesce(p.category_id::text,''), p.slug, coalesce(p.author_user_id::text,''), coalesce(p.published_at::text,''), p.created_at::text, coalesce(p.featured_image_url,''), coalesce(p.hero_gallery_json::text,'[]'), coalesce(p.tags_json::text,'[]'), coalesce(p.read_time_minutes::text,''), coalesce((select t.title from blog_post_translations t join locales l on l.id=t.locale_id where t.post_id=p.id order by case when lower(l.code)='tr' then 0 else 1 end limit 1),'') from blog_posts p where ($1 = '' or p.category_id = $1::uuid) and ($2 = '' or ($2 = 'true' and p.published_at is not null) or ($2 = 'false' and p.published_at is null)) order by coalesce(p.published_at, p.created_at) desc limit $3",
    )
    |> pog.parameter(pog.text(cat_f))
    |> pog.parameter(pog.text(pub_f))
    |> pog.parameter(pog.int(lim))
    |> pog.returning(post_row_list())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "posts_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, post_json_list)
      let body =
        json.object([#("posts", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn create_post_decoder() -> decode.Decoder(#(String, Option(String), Option(String))) {
  decode.field("slug", decode.string, fn(slug) {
    decode.optional_field("category_id", "", decode.string, fn(cat) {
      decode.optional_field("author_user_id", "", decode.string, fn(auth) {
        let c = case string.trim(cat) == "" {
          True -> None
          False -> Some(string.trim(cat))
        }
        let a = case string.trim(auth) == "" {
          True -> None
          False -> Some(string.trim(auth))
        }
        decode.success(#(string.trim(slug), c, a))
      })
    })
  })
}

/// POST /api/v1/blog/posts
pub fn create_post(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_post_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug, cat_opt, auth_opt)) ->
          case slug == "" {
            True -> json_err(400, "slug_required")
            False -> {
              let cat_p = case cat_opt {
                None -> pog.null()
                Some(c) -> pog.text(c)
              }
              let auth_p = case auth_opt {
                None -> pog.null()
                Some(a) -> pog.text(a)
              }
              case
                pog.query(
                  "insert into blog_posts (category_id, slug, author_user_id) values ($1::uuid, $2, $3::uuid) returning id::text",
                )
                |> pog.parameter(cat_p)
                |> pog.parameter(pog.text(slug))
                |> pog.parameter(auth_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "post_create_failed")
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

/// GET /api/v1/blog/posts/:id
pub fn get_post(req: Request, ctx: Context, post_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select p.id::text, coalesce(p.category_id::text,''), p.slug, coalesce(p.author_user_id::text,''), coalesce(p.published_at::text,''), p.created_at::text, coalesce(p.featured_image_url,''), coalesce(p.hero_gallery_json::text,'[]'), coalesce(p.tags_json::text,'[]'), coalesce(p.read_time_minutes::text,''), coalesce((select t.title from blog_post_translations t join locales l on l.id=t.locale_id where t.post_id=p.id order by case when lower(l.code)='tr' then 0 else 1 end limit 1),'') from blog_posts p where p.id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(post_id)))
    |> pog.returning(post_row_list())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "post_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [row] -> {
          let body =
            json.object([#("post", post_json_list(row))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
  }
}

/// GET /api/v1/blog/posts/by-slug?slug=&locale=
pub fn get_post_by_slug(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let slug =
    list.key_find(qs, "slug")
    |> result.unwrap("")
    |> string.trim
  let loc_code =
    list.key_find(qs, "locale")
    |> result.unwrap("")
    |> string.trim
  let include_draft =
    list.key_find(qs, "draft")
    |> result.unwrap("")
    |> string.trim
  case slug == "" {
    True -> json_err(400, "slug_required")
    False ->
      case
        pog.query(
          "select p.id::text, coalesce(p.category_id::text,''), p.slug, coalesce(p.author_user_id::text,''), coalesce(p.published_at::text,''), p.created_at::text, coalesce(p.featured_image_url,''), coalesce(p.hero_gallery_json::text,'[]'), coalesce(p.tags_json::text,'[]'), coalesce(p.read_time_minutes::text,''), coalesce((select t.title from blog_post_translations t join locales l on l.id=t.locale_id where t.post_id=p.id order by case when lower(l.code)='tr' then 0 else 1 end limit 1),'') from blog_posts p where p.slug = $1 and (p.published_at is not null or $2 = 'true') limit 1",
        )
        |> pog.parameter(pog.text(slug))
        |> pog.parameter(pog.text(include_draft))
        |> pog.returning(post_row_list())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "post_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "not_found")
            [row] -> {
              let #(pid, _, _, _, _, _, _, _, _, _, _) = row
              let trans_j = case loc_code == "" {
                True -> json.null()
                False ->
                  case blog_translation_for_post(ctx, pid, loc_code) {
                    Ok(tr) -> translation_json(tr)
                    Error(_) -> json.null()
                  }
              }
              let body =
                json.object([
                  #("post", post_json_list(row)),
                  #("translation", trans_j),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected")
          }
      }
  }
}

fn patch_post_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String)),
) {
  decode.optional_field("slug", None, decode.optional(decode.string), fn(slug_opt) {
    decode.optional_field("category_id", None, decode.optional(decode.string), fn(
      cat_opt,
    ) {
      decode.optional_field("published_at", None, decode.optional(decode.string), fn(
        pub_at_opt,
      ) { decode.success(#(slug_opt, cat_opt, pub_at_opt)) })
    })
  })
}

/// PATCH /api/v1/blog/posts/:id
pub fn patch_post(req: Request, ctx: Context, post_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_post_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug_opt, cat_opt, pub_at_opt)) ->
          case slug_opt, cat_opt, pub_at_opt {
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
              let p_cat = case cat_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_pub = case pub_at_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              case
                pog.query(
                  "update blog_posts set slug = coalesce($2::text, slug), category_id = coalesce($3::uuid, category_id), published_at = case when $4::text = '' then null else coalesce($4::timestamptz, published_at) end, updated_at = now() where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(post_id)))
                |> pog.parameter(p_slug)
                |> pog.parameter(p_cat)
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

fn put_post_meta_decoder() -> decode.Decoder(
  #(Option(String), String, Option(Int), String, Option(String), Option(String)),
) {
  decode.optional_field("featured_image_url", None, decode.optional(decode.string), fn(fi) {
    decode.optional_field("hero_gallery_json", "[]", decode.string, fn(hg) {
      decode.optional_field("read_time_minutes", None, decode.optional(decode.int), fn(rt) {
        decode.optional_field("tags_json", "[]", decode.string, fn(tags) {
          decode.optional_field("meta_title", None, decode.optional(decode.string), fn(mt) {
            decode.optional_field("meta_description", None, decode.optional(decode.string), fn(md) {
              decode.success(#(fi, hg, rt, tags, mt, md))
            })
          })
        })
      })
    })
  })
}

/// PUT /api/v1/blog/posts/:id/meta
pub fn put_post_meta(req: Request, ctx: Context, post_id: String) -> Response {
  use <- wisp.require_method(req, http.Put)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, put_post_meta_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(fi_opt, hg_json, rt_opt, tags_json_str, mt_opt, md_opt)) -> {
          let opt_txt = fn(o: Option(String)) -> pog.Value {
            case o {
              None -> pog.null()
              Some(s) ->
                case string.trim(s) == "" {
                  True -> pog.null()
                  False -> pog.text(string.trim(s))
                }
            }
          }
          let p_fi = opt_txt(fi_opt)
          let p_mt = opt_txt(mt_opt)
          let p_md = opt_txt(md_opt)
          let p_rt = case rt_opt {
            None -> pog.null()
            Some(n) -> pog.int(n)
          }
          case
            pog.query(
              "update blog_posts set featured_image_url = coalesce($2, featured_image_url), hero_gallery_json = $3::jsonb, tags_json = $4::jsonb, read_time_minutes = coalesce($5::int, read_time_minutes), meta_title = coalesce($6, meta_title), meta_description = coalesce($7, meta_description), updated_at = now() where id = $1::uuid returning id::text",
            )
            |> pog.parameter(pog.text(string.trim(post_id)))
            |> pog.parameter(p_fi)
            |> pog.parameter(pog.text(hg_json))
            |> pog.parameter(pog.text(tags_json_str))
            |> pog.parameter(p_rt)
            |> pog.parameter(p_mt)
            |> pog.parameter(p_md)
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "meta_update_failed")
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

/// DELETE /api/v1/blog/posts/:id
pub fn delete_post(req: Request, ctx: Context, post_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from blog_posts where id = $1::uuid returning id::text")
        |> pog.parameter(pog.text(string.trim(post_id)))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(r) ->
          case r.rows {
            [] -> json_err(404, "not_found")
            [_] -> wisp.json_response(json.object([#("ok", json.bool(True))]) |> json.to_string, 200)
            _ -> json_err(500, "unexpected")
          }
      }
  }
}

// ─── Translations ─────────────────────────────────────────────────────────────

fn translation_row() -> decode.Decoder(#(String, String, String, String)) {
  use code <- decode.field(0, decode.string)
  use title <- decode.field(1, decode.string)
  use body <- decode.field(2, decode.string)
  use excerpt <- decode.field(3, decode.string)
  decode.success(#(code, title, body, excerpt))
}

fn translation_json(row: #(String, String, String, String)) -> json.Json {
  let #(code, title, body, excerpt) = row
  let ej = case excerpt == "" { True -> json.null() False -> json.string(excerpt) }
  json.object([
    #("locale", json.string(code)),
    #("title", json.string(title)),
    #("body", json.string(body)),
    #("excerpt", ej),
  ])
}

fn blog_translation_for_post(
  ctx: Context,
  post_id: String,
  locale_code: String,
) -> Result(#(String, String, String, String), Nil) {
  case
    pog.query(
      "select l.code::text, t.title, coalesce(t.body,''), coalesce(t.excerpt,'') from blog_post_translations t inner join locales l on l.id = t.locale_id where t.post_id = $1::uuid and lower(l.code) = lower($2) limit 1",
    )
    |> pog.parameter(pog.text(string.trim(post_id)))
    |> pog.parameter(pog.text(string.trim(locale_code)))
    |> pog.returning(translation_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error(Nil)
      }
  }
}

/// GET /api/v1/blog/posts/:id/translations
pub fn list_translations(req: Request, ctx: Context, post_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "select l.code::text, t.title, coalesce(t.body,''), coalesce(t.excerpt,'') from blog_post_translations t join locales l on l.id = t.locale_id where t.post_id = $1::uuid order by l.code",
    )
    |> pog.parameter(pog.text(string.trim(post_id)))
    |> pog.returning(translation_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "translations_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, translation_json)
      let body =
        json.object([
          #("translations", json.array(from: arr, of: fn(x) { x })),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
  }
}

fn upsert_translation_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.field("locale", decode.string, fn(loc) {
    decode.field("title", decode.string, fn(title) {
      decode.optional_field("body", "", decode.string, fn(body) {
        decode.optional_field("excerpt", "", decode.string, fn(excerpt) {
          decode.success(#(string.trim(loc), string.trim(title), body, excerpt))
        })
      })
    })
  })
}

/// PUT /api/v1/blog/posts/:id/translations
pub fn upsert_translation(req: Request, ctx: Context, post_id: String) -> Response {
  use <- wisp.require_method(req, http.Put)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, upsert_translation_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(loc_code, title, body_raw, excerpt)) ->
          case loc_code == "" || title == "" {
            True -> json_err(400, "locale_and_title_required")
            False ->
              case locale_id_by_code(ctx, loc_code) {
                Error(_) -> json_err(400, "invalid_locale")
                Ok(lid) ->
                  case
                    pog.query(
                      "insert into blog_post_translations (post_id, locale_id, title, body, excerpt) values ($1::uuid, $2::smallint, $3, nullif($4,''), nullif($5,'')) on conflict (post_id, locale_id) do update set title = excluded.title, body = excluded.body, excerpt = excluded.excerpt returning post_id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(post_id)))
                    |> pog.parameter(pog.text(lid))
                    |> pog.parameter(pog.text(title))
                    |> pog.parameter(pog.text(body_raw))
                    |> pog.parameter(pog.text(excerpt))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "translation_upsert_failed")
                    Ok(r) ->
                      case r.rows {
                        [_] -> {
                          let out =
                            json.object([#("ok", json.bool(True))])
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


