-- MODÜL: FairyStone aktivite görselleri — .avif → .jpg
-- Belirti: aktivite vitrininde Kapadokya Balon vb. gri kart (379 sonrası .avif 404).

UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* 'fairystonetravel\.com'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* 'fairystonetravel\.com'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'fairystonetravel\.com'
  AND storage_key ~* '\.avif(\?|$)';
