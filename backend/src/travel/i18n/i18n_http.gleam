//// Sınırsız dil — locale ve çeviri anahtarları (030_i18n).

import backend/context.{type Context}
import travel/identity/permissions as permissions
import gleam/bit_array
import gleam/dict.{type Dict}
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
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
        True -> Ok(uid)
        False -> Error(json_err(403, "forbidden"))
      }
  }
}

fn locale_row() -> decode.Decoder(#(Int, String, String, Bool, Bool)) {
  use id <- decode.field(0, decode.int)
  use code <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use is_rtl <- decode.field(3, decode.bool)
  use is_active <- decode.field(4, decode.bool)
  decode.success(#(id, code, name, is_rtl, is_active))
}

fn translation_row() -> decode.Decoder(#(String, String, String)) {
  use ns <- decode.field(0, decode.string)
  use k <- decode.field(1, decode.string)
  use v <- decode.field(2, decode.string)
  decode.success(#(ns, k, v))
}

fn locale_to_json(row: #(Int, String, String, Bool, Bool)) -> json.Json {
  let #(id, code, name, is_rtl, is_active) = row
  json.object([
    #("id", json.int(id)),
    #("code", json.string(code)),
    #("name", json.string(name)),
    #("is_rtl", json.bool(is_rtl)),
    #("is_active", json.bool(is_active)),
  ])
}

/// GET /api/v1/i18n/locales
pub fn list_locales(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id, code, name, is_rtl, is_active from locales order by id",
    )
    |> pog.returning(locale_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "locales_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, locale_to_json)
      let body =
        json.object([#("locales", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn create_locale_decoder() -> decode.Decoder(#(String, String, Bool, Bool)) {
  decode.field("code", decode.string, fn(code) {
    decode.field("name", decode.string, fn(name) {
      decode.optional_field("is_rtl", False, decode.bool, fn(is_rtl) {
        decode.optional_field("is_active", True, decode.bool, fn(is_active) {
          decode.success(#(code, name, is_rtl, is_active))
        })
      })
    })
  })
}

/// POST /api/v1/i18n/locales — yeni dil (yönetici: `admin.users.read`).
pub fn create_locale(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_locale_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(code_raw, name, is_rtl, is_active)) -> {
              let code = string.lowercase(string.trim(code_raw))
              case code == "" || string.trim(name) == "" {
                True -> json_err(400, "code_and_name_required")
                False ->
                  case
                    pog.query(
                      "insert into locales (code, name, is_rtl, is_active) values ($1, $2, $3, $4) on conflict (code) do update set name = excluded.name, is_rtl = excluded.is_rtl, is_active = excluded.is_active returning id::int, code, name, is_rtl, is_active",
                    )
                    |> pog.parameter(pog.text(code))
                    |> pog.parameter(pog.text(string.trim(name)))
                    |> pog.parameter(pog.bool(is_rtl))
                    |> pog.parameter(pog.bool(is_active))
                    |> pog.returning(locale_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "locale_save_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [row] -> {
                          let out = locale_to_json(row) |> json.to_string
                          wisp.json_response(out, 201)
                        }
                        _ -> json_err(500, "unexpected_return")
                      }
                  }
              }
            }
          }
      }
  }
}

