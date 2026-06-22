-- MODÜL: vitrin fiyat cache — fiyata göre sıralama/filtre artık satır-başı lateral yerine
-- önceden hesaplanmış sütun + index kullanır. Sıralama/fiyat filtresi tüm eşleşen satırların
-- fiyatını canlı hesaplamak zorunda kalmaz (hotel sort=price 500/timeout sorunu).
--
-- Not: vitrin_price yalnızca SIRALAMA ve FİYAT FİLTRESİ için kullanılır; ekranda gösterilen
-- price_from hâlâ canlı lateral'lardan gelir (doğruluk). Fiyatlar nadiren değiştiği için
-- bu önbellek periyodik olarak refresh_listing_vitrin_prices() ile tazelenmelidir.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS vitrin_price numeric;

-- Vitrin fiyatını canlı sorgudaki coalesce sırasıyla AYNI mantıkla hesaplar:
--   1) konaklama/yat: listing_price_rules min gecelik
--   2) tur: program_days_json cheapest_price / period_prices min
--   3) aktivite: min yetişkin (adult) ücreti
--   4) fallback: listings.first_charge_amount
CREATE OR REPLACE FUNCTION refresh_listing_vitrin_prices() RETURNS void
LANGUAGE sql AS $func$
  UPDATE listings l SET vitrin_price = coalesce(
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
    (select min(f.price_amount)
       from listing_activity_sessions s
       join listing_activity_session_fares f on f.session_id = s.id and f.fare_type = 'adult'
       where s.listing_id = l.id and s.is_active = true and f.price_amount is not null and f.price_amount > 0),
    l.first_charge_amount
  );
$func$;

SELECT refresh_listing_vitrin_prices();

-- Fiyata göre sıralama + kategori/status filtresi için kapsayan index.
CREATE INDEX IF NOT EXISTS idx_listings_cat_status_vitrin
  ON listings (category_id, status, vitrin_price);

ANALYZE listings;
