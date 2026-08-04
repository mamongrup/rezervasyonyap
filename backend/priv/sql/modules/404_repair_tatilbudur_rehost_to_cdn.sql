-- MODÜL: TatilBudur otel görselleri — kırık yerel /uploads rehost → productcdn .jpg
-- Belirti: /oteller kartlarında gri placeholder (Kaya Villas, Golden Key, Mivara, Casa Dell'Arte…).
-- Kök: rehost dosyaları diskte yok; productcdn aynı stem ile .jpg sunuyor (HTTP 200).
-- Ayrıca CDN URL'lerindeki yanlış .avif → .jpg (OG / crawler için).

-- 1) HTTPS productcdn / ucdn .avif → .jpg
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE featured_image_url ~* '(productcdn\.tatilbudur\.com|ucdn\.tatilbudur\.net)'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE thumbnail_url ~* '(productcdn\.tatilbudur\.com|ucdn\.tatilbudur\.net)'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* '(productcdn\.tatilbudur\.com|ucdn\.tatilbudur\.net)'
  AND storage_key ~* '\.avif(\?|$)';

-- 2) Yerel /uploads/listings/ilanlar/oteller/… → productcdn (sıra öneki 00- vb. düşülür)
UPDATE listings
SET featured_image_url =
      'https://productcdn.tatilbudur.com/Otel/855x426/'
      || regexp_replace(
           regexp_replace(regexp_replace(featured_image_url, '^.*\/', ''), '^\d+-', ''),
           '\.(avif|webp|jpe?g|png)(\?.*)?$',
           '.jpg',
           'i'
         ),
    updated_at = now()
WHERE external_provider_code = 'tatilbudur'
  AND featured_image_url ~* '(^|/)uploads/listings/ilanlar/oteller/';

UPDATE listings
SET thumbnail_url =
      'https://productcdn.tatilbudur.com/Otel/855x426/'
      || regexp_replace(
           regexp_replace(regexp_replace(thumbnail_url, '^.*\/', ''), '^\d+-', ''),
           '\.(avif|webp|jpe?g|png)(\?.*)?$',
           '.jpg',
           'i'
         ),
    updated_at = now()
WHERE external_provider_code = 'tatilbudur'
  AND thumbnail_url ~* '(^|/)uploads/listings/ilanlar/oteller/';

UPDATE listing_images li
SET storage_key =
      'https://productcdn.tatilbudur.com/Otel/855x426/'
      || regexp_replace(
           regexp_replace(regexp_replace(li.storage_key, '^.*\/', ''), '^\d+-', ''),
           '\.(avif|webp|jpe?g|png)(\?.*)?$',
           '.jpg',
           'i'
         ),
    original_mime = 'image/jpeg'
FROM listings l
WHERE li.listing_id = l.id
  AND l.external_provider_code = 'tatilbudur'
  AND li.storage_key ~* '(^|/)uploads/listings/ilanlar/oteller/';
