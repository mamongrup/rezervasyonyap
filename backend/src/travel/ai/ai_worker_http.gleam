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
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/string
import travel/ai/district_ideas_http
import travel/ai/region_content_http
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
