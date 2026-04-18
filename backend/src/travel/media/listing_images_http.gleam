//// İlan görselleri — sıralama, CRUD (listing_images; silinen satır = depo temizliği ayrı işçi).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/catalog/catalog_http
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

fn require_listing_manage_access(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Result(Nil, Response) {
  case catalog_http.resolve_manage_listings_scope(req, ctx) {
    Error(r) -> Error(r)
    Ok(#(_, org_id)) ->
      case catalog_http.listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> Error(json_err(500, "listing_scope_check_failed"))
        Ok(False) -> Error(json_err(404, "listing_not_found"))
        Ok(True) -> Ok(Nil)
      }
  }
}

fn img_row() -> decode.Decoder(#(String, Int, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use sort <- decode.field(1, decode.int)
  use sk <- decode.field(2, decode.string)
  use mime <- decode.field(3, decode.string)
  use alt <- decode.field(4, decode.string)
  use created <- decode.field(5, decode.string)
  use scene <- decode.field(6, decode.string)
  decode.success(#(id, sort, sk, mime, alt, created, scene))
}

fn img_json(row: #(String, Int, String, String, String, String, String)) -> json.Json {
  let #(id, sort, sk, mime, alt, created, scene) = row
  let altj = case alt == "" {
    True -> json.null()
    False -> json.string(alt)
  }
  let scenej = case string.trim(scene) == "" {
    True -> json.null()
    False -> json.string(string.trim(scene))
  }
  json.object([
    #("id", json.string(id)),
    #("sort_order", json.int(sort)),
    #("storage_key", json.string(sk)),
    #("original_mime", json.string(mime)),
    #("alt_text_key", altj),
    #("created_at", json.string(created)),
    #("scene_code", scenej),
  ])
}

/// GET /api/v1/listings/:id/images
pub fn list_images(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_listing_manage_access(req, ctx, listing_id) {
    Error(r) -> r
    Ok(Nil) ->
      case
        pog.query(
          "select id::text, sort_order, storage_key, coalesce(original_mime, ''), coalesce(alt_text_key, ''), created_at::text, coalesce(scene_code, '') from listing_images where listing_id = $1::uuid order by sort_order asc, created_at asc",
        )
        |> pog.parameter(pog.text(string.trim(listing_id)))
        |> pog.returning(img_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "images_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, img_json)
          let body =
            json.object([#("images", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn add_image_decoder() -> decode.Decoder(#(String, String, Option(Int))) {
  decode.field("storage_key", decode.string, fn(storage_key) {
    decode.optional_field("original_mime", "", decode.string, fn(mime) {
      decode.optional_field("sort_order", -1, decode.int, fn(sort) {
        let sort_opt = case sort < 0 {
          True -> None
          False -> Some(sort)
        }
        decode.success(#(storage_key, mime, sort_opt))
      })
    })
  })
}

/// POST /api/v1/listings/:id/images
pub fn add_image(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_listing_manage_access(req, ctx, listing_id) {
    Error(r) -> r
    Ok(Nil) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, add_image_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(sk, mime_raw, sort_opt)) -> {
              let sk_trim = string.trim(sk)
              case sk_trim == "" {
                True -> json_err(400, "storage_key_required")
                False -> {
                  let mime = string.trim(mime_raw)
                  case sort_opt {
                    Some(so) ->
                      case
                        pog.query(
                          "insert into listing_images (listing_id, sort_order, storage_key, original_mime) values ($1::uuid, $2, $3, case when $4 = '' then null else $4 end) returning id::text",
                        )
                        |> pog.parameter(pog.text(string.trim(listing_id)))
                        |> pog.parameter(pog.int(so))
                        |> pog.parameter(pog.text(sk_trim))
                        |> pog.parameter(pog.text(mime))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "insert_failed")
                        Ok(r) -> add_image_response(r)
                      }
                    None ->
                      case
                        pog.query(
                          "insert into listing_images (listing_id, sort_order, storage_key, original_mime) values ($1::uuid, (select coalesce(max(sort_order), -1) + 1 from listing_images where listing_id = $1::uuid), $2, case when $3 = '' then null else $3 end) returning id::text",
                        )
                        |> pog.parameter(pog.text(string.trim(listing_id)))
                        |> pog.parameter(pog.text(sk_trim))
                        |> pog.parameter(pog.text(mime))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "insert_failed")
                        Ok(r) -> add_image_response(r)
                      }
                  }
                }
              }
            }
          }
      }
  }
}

