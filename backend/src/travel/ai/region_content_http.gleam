//// Bölge içerik otomasyonu — location_pages için turizm tanıtımı + blog yazısı üretimi.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

const content_profile = "region_tourism_content"
const blog_profile = "region_blog_writer"
const category_slug = "gezi-fikirleri"

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

fn posts_decoder() -> decode.Decoder(Int) {
  decode.optional_field("posts_per_region", 1, decode.int, fn(n) {
    decode.success(n)
  })
}

fn clamp_posts(n: Int) -> Int {
  case n < 1 {
    True -> 1
    False ->
      case n > 3 {
        True -> 3
        False -> n
      }
  }
}

fn batch_count_row() -> decode.Decoder(#(String, Int)) {
  use status <- decode.field(0, decode.string)
  use cnt <- decode.field(1, decode.int)
  decode.success(#(status, cnt))
}

pub fn stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let int_col0 = {
        use n <- decode.field(0, decode.int)
        decode.success(n)
      }
      let total_sql =
        "select count(*)::int from location_pages where region_type in ('country','province','district','destination')"
      let desc_sql =
        "select count(*)::int from location_pages where region_type in ('country','province','district','destination') and length(coalesce(description,'')) > 120"
      let blog_sql =
        "select count(*)::int from blog_posts where tags_json ? 'ai-region-content'"
      let batches_sql =
        "select status, count(*)::int from ai_geo_blog_batches group by status"

      case pog.query(total_sql) |> pog.returning(int_col0) |> pog.execute(ctx.db) {
        Error(_) -> json_err(500, "region_content_total_failed")
        Ok(total_ret) -> {
          let total = case total_ret.rows { [n] -> n _ -> 0 }
          case pog.query(desc_sql) |> pog.returning(int_col0) |> pog.execute(ctx.db) {
            Error(_) -> json_err(500, "region_content_description_failed")
            Ok(desc_ret) -> {
              let with_description = case desc_ret.rows { [n] -> n _ -> 0 }
              case pog.query(blog_sql) |> pog.returning(int_col0) |> pog.execute(ctx.db) {
                Error(_) -> json_err(500, "region_content_blog_failed")
                Ok(blog_ret) -> {
                  let blog_posts = case blog_ret.rows { [n] -> n _ -> 0 }
                  case
                    pog.query(batches_sql)
                    |> pog.returning(batch_count_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "region_content_batches_failed")
                    Ok(batch_ret) -> {
                      let counts =
                        list.map(batch_ret.rows, fn(row) {
                          let #(status, cnt) = row
                          #(status, json.int(cnt))
                        })
                      let body =
                        json.object([
                          #("total_regions", json.int(total)),
                          #("regions_with_description", json.int(with_description)),
                          #("generated_blog_posts", json.int(blog_posts)),
                          #("batches", json.object(counts)),
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
  }
}

pub fn queue_all(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let posts_per_region = case read_body_string(req) {
        Error(_) -> 1
        Ok(body) ->
          case string.trim(body) == "" {
            True -> 1
            False ->
              case json.parse(body, posts_decoder()) {
                Ok(n) -> clamp_posts(n)
                Error(_) -> 1
              }
          }
      }
      let sql =
        "
        insert into ai_geo_blog_batches (location_page_id, category_slug, posts_to_create, status)
        select lp.id, $1, $2::int, 'pending'
        from location_pages lp
        where lp.region_type in ('country','province','district','destination')
          and (
            length(coalesce(lp.description,'')) <= 120
            or not exists (
              select 1
              from blog_posts bp
              where bp.tags_json ? 'ai-region-content'
                and bp.tags_json ? ('location:' || lp.id::text)
            )
          )
          and not exists (
            select 1
            from ai_geo_blog_batches b
            where b.location_page_id = lp.id
              and b.category_slug = $1
              and b.status in ('pending','running','done')
          )
        order by
          case lp.region_type when 'country' then 0 when 'province' then 1 when 'destination' then 2 else 3 end,
          lp.slug_path
        limit 2000
        returning id::text
        "
      case
        pog.query(sql)
        |> pog.parameter(pog.text(category_slug))
        |> pog.parameter(pog.int(posts_per_region))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "region_content_queue_failed")
        Ok(ret) -> {
          let body =
            json.object([
              #("queued", json.int(list.length(ret.rows))),
              #("posts_per_region", json.int(posts_per_region)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn batch_row() -> decode.Decoder(#(String, String, String, Int)) {
  use id <- decode.field(0, decode.string)
  use lp <- decode.field(1, decode.string)
  use cat <- decode.field(2, decode.string)
  use posts <- decode.field(3, decode.int)
  decode.success(#(id, lp, cat, posts))
}

fn location_row() -> decode.Decoder(#(String, String, String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use typ <- decode.field(2, decode.string)
  use name <- decode.field(3, decode.string)
  use region <- decode.field(4, decode.string)
  use country <- decode.field(5, decode.string)
  use description <- decode.field(6, decode.string)
  use ideas <- decode.field(7, decode.string)
  decode.success(#(id, slug, typ, name, region, country, description, ideas))
}

pub fn process_next(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let pick_sql =
        "
        update ai_geo_blog_batches
        set status = 'running'
        where id = (
          select id from ai_geo_blog_batches
          where status = 'pending'
          order by id
          limit 1
        )
        returning id::text, location_page_id::text, category_slug, posts_to_create
        "
      case pog.query(pick_sql) |> pog.returning(batch_row()) |> pog.execute(ctx.db) {
        Error(_) -> json_err(500, "region_content_pick_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> wisp.json_response("{\"done\":true,\"message\":\"queue_empty\"}", 200)
            [batch] -> run_batch(ctx, batch)
            _ -> json_err(500, "region_content_unexpected_batch_rows")
          }
      }
    }
  }
}

fn fail_batch(ctx: Context, batch_id: String, msg: String) -> Response {
  let _ =
    pog.query("update ai_geo_blog_batches set status = 'failed' where id = $1::uuid")
    |> pog.parameter(pog.text(batch_id))
    |> pog.execute(ctx.db)
  json_err(500, msg)
}

fn run_batch(ctx: Context, batch: #(String, String, String, Int)) -> Response {
  let #(batch_id, lp_id, cat_slug, posts_to_create) = batch
  case load_location(ctx, lp_id) {
    Error(_) -> fail_batch(ctx, batch_id, "region_content_location_not_found")
    Ok(loc) -> {
      let #(id, slug_path, region_type, name, region_name, country_name, old_description, ideas_json) = loc
      case ensure_region_description(ctx, loc) {
        Error(e) -> fail_batch(ctx, batch_id, e)
        Ok(description_text) ->
          case ensure_blog_category(ctx, cat_slug) {
            Error(_) -> fail_batch(ctx, batch_id, "region_content_category_failed")
            Ok(category_id) ->
              case generate_blog_posts(ctx, loc, category_id, posts_to_create, 1) {
                Error(e) -> fail_batch(ctx, batch_id, e)
                Ok(created_count) -> {
                  let _ =
                    pog.query("update ai_geo_blog_batches set status = 'done' where id = $1::uuid")
                    |> pog.parameter(pog.text(batch_id))
                    |> pog.execute(ctx.db)
                  let body =
                    json.object([
                      #("done", json.bool(False)),
                      #("batch_id", json.string(batch_id)),
                      #("location_page_id", json.string(id)),
                      #("slug_path", json.string(slug_path)),
                      #("region_type", json.string(region_type)),
                      #("name", json.string(name)),
                      #("region_name", json.string(region_name)),
                      #("country_name", json.string(country_name)),
                      #("had_description", json.bool(string.length(string.trim(old_description)) > 120)),
                      #("description_written", json.bool(string.length(string.trim(description_text)) > 0)),
                      #("ideas_context_chars", json.int(string.length(ideas_json))),
                      #("blog_posts_created", json.int(created_count)),
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

fn load_location(ctx: Context, lp_id: String) -> Result(#(String, String, String, String, String, String, String, String), Nil) {
  let sql =
    "
    select
      lp.id::text,
      lp.slug_path,
      lp.region_type,
      coalesce(nullif(lp.title,''), d.name, r.name, c.name, lp.slug_path) as location_name,
      coalesce(r.name, '') as region_name,
      coalesce(c.name, '') as country_name,
      coalesce(lp.description, '') as description,
      coalesce(lp.travel_ideas_json::text, '[]') as ideas_json
    from location_pages lp
    left join districts d on d.id = lp.district_id
    left join regions r on r.id = coalesce(lp.region_id, d.region_id)
    left join countries c on c.id = coalesce(lp.country_id, r.country_id)
    where lp.id = $1::uuid
    limit 1
    "
  case
    pog.query(sql)
    |> pog.parameter(pog.text(lp_id))
    |> pog.returning(location_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error(Nil)
      }
  }
}

fn create_and_run_job(ctx: Context, profile_code: String, input_json: String) -> Result(String, String) {
  case
    pog.query("insert into ai_jobs (profile_code, input_json, status) values ($1, $2::jsonb, 'queued') returning id::text")
    |> pog.parameter(pog.text(profile_code))
    |> pog.parameter(pog.text(input_json))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("region_content_job_insert_failed")
    Ok(ret) ->
      case ret.rows {
        [job_id] -> {
          let _ = ai_job_run.run_ai_job(ctx, job_id)
          case
            pog.query("select coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid and status = 'succeeded' limit 1")
            |> pog.parameter(pog.text(job_id))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> Error("region_content_job_output_failed")
            Ok(out_ret) ->
              case out_ret.rows {
                [text] ->
                  case string.trim(text) == "" {
                    True -> Error("region_content_empty_ai_output")
                    False -> Ok(string.trim(text))
                  }
                _ -> Error("region_content_ai_failed")
              }
          }
        }
        _ -> Error("region_content_unexpected_job_rows")
      }
  }
}

fn ensure_region_description(ctx: Context, loc: #(String, String, String, String, String, String, String, String)) -> Result(String, String) {
  let #(lp_id, slug_path, region_type, name, region_name, country_name, old_description, ideas_json) = loc
  case string.length(string.trim(old_description)) > 120 {
    True -> Ok("")
    False -> {
      let input =
        json.object([
          #("task", json.string("region_tourism_description")),
          #("locale", json.string("tr")),
          #("location_page_id", json.string(lp_id)),
          #("slug_path", json.string(slug_path)),
          #("region_type", json.string(region_type)),
          #("location_name", json.string(name)),
          #("province_name", json.string(region_name)),
          #("country_name", json.string(country_name)),
          #("travel_ideas_json", json.string(string.slice(ideas_json, 0, 3500))),
          #("instruction", json.string("Bu lokasyon için turizm açısından tanıtıcı, SEO uyumlu, özgün Türkçe HTML metin yaz. 4-6 paragraf olsun. Sadece <p>, <strong>, <ul>, <li> etiketleri kullan; markdown yazma.")),
        ])
        |> json.to_string
      case create_and_run_job(ctx, content_profile, input) {
        Error(e) -> Error(e)
        Ok(description_html) -> apply_region_description(ctx, loc, description_html)
      }
    }
  }
}

fn apply_region_description(ctx: Context, loc: #(String, String, String, String, String, String, String, String), description_html: String) -> Result(String, String) {
  let #(lp_id, _slug_path, _region_type, name, region_name, country_name, _old_description, _ideas_json) = loc
  let meta_title = case region_name == "" {
    True -> name <> " Gezi Rehberi"
    False -> name <> " Gezi Rehberi | " <> region_name
  }
  let meta_description =
    name
    <> " için gezilecek yerler, konaklama, ulaşım ve tatil planı önerileri. "
    <> country_name
    <> " seyahatinizi planlayın."
  case
    pog.query(
      "
      update location_pages
      set
        title = coalesce(nullif(title,''), $2),
        description = $3,
        meta_title = coalesce(nullif(meta_title,''), $4),
        meta_description = coalesce(nullif(meta_description,''), $5),
        translations_json = jsonb_set(
          jsonb_set(coalesce(translations_json, '{}'::jsonb), '{tr,name}', to_jsonb($2::text), true),
          '{tr,description}', to_jsonb($3::text), true
        ),
        is_published = true,
        updated_at = now()
      where id = $1::uuid
      ",
    )
    |> pog.parameter(pog.text(lp_id))
    |> pog.parameter(pog.text(name))
    |> pog.parameter(pog.text(description_html))
    |> pog.parameter(pog.text(meta_title))
    |> pog.parameter(pog.text(string.slice(meta_description, 0, 155)))
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("region_content_description_update_failed")
    Ok(_) -> Ok(description_html)
  }
}

fn ensure_blog_category(ctx: Context, slug: String) -> Result(String, Nil) {
  case
    pog.query(
      "
      insert into blog_categories (slug, name, description, meta_title, sort_order, is_active)
      values ($1, 'Gezi Fikirleri', 'Bölge rehberleri, gezi önerileri ve seyahat ipuçları.', 'Gezi Fikirleri', 10, true)
      on conflict (slug) do update set
        name = coalesce(blog_categories.name, excluded.name),
        description = coalesce(blog_categories.description, excluded.description),
        is_active = true
      returning id::text
      ",
    )
    |> pog.parameter(pog.text(slug))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error(Nil)
      }
  }
}

fn generate_blog_posts(ctx: Context, loc: #(String, String, String, String, String, String, String, String), category_id: String, total: Int, index: Int) -> Result(Int, String) {
  case index > total {
    True -> Ok(0)
    False ->
      case generate_one_blog_post(ctx, loc, category_id, index) {
        Error(e) -> Error(e)
        Ok(created) ->
          case generate_blog_posts(ctx, loc, category_id, total, index + 1) {
            Error(e) -> Error(e)
            Ok(rest) -> Ok(created + rest)
          }
      }
  }
}

fn blog_title(name: String, index: Int) -> String {
  case index {
    1 -> name <> " Gezi Rehberi"
    2 -> name <> " Gezilecek Yerler"
    _ -> name <> " Tatil ve Konaklama İpuçları"
  }
}

fn blog_slug(slug_path: String, index: Int) -> String {
  let base =
    slug_path
    |> string.lowercase
    |> string.replace("/", "-")
    |> string.replace("_", "-")
  case index {
    1 -> base <> "-gezi-rehberi"
    2 -> base <> "-gezilecek-yerler"
    _ -> base <> "-tatil-ipuclari"
  }
}

fn generate_one_blog_post(ctx: Context, loc: #(String, String, String, String, String, String, String, String), category_id: String, index: Int) -> Result(Int, String) {
  let #(lp_id, slug_path, region_type, name, region_name, country_name, description, ideas_json) = loc
  let title = blog_title(name, index)
  let slug = blog_slug(slug_path, index)
  let excerpt =
    name <> " seyahati için gezilecek yerler, rota önerileri, konaklama ve pratik tatil ipuçları."
  let input =
    json.object([
      #("task", json.string("region_blog_post")),
      #("locale", json.string("tr")),
      #("location_page_id", json.string(lp_id)),
      #("slug_path", json.string(slug_path)),
      #("region_type", json.string(region_type)),
      #("title", json.string(title)),
      #("location_name", json.string(name)),
      #("province_name", json.string(region_name)),
      #("country_name", json.string(country_name)),
      #("region_description_html", json.string(string.slice(description, 0, 2500))),
      #("travel_ideas_json", json.string(string.slice(ideas_json, 0, 3500))),
      #("instruction", json.string("Bu başlık için 900-1300 kelime arası turizm blog yazısı üret. Türkçe, özgün, satışa yardımcı ama abartısız olsun. HTML döndür: h2, h3, p, ul, li, strong kullan; markdown ve JSON yazma.")),
    ])
    |> json.to_string
  case create_and_run_job(ctx, blog_profile, input) {
    Error(e) -> Error(e)
    Ok(body_html) -> upsert_blog_post(ctx, category_id, lp_id, slug, title, excerpt, body_html)
  }
}

fn upsert_blog_post(ctx: Context, category_id: String, lp_id: String, slug: String, title: String, excerpt: String, body_html: String) -> Result(Int, String) {
  let tags =
    json.array(
      from: ["ai-region-content", "location:" <> lp_id, "gezi-fikirleri"],
      of: json.string,
    )
    |> json.to_string
  case
    pog.query(
      "
      insert into blog_posts (
        category_id, slug, published_at, tags_json, read_time_minutes, meta_title, meta_description
      )
      values ($1::uuid, $2, now(), $3::jsonb, 7, $4, $5)
      on conflict (slug) do update set
        category_id = excluded.category_id,
        published_at = coalesce(blog_posts.published_at, now()),
        tags_json = excluded.tags_json,
        meta_title = excluded.meta_title,
        meta_description = excluded.meta_description,
        updated_at = now()
      returning id::text
      ",
    )
    |> pog.parameter(pog.text(category_id))
    |> pog.parameter(pog.text(slug))
    |> pog.parameter(pog.text(tags))
    |> pog.parameter(pog.text(title))
    |> pog.parameter(pog.text(string.slice(excerpt, 0, 155)))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("region_content_blog_upsert_failed")
    Ok(ret) ->
      case ret.rows {
        [post_id] ->
          case
            pog.query(
              "
              insert into blog_post_translations (post_id, locale_id, title, body, excerpt)
              select $1::uuid, l.id, $2, $3, $4
              from locales l
              where lower(l.code) = 'tr'
              on conflict (post_id, locale_id) do update set
                title = excluded.title,
                body = excluded.body,
                excerpt = excluded.excerpt
              returning post_id::text
              ",
            )
            |> pog.parameter(pog.text(post_id))
            |> pog.parameter(pog.text(title))
            |> pog.parameter(pog.text(body_html))
            |> pog.parameter(pog.text(excerpt))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> Error("region_content_blog_translation_failed")
            Ok(_) -> Ok(1)
          }
        _ -> Error("region_content_blog_unexpected_rows")
      }
  }
}
