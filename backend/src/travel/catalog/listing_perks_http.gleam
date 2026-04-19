//// Listing perks: instant_book, mobile_discount_percent, super_host (org seviyesi).
////
//// GET  /api/v1/public/listings/:id/perks  → public read (anonim)
//// PATCH /api/v1/listings/:id/perks         → manage (Bearer token)
////
//// Admin tarafı şimdilik basit: yalnız organization sahibi / super-admin.
//// Hızlı bir API; UI bunu doğrudan kullanır.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/float
import gleam/http
import gleam/json
import gleam/option.{type Option, None, Some}
import gleam/result
import pog
import travel/catalog/catalog_http
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

fn perks_row() -> decode.Decoder(#(Bool, String, Bool)) {
  use ib <- decode.field(0, decode.bool)
  use md <- decode.field(1, decode.string)
  use sh <- decode.field(2, decode.bool)
  decode.success(#(ib, md, sh))
}

pub fn get_perks(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select coalesce(l.instant_book, false), coalesce(l.mobile_discount_percent::text, '0'), coalesce(o.is_super_host, false) from listings l left join organizations o on o.id = l.organization_id where l.id = $1::uuid",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(perks_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "perks_failed")
    Ok(r) ->
      case r.rows {
        [] -> json_err(404, "listing_not_found")
        [#(ib, md, sh)] -> {
          let mdf = case float.parse(md) {
            Ok(f) -> f
            Error(_) -> 0.0
          }
          let body =
            json.object([
              #("instant_book", json.bool(ib)),
              #("mobile_discount_percent", json.float(mdf)),
              #("super_host", json.bool(sh)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn patch_decoder() -> decode.Decoder(#(Option(Bool), Option(Float))) {
  decode.optional_field("instant_book", None, decode.optional(decode.bool), fn(ib) {
    decode.optional_field(
      "mobile_discount_percent",
      None,
      decode.optional(decode.float),
      fn(md) { decode.success(#(ib, md)) },
    )
  })
}

pub fn patch_perks(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case catalog_http.resolve_manage_listings_scope(req, ctx) {
    Error(r) -> r
    Ok(#(_uid, org_id)) ->
      case catalog_http.listing_in_manage_org(ctx.db, listing_id, org_id) {
        Error(_) -> json_err(500, "listing_scope_check_failed")
        Ok(False) -> json_err(404, "listing_not_found")
        Ok(True) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, patch_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(ib_opt, md_opt)) ->
                  apply_patch(ctx, listing_id, ib_opt, md_opt)
              }
          }
      }
  }
}

fn apply_patch(
  ctx: Context,
  listing_id: String,
  ib_opt: Option(Bool),
  md_opt: Option(Float),
) -> Response {
  let ib_done = case ib_opt {
    Some(v) -> {
      let _ =
        pog.query("update listings set instant_book = $1, updated_at = now() where id = $2::uuid")
        |> pog.parameter(pog.bool(v))
        |> pog.parameter(pog.text(listing_id))
        |> pog.execute(ctx.db)
      True
    }
    None -> False
  }
  let md_done = case md_opt {
    Some(p) -> {
      let clamped = case p <. 0.0 {
        True -> 0.0
        False ->
          case p >. 50.0 {
            True -> 50.0
            False -> p
          }
      }
      let _ =
        pog.query(
          "update listings set mobile_discount_percent = $1::numeric, updated_at = now() where id = $2::uuid",
        )
        |> pog.parameter(pog.text(float.to_string(clamped)))
        |> pog.parameter(pog.text(listing_id))
        |> pog.execute(ctx.db)
      True
    }
    None -> False
  }
  case ib_done || md_done {
    False -> json_err(400, "no_fields")
    True -> {
      let body =
        json.object([#("ok", json.bool(True))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}
