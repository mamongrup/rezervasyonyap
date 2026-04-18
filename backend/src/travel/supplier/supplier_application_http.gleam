//// Tedarikçi Başvuru API'si
//// Kullanıcılar kategori başvurusu oluşturur, belge yükler, submit eder.
//// Adminler başvuruları listeler ve onaylar/reddeder.

import backend/context.{type Context}
import travel/identity/permissions
import travel/messaging/notification_runtime
import gleam/bit_array
import gleam/dynamic/decode
import gleam/result
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/string
import pog
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  wisp.json_response(
    json.object([#("error", json.string(msg))]) |> json.to_string,
    status,
  )
}

fn read_body(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn bearer_token(req: Request) -> String {
  case request.get_header(req, "authorization") {
    Error(_) -> ""
    Ok(h) ->
      case string.starts_with(string.lowercase(string.trim(h)), "bearer ") {
        True -> string.trim(string.drop_start(string.trim(h), 7))
        False -> ""
      }
  }
}

fn session_user(conn: pog.Connection, token: String) -> Result(String, Nil) {
  case string.trim(token) == "" {
    True -> Error(Nil)
    False ->
      pog.query(
        "select u.id::text from users u join user_sessions s on s.user_id = u.id
         where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
      )
      |> pog.parameter(pog.text(token))
      |> pog.returning({
        use a <- decode.field(0, decode.string)
        decode.success(a)
      })
      |> pog.execute(conn)
      |> result.map_error(fn(_) { Nil })
      |> result.try(fn(r) { list.first(r.rows) })
  }
}

/// or_error: if Error(resp), return resp; if Ok(val), call next(val)
fn or_error(
  res: Result(a, Response),
  next: fn(a) -> Response,
) -> Response {
  case res {
    Error(resp) -> resp
    Ok(val) -> next(val)
  }
}

// ── Application row decoder ───────────────────────────────────────────────────

fn app_row_decoder() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String, String, String, String, String),
) {
  use id <- decode.field(0, decode.string)
  use user_id <- decode.field(1, decode.string)
  use category_code <- decode.field(2, decode.string)
  use status <- decode.field(3, decode.string)
  use business_name <- decode.field(4, decode.string)
  use business_type <- decode.field(5, decode.string)
  use tax_number <- decode.field(6, decode.string)
  use phone <- decode.field(7, decode.string)
  use address <- decode.field(8, decode.string)
  use notes <- decode.field(9, decode.string)
  use admin_notes <- decode.field(10, decode.string)
  use created_at <- decode.field(11, decode.string)
  decode.success(#(
    id, user_id, category_code, status, business_name, business_type,
    tax_number, phone, address, notes, admin_notes, created_at,
  ))
}

fn app_to_json(
  row: #(String, String, String, String, String, String, String, String, String, String, String, String),
  docs: List(#(String, String, String, String, String)),
) -> json.Json {
  let #(
    id, user_id, category_code, status, business_name, business_type,
    tax_number, phone, address, notes, admin_notes, created_at,
  ) = row
  let docs_json =
    list.map(docs, fn(d) {
      let #(did, doc_type, doc_label, file_path, doc_status) = d
      json.object([
        #("id", json.string(did)),
        #("doc_type", json.string(doc_type)),
        #("doc_label", json.string(doc_label)),
        #("file_path", json.string(file_path)),
        #("status", json.string(doc_status)),
      ])
    })
  json.object([
    #("id", json.string(id)),
    #("user_id", json.string(user_id)),
    #("category_code", json.string(category_code)),
    #("status", json.string(status)),
    #("business_name", json.string(business_name)),
    #("business_type", json.string(business_type)),
    #("tax_number", json.string(tax_number)),
    #("phone", json.string(phone)),
    #("address", json.string(address)),
    #("notes", json.string(notes)),
    #("admin_notes", json.string(admin_notes)),
    #("created_at", json.string(created_at)),
    #("documents", json.array(docs_json, fn(x) { x })),
  ])
}

