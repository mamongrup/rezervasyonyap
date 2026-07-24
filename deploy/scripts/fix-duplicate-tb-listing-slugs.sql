-- Tatilbudur import'unda {slug}-tb-{slug} çiftlenmesi — kısa yayın URL'sine indir.
-- Örnek: adrasan-beltom-beach-hotel-tb-adrasan-beltom-beach-hotel → adrasan-beltom-beach-hotel
-- Kullanım (üretim):
--   ./deploy/apply-sql.sh deploy/scripts/fix-duplicate-tb-listing-slugs.sql

BEGIN;

WITH candidates AS (
  SELECT
    l.id,
    l.organization_id,
    l.slug AS old_slug,
    regexp_replace(l.slug, '-tb-' || split_part(l.slug, '-tb-', 1) || '$', '') AS new_slug
  FROM listings l
  WHERE l.slug ~ '^.+-tb-.+$'
    AND split_part(l.slug, '-tb-', 1) = split_part(l.slug, '-tb-', 2)
    AND split_part(l.slug, '-tb-', 1) <> ''
),
safe AS (
  SELECT c.*
  FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1
    FROM listings o
    WHERE o.organization_id = c.organization_id
      AND o.slug = c.new_slug
      AND o.id <> c.id
  )
)
UPDATE listings l
SET slug = s.new_slug, updated_at = now()
FROM safe s
WHERE l.id = s.id;

-- Bilinen tekil kayıt (aday regex kaçırırsa)
UPDATE listings
SET slug = 'adrasan-beltom-beach-hotel', updated_at = now()
WHERE id = '3d07f898-4632-464d-85b8-68410ed44e00'
  AND slug = 'adrasan-beltom-beach-hotel-tb-adrasan-beltom-beach-hotel'
  AND NOT EXISTS (
    SELECT 1 FROM listings o
    WHERE o.organization_id = listings.organization_id
      AND o.slug = 'adrasan-beltom-beach-hotel'
      AND o.id <> listings.id
  );

COMMIT;
