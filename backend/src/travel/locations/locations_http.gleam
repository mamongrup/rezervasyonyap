//// Ülke / bölge / ilçe, lokasyon sayfaları, POI önbelleği, iCal beslemeleri (110_locations_ical).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import travel/ical/ical_sync
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

// --- countries ---

fn country_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use iso <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  decode.success(#(id, iso, name))
}

fn country_json(row: #(String, String, String)) -> json.Json {
  let #(id, iso, name) = row
  json.object([
    #("id", json.string(id)),
    #("iso2", json.string(string.trim(iso))),
    #("name", json.string(name)),
  ])
}

/// GET /api/v1/locations/countries
pub fn list_countries(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query("select id::text, iso2::text, name from countries order by name limit 500")
    |> pog.returning(country_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "countries_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, country_json)
      let body =
        json.object([#("countries", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn country_create_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("iso2", decode.string, fn(iso) {
    decode.field("name", decode.string, fn(name) {
      decode.success(#(string.trim(iso), string.trim(name)))
    })
  })
}

/// POST /api/v1/locations/countries
pub fn create_country(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, country_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(iso, name)) ->
          case string.length(iso) != 2 || name == "" {
            True -> json_err(400, "iso2_name_required")
            False -> {
              let iso_u = string.uppercase(iso)
              case
                pog.query(
                  "insert into countries (iso2, name) values ($1, $2) returning id::text",
                )
                |> pog.parameter(pog.text(iso_u))
                |> pog.parameter(pog.text(name))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "country_create_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
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

// --- regions ---

fn region_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use cid <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use slug <- decode.field(3, decode.string)
  use lat <- decode.field(4, decode.string)
  use lng <- decode.field(5, decode.string)
  decode.success(#(id, cid, name, slug, lat, lng))
}

fn region_json(row: #(String, String, String, String, String, String)) -> json.Json {
  let #(id, cid, name, slug, lat, lng) = row
  let latj = case lat == "" {
    True -> json.null()
    False -> json.string(lat)
  }
  let lngj = case lng == "" {
    True -> json.null()
    False -> json.string(lng)
  }
  json.object([
    #("id", json.string(id)),
    #("country_id", json.string(cid)),
    #("name", json.string(name)),
    #("slug", json.string(slug)),
    #("center_lat", latj),
    #("center_lng", lngj),
  ])
}

/// GET /api/v1/locations/regions?country_id=
pub fn list_regions(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let cf =
    list.key_find(qs, "country_id")
    |> result.unwrap("")
    |> string.trim
  case cf == "" {
    True -> json_err(400, "country_id_required")
    False ->
      case
        pog.query(
          "select id::text, country_id::text, name, slug, coalesce(center_lat::text,''), coalesce(center_lng::text,'') from regions where country_id = $1::smallint order by name limit 500",
        )
        |> pog.parameter(pog.text(cf))
        |> pog.returning(region_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "regions_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, region_json)
          let body =
            json.object([#("regions", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn region_create_decoder() -> decode.Decoder(
  #(String, String, String, Option(String), Option(String)),
) {
  decode.field("country_id", decode.string, fn(cid) {
    decode.field("name", decode.string, fn(name) {
      decode.field("slug", decode.string, fn(slug) {
        decode.optional_field("center_lat", "", decode.string, fn(lat) {
          decode.optional_field("center_lng", "", decode.string, fn(lng) {
            let la = case string.trim(lat) == "" {
              True -> None
              False -> Some(string.trim(lat))
            }
            let lo = case string.trim(lng) == "" {
              True -> None
              False -> Some(string.trim(lng))
            }
            decode.success(#(cid, name, slug, la, lo))
          })
        })
      })
    })
  })
}

/// POST /api/v1/locations/regions
pub fn create_region(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, region_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(cid, name, slug, lat_opt, lng_opt)) ->
          case string.trim(cid) == "" || string.trim(name) == "" || string.trim(slug) == ""
          {
            True -> json_err(400, "country_id_name_slug_required")
            False -> {
              let lat_p = case lat_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              let lng_p = case lng_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              case
                pog.query(
                  "insert into regions (country_id, name, slug, center_lat, center_lng) values ($1::smallint, $2, $3, $4::numeric, $5::numeric) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(cid)))
                |> pog.parameter(pog.text(string.trim(name)))
                |> pog.parameter(pog.text(string.trim(slug)))
                |> pog.parameter(lat_p)
                |> pog.parameter(lng_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "region_create_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
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

// --- districts ---

fn district_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use rid <- decode.field(1, decode.string)
  use name <- decode.field(2, decode.string)
  use slug <- decode.field(3, decode.string)
  use lat <- decode.field(4, decode.string)
  use lng <- decode.field(5, decode.string)
  decode.success(#(id, rid, name, slug, lat, lng))
}

fn district_json(row: #(String, String, String, String, String, String)) -> json.Json {
  let #(id, rid, name, slug, lat, lng) = row
  let latj = case lat == "" {
    True -> json.null()
    False -> json.string(lat)
  }
  let lngj = case lng == "" {
    True -> json.null()
    False -> json.string(lng)
  }
  json.object([
    #("id", json.string(id)),
    #("region_id", json.string(rid)),
    #("name", json.string(name)),
    #("slug", json.string(slug)),
    #("center_lat", latj),
    #("center_lng", lngj),
  ])
}

/// GET /api/v1/locations/districts?region_id=
pub fn list_districts(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let rf =
    list.key_find(qs, "region_id")
    |> result.unwrap("")
    |> string.trim
  case rf == "" {
    True -> json_err(400, "region_id_required")
    False ->
      case
        pog.query(
          "select id::text, region_id::text, name, slug, coalesce(center_lat::text,''), coalesce(center_lng::text,'') from districts where region_id = $1::int order by name limit 500",
        )
        |> pog.parameter(pog.text(rf))
        |> pog.returning(district_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "districts_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, district_json)
          let body =
            json.object([#("districts", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn district_create_decoder() -> decode.Decoder(
  #(String, String, String, Option(String), Option(String)),
) {
  decode.field("region_id", decode.string, fn(rid) {
    decode.field("name", decode.string, fn(name) {
      decode.field("slug", decode.string, fn(slug) {
        decode.optional_field("center_lat", "", decode.string, fn(lat) {
          decode.optional_field("center_lng", "", decode.string, fn(lng) {
            let la = case string.trim(lat) == "" {
              True -> None
              False -> Some(string.trim(lat))
            }
            let lo = case string.trim(lng) == "" {
              True -> None
              False -> Some(string.trim(lng))
            }
            decode.success(#(rid, name, slug, la, lo))
          })
        })
      })
    })
  })
}

/// POST /api/v1/locations/districts
pub fn create_district(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, district_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(rid, name, slug, lat_opt, lng_opt)) ->
          case string.trim(rid) == "" || string.trim(name) == "" || string.trim(slug) == ""
          {
            True -> json_err(400, "region_id_name_slug_required")
            False -> {
              let lat_p = case lat_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              let lng_p = case lng_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              case
                pog.query(
                  "insert into districts (region_id, name, slug, center_lat, center_lng) values ($1::int, $2, $3, $4::numeric, $5::numeric) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(rid)))
                |> pog.parameter(pog.text(string.trim(name)))
                |> pog.parameter(pog.text(string.trim(slug)))
                |> pog.parameter(lat_p)
                |> pog.parameter(lng_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "district_create_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
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

// --- location_pages ---
// SQL helper: full page JSON columns (used in SELECT as single json_build_object column)
const page_json_sql = "json_build_object(
  'id', id::text,
  'district_id', district_id::text,
  'slug_path', slug_path,
  'hero_image_key', hero_image_key,
  'created_at', created_at::text,
  'title', title,
  'description', description,
  'meta_title', meta_title,
  'meta_description', meta_description,
  'gallery_json', gallery_json,
  'map_lat', map_lat::text,
  'map_lng', map_lng::text,
  'map_zoom', coalesce(map_zoom, 12),
  'is_published', coalesce(is_published, false),
  'region_type', coalesce(region_type, 'district'),
  'featured_image_url', featured_image_url,
  'hero_image_url', hero_image_url,
  'travel_ideas_image_url', travel_ideas_image_url,
  'travel_ideas_json', coalesce(travel_ideas_json, '[]'::jsonb),
  'translations_json', coalesce(translations_json, '{}'::jsonb),
  'poi_manual_json', coalesce(poi_manual_json, '[]'::jsonb),
  'country_info_json', coalesce(country_info_json, '{}'::jsonb)
)::text"

fn page_row() -> decode.Decoder(String) {
  use s <- decode.field(0, decode.string)
  decode.success(s)
}

/// GET /api/v1/locations/pages?district_id=
pub fn list_location_pages(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let df =
    list.key_find(qs, "district_id")
    |> result.unwrap("")
    |> string.trim
  let base_sql = "select " <> page_json_sql <> " from location_pages"
  let exec = case df == "" {
    True ->
      pog.query(base_sql <> " order by slug_path limit 200")
      |> pog.returning(page_row())
      |> pog.execute(ctx.db)
    False ->
      pog.query(base_sql <> " where district_id = $1::int order by slug_path limit 200")
      |> pog.parameter(pog.text(df))
      |> pog.returning(page_row())
      |> pog.execute(ctx.db)
  }
  case exec {
    Error(_) -> json_err(500, "location_pages_query_failed")
    Ok(ret) -> {
      let rows_json = "[" <> string.join(ret.rows, ",") <> "]"
      let body = "{\"pages\":" <> rows_json <> "}"
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/locations/pages/by-slug?slug_path=
pub fn get_location_page_by_slug(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let sp =
    list.key_find(qs, "slug_path")
    |> result.unwrap("")
    |> string.trim
  case sp == "" {
    True -> json_err(400, "slug_path_required")
    False ->
      case
        pog.query("select " <> page_json_sql <> " from location_pages where slug_path = $1 limit 1")
        |> pog.parameter(pog.text(sp))
        |> pog.returning(page_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "location_page_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "not_found")
            [row] -> wisp.json_response(row, 200)
            _ -> json_err(500, "unexpected")
          }
      }
  }
}

/// GET /api/v1/locations/pages/by-name?name=fethiye
/// Bölge adı veya slug son parçası ile eşleşen ilk sayfayı döndürür
pub fn get_location_page_by_name(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let name =
    list.key_find(qs, "name")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  case name == "" {
    True -> json_err(400, "name_required")
    False ->
      case
        pog.query(
          "select "
          <> page_json_sql
          <> " from location_pages where lower(title) = $1"
          <> " or lower(slug_path) like '%/' || $1"
          <> " or lower(slug_path) = $1"
          <> " order by length(slug_path) asc limit 1",
        )
        |> pog.parameter(pog.text(name))
        |> pog.returning(page_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "location_page_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "not_found")
            [row] -> wisp.json_response(row, 200)
            _ -> json_err(500, "unexpected")
          }
      }
  }
}

/// GET /api/v1/locations/pages/:page_id
pub fn get_location_page(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query("select " <> page_json_sql <> " from location_pages where id = $1::uuid limit 1")
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.returning(page_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "location_page_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [row] -> wisp.json_response(row, 200)
        _ -> json_err(500, "unexpected")
      }
  }
}

fn page_create_decoder() -> decode.Decoder(#(String, Option(String), Option(String))) {
  decode.field("slug_path", decode.string, fn(sp) {
    decode.optional_field("district_id", "", decode.string, fn(did) {
      decode.optional_field("hero_image_key", "", decode.string, fn(hk) {
        let d = case string.trim(did) == "" {
          True -> None
          False -> Some(string.trim(did))
        }
        let h = case string.trim(hk) == "" {
          True -> None
          False -> Some(string.trim(hk))
        }
        decode.success(#(string.trim(sp), d, h))
      })
    })
  })
}

/// POST /api/v1/locations/pages
pub fn create_location_page(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, page_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(sp, did_opt, hk_opt)) ->
          case sp == "" {
            True -> json_err(400, "slug_path_required")
            False -> {
              let d_p = case did_opt {
                None -> pog.null()
                Some(d) -> pog.text(d)
              }
              let h_p = case hk_opt {
                None -> pog.null()
                Some(h) -> pog.text(h)
              }
              case
                pog.query(
                  "insert into location_pages (district_id, slug_path, hero_image_key) values ($1::int, $2, $3) returning id::text",
                )
                |> pog.parameter(d_p)
                |> pog.parameter(pog.text(sp))
                |> pog.parameter(h_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "location_page_create_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
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

type PagePatch {
  PagePatch(
    district_id: Option(String),
    slug_path: Option(String),
    hero_image_key: Option(String),
    title: Option(String),
    description: Option(String),
    meta_title: Option(String),
    meta_description: Option(String),
    gallery_json: Option(String),
    map_lat: Option(String),
    map_lng: Option(String),
    is_published: Option(Bool),
    region_type: Option(String),
    featured_image_url: Option(String),
    hero_image_url: Option(String),
    travel_ideas_image_url: Option(String),
    travel_ideas_json: Option(String),
    translations_json: Option(String),
    poi_manual_json: Option(String),
    country_info_json: Option(String),
  )
}

fn page_patch_decoder() -> decode.Decoder(PagePatch) {
  decode.optional_field("district_id", None, decode.optional(decode.string), fn(did) {
    decode.optional_field("slug_path", None, decode.optional(decode.string), fn(sp) {
      decode.optional_field("hero_image_key", None, decode.optional(decode.string), fn(hk) {
        decode.optional_field("title", None, decode.optional(decode.string), fn(title) {
          decode.optional_field("description", None, decode.optional(decode.string), fn(desc) {
            decode.optional_field("meta_title", None, decode.optional(decode.string), fn(mt) {
              decode.optional_field("meta_description", None, decode.optional(decode.string), fn(md) {
                decode.optional_field("gallery_json", None, decode.optional(decode.string), fn(gallery) {
                  decode.optional_field("map_lat", None, decode.optional(decode.string), fn(lat) {
                    decode.optional_field("map_lng", None, decode.optional(decode.string), fn(lng) {
                      decode.optional_field("is_published", None, decode.optional(decode.bool), fn(is_pub) {
                        decode.optional_field("region_type", None, decode.optional(decode.string), fn(rt) {
                          decode.optional_field("featured_image_url", None, decode.optional(decode.string), fn(fi) {
                            decode.optional_field("hero_image_url", None, decode.optional(decode.string), fn(hi) {
                              decode.optional_field("travel_ideas_image_url", None, decode.optional(decode.string), fn(tii) {
                                decode.optional_field("travel_ideas_json", None, decode.optional(decode.string), fn(tij) {
                                  decode.optional_field("translations_json", None, decode.optional(decode.string), fn(trj) {
                                    decode.optional_field("poi_manual_json", None, decode.optional(decode.string), fn(pmj) {
                                      decode.optional_field("country_info_json", None, decode.optional(decode.string), fn(cij) {
                                        decode.success(PagePatch(did, sp, hk, title, desc, mt, md, gallery, lat, lng, is_pub, rt, fi, hi, tii, tij, trj, pmj, cij))
                                      })
                                    })
                                  })
                                })
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
}

fn opt_text(o: Option(String)) -> pog.Value {
  case o {
    None -> pog.null()
    Some(s) -> case string.trim(s) == "" { True -> pog.null() False -> pog.text(string.trim(s)) }
  }
}

/// PATCH /api/v1/locations/pages/:page_id
pub fn patch_location_page(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, page_patch_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(p) -> {
          let p_pub = case p.is_published {
            None -> pog.null()
            Some(b) -> pog.bool(b)
          }
          case
            pog.query(
              "update location_pages set
                district_id            = coalesce($2::int, district_id),
                slug_path              = coalesce($3::text, slug_path),
                hero_image_key         = coalesce($4::text, hero_image_key),
                title                  = coalesce($5::text, title),
                description            = coalesce($6::text, description),
                meta_title             = coalesce($7::text, meta_title),
                meta_description       = coalesce($8::text, meta_description),
                gallery_json           = coalesce($9::jsonb, gallery_json),
                map_lat                = coalesce($10::numeric, map_lat),
                map_lng                = coalesce($11::numeric, map_lng),
                is_published           = coalesce($12::boolean, is_published),
                region_type            = coalesce($13::text, region_type),
                featured_image_url     = coalesce($14::text, featured_image_url),
                hero_image_url         = coalesce($15::text, hero_image_url),
                travel_ideas_image_url = coalesce($16::text, travel_ideas_image_url),
                travel_ideas_json      = coalesce($17::jsonb, travel_ideas_json),
                translations_json      = coalesce($18::jsonb, translations_json),
                poi_manual_json        = coalesce($19::jsonb, poi_manual_json),
                country_info_json      = coalesce($20::jsonb, country_info_json),
                updated_at             = now()
              where id = $1::uuid returning id::text",
            )
            |> pog.parameter(pog.text(string.trim(page_id)))
            |> pog.parameter(opt_text(p.district_id))
            |> pog.parameter(opt_text(p.slug_path))
            |> pog.parameter(opt_text(p.hero_image_key))
            |> pog.parameter(opt_text(p.title))
            |> pog.parameter(opt_text(p.description))
            |> pog.parameter(opt_text(p.meta_title))
            |> pog.parameter(opt_text(p.meta_description))
            |> pog.parameter(opt_text(p.gallery_json))
            |> pog.parameter(opt_text(p.map_lat))
            |> pog.parameter(opt_text(p.map_lng))
            |> pog.parameter(p_pub)
            |> pog.parameter(opt_text(p.region_type))
            |> pog.parameter(opt_text(p.featured_image_url))
            |> pog.parameter(opt_text(p.hero_image_url))
            |> pog.parameter(opt_text(p.travel_ideas_image_url))
            |> pog.parameter(opt_text(p.travel_ideas_json))
            |> pog.parameter(opt_text(p.translations_json))
            |> pog.parameter(opt_text(p.poi_manual_json))
            |> pog.parameter(opt_text(p.country_info_json))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "location_page_update_failed")
            Ok(r) ->
              case r.rows {
                [] -> json_err(404, "not_found")
                [id] -> {
                  let out =
                    json.object([#("id", json.string(id)), #("ok", json.bool(True))])
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

/// DELETE /api/v1/locations/pages/:page_id
pub fn delete_location_page(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case
    pog.query("delete from location_pages where id = $1::uuid")
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "location_page_delete_failed")
    Ok(ret) ->
      case ret.count {
        0 -> json_err(404, "not_found")
        _ -> wisp.json_response("{\"ok\":true}", 200)
      }
  }
}

// --- poi_settings (replace per page) ---

fn poi_settings_row() -> decode.Decoder(#(String, String, Int, Int)) {
  use id <- decode.field(0, decode.string)
  use pts <- decode.field(1, decode.string)
  use mpt <- decode.field(2, decode.int)
  use rm <- decode.field(3, decode.int)
  decode.success(#(id, pts, mpt, rm))
}

/// GET /api/v1/locations/pages/:page_id/poi-settings
pub fn get_poi_settings(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, coalesce(poi_types::text,'{}'), max_per_type, radius_meters from location_poi_settings where location_page_id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.returning(poi_settings_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "poi_settings_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [#(id, pts, mpt, rm)] -> {
          let body =
            json.object([
              #("id", json.string(id)),
              #("poi_types", json.string(pts)),
              #("max_per_type", json.int(mpt)),
              #("radius_meters", json.int(rm)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn poi_put_decoder() -> decode.Decoder(#(List(String), Int, Int)) {
  decode.field("poi_types", decode.list(decode.string), fn(pts) {
    decode.field("max_per_type", decode.int, fn(mpt) {
      decode.field("radius_meters", decode.int, fn(rm) {
        decode.success(#(pts, mpt, rm))
      })
    })
  })
}

/// PUT /api/v1/locations/pages/:page_id/poi-settings — sayfa başına tek kayıt
pub fn put_poi_settings(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Put)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, poi_put_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(pts, mpt, rm)) -> {
          let pid = string.trim(page_id)
          let _ =
            pog.query(
              "delete from location_poi_settings where location_page_id = $1::uuid",
            )
            |> pog.parameter(pog.text(pid))
            |> pog.execute(ctx.db)
          case
            pog.query(
              "insert into location_poi_settings (location_page_id, poi_types, max_per_type, radius_meters) values ($1::uuid, $2::text[], $3, $4) returning id::text",
            )
            |> pog.parameter(pog.text(pid))
            |> pog.parameter(pog.array(pog.text, pts))
            |> pog.parameter(pog.int(mpt))
            |> pog.parameter(pog.int(rm))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "poi_settings_upsert_failed")
            Ok(r) ->
              case r.rows {
                [id] -> {
                  let out = json.object([#("id", json.string(id)), #("ok", json.bool(True))])
                  let body = json.to_string(out)
                  wisp.json_response(body, 200)
                }
                _ -> json_err(500, "unexpected")
              }
          }
        }
      }
  }
}

// --- poi_cache ---

fn poi_cache_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use pid <- decode.field(1, decode.string)
  use pl <- decode.field(2, decode.string)
  use nm <- decode.field(3, decode.string)
  use pt <- decode.field(4, decode.string)
  use dm <- decode.field(5, decode.string)
  use lat <- decode.field(6, decode.string)
  use lng <- decode.field(7, decode.string)
  decode.success(#(id, pid, pl, nm, pt, dm, lat, lng))
}

fn poi_cache_json(
  row: #(String, String, String, String, String, String, String, String),
) -> json.Json {
  let #(id, _pid, pl, nm, pt, dm, lat, lng) = row
  let plj = case pl == "" {
    True -> json.null()
    False -> json.string(pl)
  }
  let dmj = case dm == "" {
    True -> json.null()
    False -> json.string(dm)
  }
  let latj = case lat == "" {
    True -> json.null()
    False -> json.string(lat)
  }
  let lngj = case lng == "" {
    True -> json.null()
    False -> json.string(lng)
  }
  json.object([
    #("id", json.string(id)),
    #("place_id", plj),
    #("name", json.string(nm)),
    #("poi_type", json.string(pt)),
    #("distance_meters", dmj),
    #("lat", latj),
    #("lng", lngj),
  ])
}

/// GET /api/v1/locations/pages/:page_id/poi-cache
pub fn list_poi_cache(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, location_page_id::text, coalesce(place_id,''), name, poi_type, coalesce(distance_meters::text,''), coalesce(lat::text,''), coalesce(lng::text,'') from location_poi_cache where location_page_id = $1::uuid order by id desc limit 200",
    )
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.returning(poi_cache_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "poi_cache_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, poi_cache_json)
      let body =
        json.object([#("items", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn poi_cache_insert_decoder() -> decode.Decoder(
  #(Option(String), String, String, Option(Int), Option(String), Option(String)),
) {
  decode.optional_field("place_id", "", decode.string, fn(pl) {
    decode.field("name", decode.string, fn(nm) {
      decode.field("poi_type", decode.string, fn(pt) {
        decode.optional_field("distance_meters", 0, decode.int, fn(dm) {
          decode.optional_field("lat", "", decode.string, fn(lat) {
            decode.optional_field("lng", "", decode.string, fn(lng) {
              let p = case string.trim(pl) == "" {
                True -> None
                False -> Some(string.trim(pl))
              }
              let dm_opt = case dm {
                0 -> None
                n -> Some(n)
              }
              let la = case string.trim(lat) == "" {
                True -> None
                False -> Some(string.trim(lat))
              }
              let lo = case string.trim(lng) == "" {
                True -> None
                False -> Some(string.trim(lng))
              }
              decode.success(#(p, nm, pt, dm_opt, la, lo))
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/locations/pages/:page_id/poi-cache
pub fn add_poi_cache_row(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, poi_cache_insert_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(pl_opt, nm, pt, dm_opt, lat_opt, lng_opt)) ->
          case string.trim(nm) == "" || string.trim(pt) == "" {
            True -> json_err(400, "name_poi_type_required")
            False -> {
              let pl_p = case pl_opt {
                None -> pog.null()
                Some(p) -> pog.text(p)
              }
              let dm_p = case dm_opt {
                None -> pog.null()
                Some(d) -> pog.int(d)
              }
              let lat_p = case lat_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              let lng_p = case lng_opt {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              case
                pog.query(
                  "insert into location_poi_cache (location_page_id, place_id, name, poi_type, distance_meters, lat, lng) values ($1::uuid, $2, $3, $4, $5::int, $6::numeric, $7::numeric) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(page_id)))
                |> pog.parameter(pl_p)
                |> pog.parameter(pog.text(string.trim(nm)))
                |> pog.parameter(pog.text(string.trim(pt)))
                |> pog.parameter(dm_p)
                |> pog.parameter(lat_p)
                |> pog.parameter(lng_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "poi_cache_insert_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
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

/// DELETE /api/v1/locations/pages/:page_id/poi-cache — sayfadaki tüm önbellek
pub fn clear_poi_cache(req: Request, ctx: Context, page_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case
    pog.query(
      "delete from location_poi_cache where location_page_id = $1::uuid",
    )
    |> pog.parameter(pog.text(string.trim(page_id)))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "poi_cache_clear_failed")
    Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
  }
}

// --- ical_feeds ---
//
// Satır şeması (yeni 249 sonrası):
//   0 id          1 listing_id     2 url
//   3 day_offset_plus  4 day_offset_minus
//   5 last_sync_at(text or '')   6 last_hash(text or '')
//   7 last_error(text or '')     8 last_event_count(int)   9 is_active(bool)

type IcalRow =
  #(String, String, String, Int, Int, String, String, String, Int, Bool)

fn ical_row() -> decode.Decoder(IcalRow) {
  use id <- decode.field(0, decode.string)
  use lid <- decode.field(1, decode.string)
  use url <- decode.field(2, decode.string)
  use dp <- decode.field(3, decode.int)
  use dm <- decode.field(4, decode.int)
  use lsa <- decode.field(5, decode.string)
  use lh <- decode.field(6, decode.string)
  use le <- decode.field(7, decode.string)
  use lec <- decode.field(8, decode.int)
  use ia <- decode.field(9, decode.bool)
  decode.success(#(id, lid, url, dp, dm, lsa, lh, le, lec, ia))
}

const ical_select_cols: String =
  "select id::text, listing_id::text, url, day_offset_plus, day_offset_minus, "
  <> "coalesce(last_sync_at::text,''), coalesce(last_hash,''), "
  <> "coalesce(last_error,''), last_event_count, is_active "
  <> "from ical_feeds"

fn ical_json(row: IcalRow) -> json.Json {
  let #(id, lid, url, dp, dm, lsa, lh, le, lec, ia) = row
  let lsaj = case lsa == "" {
    True -> json.null()
    False -> json.string(lsa)
  }
  let lhj = case lh == "" {
    True -> json.null()
    False -> json.string(lh)
  }
  let lej = case le == "" {
    True -> json.null()
    False -> json.string(le)
  }
  json.object([
    #("id", json.string(id)),
    #("listing_id", json.string(lid)),
    #("url", json.string(url)),
    #("day_offset_plus", json.int(dp)),
    #("day_offset_minus", json.int(dm)),
    #("last_sync_at", lsaj),
    #("last_hash", lhj),
    #("last_error", lej),
    #("last_event_count", json.int(lec)),
    #("is_active", json.bool(ia)),
  ])
}

/// GET /api/v1/locations/ical-feeds?listing_id=
pub fn list_ical_feeds(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let lf =
    list.key_find(qs, "listing_id")
    |> result.unwrap("")
    |> string.trim
  case lf == "" {
    True -> json_err(400, "listing_id_required")
    False ->
      case
        pog.query(
          ical_select_cols
          <> " where listing_id = $1::uuid order by id",
        )
        |> pog.parameter(pog.text(lf))
        |> pog.returning(ical_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "ical_feeds_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, ical_json)
          let body =
            json.object([#("feeds", json.array(from: arr, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

fn ical_create_decoder() -> decode.Decoder(#(String, String, Int, Int)) {
  decode.field("listing_id", decode.string, fn(lid) {
    decode.field("url", decode.string, fn(url) {
      decode.optional_field("day_offset_plus", 0, decode.int, fn(dp) {
        decode.optional_field("day_offset_minus", 0, decode.int, fn(dm) {
          decode.success(#(lid, url, dp, dm))
        })
      })
    })
  })
}

/// POST /api/v1/locations/ical-feeds
pub fn create_ical_feed(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, ical_create_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(lid, url, dp, dm)) ->
          case string.trim(lid) == "" || string.trim(url) == "" {
            True -> json_err(400, "listing_id_url_required")
            False -> {
              case
                pog.query(
                  "insert into ical_feeds (listing_id, url, day_offset_plus, day_offset_minus) values ($1::uuid, $2, $3, $4) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(lid)))
                |> pog.parameter(pog.text(string.trim(url)))
                |> pog.parameter(pog.int(dp))
                |> pog.parameter(pog.int(dm))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "ical_feed_create_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out = json.object([#("id", json.string(id))]) |> json.to_string
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

fn ical_patch_decoder() -> decode.Decoder(
  #(Option(String), Option(Int), Option(Int), Option(String), Option(String), Option(Bool)),
) {
  decode.optional_field("url", None, decode.optional(decode.string), fn(url) {
    decode.optional_field("day_offset_plus", None, decode.optional(decode.int), fn(dp) {
      decode.optional_field("day_offset_minus", None, decode.optional(decode.int), fn(dm) {
        decode.optional_field("last_sync_at", None, decode.optional(decode.string), fn(lsa) {
          decode.optional_field("last_hash", None, decode.optional(decode.string), fn(lh) {
            decode.optional_field("is_active", None, decode.optional(decode.bool), fn(ia) {
              decode.success(#(url, dp, dm, lsa, lh, ia))
            })
          })
        })
      })
    })
  })
}

/// PATCH /api/v1/locations/ical-feeds/:feed_id
pub fn patch_ical_feed(req: Request, ctx: Context, feed_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, ical_patch_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(url_opt, dp_opt, dm_opt, lsa_opt, lh_opt, ia_opt)) ->
          case url_opt, dp_opt, dm_opt, lsa_opt, lh_opt, ia_opt {
            None, None, None, None, None, None -> json_err(400, "no_fields")
            _, _, _, _, _, _ -> {
              let p_u = case url_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_dp = case dp_opt {
                None -> pog.null()
                Some(i) -> pog.int(i)
              }
              let p_dm = case dm_opt {
                None -> pog.null()
                Some(i) -> pog.int(i)
              }
              let p_lsa = case lsa_opt {
                None -> pog.null()
                Some(s) ->
                  case string.trim(s) == "" {
                    True -> pog.null()
                    False -> pog.text(string.trim(s))
                  }
              }
              let p_lh = case lh_opt {
                None -> pog.null()
                Some(s) -> pog.text(string.trim(s))
              }
              let p_ia = case ia_opt {
                None -> pog.null()
                Some(b) -> pog.bool(b)
              }
              case
                pog.query(
                  "update ical_feeds set url = coalesce($2::text, url), day_offset_plus = coalesce($3::int, day_offset_plus), day_offset_minus = coalesce($4::int, day_offset_minus), last_sync_at = coalesce($5::timestamptz, last_sync_at), last_hash = coalesce($6::text, last_hash), is_active = coalesce($7::bool, is_active) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(feed_id)))
                |> pog.parameter(p_u)
                |> pog.parameter(p_dp)
                |> pog.parameter(p_dm)
                |> pog.parameter(p_lsa)
                |> pog.parameter(p_lh)
                |> pog.parameter(p_ia)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "ical_feed_update_failed")
                Ok(r) ->
                  case r.rows {
                    [] -> json_err(404, "not_found")
                    [id] -> {
                      let out =
                        json.object([#("id", json.string(id)), #("ok", json.bool(True))])
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

/// DELETE /api/v1/locations/ical-feeds/:feed_id
pub fn delete_ical_feed(req: Request, ctx: Context, feed_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case
    pog.query("delete from ical_feeds where id = $1::uuid")
    |> pog.parameter(pog.text(string.trim(feed_id)))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "ical_feed_delete_failed")
    Ok(ret) ->
      case ret.count {
        0 -> json_err(404, "not_found")
        _ -> wisp.json_response("{\"ok\":true}", 200)
      }
  }
}

/// POST /api/v1/locations/ical-feeds/:feed_id/sync
/// Manuel sync — feed URL'sini fetch eder, parse eder, availability'yi günceller.
/// Yanıt:
///   200 → `{ "ok": true, "event_count": N, "day_count": M }`
///   400/404/502 → `{ "error": "kısa_kod" }`
pub fn sync_ical_feed(
  req: Request,
  ctx: Context,
  feed_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Post)
  case ical_sync.sync_feed(ctx, string.trim(feed_id)) {
    Error("feed_not_found") -> json_err(404, "feed_not_found")
    Error("feed_inactive") -> json_err(409, "feed_inactive")
    Error("fetch_failed") -> json_err(502, "fetch_failed")
    Error(other) -> json_err(500, other)
    Ok(report) -> {
      let body =
        json.object([
          #("ok", json.bool(True)),
          #("event_count", json.int(report.event_count)),
          #("day_count", json.int(report.day_count)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

// --- ical_imported_blocks (debug / admin tracing) ---

type ImportedBlockRow =
  #(Int, String, String, String, String, String, String, String)

fn imported_block_row() -> decode.Decoder(ImportedBlockRow) {
  use id <- decode.field(0, decode.int)
  use feed_id <- decode.field(1, decode.string)
  use lid <- decode.field(2, decode.string)
  use uid <- decode.field(3, decode.string)
  use s <- decode.field(4, decode.string)
  use e <- decode.field(5, decode.string)
  use summary <- decode.field(6, decode.string)
  use imp <- decode.field(7, decode.string)
  decode.success(#(id, feed_id, lid, uid, s, e, summary, imp))
}

fn imported_block_json(row: ImportedBlockRow) -> json.Json {
  let #(id, feed_id, lid, uid, s, e, summary, imp) = row
  json.object([
    #("id", json.int(id)),
    #("feed_id", json.string(feed_id)),
    #("listing_id", json.string(lid)),
    #("uid", json.string(uid)),
    #("starts_on", json.string(s)),
    #("ends_on", json.string(e)),
    #("summary", json.string(summary)),
    #("imported_at", json.string(imp)),
  ])
}

/// GET /api/v1/locations/ical-imported-blocks?feed_id=...|listing_id=...&limit=N
///
/// Yönetici için "iCal'den içeri aktarılmış blok" listesi.
/// `feed_id` veya `listing_id` parametrelerinden en az biri gerekir.
/// Varsayılan limit 200 (üst sınır 1000).
pub fn list_imported_blocks(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let feed_id =
    list.key_find(qs, "feed_id")
    |> result.unwrap("")
    |> string.trim
  let listing_id =
    list.key_find(qs, "listing_id")
    |> result.unwrap("")
    |> string.trim
  let limit_raw =
    list.key_find(qs, "limit")
    |> result.unwrap("200")
    |> string.trim
  let limit = case int.parse(limit_raw) {
    Ok(n) ->
      case n < 1 {
        True -> 1
        False ->
          case n > 1000 {
            True -> 1000
            False -> n
          }
      }
    Error(_) -> 200
  }

  case feed_id == "" && listing_id == "" {
    True -> json_err(400, "feed_id_or_listing_id_required")
    False -> {
      let base =
        "select b.id, b.feed_id::text, f.listing_id::text, b.uid, "
        <> "to_char(b.starts_on, 'YYYY-MM-DD'), to_char(b.ends_on, 'YYYY-MM-DD'), "
        <> "coalesce(b.summary,''), to_char(b.imported_at, 'YYYY-MM-DD\"T\"HH24:MI:SSOF') "
        <> "from ical_imported_blocks b "
        <> "join ical_feeds f on f.id = b.feed_id"
      let #(sql, param) = case feed_id == "" {
        False -> #(
          base <> " where b.feed_id = $1::uuid order by b.imported_at desc, b.id desc limit $2::int",
          feed_id,
        )
        True -> #(
          base <> " where f.listing_id = $1::uuid order by b.imported_at desc, b.id desc limit $2::int",
          listing_id,
        )
      }
      case
        pog.query(sql)
        |> pog.parameter(pog.text(param))
        |> pog.parameter(pog.int(limit))
        |> pog.returning(imported_block_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "imported_blocks_query_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, imported_block_json)
          let body =
            json.object([
              #("blocks", json.array(from: arr, of: fn(x) { x })),
              #("count", json.int(list.length(arr))),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}
