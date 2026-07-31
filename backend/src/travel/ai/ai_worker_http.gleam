//// Sunucu tarafı AI işçisi — tarayıcı kapalıyken cron/systemd ile çağrılır.
////
//// Ortam: `TRAVEL_AI_WORKER_SECRET` (boş değilse endpoint aktif)
//// Header: `x-travel-ai-worker-secret: <aynı değer>`
////
//// POST /api/v1/ai/worker/run-steps
//// Query (isteğe bağlı):
//// - `loops` — 1–15, varsayılan 1; her döngüde etkin hatlar için bir deneme
//// - `district=0` | `region=0` | `place=0` | `trip=0` | `blue=0` | `supervisor=0`
////   — ilgili hattı kapatır (varsayılan: hepsi açık)
//// - `workflow=0` — autopilot/watchdog kapatır

import backend/context.{type Context}
import envoy
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/string
import travel/ai/ai_watchdog
import travel/ai/district_ideas_http
import travel/ai/listing_content_http
import travel/ai/region_content_http
import travel/ai/trip_routes_http
import travel/ai_agents/agent_center_http
import travel/identity/admin_gate
import wisp.{type Request, type Response}

const worker_secret_header = "x-travel-ai-worker-secret"

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
    Error(_) -> Error(json_err(503, "worker_secret_not_configured"))
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

fn tick_result(
  want: Bool,
  ran: Int,
  idle: Int,
  errs: List(String),
  try_fn: fn() -> Result(Bool, String),
) -> #(Int, Int, List(String)) {
  case want {
    False -> #(ran, idle, errs)
    True ->
      case try_fn() {
        Ok(True) -> #(ran + 1, idle, errs)
        Ok(False) -> #(ran, idle + 1, errs)
        Error(e) -> #(ran, idle, [e, ..errs])
      }
  }
}

fn run_watchdog_loop(
  ctx: Context,
  loops_left: Int,
  processed: Int,
  idle: Int,
  errors: List(String),
) -> #(Int, Int, List(String)) {
  case loops_left < 1 {
    True -> #(processed, idle, errors)
    False ->
      case ai_watchdog.worker_try_watchdog(ctx) {
        Ok(True) ->
          run_watchdog_loop(ctx, loops_left - 1, processed + 1, idle, errors)
        Ok(False) ->
          run_watchdog_loop(ctx, loops_left - 1, processed, idle + 1, errors)
        Error(e) ->
          run_watchdog_loop(ctx, loops_left - 1, processed, idle, [e, ..errors])
      }
  }
}

type StepsAcc {
  StepsAcc(
    district_ran: Int,
    district_idle: Int,
    district_errs: List(String),
    region_ran: Int,
    region_idle: Int,
    region_errs: List(String),
    place_ran: Int,
    place_idle: Int,
    place_errs: List(String),
    trip_ran: Int,
    trip_idle: Int,
    trip_errs: List(String),
    blue_ran: Int,
    blue_idle: Int,
    blue_errs: List(String),
  )
}

fn empty_steps_acc() -> StepsAcc {
  StepsAcc(0, 0, [], 0, 0, [], 0, 0, [], 0, 0, [], 0, 0, [])
}

fn run_steps_loop(
  ctx: Context,
  loops_left: Int,
  want_district: Bool,
  want_region: Bool,
  want_place: Bool,
  want_trip: Bool,
  want_blue: Bool,
  acc: StepsAcc,
) -> StepsAcc {
  case loops_left < 1 {
    True -> acc
    False -> {
      // İlan içerik editörü zamanlayıcının doğal bir parçasıdır.
      let _ = listing_content_http.worker_try_listing_content(ctx)

      let #(dr, di, de) =
        tick_result(want_district, acc.district_ran, acc.district_idle, acc.district_errs, fn() {
          district_ideas_http.worker_try_district_travel_ideas(ctx)
        })
      let #(rr, ri, re) =
        tick_result(want_region, acc.region_ran, acc.region_idle, acc.region_errs, fn() {
          region_content_http.worker_try_region_geo_batch(ctx)
        })
      let #(pr, pi, pe) =
        tick_result(want_place, acc.place_ran, acc.place_idle, acc.place_errs, fn() {
          region_content_http.worker_try_place_blog_batch(ctx)
        })
      let #(tr, ti, te) =
        tick_result(want_trip, acc.trip_ran, acc.trip_idle, acc.trip_errs, fn() {
          trip_routes_http.worker_try_route_job(ctx, trip_routes_http.TripPlanner)
        })
      let #(br, bi, be) =
        tick_result(want_blue, acc.blue_ran, acc.blue_idle, acc.blue_errs, fn() {
          trip_routes_http.worker_try_route_job(ctx, trip_routes_http.BlueCruiseRoutes)
        })

      run_steps_loop(
        ctx,
        loops_left - 1,
        want_district,
        want_region,
        want_place,
        want_trip,
        want_blue,
        StepsAcc(dr, di, de, rr, ri, re, pr, pi, pe, tr, ti, te, br, bi, be),
      )
    }
  }
}

