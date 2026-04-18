//// İlan tipine özel detay tabloları (180_verticals) — temel CRUD.

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

fn lid_param(lid: String) -> String {
  string.trim(lid)
}

// --- holiday home ---

/// GET /api/v1/verticals/listings/:listing_id/holiday-home
pub fn get_holiday_home(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let row = {
    use tc <- decode.field(0, decode.string)
    use rc <- decode.field(1, decode.string)
    use im <- decode.field(2, decode.bool)
    decode.success(#(tc, rc, im))
  }
  case
    pog.query(
      "select coalesce(theme_codes::text,'{}'), coalesce(rule_codes::text,'{}'), ical_managed from listing_holiday_home_details where listing_id = $1::uuid",
    )
    |> pog.parameter(pog.text(lid_param(listing_id)))
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [#(tc, rc, im)] -> {
          let j =
            json.object([
              #("theme_codes", json.string(tc)),
              #("rule_codes", json.string(rc)),
              #("ical_managed", json.bool(im)),
            ])
            |> json.to_string
          wisp.json_response(j, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn hh_patch_decoder() -> decode.Decoder(#(Option(List(String)), Option(List(String)), Option(Bool))) {
  decode.optional_field("theme_codes", None, decode.optional(decode.list(decode.string)), fn(tc) {
    decode.optional_field("rule_codes", None, decode.optional(decode.list(decode.string)), fn(rc) {
      decode.optional_field("ical_managed", None, decode.optional(decode.bool), fn(im) {
        decode.success(#(tc, rc, im))
      })
    })
  })
}

/// PATCH /api/v1/verticals/listings/:listing_id/holiday-home
pub fn patch_holiday_home(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, hh_patch_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(tc_opt, rc_opt, im_opt)) ->
          case tc_opt, rc_opt, im_opt {
            None, None, None -> json_err(400, "no_fields")
            _, _, _ -> {
              let tc_p = case tc_opt {
                None -> pog.null()
                Some(ks) -> pog.array(pog.text, ks)
              }
              let rc_p = case rc_opt {
                None -> pog.null()
                Some(ks) -> pog.array(pog.text, ks)
              }
              let im_p = case im_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              case
                pog.query(
                  "insert into listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed) values ($1::uuid, coalesce($2::text[], '{}'), coalesce($3::text[], '{}'), coalesce($4::boolean, false)) on conflict (listing_id) do update set theme_codes = coalesce($2::text[], listing_holiday_home_details.theme_codes), rule_codes = coalesce($3::text[], listing_holiday_home_details.rule_codes), ical_managed = coalesce($4::boolean, listing_holiday_home_details.ical_managed) returning listing_id::text",
                )
                |> pog.parameter(pog.text(lid_param(listing_id)))
                |> pog.parameter(tc_p)
                |> pog.parameter(rc_p)
                |> pog.parameter(im_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "upsert_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out =
                        json.object([#("listing_id", json.string(id)), #("ok", json.bool(True))])
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

// --- yacht ---

/// GET /api/v1/verticals/listings/:listing_id/yacht
pub fn get_yacht(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let row = {
    use lm <- decode.field(0, decode.string)
    use cc <- decode.field(1, decode.string)
    use lat <- decode.field(2, decode.string)
    use lng <- decode.field(3, decode.string)
    decode.success(#(lm, cc, lat, lng))
  }
  case
    pog.query(
      "select coalesce(length_meters::text,''), coalesce(cabin_count::text,''), coalesce(port_lat::text,''), coalesce(port_lng::text,'') from listing_yacht_details where listing_id = $1::uuid",
    )
    |> pog.parameter(pog.text(lid_param(listing_id)))
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [#(lm, cc, lat, lng)] -> {
          let j =
            json.object([
              #("length_meters", json.string(lm)),
              #("cabin_count", json.string(cc)),
              #("port_lat", json.string(lat)),
              #("port_lng", json.string(lng)),
            ])
            |> json.to_string
          wisp.json_response(j, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn yacht_patch_decoder() -> decode.Decoder(
  #(Option(String), Option(String), Option(String), Option(String)),
) {
  decode.optional_field("length_meters", None, decode.optional(decode.string), fn(a) {
    decode.optional_field("cabin_count", None, decode.optional(decode.string), fn(b) {
      decode.optional_field("port_lat", None, decode.optional(decode.string), fn(c) {
        decode.optional_field("port_lng", None, decode.optional(decode.string), fn(d) {
          decode.success(#(a, b, c, d))
        })
      })
    })
  })
}

/// PATCH /api/v1/verticals/listings/:listing_id/yacht
pub fn patch_yacht(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, yacht_patch_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(a, b, c, d)) ->
          case a, b, c, d {
            None, None, None, None -> json_err(400, "no_fields")
            _, _, _, _ -> {
              let pa = case a {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let pb = case b {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let pc = case c {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let pd = case d {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              case
                pog.query(
                  "insert into listing_yacht_details (listing_id, length_meters, cabin_count, port_lat, port_lng) values ($1::uuid, $2::numeric, $3::smallint, $4::numeric, $5::numeric) on conflict (listing_id) do update set length_meters = coalesce($2::numeric, listing_yacht_details.length_meters), cabin_count = coalesce($3::smallint, listing_yacht_details.cabin_count), port_lat = coalesce($4::numeric, listing_yacht_details.port_lat), port_lng = coalesce($5::numeric, listing_yacht_details.port_lng) returning listing_id::text",
                )
                |> pog.parameter(pog.text(lid_param(listing_id)))
                |> pog.parameter(pa)
                |> pog.parameter(pb)
                |> pog.parameter(pc)
                |> pog.parameter(pd)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "upsert_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out =
                        json.object([#("listing_id", json.string(id)), #("ok", json.bool(True))])
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

// --- hotel rooms ---

fn hr_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use nm <- decode.field(1, decode.string)
  use cap <- decode.field(2, decode.string)
  use bt <- decode.field(3, decode.string)
  use mj <- decode.field(4, decode.string)
  decode.success(#(id, nm, cap, bt, mj))
}

/// GET /api/v1/verticals/listings/:listing_id/hotel-rooms
pub fn list_hotel_rooms(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, name, coalesce(capacity::text,''), coalesce(board_type,''), coalesce(meta_json::text,'{}') from hotel_rooms where listing_id = $1::uuid order by name",
    )
    |> pog.parameter(pog.text(lid_param(listing_id)))
    |> pog.returning(hr_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(id, nm, cap, bt, mj) = r
          let capj = case cap == "" {
            True -> json.null()
            False -> json.string(cap)
          }
          let btj = case bt == "" {
            True -> json.null()
            False -> json.string(bt)
          }
          json.object([
            #("id", json.string(id)),
            #("name", json.string(nm)),
            #("capacity", capj),
            #("board_type", btj),
            #("meta_json", json.string(mj)),
          ])
        })
      let body =
        json.object([#("rooms", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn hr_create_decoder() -> decode.Decoder(#(String, Option(String), Option(String), String)) {
  decode.field("name", decode.string, fn(nm) {
    decode.optional_field("capacity", "", decode.string, fn(cap) {
      decode.optional_field("board_type", "", decode.string, fn(bt) {
        decode.optional_field("meta_json", "{}", decode.string, fn(mj) {
          let c = case string.trim(cap) == "" {
            True -> None
            False -> Some(string.trim(cap))
          }
          let b = case string.trim(bt) == "" {
            True -> None
            False -> Some(string.trim(bt))
          }
          decode.success(#(nm, c, b, string.trim(mj)))
        })
      })
    })
  })
}

/// POST /api/v1/verticals/listings/:listing_id/hotel-rooms
pub fn add_hotel_room(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, hr_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(nm, cap_opt, bt_opt, mj_raw)) ->
          case string.trim(nm) == "" {
            True -> json_err(400, "name_required")
            False -> {
              let mj = case mj_raw == "" {
                True -> "{}"
                False -> mj_raw
              }
              let cap_p = case cap_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              let bt_p = case bt_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              case
                pog.query(
                  "insert into hotel_rooms (listing_id, name, capacity, board_type, meta_json) values ($1::uuid, $2, $3::smallint, $4, $5::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(lid_param(listing_id)))
                |> pog.parameter(pog.text(string.trim(nm)))
                |> pog.parameter(cap_p)
                |> pog.parameter(bt_p)
                |> pog.parameter(pog.text(mj))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "insert_failed")
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

/// DELETE /api/v1/verticals/listings/:listing_id/hotel-rooms/:room_id
pub fn delete_hotel_room(req: Request, ctx: Context, listing_id: String, room_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case
    pog.query(
      "delete from hotel_rooms where id = $1::uuid and listing_id = $2::uuid",
    )
    |> pog.parameter(pog.text(string.trim(room_id)))
    |> pog.parameter(pog.text(lid_param(listing_id)))
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

// --- related listings rules ---

fn rr_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use rt <- decode.field(1, decode.string)
  use tid <- decode.field(2, decode.string)
  use ar <- decode.field(3, decode.string)
  decode.success(#(id, rt, tid, ar))
}

/// GET /api/v1/verticals/listings/:listing_id/related-rules
pub fn list_related_rules(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, relation_type, coalesce(target_listing_id::text,''), coalesce(auto_radius_meters::text,'') from related_listings_rules where listing_id = $1::uuid order by relation_type",
    )
    |> pog.parameter(pog.text(lid_param(listing_id)))
    |> pog.returning(rr_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(id, rt, tid, ar) = r
          let tidj = case tid == "" {
            True -> json.null()
            False -> json.string(tid)
          }
          let arj = case ar == "" {
            True -> json.null()
            False -> json.string(ar)
          }
          json.object([
            #("id", json.string(id)),
            #("relation_type", json.string(rt)),
            #("target_listing_id", tidj),
            #("auto_radius_meters", arj),
          ])
        })
      let body =
        json.object([#("rules", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn rr_create_decoder() -> decode.Decoder(#(String, Option(String), Option(Int))) {
  decode.field("relation_type", decode.string, fn(rt) {
    decode.optional_field("target_listing_id", "", decode.string, fn(tid) {
      decode.optional_field("auto_radius_meters", 0, decode.int, fn(ar) {
        let t = case string.trim(tid) == "" {
          True -> None
          False -> Some(string.trim(tid))
        }
        let radius = case ar {
          0 -> None
          n -> Some(n)
        }
        decode.success(#(string.trim(rt), t, radius))
      })
    })
  })
}

/// POST /api/v1/verticals/listings/:listing_id/related-rules
pub fn add_related_rule(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, rr_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(rt, tid_opt, ar_opt)) ->
          case rt == "" {
            True -> json_err(400, "relation_type_required")
            False ->
              case rt == "related" || rt == "nearby" || rt == "same_category" {
                False -> json_err(400, "invalid_relation_type")
                True -> {
                  let tid_p = case tid_opt {
                    None -> pog.null()
                    Some(s) -> pog.text(s)
                  }
                  let ar_p = case ar_opt {
                    None -> pog.null()
                    Some(n) -> pog.int(n)
                  }
                  case
                    pog.query(
                      "insert into related_listings_rules (listing_id, relation_type, target_listing_id, auto_radius_meters) values ($1::uuid, $2, $3::uuid, $4::int) returning id::text",
                    )
                    |> pog.parameter(pog.text(lid_param(listing_id)))
                    |> pog.parameter(pog.text(rt))
                    |> pog.parameter(tid_p)
                    |> pog.parameter(ar_p)
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "insert_failed")
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

/// DELETE /api/v1/verticals/listings/:listing_id/related-rules/:rule_id
pub fn delete_related_rule(
  req: Request,
  ctx: Context,
  listing_id: String,
  rule_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case
    pog.query(
      "delete from related_listings_rules where id = $1::uuid and listing_id = $2::uuid",
    )
    |> pog.parameter(pog.text(string.trim(rule_id)))
    |> pog.parameter(pog.text(lid_param(listing_id)))
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

// --- transfer zones ---

fn tz_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use zr <- decode.field(1, decode.string)
  use ll <- decode.field(2, decode.string)
  use lat <- decode.field(3, decode.string)
  use lng <- decode.field(4, decode.string)
  use pj <- decode.field(5, decode.string)
  decode.success(#(id, zr, ll, lat, lng, pj))
}

/// GET /api/v1/verticals/listings/:listing_id/transfer-zones
pub fn list_transfer_zones(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, zone_role, location_label, coalesce(center_lat::text,''), coalesce(center_lng::text,''), coalesce(price_per_vehicle_class::text,'{}') from transfer_zones where listing_id = $1::uuid order by zone_role, location_label",
    )
    |> pog.parameter(pog.text(lid_param(listing_id)))
    |> pog.returning(tz_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(id, zr, ll, lat, lng, pj) = r
          let latj = case lat == "" {
            True -> json.null()
            False -> json.string(lat)
          }
          let lngj = case lng == "" {
            True -> json.null()
            False -> json.string(lng)
          }
          json.object([
            #("id", json.string(id)),
            #("zone_role", json.string(zr)),
            #("location_label", json.string(ll)),
            #("center_lat", latj),
            #("center_lng", lngj),
            #("price_per_vehicle_class", json.string(pj)),
          ])
        })
      let body =
        json.object([#("zones", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn tz_create_decoder() -> decode.Decoder(#(String, String, Option(String), Option(String), String)) {
  decode.field("zone_role", decode.string, fn(zr) {
    decode.field("location_label", decode.string, fn(ll) {
      decode.optional_field("center_lat", "", decode.string, fn(lat) {
        decode.optional_field("center_lng", "", decode.string, fn(lng) {
          decode.optional_field("price_per_vehicle_class", "{}", decode.string, fn(pj) {
            let la = case string.trim(lat) == "" {
              True -> None
              False -> Some(string.trim(lat))
            }
            let lo = case string.trim(lng) == "" {
              True -> None
              False -> Some(string.trim(lng))
            }
            decode.success(#(zr, ll, la, lo, string.trim(pj)))
          })
        })
      })
    })
  })
}

/// POST /api/v1/verticals/listings/:listing_id/transfer-zones
pub fn add_transfer_zone(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, tz_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(zr, ll, la, lo, pj_raw)) -> {
          let zr_t = string.trim(zr)
          let ll_t = string.trim(ll)
          case zr_t == "" || ll_t == "" {
            True -> json_err(400, "zone_role_label_required")
            False ->
              case zr_t == "pickup" || zr_t == "dropoff" {
                False -> json_err(400, "invalid_zone_role")
                True -> {
                  let pj = case pj_raw == "" {
                    True -> "{}"
                    False -> pj_raw
                  }
                  let la_p = case la {
                    None -> pog.null()
                    Some(s) -> pog.text(s)
                  }
                  let lo_p = case lo {
                    None -> pog.null()
                    Some(s) -> pog.text(s)
                  }
                  case
                    pog.query(
                      "insert into transfer_zones (listing_id, zone_role, location_label, center_lat, center_lng, price_per_vehicle_class) values ($1::uuid, $2, $3, $4::numeric, $5::numeric, $6::jsonb) returning id::text",
                    )
                    |> pog.parameter(pog.text(lid_param(listing_id)))
                    |> pog.parameter(pog.text(zr_t))
                    |> pog.parameter(pog.text(ll_t))
                    |> pog.parameter(la_p)
                    |> pog.parameter(lo_p)
                    |> pog.parameter(pog.text(pj))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "insert_failed")
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

/// DELETE /api/v1/verticals/listings/:listing_id/transfer-zones/:zone_id
pub fn delete_transfer_zone(
  req: Request,
  ctx: Context,
  listing_id: String,
  zone_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case
    pog.query(
      "delete from transfer_zones where id = $1::uuid and listing_id = $2::uuid",
    )
    |> pog.parameter(pog.text(string.trim(zone_id)))
    |> pog.parameter(pog.text(lid_param(listing_id)))
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

// --- generic vertical meta (category-specific JSON blob) ---

/// GET /api/v1/verticals/listings/:listing_id/vertical-meta?category=tour
pub fn get_vertical_meta(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  let category = case wisp.get_query(req) |> list.key_find("category") {
    Ok(c) -> string.trim(c)
    Error(_) -> ""
  }
  case category {
    "" -> json_err(400, "category_required")
    cat -> {
      let group_code = "vertical_" <> cat
      case
        pog.query(
          "select coalesce(value_json::text, '{}') from listing_attributes where listing_id=$1::uuid and group_code=$2 and key='v1'",
        )
        |> pog.parameter(pog.text(lid_param(listing_id)))
        |> pog.parameter(pog.text(group_code))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) ->
          case ret.rows {
            [row] -> wisp.json_response(row, 200)
            _ -> wisp.json_response("{}", 200)
          }
      }
    }
  }
}

/// PUT /api/v1/verticals/listings/:listing_id/vertical-meta
/// Body: { "category": "tour", "data": { ... } }
pub fn put_vertical_meta(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Put)
  let body_result = read_body_string(req)
  case body_result {
    Error(_) -> json_err(400, "body_read_failed")
    Ok(body_str) -> {
      let cat_decoder = {
        use category <- decode.field("category", decode.string)
        decode.success(category)
      }
      case json.parse(body_str, cat_decoder) {
        Error(_) -> json_err(400, "category_missing")
        Ok(category) -> {
          let group_code = "vertical_" <> string.trim(category)
          case
            pog.query(
              "insert into listing_attributes (listing_id, group_code, key, value_json)
               values ($1::uuid, $2, 'v1', ($3::text)::jsonb)
               on conflict (listing_id, group_code, key)
               do update set value_json = excluded.value_json
               returning listing_id::text",
            )
            |> pog.parameter(pog.text(lid_param(listing_id)))
            |> pog.parameter(pog.text(group_code))
            |> pog.parameter(pog.text(body_str))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "upsert_failed")
            Ok(ret) ->
              case ret.rows {
                [_id] -> wisp.json_response("{\"ok\":true}", 200)
                _ -> json_err(500, "unexpected")
              }
          }
        }
      }
    }
  }
}
