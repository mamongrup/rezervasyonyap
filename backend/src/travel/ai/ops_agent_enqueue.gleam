//// Rezervasyon bağlamı + benzer ilanlar → `ops_agent` işi (manuel API ve olay tetikleyicileri).

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec

fn ops_res_ctx_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String, String, String, String, String),
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
  decode.success(#(a, b, c, d, e, f, g, h, i, j, k))
}

fn ops_sim_row() -> decode.Decoder(#(String, String)) {
  use a <- decode.field(0, decode.string)
  use b <- decode.field(1, decode.string)
  decode.success(#(a, b))
}

/// Rezervasyon + benzer ilanlarla `ops_agent` işi oluşturur; `run_now` ise hemen çalıştırır.
pub fn enqueue_ops_agent_job(
  ctx: Context,
  reservation_id: String,
  event_type: String,
  run_now: Bool,
) -> Result(String, String) {
  let rid = string.trim(reservation_id)
  let et = case string.trim(event_type) == "" {
    True -> "manual"
    False -> string.trim(event_type)
  }
  case rid == "" {
    True -> Error("reservation_id_required")
    False ->
      case
        pog.query(
          "select r.public_code::text, r.payment_status::text, r.payment_type::text, coalesce(r.guest_name,''), coalesce(r.guest_email,''), coalesce(r.amount_paid::text,'0'), coalesce(r.starts_on::text,''), coalesce(r.ends_on::text,''), coalesce(lt.title, l.slug, ''), r.listing_id::text, coalesce(r.supplier_confirm_deadline::text,'') from reservations r join listings l on l.id = r.listing_id left join listing_translations lt on lt.listing_id = l.id and lt.locale_id = (select id from locales where lower(code) = 'tr' limit 1) where r.id = $1::uuid limit 1",
        )
        |> pog.parameter(pog.text(rid))
        |> pog.returning(ops_res_ctx_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> Error("reservation_context_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> Error("reservation_not_found")
            [#(pub_code, pstat, ptype, gn, ge, ap, s1, s2, ltitle, lid, ddl)] -> {
              case
                pog.query(
                  "select l2.id::text, coalesce(lt2.title, l2.slug, '') from listings l2 left join listing_translations lt2 on lt2.listing_id = l2.id and lt2.locale_id = (select id from locales where lower(code) = 'tr' limit 1) where l2.organization_id = (select organization_id from listings where id = $1::uuid) and l2.category_id = (select category_id from listings where id = $1::uuid) and l2.id <> $1::uuid and l2.status = 'published' order by l2.updated_at desc limit 5",
                )
                |> pog.parameter(pog.text(lid))
                |> pog.returning(ops_sim_row())
                |> pog.execute(ctx.db)
              {
                Error(_) -> Error("similar_listings_failed")
                Ok(sret) -> {
                  let sim_arr =
                    list.map(sret.rows, fn(pair) {
                      let #(i, t) = pair
                      json.object([
                        #("listing_id", json.string(i)),
                        #("title", json.string(t)),
                      ])
                    })
                  let input_obj =
                    json.object([
                      #("event_type", json.string(et)),
                      #(
                        "reservation",
                        json.object([
                          #("public_code", json.string(pub_code)),
                          #("payment_status", json.string(pstat)),
                          #("payment_type", json.string(ptype)),
                          #("guest_name", json.string(gn)),
                          #("guest_email", json.string(ge)),
                          #("amount_paid", json.string(ap)),
                          #("starts_on", json.string(s1)),
                          #("ends_on", json.string(s2)),
                          #("listing_title", json.string(ltitle)),
                          #("listing_id", json.string(lid)),
                          #(
                            "supplier_confirm_deadline",
                            json.string(ddl),
                          ),
                        ]),
                      ),
                      #(
                        "similar_listings",
                        json.array(from: sim_arr, of: fn(x) { x }),
                      ),
                    ])
                  let input_s = json.to_string(input_obj)
                  case
                    pog.query(
                      "insert into ai_jobs (profile_code, input_json, status) values ('ops_agent', $1::jsonb, 'queued') returning id::text",
                    )
                    |> pog.parameter(pog.text(input_s))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> Error("ops_agent_job_insert_failed")
                    Ok(jr) ->
                      case jr.rows {
                        [job_id] -> {
                          case run_now {
                            True -> {
                              let _ = ai_job_run.run_ai_job(ctx, job_id)
                              Nil
                            }
                            False -> Nil
                          }
                          Ok(job_id)
                        }
                        _ -> Error("unexpected_job_insert")
                      }
                  }
                }
              }
            }
            _ -> Error("unexpected_reservation_row")
          }
      }
  }
}
