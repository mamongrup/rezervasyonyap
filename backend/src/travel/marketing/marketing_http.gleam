//// Kampanya, kupon, çapraz satış kuralları (070_marketing).

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

fn coupon_row() -> decode.Decoder(
  #(
    String, String, String, String, String, String, String, String, String,
    String, String, String, String, Bool,
  ),
) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use dt <- decode.field(2, decode.string)
  use dv <- decode.field(3, decode.string)
  use mx <- decode.field(4, decode.string)
  use uc <- decode.field(5, decode.string)
  use vf <- decode.field(6, decode.string)
  use vt <- decode.field(7, decode.string)
  use cr <- decode.field(8, decode.string)
  use name <- decode.field(9, decode.string)
  use desc <- decode.field(10, decode.string)
  use n_tr <- decode.field(11, decode.string)
  use d_tr <- decode.field(12, decode.string)
  use is_pub <- decode.field(13, decode.bool)
  decode.success(#(id, code, dt, dv, mx, uc, vf, vt, cr, name, desc, n_tr, d_tr, is_pub))
}

fn coupon_json(
  row: #(
    String, String, String, String, String, String, String, String, String,
    String, String, String, String, Bool,
  ),
) -> json.Json {
  let #(id, code, dt, dv, mx, uc, vf, vt, cr, name, desc, n_tr, d_tr, is_pub) = row
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
  let n_tr_str = case string.trim(n_tr) == "" {
    True -> "{}"
    False -> n_tr
  }
  let d_tr_str = case string.trim(d_tr) == "" {
    True -> "{}"
    False -> d_tr
  }
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("name", json.string(name)),
    #("description", json.string(desc)),
    #("name_translations", json.string(n_tr_str)),
    #("description_translations", json.string(d_tr_str)),
    #("discount_type", json.string(dt)),
    #("discount_value", json.string(dv)),
    #("max_uses", mxj),
    #("used_count", json.string(uc)),
    #("valid_from", vfj),
    #("valid_to", vtj),
    #("is_public", json.bool(is_pub)),
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
          "select id::text, code, discount_type, discount_value::text, coalesce(max_uses::text,''), used_count::text, coalesce(valid_from::text,''), coalesce(valid_to::text,''), created_at::text, coalesce(name,''), coalesce(description,''), coalesce(name_translations::text,'{}'), coalesce(description_translations::text,'{}'), is_public from coupons order by created_at desc limit 500",
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
  #(
    String, String, String, Option(Int), Option(String), Option(String),
    String, String, String, String, Bool,
  ),
) {
  decode.field("code", decode.string, fn(code) {
    decode.field("discount_type", decode.string, fn(dt) {
      decode.field("discount_value", decode.string, fn(dv) {
        decode.optional_field("max_uses", -1, decode.int, fn(mx) {
          decode.optional_field("valid_from", "", decode.string, fn(vf) {
            decode.optional_field("valid_to", "", decode.string, fn(vt) {
              decode.optional_field("name", "", decode.string, fn(nm) {
                decode.optional_field("description", "", decode.string, fn(ds) {
                  decode.optional_field("name_translations", "{}", decode.string, fn(ntr) {
                    decode.optional_field("description_translations", "{}", decode.string, fn(dtr) {
                      decode.optional_field("is_public", False, decode.bool, fn(is_pub) {
                        let mx_opt = case mx < 0 {
                          True -> None
                          False -> Some(mx)
                        }
                        let ntr_str = case string.trim(ntr) == "" {
                          True -> "{}"
                          False -> string.trim(ntr)
                        }
                        let dtr_str = case string.trim(dtr) == "" {
                          True -> "{}"
                          False -> string.trim(dtr)
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
                          string.trim(nm),
                          string.trim(ds),
                          ntr_str,
                          dtr_str,
                          is_pub,
                        ))
                      })
                    })
                  })
                })
              })
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
        Ok(#(code, dt, dv, mx_opt, vf_opt, vt_opt, name, desc, ntr, dtr, is_pub)) -> {
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
                      "insert into coupons (code, discount_type, discount_value, max_uses, valid_from, valid_to, name, description, name_translations, description_translations, is_public) values ($1, $2, $3::numeric, $4::int, $5::timestamptz, $6::timestamptz, $7, $8, $9::jsonb, $10::jsonb, $11) returning id::text",
                    )
                    |> pog.parameter(pog.text(code))
                    |> pog.parameter(pog.text(dt_l))
                    |> pog.parameter(pog.text(string.trim(dv)))
                    |> pog.parameter(mx_p)
                    |> pog.parameter(vf_p)
                    |> pog.parameter(vt_p)
                    |> pog.parameter(pog.text(name))
                    |> pog.parameter(pog.text(desc))
                    |> pog.parameter(pog.text(ntr))
                    |> pog.parameter(pog.text(dtr))
                    |> pog.parameter(pog.bool(is_pub))
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
  #(
    Option(String), Option(String), Option(String), Option(Int), Option(String), Option(String),
    Option(String), Option(String), Option(String), Option(String), Option(Bool),
  ),
) {
  decode.optional_field("code", None, decode.optional(decode.string), fn(c) {
    decode.optional_field("discount_type", None, decode.optional(decode.string), fn(dt) {
      decode.optional_field("discount_value", None, decode.optional(decode.string), fn(dv) {
        decode.optional_field("max_uses", None, decode.optional(decode.int), fn(mx) {
          decode.optional_field("valid_from", None, decode.optional(decode.string), fn(vf) {
            decode.optional_field("valid_to", None, decode.optional(decode.string), fn(vt) {
              decode.optional_field("name", None, decode.optional(decode.string), fn(nm) {
                decode.optional_field("description", None, decode.optional(decode.string), fn(ds) {
                  decode.optional_field("name_translations", None, decode.optional(decode.string), fn(ntr) {
                    decode.optional_field("description_translations", None, decode.optional(decode.string), fn(dtr) {
                      decode.optional_field("is_public", None, decode.optional(decode.bool), fn(is_pub) {
                        decode.success(#(c, dt, dv, mx, vf, vt, nm, ds, ntr, dtr, is_pub))
                      })
                    })
                  })
                })
              })
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
        Ok(#(c_opt, dt_opt, dv_opt, mx_opt, vf_opt, vt_opt, nm_opt, ds_opt, ntr_opt, dtr_opt, is_pub_opt)) ->
          case c_opt, dt_opt, dv_opt, mx_opt, vf_opt, vt_opt, nm_opt, ds_opt, ntr_opt, dtr_opt, is_pub_opt {
            None, None, None, None, None, None, None, None, None, None, None -> json_err(400, "no_fields")
            _, _, _, _, _, _, _, _, _, _, _ -> {
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
              let p_nm = case nm_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              let p_ds = case ds_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              let p_ntr = case ntr_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_dtr = case dtr_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_pub = case is_pub_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              case
                pog.query(
                  "update coupons set code = coalesce($2::text, code), discount_type = coalesce($3::text, discount_type), discount_value = coalesce($4::numeric, discount_value), max_uses = coalesce($5::int, max_uses), valid_from = coalesce($6::timestamptz, valid_from), valid_to = coalesce($7::timestamptz, valid_to), name = coalesce($8::text, name), description = coalesce($9::text, description), name_translations = coalesce($10::jsonb, name_translations), description_translations = coalesce($11::jsonb, description_translations), is_public = coalesce($12::bool, is_public) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(coupon_id)))
                |> pog.parameter(p_c)
                |> pog.parameter(p_dt)
                |> pog.parameter(p_dv)
                |> pog.parameter(p_mx)
                |> pog.parameter(p_vf)
                |> pog.parameter(p_vt)
                |> pog.parameter(p_nm)
                |> pog.parameter(p_ds)
                |> pog.parameter(p_ntr)
                |> pog.parameter(p_dtr)
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

fn limits_decoder() -> decode.Decoder(#(Option(String), Option(String))) {
  decode.optional_field(
    "min_order_amount",
    None,
    decode.optional(decode.string),
    fn(moa) {
      decode.optional_field(
        "allowed_category_codes",
        None,
        decode.optional(decode.string),
        fn(cats) { decode.success(#(moa, cats)) },
      )
    },
  )
}

/// PATCH /api/v1/marketing/coupons/:id/limits — sepet kuralı (min order + kategori).
/// Body: { min_order_amount?: string ("0" siler), allowed_category_codes?: string ("hotel,villa") }
pub fn patch_coupon_limits(
  req: Request,
  ctx: Context,
  coupon_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, limits_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(moa_opt, cats_opt)) -> {
              let p_moa = case moa_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              let cats_text = case cats_opt {
                None -> ""
                Some(s) -> string.trim(s)
              }
              let cats_array = case cats_opt {
                None -> "{}"
                Some(_) ->
                  case cats_text == "" {
                    True -> "{}"
                    False -> {
                      let parts =
                        string.split(cats_text, ",")
                        |> list.map(string.trim)
                        |> list.filter(fn(x) { x != "" })
                      "{" <> string.join(parts, ",") <> "}"
                    }
                  }
              }
              let p_cats = case cats_opt {
                None -> pog.null()
                Some(_) -> pog.text(cats_array)
              }
              case
                pog.query(
                  "update coupons set min_order_amount = coalesce($2::numeric, min_order_amount), allowed_category_codes = coalesce($3::text[], allowed_category_codes) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(coupon_id)))
                |> pog.parameter(p_moa)
                |> pog.parameter(p_cats)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "limits_update_failed")
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

/// GET /api/v1/marketing/coupons/:id/limits → { min_order_amount, allowed_category_codes }
pub fn get_coupon_limits(
  req: Request,
  ctx: Context,
  coupon_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select coalesce(min_order_amount::text,'0'), coalesce(array_to_string(allowed_category_codes, ','),'') from coupons where id = $1::uuid",
        )
        |> pog.parameter(pog.text(string.trim(coupon_id)))
        |> pog.returning({
          use moa <- decode.field(0, decode.string)
          use cats <- decode.field(1, decode.string)
          decode.success(#(moa, cats))
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "limits_query_failed")
        Ok(r) ->
          case r.rows {
            [] -> json_err(404, "not_found")
            [#(moa, cats)] -> {
              let body =
                json.object([
                  #("min_order_amount", json.string(moa)),
                  #("allowed_category_codes", json.string(cats)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected")
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

fn campaign_row() -> decode.Decoder(#(String, String, String, String, String, String, String, Bool, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use ct <- decode.field(2, decode.string)
  use name <- decode.field(3, decode.string)
  use rules <- decode.field(4, decode.string)
  use st <- decode.field(5, decode.string)
  use en <- decode.field(6, decode.string)
  use active <- decode.field(7, decode.bool)
  use trans <- decode.field(8, decode.string)
  decode.success(#(id, code, ct, name, rules, st, en, active, trans))
}

fn campaign_json(
  row: #(String, String, String, String, String, String, String, Bool, String),
) -> json.Json {
  let #(id, code, ct, name, rules, st, en, active, trans) = row
  let stj = case st == "" {
    True -> json.null()
    False -> json.string(st)
  }
  let enj = case en == "" {
    True -> json.null()
    False -> json.string(en)
  }
  let trans_str = case string.trim(trans) == "" {
    True -> "{}"
    False -> trans
  }
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("campaign_type", json.string(ct)),
    #("name", json.string(name)),
    #("name_translations", json.string(trans_str)),
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
          "select id::text, code, campaign_type, name, rules_json::text, coalesce(starts_at::text,''), coalesce(ends_at::text,''), is_active, coalesce(name_translations::text,'{}') from campaigns order by created_at desc limit 200",
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
  #(String, String, String, String, Option(String), Option(String), Bool, String),
) {
  decode.field("code", decode.string, fn(code) {
    decode.field("campaign_type", decode.string, fn(ct) {
      decode.field("name", decode.string, fn(name) {
        decode.optional_field("rules_json", "{}", decode.string, fn(rules) {
          decode.optional_field("starts_at", "", decode.string, fn(st) {
            decode.optional_field("ends_at", "", decode.string, fn(en) {
              decode.optional_field("is_active", True, decode.bool, fn(active) {
                decode.optional_field("name_translations", "{}", decode.string, fn(trans) {
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
                    trans,
                  ))
                })
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
        Ok(#(code, ct, name, rules, st_opt, en_opt, active, trans)) ->
          case code == "" || string.trim(ct) == "" || name == "" {
            True -> json_err(400, "code_type_name_required")
            False -> {
              let cfg = case string.trim(rules) == "" {
                True -> "{}"
                False -> string.trim(rules)
              }
              let trans_str = case string.trim(trans) == "" {
                True -> "{}"
                False -> string.trim(trans)
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
                  "insert into campaigns (code, campaign_type, name, rules_json, starts_at, ends_at, is_active, name_translations) values ($1, $2, $3, $4::jsonb, $5::timestamptz, $6::timestamptz, $7, $8::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(code)))
                |> pog.parameter(pog.text(string.trim(ct)))
                |> pog.parameter(pog.text(name))
                |> pog.parameter(pog.text(cfg))
                |> pog.parameter(st_p)
                |> pog.parameter(en_p)
                |> pog.parameter(pog.bool(active))
                |> pog.parameter(pog.text(trans_str))
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

fn patch_campaign_decoder() -> decode.Decoder(
  #(
    Option(String),
    Option(String),
    Option(String),
    Option(String),
    Option(String),
    Option(Bool),
    Option(String),
  ),
) {
  decode.optional_field("code", None, decode.optional(decode.string), fn(c) {
    decode.optional_field("name", None, decode.optional(decode.string), fn(n) {
      decode.optional_field("rules_json", None, decode.optional(decode.string), fn(rj) {
        decode.optional_field("starts_at", None, decode.optional(decode.string), fn(st) {
          decode.optional_field("ends_at", None, decode.optional(decode.string), fn(en) {
            decode.optional_field("is_active", None, decode.optional(decode.bool), fn(ac) {
              decode.optional_field("name_translations", None, decode.optional(decode.string), fn(nt) {
                decode.success(#(c, n, rj, st, en, ac, nt))
              })
            })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/marketing/campaigns/:id — `admin.users.read`
pub fn patch_campaign(req: Request, ctx: Context, campaign_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_campaign_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(c_opt, n_opt, rj_opt, st_opt, en_opt, ac_opt, nt_opt)) ->
              case c_opt, n_opt, rj_opt, st_opt, en_opt, ac_opt, nt_opt {
                None, None, None, None, None, None, None -> json_err(400, "no_fields")
                _, _, _, _, _, _, _ -> {
                  let p_c = case c_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_n = case n_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_rj = case rj_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_st = case st_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_en = case en_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  let p_ac = case ac_opt {
                    None -> pog.null()
                    Some(b) -> pog.bool(b)
                  }
                  let p_nt = case nt_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  case
                    pog.query(
                      "update campaigns set code = coalesce($2::text, code), name = coalesce($3::text, name), rules_json = coalesce($4::jsonb, rules_json), starts_at = coalesce($5::timestamptz, starts_at), ends_at = coalesce($6::timestamptz, ends_at), is_active = coalesce($7::bool, is_active), name_translations = coalesce($8::jsonb, name_translations) where id = $1::uuid returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(campaign_id)))
                    |> pog.parameter(p_c)
                    |> pog.parameter(p_n)
                    |> pog.parameter(p_rj)
                    |> pog.parameter(p_st)
                    |> pog.parameter(p_en)
                    |> pog.parameter(p_ac)
                    |> pog.parameter(p_nt)
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

/// DELETE /api/v1/marketing/campaigns/:id — `admin.users.read`
pub fn delete_campaign(req: Request, ctx: Context, campaign_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from campaigns where id = $1::uuid")
        |> pog.parameter(pog.text(string.trim(campaign_id)))
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

// --- Paket tatil (holiday_packages) ---

fn holiday_package_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use name <- decode.field(1, decode.string)
  use bundle <- decode.field(2, decode.string)
  use org <- decode.field(3, decode.string)
  use cr <- decode.field(4, decode.string)
  use trans <- decode.field(5, decode.string)
  decode.success(#(id, name, bundle, org, cr, trans))
}

fn holiday_package_json(row: #(String, String, String, String, String, String)) -> json.Json {
  let #(id, name, bundle, org, cr, trans) = row
  let orgj = case org == "" {
    True -> json.null()
    False -> json.string(org)
  }
  let trans_str = case string.trim(trans) == "" {
    True -> "{}"
    False -> trans
  }
  json.object([
    #("id", json.string(id)),
    #("name", json.string(name)),
    #("name_translations", json.string(trans_str)),
    #("bundle_json", json.string(bundle)),
    #("organization_id", orgj),
    #("created_at", json.string(cr)),
  ])
}

fn create_holiday_package_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("name", decode.string, fn(name) {
    decode.optional_field("bundle_json", "[]", decode.string, fn(bj) {
      decode.optional_field("name_translations", "{}", decode.string, fn(trans) {
        let b = string.trim(bj)
        let cfg = case b == "" {
          True -> "[]"
          False -> b
        }
        let trans_str = case string.trim(trans) == "" {
          True -> "{}"
          False -> string.trim(trans)
        }
        decode.success(#(string.trim(name), cfg, trans_str))
      })
    })
  })
}

fn patch_holiday_package_decoder() -> decode.Decoder(#(Option(String), Option(String), Option(String))) {
  decode.optional_field("name", None, decode.optional(decode.string), fn(n) {
    decode.optional_field("bundle_json", None, decode.optional(decode.string), fn(b) {
      decode.optional_field("name_translations", None, decode.optional(decode.string), fn(nt) {
        decode.success(#(n, b, nt))
      })
    })
  })
}

/// GET /api/v1/marketing/holiday-packages — `admin.users.read`
pub fn list_holiday_packages(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select id::text, name, bundle_json::text, coalesce(organization_id::text,''), created_at::text, coalesce(name_translations::text,'{}') from holiday_packages order by created_at desc limit 200",
        )
        |> pog.returning(holiday_package_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "holiday_packages_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, holiday_package_json)
          let body =
            json.object([#("packages", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

/// POST /api/v1/marketing/holiday-packages — `admin.users.read`
pub fn create_holiday_package(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_holiday_package_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(name, cfg, trans)) ->
              case name == "" {
                True -> json_err(400, "name_required")
                False ->
                  case
                    pog.query(
                      "insert into holiday_packages (name, bundle_json, name_translations) values ($1, $2::jsonb, $3::jsonb) returning id::text",
                    )
                    |> pog.parameter(pog.text(name))
                    |> pog.parameter(pog.text(cfg))
                    |> pog.parameter(pog.text(trans))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(409, "holiday_package_create_failed")
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

/// PATCH /api/v1/marketing/holiday-packages/:id — `admin.users.read`
pub fn patch_holiday_package(req: Request, ctx: Context, package_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_holiday_package_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(n_opt, b_opt, nt_opt)) ->
              case n_opt, b_opt, nt_opt {
                None, None, None -> json_err(400, "no_fields")
                _, _, _ -> {
                  let p_n = case n_opt {
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
                  let p_nt = case nt_opt {
                    None -> pog.null()
                    Some(s) ->
                      case string.trim(s) == "" {
                        True -> pog.null()
                        False -> pog.text(string.trim(s))
                      }
                  }
                  case
                    pog.query(
                      "update holiday_packages set name = coalesce($2::text, name), bundle_json = coalesce($3::jsonb, bundle_json), name_translations = coalesce($4::jsonb, name_translations) where id = $1::uuid returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(package_id)))
                    |> pog.parameter(p_n)
                    |> pog.parameter(p_b)
                    |> pog.parameter(p_nt)
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

/// DELETE /api/v1/marketing/holiday-packages/:id — `admin.users.read`
pub fn delete_holiday_package(req: Request, ctx: Context, package_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from holiday_packages where id = $1::uuid")
        |> pog.parameter(pog.text(string.trim(package_id)))
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

// --- Public (auth yok) read endpoint'leri — vitrin Page Builder modülleri için ---

fn parse_int_query(qs: List(#(String, String)), key: String, default: Int) -> Int {
  case list.key_find(qs, key) {
    Error(_) -> default
    Ok(v) ->
      case int.parse(string.trim(v)) {
        Error(_) -> default
        Ok(n) ->
          case n < 1 {
            True -> default
            False -> n
          }
      }
  }
}

fn clamp_limit(n: Int, hard_max: Int) -> Int {
  case n > hard_max {
    True -> hard_max
    False ->
      case n < 1 {
        True -> 1
        False -> n
      }
  }
}

/// GET /api/v1/public/marketing/active-campaigns?type=&limit=
/// Sadece is_active=true; opsiyonel campaign_type filtresi; max 100.
pub fn list_public_active_campaigns(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let type_opt = case list.key_find(qs, "type") {
    Error(_) -> ""
    Ok(v) -> string.trim(v)
  }
  let limit = clamp_limit(parse_int_query(qs, "limit", 12), 100)
  let base_sql =
    "select id::text, code, campaign_type, name, rules_json::text, coalesce(starts_at::text,''), coalesce(ends_at::text,''), is_active, coalesce(name_translations::text,'{}') from campaigns where is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())"
  let q = case type_opt == "" {
    True ->
      pog.query(base_sql <> " order by created_at desc limit $1::int")
      |> pog.parameter(pog.int(limit))
    False ->
      pog.query(base_sql <> " and campaign_type = $1 order by created_at desc limit $2::int")
      |> pog.parameter(pog.text(type_opt))
      |> pog.parameter(pog.int(limit))
  }
  case q |> pog.returning(campaign_row()) |> pog.execute(ctx.db) {
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

/// GET /api/v1/public/marketing/active-coupons?limit=
/// Yalnızca is_public = true ve geçerlilik penceresi içinde olan kuponlar.
pub fn list_public_active_coupons(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let limit = clamp_limit(parse_int_query(qs, "limit", 8), 50)
  case
    pog.query(
      "select id::text, code, discount_type, discount_value::text, coalesce(max_uses::text,''), used_count::text, coalesce(valid_from::text,''), coalesce(valid_to::text,''), created_at::text, coalesce(name,''), coalesce(description,''), coalesce(name_translations::text,'{}'), coalesce(description_translations::text,'{}'), is_public from coupons where is_public = true and (valid_from is null or valid_from <= now()) and (valid_to is null or valid_to >= now()) and (max_uses is null or used_count < max_uses) order by created_at desc limit $1::int",
    )
    |> pog.parameter(pog.int(limit))
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

/// GET /api/v1/public/marketing/holiday-packages?limit=
pub fn list_public_holiday_packages(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let limit = clamp_limit(parse_int_query(qs, "limit", 8), 50)
  case
    pog.query(
      "select id::text, name, bundle_json::text, coalesce(organization_id::text,''), created_at::text, coalesce(name_translations::text,'{}') from holiday_packages order by created_at desc limit $1::int",
    )
    |> pog.parameter(pog.int(limit))
    |> pog.returning(holiday_package_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "holiday_packages_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, holiday_package_json)
      let body =
        json.object([#("packages", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
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
