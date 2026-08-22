-- Aktivite vitrin: para birimi + kapak görseli seans/galeri kayıtlarından; otel import fiyat kurallarını temizle.

-- 1) listings.currency_code ← en düşük aktif yetişkin seans ücreti
UPDATE listings l
SET currency_code = x.cur,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (s.listing_id)
    s.listing_id,
    upper(trim(f.currency_code)) AS cur
  FROM listing_activity_sessions s
  JOIN listing_activity_session_fares f
    ON f.session_id = s.id AND f.fare_type = 'adult'
  WHERE s.is_active = true
    AND f.price_amount IS NOT NULL
    AND f.price_amount > 0
    AND trim(coalesce(f.currency_code, '')) <> ''
  ORDER BY s.listing_id, f.price_amount ASC, f.currency_code
) x,
product_categories pc
WHERE l.id = x.listing_id
  AND pc.id = l.category_id
  AND pc.code = 'activity'
  AND l.currency_code IS DISTINCT FROM x.cur;

-- 2) Otel import kalıntısı listing_price_rules — vitrin artık seans ücretini kullanır
DELETE FROM listing_price_rules pr
USING listings l
JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'activity'
WHERE pr.listing_id = l.id
  AND EXISTS (
    SELECT 1
    FROM listing_activity_sessions s
    JOIN listing_activity_session_fares f
      ON f.session_id = s.id AND f.fare_type = 'adult'
    WHERE s.listing_id = l.id
      AND s.is_active = true
      AND f.price_amount IS NOT NULL
      AND f.price_amount > 0
  );

-- 3) Kapak görseli boşsa ilk galeri satırından doldur
UPDATE listings l
SET featured_image_url = sub.path,
    thumbnail_url = sub.path,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (li.listing_id)
    li.listing_id,
    CASE
      WHEN trim(li.storage_key) ILIKE 'http%' THEN trim(li.storage_key)
      WHEN trim(li.storage_key) LIKE '/%' THEN trim(li.storage_key)
      ELSE '/' || trim(li.storage_key)
    END AS path
  FROM listing_images li
  WHERE trim(coalesce(li.storage_key, '')) <> ''
  ORDER BY li.listing_id, li.sort_order ASC, li.created_at ASC
) sub,
product_categories pc
WHERE l.id = sub.listing_id
  AND pc.id = l.category_id
  AND pc.code = 'activity'
  AND trim(coalesce(l.featured_image_url, '')) = '';
