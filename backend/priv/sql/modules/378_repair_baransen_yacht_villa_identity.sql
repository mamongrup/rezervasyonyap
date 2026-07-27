-- MODÜL: Baransen yat kimliği — Bravo villa slug/title çakışması onarımı.
-- Bravo space sayısal id ile Baransen yat id çakışınca yat kaydı villa adı/slug
-- aldı (ör. Uğurlu Villa → /yat/ugurlu-villa) ama galeri doğru yat klasöründe kaldı
-- (/uploads/.../yatlar/gulet-la-bella-vita-bs-90/...).
-- Kanonik slug = featured_image_url içindeki /yatlar/{slug}/ segmenti (368 ile aynı
-- yaklaşımın toplu hali). Hedef slug doluysa satır atlanır.

WITH broken AS (
  SELECT
    l.id,
    l.organization_id,
    l.slug AS wrong_slug,
    (regexp_match(coalesce(l.featured_image_url, ''), '/yatlar/([^/]+)/'))[1] AS folder_slug,
    substring(
      (regexp_match(coalesce(l.featured_image_url, ''), '/yatlar/([^/]+)/'))[1]
      from '-bs-([0-9]+)$'
    ) AS baransen_ref
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code = 'yacht_charter'
    AND coalesce(l.external_provider_code, '') IN ('baransen', '')
    AND coalesce(l.featured_image_url, '') ~ '/yatlar/[^/]+/'
    AND l.slug IS DISTINCT FROM (regexp_match(l.featured_image_url, '/yatlar/([^/]+)/'))[1]
),
safe AS (
  SELECT b.*
  FROM broken b
  WHERE b.folder_slug IS NOT NULL
    AND b.folder_slug <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM listings o
      WHERE o.organization_id = b.organization_id
        AND o.slug = b.folder_slug
        AND o.id <> b.id
    )
),
updated AS (
  UPDATE listings l
  SET
    slug = s.folder_slug,
    external_provider_code = 'baransen',
    external_listing_ref = coalesce(s.baransen_ref, l.external_listing_ref),
    property_type = CASE
      WHEN lower(coalesce(l.property_type, '')) IN ('villa', 'apartment', 'apart')
        THEN NULL
      ELSE l.property_type
    END,
    updated_at = now()
  FROM safe s
  WHERE l.id = s.id
  RETURNING l.id, s.wrong_slug, s.folder_slug
)
UPDATE listing_translations lt
SET title = initcap(replace(regexp_replace(u.folder_slug, '-bs-[0-9]+$', ''), '-', ' '))
FROM updated u
WHERE lt.listing_id = u.id
  AND (
    lower(translate(trim(lt.title), 'İIı', 'iii')) = lower(translate(replace(u.wrong_slug, '-', ' '), 'İIı', 'iii'))
    OR lower(trim(lt.title)) LIKE '%villa%'
    OR lower(trim(lt.title)) LIKE '%apart%'
  );