fn lane_json(processed: Int, idle: Int, errors: List(String)) -> json.Json {
  json.object([
    #("processed", json.int(processed)),
    #("idle_ticks", json.int(idle)),
    #("errors", json.array(list.reverse(errors), json.string)),
  ])
}

/// POST /api/v1/ai/worker/run-steps — `TRAVEL_AI_WORKER_SECRET` + header
pub fn post_run_steps(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_worker(req) {
    Error(r) -> r
    Ok(_) -> {
      let loops = query_loops(req)
      let #(watchdog_processed, watchdog_idle, watchdog_errors) =
        case query_enabled(req, "workflow") {
          False -> #(0, 0, [])
          True -> run_watchdog_loop(ctx, loops, 0, 0, [])
        }

      let want_district = query_enabled(req, "district")
      let want_region = query_enabled(req, "region")
      let want_place = query_enabled(req, "place")
      let want_trip = query_enabled(req, "trip")
      let want_blue = query_enabled(req, "blue")
      let want_supervisor = query_enabled(req, "supervisor")

      let acc =
        run_steps_loop(
          ctx,
          loops,
          want_district,
          want_region,
          want_place,
          want_trip,
          want_blue,
          empty_steps_acc(),
        )

      // Genel müdür / supervisor: günde ~1 tur (due kontrolü içeride)
      let #(sup_processed, sup_idle, sup_errors) = case want_supervisor {
        False -> #(0, 0, [])
        True ->
          case agent_center_http.worker_try_supervisor_due(ctx) {
            Ok(True) -> #(1, 0, [])
            Ok(False) -> #(0, 1, [])
            Error(e) -> #(0, 0, [e])
          }
      }

      let body =
        json.object([
          #("loops", json.int(loops)),
          #(
            "workflow_watchdog",
            lane_json(watchdog_processed, watchdog_idle, watchdog_errors),
          ),
          #("district_travel_ideas", lane_json(acc.district_ran, acc.district_idle, acc.district_errs)),
          #("region_content", lane_json(acc.region_ran, acc.region_idle, acc.region_errs)),
          #("place_blogs", lane_json(acc.place_ran, acc.place_idle, acc.place_errs)),
          #("trip_planner", lane_json(acc.trip_ran, acc.trip_idle, acc.trip_errs)),
          #("blue_cruise_routes", lane_json(acc.blue_ran, acc.blue_idle, acc.blue_errs)),
          #("supervisor", lane_json(sup_processed, sup_idle, sup_errors)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// POST /api/v1/ai/worker/start-background — `admin.users.read`
///
/// Panel için güvenli başlatma onayıdır. Uzun AI işleri API sürecinde
/// başlatılmaz; `travel-ai-worker.timer` tarafından tekil ve kilitli çalıştırılır.
pub fn post_start_background(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let want_district = query_enabled(req, "district")
      let want_region = query_enabled(req, "region")
      let want_place = query_enabled(req, "place")
      let want_trip = query_enabled(req, "trip")
      let want_blue = query_enabled(req, "blue")

      let body =
        json.object([
          #("started", json.bool(True)),
          #("mode", json.string("systemd_timer")),
          #(
            "message",
            json.string(
              "AI kuyrukları travel-ai-worker.timer ile arka planda işlenir; panel kapansa da zamanlayıcı devam eder. Müdür/supervisor ve içerik hatları run-steps içinde çalışır.",
            ),
          ),
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
