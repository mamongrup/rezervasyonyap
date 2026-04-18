//// Oturumdan kullanıcı ve rol tabanlı izin çözümü (189_identity_permissions_matrix).
//// Matris tabloları yoksa veya sorgu hata verirse rol tabanlı geri dönüş (kurulum öncesi uyumluluk).

import gleam/dynamic/decode
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

pub fn bearer_token(req: Request) -> String {
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

fn session_user_id_raw(conn: pog.Connection, token: String) -> Result(String, Nil) {
  case string.trim(token) == "" {
    True -> Error(Nil)
    False ->
      case
        pog.query(
          "select u.id::text from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
        )
        |> pog.parameter(pog.text(token))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          decode.success(a)
        })
        |> pog.execute(conn)
      {
        Error(_) -> Error(Nil)
        Ok(ret) ->
          case ret.rows {
            [row] -> Ok(row)
            _ -> Error(Nil)
          }
      }
  }
}

/// Geçerli oturumdan kullanıcı kimliği (JSON hata yanıtı ile).
pub fn session_user_from_request(req: Request, conn: pog.Connection) -> Result(
  String,
  Response,
) {
  let token = bearer_token(req)
  case token == "" {
    True -> Error(json_err(401, "missing_token"))
    False ->
      case session_user_id_raw(conn, token) {
        Error(_) -> Error(json_err(401, "invalid_session"))
        Ok(uid) -> Ok(uid)
      }
  }
}

fn exists_row() -> decode.Decoder(Bool) {
  use b <- decode.field(0, decode.bool)
  decode.success(b)
}

/// `permissions` tablosu kurulu mu (189 uygulanmamış DB'lerde false).
pub fn permissions_matrix_available(conn: pog.Connection) -> Bool {
  case
    pog.query(
      "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'permissions') and exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'role_permissions')",
    )
    |> pog.returning(exists_row())
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) ->
      case ret.rows {
        [True] -> True
        _ -> False
      }
  }
}

fn perm_code_row() -> decode.Decoder(String) {
  use c <- decode.field(0, decode.string)
  decode.success(c)
}

fn role_code_row() -> decode.Decoder(String) {
  use c <- decode.field(0, decode.string)
  decode.success(c)
}

fn legacy_admin_perm_codes() -> List(String) {
  [
    "admin.users.read", "admin.roles.read", "admin.users.write_roles",
    "admin.audit.read", "admin.permissions.read", "admin.permissions.write",
  ]
}

pub fn fallback_permission_catalog() -> List(#(String, String)) {
  [
    #("admin.users.read", "Yönetici: kullanıcı listesi"),
    #("admin.roles.read", "Yönetici: kullanıcı rol atamalarını görüntüleme"),
    #("admin.users.write_roles", "Yönetici: kullanıcı rolü ver / kaldır"),
    #("admin.audit.read", "Yönetici: denetim günlüğü"),
    #("admin.permissions.read", "Yönetici: izin ve rol–izin matrisini okuma"),
    #("admin.permissions.write", "Yönetici: rol–izin ataması değiştirme"),
    #("staff.profile.read", "Personel: profil / kurum özeti"),
    #("staff.reservations.read", "Personel: rezervasyon listesi"),
    #("staff.invoices.read", "Personel: kurum faturaları (salt okuma)"),
    #("agency.portal", "Acente: oturumla portal uçları"),
    #("supplier.portal", "Tedarikçi: oturumla portal uçları"),
  ]
}

fn legacy_codes_for_role(code: String) -> List(String) {
  case string.lowercase(code) {
    "admin" -> legacy_admin_perm_codes()
    "staff" -> [
      "staff.profile.read", "staff.reservations.read", "staff.invoices.read",
    ]
    "agency" -> ["agency.portal"]
    "supplier" -> ["supplier.portal"]
    _ -> []
  }
}

/// Matris tablosu yokken admin UI için rol × izin çiftleri (roller tablosundan türetilir).
pub fn fallback_role_permission_entries(conn: pog.Connection) -> List(
  #(String, String),
) {
  case
    pog.query("select code::text from roles order by id")
    |> pog.returning(role_code_row())
    |> pog.execute(conn)
  {
    Error(_) -> []
    Ok(ret) ->
      list.flat_map(ret.rows, fn(rc) {
        list.map(legacy_codes_for_role(rc), fn(pc) { #(rc, pc) })
      })
  }
}

fn legacy_user_permission_codes(conn: pog.Connection, user_id: String) -> List(
  String,
) {
  case
    pog.query(
      "select distinct r.code::text from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(role_code_row())
    |> pog.execute(conn)
  {
    Error(_) -> []
    Ok(ret) -> {
      let nested = list.map(ret.rows, legacy_codes_for_role)
      list.flatten(nested)
      |> list.unique
      |> list.sort(string.compare)
    }
  }
}

fn legacy_has_admin_role(conn: pog.Connection, user_id: String) -> Bool {
  case
    pog.query(
      "select 1 from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid and r.code = 'admin' limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning({
      use _ <- decode.field(0, decode.int)
      decode.success(Nil)
    })
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) ->
      case ret.rows {
        [_] -> True
        _ -> False
      }
  }
}