fn insert_bundle_row(
  acc: Dict(String, List(#(String, String))),
  row: #(String, String, String),
) -> Dict(String, List(#(String, String))) {
  let #(ns, k, v) = row
  let existing = dict.get(acc, ns) |> result.unwrap([])
  dict.insert(acc, ns, [#(k, v), ..existing])
}

fn ns_to_json(pairs: List(#(String, String))) -> json.Json {
  let obj =
    list.fold(pairs, dict.new(), fn(d, pair) {
      let #(k, v) = pair
      dict.insert(d, k, json.string(v))
    })
  json.object(dict.to_list(obj))
}

/// GET /api/v1/i18n/bundle?locale=tr
pub fn get_bundle(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let locale = case request.get_query(req) {
    Error(_) -> ""
    Ok(qs) ->
      list.key_find(qs, "locale")
      |> result.unwrap("")
      |> string.trim
      |> string.lowercase
  }
  case locale == "" {
    True -> json_err(400, "locale_required")
    False ->
      case
        pog.query(
          "select tn.code, te.key, tv.value from translation_values tv join translation_entries te on te.id = tv.entry_id join translation_namespaces tn on tn.id = te.namespace_id join locales l on l.id = tv.locale_id where l.code = $1 order by tn.code, te.key",
        )
        |> pog.parameter(pog.text(locale))
        |> pog.returning(translation_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "bundle_query_failed")
        Ok(ret) -> {
          let grouped = list.fold(ret.rows, dict.new(), insert_bundle_row)
          let namespaces =
            dict.to_list(grouped)
            |> list.map(fn(pair) {
              let #(ns, pairs) = pair
              #(ns, ns_to_json(pairs))
            })
          let body =
            json.object([
              #("locale", json.string(locale)),
              #(
                "namespaces",
                json.object(namespaces),
              ),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn upsert_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.field("namespace", decode.string, fn(namespace) {
    decode.field("key", decode.string, fn(key) {
      decode.field("locale", decode.string, fn(locale) {
        decode.field("value", decode.string, fn(value) {
          decode.success(#(namespace, key, locale, value))
        })
      })
    })
  })
}

/// POST /api/v1/i18n/translations — tek çeviri upsert (yönetici: `admin.users.read`).
pub fn upsert_translation(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, upsert_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(ns, key, locale_raw, value)) -> {
              let locale = string.lowercase(string.trim(locale_raw))
              let namespace = string.trim(ns)
              let key_trim = string.trim(key)
              case locale == "" || namespace == "" || key_trim == "" {
                True -> json_err(400, "namespace_key_locale_required")
                False -> {
                  let entry_sql =
                    "insert into translation_entries (namespace_id, key) select tn.id, $2 from translation_namespaces tn where tn.code = $1 on conflict (namespace_id, key) do update set namespace_id = translation_entries.namespace_id returning id::text"
                  case
                    pog.query(entry_sql)
                    |> pog.parameter(pog.text(namespace))
                    |> pog.parameter(pog.text(key_trim))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "translation_entry_failed")
                    Ok(er) ->
                      case er.rows {
                        [] -> json_err(400, "namespace_not_found")
                        [entry_id] -> {
                          case
                            pog.query(
                              "select id::text from locales where code = $1 limit 1",
                            )
                            |> pog.parameter(pog.text(locale))
                            |> pog.returning(row_dec.col0_string())
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "locale_query_failed")
                            Ok(lr) ->
                              case lr.rows {
                                [] -> json_err(400, "locale_not_found")
                                [locale_id] -> {
                                  case
                                    pog.query(
                                      "insert into translation_values (entry_id, locale_id, value) values ($1::bigint, $2::smallint, $3) on conflict (entry_id, locale_id) do update set value = excluded.value, updated_at = now() returning id::text",
                                    )
                                    |> pog.parameter(pog.text(entry_id))
                                    |> pog.parameter(pog.text(locale_id))
                                    |> pog.parameter(pog.text(value))
                                    |> pog.returning(row_dec.col0_string())
                                    |> pog.execute(ctx.db)
                                  {
                                    Error(_) -> json_err(500, "translation_value_failed")
                                    Ok(_) -> {
                                      let out =
                                        json.object([
                                          #("ok", json.bool(True)),
                                          #(
                                            "namespace",
                                            json.string(namespace),
                                          ),
                                          #("key", json.string(key_trim)),
                                          #("locale", json.string(locale)),
                                        ])
                                        |> json.to_string
                                      wisp.json_response(out, 200)
                                    }
                                  }
                                }
                                _ -> json_err(500, "unexpected_locale_rows")
                              }
                          }
                        }
                        _ -> json_err(500, "unexpected_entry_rows")
                      }
                  }
                }
              }
            }
          }
      }
  }
}

fn create_namespace_decoder() -> decode.Decoder(String) {
  decode.field("code", decode.string, fn(code) { decode.success(string.trim(code)) })
}

/// POST /api/v1/i18n/namespaces — yeni çeviri ad alanı (yönetici).
pub fn create_namespace(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_namespace_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(code_raw) -> {
              let code = string.lowercase(code_raw)
              let safe =
                string.replace(code, " ", "_")
                |> string.replace("\t", "")
              case safe == "" {
                True -> json_err(400, "code_required")
                False ->
                  case
                    pog.query(
                      "insert into translation_namespaces (code) values ($1) on conflict (code) do nothing returning id::int, code",
                    )
                    |> pog.parameter(pog.text(safe))
                    |> pog.returning({
                      use id <- decode.field(0, decode.int)
                      use c <- decode.field(1, decode.string)
                      decode.success(#(id, c))
                    })
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "namespace_insert_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [] -> json_err(409, "namespace_exists")
                        [#(id, c)] -> {
                          let out =
                            json.object([
                              #("id", json.int(id)),
                              #("code", json.string(c)),
                            ])
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

/// GET /api/v1/i18n/namespaces
pub fn list_namespaces(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let row = {
    use id <- decode.field(0, decode.int)
    use code <- decode.field(1, decode.string)
    decode.success(#(id, code))
  }
  case
    pog.query("select id, code from translation_namespaces order by id")
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "namespaces_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(id, code) = r
          json.object([#("id", json.int(id)), #("code", json.string(code))])
        })
      let body =
        json.object([#("namespaces", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}
