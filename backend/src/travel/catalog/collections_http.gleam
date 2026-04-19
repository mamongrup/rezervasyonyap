//// Koleksiyon sayfaları CRUD + public listing arama (GET /api/v1/catalog/public/listings).

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
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
  use first_charge_amount <- decode.field(25, decode.string)
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
    first_charge_amount,
  ))
}

fn json_opt_str(s: String) -> json.Json {
  case s == "" {
    True -> json.null()
    False -> json.string(s)
  }
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
    first_charge_amount,
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
    #("first_charge_amount", json_opt_str(first_charge_amount)),
  ])
}

/// GET /api/v1/catalog/public/listings?q=&category_code=&location=&limit=&locale=&listing_ids=id1,id2
pub fn search_public_listings(req: Request, ctx: Context) -> Response {
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
    <> "coalesce(l.featured_image_url, l.thumbnail_url, ''), "
    <> "coalesce((select cc.price_from_amount::text from category_contracts cc where cc.listing_id = l.id and cc.is_default = true limit 1), ''), "
    <> "coalesce(l.location_name, ''), "
    <> "coalesce(l.review_avg::text, ''), "
    <> "coalesce((select case "
    <> "  when sum(case when plan_code != 'room_only' then 1 else 0 end) > 0 "
    <> "    and sum(case when plan_code = 'room_only' then 1 else 0 end) > 0 then 'both' "
    <> "  when sum(case when plan_code != 'room_only' then 1 else 0 end) > 0 then 'meal_only' "
    <> "  when sum(case when plan_code = 'room_only' then 1 else 0 end) > 0 then 'room_only' "
    <> "  else null end "
    <> "from listing_meal_plans where listing_id = l.id and is_active = true), '') "
    <> ", coalesce(l.map_lat::text, ''), coalesce(l.map_lng::text, '') "
    <> ", coalesce((select value_json->>'max_guests' from listing_attributes la where la.listing_id = l.id and la.group_code='listing_meta' and la.key='v1' limit 1), '') "
    <> ", coalesce((select value_json->>'room_count' from listing_attributes la where la.listing_id = l.id and la.group_code='listing_meta' and la.key='v1' limit 1), '') "
    <> ", coalesce((select value_json->>'bath_count' from listing_attributes la where la.listing_id = l.id and la.group_code='listing_meta' and la.key='v1' limit 1), '') "
    <> ", coalesce((select value_json->>'property_type' from listing_attributes la where la.listing_id = l.id and la.group_code='listing_meta' and la.key='v1' limit 1), '') "
    <> ", coalesce(array_to_string(h.theme_codes, ','), '') "
    <> ", coalesce(l.ministry_license_ref::text, ''), coalesce(l.prepayment_percent::text, '') "
    <> ", coalesce(l.cancellation_policy_text::text, '') "
    <> ", coalesce(l.min_stay_nights::text, '') "
    <> ", case when coalesce(l.allow_sub_min_stay_gap_booking, false) then 'true' else 'false' end "
    <> ", coalesce((select value_json->>'min_advance_booking_days' from listing_attributes la where la.listing_id = l.id and la.group_code='listing_meta' and la.key='v1' limit 1), '') "
    <> ", coalesce((select value_json->>'min_short_stay_nights' from listing_attributes la where la.listing_id = l.id and la.group_code='listing_meta' and la.key='v1' limit 1), '') "
    <> ", coalesce((select value_json->>'short_stay_fee' from listing_attributes la where la.listing_id = l.id and la.group_code='listing_meta' and la.key='v1' limit 1), '') "
    <> ", coalesce(l.currency_code::text, '') "
    <> ", coalesce(l.first_charge_amount::text, '') "
    <> "from listings l "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "left join listing_holiday_home_details h on h.listing_id = l.id "
    <> "where l.status = 'published' "
    <> "and ($1::text is null or lower(coalesce((select lt2.title from listing_translations lt2 join locales lo2 on lo2.id = lt2.locale_id where lt2.listing_id = l.id order by case when lower(lo2.code) = 'tr' then 0 else 1 end limit 1), l.slug)) ilike $1 or lower(l.slug) ilike $1) "
    <> "and ($2::text is null or pc.code = $2) "
    <> "and ($3::text is null or lower(coalesce(l.location_name,'')) ilike $3) "
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
    <> "order by l.review_avg desc nulls last, l.created_at desc "
    <> "limit $5"

  case
    pog.query(sql)
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
    |> pog.returning(pub_listing_row())
    |> pog.execute(ctx.db)
  {
    Error(e) -> {
      let _ = e
      json_err(500, "search_failed")
    }
    Ok(ret) -> {
      let arr = list.map(ret.rows, pub_listing_json)
      let body =
        json.object([
          #("listings", json.array(from: arr, of: fn(x) { x })),
          #("total", json.int(list.length(arr))),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
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
                  "insert into listing_collections (slug, title, description, hero_image_url, filter_rules) values ($1, $2, $3, $4, $5::jsonb) returning id::text",
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
              "update listing_collections set slug = coalesce($2::text, slug), title = coalesce($3::text, title), description = coalesce($4::text, description), hero_image_url = coalesce($5::text, hero_image_url), filter_rules = coalesce($6::jsonb, filter_rules), sort_order = coalesce($7::int, sort_order), is_active = coalesce($8::boolean, is_active), updated_at = now() where id = $1::uuid returning id::text",
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



