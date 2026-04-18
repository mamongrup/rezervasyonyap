//// Mega menü, anasayfa düzeni, popup (130_navigation_ui).

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
import travel/identity/admin_gate
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

// --- Menüler ---

fn menu_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use org <- decode.field(1, decode.string)
  use code <- decode.field(2, decode.string)
  decode.success(#(id, org, code))
}

fn menu_json(row: #(String, String, String)) -> json.Json {
  let #(id, org, code) = row
  let orgj = case org == "" {
    True -> json.null()
    False -> json.string(org)
  }
  json.object([
    #("id", json.string(id)),
    #("organization_id", orgj),
    #("code", json.string(code)),
  ])
}

/// GET /api/v1/navigation/menus?organization_id=
pub fn list_menus(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org_f =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  case
    pog.query(
      "select id::text, coalesce(organization_id::text,''), code from menus where ($1 = '' or organization_id = $1::uuid) order by code limit 200",
    )
    |> pog.parameter(pog.text(org_f))
    |> pog.returning(menu_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "menus_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, menu_json)
      let body =
        json.object([#("menus", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn create_menu_decoder() -> decode.Decoder(#(String, Option(String))) {
  decode.field("code", decode.string, fn(code) {
    decode.optional_field("organization_id", "", decode.string, fn(oid) {
      let org = case string.trim(oid) == "" {
        True -> None
        False -> Some(string.trim(oid))
      }
      decode.success(#(string.trim(code), org))
    })
  })
}

/// POST /api/v1/navigation/menus — `admin.users.read`
pub fn create_menu(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_menu_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(code, org_opt)) ->
          case code == "" {
            True -> json_err(400, "code_required")
            False -> {
              let org_p = case org_opt {
                None -> pog.null()
                Some(o) -> pog.text(o)
              }
              case
                pog.query(
                  "insert into menus (organization_id, code) values ($1::uuid, $2) returning id::text",
                )
                |> pog.parameter(org_p)
                |> pog.parameter(pog.text(code))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "menu_create_failed")
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

fn item_row() -> decode.Decoder(#(String, String, Int, String, String, String, Bool)) {
  use id <- decode.field(0, decode.string)
  use pid <- decode.field(1, decode.string)
  use so <- decode.field(2, decode.int)
  use lk <- decode.field(3, decode.string)
  use url <- decode.field(4, decode.string)
  use mega <- decode.field(5, decode.string)
  use published <- decode.field(6, decode.bool)
  decode.success(#(id, pid, so, lk, url, mega, published))
}

fn item_json(row: #(String, String, Int, String, String, String, Bool)) -> json.Json {
  let #(id, pid, so, lk, url, mega, published) = row
  let pidj = case pid == "" {
    True -> json.null()
    False -> json.string(pid)
  }
  let urlj = case url == "" {
    True -> json.null()
    False -> json.string(url)
  }
  json.object([
    #("id", json.string(id)),
    #("parent_id", pidj),
    #("sort_order", json.int(so)),
    #("label_key", json.string(lk)),
    #("url", urlj),
    #("mega_content_json", json.string(mega)),
    #("is_published", json.bool(published)),
  ])
}

/// GET /api/v1/navigation/menus/:menu_id/items
pub fn list_menu_items(req: Request, ctx: Context, menu_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, coalesce(parent_id::text,''), sort_order, label_key, coalesce(url,''), coalesce(mega_content_json::text,'{}'), is_published from menu_items where menu_id = $1::uuid order by sort_order asc, id asc",
    )
    |> pog.parameter(pog.text(string.trim(menu_id)))
    |> pog.returning(item_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "menu_items_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, item_json)
      let body =
        json.object([#("items", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/navigation/public/menus/:menu_code/items?organization_id=
/// Auth yok — sadece `is_published = true` öğeler.
pub fn list_public_menu_items(req: Request, ctx: Context, menu_code: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org_f =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  let code = string.trim(menu_code)
  case code == "" {
    True -> json_err(400, "menu_code_required")
    False -> case
      pog.query(
        "select mi.id::text, coalesce(mi.parent_id::text,''), mi.sort_order, mi.label_key, coalesce(mi.url,''), coalesce(mi.mega_content_json::text,'{}'), mi.is_published from menu_items mi join menus m on m.id = mi.menu_id where m.code = $1 and (($2 = '' and m.organization_id is null) or ($2 <> '' and m.organization_id = $2::uuid)) and mi.is_published = true order by mi.sort_order asc, mi.id asc",
      )
      |> pog.parameter(pog.text(code))
      |> pog.parameter(pog.text(org_f))
      |> pog.returning(item_row())
      |> pog.execute(ctx.db)
    {
      Error(_) -> json_err(500, "menu_items_query_failed")
      Ok(ret) -> {
        let arr = list.map(ret.rows, item_json)
        let body =
          json.object([#("items", json.array(from: arr, of: fn(x) { x }))])
          |> json.to_string
        wisp.json_response(body, 200)
      }
    }
  }
}

fn add_item_decoder() -> decode.Decoder(
  #(Option(String), Int, String, Option(String), String, Bool),
) {
  decode.field("label_key", decode.string, fn(lk) {
    decode.optional_field("parent_id", "", decode.string, fn(pid) {
      decode.optional_field("sort_order", 0, decode.int, fn(so) {
        decode.optional_field("url", "", decode.string, fn(url) {
          decode.optional_field("mega_content_json", "{}", decode.string, fn(mega) {
            decode.optional_field("is_published", True, decode.bool, fn(is_pub) {
              let p = case string.trim(pid) == "" {
                True -> None
                False -> Some(string.trim(pid))
              }
              let u = case string.trim(url) == "" {
                True -> None
                False -> Some(string.trim(url))
              }
              decode.success(#(p, so, string.trim(lk), u, string.trim(mega), is_pub))
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/navigation/menus/:menu_id/items — `admin.users.read`
pub fn add_menu_item(req: Request, ctx: Context, menu_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, add_item_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(parent_opt, so, lk, url_opt, mega, is_pub)) ->
          case lk == "" {
            True -> json_err(400, "label_key_required")
            False -> {
              let cfg = case mega == "" {
                True -> "{}"
                False -> mega
              }
              let parent_p = case parent_opt {
                None -> pog.null()
                Some(p) -> pog.text(p)
              }
              let url_p = case url_opt {
                None -> pog.null()
                Some(u) -> pog.text(u)
              }
              case
                pog.query(
                  "insert into menu_items (menu_id, parent_id, sort_order, label_key, url, mega_content_json, is_published) values ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(menu_id)))
                |> pog.parameter(parent_p)
                |> pog.parameter(pog.int(so))
                |> pog.parameter(pog.text(lk))
                |> pog.parameter(url_p)
                |> pog.parameter(pog.text(cfg))
                |> pog.parameter(pog.bool(is_pub))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "menu_item_create_failed")
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

fn patch_item_decoder() -> decode.Decoder(
  #(
    Option(Int),
    Option(String),
    Option(String),
    Option(String),
    Option(Bool),
    Option(String),
  ),
) {
  decode.optional_field("sort_order", None, decode.optional(decode.int), fn(so) {
    decode.optional_field("label_key", None, decode.optional(decode.string), fn(lk) {
      decode.optional_field("url", None, decode.optional(decode.string), fn(url) {
        decode.optional_field("mega_content_json", None, decode.optional(decode.string), fn(mega) {
          decode.optional_field("is_published", None, decode.optional(decode.bool), fn(is_pub) {
            decode.optional_field("parent_id", None, decode.optional(decode.string), fn(pid) {
              decode.success(#(so, lk, url, mega, is_pub, pid))
            })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/navigation/menus/:menu_id/items/:item_id — `admin.users.read`
pub fn patch_menu_item(
  req: Request,
  ctx: Context,
  menu_id: String,
  item_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_item_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(so_opt, lk_opt, url_opt, mega_opt, is_pub_opt, pid_opt)) ->
          case so_opt, lk_opt, url_opt, mega_opt, is_pub_opt, pid_opt {
            None, None, None, None, None, None -> json_err(400, "no_fields")
            _, _, _, _, _, _ -> {
              let p_so = case so_opt {
                None -> pog.null()
                Some(i) -> pog.int(i)
              }
              let p_lk = case lk_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_url = case url_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              let p_mega = case mega_opt {
                None -> pog.null()
                Some(s) ->
                  pog.text(case string.trim(s) == "" {
                    True -> "{}"
                    False -> string.trim(s)
                  })
              }
              let p_pub = case is_pub_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              let p_pid = case pid_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              case
                pog.query(
                  "update menu_items set sort_order = coalesce($3::int, sort_order), label_key = coalesce($4::text, label_key), url = coalesce($5::text, url), mega_content_json = coalesce($6::jsonb, mega_content_json), is_published = coalesce($7::boolean, is_published), parent_id = case when $8::text is null then parent_id when trim($8::text) = '' then null else $8::uuid end where id = $1::uuid and menu_id = $2::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(item_id)))
                |> pog.parameter(pog.text(string.trim(menu_id)))
                |> pog.parameter(p_so)
                |> pog.parameter(p_lk)
                |> pog.parameter(p_url)
                |> pog.parameter(p_mega)
                |> pog.parameter(p_pub)
                |> pog.parameter(p_pid)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "menu_item_update_failed")
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

/// DELETE /api/v1/navigation/menus/:menu_id/items/:item_id — `admin.users.read`
pub fn delete_menu_item(
  req: Request,
  ctx: Context,
  menu_id: String,
  item_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query(
      "delete from menu_items where id = $1::uuid and menu_id = $2::uuid",
    )
    |> pog.parameter(pog.text(string.trim(item_id)))
    |> pog.parameter(pog.text(string.trim(menu_id)))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "menu_item_delete_failed")
    Ok(ret) ->
      case ret.count {
        0 -> json_err(404, "not_found")
        _ -> wisp.json_response("{\"ok\":true}", 200)
      }
  }
  }
}

// --- Anasayfa bölümleri ---

fn section_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use org <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use so <- decode.field(3, decode.string)
  use cfg <- decode.field(4, decode.string)
  decode.success(#(id, org, st, so, cfg))
}

fn section_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, org, st, so, cfg) = row
  let orgj = case org == "" {
    True -> json.null()
    False -> json.string(org)
  }
  json.object([
    #("id", json.string(id)),
    #("organization_id", orgj),
    #("section_type", json.string(st)),
    #("sort_order", json.string(so)),
    #("config_json", json.string(cfg)),
  ])
}

/// GET /api/v1/navigation/home-sections?organization_id=
pub fn list_home_sections(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org_f =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  case
    pog.query(
      "select id::text, coalesce(organization_id::text,''), section_type, sort_order::text, config_json::text from home_layout_sections where ($1 = '' or organization_id = $1::uuid) order by sort_order, id limit 200",
    )
    |> pog.parameter(pog.text(org_f))
    |> pog.returning(section_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "home_sections_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, section_json)
      let body =
        json.object([#("sections", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn create_section_decoder() -> decode.Decoder(
  #(Option(String), String, Int, String),
) {
  decode.optional_field("organization_id", "", decode.string, fn(oid) {
    decode.field("section_type", decode.string, fn(st) {
      decode.field("sort_order", decode.int, fn(so) {
        decode.optional_field("config_json", "{}", decode.string, fn(cfg) {
          let org = case string.trim(oid) == "" {
            True -> None
            False -> Some(string.trim(oid))
          }
          decode.success(#(org, string.trim(st), so, cfg))
        })
      })
    })
  })
}

/// POST /api/v1/navigation/home-sections — `admin.users.read`
pub fn create_home_section(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_section_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(org_opt, st, so, cfg_raw)) ->
          case st == "" {
            True -> json_err(400, "section_type_required")
            False -> {
              let cfg = case string.trim(cfg_raw) == "" {
                True -> "{}"
                False -> string.trim(cfg_raw)
              }
              let org_p = case org_opt {
                None -> pog.null()
                Some(o) -> pog.text(o)
              }
              case
                pog.query(
                  "insert into home_layout_sections (organization_id, section_type, sort_order, config_json) values ($1::uuid, $2, $3, $4::jsonb) returning id::text",
                )
                |> pog.parameter(org_p)
                |> pog.parameter(pog.text(st))
                |> pog.parameter(pog.int(so))
                |> pog.parameter(pog.text(cfg))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "home_section_create_failed")
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

fn patch_section_decoder() -> decode.Decoder(#(Option(String), Option(Int), Option(String))) {
  decode.optional_field("section_type", None, decode.optional(decode.string), fn(st) {
    decode.optional_field("sort_order", None, decode.optional(decode.int), fn(so) {
      decode.optional_field("config_json", None, decode.optional(decode.string), fn(cfg) {
        decode.success(#(st, so, cfg))
      })
    })
  })
}

/// PATCH /api/v1/navigation/home-sections/:id — `admin.users.read`
pub fn patch_home_section(req: Request, ctx: Context, section_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_section_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(st_opt, so_opt, cfg_opt)) ->
          case st_opt, so_opt, cfg_opt {
            None, None, None -> json_err(400, "no_fields")
            _, _, _ -> {
              let p_st = case st_opt {
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
              let p_cfg = case cfg_opt {
                None -> pog.null()
                Some(s) ->
                  pog.text(case string.trim(s) == "" {
                    True -> "{}"
                    False -> string.trim(s)
                  })
              }
              case
                pog.query(
                  "update home_layout_sections set section_type = coalesce($2::text, section_type), sort_order = coalesce($3::int, sort_order), config_json = coalesce($4::jsonb, config_json) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(section_id)))
                |> pog.parameter(p_st)
                |> pog.parameter(p_so)
                |> pog.parameter(p_cfg)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "home_section_update_failed")
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

/// DELETE /api/v1/navigation/home-sections/:id — `admin.users.read`
pub fn delete_home_section(req: Request, ctx: Context, section_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query("delete from home_layout_sections where id = $1::uuid")
    |> pog.parameter(pog.text(string.trim(section_id)))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "home_section_delete_failed")
    Ok(ret) ->
      case ret.count {
        0 -> json_err(404, "not_found")
        _ -> wisp.json_response("{\"ok\":true}", 200)
      }
  }
  }
}

// --- Popuplar ---

fn popup_row() -> decode.Decoder(#(String, String, String, String, String, Bool)) {
  use id <- decode.field(0, decode.string)
  use org <- decode.field(1, decode.string)
  use pt <- decode.field(2, decode.string)
  use rules <- decode.field(3, decode.string)
  use ck <- decode.field(4, decode.string)
  use active <- decode.field(5, decode.bool)
  decode.success(#(id, org, pt, rules, ck, active))
}

fn popup_json(row: #(String, String, String, String, String, Bool)) -> json.Json {
  let #(id, org, pt, rules, ck, active) = row
  let orgj = case org == "" {
    True -> json.null()
    False -> json.string(org)
  }
  json.object([
    #("id", json.string(id)),
    #("organization_id", orgj),
    #("popup_type", json.string(pt)),
    #("rules_json", json.string(rules)),
    #("content_key", json.string(ck)),
    #("active", json.bool(active)),
  ])
}

/// GET /api/v1/navigation/popups?organization_id=
pub fn list_popups(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org_f =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  case
    pog.query(
      "select id::text, coalesce(organization_id::text,''), popup_type, rules_json::text, content_key, active from site_popups where ($1 = '' or organization_id = $1::uuid) order by id desc limit 200",
    )
    |> pog.parameter(pog.text(org_f))
    |> pog.returning(popup_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "popups_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, popup_json)
      let body =
        json.object([#("popups", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn create_popup_decoder() -> decode.Decoder(
  #(Option(String), String, String, String, Bool),
) {
  decode.optional_field("organization_id", "", decode.string, fn(oid) {
    decode.field("popup_type", decode.string, fn(pt) {
      decode.field("content_key", decode.string, fn(ck) {
        decode.optional_field("rules_json", "{}", decode.string, fn(rules) {
          decode.optional_field("active", True, decode.bool, fn(active) {
            let org = case string.trim(oid) == "" {
              True -> None
              False -> Some(string.trim(oid))
            }
            decode.success(#(org, string.trim(pt), string.trim(ck), rules, active))
          })
        })
      })
    })
  })
}

/// POST /api/v1/navigation/popups — `admin.users.read`
pub fn create_popup(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_popup_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(org_opt, pt, ck, rules_raw, active)) ->
          case pt == "" || ck == "" {
            True -> json_err(400, "popup_type_and_content_key_required")
            False -> {
              let pt_l = string.lowercase(pt)
              case pt_l == "campaign" || pt_l == "generic" || pt_l == "cookie_notice" {
                False -> json_err(400, "invalid_popup_type")
                True -> {
                  let cfg = case string.trim(rules_raw) == "" {
                    True -> "{}"
                    False -> string.trim(rules_raw)
                  }
                  let org_p = case org_opt {
                    None -> pog.null()
                    Some(o) -> pog.text(o)
                  }
                  case
                    pog.query(
                      "insert into site_popups (organization_id, popup_type, rules_json, content_key, active) values ($1::uuid, $2, $3::jsonb, $4, $5) returning id::text",
                    )
                    |> pog.parameter(org_p)
                    |> pog.parameter(pog.text(pt_l))
                    |> pog.parameter(pog.text(cfg))
                    |> pog.parameter(pog.text(ck))
                    |> pog.parameter(pog.bool(active))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "popup_create_failed")
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
  }
}

fn patch_popup_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String), Option(Bool)),
) {
  decode.optional_field("popup_type", None, decode.optional(decode.string), fn(pt) {
    decode.optional_field("rules_json", None, decode.optional(decode.string), fn(rules) {
      decode.optional_field("content_key", None, decode.optional(decode.string), fn(ck) {
        decode.optional_field("active", None, decode.optional(decode.bool), fn(active) {
          decode.success(#(pt, rules, ck, active))
        })
      })
    })
  })
}

/// PATCH /api/v1/navigation/popups/:id — `admin.users.read`
pub fn patch_popup(req: Request, ctx: Context, popup_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_popup_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(pt_opt, rules_opt, ck_opt, active_opt)) ->
          case pt_opt, rules_opt, ck_opt, active_opt {
            None, None, None, None -> json_err(400, "no_fields")
            _, _, _, _ -> {
              let p_pt = case pt_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.lowercase(string.trim(s)))
                  }
              }
              let p_rules = case rules_opt {
                None -> pog.null()
                Some(s) ->
                  pog.text(case string.trim(s) == "" {
                    True -> "{}"
                    False -> string.trim(s)
                  })
              }
              let p_ck = case ck_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_active = case active_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              case
                pog.query(
                  "update site_popups set popup_type = coalesce($2::text, popup_type), rules_json = coalesce($3::jsonb, rules_json), content_key = coalesce($4::text, content_key), active = coalesce($5::boolean, active) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(popup_id)))
                |> pog.parameter(p_pt)
                |> pog.parameter(p_rules)
                |> pog.parameter(p_ck)
                |> pog.parameter(p_active)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "popup_update_failed")
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

/// DELETE /api/v1/navigation/popups/:id — `admin.users.read`
pub fn delete_popup(req: Request, ctx: Context, popup_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
    pog.query("delete from site_popups where id = $1::uuid")
    |> pog.parameter(pog.text(string.trim(popup_id)))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "popup_delete_failed")
    Ok(ret) ->
      case ret.count {
        0 -> json_err(404, "not_found")
        _ -> wisp.json_response("{\"ok\":true}", 200)
      }
  }
  }
}
