//// Yorumlar ve harici özet anlık görüntüleri (120_reviews_moderation).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/int
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

fn bearer_token(req: Request) -> String {
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

fn user_id_for_token(ctx: Context, token: String) -> Option(String) {
  case string.trim(token) == "" {
    True -> None
    False ->
      case
        pog.query(
          "select u.id::text from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
        )
        |> pog.parameter(pog.text(token))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Ok(ret) ->
          case ret.rows {
            [id] -> Some(id)
            _ -> None
          }
        Error(_) -> None
      }
  }
}

fn review_row() -> decode.Decoder(
  #(String, String, String, String, Int, String, String, String, Bool, String, String),
) {
  use id <- decode.field(0, decode.string)
  use et <- decode.field(1, decode.string)
  use eid <- decode.field(2, decode.string)
  use uid <- decode.field(3, decode.string)
  use r <- decode.field(4, decode.int)
  use title <- decode.field(5, decode.string)
  use body <- decode.field(6, decode.string)
  use st <- decode.field(7, decode.string)
  use hvp <- decode.field(8, decode.bool)
  use pks <- decode.field(9, decode.string)
  use ca <- decode.field(10, decode.string)
  decode.success(#(id, et, eid, uid, r, title, body, st, hvp, pks, ca))
}

fn review_json(
  row: #(String, String, String, String, Int, String, String, String, Bool, String, String),
) -> json.Json {
  let #(id, et, eid, uid, r, title, body, st, hvp, pks, ca) = row
  let uidj = case uid == "" {
    True -> json.null()
    False -> json.string(uid)
  }
  let titlej = case title == "" {
    True -> json.null()
    False -> json.string(title)
  }
  let bodyj = case body == "" {
    True -> json.null()
    False -> json.string(body)
  }
  json.object([
    #("id", json.string(id)),
    #("entity_type", json.string(et)),
    #("entity_id", json.string(eid)),
    #("user_id", uidj),
    #("rating", json.int(r)),
    #("title", titlej),
    #("body", bodyj),
    #("status", json.string(st)),
    #("has_verified_purchase", json.bool(hvp)),
    #("photo_keys", json.string(pks)),
    #("created_at", json.string(ca)),
  ])
}

/// GET /api/v1/reviews/public/by-category?slug=oteller&limit=6
/// Bir kategoriye ait ilanların onaylı yorumlarını döndürür (public).
pub fn public_by_category(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let slug =
    list.key_find(qs, "slug")
    |> result.unwrap("")
    |> string.trim
  let limit =
    list.key_find(qs, "limit")
    |> result.unwrap("6")
    |> string.trim
  let limit_int = case int.parse(limit) {
    Ok(n) ->
      case n > 0 && n <= 50 {
        True -> n
        False -> 6
      }
    Error(_) -> 6
  }
  case slug == "" {
    True -> json_err(400, "slug_required")
    False ->
      case
        pog.query(
          "select r.id::text, coalesce(u.display_name, 'Misafir'), r.rating::int, coalesce(r.title,''), coalesce(r.body,''), r.created_at::text "
          <> "from reviews r "
          <> "join listings l on l.id = r.entity_id::uuid "
          <> "join product_categories pc on pc.id = l.category_id "
          <> "left join users u on u.id = r.user_id::uuid "
          <> "where r.entity_type = 'listing' "
          <> "  and r.status = 'approved' "
          <> "  and pc.code = $1 "
          <> "order by r.created_at desc "
          <> "limit $2",
        )
        |> pog.parameter(pog.text(slug))
        |> pog.parameter(pog.int(limit_int))
        |> pog.returning(public_review_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "reviews_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, public_review_json)
          let body =
            json.object([
              #("reviews", json.array(from: arr, of: fn(x) { x })),
              #("total", json.int(list.length(ret.rows))),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}


fn public_review_row() -> decode.Decoder(#(String, String, Int, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use name <- decode.field(1, decode.string)
  use rating <- decode.field(2, decode.int)
  use title <- decode.field(3, decode.string)
  use body <- decode.field(4, decode.string)
  use ca <- decode.field(5, decode.string)
  decode.success(#(id, name, rating, title, body, ca))
}

fn public_review_json(row: #(String, String, Int, String, String, String)) -> json.Json {
  let #(id, name, rating, title, body, ca) = row
  let titlej = case title == "" {
    True -> json.null()
    False -> json.string(title)
  }
  let bodyj = case body == "" {
    True -> json.null()
    False -> json.string(body)
  }
  json.object([
    #("id", json.string(id)),
    #("reviewer_name", json.string(name)),
    #("rating", json.int(rating)),
    #("title", titlej),
    #("body", bodyj),
    #("created_at", json.string(ca)),
  ])
}

/// GET /api/v1/reviews/admin?status=pending|approved|rejected|hidden|all&limit= — yönetici
pub fn list_reviews_admin(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let st =
        list.key_find(qs, "status")
        |> result.unwrap("pending")
        |> string.trim
        |> string.lowercase
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
      let run = fn(q) {
        q
        |> pog.returning(review_row())
        |> pog.execute(ctx.db)
      }
      case st {
        "all" ->
          case
            run(
              pog.query(
                "select id::text, entity_type, entity_id::text, coalesce(user_id::text,''), rating::int, coalesce(title,''), coalesce(body,''), status, has_verified_purchase, coalesce(photo_keys::text,'{}'), created_at::text from reviews order by created_at desc limit $1",
              )
              |> pog.parameter(pog.int(lim)),
            )
          {
            Error(_) -> json_err(500, "reviews_admin_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, review_json)
              let body =
                json.object([#("reviews", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        "pending" | "approved" | "rejected" | "hidden" ->
          case
            run(
              pog.query(
                "select id::text, entity_type, entity_id::text, coalesce(user_id::text,''), rating::int, coalesce(title,''), coalesce(body,''), status, has_verified_purchase, coalesce(photo_keys::text,'{}'), created_at::text from reviews where status = $1 order by created_at desc limit $2",
              )
              |> pog.parameter(pog.text(st))
              |> pog.parameter(pog.int(lim)),
            )
          {
            Error(_) -> json_err(500, "reviews_admin_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, review_json)
              let body =
                json.object([#("reviews", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        _ -> json_err(400, "invalid_status")
      }
    }
  }
}

fn moderation_status_decoder() -> decode.Decoder(String) {
  decode.field("status", decode.string, fn(s) { decode.success(string.trim(s)) })
}

/// PATCH /api/v1/reviews/:id/moderation — { "status": "approved" | "rejected" | "hidden" }
pub fn patch_review_moderation(req: Request, ctx: Context, review_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, moderation_status_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(st_raw) -> {
              let st_l = string.lowercase(st_raw)
              case st_l == "approved" || st_l == "rejected" || st_l == "hidden" {
                False -> json_err(400, "invalid_status")
                True ->
                  case
                    pog.query(
                      "update reviews set status = $1 where id = $2::uuid returning id::text",
                    )
                    |> pog.parameter(pog.text(st_l))
                    |> pog.parameter(pog.text(string.trim(review_id)))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "review_moderation_failed")
                    Ok(res) ->
                      case res.rows {
                        [] -> json_err(404, "not_found")
                        [id] -> {
                          let out =
                            json.object([
                              #("id", json.string(id)),
                              #("ok", json.bool(True)),
                              #("status", json.string(st_l)),
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

/// GET /api/v1/reviews?entity_type=&entity_id= — yalnızca onaylı
pub fn list_reviews(req: Request, ctx: Context) -> Response {
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
    True -> json_err(400, "entity_type_and_entity_id_required")
    False ->
      case
        pog.query(
          "select id::text, entity_type, entity_id::text, coalesce(user_id::text,''), rating::int, coalesce(title,''), coalesce(body,''), status, has_verified_purchase, coalesce(photo_keys::text,'{}'), created_at::text from reviews where entity_type = $1 and entity_id = $2::uuid and status = 'approved' order by created_at desc limit 200",
        )
        |> pog.parameter(pog.text(et))
        |> pog.parameter(pog.text(eid))
        |> pog.returning(review_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "reviews_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, review_json)
          let body =
            json.object([#("reviews", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_review_decoder() -> decode.Decoder(
  #(String, String, Int, String, String, Bool, List(String)),
) {
  decode.field("entity_type", decode.string, fn(et) {
    decode.field("entity_id", decode.string, fn(eid) {
      decode.field("rating", decode.int, fn(r) {
        decode.optional_field("title", "", decode.string, fn(t) {
          decode.optional_field("body", "", decode.string, fn(b) {
            decode.optional_field("has_verified_purchase", False, decode.bool, fn(hvp) {
              decode.optional_field("photo_keys", [], decode.list(decode.string), fn(
                pks,
              ) { decode.success(#(et, eid, r, t, b, hvp, pks)) })
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/reviews — pending; oturum varsa user_id bağlanır
pub fn create_review(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_review_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(et, eid, rating, title_raw, body_raw, hvp, pks)) -> {
          let r = rating
          case r < 1 || r > 5 {
            True -> json_err(400, "invalid_rating")
            False -> {
              let title_p = case string.trim(title_raw) == "" {
                True -> pog.null()
                False -> pog.text(string.trim(title_raw))
              }
              let body_p = case string.trim(body_raw) == "" {
                True -> pog.null()
                False -> pog.text(string.trim(body_raw))
              }
              let tok = bearer_token(req)
              let uid_p = case user_id_for_token(ctx, tok) {
                Some(uid) -> pog.text(uid)
                None -> pog.null()
              }
              case
                pog.query(
                  "insert into reviews (entity_type, entity_id, user_id, rating, title, body, status, has_verified_purchase, photo_keys) values ($1, $2::uuid, $3::uuid, $4::smallint, $5, $6, 'pending', $7, $8::text[]) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(et)))
                |> pog.parameter(pog.text(string.trim(eid)))
                |> pog.parameter(uid_p)
                |> pog.parameter(pog.int(r))
                |> pog.parameter(title_p)
                |> pog.parameter(body_p)
                |> pog.parameter(pog.bool(hvp))
                |> pog.parameter(pog.array(pog.text, pks))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "review_create_failed")
                Ok(res) ->
                  case res.rows {
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

/// GET /api/v1/reviews/mine — oturum açmış kullanıcının tüm durumları
pub fn list_my_reviews(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case user_id_for_token(ctx, bearer_token(req)) {
    None -> json_err(401, "missing_or_invalid_session")
    Some(uid) ->
      case
        pog.query(
          "select id::text, entity_type, entity_id::text, coalesce(user_id::text,''), rating::int, coalesce(title,''), coalesce(body,''), status, has_verified_purchase, coalesce(photo_keys::text,'{}'), created_at::text from reviews where user_id = $1::uuid order by created_at desc limit 200",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.returning(review_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "reviews_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, review_json)
          let body =
            json.object([#("reviews", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn patch_review_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(Int), Option(List(String))),
) {
  decode.optional_field("title", None, decode.optional(decode.string), fn(t) {
    decode.optional_field("body", None, decode.optional(decode.string), fn(b) {
      decode.optional_field("rating", None, decode.optional(decode.int), fn(r) {
        decode.optional_field("photo_keys", None, decode.optional(decode.list(decode.string)), fn(
          pks,
        ) { decode.success(#(t, b, r, pks)) })
      })
    })
  })
}

/// PATCH /api/v1/reviews/:id — yalnızca sahibi, yalnızca pending
pub fn patch_review(req: Request, ctx: Context, review_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case user_id_for_token(ctx, bearer_token(req)) {
    None -> json_err(401, "missing_or_invalid_session")
    Some(uid) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_review_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(t_opt, b_opt, r_opt, pk_opt)) ->
              case t_opt, b_opt, r_opt, pk_opt {
                None, None, None, None -> json_err(400, "no_fields")
                _, _, _, _ -> {
                  let p_t = case t_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_b = case b_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_r = case r_opt {
                    None -> pog.null()
                    Some(rv) ->
                      case rv < 1 || rv > 5 {
                        True -> pog.null()
                        False -> pog.int(rv)
                      }
                  }
                  let p_r_invalid = case r_opt {
                    Some(rv) -> rv < 1 || rv > 5
                    None -> False
                  }
                  case p_r_invalid {
                    True -> json_err(400, "invalid_rating")
                    False -> {
                      let p_pk = case pk_opt {
                        None -> pog.null()
                        Some(ks) -> pog.array(pog.text, ks)
                      }
                      case
                        pog.query(
                          "update reviews set title = coalesce($2::text, title), body = coalesce($3::text, body), rating = coalesce($4::smallint, rating), photo_keys = coalesce($5::text[], photo_keys) where id = $1::uuid and user_id = $6::uuid and status = 'pending' returning id::text",
                        )
                        |> pog.parameter(pog.text(string.trim(review_id)))
                        |> pog.parameter(p_t)
                        |> pog.parameter(p_b)
                        |> pog.parameter(p_r)
                        |> pog.parameter(p_pk)
                        |> pog.parameter(pog.text(uid))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "review_update_failed")
                        Ok(res) ->
                          case res.rows {
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

fn ext_snap_row() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use src <- decode.field(1, decode.string)
  use et <- decode.field(2, decode.string)
  use eid <- decode.field(3, decode.string)
  use sj <- decode.field(4, decode.string)
  use ai <- decode.field(5, decode.string)
  use fa <- decode.field(6, decode.string)
  decode.success(#(id, src, et, eid, sj, ai, fa))
}

fn ext_snap_json(row: #(String, String, String, String, String, String, String)) -> json.Json {
  let #(id, src, et, eid, sj, ai, fa) = row
  let aij = case ai == "" {
    True -> json.null()
    False -> json.string(ai)
  }
  json.object([
    #("id", json.string(id)),
    #("source", json.string(src)),
    #("entity_type", json.string(et)),
    #("entity_id", json.string(eid)),
    #("snapshot_json", json.string(sj)),
    #("ai_summary", aij),
    #("fetched_at", json.string(fa)),
  ])
}

/// GET /api/v1/reviews/external-snapshots?entity_type=&entity_id=
pub fn list_external_snapshots(req: Request, ctx: Context) -> Response {
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
    True -> json_err(400, "entity_type_and_entity_id_required")
    False ->
      case
        pog.query(
          "select id::text, source, entity_type, entity_id::text, snapshot_json::text, coalesce(ai_summary,''), fetched_at::text from external_review_snapshots where entity_type = $1 and entity_id = $2::uuid order by fetched_at desc limit 50",
        )
        |> pog.parameter(pog.text(et))
        |> pog.parameter(pog.text(eid))
        |> pog.returning(ext_snap_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "external_snapshots_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, ext_snap_json)
          let body =
            json.object([#("snapshots", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_ext_snap_decoder() -> decode.Decoder(#(String, String, String, String, String)) {
  decode.field("source", decode.string, fn(src) {
    decode.field("entity_type", decode.string, fn(et) {
      decode.field("entity_id", decode.string, fn(eid) {
        decode.field("snapshot_json", decode.string, fn(sj) {
          decode.optional_field("ai_summary", "", decode.string, fn(ai) {
            decode.success(#(src, et, eid, sj, ai))
          })
        })
      })
    })
  })
}

/// POST /api/v1/reviews/external-snapshots
pub fn create_external_snapshot(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_ext_snap_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(src, et, eid, sj_raw, ai_raw)) ->
          case string.trim(src) == "" || string.trim(et) == "" || string.trim(eid) == ""
          {
            True -> json_err(400, "source_entity_required")
            False -> {
              let sj = case string.trim(sj_raw) == "" {
                True -> "{}"
                False -> string.trim(sj_raw)
              }
              let ai_p = case string.trim(ai_raw) == "" {
                True -> pog.null()
                False -> pog.text(string.trim(ai_raw))
              }
              case
                pog.query(
                  "insert into external_review_snapshots (source, entity_type, entity_id, snapshot_json, ai_summary) values ($1, $2, $3::uuid, $4::jsonb, $5) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(src)))
                |> pog.parameter(pog.text(string.trim(et)))
                |> pog.parameter(pog.text(string.trim(eid)))
                |> pog.parameter(pog.text(sj))
                |> pog.parameter(ai_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "external_snapshot_create_failed")
                Ok(res) ->
                  case res.rows {
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
