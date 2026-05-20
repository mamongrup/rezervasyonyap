//// İlan yakın mekan mesafe hesabı (265_district_coords_and_listing_pois).
////
//// POST  /api/v1/listings/:id/compute-nearby-pois
////    → listings.nearby_pois_json'u günceller
////
//// GET   /api/v1/listings/:id/nearby-pois
////    → mevcut nearby_pois_json'u döndürür
////
//// GET   /api/v1/listings/:id/service-pois (eski, listing bazlı — override)
////    → amenities_pois_json + transport_pois_json (herkese açık)
////
//// PATCH /api/v1/listings/:id/service-pois
////    → amenities_pois_json + transport_pois_json'u günceller
////
//// GET   /api/v1/listings/:id/computed-service-pois (herkese açık)
////    → En yakın ilçenin service_pois_json'unu Haversine ile hesaplar
////
//// GET   /api/v1/location-pages/:id/service-pois (herkese açık)
////    → location_pages.service_pois_json
////
//// PATCH /api/v1/location-pages/:id/service-pois (admin)
////    → location_pages.service_pois_json günceller
////
//// GET   /api/v1/location-pages/next-without-service-pois (admin)
////    → service_pois_json olmayan sonraki ilçeyi döndürür

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/float
import gleam/http
import gleam/json
import gleam/list

import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

// ---------------------------------------------------------------------------
// GET /api/v1/listings/:id/nearby-pois
// ---------------------------------------------------------------------------

