import backend/context.{type Context}
import travel/agency/sales_summary as agency_sales
import travel/agent/agent_auth
import travel/booking/booking_http
import gleam/http
import gleam/json
import wisp.{type Request, type Response}

/// GET /api/v1/agent/me — kurum + kapsamlar (yalnızca `trk_live_` API anahtarı).
pub fn me(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, prefix, scopes)) -> {
      let categories =
        json.array(from: agent_auth.agent_vertical_codes, of: json.string)
      let body =
        json.object([
          #("organization_id", json.string(oid)),
          #("key_prefix", json.string(prefix)),
          #("scopes", json.array(from: scopes, of: json.string)),
          #("catalog_categories", categories),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/agent/reservations — `reservations.read` kapsamı gerekir.
pub fn list_reservations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "reservations.read") {
        Error(r) -> r
        Ok(Nil) -> booking_http.list_agency_reservations_response(ctx.db, oid)
      }
  }
}

/// GET /api/v1/agent/sales-summary?from=&to= — aynı kapsam (`reservations.read`).
pub fn sales_summary(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "reservations.read") {
        Error(r) -> r
        Ok(Nil) -> {
          let #(from_q, to_q) = agency_sales.query_range(req)
          agency_sales.response(ctx.db, oid, from_q, to_q)
        }
      }
  }
}
