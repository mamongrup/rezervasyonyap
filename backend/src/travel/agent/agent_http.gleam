//// Acente API anahtarı — `Authorization: Bearer trk_live_...` (G3.2).

import backend/context.{type Context}
import travel/agency/api_key
import travel/agency/sales_summary as agency_sales
import travel/booking/booking_http
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/string
import pog
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn auth_header_token(req: Request) -> String {
  case request.get_header(req, "authorization") {
    Error(_) -> ""
    Ok(h) -> {
      let t = string.trim(h)
      case string.starts_with(string.lowercase(t), "bearer ") {
        True ->
          t
          |> string.drop_start(7)
          |> string.trim
        False -> ""
      }
    }
  }
}

fn auth_trk_key(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String, List(String)), Response) {
  let token = auth_header_token(req)
  case string.trim(token) == "" {
    True -> Error(json_err(401, "missing_token"))
    False ->
      case string.starts_with(token, "trk_live_") {
        False -> Error(json_err(401, "api_key_required"))
        True ->
          case api_key.resolve(conn, token) {
            Error(_) -> Error(json_err(401, "invalid_api_key"))
            Ok(#(oid, prefix, scopes)) -> Ok(#(oid, prefix, scopes))
          }
      }
  }
}

/// GET /api/v1/agent/me — kurum + kapsamlar (yalnızca `trk_live_` API anahtarı).
pub fn me(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_trk_key(req, ctx.db) {
    Error(r) -> r
    Ok(#(oid, prefix, scopes)) -> {
      let body =
        json.object([
          #("organization_id", json.string(oid)),
          #("key_prefix", json.string(prefix)),
          #("scopes", json.array(from: scopes, of: json.string)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/agent/reservations — `reservations.read` kapsamı gerekir.
pub fn list_reservations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_trk_key(req, ctx.db) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) -> {
      case list.any(scopes, fn(s) { s == "reservations.read" }) {
        False -> json_err(403, "insufficient_scope")
        True -> booking_http.list_agency_reservations_response(ctx.db, oid)
      }
    }
  }
}

/// GET /api/v1/agent/sales-summary?from=&to= — aynı kapsam (`reservations.read`).
pub fn sales_summary(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_trk_key(req, ctx.db) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) -> {
      case list.any(scopes, fn(s) { s == "reservations.read" }) {
        False -> json_err(403, "insufficient_scope")
        True -> {
          let #(from_q, to_q) = agency_sales.query_range(req)
          agency_sales.response(ctx.db, oid, from_q, to_q)
        }
      }
    }
  }
}
