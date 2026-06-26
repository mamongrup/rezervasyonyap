//// Ülke → il → ilçe → destinasyon (popüler alt bölge) — DeepSeek `region_hierarchy` ile senkron üretim.

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec

pub type GenOutcome {
  GenOutcome(job_id: String, created: Int, skipped: Int)
}

fn llm_output_text_decoder() -> decode.Decoder(String) {
  use t <- decode.field("text", decode.string)
  decode.success(t)
}

pub fn slug_fallback(name: String) -> String {
  name
  |> string.replace("İ", "i")
  |> string.replace("I", "i")
  |> string.replace("ı", "i")
  |> string.replace("Ğ", "g")
  |> string.replace("ğ", "g")
  |> string.replace("Ü", "u")
  |> string.replace("ü", "u")
  |> string.replace("Ş", "s")
  |> string.replace("ş", "s")
  |> string.replace("Ö", "o")
  |> string.replace("ö", "o")
  |> string.replace("Ç", "c")
  |> string.replace("ç", "c")
  |> string.lowercase
  |> string.replace(" ", "-")
  |> string.replace(".", "")
  |> string.replace(",", "")
  |> string.replace("'", "")
}

fn geo_item_decoder() -> decode.Decoder(
  #(String, String, Option(String), Option(String)),
) {
  use name <- decode.field("name", decode.string)
  use slug_raw <- decode.optional_field("slug", "", decode.string)
  use lat <- decode.optional_field("center_lat", "", decode.string)
  use lng <- decode.optional_field("center_lng", "", decode.string)
  let la = case string.trim(lat) == "" {
    True -> None
    False -> Some(string.trim(lat))
  }
  let lo = case string.trim(lng) == "" {
    True -> None
    False -> Some(string.trim(lng))
  }
  let sl = case string.trim(slug_raw) == "" {
    True -> slug_fallback(string.trim(name))
    False -> string.trim(slug_raw)
  }
  decode.success(#(string.trim(name), sl, la, lo))
}

fn strip_markdown_fence(s: String) -> String {
  let t = string.trim(s)
  case string.starts_with(t, "```") {
    False -> t
    True -> {
      let lines = string.split(t, "\n")
      let rest =
        list.drop(lines, 1)
        |> list.reverse
        |> list.drop(1)
        |> list.reverse
        |> string.join(with: "\n")
      string.trim(rest)
    }
  }
}

fn extract_json_array_text(raw: String) -> String {
  let t = strip_markdown_fence(string.trim(raw))
  case string.starts_with(string.trim(t), "[") {
    True -> string.trim(t)
    False ->
      case string.split_once(t, "[") {
        Error(_) -> t
        Ok(#(_, after_open)) ->
          case string.split_once(after_open, "]") {
            Error(_) -> string.append("[", after_open)
            Ok(#(inner, _rest)) -> string.append("[", string.append(inner, "]"))
          }
      }
  }
}

fn job_out_row() -> decode.Decoder(#(String, String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  decode.success(#(a, b, c))
}

fn lookup_country_id(
  ctx: Context,
  country_name: String,
  country_id_in: Option(String),
) -> Result(String, String) {
  case country_id_in {
    Some(cid) ->
      case string.trim(cid) == "" {
        True -> lookup_country_by_name(ctx, country_name)
        False -> {
          let c = string.trim(cid)
          case
            pog.query(
              "select id::text from countries where id = $1::smallint limit 1",
            )
            |> pog.parameter(pog.text(c))
            |> pog.returning(row_dec.col0_string())
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> Error("country_lookup_failed")
            Ok(r) ->
              case r.rows {
                [id] -> Ok(id)
                _ -> Error("country_not_found")
              }
          }
        }
      }
    None -> lookup_country_by_name(ctx, country_name)
  }
}

fn lookup_country_by_name(ctx: Context, name: String) -> Result(String, String) {
  let n = string.trim(name)
  case n == "" {
    True -> Error("country_name_required")
    False ->
      case
        pog.query(
          "select id::text from countries where lower(trim(name)) = lower(trim($1)) limit 1",
        )
        |> pog.parameter(pog.text(n))
        |> pog.returning(row_dec.col0_string())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> Error("country_lookup_failed")
        Ok(r) ->
          case r.rows {
            [id] -> Ok(id)
            _ -> Error("country_not_found_add_country_first")
          }
      }
  }
}

fn run_hierarchy_job(
  ctx: Context,
  input_obj: json.Json,
) -> Result(#(String, String), String) {
  let input_s = json.to_string(input_obj)
  use job_id <- result.try(case
    pog.query(
      "insert into ai_jobs (profile_code, input_json, status) values ('region_hierarchy', $1::jsonb, 'queued') returning id::text",
    )
    |> pog.parameter(pog.text(input_s))
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("ai_job_insert_failed")
    Ok(r) ->
      case r.rows {
        [jid] -> Ok(jid)
        _ -> Error("unexpected_job_insert")
      }
  })

  use _ <- result.try(case ai_job_run.run_ai_job(ctx, job_id) {
    Ok(_) -> Ok(Nil)
    Error(e) -> Error(e)
  })

  use out_text <- result.try(case
    pog.query(
      "select coalesce(output_json::text,''), coalesce(status,''), coalesce(error,'') from ai_jobs where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(job_id))
    |> pog.returning(job_out_row())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("ai_job_output_query_failed")
    Ok(r) ->
      case r.rows {
        [#(oj, st, er)] ->
          case st == "succeeded" {
            False ->
              Error(case er == "" {
                True -> "ai_job_failed"
                False -> er
              })
            True ->
              case json.parse(oj, llm_output_text_decoder()) {
                Error(_) -> Error("ai_job_output_parse_failed")
                Ok(llm_raw) -> Ok(llm_raw)
              }
          }
        _ -> Error("unexpected_output_row")
      }
  })

  Ok(#(job_id, out_text))
}

fn insert_region_row(
  ctx: Context,
  country_id: String,
  name: String,
  slug: String,
  lat: Option(String),
  lng: Option(String),
) -> Result(Bool, String) {
  let lat_p = case lat {
    None -> pog.null()
    Some(s) -> pog.text(s)
  }
  let lng_p = case lng {
    None -> pog.null()
    Some(s) -> pog.text(s)
  }
  case
    pog.query(
      "insert into regions (country_id, name, slug, center_lat, center_lng) values ($1::smallint, $2, $3, $4::numeric, $5::numeric) on conflict (country_id, slug) do nothing returning id::text",
    )
    |> pog.parameter(pog.text(country_id))
    |> pog.parameter(pog.text(name))
    |> pog.parameter(pog.text(slug))
    |> pog.parameter(lat_p)
    |> pog.parameter(lng_p)
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("region_insert_failed")
    Ok(r) ->
      case r.rows {
        [] -> Ok(False)
        [_] -> Ok(True)
        _ -> Error("unexpected_insert_rows")
      }
  }
}

/// Ülke için illeri üretir (`regions` tablosu).
pub fn generate_and_insert_provinces(
  ctx: Context,
  country_name: String,
  country_id_opt: Option(String),
) -> Result(GenOutcome, String) {
  use country_id <- result.try(lookup_country_id(ctx, country_name, country_id_opt))

  let instruction =
    "You output ONLY valid JSON (no markdown, no prose). A single JSON array. Each element MUST be an object with: "
    <> "\"name\" (local language), \"slug\" (lowercase ascii letters, digits, hyphens only), "
    <> "\"center_lat\", \"center_lng\" as strings with decimal degrees (e.g. \\\"41.0082\\\"). "
    <> "List every first-level administrative division (province/state) of "
    <> country_name
    <> "."

  let input_obj =
    json.object([
      #("locale", json.string("tr")),
      #("step", json.string("provinces")),
      #("country_name", json.string(string.trim(country_name))),
      #("country_id", json.string(country_id)),
      #("instruction", json.string(instruction)),
    ])

  use #(job_id, out_text) <- result.try(run_hierarchy_job(ctx, input_obj))
  let arr_json = extract_json_array_text(out_text)
  use rows <- result.try(case json.parse(arr_json, decode.list(geo_item_decoder())) {
    Error(_) -> Error("llm_json_array_parse_failed")
    Ok(r) -> Ok(r)
  })

  let #(created, skipped) =
    list.fold(rows, #(0, 0), fn(acc, row) {
      let #(c, sk) = acc
      let #(nm, sl, la, lo) = row
      case nm == "" || sl == "" {
        True -> #(c, sk + 1)
        False ->
          case insert_region_row(ctx, country_id, nm, sl, la, lo) {
            Ok(True) -> #(c + 1, sk)
            Ok(False) -> #(c, sk + 1)
            Error(_) -> #(c, sk + 1)
          }
      }
    })

  Ok(GenOutcome(job_id:, created:, skipped:))
}

