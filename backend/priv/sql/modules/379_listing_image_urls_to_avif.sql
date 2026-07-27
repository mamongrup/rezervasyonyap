-- MODÜL: İlan görselleri — diskte AVIF varken DB'de kalan .jpg/.webp/.png URL'lerini düzelt.
-- Belirti: /tatil-evleri kartlarında gri placeholder (404 .jpg); kardeş .avif 200.
-- update-listing-paths-avif.mjs ile aynı dönüşüm; tüm ilanlar (external_ref şartı yok).

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.(webp|jpe?g|png|jfif)$', '.avif', 'i'),
    original_mime = 'image/avif'
WHERE storage_key ~* '\.(webp|jpe?g|png|jfif)$';

UPDATE listings
SET featured_image_url = regexp_replace(
      coalesce(featured_image_url, ''),
      '\.(webp|jpe?g|png|jfif)(\?.*)?$',
      '.avif\2',
      'i'
    ),
    thumbnail_url = regexp_replace(
      coalesce(thumbnail_url, ''),
      '\.(webp|jpe?g|png|jfif)(\?.*)?$',
      '.avif\2',
      'i'
    ),
    updated_at = now()
WHERE coalesce(featured_image_url, '') ~* '\.(webp|jpe?g|png|jfif)(\?|$)'
   OR coalesce(thumbnail_url, '') ~* '\.(webp|jpe?g|png|jfif)(\?|$)';
