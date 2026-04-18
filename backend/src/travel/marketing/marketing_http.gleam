//// Kampanya, kupon, çapraz satış kuralları (070_marketing).

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

// --- Kuponlar ---

fn coupon_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use dt <- decode.field(2, decode.string)
  use dv <- decode.field(3, decode.string)
  use mx <- decode.field(4, decode.string)
  use uc <- decode.field(5, decode.string)
  use vf <- decode.field(6, decode.string)
  use vt <- decode.field(7, decode.string)
  use cr <- decode.field(8, decode.string)
  decode.success(#(id, code, dt, dv, mx, uc, vf, vt, cr))
}

fn coupon_json(
  row: #(String, String, String, String, String, String, String, String, String),
) -> json.Json {
  let #(id, code, dt, dv, mx, uc, vf, vt, cr) = row
  let mxj = case mx == "" {
    True -> json.null()
    False -> json.string(mx)
  }
  let vfj = case vf == "" {
    True -> json.null()
    False -> json.string(vf)
  }
  let vtj = case vt == "" {
    True -> json.null()
    False -> json.string(vt)
  }
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("discount_type", json.string(dt)),
    #("discount_value", json.string(dv)),
    #("max_uses", mxj),
    #("used_count", json.string(uc)),
    #("valid_from", vfj),
    #("valid_to", vtj),
    #("created_at", json.string(cr)),
  ])
}

