-- Tatil evi: öznitelikler yalnızca iç/dış olanaklar; tip ve tema ayrı yönetilir.

INSERT INTO listing_attribute_groups (organization_id, code, category_codes, sort_order, is_active, name)
SELECT o.id, 'ic_mekan', ARRAY['holiday_home']::text[], 10, true, 'İç olanaklar'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM listing_attribute_groups g
  WHERE g.organization_id = o.id AND g.code = 'ic_mekan'
);

UPDATE listing_attribute_groups
SET is_active = false
WHERE code IN ('ilan_tipi', 'tema')
  AND 'holiday_home' = ANY(category_codes);

UPDATE listing_attribute_groups
SET sort_order = 20, name = COALESCE(NULLIF(btrim(name), ''), 'Dış olanaklar')
WHERE code = 'dis_mekan';

INSERT INTO listing_attribute_group_translations (group_id, locale_id, name)
SELECT g.id, loc.id, tr.name
FROM listing_attribute_groups g
CROSS JOIN (VALUES ('ic_mekan', 'İç olanaklar'), ('dis_mekan', 'Dış olanaklar')) AS tr(code, name)
INNER JOIN locales loc ON lower(loc.code) = 'tr'
WHERE g.code = tr.code
  AND 'holiday_home' = ANY(g.category_codes)
ON CONFLICT (group_id, locale_id) DO UPDATE SET name = EXCLUDED.name;
