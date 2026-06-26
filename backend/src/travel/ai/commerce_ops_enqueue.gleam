//// Ticari İşletim Merkezi — ödeme onaylı rezervasyonlarda AI iş kuyruğu.

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/ai/commerce_ops_finalize
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec

const profile_post_booking = "post_booking_concierge"
const profile_owner = "commerce_owner_agent"
const profile_accounting = "commerce_accounting_agent"

const commerce_profiles = [
  profile_post_booking,
  profile_owner,
  profile_accounting,
]

fn commerce_ctx_row() -> decode.Decoder(
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
  ),
) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  use c <- decode.field(2, decode.string)
  use d <- decode.field(3, decode.string)
  use e <- decode.field(4, decode.string)
  use f <- decode.field(5, decode.string)
  use g <- decode.field(6, decode.string)
  use h <- decode.field(7, decode.string)
  use i <- decode.field(8, decode.string)
  use j <- decode.field(9, decode.string)
  use k <- decode.field(10, decode.string)
  use l <- decode.field(11, decode.string)
  use m <- decode.field(12, decode.string)
  use n <- decode.field(13, decode.string)
  decode.success(#(a, b, c, d, e, f, g, h, i, j, k, l, m, n))
}

fn build_input_json(
  reservation_id: String,
  event_type: String,
  row: #(
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
) -> String {
  let #(
    pub_code,
    guest_name,
    guest_email,
    guest_phone,
    starts_on,
    ends_on,
    listing_title,
    listing_id,
    category_code,
    location_label,
    currency_code,
    amount_paid,
    payment_status,
    payment_type,
  ) = row
  json.object([
    #("event_type", json.string(event_type)),
    #("reservation_id", json.string(reservation_id)),
    #("locale", json.string("tr")),
    #(
      "reservation",
      json.object([
        #("public_code", json.string(pub_code)),
        #("guest_name", json.string(guest_name)),
        #("guest_email", json.string(guest_email)),
        #("guest_phone", json.string(guest_phone)),
        #("starts_on", json.string(starts_on)),
        #("ends_on", json.string(ends_on)),
        #("payment_status", json.string(payment_status)),
        #("payment_type", json.string(payment_type)),
        #("amount_paid", json.string(amount_paid)),
        #("currency_code", json.string(currency_code)),
      ]),
    ),
    #(
      "listing",
      json.object([
        #("id", json.string(listing_id)),
        #("title", json.string(listing_title)),
        #("category_code", json.string(category_code)),
        #("location", json.string(location_label)),
      ]),
    ),
  ])
  |> json.to_string
}

fn job_exists_for_reservation(
  db: pog.Connection,
  profile_code: String,
  reservation_id: String,
) -> Bool {
  case
    pog.query(
      "select 1 from ai_jobs where profile_code = $1 and input_json->>'reservation_id' = $2 and status in ('queued','running','succeeded') limit 1",
    )
    |> pog.parameter(pog.text(profile_code))
    |> pog.parameter(pog.text(reservation_id))
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(db)
  {
    Error(_) -> False
    Ok(ret) -> ret.rows != []
  }
}

fn insert_queued_job(
  db: pog.Connection,
  profile_code: String,
  input_json: String,
) -> Result(String, String) {
  case
    pog.query(
      "insert into ai_jobs (profile_code, input_json, status) values ($1, $2::jsonb, 'queued') returning id::text",
    )
    |> pog.parameter(pog.text(profile_code))
    |> pog.parameter(pog.text(input_json))
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(db)
  {
    Error(_) -> Error("commerce_job_insert_failed")
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error("commerce_job_insert_empty")
      }
  }
}

