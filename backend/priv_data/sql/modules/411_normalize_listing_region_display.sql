-- Standart bölge kalıbı (tüm kategoriler):
--   district_label (semt) → city (ilçe) → province_city (il)
--   region_display = "semt, ilçe, il"
--   location_name = region_display (sokak adresi değil)
--
-- Idempotent: triad’dan üretilen satır ile senkronize eder.

BEGIN;

-- 1) region_display’i triad’dan üret / güncelle
UPDATE listing_attributes la
SET value_json = la.value_json || jsonb_build_object(
  'region_display',
  nullif(trim(both FROM concat_ws(', ',
    nullif(trim(la.value_json->>'district_label'), ''),
    nullif(trim(la.value_json->>'city'), ''),
    nullif(trim(
      CASE
        WHEN trim(coalesce(la.value_json->>'province_city', '')) ~ '/'
          THEN trim(substring(trim(la.value_json->>'province_city') from '[^/]+$'))
        ELSE trim(coalesce(la.value_json->>'province_city', ''))
      END
    ), '')
  )), '')
)
WHERE la.group_code = 'listing_meta'
  AND la.key = 'v1'
  AND (
    nullif(trim(la.value_json->>'district_label'), '') IS NOT NULL
    OR nullif(trim(la.value_json->>'city'), '') IS NOT NULL
    OR nullif(trim(la.value_json->>'province_city'), '') IS NOT NULL
  )
  AND coalesce(nullif(trim(la.value_json->>'region_display'), ''), '')
    IS DISTINCT FROM
    coalesce(nullif(trim(both FROM concat_ws(', ',
      nullif(trim(la.value_json->>'district_label'), ''),
      nullif(trim(la.value_json->>'city'), ''),
      nullif(trim(
        CASE
          WHEN trim(coalesce(la.value_json->>'province_city', '')) ~ '/'
            THEN trim(substring(trim(la.value_json->>'province_city') from '[^/]+$'))
          ELSE trim(coalesce(la.value_json->>'province_city', ''))
        END
      ), '')
    )), ''), '');

-- 2) location_name = region_display (standart vitrin satırı)
UPDATE listings l
SET
  location_name = nullif(trim(la.value_json->>'region_display'), ''),
  updated_at = now()
FROM listing_attributes la
WHERE la.listing_id = l.id
  AND la.group_code = 'listing_meta'
  AND la.key = 'v1'
  AND nullif(trim(la.value_json->>'region_display'), '') IS NOT NULL
  AND coalesce(l.location_name, '') IS DISTINCT FROM trim(la.value_json->>'region_display');

COMMIT;
