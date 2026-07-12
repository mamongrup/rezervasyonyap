//// Merkezi içerik yaşam döngüsü: sürüm listesi, geri alma ve güvenli artefakt uygulama.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/result
import pog
import travel/db/decode_helpers as row_dec
import travel/db/resilient_pog as db_exec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

fn read_body(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn json_err(status: Int, message: String) -> Response {
  wisp.json_response(json.object([#("error", json.string(message))]) |> json.to_string, status)
}

fn version_row() -> decode.Decoder(#(String, String, String, Int, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use table <- decode.field(1, decode.string)
  use key <- decode.field(2, decode.string)
  use no <- decode.field(3, decode.int)
  use operation <- decode.field(4, decode.string)
  use source <- decode.field(5, decode.string)
  use snapshot <- decode.field(6, decode.string)
  use previous <- decode.field(7, decode.string)
  use created <- decode.field(8, decode.string)
  decode.success(#(id, table, key, no, operation, source, snapshot, previous, created))
}

pub fn list_versions(req: Request, ctx: Context, entity_type: String, entity_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case pog.query("select id::text,source_table,source_key,version_no,operation,change_source,snapshot_json::text,previous_json::text,created_at::text from ai_content_versions where entity_type=$1 and entity_id=$2 order by created_at desc limit 100")
        |> pog.parameter(pog.text(entity_type)) |> pog.parameter(pog.text(entity_id))
        |> pog.returning(version_row()) |> db_exec.execute(ctx.db) {
        Error(_) -> json_err(500, "content_versions_query_failed")
        Ok(ret) -> {
          let rows = list.map(ret.rows, fn(row) {
            let #(id, table, key, no, operation, source, snapshot, previous, created) = row
            json.object([#("id",json.string(id)),#("source_table",json.string(table)),#("source_key",json.string(key)),#("version_no",json.int(no)),#("operation",json.string(operation)),#("change_source",json.string(source)),#("snapshot_json",json.string(snapshot)),#("previous_json",json.string(previous)),#("created_at",json.string(created))])
          })
          wisp.json_response(json.object([#("versions",json.array(rows,fn(x) { x }))]) |> json.to_string, 200)
        }
      }
  }
}

pub fn restore_version(req: Request, ctx: Context, version_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> case pog.query("select ai_restore_content_version($1::uuid)") |> pog.parameter(pog.text(version_id)) |> pog.returning(row_dec.col0_string()) |> db_exec.execute(ctx.db) {
      Error(_) -> json_err(400, "content_version_restore_failed")
      Ok(ret) -> case ret.rows {
        [entity] -> wisp.json_response(json.object([#("ok",json.bool(True)),#("entity",json.string(entity))]) |> json.to_string, 200)
        _ -> json_err(404, "content_version_not_found")
      }
    }
  }
}

pub fn apply_work_item(req: Request, ctx: Context, work_item_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> case pog.query("select ai_apply_work_item_artifacts($1::uuid)::text") |> pog.parameter(pog.text(work_item_id)) |> pog.returning(row_dec.col0_string()) |> db_exec.execute(ctx.db) {
      Error(_) -> json_err(400, "content_artifacts_apply_failed")
      Ok(ret) -> case ret.rows {
        [count] -> wisp.json_response(json.object([#("ok",json.bool(True)),#("applied",json.string(count))]) |> json.to_string, 200)
        _ -> json_err(404, "work_item_not_found")
      }
    }
  }
}

pub fn submit_listing_intake(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> case read_body(req) {
      Error(_) -> json_err(400,"empty_body")
      Ok(body) -> case pog.query("select ai_submit_listing_intake(($1::jsonb->>'organization_id')::uuid,$1::jsonb->>'category_code',coalesce($1::jsonb->'payload','{}'::jsonb),coalesce($1::jsonb->>'source_type','manual_ai'),$1::jsonb->>'source_ref')::text")
        |> pog.parameter(pog.text(body)) |> pog.returning(row_dec.col0_string()) |> db_exec.execute(ctx.db) {
        Error(_) -> json_err(400,"listing_intake_failed")
        Ok(ret) -> case ret.rows {
          [id] -> wisp.json_response(json.object([#("ok",json.bool(True)),#("intake_id",json.string(id))]) |> json.to_string,201)
          _ -> json_err(500,"unexpected_rows")
        }
      }
    }
  }
}
