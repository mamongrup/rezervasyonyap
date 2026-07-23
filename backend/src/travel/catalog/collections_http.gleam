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
import travel/db/resilient_pog as db_exec
import travel/db/decode_helpers as row_dec
import travel/db/pog_errors
import travel/identity/admin_gate
import wisp.{type Request, type Response}

/// Vitrin liste sayfası sorgusu için pog zaman aşımı. pog varsayılanı 5000 ms —
/// soğuk önbellekte (I/O baskılı host) otel sorgusu 2-6 sn sürebiliyor; 5 sn'de
/// kesmek ziyaretçiye 500 döndürüyordu. PG_STATEMENT_TIMEOUT_MS (15 sn) altında
/// kalır ki sunucu tarafı sorgu da aynı pencerede iptal edilsin.
const vitrin_query_timeout_ms = 12_000

/// Autocomplete (`?suggest=1`) — kısa timeout; ağır browse pipeline kullanılmaz.
const suggest_query_timeout_ms = 3000

/// Bölge slider / kategori shell — anasayfa RSC stream'ini açık tutmamak için
/// kısa pog timeout. 16k+ otelde EXISTS/LIKE yok; aggregate + eşitlik hedef <500 ms.
const region_stats_query_timeout_ms = 2500

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
  <> " as v) px) tour_price_row on pc.code = 'tour' "
}

/// Vitrinde fiyatsız turlar listelenmesin. vitrin_price; wtatil fiyat senkronu +
/// refresh_listing_vitrin_prices() ile dolar — fiyatı olmayan tur vitrinde görünmez.
/// Günlük sync-wtatil-auto + vitrin timer sonrası fiyatı gelen turlar otomatik görünür.
/// `$6` (listing_ids) doluysa atlanır: detay/checkout hydrate vitrin kapısından geçmez.
fn tour_public_must_have_price_sql() -> String {
  "and ($6::text is not null or pc.code != 'tour' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) "
}

/// Vitrinde fiyatsız oteller listelenmesin (KPlus/Travelrobot import'ta fiyatı
/// gelmeyen oteller). vitrin_price; price_rules + meal_plans + first_charge'ı
/// kapsar (342 nolu migration) → kartta fiyat görünen otel asla gizlenmez,
/// yalnızca hiçbir kaynakta fiyatı olmayan otel gizlenir.
/// refresh_listing_vitrin_prices() import sonrası ve periyodik çalışmalıdır.
/// `$6` (listing_ids) doluysa atlanır: detay sayfası hydrate için fiyat kapısı uygulanmaz.
fn hotel_public_must_have_price_sql() -> String {
  "and ($6::text is not null or pc.code != 'hotel' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) "
}

/// Tatil evi / yat / araç — arama tarihlerinde konaklama geceleri (çıkış hariç) yarım gün müsaitliği.
fn listing_half_day_stay_calendar_filter_sql() -> String {
  "and ($8::text is null or $9::text is null or pc.code not in ('holiday_home', 'yacht_charter', 'car_rental') or not exists ( "
  <> "  select 1 from generate_series($8::date, ($9::date - interval '1 day')::date, interval '1 day') as ns(day) "
  <> "  left join listing_availability_calendar c on c.listing_id = l.id and c.day = ns.day::date "
  <> "  where ( "
  <> "    (ns.day = $8::date and coalesce(c.pm_available, c.is_available, true) = false) "
  <> "    or (ns.day > $8::date and ( "
  <> "      coalesce(c.am_available, c.is_available, true) = false "
  <> "      or coalesce(c.pm_available, c.is_available, true) = false "
  <> "    )) "
  <> "  ) "
  <> ")) "
}

/// `vitrin_price` sütunu / önbellek migration'ı uygulanmamış DB'lerde arama 500 vermesin.
fn strip_vitrin_price_cache_sql(sql: String) -> String {
  sql
  |> string.replace(tour_public_must_have_price_sql(), "")
  |> string.replace(hotel_public_must_have_price_sql(), "")
  |> string.replace(
    "and (pc.code != 'tour' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) ",
    "",
  )
  |> string.replace(
    "and (pc.code != 'hotel' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) ",
    "",
  )
  |> string.replace("nullif(l.vitrin_price::text, ''), ", "")
  |> string.replace("coalesce(l.vitrin_price, l.first_charge_amount)", "l.first_charge_amount")
  |> string.replace("coalesce(l.vitrin_price, 0)", "coalesce(l.first_charge_amount, 0)")
  |> string.replace(
    ") price_rule on (pc.code in ('holiday_home', 'yacht_charter') or l.vitrin_price is null) ",
    ") price_rule on true ",
  )
  |> string.replace(
    ") meal_vitrin on (l.vitrin_price is null) ",
    ") meal_vitrin on true ",
  )
}

/// Vitrin liste sayımı ile aynı filtreler (görsel + tur/otel fiyat kapısı).
/// Stats sorgusunda `$6` bağlanmaz → browse (kapılı) varyantları kullanılır.
fn public_category_stats_filter_sql() -> String {
  public_listing_must_have_image_browse_sql()
  <> "and (pc.code != 'tour' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) "
  <> "and (pc.code != 'hotel' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) "
}

fn public_category_stats_query_sql(filter: String) -> String {
  "select coalesce(pc.code,''), count(*)::int "
  <> "from listings l "
  <> "join product_categories pc on pc.id = l.category_id "
  <> "where l.status = 'published' "
  <> filter
  <> "group by pc.code"
}

fn listing_count_col() -> decode.Decoder(Int) {
  use n <- decode.field(0, decode.int)
  decode.success(n)
}

fn run_listing_count_sql(
  ctx: Context,
  sql: String,
  run_params,
  fallback: Int,
  allow_vitrin_strip: Bool,
) -> Int {
  case
    pog.query(sql)
    |> run_params
    |> pog.returning(listing_count_col())
    |> db_exec.execute(ctx.db)
  {
    Error(e) -> {
      let _ =
        io.println(
          "[catalog.public.listings:count] "
            <> pog_errors.query_error_to_string(e),
        )
      // Strip fallback yalnızca eksik şema (42703/42P01) içindir; timeout gibi
      // hatalarda daha yavaş legacy SQL'i tekrar çalıştırmak yükü katlar.
      case allow_vitrin_strip && pog_errors.is_missing_schema(e) {
        False -> fallback
        True -> {
          let legacy = strip_vitrin_price_cache_sql(sql)
          case legacy != sql {
            True ->
              run_listing_count_sql(ctx, legacy, run_params, fallback, False)
            False -> fallback
          }
        }
      }
    }
    Ok(count_ret) ->
      case count_ret.rows {
        [n] -> n
        _ -> fallback
      }
  }
}

/// Public vitrin/kategori listelerinde görselsiz ilan gösterilmez.
/// Kart görseli üç kaynaktan gelebilir: featured_image_url, thumbnail_url veya listing_images.
///
/// İstisna: `flight` (uçak bileti) ilanları mülk/otel tarzı fotoğraf taşımaz —
/// bu kapı tüm uçuşları (292 yayında ilan) vitrinden tamamen gizliyordu
/// (category-stats'ta "flight" hiç görünmüyordu, /uçak-bileti listesi boştu).
/// `pc` alias'ının her çağrı noktasında join edilmiş olması garanti olmadığından
/// (ör. get_public_listing_id_by_slug) `l.category_id` üzerinden alt sorgu kullanılır.
///
/// `$6` (listing_ids) doluysa kapı atlanır — detay/checkout hydrate görselsiz yayında
/// ilanı da açabilsin; kategori listesi/istatistik hâlâ görsel ister.
fn public_listing_must_have_image_sql() -> String {
  "and ($6::text is not null or l.category_id in (select id from product_categories where code = 'flight') "
  <> "or coalesce(trim(l.featured_image_url), '') <> '' "
  <> "or coalesce(trim(l.thumbnail_url), '') <> '' "
  <> "or exists (select 1 from listing_images li_img where li_img.listing_id = l.id and trim(coalesce(li_img.storage_key, '')) <> '' limit 1)) "
}

/// Kategori vitrin/istatistik — listing_ids yok; görsel kapısı her zaman uygulanır.
fn public_listing_must_have_image_browse_sql() -> String {
  "and (l.category_id in (select id from product_categories where code = 'flight') "
  <> "or coalesce(trim(l.featured_image_url), '') <> '' "
  <> "or coalesce(trim(l.thumbnail_url), '') <> '' "
  <> "or exists (select 1 from listing_images li_img where li_img.listing_id = l.id and trim(coalesce(li_img.storage_key, '')) <> '' limit 1)) "
}

/// Aktivite vitrin fiyatı — aktif seanslardaki en düşük yetişkin ücreti (kişi başı).
fn activity_listing_vitrin_price_sql() -> String {
  "(select min(f.price_amount)::text from listing_activity_sessions s "
  <> "join listing_activity_session_fares f on f.session_id = s.id and f.fare_type = 'adult' "
  <> "where s.listing_id = l.id and s.is_active = true "
  <> "and f.price_amount is not null and f.price_amount > 0)"
}

/// Aktivite vitrin para birimi — en düşük yetişkin ücretinin `currency_code`.
fn activity_listing_vitrin_fare_currency_sql() -> String {
  "(select f.currency_code from listing_activity_sessions s "
  <> "join listing_activity_session_fares f on f.session_id = s.id and f.fare_type = 'adult' "
  <> "where s.listing_id = l.id and s.is_active = true "
  <> "and f.price_amount is not null and f.price_amount > 0 "
  <> "order by f.price_amount asc limit 1)"
}

fn safe_int_sql(value_sql: String) -> String {
  "case when nullif(trim(" <> value_sql <> "), '') ~ '^[0-9]+$' then nullif(trim("
    <> value_sql
    <> "), '')::int else null end"
}

fn activity_listing_vitrin_price_numeric_lateral_sql() -> String {
  "left join lateral (select case when ax.v is null or trim(ax.v) = '' then null "
  <> "when replace(trim(ax.v), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' "
  <> "then replace(trim(ax.v), ',', '.')::numeric else null end as activity_vitrin_price "
  <> "from (select "
  <> activity_listing_vitrin_price_sql()
  <> " as v) ax) activity_price_row on pc.code = 'activity' "
}

/// Konaklama vitrin fiyatı — tek lateral tarama (SELECT içinde 3 correlated subquery yerine).
/// vitrin_price doluyken meal_plans taramasını atla (price_from cache'ten gelir).
fn listing_meal_plan_vitrin_lateral_sql_conditional() -> String {
  "left join lateral (select "
  <> "nullif((array_agg(m.price_per_night order by m.sort_order asc) filter (where m.plan_code = 'room_only'))[1]::text, '') as room_only_price, "
  <> "nullif(min(m.price_per_night) filter (where l.first_charge_amount is null or m.price_per_night is distinct from l.first_charge_amount)::text, '') as min_other_price, "
  <> "nullif(case when l.first_charge_amount is null then min(m.price_per_night)::text else null end, '') as min_fallback_price "
  <> "from listing_meal_plans m where m.listing_id = l.id and m.is_active = true) meal_vitrin on (l.vitrin_price is null) "
}

// ─── Tatil evi arama sonucu — tarih aralığı TOPLAM fiyatı ────────────────────
// Vitrin kartında gecelik min–max yerine seçili check-in/check-out aralığının
// toplam tutarını (temizlik + kısa konaklama + gecelik/konaklama başına ek
// ücretler dahil) göstermek için. Detay sayfasındaki `useStayListingQuote` /
// `computeStayRentalLodgingQuote` (frontend) mantığının SQL karşılığıdır.

