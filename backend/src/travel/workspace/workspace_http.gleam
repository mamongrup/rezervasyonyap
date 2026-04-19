//// İş planı görevleri (yönetici + personel) ve tedarikçi / acente portal duyuruları.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/identity/permissions
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

fn require_admin_users_read(req: Request, ctx: Context) -> Result(String, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> Error(json_err(403, "forbidden"))
        True -> Ok(uid)
      }
  }
}

fn require_staff_reservations(req: Request, ctx: Context) -> Result(String, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "staff.reservations.read") {
        False -> Error(json_err(403, "forbidden"))
        True -> Ok(uid)
      }
  }
}

fn supplier_context_row() -> decode.Decoder(#(String, String, String, String)) {
  use oid <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use created <- decode.field(3, decode.string)
  decode.success(#(oid, slug, name, created))
}

fn require_supplier_org(
  conn: pog.Connection,
  user_id: String,
) -> Result(#(String, String, String, String), Nil) {
  case
    pog.query(
      "select o.id::text, o.slug, o.name, to_char(sp.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from supplier_profiles sp inner join organizations o on o.id = sp.organization_id where sp.user_id = $1::uuid and o.org_type = 'supplier' limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(supplier_context_row())
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

fn auth_supplier_portal(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String), Response) {
  case permissions.session_user_from_request(req, conn) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(conn, uid, "supplier.portal") {
        False -> Error(json_err(403, "forbidden"))
        True ->
          case require_supplier_org(conn, uid) {
            Error(_) -> Error(json_err(403, "not_supplier"))
            Ok(#(oid, _, _, _)) -> Ok(#(uid, oid))
          }
      }
  }
}

fn agency_context_row() -> decode.Decoder(#(String, String, String)) {
  use oid <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  decode.success(#(oid, slug, name))
}

fn require_agency_org(
  conn: pog.Connection,
  user_id: String,
) -> Result(#(String, String, String), Nil) {
  case
    pog.query(
      "select o.id::text, o.slug, o.name
         from user_roles ur
         inner join roles r on r.id = ur.role_id
         inner join organizations o on o.id = ur.organization_id and o.org_type = 'agency'
        where ur.user_id = $1::uuid and r.code = 'agency'
        order by ur.created_at desc nulls last, o.id
        limit 1",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(agency_context_row())
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

fn auth_agency_portal(
  req: Request,
  conn: pog.Connection,
) -> Result(#(String, String), Response) {
  case permissions.session_user_from_request(req, conn) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(conn, uid, "agency.portal") {
        False -> Error(json_err(403, "forbidden"))
        True ->
          case require_agency_org(conn, uid) {
            Error(_) -> Error(json_err(403, "not_agency"))
            Ok(#(oid, _, _)) -> Ok(#(uid, oid))
          }
      }
  }
}

fn task_row_11() -> decode.Decoder(
  #(
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
  ),
) {
  use id <- decode.field(0, decode.string)
  use title <- decode.field(1, decode.string)
  use body <- decode.field(2, decode.string)
  use due <- decode.field(3, decode.string)
  use remind <- decode.field(4, decode.string)
  use assignee <- decode.field(5, decode.string)
  use created_by <- decode.field(6, decode.string)
  use status <- decode.field(7, decode.string)
  use created_at <- decode.field(8, decode.string)
  use updated_at <- decode.field(9, decode.string)
  use assignee_label <- decode.field(10, decode.string)
  decode.success(#(
    id,
    title,
    body,
    due,
    remind,
    assignee,
    created_by,
    status,
    created_at,
    updated_at,
    assignee_label,
  ))
}

fn task_json(
  row: #(
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
  ),
) -> json.Json {
  let #(
    id,
    title,
    body,
    due,
    remind,
    assignee,
    created_by,
    status,
    created_at,
    updated_at,
    assignee_label,
  ) = row
  let assignee_j = case assignee == "" {
    True -> json.null()
    False -> json.string(assignee)
  }
  let due_j = case due == "" {
    True -> json.null()
    False -> json.string(due)
  }
  let remind_j = case remind == "" {
    True -> json.null()
    False -> json.string(remind)
  }
  json.object([
    #("id", json.string(id)),
    #("title", json.string(title)),
    #("body", json.string(body)),
    #("due_date", due_j),
    #("remind_at", remind_j),
    #("assignee_user_id", assignee_j),
    #("assignee_label", json.string(assignee_label)),
    #("created_by_user_id", json.string(created_by)),
    #("status", json.string(status)),
    #("created_at", json.string(created_at)),
    #("updated_at", json.string(updated_at)),
    #("assign_to_all_staff", json.bool(assignee == "")),
  ])
}

fn tasks_query_sql() -> String {
  "select t.id::text, t.title, t.body, coalesce(to_char(t.due_date, 'YYYY-MM-DD'), ''), case when t.remind_at is null then '' else to_char(t.remind_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') end, coalesce(t.assignee_user_id::text, ''), t.created_by_user_id::text, t.status, to_char(t.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), to_char(t.updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), coalesce(u_assign.display_name, u_assign.email, '') from staff_workspace_tasks t left join users u_assign on u_assign.id = t.assignee_user_id "
}

/// GET /api/v1/admin/workspace/tasks
pub fn admin_list_tasks(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(tasks_query_sql() <> " order by t.due_date nulls last, t.remind_at nulls last, t.created_at desc limit 500")
        |> pog.returning(task_row_11())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, task_json)
          let body =
            json.object([#("tasks", json.array(arr, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_task_decoder() -> decode.Decoder(
  #(String, String, String, String, String),
) {
  decode.field("title", decode.string, fn(title) {
    decode.optional_field("body", "", decode.string, fn(b) {
      decode.optional_field("due_date", "", decode.string, fn(d) {
        decode.optional_field("remind_at", "", decode.string, fn(r) {
          decode.optional_field("assignee_user_id", "", decode.string, fn(a) {
            decode.success(#(title, b, d, r, a))
          })
        })
      })
    })
  })
}

/// POST /api/v1/admin/workspace/tasks
pub fn admin_create_task(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(uid) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_task_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(title, b, d, r, a)) ->
              case string.trim(title) == "" {
                True -> json_err(400, "title_required")
                False -> {
                  let assign_p = case string.trim(a) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(a))
                  }
                  let due_p = case string.trim(d) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(d))
                  }
                  let rem_p = case string.trim(r) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(r))
                  }
                  case
                    pog.query(
                      "insert into staff_workspace_tasks (title, body, due_date, remind_at, assignee_user_id, created_by_user_id, status) values ($1, $2, case when $3::text is null or trim($3::text) = '' then null else trim($3::text)::date end, case when $4::text is null or trim($4::text) = '' then null else trim($4::text)::timestamptz end, $5, $6::uuid, 'open') returning id::text",
                    )
                    |> pog.parameter(pog.text(string.trim(title)))
                    |> pog.parameter(pog.text(string.trim(b)))
                    |> pog.parameter(due_p)
                    |> pog.parameter(rem_p)
                    |> pog.parameter(assign_p)
                    |> pog.parameter(pog.text(uid))
                    |> pog.returning({
                      use s <- decode.field(0, decode.string)
                      decode.success(s)
                    })
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "insert_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [id] -> {
                          let out =
                            json.object([#("id", json.string(id))])
                            |> json.to_string
                          wisp.json_response(out, 201)
                        }
                        _ -> json_err(500, "unexpected")
                      }
                  }
                }
              }
          }
      }
  }
}

