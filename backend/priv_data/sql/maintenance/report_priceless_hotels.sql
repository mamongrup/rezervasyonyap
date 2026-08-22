-- Yayında olup vitrinde GİZLENEN (hiçbir kaynakta fiyatı olmayan) otellerin raporu.
-- hotel_public_must_have_price_sql() kapısı bu otelleri listelemiyor; bu rapor
-- kaç otelin gizlendiğini ve nedenini gösterir (re-import/backfill kararı için).
--
-- Üretim: ./deploy/scripts/report-priceless-hotels.sh
--   (veya) ./deploy/apply-sql.sh backend/priv/sql/maintenance/report_priceless_hotels.sql
--
-- Not: vitrin_price önce tazelenmiş olmalı (refresh_listing_vitrin_prices()),
-- aksi halde fiyatlı yeni oteller yanlışlıkla "fiyatsız" sayılabilir.

\echo '== Yayında otel fiyat durumu =='
SELECT
  count(*)                                                                          AS yayinda_otel,
  count(*) FILTER (WHERE coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0)    AS fiyatli_gorunur,
  count(*) FILTER (WHERE coalesce(l.vitrin_price, l.first_charge_amount, 0) <= 0)   AS fiyatsiz_gizli
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
WHERE pc.code = 'hotel' AND l.status = 'published';

\echo ''
\echo '== Fiyatsız (gizli) otellerin nedeni =='
SELECT
  count(*)                                                                                                AS fiyatsiz_toplam,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules r WHERE r.listing_id = l.id))      AS price_rules_yok,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active)) AS aktif_meal_plan_yok,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM hotel_rooms hr WHERE hr.listing_id = l.id))            AS oda_yok,
  count(*) FILTER (WHERE l.external_provider_code = 'travelrobot')                                        AS travelrobot
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
WHERE pc.code = 'hotel' AND l.status = 'published'
  AND coalesce(l.vitrin_price, l.first_charge_amount, 0) <= 0;

\echo ''
\echo '== Fiyatsız otel örnekleri (ilk 25) =='
SELECT l.id, left(l.slug, 60) AS slug, l.external_provider_code AS saglayici,
       (EXISTS (SELECT 1 FROM hotel_rooms hr WHERE hr.listing_id = l.id))           AS oda_var,
       (EXISTS (SELECT 1 FROM listing_price_rules r WHERE r.listing_id = l.id))     AS price_rule_var,
       (EXISTS (SELECT 1 FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active)) AS meal_plan_var
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
WHERE pc.code = 'hotel' AND l.status = 'published'
  AND coalesce(l.vitrin_price, l.first_charge_amount, 0) <= 0
ORDER BY l.created_at DESC
LIMIT 25;