fn region_ctx_row() -> decode.Decoder(#(
  String,
  String,
  String,
  String,
  String,
)) {
  use rid <- decode.field(0, decode.string)
  use rname <- decode.field(1, decode.string)
  use rslug <- decode.field(2, decode.string)
  use cid <- decode.field(3, decode.string)
  use iso <- decode.field(4, decode.string)
  decode.success(#(rid, rname, rslug, cid, iso))
}

fn lookup_region_ctx(ctx: Context, region_id: String) -> Result(
  #(String, String, String, String, String),
  String,
) {
  case string.trim(region_id) == "" {
    True -> Error("region_id_required")
    False ->
      case
        pog.query(
          "select r.id::text, r.name, r.slug, r.country_id::text, co.iso2 from regions r join countries co on co.id = r.country_id where r.id = $1::int limit 1",
        )
        |> pog.parameter(pog.int({
          case int.parse(region_id) {
            Ok(n) -> n
            Error(_) -> 0
          }
        }))
        |> pog.returning(region_ctx_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> Error("region_lookup_failed")
        Ok(r) ->
          case r.rows {
            [row] -> Ok(row)
            _ -> Error("region_not_found")
          }
      }
  }
}

fn district_ctx_row() -> decode.Decoder(#(
  String,
  String,
  String,
  String,
  String,
  String,
  String,
)) {
  use did <- decode.field(0, decode.string)
  use dname <- decode.field(1, decode.string)
  use dslug <- decode.field(2, decode.string)
  use rid <- decode.field(3, decode.string)
  use rslug <- decode.field(4, decode.string)
  use rname <- decode.field(5, decode.string)
  use iso <- decode.field(6, decode.string)
  decode.success(#(did, dname, dslug, rid, rslug, rname, iso))
}

fn lookup_district_ctx(ctx: Context, district_id: String) -> Result(
  #(String, String, String, String, String, String, String),
  String,
) {
  case string.trim(district_id) == "" {
    True -> Error("district_id_required")
    False ->
      case
        pog.query(
          "select d.id::text, d.name, d.slug, d.region_id::text, r.slug, r.name, co.iso2 from districts d join regions r on r.id = d.region_id join countries co on co.id = r.country_id where d.id = $1::int limit 1",
        )
        |> pog.parameter(pog.int({
          case int.parse(district_id) {
            Ok(n) -> n
            Error(_) -> 0
          }
        }))
        |> pog.returning(district_ctx_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> Error("district_lookup_failed")
        Ok(r) ->
          case r.rows {
            [row] -> Ok(row)
            _ -> Error("district_not_found")
          }
      }
  }
}

fn slug_path4(iso: String, rslug: String, dslug: String, tail: String) -> String {
  string.lowercase(iso)
  <> "/"
  <> string.lowercase(rslug)
  <> "/"
  <> string.lowercase(dslug)
  <> "/"
  <> string.lowercase(tail)
}

fn upsert_district(
  ctx: Context,
  region_id: String,
  country_id: String,
  iso2: String,
  region_slug: String,
  name: String,
  slug: String,
  lat: Option(String),
  lng: Option(String),
) -> Result(Bool, String) {
  let lat_p = case lat {
    None -> pog.null()
    Some(s) -> pog.text(s)
  }
  let lng_p = case lng {
    None -> pog.null()
    Some(s) -> pog.text(s)
  }
  let sp = string.lowercase(iso2) <> "/" <> string.lowercase(region_slug) <> "/" <> string.lowercase(slug)

  case
    pog.query(
      "insert into districts (region_id, name, slug, center_lat, center_lng) values ($1::int, $2, $3, $4::numeric, $5::numeric) on conflict (region_id, slug) do update set name = excluded.name, center_lat = coalesce(excluded.center_lat, districts.center_lat), center_lng = coalesce(excluded.center_lng, districts.center_lng) returning id::text",
    )
    |> pog.parameter(pog.int({
      case int.parse(region_id) {
        Ok(n) -> n
        Error(_) -> 0
      }
    }))
    |> pog.parameter(pog.text(name))
    |> pog.parameter(pog.text(slug))
    |> pog.parameter(lat_p)
    |> pog.parameter(lng_p)
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("district_insert_failed")
    Ok(r) ->
      case r.rows {
        [] -> Ok(False)
        [did] -> {
          let _ =
            pog.query(
              "insert into location_pages (slug_path, district_id, region_id, country_id, region_type, title, map_lat, map_lng) values ($1, $2::int, $3::int, $4::smallint, 'district', $5, $6::numeric, $7::numeric) on conflict (slug_path) do update set title = excluded.title, map_lat = coalesce(excluded.map_lat, location_pages.map_lat), map_lng = coalesce(excluded.map_lng, location_pages.map_lng)",
            )
            |> pog.parameter(pog.text(sp))
            |> pog.parameter(pog.text(did))
            |> pog.parameter(pog.int({
              case int.parse(region_id) {
                Ok(n) -> n
                Error(_) -> 0
              }
            }))
            |> pog.parameter(pog.int({
              case int.parse(country_id) {
                Ok(n) -> n
                Error(_) -> 0
              }
            }))
            |> pog.parameter(pog.text(name))
            |> pog.parameter(lat_p)
            |> pog.parameter(lng_p)
            |> db_exec.execute(ctx.db)
          Ok(True)
        }
        _ -> Error("unexpected_district_rows")
      }
  }
}

