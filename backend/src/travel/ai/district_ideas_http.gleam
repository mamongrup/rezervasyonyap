//// İlçe gezilecek yer içeriği — toplu AI kuyruğu, Google Maps ve işleme (264_district_travel_ideas).
////
//// POST /api/v1/ai/district-ideas/queue-all          → tüm içeriksiz ilçeler için ai_jobs oluştur
//// POST /api/v1/ai/district-ideas/process-next       → sıradaki job'u çalıştır + location_pages güncelle
//// GET  /api/v1/ai/district-ideas/stats              → kuyruk durumu
//// GET  /api/v1/ai/district-ideas/next-empty         → içeriksiz bir sonraki ilçe (Google Maps için)
//// POST /api/v1/ai/district-ideas/save-places        → Google Maps sonuçlarını kaydet
//// POST /api/v1/ai/district-ideas/save-cover         → Pexels kapak resmini kaydet
//// GET  /api/v1/ai/district-ideas/next-no-cover      → kapak resmi olmayan sonraki ilçe
//// GET  /api/v1/ai/district-ideas/cover-stats        → kapak resmi istatistikleri

import backend/context.{type Context}
import gleam/bit_array
import gleam/dict.{type Dict}
import gleam/dynamic as dyn
import gleam/dynamic/decode
import gleam/json
import gleam/http
import gleam/list
import gleam/option.{None, Some}
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
///
/// `districts_travel_ideas_empty`: `travel_ideas_json` boş dizisi olan ilçe sayısı.
/// `districts_placeholder_guess`: Maps tek satırlık yer tutucu özeti (tahmini).
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
        "select count(*)::int from location_pages where region_type = 'district' and coalesce(jsonb_array_length(travel_ideas_json), 0) > 0"
      let empty_sql =
        "select count(*)::int from location_pages where region_type = 'district' and coalesce(jsonb_array_length(travel_ideas_json), 0) = 0"
      let placeholder_sql =
        "
        select count(*)::int from location_pages lp
        where  lp.region_type = 'district'
          and  jsonb_array_length(lp.travel_ideas_json) = 1
          and  coalesce(lp.travel_ideas_json->0->>'summary','') ilike '%iline bağlı%'
          and  coalesce(lp.travel_ideas_json->0->>'summary','') ilike '%ilçesi%'
        "

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
                  case pog.query(empty_sql) |> pog.returning(int_col0) |> pog.execute(ctx.db) {
                    Error(_) -> json_err(500, "stats_empty_failed")
                    Ok(er) ->
                      case er.rows {
                        [] -> json_err(500, "stats_empty_rows")
                        [empty_n] ->
                          case
                            pog.query(placeholder_sql)
                            |> pog.returning(int_col0)
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "stats_placeholder_failed")
                            Ok(pr) -> {
                              let placeholder_guess = case pr.rows {
                                [n] -> n
                                _ -> 0
                              }
                              let body =
                                json.object([
                                  #("total_districts", json.int(total)),
                                  #("districts_with_content", json.int(has_content)),
                                  #(
                                    "districts_travel_ideas_empty",
                                    json.int(empty_n),
                                  ),
                                  #(
                                    "districts_placeholder_guess",
                                    json.int(placeholder_guess),
                                  ),
                                  #("jobs", json.object(job_counts)),
                                ])
                                |> json.to_string
                              wisp.json_response(body, 200)
                            }
                          }
                        _ -> json_err(500, "stats_empty_unexpected")
                      }
                  }
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
/// İçeriği olmayan (`travel_ideas_json` boş dizi) ilçeler için `ai_jobs` oluşturur.
///
/// **Opsiyonel query:** `?include_weak=1` — boşa ek olarak, tek öğeli Maps yer tutucu
/// özeti (`… iline bağlı … ilçesi`) yakalayabilecek ilçeleri de kuyruğa alır (DeepSeek
/// ile gerçek liste üretmek için).
///
/// Aynı ilçe yalnızca halihazırda **queued** veya **running** iş varsa atlanır; geçmişte
/// başarılı iş (`succeeded`) tek başına yeniden kuyruğu engellemez (alan sıfırlandıysa).
pub fn queue_all(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let include_weak =
        case list.key_find(wisp.get_query(req), "include_weak") {
          Error(_) -> False
          Ok(v) -> {
            let lv = string.lowercase(string.trim(v))
            lv == "1" || lv == "true" || lv == "yes"
          }
        }

      let travel_condition = case include_weak {
        False -> "coalesce(jsonb_array_length(lp.travel_ideas_json), 0) = 0"
        True ->
          "(
      coalesce(jsonb_array_length(lp.travel_ideas_json), 0) = 0
      or (
        jsonb_array_length(lp.travel_ideas_json) = 1
        and coalesce(lp.travel_ideas_json->0->>'summary','') ilike '%iline bağlı%'
        and coalesce(lp.travel_ideas_json->0->>'summary','') ilike '%ilçesi%'
      )
    )"
      }

      let find_sql =
        "
        select lp.id::text, d.name as district_name, r.name as region_name, co.name as country_name
        from   location_pages lp
        join   districts d  on d.id  = lp.district_id
        join   regions   r  on r.id  = d.region_id
        join   countries co on co.id = r.country_id
        where  lp.region_type = 'district'
          and  ("
        <> travel_condition
        <> ")
          and  lp.id::text not in (
                 select input_json->>'location_page_id'
                 from   ai_jobs
                 where  profile_code = 'district_travel_ideas'
                   and  status in ('queued','running')
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
            0 -> {
              let body =
                json.object([
                  #("queued", json.int(0)),
                  #("total_found", json.int(0)),
                  #("message", json.string("no_districts_need_content")),
                  #("include_weak", json.bool(include_weak)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
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
                  #("include_weak", json.bool(include_weak)),
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

/// İlk `[` ile son `]` arası (gevşek): önündeki/sonrasındaki metni veya hatalı kapanışları tolere etmek için.
fn slice_json_array_loose(s: String) -> Result(String, Nil) {
  let t = string.trim(s)
  case string.split_once(t, "[") {
    Error(_) -> Error(Nil)
    Ok(#(_, after_first)) -> {
      let closing_opt =
        list.index_fold(string.to_graphemes(after_first), None, fn(acc, g, idx) {
          case g == "]" {
            True -> Some(idx)
            False -> acc
          }
        })
      case closing_opt {
        None -> Error(Nil)
        Some(end_idx) ->
          Ok("[" <> string.slice(from: after_first, at_index: 0, length: end_idx + 1))
      }
    }
  }
}

fn dict_to_object_entries(d: Dict(String, dyn.Dynamic)) -> Result(List(#(String, json.Json)), Nil) {
  dict.fold(d, Ok([]), fn(acc, k, v) {
    case acc {
      Ok(entries) ->
        case dynamic_to_json(v) {
          Ok(jv) -> Ok([#(k, jv), ..entries])
          Error(_) -> Error(Nil)
        }
      Error(_) -> Error(Nil)
    }
  })
}

fn dynamic_to_json(data: dyn.Dynamic) -> Result(json.Json, Nil) {
  case dyn.classify(data) {
    "Nil" -> Ok(json.null())
    "Bool" ->
      decode.run(data, decode.bool)
      |> result.replace_error(Nil)
      |> result.map(json.bool)
    "Int" ->
      decode.run(data, decode.int)
      |> result.replace_error(Nil)
      |> result.map(json.int)
    "Float" ->
      decode.run(data, decode.float)
      |> result.replace_error(Nil)
      |> result.map(json.float)
    "String" ->
      decode.run(data, decode.string)
      |> result.replace_error(Nil)
      |> result.map(json.string)
    "BitArray" ->
      decode.run(data, decode.bit_array)
      |> result.replace_error(Nil)
      |> result.map(fn(bits) {
        case bit_array.to_string(bits) {
          Ok(s) -> json.string(s)
          Error(_) -> json.string("")
        }
      })
    "List" ->
      case decode.run(data, decode.list(decode.dynamic)) {
        Ok(items) ->
          list.try_map(items, dynamic_to_json)
          |> result.map(json.preprocessed_array)
        Error(_) -> Error(Nil)
      }
    "Dict" ->
      case decode.run(data, decode.dict(decode.string, decode.dynamic)) {
        Ok(d) ->
          case dict_to_object_entries(d) {
            Ok(entries) -> Ok(json.object(entries))
            Error(_) -> Error(Nil)
          }
        Error(_) -> Error(Nil)
      }
    _ -> Error(Nil)
  }
}

fn attempt_normalize_ideas(text: String) -> Result(String, Nil) {
  case json.parse(text, decode.list(decode.dynamic)) {
    Ok(items) ->
      case list.try_map(items, dynamic_to_json) {
        Ok(parts) -> Ok(json.to_string(json.preprocessed_array(parts)))
        Error(_) -> Error(Nil)
      }
    Error(_) ->
      case json.parse(text, decode.dict(decode.string, decode.dynamic)) {
        Ok(d) ->
          case dict.size(d) > 0 {
            False -> Error(Nil)
            True ->
              case dict_to_object_entries(d) {
                Ok(entries) ->
                  Ok(
                    json.to_string(json.preprocessed_array([json.object(entries)])),
                  )
                Error(_) -> Error(Nil)
              }
          }
        Error(_) -> Error(Nil)
      }
  }
}

fn normalize_travel_ideas_json(raw: String) -> #(String, Bool) {
  let cleaned = string.trim(clean_json_text(raw))
  case attempt_normalize_ideas(cleaned) {
    Ok(json_str) -> #(json_str, True)
    Error(_) ->
      case slice_json_array_loose(cleaned) {
        Ok(slice) ->
          case attempt_normalize_ideas(string.trim(slice)) {
            Ok(json_str) -> #(json_str, True)
            Error(_) -> #("[]", False)
          }
        Error(_) -> #("[]", False)
      }
  }
}

fn apply_ideas(
  ctx: Context,
  job_id: String,
  lp_id: String,
  ideas_json: String,
) -> Response {
  case apply_ideas_to_db(ctx, lp_id, ideas_json) {
    Error(msg) -> json_err(500, msg)
    Ok(ideas_stored) -> {
      let body =
        json.object([
          #("done", json.bool(False)),
          #("job_id", json.string(job_id)),
          #("location_page_id", json.string(lp_id)),
          #("ideas_stored", json.bool(ideas_stored)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn apply_ideas_to_db(ctx: Context, lp_id: String, ideas_json: String) -> Result(Bool, String) {
  let trimmed_lp = string.trim(lp_id)
  let #(json_to_store, ideas_stored) = normalize_travel_ideas_json(ideas_json)
  case
    pog.query(
      "update location_pages set travel_ideas_json = $2::jsonb where id = $1::uuid",
    )
    |> pog.parameter(pog.text(trimmed_lp))
    |> pog.parameter(pog.text(json_to_store))
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("location_page_update_failed")
    Ok(_) -> Ok(ideas_stored)
  }
}

/// Sunucu worker (`ai_worker_http`): sıradaki ilçe gezi fikirleri işini tek adımda çalıştırır.
pub fn worker_try_district_travel_ideas(ctx: Context) -> Result(Bool, String) {
  case
    pog.query(
      "select id::text from ai_jobs where profile_code = 'district_travel_ideas' and status = 'queued' order by created_at limit 1",
    )
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("district_queue_poll_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> Ok(False)
        [job_id] ->
          case ai_job_run.run_ai_job(ctx, job_id) {
            Error(e) -> Error("district_job_run_failed: " <> e)
            Ok(_) ->
              case
                pog.query(
                  "select id::text, input_json->>'location_page_id', coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid and status = 'succeeded'",
                )
                |> pog.parameter(pog.text(job_id))
                |> pog.returning(job_output_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> Error("district_output_fetch_failed")
                Ok(or) ->
                  case or.rows {
                    [] -> Ok(False)
                    [#(jid, lp_id, raw_text)] -> {
                      let cleaned = clean_json_text(raw_text)
                      case apply_ideas_to_db(ctx, lp_id, cleaned) {
                        Error(msg) -> Error(msg)
                        Ok(_) -> {
                          let _ = jid
                          Ok(True)
                        }
                      }
                    }
                    _ -> Error("district_output_unexpected_rows")
                  }
              }
          }
        _ -> Error("district_queue_unexpected_rows")
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
                 case
                   when lp.region_type = 'destination' then coalesce(nullif(lp.title, ''), lp.slug_path)
                   else d.name
                 end as district_name,
                 coalesce(r.name, '') as region_name,
                 coalesce(co.name, '') as country_name,
                 case
                   when lp.region_type = 'destination' then coalesce(lp.map_lat::text, d.center_lat::text, '')
                   else coalesce(d.center_lat::text, '')
                 end,
                 case
                   when lp.region_type = 'destination' then coalesce(lp.map_lng::text, d.center_lng::text, '')
                   else coalesce(d.center_lng::text, '')
                 end
          from   location_pages lp
          left join districts d  on d.id  = lp.district_id
          left join regions   r  on r.id  = d.region_id
          left join countries co on co.id = r.country_id
          where  lp.region_type in ('district', 'destination')
            and  coalesce(jsonb_array_length(lp.travel_ideas_json), 0) = 0
            and  (
                   (lp.region_type = 'district' and d.center_lat is not null and d.center_lng is not null)
                   or
                   (lp.region_type = 'destination' and coalesce(lp.map_lat, d.center_lat) is not null and coalesce(lp.map_lng, d.center_lng) is not null)
                 )
          order  by case lp.region_type when 'district' then 1 when 'destination' then 2 else 3 end,
                    r.name,
                    d.name,
                    lp.slug_path
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

fn cover_body_decoder() -> decode.Decoder(#(String, String)) {
  use lp_id <- decode.field("location_page_id", decode.string)
  use cover <- decode.field("cover_image", decode.string)
  decode.success(#(lp_id, cover))
}

fn no_cover_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use lp_id        <- decode.field(0, decode.string)
  use slug         <- decode.field(1, decode.string)
  use region_type  <- decode.field(2, decode.string)
  use location_name <- decode.field(3, decode.string)
  use parent_name  <- decode.field(4, decode.string)
  decode.success(#(lp_id, slug, region_type, location_name, parent_name))
}

/// GET /api/v1/ai/district-ideas/next-no-cover — `admin.users.read`
///
/// Kapak resmi henüz atanmamış bir sonraki lokasyonu döndürür (ülke, il, ilçe, belde).
/// Pexels döngüsü bu endpoint'i kullanır. Tümü tamamlanmışsa `{"done":true}` döner.
pub fn next_no_cover(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "select lp.id::text,
                  lp.slug_path,
                  coalesce(lp.region_type, 'district'),
                  coalesce(d.name, r2.name, co2.name, lp.slug_path),
                  coalesce(r3.name, co3.name, '')
           from   location_pages lp
           left join districts d   on d.id  = lp.district_id
           left join regions   r2  on r2.id = lp.region_id
           left join countries co2 on co2.id = lp.country_id
           left join regions   r3  on r3.id = d.region_id
           left join countries co3 on co3.id = r2.country_id
           where  (lp.cover_image is null or lp.cover_image = '')
           order  by case coalesce(lp.region_type, 'district')
                       when 'country' then 1
                       when 'province' then 2
                       when 'district' then 3
                       else 4
                     end,
                     lp.slug_path
           limit  1",
        )
        |> pog.returning(no_cover_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "next_no_cover_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] ->
              wisp.json_response("{\"done\":true}", 200)
            [#(lp_id, slug, region_type, location_name, parent_name)] -> {
              let body =
                json.object([
                  #("done", json.bool(False)),
                  #("location_page_id", json.string(lp_id)),
                  #("slug_path", json.string(slug)),
                  #("region_type", json.string(region_type)),
                  #("location_name", json.string(location_name)),
                  #("parent_name", json.string(parent_name)),
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

/// POST /api/v1/ai/district-ideas/save-cover — `admin.users.read`
///
/// Body: { "location_page_id": "...", "cover_image": "https://..." }
/// location_pages.cover_image alanını günceller.
pub fn save_cover(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case read_body_string(req) {
        Error(_) -> json_err(400, "body_read_failed")
        Ok(body_str) ->
          case json.parse(body_str, cover_body_decoder()) {
            Error(_) -> json_err(400, "invalid_json_body")
            Ok(#(lp_id, cover_url)) -> {
              let clean_lp_id = string.trim(lp_id)
              let clean_cover = string.trim(cover_url)
              case
                pog.query("update location_pages set cover_image = $2 where id = $1::uuid")
                |> pog.parameter(pog.text(clean_lp_id))
                |> pog.parameter(pog.text(clean_cover))
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "cover_update_failed")
                Ok(_) -> {
                  case clean_cover == "" || clean_cover == "not_found" {
                    True -> Nil
                    False -> {
                      let _ =
                        pog.query(
                          "
                          update blog_posts
                          set featured_image_url = $2,
                              hero_gallery_json = case
                                when hero_gallery_json = '[]'::jsonb then jsonb_build_array($2::text)
                                else hero_gallery_json
                              end,
                              updated_at = now()
                          where tags_json ? ('location:' || $1::text)
                            and coalesce(featured_image_url, '') = ''
                          ",
                        )
                        |> pog.parameter(pog.text(clean_lp_id))
                        |> pog.parameter(pog.text(clean_cover))
                        |> pog.execute(ctx.db)
                      Nil
                    }
                  }
                  wisp.json_response(
                    "{\"ok\":true}",
                    200,
                  )
                }
              }
            }
          }
      }
    }
  }
}

fn cover_stats_row() -> decode.Decoder(#(Int, Int, Int, Int)) {
  use total     <- decode.field(0, decode.int)
  use has_cover <- decode.field(1, decode.int)
  use not_found <- decode.field(2, decode.int)
  use empty     <- decode.field(3, decode.int)
  decode.success(#(total, has_cover, not_found, empty))
}

/// GET /api/v1/ai/district-ideas/cover-stats — `admin.users.read`
///
/// Tüm lokasyonlar için kapak resmi durumu istatistiklerini döndürür.
pub fn cover_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "select
             count(*)::int                                              as total,
             count(*) filter (where cover_image <> '' and cover_image <> 'not_found')::int as has_cover,
             count(*) filter (where cover_image = 'not_found')::int    as not_found,
             count(*) filter (where cover_image is null or cover_image = '')::int as empty
           from location_pages",
        )
        |> pog.returning(cover_stats_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "cover_stats_query_failed")
        Ok(ret) ->
          case ret.rows {
            [#(total, has_cover, not_found, empty)] -> {
              let body =
                json.object([
                  #("total", json.int(total)),
                  #("has_cover", json.int(has_cover)),
                  #("not_found", json.int(not_found)),
                  #("empty", json.int(empty)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected_stats_rows")
          }
      }
    }
  }
}

/// GET /api/v1/ai/district-ideas/not-found-covers — `admin.users.read`
///
/// Pexels'te resim bulunamayan lokasyonların listesini döndürür.
pub fn not_found_covers(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "select
             lp.id::text,
             lp.slug_path,
             coalesce(lp.region_type, 'district') as region_type,
             case
               when lp.region_type = 'country' then co2.name
               when lp.region_type = 'region'  then r2.name
               else coalesce(d.name, '')
             end as location_name,
             case
               when lp.region_type = 'province' then coalesce(co3.name, '')
               else coalesce(r4.name, '')
             end as parent_name
           from   location_pages lp
           left join districts d   on d.id  = lp.district_id
           left join regions   r2  on r2.id = lp.region_id
           left join countries co3 on co3.id = r2.country_id
           left join countries co2 on co2.id = lp.country_id
           left join regions   r4  on r4.id = d.region_id
           where  lp.cover_image = 'not_found'
           order  by case coalesce(lp.region_type, 'district')
                       when 'country' then 1
                       when 'province' then 2
                       when 'district' then 3
                       else 4
                     end,
                     lp.slug_path
           limit  200",
        )
        |> pog.returning({
          use id   <- decode.field(0, decode.string)
          use slug <- decode.field(1, decode.string)
          use rt   <- decode.field(2, decode.string)
          use loc  <- decode.field(3, decode.string)
          use par  <- decode.field(4, decode.string)
          decode.success(#(id, slug, rt, loc, par))
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "not_found_covers_query_failed")
        Ok(ret) -> {
          let items =
            list.map(ret.rows, fn(row) {
              let #(id, slug, rt, loc, par) = row
              json.object([
                #("id", json.string(id)),
                #("slug_path", json.string(slug)),
                #("region_type", json.string(rt)),
                #("location_name", json.string(loc)),
                #("parent_name", json.string(par)),
              ])
            })
          wisp.json_response(json.to_string(json.array(items, fn(x) { x })), 200)
        }
      }
    }
  }
}

/// POST /api/v1/ai/district-ideas/reset-not-found — `admin.users.read`
///
/// `not_found` durumundaki tüm kapak resimlerini sıfırlar ('' yapar)
/// böylece Pexels işlemi yeniden denenebilir.
pub fn reset_not_found(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "update location_pages set cover_image = ''
           where  cover_image = 'not_found'
           returning id",
        )
        |> pog.returning({
          use id <- decode.field(0, decode.int)
          decode.success(id)
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "reset_not_found_failed")
        Ok(ret) ->
          wisp.json_response(
            json.to_string(json.object([
              #("reset_count", json.int(list.length(ret.rows))),
            ])),
            200,
          )
      }
    }
  }
}
