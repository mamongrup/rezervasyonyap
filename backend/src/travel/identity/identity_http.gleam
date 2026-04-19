//// Üyelik — kayıt, giriş, oturum (020 + 182).

import backend/context.{type Context}
import travel/identity/password
import travel/identity/permissions
import travel/identity/rate_limit
import travel/messaging/notification_runtime
import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/int
import gleam/io
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import wisp.{type Request, type Response}

const platform_org_id: String = "a0000000-0000-4000-8000-000000000001"

fn query_error_debug(e: pog.QueryError) -> String {
  case e {
    pog.PostgresqlError(code, name, message) -> code <> " " <> name <> ": " <> message
    pog.ConstraintViolated(m, c, d) -> "constraint " <> m <> " " <> c <> " " <> d
    pog.UnexpectedArgumentCount(expected, got) ->
      "unexpected_arg_count "
      <> int.to_string(expected)
      <> " "
      <> int.to_string(got)
    pog.UnexpectedArgumentType(exp, got) -> "unexpected_arg_type " <> exp <> " " <> got
    pog.UnexpectedResultType(_) -> "unexpected_result_type_decode"
    pog.QueryTimeout -> "query_timeout"
    pog.ConnectionUnavailable -> "connection_unavailable"
  }
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

/// Rate-limit'e takılan istek için 429 yanıtı + `Retry-After` header'ı.
fn json_too_many(retry_after_seconds: Int) -> Response {
  let body =
    json.object([#("error", json.string("too_many_attempts"))])
    |> json.to_string
  wisp.json_response(body, 429)
  |> wisp.set_header("retry-after", int.to_string(retry_after_seconds))
}

/// Reverse proxy arkasında client IP'yi okur. Trust boundary: yalnızca
/// Next.js proxy'si bu header'ı set eder; doğrudan internete açık değilse
/// güvenilirdir. Yoksa `unknown` döner.
fn client_ip(req: Request) -> String {
  case request.get_header(req, "x-forwarded-for") {
    Ok(h) -> {
      let trimmed = string.trim(h)
      case string.split(trimmed, ",") {
        [first, ..] -> string.trim(first)
        _ -> trimmed
      }
    }
    Error(_) ->
      case request.get_header(req, "x-real-ip") {
        Ok(h) -> string.trim(h)
        Error(_) -> "unknown"
      }
  }
}

/// Rate-limit anahtarı: IP + email birleşimi, böylece tek IP'den çoklu hesap
/// taraması ve aynı hesaba çoklu IP brute-force ayrı ayrı limitlenir.
fn rate_key(ip: String, email: String) -> String {
  ip <> "|" <> email
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

/// Yeni parola hash'i (PBKDF2-HMAC-SHA512). Eski SHA-256 tabanlı hash
/// formatı `password.verify` tarafından geriye dönük olarak doğrulanır;
/// `password.needs_rehash/1` `True` ise login başarılı olduktan sonra
/// kullanıcıya özel hash sessizce güncellenir (silent rotation).
fn hash_password(plain: String) -> String {
  password.hash(plain)
}

fn verify_password(stored: String, plain: String) -> Bool {
  password.verify(stored, plain)
}

/// Login başarılı + saklanan hash zayıf ise kullanıcıyı yeni hash'e
/// taşı. Hata durumunda sessizce yutar (kullanıcının login'ini kırma).
fn maybe_rehash(ctx: Context, user_id: String, stored: String, plain: String) -> Nil {
  case password.needs_rehash(stored) {
    False -> Nil
    True -> {
      let new_hash = password.hash(plain)
      let _ =
        pog.query(
          "update users set password_hash = $1, updated_at = now() where id = $2::uuid",
        )
        |> pog.parameter(pog.text(new_hash))
        |> pog.parameter(pog.text(user_id))
        |> pog.execute(ctx.db)
      Nil
    }
  }
}

fn register_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("email", decode.string, fn(email) {
    decode.field("password", decode.string, fn(password) {
      decode.optional_field("display_name", "", decode.string, fn(display_name) {
        decode.success(#(email, password, display_name))
      })
    })
  })
}

/// İçeriği rate-limit dışındaki tüm akışı tutar; `register` ve
/// `login` rate-limit kontrolünden sonra bunu çağırır.
fn do_register(
  ctx: Context,
  email: String,
  password: String,
  display_raw: String,
) -> Response {
  let hash = hash_password(password)
  let display = case string.trim(display_raw) {
    "" -> None
    s -> Some(s)
  }
  let display_param = case display {
    Some(s) -> pog.text(s)
    None -> pog.null()
  }
  case
    pog.query(
      "insert into users (email, password_hash, display_name) values ($1, $2, $3) returning id::text",
    )
    |> pog.parameter(pog.text(email))
    |> pog.parameter(pog.text(hash))
    |> pog.parameter(display_param)
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Ok(ret) ->
      case ret.rows {
        [uid] -> {
          let role_sql =
            "insert into user_roles (user_id, role_id, organization_id) select $1::uuid, r.id, $2::uuid from roles r where r.code = 'customer'"
          let _ =
            pog.query(role_sql)
            |> pog.parameter(pog.text(uid))
            |> pog.parameter(pog.text(platform_org_id))
            |> pog.execute(ctx.db)
          let display_str = case display {
            Some(s) -> s
            None -> ""
          }
          let reg_payload =
            json.object([
              #("email", json.string(email)),
              #("display_name", json.string(display_str)),
            ])
            |> json.to_string
          let _ =
            notification_runtime.dispatch_trigger(
              ctx.db,
              "register",
              "tr",
              Some(uid),
              None,
              email,
              "",
              reg_payload,
            )
          new_session_response(ctx, uid, email, display, 201)
        }
        _ -> json_err(500, "unexpected_user_id")
      }
    Error(_) -> json_err(409, "email_taken_or_invalid")
  }
}

/// POST /api/v1/auth/register — rate-limit + `do_register`. Başarı/başarısızlık
/// `auth_rate_limit` tablosuna kaydedilir; eşik aşılınca 429 döner.
pub fn register(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, register_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(email_raw, password, display_raw)) -> {
          let email = string.lowercase(string.trim(email_raw))
          case string.trim(password) == "" || email == "" {
            True -> json_err(400, "email_password_required")
            False -> {
              let rkey = rate_key(client_ip(req), email)
              case rate_limit.check(ctx, "register", rkey) {
                rate_limit.Blocked(secs) -> json_too_many(secs)
                rate_limit.Allowed -> {
                  let resp = do_register(ctx, email, password, display_raw)
                  case resp.status >= 200 && resp.status < 300 {
                    True -> rate_limit.record_success(ctx, "register", rkey)
                    False -> rate_limit.record_failure(ctx, "register", rkey)
                  }
                  resp
                }
              }
            }
          }
        }
      }
  }
}

