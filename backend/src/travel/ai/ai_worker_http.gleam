//// Sunucu tarafı AI işçisi — tarayıcı kapalıyken cron/systemd ile çağrılır.
////
//// Ortam: `TRAVEL_AI_WORKER_SECRET` (boş değilse endpoint aktif)
//// Header: `x-travel-ai-worker-secret: <aynı değer>`
////
//// POST /api/v1/ai/worker/run-steps
//// Query (isteğe bağlı):
//// - `loops` — 1–15, varsayılan 1; her döngüde etkin hatlar için bir deneme
//// - `district=0` | `region=0` | `place=0` — ilgili hattı kapatır (varsayılan: hepsi açık)

import backend/context.{type Context}
import envoy
import gleam/erlang/process
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/string
import travel/ai/district_ideas_http
import travel/ai/region_content_http
import travel/ai/trip_routes_http
import travel/identity/admin_gate
import wisp.{type Request, type Response}

const worker_secret_header = "x-travel-ai-worker-secret"

@external(erlang, "backend_ffi_http", "spawn_unlinked")
fn spawn_unlinked(f: fn() -> Nil) -> Nil

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn trim_env_secret() -> Result(String, Nil) {
  case envoy.get("TRAVEL_AI_WORKER_SECRET") {
    Error(_) -> Error(Nil)
    Ok(s) ->
      case string.trim(s) {
        "" -> Error(Nil)
        t -> Ok(t)
      }
  }
}

fn auth_worker(req: Request) -> Result(Nil, Response) {
  case trim_env_secret() {
    Error(_) ->
      Error(json_err(503, "worker_secret_not_configured"))
    Ok(expected) ->
      case request.get_header(req, worker_secret_header) {
        Error(_) -> Error(json_err(401, "unauthorized"))
        Ok(provided) ->
          case string.trim(provided) == expected {
            False -> Error(json_err(401, "unauthorized"))
            True -> Ok(Nil)
          }
      }
  }
}

fn query_enabled(req: Request, key: String) -> Bool {
  case list.key_find(wisp.get_query(req), key) {
    Error(_) -> True
    Ok(v) -> {
      let lv = string.lowercase(string.trim(v))
      case lv == "0" || lv == "false" || lv == "no" || lv == "off" {
        True -> False
        False -> True
      }
    }
  }
}

fn query_loops(req: Request) -> Int {
  case list.key_find(wisp.get_query(req), "loops") {
    Error(_) -> 1
    Ok(v) ->
      case int.parse(string.trim(v)) {
        Error(_) -> 1
        Ok(n) ->
          case n < 1 {
            True -> 1
            False ->
              case n > 15 {
                True -> 15
                False -> n
              }
          }
      }
  }
}

fn query_int_clamped(req: Request, key: String, default: Int, min: Int, max: Int) -> Int {
  case list.key_find(wisp.get_query(req), key) {
    Error(_) -> default
    Ok(v) ->
      case int.parse(string.trim(v)) {
        Error(_) -> default
        Ok(n) ->
          case n < min {
            True -> min
            False ->
              case n > max {
                True -> max
                False -> n
              }
          }
      }
  }
}

fn run_steps_loop(
  ctx: Context,
  loops_left: Int,
  want_district: Bool,
  want_region: Bool,
  want_place: Bool,
  district_ran: Int,
  district_idle: Int,
  district_errs: List(String),
  region_ran: Int,
  region_idle: Int,
  region_errs: List(String),
  place_ran: Int,
  place_idle: Int,
  place_errs: List(String),
) -> #(
  Int,
  Int,
  List(String),
  Int,
  Int,
  List(String),
  Int,
  Int,
  List(String),
) {
  case loops_left < 1 {
    True -> #(
      district_ran,
      district_idle,
      district_errs,
      region_ran,
      region_idle,
      region_errs,
      place_ran,
      place_idle,
      place_errs,
    )
    False -> {
      let #(dr, di, de) = case want_district {
        False -> #(district_ran, district_idle, district_errs)
        True ->
          case district_ideas_http.worker_try_district_travel_ideas(ctx) {
            Ok(True) -> #(district_ran + 1, district_idle, district_errs)
            Ok(False) -> #(district_ran, district_idle + 1, district_errs)
            Error(e) -> #(district_ran, district_idle, [e, ..district_errs])
          }
      }

      let #(rr2, ri2, re2) = case want_region {
        False -> #(region_ran, region_idle, region_errs)
        True ->
          case region_content_http.worker_try_region_geo_batch(ctx) {
            Ok(True) -> #(region_ran + 1, region_idle, region_errs)
            Ok(False) -> #(region_ran, region_idle + 1, region_errs)
            Error(e) -> #(region_ran, region_idle, [e, ..region_errs])
          }
      }

      let #(pr2, pi2, pe2) = case want_place {
        False -> #(place_ran, place_idle, place_errs)
        True ->
          case region_content_http.worker_try_place_blog_batch(ctx) {
            Ok(True) -> #(place_ran + 1, place_idle, place_errs)
            Ok(False) -> #(place_ran, place_idle + 1, place_errs)
            Error(e) -> #(place_ran, place_idle, [e, ..place_errs])
          }
      }

      run_steps_loop(
        ctx,
        loops_left - 1,
        want_district,
        want_region,
        want_place,
        dr,
        di,
        de,
        rr2,
        ri2,
        re2,
        pr2,
        pi2,
        pe2,
      )
    }
  }
}