fn doc_row_decoder() -> decode.Decoder(
  #(String, String, String, String, String),
) {
  use id <- decode.field(0, decode.string)
  use doc_type <- decode.field(1, decode.string)
  use doc_label <- decode.field(2, decode.string)
  use file_path <- decode.field(3, decode.string)
  use status <- decode.field(4, decode.string)
  decode.success(#(id, doc_type, doc_label, file_path, status))
}

fn fetch_docs(
  conn: pog.Connection,
  app_id: String,
) -> List(#(String, String, String, String, String)) {
  case
    pog.query(
      "select id::text, doc_type, doc_label, coalesce(file_path,''), status
       from supplier_application_documents where application_id = $1",
    )
    |> pog.parameter(pog.text(app_id))
    |> pog.returning(doc_row_decoder())
    |> pog.execute(conn)
  {
    Ok(r) -> r.rows
    Error(_) -> []
  }
}

// ── Public: list my applications ─────────────────────────────────────────────

pub fn list_my_applications(req: Request, ctx: Context) -> Response {
  let token = bearer_token(req)
  use user_id <- or_error(
    session_user(ctx.db, token)
    |> result.map_error(fn(_) { json_err(401, "unauthorized") }),
  )
  let rows =
    pog.query(
      "select id::text, user_id::text, category_code, status,
              coalesce(business_name,''), coalesce(business_type,''),
              coalesce(tax_number,''), coalesce(phone,''),
              coalesce(address,''), coalesce(notes,''),
              coalesce(admin_notes,''), created_at::text
       from supplier_applications where user_id = $1 order by created_at desc",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(app_row_decoder())
    |> pog.execute(ctx.db)
  case rows {
    Error(_) -> json_err(500, "db_error")
    Ok(r) ->
      json.object([
        #(
          "applications",
          json.array(r.rows, fn(row) {
            app_to_json(row, fetch_docs(ctx.db, {
              let #(id, _, _, _, _, _, _, _, _, _, _, _) = row
              id
            }))
          }),
        ),
      ])
      |> json.to_string
      |> wisp.json_response(200)
  }
}

// ── Public: create or update my application (upsert) ─────────────────────────

pub fn upsert_application(req: Request, ctx: Context) -> Response {
  let token = bearer_token(req)
  use user_id <- or_error(
    session_user(ctx.db, token)
    |> result.map_error(fn(_) { json_err(401, "unauthorized") }),
  )
  use body <- or_error(
    read_body(req)
    |> result.map_error(fn(_) { json_err(400, "bad_body") }),
  )
  let decoder = {
    use category_code <- decode.field("category_code", decode.string)
    use business_name <- decode.field(
      "business_name",
      decode.optional(decode.string),
    )
    use business_type <- decode.field(
      "business_type",
      decode.optional(decode.string),
    )
    use tax_number <- decode.field(
      "tax_number",
      decode.optional(decode.string),
    )
    use phone <- decode.field("phone", decode.optional(decode.string))
    use address <- decode.field("address", decode.optional(decode.string))
    use notes <- decode.field("notes", decode.optional(decode.string))
    decode.success(#(
      category_code,
      business_name,
      business_type,
      tax_number,
      phone,
      address,
      notes,
    ))
  }
  case json.parse(body, decoder) {
    Error(_) -> json_err(400, "invalid_json")
    Ok(#(cat, bname, btype, taxno, phone, addr, notes)) ->
      case
        pog.query(
          "insert into supplier_applications
             (user_id, category_code, business_name, business_type, tax_number, phone, address, notes, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,now())
           on conflict (user_id, category_code)
           do update set
             business_name  = coalesce(excluded.business_name, supplier_applications.business_name),
             business_type  = coalesce(excluded.business_type, supplier_applications.business_type),
             tax_number     = coalesce(excluded.tax_number, supplier_applications.tax_number),
             phone          = coalesce(excluded.phone, supplier_applications.phone),
             address        = coalesce(excluded.address, supplier_applications.address),
             notes          = coalesce(excluded.notes, supplier_applications.notes),
             updated_at     = now()
           returning id::text",
        )
        |> pog.parameter(pog.text(user_id))
        |> pog.parameter(pog.text(cat))
        |> pog.parameter(pog.nullable(pog.text, bname))
        |> pog.parameter(pog.nullable(pog.text, btype))
        |> pog.parameter(pog.nullable(pog.text, taxno))
        |> pog.parameter(pog.nullable(pog.text, phone))
        |> pog.parameter(pog.nullable(pog.text, addr))
        |> pog.parameter(pog.nullable(pog.text, notes))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          decode.success(a)
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "db_error")
        Ok(r) ->
          case list.first(r.rows) {
            Error(_) -> json_err(500, "no_row")
            Ok(id) ->
              json.object([#("id", json.string(id)), #("ok", json.bool(True))])
              |> json.to_string
              |> wisp.json_response(200)
          }
      }
  }
}

// ── Public: upload document for an application ───────────────────────────────

pub fn upsert_document(req: Request, ctx: Context, app_id: String) -> Response {
  let token = bearer_token(req)
  use user_id <- or_error(
    session_user(ctx.db, token)
    |> result.map_error(fn(_) { json_err(401, "unauthorized") }),
  )
  // verify ownership
  use _ <- or_error(
    pog.query(
      "select id from supplier_applications where id=$1 and user_id=$2 limit 1",
    )
    |> pog.parameter(pog.text(app_id))
    |> pog.parameter(pog.text(user_id))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> pog.execute(ctx.db)
    |> result.map_error(fn(_) { json_err(500, "db_error") })
    |> result.try(fn(r) {
      case list.first(r.rows) {
        Ok(_) -> Ok(Nil)
        Error(_) -> Error(json_err(403, "forbidden"))
      }
    }),
  )
  use body <- or_error(
    read_body(req)
    |> result.map_error(fn(_) { json_err(400, "bad_body") }),
  )
  let decoder = {
    use doc_type <- decode.field("doc_type", decode.string)
    use doc_label <- decode.field("doc_label", decode.string)
    use file_path <- decode.field("file_path", decode.string)
    decode.success(#(doc_type, doc_label, file_path))
  }
  case json.parse(body, decoder) {
    Error(_) -> json_err(400, "invalid_json")
    Ok(#(dtype, dlabel, fpath)) ->
      case
        pog.query(
          "insert into supplier_application_documents
             (application_id, doc_type, doc_label, file_path, status, uploaded_at)
           values ($1,$2,$3,$4,'uploaded',now())
           on conflict do nothing
           returning id::text",
        )
        |> pog.parameter(pog.text(app_id))
        |> pog.parameter(pog.text(dtype))
        |> pog.parameter(pog.text(dlabel))
        |> pog.parameter(pog.text(fpath))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          decode.success(a)
        })
        |> pog.execute(ctx.db)
      {
        Error(_) ->
          // try update if already exists
          case
            pog.query(
              "update supplier_application_documents
               set file_path=$3, status='uploaded', uploaded_at=now()
               where application_id=$1 and doc_type=$2
               returning id::text",
            )
            |> pog.parameter(pog.text(app_id))
            |> pog.parameter(pog.text(dtype))
            |> pog.parameter(pog.text(fpath))
            |> pog.returning({
              use a <- decode.field(0, decode.string)
              decode.success(a)
            })
            |> pog.execute(ctx.db)
          {
            Ok(_) ->
              json.object([#("ok", json.bool(True))])
              |> json.to_string
              |> wisp.json_response(200)
            Error(_) -> json_err(500, "db_error")
          }
        Ok(_) ->
          json.object([#("ok", json.bool(True))])
          |> json.to_string
          |> wisp.json_response(200)
      }
  }
}

// ── Public: submit application for review ────────────────────────────────────

pub fn submit_application(req: Request, ctx: Context, app_id: String) -> Response {
  let token = bearer_token(req)
  use user_id <- or_error(
    session_user(ctx.db, token)
    |> result.map_error(fn(_) { json_err(401, "unauthorized") }),
  )
  case
    pog.query(
      "update supplier_applications
       set status='submitted', submitted_at=now(), updated_at=now()
       where id=$1 and user_id=$2 and status in ('draft','rejected')
       returning id::text",
    )
    |> pog.parameter(pog.text(app_id))
    |> pog.parameter(pog.text(user_id))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "db_error")
    Ok(r) ->
      case list.first(r.rows) {
        Error(_) -> json_err(400, "not_found_or_not_allowed")
        Ok(_) ->
          json.object([#("ok", json.bool(True))])
          |> json.to_string
          |> wisp.json_response(200)
      }
  }
}

// ── Admin: list all applications ─────────────────────────────────────────────

pub fn admin_list_applications(req: Request, ctx: Context) -> Response {
  use _ <- or_error(
    case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) -> permissions.require_permission(ctx.db, uid, "admin.users.read") |> result.map_error(fn(_) { json_err(403, "forbidden") }) |> result.map(fn(_) { uid })
  },
  )
  let status_filter =
    request.get_query(req)
    |> result.unwrap([])
    |> list.key_find("status")
    |> result.unwrap("all")

  let query = case status_filter == "all" || status_filter == "" {
    True ->
      "select a.id::text, a.user_id::text, u.email, u.display_name,
              a.category_code, a.status,
              coalesce(a.business_name,''), coalesce(a.business_type,''),
              coalesce(a.tax_number,''), coalesce(a.phone,''),
              coalesce(a.admin_notes,''), a.created_at::text,
              a.submitted_at::text, a.reviewed_at::text
       from supplier_applications a
       join users u on u.id = a.user_id
       order by a.created_at desc limit 200"
    False ->
      "select a.id::text, a.user_id::text, u.email, u.display_name,
              a.category_code, a.status,
              coalesce(a.business_name,''), coalesce(a.business_type,''),
              coalesce(a.tax_number,''), coalesce(a.phone,''),
              coalesce(a.admin_notes,''), a.created_at::text,
              a.submitted_at::text, a.reviewed_at::text
       from supplier_applications a
       join users u on u.id = a.user_id
       where a.status = '" <> status_filter <> "'
       order by a.created_at desc limit 200"
  }

  let decoder = {
    use id <- decode.field(0, decode.string)
    use user_id <- decode.field(1, decode.string)
    use email <- decode.field(2, decode.string)
    use display_name <- decode.field(3, decode.string)
    use category_code <- decode.field(4, decode.string)
    use status <- decode.field(5, decode.string)
    use business_name <- decode.field(6, decode.string)
    use business_type <- decode.field(7, decode.string)
    use tax_number <- decode.field(8, decode.string)
    use phone <- decode.field(9, decode.string)
    use admin_notes <- decode.field(10, decode.string)
    use created_at <- decode.field(11, decode.string)
    use submitted_at <- decode.field(12, decode.string)
    use reviewed_at <- decode.field(13, decode.string)
    decode.success(#(
      id, user_id, email, display_name, category_code, status,
      business_name, business_type, tax_number, phone, admin_notes,
      created_at, submitted_at, reviewed_at,
    ))
  }

  case pog.query(query) |> pog.returning(decoder) |> pog.execute(ctx.db) {
    Error(_) -> json_err(500, "db_error")
    Ok(r) ->
      json.object([
        #(
          "applications",
          json.array(r.rows, fn(row) {
            let #(
              id, user_id, email, display_name, cat, status,
              bname, btype, taxno, phone, anotes,
              created_at, submitted_at, reviewed_at,
            ) = row
            let docs = fetch_docs(ctx.db, id)
            json.object([
              #("id", json.string(id)),
              #("user_id", json.string(user_id)),
              #("email", json.string(email)),
              #("display_name", json.string(display_name)),
              #("category_code", json.string(cat)),
              #("status", json.string(status)),
              #("business_name", json.string(bname)),
              #("business_type", json.string(btype)),
              #("tax_number", json.string(taxno)),
              #("phone", json.string(phone)),
              #("admin_notes", json.string(anotes)),
              #("created_at", json.string(created_at)),
              #("submitted_at", json.string(submitted_at)),
              #("reviewed_at", json.string(reviewed_at)),
              #(
                "documents",
                json.array(docs, fn(d) {
                  let #(did, dtype, dlabel, fpath, dstatus) = d
                  json.object([
                    #("id", json.string(did)),
                    #("doc_type", json.string(dtype)),
                    #("doc_label", json.string(dlabel)),
                    #("file_path", json.string(fpath)),
                    #("status", json.string(dstatus)),
                  ])
                }),
              ),
            ])
          }),
        ),
      ])
      |> json.to_string
      |> wisp.json_response(200)
  }
}