fn patch_task_decoder() -> decode.Decoder(
  #(String, String, String, String, String, String),
) {
  decode.field("title", decode.string, fn(title) {
    decode.optional_field("body", "", decode.string, fn(b) {
      decode.optional_field("due_date", "", decode.string, fn(d) {
        decode.optional_field("remind_at", "", decode.string, fn(r) {
          decode.optional_field("assignee_user_id", "", decode.string, fn(a) {
            decode.field("status", decode.string, fn(st) {
              decode.success(#(title, b, d, r, a, st))
            })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/admin/workspace/tasks/:id
pub fn admin_patch_task(req: Request, ctx: Context, task_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_task_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(title, b, d, r, a, st)) ->
              case string.trim(title) == "" {
                True -> json_err(400, "title_required")
                False -> {
                  let assign_p = case string.trim(a) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(a))
                  }
                  let due_p = case string.trim(d) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(d))
                  }
                  let rem_p = case string.trim(r) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(r))
                  }
                  let stt = string.trim(st)
                  let status_ok =
                    stt == "open" || stt == "done" || stt == "cancelled"
                  case status_ok {
                    False -> json_err(400, "invalid_status")
                    True ->
                      case
                        pog.query(
                          "update staff_workspace_tasks set title = $2, body = $3, due_date = case when $4::text is null or trim($4::text) = '' then null else trim($4::text)::date end, remind_at = case when $5::text is null or trim($5::text) = '' then null else trim($5::text)::timestamptz end, assignee_user_id = $6, status = $7, updated_at = now() where id = $1::uuid",
                        )
                        |> pog.parameter(pog.text(string.trim(task_id)))
                        |> pog.parameter(pog.text(string.trim(title)))
                        |> pog.parameter(pog.text(string.trim(b)))
                        |> pog.parameter(due_p)
                        |> pog.parameter(rem_p)
                        |> pog.parameter(assign_p)
                        |> pog.parameter(pog.text(stt))
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "update_failed")
                        Ok(ret) ->
                          case ret.count {
                            0 -> json_err(404, "not_found")
                            _ ->
                              wisp.json_response("{\"ok\":true}", 200)
                          }
                      }
                  }
                }
              }
          }
      }
  }
}