/// GET /api/v1/listings/:id/nearby-pois
///
/// İlanın `nearby_pois_json` alanını döndürür.
pub fn get_nearby_pois(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let lid = string.trim(listing_id)
  case
    pog.query(
      "select coalesce(nearby_pois_json, '[]')::text from listings where id = $1::uuid",
    )
    |> pog.parameter(pog.text(lid))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "nearby_pois_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "listing_not_found")
        [pois_json] ->
          wisp.json_response(
            json.object([#("nearby_pois", json.string(pois_json))])
            |> json.to_string,
            200,
          )
        _ -> json_err(500, "unexpected_rows")
      }
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/listings/:id/compute-nearby-pois
// ---------------------------------------------------------------------------

fn pois_result_row() -> decode.Decoder(#(String, String)) {
  use updated_id <- decode.field(0, decode.string)
  use pois_text <- decode.field(1, decode.string)
  decode.success(#(updated_id, pois_text))
}

/// POST /api/v1/listings/:id/compute-nearby-pois
///
/// 1. İlanın `map_lat`, `map_lng` koordinatlarını okur.
/// 2. Tüm bölgelerin `travel_ideas_json` (gezi önerisi) ile en yakın ilçenin
///    `service_pois_json` (market, havalimanı, restoran vb.) kayıtlarını birleştirir.
/// 3. İlana olan Haversine mesafesi (km) hesaplanır (≤ 30 km).
/// 4. En yakından başlayarak en fazla 18 kalemi `listings.nearby_pois_json`'a yazar.
/// 5. Güncellenmiş JSON'u döndürür.
pub fn compute_nearby_pois(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  let lid = string.trim(listing_id)
  let sql =
    "
    WITH listing_coords AS (
      SELECT map_lat::float8 AS mlat, map_lng::float8 AS mlng
      FROM   listings
      WHERE  id = $1::uuid
        AND  map_lat IS NOT NULL
        AND  map_lng IS NOT NULL
    ),
    travel_pois AS (
      SELECT
        coalesce(NULLIF(trim(elem->>'title'), ''), NULLIF(trim(elem->>'name'), ''), 'Mekân') AS title,
        elem->>'summary'   AS summary,
        coalesce(elem->>'image', '')   AS image,
        coalesce(elem->>'link',  '')   AS link,
        coalesce(elem->>'place_id', '') AS place_id,
        (elem->>'lat')::float8         AS poi_lat,
        (elem->>'lng')::float8         AS poi_lng,
        CASE
          WHEN trim(coalesce(elem->>'distance_km_from_district', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
          THEN (elem->>'distance_km_from_district')::numeric
          ELSE NULL::numeric
        END AS district_distance_km
      FROM   location_pages lp,
             jsonb_array_elements(lp.travel_ideas_json) elem
      WHERE  lp.region_type IN ('district', 'destination')
        AND  trim(coalesce(elem->>'lat', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND  trim(coalesce(elem->>'lng', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND  jsonb_typeof(elem->'lat') IN ('number','string')
        AND  jsonb_typeof(elem->'lng') IN ('number','string')
        AND  NULLIF(trim(elem->>'place_id'), '') IS NOT NULL
    ),
    nearest_svc_page AS (
      SELECT lp.service_pois_json
      FROM   location_pages lp
      LEFT   JOIN districts d ON d.id = lp.district_id
      CROSS  JOIN listing_coords lc
      WHERE  lp.region_type IN ('district', 'destination')
        AND  COALESCE(lp.map_lat, d.center_lat) IS NOT NULL
        AND  COALESCE(lp.map_lng, d.center_lng) IS NOT NULL
        AND  lp.service_pois_json IS NOT NULL
        AND  jsonb_array_length(lp.service_pois_json) > 0
      ORDER  BY
        (6371.0 * acos(GREATEST(-1.0, LEAST(1.0,
          cos(radians(lc.mlat)) * cos(radians(COALESCE(lp.map_lat, d.center_lat)::float8))
          * cos(radians(COALESCE(lp.map_lng, d.center_lng)::float8) - radians(lc.mlng))
          + sin(radians(lc.mlat)) * sin(radians(COALESCE(lp.map_lat, d.center_lat)::float8))
        ))))
      LIMIT  1
    ),
    service_pois AS (
      SELECT
        coalesce(
          NULLIF(trim(elem->>'label'), ''),
          NULLIF(trim(elem->>'type'), ''),
          'Mekân'
        ) AS title,
        trim(
          regexp_replace(
            concat_ws(
              ' ',
              NULLIF(trim(elem->>'category'), ''),
              NULLIF(trim(elem->>'type'), ''),
              NULLIF(trim(elem->>'googleType'), '')
            ),
            '[[:space:]]+', ' ', 'g'
          )
        ) AS summary,
        '' AS image,
        '' AS link,
        trim(coalesce(elem->>'place_id', '')) AS place_id,
        (elem->>'lat')::float8 AS poi_lat,
        (elem->>'lng')::float8 AS poi_lng,
        NULL::numeric AS district_distance_km
      FROM   nearest_svc_page ns
             CROSS JOIN LATERAL jsonb_array_elements(
               coalesce(ns.service_pois_json, '[]'::jsonb)
             ) elem
      WHERE  elem->>'lat' IS NOT NULL
        AND  elem->>'lng' IS NOT NULL
        AND  trim(coalesce(elem->>'lat', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND  trim(coalesce(elem->>'lng', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND  jsonb_typeof(elem->'lat') IN ('number','string')
        AND  jsonb_typeof(elem->'lng') IN ('number','string')
        AND  NULLIF(trim(elem->>'place_id'), '') IS NOT NULL
    ),
    pois AS (
      SELECT * FROM travel_pois
      UNION ALL
      SELECT * FROM service_pois
    ),
    with_dist AS (
      SELECT
        p.title, p.summary, p.image, p.link, p.place_id,
        p.poi_lat, p.poi_lng,
        p.district_distance_km,
        ROUND(
          (6371.0 * acos(
            GREATEST(-1.0, LEAST(1.0,
              cos(radians(lc.mlat)) * cos(radians(p.poi_lat))
              * cos(radians(p.poi_lng) - radians(lc.mlng))
              + sin(radians(lc.mlat)) * sin(radians(p.poi_lat))
            ))
          ))::numeric, 1
        ) AS distance_km
      FROM   pois p
      CROSS  JOIN listing_coords lc
      WHERE  p.poi_lat BETWEEN -90 AND 90
        AND  p.poi_lng BETWEEN -180 AND 180
    ),
    topn AS (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY ROUND(poi_lat::numeric, 4), ROUND(poi_lng::numeric, 4)
          ORDER BY distance_km
        ) AS dedupe_rn
      FROM   with_dist
      WHERE  distance_km <= 30
    ),
    top18 AS (
      SELECT *
      FROM   topn
      WHERE  dedupe_rn = 1
      ORDER  BY distance_km
      LIMIT  18
    ),
    aggregated AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'title',       title,
            'summary',     summary,
            'image',       NULLIF(image, ''),
            'link',        NULLIF(link, ''),
            'place_id',    NULLIF(place_id, ''),
            'lat',                       poi_lat,
            'lng',                       poi_lng,
            'distance_km',               distance_km,
            'distance_km_from_listing',  distance_km,
            'distance_km_from_district', district_distance_km
          )
          ORDER BY distance_km
        ),
        '[]'::jsonb
      ) AS pois_json
      FROM top18
    )
    UPDATE listings
    SET    nearby_pois_json = (SELECT pois_json FROM aggregated)
    WHERE  id = $1::uuid
    RETURNING id::text, nearby_pois_json::text
    "
  case
    pog.query(sql)
    |> pog.parameter(pog.text(lid))
    |> pog.returning(pois_result_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "compute_pois_failed")
    Ok(ret) ->
      case ret.rows {
        [] ->
          json_err(
            404,
            "listing_not_found_or_no_coordinates",
          )
        [#(updated_id, pois_text)] ->
          wisp.json_response(
            json.object([
              #("listing_id", json.string(updated_id)),
              #("nearby_pois", json.string(pois_text)),
            ])
            |> json.to_string,
            200,
          )
        _ -> json_err(500, "unexpected_rows")
      }
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/listings/:id/nearby-pois
// Body: { "nearby_pois_json": "[...]" }
// Admin veya frontend'den manuel güncelleme için.
// ---------------------------------------------------------------------------

fn patch_body_decoder() -> decode.Decoder(String) {
  use s <- decode.field("nearby_pois_json", decode.string)
  decode.success(s)
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

/// PATCH /api/v1/listings/:id/nearby-pois
///
/// Admin panelinden veya listing form'undan gelen JSON'u doğrudan yazar.
pub fn patch_nearby_pois(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  let lid = string.trim(listing_id)
  case read_body_string(req) {
    Error(_) -> json_err(400, "body_read_failed")
    Ok(body) ->
      case json.parse(body, patch_body_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(pois_json) -> {
          let safe_json = case
            string.starts_with(string.trim(pois_json), "[")
          {
            True -> pois_json
            False -> "[]"
          }
          case
            pog.query(
              "update listings set nearby_pois_json = ($2::text)::jsonb where id = $1::uuid returning id::text",
            )
            |> pog.parameter(pog.text(lid))
            |> pog.parameter(pog.text(safe_json))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "patch_pois_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> json_err(404, "listing_not_found")
                [_] ->
                  wisp.json_response(
                    "{\"ok\":true}",
                    200,
                  )
                _ -> json_err(500, "unexpected_rows")
              }
          }
        }
      }
  }
}

// ---------------------------------------------------------------------------
// GET  /api/v1/listings/:id/service-pois  (herkese açık, listing bazlı override)
// PATCH /api/v1/listings/:id/service-pois
// Body: { "amenities_pois_json": "[...]", "transport_pois_json": "[...]" }
// ---------------------------------------------------------------------------

fn service_pois_row() -> decode.Decoder(#(String, String)) {
  use a <- decode.field(0, decode.string)
  use t <- decode.field(1, decode.string)
  decode.success(#(a, t))
}

/// GET /api/v1/listings/:id/service-pois
///
/// Temel ihtiyaç ve ulaşım mekanlarını döndürür (herkese açık).
pub fn get_service_pois(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let lid = string.trim(listing_id)
  case
    pog.query(
      "select coalesce(amenities_pois_json,'[]')::text,
              coalesce(transport_pois_json,'[]')::text
       from   listings
       where  id = $1::uuid",
    )
    |> pog.parameter(pog.text(lid))
    |> pog.returning(service_pois_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "service_pois_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "listing_not_found")
        [#(a, t)] ->
          wisp.json_response(
            json.object([
              #("amenities_pois_json", json.string(a)),
              #("transport_pois_json", json.string(t)),
            ])
            |> json.to_string,
            200,
          )
        _ -> json_err(500, "unexpected_rows")
      }
  }
}

fn patch_service_decoder() -> decode.Decoder(#(String, String)) {
  use a <- decode.field("amenities_pois_json", decode.string)
  use t <- decode.field("transport_pois_json", decode.string)
  decode.success(#(a, t))
}

/// PATCH /api/v1/listings/:id/service-pois
///
/// Admin panelinden temel ihtiyaç ve ulaşım mekanlarını günceller.
pub fn patch_service_pois(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  let lid = string.trim(listing_id)
  case read_body_string(req) {
    Error(_) -> json_err(400, "body_read_failed")
    Ok(body) ->
      case json.parse(body, patch_service_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(amenities_raw, transport_raw)) -> {
          let safe_a = case string.starts_with(string.trim(amenities_raw), "[") {
            True -> amenities_raw
            False -> "[]"
          }
          let safe_t = case string.starts_with(string.trim(transport_raw), "[") {
            True -> transport_raw
            False -> "[]"
          }
          case
            pog.query(
              "update listings
               set    amenities_pois_json = ($2::text)::jsonb,
                      transport_pois_json = ($3::text)::jsonb
               where  id = $1::uuid
               returning id::text",
            )
            |> pog.parameter(pog.text(lid))
            |> pog.parameter(pog.text(safe_a))
            |> pog.parameter(pog.text(safe_t))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "patch_service_pois_failed")
            Ok(ret) ->
              case ret.rows {
                [] -> json_err(404, "listing_not_found")
                [_] -> wisp.json_response("{\"ok\":true}", 200)
                _ -> json_err(500, "unexpected_rows")
              }
          }
        }
      }
  }
}

// ===========================================================================
// location_pages service_pois_json  (287_location_pages_service_pois)
// ===========================================================================

/// GET /api/v1/location-pages/:id/service-pois
pub fn get_lp_service_pois(req: Request, ctx: Context, lp_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let id = string.trim(lp_id)
  case
    pog.query(
      "select coalesce(service_pois_json,'[]')::text
       from   location_pages
       where  id = $1::uuid",
    )
    |> pog.parameter(pog.text(id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "lp_service_pois_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "location_page_not_found")
        [pois] ->
          wisp.json_response(
            json.object([#("service_pois_json", json.string(pois))])
            |> json.to_string,
            200,
          )
        _ -> json_err(500, "unexpected_rows")
      }
  }
}

/// PATCH /api/v1/location-pages/:id/service-pois (admin)
pub fn patch_lp_service_pois(req: Request, ctx: Context, lp_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let id = string.trim(lp_id)
      case read_body_string(req) {
        Error(_) -> json_err(400, "body_read_failed")
        Ok(body) ->
          case
            json.parse(body, {
              use s <- decode.field("service_pois_json", decode.string)
              decode.success(s)
            })
          {
            Error(_) -> json_err(400, "invalid_json")
            Ok(pois_raw) -> {
              let safe = case string.starts_with(string.trim(pois_raw), "[") {
                True -> pois_raw
                False -> "[]"
              }
              case
                pog.query(
                  "update location_pages
                   set    service_pois_json = ($2::text)::jsonb
                   where  id = $1::uuid
                   returning id::text",
                )
                |> pog.parameter(pog.text(id))
                |> pog.parameter(pog.text(safe))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "patch_lp_service_pois_failed")
                Ok(ret) ->
                  case ret.rows {
                    [] -> json_err(404, "location_page_not_found")
                    [_] -> wisp.json_response("{\"ok\":true}", 200)
                    _ -> json_err(500, "unexpected_rows")
                  }
              }
            }
          }
      }
    }
  }
}

/// GET /api/v1/location-pages/next-without-service-pois (admin)
pub fn next_without_service_pois(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select id::text, location_name,
                  coalesce(center_lat::text,'') as clat,
                  coalesce(center_lng::text,'') as clng,
                  coalesce(parent_name,'') as parent_name
           from   location_pages
           where  region_type in ('district','destination')
             and  (service_pois_json is null
                   or jsonb_array_length(service_pois_json) = 0)
           order  by location_name
           limit  1",
        )
        |> pog.returning({
          use id <- decode.field(0, decode.string)
          use name <- decode.field(1, decode.string)
          use clat <- decode.field(2, decode.string)
          use clng <- decode.field(3, decode.string)
          use parent <- decode.field(4, decode.string)
          decode.success(#(id, name, clat, clng, parent))
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "next_without_svc_pois_failed")
        Ok(ret) ->
          case ret.rows {
            [] ->
              wisp.json_response(
                json.object([#("done", json.bool(True))]) |> json.to_string,
                200,
              )
            [#(id, name, clat, clng, parent)] ->
              wisp.json_response(
                json.object([
                  #("done", json.bool(False)),
                  #("location_page_id", json.string(id)),
                  #("location_name", json.string(name)),
                  #("center_lat", json.string(clat)),
                  #("center_lng", json.string(clng)),
                  #("parent_name", json.string(parent)),
                ])
                |> json.to_string,
                200,
              )
            _ -> json_err(500, "unexpected_rows")
          }
      }
  }
}

// ===========================================================================
// GET /api/v1/listings/:id/computed-service-pois  (herkese açık)
// En yakın ilçenin service_pois_json koordinatlarından Haversine ile hesaplar.
// ===========================================================================

@external(erlang, "math", "sin")
fn math_sin(x: Float) -> Float

@external(erlang, "math", "cos")
fn math_cos(x: Float) -> Float

@external(erlang, "math", "atan2")
fn math_atan2(y: Float, x: Float) -> Float

fn haversine_km(lat1: Float, lng1: Float, lat2: Float, lng2: Float) -> Float {
  let pi = 3.14159265358979
  let to_rad = fn(d: Float) { d *. pi /. 180.0 }
  let dlat = to_rad(lat2 -. lat1)
  let dlng = to_rad(lng2 -. lng1)
  let a =
    float.power(math_sin(dlat /. 2.0), 2.0) |> result.unwrap(0.0)
  let b =
    float.power(math_sin(dlng /. 2.0), 2.0) |> result.unwrap(0.0)
  let c = a +. math_cos(to_rad(lat1)) *. math_cos(to_rad(lat2)) *. b
  let d = math_atan2(
    float.square_root(c) |> result.unwrap(0.0),
    float.square_root(1.0 -. c) |> result.unwrap(0.0),
  )
  6371.0 *. 2.0 *. d
}

fn round1(f: Float) -> Float {
  let shifted = f *. 10.0
  let rounded = float.round(shifted)
  int_to_float(rounded) /. 10.0
}

@external(erlang, "erlang", "float")
fn int_to_float(i: Int) -> Float

/// GET /api/v1/listings/:id/computed-service-pois
pub fn computed_service_pois(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let lid = string.trim(listing_id)
  let empty_response =
    wisp.json_response(
      json.object([
        #("amenities", json.array([], fn(x) { x })),
        #("transport", json.array([], fn(x) { x })),
      ])
      |> json.to_string,
      200,
    )

  // 1. İlanın koordinatları
  case
    pog.query(
      "select map_lat::float8, map_lng::float8
       from   listings
       where  id = $1::uuid
         and  map_lat is not null and map_lng is not null",
    )
    |> pog.parameter(pog.text(lid))
    |> pog.returning({
      use la <- decode.field(0, decode.float)
      use lo <- decode.field(1, decode.float)
      decode.success(#(la, lo))
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "listing_coords_failed")
    Ok(cret) ->
      case cret.rows {
        [] -> empty_response
        [#(mlat, mlng)] -> {
          // 2. En yakın service_pois_json dolu ilçe
          case
            pog.query(
              "select lp.service_pois_json::text
               from   location_pages lp
               left join districts d on d.id = lp.district_id
               where  lp.region_type in ('district','destination')
                 and  coalesce(lp.map_lat, d.center_lat) is not null
                 and  coalesce(lp.map_lng, d.center_lng) is not null
                 and  lp.service_pois_json is not null
                 and  jsonb_array_length(lp.service_pois_json) > 0
               order  by
                 (6371.0 * acos(LEAST(1.0,
                   cos(radians($1)) * cos(radians(coalesce(lp.map_lat, d.center_lat)::float8))
                   * cos(radians(coalesce(lp.map_lng, d.center_lng)::float8) - radians($2))
                   + sin(radians($1)) * sin(radians(coalesce(lp.map_lat, d.center_lat)::float8))
                 )))
               limit  1",
            )
            |> pog.parameter(pog.float(mlat))
            |> pog.parameter(pog.float(mlng))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> empty_response
            Ok(dret) ->
              case dret.rows {
                [] -> empty_response
                [pois_text] -> {
                  // 3. Haversine ile mesafeleri hesapla
                  let poi_dec = {
                    use poi_type <- decode.field("type", decode.string)
                    use label <- decode.field("label", decode.string)
                    use poi_lat <- decode.field("lat", decode.float)
                    use poi_lng <- decode.field("lng", decode.float)
                    use category <- decode.optional_field(
                      "category",
                      "amenity",
                      decode.string,
                    )
                    decode.success(#(poi_type, label, poi_lat, poi_lng, category))
                  }
                  case json.parse(pois_text, decode.list(poi_dec)) {
                    Error(_) -> empty_response
                    Ok(pois) -> {
                      let to_json = fn(tup) {
                        let #(t, lbl, plat, plng, _) = tup
                        let dist = round1(haversine_km(mlat, mlng, plat, plng))
                        json.object([
                          #("type", json.string(t)),
                          #("label", json.string(lbl)),
                          #("distance_km", json.float(dist)),
                        ])
                      }
                      let amenities =
                        list.filter(pois, fn(p) {
                          let #(_, _, _, _, cat) = p
                          cat != "transport"
                        })
                      let transport =
                        list.filter(pois, fn(p) {
                          let #(_, _, _, _, cat) = p
                          cat == "transport"
                        })
                      wisp.json_response(
                        json.object([
                          #("amenities", json.array(amenities, to_json)),
                          #("transport", json.array(transport, to_json)),
                        ])
                        |> json.to_string,
                        200,
                      )
                    }
                  }
                }
                _ -> empty_response
              }
          }
        }
        _ -> empty_response
      }
  }
}
