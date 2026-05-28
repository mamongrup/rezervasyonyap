//// Partner API — konaklama (otel / tatil evi / yat) fiyat teklifi.

import backend/context.{type Context}
import travel/agent/agent_auth
import travel/agent/agent_catalog_http
import gleam/bit_array
import gleam/dynamic/decode
import gleam/float
import gleam/http
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import gleam/time/calendar
import pog
import wisp.{type Request, type Response}

const stay_categories = ["hotel", "holiday_home", "yacht_charter"]

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn stay_quote_decoder() -> decode.Decoder(#(String, String, Int, String)) {
  decode.field("starts_on", decode.string, fn(starts_on) {
    decode.field("ends_on", decode.string, fn(ends_on) {
      decode.optional_field("quantity", 1, decode.int, fn(quantity) {
        decode.optional_field("meal_plan_code", "room_only", decode.string, fn(plan) {
          decode.success(#(starts_on, ends_on, quantity, plan))
        })
      })
    })
  })
}

fn parse_iso_date_ymd(raw: String) -> Result(calendar.Date, Nil) {
  case string.split(string.trim(raw), "-") {
    [ys, ms, ds] -> {
      use y <- result.try(int.parse(ys))
      use mo <- result.try(int.parse(ms))
      use d <- result.try(int.parse(ds))
      use month <- result.try(calendar.month_from_int(mo))
      let cd = calendar.Date(y, month, d)
      case calendar.is_valid_date(cd) {
        True -> Ok(cd)
        False -> Error(Nil)
      }
    }
    _ -> Error(Nil)
  }
}

fn quote_row() -> decode.Decoder(#(String, String, String, String)) {
  use nights <- decode.field(0, decode.string)
  use lodging <- decode.field(1, decode.string)
  use cleaning <- decode.field(2, decode.string)
  use cur <- decode.field(3, decode.string)
  decode.success(#(nights, lodging, cleaning, cur))
}

/// POST /api/v1/agent/catalog/listings/:id/stay-quote
pub fn stay_quote(req: Request, ctx: Context, listing_id: String) -> Response {
  use <- wisp.require_method(req, http.Post)
  case agent_auth.auth_trk_key(req, ctx) {
    Error(r) -> r
    Ok(#(oid, _, scopes)) ->
      case agent_auth.require_scope(scopes, "listings.read") {
        Error(r) -> r
        Ok(Nil) ->
          case agent_catalog_http.assert_agent_listing_access(ctx.db, listing_id, oid) {
            Error(r) -> r
            Ok(cat) ->
              case list.contains(stay_categories, cat) {
                False -> agent_auth.json_err(400, "not_a_stay_listing")
                True ->
                  case read_body_string(req) {
                    Error(_) -> agent_auth.json_err(400, "empty_body")
                    Ok(body) ->
                      case json.parse(body, stay_quote_decoder()) {
                        Error(_) -> agent_auth.json_err(400, "invalid_json")
                        Ok(#(starts_on, ends_on, quantity, meal_plan)) -> {
                          case quantity < 1 {
                            True -> agent_auth.json_err(400, "invalid_quantity")
                            False ->
                              case parse_iso_date_ymd(starts_on), parse_iso_date_ymd(ends_on) {
                                Ok(start_date), Ok(end_date) ->
                                  case
                                    pog.query(
                                      "with bounds as ( "
                                      <> "  select $2::date as s, $3::date as e "
                                      <> "), night_series as ( "
                                      <> "  select generate_series(b.s, b.e - interval '1 day', interval '1 day')::date as day "
                                      <> "  from bounds b where b.e > b.s "
                                      <> "), night_count as ( "
                                      <> "  select greatest((select e - s from bounds), 0)::int as n "
                                      <> "), fallback as ( "
                                      <> "  select coalesce( "
                                      <> "    (select m.price_per_night from listing_meal_plans m "
                                      <> "     where m.listing_id = $1::uuid and m.is_active = true "
                                      <> "     and m.plan_code = $4 limit 1), "
                                      <> "    (select min(m2.price_per_night) from listing_meal_plans m2 "
                                      <> "     where m2.listing_id = $1::uuid and m2.is_active = true), "
                                      <> "    l.first_charge_amount, 0::numeric) as nightly, "
                                      <> "    coalesce(l.cleaning_fee_amount, 0)::numeric as cleaning, "
                                      <> "    l.currency_code::text as cur, "
                                      <> "    coalesce(l.min_stay_nights, 1) as min_stay "
                                      <> "  from listings l where l.id = $1::uuid "
                                      <> "), blocked as ( "
                                      <> "  select count(*)::int as n from night_series ns "
                                      <> "  left join listing_availability_calendar c "
                                      <> "    on c.listing_id = $1::uuid and c.day = ns.day "
                                      <> "  where coalesce(c.am_available, c.is_available, true) = false "
                                      <> "     and coalesce(c.pm_available, c.is_available, true) = false "
                                      <> "), lodging as ( "
                                      <> "  select coalesce(sum(coalesce(c.price_override, f.nightly)), 0)::numeric as sub "
                                      <> "  from night_series ns cross join fallback f "
                                      <> "  left join listing_availability_calendar c "
                                      <> "    on c.listing_id = $1::uuid and c.day = ns.day "
                                      <> ") "
                                      <> "select nc.n::text, lg.sub::text, f.cleaning::text, f.cur "
                                      <> "from night_count nc cross join fallback f cross join lodging lg cross join blocked b "
                                      <> "where nc.n > 0 and b.n = 0 and nc.n >= f.min_stay "
                                      <> "  and (select count(*) from night_series) = nc.n",
                                    )
                                    |> pog.parameter(pog.text(listing_id))
                                    |> pog.parameter(pog.calendar_date(start_date))
                                    |> pog.parameter(pog.calendar_date(end_date))
                                    |> pog.parameter(pog.text(string.trim(meal_plan)))
                                    |> pog.returning(quote_row())
                                    |> pog.execute(ctx.db)
                                  {
                                    Error(_) ->
                                      agent_auth.json_err(500, "stay_quote_failed")
                                    Ok(ret) ->
                                      case ret.rows {
                                        [#(nights_raw, lodging_raw, cleaning_raw, currency)] -> {
                                          let nights = case int.parse(nights_raw) {
                                            Ok(n) -> n
                                            Error(_) -> 0
                                          }
                                          let lodging = case float.parse(lodging_raw) {
                                            Ok(f) -> f
                                            Error(_) -> 0.0
                                          }
                                          let cleaning = case float.parse(cleaning_raw) {
                                            Ok(f) -> f
                                            Error(_) -> 0.0
                                          }
                                          let qty = int.to_float(quantity)
                                          let subtotal = lodging *. qty +. cleaning
                                          let body =
                                            json.object([
                                              #("currency_code", json.string(currency)),
                                              #("nights", json.int(nights)),
                                              #("quantity", json.int(quantity)),
                                              #("lodging_subtotal", json.string(lodging_raw)),
                                              #("cleaning_fee", json.string(cleaning_raw)),
                                              #(
                                                "line_total",
                                                json.string(float.to_string(subtotal)),
                                              ),
                                              #("available", json.bool(True)),
                                              #(
                                                "meal_plan_code",
                                                json.string(string.trim(meal_plan)),
                                              ),
                                            ])
                                            |> json.to_string
                                          wisp.json_response(body, 200)
                                        }
                                        [] ->
                                          agent_auth.json_err(
                                            409,
                                            "dates_unavailable_or_min_stay",
                                          )
                                        _ -> agent_auth.json_err(500, "unexpected")
                                      }
                                  }
                                _, _ -> agent_auth.json_err(400, "invalid_dates")
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