/// DELETE /api/v1/admin/workspace/tasks/:id
pub fn admin_delete_task(req: Request, ctx: Context, task_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from staff_workspace_tasks where id = $1::uuid")
        |> pog.parameter(pog.text(string.trim(task_id)))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(ret) ->
          case ret.count {
            0 -> json_err(404, "not_found")
            _ -> wisp.json_response("{\"ok\":true}", 200)
          }
      }
  }
}

/// GET /api/v1/staff/workspace/tasks
pub fn staff_list_tasks(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_staff_reservations(req, ctx) {
    Error(r) -> r
    Ok(uid) ->
      case
        pog.query(
          tasks_query_sql()
            <> " where t.status <> 'cancelled' and (t.assignee_user_id is null or t.assignee_user_id = $1::uuid) order by t.due_date nulls last, t.remind_at nulls last, t.created_at desc limit 200",
        )
        |> pog.parameter(pog.text(uid))
        |> pog.returning(task_row_11())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, task_json)
          let body =
            json.object([#("tasks", json.array(arr, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn staff_status_decoder() -> decode.Decoder(String) {
  decode.field("status", decode.string, fn(st) { decode.success(st) })
}

/// PATCH /api/v1/staff/workspace/tasks/:id — yalnızca status (open / done)
pub fn staff_patch_task(req: Request, ctx: Context, task_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_staff_reservations(req, ctx) {
    Error(r) -> r
    Ok(uid) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, staff_status_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(st) -> {
              let stt = string.trim(st)
              let ok = stt == "open" || stt == "done"
              case ok {
                False -> json_err(400, "invalid_status")
                True ->
                  case
                    pog.query(
                      "update staff_workspace_tasks set status = $2, updated_at = now() where id = $1::uuid and status <> 'cancelled' and (assignee_user_id is null or assignee_user_id = $3::uuid)",
                    )
                    |> pog.parameter(pog.text(string.trim(task_id)))
                    |> pog.parameter(pog.text(stt))
                    |> pog.parameter(pog.text(uid))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "update_failed")
                    Ok(ret) ->
                      case ret.count {
                        0 -> json_err(404, "not_found")
                        _ -> wisp.json_response("{\"ok\":true}", 200)
                      }
                  }
              }
            }
          }
      }
  }
}

fn org_pick_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use name <- decode.field(1, decode.string)
  use slug <- decode.field(2, decode.string)
  decode.success(#(id, name, slug))
}

fn org_pick_json(row: #(String, String, String)) -> json.Json {
  let #(id, name, slug) = row
  json.object([
    #("id", json.string(id)),
    #("name", json.string(name)),
    #("slug", json.string(slug)),
  ])
}