/// İl için ilçeleri üretir (`districts` + `location_pages` district).
pub fn generate_and_insert_districts(
  ctx: Context,
  region_id: String,
) -> Result(GenOutcome, String) {
  use #(rid, rname, rslug, cid, iso2) <- result.try(lookup_region_ctx(ctx, region_id))

  let instruction =
    "You output ONLY valid JSON (no markdown, no prose). A single JSON array. Each element: "
    <> "\"name\" (Turkish), \"slug\" (ascii lowercase), \"center_lat\", \"center_lng\" as decimal strings. "
    <> "List all districts (ilçe) of "
    <> rname
    <> " province in Turkey. Use official district names only."

  let input_obj =
    json.object([
      #("locale", json.string("tr")),
      #("step", json.string("districts")),
      #("region_name", json.string(rname)),
      #("region_id", json.string(rid)),
      #("instruction", json.string(instruction)),
    ])

  use #(job_id, out_text) <- result.try(run_hierarchy_job(ctx, input_obj))
  let arr_json = extract_json_array_text(out_text)
  use rows <- result.try(case json.parse(arr_json, decode.list(geo_item_decoder())) {
    Error(_) -> Error("llm_json_array_parse_failed")
    Ok(r) -> Ok(r)
  })

  let #(created, skipped) =
    list.fold(rows, #(0, 0), fn(acc, row) {
      let #(c, sk) = acc
      let #(nm, sl, la, lo) = row
      case nm == "" || sl == "" {
        True -> #(c, sk + 1)
        False ->
          case upsert_district(ctx, rid, cid, iso2, rslug, nm, sl, la, lo) {
            Ok(True) -> #(c + 1, sk)
            Ok(False) -> #(c, sk + 1)
            Error(_) -> #(c, sk + 1)
          }
      }
    })

  Ok(GenOutcome(job_id:, created:, skipped:))
}