/// Metin alanını (virgüllü/nokta) güvenli `numeric`'e çevirir; sayısal değilse NULL.
fn safe_numeric_sql(value_sql: String) -> String {
  "(case when replace(trim(coalesce("
  <> value_sql
  <> ", '')), ',', '.') ~ '^[0-9]+(\\.[0-9]{1,2})?$' then replace(trim(coalesce("
  <> value_sql
  <> ", '')), ',', '.')::numeric end)"
}

/// `listing_price_rules.rule_json` içindeki tek bir gecelik alanı — güvenli numeric.
fn holiday_home_rule_field_numeric_sql(field: String) -> String {
  safe_numeric_sql("r.rule_json->>'" <> field <> "'")
}

/// Dönemsel kuralda temel gecelik (hafta içi/varsayılan) — aynı alan önceliği
/// `listing_price_rule_nightly_lateral_values_sql` ile tutarlı.
fn holiday_home_rule_base_nightly_sql() -> String {
  "coalesce("
  <> holiday_home_rule_field_numeric_sql("base_nightly")
  <> ", "
  <> holiday_home_rule_field_numeric_sql("base_price")
  <> ", "
  <> holiday_home_rule_field_numeric_sql("room_only_nightly")
  <> ", "
  <> holiday_home_rule_field_numeric_sql("yemeksiz_nightly")
  <> ", "
  <> holiday_home_rule_field_numeric_sql("meals_included_nightly")
  <> ")"
}

/// Dönemsel kuralda hafta sonu gecelik (varsa).
fn holiday_home_rule_weekend_nightly_sql() -> String {
  "coalesce("
  <> holiday_home_rule_field_numeric_sql("weekend_nightly")
  <> ", "
  <> holiday_home_rule_field_numeric_sql("weekend_price")
  <> ")"
}

/// Belirli bir gece (`gs.day`) için dönemsel kuraldan gecelik — hafta sonuysa
/// ve hafta sonu geceliği tanımlıysa onu, aksi halde temel geceliği kullanır.
fn holiday_home_rule_nightly_for_day_sql() -> String {
  "case when extract(dow from gs.day::date) in (0, 6) and "
  <> holiday_home_rule_weekend_nightly_sql()
  <> " is not null and "
  <> holiday_home_rule_weekend_nightly_sql()
  <> " > 0 then "
  <> holiday_home_rule_weekend_nightly_sql()
  <> " else "
  <> holiday_home_rule_base_nightly_sql()
  <> " end"
}

/// `gs.day` gecesini kapsayan, en güncel (`valid_from`) ve gecelik değeri
/// geçerli olan dönemsel kural — frontend `resolveNightlyFromPriceRulesForDate` ile aynı öncelik.
fn holiday_home_rule_pick_for_day_sql() -> String {
  "(select rr.nightly from listing_price_rules r "
  <> "cross join lateral (select "
  <> holiday_home_rule_nightly_for_day_sql()
  <> " as nightly) rr "
  <> "where r.listing_id = l.id "
  <> "and (r.valid_from is null or r.valid_from <= gs.day::date) "
  <> "and (r.valid_to is null or r.valid_to >= gs.day::date) "
  <> "and rr.nightly is not null and rr.nightly > 0 "
  <> "order by r.valid_from desc nulls last limit 1)"
}

/// Takvim geçersizi/kural yokken listing seviyesinde son çare gecelik —
/// vitrin `price_from` ile aynı kaynak sırası (price_rule min → depozito → yemek planı).
fn holiday_home_fallback_nightly_sql() -> String {
  "coalesce(nullif(price_rule.min_price, 0), nullif(l.first_charge_amount, 0), "
  <> "nullif(meal_vitrin.room_only_price, '')::numeric, "
  <> "nullif(meal_vitrin.min_other_price, '')::numeric, "
  <> "nullif(meal_vitrin.min_fallback_price, '')::numeric)"
}

/// Seçili aralıktaki gecelerin toplamı — takvim override → dönemsel kural → fallback.
fn holiday_home_nightly_sum_sql() -> String {
  "(select coalesce(sum(coalesce(cal.price_override, "
  <> holiday_home_rule_pick_for_day_sql()
  <> ", "
  <> holiday_home_fallback_nightly_sql()
  <> ", 0)), 0) "
  <> "from generate_series($8::date, ($9::date - interval '1 day')::date, interval '1 day') as gs(day) "
  <> "left join listing_availability_calendar cal on cal.listing_id = l.id and cal.day = gs.day::date)"
}

/// Bu geceden kısa konaklamada bir kerelik ek ücret (`listing_meta`).
fn holiday_home_short_stay_fee_applied_sql() -> String {
  let min_nights = safe_int_sql("lm.meta->>'min_short_stay_nights'")
  let fee = safe_numeric_sql("lm.meta->>'short_stay_fee'")
  "case when "
  <> min_nights
  <> " is not null and "
  <> min_nights
  <> " > 0 and "
  <> fee
  <> " is not null and "
  <> fee
  <> " > 0 and ($9::date - $8::date) < "
  <> min_nights
  <> " then "
  <> fee
  <> " else 0 end"
}

/// Panelde tanımlı serbest ek ücretler — tatil evi için `vertical_holiday_home.extra_fees`,
/// yat kiralama için `vertical_yacht_extra.extra_fees` (bkz. `verticals_http.gleam` group_code
/// eşlemesi: `yacht_extra` API kategorisi `vertical_yacht_extra` grubuna yazar).
/// Yalnızca gecelik (`per_night`) ve konaklama başına (`per_stay`) olanlar toplama dahil
/// edilir; kişi başı birimliler arama API'sinde misafir sayısı bilinmediği için hariç tutulur
/// (bkz. plan notu).
fn holiday_home_extra_fees_sum_sql() -> String {
  let amount = "coalesce(" <> safe_numeric_sql("ef->>'amount'") <> ", 0)"
  "coalesce((select sum("
  <> "case when lower(coalesce(ef->>'unit', 'per_stay')) = 'per_night' then "
  <> amount
  <> " * ($9::date - $8::date) "
  <> "when lower(coalesce(ef->>'unit', 'per_stay')) = 'per_stay' then "
  <> amount
  <> " else 0 end"
  <> ") from listing_attributes hh_la "
  <> "cross join lateral jsonb_array_elements("
  <> "case jsonb_typeof(hh_la.value_json->'extra_fees') when 'array' then hh_la.value_json->'extra_fees' else '[]'::jsonb end"
  <> ") as ef "
  <> "where hh_la.listing_id = l.id "
  <> "and hh_la.group_code = (case pc.code when 'yacht_charter' then 'vertical_yacht_extra' else 'vertical_holiday_home' end) "
  <> "and hh_la.key = 'v1'"
  <> "), 0)"
}

/// `range_quote` lateral'ının devreye girme şartı — tatil evi + yat kiralama (aynı rezervasyon
/// çekirdeğini paylaşan iki "stay rental" dikeyi, bkz. `stay-rental-categories.ts`) ve geçerli
/// tarih aralığı. `count_sql` ve `deferred_page_sql`'in `page_ids` CTE'sinde bu tam metin
/// `on (false)` ile değiştirilerek ağır hesaplama yalnızca sayfalanmış sonuçta çalışır
/// (bkz. 51-...mdc §8).
fn holiday_home_range_quote_join_condition_sql() -> String {
  "pc.code in ('holiday_home', 'yacht_charter') and $8::text is not null and $9::text is not null and $9::date > $8::date"
}

/// Seçili check-in/check-out aralığının toplam tutarı + gece sayısı (tatil evi + yat).
fn holiday_home_range_quote_lateral_sql() -> String {
  "left join lateral (select ("
  <> holiday_home_nightly_sum_sql()
  <> ") + coalesce(nullif(l.cleaning_fee_amount, 0), 0) + "
  <> holiday_home_short_stay_fee_applied_sql()
  <> " + "
  <> holiday_home_extra_fees_sum_sql()
  <> " as total, ($9::date - $8::date) as nights) range_quote on ("
  <> holiday_home_range_quote_join_condition_sql()
  <> ") "
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
  use listing_currency_code <- decode.field(25, decode.string)
  use cleaning_fee_amount <- decode.field(26, decode.string)
  use first_charge_amount <- decode.field(27, decode.string)
  use meta_bed_count <- decode.field(28, decode.string)
  use created_at_raw <- decode.field(29, decode.string)
  use mobile_discount_raw <- decode.field(30, decode.string)
  use instant_book_raw <- decode.field(31, decode.string)
  use gallery_paths_agg <- decode.field(32, decode.string)
  use price_rules_nightly_min <- decode.field(33, decode.string)
  use price_rules_nightly_max <- decode.field(34, decode.string)
  use hotel_star_rating <- decode.field(35, decode.string)
  use hotel_type_code <- decode.field(36, decode.string)
  use tour_duration_days <- decode.field(37, decode.string)
  use tour_max_people <- decode.field(38, decode.string)
  use tour_travel_type <- decode.field(39, decode.string)
  use tour_accommodation_type <- decode.field(40, decode.string)
  use tour_languages <- decode.field(41, decode.string)
  use tour_nights <- decode.field(42, decode.string)
  use tour_meal_type <- decode.field(43, decode.string)
  use tour_transport_type <- decode.field(44, decode.string)
  use tour_visa_required <- decode.field(45, decode.string)
  use tour_departure_place <- decode.field(46, decode.string)
  use external_provider_code <- decode.field(47, decode.string)
  use flight_airline_code <- decode.field(48, decode.string)
  use flight_airline_name <- decode.field(49, decode.string)
  use flight_stop_count <- decode.field(50, decode.string)
  use flight_duration <- decode.field(51, decode.string)
  use range_total <- decode.field(52, decode.string)
  use range_nights <- decode.field(53, decode.string)
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
    listing_currency_code,
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
    tour_departure_place,
    external_provider_code,
    flight_airline_code,
    flight_airline_name,
    flight_stop_count,
    flight_duration,
    range_total,
    range_nights,
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
    listing_currency_code,
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
    tour_departure_place,
    external_provider_code,
    flight_airline_code,
    flight_airline_name,
    flight_stop_count,
    flight_duration,
    range_total_s,
    range_nights_s,
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
    #("listing_currency_code", json_opt_str(listing_currency_code)),
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
    #("tour_departure_place", json_opt_str(tour_departure_place)),
    #("external_provider_code", json_opt_str(external_provider_code)),
    #("flight_airline_code", json_opt_str(flight_airline_code)),
    #("flight_airline_name", json_opt_str(flight_airline_name)),
    #("flight_stop_count", json_opt_str(flight_stop_count)),
    #("flight_duration", json_opt_str(flight_duration)),
    // Tatil evi — seçili check-in/check-out aralığının toplam tutarı + gece sayısı.
    #("range_total", json_opt_str(range_total_s)),
    #("range_nights", json_opt_str(range_nights_s)),
  ])
}

fn transliterate_tr_search_ascii(s: String) -> String {
  s
  |> string.replace("İ", "i")
  |> string.replace("I", "i")
  |> string.replace("ı", "i")
  |> string.replace("Ğ", "g")
  |> string.replace("ğ", "g")
  |> string.replace("Ü", "u")
  |> string.replace("ü", "u")
  |> string.replace("Ş", "s")
  |> string.replace("ş", "s")
  |> string.replace("Ö", "o")
  |> string.replace("ö", "o")
  |> string.replace("Ç", "c")
  |> string.replace("ç", "c")
  |> string.lowercase
}

/// `Ütopia Villa 2` → `utopia villa 2`; `utopia-villa-2` → aynı (tire/boşluk birleşik arama).
fn normalize_listing_search_q(raw: String) -> String {
  transliterate_tr_search_ascii(raw)
  |> string.replace("-", " ")
  |> string.replace("_", " ")
  |> string.split(on: " ")
  |> list.map(string.trim)
  |> list.filter(fn(t) { t != "" })
  |> string.join(with: " ")
}

