//// İlan yakın mekan mesafe hesabı (265_district_coords_and_listing_pois).
////
//// POST /api/v1/listings/:id/compute-nearby-pois
////   → listings.nearby_pois_json'u günceller
////
//// GET  /api/v1/listings/:id/nearby-pois
////   → mevcut nearby_pois_json'u döndürür

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
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
/// 2. Veritabanındaki tüm location_pages.travel_ideas_json POI'larını düzleştirir.
/// 3. Her POI'ya ilanın koordinatından Haversine mesafesi hesaplar (PostgreSQL trig).
/// 4. 50 km içindeki en yakın 10 POI'yu `listings.nearby_pois_json`'a yazar.
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
    pois AS (
      SELECT
        elem->>'title'     AS title,
        elem->>'summary'   AS summary,
        coalesce(elem->>'image', '')   AS image,
        coalesce(elem->>'link',  '')   AS link,
        coalesce(elem->>'place_id', '') AS place_id,
        (elem->>'lat')::float8         AS poi_lat,
        (elem->>'lng')::float8         AS poi_lng,
        NULLIF(elem->>'distance_km_from_district', '')::numeric AS district_distance_km
      FROM   location_pages lp,
             jsonb_array_elements(lp.travel_ideas_json) elem
      WHERE  lp.region_type IN ('district', 'destination')
        AND  elem->>'lat'  IS NOT NULL
        AND  elem->>'lng'  IS NOT NULL
        AND  jsonb_typeof(elem->'lat') IN ('number','string')
    ),
    with_dist AS (
      SELECT
        p.title, p.summary, p.image, p.link, p.place_id,
        p.poi_lat, p.poi_lng,
        p.district_distance_km,
        ROUND(
          (6371.0 * acos(
            LEAST(1.0,
              cos(radians(lc.mlat)) * cos(radians(p.poi_lat))
              * cos(radians(p.poi_lng) - radians(lc.mlng))
              + sin(radians(lc.mlat)) * sin(radians(p.poi_lat))
            )
          ))::numeric, 1
        ) AS distance_km
      FROM   pois p
      CROSS  JOIN listing_coords lc
    ),
    top10 AS (
      SELECT *
      FROM   with_dist
      WHERE  distance_km < 50
      ORDER  BY distance_km
      LIMIT  10
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
      FROM top10
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
              "update listings set nearby_pois_json = $2::jsonb where id = $1::uuid returning id::text",
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
