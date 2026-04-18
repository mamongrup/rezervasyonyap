//// Entegrasyon hesapları, senkron günlüğü, Merchant, WhatsApp niyet (160_integrations).

import backend/context.{type Context}
import travel/identity/permissions
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/int
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

fn account_row_public() -> decode.Decoder(#(String, String, String, Bool, String, String)) {
  use id <- decode.field(0, decode.string)
  use pc <- decode.field(1, decode.string)
  use oid <- decode.field(2, decode.string)
  use has_sec <- decode.field(3, decode.bool)
  use ia <- decode.field(4, decode.string)
  use ej <- decode.field(5, decode.string)
  decode.success(#(id, pc, oid, has_sec, ia, ej))
}

fn account_json_public(row: #(String, String, String, Bool, String, String)) -> json.Json {
  let #(id, pc, oid, has_sec, ia, ej) = row
  let oidj = case oid == "" {
    True -> json.null()
    False -> json.string(oid)
  }
  json.object([
    #("id", json.string(id)),
    #("provider_code", json.string(pc)),
    #("organization_id", oidj),
    #("secret_configured", json.bool(has_sec)),
    #("is_active", json.string(ia)),
    #("extra_json", json.string(ej)),
  ])
}

fn require_integration_permission(
  req: Request,
  ctx: Context,
  code: String,
) -> Result(String, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, code) {
        True -> Ok(uid)
        False -> Error(json_err(403, "forbidden"))
      }
  }
}