fn login_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("email", decode.string, fn(email) {
    decode.field("password", decode.string, fn(password) {
      decode.success(#(email, password))
    })
  })
}

fn new_session_response(
  ctx: Context,
  user_id: String,
  email: String,
  display: option.Option(String),
  status: Int,
) -> Response {
  let token_raw = crypto.strong_random_bytes(32) |> bit_array.base16_encode
  let token_lower = string.lowercase(token_raw)
  case
    pog.query(
      "insert into user_sessions (token, user_id, expires_at) values ($1, $2::uuid, now() + interval '30 days')",
    )
    |> pog.parameter(pog.text(token_lower))
    |> pog.parameter(pog.text(user_id))
    |> pog.execute(ctx.db)
  {
    Error(e) -> {
      io.println("user_sessions insert failed: " <> query_error_debug(e))
      case e {
        pog.ConnectionUnavailable -> json_err(500, "db_connection_failed")
        _ -> json_err(500, "session_create_failed")
      }
    }
    Ok(_) -> {
      let name_field = case display {
        Some(s) -> json.string(s)
        None -> json.null()
      }
      let body =
        json.object([
          #("token", json.string(token_lower)),
          #(
            "user",
            json.object([
              #("id", json.string(user_id)),
              #("email", json.string(email)),
              #("display_name", name_field),
            ]),
          ),
        ])
        |> json.to_string
      wisp.json_response(body, status)
    }
  }
}

/// DELETE /api/v1/auth/session — oturum kapat (token sil)
pub fn logout(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Delete)
  let token = auth_header_token(req)
  case string.trim(token) == "" {
    True -> json_err(401, "missing_token")
    False -> {
      case
        pog.query("delete from user_sessions where token = $1")
        |> pog.parameter(pog.text(token))
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "logout_failed")
        Ok(_) ->
          wisp.json_response(
            json.object([#("ok", json.bool(True))]) |> json.to_string,
            200,
          )
      }
    }
  }
}

