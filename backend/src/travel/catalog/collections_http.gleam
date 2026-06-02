//// Koleksiyon sayfaları CRUD + public listing arama (GET /api/v1/catalog/public/listings).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/float
import gleam/http
import gleam/http/request
import gleam/int
import gleam/io
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import travel/db/pog_errors
import travel/identity/admin_gate
import wisp.{type Request, type Response}

fn json_err(status: Int, msg: String) -> Response {
  wisp.json_response(
    json.object([#("error", json.string(msg))]) |> json.to_string,
    status,
  )
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

/// `listing_price_rules.rule_json` içindeki olası gecelik alanları — min/max alt sorgularında paylaşılır.
fn listing_price_rule_nightly_lateral_values_sql() -> String {
  "(values (case when replace(trim(coalesce(r.rule_json->>'base_nightly', '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'base_nightly', '')), ',', '.')::numeric end), (case when replace(trim(coalesce(r.rule_json->>'base_price', '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'base_price', '')), ',', '.')::numeric end), (case when replace(trim(coalesce(r.rule_json->>'room_only_nightly', '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'room_only_nightly', '')), ',', '.')::numeric end), (case when replace(trim(coalesce(r.rule_json->>'yemeksiz_nightly', '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'yemeksiz_nightly', '')), ',', '.')::numeric end), (case when replace(trim(coalesce(r.rule_json->>'meals_included_nightly', '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'meals_included_nightly', '')), ',', '.')::numeric end), (case when replace(trim(coalesce(r.rule_json->>'weekend_nightly', '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'weekend_nightly', '')), ',', '.')::numeric end))"
}

/// Wtatil import: `listing_tour_details.program_days_json` → vitrin `price_from` (kişi başı).
fn tour_listing_vitrin_price_sql() -> String {
  "nullif(trim(coalesce("
  <> "case when jsonb_typeof(tour_det.program_days_json->'cheapest_price') = 'number' "
  <> "then tour_det.program_days_json->>'cheapest_price' "
  <> "when jsonb_typeof(tour_det.program_days_json->'cheapest_price') = 'object' "
  <> "then coalesce("
  <> "nullif(trim(tour_det.program_days_json->'cheapest_price'->>'value'), ''), "
  <> "nullif(trim(tour_det.program_days_json->'cheapest_price'->>'amount'), ''), "
  <> "nullif(trim(tour_det.program_days_json->'cheapest_price'->>'price'), ''), "
  <> "nullif(trim(tour_det.program_days_json->'cheapest_price'->>'totalPrice'), '') "
  <> ") else null end, "
  <> "(select min(pp.n)::text from jsonb_array_elements("
  <> "case jsonb_typeof(tour_det.program_days_json->'period_prices') "
  <> "when 'array' then tour_det.program_days_json->'period_prices' else '[]'::jsonb end"
  <> ") elem "
  <> "cross join lateral (select case when replace(trim(coalesce("
  <> "nullif(trim(elem->>'price'), ''), nullif(trim(elem->>'amount'), ''), "
  <> "nullif(trim(elem->>'adultPrice'), ''), nullif(trim(elem->>'doublePrice'), ''), "
  <> "nullif(trim(elem->>'singlePrice'), ''), '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' "
  <> "then replace(trim(coalesce("
  <> "nullif(trim(elem->>'price'), ''), nullif(trim(elem->>'amount'), ''), "
  <> "nullif(trim(elem->>'adultPrice'), ''), nullif(trim(elem->>'doublePrice'), ''), "
  <> "nullif(trim(elem->>'singlePrice'), ''), '')), ',', '.')::numeric else null end as n) pp "
  <> "where pp.n is not null and pp.n > 0), "
  <> "'')), '')"
}

/// Filtre alt sorgusu — geçersiz metin `::numeric` patlatmasın.
fn tour_listing_vitrin_price_numeric_lateral_sql() -> String {
  "left join lateral (select case when px.v is null or trim(px.v) = '' then null "
  <> "when replace(trim(px.v), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' "
  <> "then replace(trim(px.v), ',', '.')::numeric else null end as tour_vitrin_price "
  <> "from (select "
  <> tour_listing_vitrin_price_sql()
  <> " as v) px) tour_price_row on true "
}

/// Vitrinde fiyatsız turlar listelenmesin — Wtatil fiyat senkronu sonrası otomatik görünür.
fn tour_public_must_have_price_sql() -> String {
  "and (pc.code != 'tour' or (tour_price_row.tour_vitrin_price is not null and tour_price_row.tour_vitrin_price > 0)) "
}

// ─── Public Listing Search ────────────────────────────────────────────────────

fn pub_listing_row() -> decode.Decoder(
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
  use slug <- decode.field(1, decode.string)
  use title <- decode.field(2, decode.string)
  use category_code <- decode.field(3, decode.string)
  use featured_image_url <- decode.field(4, decode.string)
  use price_from <- decode.field(5, decode.string)
  use location <- decode.field(6, decode.string)
  use review_avg <- decode.field(7, decode.string)
  use meal_plan_summary <- decode.field(8, decode.string)
  use map_lat <- decode.field(9, decode.string)
  use map_lng <- decode.field(10, decode.string)
  use meta_max_guests <- decode.field(11, decode.string)
  use meta_room_count <- decode.field(12, decode.string)
  use meta_bath_count <- decode.field(13, decode.string)
  use meta_property_type <- decode.field(14, decode.string)
  use theme_codes_csv <- decode.field(15, decode.string)
  use ministry_license_ref <- decode.field(16, decode.string)
  use prepayment_percent <- decode.field(17, decode.string)
  use cancellation_policy_text <- decode.field(18, decode.string)
  use min_stay_nights <- decode.field(19, decode.string)
  use allow_sub_min_stay_gap_booking <- decode.field(20, decode.string)
  use min_advance_booking_days <- decode.field(21, decode.string)
  use min_short_stay_nights <- decode.field(22, decode.string)
  use short_stay_fee <- decode.field(23, decode.string)
  use currency_code <- decode.field(24, decode.string)
  use cleaning_fee_amount <- decode.field(25, decode.string)
  use first_charge_amount <- decode.field(26, decode.string)
  use meta_bed_count <- decode.field(27, decode.string)
  use created_at_raw <- decode.field(28, decode.string)
  use mobile_discount_raw <- decode.field(29, decode.string)
  use instant_book_raw <- decode.field(30, decode.string)
  use gallery_paths_agg <- decode.field(31, decode.string)
  use price_rules_nightly_min <- decode.field(32, decode.string)
  use price_rules_nightly_max <- decode.field(33, decode.string)
  use hotel_star_rating <- decode.field(34, decode.string)
  use hotel_type_code <- decode.field(35, decode.string)
  use tour_duration_days <- decode.field(36, decode.string)
  use tour_max_people <- decode.field(37, decode.string)
  use tour_travel_type <- decode.field(38, decode.string)
  use tour_accommodation_type <- decode.field(39, decode.string)
  use tour_languages <- decode.field(40, decode.string)
  use tour_nights <- decode.field(41, decode.string)
  use tour_meal_type <- decode.field(42, decode.string)
  use tour_transport_type <- decode.field(43, decode.string)
  use tour_visa_required <- decode.field(44, decode.string)
  decode.success(#(
    id,
    slug,
    title,
    category_code,
    featured_image_url,
    price_from,
    location,
    review_avg,
    meal_plan_summary,
    map_lat,
    map_lng,
    meta_max_guests,
    meta_room_count,
    meta_bath_count,
    meta_property_type,
    theme_codes_csv,
    ministry_license_ref,
    prepayment_percent,
    cancellation_policy_text,
    min_stay_nights,
    allow_sub_min_stay_gap_booking,
    min_advance_booking_days,
    min_short_stay_nights,
    short_stay_fee,
    currency_code,
    cleaning_fee_amount,
    first_charge_amount,
    meta_bed_count,
    created_at_raw,
    mobile_discount_raw,
    instant_book_raw,
    gallery_paths_agg,
    price_rules_nightly_min,
    price_rules_nightly_max,
    hotel_star_rating,
    hotel_type_code,
    tour_duration_days,
    tour_max_people,
    tour_travel_type,
    tour_accommodation_type,
    tour_languages,
    tour_nights,
    tour_meal_type,
    tour_transport_type,
    tour_visa_required,
  ))
}

fn json_opt_str(s: String) -> json.Json {
  case s == "" {
    True -> json.null()
    False -> json.string(s)
  }
}

/// Mobil indirim % — vitrin liste kartı / page-builder «indirimli» filtresi
fn json_opt_discount_percent(raw: String) -> json.Json {
  let t = string.trim(raw)
  case t == "" {
    True -> json.null()
    False ->
      case float.parse(t) {
        Ok(f) ->
          case f >. 0.0 {
            True -> json.float(f)
            False -> json.null()
          }
        Error(_) -> json.null()
      }
  }
}

/// Public liste kartı — `listing_images` birleşimi (PG `string_agg`, ayraç ASCII unit separator)
fn gallery_urls_json(raw: String) -> json.Json {
  let parts =
    string.trim(raw)
    |> string.split("\u{001F}")
    |> list.map(string.trim)
    |> list.filter(fn(s) { s != "" })
  json.array(from: parts, of: json.string)
}

fn pub_listing_json(
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
) -> json.Json {
  let #(
    id,
    slug,
    title,
    cat,
    fi,
    price,
    loc,
    rev,
    meal_plan,
    map_lat_s,
    map_lng_s,
    meta_max_guests,
    meta_room_count,
    meta_bath_count,
    meta_property_type,
    theme_codes_csv,
    ministry_license_ref,
    prepayment_percent,
    cancellation_policy_text,
    min_stay_nights,
    allow_sub_min_stay_gap_booking,
    min_advance_booking_days,
    min_short_stay_nights,
    short_stay_fee,
    currency_code,
    cleaning_fee_amount,
    first_charge_amount,
    meta_bed_count,
    created_at_raw,
    mobile_discount_raw,
    instant_book_raw,
    gallery_paths_agg,
    pr_min_s,
    pr_max_s,
    hotel_star_rating,
    hotel_type_code,
    tour_duration_days,
    tour_max_people,
    tour_travel_type,
    tour_accommodation_type,
    tour_languages,
    tour_nights,
    tour_meal_type,
    tour_transport_type,
    tour_visa_required,
  ) = row
  let fij = case fi == "" { True -> json.null()  False -> json.string(fi) }
  let pj = case price == "" { True -> json.null()  False -> json.string(price) }
  let lj = case loc == "" { True -> json.null()  False -> json.string(loc) }
  let rj = case rev == "" { True -> json.null()  False -> json.string(rev) }
  let mpj = case meal_plan == "" { True -> json.null()  False -> json.string(meal_plan) }
  let lat_j = case map_lat_s == "" {
    True -> json.null()
    False -> json.string(map_lat_s)
  }
  let lng_j = case map_lng_s == "" {
    True -> json.null()
    False -> json.string(map_lng_s)
  }
  let discount_j = json_opt_discount_percent(mobile_discount_raw)
  let instant_j = json.bool(instant_book_raw == "true")
  let pr_min_j = json_opt_str(pr_min_s)
  let pr_max_j = json_opt_str(pr_max_s)
  json.object([
    #("id", json.string(id)),
    #("slug", json.string(slug)),
    #("title", json.string(title)),
    #("category_code", json.string(cat)),
    // Ön yüz SEO / JSON-LD: product_categories.code ile aynı (bilinçli tekrar)
    #("listing_vertical", json.string(cat)),
    #("featured_image_url", fij),
    #("price_from", pj),
    #("location", lj),
    #("review_avg", rj),
    #("meal_plan_summary", mpj),
    #("map_lat", lat_j),
    #("map_lng", lng_j),
    #("max_guests", json_opt_str(meta_max_guests)),
    #("room_count", json_opt_str(meta_room_count)),
    #("bed_count", json_opt_str(meta_bed_count)),
    #("bath_count", json_opt_str(meta_bath_count)),
    #("property_type", json_opt_str(meta_property_type)),
    #("theme_codes", json_opt_str(theme_codes_csv)),
    #("ministry_license_ref", json_opt_str(ministry_license_ref)),
    #("prepayment_percent", json_opt_str(prepayment_percent)),
    #("cancellation_policy_text", json_opt_str(cancellation_policy_text)),
    #("min_stay_nights", json_opt_str(min_stay_nights)),
    #("allow_sub_min_stay_gap_booking", json.string(allow_sub_min_stay_gap_booking)),
    #("min_advance_booking_days", json_opt_str(min_advance_booking_days)),
    #("min_short_stay_nights", json_opt_str(min_short_stay_nights)),
    #("short_stay_fee", json_opt_str(short_stay_fee)),
    #("currency_code", json_opt_str(currency_code)),
    #("cleaning_fee_amount", json_opt_str(cleaning_fee_amount)),
    #("first_charge_amount", json_opt_str(first_charge_amount)),
    #("created_at", json_opt_str(created_at_raw)),
    #("discount_percent", discount_j),
    #("instant_book", instant_j),
    #("gallery_urls", gallery_urls_json(gallery_paths_agg)),
    #("price_rules_nightly_min", pr_min_j),
    #("price_rules_nightly_max", pr_max_j),
    #("hotel_star_rating", json_opt_str(hotel_star_rating)),
    #("hotel_type_code", json_opt_str(hotel_type_code)),
    #("tour_duration_days", json_opt_str(tour_duration_days)),
    #("tour_max_people", json_opt_str(tour_max_people)),
    #("tour_travel_type", json_opt_str(tour_travel_type)),
    #("tour_accommodation_type", json_opt_str(tour_accommodation_type)),
    #("tour_languages", json_opt_str(tour_languages)),
    #("tour_nights", json_opt_str(tour_nights)),
    #("tour_meal_type", json_opt_str(tour_meal_type)),
    #("tour_transport_type", json_opt_str(tour_transport_type)),
    #("tour_visa_required", json_opt_str(tour_visa_required)),
  ])
}

/// GET /api/v1/catalog/public/listings?q=&category_code=&location=&limit=&locale=&listing_ids=id1,id2
pub fn search_public_listings(req: Request, ctx: Context) -> Response {
  search_listings_impl(req, ctx, None)
}

/// GET /api/v1/agent/catalog/search — acente kategori grant filtresi ile aynı arama.
pub fn search_agent_listings(req: Request, ctx: Context, agency_org_id: String) -> Response {
  search_listings_impl(req, ctx, Some(agency_org_id))
}

fn search_listings_impl(
  req: Request,
  ctx: Context,
  agency_org_opt: Option(String),
) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let q_raw =
    list.key_find(qs, "q")
    |> result.unwrap("")
    |> string.trim
  let cat_raw =
    list.key_find(qs, "category_code")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let loc_raw =
    list.key_find(qs, "location")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let locale_raw =
    list.key_find(qs, "locale")
    |> result.unwrap("tr")
    |> string.trim
    |> string.lowercase
  let locale = case locale_raw == "" { True -> "tr"  False -> locale_raw }
  let lim_str =
    list.key_find(qs, "limit")
    |> result.unwrap("20")
    |> string.trim
  let lim = case int.parse(lim_str) {
    Ok(n) -> case n > 100 { True -> 100  False -> case n < 1 { True -> 20  False -> n } }
    Error(_) -> 20
  }
  let page_raw =
    list.key_find(qs, "page")
    |> result.unwrap("1")
    |> string.trim
  let page_num = case int.parse(page_raw) {
    Ok(n) -> case n < 1 { True -> 1  False -> n }
    Error(_) -> 1
  }
  let offset = int.multiply(page_num - 1, lim)
  // Comma-separated UUID list: listing_ids=uuid1,uuid2,...
  let ids_raw =
    list.key_find(qs, "listing_ids")
    |> result.unwrap("")
    |> string.trim

  let q_param = case q_raw == "" {
    True -> pog.null()
    False -> pog.text("%" <> string.lowercase(q_raw) <> "%")
  }
  let cat_param = case cat_raw == "" { True -> pog.null()  False -> pog.text(cat_raw) }
  let loc_param = case loc_raw == "" {
    True -> pog.null()
    False -> pog.text("%" <> loc_raw <> "%")
  }
  // Pass ids as a single comma-separated text; SQL splits via string_to_array
  let ids_param = case ids_raw == "" { True -> pog.null()  False -> pog.text(ids_raw) }

  let theme_raw =
    list.key_find(qs, "theme")
    |> result.unwrap("")
    |> string.trim
  let theme_param = case theme_raw == "" {
    True -> pog.null()
    False -> pog.text(theme_raw)
  }

  let attrs_raw =
    list.key_find(qs, "attrs")
    |> result.unwrap("")
    |> string.trim
  let attrs_param = case attrs_raw == "" {
    True -> pog.null()
    False -> pog.text(attrs_raw)
  }

  let price_min_raw =
    list.key_find(qs, "price_min")
    |> result.unwrap("")
    |> string.trim
  let price_min_param = case price_min_raw == "" {
    True -> pog.null()
    False -> pog.text(price_min_raw)
  }
  let price_max_raw =
    list.key_find(qs, "price_max")
    |> result.unwrap("")
    |> string.trim
  let price_max_param = case price_max_raw == "" {
    True -> pog.null()
    False -> pog.text(price_max_raw)
  }
  let hotel_type_raw =
    list.key_find(qs, "hotel_type")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let hotel_type_param = case hotel_type_raw == "" {
    True -> pog.null()
    False -> pog.text(hotel_type_raw)
  }
  let hotel_theme_raw =
    list.key_find(qs, "hotel_theme")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let hotel_theme_param = case hotel_theme_raw == "" {
    True -> pog.null()
    False -> pog.text(hotel_theme_raw)
  }
  let hotel_accommodation_raw =
    list.key_find(qs, "hotel_accommodation")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let hotel_accommodation_param = case hotel_accommodation_raw == "" {
    True -> pog.null()
    False -> pog.text(hotel_accommodation_raw)
  }
  let hotel_stars_raw =
    list.key_find(qs, "hotel_stars")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let hotel_stars_param = case hotel_stars_raw == "" {
    True -> pog.null()
    False -> pog.text(hotel_stars_raw)
  }
  let tour_travel_type_raw =
    list.key_find(qs, "tour_travel_type")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let tour_travel_type_param = case tour_travel_type_raw == "" {
    True -> pog.null()
    False -> pog.text(tour_travel_type_raw)
  }
  let tour_accommodation_raw =
    list.key_find(qs, "tour_accommodation")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let tour_accommodation_param = case tour_accommodation_raw == "" {
    True -> pog.null()
    False -> pog.text(tour_accommodation_raw)
  }
  let tour_duration_raw =
    list.key_find(qs, "tour_duration")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let tour_duration_param = case tour_duration_raw == "" {
    True -> pog.null()
    False -> pog.text(tour_duration_raw)
  }

  let sort_raw =
    list.key_find(qs, "sort")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  // Varsayılan: `created_at` — yorum/puanı olmayan yeni ilanlar sayfa sonuna itilmesin.
  // Eski davranış (önce yüksek puan): `?sort=recommended` veya `sort=rating`.
  let order_sql = case sort_raw {
    "recommended" | "rating" ->
      "order by l.review_avg desc nulls last, l.created_at desc "
    _ -> "order by l.created_at desc "
  }

  // Faz F: Esnek tarih arama. start_date / end_date verilirse müsaitlik filtresi uygulanır.
  // flex_days (0|3|7) verilirse aralık her iki uçtan o kadar genişler — daha çok sonuç.
  let start_raw =
    list.key_find(qs, "start_date")
    |> result.unwrap("")
    |> string.trim
  let end_raw =
    list.key_find(qs, "end_date")
    |> result.unwrap("")
    |> string.trim
  let flex_raw =
    list.key_find(qs, "flex_days")
    |> result.unwrap("0")
    |> string.trim
  let flex_days = case int.parse(flex_raw) {
    Ok(n) ->
      case n < 0 {
        True -> 0
        False ->
          case n > 14 {
            True -> 14
            False -> n
          }
      }
    Error(_) -> 0
  }
  let start_param = case start_raw == "" {
    True -> pog.null()
    False -> pog.text(start_raw)
  }
  let end_param = case end_raw == "" {
    True -> pog.null()
    False -> pog.text(end_raw)
  }

  let sql =
    "select l.id::text, l.slug, "
    <> "coalesce((select lt.title from listing_translations lt join locales lo on lo.id = lt.locale_id where lt.listing_id = l.id and lower(lo.code) = lower($4) limit 1), l.slug), "
    <> "coalesce(pc.code::text, ''), "
    <> "coalesce(case when trim(coalesce(l.featured_image_url, '')) = '' then null when trim(l.featured_image_url) ilike 'http%' then trim(l.featured_image_url) when trim(l.featured_image_url) like '/%' then trim(l.featured_image_url) else '/' || trim(l.featured_image_url) end, case when trim(coalesce(l.thumbnail_url, '')) = '' then null when trim(l.thumbnail_url) ilike 'http%' then trim(l.thumbnail_url) when trim(l.thumbnail_url) like '/%' then trim(l.thumbnail_url) else '/' || trim(l.thumbnail_url) end, (select case when trim(li.storage_key) is null or trim(li.storage_key) = '' then null when trim(li.storage_key) ilike 'http%' then trim(li.storage_key) when trim(li.storage_key) like '/%' then trim(li.storage_key) else '/' || trim(li.storage_key) end from listing_images li where li.listing_id = l.id order by li.sort_order asc, li.created_at asc limit 1), ''), "
    // Vitrin fiyat: tur → wtatil `cheapest_price` / dönem tablosu; konaklama → kurallar + yemek planları.
    <> "coalesce(case when pc.code = 'tour' then "
    <> tour_listing_vitrin_price_sql()
    <> " else null end, nullif((select min(u.v)::text from listing_price_rules r cross join lateral "
    <> listing_price_rule_nightly_lateral_values_sql()
    <> " as u(v) where r.listing_id = l.id and u.v is not null), ''), nullif((select m.price_per_night::text from listing_meal_plans m where m.listing_id = l.id and m.is_active = true and m.plan_code = 'room_only' order by m.sort_order asc limit 1), ''), nullif((select min(m.price_per_night)::text from listing_meal_plans m where m.listing_id = l.id and m.is_active = true and (l.first_charge_amount is null or m.price_per_night is distinct from l.first_charge_amount)), ''), case when l.first_charge_amount is null then (select min(mp.price_per_night)::text from listing_meal_plans mp where mp.listing_id = l.id and mp.is_active = true) else null end, ''), "
    <> "coalesce(nullif(trim(both ', ' from concat_ws(', ', nullif(trim(lm.meta->>'district_label'), ''), nullif(trim(lm.meta->>'city'), ''), (case when trim(coalesce(lm.meta->>'province_city', '')) ~ '/' then nullif(trim(substring(trim(lm.meta->>'province_city') from '[^/]+$')), '') else nullif(trim(lm.meta->>'province_city'), '') end))), ''), nullif(trim(l.location_name), ''), nullif(trim(lm.meta->>'region_display'), ''), nullif(trim(lm.meta->>'address'), ''), ''), "
    <> "coalesce(l.review_avg::text, ''), "
    <> "coalesce((select case "
    <> "  when sum(case when plan_code != 'room_only' then 1 else 0 end) > 0 "
    <> "    and sum(case when plan_code = 'room_only' then 1 else 0 end) > 0 then 'both' "
    <> "  when sum(case when plan_code != 'room_only' then 1 else 0 end) > 0 then 'meal_only' "
    <> "  when sum(case when plan_code = 'room_only' then 1 else 0 end) > 0 then 'room_only' "
    <> "  else null end "
    <> "from listing_meal_plans where listing_id = l.id and is_active = true), '') "
    <> ", coalesce(l.map_lat::text, ''), coalesce(l.map_lng::text, '') "
    <> ", coalesce(nullif(trim(lm.meta->>'max_guests'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'room_count'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'bath_count'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'property_type'), ''), '') "
    <> ", coalesce(array_to_string(h.theme_codes, ','), '') "
    <> ", coalesce(l.ministry_license_ref::text, ''), coalesce(l.prepayment_percent::text, '') "
    <> ", coalesce(l.cancellation_policy_text::text, '') "
    <> ", coalesce(l.min_stay_nights::text, '') "
    <> ", case when coalesce(l.allow_sub_min_stay_gap_booking, false) then 'true' else 'false' end "
    <> ", coalesce(nullif(trim(lm.meta->>'min_advance_booking_days'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'min_short_stay_nights'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'short_stay_fee'), ''), '') "
    <> ", coalesce(l.currency_code::text, '') "
    <> ", coalesce(l.cleaning_fee_amount::text, '') "
    <> ", coalesce(l.first_charge_amount::text, '') "
    <> ", coalesce(nullif(trim(lm.meta->>'bed_count'), ''), '') "
    <> ", coalesce(l.created_at::text, ''), coalesce(nullif(trim(l.mobile_discount_percent::text), ''), '0'), case when coalesce(l.instant_book, false) then 'true' else 'false' end, coalesce(nullif(trim((select string_agg(s.path::text, E'\\x1f') from (select case when trim(li.storage_key) is null or trim(li.storage_key) = '' then null::text when trim(li.storage_key) ilike 'http%' then trim(li.storage_key) when trim(li.storage_key) like '/%' then trim(li.storage_key) else '/' || trim(li.storage_key) end as path from listing_images li where li.listing_id = l.id and trim(coalesce(li.storage_key, '')) <> '' order by li.sort_order asc, li.created_at asc limit 12) s where s.path is not null)), ''), '') "
    <> ", coalesce(nullif((select min(u.v)::text from listing_price_rules r cross join lateral "
    <> listing_price_rule_nightly_lateral_values_sql()
    <> " as u(v) where r.listing_id = l.id and u.v is not null), ''), '') "
    <> ", coalesce(nullif((select max(u.v)::text from listing_price_rules r cross join lateral "
    <> listing_price_rule_nightly_lateral_values_sql()
    <> " as u(v) where r.listing_id = l.id and u.v is not null), ''), '') "
    <> ", coalesce(nullif(hotel.star_rating::text, ''), '') "
    <> ", coalesce(nullif(trim(hotel_attr.value_json->>'hotel_type_code'), ''), '') "
    <> ", coalesce(nullif(trim(tour_attr.value_json->'data'->>'duration_days'), ''), nullif(trim(tour_attr.value_json->>'duration_days'), ''), '') "
    <> ", coalesce(nullif(trim(tour_attr.value_json->'data'->>'max_people'), ''), nullif(trim(tour_attr.value_json->>'max_people'), ''), '') "
    <> ", coalesce(nullif(trim(tour_attr.value_json->'data'->>'travel_type'), ''), nullif(trim(tour_attr.value_json->>'travel_type'), ''), '') "
    <> ", coalesce(nullif(trim(tour_attr.value_json->'data'->>'accommodation_type'), ''), nullif(trim(tour_attr.value_json->>'accommodation_type'), ''), '') "
    <> ", coalesce(nullif(trim(tour_attr.value_json->'data'->>'languages'), ''), nullif(trim(tour_attr.value_json->>'languages'), ''), '') "
    <> ", coalesce(nullif(trim(tour_det.program_days_json->>'number_of_nights'), ''), nullif(trim(wtatil_snap.value_json->'catalog'->>'numberOfNights'), ''), '') "
    <> ", coalesce(nullif(trim(wtatil_snap.value_json->>'meal_type'), ''), nullif(trim(wtatil_snap.value_json->'catalog'->>'mealType'), ''), '') "
    <> ", coalesce(nullif(trim(wtatil_snap.value_json->>'transport_type'), ''), nullif(trim(wtatil_snap.value_json->'catalog'->>'transportType'), ''), '') "
    <> ", coalesce(case "
    <> "  when lower(coalesce(tour_attr.value_json->'data'->>'visa_required', tour_attr.value_json->>'visa_required', '')) in ('true','1','yes') then 'true' "
    <> "  when lower(coalesce(tour_attr.value_json->'data'->>'visa_required', tour_attr.value_json->>'visa_required', '')) in ('false','0','no') then 'false' "
    <> "  when wtatil_snap.value_json->'visa_detail' is not null and wtatil_snap.value_json->'visa_detail' != 'null'::jsonb "
    <> "       and wtatil_snap.value_json->'visa_detail'::text not in ('null','{}','\"\"') then 'true' "
    <> "  else 'false' end, '') "
    <> "from listings l "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "left join listing_holiday_home_details h on h.listing_id = l.id "
    <> "left join listing_hotel_details hotel on hotel.listing_id = l.id "
    <> "left join listing_tour_details tour_det on tour_det.listing_id = l.id "
    <> tour_listing_vitrin_price_numeric_lateral_sql()
    <> "left join lateral (select min(u.v) as min_price, max(u.v) as max_price from listing_price_rules r cross join lateral "
    <> listing_price_rule_nightly_lateral_values_sql()
    <> " as u(v) where r.listing_id = l.id and u.v is not null) price_rule on true "
    <> "left join lateral (select la.value_json as meta from listing_attributes la where la.listing_id = l.id and la.group_code = 'listing_meta' and la.key = 'v1' limit 1) lm on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'hotel' and la.key = 'hotel_type_code' limit 1) hotel_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'hotel' and la.key = 'theme_code' limit 1) hotel_theme_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'hotel' and la.key = 'accommodation_code' limit 1) hotel_acc_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'vertical_tour' and la.key = 'v1' limit 1) tour_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'wtatil' and la.key = 'snapshot' limit 1) wtatil_snap on true "
    <> "where l.status = 'published' "
    <> "and ($1::text is null or lower(coalesce((select lt2.title from listing_translations lt2 join locales lo2 on lo2.id = lt2.locale_id where lt2.listing_id = l.id order by case when lower(lo2.code) = 'tr' then 0 else 1 end limit 1), l.slug)) ilike $1 or lower(l.slug) ilike $1) "
    <> "and ($2::text is null or pc.code = $2) "
    <> "and ($3::text is null or (lower(coalesce(l.location_name, '')) ilike $3 or lower(coalesce(lm.meta->>'address', '')) ilike $3 or lower(coalesce(lm.meta->>'province_city', '')) ilike $3 or lower(coalesce(lm.meta->>'city', '')) ilike $3 or lower(coalesce(lm.meta->>'district_label', '')) ilike $3 or lower(coalesce(lm.meta->>'region_display', '')) ilike $3)) "
    <> "and ($6::text is null or l.id = ANY(string_to_array($6, ',')::uuid[])) "
    <> "and ($7::text is null or $7 = '' or pc.code != 'holiday_home' or ( "
    <> "  coalesce(h.theme_codes, '{}'::text[]) && string_to_array(trim($7), ',')::text[] "
    <> ")) "
    // Faz F: müsaitlik. Yalnızca tarih verilirse aktif. flex_days kadar her iki uçtan genişlet.
    <> "and ($8::text is null or $9::text is null or not exists ( "
    <> "  select 1 from inventory_holds ih "
    <> "  where ih.listing_id = l.id and ih.status = 'active' "
    <> "    and ih.starts_on <= ($9::date + ($10 || ' days')::interval)::date "
    <> "    and ih.ends_on >= ($8::date - ($10 || ' days')::interval)::date "
    <> ")) "
    <> "and ($8::text is null or $9::text is null or not exists ( "
    <> "  select 1 from reservations r "
    <> "  where r.listing_id = l.id and r.status in ('held','confirmed') "
    <> "    and r.starts_on <= ($9::date + ($10 || ' days')::interval)::date "
    <> "    and r.ends_on >= ($8::date - ($10 || ' days')::interval)::date "
    <> ")) "
    <> "and ($11::text is null or trim($11) = '' or ( "
    <> "  select count(*) = cardinality(string_to_array(trim($11), ',')::text[]) "
    <> "  from unnest(string_to_array(trim($11), ',')::text[]) as need(k) "
    <> "  where exists ( "
    <> "    select 1 from listing_attributes la "
    <> "    where la.listing_id = l.id "
    <> "    and lower(trim(la.key)) = lower(trim(need.k)) "
    <> "    and (la.value_json = 'true'::jsonb or lower(trim(both '\"' from la.value_json::text)) = 'true') "
    <> "  ) "
    <> ")) "
    <> "and ($12::text is null or coalesce(price_rule.min_price, tour_price_row.tour_vitrin_price, l.first_charge_amount) >= nullif($12::text, '')::numeric) "
    <> "and ($13::text is null or coalesce(price_rule.min_price, tour_price_row.tour_vitrin_price, l.first_charge_amount) <= nullif($13::text, '')::numeric) "
    <> "and ($14::text is null or pc.code != 'hotel' or lower(trim(coalesce(hotel_attr.value_json->>'hotel_type_code', ''))) = any(string_to_array(trim($14), ',')::text[])) "
    <> "and ($15::text is null or pc.code != 'hotel' or lower(trim(coalesce(hotel_theme_attr.value_json->>'theme_code', ''))) = any(string_to_array(trim($15), ',')::text[])) "
    <> "and ($16::text is null or pc.code != 'hotel' or lower(trim(coalesce(hotel_acc_attr.value_json->>'accommodation_code', ''))) = any(string_to_array(trim($16), ',')::text[])) "
    <> "and ($17::text is null or pc.code != 'hotel' or floor(coalesce(hotel.star_rating, 0))::int::text = any(string_to_array(trim($17), ',')::text[])) "
    <> "and ($18::text is null or pc.code != 'tour' or lower(trim(coalesce(tour_attr.value_json->'data'->>'travel_type', tour_attr.value_json->>'travel_type', ''))) = any(string_to_array(trim($18), ',')::text[])) "
    <> "and ($19::text is null or pc.code != 'tour' or lower(trim(coalesce(tour_attr.value_json->'data'->>'accommodation_type', tour_attr.value_json->>'accommodation_type', ''))) = any(string_to_array(trim($19), ',')::text[])) "
    <> "and ($20::text is null or pc.code != 'tour' or exists ( "
    <> "  select 1 from unnest(string_to_array(trim($20), ',')::text[]) as bucket(v) "
    <> "  where (bucket.v = '1' and coalesce(nullif(trim(tour_attr.value_json->'data'->>'duration_days'), ''), nullif(trim(tour_attr.value_json->>'duration_days'), ''), '0')::int = 1) "
    <> "     or (bucket.v = '2-3' and coalesce(nullif(trim(tour_attr.value_json->'data'->>'duration_days'), ''), nullif(trim(tour_attr.value_json->>'duration_days'), ''), '0')::int between 2 and 3) "
    <> "     or (bucket.v = '4-7' and coalesce(nullif(trim(tour_attr.value_json->'data'->>'duration_days'), ''), nullif(trim(tour_attr.value_json->>'duration_days'), ''), '0')::int between 4 and 7) "
    <> "     or (bucket.v = '8+' and coalesce(nullif(trim(tour_attr.value_json->'data'->>'duration_days'), ''), nullif(trim(tour_attr.value_json->>'duration_days'), ''), '0')::int >= 8) "
    <> ")) "
    <> tour_public_must_have_price_sql()
    <> "and ($22::uuid is null or not exists (select 1 from agency_category_grants g where g.agency_organization_id = $22::uuid) "
    <> "or exists (select 1 from agency_category_grants g2 where g2.agency_organization_id = $22::uuid and g2.approved = true and g2.category_code = pc.code)) "

  let sql_core = sql <> order_sql
  // Count subquery must reference $5 and $21 so PostgreSQL can infer parameter types.
  let count_sql =
    "select count(*)::int from ("
    <> sql_core
    <> ") _cnt cross join (select $5::int as __lim, $21::int as __off) __pg_params"
  let sql_paged = sql_core <> " offset $21 limit $5"
  let int_col0 = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }

  let agency_param = case agency_org_opt {
    None -> pog.null()
    Some(id) -> pog.text(id)
  }

  let run_params = fn(q) {
    q
    |> pog.parameter(q_param)
    |> pog.parameter(cat_param)
    |> pog.parameter(loc_param)
    |> pog.parameter(pog.text(locale))
    |> pog.parameter(pog.int(lim))
    |> pog.parameter(ids_param)
    |> pog.parameter(theme_param)
    |> pog.parameter(start_param)
    |> pog.parameter(end_param)
    |> pog.parameter(pog.text(int.to_string(flex_days)))
    |> pog.parameter(attrs_param)
    |> pog.parameter(price_min_param)
    |> pog.parameter(price_max_param)
    |> pog.parameter(hotel_type_param)
    |> pog.parameter(hotel_theme_param)
    |> pog.parameter(hotel_accommodation_param)
    |> pog.parameter(hotel_stars_param)
    |> pog.parameter(tour_travel_type_param)
    |> pog.parameter(tour_accommodation_param)
    |> pog.parameter(tour_duration_param)
    |> pog.parameter(pog.int(offset))
    |> pog.parameter(agency_param)
  }

  case
    pog.query(count_sql)
    |> run_params
    |> pog.returning(int_col0)
    |> pog.execute(ctx.db)
  {
    Error(e) -> {
      let _ =
        io.println(
          "[catalog.public.listings:count] "
            <> pog_errors.query_error_to_string(e),
        )
      json_err(500, "search_failed")
    }
    Ok(count_ret) -> {
      let total_count = case count_ret.rows {
        [n] -> n
        _ -> 0
      }
      case
        pog.query(sql_paged)
        |> run_params
        |> pog.returning(pub_listing_row())
        |> pog.execute(ctx.db)
      {
        Error(e) -> {
          let _ =
            io.println(
              "[catalog.public.listings] "
                <> pog_errors.query_error_to_string(e),
            )
          json_err(500, "search_failed")
        }
        Ok(ret) -> {
          let arr = list.map(ret.rows, pub_listing_json)
          let body =
            json.object([
              #("listings", json.array(from: arr, of: fn(x) { x })),
              #("total", json.int(total_count)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn theme_item_row() -> decode.Decoder(#(String, String)) {
  use code <- decode.field(0, decode.string)
  use label <- decode.field(1, decode.string)
  decode.success(#(code, label))
}

/// GET /api/v1/catalog/public/theme-items?category_code=holiday_home&locale=tr
pub fn list_public_theme_items(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let cat =
    list.key_find(qs, "category_code")
    |> result.unwrap("")
    |> string.trim
  let loc_raw =
    list.key_find(qs, "locale")
    |> result.unwrap("tr")
    |> string.trim
  case cat == "" {
    True -> json_err(400, "category_code_required")
    False -> {
      case
        pog.query(
          "select i.code::text, coalesce(nullif(trim(t.label), ''), i.code) "
          <> "from category_theme_items i "
          <> "left join category_theme_item_translations t on t.item_id = i.id "
          <> "and t.locale_id = (select id from locales where lower(code) = lower($2) limit 1) "
          <> "where i.category_code = $1 and i.is_active = true "
          <> "order by i.sort_order, i.code",
        )
        |> pog.parameter(pog.text(cat))
        |> pog.parameter(pog.text(loc_raw))
        |> pog.returning(theme_item_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "theme_items_failed")
        Ok(ret) -> {
          let rows =
            list.map(ret.rows, fn(r) {
              let #(code, label) = r
              json.object([
                #("code", json.string(code)),
                #("label", json.string(label)),
              ])
            })
          let body =
            json.object([#("items", json.array(from: rows, of: fn(x) { x }))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

// ─── Manage category_theme_items (admin / catalog) ───────────────────────────

fn manage_theme_item_manage_row() -> decode.Decoder(#(String, String, String)) {
  use id <- decode.field(0, decode.string)
  use code <- decode.field(1, decode.string)
  use label <- decode.field(2, decode.string)
  decode.success(#(id, code, label))
}

fn theme_manage_ok_len(s: String, max: Int) -> Bool {
  let t = string.trim(s)
  case string.length(t) {
    0 -> False
    n ->
      case n > max {
        True -> False
        False -> True
      }
  }
}

fn create_manage_theme_item_decoder() -> decode.Decoder(#(String, String, String, String)) {
  decode.field("category_code", decode.string, fn(cat) {
    decode.field("code", decode.string, fn(code) {
      decode.field("label", decode.string, fn(label) {
        decode.field("locale_code", decode.string, fn(loc) {
          decode.success(#(
            string.trim(cat),
            string.trim(code),
            string.trim(label),
            string.trim(loc),
          ))
        })
      })
    })
  })
}

fn patch_manage_theme_item_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("label", decode.string, fn(label) {
    decode.field("locale_code", decode.string, fn(loc) {
      decode.success(#(string.trim(label), string.trim(loc)))
    })
  })
}

/// GET /api/v1/catalog/manage/theme-items?category_code=holiday_home&locale=tr
pub fn list_manage_theme_items(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let qs = case request.get_query(req) {
        Ok(q) -> q
        Error(_) -> []
      }
      let cat =
        list.key_find(qs, "category_code")
        |> result.unwrap("")
        |> string.trim
      let loc_raw =
        list.key_find(qs, "locale")
        |> result.unwrap("tr")
        |> string.trim
      case cat == "" {
        True -> json_err(400, "category_code_required")
        False -> {
          case
            pog.query(
              "select i.id::text, i.code::text, coalesce(nullif(trim(t.label), ''), i.code) "
              <> "from category_theme_items i "
              <> "left join category_theme_item_translations t on t.item_id = i.id "
              <> "and t.locale_id = (select id from locales where lower(code) = lower($2) limit 1) "
              <> "where i.category_code = $1 and i.is_active = true "
              <> "order by i.sort_order, i.code",
            )
            |> pog.parameter(pog.text(cat))
            |> pog.parameter(pog.text(loc_raw))
            |> pog.returning(manage_theme_item_manage_row())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "manage_theme_items_failed")
            Ok(ret) -> {
              let rows =
                list.map(ret.rows, fn(r) {
                  let #(id, code, label) = r
                  json.object([
                    #("id", json.string(id)),
                    #("code", json.string(code)),
                    #("label", json.string(label)),
                  ])
                })
              let body =
                json.object([#("items", json.array(from: rows, of: fn(x) { x }))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
          }
        }
      }
    }
  }
}

/// POST /api/v1/catalog/manage/theme-items
pub fn create_manage_theme_item(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, create_manage_theme_item_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(cat, code_raw, label_raw, loc_raw)) -> {
              case
                theme_manage_ok_len(cat, 64)
                && theme_manage_ok_len(code_raw, 64)
                && theme_manage_ok_len(label_raw, 500)
                && theme_manage_ok_len(loc_raw, 16)
              {
                False -> json_err(400, "invalid_fields")
                True -> {
                  let code = string.lowercase(code_raw)
                  case
                    pog.query(
                      "insert into category_theme_items (category_code, code, sort_order) "
                      <> "values ($1, $2, coalesce((select max(sort_order) + 10 from category_theme_items i2 where i2.category_code = $1), 10)) "
                      <> "on conflict (category_code, code) do nothing returning id::text",
                    )
                    |> pog.parameter(pog.text(cat))
                    |> pog.parameter(pog.text(code))
                    |> pog.returning(row_dec.col0_string())
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "theme_item_insert_failed")
                    Ok(ins) ->
                      case ins.rows {
                        [] -> json_err(409, "theme_item_duplicate_code")
                        [new_id] -> {
                          case
                            pog.query(
                              "insert into category_theme_item_translations (item_id, locale_id, label) "
                              <> "select $1::uuid, lo.id, $3 from locales lo where lower(lo.code) = lower($2) limit 1 "
                              <> "on conflict (item_id, locale_id) do update set label = excluded.label",
                            )
                            |> pog.parameter(pog.text(new_id))
                            |> pog.parameter(pog.text(loc_raw))
                            |> pog.parameter(pog.text(label_raw))
                            |> pog.execute(ctx.db)
                          {
                            Error(_) -> json_err(500, "theme_item_translation_failed")
                            Ok(_) ->
                              wisp.json_response(
                                json.object([
                                  #("id", json.string(new_id)),
                                  #("code", json.string(code)),
                                  #("ok", json.bool(True)),
                                ])
                                |> json.to_string,
                                201,
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
}

/// PATCH /api/v1/catalog/manage/theme-items/:id
pub fn patch_manage_theme_item(req: Request, ctx: Context, item_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
        Error(_) -> json_err(400, "empty_body")
        Ok(body) ->
          case json.parse(body, patch_manage_theme_item_decoder()) {
            Error(_) -> json_err(400, "invalid_json")
            Ok(#(label_raw, loc_raw)) ->
              case
                theme_manage_ok_len(label_raw, 500)
                && theme_manage_ok_len(loc_raw, 16)
              {
                False -> json_err(400, "invalid_fields")
                True ->
                  case
                    pog.query(
                      "insert into category_theme_item_translations (item_id, locale_id, label) "
                      <> "select $1::uuid, lo.id, $3 from locales lo where lower(lo.code) = lower($2) limit 1 "
                      <> "on conflict (item_id, locale_id) do update set label = excluded.label",
                    )
                    |> pog.parameter(pog.text(string.trim(item_id)))
                    |> pog.parameter(pog.text(loc_raw))
                    |> pog.parameter(pog.text(label_raw))
                    |> pog.execute(ctx.db)
                  {
                    Error(_) -> json_err(500, "theme_item_translation_failed")
                    Ok(_) -> {
                      let body =
                        json.object([#("ok", json.bool(True))])
                        |> json.to_string
                      wisp.json_response(body, 200)
                    }
                  }
              }
          }
      }
  }
}

/// DELETE /api/v1/catalog/manage/theme-items/:id
pub fn delete_manage_theme_item(req: Request, ctx: Context, item_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from category_theme_items where id = $1::uuid returning id::text")
        |> pog.parameter(pog.text(string.trim(item_id)))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "theme_item_delete_failed")
        Ok(r) ->
          case r.rows {
            [] -> json_err(404, "theme_item_not_found")
            [_] -> {
              let body =
                json.object([#("ok", json.bool(True))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected")
          }
      }
  }
}

// ─── Public Category Stats ────────────────────────────────────────────────────

fn cat_stats_row() -> decode.Decoder(#(String, Int)) {
  use code <- decode.field(0, decode.string)
  use cnt  <- decode.field(1, decode.int)
  decode.success(#(code, cnt))
}

/// GET /api/v1/catalog/public/category-stats
/// Yayımlanan ilanların kategori koduna göre sayısını döner.
pub fn public_category_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let sql =
    "select coalesce(pc.code,''), count(*)::int "
    <> "from listings l "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "where l.status = 'published' "
    <> "group by pc.code"
  case
    pog.query(sql)
    |> pog.returning(cat_stats_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "stats_failed")
    Ok(ret) -> {
      let pairs =
        list.map(ret.rows, fn(row) {
          let #(code, cnt) = row
          #(code, json.int(cnt))
        })
      let body =
        json.object([#("stats", json.object(pairs))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

// ─── Public Region Stats ──────────────────────────────────────────────────────

fn region_stats_row() -> decode.Decoder(#(String, String, Int, String)) {
  use slug      <- decode.field(0, decode.string)
  use name      <- decode.field(1, decode.string)
  use cnt       <- decode.field(2, decode.int)
  use thumbnail <- decode.field(3, decode.string)
  decode.success(#(slug, name, cnt, thumbnail))
}

/// GET /api/v1/catalog/public/region-stats?category_code=&limit=
/// Kategoriye göre yayımlı ilanların bulunduğu bölgeler (ilan sayısına göre sıralı).
pub fn public_region_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let lim_str =
    list.key_find(qs, "limit")
    |> result.unwrap("12")
    |> string.trim
  let lim = case int.parse(lim_str) {
    Ok(n) ->
      case n > 50 {
        True -> 50
        False -> case n < 1 { True -> 12  False -> n }
      }
    Error(_) -> 12
  }
  let cat_raw =
    list.key_find(qs, "category_code")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  case cat_raw == "" {
    True -> {
      let body =
        json.object([
          #("regions", json.array(from: [], of: fn(x) { x })),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
    False -> {
      let is_tour = cat_raw == "tour"
      let sql = case is_tour {
        True -> region_stats_tour_sql()
        False -> region_stats_domestic_sql()
      }
      case
        pog.query(sql)
        |> pog.parameter(pog.int(lim))
        |> pog.parameter(pog.text(cat_raw))
        |> pog.returning(region_stats_row())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "region_stats_failed")
        Ok(ret) -> {
          let rows =
            list.map(ret.rows, fn(row) {
              let #(slug, name, cnt, thumbnail) = row
              json.object([
                #("slug", json.string(slug)),
                #("name", json.string(name)),
                #("count", json.int(cnt)),
                #("thumbnail", json.string(thumbnail)),
              ])
            })
          let body =
            json.object([
              #("regions", json.array(from: rows, of: fn(x) { x })),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}

fn region_stats_domestic_sql() -> String {
  "with base as ( "
  <> "  select l.id, "
  <> "    lower(coalesce(nullif(trim(l.location_name), ''), '')) as location_name, "
  <> "    lower(coalesce(lm.value_json->>'province_city', '')) as province_city, "
  <> "    lower(coalesce(lm.value_json->>'city', '')) as city, "
  <> "    lower(coalesce(lm.value_json->>'district_label', '')) as district_label, "
  <> "    lower(coalesce(lm.value_json->>'region_display', '')) as region_display, "
  <> "    lower(coalesce(lm.value_json->>'address', '')) as address "
  <> "  from listings l "
  <> "  join product_categories pc on pc.id = l.category_id "
  <> "  left join listing_attributes lm on lm.listing_id = l.id "
  <> "    and lm.group_code = 'listing_meta' and lm.key = 'v1' "
  <> "  where l.status = 'published' and pc.code = $2 "
  <> "), matched as ( "
  <> "  select distinct on (b.id) "
  <> "    b.id as listing_id, r.id as region_id, r.slug, r.name "
  <> "  from base b "
  <> "  join regions r on ( "
  <> "    b.location_name like '%' || lower(r.name) || '%' "
  <> "    or b.province_city like '%' || lower(r.name) || '%' "
  <> "    or b.city like '%' || lower(r.name) || '%' "
  <> "    or b.region_display like '%' || lower(r.name) || '%' "
  <> "    or b.district_label like '%' || lower(r.name) || '%' "
  <> "    or b.address like '%' || lower(r.name) || '%' "
  <> "    or replace(b.location_name, ' ', '-') = r.slug "
  <> "  ) "
  <> "  join countries c on c.id = r.country_id and c.iso2 = 'TR' "
  <> "  order by b.id, length(r.name) desc, r.name "
  <> ") "
  <> "select "
  <> "  'TR/' || m.slug as slug, "
  <> "  m.name, "
  <> "  count(*)::int as cnt, "
  <> "  coalesce( "
  <> "    max(nullif(lp.cover_image, '')), "
  <> "    max(nullif(lp.featured_image_url, '')), "
  <> "    max(nullif(lp.hero_image_url, '')), "
  <> "    '' "
  <> "  ) as thumbnail "
  <> "from matched m "
  <> "left join location_pages lp on lp.region_id = m.region_id "
  <> "  and coalesce(lp.region_type, 'province') = 'province' "
  <> "group by m.region_id, m.slug, m.name "
  <> "having count(*) > 0 "
  <> "order by count(*) desc, m.name asc "
  <> "limit $1"
}

fn region_stats_tour_sql() -> String {
  "with tour_base as ( "
  <> "  select l.id, "
  <> "    lower(coalesce(nullif(trim(l.location_name), ''), '')) as location_name, "
  <> "    coalesce(w.value_json->'catalog'->'countries', w.value_json->'countries', '[]'::jsonb) as countries_json, "
  <> "    trim(coalesce( "
  <> "      w.value_json->'catalog'->'tourArea'->>'name', "
  <> "      w.value_json->'catalog'->'tourArea'->>'text', "
  <> "      '' "
  <> "    )) as tour_area "
  <> "  from listings l "
  <> "  join product_categories pc on pc.id = l.category_id "
  <> "  left join listing_tour_details tour_det on tour_det.listing_id = l.id "
  <> tour_listing_vitrin_price_numeric_lateral_sql()
  <> "  left join listing_attributes w on w.listing_id = l.id "
  <> "    and w.group_code = 'wtatil' and w.key = 'snapshot' "
  <> "  where l.status = 'published' and pc.code = 'tour' "
  <> "    and tour_price_row.tour_vitrin_price is not null and tour_price_row.tour_vitrin_price > 0 "
  <> "), tour_dest as ( "
  <> "  select distinct on (tb.id) "
  <> "    tb.id as listing_id, "
  <> "    coalesce( "
  <> "      nullif(trim(elem->>'code'), ''), "
  <> "      nullif(trim(elem->>'name'), ''), "
  <> "      nullif(tb.tour_area, ''), "
  <> "      nullif(initcap(trim(tb.location_name)), ''), "
  <> "      'Diger' "
  <> "    ) as dest_label, "
  <> "    case "
  <> "      when nullif(trim(elem->>'code'), '') is not null "
  <> "        then upper(trim(elem->>'code')) "
  <> "      when nullif(trim(co.iso2), '') is not null "
  <> "        then upper(co.iso2) "
  <> "      else lower(regexp_replace( "
  <> "        coalesce(nullif(trim(elem->>'name'), ''), nullif(tb.tour_area, ''), trim(tb.location_name), 'diger'), "
  <> "        '[^a-zA-Z0-9]+', '-', 'g' "
  <> "      )) "
  <> "    end as dest_slug, "
  <> "    case "
  <> "      when coalesce(c_tr.iso2, '') = 'TR' then 1 "
  <> "      when lower(coalesce(nullif(trim(elem->>'name'), ''), tb.tour_area, tb.location_name, '')) "
  <> "        in ('türkiye', 'turkiye', 'turkey', 'tr') then 1 "
  <> "      else 0 "
  <> "    end as is_domestic "
  <> "  from tour_base tb "
  <> "  left join lateral jsonb_array_elements( "
  <> "    case when jsonb_array_length(tb.countries_json) > 0 then tb.countries_json else '[{}]'::jsonb end "
  <> "  ) elem on true "
  <> "  left join countries co on co.iso2 is not null and ( "
  <> "    lower(trim(coalesce(elem->>'code', ''))) = lower(co.iso2) "
  <> "    or lower(trim(coalesce(elem->>'name', ''))) = lower(co.name) "
  <> "    or (trim(coalesce(elem->>'name', '')) <> '' and lower(co.name) like '%' || lower(trim(elem->>'name')) || '%') "
  <> "  ) "
  <> "  left join countries c_tr on c_tr.id = co.id and c_tr.iso2 = 'TR' "
  <> "  order by tb.id, "
  <> "    case when jsonb_array_length(tb.countries_json) > 0 and elem != '{}'::jsonb then 0 else 1 end, "
  <> "    length(coalesce(nullif(trim(elem->>'name'), ''), tb.tour_area, '')) desc "
  <> ") "
  <> "select "
  <> "  td.dest_slug as slug, "
  <> "  td.dest_label as name, "
  <> "  count(*)::int as cnt, "
  <> "  coalesce( "
  <> "    max(nullif(lp.cover_image, '')), "
  <> "    max(nullif(lp.featured_image_url, '')), "
  <> "    max(nullif(lp.hero_image_url, '')), "
  <> "    '' "
  <> "  ) as thumbnail "
  <> "from tour_dest td "
  <> "left join location_pages lp on ( "
  <> "  lower(lp.slug_path) = lower(td.dest_slug) "
  <> "  or lower(lp.slug_path) = 'tr/' || lower(td.dest_slug) "
  <> ") "
  <> "group by td.dest_slug, td.dest_label "
  <> "having count(*) > 0 "
  <> "order by min(td.is_domestic) asc, count(*) desc, td.dest_label asc "
  <> "limit $1"
}

// ─── Collections CRUD ─────────────────────────────────────────────────────────

fn collection_row() -> decode.Decoder(
  #(String, String, String, String, String, String, Int, Bool),
) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use title <- decode.field(2, decode.string)
  use description <- decode.field(3, decode.string)
  use hero_image_url <- decode.field(4, decode.string)
  use filter_rules <- decode.field(5, decode.string)
  use sort_order <- decode.field(6, decode.int)
  use is_active <- decode.field(7, decode.bool)
  decode.success(#(id, slug, title, description, hero_image_url, filter_rules, sort_order, is_active))
}

fn collection_json(
  row: #(String, String, String, String, String, String, Int, Bool),
) -> json.Json {
  let #(id, slug, title, description, hero_image_url, filter_rules, sort_order, is_active) = row
  let dj = case description == "" { True -> json.null()  False -> json.string(description) }
  let hij = case hero_image_url == "" { True -> json.null()  False -> json.string(hero_image_url) }
  json.object([
    #("id", json.string(id)),
    #("slug", json.string(slug)),
    #("title", json.string(title)),
    #("description", dj),
    #("hero_image_url", hij),
    #("filter_rules", json.string(filter_rules)),
    #("sort_order", json.int(sort_order)),
    #("is_active", json.bool(is_active)),
  ])
}

/// GET /api/v1/collections — herkese açık (sadece aktif)
pub fn list_collections(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let all_raw =
    list.key_find(qs, "all")
    |> result.unwrap("")
    |> string.trim
  let active_only = all_raw != "true"
  let where_clause = case active_only {
    True -> " where is_active = true "
    False -> " "
  }
  case
    pog.query(
      "select id::text, slug, title, coalesce(description,''), coalesce(hero_image_url,''), coalesce(filter_rules::text,'{}'), sort_order, is_active from listing_collections"
      <> where_clause
      <> "order by sort_order, created_at desc limit 200",
    )
    |> pog.returning(collection_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "collections_query_failed")
    Ok(ret) -> {
      let arr = list.map(ret.rows, collection_json)
      let body =
        json.object([#("collections", json.array(from: arr, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

/// GET /api/v1/collections/:slug
pub fn get_collection_by_slug(req: Request, ctx: Context, slug: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(
      "select id::text, slug, title, coalesce(description,''), coalesce(hero_image_url,''), coalesce(filter_rules::text,'{}'), sort_order, is_active from listing_collections where slug = $1 limit 1",
    )
    |> pog.parameter(pog.text(string.trim(slug)))
    |> pog.returning(collection_row())
    |> pog.execute(ctx.db)
  {
    Error(_) -> json_err(500, "collection_query_failed")
    Ok(ret) ->
      case ret.rows {
        [] -> json_err(404, "not_found")
        [row] -> {
          let body =
            json.object([#("collection", collection_json(row))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
        _ -> json_err(500, "unexpected")
      }
  }
}

fn create_collection_decoder() -> decode.Decoder(
  #(String, String, Option(String), Option(String), String),
) {
  decode.field("slug", decode.string, fn(slug) {
    decode.field("title", decode.string, fn(title) {
      decode.optional_field("description", None, decode.optional(decode.string), fn(desc) {
        decode.optional_field("hero_image_url", None, decode.optional(decode.string), fn(hero) {
          decode.optional_field("filter_rules", "{}", decode.string, fn(rules) {
            decode.success(#(string.trim(slug), string.trim(title), desc, hero, rules))
          })
        })
      })
    })
  })
}

/// POST /api/v1/collections — admin
pub fn create_collection(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, create_collection_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug, title, desc, hero, rules)) ->
          case slug == "" || title == "" {
            True -> json_err(400, "slug_and_title_required")
            False -> {
              let dp = case desc {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              let hp = case hero {
                None -> pog.null()
                Some(s) -> pog.text(s)
              }
              case
                pog.query(
                  "insert into listing_collections (slug, title, description, hero_image_url, filter_rules) values ($1, $2, $3, $4, ($5::text)::jsonb) returning id::text",
                )
                |> pog.parameter(pog.text(slug))
                |> pog.parameter(pog.text(title))
                |> pog.parameter(dp)
                |> pog.parameter(hp)
                |> pog.parameter(pog.text(rules))
                |> pog.returning(row_dec.col0_string())
                |> pog.execute(ctx.db)
              {
                Error(_) -> json_err(409, "create_failed")
                Ok(r) ->
                  case r.rows {
                    [id] -> wisp.json_response(json.object([#("id", json.string(id))]) |> json.to_string, 201)
                    _ -> json_err(500, "unexpected")
                  }
              }
            }
          }
      }
    }
  }
}

fn patch_collection_decoder() -> decode.Decoder(
  #(
    Option(String), Option(String), Option(String), Option(String),
    Option(String), Option(Int), Option(Bool),
  ),
) {
  decode.optional_field("slug", None, decode.optional(decode.string), fn(slug) {
    decode.optional_field("title", None, decode.optional(decode.string), fn(title) {
      decode.optional_field("description", None, decode.optional(decode.string), fn(desc) {
        decode.optional_field("hero_image_url", None, decode.optional(decode.string), fn(hero) {
          decode.optional_field("filter_rules", None, decode.optional(decode.string), fn(rules) {
            decode.optional_field("sort_order", None, decode.optional(decode.int), fn(so) {
              decode.optional_field("is_active", None, decode.optional(decode.bool), fn(ia) {
                decode.success(#(slug, title, desc, hero, rules, so, ia))
              })
            })
          })
        })
      })
    })
  })
}

fn opt_text(o: Option(String)) -> pog.Value {
  case o {
    None -> pog.null()
    Some(s) ->
      case string.trim(s) == "" {
        True -> pog.null()
        False -> pog.text(string.trim(s))
      }
  }
}

/// PATCH /api/v1/collections/:id — admin
pub fn patch_collection(req: Request, ctx: Context, col_id: String) -> Response {
  use <- wisp.require_method(req, http.Patch)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case read_body_string(req) {
    Error(_) -> json_err(400, "empty_body")
    Ok(body) ->
      case json.parse(body, patch_collection_decoder()) {
        Error(_) -> json_err(400, "invalid_json")
        Ok(#(slug_opt, title_opt, desc_opt, hero_opt, rules_opt, so_opt, ia_opt)) -> {
          let p_slug = opt_text(slug_opt)
          let p_title = opt_text(title_opt)
          let p_desc = opt_text(desc_opt)
          let p_hero = opt_text(hero_opt)
          let p_rules = opt_text(rules_opt)
          let p_so = case so_opt {
            None -> pog.null()
            Some(n) -> pog.int(n)
          }
          let p_ia = case ia_opt {
            None -> pog.null()
            Some(b) -> pog.bool(b)
          }
          case
            pog.query(
              "update listing_collections set slug = coalesce($2::text, slug), title = coalesce($3::text, title), description = coalesce($4::text, description), hero_image_url = coalesce($5::text, hero_image_url), filter_rules = coalesce(($6::text)::jsonb, filter_rules), sort_order = coalesce($7::int, sort_order), is_active = coalesce($8::boolean, is_active), updated_at = now() where id = $1::uuid returning id::text",
            )
            |> pog.parameter(pog.text(string.trim(col_id)))
            |> pog.parameter(p_slug)
            |> pog.parameter(p_title)
            |> pog.parameter(p_desc)
            |> pog.parameter(p_hero)
            |> pog.parameter(p_rules)
            |> pog.parameter(p_so)
            |> pog.parameter(p_ia)
            |> pog.returning(row_dec.col0_string())
            |> pog.execute(ctx.db)
          {
            Error(_) -> json_err(500, "update_failed")
            Ok(r) ->
              case r.rows {
                [] -> json_err(404, "not_found")
                [id] -> wisp.json_response(json.object([#("id", json.string(id)), #("ok", json.bool(True))]) |> json.to_string, 200)
                _ -> json_err(500, "unexpected")
              }
          }
        }
      }
    }
  }
}

/// DELETE /api/v1/collections/:id — admin
pub fn delete_collection(req: Request, ctx: Context, col_id: String) -> Response {
  use <- wisp.require_method(req, http.Delete)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) ->
      case
        pog.query("delete from listing_collections where id = $1::uuid returning id::text")
        |> pog.parameter(pog.text(string.trim(col_id)))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(ctx.db)
      {
        Error(_) -> json_err(500, "delete_failed")
        Ok(r) ->
          case r.rows {
            [] -> json_err(404, "not_found")
            [_] -> wisp.json_response(json.object([#("ok", json.bool(True))]) |> json.to_string, 200)
            _ -> json_err(500, "unexpected")
          }
      }
  }
}



