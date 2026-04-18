//// Medya dosyaları + CDN (090_media_cdn).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/option.{type Option, None, Some}
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

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn cdn_row() -> decode.Decoder(#(String, String, Bool)) {
  use code <- decode.field(0, decode.string)
  use url <- decode.field(1, decode.string)
  use active <- decode.field(2, decode.bool)
  decode.success(#(code, url, active))
}

/// GET /api/v1/media/cdn — aktif CDN ve çekme adresi.
pub fn get_cdn(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select provider_code::text, coalesce(pull_zone_url, ''), is_active from cdn_connections where is_active = true limit 1",
    )
    |> pog.returning(cdn_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "cdn_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> {
          let body =
            json.object([#("active", json.null())])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        [#(code, url, active)] -> {
          let url_field = case url == "" {
            True -> json.null()
            False -> json.string(url)
          }
          let body =
            json.object([
              #("active", json.string(code)),
              #("pull_zone_url", url_field),
              #("is_active", json.bool(active)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn set_cdn_decoder() -> decode.Decoder(String) {
  decode.field("code", decode.string, fn(code) { decode.success(code) })
}

/// POST /api/v1/media/cdn/active — `{ "code": "bunny" | "cloudflare" }`
pub fn set_cdn_active(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, set_cdn_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(code_raw) -> {
          let code = string.lowercase(string.trim(code_raw))
          case code == "bunny" || code == "cloudflare" {
            False -> json_err(400, "invalid_code")
            True ->
              case
                pog.transaction(ctx.db, fn(conn) {
                  case
                    pog.query(
                      "update cdn_connections set is_active = false",
                    )
                    |> pog.execute(conn)
                  {
                    Error(_) -> Error("clear_failed")
                    Ok(_) ->
                      case
                        pog.query(
                          "update cdn_connections set is_active = true where provider_code = $1 returning provider_code::text",
                        )
                        |> pog.parameter(pog.text(code))
                        |> pog.returning(row_dec.col0_string())
                        |> pog.execute(conn)
                      {
                        Error(_) -> Error("update_failed")
                        Ok(r) ->
                          case r.rows {
                            [_] -> Ok(Nil)
                            [] -> Error("unknown_provider")
                            _ -> Error("unexpected_rows")
                          }
                      }
                  }
                })
              {
                Ok(_) -> {
                  let out =
                    json.object([
                      #("ok", json.bool(True)),
                      #("active", json.string(code)),
                    ])
                    |> json.to_string
                  wisp.json_response(out, 200)
                }
                Error(pog.TransactionQueryError(_)) ->
                  json_err(500, "transaction_failed")
                Error(pog.TransactionRolledBack(msg)) ->
                  json_err(400, msg)
              }
          }
        }
      }
  }
}

fn register_file_decoder() -> decode.Decoder(
  #(String, String, String, String, Option(Int), Option(Int), Option(Int)),
) {
  decode.field("owner_type", decode.string, fn(owner_type) {
    decode.field("owner_id", decode.string, fn(owner_id) {
      decode.field("original_storage_key", decode.string, fn(sk) {
        decode.field("original_mime", decode.string, fn(mime) {
          decode.optional_field("width", 0, decode.int, fn(w) {
            decode.optional_field("height", 0, decode.int, fn(h) {
              decode.optional_field("byte_size", 0, decode.int, fn(bs) {
                let wopt = case w {
                  0 -> None
                  x -> Some(x)
                }
                let hopt = case h {
                  0 -> None
                  x -> Some(x)
                }
                let bsopt = case bs {
                  0 -> None
                  x -> Some(x)
                }
                decode.success(#(owner_type, owner_id, sk, mime, wopt, hopt, bsopt))
              })
            })
          })
        })
      })
    })
  })
}

/// POST /api/v1/media/files — yükleme sonrası kayıt (AVIF worker güncelleyecek).
pub fn register_file(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, register_file_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(ot, oid, sk, mime, wopt, hopt, bsopt)) -> {
          case string.trim(ot) == "" || string.trim(oid) == "" || string.trim(sk) == "" {
            True -> json_err(400, "owner_and_key_required")
            False -> {
              let wpar = case wopt {
                Some(w) -> pog.int(w)
                None -> pog.null()
              }
              let hpar = case hopt {
                Some(h) -> pog.int(h)
                None -> pog.null()
              }
              let bspar = case bsopt {
                Some(b) -> pog.int(b)
                None -> pog.null()
              }
              case
                pog.query(
                  "insert into media_files (owner_type, owner_id, original_storage_key, original_mime, width, height, byte_size) values ($1, $2::uuid, $3, $4, $5, $6, $7) returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(ot)))
                |> pog.parameter(pog.text(string.trim(oid)))
                |> pog.parameter(pog.text(string.trim(sk)))
                |> pog.parameter(pog.text(string.trim(mime)))
                |> pog.parameter(wpar)
                |> pog.parameter(hpar)
                |> pog.parameter(bspar)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "insert_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> {
                      let out =
                        json.object([#("id", json.string(id)), #("status", json.string("registered"))])
                        |> json.to_string
                      wisp.json_response(out, 201)
                    }
                    _ -> json_err(500, "unexpected_return")
                  }
              }
            }
          }
        }
      }
  }
}

fn patch_file_decoder() -> decode.Decoder(#(Option(String), Option(Int), Option(Int))) {
  decode.optional_field("avif_storage_key", "", decode.string, fn(avif) {
    decode.optional_field("width", 0, decode.int, fn(w) {
      decode.optional_field("height", 0, decode.int, fn(h) {
        let avif_opt = case string.trim(avif) == "" {
          True -> None
          False -> Some(string.trim(avif))
        }
        let w_opt = case w {
          0 -> None
          x -> Some(x)
        }
        let h_opt = case h {
          0 -> None
          x -> Some(x)
        }
        decode.success(#(avif_opt, w_opt, h_opt))
      })
    })
  })
}

/// PATCH /api/v1/media/files/:id — AVIF anahtarı / boyut (işçi veya admin).
pub fn patch_file(req: Request, ctx: Context, file_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_file_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(avif_opt, w_opt, h_opt)) -> {
          case avif_opt, w_opt, h_opt {
            None, None, None -> json_err(400, "nothing_to_update")
            _, _, _ -> {
              let avif_p = case avif_opt {
                Some(s) -> pog.text(s)
                None -> pog.null()
              }
              let w_p = case w_opt {
                Some(w) -> pog.int(w)
                None -> pog.null()
              }
              let h_p = case h_opt {
                Some(h) -> pog.int(h)
                None -> pog.null()
              }
              case
                pog.query(
                  "update media_files set avif_storage_key = coalesce($2, avif_storage_key), width = coalesce($3, width), height = coalesce($4, height) where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(string.trim(file_id)))
                |> pog.parameter(avif_p)
                |> pog.parameter(w_p)
                |> pog.parameter(h_p)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "update_failed")
                Ok(r) ->
                  case r.rows {
                    [] -> json_err(404, "not_found")
                    [_] -> {
                      let out =
                        json.object([#("ok", json.bool(True))])
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
