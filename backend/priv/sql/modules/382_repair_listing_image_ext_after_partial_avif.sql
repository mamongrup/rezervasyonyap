-- MODÜL: 379 sonrası kırık görseller — host'a göre uzantı + uploads .avif → .webp
-- Belirti: /tatil-evleri gri kart; Bookeder .JPEG; TatilBudur .jpg (kör .JPEG yazma!).
-- Frontend ayrıca kardeş-uzantı fallback ile korur.

-- 1a) Bookeder: .avif → .JPEG (case-sensitive)
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

-- 1b) TatilBudur productcdn: .avif → .jpg (.JPEG 500 verir)
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

-- 2) Yerel uploads: AVIF dönüşümü yarım kaldı; kardeş .webp çoğu villada 200.
UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif$', '.webp', 'i'),
    original_mime = 'image/webp'
WHERE storage_key ~* '(^|/)uploads/listings/.*\.avif$';

UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.webp\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* '/uploads/listings/.*\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.webp\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* '/uploads/listings/.*\.avif(\?|$)';