fn insert_destination_page(
  ctx: Context,
  did: String,
  rid: String,
  cid: String,
  iso2: String,
  rslug: String,
  dslug: String,
  name: String,
  dest_slug: String,
  lat: Option(String),
  lng: Option(String),
) -> Result(Bool, String) {
  let lat_p = case lat {
    None -> pog.null()
    Some(s) -> pog.text(s)
  }
  let lng_p = case lng {
    None -> pog.null()
    Some(s) -> pog.text(s)
  }
  let sp = slug_path4(iso2, rslug, dslug, dest_slug)

  case
    pog.query(
      "insert into location_pages (slug_path, district_id, region_id, country_id, region_type, title, map_lat, map_lng) values ($1, $2::int, $3::int, $4::smallint, 'destination', $5, $6::numeric, $7::numeric) on conflict (slug_path) do update set title = excluded.title, map_lat = coalesce(excluded.map_lat, location_pages.map_lat), map_lng = coalesce(excluded.map_lng, location_pages.map_lng) returning id::text",
    )
    |> pog.parameter(pog.text(sp))
    |> pog.parameter(pog.int({
      case int.parse(did) {
        Ok(n) -> n
        Error(_) -> 0
      }
    }))
    |> pog.parameter(pog.int({
      case int.parse(rid) {
        Ok(n) -> n
        Error(_) -> 0
      }
    }))
    |> pog.parameter(pog.int({
      case int.parse(cid) {
        Ok(n) -> n
        Error(_) -> 0
      }
    }))
    |> pog.parameter(pog.text(name))
    |> pog.parameter(lat_p)
    |> pog.parameter(lng_p)
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("destination_insert_failed")
    Ok(r) ->
      case r.rows {
        [] -> Ok(False)
        [_] -> Ok(True)
        _ -> Error("unexpected_destination_rows")
      }
  }
}

