//// Destek talepleri (helpdesk) HTTP API.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import wisp.{type Request, type Response}

pub type CreateTicketPayload {
  CreateTicketPayload(
    department_code: String,
    subject: String,
    body: String,
    guest_email: String,
    guest_name: Option(String),
    priority: String,
    related_reservation_public_code: String,
  )
}

fn create_ticket_decoder() -> decode.Decoder(CreateTicketPayload) {
  decode.field("department_code", decode.string, fn(department_code) {
    decode.field("subject", decode.string, fn(subject) {
      decode.field("body", decode.string, fn(body) {
        decode.field("guest_email", decode.string, fn(guest_email) {
          decode.optional_field("guest_name", "", decode.string, fn(gn_raw) {
            decode.optional_field("priority", "normal", decode.string, fn(priority) {
              decode.optional_field(
                "related_reservation_public_code",
                "",
                decode.string,
                fn(rel_code) {
                  let guest_name = case gn_raw == "" {
                    True -> None
                    False -> Some(gn_raw)
                  }
                  decode.success(CreateTicketPayload(
                    department_code:,
                    subject:,
                    body:,
                    guest_email:,
                    guest_name:,
                    priority:,
                    related_reservation_public_code: rel_code,
                  ))
                },
              )
            })
          })
        })
      })
    })
  })
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn decode_col0_int() -> decode.Decoder(Int) {
  use n <- decode.field(0, decode.int)
  decode.success(n)
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn reservation_id_for_guest(
  db: pog.Connection,
  public_code: String,
  guest_email: String,
) -> Result(String, Nil) {
  let row = row_dec.col0_string()
  case
    pog.query(
      "select id::text from reservations where public_code = $1 and lower(guest_email) = lower($2) limit 1",
    )
    |> pog.parameter(pog.text(string.trim(public_code)))
    |> pog.parameter(pog.text(string.lowercase(string.trim(guest_email))))
    |> pog.returning(row)
    |> pog.execute(db)
  {
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error(Nil)
      }
    Error(_) -> Error(Nil)
  }
}

fn department_id(db: pog.Connection, code: String) -> Result(Int, Nil) {
  let row = decode_col0_int()
  case
    pog.query(
      "select id from support_departments where code = $1 limit 1",
    )
    |> pog.parameter(pog.text(code))
    |> pog.returning(row)
    |> pog.execute(db)
  {
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error(Nil)
      }
    Error(_) -> Error(Nil)
  }
}

