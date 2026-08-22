-- MODÜL: WTatil — bulanık -thumbnail kapak → snapshot galleryPhotos ilk tam boy HTTPS
-- Belirti: Önerilenler kartlarında tek/bulanık görsel; galeri hâlâ yerel uploads.
-- Not: Tam galeri için scripts/restore-wtatil-images-from-snapshot.mjs --force

WITH picked AS (
  SELECT
    l.id,
    (
      SELECT regexp_replace(
               replace(elem, 'http://', 'https://'),
               '\.avif(\?|$)',
               '.jpg\1',
               'i'
             )
      FROM jsonb_array_elements_text(
        coalesce(
          la.value_json #> '{catalog,galleryPhotos}',
          la.value_json -> 'galleryPhotos',
          '[]'::jsonb
        )
      ) AS elem
      WHERE elem ~* '^https?://'
        AND elem !~* '-thumbnail\.'
      LIMIT 1
    ) AS cover_full
  FROM listings l
  JOIN listing_attributes la
    ON la.listing_id = l.id
   AND la.group_code = 'wtatil'
   AND la.key = 'snapshot'
  WHERE l.external_provider_code = 'wtatil'
    AND (
      coalesce(l.featured_image_url, '') = ''
      OR l.featured_image_url ~* '-thumbnail\.'
      OR l.featured_image_url ~* '(^|/)uploads/'
    )
)
UPDATE listings l
SET featured_image_url = p.cover_full,
    thumbnail_url = p.cover_full,
    updated_at = now()
FROM picked p
WHERE l.id = p.id
  AND p.cover_full IS NOT NULL
  AND p.cover_full ~* '^https?://'
  AND length(p.cover_full) > 12;
