//// Partner API — otel, tatil evi, yat, aktivite katalog uçları.

import backend/context.{type Context}
import travel/agent/agent_auth
import travel/catalog/catalog_http
import travel/catalog/collections_http
import travel/media/listing_images_http
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import wisp.{type Request, type Response}

/// Yayında ilan + acente kategori grant kontrolü; kategori kodu döner.
pub fn assert_agent_listing_access(
  conn: pog.Connection,
  listing_id: String,
  agency_org_id: String,
) -> Result(String, Response) {
  case
    pog.query(
      "select pc.code::text from listings l "
      <> "inner join product_categories pc on pc.id = l.category_id "
      <> "where l.id = $1::uuid and l.status = 'published' "
      <> "and pc.code = any($2::text[]) "
      <> "and (not exists (select 1 from agency_category_grants g where g.agency_organization_id = $3::uuid) "
      <> "or exists (select 1 from agency_category_grants g2 where g2.agency_organization_id = $3::uuid "
      <> "and g2.approved = true and g2.category_code = pc.code)) "
      <> "limit 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.array(pog.text, agent_auth.agent_vertical_codes))
    |> pog.parameter(pog.text(agency_org_id))
    |> pog.returning({
      use c <- decode.field(0, decode.string)
      decode.success(c)
    })
    |> pog.execute(conn)
  {
    Error(_) -> Error(agent_auth.json_err(500, "listing_access_check_failed"))
    Ok(ret) ->
      case ret.rows {
        [cat] -> Ok(cat)
        [] -> Error(agent_auth.json_err(404, "listing_not_found"))
        _ -> Error(agent_auth.json_err(500, "listing_access_check_failed"))
      }
  }
}

fn with_listings_read(
  req: Request,
  ctx: Context,
  run: fn(String, List(String)) -> Response,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "listings.read") {
        Error(r) -> r
        Ok(Nil) -> run(oid, scopes)
      }
  }
}

fn query_param(req: Request, key: String) -> String {
  case request.get_query(req) {
    Ok(qs) ->
      list.key_find(qs, key)
      |> result.unwrap("")
      |> string.trim
    Error(_) -> ""
  }
}

/// GET /api/v1/agent/catalog/categories
pub fn list_categories(req: Request, ctx: Context) -> Response {
  with_listings_read(req, ctx, fn(_oid, _scopes) {
    let items =
      list.map(agent_auth.agent_vertical_codes, fn(code) {
        json.object([
          #("code", json.string(code)),
          #("label", json.string(agent_auth.category_label(code))),
          #("bookable", json.bool(True)),
        ])
      })
    let body =
      json.object([
        #("categories", json.preprocessed_array(items)),
      ])
      |> json.to_string
    wisp.json_response(body, 200)
  })
}

/// GET /api/v1/agent/catalog/search?category_code=hotel&...
pub fn search(req: Request, ctx: Context) -> Response {
  with_listings_read(req, ctx, fn(oid, _scopes) {
    let cat = query_param(req, "category_code") |> string.lowercase
    case cat == "" {
      True -> agent_auth.json_err(400, "category_code_required")
      False ->
        case agent_auth.vertical_allowed(cat) {
          False -> agent_auth.json_err(400, "category_not_supported")
          True -> collections_http.search_agent_listings(req, ctx, oid)
        }
    }
  })
}

/// GET /api/v1/agent/catalog/listings/:id?locale=tr
pub fn get_listing(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listings_read(req, ctx, fn(oid, _scopes) {
    case assert_agent_listing_access(ctx.db, listing_id, oid) {
      Error(r) -> r
      Ok(category_code) -> {
        let locale = case query_param(req, "locale") == "" {
          True -> "tr"
          False -> query_param(req, "locale")
        }
        case
          pog.query(
            "select l.id::text, l.slug, l.currency_code::text, "
            <> "coalesce((select lt.title from listing_translations lt "
            <> "join locales lo on lo.id = lt.locale_id "
            <> "where lt.listing_id = l.id and lower(lo.code) = lower($2) limit 1), l.slug), "
            <> "coalesce((select lt.description from listing_translations lt "
            <> "join locales lo on lo.id = lt.locale_id "
            <> "where lt.listing_id = l.id and lower(lo.code) = lower($2) limit 1), ''), "
            <> "coalesce(nullif(trim(l.location_name), ''), ''), "
            <> "coalesce(l.review_avg::text, ''), "
            <> "coalesce(l.min_stay_nights::text, ''), "
            <> "coalesce(l.first_charge_amount::text, ''), "
            <> "coalesce(l.prepayment_percent::text, ''), "
            <> "coalesce(l.instant_book, false) "
            <> "from listings l where l.id = $1::uuid",
          )
          |> pog.parameter(pog.text(listing_id))
          |> pog.parameter(pog.text(locale))
          |> pog.returning({
            use id <- decode.field(0, decode.string)
            use slug <- decode.field(1, decode.string)
            use cur <- decode.field(2, decode.string)
            use title <- decode.field(3, decode.string)
            use desc <- decode.field(4, decode.string)
            use loc <- decode.field(5, decode.string)
            use rating <- decode.field(6, decode.string)
            use min_stay <- decode.field(7, decode.string)
            use deposit <- decode.field(8, decode.string)
            use prepay <- decode.field(9, decode.string)
            use instant <- decode.field(10, decode.bool)
            decode.success(#(
              id, slug, cur, title, desc, loc, rating, min_stay, deposit, prepay,
              instant,
            ))
          })
          |> db_exec.execute(ctx.db)
        {
          Error(_) -> agent_auth.json_err(500, "listing_detail_failed")
          Ok(ret) ->
            case ret.rows {
              [#(
                id,
                slug,
                cur,
                title,
                desc,
                loc,
                rating,
                min_stay,
                deposit,
                prepay,
                instant,
              )] -> {
                let body =
                  json.object([
                    #("id", json.string(id)),
                    #("slug", json.string(slug)),
                    #("category_code", json.string(category_code)),
                    #("currency_code", json.string(cur)),
                    #("title", json.string(title)),
                    #("description", json.string(desc)),
                    #("location_label", json.string(loc)),
                    #("review_avg", json.string(rating)),
                    #("min_stay_nights", json.string(min_stay)),
                    #("first_charge_amount", json.string(deposit)),
                    #("prepayment_percent", json.string(prepay)),
                    #("instant_book", json.bool(instant)),
                  ])
                  |> json.to_string
                wisp.json_response(body, 200)
              }
              _ -> agent_auth.json_err(404, "listing_not_found")
            }
        }
      }
    }
  })
}