fn load_reservation_commerce_context(
  db: pog.Connection,
  reservation_id: String,
) -> Result(
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
  ),
  String,
) {
  case
    pog.query(
      "select r.public_code::text, coalesce(r.guest_name,''), coalesce(r.guest_email,''), coalesce(r.guest_phone,''), coalesce(r.starts_on::text,''), coalesce(r.ends_on::text,''), coalesce(lt.title, l.slug, ''), r.listing_id::text, coalesce(pc.code::text,''), coalesce(nullif(trim(l.location_name),''), ''), coalesce(r.currency_code::text,'TRY'), coalesce(r.amount_paid::text,'0'), coalesce(r.payment_status::text,''), coalesce(r.payment_type::text,'') from reservations r join listings l on l.id = r.listing_id join product_categories pc on pc.id = l.category_id left join listing_translations lt on lt.listing_id = l.id and lt.locale_id = (select id from locales where lower(code) = 'tr' limit 1) where r.id = $1::uuid limit 1",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.returning(commerce_ctx_row())
    |> db_exec.execute(db)
  {
    Error(_) -> Error("reservation_context_failed")
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error("reservation_not_found")
      }
  }
}

/// Ödeme onaylandıktan sonra ticari AI işlerini kuyruğa alır (çalıştırmaz).
pub fn enqueue_commerce_ops_jobs(
  db: pog.Connection,
  reservation_id: String,
  event_type: String,
) -> Nil {
  let rid = string.trim(reservation_id)
  case rid == "" {
    True -> Nil
    False -> {
      let et = case string.trim(event_type) == "" {
        True -> "payment_confirmed"
        False -> string.trim(event_type)
      }
      case load_reservation_commerce_context(db, rid) {
        Error(_) -> Nil
        Ok(ctx_row) -> {
          let input_s = build_input_json(rid, et, ctx_row)
          list.each(commerce_profiles, fn(profile) {
            case job_exists_for_reservation(db, profile, rid) {
              True -> Nil
              False ->
                case insert_queued_job(db, profile, input_s) {
                  Ok(_) -> Nil
                  Error(_) -> Nil
                }
            }
          })
        }
      }
    }
  }
}

/// Ödeme onaylı rezervasyon: kuyruk + hemen işleme (checkout sonrası).
pub fn enqueue_commerce_ops_for_reservation(
  ctx: Context,
  reservation_id: String,
  event_type: String,
) -> Nil {
  enqueue_commerce_ops_jobs(ctx.db, reservation_id, event_type)
  let _ = run_due_commerce_jobs(ctx, 5)
  Nil
}

/// Kuyruktaki ticari profil işlerini işler (cron / manuel).
pub fn run_due_commerce_jobs(ctx: Context, limit: Int) -> Result(Int, String) {
  let lim = case limit < 1 {
    True -> 10
    False -> case limit > 50 {
      True -> 50
      False -> limit
    }
  }
  case
    pog.query(
      "select id::text, profile_code from ai_jobs where status = 'queued' and profile_code = any($1::text[]) order by created_at asc limit $2",
    )
    |> pog.parameter(pog.array(pog.text, commerce_profiles))
    |> pog.parameter(pog.int(lim))
    |> pog.returning({
      use id <- decode.field(0, decode.string)
      use pc <- decode.field(1, decode.string)
      decode.success(#(id, pc))
    })
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("commerce_jobs_query_failed")
    Ok(ret) -> {
      let n =
        list.fold(ret.rows, 0, fn(acc, pair) {
          let #(job_id, profile) = pair
          let rid =
            case
              pog.query(
                "select coalesce(input_json->>'reservation_id','') from ai_jobs where id = $1::uuid",
              )
              |> pog.parameter(pog.text(job_id))
              |> pog.returning(row_dec.col0_string())
              |> db_exec.execute(ctx.db)
            {
              Error(_) -> ""
              Ok(r) ->
                case r.rows {
                  [s] -> s
                  _ -> ""
                }
            }
          case ai_job_run.run_ai_job(ctx, job_id) {
            Ok(Nil) -> {
              let _ =
                commerce_ops_finalize.finalize_commerce_job(
                  ctx.db,
                  job_id,
                  profile,
                  rid,
                )
              acc + 1
            }
            Error(_) -> acc
          }
        })
      Ok(n)
    }
  }
}