fn normalize_location_search_q(raw: String) -> String {
  normalize_listing_search_q(raw)
  |> string.replace(",", " ")
  |> string.replace("/", " ")
  |> string.replace("\\", " ")
  |> string.split(on: " ")
  |> list.map(string.trim)
  |> list.filter(fn(t) { t != "" })
  |> string.join(with: " ")
}

const listing_search_match_sql: String =
  "translate(lower(coalesce((select lt2.title from listing_translations lt2 join locales lo2 on lo2.id = lt2.locale_id where lt2.listing_id = l.id order by case when lower(lo2.code) = 'tr' then 0 else 1 end limit 1), l.slug) || ' ' || replace(l.slug, '-', ' ') || ' ' || coalesce(l.location_name, '') || ' ' || coalesce(lm.meta->>'address', '') || ' ' || coalesce(lm.meta->>'province_city', '') || ' ' || coalesce(lm.meta->>'city', '') || ' ' || coalesce(lm.meta->>'district_label', '') || ' ' || coalesce(lm.meta->>'region_display', '') || ' ' || coalesce(lm.meta->>'property_type', '')), 'üğışöç', 'ugisoc')"

/// Autocomplete eşleşmesi — kısa token’da kelime öneki (mam → Mamon, Mama;
/// Pachamama / Imamoglu gibi ortadaki "mam" elenir). ≥4 karakterde infix de açılır.
const listing_suggest_slug_ascii_sql: String = "lower(replace(l.slug, '-', ' '))"

const listing_suggest_token_match_sql: String =
  "("
  // Kelime öneki: başlar veya boşluktan sonra
  <> listing_suggest_slug_ascii_sql
  <> " ilike trim(tok) || '%' "
  <> "or "
  <> listing_suggest_slug_ascii_sql
  <> " ilike '% ' || trim(tok) || '%' "
  <> "or lower(coalesce(l.location_name, '')) ilike trim(tok) || '%' "
  <> "or lower(coalesce(l.location_name, '')) ilike '% ' || trim(tok) || '%' "
  <> "or exists ("
  <> "  select 1 from listing_translations lt "
  <> "  where lt.listing_id = l.id and ("
  <> "    translate(lower(lt.title), 'üğışöç', 'ugisoc') ilike trim(tok) || '%' "
  <> "    or translate(lower(lt.title), 'üğışöç', 'ugisoc') ilike '% ' || trim(tok) || '%'"
  <> "  )"
  <> ") "
  // Uzun token: içeride geçen eşleşme (luxury → Mamon Luxury…)
  <> "or ("
  <> "  char_length(trim(tok)) >= 4 and ("
  <> "    "
  <> listing_suggest_slug_ascii_sql
  <> " ilike '%' || trim(tok) || '%' "
  <> "    or lower(coalesce(l.location_name, '')) ilike '%' || trim(tok) || '%' "
  <> "    or exists ("
  <> "      select 1 from listing_translations lt "
  <> "      where lt.listing_id = l.id "
  <> "        and translate(lower(lt.title), 'üğışöç', 'ugisoc') ilike '%' || trim(tok) || '%'"
  <> "    )"
  <> "  )"
  <> ")"
  <> ")"

/// `location` vitrin parametresi — konum meta + tur başlığı + wtatil ülke adları.
const location_search_match_sql: String =
  "translate(lower(coalesce(l.location_name, '') || ' ' || coalesce(lm.meta->>'address', '') || ' ' || coalesce(lm.meta->>'province_city', '') || ' ' || coalesce(lm.meta->>'city', '') || ' ' || coalesce(lm.meta->>'district_label', '') || ' ' || coalesce(lm.meta->>'region_display', '') || ' ' || coalesce((select lt2.title from listing_translations lt2 join locales lo2 on lo2.id = lt2.locale_id where lt2.listing_id = l.id order by case when lower(lo2.code) = 'tr' then 0 else 1 end limit 1), '') || ' ' || coalesce((select string_agg(coalesce(c.elem->>'name', ''), ' ') from listing_attributes wa cross join lateral jsonb_array_elements(case jsonb_typeof(wa.value_json->'countries') when 'array' then wa.value_json->'countries' else '[]'::jsonb end) c(elem) where wa.listing_id = l.id and wa.group_code = 'wtatil' and wa.key = 'snapshot'), '')), 'üğışöç', 'ugisoc')"

fn min_count_filter_param(raw: String) -> pog.Value {
  case string.trim(raw) {
    "" -> pog.null()
    s ->
      case int.parse(s) {
        Ok(n) ->
          case n > 0 {
            True -> pog.text(int.to_string(n))
            False -> pog.null()
          }
        Error(_) -> pog.null()
      }
  }
}

fn approximate_public_listing_total(offset: Int, limit: Int, row_count: Int) -> Int {
  let seen = offset + row_count
  case row_count == limit {
    True -> seen + 1
    False -> seen
  }
}

fn listing_id_only_row() -> decode.Decoder(String) {
  use id <- decode.field(0, decode.string)
  decode.success(id)
}