/// POST /api/v1/ai/worker/run-steps — `TRAVEL_AI_WORKER_SECRET` + header
pub fn post_run_steps(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_worker(req) {
    Error(r) -> r
    Ok(_) -> {
      let loops = query_loops(req)
      let want_district = query_enabled(req, "district")
      let want_region = query_enabled(req, "region")
      let want_place = query_enabled(req, "place")

      let #(
        district_processed,
        district_idle_ticks,
        district_errors,
        region_processed,
        region_idle_ticks,
        region_errors,
        place_processed,
        place_idle_ticks,
        place_errors,
      ) =
        run_steps_loop(
          ctx,
          loops,
          want_district,
          want_region,
          want_place,
          0,
          0,
          [],
          0,
          0,
          [],
          0,
          0,
          [],
        )

      let err_list = fn(xs: List(String)) {
        json.array(list.reverse(xs), json.string)
      }

      let body =
        json.object([
          #("loops", json.int(loops)),
          #(
            "district_travel_ideas",
            json.object([
              #("processed", json.int(district_processed)),
              #("idle_ticks", json.int(district_idle_ticks)),
              #("errors", err_list(district_errors)),
            ]),
          ),
          #(
            "region_content",
            json.object([
              #("processed", json.int(region_processed)),
              #("idle_ticks", json.int(region_idle_ticks)),
              #("errors", err_list(region_errors)),
            ]),
          ),
          #(
            "place_blogs",
            json.object([
              #("processed", json.int(place_processed)),
              #("idle_ticks", json.int(place_idle_ticks)),
              #("errors", err_list(place_errors)),
            ]),
          ),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn background_loop(
  ctx: Context,
  steps_left: Int,
  delay_ms: Int,
  want_district: Bool,
  want_region: Bool,
  want_place: Bool,
  want_trip: Bool,
  want_blue: Bool,
) -> Nil {
  case steps_left < 1 {
    True -> Nil
    False -> {
      case want_district {
        True -> {
          let _ = district_ideas_http.worker_try_district_travel_ideas(ctx)
          Nil
        }
        False -> Nil
      }
      case want_region {
        True -> {
          let _ = region_content_http.worker_try_region_geo_batch(ctx)
          Nil
        }
        False -> Nil
      }
      case want_place {
        True -> {
          let _ = region_content_http.worker_try_place_blog_batch(ctx)
          Nil
        }
        False -> Nil
      }
      case want_trip {
        True -> {
          let _ = trip_routes_http.worker_try_route_job(ctx, trip_routes_http.TripPlanner)
          Nil
        }
        False -> Nil
      }
      case want_blue {
        True -> {
          let _ = trip_routes_http.worker_try_route_job(ctx, trip_routes_http.BlueCruiseRoutes)
          Nil
        }
        False -> Nil
      }
      case delay_ms > 0 {
        True -> process.sleep(delay_ms)
        False -> Nil
      }
      background_loop(
        ctx,
        steps_left - 1,
        delay_ms,
        want_district,
        want_region,
        want_place,
        want_trip,
        want_blue,
      )
    }
  }
}

/// POST /api/v1/ai/worker/start-background — `admin.users.read`
///
/// Panelden uzun AI işlerini başlatır ve hemen cevap döner. İşler aynı BEAM
/// sürecinde arka planda adım adım sürer; ilerleme mevcut stats endpointlerinden
/// takip edilir.
pub fn post_start_background(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let steps = query_int_clamped(req, "steps", 200, 1, 5000)
      let delay_ms = query_int_clamped(req, "delay_ms", 20_000, 0, 300_000)
      let want_district = query_enabled(req, "district")
      let want_region = query_enabled(req, "region")
      let want_place = query_enabled(req, "place")
      let want_trip = query_enabled(req, "trip")
      let want_blue = query_enabled(req, "blue")

      spawn_unlinked(fn() {
        background_loop(
          ctx,
          steps,
          delay_ms,
          want_district,
          want_region,
          want_place,
          want_trip,
          want_blue,
        )
      })

      let body =
        json.object([
          #("started", json.bool(True)),
          #("steps", json.int(steps)),
          #("delay_ms", json.int(delay_ms)),
          #("district", json.bool(want_district)),
          #("region", json.bool(want_region)),
          #("place", json.bool(want_place)),
          #("trip", json.bool(want_trip)),
          #("blue", json.bool(want_blue)),
        ])
        |> json.to_string
      wisp.json_response(body, 202)
    }
  }
}
