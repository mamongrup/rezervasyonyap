-- Yat kiralama vitrin filtresi öznitelik grubu (panel + listing_attributes).

INSERT INTO listing_attribute_groups (organization_id, code, category_codes, sort_order, is_active, name)
SELECT o.id, 'yat_olanak', ARRAY['yacht_charter']::text[], 15, true, 'Yat olanakları'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM listing_attribute_groups g
  WHERE g.organization_id = o.id AND g.code = 'yat_olanak'
);

INSERT INTO listing_attribute_defs (group_id, code, label, field_type, sort_order)
SELECT g.id, d.code, d.label, 'boolean', d.ord
FROM listing_attribute_groups g
CROSS JOIN (
  VALUES
    ('wifi', 'Wi‑Fi', 1),
    ('air_conditioning', 'Klima', 2),
    ('generator', 'Jeneratör', 3),
    ('water_toys', 'Su sporu ekipmanı', 4),
    ('snorkeling', 'Şnorkel ekipmanı', 5),
    ('tender_dinghy', 'Zodyak / tender bot', 6)
) AS d(code, label, ord)
WHERE g.code = 'yat_olanak'
  AND 'yacht_charter' = ANY(g.category_codes)
  AND NOT EXISTS (
    SELECT 1 FROM listing_attribute_defs x
    WHERE x.group_id = g.id AND x.code = d.code
  );

INSERT INTO listing_attribute_group_translations (group_id, locale_id, name)
SELECT g.id, loc.id, 'Yat olanakları'
FROM listing_attribute_groups g
INNER JOIN locales loc ON lower(loc.code) = 'tr'
WHERE g.code = 'yat_olanak'
  AND 'yacht_charter' = ANY(g.category_codes)
ON CONFLICT (group_id, locale_id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO listing_attribute_def_translations (def_id, locale_id, label)
SELECT d.id, loc.id, tr.label
FROM listing_attribute_defs d
INNER JOIN listing_attribute_groups g ON g.id = d.group_id AND g.code = 'yat_olanak'
CROSS JOIN (
  VALUES
    ('wifi', 'Wi‑Fi'),
    ('air_conditioning', 'Klima'),
    ('generator', 'Jeneratör'),
    ('water_toys', 'Su sporu ekipmanı'),
    ('snorkeling', 'Şnorkel ekipmanı'),
    ('tender_dinghy', 'Zodyak / tender bot')
) AS tr(code, label)
INNER JOIN locales loc ON lower(loc.code) = 'tr'
WHERE d.code = tr.code
ON CONFLICT (def_id, locale_id) DO UPDATE SET label = EXCLUDED.label;
