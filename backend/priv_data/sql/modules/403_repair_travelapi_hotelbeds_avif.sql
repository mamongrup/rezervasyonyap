-- MODÜL: KPlus CDN görselleri — travelapi / hotelbeds yanlış .avif → .jpg
-- Belirti: vitrin kart + /otel/* detayda kırık görsel (CDN yalnızca .jpg sunar; .avif = 404).
-- Kaynak: 379 blanket AVIF dönüşümü + rehost öncesi CDN URL'ler.

-- i.travelapi.com (Expedia / KPlus)
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* 'travelapi\.com'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* 'travelapi\.com'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'travelapi\.com'
  AND storage_key ~* '\.avif(\?|$)';

-- photos.hotelbeds.com
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* 'hotelbeds\.com'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* 'hotelbeds\.com'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'hotelbeds\.com'
  AND storage_key ~* '\.avif(\?|$)';