/// GET /api/v1/marketing/coupons — `admin.users.read`
pub fn list_coupons(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select id::text, code, discount_type, discount_value::text, coalesce(max_uses::text,''), used_count::text, coalesce(valid_from::text,''), coalesce(valid_to::text,''), created_at::text from coupons order by created_at desc limit 500",
        )
        |> pog.returning(coupon_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "coupons_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, coupon_json)
          let body =
            json.object([#("coupons", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_coupon_decoder() -> decode.Decoder(
  #(String, String, String, Option(Int), Option(String), Option(String)),
) {
  decode.field("code", decode.string, fn(code) {
    decode.field("discount_type", decode.string, fn(dt) {
      decode.field("discount_value", decode.string, fn(dv) {
        decode.optional_field("max_uses", -1, decode.int, fn(mx) {
          decode.optional_field("valid_from", "", decode.string, fn(vf) {
            decode.optional_field("valid_to", "", decode.string, fn(vt) {
              let mx_opt = case mx < 0 {
                True -> None
                False -> Some(mx)
              }
              decode.success(#(
                string.trim(code),
                string.trim(dt),
                string.trim(dv),
                mx_opt,
                case string.trim(vf) == "" {
                  True -> None
                  False -> Some(string.trim(vf))
                },
                case string.trim(vt) == "" {
                  True -> None
                  False -> Some(string.trim(vt))
                },
              ))
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/marketing/coupons — `admin.users.read`
pub fn create_coupon(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_coupon_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(code, dt, dv, mx_opt, vf_opt, vt_opt)) -> {
          let dt_l = string.lowercase(string.trim(dt))
          case code == "" || dt_l == "" || string.trim(dv) == "" {
            True -> json_err(400, "code_type_value_required")
            False ->
              case dt_l == "percent" || dt_l == "fixed" {
                False -> json_err(400, "invalid_discount_type")
                True -> {
                  let mx_p = case mx_opt {
                    None -> pog.null()
                    Some(n) -> pog.int(n)
                  }
                  let vf_p = case vf_opt {
                    None -> pog.null()
                    Some(s) -> pog.text(s)
                  }
                  let vt_p = case vt_opt {
                    None -> pog.null()
                    Some(s) -> pog.text(s)
                  }
                  case
                    pog.query(
                      "insert into coupons (code, discount_type, discount_value, max_uses, valid_from, valid_to) values ($1, $2, $3::numeric, $4::int, $5::timestamptz, $6::timestamptz) returning id::text",
                    )
                    |> pog.parameter(pog.text(code))
                    |> pog.parameter(pog.text(dt_l))
                    |> pog.parameter(pog.text(string.trim(dv)))
                    |> pog.parameter(mx_p)
                    |> pog.parameter(vf_p)
                    |> pog.parameter(vt_p)
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(409, "coupon_create_failed")
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

fn patch_coupon_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String), Option(Int), Option(String), Option(String)),
) {
  decode.optional_field("code", None, decode.optional(decode.string), fn(c) {
    decode.optional_field("discount_type", None, decode.optional(decode.string), fn(dt) {
      decode.optional_field("discount_value", None, decode.optional(decode.string), fn(dv) {
        decode.optional_field("max_uses", None, decode.optional(decode.int), fn(mx) {
          decode.optional_field("valid_from", None, decode.optional(decode.string), fn(vf) {
            decode.optional_field("valid_to", None, decode.optional(decode.string), fn(vt) {
              decode.success(#(c, dt, dv, mx, vf, vt))
            })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/marketing/coupons/:id — `admin.users.read`
pub fn patch_coupon(req: Request, ctx: Context, coupon_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_coupon_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(c_opt, dt_opt, dv_opt, mx_opt, vf_opt, vt_opt)) ->
          case c_opt, dt_opt, dv_opt, mx_opt, vf_opt, vt_opt {
            None, None, None, None, None, None -> json_err(400, "no_fields")
            _, _, _, _, _, _ -> {
              let p_c = case c_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_dt = case dt_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.lowercase(string.trim(s)))
                  }
              }
              let p_dv = case dv_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_mx = case mx_opt {
                None -> pog.null()
                Some(n) -> pog.int(n)
              }
              let p_vf = case vf_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              let p_vt = case vt_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              case
                pog.query(
                  "update coupons set code = coalesce($2::text, code), discount_type = coalesce($3::text, discount_type), discount_value = coalesce($4::numeric, discount_value), max_uses = coalesce($5::int, max_uses), valid_from = coalesce($6::timestamptz, valid_from), valid_to = coalesce($7::timestamptz, valid_to) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(coupon_id)))
                |> pog.parameter(p_c)
                |> pog.parameter(p_dt)
                |> pog.parameter(p_dv)
                |> pog.parameter(p_mx)
                |> pog.parameter(p_vf)
                |> pog.parameter(p_vt)
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

/// DELETE /api/v1/marketing/coupons/:id — `admin.users.read`
pub fn delete_coupon(req: Request, ctx: Context, coupon_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from coupons where id = $1::uuid")
        |> pog.parameter(pog.text(string.trim(coupon_id)))
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

// --- Kampanyalar ---

fn campaign_row() -> decode.Decoder(#(String, String, String, String, String, String, String, Bool)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use ct <- decode.field(2, decode.string)
  use name <- decode.field(3, decode.string)
  use rules <- decode.field(4, decode.string)
  use st <- decode.field(5, decode.string)
  use en <- decode.field(6, decode.string)
  use active <- decode.field(7, decode.bool)
  decode.success(#(id, code, ct, name, rules, st, en, active))
}

fn campaign_json(
  row: #(String, String, String, String, String, String, String, Bool),
) -> json.Json {
  let #(id, code, ct, name, rules, st, en, active) = row
  let stj = case st == "" {
    True -> json.null()
    False -> json.string(st)
  }
  let enj = case en == "" {
    True -> json.null()
    False -> json.string(en)
  }
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("campaign_type", json.string(ct)),
    #("name", json.string(name)),
    #("rules_json", json.string(rules)),
    #("starts_at", stj),
    #("ends_at", enj),
    #("is_active", json.bool(active)),
  ])
}

/// GET /api/v1/marketing/campaigns — `admin.users.read`
pub fn list_campaigns(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select id::text, code, campaign_type, name, rules_json::text, coalesce(starts_at::text,''), coalesce(ends_at::text,''), is_active from campaigns order by created_at desc limit 200",
        )
        |> pog.returning(campaign_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "campaigns_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, campaign_json)
          let body =
            json.object([#("campaigns", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_campaign_decoder() -> decode.Decoder(
  #(String, String, String, String, Option(String), Option(String), Bool),
) {
  decode.field("code", decode.string, fn(code) {
    decode.field("campaign_type", decode.string, fn(ct) {
      decode.field("name", decode.string, fn(name) {
        decode.optional_field("rules_json", "{}", decode.string, fn(rules) {
          decode.optional_field("starts_at", "", decode.string, fn(st) {
            decode.optional_field("ends_at", "", decode.string, fn(en) {
              decode.optional_field("is_active", True, decode.bool, fn(active) {
                decode.success(#(
                  string.trim(code),
                  string.trim(ct),
                  string.trim(name),
                  rules,
                  case string.trim(st) == "" {
                    True -> None
                    False -> Some(string.trim(st))
                  },
                  case string.trim(en) == "" {
                    True -> None
                    False -> Some(string.trim(en))
                  },
                  active,
                ))
              })
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/marketing/campaigns — `admin.users.read`
pub fn create_campaign(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_campaign_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(code, ct, name, rules, st_opt, en_opt, active)) ->
          case code == "" || string.trim(ct) == "" || name == "" {
            True -> json_err(400, "code_type_name_required")
            False -> {
              let cfg = case string.trim(rules) == "" {
                True -> "{}"
                False -> string.trim(rules)
              }
              let st_p = case st_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              let en_p = case en_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              case
                pog.query(
                  "insert into campaigns (code, campaign_type, name, rules_json, starts_at, ends_at, is_active) values ($1, $2, $3, $4::jsonb, $5::timestamptz, $6::timestamptz, $7) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(code)))
                |> pog.parameter(pog.text(string.trim(ct)))
                |> pog.parameter(pog.text(name))
                |> pog.parameter(pog.text(cfg))
                |> pog.parameter(st_p)
                |> pog.parameter(en_p)
                |> pog.parameter(pog.bool(active))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "campaign_create_failed")
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

// --- Çapraz satış kuralları ---

fn cross_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use tr <- decode.field(1, decode.string)
  use of <- decode.field(2, decode.string)
  use mk <- decode.field(3, decode.string)
  use dp <- decode.field(4, decode.string)
  use pr <- decode.field(5, decode.string)
  decode.success(#(id, tr, of, mk, dp, pr))
}

fn cross_json(row: #(String, String, String, String, String, String)) -> json.Json {
  let #(id, tr, of, mk, dp, pr) = row
  let mkj = case mk == "" {
    True -> json.null()
    False -> json.string(mk)
  }
  let dpj = case dp == "" {
    True -> json.null()
    False -> json.string(dp)
  }
  json.object([
    #("id", json.string(id)),
    #("trigger_category_code", json.string(tr)),
    #("offer_category_code", json.string(of)),
    #("message_key", mkj),
    #("discount_percent", dpj),
    #("priority", json.string(pr)),
  ])
}

/// GET /api/v1/marketing/cross-sell-rules — `admin.users.read`
pub fn list_cross_sell_rules(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select id::text, trigger_category_code, offer_category_code, coalesce(message_key,''), coalesce(discount_percent::text,''), priority::text from cross_sell_rules order by priority desc, id limit 500",
        )
        |> pog.returning(cross_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "cross_sell_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, cross_json)
          let body =
            json.object([#("rules", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_cross_decoder() -> decode.Decoder(#(String, String, Option(String), Option(String), Int)) {
  decode.field("trigger_category_code", decode.string, fn(tr) {
    decode.field("offer_category_code", decode.string, fn(of) {
      decode.optional_field("message_key", "", decode.string, fn(mk) {
        decode.optional_field("discount_percent", "", decode.string, fn(dp) {
          decode.optional_field("priority", 0, decode.int, fn(pr) {
            let mk = case string.trim(mk) == "" {
              True -> None
              False -> Some(string.trim(mk))
            }
            let dpp = case string.trim(dp) == "" {
              True -> None
              False -> Some(string.trim(dp))
            }
            decode.success(#(string.trim(tr), string.trim(of), mk, dpp, pr))
          })
        })
      })
    })
  })
}

/// POST /api/v1/marketing/cross-sell-rules — `admin.users.read`
pub fn create_cross_sell_rule(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_cross_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(tr, of, mk_opt, dp_opt, pr)) ->
          case tr == "" || of == "" {
            True -> json_err(400, "trigger_and_offer_required")
            False -> {
              let mk_p = case mk_opt {
                None -> pog.null()
                Some(m) -> pog.text(m)
              }
              let dp_p = case dp_opt {
                None -> pog.null()
                Some(d) -> pog.text(d)
              }
              case
                pog.query(
                  "insert into cross_sell_rules (trigger_category_code, offer_category_code, message_key, discount_percent, priority) values ($1, $2, $3, $4::numeric, $5) returning id::text",
                )
                |> pog.parameter(pog.text(tr))
                |> pog.parameter(pog.text(of))
                |> pog.parameter(mk_p)
                |> pog.parameter(dp_p)
                |> pog.parameter(pog.int(pr))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "cross_sell_create_failed")
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

/// GET /api/v1/marketing/public/cross-sell-suggestions?trigger_category=flight
/// Auth yok. `cross_sell_rules` çok yönlüdür: aynı tabloda uçak→konaklama, konaklama→uçak vb.
pub fn list_public_cross_sell_suggestions(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let tr =
    list.key_find(qs, "trigger_category")
    |> result.unwrap("")
    |> string.trim
  case tr == "" {
    True -> json_err(400, "trigger_category_required")
    False ->
      case
        pog.query(
          "select id::text, trigger_category_code, offer_category_code, coalesce(message_key,''), coalesce(discount_percent::text,''), priority::text from cross_sell_rules where trigger_category_code = $1 order by priority desc, id limit 100",
        )
        |> pog.parameter(pog.text(tr))
        |> pog.returning(cross_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "cross_sell_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, cross_json)
          let body =
            json.object([#("rules", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}
