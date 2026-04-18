//// Provizyon (Escrow) Yönetimi — Tedarikçi onayı, eskalasyon, transfer takibi.
////
//// Endpoint gruplaması:
////   Tedarikçi (token tabanlı, auth gerektirmez):
////     GET  /api/v1/provizyon/:token           — rezervasyon detayı + ödeme cetveli
////     POST /api/v1/provizyon/:token/confirm    — onayla
////     POST /api/v1/provizyon/:token/cancel     — reddet
////
////   Tedarikçi (auth gerekli):
////     GET  /api/v1/supplier/reservations       — tedarikçinin tüm rezervasyonları
////
////   Admin:
////     GET  /api/v1/admin/provizyon             — tüm provizyon listesi (filtreli)
////     POST /api/v1/admin/provizyon/check-deadlines — deadline kontrolü + eskalasyon
////     GET  /api/v1/admin/escalations           — açık eskalasyonlar
////     PATCH /api/v1/admin/escalations/:id/resolve — eskalasyon çözümü
////     POST /api/v1/admin/provizyon/:id/transfer   — transfer kaydı

import backend/context.{type Context}
import travel/ai/ops_agent_enqueue
import travel/booking/commission_accrual_sync as commission_accrual_sync
import travel/booking/supplier_notification
import travel/identity/admin_gate
import travel/identity/permissions
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request as http_request
import gleam/json
import gleam/list
import gleam/option.{None, Some}
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

/// `listing_translations` — `locale_id` → `locales`; `locale_code` kolonu yok.
fn listing_title_left_join_tr() -> String {
  " left join ( select lt.listing_id, lt.title from listing_translations lt "
  <> " inner join locales loc on loc.id = lt.locale_id and lower(loc.code) = 'tr' ) lt on lt.listing_id = l.id "
}

/// `admin.users.read` — `identity` izin matrisi / `admin_gate` ile uyumlu (user_permissions tablosu yok).
fn require_admin(
  req: Request,
  ctx: Context,
  next: fn() -> Response,
) -> Response {
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> next()
  }
}

// ─── Ortak: rezervasyon satırı decoder ────────────────────────────────────────

fn provizyon_row() -> decode.Decoder(
  #(
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    String,
  ),
) {
  use id <- decode.field(0, decode.string)
  use public_code <- decode.field(1, decode.string)
  use status <- decode.field(2, decode.string)
  use payment_status <- decode.field(3, decode.string)
  use payment_type <- decode.field(4, decode.string)
  use guest_name <- decode.field(5, decode.string)
  use starts_on <- decode.field(6, decode.string)
  use ends_on <- decode.field(7, decode.string)
  use amount_paid <- decode.field(8, decode.string)
  use commission_amount <- decode.field(9, decode.string)
  use supplier_prepaid <- decode.field(10, decode.string)
  use guest_due <- decode.field(11, decode.string)
  use deadline <- decode.field(12, decode.string)
  use listing_title <- decode.field(13, decode.string)
  use schedule_json <- decode.field(14, decode.string)
  use created_at <- decode.field(15, decode.string)
  decode.success(#(
    id,
    public_code,
    status,
    payment_status,
    payment_type,
    guest_name,
    starts_on,
    ends_on,
    amount_paid,
    commission_amount,
    supplier_prepaid,
    guest_due,
    deadline,
    listing_title,
    schedule_json,
    created_at,
  ))
}

fn provizyon_sql_columns() -> String {
  "r.id::text, r.public_code, r.status, r.payment_status, r.payment_type, "
  <> "coalesce(r.guest_name, ''), coalesce(r.starts_on::text, ''), coalesce(r.ends_on::text, ''), "
  <> "coalesce(r.amount_paid::text, '0'), coalesce(r.commission_amount::text, '0'), coalesce(r.supplier_prepaid_amount::text, '0'), "
  <> "coalesce(r.guest_due_at_checkin::text, '0'), coalesce(r.supplier_confirm_deadline::text, ''), "
  <> "coalesce(lt.title, l.slug, ''), coalesce(r.payment_schedule_json::text, '{}'), "
  <> "to_char(r.created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')"
}