/// İlçe için popüler tatil / villa alt bölgelerini üretir (`location_pages` destination).
pub fn generate_and_insert_destinations(
  ctx: Context,
  district_id: String,
) -> Result(GenOutcome, String) {
  use #(did, dname, dslug, rid, rslug, rname, iso2) <- result.try(
    lookup_district_ctx(ctx, district_id),
  )

  use cid <- result.try(lookup_region_ctx(ctx, rid) |> result.map(fn(row) {
    let #(_, _, _, cid, _) = row
    cid
  }))

  let instruction =
    "You output ONLY valid JSON (no markdown, no prose). A single JSON array (8 to 15 items). Each element: "
    <> "\"name\" (Turkish, how tourists search), \"slug\" (ascii lowercase), "
    <> "\"center_lat\", \"center_lng\" as decimal strings. "
    <> "List popular vacation rental / villa tourism sub-areas in "
    <> dname
    <> " ("
    <> rname
    <> ", Turkey): neighborhoods, bays, villages (e.g. for Kaş: Kalkan, Patara; for Fethiye: Ölüdeniz, Çalış). "
    <> "Only real places; no duplicates."

  let input_obj =
    json.object([
      #("locale", json.string("tr")),
      #("step", json.string("destinations")),
      #("district_name", json.string(dname)),
      #("district_id", json.string(did)),
      #("region_name", json.string(rname)),
      #("instruction", json.string(instruction)),
    ])

  use #(job_id, out_text) <- result.try(run_hierarchy_job(ctx, input_obj))
  let arr_json = extract_json_array_text(out_text)
  use rows <- result.try(case json.parse(arr_json, decode.list(geo_item_decoder())) {
    Error(_) -> Error("llm_json_array_parse_failed")
    Ok(r) -> Ok(r)
  })

  let #(created, skipped) =
    list.fold(rows, #(0, 0), fn(acc, row) {
      let #(c, sk) = acc
      let #(nm, sl, la, lo) = row
      case nm == "" || sl == "" {
        True -> #(c, sk + 1)
        False ->
          case
            insert_destination_page(ctx, did, rid, cid, iso2, rslug, dslug, nm, sl, la, lo)
          {
            Ok(True) -> #(c + 1, sk)
            Ok(False) -> #(c, sk + 1)
            Error(_) -> #(c, sk + 1)
          }
      }
    })

  Ok(GenOutcome(job_id:, created:, skipped:))
}
