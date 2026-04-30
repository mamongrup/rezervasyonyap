//// İlçe gezilecek yer içeriği — toplu AI kuyruğu, Google Maps ve işleme (264_district_travel_ideas).
////
//// POST /api/v1/ai/district-ideas/queue-all          → tüm içeriksiz ilçeler için ai_jobs oluştur
//// POST /api/v1/ai/district-ideas/process-next       → sıradaki job'u çalıştır + location_pages güncelle
//// GET  /api/v1/ai/district-ideas/stats              → kuyruk durumu
//// GET  /api/v1/ai/district-ideas/next-empty         → içeriksiz bir sonraki ilçe (Google Maps için)
//// POST /api/v1/ai/district-ideas/save-places        → Google Maps sonuçlarını kaydet

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/json
import gleam/http
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

// ---------------------------------------------------------------------------
// GET /api/v1/ai/district-ideas/stats
// ---------------------------------------------------------------------------

fn stats_row() -> decode.Decoder(#(String, Int)) {
  use status <- decode.field(0, decode.string)
  use cnt <- decode.field(1, decode.int)
  decode.success(#(status, cnt))
}

/// GET /api/v1/ai/district-ideas/stats — `admin.users.read`
pub fn get_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let total_sql =
        "select count(*)::int from location_pages where region_type = 'district'"
      let jobs_sql =
        "select status, count(*)::int from ai_jobs where profile_code = 'district_travel_ideas' group by status"
      let has_ideas_sql =
        "select count(*)::int from location_pages where region_type = 'district' and jsonb_array_length(travel_ideas_json) > 0"

      let int_col0 = {
        use n <- decode.field(0, decode.int)
        decode.success(n)
      }
      case
        pog.query(total_sql)
        |> pog.returning(int_col0)
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "stats_total_failed")
        Ok(tr) -> {
          let total = case tr.rows {
            [n] -> n
            _ -> 0
          }
          case
            pog.query(jobs_sql)
            |> pog.returning(stats_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "stats_jobs_failed")
            Ok(jr) -> {
              let job_counts =
                list.map(jr.rows, fn(row) {
                  let #(status, cnt) = row
                  #(status, json.int(cnt))
                })
              case
                pog.query(has_ideas_sql)
                |> pog.returning(int_col0)
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "stats_has_ideas_failed")
                Ok(hr) -> {
                  let has_content = case hr.rows {
                    [n] -> n
                    _ -> 0
                  }
                  let body =
                    json.object([
                      #("total_districts", json.int(total)),
                      #("districts_with_content", json.int(has_content)),
                      #("jobs", json.object(job_counts)),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
              }
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/district-ideas/queue-all
// ---------------------------------------------------------------------------

/// POST /api/v1/ai/district-ideas/queue-all — `admin.users.read`
///
/// İçeriği olmayan (travel_ideas_json boş dizi) ve henüz kuyruğa alınmamış
/// ilçeler için `ai_jobs` kaydı oluşturur. Zaten kuyruğa alınmış olanları atlar.
pub fn queue_all(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      // İçeriği olmayan ilçe location_pages'leri bul
      let find_sql =
        "
        select lp.id::text, d.name as district_name, r.name as region_name, co.name as country_name
        from   location_pages lp
        join   districts d  on d.id  = lp.district_id
        join   regions   r  on r.id  = d.region_id
        join   countries co on co.id = r.country_id
        where  lp.region_type = 'district'
          and  jsonb_array_length(lp.travel_ideas_json) = 0
          and  lp.id::text not in (
                 select input_json->>'location_page_id'
                 from   ai_jobs
                 where  profile_code = 'district_travel_ideas'
                   and  status in ('queued','running','succeeded')
               )
        order  by r.name, d.name
        limit  2000
        "

      case
        pog.query(find_sql)
        |> pog.returning(district_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "find_districts_failed")
        Ok(ret) -> {
          let districts = ret.rows
          let count = list.length(districts)
          case count {
            0 ->
              wisp.json_response(
                "{\"queued\":0,\"message\":\"no_districts_need_content\"}",
                200,
              )
            _ -> {
              let enqueue_results =
                list.map(districts, fn(d) {
                  let #(lp_id, district_name, region_name, country_name) = d
                  let input =
                    json.object([
                      #("location_page_id", json.string(lp_id)),
                      #("district_name", json.string(district_name)),
                      #("region_name", json.string(region_name)),
                      #("country_name", json.string(country_name)),
                      #("locale", json.string("tr")),
                      #("count", json.string("5-10")),
                      #("instruction", json.string("Bu ilçenin en popüler ve en çok aranan turistik mekanlarını, tarihi ve doğal güzelliklerini listele.")),
                    ])
                    |> json.to_string
                  pog.query(
                    "insert into ai_jobs (profile_code, input_json) values ('district_travel_ideas', $1::jsonb)",
                  )
                  |> pog.parameter(pog.text(input))
                  |> pog.execute(ctx.db)
                })
              let ok_count =
                list.count(enqueue_results, fn(r) { result.is_ok(r) })
              let body =
                json.object([
                  #("queued", json.int(ok_count)),
                  #("total_found", json.int(count)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
      }
    }
  }
}

fn district_row() -> decode.Decoder(#(String, String, String, String)) {
  use lp_id <- decode.field(0, decode.string)
  use dn <- decode.field(1, decode.string)
  use rn <- decode.field(2, decode.string)
  use cn <- decode.field(3, decode.string)
  decode.success(#(lp_id, dn, rn, cn))
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/district-ideas/process-next
// ---------------------------------------------------------------------------

fn job_output_row() -> decode.Decoder(#(String, String, String)) {
  use job_id <- decode.field(0, decode.string)
  use lp_id <- decode.field(1, decode.string)
  use out_text <- decode.field(2, decode.string)
  decode.success(#(job_id, lp_id, out_text))
}

/// POST /api/v1/ai/district-ideas/process-next — `admin.users.read`
///
/// Kuyruktan bir sonraki `district_travel_ideas` job'unu alır, DeepSeek ile çalıştırır
/// ve çıktıyı `location_pages.travel_ideas_json` alanına yazar.
/// Kuyruk boşsa `{"done":true}` döner.
pub fn process_next(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "select id::text from ai_jobs where profile_code = 'district_travel_ideas' and status = 'queued' order by created_at limit 1",
        )
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "queue_poll_failed")
        Ok(ret) ->
          case ret.rows {
            [] ->
              wisp.json_response(
                "{\"done\":true,\"message\":\"queue_empty\"}",
                200,
              )
            [job_id] -> run_and_apply(ctx, job_id)
            _ -> json_err(500, "unexpected_queue_rows")
          }
      }
    }
  }
}

fn run_and_apply(ctx: Context, job_id: String) -> Response {
  case ai_job_run.run_ai_job(ctx, job_id) {
    Error(e) -> json_err(500, "job_run_failed: " <> e)
    Ok(Nil) -> {
      // Başarılı → output_json'dan text + location_page_id çek
      case
        pog.query(
          "select id::text, input_json->>'location_page_id', coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid and status = 'succeeded'",
        )
        |> pog.parameter(pog.text(job_id))
        |> pog.returning(job_output_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "output_fetch_failed")
        Ok(or) ->
          case or.rows {
            [] ->
              // Job başarılı sayılmadı (ör. provider inactive)
              wisp.json_response(
                "{\"done\":false,\"skipped\":true,\"job_id\":\""
                  <> job_id
                  <> "\"}",
                200,
              )
            [#(jid, lp_id, raw_text)] -> {
              let cleaned = clean_json_text(raw_text)
              apply_ideas(ctx, jid, lp_id, cleaned)
            }
            _ -> json_err(500, "unexpected_output_rows")
          }
      }
    }
  }
}

/// DeepSeek bazen yanıtı ```json ... ``` bloğuna sarar; temizle.
fn clean_json_text(s: String) -> String {
  let trimmed = string.trim(s)
  let stripped =
    trimmed
    |> strip_prefix("```json")
    |> strip_prefix("```")
    |> strip_suffix("```")
    |> string.trim
  stripped
}

fn strip_prefix(s: String, prefix: String) -> String {
  case string.starts_with(s, prefix) {
    True -> string.drop_start(s, string.length(prefix))
    False -> s
  }
}

fn strip_suffix(s: String, suffix: String) -> String {
  case string.ends_with(s, suffix) {
    True -> string.drop_end(s, string.length(suffix))
    False -> s
  }
}

fn apply_ideas(
  ctx: Context,
  job_id: String,
  lp_id: String,
  ideas_json: String,
) -> Response {
  let is_array =
    string.starts_with(string.trim(ideas_json), "[")
    && string.ends_with(string.trim(ideas_json), "]")

  let json_to_store = case is_array && string.trim(ideas_json) != "" {
    True -> ideas_json
    False -> "[]"
  }

  case
    pog.query(
      "update location_pages set travel_ideas_json = $2::jsonb where id = $1::uuid",
    )
    |> pog.parameter(pog.text(string.trim(lp_id)))
    |> pog.parameter(pog.text(json_to_store))
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "location_page_update_failed")
    Ok(_) -> {
      let body =
        json.object([
          #("done", json.bool(False)),
          #("job_id", json.string(job_id)),
          #("location_page_id", json.string(lp_id)),
          #("ideas_stored", json.bool(is_array)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/ai/district-ideas/next-empty
// ---------------------------------------------------------------------------

fn next_empty_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String),
) {
  use lp_id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use district_name <- decode.field(2, decode.string)
  use region_name <- decode.field(3, decode.string)
  use country_name <- decode.field(4, decode.string)
  use center_lat <- decode.field(5, decode.string)
  use center_lng <- decode.field(6, decode.string)
  decode.success(
    #(lp_id, slug, district_name, region_name, country_name, center_lat, center_lng),
  )
}

/// GET /api/v1/ai/district-ideas/next-empty — `admin.users.read`
///
/// İçeriği henüz olmayan (travel_ideas_json = '[]') bir sonraki ilçeyi döndürür.
/// Google Maps frontend döngüsü bu endpoint'i kullanarak sıradaki ilçeyi alır,
/// ardından `/api/v1/ai/district-ideas/save-places` ile sonucu kaydeder.
/// Tümü tamamlanmışsa `{"done":true}` döner.
pub fn next_empty(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "
          select lp.id::text, lp.slug_path,
                 d.name as district_name, r.name as region_name, co.name as country_name,
                 coalesce(d.center_lat::text, r.center_lat::text, ''),
                 coalesce(d.center_lng::text, r.center_lng::text, '')
          from   location_pages lp
          join   districts d  on d.id  = lp.district_id
          join   regions   r  on r.id  = d.region_id
          join   countries co on co.id = r.country_id
          where  lp.region_type = 'district'
            and  jsonb_array_length(lp.travel_ideas_json) = 0
          order  by r.name, d.name
          limit  1
          ",
        )
        |> pog.returning(next_empty_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "next_empty_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] ->
              wisp.json_response("{\"done\":true}", 200)
            [#(lp_id, slug, district_name, region_name, country_name, lat, lng)] -> {
              let body =
                json.object([
                  #("done", json.bool(False)),
                  #("location_page_id", json.string(lp_id)),
                  #("slug_path", json.string(slug)),
                  #("district_name", json.string(district_name)),
                  #("region_name", json.string(region_name)),
                  #("country_name", json.string(country_name)),
                  #("center_lat", json.string(lat)),
                  #("center_lng", json.string(lng)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected_rows")
          }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/district-ideas/save-places
// Body: { "location_page_id": "uuid", "ideas_json": "[...]" }
// ---------------------------------------------------------------------------

fn save_body_decoder() -> decode.Decoder(#(String, String)) {
  use lp_id <- decode.field("location_page_id", decode.string)
  use ideas <- decode.field("ideas_json", decode.string)
  decode.success(#(lp_id, ideas))
}

/// POST /api/v1/ai/district-ideas/save-places — `admin.users.read`
///
/// Google Maps sonuçlarından oluşturulan `ideas_json` dizisini
/// ilgili location_page'e kaydeder.
pub fn save_places(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case read_body_string(req) {
        Error(_) -> json_err(400, "body_read_failed")
        Ok(body_str) ->
          case json.parse(body_str, save_body_decoder()) {
            Error(_) -> json_err(400, "invalid_json_body")
            Ok(#(lp_id, ideas_json)) -> {
              let cleaned = clean_json_text(ideas_json)
              apply_ideas(ctx, "google_maps", string.trim(lp_id), cleaned)
            }
          }
      }
    }
  }
}