fn row_to_json(row: #(String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String)) -> json.Json {
  let #(
    id,
    public_code,
    status,
    payment_status,
    payment_type,
    guest_name,
    starts_on,
    ends_on,
    amount_paid,
    commission_amount,
    supplier_prepaid,
    guest_due,
    deadline,
    listing_title,
    schedule_json,
    created_at,
  ) = row
  json.object([
    #("id", json.string(id)),
    #("public_code", json.string(public_code)),
    #("status", json.string(status)),
    #("payment_status", json.string(payment_status)),
    #("payment_type", json.string(payment_type)),
    #("guest_name", json.string(guest_name)),
    #("starts_on", json.string(starts_on)),
    #("ends_on", json.string(ends_on)),
    #("amount_paid", json.string(amount_paid)),
    #("commission_amount", json.string(commission_amount)),
    #("supplier_prepaid_amount", json.string(supplier_prepaid)),
    #("guest_due_at_checkin", json.string(guest_due)),
    #("supplier_confirm_deadline", json.string(deadline)),
    #("listing_title", json.string(listing_title)),
    #("payment_schedule_json", json.string(schedule_json)),
    #("created_at", json.string(created_at)),
  ])
}

// ─── TEDARİKÇİ — Token tabanlı ────────────────────────────────────────────────

