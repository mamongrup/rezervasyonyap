//// Yönetici paneli uçları için ortak kapı — `admin.users.read`.

import backend/context.{type Context}
import gleam/json
import travel/identity/permissions
import wisp.{type Request, type Response}

/// `admin.users.read` veya `roles.code = 'admin'` (izin matrisinde eksik olsa bile).
pub fn require_admin_users_read(req: Request, ctx: Context) -> Result(String, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case
        permissions.user_has_permission(ctx.db, uid, "admin.users.read")
        || permissions.user_has_admin_role(ctx.db, uid)
      {
        True -> Ok(uid)
        False -> {
          let body =
            json.object([#("error", json.string("forbidden"))])
            |> json.to_string
          Error(wisp.json_response(body, 403))
        }
      }
  }
}