/// GET /api/v1/agent/catalog/listings/:id/availability-calendar?from=&to=
pub fn availability_calendar(
  req: Request,
  ctx: Context,
  listing_id: String,
) -> Response {
  with_listings_read(req, ctx, fn(oid, _scopes) {
    case assert_agent_listing_access(ctx.db, listing_id, oid) {
      Error(r) -> r
      Ok(_cat) -> catalog_http.list_public_listing_availability_calendar(req, ctx, listing_id)
    }
  })
}

/// GET /api/v1/agent/catalog/listings/:id/activity-sessions?date=
pub fn activity_sessions(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listings_read(req, ctx, fn(oid, _scopes) {
    case assert_agent_listing_access(ctx.db, listing_id, oid) {
      Error(r) -> r
      Ok(cat) ->
        case cat == "activity" {
          False -> agent_auth.json_err(400, "not_an_activity_listing")
          True -> catalog_http.list_public_activity_sessions(req, ctx, listing_id)
        }
    }
  })
}

/// POST /api/v1/agent/catalog/listings/:id/activity-quote
pub fn activity_quote(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "listings.read") {
        Error(r) -> r
        Ok(Nil) ->
          case assert_agent_listing_access(ctx.db, listing_id, oid) {
            Error(r) -> r
            Ok(cat) ->
              case cat == "activity" {
                False -> agent_auth.json_err(400, "not_an_activity_listing")
                True -> catalog_http.quote_public_activity(req, ctx, listing_id)
              }
          }
      }
  }
}

fn with_listing_proxy(
  req: Request,
  ctx: Context,
  listing_id: String,
  run: fn() -> Response,
) -> Response {
  with_listings_read(req, ctx, fn(oid, _scopes) {
    case assert_agent_listing_access(ctx.db, listing_id, oid) {
      Error(r) -> r
      Ok(_cat) -> run()
    }
  })
}

/// GET /api/v1/agent/catalog/listings/:id/images
pub fn listing_images(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listing_proxy(req, ctx, listing_id, fn() {
    listing_images_http.list_public_images(req, ctx, listing_id)
  })
}

/// GET /api/v1/agent/catalog/listings/:id/meal-plans
pub fn meal_plans(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listing_proxy(req, ctx, listing_id, fn() {
    catalog_http.list_public_meal_plans(req, ctx, listing_id)
  })
}

/// GET /api/v1/agent/catalog/listings/:id/price-rules
pub fn price_rules(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listing_proxy(req, ctx, listing_id, fn() {
    catalog_http.list_public_listing_price_rules(req, ctx, listing_id)
  })
}

/// GET /api/v1/agent/catalog/listings/:id/price-lines
pub fn price_lines(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listing_proxy(req, ctx, listing_id, fn() {
    catalog_http.list_public_listing_price_lines(req, ctx, listing_id)
  })
}

/// GET /api/v1/agent/catalog/listings/:id/accommodation-rules
pub fn accommodation_rules(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listing_proxy(req, ctx, listing_id, fn() {
    catalog_http.get_public_listing_accommodation_rules(req, ctx, listing_id)
  })
}

/// GET /api/v1/agent/catalog/listings/:id/bedrooms
pub fn bedrooms(req: Request, ctx: Context, listing_id: String) -> Response {
  with_listing_proxy(req, ctx, listing_id, fn() {
    catalog_http.list_public_listing_bedrooms(req, ctx, listing_id)
  })
}