/// GET /api/v1/catalog/public/listings/by-slug/:slug — vitrin detay URL slug → yayın ilan id
/// Görsel/fiyat kapısı YOK: detay sayfası resolve için; liste kapıları search'te kalır.
pub fn get_public_listing_id_by_slug(req: Request, ctx: Context, slug: String) -> Response {
  use <- wisp.require_method(req, http.Get)
  let s = string.trim(slug)
  let qs = case request.get_query(req) {
    Ok(values) -> values
    Error(_) -> []
  }
  let category_code =
    list.key_find(qs, "category_code")
    |> result.unwrap("")
    |> string.trim
  case s == "" {
    True -> json_err(400, "slug_required")
    False ->
      case
        pog.query(
          "select l.id::text from listings l "
            <> "inner join product_categories pc on pc.id = l.category_id "
            <> "where l.status = 'published' "
            <> "and lower(l.slug) = lower($1) "
            <> "and ($2 = '' or lower(pc.code) = lower($2)) "
            <> "order by l.updated_at desc, l.id limit 1",
        )
        |> pog.parameter(pog.text(s))
        |> pog.parameter(pog.text(category_code))
        |> pog.returning(listing_id_only_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "listing_slug_lookup_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> json_err(404, "not_found")
            [id] -> {
              let body =
                json.object([#("id", json.string(id))])
                |> json.to_string
              wisp.json_response(body, 200)
            }
            _ -> json_err(500, "unexpected")
          }
      }
  }
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
    case list.key_find(qs, "category_code") {
      Ok(v) -> v
      Error(_) ->
        list.key_find(qs, "category")
        |> result.unwrap("")
    }
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

  // Autocomplete (?suggest=1): tam sayım yok; görsel/fiyat kapısı yok → daha hızlı + eksik ilanlar görünür.
  let suggest_raw =
    list.key_find(qs, "suggest")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let suggest_mode = suggest_raw == "1" || suggest_raw == "true" || suggest_raw == "yes"

  let q_normalized = normalize_listing_search_q(q_raw)
  let q_param = case q_normalized == "" {
    True -> pog.null()
    False -> pog.text(q_normalized)
  }
  let cat_param = case cat_raw == "" { True -> pog.null()  False -> pog.text(cat_raw) }
  let loc_normalized = normalize_location_search_q(loc_raw)
  let loc_param = case loc_normalized == "" {
    True -> pog.null()
    False -> pog.text(loc_normalized)
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
  let hotel_scope_raw =
    list.key_find(qs, "hotel_scope")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let hotel_scope_param = case hotel_scope_raw == "" {
    True -> pog.null()
    False -> pog.text(hotel_scope_raw)
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
  let tour_departure_raw =
    list.key_find(qs, "tour_departure")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let tour_departure_param = case tour_departure_raw == "" {
    True -> pog.null()
    False -> pog.text(tour_departure_raw)
  }
  let cruise_line_raw =
    list.key_find(qs, "cruise_line")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let cruise_line_param = case cruise_line_raw == "" {
    True -> pog.null()
    False -> pog.text(cruise_line_raw)
  }
  let cruise_route_raw =
    list.key_find(qs, "cruise_route")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let cruise_route_param = case cruise_route_raw == "" {
    True -> pog.null()
    False -> pog.text(cruise_route_raw)
  }
  let tour_region_raw =
    list.key_find(qs, "tour_region")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let tour_region_param = case tour_region_raw == "" {
    True -> pog.null()
    False -> pog.text(tour_region_raw)
  }

  // $23: tatil evi ilan tipi (villa | apart | daire | bungalov)
  let property_type_raw =
    list.key_find(qs, "property_type")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  let property_type_param = case property_type_raw == "" {
    True -> pog.null()
    False -> pog.text(property_type_raw)
  }

  // $25–$27: tatil evi / yat — yatak, oda, banyo (minimum)
  let beds_raw =
    list.key_find(qs, "beds")
    |> result.unwrap("")
  let bedrooms_raw =
    list.key_find(qs, "bedrooms")
    |> result.unwrap("")
  let bathrooms_raw =
    list.key_find(qs, "bathrooms")
    |> result.unwrap("")
  let beds_param = min_count_filter_param(beds_raw)
  let bedrooms_param = min_count_filter_param(bedrooms_raw)
  let bathrooms_param = min_count_filter_param(bathrooms_raw)

  let sort_raw =
    list.key_find(qs, "sort")
    |> result.unwrap("")
    |> string.trim
    |> string.lowercase
  // Sıralama/fiyat filtresi önbellek sütununu kullanır (canlı lateral değil) — fast ve
  // deferred yollar aynı kaynağı kullansın diye.
  // Kart price_from: önce vitrin_price (CPU); yoksa canlı lateral fallback.
  let vitrin_price_sql = "coalesce(l.vitrin_price, l.first_charge_amount) "
  let location_search_sql = location_search_match_sql
  let tour_duration_days_sql =
    safe_int_sql("coalesce(tour_attr.value_json->'data'->>'duration_days', tour_attr.value_json->>'duration_days', '')")
  let meta_bed_count_sql = safe_int_sql("coalesce(lm.meta->>'bed_count', '')")
  let meta_room_count_sql = safe_int_sql("coalesce(lm.meta->>'room_count', '')")
  let meta_bath_count_sql = safe_int_sql("coalesce(lm.meta->>'bath_count', '')")
  // Varsayılan: `created_at` — yorum/puanı olmayan yeni ilanlar sayfa sonuna itilmesin.
  // Eski davranış (önce yüksek puan): `?sort=recommended` veya `sort=rating`.
  let order_sql = case sort_raw {
    "price_asc" ->
      "order by "
        <> vitrin_price_sql
        <> "asc nulls last, l.created_at desc "
    "price_desc" ->
      "order by "
        <> vitrin_price_sql
        <> "desc nulls last, l.created_at desc "
    "recommended" | "rating" ->
      "order by l.review_avg desc nulls last, l.created_at desc "
    _ ->
      case suggest_mode {
        // Öneri: başlık/slug eşleşmesini konum eşleşmesinin önüne al.
        True ->
          "order by case when "
            <> listing_search_match_sql
            <> " ilike '%' || split_part(trim(coalesce($1::text, '')), ' ', 1) || '%' then 0 else 1 end, l.created_at desc "
        False -> "order by l.created_at desc "
      }
  }

  // Suggest: kapıları kapat (detay zaten açılıyor; autocomplete bulsun).
  // Normal vitrin: görsel + otel/tur fiyat kapısı.
  let browse_image_gate_sql = case suggest_mode {
    True -> ""
    False -> public_listing_must_have_image_sql()
  }
  let browse_tour_price_gate_sql = case suggest_mode {
    True -> ""
    False -> tour_public_must_have_price_sql()
  }
  let browse_hotel_price_gate_sql = case suggest_mode {
    True -> ""
    False -> hotel_public_must_have_price_sql()
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

  let listing_search_select_sql =
    "l.id::text, l.slug, "
    <> "coalesce((select lt.title from listing_translations lt join locales lo on lo.id = lt.locale_id where lt.listing_id = l.id and lower(lo.code) = lower($4) limit 1), l.slug), "
    <> "coalesce(pc.code::text, ''), "
    <> "coalesce(case when trim(coalesce(l.featured_image_url, '')) = '' then null when trim(l.featured_image_url) ilike 'http%' then trim(l.featured_image_url) when trim(l.featured_image_url) like '/%' then trim(l.featured_image_url) else '/' || trim(l.featured_image_url) end, case when trim(coalesce(l.thumbnail_url, '')) = '' then null when trim(l.thumbnail_url) ilike 'http%' then trim(l.thumbnail_url) when trim(l.thumbnail_url) like '/%' then trim(l.thumbnail_url) else '/' || trim(l.thumbnail_url) end, (select case when trim(li.storage_key) is null or trim(li.storage_key) = '' then null when trim(li.storage_key) ilike 'http%' then trim(li.storage_key) when trim(li.storage_key) like '/%' then trim(li.storage_key) else '/' || trim(li.storage_key) end from listing_images li where li.listing_id = l.id order by li.sort_order asc, li.created_at asc limit 1), ''), "
    // Vitrin fiyat: önce önbellek (vitrin_price) — canlı lateral yalnızca cache boşsa.
    // Cache doluyken price_rule/meal lateralları yine join edilir ama price_from kısa yol alır.
    <> "coalesce(nullif(l.vitrin_price::text, ''), case when pc.code = 'tour' then "
    <> tour_listing_vitrin_price_sql()
    <> " else null end, case when pc.code = 'activity' then "
    <> activity_listing_vitrin_price_sql()
    <> " else null end, nullif(price_rule.min_price::text, ''), nullif(l.first_charge_amount::text, ''), nullif(meal_vitrin.room_only_price, ''), nullif(meal_vitrin.min_other_price, ''), nullif(meal_vitrin.min_fallback_price, ''), ''), "
    <> "coalesce(nullif(trim(both ', ' from concat_ws(', ', nullif(trim(lm.meta->>'city'), ''), nullif(trim(lm.meta->>'district_label'), ''), (case when trim(coalesce(lm.meta->>'province_city', '')) ~ '/' then nullif(trim(substring(trim(lm.meta->>'province_city') from '[^/]+$')), '') else nullif(trim(lm.meta->>'province_city'), '') end))), ''), nullif(trim(l.location_name), ''), nullif(trim(lm.meta->>'region_display'), ''), nullif(trim(lm.meta->>'address'), ''), ''), "
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
    <> ", coalesce(nullif(array_to_string(h.theme_codes, ','), ''), nullif(array_to_string(y.theme_codes, ','), ''), '') "
    <> ", coalesce(l.ministry_license_ref::text, ''), coalesce(l.prepayment_percent::text, '') "
    <> ", coalesce(l.cancellation_policy_text::text, '') "
    <> ", coalesce(l.min_stay_nights::text, '') "
    <> ", case when coalesce(l.allow_sub_min_stay_gap_booking, false) then 'true' else 'false' end "
    <> ", coalesce(nullif(trim(lm.meta->>'min_advance_booking_days'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'min_short_stay_nights'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'short_stay_fee'), ''), '') "
    <> ", coalesce(nullif(trim(case when pc.code = 'activity' then "
    <> activity_listing_vitrin_fare_currency_sql()
    <> " else null end), ''), nullif(trim(l.currency_code::text), ''), (select m.currency_code from listing_meal_plans m where m.listing_id = l.id and m.is_active = true order by m.sort_order asc, m.created_at asc limit 1), '') "
    <> ", coalesce(nullif(trim(l.currency_code::text), ''), '') "
    <> ", coalesce(l.cleaning_fee_amount::text, '') "
    <> ", coalesce(l.first_charge_amount::text, '') "
    <> ", coalesce(nullif(trim(lm.meta->>'bed_count'), ''), '') "
    <> ", coalesce(l.created_at::text, ''), coalesce(nullif(trim(l.mobile_discount_percent::text), ''), '0'), case when coalesce(l.instant_book, false) then 'true' else 'false' end, coalesce(nullif(trim((select string_agg(s.path::text, E'\\x1f') from (select case when trim(li.storage_key) is null or trim(li.storage_key) = '' then null::text when trim(li.storage_key) ilike 'http%' then trim(li.storage_key) when trim(li.storage_key) like '/%' then trim(li.storage_key) else '/' || trim(li.storage_key) end as path from listing_images li where li.listing_id = l.id and trim(coalesce(li.storage_key, '')) <> '' order by li.sort_order asc, li.created_at asc limit 12) s where s.path is not null)), ''), '') "
    <> ", coalesce(price_rule.min_price::text, '') "
    <> ", coalesce(price_rule.max_price::text, '') "
    <> ", coalesce(nullif(hotel.star_rating::text, ''), '') "
    <> ", coalesce(nullif(trim(case jsonb_typeof(hotel_attr.value_json) when 'string' then hotel_attr.value_json#>>'{}' else hotel_attr.value_json->>'hotel_type_code' end), ''), '') "
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
    <> ", coalesce(nullif(trim(("
    <> "  select pd.item->>'departureTransportDetail' "
    <> "  from jsonb_array_elements(case jsonb_typeof(tour_det.program_days_json->'periods') when 'array' then tour_det.program_days_json->'periods' else '[]'::jsonb end) pd(item) "
    <> "  where nullif(trim(pd.item->>'departureTransportDetail'), '') is not null "
    <> "  limit 1)), ''), nullif(trim(tour_det.program_days_json->'transport'->>'departureTransportDetail'), ''), "
    <> "nullif(trim(tour_attr.value_json->'data'->>'departure_city'), ''), nullif(trim(tour_attr.value_json->>'departure_city'), ''), "
    <> "nullif(trim((regexp_match(coalesce(wtatil_snap.value_json->'catalog'->>'freeServices', ''), '\\(([A-Z]{3})\\)'))[1]), ''), '') "
    <> ", coalesce(nullif(trim(l.external_provider_code), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'flight_airline_code'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'flight_airline_name'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'flight_stop_count'), ''), '') "
    <> ", coalesce(nullif(trim(lm.meta->>'flight_duration'), ''), '') "
    // Tatil evi — seçili check-in/check-out aralığının toplam tutarı + gece sayısı.
    <> ", coalesce(range_quote.total::text, '') "
    <> ", coalesce(range_quote.nights::text, '') "
  let listing_search_from_where_sql =
    "from listings l "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "left join listing_holiday_home_details h on h.listing_id = l.id "
    <> "left join listing_yacht_details y on y.listing_id = l.id "
    <> "left join listing_hotel_details hotel on hotel.listing_id = l.id "
    <> "left join countries hotel_country on hotel_country.id = hotel.country_id "
    <> "left join listing_tour_details tour_det on tour_det.listing_id = l.id "
    <> "left join lateral (select min(u.v) as min_price, max(u.v) as max_price from listing_price_rules r cross join lateral "
    <> listing_price_rule_nightly_lateral_values_sql()
    <> " as u(v) where r.listing_id = l.id and u.v is not null) price_rule on ("
    // Cache doluyken otel/tur için price_rule taraması gereksiz; tatil evi min/max için gerekir.
    <> "pc.code in ('holiday_home', 'yacht_charter') or l.vitrin_price is null) "
    <> listing_meal_plan_vitrin_lateral_sql_conditional()
    <> "left join lateral (select la.value_json as meta from listing_attributes la where la.listing_id = l.id and la.group_code = 'listing_meta' and la.key = 'v1' limit 1) lm on true "
    <> holiday_home_range_quote_lateral_sql()
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'hotel' and la.key = 'hotel_type_code' limit 1) hotel_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'hotel' and la.key = 'theme_code' limit 1) hotel_theme_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'hotel' and la.key = 'accommodation_code' limit 1) hotel_acc_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'vertical_tour' and la.key = 'v1' limit 1) tour_attr on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'wtatil' and la.key = 'snapshot' limit 1) wtatil_snap on true "
    <> "left join listing_cruise_details cruise_det on cruise_det.listing_id = l.id "
    <> "where l.status = 'published' "
    <> browse_image_gate_sql
    <> "and ($1::text is null or trim($1) = '' or (select coalesce(bool_and("
    <> listing_search_match_sql
    <> " ilike '%' || trim(tok) || '%'), true) from unnest(string_to_array(trim($1), ' ')) as u(tok) where trim(tok) <> '')) "
    <> "and ($2::text is null or pc.code = $2) "
    <> "and ($3::text is null or trim($3) = '' or (select coalesce(bool_and("
    <> location_search_sql
    <> " ilike '%' || trim(tok) || '%'), true) from unnest(string_to_array(trim($3), ' ')) as u(tok) where trim(tok) <> '')) "
    <> "and ($6::text is null or l.id = ANY(string_to_array($6, ',')::uuid[])) "
    <> "and ($7::text is null or $7 = '' or pc.code not in ('holiday_home', 'yacht_charter') or ( "
    <> "  (pc.code = 'holiday_home' and coalesce(h.theme_codes, '{}'::text[]) && string_to_array(trim($7), ',')::text[]) "
    <> "  or (pc.code = 'yacht_charter' and coalesce(y.theme_codes, '{}'::text[]) && string_to_array(trim($7), ',')::text[]) "
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
    <> listing_half_day_stay_calendar_filter_sql()
    // Otel — her gece en az bir aktif odada müsait birim (takvim yoksa müsait say)
    <> "and ($8::text is null or $9::text is null or pc.code != 'hotel' or not exists ( "
    <> "  select 1 from generate_series( "
    <> "    ($8::date - ($10 || ' days')::interval)::date, "
    <> "    ($9::date + ($10 || ' days')::interval - interval '1 day')::date, "
    <> "    interval '1 day' "
    <> "  ) as d(day) "
    <> "  where not exists ( "
    <> "    select 1 from hotel_rooms hr "
    <> "    left join hotel_room_availability_calendar c "
    <> "      on c.hotel_room_id = hr.id and c.day = d.day::date "
    <> "    where hr.listing_id = l.id "
    <> "      and coalesce(c.available_units, 1) > 0 "
    <> "  ) "
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
    <> "and ($12::text is null or coalesce(l.vitrin_price, l.first_charge_amount) >= nullif($12::text, '')::numeric) "
    <> "and ($13::text is null or coalesce(l.vitrin_price, l.first_charge_amount) <= nullif($13::text, '')::numeric) "
    <> "and ($14::text is null or pc.code != 'hotel' or lower(trim(coalesce(case jsonb_typeof(hotel_attr.value_json) when 'string' then hotel_attr.value_json#>>'{}' else hotel_attr.value_json->>'hotel_type_code' end, ''))) = any(string_to_array(trim($14), ',')::text[])) "
    <> "and ($15::text is null or pc.code != 'hotel' or lower(trim(coalesce(case jsonb_typeof(hotel_theme_attr.value_json) when 'string' then hotel_theme_attr.value_json#>>'{}' else hotel_theme_attr.value_json->>'theme_code' end, ''))) = any(string_to_array(trim($15), ',')::text[])) "
    <> "and ($16::text is null or pc.code != 'hotel' or lower(trim(coalesce(case jsonb_typeof(hotel_acc_attr.value_json) when 'string' then hotel_acc_attr.value_json#>>'{}' else hotel_acc_attr.value_json->>'accommodation_code' end, ''))) = any(string_to_array(trim($16), ',')::text[])) "
    <> "and ($17::text is null or pc.code != 'hotel' or floor(coalesce(hotel.star_rating, 0))::int::text = any(string_to_array(trim($17), ',')::text[])) "
    <> "and ($31::text is null or pc.code != 'hotel' or ( "
    <> "  ('domestic' = any(string_to_array(trim($31), ',')) and coalesce(hotel_country.iso2, 'TR') = 'TR') "
    <> "  or ('international' = any(string_to_array(trim($31), ',')) and hotel_country.iso2 is not null and hotel_country.iso2 != 'TR') "
    <> ")) "
    <> "and ($18::text is null or pc.code != 'tour' or lower(trim(coalesce(tour_attr.value_json->'data'->>'travel_type', tour_attr.value_json->>'travel_type', ''))) = any(string_to_array(trim($18), ',')::text[])) "
    <> "and ($19::text is null or pc.code != 'tour' or lower(trim(coalesce(tour_attr.value_json->'data'->>'accommodation_type', tour_attr.value_json->>'accommodation_type', ''))) = any(string_to_array(trim($19), ',')::text[])) "
    <> "and ($20::text is null or pc.code != 'tour' or exists ( "
    <> "  select 1 from unnest(string_to_array(trim($20), ',')::text[]) as bucket(v) "
    <> "  where (bucket.v = '1' and coalesce("
    <> tour_duration_days_sql
    <> ", 0) = 1) "
    <> "     or (bucket.v = '2-3' and coalesce("
    <> tour_duration_days_sql
    <> ", 0) between 2 and 3) "
    <> "     or (bucket.v = '4-7' and coalesce("
    <> tour_duration_days_sql
    <> ", 0) between 4 and 7) "
    <> "     or (bucket.v = '8+' and coalesce("
    <> tour_duration_days_sql
    <> ", 0) >= 8) "
    <> ")) "
    <> browse_tour_price_gate_sql
    <> browse_hotel_price_gate_sql
    <> "and ($22::uuid is null or not exists (select 1 from agency_category_grants g where g.agency_organization_id = $22::uuid) "
    <> "or exists (select 1 from agency_category_grants g2 where g2.agency_organization_id = $22::uuid and g2.approved = true and g2.category_code = pc.code)) "
    <> "and ($23::text is null or pc.code not in ('holiday_home', 'yacht_charter') or lower(trim(coalesce(lm.meta->>'property_type', ''))) = $23) "
    <> "and ($24::text is null or pc.code != 'tour' or exists ( "
    <> "  select 1 from unnest(string_to_array(trim($24), ',')::text[]) as dep(v) "
    <> "  where lower(coalesce("
    <> "    nullif(trim(tour_attr.value_json->'data'->>'departure_city'), ''), "
    <> "    nullif(trim(tour_attr.value_json->>'departure_city'), ''), "
    <> "    nullif(trim((regexp_match(coalesce(wtatil_snap.value_json->'catalog'->>'freeServices', ''), '\\(([A-Za-z]{3})\\)'))[1]), ''), "
    <> "    '')) ilike '%' || trim(dep.v) || '%' "
    <> "  or lower(coalesce(wtatil_snap.value_json->'catalog'->>'freeServices', '')) ilike '%' || trim(dep.v) || '%' "
    <> ")) "
    <> "and ($28::text is null or pc.code != 'cruise' or lower(coalesce(cruise_det.cruise_line, '')) ilike '%' || trim($28) || '%' "
    <> "  or lower(coalesce(cruise_det.meta_json->>'category_link', '')) ilike '%' || trim($28) || '%') "
    <> "and ($29::text is null or pc.code != 'cruise' or lower(coalesce(cruise_det.meta_json->>'category_link', '')) ilike '%' || trim($29) || '%' "
    <> "  or lower(coalesce(cruise_det.route_summary, '')) ilike '%' || replace(trim($29), '-', '%') || '%' "
    <> "  or lower(coalesce(l.location_name, '')) ilike '%' || replace(trim($29), '-', '%') || '%' "
    <> "  or "
    <> listing_search_match_sql
    <> " ilike '%' || replace(split_part(trim($29), '-', 1), '-', '') || '%') "
    <> "and ($30::text is null or pc.code != 'tour' or exists ( "
    <> "  select 1 from unnest(string_to_array(trim($30), ',')::text[]) as reg(v) "
    <> "  where lower(trim(coalesce(tour_attr.value_json->'data'->>'tour_region', tour_attr.value_json->>'tour_region', ''))) = trim(reg.v) "
    <> ")) "
    <> "and ($25::text is null or pc.code not in ('holiday_home', 'yacht_charter') or ( "
    <> "  "
    <> meta_bed_count_sql
    <> " is not null "
    <> "  and "
    <> meta_bed_count_sql
    <> " >= nullif($25::text, '')::int "
    <> ")) "
    <> "and ($26::text is null or pc.code not in ('holiday_home', 'yacht_charter') or ( "
    <> "  "
    <> meta_room_count_sql
    <> " is not null "
    <> "  and "
    <> meta_room_count_sql
    <> " >= nullif($26::text, '')::int "
    <> ")) "
    <> "and ($27::text is null or pc.code not in ('holiday_home', 'yacht_charter') or ( "
    <> "  "
    <> meta_bath_count_sql
    <> " is not null "
    <> "  and "
    <> meta_bath_count_sql
    <> " >= nullif($27::text, '')::int "
    <> ")) "
  let sql =
    "select "
    <> listing_search_select_sql
    <> " "
    <> listing_search_from_where_sql
  let sql_core = sql <> order_sql

  // Count: ORDER BY is removed (prevents expensive per-row subqueries like EXISTS on listing_images).
  // price_rule / meal_vitrin sayımda kullanılmaz (fiyat filtresi vitrin_price); kapat.
  let count_from_conditional =
    string.replace(
      listing_search_from_where_sql,
      ") price_rule on (pc.code in ('holiday_home', 'yacht_charter') or l.vitrin_price is null) ",
      ") price_rule on (false) ",
    )
    |> string.replace(
      ") meal_vitrin on (l.vitrin_price is null) ",
      ") meal_vitrin on (false) ",
    )
    // Sayım için tarih aralığı toplamı gerekmiyor — ağır generate_series lateral'ı kapat.
    |> string.replace(
      ") range_quote on (" <> holiday_home_range_quote_join_condition_sql() <> ") ",
      ") range_quote on (false) ",
    )
  let count_sql =
    "select count(*)::int "
    <> count_from_conditional
    <> " and $5::int >= 0 and $21::int >= 0 and ($4::text is not null or $4::text is null) "
  let sql_paged = sql_core <> " offset $21 limit $5"
  let fast_page_order_sql = case sort_raw {
    "price_asc" ->
      "order by coalesce(l.vitrin_price, l.first_charge_amount) asc nulls last, l.created_at desc "
    "price_desc" ->
      "order by coalesce(l.vitrin_price, l.first_charge_amount) desc nulls last, l.created_at desc "
    "recommended" | "rating" ->
      "order by l.review_avg desc nulls last, l.created_at desc "
    _ -> "order by l.created_at desc "
  }
  // page_ids'i FROM'un sürücü tablosu yapıyoruz; planlayıcı nested-loop'u 24 satırdan
  // başlatır ve pahalı lateral'lar (tur fiyatı, listing_images vb.) yalnız o satırlar için
  // çalışır. Aksi halde planlayıcı tüm yayındaki ilanlarda hesaplayıp sonra join yapıyor (4-5s).
  let fast_main_sql =
    string.replace(
      sql,
      "from listings l ",
      "from page_ids __pids join listings l on l.id = __pids.id ",
    )
  // page_ids ve fast-path sayımının paylaştığı filtre gövdesi (FROM + WHERE).
  // Görsel kapısı browse varyantı: fast path'te $6 her zaman null (ids_raw==""),
  // ama EXISTS listing_images maliyeti aynı; browse SQL aynı semantik.
  let fast_filter_body =
    "from listings l "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "left join listing_holiday_home_details h on h.listing_id = l.id "
    <> "left join listing_yacht_details y on y.listing_id = l.id "
    <> "left join lateral (select la.value_json as meta from listing_attributes la where la.listing_id = l.id and la.group_code = 'listing_meta' and la.key = 'v1' limit 1) lm on true "
    <> "left join lateral (select la.value_json from listing_attributes la where la.listing_id = l.id and la.group_code = 'vertical_tour' and la.key = 'v1' limit 1) tour_attr on true "
    <> "left join listing_cruise_details cruise_det on cruise_det.listing_id = l.id "
    <> "where l.status = 'published' "
    <> public_listing_must_have_image_browse_sql()
    <> "and ($2::text is null or pc.code = $2) "
    <> "and ($3::text is null or trim($3) = '' or (select coalesce(bool_and("
    <> location_search_sql
    <> " ilike '%' || trim(tok) || '%'), true) from unnest(string_to_array(trim($3), ' ')) as u(tok) where trim(tok) <> '')) "
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
    <> listing_half_day_stay_calendar_filter_sql()
    <> "and ($23::text is null or pc.code not in ('holiday_home', 'yacht_charter') or lower(trim(coalesce(lm.meta->>'property_type', ''))) = $23) "
    <> "and ($25::text is null or pc.code not in ('holiday_home', 'yacht_charter') or ("
    <> meta_bed_count_sql
    <> " is not null and "
    <> meta_bed_count_sql
    <> " >= nullif($25::text, '')::int)) "
    <> "and ($26::text is null or pc.code not in ('holiday_home', 'yacht_charter') or ("
    <> meta_room_count_sql
    <> " is not null and "
    <> meta_room_count_sql
    <> " >= nullif($26::text, '')::int)) "
    <> "and ($27::text is null or pc.code not in ('holiday_home', 'yacht_charter') or ("
    <> meta_bath_count_sql
    <> " is not null and "
    <> meta_bath_count_sql
    <> " >= nullif($27::text, '')::int)) "
    <> "and ($28::text is null or pc.code != 'cruise' or lower(coalesce(cruise_det.cruise_line, '')) ilike '%' || trim($28) || '%' "
    <> "  or lower(coalesce(cruise_det.meta_json->>'category_link', '')) ilike '%' || trim($28) || '%') "
    <> "and ($29::text is null or pc.code != 'cruise' or lower(coalesce(cruise_det.meta_json->>'category_link', '')) ilike '%' || trim($29) || '%' "
    <> "  or lower(coalesce(cruise_det.route_summary, '')) ilike '%' || replace(trim($29), '-', '%') || '%' "
    <> "  or lower(coalesce(l.location_name, '')) ilike '%' || replace(trim($29), '-', '%') || '%' "
    <> "  or "
    <> listing_search_match_sql
    <> " ilike '%' || replace(split_part(trim($29), '-', 1), '-', '') || '%') "
    <> "and ($30::text is null or pc.code != 'tour' or exists ( "
    <> "  select 1 from unnest(string_to_array(trim($30), ',')::text[]) as reg(v) "
    <> "  where lower(trim(coalesce(tour_attr.value_json->'data'->>'tour_region', tour_attr.value_json->>'tour_region', ''))) = trim(reg.v) "
    <> ")) "
    // Fiyat filtresi ve tur "fiyatı olmalı" koşulu önbellek sütununu (vitrin_price) kullanır;
    // satır-başı fiyat lateral'ı gerekmez → fast path fiyat/sıralamayı index ile karşılar.
    <> "and ($12::text is null or coalesce(l.vitrin_price, l.first_charge_amount) >= nullif($12::text, '')::numeric) "
    <> "and ($13::text is null or coalesce(l.vitrin_price, l.first_charge_amount) <= nullif($13::text, '')::numeric) "
    <> "and (pc.code != 'tour' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) "
    <> "and (pc.code != 'hotel' or coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0) "
  let fast_category_page_sql =
    "with page_ids as materialized (select l.id "
    <> fast_filter_body
    <> fast_page_order_sql
    <> "offset $21 limit $5"
    <> ") "
    <> fast_main_sql
    <> order_sql
  // Fast-path için projeksiyonsuz, GERÇEK toplam sayım (yaklaşık değil).
  // Kullanılmayan parametreler dummy cross join ile bağlanır (bind sayısı $1..$27 ile eşleşsin).
  let fast_count_sql =
    "select count(*)::int from (select l.id "
    <> fast_filter_body
    <> ") _cnt cross join (select $1::text as a1, $4::text as a4, $5::int as a5, $6::text as a6, $7::text as a7, $11::text as a11, $12::text as a12, $13::text as a13, $14::text as a14, $15::text as a15, $16::text as a16, $17::text as a17, $18::text as a18, $19::text as a19, $20::text as a20, $21::int as a21, $22::uuid as a22, $24::text as a24, $28::text as a28, $29::text as a29, $30::text as a30, $31::text as a31) __allp"
  // Filtreli (fast olmayan) aramalar da deferred-projeksiyon kullanır: page_ids tüm filtreleri
  // + sıralamayı yalnız l.id üzerinde uygular; pahalı projeksiyon (galeri, çeviri, pansiyon)
  // yalnızca sayfadaki ~24 satır için çalışır.
  // page_ids CTE'sinde price_rule/meal_vitrin/range_quote gerekmez — filtre vitrin_price kullanır.
  let deferred_page_from_where_sql =
    string.replace(
      listing_search_from_where_sql,
      ") range_quote on (" <> holiday_home_range_quote_join_condition_sql() <> ") ",
      ") range_quote on (false) ",
    )
    |> string.replace(
      ") price_rule on (pc.code in ('holiday_home', 'yacht_charter') or l.vitrin_price is null) ",
      ") price_rule on (false) ",
    )
    |> string.replace(
      ") meal_vitrin on (l.vitrin_price is null) ",
      ") meal_vitrin on (false) ",
    )
  let deferred_page_sql =
    "with page_ids as materialized (select l.id "
    <> deferred_page_from_where_sql
    <> order_sql
    <> " offset $21 limit $5"
    <> ") "
    <> fast_main_sql
    <> order_sql

  // Autocomplete: yalnızca $1=q $2=cat $3=locale $4=limit $5=offset — dummy $22::uuid yok
  // (pog.null()→uuid cast prod’da search_failed üretebiliyordu).
  let suggest_page_sql =
    "with page_ids as materialized (select l.id "
    <> "from listings l "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "where l.status = 'published' "
    <> "and ($1::text is null or trim($1) = '' or (select coalesce(bool_and("
    <> listing_suggest_token_match_sql
    <> "), true) from unnest(string_to_array(trim($1), ' ')) as u(tok) where trim(tok) <> '')) "
    <> "and ($2::text is null or pc.code = $2) "
    <> "order by "
    <> "case when pc.code in ('holiday_home', 'yacht_charter', 'tour', 'activity') then 0 else 1 end asc, "
    <> "case "
    <> "when exists ("
    <> "  select 1 from listing_translations lt where lt.listing_id = l.id "
    <> "    and translate(lower(lt.title), 'üğışöç', 'ugisoc') ilike split_part(trim(coalesce($1::text, '')), ' ', 1) || '%'"
    <> ") then 0 "
    <> "when lower(replace(l.slug, '-', ' ')) ilike split_part(trim(coalesce($1::text, '')), ' ', 1) || '%' then 0 "
    <> "else 1 end asc, "
    <> "l.created_at desc "
    <> "offset $5 limit $4"
    <> ") "
    <> "select "
    <> "l.id::text, l.slug, "
    <> "coalesce((select lt.title from listing_translations lt join locales lo on lo.id = lt.locale_id where lt.listing_id = l.id and lower(lo.code) = lower($3) limit 1), l.slug), "
    <> "coalesce(pc.code::text, ''), "
    <> "coalesce(case when trim(coalesce(l.featured_image_url, '')) = '' then null when trim(l.featured_image_url) ilike 'http%' then trim(l.featured_image_url) when trim(l.featured_image_url) like '/%' then trim(l.featured_image_url) else '/' || trim(l.featured_image_url) end, case when trim(coalesce(l.thumbnail_url, '')) = '' then null when trim(l.thumbnail_url) ilike 'http%' then trim(l.thumbnail_url) when trim(l.thumbnail_url) like '/%' then trim(l.thumbnail_url) else '/' || trim(l.thumbnail_url) end, ''), "
    <> "coalesce(nullif(l.vitrin_price::text, ''), nullif(l.first_charge_amount::text, ''), ''), "
    <> "coalesce(nullif(trim(l.location_name), ''), ''), "
    <> "'', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '' "
    <> "from page_ids __pids "
    <> "join listings l on l.id = __pids.id "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "order by "
    <> "case when pc.code in ('holiday_home', 'yacht_charter', 'tour', 'activity') then 0 else 1 end asc, "
    <> "case "
    <> "when exists ("
    <> "  select 1 from listing_translations lt where lt.listing_id = l.id "
    <> "    and translate(lower(lt.title), 'üğışöç', 'ugisoc') ilike split_part(trim(coalesce($1::text, '')), ' ', 1) || '%'"
    <> ") then 0 "
    <> "when lower(replace(l.slug, '-', ' ')) ilike split_part(trim(coalesce($1::text, '')), ' ', 1) || '%' then 0 "
    <> "else 1 end asc, "
    <> "l.created_at desc "

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
    |> pog.parameter(property_type_param)
    |> pog.parameter(tour_departure_param)
    |> pog.parameter(beds_param)
    |> pog.parameter(bedrooms_param)
    |> pog.parameter(bathrooms_param)
    |> pog.parameter(cruise_line_param)
    |> pog.parameter(cruise_route_param)
    |> pog.parameter(tour_region_param)
    |> pog.parameter(hotel_scope_param)
  }

  let is_agent_search = case agency_org_opt {
    Some(_) -> True
    None -> False
  }
  // Fiyat filtresi ($12/$13) ve sıralama (sort) artık fast path'te vitrin_price önbellek
  // sütunu + index ile karşılanır; bu yüzden fast yolu engellemezler.
  let fast_page_allowed =
    !is_agent_search
    && q_normalized == ""
    && ids_raw == ""
    && theme_raw == ""
    && attrs_raw == ""
    && hotel_type_raw == ""
    && hotel_theme_raw == ""
    && hotel_accommodation_raw == ""
    && hotel_stars_raw == ""
    && tour_travel_type_raw == ""
    && tour_accommodation_raw == ""
    && tour_duration_raw == ""
    && tour_departure_raw == ""
    && cruise_line_raw == ""
    && cruise_route_raw == ""
    && tour_region_raw == ""
    && hotel_scope_raw == ""
  let exact_count_needed =
    !suggest_mode
    && {
      is_agent_search
      || q_normalized != ""
      || loc_raw != ""
      || ids_raw != ""
      || theme_raw != ""
      || attrs_raw != ""
      || price_min_raw != ""
      || price_max_raw != ""
      || hotel_type_raw != ""
      || hotel_theme_raw != ""
      || hotel_accommodation_raw != ""
      || hotel_stars_raw != ""
      || tour_travel_type_raw != ""
      || tour_accommodation_raw != ""
      || tour_duration_raw != ""
      || tour_departure_raw != ""
      || cruise_line_raw != ""
      || cruise_route_raw != ""
      || tour_region_raw != ""
      || hotel_scope_raw != ""
      || property_type_raw != ""
      || string.trim(beds_raw) != ""
      || string.trim(bedrooms_raw) != ""
      || string.trim(bathrooms_raw) != ""
      || start_raw != ""
      || end_raw != ""
      || sort_raw != ""
    }
  let page_sql = case suggest_mode {
    True -> suggest_page_sql
    False ->
      case fast_page_allowed {
        True -> fast_category_page_sql
        False -> deferred_page_sql
      }
  }
  let query_timeout_ms = case suggest_mode {
    True -> suggest_query_timeout_ms
    False -> vitrin_query_timeout_ms
  }

  let empty_suggest = fn() {
    let body =
      json.object([
        #("listings", json.array(from: [], of: fn(x) { x })),
        #("total", json.int(0)),
      ])
      |> json.to_string
    wisp.json_response(body, 200)
  }

  case suggest_mode {
    True -> {
      case
        pog.query(suggest_page_sql)
        |> pog.timeout(suggest_query_timeout_ms)
        |> pog.parameter(q_param)
        |> pog.parameter(cat_param)
        |> pog.parameter(pog.text(locale))
        |> pog.parameter(pog.int(lim))
        |> pog.parameter(pog.int(offset))
        |> pog.returning(pub_listing_row())
        |> db_exec.execute(ctx.db)
      {
        Error(e) -> {
          let _ =
            io.println(
              "[catalog.public.listings.suggest] "
                <> pog_errors.query_error_to_string(e),
            )
          // Autocomplete siteyi düşürmesin — boş öneri, 500 yok.
          empty_suggest()
        }
        Ok(ret) -> {
          let arr = list.map(ret.rows, pub_listing_json)
          let body =
            json.object([
              #("listings", json.array(from: arr, of: fn(x) { x })),
              #("total", json.int(list.length(ret.rows))),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
    False ->
      case
        pog.query(page_sql)
        |> pog.timeout(query_timeout_ms)
        |> run_params
        |> pog.returning(pub_listing_row())
        |> db_exec.execute(ctx.db)
      {
        Error(e) -> {
          let _ =
            io.println(
              "[catalog.public.listings] "
                <> pog_errors.query_error_to_string(e),
            )
          // Strip fallback yalnızca vitrin_price kolonu eksikse (42703) anlamlıdır.
          // Timeout/bağlantı hatasında strip edilmiş SQL daha da yavaştır (partial
          // index eşleşmez) — yeniden çalıştırmak bağlantı fırtınasını büyütür.
          case pog_errors.is_missing_schema(e) {
            False -> json_err(500, "search_failed")
            True -> {
              let fallback_count_sql = case fast_page_allowed {
                True -> strip_vitrin_price_cache_sql(fast_count_sql)
                False -> strip_vitrin_price_cache_sql(count_sql)
              }
              // Eski sql_paged tüm eşleşen satırlarda projeksiyon çalıştırır (dakikalar + DB tükenmesi).
              // vitrin_price hatasında aynı fast/deferred planı strip ile yeniden dene.
              search_listings_paged_response(
                ctx,
                strip_vitrin_price_cache_sql(page_sql),
                run_params,
                offset,
                lim,
                None,
                Some(fallback_count_sql),
              )
            }
          }
        }
        Ok(ret) -> {
          let fallback_total =
            approximate_public_listing_total(offset, lim, list.length(ret.rows))
          let run_count = fn(count_q: String) -> Int {
            run_listing_count_sql(ctx, count_q, run_params, fallback_total, True)
          }
          let total_count = case fast_page_allowed {
            True -> run_count(fast_count_sql)
            False ->
              case exact_count_needed {
                True -> run_count(count_sql)
                False -> fallback_total
              }
          }
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

fn search_listings_paged_response(
  ctx: Context,
  sql_paged: String,
  run_params,
  offset: Int,
  lim: Int,
  total_opt: Option(Int),
  count_sql_opt: Option(String),
) -> Response {
  search_listings_paged_response_impl(
    ctx,
    sql_paged,
    run_params,
    offset,
    lim,
    total_opt,
    count_sql_opt,
    True,
  )
}

fn search_listings_paged_response_impl(
  ctx: Context,
  sql_paged: String,
  run_params,
  offset: Int,
  lim: Int,
  total_opt: Option(Int),
  count_sql_opt: Option(String),
  allow_legacy: Bool,
) -> Response {
  case
    pog.query(sql_paged)
    |> pog.timeout(vitrin_query_timeout_ms)
    |> run_params
    |> pog.returning(pub_listing_row())
    |> db_exec.execute(ctx.db)
  {
    Error(e) -> {
      let _ =
        io.println(
          "[catalog.public.listings] "
            <> pog_errors.query_error_to_string(e),
        )
      case allow_legacy && pog_errors.is_missing_schema(e) {
        False -> json_err(500, "search_failed")
        True -> {
          let legacy = strip_vitrin_price_cache_sql(sql_paged)
          case legacy != sql_paged {
            True ->
              search_listings_paged_response_impl(
                ctx,
                legacy,
                run_params,
                offset,
                lim,
                total_opt,
                count_sql_opt,
                False,
              )
            False -> json_err(500, "search_failed")
          }
        }
      }
    }
    Ok(ret) -> {
      let row_count = list.length(ret.rows)
      let page_fallback = int.add(offset, row_count)
      let total_count = case total_opt {
        Some(n) -> n
        None ->
          case count_sql_opt {
            Some(q) ->
              run_listing_count_sql(ctx, q, run_params, page_fallback, allow_legacy)
            None -> page_fallback
          }
      }
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
        |> db_exec.execute(ctx.db)
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
            |> db_exec.execute(ctx.db)
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
                    |> db_exec.execute(ctx.db)
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
                            |> db_exec.execute(ctx.db)
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
                    |> db_exec.execute(ctx.db)
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
        |> db_exec.execute(ctx.db)
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

// ─── Travel Bridge (hafif senkron) ───────────────────────────────────────────

fn bridge_listing_row() -> decode.Decoder(#(
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
)) {
  use id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use title <- decode.field(2, decode.string)
  use category_code <- decode.field(3, decode.string)
  use featured_image_url <- decode.field(4, decode.string)
  use price_from <- decode.field(5, decode.string)
  use location <- decode.field(6, decode.string)
  use map_lat <- decode.field(7, decode.string)
  use map_lng <- decode.field(8, decode.string)
  use hotel_star_rating <- decode.field(9, decode.string)
  use tour_duration_days <- decode.field(10, decode.string)
  use meal_plan_summary <- decode.field(11, decode.string)
  use flight_airline_code <- decode.field(12, decode.string)
  use flight_airline_name <- decode.field(13, decode.string)
  use flight_duration <- decode.field(14, decode.string)
  decode.success(#(
    id,
    slug,
    title,
    category_code,
    featured_image_url,
    price_from,
    location,
    map_lat,
    map_lng,
    hotel_star_rating,
    tour_duration_days,
    meal_plan_summary,
    flight_airline_code,
    flight_airline_name,
    flight_duration,
  ))
}

fn bridge_listing_json(
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
  ),
) -> json.Json {
  let #(
    id,
    slug,
    title,
    category_code,
    featured_image_url,
    price_from,
    location,
    map_lat,
    map_lng,
    hotel_star_rating,
    tour_duration_days,
    meal_plan_summary,
    flight_airline_code,
    flight_airline_name,
    flight_duration,
  ) = row
  json.object([
    #("id", json.string(id)),
    #("slug", json.string(slug)),
    #("title", json.string(title)),
    #("category_code", json.string(category_code)),
    #("featured_image_url", json_opt_str(featured_image_url)),
    #("price_from", json_opt_str(price_from)),
    #("location", json_opt_str(location)),
    #("map_lat", json_opt_str(map_lat)),
    #("map_lng", json_opt_str(map_lng)),
    #("hotel_star_rating", json_opt_str(hotel_star_rating)),
    #("tour_duration_days", json_opt_str(tour_duration_days)),
    #("meal_plan_summary", json_opt_str(meal_plan_summary)),
    #("flight_airline_code", json_opt_str(flight_airline_code)),
    #("flight_airline_name", json_opt_str(flight_airline_name)),
    #("flight_duration", json_opt_str(flight_duration)),
  ])
}

/// GET /api/v1/catalog/bridge/listings — Travel Bridge için hafif katalog (sayım sorgusu yok).
pub fn search_bridge_listings(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let qs = case request.get_query(req) {
    Ok(q) -> q
    Error(_) -> []
  }
  let cat_raw =
    list.key_find(qs, "category_code")
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
    |> result.unwrap("50")
    |> string.trim
  let lim = case int.parse(lim_str) {
    Ok(n) -> case n > 100 { True -> 100  False -> case n < 1 { True -> 50  False -> n } }
    Error(_) -> 50
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
  let cat_param = case cat_raw == "" { True -> pog.null()  False -> pog.text(cat_raw) }

  let sql =
    "select l.id::text, l.slug, "
    <> "coalesce((select lt.title from listing_translations lt join locales lo on lo.id = lt.locale_id "
    <> "where lt.listing_id = l.id and lower(lo.code) = lower($1) limit 1), l.slug), "
    <> "coalesce(pc.code::text, ''), "
    <> "coalesce(nullif(trim(l.featured_image_url), ''), ''), "
    <> "coalesce(l.first_charge_amount::text, ''), "
    <> "coalesce(nullif(trim(l.location_name), ''), nullif(trim(lm.meta->>'region_display'), ''), ''), "
    <> "coalesce(l.map_lat::text, ''), coalesce(l.map_lng::text, ''), "
    <> "coalesce(nullif(trim(lm.meta->>'hotel_star_rating'), ''), ''), "
    <> "coalesce(nullif(trim(lm.meta->>'tour_duration_days'), ''), ''), "
    <> "coalesce(nullif(trim(lm.meta->>'meal_plan_summary'), ''), ''), "
    <> "coalesce(nullif(trim(lm.meta->>'flight_airline_code'), ''), ''), "
    <> "coalesce(nullif(trim(lm.meta->>'flight_airline_name'), ''), ''), "
    <> "coalesce(nullif(trim(lm.meta->>'flight_duration'), ''), '') "
    <> "from listings l "
    <> "join product_categories pc on pc.id = l.category_id "
    <> "left join lateral (select la.value_json as meta from listing_attributes la "
    <> "where la.listing_id = l.id and la.group_code = 'listing_meta' and la.key = 'v1' limit 1) lm on true "
    <> "where l.status = 'published' "
    <> public_listing_must_have_image_browse_sql()
    <> "and ($2::text is null or pc.code = $2) "
    <> "order by l.created_at desc "
    <> "offset $3 limit $4"

  case
    pog.query(sql)
    |> pog.parameter(pog.text(locale))
    |> pog.parameter(cat_param)
    |> pog.parameter(pog.int(offset))
    |> pog.parameter(pog.int(lim))
    |> pog.returning(bridge_listing_row())
    |> db_exec.execute(ctx.db)
  {
    Error(e) -> {
      let _ =
        io.println(
          "[catalog.bridge.listings] "
            <> pog_errors.query_error_to_string(e),
        )
      json_err(500, "bridge_search_failed")
    }
    Ok(ret) -> {
      let rows = ret.rows
      let has_more = list.length(rows) == lim
      let arr = list.map(rows, bridge_listing_json)
      let body =
        json.object([
          #("listings", json.array(from: arr, of: fn(x) { x })),
          #("has_more", json.bool(has_more)),
          #("page", json.int(page_num)),
        ])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

// ─── Public Category Stats ────────────────────────────────────────────────────

fn cat_stats_row() -> decode.Decoder(#(String, Int)) {
  use code <- decode.field(0, decode.string)
  use cnt  <- decode.field(1, decode.int)
  decode.success(#(code, cnt))
}

fn cat_stats_response(rows: List(#(String, Int))) -> Response {
  let pairs =
    list.map(rows, fn(row) {
      let #(code, cnt) = row
      #(code, json.int(cnt))
    })
  let body =
    json.object([#("stats", json.object(pairs))])
    |> json.to_string
  wisp.json_response(body, 200)
}

/// GET /api/v1/catalog/public/category-stats
/// Yayımlanan ilanların kategori koduna göre sayısını döner.
pub fn public_category_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let sql = public_category_stats_query_sql(public_category_stats_filter_sql())
  let legacy_sql =
    public_category_stats_query_sql(strip_vitrin_price_cache_sql(
      public_category_stats_filter_sql(),
    ))
  let image_only_sql =
    public_category_stats_query_sql(public_listing_must_have_image_browse_sql())
  let run_stats = fn(q: String) {
    pog.query(q)
    |> pog.returning(cat_stats_row())
    |> db_exec.execute(ctx.db)
  }
  case run_stats(sql) {
    Error(e) ->
      case run_stats(legacy_sql) {
        Error(e2) ->
          case run_stats(image_only_sql) {
            Error(e3) -> {
              let _ =
                io.println(
                  "[catalog.public.category-stats] "
                    <> pog_errors.query_error_to_string(e)
                    <> " | legacy: "
                    <> pog_errors.query_error_to_string(e2)
                    <> " | image_only: "
                    <> pog_errors.query_error_to_string(e3),
                )
              cat_stats_response([])
            }
            Ok(ret) -> cat_stats_response(ret.rows)
          }
        Ok(ret) -> cat_stats_response(ret.rows)
      }
    Ok(ret) -> cat_stats_response(ret.rows)
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
      let property_type_raw =
        list.key_find(qs, "property_type")
        |> result.unwrap("")
        |> string.trim
        |> string.lowercase
      let property_type_param = case property_type_raw == "" {
        True -> pog.null()
        False -> pog.text(property_type_raw)
      }
      let sql = case is_tour {
        True -> region_stats_tour_sql()
        False -> region_stats_domestic_district_sql()
      }
      case
        pog.query(sql)
        |> pog.parameter(pog.int(lim))
        |> pog.parameter(pog.text(cat_raw))
        |> pog.parameter(property_type_param)
        |> pog.returning(region_stats_row())
        |> pog.timeout(region_stats_query_timeout_ms)
        |> db_exec.execute(ctx.db)
      {
        // Fail-soft: 500 yerine boş liste — anasayfa/kategori Suspense stream'i
        // kapanır; slider gizlenir, geri kalan modüller takılmaz.
        Error(_) -> {
          let body =
            json.object([
              #("regions", json.array(from: [], of: fn(x) { x })),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
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

/// TR bölgeler — listing_meta / location_name etiketlerini önce topla, sonra
/// districts + regions ile **eşitlik** (translate ile TR karakter).
///
/// 16k+ otelde eski LIKE × ilçe çaprazı ve `listing_images` EXISTS browse kapısı
/// 3–5 sn timeout üretiyordu. Bu sürüm:
/// - görsel kapısı yalnız featured/thumbnail kolonları (EXISTS yok)
/// - önce (lokasyon anahtarı) aggregate, sonra ~81 il + ~1000 ilçe eşitlik join
/// - ilçe eşleşmezse il (province) kartı olarak düşer (slug: TR/{il})
fn region_stats_domestic_district_sql() -> String {
  "with base as ( "
  <> "  select "
  <> "    translate(lower(trim(coalesce( "
  <> "      nullif(trim(lm.value_json->>'district_label'), ''), "
  <> "      nullif(trim(lm.value_json->>'city'), ''), "
  <> "      nullif(trim(split_part(coalesce(lm.value_json->>'province_city', ''), '/', 2)), ''), "
  <> "      nullif(trim(split_part(coalesce(l.location_name, ''), ',', 1)), ''), "
  <> "      '' "
  <> "    ))), 'üğışöç', 'ugisoc') as place_key, "
  <> "    translate(lower(trim(coalesce( "
  <> "      nullif(trim(split_part(coalesce(lm.value_json->>'province_city', ''), '/', 1)), ''), "
  <> "      nullif(trim(lm.value_json->>'province_city'), ''), "
  <> "      nullif(trim(lm.value_json->>'region_display'), ''), "
  <> "      nullif(trim(split_part(coalesce(l.location_name, ''), ',', 2)), ''), "
  <> "      nullif(trim(lm.value_json->>'city'), ''), "
  <> "      '' "
  <> "    ))), 'üğışöç', 'ugisoc') as province_key "
  <> "  from listings l "
  <> "  join product_categories pc on pc.id = l.category_id "
  <> "  left join listing_attributes lm on lm.listing_id = l.id "
  <> "    and lm.group_code = 'listing_meta' and lm.key = 'v1' "
  <> "  where l.status = 'published' and pc.code = $2 "
  <> "    and ( "
  <> "      coalesce(trim(l.featured_image_url), '') <> '' "
  <> "      or coalesce(trim(l.thumbnail_url), '') <> '' "
  <> "    ) "
  <> "    and ($3::text is null or lower(trim(coalesce(lm.value_json->>'property_type', ''))) = $3) "
  <> "), place_agg as ( "
  <> "  select place_key, count(*)::int as cnt "
  <> "  from base "
  <> "  where place_key <> '' "
  <> "    and place_key not in ('turkey', 'turkiye', 'tr', 'germany', 'deutschland', 'greece', 'cyprus') "
  <> "  group by 1 "
  <> "), province_agg as ( "
  <> "  select province_key, count(*)::int as cnt "
  <> "  from base "
  <> "  where province_key <> '' "
  <> "    and province_key not in ('turkey', 'turkiye', 'tr', 'germany', 'deutschland', 'greece', 'cyprus') "
  <> "  group by 1 "
  <> "), district_matched as ( "
  <> "  select "
  <> "    d.id as district_id, "
  <> "    r.id as region_id, "
  <> "    r.slug as region_slug, "
  <> "    d.slug as district_slug, "
  <> "    d.name as display_name, "
  <> "    sum(a.cnt)::int as cnt, "
  <> "    1 as is_district "
  <> "  from place_agg a "
  <> "  join districts d on ( "
  <> "    translate(lower(d.name), 'üğışöç', 'ugisoc') = a.place_key "
  <> "    or d.slug = replace(a.place_key, ' ', '-') "
  <> "  ) "
  <> "  join regions r on r.id = d.region_id "
  <> "  join countries c on c.id = r.country_id and c.iso2 = 'TR' "
  <> "  group by d.id, r.id, r.slug, d.slug, d.name "
  <> "), region_from_place as ( "
  <> "  select "
  <> "    null::int as district_id, "
  <> "    r.id as region_id, "
  <> "    r.slug as region_slug, "
  <> "    r.slug as district_slug, "
  <> "    r.name as display_name, "
  <> "    sum(a.cnt)::int as cnt, "
  <> "    0 as is_district "
  <> "  from place_agg a "
  <> "  join regions r on ( "
  <> "    translate(lower(r.name), 'üğışöç', 'ugisoc') = a.place_key "
  <> "    or r.slug = replace(a.place_key, ' ', '-') "
  <> "  ) "
  <> "  join countries c on c.id = r.country_id and c.iso2 = 'TR' "
  <> "  where not exists ( "
  <> "    select 1 from district_matched dm "
  <> "    where translate(lower(dm.display_name), 'üğışöç', 'ugisoc') = a.place_key "
  <> "       or dm.district_slug = replace(a.place_key, ' ', '-') "
  <> "  ) "
  <> "  group by r.id, r.slug, r.name "
  <> "), region_matched as ( "
  <> "  select "
  <> "    null::int as district_id, "
  <> "    r.id as region_id, "
  <> "    r.slug as region_slug, "
  <> "    r.slug as district_slug, "
  <> "    r.name as display_name, "
  <> "    sum(a.cnt)::int as cnt, "
  <> "    0 as is_district "
  <> "  from province_agg a "
  <> "  join regions r on ( "
  <> "    translate(lower(r.name), 'üğışöç', 'ugisoc') = a.province_key "
  <> "    or r.slug = replace(a.province_key, ' ', '-') "
  <> "  ) "
  <> "  join countries c on c.id = r.country_id and c.iso2 = 'TR' "
  <> "  where not exists ( "
  <> "    select 1 from district_matched dm where dm.region_id = r.id "
  <> "  ) "
  <> "  and not exists ( "
  <> "    select 1 from region_from_place rp where rp.region_id = r.id "
  <> "  ) "
  <> "  group by r.id, r.slug, r.name "
  <> "), matched as ( "
  <> "  select * from district_matched "
  <> "  union all "
  <> "  select * from region_from_place "
  <> "  union all "
  <> "  select * from region_matched "
  <> ") "
  <> "select "
  <> "  case when m.is_district = 1 "
  <> "    then 'TR/' || m.region_slug || '/' || m.district_slug "
  <> "    else 'TR/' || m.region_slug "
  <> "  end as slug, "
  <> "  m.display_name as name, "
  <> "  m.cnt, "
  <> "  coalesce( "
  <> "    max(nullif(lp.cover_image, '')), "
  <> "    max(nullif(lp.featured_image_url, '')), "
  <> "    max(nullif(lp.hero_image_url, '')), "
  <> "    '' "
  <> "  ) as thumbnail "
  <> "from matched m "
  <> "left join location_pages lp on ( "
  <> "  (m.is_district = 1 and lp.district_id = m.district_id "
  <> "    and coalesce(lp.region_type, 'district') = 'district') "
  <> "  or (m.is_district = 0 and lp.region_id = m.region_id "
  <> "    and coalesce(lp.region_type, 'province') = 'province') "
  <> ") "
  <> "group by m.district_id, m.region_id, m.region_slug, m.district_slug, m.display_name, m.cnt, m.is_district "
  <> "having m.cnt > 0 "
  <> "order by m.cnt desc, m.display_name asc "
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
  <> public_listing_must_have_image_browse_sql()
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
  <> "    case when jsonb_typeof(tb.countries_json) = 'array' and jsonb_array_length(tb.countries_json) > 0 "
  <> "      then tb.countries_json else '[{}]'::jsonb end "
  <> "  ) elem on true "
  <> "  left join countries co on co.iso2 is not null and ( "
  <> "    lower(trim(coalesce(elem->>'code', ''))) = lower(co.iso2) "
  <> "    or lower(trim(coalesce(elem->>'name', ''))) = lower(co.name) "
  <> "  ) "
  <> "  left join countries c_tr on c_tr.id = co.id and c_tr.iso2 = 'TR' "
  <> "  order by tb.id, "
  <> "    case when jsonb_typeof(tb.countries_json) = 'array' and jsonb_array_length(tb.countries_json) > 0 "
  <> "      and elem != '{}'::jsonb then 0 else 1 end, "
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
    |> db_exec.execute(ctx.db)
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
    |> db_exec.execute(ctx.db)
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
                |> db_exec.execute(ctx.db)
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
            |> db_exec.execute(ctx.db)
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
        |> db_exec.execute(ctx.db)
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

// ─── Public Cruise Hub Stats ───────────────────────────────────────────────────

fn cruise_hub_agg_row() -> decode.Decoder(#(String, String, String, Int, Int)) {
  use line <- decode.field(0, decode.string)
  use route <- decode.field(1, decode.string)
  use cat_link <- decode.field(2, decode.string)
  use night_cnt <- decode.field(3, decode.int)
  use cnt <- decode.field(4, decode.int)
  decode.success(#(line, route, cat_link, night_cnt, cnt))
}

fn public_cruise_hub_stats_sql() -> String {
  "select "
  <> "  coalesce(c.cruise_line, '') as cruise_line, "
  <> "  coalesce(c.route_summary, '') as route_summary, "
  <> "  coalesce(c.meta_json->>'category_link', '') as category_link, "
  <> "  max(coalesce("
  <> "    nullif(trim(vc.value_json->>'night_count'), '')::int, "
  <> "    nullif(trim(c.meta_json->>'night_count'), '')::int, "
  <> "    0"
  <> "  ))::int as night_count, "
  <> "  count(*)::int as cnt "
  <> "from listings l "
  <> "join product_categories pc on pc.id = l.category_id and pc.code = 'cruise' "
  <> "join listing_cruise_details c on c.listing_id = l.id "
  <> "left join listing_attributes vc on vc.listing_id = l.id "
  <> "  and vc.group_code = 'vertical_cruise' and vc.key = 'v1' "
  <> "where l.status = 'published' "
  <> public_listing_must_have_image_browse_sql()
  <> "group by 1, 2, 3 "
  <> "order by cnt desc"
}

/// GET /api/v1/catalog/public/cruise-hub-stats
/// Kruvaziyer hub kartları için gemi hattı + rota kırılımında ilan sayıları.
pub fn public_cruise_hub_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(public_cruise_hub_stats_sql())
    |> pog.returning(cruise_hub_agg_row())
    |> db_exec.execute(ctx.db)
  {
    Error(e) -> {
      let _ =
        io.println(
          "[catalog.public.cruise-hub-stats] "
            <> pog_errors.query_error_to_string(e),
        )
      let body =
        json.object([#("rows", json.array(from: [], of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
    Ok(ret) -> {
      let rows =
        list.map(ret.rows, fn(row) {
          let #(line, route, cat_link, night_cnt, cnt) = row
          json.object([
            #("cruise_line", json.string(line)),
            #("route_summary", json.string(route)),
            #("category_link", json.string(cat_link)),
            #("night_count", json.int(night_cnt)),
            #("count", json.int(cnt)),
          ])
        })
      let body =
        json.object([#("rows", json.array(from: rows, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

// ─── Public Kültür Tur Hub Stats ───────────────────────────────────────────────

fn tour_kultur_hub_agg_row() -> decode.Decoder(#(String, Int)) {
  use region <- decode.field(0, decode.string)
  use cnt <- decode.field(1, decode.int)
  decode.success(#(region, cnt))
}

fn public_tour_kultur_hub_stats_sql() -> String {
  "select "
  <> "  lower(trim(coalesce(tour_attr.value_json->'data'->>'tour_region', tour_attr.value_json->>'tour_region', ''))) as tour_region, "
  <> "  count(*)::int as cnt "
  <> "from listings l "
  <> "join product_categories pc on pc.id = l.category_id and pc.code = 'tour' "
  <> "join listing_attributes tour_attr on tour_attr.listing_id = l.id "
  <> "  and tour_attr.group_code = 'vertical_tour' and tour_attr.key = 'v1' "
  <> "where l.status = 'published' "
  <> public_listing_must_have_image_browse_sql()
  <> "and coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0 "
  <> "and trim(coalesce(tour_attr.value_json->'data'->>'tour_region', tour_attr.value_json->>'tour_region', '')) <> '' "
  <> "group by 1 "
  <> "order by cnt desc"
}

/// GET /api/v1/catalog/public/tour-kultur-hub-stats
/// Kültür tur hub kartları için bölge kırılımında ilan sayıları.
pub fn public_tour_kultur_hub_stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case
    pog.query(public_tour_kultur_hub_stats_sql())
    |> pog.returning(tour_kultur_hub_agg_row())
    |> db_exec.execute(ctx.db)
  {
    Error(e) -> {
      let _ =
        io.println(
          "[catalog.public.tour-kultur-hub-stats] "
            <> pog_errors.query_error_to_string(e),
        )
      let body =
        json.object([#("rows", json.array(from: [], of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
    Ok(ret) -> {
      let rows =
        list.map(ret.rows, fn(row) {
          let #(region, cnt) = row
          json.object([
            #("tour_region", json.string(region)),
            #("count", json.int(cnt)),
          ])
        })
      let body =
        json.object([#("rows", json.array(from: rows, of: fn(x) { x }))])
        |> json.to_string
      wisp.json_response(body, 200)
    }
  }
}

