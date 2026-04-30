//// Ülke için illeri DeepSeek (`region_hierarchy`) ile üretir ve `regions` tablosuna senkron yazar.

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec

pub type GenOutcome {
  GenOutcome(job_id: String, created: Int, skipped: Int)
}

fn llm_output_text_decoder() -> decode.Decoder(String) {
  use t <- decode.field("text", decode.string)
  decode.success(t)
}

/// Türkçe isimden basit ASCII slug (çoğu il için yeterli).
fn slug_fallback(name: String) -> String {
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
}

fn province_item_decoder() -> decode.Decoder(
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
    False -> {
      // İlk `[` … son `]` aralığı (tek seviye dizi varsayımı)
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
            |> pog.execute(ctx.db)
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
        |> pog.execute(ctx.db)
      {
        Error(_) -> Error("country_lookup_failed")
        Ok(r) ->
          case r.rows {
            [id] -> Ok(id)
            _ ->
              Error(
                "country_not_found_add_country_first",
              )
          }
      }
  }
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
    |> pog.execute(ctx.db)
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

fn job_out_row() -> decode.Decoder(#(String, String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  decode.success(#(a, b, c))
}

/// DeepSeek işini sırayla çalıştırır ve dönen JSON dizisinden illeri ekler.
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
  let input_s = json.to_string(input_obj)

  use job_id <- result.try(case
    pog.query(
      "insert into ai_jobs (profile_code, input_json, status) values ('region_hierarchy', $1::jsonb, 'queued') returning id::text",
    )
    |> pog.parameter(pog.text(input_s))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
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
    |> pog.execute(ctx.db)
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

  let arr_json = extract_json_array_text(out_text)
  use provinces <- result.try(case json.parse(arr_json, decode.list(province_item_decoder())) {
    Error(_) -> Error("llm_json_array_parse_failed")
    Ok(rows) -> Ok(rows)
  })

  let #(created, skipped) =
    list.fold(provinces, #(0, 0), fn(acc, row) {
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
