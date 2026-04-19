//// Süper Ev Sahibi — Faz G.
////
//// Endpoint'ler:
////   POST /api/v1/admin/super-host/recompute
////     Tüm organizasyonlar için organization_metrics tablosunu listings/reservations
////     verisinden yeniden hesaplar; eşikleri sağlayanları is_super_host=true yapar.
////   PATCH /api/v1/admin/organizations/:id/super-host { active }
////     Manuel toggle (admin override).
////
//// Kriterler (Booking/Airbnb tarzı):
////   - avg_rating              >= 4.7  (listings.review_avg ortalaması)
////   - completed_bookings_12mo >= 10
////   - cancellation_rate       <= 1.0% (yuvarlak)
////
//// Response time + reviews count sayıları placeholder; ileride messaging tablosundan
//// dolduracak şekilde tasarlandı.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/result
import pog
import travel/identity/admin_gate
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

const recompute_sql: String = "
with org_stats as (
  select o.id as org_id,
    coalesce(
      (select avg(rv.rating)::numeric(3,2)
         from reviews rv
         join listings l2 on l2.id = rv.entity_id
         where rv.entity_type = 'listing'
           and rv.status = 'approved'
           and l2.organization_id = o.id
      ), 0
    )::numeric(3,2) as avg_rating,
    coalesce(
      (select count(*)::int
         from reviews rv2
         join listings l3 on l3.id = rv2.entity_id
         where rv2.entity_type = 'listing'
           and rv2.status = 'approved'
           and l3.organization_id = o.id
      ), 0
    )::int as total_reviews,
    coalesce(
      (select count(*) from reservations r
        join listings l4 on l4.id = r.listing_id
        where l4.organization_id = o.id
          and r.status = 'confirmed'
          and r.created_at > now() - interval '12 months'
      ), 0
    )::int as completed_bookings_12mo,
    coalesce(
      (select case when count(*) = 0 then 0
               else (sum(case when r2.status = 'cancelled' then 1 else 0 end) * 100.0 / count(*))
              end
         from reservations r2
         join listings l5 on l5.id = r2.listing_id
         where l5.organization_id = o.id
           and r2.created_at > now() - interval '12 months'
      ), 0
    )::numeric(5,2) as cancellation_rate
  from organizations o
)
insert into organization_metrics
  (organization_id, avg_rating, total_reviews, completion_rate, cancellation_rate, response_time_hours, completed_bookings_12mo, calculated_at)
select org_id, avg_rating, total_reviews,
       greatest(0, 100.0 - cancellation_rate)::numeric(5,2) as completion_rate,
       cancellation_rate,
       0,
       completed_bookings_12mo,
       now()
from org_stats
on conflict (organization_id) do update set
  avg_rating = excluded.avg_rating,
  total_reviews = excluded.total_reviews,
  completion_rate = excluded.completion_rate,
  cancellation_rate = excluded.cancellation_rate,
  completed_bookings_12mo = excluded.completed_bookings_12mo,
  calculated_at = now()
"

const promote_sql: String = "
update organizations o
set is_super_host = (
  m.avg_rating >= 4.7
  and m.completed_bookings_12mo >= 10
  and m.cancellation_rate <= 1.0
),
super_host_since = case
  when (m.avg_rating >= 4.7 and m.completed_bookings_12mo >= 10 and m.cancellation_rate <= 1.0)
    and o.is_super_host = false then now()
  when not (m.avg_rating >= 4.7 and m.completed_bookings_12mo >= 10 and m.cancellation_rate <= 1.0)
    then null
  else o.super_host_since
end
from organization_metrics m
where m.organization_id = o.id
"

pub fn recompute_all(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(recompute_sql)
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "metrics_failed")
        Ok(_) ->
          case
            pog.query(promote_sql)
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "promote_failed")
            Ok(_) -> {
              let body =
                json.object([
                  #("ok", json.bool(True)),
                  #("message", json.string("Metrikler yenilendi ve süper ev sahibi rozetleri güncellendi.")),
                ])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
      }
    }
  }
}

fn toggle_decoder() -> decode.Decoder(Bool) {
  decode.field("active", decode.bool, fn(b) { decode.success(b) })
}

/// GET /api/v1/admin/super-host/organizations
/// Adminin gözden geçireceği tablo: tüm organizasyonlar + son metrikler + rozet durumu.
pub fn list_organizations(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query(
          "select o.id::text, coalesce(o.name,''), o.is_super_host, coalesce(to_char(o.super_host_since, 'YYYY-MM-DD'),''), coalesce(m.avg_rating::text,'0'), coalesce(m.total_reviews::text,'0'), coalesce(m.completion_rate::text,'0'), coalesce(m.cancellation_rate::text,'0'), coalesce(m.completed_bookings_12mo::text,'0'), coalesce(to_char(m.calculated_at, 'YYYY-MM-DD HH24:MI'),'') from organizations o left join organization_metrics m on m.organization_id = o.id order by o.is_super_host desc nulls last, m.avg_rating desc nulls last, o.name asc limit 500",
        )
        |> pog.returning({
          use id <- decode.field(0, decode.string)
          use name <- decode.field(1, decode.string)
          use is_sh <- decode.field(2, decode.bool)
          use sh_since <- decode.field(3, decode.string)
          use avg_r <- decode.field(4, decode.string)
          use total_r <- decode.field(5, decode.string)
          use comp_r <- decode.field(6, decode.string)
          use canc_r <- decode.field(7, decode.string)
          use comp_b <- decode.field(8, decode.string)
          use calc_at <- decode.field(9, decode.string)
          decode.success(#(
            id,
            name,
            is_sh,
            sh_since,
            avg_r,
            total_r,
            comp_r,
            canc_r,
            comp_b,
            calc_at,
          ))
        })
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "list_failed")
        Ok(r) -> {
          let arr =
            r.rows
            |> list.map(fn(row) {
              let #(
                id,
                name,
                is_sh,
                sh_since,
                avg_r,
                total_r,
                comp_r,
                canc_r,
                comp_b,
                calc_at,
              ) = row
              json.object([
                #("id", json.string(id)),
                #("name", json.string(name)),
                #("is_super_host", json.bool(is_sh)),
                #("super_host_since", json.string(sh_since)),
                #("avg_rating", json.string(avg_r)),
                #("total_reviews", json.string(total_r)),
                #("completion_rate", json.string(comp_r)),
                #("cancellation_rate", json.string(canc_r)),
                #("completed_bookings_12mo", json.string(comp_b)),
                #("calculated_at", json.string(calc_at)),
              ])
            })
          let body =
            json.object([
              #("organizations", json.array(from: arr, of: fn(x) { x })),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
  }
}

pub fn manual_toggle(req: Request, ctx: Context, org_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, toggle_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(active) ->
              case
                pog.query(
                  "update organizations set is_super_host = $1, super_host_since = case when $1 = true and is_super_host = false then now() when $1 = false then null else super_host_since end where id = $2::uuid",
                )
                |> pog.parameter(pog.bool(active))
                |> pog.parameter(pog.text(org_id))
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(500, "toggle_failed")
                Ok(_) -> wisp.json_response("{\"ok\":true}", 200)
              }
          }
      }
  }
}
