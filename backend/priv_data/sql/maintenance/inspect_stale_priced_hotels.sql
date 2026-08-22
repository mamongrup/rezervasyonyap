-- vitrin_price boş/0 OLMASINA rağmen fiyat kaynağı olan otelleri inceler.
-- "refresh çalıştı ama oteller hâlâ gizli" durumunun nedenini bulmak için:
--   * price_rule_n=0, meal_plan_n>0  => yalnızca yemek planı; migration 342 GEREKLİ
--   * price_rule_n>0 ama vitrin_price boş => rule_json sayı formatı parse edilemiyor
--     (ilk_rule_json'a bakın: base_nightly/base_price anahtarı/biçimi)
--
-- Üretim: ./deploy/apply-sql.sh backend/priv/sql/maintenance/inspect_stale_priced_hotels.sql

\echo '== Bayat kalan (fiyatı var ama vitrin_price boş) oteller =='
SELECT l.id,
       left(l.slug, 45) AS slug,
       (SELECT count(*) FROM listing_price_rules r WHERE r.listing_id = l.id)                                          AS price_rule_n,
       (SELECT count(*) FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active AND m.price_per_night > 0)  AS meal_plan_n,
       (SELECT min(m.price_per_night) FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active AND m.price_per_night > 0) AS meal_min,
       (SELECT r.rule_json FROM listing_price_rules r WHERE r.listing_id = l.id LIMIT 1)                                AS ilk_rule_json
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
WHERE pc.code = 'hotel' AND l.status = 'published'
  AND coalesce(l.vitrin_price, l.first_charge_amount, 0) <= 0
  AND (EXISTS (SELECT 1 FROM listing_price_rules r WHERE r.listing_id = l.id)
    OR EXISTS (SELECT 1 FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active AND m.price_per_night > 0))
ORDER BY l.created_at DESC
LIMIT 40;