pub fn create_ticket(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_ticket_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(payload) ->
          case department_id(ctx.db, payload.department_code) {
            Error(_) -> json_err(400, "unknown_department")
            Ok(dept_id) -> {
              let guest_name_param = case payload.guest_name {
                Some(n) -> pog.text(n)
                None -> pog.null()
              }
              let related_result = case string.trim(payload.related_reservation_public_code) {
                "" -> Ok(pog.null())
                code ->
                  case reservation_id_for_guest(ctx.db, code, payload.guest_email) {
                    Ok(id) -> Ok(pog.text(id))
                    Error(_) -> Error(Nil)
                  }
              }
              case related_result {
                Error(_) -> json_err(400, "invalid_reservation_link")
                Ok(related_param) -> {
                  let returning = {
                    use a <- decode.field(0, decode.string)
                    use b <- decode.field(1, decode.string)
                    decode.success(#(a, b))
                  }
                  case
                    pog.query(
                      "insert into support_tickets (department_id, subject, guest_email, guest_name, priority, related_reservation_id) values ($1, $2, $3, $4, $5, $6) returning id::text, public_code",
                    )
                    |> pog.parameter(pog.int(dept_id))
                    |> pog.parameter(pog.text(payload.subject))
                    |> pog.parameter(pog.text(payload.guest_email))
                    |> pog.parameter(guest_name_param)
                    |> pog.parameter(pog.text(payload.priority))
                    |> pog.parameter(related_param)
                    |> pog.returning(returning)
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "ticket_insert_failed")
                    Ok(ret) ->
                      case ret.rows {
                        [#(tid, pcode)] -> {
                          case
                            pog.query(
                              "insert into support_ticket_messages (ticket_id, author_type, body) values ($1::uuid, 'customer', $2) returning id::text",
                            )
                            |> pog.parameter(pog.text(tid))
                            |> pog.parameter(pog.text(payload.body))
                            |> pog.returning(row_dec.col0_string())
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "message_insert_failed")
                            Ok(_) -> {
                              let _ =
                                pog.query(
                                  "insert into support_ticket_events (ticket_id, event_type, payload_json) values ($1::uuid, 'created', '{}'::jsonb) returning id::text",
                                )
                                |> pog.parameter(pog.text(tid))
                                |> pog.returning(row_dec.col0_string())
                                |> pog.execute(ctx.db)
                              let out =
                                json.object([
                                  #("id", json.string(tid)),
                                  #("public_code", json.string(pcode)),
                                  #("status", json.string("open")),
                                ])
                                |> json.to_string
                              wisp.json_response(out, 201)
                            }
                          }
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
}

fn ticket_row_decoder() -> decode.Decoder(#(String, String, String, String, String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  use e <- decode.field(4, decode.string)
  use f <- decode.field(5, decode.string)
  decode.success(#(a, b, c, d, e, f))
}

pub fn list_tickets(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let email = case request.get_query(req) {
    Ok(q) -> list.key_find(q, "guest_email")
    Error(_) -> Error(Nil)
  }
  case email {
    Error(_) -> json_err(400, "guest_email_required")
    Ok(mail) ->
      case string.trim(mail) == "" {
        True -> json_err(400, "guest_email_required")
        False -> {
          case
            pog.query(
              "select id::text, public_code, subject, status, priority, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from support_tickets where lower(guest_email) = lower($1) order by created_at desc limit 50",
            )
            |> pog.parameter(pog.text(mail))
            |> pog.returning(ticket_row_decoder())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "list_failed")
            Ok(ret) -> {
              let items =
                list.map(ret.rows, fn(r) {
                  let #(id, code, subj, st, pr, ts) = r
                  json.object([
                    #("id", json.string(id)),
                    #("public_code", json.string(code)),
                    #("subject", json.string(subj)),
                    #("status", json.string(st)),
                    #("priority", json.string(pr)),
                    #("created_at", json.string(ts)),
                  ])
                })
              let body =
                json.object([#("tickets", json.array(from: items, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
      }
  }
}

fn ticket_detail_decoder() -> decode.Decoder(
  #(String, String, String, String, String, String, String),
) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  use e <- decode.field(4, decode.string)
  use f <- decode.field(5, decode.string)
  use g <- decode.field(6, decode.string)
  decode.success(#(a, b, c, d, e, f, g))
}

fn msg_row_decoder() -> decode.Decoder(#(String, String, String, String)) {
  use mid <- decode.field(0, decode.string)
  use at <- decode.field(1, decode.string)
  use bd <- decode.field(2, decode.string)
  use mts <- decode.field(3, decode.string)
  decode.success(#(mid, at, bd, mts))
}

pub fn get_ticket(_req: Request, ctx: Context, ticket_id: String) -> Response {
  case
    pog.query(
      "select id::text, public_code, subject, status, priority, guest_email, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from support_tickets where id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(ticket_id))
    |> pog.returning(ticket_detail_decoder())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "load_failed")
    Ok(ret) ->
      case ret.rows {
        [#(id, pcode, subj, st, pr, em, ts)] -> {
          let messages = case
            pog.query(
              "select id::text, author_type, body, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') from support_ticket_messages where ticket_id = $1::uuid and is_internal = false order by created_at",
            )
            |> pog.parameter(pog.text(ticket_id))
            |> pog.returning(msg_row_decoder())
            |> pog.execute(ctx.db)
          {
            Ok(mret) ->
              list.map(mret.rows, fn(m) {
                let #(mid, at, bd, mts) = m
                json.object([
                  #("id", json.string(mid)),
                  #("author_type", json.string(at)),
                  #("body", json.string(bd)),
                  #("created_at", json.string(mts)),
                ])
              })
            Error(_) -> []
          }
          let body =
            json.object([
              #("id", json.string(id)),
              #("public_code", json.string(pcode)),
              #("subject", json.string(subj)),
              #("status", json.string(st)),
              #("priority", json.string(pr)),
              #("guest_email", json.string(em)),
              #("created_at", json.string(ts)),
              #(
                "messages",
                json.array(from: messages, of: fn(x) { x }),
              ),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(404, "not_found")
      }
  }
}

fn add_message_decoder() -> decode.Decoder(String) {
  decode.field("body", decode.string, fn(b) { decode.success(b) })
}

pub fn add_message(req: Request, ctx: Context, ticket_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, add_message_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(text) ->
          case
            pog.query(
              "insert into support_ticket_messages (ticket_id, author_type, body) values ($1::uuid, 'customer', $2) returning id::text",
            )
            |> pog.parameter(pog.text(ticket_id))
            |> pog.parameter(pog.text(text))
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "message_failed")
            Ok(ret) ->
              case ret.rows {
                [mid] -> {
                  let _ =
                    pog.query(
                      "update support_tickets set status = case when status = 'resolved' then status else 'pending_agent' end, updated_at = now() where id = $1::uuid returning 1",
                    )
                    |> pog.parameter(pog.text(ticket_id))
                    |> pog.returning(decode_col0_int())
                    |> pog.execute(ctx.db)
                  let out =
                    json.object([
                      #("message_id", json.string(mid)),
                      #("ok", json.bool(True)),
                    ])
                    |> json.to_string
                  wisp.json_response(out, 201)
                }
                _ -> json_err(500, "unexpected")
              }
          }
      }
  }
}
