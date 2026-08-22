-- MODÜL: detay açılış + vitrin CPU — slug index ve tek-ilan vitrin_price tazeleme.
--
-- 1) by-slug resolve `lower(l.slug)` kullanır; global published slug index yoktu.
-- 2) Tam tablo refresh_listing_vitrin_prices() pahalı; import sonrası yalnız
--    dokunulan ilan(lar) için refresh_listing_vitrin_prices_for(uuid) / _for_ids(uuid[]).

CREATE INDEX IF NOT EXISTS idx_listings_published_slug_lower
  ON listings (lower(slug))
  WHERE status = 'published';

-- Görsel kapısı EXISTS (listing_images … storage_key) için kısmi index.
CREATE INDEX IF NOT EXISTS idx_listing_images_nonempty_storage
  ON listing_images (listing_id)
  WHERE trim(coalesce(storage_key, '')) <> '';

-- Tek ilan tazeleme — 342 ile aynı kaynak sırası (price_rules → meal_plans → tour → activity → first_charge).
CREATE OR REPLACE FUNCTION refresh_listing_vitrin_prices_for(p_listing_id uuid) RETURNS void
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
    (select min(m.price_per_night)
       from listing_meal_plans m
       where m.listing_id = l.id and m.is_active = true and m.price_per_night > 0),
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
  )
  WHERE l.id = p_listing_id;
$func$;

CREATE OR REPLACE FUNCTION refresh_listing_vitrin_prices_for_ids(p_ids uuid[]) RETURNS void
LANGUAGE sql AS $func$
  SELECT refresh_listing_vitrin_prices_for(x)
  FROM unnest(p_ids) AS t(x)
  WHERE x IS NOT NULL;
$func$;

ANALYZE listings;
ANALYZE listing_images;
