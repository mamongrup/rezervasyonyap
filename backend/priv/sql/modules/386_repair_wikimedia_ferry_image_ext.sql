-- MODÜL: Feribot Wikimedia görselleri — .avif → .jpg
-- Belirti: Kaş–Meis feribot kartı gri (379 sonrası commons .avif 404; gerçek .jpg).

UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* 'upload\.wikimedia\.org'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* 'upload\.wikimedia\.org'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'upload\.wikimedia\.org'
  AND storage_key ~* '\.avif(\?|$)';
