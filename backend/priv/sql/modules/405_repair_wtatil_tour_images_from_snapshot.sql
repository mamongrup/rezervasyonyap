-- MODÜL: WTatil tur görselleri — kırık yerel /uploads → snapshot coverPhoto (reserwation CDN)
-- Belirti: anasayfa «Önerilenler» + /tur/* galeri gri placeholder.
-- Kök: rehost AVIF diskte yok; listing_attributes wtatil/snapshot hâlâ HTTPS tutuyor.

WITH src AS (
  SELECT
    l.id,
    regexp_replace(
      replace(
        coalesce(
          nullif(trim(la.value_json #>> '{catalog,coverPhoto}'), ''),
          nullif(trim(la.value_json ->> 'coverPhoto'), ''),
          nullif(trim(la.value_json #>> '{catalog,galleryPhotos,0}'), ''),
          nullif(trim(la.value_json -> 'galleryPhotos' ->> 0), '')
        ),
        'http://',
        'https://'
      ),
      '\.avif(\?|$)',
      '.jpg\1',
      'i'
    ) AS cover
  FROM listings l
  JOIN listing_attributes la
    ON la.listing_id = l.id
   AND la.group_code = 'wtatil'
   AND la.key = 'snapshot'
  WHERE l.external_provider_code = 'wtatil'
    AND (
      coalesce(l.featured_image_url, '') = ''
      OR l.featured_image_url ~ '^/'
      OR l.featured_image_url ~* 'reserwation\.com.*\.avif'
    )
)
UPDATE listings l
SET featured_image_url = s.cover,
    thumbnail_url = s.cover,
    updated_at = now()
FROM src s
WHERE l.id = s.id
  AND s.cover ~* '^https?://'
  AND length(s.cover) > 12;

-- HTTPS kapaklarda kalan .avif (CDN jpg sunar)
UPDATE listings
SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE external_provider_code = 'wtatil'
  AND featured_image_url ~* 'reserwation\.com'
  AND featured_image_url ~* '\.avif(\?|$)';

UPDATE listings
SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'),
    updated_at = now()
WHERE external_provider_code = 'wtatil'
  AND thumbnail_url ~* 'reserwation\.com'
  AND thumbnail_url ~* '\.avif(\?|$)';

UPDATE listing_images
SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'),
    original_mime = 'image/jpeg'
WHERE storage_key ~* 'reserwation\.com'
  AND storage_key ~* '\.avif(\?|$)';
