//// site_settings — kiracı / platform anahtarları, GA & harita için public-config (010_core_tenants).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
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

/// Ham site_settings listesi / yazma / silme — `admin.users.read` (genel yönetim paneli).
fn require_site_settings_admin(req: Request, ctx: Context) -> Result(Nil, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.users.read") {
        False -> Error(json_err(403, "forbidden"))
        True -> Ok(Nil)
      }
  }
}

fn setting_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use org <- decode.field(1, decode.string)
  use k <- decode.field(2, decode.string)
  use vj <- decode.field(3, decode.string)
  decode.success(#(id, org, k, vj))
}

fn setting_json(row: #(String, String, String, String)) -> json.Json {
  let #(id, org, k, vj) = row
  let orgj = case org == "" {
    True -> json.null()
    False -> json.string(org)
  }
  json.object([
    #("id", json.string(id)),
    #("organization_id", orgj),
    #("key", json.string(k)),
    #("value_json", json.string(vj)),
  ])
}

/// GET /api/v1/site/settings?scope=all|platform|tenant&organization_id=&key=
/// scope=all (varsayılan): tüm satırlar; platform: yalnız organization_id null; tenant: organization_id zorunlu — `admin.users.read`
pub fn list_settings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_site_settings_admin(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let scope =
    list.key_find(qs, "scope")
    |> result.unwrap("all")
    |> string.lowercase
    |> string.trim
  let org_q =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  let key_q =
    list.key_find(qs, "key")
    |> result.unwrap("")
    |> string.trim
  let key_filter = case key_q == "" {
    True -> pog.null()
    False -> pog.text(key_q)
  }
  case scope {
    "platform" ->
      case
        pog.query(
          "select id::text, coalesce(organization_id::text,''), key, value_json::text from site_settings where organization_id is null and ($1::text is null or key = $1) order by key limit 500",
        )
        |> pog.parameter(key_filter)
        |> pog.returning(setting_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "settings_query_failed")
        Ok(ret) -> settings_response(ret.rows)
      }
    "tenant" ->
      case org_q == "" {
        True -> json_err(400, "organization_id_required_for_tenant_scope")
        False ->
          case
            pog.query(
              "select id::text, coalesce(organization_id::text,''), key, value_json::text from site_settings where organization_id = $1::uuid and ($2::text is null or key = $2) order by key limit 500",
            )
            |> pog.parameter(pog.text(org_q))
            |> pog.parameter(key_filter)
            |> pog.returning(setting_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "settings_query_failed")
            Ok(ret) -> settings_response(ret.rows)
          }
      }
    _ ->
      case org_q == "" {
        True ->
          case
            pog.query(
              "select id::text, coalesce(organization_id::text,''), key, value_json::text from site_settings where ($1::text is null or key = $1) order by key limit 500",
            )
            |> pog.parameter(key_filter)
            |> pog.returning(setting_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "settings_query_failed")
            Ok(ret) -> settings_response(ret.rows)
          }
        False ->
          case
            pog.query(
              "select id::text, coalesce(organization_id::text,''), key, value_json::text from site_settings where organization_id = $1::uuid and ($2::text is null or key = $2) order by key limit 500",
            )
            |> pog.parameter(pog.text(org_q))
            |> pog.parameter(key_filter)
            |> pog.returning(setting_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "settings_query_failed")
            Ok(ret) -> settings_response(ret.rows)
          }
      }
    }
    }
  }
}