/// GET /api/v1/integrations/accounts?organization_id= — `admin.integrations.read`
pub fn list_integration_accounts(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_integration_permission(req, ctx, "admin.integrations.read") {
    Error(r) -> r
    Ok(_) -> {
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  let sql = case org == "" {
    True ->
      "select id::text, provider_code, coalesce(organization_id::text,''), (config_secret_ref is not null and config_secret_ref <> ''), is_active::text, coalesce(extra_json::text,'{}') from integration_accounts order by provider_code limit 200"
    False ->
      "select id::text, provider_code, coalesce(organization_id::text,''), (config_secret_ref is not null and config_secret_ref <> ''), is_active::text, coalesce(extra_json::text,'{}') from integration_accounts where organization_id = $1::uuid order by provider_code limit 200"
  }
  let exec = case org == "" {
    True ->
      pog.query(sql)
      |> pog.returning(account_row_public())
      |> pog.execute(ctx.db)
    False ->
      pog.query(sql)
      |> pog.parameter(pog.text(org))
      |> pog.returning(account_row_public())
      |> pog.execute(ctx.db)
  }
  case exec {
    Error(_) -> json_err(500, "integration_accounts_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, account_json_public)
      let body =
        json.object([#("accounts", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
    }
  }
}

fn account_create_decoder() -> decode.Decoder(#(String, Option(String), String, Bool, String)) {
  decode.field("provider_code", decode.string, fn(pc) {
    decode.optional_field("organization_id", "", decode.string, fn(oid) {
      decode.field("config_secret_ref", decode.string, fn(sr) {
        decode.optional_field("is_active", True, decode.bool, fn(ia) {
          decode.optional_field("extra_json", "{}", decode.string, fn(ej) {
            let o = case string.trim(oid) == "" {
              True -> None
              False -> Some(string.trim(oid))
            }
            decode.success(#(pc, o, sr, ia, ej))
          })
        })
      })
    })
  })
}

/// POST /api/v1/integrations/accounts — `admin.integrations.write`
pub fn create_integration_account(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_integration_permission(req, ctx, "admin.integrations.write") {
    Error(r) -> r
    Ok(_) ->
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, account_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(pc, org_opt, sr, ia, ej_raw)) ->
          case string.trim(pc) == "" || string.trim(sr) == "" {
            True -> json_err(400, "provider_and_secret_required")
            False -> {
              let ej = case string.trim(ej_raw) == "" {
                True -> "{}"
                False -> string.trim(ej_raw)
              }
              let org_p = case org_opt {
                None -> pog.null()
                Some(o) -> pog.text(o)
              }
              case
                pog.query(
                  "insert into integration_accounts (provider_code, organization_id, config_secret_ref, is_active, extra_json) values ($1, $2::uuid, $3, $4, $5::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(pc)))
                |> pog.parameter(org_p)
                |> pog.parameter(pog.text(string.trim(sr)))
                |> pog.parameter(pog.bool(ia))
                |> pog.parameter(pog.text(ej))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "integration_account_create_failed")
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

fn account_patch_decoder() -> decode.Decoder(#(Option(Bool), Option(String), Option(String))) {
  decode.optional_field("is_active", None, decode.optional(decode.bool), fn(ia) {
    decode.optional_field("extra_json", None, decode.optional(decode.string), fn(ej) {
      decode.optional_field("config_secret_ref", None, decode.optional(decode.string), fn(sr) {
        decode.success(#(ia, ej, sr))
      })
    })
  })
}

/// PATCH /api/v1/integrations/accounts/:account_id — `admin.integrations.write`
pub fn patch_integration_account(req: Request, ctx: Context, account_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_integration_permission(req, ctx, "admin.integrations.write") {
    Error(r) -> r
    Ok(_) ->
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, account_patch_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(ia_opt, ej_opt, sr_opt)) ->
          case ia_opt, ej_opt, sr_opt {
            None, None, None -> json_err(400, "no_fields")
            _, _, _ -> {
              let p_ia = case ia_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              let p_ej = case ej_opt {
                None -> pog.null()
                Some(s) ->
                  pog.text(case string.trim(s) == "" {
                    True -> "{}"
                    False -> string.trim(s)
                  })
              }
              let p_sr = case sr_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              case
                pog.query(
                  "update integration_accounts set is_active = coalesce($2::boolean, is_active), extra_json = coalesce($3::jsonb, extra_json), config_secret_ref = coalesce($4::text, config_secret_ref) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(account_id)))
                |> pog.parameter(p_ia)
                |> pog.parameter(p_ej)
                |> pog.parameter(p_sr)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "integration_account_update_failed")
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

fn sync_log_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use op <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use dj <- decode.field(3, decode.string)
  use ca <- decode.field(4, decode.string)
  decode.success(#(id, op, st, dj, ca))
}

fn sync_log_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, op, st, dj, ca) = row
  json.object([
    #("id", json.string(id)),
    #("operation", json.string(op)),
    #("status", json.string(st)),
    #("detail_json", json.string(dj)),
    #("created_at", json.string(ca)),
  ])
}

/// GET /api/v1/integrations/sync-logs?integration_account_id= — `admin.integrations.read`
pub fn list_sync_logs(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_integration_permission(req, ctx, "admin.integrations.read") {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let aid =
        list.key_find(qs, "integration_account_id")
        |> result.unwrap("")
        |> string.trim
      case aid == "" {
        True -> json_err(400, "integration_account_id_required")
        False ->
          case
            pog.query(
              "select id::text, operation, status, coalesce(detail_json::text,'{}'), created_at::text from integration_sync_logs where integration_account_id = $1::uuid order by id desc limit 200",
            )
            |> pog.parameter(pog.text(aid))
            |> pog.returning(sync_log_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "sync_logs_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, sync_log_json)
              let body =
                json.object([#("logs", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
    }
  }
}

fn sync_log_create_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.field("integration_account_id", decode.string, fn(aid) {
    decode.field("operation", decode.string, fn(op) {
      decode.field("status", decode.string, fn(st) {
        decode.optional_field("detail_json", "{}", decode.string, fn(dj) {
          decode.success(#(aid, op, st, string.trim(dj)))
        })
      })
    })
  })
}

/// POST /api/v1/integrations/sync-logs — `admin.integrations.write`
pub fn create_sync_log(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_integration_permission(req, ctx, "admin.integrations.write") {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, sync_log_create_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(aid, op, st, dj_raw)) ->
              case string.trim(aid) == "" || string.trim(op) == "" || string.trim(st) == "" {
                True -> json_err(400, "account_operation_status_required")
                False -> {
                  let dj = case dj_raw == "" {
                    True -> "{}"
                    False -> dj_raw
                  }
                  case
                    pog.query(
                      "insert into integration_sync_logs (integration_account_id, operation, status, detail_json) values ($1::uuid, $2, $3, $4::jsonb) returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(aid)))
                    |> pog.parameter(pog.text(string.trim(op)))
                    |> pog.parameter(pog.text(string.trim(st)))
                    |> pog.parameter(pog.text(dj))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "sync_log_insert_failed")
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

fn gmp_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use lid <- decode.field(1, decode.string)
  use mpid <- decode.field(2, decode.string)
  use lpa <- decode.field(3, decode.string)
  use st <- decode.field(4, decode.string)
  decode.success(#(id, lid, mpid, lpa, st))
}

fn gmp_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, lid, mpid, lpa, st) = row
  let mpidj = case mpid == "" {
    True -> json.null()
    False -> json.string(mpid)
  }
  let lpaj = case lpa == "" {
    True -> json.null()
    False -> json.string(lpa)
  }
  json.object([
    #("id", json.string(id)),
    #("listing_id", json.string(lid)),
    #("merchant_product_id", mpidj),
    #("last_push_at", lpaj),
    #("status", json.string(st)),
  ])
}

/// GET /api/v1/integrations/google-merchant-products?listing_id= — `admin.integrations.read`
pub fn list_google_merchant_products(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_integration_permission(req, ctx, "admin.integrations.read") {
    Error(r) -> r
    Ok(_) -> {
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
        False ->
          case
            pog.query(
              "select id::text, listing_id::text, coalesce(merchant_product_id,''), coalesce(last_push_at::text,''), status from google_merchant_products where listing_id = $1::uuid order by id",
            )
            |> pog.parameter(pog.text(lid))
            |> pog.returning(gmp_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "gmp_query_failed")
            Ok(ret) -> {
              let arr = list.map(ret.rows, gmp_json)
              let body =
                json.object([#("products", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
    }
  }
}

fn gmp_upsert_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("listing_id", decode.string, fn(lid) {
    decode.optional_field("merchant_product_id", "", decode.string, fn(mpid) {
      decode.optional_field("status", "pending", decode.string, fn(st) {
        decode.success(#(lid, mpid, st))
      })
    })
  })
}

/// POST /api/v1/integrations/google-merchant-products — `admin.integrations.write`
pub fn upsert_google_merchant_product(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_integration_permission(req, ctx, "admin.integrations.write") {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, gmp_upsert_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(lid, mpid_raw, st)) ->
              case string.trim(lid) == "" {
                True -> json_err(400, "listing_id_required")
                False -> {
                  let mp_p = case string.trim(mpid_raw) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(mpid_raw))
                  }
                  case
                    pog.query(
                      "insert into google_merchant_products (listing_id, merchant_product_id, status) values ($1::uuid, $2, $3) returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(lid)))
                    |> pog.parameter(mp_p)
                    |> pog.parameter(pog.text(string.trim(st)))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "gmp_insert_failed")
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

fn gmp_patch_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String)),
) {
  decode.optional_field("merchant_product_id", None, decode.optional(decode.string), fn(mp) {
    decode.optional_field("status", None, decode.optional(decode.string), fn(st) {
      decode.optional_field("last_push_at", None, decode.optional(decode.string), fn(lp) {
        decode.success(#(mp, st, lp))
      })
    })
  })
}

/// PATCH /api/v1/integrations/google-merchant-products/:product_id — `admin.integrations.write`
pub fn patch_google_merchant_product(req: Request, ctx: Context, product_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_integration_permission(req, ctx, "admin.integrations.write") {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, gmp_patch_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(mp_opt, st_opt, lp_opt)) ->
              case mp_opt, st_opt, lp_opt {
                None, None, None -> json_err(400, "no_fields")
                _, _, _ -> {
                  let p_mp = case mp_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_st = case st_opt {
                    None -> pog.null()
                    Some(s) -> pog.text(string.trim(s))
                  }
                  let p_lp = case lp_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  case
                    pog.query(
                      "update google_merchant_products set merchant_product_id = coalesce($2::text, merchant_product_id), status = coalesce($3::text, status), last_push_at = coalesce($4::timestamptz, last_push_at) where id = $1::uuid returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(product_id)))
                    |> pog.parameter(p_mp)
                    |> pog.parameter(p_st)
                    |> pog.parameter(p_lp)
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "gmp_update_failed")
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

fn wa_intent_decoder() -> decode.Decoder(#(String, Option(String), String)) {
  decode.field("phone", decode.string, fn(ph) {
    decode.optional_field("cart_id", "", decode.string, fn(cid) {
      decode.optional_field("payload_json", "{}", decode.string, fn(pj) {
        let c = case string.trim(cid) == "" {
          True -> None
          False -> Some(string.trim(cid))
        }
        decode.success(#(ph, c, string.trim(pj)))
      })
    })
  })
}

fn cart_exists(conn: pog.Connection, cart_id: String) -> Bool {
  case
    pog.query(
      "select 1::text from carts where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(cart_id)))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) -> ret.rows != []
  }
}

/// POST /api/v1/integrations/whatsapp-order-intents — herkese açık (tıkla-WhatsApp); `cart_id` verilirse sepet doğrulanır.
pub fn create_whatsapp_order_intent(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, wa_intent_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(ph, cart_opt, pj_raw)) ->
          case string.trim(ph) == "" {
            True -> json_err(400, "phone_required")
            False -> {
              let cart_ok = case cart_opt {
                None -> True
                Some(cid) -> cart_exists(ctx.db, cid)
              }
              case cart_ok {
                False -> json_err(400, "invalid_cart_id")
                True -> {
                  let pj = case pj_raw == "" {
                    True -> "{}"
                    False -> pj_raw
                  }
                  let cart_p = case cart_opt {
                    None -> pog.null()
                    Some(c) -> pog.text(string.trim(c))
                  }
                  case
                    pog.query(
                      "insert into whatsapp_order_intents (phone, cart_id, payload_json) values ($1, $2::uuid, $3::jsonb) returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(ph)))
                    |> pog.parameter(cart_p)
                    |> pog.parameter(pog.text(pj))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "whatsapp_intent_insert_failed")
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

fn wa_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use ph <- decode.field(1, decode.string)
  use cid <- decode.field(2, decode.string)
  use pj <- decode.field(3, decode.string)
  use ca <- decode.field(4, decode.string)
  decode.success(#(id, ph, cid, pj, ca))
}

/// GET /api/v1/integrations/whatsapp-order-intents?limit= —
/// `admin.integrations.read` veya `admin.users.read` (mesajlaşma kataloğu ile aynı seviye).
pub fn list_whatsapp_order_intents(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) -> {
      let can_read =
        permissions.user_has_permission(ctx.db, uid, "admin.integrations.read")
        || permissions.user_has_permission(ctx.db, uid, "admin.users.read")
      case can_read {
        False -> json_err(403, "forbidden")
        True -> {
          let qs = case request.get_query(req) {
            Ok(q) -> q
            Error(_) -> []
          }
          let lim_str =
            list.key_find(qs, "limit")
            |> result.unwrap("50")
            |> string.trim
          let lim = case int.parse(lim_str) {
            Ok(n) -> n
            Error(_) -> 50
          }
          let cap = case lim > 200 {
            True -> 200
            False ->
              case lim < 1 {
                True -> 1
                False -> lim
              }
          }
          case
            pog.query(
              "select id::text, phone, coalesce(cart_id::text,''), coalesce(payload_json::text,'{}'), created_at::text from whatsapp_order_intents order by created_at desc limit $1",
            )
            |> pog.parameter(pog.int(cap))
            |> pog.returning(wa_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "whatsapp_intents_query_failed")
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(r) {
                  let #(id, ph, cid, pj, ca) = r
                  let cidj = case cid == "" {
                    True -> json.null()
                    False -> json.string(cid)
                  }
                  json.object([
                    #("id", json.string(id)),
                    #("phone", json.string(ph)),
                    #("cart_id", cidj),
                    #("payload_json", json.string(pj)),
                    #("created_at", json.string(ca)),
                  ])
                })
              let body =
                json.object([#("intents", json.array(from: arr, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
      }
    }
  }
}
