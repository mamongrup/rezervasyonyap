//// Banner yerleşimleri (080_content_seo.banner_placements).

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

fn banner_row() -> decode.Decoder(#(String, String, String, String, String, String, Bool)) {
  use id <- decode.field(0, decode.string)
  use pc <- decode.field(1, decode.string)
  use org <- decode.field(2, decode.string)
  use img <- decode.field(3, decode.string)
  use link <- decode.field(4, decode.string)
  use loc <- decode.field(5, decode.string)
  use active <- decode.field(6, decode.bool)
  decode.success(#(id, pc, org, img, link, loc, active))
}

fn banner_json(row: #(String, String, String, String, String, String, Bool)) -> json.Json {
  let #(id, pc, org, img, link, loc, active) = row
  let orgj = case org == "" {
    True -> json.null()
    False -> json.string(org)
  }
  let linkj = case link == "" {
    True -> json.null()
    False -> json.string(link)
  }
  let locj = case loc == "" {
    True -> json.null()
    False -> json.string(loc)
  }
  json.object([
    #("id", json.string(id)),
    #("placement_code", json.string(pc)),
    #("organization_id", orgj),
    #("image_storage_key", json.string(img)),
    #("link_url", linkj),
    #("locale_id", locj),
    #("active", json.bool(active)),
  ])
}

/// GET /api/v1/banners/placements?organization_id=&locale=&active= — `admin.users.read`
pub fn list_placements(req: Request, ctx: Context) -> Response {
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
  let loc_code =
    list.key_find(qs, "locale")
    |> result.unwrap("")
    |> string.trim
  let active_f =
    list.key_find(qs, "active")
    |> result.unwrap("")
    |> string.trim
  let locale_param = case loc_code == "" {
    True -> Ok(pog.null())
    False ->
      case locale_id_by_code(ctx, loc_code) {
        Ok(id) -> Ok(pog.text(id))
        Error(_) -> Error(Nil)
      }
  }
  case locale_param {
    Error(_) -> json_err(400, "invalid_locale")
    Ok(loc_filter) ->
      case
        pog.query(
          "select id::text, placement_code, coalesce(organization_id::text,''), image_storage_key, coalesce(link_url,''), coalesce(locale_id::text,''), active from banner_placements where ($1 = '' or organization_id = $1::uuid) and ($2::smallint is null or locale_id = $2::smallint) and ($3 = '' or ($3 = 'true' and active = true) or ($3 = 'false' and active = false)) order by placement_code, id limit 500",
        )
        |> pog.parameter(pog.text(org_f))
        |> pog.parameter(loc_filter)
        |> pog.parameter(pog.text(active_f))
        |> pog.returning(banner_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "banners_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, banner_json)
          let body =
            json.object([#("placements", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
    }
  }
}

/// GET /api/v1/banners/placements/public?organization_id=&locale= — yalnızca `active = true`, kimliksiz (vitrin).
pub fn list_placements_public(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org_f =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  let loc_code =
    list.key_find(qs, "locale")
    |> result.unwrap("")
    |> string.trim
  let locale_param = case loc_code == "" {
    True -> Ok(pog.null())
    False ->
      case locale_id_by_code(ctx, loc_code) {
        Ok(id) -> Ok(pog.text(id))
        Error(_) -> Error(Nil)
      }
  }
  case locale_param {
    Error(_) -> json_err(400, "invalid_locale")
    Ok(loc_filter) ->
      case
        pog.query(
          "select id::text, placement_code, coalesce(organization_id::text,''), image_storage_key, coalesce(link_url,''), coalesce(locale_id::text,''), active from banner_placements where ($1 = '' or organization_id = $1::uuid) and ($2::smallint is null or locale_id = $2::smallint) and active = true order by placement_code, id limit 200",
        )
        |> pog.parameter(pog.text(org_f))
        |> pog.parameter(loc_filter)
        |> pog.returning(banner_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "banners_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, banner_json)
          let body =
            json.object([#("placements", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_placement_decoder() -> decode.Decoder(
  #(String, Option(String), String, Option(String), Option(String), Bool),
) {
  decode.field("placement_code", decode.string, fn(pc) {
    decode.field("image_storage_key", decode.string, fn(img) {
      decode.optional_field("organization_id", "", decode.string, fn(oid) {
        decode.optional_field("link_url", "", decode.string, fn(link) {
          decode.optional_field("locale", "", decode.string, fn(loc) {
            decode.optional_field("active", True, decode.bool, fn(active) {
              let org = case string.trim(oid) == "" {
                True -> None
                False -> Some(string.trim(oid))
              }
              let lk = case string.trim(link) == "" {
                True -> None
                False -> Some(string.trim(link))
              }
              let lc = case string.trim(loc) == "" {
                True -> None
                False -> Some(string.trim(loc))
              }
              decode.success(#(
                string.trim(pc),
                org,
                string.trim(img),
                lk,
                lc,
                active,
              ))
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/banners/placements — `admin.users.read`
pub fn create_placement(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_placement_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(pc, org_opt, img, link_opt, loc_opt, active)) ->
          case pc == "" || img == "" {
            True -> json_err(400, "placement_code_and_image_required")
            False -> {
              let org_p = case org_opt {
                None -> pog.null()
                Some(o) -> pog.text(o)
              }
              let link_p = case link_opt {
                None -> pog.null()
                Some(l) -> pog.text(l)
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
                  "insert into banner_placements (placement_code, organization_id, image_storage_key, link_url, locale_id, active) values ($1, $2::uuid, $3, $4, $5::smallint, $6)",
                )
                |> pog.parameter(pog.text(pc))
                |> pog.parameter(org_p)
                |> pog.parameter(pog.text(img))
                |> pog.parameter(link_p)
                |> pog.parameter(loc_p)
                |> pog.parameter(pog.bool(active))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "insert_failed")
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

fn patch_placement_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String), Option(String), Option(String), Option(Bool)),
) {
  decode.optional_field("placement_code", None, decode.optional(decode.string), fn(pc_opt) {
    decode.optional_field("organization_id", None, decode.optional(decode.string), fn(
      org_opt,
    ) {
      decode.optional_field("image_storage_key", None, decode.optional(decode.string), fn(
        img_opt,
      ) {
        decode.optional_field("link_url", None, decode.optional(decode.string), fn(
          link_opt,
        ) {
          decode.optional_field("locale", None, decode.optional(decode.string), fn(
            loc_opt,
          ) {
            decode.optional_field("active", None, decode.optional(decode.bool), fn(
              active_opt,
            ) { decode.success(#(pc_opt, org_opt, img_opt, link_opt, loc_opt, active_opt)) })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/banners/placements/:id — `admin.users.read`
pub fn patch_placement(req: Request, ctx: Context, placement_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_placement_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(pc_opt, org_opt, img_opt, link_opt, loc_opt, active_opt)) ->
          case pc_opt, org_opt, img_opt, link_opt, loc_opt, active_opt {
            None, None, None, None, None, None -> json_err(400, "no_fields")
            _, _, _, _, _, _ -> {
              let p_pc = case pc_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_org = case org_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_img = case img_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_link = case link_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              let p_loc = case loc_opt {
                None -> pog.null()
                Some(code) ->
                  case string.trim(code) == "" {
                    True -> pog.null()
                    False ->
                      case locale_id_by_code(ctx, string.trim(code)) {
                        Error(_) -> pog.null()
                        Ok(lid) -> pog.text(lid)
                      }
                  }
              }
              let p_active = case active_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              case
                pog.query(
                  "update banner_placements set placement_code = coalesce($2::text, placement_code), organization_id = coalesce($3::uuid, organization_id), image_storage_key = coalesce($4::text, image_storage_key), link_url = coalesce($5::text, link_url), locale_id = coalesce($6::smallint, locale_id), active = coalesce($7::boolean, active) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(placement_id)))
                |> pog.parameter(p_pc)
                |> pog.parameter(p_org)
                |> pog.parameter(p_img)
                |> pog.parameter(p_link)
                |> pog.parameter(p_loc)
                |> pog.parameter(p_active)
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

/// DELETE /api/v1/banners/placements/:id — `admin.users.read`
pub fn delete_placement(req: Request, ctx: Context, placement_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from banner_placements where id = $1::uuid")
        |> pog.parameter(pog.text(string.trim(placement_id)))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}
