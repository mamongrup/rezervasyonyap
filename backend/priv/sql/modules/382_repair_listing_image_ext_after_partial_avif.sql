-- MODÜL: 379 sonrası kırık görseller — harici CDN .avif → gerçek uzantı; uploads .avif → .webp
-- Belirti: /tatil-evleri sayfa 1–3 gri placeholder (diskte .webp, DB .avif; Bookeder .JPEG).
-- Frontend ayrıca kardeş-uzantı fallback ile korur; bu migration kalıcı DB düzeltmesidir.

-- 1) Bookeder / diğer http(s) kapaklar: .avif → .JPEG (Bookeder case-sensitive)
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.JPEG\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* '^https?://'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.JPEG\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* '^https?://'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.JPEG\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* '^https?://'
  AND storage_key ~* '\.avif(\?|$)';

-- 2) Yerel uploads: AVIF dönüşümü yarım kaldı; kardeş .webp çoğu villada 200.
--    (AVIF-only Bella vb. için frontend onError → .avif dener.)
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
