-- Vitrinin `location` alanı `listings.location_name` üzerinden geliyor; panel adresi çoğu zaman
-- yalnızca listing_meta JSON'daydı. Bu tek seferlik doldurma boş location_name satırlarını
-- listing_attributes.address ile eşitler (PUT meta sonrası kod zaten senkron tutar).

UPDATE listings l
SET location_name = trim(v.addr)
FROM (
  SELECT listing_id, value_json->>'address' AS addr
  FROM listing_attributes
  WHERE group_code = 'listing_meta'
    AND key = 'v1'
) v
WHERE l.id = v.listing_id
  AND NULLIF(trim(coalesce(v.addr, '')), '') IS NOT NULL
  AND NULLIF(trim(coalesce(l.location_name, '')), '') IS NULL;
