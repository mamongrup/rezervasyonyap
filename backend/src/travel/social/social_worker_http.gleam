//// Sosyal paylaşım worker — cron / Next `worker-process` (sunucu tarafı secret).

import backend/context.{type Context}
import envoy
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
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec
import wisp.{type Request, type Response}

const worker_secret_header = "x-travel-social-worker-secret"
const social_api_key = "social_api"
const caption_profile = "social_caption"

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

fn trim_env_secret() -> Result(String, Nil) {
  case envoy.get("TRAVEL_SOCIAL_WORKER_SECRET") {
    Error(_) -> Error(Nil)
    Ok(s) ->
      case string.trim(s) {
        "" -> Error(Nil)
        t -> Ok(t)
      }
  }
}

fn auth_worker(req: Request) -> Result(Nil, Response) {
  case trim_env_secret() {
    Error(_) ->
      Error(json_err(503, "worker_secret_not_configured"))
    Ok(expected) ->
      case request.get_header(req, worker_secret_header) {
        Error(_) -> Error(json_err(401, "unauthorized"))
        Ok(provided) ->
          case string.trim(provided) == expected {
            False -> Error(json_err(401, "unauthorized"))
            True -> Ok(Nil)
          }
      }
  }
}

fn fetch_social_api_json(db: pog.Connection) -> String {
  case
    pog.query(
      "select coalesce(value_json::text, '{}') from site_settings where organization_id is null and key = $1 limit 1",
    )
    |> pog.parameter(pog.text(social_api_key))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(db)
  {
    Error(_) -> "{}"
    Ok(ret) ->
      case ret.rows {
        [raw] -> raw
        _ -> "{}"
      }
  }
}

