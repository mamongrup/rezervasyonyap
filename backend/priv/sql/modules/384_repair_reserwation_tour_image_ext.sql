-- MODÜL: WTatil / reserwation.com tur görselleri — .avif → .jpg
-- Belirti: anasayfa/tur vitrininde gri kart (379 sonrası .avif 404; gerçek dosya .jpg).

UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* 'reserwation\.com'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* 'reserwation\.com'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'reserwation\.com'
  AND storage_key ~* '\.avif(\?|$)';
