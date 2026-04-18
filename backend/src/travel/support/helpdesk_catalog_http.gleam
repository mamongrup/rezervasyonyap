//// Departmanlar, makrolar, SLA, bilgi bankası (152_support_helpdesk — katalog uçları).

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn dept_row() -> decode.Decoder(#(String, String, String, Int)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use nk <- decode.field(2, decode.string)
  use so <- decode.field(3, decode.int)
  decode.success(#(id, code, nk, so))
}

fn dept_json(row: #(String, String, String, Int)) -> json.Json {
  let #(id, code, nk, so) = row
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("name_key", json.string(nk)),
    #("sort_order", json.int(so)),
  ])
}

/// GET /api/v1/support/departments
pub fn list_departments(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, code, name_key, sort_order from support_departments order by sort_order, id",
    )
    |> pog.returning(dept_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "departments_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, dept_json)
      let body =
        json.object([#("departments", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn macro_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use title <- decode.field(2, decode.string)
  use body <- decode.field(3, decode.string)
  use did <- decode.field(4, decode.string)
  decode.success(#(id, code, title, body, did))
}

fn macro_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, code, title, body, did) = row
  let didj = case did == "" {
    True -> json.null()
    False -> json.string(did)
  }
  json.object([
    #("id", json.string(id)),
    #("code", json.string(code)),
    #("title", json.string(title)),
    #("body", json.string(body)),
    #("department_id", didj),
  ])
}

/// GET /api/v1/support/macros?department_id=
pub fn list_macros(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let df =
    list.key_find(qs, "department_id")
    |> result.unwrap("")
    |> string.trim
  let sql = case df == "" {
    True ->
      "select id::text, code, title, body, coalesce(department_id::text,'') from support_macros order by code limit 200"
    False ->
      "select id::text, code, title, body, coalesce(department_id::text,'') from support_macros where department_id = $1::smallint order by code limit 200"
  }
  let exec = case df == "" {
    True ->
      pog.query(sql)
      |> pog.returning(macro_row())
      |> pog.execute(ctx.db)
    False ->
      pog.query(sql)
      |> pog.parameter(pog.text(df))
      |> pog.returning(macro_row())
      |> pog.execute(ctx.db)
  }
  case exec {
    Error(_) -> json_err(500, "macros_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, macro_json)
      let body =
        json.object([#("macros", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn sla_row() -> decode.Decoder(#(String, String, String, Int, Int)) {
  use id <- decode.field(0, decode.string)
  use did <- decode.field(1, decode.string)
  use pr <- decode.field(2, decode.string)
  use fr <- decode.field(3, decode.int)
  use rm <- decode.field(4, decode.int)
  decode.success(#(id, did, pr, fr, rm))
}

fn sla_json(row: #(String, String, String, Int, Int)) -> json.Json {
  let #(id, did, pr, fr, rm) = row
  let didj = case did == "" {
    True -> json.null()
    False -> json.string(did)
  }
  json.object([
    #("id", json.string(id)),
    #("department_id", didj),
    #("priority", json.string(pr)),
    #("first_response_minutes", json.int(fr)),
    #("resolve_minutes", json.int(rm)),
  ])
}

/// GET /api/v1/support/sla-policies?department_id=
pub fn list_sla_policies(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let df =
    list.key_find(qs, "department_id")
    |> result.unwrap("")
    |> string.trim
  let sql = case df == "" {
    True ->
      "select id::text, coalesce(department_id::text,''), priority, first_response_minutes, resolve_minutes from support_sla_policies order by department_id nulls last, priority limit 200"
    False ->
      "select id::text, coalesce(department_id::text,''), priority, first_response_minutes, resolve_minutes from support_sla_policies where department_id = $1::smallint order by priority limit 200"
  }
  let exec = case df == "" {
    True ->
      pog.query(sql)
      |> pog.returning(sla_row())
      |> pog.execute(ctx.db)
    False ->
      pog.query(sql)
      |> pog.parameter(pog.text(df))
      |> pog.returning(sla_row())
      |> pog.execute(ctx.db)
  }
  case exec {
    Error(_) -> json_err(500, "sla_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, sla_json)
      let body =
        json.object([#("policies", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn kb_list_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use did <- decode.field(2, decode.string)
  use title <- decode.field(3, decode.string)
  use body <- decode.field(4, decode.string)
  decode.success(#(id, slug, did, title, body))
}

fn kb_list_json(row: #(String, String, String, String, String)) -> json.Json {
  let #(id, slug, did, title, body) = row
  let didj = case did == "" {
    True -> json.null()
    False -> json.string(did)
  }
  json.object([
    #("id", json.string(id)),
    #("slug", json.string(slug)),
    #("department_id", didj),
    #("title", json.string(title)),
    #("body", json.string(body)),
  ])
}

/// GET /api/v1/support/kb/articles?locale=
pub fn list_kb_articles(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let loc =
    list.key_find(qs, "locale")
    |> result.unwrap("")
    |> string.trim
  case loc == "" {
    True -> json_err(400, "locale_required")
    False ->
      case
        pog.query(
          "select a.id::text, a.slug, coalesce(a.department_id::text,''), t.title, t.body from support_kb_articles a join support_kb_article_translations t on t.article_id = a.id join locales l on l.id = t.locale_id where a.published = true and lower(l.code) = lower($1) order by a.slug limit 200",
        )
        |> pog.parameter(pog.text(loc))
        |> pog.returning(kb_list_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "kb_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, kb_list_json)
          let body =
            json.object([#("articles", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn kb_detail_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use lc <- decode.field(2, decode.string)
  use title <- decode.field(3, decode.string)
  use body <- decode.field(4, decode.string)
  use ca <- decode.field(5, decode.string)
  decode.success(#(id, slug, lc, title, body, ca))
}

/// GET /api/v1/support/kb/articles/:slug?locale=
pub fn get_kb_article(req: Request, ctx: Context, slug: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let loc =
    list.key_find(qs, "locale")
    |> result.unwrap("")
    |> string.trim
  case loc == "" {
    True -> json_err(400, "locale_required")
    False ->
      case
        pog.query(
          "select a.id::text, a.slug, l.code::text, t.title, t.body, a.created_at::text from support_kb_articles a join support_kb_article_translations t on t.article_id = a.id join locales l on l.id = t.locale_id where a.slug = $1 and lower(l.code) = lower($2) and a.published = true limit 1",
        )
        |> pog.parameter(pog.text(string.trim(slug)))
        |> pog.parameter(pog.text(loc))
        |> pog.returning(kb_detail_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "kb_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "not_found")
            [#(id, sl, lc, title, body, ca)] -> {
              let j =
                json.object([
                  #("id", json.string(id)),
                  #("slug", json.string(sl)),
                  #("locale", json.string(lc)),
                  #("title", json.string(title)),
                  #("body", json.string(body)),
                  #("created_at", json.string(ca)),
                ])
                |> json.to_string
              wisp.json_response(j, 200)
            }
            _ -> json_err(500, "unexpected")
          }
      }
  }
}