fn pending_job_row() ->
  decode.Decoder(#(String, String, String, String, String, Bool, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use net <- decode.field(1, decode.string)
  use eid <- decode.field(2, decode.string)
  use imgs <- decode.field(3, decode.string)
  use cap <- decode.field(4, decode.string)
  use allow_ai <- decode.field(5, decode.bool)
  use title <- decode.field(6, decode.string)
  use slug <- decode.field(7, decode.string)
  use cat <- decode.field(8, decode.string)
  decode.success(#(id, net, eid, imgs, cap, allow_ai, title, slug, cat))
}

fn pending_job_json(
  row: #(String, String, String, String, String, Bool, String, String, String),
) -> json.Json {
  let #(id, net, eid, imgs, cap, allow_ai, title, slug, cat) = row
  let img_list =
    string.split(imgs, "\u{001F}")
    |> list.map(string.trim)
    |> list.filter(fn(s) { s != "" })
  let cap_field = case cap == "" {
    True -> json.null()
    False -> json.string(cap)
  }
  json.object([
    #("id", json.string(id)),
    #("network", json.string(net)),
    #("entity_id", json.string(eid)),
    #("entity_type", json.string("listing")),
    #("image_keys", json.array(from: img_list, of: json.string)),
    #("caption_ai_generated", cap_field),
    #("allow_ai_caption", json.bool(allow_ai)),
    #("listing_title", json.string(title)),
    #("listing_slug", json.string(slug)),
    #("category_code", json.string(cat)),
  ])
}

fn ai_job_outcome_row() -> decode.Decoder(#(String, String, String)) {
  use status <- decode.field(0, decode.string)
  use err <- decode.field(1, decode.string)
  use text <- decode.field(2, decode.string)
  decode.success(#(status, err, text))
}

fn run_caption_profile(ctx: Context, input_json: String) -> Result(String, String) {
  case
    pog.query(
      "insert into ai_jobs (profile_code, input_json, status) values ($1, $2::jsonb, 'queued') returning id::text",
    )
    |> pog.parameter(pog.text(caption_profile))
    |> pog.parameter(pog.text(input_json))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> Error("social_caption_job_insert_failed")
    Ok(ret) ->
      case ret.rows {
        [job_id] -> {
          let _ = ai_job_run.run_ai_job(ctx, job_id)
          case
            pog.query(
              "select status, coalesce(error,''), coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid limit 1",
            )
            |> pog.parameter(pog.text(job_id))
            |> pog.returning(ai_job_outcome_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> Error("social_caption_output_failed")
            Ok(out_ret) ->
              case out_ret.rows {
                [#(status, err, text)] ->
                  case status {
                    "succeeded" ->
                      case string.trim(text) == "" {
                        True -> Error("social_caption_empty")
                        False -> Ok(string.trim(text))
                      }
                    "failed" -> {
                      let e = string.trim(err)
                      case e == "" {
                        True -> Error("social_caption_failed")
                        False -> Error(string.slice(e, 0, 800))
                      }
                    }
                    _ -> Error("social_caption_failed")
                  }
                _ -> Error("social_caption_failed")
              }
          }
        }
        _ -> Error("social_caption_unexpected_rows")
      }
  }
}

/// GET /api/v1/social/worker/pending?limit=10 — bekleyen işler + ilan özeti.
pub fn get_worker_pending(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case auth_worker(req) {
    Error(r) -> r
    Ok(Nil) -> {
      let limit = case list.key_find(wisp.get_query(req), "limit") {
        Error(_) -> 10
        Ok(v) ->
          case int.parse(string.trim(v)) {
            Ok(n) ->
              case n > 20 {
                True -> 20
                False -> case n < 1 {
                  True -> 10
                  False -> n
                }
              }
            Error(_) -> 10
          }
      }
      case
        pog.query(
          "select j.id::text, j.network, j.entity_id::text, "
          <> "coalesce(array_to_string(j.image_keys, chr(31)), ''), "
          <> "coalesce(j.caption_ai_generated, ''), "
          <> "coalesce(l.allow_ai_caption, false), "
          <> "coalesce((select lt.title from listing_translations lt "
          <> "inner join locales loc on loc.id = lt.locale_id "
          <> "where lt.listing_id = l.id and lower(loc.code) = 'tr' limit 1), ''), "
          <> "l.slug::text, coalesce(pc.code::text, '') "
          <> "from social_share_jobs j "
          <> "inner join listings l on l.id = j.entity_id and j.entity_type = 'listing' "
          <> "inner join product_categories pc on pc.id = l.category_id "
          <> "where j.status = 'pending' and l.status = 'published' "
          <> "order by j.created_at asc limit "
          <> int.to_string(limit),
        )
        |> pog.returning(pending_job_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "pending_jobs_query_failed")
        Ok(ret) -> {
          let jobs = list.map(ret.rows, pending_job_json)
          let api_raw = fetch_social_api_json(ctx.db)
          let body =
            json.object([
              #("jobs", json.array(from: jobs, of: fn(x) { x })),
              #("social_api_json", json.string(api_raw)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn patch_job_decoder() -> decode.Decoder(#(String, Option(String), Option(String), Option(String))) {
  decode.field("status", decode.string, fn(status) {
    decode.optional_field("external_post_id", None, decode.optional(decode.string), fn(
      post_id,
    ) {
      decode.optional_field("error_message", None, decode.optional(decode.string), fn(err) {
        decode.optional_field(
          "caption_ai_generated",
          None,
          decode.optional(decode.string),
          fn(cap) {
            decode.success(#(status, post_id, err, cap))
          },
        )
      })
    })
  })
}

/// PATCH /api/v1/social/worker/jobs/:job_id — posted / failed güncelle.
pub fn patch_worker_job(req: Request, ctx: Context, job_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case string.trim(job_id) == "" {
    True -> json_err(400, "invalid_id")
    False ->
      case auth_worker(req) {
        Error(r) -> r
        Ok(Nil) ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, patch_job_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(status_raw, post_id_opt, err_opt, cap_opt)) -> {
                  let status = string.lowercase(string.trim(status_raw))
                  case status == "posted" || status == "failed" {
                    False -> json_err(400, "invalid_status")
                    True -> {
                      let p_post = case post_id_opt {
                        None -> pog.null()
                        Some(s) ->
                          case string.trim(s) == "" {
                            True -> pog.null()
                            False -> pog.text(string.trim(s))
                          }
                      }
                      let p_err = case err_opt {
                        None -> pog.null()
                        Some(s) ->
                          case string.trim(s) == "" {
                            True -> pog.null()
                            False -> pog.text(string.slice(string.trim(s), 0, 2000))
                          }
                      }
                      let p_cap = case cap_opt {
                        None -> pog.null()
                        Some(s) ->
                          case string.trim(s) == "" {
                            True -> pog.null()
                            False -> pog.text(string.trim(s))
                          }
                      }
                      let posted_at_sql = case status == "posted" {
                        True -> "now()"
                        False -> "null"
                      }
                      case
                        pog.query(
                          "update social_share_jobs set "
                          <> "status = $2, external_post_id = coalesce($3::text, external_post_id), "
                          <> "error_message = coalesce($4::text, error_message), "
                          <> "caption_ai_generated = coalesce($5::text, caption_ai_generated), "
                          <> "posted_at = "
                          <> posted_at_sql
                          <> " where id = $1::uuid and status = 'pending' returning id::text",
                        )
                        |> pog.parameter(pog.text(string.trim(job_id)))
                        |> pog.parameter(pog.text(status))
                        |> pog.parameter(p_post)
                        |> pog.parameter(p_err)
                        |> pog.parameter(p_cap)
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "job_update_failed")
                        Ok(ret) ->
                          case ret.rows {
                            [] -> json_err(404, "job_not_found_or_not_pending")
                            [id] -> {
                              let out =
                                json.object([
                                  #("id", json.string(id)),
                                  #("status", json.string(status)),
                                  #("ok", json.bool(True)),
                                ])
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
      }
  }
}

fn caption_body_decoder() -> decode.Decoder(#(String, String, String, Bool, List(String))) {
  decode.field("listing_title", decode.string, fn(title) {
    decode.field("listing_url", decode.string, fn(url) {
      decode.field("network", decode.string, fn(network) {
        decode.optional_field("allow_ai_caption", False, decode.bool, fn(allow_ai) {
          decode.optional_field("image_keys", [], decode.list(decode.string), fn(keys) {
            decode.success(#(title, url, network, allow_ai, keys))
          })
        })
      })
    })
  })
}

fn default_caption(title: String, url: String) -> String {
  let t = string.trim(title)
  case t == "" {
    True -> "🔗 " <> string.trim(url)
    False -> t <> "\n\n🔗 " <> string.trim(url)
  }
}

/// POST /api/v1/social/worker/caption — AI veya şablon metin (worker secret).
pub fn post_worker_caption(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case auth_worker(req) {
    Error(r) -> r
    Ok(Nil) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, caption_body_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(title, url, network, allow_ai, image_keys)) -> {
              let page_url = string.trim(url)
              case page_url == "" {
                True -> json_err(400, "listing_url_required")
                False ->
                  case allow_ai {
                    False -> {
                      let cap = default_caption(title, page_url)
                      let out =
                        json.object([
                          #("caption", json.string(cap)),
                          #("ai_generated", json.bool(False)),
                        ])
                        |> json.to_string
                      wisp.json_response(out, 200)
                    }
                    True -> {
                      let input =
                        json.object([
                          #("task", json.string("social_caption")),
                          #("locale", json.string("tr")),
                          #("network", json.string(string.lowercase(string.trim(network)))),
                          #("listing_title", json.string(string.trim(title))),
                          #("listing_url", json.string(page_url)),
                          #(
                            "image_keys",
                            json.array(from: image_keys, of: json.string),
                          ),
                          #(
                            "instruction",
                            json.string(
                              "Türkçe, kısa ve çekici bir sosyal medya paylaşım metni yaz. Emoji kullanabilirsin. Hashtag ekle (en fazla 5). URL metnin sonunda ayrı satırda olsun.",
                            ),
                          ),
                        ])
                        |> json.to_string
                      case run_caption_profile(ctx, input) {
                        Error(_) -> {
                          let cap = default_caption(title, page_url)
                          let out =
                            json.object([
                              #("caption", json.string(cap)),
                              #("ai_generated", json.bool(False)),
                              #("fallback", json.bool(True)),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                        Ok(cap) -> {
                          let out =
                            json.object([
                              #("caption", json.string(cap)),
                              #("ai_generated", json.bool(True)),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
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