/// `roles.code = 'admin'` — izin matrisinde `admin.users.read` eksik olsa bile yönetici paneli erişimi için kullanılır.
pub fn user_has_admin_role(conn: pog.Connection, user_id: String) -> Bool {
  legacy_has_admin_role(conn, user_id)
}

fn legacy_has_staff_role(conn: pog.Connection, user_id: String) -> Bool {
  case
    pog.query(
      "select 1 from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid and r.code = 'staff' and ur.organization_id is not null limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning({
      use _ <- decode.field(0, decode.int)
      decode.success(Nil)
    })
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) ->
      case ret.rows {
        [_] -> True
        _ -> False
      }
  }
}

fn legacy_has_agency_role(conn: pog.Connection, user_id: String) -> Bool {
  case
    pog.query(
      "select 1 from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid and r.code = 'agency' and ur.organization_id is not null limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning({
      use _ <- decode.field(0, decode.int)
      decode.success(Nil)
    })
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) ->
      case ret.rows {
        [_] -> True
        _ -> False
      }
  }
}

fn legacy_has_supplier_profile(conn: pog.Connection, user_id: String) -> Bool {
  case
    pog.query(
      "select 1 from supplier_profiles where user_id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning({
      use _ <- decode.field(0, decode.int)
      decode.success(Nil)
    })
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) ->
      case ret.rows {
        [_] -> True
        _ -> False
      }
  }
}

fn legacy_user_has_permission(
  conn: pog.Connection,
  user_id: String,
  permission_code: String,
) -> Bool {
  case string.starts_with(permission_code, "admin.") {
    True -> legacy_has_admin_role(conn, user_id)
    False ->
      case permission_code {
        "staff.profile.read" | "staff.reservations.read" | "staff.invoices.read" ->
          legacy_has_staff_role(conn, user_id)
        "agency.portal" -> legacy_has_agency_role(conn, user_id)
        "supplier.portal" -> legacy_has_supplier_profile(conn, user_id)
        _ -> False
      }
  }
}

pub fn user_permission_codes(conn: pog.Connection, user_id: String) -> List(String) {
  case string.trim(user_id) == "" {
    True -> []
    False ->
      case permissions_matrix_available(conn) {
        False -> legacy_user_permission_codes(conn, user_id)
        True ->
          case
            pog.query(
              "select distinct p.code::text from user_roles ur join roles r on r.id = ur.role_id join role_permissions rp on rp.role_id = r.id join permissions p on p.id = rp.permission_id where ur.user_id = $1::uuid order by p.code",
            )
            |> pog.parameter(pog.text(user_id))
            |> pog.returning(perm_code_row())
            |> pog.execute(conn)
          {
            Error(_) -> legacy_user_permission_codes(conn, user_id)
            Ok(ret) -> ret.rows
          }
      }
  }
}

pub fn user_has_permission(
  conn: pog.Connection,
  user_id: String,
  permission_code: String,
) -> Bool {
  case string.trim(user_id) == "" || string.trim(permission_code) == "" {
    True -> False
    False ->
      case permissions_matrix_available(conn) {
        False -> legacy_user_has_permission(conn, user_id, permission_code)
        True ->
          case
            pog.query(
              "select 1 from user_roles ur join roles r on r.id = ur.role_id join role_permissions rp on rp.role_id = r.id join permissions p on p.id = rp.permission_id where ur.user_id = $1::uuid and p.code = $2 limit 1",
            )
            |> pog.parameter(pog.text(user_id))
            |> pog.parameter(pog.text(permission_code))
            |> pog.returning({
              use _ <- decode.field(0, decode.int)
              decode.success(Nil)
            })
            |> pog.execute(conn)
          {
            Error(_) -> legacy_user_has_permission(conn, user_id, permission_code)
            Ok(ret) ->
              case ret.rows {
                [_] -> True
                _ -> False
              }
          }
      }
  }
}

pub fn permissions_json(codes: List(String)) -> json.Json {
  json.array(from: list.sort(codes, string.compare), of: json.string)
}

pub fn require_permission(
  conn: pog.Connection,
  user_id: String,
  permission_code: String,
) -> Result(Nil, Response) {
  case user_has_permission(conn, user_id, permission_code) {
    True -> Ok(Nil)
    False -> Error(json_err(403, "forbidden"))
  }
}
