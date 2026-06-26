//// Operasyon Merkezi — mevcut rezervasyon/provizyon/chat verilerinden görev özeti.

import backend/context.{type Context}
import gleam/http
import pog
import travel/db/resilient_pog as db_exec
import travel/db/decode_helpers as row_dec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  wisp.json_response("{\"error\":\"" <> msg <> "\"}", status)
}

pub fn overview(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(overview_sql)
        |> pog.returning(row_dec.col0_string())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "operations_overview_failed")
        Ok(ret) ->
          case ret.rows {
            [body] -> wisp.json_response(body, 200)
            _ -> json_err(500, "unexpected_rows")
          }
      }
    }
  }
}

const overview_sql: String = "
select jsonb_build_object(
  'counts', jsonb_build_object(
    'pending_reservations', (
      select count(*)::int
      from reservations
      where status in ('inquiry', 'held')
    ),
    'payment_pending', (
      select count(*)::int
      from reservations
      where payment_status in ('held', 'pending_confirm')
    ),
    'supplier_pending', (
      select count(*)::int
      from reservations
      where payment_status in ('held', 'pending_confirm')
        and supplier_confirmed_at is null
    ),
    'overdue_provizyon', (
      select count(*)::int
      from reservations
      where payment_status in ('held', 'pending_confirm')
        and supplier_confirm_deadline is not null
        and supplier_confirm_deadline < now()
    ),
    'open_escalations', (
      select count(*)::int
      from reservation_escalations
      where status = 'open'
    ),
    'open_chats', (
      select count(*)::int
      from chat_sessions
      where closed_at is null
    ),
    'pending_transfers', (
      select count(*)::int
      from supplier_transfers
      where status in ('pending', 'processing')
    )
  ),
  'tasks', jsonb_build_object(
    'upcoming', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select
          r.id::text as id,
          r.public_code,
          case
            when r.starts_on between current_date and current_date + interval '3 days' then 'checkin'
            else 'checkout'
          end as task_type,
          coalesce(r.guest_name, '') as guest_name,
          coalesce(lt.title, l.slug, '') as listing_title,
          coalesce(r.starts_on::text, '') as starts_on,
          coalesce(r.ends_on::text, '') as ends_on,
          r.status,
          r.payment_status
        from reservations r
        join listings l on l.id = r.listing_id
        left join (
          select lt.listing_id, lt.title
          from listing_translations lt
          join locales loc on loc.id = lt.locale_id and lower(loc.code) = 'tr'
        ) lt on lt.listing_id = l.id
        where r.status not in ('cancelled', 'completed')
          and (
            r.starts_on between current_date and current_date + interval '3 days'
            or r.ends_on between current_date and current_date + interval '3 days'
          )
        order by least(r.starts_on, r.ends_on), r.created_at desc
        limit 8
      ) t
    ),
    'supplier_deadlines', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select
          r.id::text as id,
          r.public_code,
          coalesce(r.guest_name, '') as guest_name,
          coalesce(lt.title, l.slug, '') as listing_title,
          coalesce(r.supplier_confirm_deadline::text, '') as due_at,
          r.payment_status,
          (r.supplier_confirm_deadline is not null and r.supplier_confirm_deadline < now()) as is_overdue
        from reservations r
        join listings l on l.id = r.listing_id
        left join (
          select lt.listing_id, lt.title
          from listing_translations lt
          join locales loc on loc.id = lt.locale_id and lower(loc.code) = 'tr'
        ) lt on lt.listing_id = l.id
        where r.payment_status in ('held', 'pending_confirm')
          and r.supplier_confirmed_at is null
        order by r.supplier_confirm_deadline nulls first, r.created_at desc
        limit 8
      ) t
    ),
    'payment_transfers', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select
          st.id::text as id,
          r.public_code,
          st.transfer_type as task_type,
          st.status,
          coalesce(st.amount::text, '0') as amount,
          st.currency_code,
          coalesce(st.scheduled_at::text, '') as due_at,
          coalesce(r.guest_name, '') as guest_name
        from supplier_transfers st
        join reservations r on r.id = st.reservation_id
        where st.status in ('pending', 'processing')
        order by st.scheduled_at nulls first, st.created_at desc
        limit 8
      ) t
    ),
    'escalations', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select
          e.id::text as id,
          r.public_code,
          e.reason,
          e.status,
          coalesce(e.escalated_at::text, '') as due_at,
          coalesce(e.staff_note, '') as note
        from reservation_escalations e
        join reservations r on r.id = e.reservation_id
        where e.status = 'open'
        order by e.escalated_at desc
        limit 8
      ) t
    ),
    'chats', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select
          cs.id::text as id,
          cs.ai_mode,
          coalesce(cs.locale, 'tr') as locale,
          cs.started_at::text as started_at,
          coalesce(last_msg.body, '') as last_message
        from chat_sessions cs
        left join lateral (
          select cm.body
          from chat_messages cm
          where cm.session_id = cs.id
          order by cm.id desc
          limit 1
        ) last_msg on true
        where cs.closed_at is null
        order by cs.started_at desc
        limit 8
      ) t
    )
  ),
  'generated_at', now()::text
)::text
"