// ── Admin: approve ────────────────────────────────────────────────────────────

pub fn admin_approve(req: Request, ctx: Context, app_id: String) -> Response {
  use reviewer_id <- or_error(
    case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) -> permissions.require_permission(ctx.db, uid, "admin.users.read") |> result.map_error(fn(_) { json_err(403, "forbidden") }) |> result.map(fn(_) { uid })
  },
  )
  // approve application
  case
    pog.query(
      "update supplier_applications
       set status='approved', reviewed_at=now(), reviewed_by=$2, updated_at=now()
       where id=$1
       returning user_id::text, category_code",
    )
    |> pog.parameter(pog.text(app_id))
    |> pog.parameter(pog.text(reviewer_id))
    |> pog.returning({
      use uid <- decode.field(0, decode.string)
      use cat <- decode.field(1, decode.string)
      decode.success(#(uid, cat))
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "db_error")
    Ok(r) ->
      case list.first(r.rows) {
        Error(_) -> json_err(404, "not_found")
        Ok(#(uid, cat)) -> {
          // Grant supplier category permission
          let _ =
            pog.query(
              "insert into agency_category_grants (agency_organization_id, category_code, approved)
               select sp.organization_id, $2, true
               from supplier_profiles sp where sp.user_id = $1
               on conflict (agency_organization_id, category_code) do update set approved=true",
            )
            |> pog.parameter(pog.text(uid))
            |> pog.parameter(pog.text(cat))
            |> pog.returning({
              use a <- decode.field(0, decode.string)
              decode.success(a)
            })
            |> pog.execute(ctx.db)
          case
            pog.query(
              "select coalesce(u.email,''), coalesce(u.phone,''), coalesce(u.display_name,''), coalesce(a.business_name,'') "
              <> "from users u join supplier_applications a on a.user_id = u.id "
              <> "where u.id = $1::uuid and a.id = $2::uuid limit 1",
            )
            |> pog.parameter(pog.text(uid))
            |> pog.parameter(pog.text(app_id))
            |> pog.returning({
              use em <- decode.field(0, decode.string)
              use ph <- decode.field(1, decode.string)
              use dn <- decode.field(2, decode.string)
              use bn <- decode.field(3, decode.string)
              decode.success(#(em, ph, dn, bn))
            })
            |> pog.execute(ctx.db)
          {
            Ok(rw) ->
              case rw.rows {
                [#(em, ph, dn, bn)] -> {
                  let pl =
                    json.object([
                      #("contact_name", json.string(dn)),
                      #("category_code", json.string(cat)),
                      #("business_name", json.string(bn)),
                    ])
                    |> json.to_string
                  let _ =
                    notification_runtime.dispatch_trigger(
                      ctx.db,
                      "supplier_application_approved",
                      "tr",
                      Some(uid),
                      None,
                      em,
                      ph,
                      pl,
                    )
                }
                _ -> Nil
              }
            Error(_) -> Nil
          }
          json.object([#("ok", json.bool(True))])
          |> json.to_string
          |> wisp.json_response(200)
        }
      }
  }
}

// ── Admin: reject ─────────────────────────────────────────────────────────────

pub fn admin_reject(req: Request, ctx: Context, app_id: String) -> Response {
  use reviewer_id <- or_error(
    case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) -> permissions.require_permission(ctx.db, uid, "admin.users.read") |> result.map_error(fn(_) { json_err(403, "forbidden") }) |> result.map(fn(_) { uid })
  },
  )
  use body <- or_error(
    read_body(req) |> result.map_error(fn(_) { json_err(400, "bad_body") }),
  )
  let admin_notes =
    json.parse(body, {
      use n <- decode.field("admin_notes", decode.optional(decode.string))
      decode.success(n)
    })
    |> result.unwrap(None)
    |> option.unwrap("")
  case
    pog.query(
      "update supplier_applications
       set status='rejected', reviewed_at=now(), reviewed_by=$2,
           admin_notes=coalesce($3, admin_notes), updated_at=now()
       where id=$1
       returning id::text",
    )
    |> pog.parameter(pog.text(app_id))
    |> pog.parameter(pog.text(reviewer_id))
    |> pog.parameter(pog.nullable(pog.text, case admin_notes {
      "" -> None
      n -> Some(n)
    }))
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      decode.success(a)
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "db_error")
    Ok(r) ->
      case list.first(r.rows) {
        Error(_) -> json_err(404, "not_found")
        Ok(_) -> {
          let note_trim = string.trim(admin_notes)
          let admin_note =
            case note_trim == "" {
              True -> ""
              False -> "\n\nYönetici notu: " <> note_trim
            }
          case
            pog.query(
              "select u.id::text, coalesce(u.email,''), coalesce(u.phone,''), coalesce(u.display_name,''), coalesce(a.business_name,''), a.category_code::text "
              <> "from users u join supplier_applications a on a.user_id = u.id "
              <> "where a.id = $1::uuid limit 1",
            )
            |> pog.parameter(pog.text(app_id))
            |> pog.returning({
              use uu <- decode.field(0, decode.string)
              use em <- decode.field(1, decode.string)
              use ph <- decode.field(2, decode.string)
              use dn <- decode.field(3, decode.string)
              use bn <- decode.field(4, decode.string)
              use catc <- decode.field(5, decode.string)
              decode.success(#(uu, em, ph, dn, bn, catc))
            })
            |> pog.execute(ctx.db)
          {
            Ok(rw) ->
              case rw.rows {
                [#(applicant_id, em, ph, dn, bn, catc)] -> {
                  let pl =
                    json.object([
                      #("contact_name", json.string(dn)),
                      #("category_code", json.string(catc)),
                      #("business_name", json.string(bn)),
                      #("admin_note", json.string(admin_note)),
                    ])
                    |> json.to_string
                  let _ =
                    notification_runtime.dispatch_trigger(
                      ctx.db,
                      "supplier_application_rejected",
                      "tr",
                      Some(applicant_id),
                      None,
                      em,
                      ph,
                      pl,
                    )
                }
                _ -> Nil
              }
            Error(_) -> Nil
          }
          json.object([#("ok", json.bool(True))])
          |> json.to_string
          |> wisp.json_response(200)
        }
      }
  }
}


