//// Faz Tur1 — İlan şikayet/sorun bildirimleri.
////
//// Endpoint'ler:
////   POST /api/v1/public/listings/:id/report
////       body: { reason_code: string, message?: string, reporter_email?: string }
////       Anonim kullanıcı dahi gönderebilir; minimal anti-spam yok (rate-limit ileride).
////   GET  /api/v1/admin/listing-reports?status=open
////       Admin yetkisi gerekir; en yeniden eskiye listeler.
////   PATCH /api/v1/admin/listing-reports/:id  body: { status: 'reviewing'|'resolved'|'rejected' }

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
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

// ─── Public submit ────────────────────────────────────────────────────────────

fn report_decoder() -> decode.Decoder(#(String, String, String)) {
  use reason <- decode.field("reason_code", decode.string)
  use message <- decode.optional_field("message", "", decode.string)
  use email <- decode.optional_field("reporter_email", "", decode.string)
  decode.success(#(string.trim(reason), string.trim(message), string.trim(email)))
}

const allowed_reasons: List(String) = [
  "inappropriate", "fake", "scam", "wrong_info", "price_issue", "other",
]

pub fn submit(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, report_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(reason, message, email)) -> {
          case reason == "" {
            True -> json_err(400, "reason_code_required")
            False ->
              case list.contains(allowed_reasons, reason) {
                False -> json_err(400, "reason_code_invalid")
                True -> insert_report(ctx, listing_id, reason, message, email)
              }
          }
        }
      }
  }
}

fn insert_report(
  ctx: Context,
  listing_id: String,
  reason: String,
  message: String,
  email: String,
) -> Response {
  case
    pog.query(
      "insert into listing_reports (listing_id, reason_code, message, reporter_email)
       values ($1::uuid, $2, $3, $4)",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(reason))
    |> pog.parameter(pog.text(message))
    |> pog.parameter(pog.text(email))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "report_insert_failed")
    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
  }
}

// ─── Admin list ───────────────────────────────────────────────────────────────

fn report_row()
  -> decode.Decoder(#(String, String, String, String, String, String, String))
{
  use id <- decode.field(0, decode.string)
  use lid <- decode.field(1, decode.string)
  use reason <- decode.field(2, decode.string)
  use message <- decode.field(3, decode.string)
  use email <- decode.field(4, decode.string)
  use status <- decode.field(5, decode.string)
  use created <- decode.field(6, decode.string)
  decode.success(#(id, lid, reason, message, email, status, created))
}

fn row_to_json(r: #(String, String, String, String, String, String, String)) -> json.Json {
  let #(id, lid, reason, message, email, status, created) = r
  json.object([
    #("id", json.string(id)),
    #("listing_id", json.string(lid)),
    #("reason_code", json.string(reason)),
    #("message", json.string(message)),
    #("reporter_email", json.string(email)),
    #("status", json.string(status)),
    #("created_at", json.string(created)),
  ])
}

pub fn list_reports(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qparams = wisp.get_query(req)
      let status_clause = case list.key_find(qparams, "status") {
        Ok(s) ->
          case string.trim(s) {
            "" -> ""
            t -> " where status = '" <> safe_status(t) <> "' "
          }
        Error(_) -> ""
      }
      let sql =
        "select id::text, listing_id::text, reason_code, coalesce(message,''),
                coalesce(reporter_email,''), status, created_at::text
         from listing_reports" <> status_clause <>
        " order by created_at desc limit 200"
      case
        pog.query(sql)
        |> pog.returning(report_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let body =
            json.object([
              #("reports", json.array(ret.rows, row_to_json)),
              #("count", json.int(list.length(ret.rows))),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn safe_status(s: String) -> String {
  case s {
    "open" | "reviewing" | "resolved" | "rejected" -> s
    _ -> "open"
  }
}

// ─── Admin patch ──────────────────────────────────────────────────────────────

fn patch_decoder() -> decode.Decoder(String) {
  use status <- decode.field("status", decode.string)
  decode.success(string.trim(status))
}

pub fn patch_status(req: Request, ctx: Context, report_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(status) -> {
              case list.contains(["reviewing", "resolved", "rejected"], status) {
                False -> json_err(400, "status_invalid")
                True -> {
                  let resolved_clause = case status {
                    "resolved" | "rejected" -> ", resolved_at = now()"
                    _ -> ""
                  }
                  let sql =
                    "update listing_reports set status = $1" <> resolved_clause <>
                    " where id = $2::uuid"
                  case
                    pog.query(sql)
                    |> pog.parameter(pog.text(status))
                    |> pog.parameter(pog.text(report_id))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "patch_failed")
                    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
                  }
                }
              }
            }
          }
      }
  }
}