fn staff_user_row() -> decode.Decoder(#(String, String)) {
  use id <- decode.field(0, decode.string)
  use label <- decode.field(1, decode.string)
  decode.success(#(id, label))
}

fn staff_user_json(row: #(String, String)) -> json.Json {
  let #(id, label) = row
  json.object([#("id", json.string(id)), #("label", json.string(label))])
}

/// GET /api/v1/admin/workspace/staff-assignees — görev ataması için personel listesi
pub fn admin_list_staff_assignees(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select distinct u.id::text, coalesce(nullif(trim(coalesce(u.display_name, '')), ''), u.email, u.id::text) from users u inner join user_roles ur on ur.user_id = u.id inner join roles r on r.id = ur.role_id where r.code = 'staff' order by 2 limit 300",
        )
        |> pog.returning(staff_user_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, staff_user_json)
          let body =
            json.object([#("users", json.array(arr, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

/// GET /api/v1/admin/workspace/recipient-orgs?audience=supplier|agency
pub fn admin_list_recipient_orgs(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let aud =
        list.key_find(qs, "audience")
        |> result.unwrap("supplier")
        |> string.lowercase
        |> string.trim
      let sql = case aud {
        "agency" ->
          "select distinct o.id::text, o.name, o.slug from organizations o where o.org_type = 'agency' and exists (select 1 from user_roles ur join roles r on r.id = ur.role_id where ur.organization_id = o.id and r.code = 'agency') order by o.name limit 500"
        _ ->
          "select distinct o.id::text, o.name, o.slug from organizations o inner join supplier_profiles sp on sp.organization_id = o.id where o.org_type = 'supplier' order by o.name limit 500"
      }
      case
        pog.query(sql)
        |> pog.returning(org_pick_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, org_pick_json)
          let body =
            json.object([#("organizations", json.array(arr, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn announcement_row() -> decode.Decoder(
  #(String, String, Bool, String, String, String, String, String),
) {
  use id <- decode.field(0, decode.string)
  use audience <- decode.field(1, decode.string)
  use ta <- decode.field(2, decode.bool)
  use title <- decode.field(3, decode.string)
  use body <- decode.field(4, decode.string)
  use created <- decode.field(5, decode.string)
  use exp <- decode.field(6, decode.string)
  use by_label <- decode.field(7, decode.string)
  decode.success(#(id, audience, ta, title, body, created, exp, by_label))
}

fn announcement_json(
  row: #(String, String, Bool, String, String, String, String, String),
) -> json.Json {
  let #(id, audience, ta, title, body, created, exp, by_label) = row
  let exp_j = case exp == "" {
    True -> json.null()
    False -> json.string(exp)
  }
  json.object([
    #("id", json.string(id)),
    #("audience", json.string(audience)),
    #("target_all", json.bool(ta)),
    #("title", json.string(title)),
    #("body", json.string(body)),
    #("created_at", json.string(created)),
    #("expires_at", exp_j),
    #("created_by_label", json.string(by_label)),
  ])
}

fn announcements_base_sql() -> String {
  "select a.id::text, a.audience::text, a.target_all, a.title, a.body, to_char(a.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), case when a.expires_at is null then '' else to_char(a.expires_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') end, coalesce(u.display_name, u.email, '') from portal_announcements a left join users u on u.id = a.created_by_user_id "
}

/// GET /api/v1/admin/workspace/announcements
pub fn admin_list_announcements(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          announcements_base_sql()
            <> " order by a.created_at desc limit 200",
        )
        |> pog.returning(announcement_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, announcement_json)
          let body =
            json.object([#("announcements", json.array(arr, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn create_announcement_decoder() -> decode.Decoder(
  #(String, Bool, String, String, String, List(String)),
) {
  decode.field("audience", decode.string, fn(audience) {
    decode.field("target_all", decode.bool, fn(target_all) {
      decode.field("title", decode.string, fn(title) {
        decode.optional_field("body", "", decode.string, fn(b) {
          decode.optional_field("expires_at", "", decode.string, fn(ex) {
            decode.optional_field("recipient_organization_ids", [], decode.list(decode.string), fn(
              ids,
            ) { decode.success(#(audience, target_all, title, b, ex, ids)) })
          })
        })
      })
    })
  })
}

fn insert_announcement_recipients(
  conn: pog.Connection,
  announcement_id: String,
  org_ids: List(String),
) -> Result(Nil, Nil) {
  case org_ids {
    [] -> Ok(Nil)
    [oid, ..rest] -> {
      case
        pog.query(
          "insert into portal_announcement_recipients (announcement_id, organization_id) values ($1::uuid, $2::uuid) on conflict do nothing",
        )
        |> pog.parameter(pog.text(announcement_id))
        |> pog.parameter(pog.text(string.trim(oid)))
        |> pog.execute(conn)
      {
        Error(_) -> Error(Nil)
        Ok(_) -> insert_announcement_recipients(conn, announcement_id, rest)
      }
    }
  }
}

/// POST /api/v1/admin/workspace/announcements
pub fn admin_create_announcement(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(uid) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_announcement_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(audience, target_all, title, b, ex, recips)) -> {
              let aud = string.lowercase(string.trim(audience))
              let aud_ok = aud == "supplier" || aud == "agency"
              case aud_ok {
                False -> json_err(400, "invalid_audience")
                True ->
                  case string.trim(title) == "" {
                    True -> json_err(400, "title_required")
                    False ->
                      case target_all {
                        False ->
                          case recips {
                            [] -> json_err(400, "recipients_required_when_not_target_all")
                            _ -> {
                              let exp_p = case string.trim(ex) == "" {
                                True -> pog.null()
                                False -> pog.text(string.trim(ex))
                              }
                              case
                                pog.query(
                                  "insert into portal_announcements (audience, target_all, title, body, created_by_user_id, expires_at) values ($1, $2, $3, $4, $5::uuid, case when $6::text is null or trim($6::text) = '' then null else trim($6::text)::timestamptz end) returning id::text",
                                )
                                |> pog.parameter(pog.text(aud))
                                |> pog.parameter(pog.bool(target_all))
                                |> pog.parameter(pog.text(string.trim(title)))
                                |> pog.parameter(pog.text(string.trim(b)))
                                |> pog.parameter(pog.text(uid))
                                |> pog.parameter(exp_p)
                                |> pog.returning({
                                  use s <- decode.field(0, decode.string)
                                  decode.success(s)
                                })
                                |> pog.execute(ctx.db)
                              {
                                Error(_) -> json_err(500, "insert_failed")
                                Ok(ret) ->
                                  case ret.rows {
                                    [aid] ->
                                      case
                                        insert_announcement_recipients(
                                          ctx.db,
                                          aid,
                                          recips,
                                        )
                                      {
                                        Error(_) -> json_err(500, "recipients_failed")
                                        Ok(_) -> {
                                          let out =
                                            json.object([#("id", json.string(aid))])
                                            |> json.to_string
                                          wisp.json_response(out, 201)
                                        }
                                      }
                                    _ -> json_err(500, "unexpected")
                                  }
                              }
                            }
                          }
                        True -> {
                          let exp_p = case string.trim(ex) == "" {
                            True -> pog.null()
                            False -> pog.text(string.trim(ex))
                          }
                          case
                            pog.query(
                              "insert into portal_announcements (audience, target_all, title, body, created_by_user_id, expires_at) values ($1, $2, $3, $4, $5::uuid, case when $6::text is null or trim($6::text) = '' then null else trim($6::text)::timestamptz end) returning id::text",
                            )
                            |> pog.parameter(pog.text(aud))
                            |> pog.parameter(pog.bool(target_all))
                            |> pog.parameter(pog.text(string.trim(title)))
                            |> pog.parameter(pog.text(string.trim(b)))
                            |> pog.parameter(pog.text(uid))
                            |> pog.parameter(exp_p)
                            |> pog.returning({
                              use s <- decode.field(0, decode.string)
                              decode.success(s)
                            })
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "insert_failed")
                            Ok(ret) ->
                              case ret.rows {
                                [aid] -> {
                                  let out =
                                    json.object([#("id", json.string(aid))])
                                    |> json.to_string
                                  wisp.json_response(out, 201)
                                }
                                _ -> json_err(500, "unexpected")
                              }
                          }
                        }
                      }
                  }
              }
            }
          }
      }
  }
}

/// GET /api/v1/supplier/announcements
pub fn supplier_list_announcements(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_supplier_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid)) ->
      case
        pog.query(
          announcements_base_sql()
            <> " where a.audience = 'supplier' and (a.expires_at is null or a.expires_at > now()) and (a.target_all = true or exists (select 1 from portal_announcement_recipients r where r.announcement_id = a.id and r.organization_id = $1::uuid)) order by a.created_at desc limit 100",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.returning(announcement_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, announcement_json)
          let body =
            json.object([#("announcements", json.array(arr, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

/// GET /api/v1/agency/announcements
pub fn agency_list_announcements(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_agency_portal(req, ctx.db) {
    Error(r) -> r
    Ok(#(_, oid)) ->
      case
        pog.query(
          announcements_base_sql()
            <> " where a.audience = 'agency' and (a.expires_at is null or a.expires_at > now()) and (a.target_all = true or exists (select 1 from portal_announcement_recipients r where r.announcement_id = a.id and r.organization_id = $1::uuid)) order by a.created_at desc limit 100",
        )
        |> pog.parameter(pog.text(oid))
        |> pog.returning(announcement_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, announcement_json)
          let body =
            json.object([#("announcements", json.array(arr, fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}