fn settings_response(rows: List(#(String, String, String, String))) -> Response {
  let arr = list.map(rows, setting_json)
  let body =
    json.object([#("settings", json.array(from: arr, of: fn(x) { x }))])
    |> json.to_string
  wisp.json_response(body, 200)
}

fn upsert_decoder() -> decode.Decoder(#(Option(String), String, String)) {
  decode.optional_field("organization_id", "", decode.string, fn(oid) {
    decode.field("key", decode.string, fn(k) {
      decode.field("value_json", decode.string, fn(vj) {
        let org = case string.trim(oid) == "" {
          True -> None
          False -> Some(string.trim(oid))
        }
        decode.success(#(org, string.trim(k), string.trim(vj)))
      })
    })
  })
}

/// PUT /api/v1/site/settings — { "organization_id"?, "key", "value_json": "{}" } — `admin.users.read`
pub fn upsert_setting(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Put)
  case require_site_settings_admin(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, upsert_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(org_opt, k, vj)) ->
              case k == "" {
                True -> json_err(400, "key_required")
                False -> {
                  let cfg = case vj == "" {
                    True -> "{}"
                    False -> vj
                  }
                  case org_opt {
                    None ->
                      case
                        pog.query(
                          "insert into site_settings (organization_id, key, value_json) values (null, $1, $2::jsonb) on conflict (key) where organization_id is null do update set value_json = excluded.value_json returning id::text",
                        )
                        |> pog.parameter(pog.text(k))
                        |> pog.parameter(pog.text(cfg))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(409, "upsert_failed")
                        Ok(r) ->
                          case r.rows {
                            [id] -> {
                              let out =
                                json.object([
                                  #("id", json.string(id)),
                                  #("ok", json.bool(True)),
                                ])
                                |> json.to_string
                              wisp.json_response(out, 200)
                            }
                            _ -> json_err(500, "unexpected")
                          }
                      }
                    Some(o) ->
                      case
                        pog.query(
                          "insert into site_settings (organization_id, key, value_json) values ($1::uuid, $2, $3::jsonb) on conflict (organization_id, key) do update set value_json = excluded.value_json returning id::text",
                        )
                        |> pog.parameter(pog.text(o))
                        |> pog.parameter(pog.text(k))
                        |> pog.parameter(pog.text(cfg))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(409, "upsert_failed")
                        Ok(r) ->
                          case r.rows {
                            [id] -> {
                              let out =
                                json.object([
                                  #("id", json.string(id)),
                                  #("ok", json.bool(True)),
                                ])
                                |> json.to_string
                              wisp.json_response(out, 200)
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

fn delete_query_params(
  qs: List(#(String, String)),
) -> #(String, String) {
  let k =
    list.key_find(qs, "key")
    |> result.unwrap("")
    |> string.trim
  let oid =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  #(k, oid)
}

/// DELETE /api/v1/site/settings?key=&organization_id= — organization_id boş = platform (null) — `admin.users.read`
pub fn delete_setting(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case require_site_settings_admin(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let #(k, oid) = delete_query_params(qs)
      case k == "" {
        True -> json_err(400, "key_required")
        False ->
          case oid == "" {
            True ->
              case
                pog.query(
                  "delete from site_settings where key = $1 and organization_id is null",
                )
                |> pog.parameter(pog.text(k))
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "delete_failed")
                Ok(ret) ->
                  case ret.count {
                    0 -> json_err(404, "not_found")
                    _ -> wisp.json_response("{\"ok\":true}", 200)
                  }
              }
            False ->
              case
                pog.query(
                  "delete from site_settings where key = $1 and organization_id = $2::uuid",
                )
                |> pog.parameter(pog.text(k))
                |> pog.parameter(pog.text(oid))
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
    }
  }
}

/// GET /api/v1/site/public-config?organization_id= — analytics, maps, ui, branding birleşimi (kiracı öncelikli)
pub fn get_public_config(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let org_q =
    list.key_find(qs, "organization_id")
    |> result.unwrap("")
    |> string.trim
  let org_param = case org_q == "" {
    True -> pog.null()
    False -> pog.text(org_q)
  }
  let row = {
    use j <- decode.field(0, decode.string)
    decode.success(j)
  }
  // Skaler alt sorgu: PostgreSQL'de UNIQUE(organization_id, key) NULL org için çoklu satıra izin verir;
  // birden fazla platform satırı varsa "more than one row" → 500. Her zaman LIMIT 1 + sıralama.
  case
    pog.query(
      "select json_build_object(
        'analytics', coalesce(
          (select value_json from site_settings where key = 'analytics' and ($1::uuid is not null and organization_id = $1) order by id desc limit 1),
          (select value_json from site_settings where key = 'analytics' and organization_id is null order by id desc limit 1)
        ),
        'maps', coalesce(
          (select value_json from site_settings where key = 'maps' and ($1::uuid is not null and organization_id = $1) order by id desc limit 1),
          (select value_json from site_settings where key = 'maps' and organization_id is null order by id desc limit 1)
        ),
        'ui', coalesce(
          (select value_json from site_settings where key = 'ui' and ($1::uuid is not null and organization_id = $1) order by id desc limit 1),
          (select value_json from site_settings where key = 'ui' and organization_id is null order by id desc limit 1)
        ),
        'branding', coalesce(
          (select value_json from site_settings where key = 'branding' and ($1::uuid is not null and organization_id = $1) order by id desc limit 1),
          (select value_json from site_settings where key = 'branding' and organization_id is null order by id desc limit 1)
        ),
        'mega_menu', coalesce(
          (select value_json from site_settings where key = 'mega_menu' and ($1::uuid is not null and organization_id = $1) order by id desc limit 1),
          (select value_json from site_settings where key = 'mega_menu' and organization_id is null order by id desc limit 1)
        ),
        'catalog_menu', coalesce(
          (select value_json from site_settings where key = 'catalog_menu' and ($1::uuid is not null and organization_id = $1) order by id desc limit 1),
          (select value_json from site_settings where key = 'catalog_menu' and organization_id is null order by id desc limit 1)
        ),
        'mega_menu_sidebar', coalesce(
          (select value_json from site_settings where key = 'mega_menu_sidebar' and ($1::uuid is not null and organization_id = $1) order by id desc limit 1),
          (select value_json from site_settings where key = 'mega_menu_sidebar' and organization_id is null order by id desc limit 1)
        )
      )::text",
    )
    |> pog.parameter(org_param)
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "public_config_failed")
    Ok(ret) ->
      case ret.rows {
        [json_txt] -> wisp.json_response(json_txt, 200)
        _ -> json_err(500, "unexpected")
      }
  }
}