/// POST /api/v1/auth/change-password — oturum açık kullanıcı şifresi değiştirme
pub fn change_password(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let token = auth_header_token(req)
  case string.trim(token) == "" {
    True -> json_err(401, "missing_token")
    False -> {
      let decoder = {
        use cur <- decode.field("current_password", decode.string)
        use nxt <- decode.field("new_password", decode.string)
        decode.success(#(cur, nxt))
      }
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, decoder) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(cur_pw, new_pw)) -> {
              case string.length(string.trim(new_pw)) < 6 {
                True -> json_err(422, "password_too_short")
                False -> {
                  let user_row = {
                    use uid <- decode.field(0, decode.string)
                    use ph <- decode.field(1, decode.string)
                    decode.success(#(uid, ph))
                  }
                  case
                    pog.query(
                      "select u.id::text, coalesce(u.password_hash,'') from user_sessions s join users u on u.id = s.user_id where s.token = $1 and s.expires_at > now() limit 1",
                    )
                    |> pog.parameter(pog.text(token))
                    |> pog.returning(user_row)
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "db_error")
                    Ok(ret) ->
                      case ret.rows {
                        [] -> json_err(401, "session_not_found")
                        [#(uid, ph)] -> {
                          case verify_password(ph, cur_pw) {
                            False -> json_err(401, "wrong_current_password")
                            True -> {
                              let new_hash = hash_password(new_pw)
                              case
                                pog.query("update users set password_hash = $1, updated_at = now() where id = $2::uuid")
                                |> pog.parameter(pog.text(new_hash))
                                |> pog.parameter(pog.text(uid))
                                |> pog.execute(ctx.db)
                              {
                                Error(_) -> json_err(500, "update_failed")
                                Ok(_) ->
                                  wisp.json_response(
                                    json.object([#("ok", json.bool(True))]) |> json.to_string,
                                    200,
                                  )
                              }
                            }
                          }
                        }
                        _ -> json_err(500, "unexpected_rows")
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

/// POST /api/v1/auth/forgot-password — şifre sıfırlama bağlantısı oluştur
pub fn forgot_password(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let decoder = decode.field("email", decode.string, fn(e) { decode.success(e) })
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, decoder) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(email_raw) -> {
          let email = string.lowercase(string.trim(email_raw))
          case
            pog.query("select id::text from users where email = $1 limit 1")
            |> pog.parameter(pog.text(email))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(e) -> {
              let _ = io.println("forgot_password users select: " <> query_error_debug(e))
              json_err(500, "db_error")
            }
            Ok(ret) ->
              case ret.rows {
                // Kullanıcı bulunamasa da "ok" döndür (güvenlik: e-posta ifşa etme)
                [] ->
                  wisp.json_response(
                    json.object([#("ok", json.bool(True))]) |> json.to_string,
                    200,
                  )
                [uid] -> {
                  let reset_token =
                    crypto.strong_random_bytes(32)
                    |> bit_array.base16_encode
                    |> string.lowercase
                  case
                    pog.query(
                      "insert into password_reset_tokens (token, user_id, expires_at) values ($1, $2::uuid, now() + interval '1 hour')",
                    )
                    |> pog.parameter(pog.text(reset_token))
                    |> pog.parameter(pog.text(uid))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "token_create_failed")
                    Ok(_) ->
                      wisp.json_response(
                        json.object([
                          #("ok", json.bool(True)),
                          #("reset_token", json.string(reset_token)),
                        ])
                        |> json.to_string,
                        200,
                      )
                  }
                }
                _ -> json_err(500, "unexpected")
              }
          }
        }
      }
  }
}

/// POST /api/v1/auth/reset-password — token ile şifre sıfırla
pub fn reset_password(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  let decoder = {
    use tok <- decode.field("token", decode.string)
    use pw  <- decode.field("new_password", decode.string)
    decode.success(#(tok, pw))
  }
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, decoder) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(tok, pw)) -> {
          case string.length(string.trim(pw)) < 6 {
            True -> json_err(422, "password_too_short")
            False -> {
              let token_row = {
                use uid <- decode.field(0, decode.string)
                decode.success(uid)
              }
              case
                pog.query(
                  "select user_id::text from password_reset_tokens where token = $1 and used_at is null and expires_at > now() limit 1",
                )
                |> pog.parameter(pog.text(string.lowercase(string.trim(tok))))
                |> pog.returning(token_row)
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "db_error")
                Ok(ret) ->
                  case ret.rows {
                    [] -> json_err(400, "invalid_or_expired_token")
                    [uid] -> {
                      let new_hash = hash_password(pw)
                      let tok_lower = string.lowercase(string.trim(tok))
                      let _ =
                        pog.query("update password_reset_tokens set used_at = now() where token = $1")
                        |> pog.parameter(pog.text(tok_lower))
                        |> pog.execute(ctx.db)
                      case
                        pog.query("update users set password_hash = $1, updated_at = now() where id = $2::uuid")
                        |> pog.parameter(pog.text(new_hash))
                        |> pog.parameter(pog.text(uid))
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "update_failed")
                        Ok(_) ->
                          wisp.json_response(
                            json.object([#("ok", json.bool(True))]) |> json.to_string,
                            200,
                          )
                      }
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

/// `do_login`: rate-limit dışındaki tüm akış. `login` rate-limit kontrolünden
/// sonra bunu çağırır.
fn do_login(ctx: Context, email: String, password: String) -> Response {
  let row = {
    use id <- decode.field(0, decode.string)
    use ph <- decode.field(1, decode.string)
    use dn <- decode.field(2, decode.string)
    decode.success(#(id, ph, dn))
  }
  case
    pog.query(
      "select id::text, coalesce(password_hash, ''), coalesce(display_name, '') from users where email = $1 limit 1",
    )
    |> pog.parameter(pog.text(email))
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Error(e) -> {
      let _ = io.println("login users select: " <> query_error_debug(e))
      json_err(500, "login_query_failed")
    }
    Ok(qr) ->
      case qr.rows {
        [] -> json_err(401, "invalid_credentials")
        [#(uid, ph, dn)] ->
          case verify_password(ph, password) {
            False -> json_err(401, "invalid_credentials")
            True -> {
              maybe_rehash(ctx, uid, ph, password)
              let disp = case string.trim(dn) {
                "" -> None
                s -> Some(s)
              }
              new_session_response(ctx, uid, email, disp, 200)
            }
          }
        _ -> json_err(500, "unexpected_rows")
      }
  }
}

/// POST /api/v1/auth/login — rate-limit + `do_login`. 5 başarısız denemeden
/// sonra `IP|email` 15 dk için 429 alır.
pub fn login(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, login_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(email_raw, password)) -> {
          let email = string.lowercase(string.trim(email_raw))
          let rkey = rate_key(client_ip(req), email)
          case rate_limit.check(ctx, "login", rkey) {
            rate_limit.Blocked(secs) -> json_too_many(secs)
            rate_limit.Allowed -> {
              let resp = do_login(ctx, email, password)
              case resp.status >= 200 && resp.status < 300 {
                True -> rate_limit.record_success(ctx, "login", rkey)
                False -> rate_limit.record_failure(ctx, "login", rkey)
              }
              resp
            }
          }
        }
      }
  }
}

fn auth_header_token(req: Request) -> String {
  case request.get_header(req, "authorization") {
    Error(_) -> ""
    Ok(h) -> {
      let t = string.trim(h)
      case string.starts_with(string.lowercase(t), "bearer ") {
        True ->
          t
          |> string.drop_start(7)
          |> string.trim
        False -> ""
      }
    }
  }
}

fn me_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use email <- decode.field(1, decode.string)
  use dn <- decode.field(2, decode.string)
  use loc <- decode.field(3, decode.string)
  decode.success(#(id, email, dn, loc))
}

fn role_assignment_row() -> decode.Decoder(#(String, String)) {
  use code <- decode.field(0, decode.string)
  use org <- decode.field(1, decode.string)
  decode.success(#(code, org))
}

fn user_roles_json(conn: pog.Connection, user_id: String) -> json.Json {
  case
    pog.query(
      "select r.code::text, coalesce(ur.organization_id::text, '') from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid order by r.code",
    )
    |> pog.parameter(pog.text(user_id))
    |> pog.returning(role_assignment_row())
    |> pog.execute(conn)
  {
    Error(_) -> json.preprocessed_array([])
    Ok(rr) -> {
      let arr =
        list.map(rr.rows, fn(row) {
          let #(code, org) = row
          let org_j = case org == "" {
            True -> json.null()
            False -> json.string(org)
          }
          json.object([
            #("role_code", json.string(code)),
            #("organization_id", org_j),
          ])
        })
      json.preprocessed_array(arr)
    }
  }
}

/// GET /api/v1/roles — sistem rol kodları (G3.0).
pub fn list_roles(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let row = {
    use c <- decode.field(0, decode.string)
    use d <- decode.field(1, decode.string)
    decode.success(#(c, d))
  }
  case
    pog.query("select code::text, coalesce(description, '') from roles order by id")
    |> pog.returning(row)
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "roles_query_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(r) {
          let #(code, desc) = r
          json.object([
            #("code", json.string(code)),
            #("description", json.string(desc)),
          ])
        })
      let body =
        json.object([#("roles", json.preprocessed_array(arr))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn patch_me_decoder() -> decode.Decoder(#(String, String)) {
  decode.optional_field("display_name", "", decode.string, fn(dn) {
    decode.optional_field("preferred_locale", "", decode.string, fn(loc) {
      decode.success(#(dn, loc))
    })
  })
}

/// PATCH /api/v1/auth/me — display_name ve/veya preferred_locale (oturum gerekli).
pub fn patch_me(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Patch)
  let token = auth_header_token(req)
  case token == "" {
    True -> json_err(401, "missing_token")
    False ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_me_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(dn_raw, loc_raw)) -> {
              let dn_trim = string.trim(dn_raw)
              let loc_trim = string.trim(loc_raw)
              case dn_trim == "" && loc_trim == "" {
                True -> json_err(400, "nothing_to_update")
                False ->
                  case
                    pog.query(
                      "select u.id::text from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
                    )
                    |> pog.parameter(pog.text(token))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "session_query_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [] -> json_err(401, "invalid_session")
                        [uid] -> {
                          case
                            pog.query(
                              "update users set display_name = case when $1 = '' then display_name else $1 end, preferred_locale = case when $2 = '' then preferred_locale else $2 end, updated_at = now() where id = $3::uuid",
                            )
                            |> pog.parameter(pog.text(dn_trim))
                            |> pog.parameter(pog.text(loc_trim))
                            |> pog.parameter(pog.text(uid))
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "update_failed")
                            Ok(_) -> me(req, ctx)
                          }
                        }
                        _ -> json_err(500, "unexpected_session")
                      }
                  }
              }
            }
          }
      }
  }
}

/// GET /api/v1/auth/me
pub fn me(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let token = auth_header_token(req)
  case token == "" {
    True -> json_err(401, "missing_token")
    False ->
      case
        pog.query(
          "select u.id::text, coalesce(u.email, ''), coalesce(u.display_name, ''), coalesce(u.preferred_locale, '') from users u join user_sessions s on s.user_id = u.id where lower(s.token) = lower($1) and s.expires_at > now() limit 1",
        )
        |> pog.parameter(pog.text(token))
        |> pog.returning(me_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "me_query_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(401, "invalid_session")
            [#(id, email, dn, loc)] -> {
              let roles_j = user_roles_json(ctx.db, id)
              let perms_j =
                permissions.permissions_json(permissions.user_permission_codes(
                  ctx.db,
                  id,
                ))
              let body =
                json.object([
                  #("id", json.string(id)),
                  #("email", json.string(email)),
                  #("display_name", json.string(dn)),
                  #("preferred_locale", json.string(loc)),
                  #("roles", roles_j),
                  #("permissions", perms_j),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected_me")
          }
      }
  }
}

fn require_session_permission(
  req: Request,
  ctx: Context,
  permission_code: String,
) -> Result(String, Response) {
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> Error(r)
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, permission_code) {
        True -> Ok(uid)
        False -> Error(json_err(403, "forbidden"))
      }
  }
}

fn audit_log_insert(
  ctx: Context,
  actor_id: String,
  org_id: String,
  action: String,
  target_type: String,
  target_id: String,
  details: json.Json,
) {
  let org_param = case string.trim(org_id) == "" {
    True -> pog.null()
    False -> pog.text(string.trim(org_id))
  }
  let tgt_param = case string.trim(target_id) == "" {
    True -> pog.null()
    False -> pog.text(string.trim(target_id))
  }
  let details_s = json.to_string(details)
  let _ =
    pog.query(
      "insert into audit_log (user_id, organization_id, action, target_type, target_id, details_json) values ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb)",
    )
    |> pog.parameter(pog.text(actor_id))
    |> pog.parameter(org_param)
    |> pog.parameter(pog.text(action))
    |> pog.parameter(pog.text(target_type))
    |> pog.parameter(tgt_param)
    |> pog.parameter(pog.text(details_s))
    |> pog.execute(ctx.db)
  Nil
}

fn admin_users_row() -> decode.Decoder(#(String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use email <- decode.field(1, decode.string)
  use dn <- decode.field(2, decode.string)
  use created <- decode.field(3, decode.string)
  decode.success(#(id, email, dn, created))
}

/// GET /api/v1/admin/users?search=&limit=
/// Basit kullanıcı listesi (yalnızca `admin` rolü için).
pub fn admin_list_users(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_session_permission(req, ctx, "admin.users.read") {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let search_q =
        list.key_find(qs, "search")
        |> result.unwrap("")
        |> string.trim
      let limit_val = 50
      let like_param = case search_q == "" {
        True -> pog.null()
        False -> pog.text("%" <> search_q <> "%")
      }
      case
        pog.query(
          "select id::text, coalesce(email,''), coalesce(display_name,''), to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from users where ($1::text is null or email ilike $1 or display_name ilike $1) order by created_at desc limit $2",
        )
        |> pog.parameter(like_param)
        |> pog.parameter(pog.int(limit_val))
        |> pog.returning(admin_users_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "admin_users_query_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, email, dn, created) = row
              json.object([
                #("id", json.string(id)),
                #("email", json.string(email)),
                #("display_name", json.string(dn)),
                #("created_at", json.string(created)),
              ])
            })
          let body =
            json.object([#("users", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

/// GET /api/v1/admin/user-roles?user_id= — tek kullanıcının rol atamaları (yalnızca admin).
pub fn admin_user_roles(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_session_permission(req, ctx, "admin.roles.read") {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let uid =
        list.key_find(qs, "user_id")
        |> result.unwrap("")
        |> string.trim
      case uid == "" {
        True -> json_err(400, "user_id_required")
        False -> {
          let roles_j = user_roles_json(ctx.db, uid)
          let body =
            json.object([
              #("user_id", json.string(uid)),
              #("roles", roles_j),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn admin_user_role_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.field("user_id", decode.string, fn(uid) {
    decode.field("role_code", decode.string, fn(code) {
      decode.optional_field("organization_id", "", decode.string, fn(oid) {
        decode.field("op", decode.string, fn(op) {
          decode.success(#(uid, code, oid, op))
        })
      })
    })
  })
}

/// POST /api/v1/admin/user-roles — { user_id, role_code, organization_id?, op: \"grant\"|\"revoke\" }
pub fn admin_update_user_role(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_session_permission(req, ctx, "admin.users.write_roles") {
    Error(r) -> r
    Ok(actor_id) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, admin_user_role_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(uid_raw, code_raw, oid_raw, op_raw)) -> {
              let uid = string.trim(uid_raw)
              let code = string.lowercase(string.trim(code_raw))
              let oid_trim = string.trim(oid_raw)
              let op = string.lowercase(string.trim(op_raw))
              case uid == "" || code == "" || op == "" {
                True -> json_err(400, "missing_fields")
                False ->
                  case op {
                    "grant" -> {
                      let org_param = case oid_trim == "" {
                        True -> pog.null()
                        False -> pog.text(oid_trim)
                      }
                      case
                        pog.query(
                          "insert into user_roles (user_id, role_id, organization_id) select $1::uuid, r.id, $3::uuid from roles r where r.code = $2 on conflict do nothing",
                        )
                        |> pog.parameter(pog.text(uid))
                        |> pog.parameter(pog.text(code))
                        |> pog.parameter(org_param)
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "grant_failed")
                        Ok(_) -> {
                          let details =
                            json.object([
                              #("op", json.string("grant")),
                              #("role_code", json.string(code)),
                              #("user_id", json.string(uid)),
                              #("organization_id", json.string(oid_trim)),
                            ])
                          audit_log_insert(
                            ctx,
                            actor_id,
                            oid_trim,
                            "user_role_granted",
                            "user_role",
                            uid,
                            details,
                          )
                          let body =
                            json.object([
                              #("user_id", json.string(uid)),
                              #("roles", user_roles_json(ctx.db, uid)),
                            ])
                            |> json.to_string
                          wisp.json_response(body, 200)
                        }
                      }
                    }
                    "revoke" -> {
                      let org_param = case oid_trim == "" {
                        True -> pog.null()
                        False -> pog.text(oid_trim)
                      }
                      case
                        pog.query(
                          "delete from user_roles where user_id = $1::uuid and role_id in (select id from roles where code = $2) and (organization_id is not distinct from $3::uuid)",
                        )
                        |> pog.parameter(pog.text(uid))
                        |> pog.parameter(pog.text(code))
                        |> pog.parameter(org_param)
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "revoke_failed")
                        Ok(_) -> {
                          let details =
                            json.object([
                              #("op", json.string("revoke")),
                              #("role_code", json.string(code)),
                              #("user_id", json.string(uid)),
                              #("organization_id", json.string(oid_trim)),
                            ])
                          audit_log_insert(
                            ctx,
                            actor_id,
                            oid_trim,
                            "user_role_revoked",
                            "user_role",
                            uid,
                            details,
                          )
                          let body =
                            json.object([
                              #("user_id", json.string(uid)),
                              #("roles", user_roles_json(ctx.db, uid)),
                            ])
                            |> json.to_string
                          wisp.json_response(body, 200)
                        }
                      }
                    }
                    _ -> json_err(400, "invalid_op")
                  }
              }
            }
          }
      }
  }
}

fn audit_log_row() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use uid <- decode.field(1, decode.string)
  use oid <- decode.field(2, decode.string)
  use act <- decode.field(3, decode.string)
  use tgt <- decode.field(4, decode.string)
  use created <- decode.field(5, decode.string)
  decode.success(#(id, uid, oid, act, tgt, created))
}

/// GET /api/v1/admin/audit-log?user_id=&limit=
pub fn admin_audit_log(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_session_permission(req, ctx, "admin.audit.read") {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let uid_q =
        list.key_find(qs, "user_id")
        |> result.unwrap("")
        |> string.trim
      let limit_val = 50
      let uid_param = case uid_q == "" {
        True -> pog.null()
        False -> pog.text(uid_q)
      }
      case
        pog.query(
          "select id::text, coalesce(user_id::text,''), coalesce(organization_id::text,''), action, target_type, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from audit_log where ($1::uuid is null or user_id = $1::uuid) order by created_at desc limit $2",
        )
        |> pog.parameter(uid_param)
        |> pog.parameter(pog.int(limit_val))
        |> pog.returning(audit_log_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "audit_log_query_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, uid, oid, act, tgt, created) = row
              let uid_j = case uid == "" {
                True -> json.null()
                False -> json.string(uid)
              }
              let oid_j = case oid == "" {
                True -> json.null()
                False -> json.string(oid)
              }
              json.object([
                #("id", json.string(id)),
                #("user_id", uid_j),
                #("organization_id", oid_j),
                #("action", json.string(act)),
                #("target_type", json.string(tgt)),
                #("created_at", json.string(created)),
              ])
            })
          let body =
            json.object([#("events", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn perm_catalog_row() -> decode.Decoder(#(String, String)) {
  use c <- decode.field(0, decode.string)
  use d <- decode.field(1, decode.string)
  decode.success(#(c, d))
}

fn role_perm_pair_row() -> decode.Decoder(#(String, String)) {
  use rc <- decode.field(0, decode.string)
  use pc <- decode.field(1, decode.string)
  decode.success(#(rc, pc))
}

/// GET /api/v1/admin/permissions — tüm izin kodları (catalog).
pub fn admin_list_permissions(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_session_permission(req, ctx, "admin.permissions.read") {
    Error(r) -> r
    Ok(_) ->
      case permissions.permissions_matrix_available(ctx.db) {
        False -> {
          let arr =
            list.map(permissions.fallback_permission_catalog(), fn(row) {
              let #(code, desc) = row
              json.object([
                #("code", json.string(code)),
                #("description", json.string(desc)),
              ])
            })
          let body =
            json.object([
              #("permissions", json.preprocessed_array(arr)),
              #("matrix_installed", json.bool(False)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        True ->
          case
            pog.query(
              "select code::text, coalesce(description, '') from permissions order by code",
            )
            |> pog.returning(perm_catalog_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> {
              let arr =
                list.map(permissions.fallback_permission_catalog(), fn(row) {
                  let #(code, desc) = row
                  json.object([
                    #("code", json.string(code)),
                    #("description", json.string(desc)),
                  ])
                })
              let body =
                json.object([
                  #("permissions", json.preprocessed_array(arr)),
                  #("matrix_installed", json.bool(False)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(row) {
                  let #(code, desc) = row
                  json.object([
                    #("code", json.string(code)),
                    #("description", json.string(desc)),
                  ])
                })
              let body =
                json.object([
                  #("permissions", json.preprocessed_array(arr)),
                  #("matrix_installed", json.bool(True)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

/// GET /api/v1/admin/role-permissions — rol × izin çiftleri (matris).
pub fn admin_list_role_permissions(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_session_permission(req, ctx, "admin.permissions.read") {
    Error(r) -> r
    Ok(_) ->
      case permissions.permissions_matrix_available(ctx.db) {
        False -> {
          let pairs = permissions.fallback_role_permission_entries(ctx.db)
          let arr =
            list.map(pairs, fn(pair) {
              let #(rc, pc) = pair
              json.object([
                #("role_code", json.string(rc)),
                #("permission_code", json.string(pc)),
              ])
            })
          let body =
            json.object([
              #("entries", json.preprocessed_array(arr)),
              #("matrix_installed", json.bool(False)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        True ->
          case
            pog.query(
              "select r.code::text, p.code::text from roles r join role_permissions rp on rp.role_id = r.id join permissions p on p.id = rp.permission_id order by r.code, p.code",
            )
            |> pog.returning(role_perm_pair_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> {
              let pairs = permissions.fallback_role_permission_entries(ctx.db)
              let arr =
                list.map(pairs, fn(pair) {
                  let #(rc, pc) = pair
                  json.object([
                    #("role_code", json.string(rc)),
                    #("permission_code", json.string(pc)),
                  ])
                })
              let body =
                json.object([
                  #("entries", json.preprocessed_array(arr)),
                  #("matrix_installed", json.bool(False)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            Ok(ret) -> {
              let arr =
                list.map(ret.rows, fn(row) {
                  let #(rc, pc) = row
                  json.object([
                    #("role_code", json.string(rc)),
                    #("permission_code", json.string(pc)),
                  ])
                })
              let body =
                json.object([
                  #("entries", json.preprocessed_array(arr)),
                  #("matrix_installed", json.bool(True)),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
  }
}

fn admin_role_perm_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("role_code", decode.string, fn(rc) {
    decode.field("permission_code", decode.string, fn(pc) {
      decode.field("op", decode.string, fn(op) {
        decode.success(#(rc, pc, op))
      })
    })
  })
}

/// POST /api/v1/admin/role-permissions — { role_code, permission_code, op: grant|revoke }
pub fn admin_update_role_permission(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_session_permission(req, ctx, "admin.permissions.write") {
    Error(r) -> r
    Ok(actor_id) ->
      case permissions.permissions_matrix_available(ctx.db) {
        False -> json_err(503, "permissions_matrix_migration_required")
        True ->
          case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, admin_role_perm_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(rc_raw, pc_raw, op_raw)) -> {
              let rc = string.lowercase(string.trim(rc_raw))
              let pc = string.trim(pc_raw)
              let op = string.lowercase(string.trim(op_raw))
              case rc == "" || pc == "" || op == "" {
                True -> json_err(400, "missing_fields")
                False ->
                  case op {
                    "grant" ->
                      case
                        pog.query(
                          "insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r, permissions p where r.code = $1 and p.code = $2 on conflict do nothing",
                        )
                        |> pog.parameter(pog.text(rc))
                        |> pog.parameter(pog.text(pc))
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "grant_failed")
                        Ok(_) -> {
                          let details =
                            json.object([
                              #("op", json.string("grant")),
                              #("role_code", json.string(rc)),
                              #("permission_code", json.string(pc)),
                            ])
                          audit_log_insert(
                            ctx,
                            actor_id,
                            "",
                            "role_permission_granted",
                            "role_permission",
                            "",
                            details,
                          )
                          let body =
                            json.object([
                              #("ok", json.bool(True)),
                              #("role_code", json.string(rc)),
                              #("permission_code", json.string(pc)),
                            ])
                            |> json.to_string
                          wisp.json_response(body, 200)
                        }
                      }
                    "revoke" ->
                      case
                        pog.query(
                          "delete from role_permissions rp using roles r, permissions p where rp.role_id = r.id and rp.permission_id = p.id and r.code = $1 and p.code = $2",
                        )
                        |> pog.parameter(pog.text(rc))
                        |> pog.parameter(pog.text(pc))
                        |> pog.execute(ctx.db)
                      {
                        Error(_) -> json_err(500, "revoke_failed")
                        Ok(_) -> {
                          let details =
                            json.object([
                              #("op", json.string("revoke")),
                              #("role_code", json.string(rc)),
                              #("permission_code", json.string(pc)),
                            ])
                          audit_log_insert(
                            ctx,
                            actor_id,
                            "",
                            "role_permission_revoked",
                            "role_permission",
                            "",
                            details,
                          )
                          let body =
                            json.object([
                              #("ok", json.bool(True)),
                              #("role_code", json.string(rc)),
                              #("permission_code", json.string(pc)),
                            ])
                            |> json.to_string
                          wisp.json_response(body, 200)
                        }
                      }
                    _ -> json_err(400, "invalid_op")
                  }
              }
            }
          }
          }
      }
  }
}

fn agency_grant_row() -> decode.Decoder(#(String, String, String, String, String)) {
  use id <- decode.field(0, decode.string)
  use oid <- decode.field(1, decode.string)
  use oname <- decode.field(2, decode.string)
  use cat <- decode.field(3, decode.string)
  use appr <- decode.field(4, decode.string)
  decode.success(#(id, oid, oname, cat, appr))
}

/// GET /api/v1/admin/agency-category-grants?agency_organization_id=
pub fn admin_list_agency_category_grants(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_session_permission(req, ctx, "admin.agency_category_grants.read") {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let filter_aid =
        list.key_find(qs, "agency_organization_id")
        |> result.unwrap("")
        |> string.trim
      let org_param = case filter_aid == "" {
        True -> pog.null()
        False -> pog.text(filter_aid)
      }
      case
        pog.query(
          "select g.id::text, g.agency_organization_id::text, o.name::text, g.category_code::text, g.approved::text from agency_category_grants g inner join organizations o on o.id = g.agency_organization_id where o.org_type = 'agency' and ($1::text is null or g.agency_organization_id = $1::uuid) order by o.name, g.category_code limit 500",
        )
        |> pog.parameter(org_param)
        |> pog.returning(agency_grant_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "grants_list_failed")
        Ok(ret) -> {
          let arr =
            list.map(ret.rows, fn(row) {
              let #(id, oid, oname, cat, appr) = row
              json.object([
                #("id", json.string(id)),
                #("agency_organization_id", json.string(oid)),
                #("agency_name", json.string(oname)),
                #("category_code", json.string(cat)),
                #("approved", json.string(appr)),
              ])
            })
          let body =
            json.object([#("grants", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn admin_agency_grant_upsert_decoder() -> decode.Decoder(#(String, String, Bool)) {
  decode.field("agency_organization_id", decode.string, fn(aid) {
    decode.field("category_code", decode.string, fn(cat) {
      decode.field("approved", decode.bool, fn(apr) {
        decode.success(#(aid, cat, apr))
      })
    })
  })
}

/// POST /api/v1/admin/agency-category-grants — { agency_organization_id, category_code, approved }
pub fn admin_upsert_agency_category_grant(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case require_session_permission(req, ctx, "admin.agency_category_grants.write") {
    Error(r) -> r
    Ok(actor_id) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, admin_agency_grant_upsert_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(aid_raw, cat_raw, approved)) -> {
              let aid = string.trim(aid_raw)
              let cat = string.trim(cat_raw)
              case aid == "" || cat == "" {
                True -> json_err(400, "missing_fields")
                False ->
                  case
                    pog.query(
                      "with ins as ( insert into agency_category_grants (agency_organization_id, category_code, approved) select $1::uuid, $2, $3 from organizations o where o.id = $1::uuid and o.org_type = 'agency' on conflict (agency_organization_id, category_code) do update set approved = excluded.approved returning id, agency_organization_id, category_code, approved ) select ins.id::text, ins.agency_organization_id::text, o.name::text, ins.category_code::text, ins.approved::text from ins inner join organizations o on o.id = ins.agency_organization_id",
                    )
                    |> pog.parameter(pog.text(aid))
                    |> pog.parameter(pog.text(cat))
                    |> pog.parameter(pog.bool(approved))
                    |> pog.returning(agency_grant_row())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(400, "upsert_failed")
                    Ok(upd) ->
                      case upd.rows {
                        [] -> json_err(400, "not_agency_organization")
                        [row] -> {
                          let #(id, oid, oname, c, appr) = row
                          let details =
                            json.object([
                              #("agency_organization_id", json.string(oid)),
                              #("category_code", json.string(c)),
                              #("approved", json.string(appr)),
                            ])
                          audit_log_insert(
                            ctx,
                            actor_id,
                            oid,
                            "agency_category_grant_upserted",
                            "agency_category_grant",
                            id,
                            details,
                          )
                          let out =
                            json.object([
                              #(
                                "grant",
                                json.object([
                                  #("id", json.string(id)),
                                  #("agency_organization_id", json.string(oid)),
                                  #("agency_name", json.string(oname)),
                                  #("category_code", json.string(c)),
                                  #("approved", json.string(appr)),
                                ]),
                              ),
                            ])
                            |> json.to_string
                          wisp.json_response(out, 200)
                        }
                        _ -> json_err(500, "upsert_unexpected")
                      }
                  }
              }
            }
          }
      }
  }
}

fn admin_agency_profile_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String, String, String),
) {
  use uid <- decode.field(0, decode.string)
  use em <- decode.field(1, decode.string)
  use ds <- decode.field(2, decode.string)
  use dp <- decode.field(3, decode.string)
  use oid <- decode.field(4, decode.string)
  use slug <- decode.field(5, decode.string)
  use name <- decode.field(6, decode.string)
  use tursab_no <- decode.field(7, decode.string)
  use tursab_url <- decode.field(8, decode.string)
  use created_at <- decode.field(9, decode.string)
  decode.success(#(uid, em, ds, dp, oid, slug, name, tursab_no, tursab_url, created_at))
}

fn valid_agency_document_status(s: String) -> Bool {
  let t = string.lowercase(string.trim(s))
  t == "pending" || t == "approved" || t == "rejected"
}

fn agency_document_notification(
  ctx: Context,
  agency_org_id: String,
  trigger_code: String,
) -> Nil {
  case
    pog.query(
      "select coalesce(u.email,''), coalesce(u.phone,''), u.id::text, coalesce(u.display_name,''), coalesce(o.name,'') "
      <> "from agency_profiles ap join users u on u.id = ap.user_id join organizations o on o.id = ap.organization_id "
      <> "where ap.organization_id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(agency_org_id))
    |> pog.returning({
      use em <- decode.field(0, decode.string)
      use ph <- decode.field(1, decode.string)
      use uid <- decode.field(2, decode.string)
      use dn <- decode.field(3, decode.string)
      use oname <- decode.field(4, decode.string)
      decode.success(#(em, ph, uid, dn, oname))
    })
    |> pog.execute(ctx.db)
  {
    Ok(ret) ->
      case ret.rows {
        [#(em, ph, uid, dn, oname)] -> {
          let pl =
            json.object([
              #("contact_name", json.string(dn)),
              #("agency_name", json.string(oname)),
            ])
            |> json.to_string
          case string.trim(em) == "" && string.trim(ph) == "" {
            True -> Nil
            False ->
              notification_runtime.dispatch_trigger(
                ctx.db,
                trigger_code,
                "tr",
                Some(uid),
                None,
                em,
                ph,
                pl,
              )
          }
        }
        _ -> Nil
      }
    Error(_) -> Nil
  }
}

/// GET /api/v1/admin/agency-profiles?agency_organization_id=
pub fn admin_list_agency_profiles(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case require_session_permission(req, ctx, "admin.agency_profiles.read") {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let oid =
        list.key_find(qs, "agency_organization_id")
        |> result.unwrap("")
        |> string.trim
      let status_filter =
        list.key_find(qs, "status")
        |> result.unwrap("")
        |> string.trim
        |> string.lowercase
      // `agency_organization_id` boş geçilirse tüm acente profilleri listelenir.
      // Aksi halde sadece o kuruma ait profiller döner (eski davranış korunur).
      let do_list = fn() {
        case
          pog.query(
            "select ap.user_id::text,
                    coalesce(u.email, ''),
                    ap.document_status::text,
                    ap.discount_percent::text,
                    o.id::text,
                    coalesce(o.slug, ''),
                    coalesce(o.name, ''),
                    coalesce(o.tursab_license_no, ''),
                    coalesce(o.tursab_verify_url, ''),
                    to_char(ap.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')
               from agency_profiles ap
               left join users u on u.id = ap.user_id
               inner join organizations o
                       on o.id = ap.organization_id and o.org_type = 'agency'
              where ($1::text = '' or ap.organization_id::text = $1)
                and ($2::text = '' or lower(coalesce(ap.document_status, '')) = $2)
              order by case when lower(coalesce(ap.document_status, '')) = 'pending' then 0
                            when lower(coalesce(ap.document_status, '')) = 'rejected' then 1
                            else 2 end,
                       ap.created_at desc",
          )
          |> pog.parameter(pog.text(oid))
          |> pog.parameter(pog.text(status_filter))
          |> pog.returning(admin_agency_profile_row())
          |> pog.execute(ctx.db)
        {
          Error(_) -> json_err(500, "list_failed")
          Ok(ret) -> {
            let arr =
              list.map(ret.rows, fn(row) {
                let #(uid, em, ds, dp, org_id, slug, name, tursab_no, tursab_url, created) =
                  row
                json.object([
                  #("user_id", json.string(uid)),
                  #("email", json.string(em)),
                  #("document_status", json.string(ds)),
                  #("discount_percent", json.string(dp)),
                  #("organization_id", json.string(org_id)),
                  #("organization_slug", json.string(slug)),
                  #("organization_name", json.string(name)),
                  #("tursab_license_no", json.string(tursab_no)),
                  #("tursab_verify_url", json.string(tursab_url)),
                  #("created_at", json.string(created)),
                ])
              })
            let body =
              json.object([#("profiles", json.preprocessed_array(arr))])
              |> json.to_string
            wisp.json_response(body, 200)
          }
        }
      }
      case oid == "" {
        True -> do_list()
        False ->
          case
            pog.query(
              "select 1::text from organizations o where o.id = $1::uuid and o.org_type = 'agency' limit 1",
            )
            |> pog.parameter(pog.text(oid))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "org_check_failed")
            Ok(chk) ->
              case chk.rows {
                [] -> json_err(404, "not_agency_organization")
                _ -> do_list()
              }
          }
      }
    }
  }
}

fn admin_agency_profile_patch_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("agency_organization_id", decode.string, fn(oid) {
    decode.optional_field("document_status", "", decode.string, fn(ds) {
      decode.optional_field("discount_percent", "", decode.string, fn(dp) {
        decode.success(#(oid, ds, dp))
      })
    })
  })
}

/// PATCH /api/v1/admin/agency-profiles — { agency_organization_id, document_status?, discount_percent? }
pub fn admin_patch_agency_profiles(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case require_session_permission(req, ctx, "admin.agency_profiles.write") {
    Error(r) -> r
    Ok(actor_id) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, admin_agency_profile_patch_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(oid_raw, ds_raw, dp_raw)) -> {
              let oid = string.trim(oid_raw)
              let ds = string.trim(ds_raw)
              let dp = string.trim(dp_raw)
              case oid == "" {
                True -> json_err(400, "missing_fields")
                False ->
                  case ds == "" && dp == "" {
                    True -> json_err(400, "no_fields")
                    False ->
                      case ds != "" && !valid_agency_document_status(ds) {
                        True -> json_err(400, "invalid_document_status")
                        False ->
                          case
                            pog.query(
                              "select 1::text from organizations o where o.id = $1::uuid and o.org_type = 'agency' limit 1",
                            )
                            |> pog.parameter(pog.text(oid))
                            |> pog.returning(row_dec.col0_string())
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "org_check_failed")
                            Ok(chk) ->
                              case chk.rows {
                                [] -> json_err(404, "not_agency_organization")
                                _ ->
                                  case
                                    pog.query(
                                      "with updated as (update agency_profiles ap set document_status = case when trim($2::text) = '' then ap.document_status else lower(trim($2)) end, discount_percent = case when trim($3::text) = '' then ap.discount_percent else trim($3)::numeric end where ap.organization_id = $1::uuid and exists (select 1 from organizations o where o.id = ap.organization_id and o.org_type = 'agency') returning ap.user_id) select count(*)::text from updated",
                                    )
                                    |> pog.parameter(pog.text(oid))
                                    |> pog.parameter(pog.text(ds))
                                    |> pog.parameter(pog.text(dp))
                                    |> pog.returning(row_dec.col0_string())
                                    |> pog.execute(ctx.db)
                                  {
                                    Error(_) -> json_err(400, "update_failed")
                                    Ok(u) ->
                                      case u.rows {
                                        [cnt] -> {
                                          let details =
                                            json.object([
                                              #("document_status", json.string(ds)),
                                              #("discount_percent", json.string(dp)),
                                              #("updated_count", json.string(cnt)),
                                            ])
                                          audit_log_insert(
                                            ctx,
                                            actor_id,
                                            oid,
                                            "agency_profiles_patched",
                                            "agency_organization",
                                            oid,
                                            details,
                                          )
                                          let _ = case string.trim(ds) {
                                            "approved" ->
                                              agency_document_notification(
                                                ctx,
                                                oid,
                                                "agency_document_approved",
                                              )
                                            "rejected" ->
                                              agency_document_notification(
                                                ctx,
                                                oid,
                                                "agency_document_rejected",
                                              )
                                            _ -> Nil
                                          }
                                          let out =
                                            json.object([
                                              #("updated_count", json.string(cnt)),
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
  }
}

