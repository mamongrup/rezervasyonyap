-- MODÜL: vitrin_price'a yemek planı (listing_meal_plans) fiyat kaynağı eklenir.
--
-- Neden: Otel (KPlus/Travelrobot) ilanlarının bir kısmında gecelik fiyat
-- `listing_price_rules` yerine yalnızca `listing_meal_plans.price_per_night`
-- içinde olabiliyor. Kart fiyatı (price_from) zaten meal_plans'ı fallback olarak
-- okuyor; ancak vitrin_price okumuyordu → bu oteller fiyatı OLMASINA rağmen
-- vitrin_price=NULL kalıyor, fiyat sıralaması/filtresi ve "fiyatı olmalı" kapısı
-- onları yanlışlıkla dışlardı.
--
-- Bu migrasyon refresh_listing_vitrin_prices() fonksiyonunu, price_rules'tan
-- sonra meal_plans minimumunu da dikkate alacak şekilde yeniden tanımlar. Böylece
-- vitrin_price ≈ price_from (kartta görünen fiyat) olur ve "fiyatı olmalı" kapısı
-- yalnızca GERÇEKTEN fiyatsız otelleri gizler.

CREATE OR REPLACE FUNCTION refresh_listing_vitrin_prices() RETURNS void
LANGUAGE sql AS $func$
  UPDATE listings l SET vitrin_price = coalesce(
    -- 1) konaklama/otel/yat: listing_price_rules min gecelik
    (select min(u.v)
       from listing_price_rules r
       cross join lateral (values
         (case when replace(trim(coalesce(r.rule_json->>'base_nightly', '')), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'base_nightly', '')), ',', '.')::numeric end),
         (case when replace(trim(coalesce(r.rule_json->>'base_price', '')), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'base_price', '')), ',', '.')::numeric end),
         (case when replace(trim(coalesce(r.rule_json->>'room_only_nightly', '')), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'room_only_nightly', '')), ',', '.')::numeric end),
         (case when replace(trim(coalesce(r.rule_json->>'yemeksiz_nightly', '')), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'yemeksiz_nightly', '')), ',', '.')::numeric end),
         (case when replace(trim(coalesce(r.rule_json->>'meals_included_nightly', '')), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'meals_included_nightly', '')), ',', '.')::numeric end),
         (case when replace(trim(coalesce(r.rule_json->>'weekend_nightly', '')), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$' then replace(trim(coalesce(r.rule_json->>'weekend_nightly', '')), ',', '.')::numeric end)
       ) as u(v)
       where r.listing_id = l.id and u.v is not null),
    -- 2) otel/konaklama: yemek planı minimumu (price_rules yoksa) — price_from ile uyumlu
    (select min(m.price_per_night)
       from listing_meal_plans m
       where m.listing_id = l.id and m.is_active = true and m.price_per_night > 0),
    -- 3) tur: program_days_json cheapest_price / period_prices min
    (select case when replace(trim(tp.v), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$' then replace(trim(tp.v), ',', '.')::numeric end
       from listing_tour_details td
       cross join lateral (select nullif(trim(coalesce(
         case when jsonb_typeof(td.program_days_json->'cheapest_price') = 'number' then td.program_days_json->>'cheapest_price'
              when jsonb_typeof(td.program_days_json->'cheapest_price') = 'object' then coalesce(
                nullif(trim(td.program_days_json->'cheapest_price'->>'value'), ''),
                nullif(trim(td.program_days_json->'cheapest_price'->>'amount'), ''),
                nullif(trim(td.program_days_json->'cheapest_price'->>'price'), ''),
                nullif(trim(td.program_days_json->'cheapest_price'->>'totalPrice'), ''))
              else null end,
         (select min(pp.n)::text from jsonb_array_elements(
            case jsonb_typeof(td.program_days_json->'period_prices') when 'array' then td.program_days_json->'period_prices' else '[]'::jsonb end) elem
          cross join lateral (select case when replace(trim(coalesce(
                nullif(trim(elem->>'price'), ''), nullif(trim(elem->>'amount'), ''),
                nullif(trim(elem->>'adultPrice'), ''), nullif(trim(elem->>'doublePrice'), ''),
                nullif(trim(elem->>'singlePrice'), ''), '')), ',', '.') ~ '^[0-9]+(\.[0-9]{1,2})?$'
              then replace(trim(coalesce(
                nullif(trim(elem->>'price'), ''), nullif(trim(elem->>'amount'), ''),
                nullif(trim(elem->>'adultPrice'), ''), nullif(trim(elem->>'doublePrice'), ''),
                nullif(trim(elem->>'singlePrice'), ''), '')), ',', '.')::numeric else null end as n) pp
          where pp.n is not null and pp.n > 0)
       )), '') as v) tp
       where td.listing_id = l.id),
    -- 4) aktivite: min yetişkin (adult) ücreti
    (select min(f.price_amount)
       from listing_activity_sessions s
       join listing_activity_session_fares f on f.session_id = s.id and f.fare_type = 'adult'
       where s.listing_id = l.id and s.is_active = true and f.price_amount is not null and f.price_amount > 0),
    -- 5) fallback
    l.first_charge_amount
  );
$func$;

SELECT refresh_listing_vitrin_prices();

ANALYZE listings;
