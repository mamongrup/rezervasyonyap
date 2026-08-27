-- Aktivite fiyatının tek doğruluk kaynağı aktif yetişkin seans ücretidir.
-- Eski import/listing_price_rules satırlarını temizle ve türetilmiş ilan alanlarını onar.

DELETE FROM listing_price_rules pr
USING listings l
JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'activity'
WHERE pr.listing_id = l.id;

WITH activity_prices AS (
  SELECT DISTINCT ON (s.listing_id)
         s.listing_id,
         f.price_amount AS amount,
         upper(trim(f.currency_code)) AS currency_code
  FROM listing_activity_sessions s
  JOIN listing_activity_session_fares f
    ON f.session_id = s.id AND f.fare_type = 'adult'
  WHERE s.is_active = true
    AND f.price_amount > 0
  ORDER BY s.listing_id, f.price_amount, s.sort_order, s.start_time
), activity_listing_prices AS (
  SELECT l.id,
         price.amount,
         price.currency_code
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'activity'
  LEFT JOIN activity_prices price ON price.listing_id = l.id
)
UPDATE listings l
SET first_charge_amount = price.amount,
    vitrin_price = price.amount,
    currency_code = coalesce(price.currency_code, l.currency_code),
    updated_at = now()
FROM activity_listing_prices price
WHERE price.id = l.id
  AND (
    l.first_charge_amount IS DISTINCT FROM price.amount
    OR l.vitrin_price IS DISTINCT FROM price.amount
    OR (price.currency_code IS NOT NULL AND l.currency_code IS DISTINCT FROM price.currency_code)
  );

ANALYZE listings;
