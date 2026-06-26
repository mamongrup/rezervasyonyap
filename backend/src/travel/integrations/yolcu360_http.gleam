//// Yolcu360 — POST ping, GET locations (admin test).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option
import gleam/result
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/identity/permissions
import travel/integrations/yolcu360
import travel/integrations/yolcu360_config
import wisp.{type Request, type Response}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn ping_body_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("base_url", decode.string, fn(base_url) {
    decode.field("api_key", decode.string, fn(api_key) {
      decode.field("api_secret", decode.string, fn(api_secret) {
        decode.success(#(base_url, api_key, api_secret))
      })
    })
  })
}

fn merge_ping_body(
  cfg: yolcu360_config.Yolcu360Config,
  body: #(String, String, String),
) -> yolcu360_config.Yolcu360Config {
  let #(base_url, api_key, api_secret) = body
  yolcu360_config.Yolcu360Config(
    enabled: cfg.enabled,
    base_url: case string.trim(base_url) {
      "" -> cfg.base_url
      s -> s
    },
    api_key: case string.trim(api_key) {
      "" -> cfg.api_key
      s -> s
    },
    api_secret: case string.trim(api_secret) {
      "" -> cfg.api_secret
      s -> s
    },
  )
}

fn token_preview(token: String) -> String {
  case string.length(token) > 12 {
    True -> string.slice(token, 0, 12) <> "…"
    False -> token
  }
}

/// POST /api/v1/integrations/yolcu360/ping — login + örnek locations?query=istanbul
pub fn post_ping(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.write") {
        False -> json_err(403, "forbidden")
        True -> {
          let cfg0 = yolcu360_config.load(ctx.db)
          let cfg = case read_body_string(req) {
            Ok(body) ->
              case string.trim(body) {
                "" -> cfg0
                _ ->
                  case json.parse(body, ping_body_decoder()) {
                    Ok(triple) -> merge_ping_body(cfg0, triple)
                    Error(_) -> cfg0
                  }
              }
            Error(_) -> cfg0
          }
          case yolcu360.ping(cfg) {
            Error(e) -> json_err(502, e)
            Ok(#(auth, loc)) -> {
              let loc_preview = case string.length(loc.raw_response) > 400 {
                True -> string.slice(loc.raw_response, 0, 400) <> "…"
                False -> loc.raw_response
              }
              let out =
                json.object([
                  #("ok", json.bool(True)),
                  #("access_token_preview", json.string(token_preview(auth.access_token))),
                  #("base_url", json.string(cfg.base_url)),
                  #("enabled", json.bool(cfg.enabled)),
                  #("locations_preview", json.string(loc_preview)),
                ])
                |> json.to_string
              wisp.json_response(out, 200)
            }
          }
        }
      }
  }
}

/// GET /api/v1/public/yolcu360/cars
///   ?pickup=Istanbul&dropoff=Istanbul&checkin=2024-06-10T10:00&checkout=2024-06-15T10:00
/// Kimlik doğrulama gerekmez — vitrin araç arama proxy'si.
/// Yolcu360 etkin değilse 503 döner.
pub fn get_cars_public(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let cfg = yolcu360_config.load(ctx.db)
  case yolcu360_config.credentials_ready(cfg) {
    False -> json_err(503, "yolcu360_not_enabled")
    True -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let pickup =
        list.key_find(qs, "pickup")
        |> result.unwrap("")
        |> string.trim
      let dropoff =
        list.key_find(qs, "dropoff")
        |> result.unwrap("")
        |> string.trim
      let checkin =
        list.key_find(qs, "checkin")
        |> result.unwrap("")
        |> string.trim
      let checkout =
        list.key_find(qs, "checkout")
        |> result.unwrap("")
        |> string.trim
      case pickup == "" || checkin == "" || checkout == "" {
        True -> json_err(400, "pickup_checkin_checkout_required")
        False -> {
          let effective_dropoff = case dropoff == "" {
            True -> pickup
            False -> dropoff
          }
          case
            yolcu360.search_cars(cfg, pickup, effective_dropoff, checkin, checkout)
          {
            Error(e) -> json_err(502, e)
            Ok(cars) -> wisp.json_response(cars.raw_response, 200)
          }
        }
      }
    }
  }
}

fn find_yolcu360_checkout_listing_id(db: pog.Connection) -> option.Option(String) {
  case
    pog.query(
      "select l.id::text from listings l "
        <> "join product_categories pc on pc.id = l.category_id "
        <> "where pc.code = 'car_rental' and l.status = 'published' "
        <> "order by case when coalesce(l.external_provider_code, '') = 'yolcu360' then 0 else 1 end, "
        <> "l.created_at desc "
        <> "limit 1",
    )
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> db_exec.execute(db)
  {
    Error(_) -> option.None
    Ok(ret) ->
      case ret.rows {
        [id] -> option.Some(id)
        _ -> option.None
      }
  }
}

/// GET /api/v1/public/yolcu360/checkout-listing — sepet / rezervasyon için yayımlı araç ilanı UUID
pub fn get_checkout_listing_public(_req: Request, ctx: Context) -> Response {
  let listing_id = case find_yolcu360_checkout_listing_id(ctx.db) {
    option.Some(id) -> json.string(id)
    option.None -> json.null()
  }
  let body =
    json.object([
      #("listing_id", listing_id),
    ])
    |> json.to_string
  wisp.json_response(body, 200)
}

/// GET /api/v1/public/yolcu360/locations?query= — vitrin konum araması (kimlik gerekmez)
pub fn get_locations_public(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let cfg = yolcu360_config.load(ctx.db)
  case yolcu360_config.credentials_ready(cfg) {
    False -> json_err(503, "yolcu360_not_enabled")
    True -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let query =
        list.key_find(qs, "query")
        |> result.unwrap("")
        |> string.trim
      case query == "" {
        True -> json_err(400, "query_required")
        False ->
          case yolcu360.search_locations(cfg, query) {
            Error(e) -> json_err(502, e)
            Ok(loc) -> wisp.json_response(loc.raw_response, 200)
          }
      }
    }
  }
}

/// GET /api/v1/integrations/yolcu360/locations?query= — konum araması (ham JSON proxy)
pub fn get_locations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.read") {
        False -> json_err(403, "forbidden")
        True -> {
          let qs = case request.get_query(req) {
            Ok(q) -> q
            Error(_) -> []
          }
          let query =
            list.key_find(qs, "query")
            |> result.unwrap("istanbul")
            |> string.trim
          let query = case query == "" {
            True -> "istanbul"
            False -> query
          }
          let cfg = yolcu360_config.load(ctx.db)
          case yolcu360.search_locations(cfg, query) {
            Error(e) -> json_err(502, e)
            Ok(loc) -> wisp.json_response(loc.raw_response, 200)
          }
        }
      }
  }
}
