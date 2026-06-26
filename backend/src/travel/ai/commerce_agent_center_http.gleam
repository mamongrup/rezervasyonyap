//// Ticari İşletim Merkezi — admin API (satış sonrası, ilan sahibi, muhasebe).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/ai/commerce_ops_enqueue
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

fn agent_row() -> decode.Decoder(#(String, String, String, String, String, String, String)) {
  use code <- decode.field(0, decode.string)
  use name <- decode.field(1, decode.string)
  use desc <- decode.field(2, decode.string)
  use mode <- decode.field(3, decode.string)
  use status <- decode.field(4, decode.string)
  use risk <- decode.field(5, decode.string)
  use last_run <- decode.field(6, decode.string)
  decode.success(#(code, name, desc, mode, status, risk, last_run))
}

fn job_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use profile <- decode.field(1, decode.string)
  use st <- decode.field(2, decode.string)
  use created <- decode.field(3, decode.string)
  use err <- decode.field(4, decode.string)
  decode.success(#(id, profile, st, created, err))
}

fn count_pair() -> decode.Decoder(#(String, Int)) {
  use k <- decode.field(0, decode.string)
  use v <- decode.field(1, decode.int)
  decode.success(#(k, v))
}

/// GET /api/v1/agents/commerce/overview
pub fn overview(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "select code, display_name, description, mode, status, risk_level, coalesce(last_run_at::text,'') from ai_agents where scope_json->>'pillar' = 'commerce' order by code",
        )
        |> pog.returning(agent_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "commerce_agents_query_failed")
        Ok(ar) -> {
          case
            pog.query(
              "select id::text, profile_code, status, created_at::text, coalesce(error,'') from ai_jobs where profile_code in ('post_booking_concierge','commerce_owner_agent','commerce_accounting_agent') order by created_at desc limit 30",
            )
            |> pog.returning(job_row())
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> json_err(500, "commerce_jobs_query_failed")
            Ok(jr) ->
              case
                pog.query(
                  "select status, count(*)::int from ai_agent_recommendations where agent_code in ('commerce_owner_brief','commerce_accounting') group by status",
                )
                |> pog.returning(count_pair())
                |> db_exec.execute(ctx.db)
              {
                Error(_) -> json_err(500, "commerce_recommendations_query_failed")
                Ok(cr) -> {
                  let agents =
                    list.map(ar.rows, fn(row) {
                      let #(code, name, desc, mode, status, risk, last_run) = row
                      json.object([
                        #("code", json.string(code)),
                        #("display_name", json.string(name)),
                        #("description", json.string(desc)),
                        #("mode", json.string(mode)),
                        #("status", json.string(status)),
                        #("risk_level", json.string(risk)),
                        #("last_run_at", json.string(last_run)),
                      ])
                    })
                  let jobs =
                    list.map(jr.rows, fn(row) {
                      let #(id, profile, st, created, err) = row
                      json.object([
                        #("id", json.string(id)),
                        #("profile_code", json.string(profile)),
                        #("status", json.string(st)),
                        #("created_at", json.string(created)),
                        #("error", json.string(err)),
                      ])
                    })
                  let rec_counts =
                    list.map(cr.rows, fn(pair) {
                      let #(k, v) = pair
                      json.object([#("status", json.string(k)), #("count", json.int(v))])
                    })
                  let body =
                    json.object([
                      #("agents", json.array(from: agents, of: fn(x) { x })),
                      #("recent_jobs", json.array(from: jobs, of: fn(x) { x })),
                      #(
                        "recommendation_counts",
                        json.array(from: rec_counts, of: fn(x) { x }),
                      ),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
              }
          }
        }
      }
    }
  }
}

/// POST /api/v1/agents/commerce/run-due — kuyruktaki ticari işleri çalıştırır.
pub fn run_due(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case commerce_ops_enqueue.run_due_commerce_jobs(ctx, 20) {
        Error(e) -> json_err(500, e)
        Ok(n) -> {
          let body =
            json.object([#("processed", json.int(n))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn enqueue_decoder() -> decode.Decoder(String) {
  decode.field("reservation_id", decode.string, fn(rid) { decode.success(rid) })
}

/// POST /api/v1/agents/commerce/enqueue — tek rezervasyon için ticari işleri kuyruğa alır.
pub fn enqueue_for_reservation(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, enqueue_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(rid) ->
              case string.trim(rid) == "" {
                True -> json_err(400, "reservation_id_required")
                False -> {
                  commerce_ops_enqueue.enqueue_commerce_ops_for_reservation(
                    ctx,
                    rid,
                    "manual_enqueue",
                  )
                  let out =
                    json.object([#("ok", json.bool(True))])
                    |> json.to_string
                  wisp.json_response(out, 200)
                }
              }
          }
      }
  }
}
