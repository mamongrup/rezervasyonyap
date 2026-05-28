//// Partner API — `Authorization: Bearer trk_live_...` doğrulama ve kapsam kontrolü.

import backend/context.{type Context}
import travel/agency/api_key
import travel/agent/agent_rate_limit
import gleam/http/request
import gleam/json
import gleam/list
import gleam/string
import wisp.{type Request, type Response}

/// Agent API ile dağıtılan dikeyler (vitrin + dış satış).
pub const agent_vertical_codes =
  ["hotel", "holiday_home", "yacht_charter", "activity"]

pub fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

pub fn auth_header_token(req: Request) -> String {
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

pub fn auth_trk_key(
  req: Request,
  ctx: Context,
) -> Result(#(String, String, List(String)), Response) {
  let token = auth_header_token(req)
  case string.trim(token) == "" {
    True -> Error(json_err(401, "missing_token"))
    False ->
      case string.starts_with(token, "trk_live_") {
        False -> Error(json_err(401, "api_key_required"))
        True ->
          case api_key.resolve(ctx.db, token) {
            Error(_) -> Error(json_err(401, "invalid_api_key"))
            Ok(#(oid, prefix, scopes)) ->
              case agent_rate_limit.check_and_record(ctx, oid) {
                Error(_) -> Error(json_err(429, "rate_limit_exceeded"))
                Ok(Nil) -> Ok(#(oid, prefix, scopes))
              }
          }
      }
  }
}

pub fn require_scope(scopes: List(String), code: String) -> Result(Nil, Response) {
  case list.any(scopes, fn(s) { s == code }) {
    True -> Ok(Nil)
    False -> Error(json_err(403, "insufficient_scope"))
  }
}

pub fn vertical_allowed(code: String) -> Bool {
  list.contains(agent_vertical_codes, code)
}

fn category_label_tr(code: String) -> String {
  case code {
    "hotel" -> "Otel"
    "holiday_home" -> "Tatil evi / villa"
    "yacht_charter" -> "Yat kiralama"
    "activity" -> "Aktivite"
    _ -> code
  }
}

pub fn category_label(code: String) -> String {
  category_label_tr(code)
}