/// GET /api/v1/provizyon/:token — Tedarikçi rezervasyonu görüntüler
pub fn get_by_token(
  req: Request,
  ctx: Context,
  token: String,
) -> Response {
  use <- wisp.require_method(req, http.Get)
  let sql =
    "select "
    <> provizyon_sql_columns()
    <> " from reservations r "
    <> " join listings l on l.id = r.listing_id "
    <> listing_title_left_join_tr()
    <> " where r.supplier_confirm_token = $1 limit 1"
  case
    pog.query(sql)
    |> pog.parameter(pog.text(string.trim(token)))
    |> pog.returning(provizyon_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "load_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [row] ->
          wisp.json_response(
            json.object([#("reservation", row_to_json(row))]) |> json.to_string,
            200,
          )
        _ -> json_err(500, "unexpected")
      }
  }
}

fn decode_cancel_body() -> decode.Decoder(String) {
  decode.optional_field("note", "", decode.string, fn(note) {
    decode.success(string.trim(note))
  })
}

/// POST /api/v1/provizyon/:token/confirm — Tedarikçi onaylar
pub fn supplier_confirm(
  req: Request,
  ctx: Context,
  token: String,
) -> Response {
  use <- wisp.require_method(req, http.Post)
  case
    pog.transaction(ctx.db, fn(conn) {
      case
        pog.query(
          "update reservations set status = 'confirmed', payment_status = 'supplier_notified', supplier_confirmed_at = now() where supplier_confirm_token = $1 and payment_status in ('held', 'pending_confirm') and exists (select 1 from payments p where p.reservation_id = reservations.id and p.status = 'captured') returning id::text, public_code",
        )
        |> pog.parameter(pog.text(string.trim(token)))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          use b <- decode.field(1, decode.string)
          decode.success(#(a, b))
        })
        |> pog.execute(conn)
      {
        Error(_) -> Error("update_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> Error("not_found_or_already_processed")
            [#(rid, pcode)] -> {
              let _ =
                pog.query(
                  "insert into reservation_events (reservation_id, event_type, payload_json) values ($1::uuid, 'supplier_confirmed', '{}'::jsonb)",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.execute(conn)
              Ok(#(rid, pcode))
            }
            _ -> Error("unexpected")
          }
      }
    })
  {
    Ok(#(rid, pcode)) -> {
      let _ = commission_accrual_sync.sync_reservation(ctx.db, rid)
      // Müşteriye onay bildirimi gönder
      let _ = supplier_notification.notify_reservation_confirmed(ctx.db, rid)
      let body =
        json.object([
          #("ok", json.bool(True)),
          #("reservation_id", json.string(rid)),
          #("public_code", json.string(pcode)),
          #("message", json.string("Rezervasyon onaylandı.")),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
    Error(pog.TransactionRolledBack("not_found_or_already_processed")) ->
      json_err(404, "not_found_or_already_processed")
    Error(_) -> json_err(500, "confirm_failed")
  }
}

/// POST /api/v1/provizyon/:token/cancel — Tedarikçi reddeder
pub fn supplier_cancel(
  req: Request,
  ctx: Context,
  token: String,
) -> Response {
  use <- wisp.require_method(req, http.Post)
  let note = case read_body_string(req) {
    Error(_) -> ""
    Ok(body) ->
      case json.parse(body, decode_cancel_body()) {
        Ok(n) -> n
        Error(_) -> ""
      }
  }
  case
    pog.transaction(ctx.db, fn(conn) {
      case
        pog.query(
          "update reservations set payment_status = 'disputed', supplier_cancel_note = $2 where supplier_confirm_token = $1 and payment_status in ('held', 'pending_confirm') returning id::text, public_code",
        )
        |> pog.parameter(pog.text(string.trim(token)))
        |> pog.parameter(pog.text(note))
        |> pog.returning({
          use a <- decode.field(0, decode.string)
          use b <- decode.field(1, decode.string)
          decode.success(#(a, b))
        })
        |> pog.execute(conn)
      {
        Error(_) -> Error("update_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> Error("not_found_or_already_processed")
            [#(rid, pcode)] -> {
              // Eskalasyon oluştur
              let _ =
                pog.query(
                  "insert into reservation_escalations (reservation_id, reason) values ($1::uuid, 'supplier_cancelled')",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.execute(conn)
              let _ =
                pog.query(
                  "insert into reservation_events (reservation_id, event_type, payload_json) values ($1::uuid, 'supplier_cancelled', $2::jsonb)",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.parameter(pog.text(
                  json.object([#("note", json.string(note))]) |> json.to_string,
                ))
                |> pog.execute(conn)
              Ok(#(rid, pcode))
            }
            _ -> Error("unexpected")
          }
      }
    })
  {
    Ok(#(rid, pcode)) -> {
      // Müşteriye iptal bildirimi gönder
      let _ = supplier_notification.notify_reservation_cancelled_by_supplier(
        ctx.db, rid, note,
      )
      // Operasyon ajanı (sohbet dışı): otomatik özet / alternatif ilan önerisi
      let _ =
        case ops_agent_enqueue.enqueue_ops_agent_job(ctx, rid, "supplier_cancelled", True) {
          Ok(_) -> Nil
          Error(_) -> Nil
        }
      let body =
        json.object([
          #("ok", json.bool(True)),
          #("public_code", json.string(pcode)),
          #("message", json.string("Rezervasyon reddedildi, müşteri temsilcisi bilgilendirildi.")),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
    Error(pog.TransactionRolledBack("not_found_or_already_processed")) ->
      json_err(404, "not_found_or_already_processed")
    Error(_) -> json_err(500, "cancel_failed")
  }
}

/// GET /api/v1/supplier/reservations — Tedarikçinin ilanlarına gelen rezervasyonlar
pub fn list_supplier_reservations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) -> {
      let sql =
        "select "
        <> provizyon_sql_columns()
        <> " from reservations r "
        <> " join listings l on l.id = r.listing_id "
        <> listing_title_left_join_tr()
        <> " where l.organization_id in ("
        <> "   select ur.organization_id from user_roles ur "
        <> "   join roles ro on ro.id = ur.role_id "
        <> "   where ur.user_id = $1::uuid and ro.code = 'supplier' and ur.organization_id is not null"
        <> " ) "
        <> " order by r.created_at desc limit 100"
      case
        pog.query(sql)
        |> pog.parameter(pog.text(uid))
        |> pog.returning(provizyon_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(ret) -> {
          let arr = list.map(ret.rows, row_to_json)
          let body =
            json.object([#("reservations", json.preprocessed_array(arr))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

// ─── ADMİN ────────────────────────────────────────────────────────────────────

/// GET /api/v1/admin/provizyon?status=held&limit=50
pub fn admin_list(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  use <- require_admin(req, ctx)
  let query_params = case http_request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let status_filter = case list.key_find(query_params, "status") {
    Ok(s) -> string.trim(s)
    Error(_) -> ""
  }
  let where_clause = case status_filter == "" {
    True -> " where r.payment_status in ('held', 'pending_confirm', 'supplier_notified') "
    False -> " where r.payment_status = '" <> status_filter <> "' "
  }
  let sql =
    "select "
    <> provizyon_sql_columns()
    <> " from reservations r "
    <> " join listings l on l.id = r.listing_id "
    <> listing_title_left_join_tr()
    <> where_clause
    <> " order by r.created_at desc limit 200"
  case
    pog.query(sql)
    |> pog.returning(provizyon_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "list_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, row_to_json)
      let body =
        json.object([
          #("reservations", json.preprocessed_array(arr)),
          #("count", json.int(list.length(arr))),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// POST /api/v1/admin/provizyon/check-deadlines — Süresi geçenleri eskalasyona al
pub fn admin_check_deadlines(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  use <- require_admin(req, ctx)
  case
    pog.query(
      "select id::text, public_code from reservations where payment_status in ('held', 'pending_confirm') and supplier_confirm_deadline < now() and escalated_at is null",
    )
    |> pog.returning({
      use a <- decode.field(0, decode.string)
      use b <- decode.field(1, decode.string)
      decode.success(#(a, b))
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "check_failed")
    Ok(ret) -> {
      let escalated =
        list.filter_map(ret.rows, fn(row) {
          let #(rid, pcode) = row
          case
            pog.transaction(ctx.db, fn(conn) {
              let _ =
                pog.query(
                  "update reservations set escalated_at = now(), payment_status = 'disputed' where id = $1::uuid",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.execute(conn)
              let _ =
                pog.query(
                  "insert into reservation_escalations (reservation_id, reason) values ($1::uuid, 'supplier_no_confirm') on conflict do nothing",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.execute(conn)
              let _ =
                pog.query(
                  "insert into reservation_events (reservation_id, event_type, payload_json) values ($1::uuid, 'auto_escalated', '{}'::jsonb)",
                )
                |> pog.parameter(pog.text(rid))
                |> pog.execute(conn)
              // Tedarikçiye son uyarı gönder
              let _ = supplier_notification.notify_supplier_deadline_warning(ctx.db, rid)
              Ok(pcode)
            })
          {
            Ok(pc) -> {
              let _ =
                case
                  ops_agent_enqueue.enqueue_ops_agent_job(
                    ctx,
                    rid,
                    "supplier_no_confirm_deadline",
                    True,
                  )
                {
                  Ok(_) -> Nil
                  Error(_) -> Nil
                }
              Ok(pc)
            }
            Error(_) -> Error(Nil)
          }
        })
      let body =
        json.object([
          #("escalated_count", json.int(list.length(escalated))),
          #(
            "escalated_codes",
            json.preprocessed_array(list.map(escalated, json.string)),
          ),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn escalation_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String),
) {
  use id <- decode.field(0, decode.string)
  use res_id <- decode.field(1, decode.string)
  use public_code <- decode.field(2, decode.string)
  use reason <- decode.field(3, decode.string)
  use status <- decode.field(4, decode.string)
  use assigned_to <- decode.field(5, decode.string)
  use listing_title <- decode.field(6, decode.string)
  use escalated_at <- decode.field(7, decode.string)
  decode.success(#(
    id,
    res_id,
    public_code,
    reason,
    status,
    assigned_to,
    listing_title,
    escalated_at,
  ))
}

/// GET /api/v1/admin/escalations?status=open
pub fn admin_list_escalations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  use <- require_admin(req, ctx)
  let query_params = case http_request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let status_f = case list.key_find(query_params, "status") {
    Ok(s) -> string.trim(s)
    Error(_) -> "open"
  }
  let sql =
    "select e.id::text, e.reservation_id::text, r.public_code, e.reason, e.status, "
    <> "coalesce(e.assigned_to::text, ''), "
    <> "coalesce(lt.title, l.slug, ''), "
    <> "to_char(e.escalated_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') "
    <> "from reservation_escalations e "
    <> "join reservations r on r.id = e.reservation_id "
    <> "join listings l on l.id = r.listing_id "
    <> listing_title_left_join_tr()
    <> "where e.status = $1 "
    <> "order by e.escalated_at desc limit 100"
  case
    pog.query(sql)
    |> pog.parameter(pog.text(status_f))
    |> pog.returning(escalation_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "list_failed")
    Ok(ret) -> {
      let arr =
        list.map(ret.rows, fn(row) {
          let #(id, res_id, public_code, reason, status, assigned_to, listing_title, escalated_at) =
            row
          json.object([
            #("id", json.string(id)),
            #("reservation_id", json.string(res_id)),
            #("public_code", json.string(public_code)),
            #("reason", json.string(reason)),
            #("status", json.string(status)),
            #("assigned_to", json.string(assigned_to)),
            #("listing_title", json.string(listing_title)),
            #("escalated_at", json.string(escalated_at)),
          ])
        })
      let body =
        json.object([#("escalations", json.preprocessed_array(arr))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

fn resolve_escalation_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("status", decode.string, fn(status) {
    decode.optional_field("note", "", decode.string, fn(note) {
      decode.optional_field("assigned_to", "", decode.string, fn(assigned_to) {
        decode.success(#(status, string.trim(note), string.trim(assigned_to)))
      })
    })
  })
}

/// PATCH /api/v1/admin/escalations/:id/resolve
pub fn admin_resolve_escalation(
  req: Request,
  ctx: Context,
  esc_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  use <- require_admin(req, ctx)
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, resolve_escalation_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(status, note, assigned_to)) -> {
          let valid_status = case status {
            "resolved_alternative" -> True
            "resolved_refund" -> True
            "cancelled" -> True
            _ -> False
          }
          case valid_status {
            False -> json_err(400, "invalid_status")
            True -> {
              let assigned_param = case assigned_to == "" {
                True -> pog.null()
                False -> pog.text(assigned_to)
              }
              case
                pog.query(
                  "update reservation_escalations set status = $2, staff_note = $3, assigned_to = $4, resolved_at = now() where id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(esc_id))
                |> pog.parameter(pog.text(status))
                |> pog.parameter(pog.text(note))
                |> pog.parameter(assigned_param)
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "resolve_failed")
                Ok(ret) ->
                  case ret.rows {
                    [] -> json_err(404, "not_found")
                    [_] ->
                      wisp.json_response(
                        json.object([#("ok", json.bool(True))])
                          |> json.to_string,
                        200,
                      )
                    _ -> json_err(500, "unexpected")
                  }
              }
            }
          }
        }
      }
  }
}

fn transfer_decoder() -> decode.Decoder(#(String, String, String)) {
  decode.field("transfer_type", decode.string, fn(tt) {
    decode.field("amount", decode.string, fn(amount) {
      decode.optional_field("notes", "", decode.string, fn(notes) {
        decode.success(#(tt, string.trim(amount), string.trim(notes)))
      })
    })
  })
}

/// POST /api/v1/admin/provizyon/:id/transfer — Transfer kaydı ekle
pub fn admin_add_transfer(
  req: Request,
  ctx: Context,
  res_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Post)
  use <- require_admin(req, ctx)
  let staff_id_opt = case permissions.session_user_from_request(req, ctx.db) {
    Ok(uid) -> Some(uid)
    Error(_) -> None
  }
  case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, transfer_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(transfer_type, amount, notes)) -> {
          let valid_type = case transfer_type {
            "checkin_prepaid" -> True
            "balance_final" -> True
            "commission_hold" -> True
            "refund_to_guest" -> True
            _ -> False
          }
          case valid_type {
            False -> json_err(400, "invalid_transfer_type")
            True -> {
              let staff_param = case staff_id_opt {
                Some(uid) -> pog.text(uid)
                None -> pog.null()
              }
              case
                pog.query(
                  "insert into supplier_transfers (reservation_id, transfer_type, amount, currency_code, status, created_by, notes, scheduled_at) select $1::uuid, $2, $3::numeric, r.currency_code, 'pending', $4, $5, now() from reservations r where r.id = $1::uuid returning id::text",
                )
                |> pog.parameter(pog.text(res_id))
                |> pog.parameter(pog.text(transfer_type))
                |> pog.parameter(pog.text(amount))
                |> pog.parameter(staff_param)
                |> pog.parameter(pog.text(notes))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "insert_failed")
                Ok(ret) ->
                  case ret.rows {
                    [tid] ->
                      wisp.json_response(
                        json.object([
                          #("ok", json.bool(True)),
                          #("transfer_id", json.string(tid)),
                        ])
                          |> json.to_string,
                        201,
                      )
                    _ -> json_err(404, "reservation_not_found")
                  }
              }
            }
          }
        }
      }
  }
}

/// PATCH /api/v1/admin/provizyon/transfers/:id/complete — Transfer tamamlandı
pub fn admin_complete_transfer(
  req: Request,
  ctx: Context,
  transfer_id: String,
) -> Response {
  use <- wisp.require_method(req, http.Patch)
  use <- require_admin(req, ctx)
  let ref = case read_body_string(req) {
    Error(_) -> ""
    Ok(body) ->
      case json.parse(body, decode.optional_field("reference", "", decode.string, fn(r) { decode.success(r) })) {
        Ok(r) -> string.trim(r)
        Error(_) -> ""
      }
  }
  case
    pog.query(
      "update supplier_transfers set status = 'completed', completed_at = now(), reference = $2 where id = $1::uuid returning id::text",
    )
    |> pog.parameter(pog.text(transfer_id))
    |> pog.parameter(pog.text(ref))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "update_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [_] ->
          wisp.json_response(
            json.object([#("ok", json.bool(True))]) |> json.to_string,
            200,
          )
        _ -> json_err(500, "unexpected")
      }
  }
}
