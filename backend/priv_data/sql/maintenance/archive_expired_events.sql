-- Yayındaki etkinlikleri bitiş zamanı (yoksa başlangıç zamanı) geçince arşivler.
WITH expired AS (
  SELECT l.id
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'event'
  LEFT JOIN listing_event_details ed ON ed.listing_id = l.id
  LEFT JOIN listing_attributes a
    ON a.listing_id = l.id AND a.group_code = 'vertical_event' AND a.key = 'v1'
  WHERE l.status = 'published'
    AND COALESCE(
      ed.ends_at,
      ed.starts_at,
      NULLIF(COALESCE(a.value_json->'data'->>'ends_at', a.value_json->>'ends_at'), '')::timestamptz,
      NULLIF(COALESCE(a.value_json->'data'->>'starts_at', a.value_json->>'starts_at'), '')::timestamptz
    ) < now()
)
UPDATE listings l
SET status = 'archived', updated_at = now()
FROM expired e
WHERE l.id = e.id;