fn add_image_response(r: pog.Returned(String)) -> Response {
  case r.rows {
    [id] -> {
      let body =
        json.object([#("id", json.string(id))])
        |> json.to_string
      wisp.json_response(body, 201)
    }
    _ -> json_err(500, "unexpected_return")
  }
}

/// DELETE /api/v1/listings/:lid/images/:image_id
pub fn delete_image(
  req: Request,
  ctx: Context,
  listing_id: String,
  image_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_listing_manage_access(req, ctx, listing_id) {
    Error(r) -> r
    Ok(Nil) ->
      case
        pog.query(
          "delete from listing_images where listing_id = $1::uuid and id = $2::uuid returning storage_key",
        )
        |> pog.parameter(pog.text(string.trim(listing_id)))
        |> pog.parameter(pog.text(string.trim(image_id)))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(r) ->
          case r.rows {
            [] -> json_err(404, "not_found")
            [storage_key] -> {
              let body =
                json.object([
                  #("ok", json.bool(True)),
                  #("deleted_storage_key", json.string(storage_key)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected")
          }
      }
  }
}

fn reorder_decoder() -> decode.Decoder(List(String)) {
  decode.field("ordered_image_ids", decode.list(decode.string), fn(ids) {
    decode.success(ids)
  })
}

/// PATCH /api/v1/listings/:id/images/order — göreli sıra (sürükle-bırak / alfabetik UI).
pub fn reorder_images(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_listing_manage_access(req, ctx, listing_id) {
    Error(r) -> r
    Ok(Nil) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, reorder_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(ids) ->
              case list.is_empty(ids) {
                True -> json_err(400, "ordered_image_ids_required")
                False ->
                  case
                    pog.transaction(ctx.db, fn(conn) {
                      reorder_loop(conn, string.trim(listing_id), ids, 0)
                    })
                  {
                    Ok(_) -> {
                      let out =
                        json.object([#("ok", json.bool(True))])
                        |> json.to_string
                      wisp.json_response(out, 200)
                    }
                    Error(pog.TransactionQueryError(_)) ->
                      json_err(500, "reorder_failed")
                    Error(pog.TransactionRolledBack(msg)) ->
                      json_err(400, msg)
                  }
              }
          }
      }
  }
}

fn reorder_loop(
  conn: pog.Connection,
  listing_id: String,
  ids: List(String),
  idx: Int,
) -> Result(Nil, String) {
  case ids {
    [] -> Ok(Nil)
    [img_id, ..rest] -> {
      case
        pog.query(
          "update listing_images set sort_order = $3 where listing_id = $1::uuid and id = $2::uuid returning id::text",
        )
        |> pog.parameter(pog.text(listing_id))
        |> pog.parameter(pog.text(string.trim(img_id)))
        |> pog.parameter(pog.int(idx))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(conn)
      {
        Error(_) -> Error("update_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> Error("unknown_image_id")
            [_] -> reorder_loop(conn, listing_id, rest, idx + 1)
            _ -> Error("unexpected")
          }
      }
    }
  }
}

fn patch_scene_decoder() -> decode.Decoder(String) {
  decode.optional_field("scene_code", "", decode.string, fn(s) { decode.success(s) })
}

/// PATCH /api/v1/listings/:lid/images/:image_id — vitrin sahnesi (boş string = temizle)
pub fn patch_image_scene(
  req: Request,
  ctx: Context,
  listing_id: String,
  image_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_listing_manage_access(req, ctx, listing_id) {
    Error(r) -> r
    Ok(Nil) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_scene_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(scene_raw) -> {
              let scene = string.trim(scene_raw)
              case
                pog.query(
                  "update listing_images set scene_code = nullif($3, '') where listing_id = $1::uuid and id = $2::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(listing_id)))
                |> pog.parameter(pog.text(string.trim(image_id)))
                |> pog.parameter(pog.text(scene))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "scene_update_failed")
                Ok(r) ->
                  case r.rows {
                    [] -> json_err(404, "not_found")
                    [id] -> {
                      let out =
                        json.object([#("ok", json.bool(True)), #("id", json.string(id))])
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

/// GET /api/v1/catalog/public/listings/:id/images — yalnızca status=published ilanlar
pub fn list_public_images(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text from listings where id = $1::uuid and status = 'published' limit 1",
    )
    |> pog.parameter(pog.text(string.trim(listing_id)))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "publish_check_failed")
    Ok(pub_row) ->
      case pub_row.rows {
        [] -> json_err(404, "listing_not_public")
        _ ->
          case
            pog.query(
              "select li.id::text, li.sort_order, li.storage_key, coalesce(li.original_mime, ''), coalesce(li.alt_text_key, ''), li.created_at::text, coalesce(li.scene_code, '') from listing_images li inner join listings l on l.id = li.listing_id where li.listing_id = $1::uuid and l.status = 'published' order by li.sort_order asc, li.created_at asc",
            )
            |> pog.parameter(pog.text(string.trim(listing_id)))
            |> pog.returning(img_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "images_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, img_json)
              let body =
                json.object([#("images", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}
