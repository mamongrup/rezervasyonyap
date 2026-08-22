-- MODÜL: Harici otel/CDN görselleri — host'a göre doğru uzantı (379/382 sonrası)
-- Belirti: /otel/* detay ve vitrinde kırık görseller (TatilBudur .avif 403, .JPEG 500).
-- Bookeder: .JPEG | TatilBudur productcdn: .jpg | uploads: .webp (382 ile)

-- TatilBudur: .avif → .jpg
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* 'productcdn\.tatilbudur\.com'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* 'productcdn\.tatilbudur\.com'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'productcdn\.tatilbudur\.com'
  AND storage_key ~* '\.avif(\?|$)';

-- TatilBudur: 382'nin yazdığı .JPEG → .jpg (CDN 500)
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.JPEG(\?|$)', '.jpg\1'),
    updated_at = now()
WHERE featured_image_url ~* 'productcdn\.tatilbudur\.com'
  AND featured_image_url ~ '\.JPEG(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.JPEG(\?|$)', '.jpg\1'),
    updated_at = now()
WHERE thumbnail_url ~* 'productcdn\.tatilbudur\.com'
  AND thumbnail_url ~ '\.JPEG(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.JPEG(\?|$)', '.jpg\1'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'productcdn\.tatilbudur\.com'
  AND storage_key ~ '\.JPEG(\?|$)';

-- Bookeder: kalan .avif → .JPEG
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.JPEG\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* 'bookeder\.com'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.JPEG\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* 'bookeder\.com'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.JPEG\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'bookeder\.com'
  AND storage_key ~* '\.avif(\?|$)';
