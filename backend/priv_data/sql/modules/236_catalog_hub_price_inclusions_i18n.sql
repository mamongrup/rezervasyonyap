-- Mevcut veritabanları: manage bundle — catalog.hub_price_inclusions (Katalog menüsü)
INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, 'catalog.hub_price_inclusions'
FROM translation_namespaces n
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, 'Dahil / Hariç'
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN locales l ON lower(l.code) = 'tr'
WHERE e.key = 'catalog.hub_price_inclusions'
ON CONFLICT (entry_id, locale_id) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, 'Included / excluded'
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN locales l ON lower(l.code) = 'en'
WHERE e.key = 'catalog.hub_price_inclusions'
ON CONFLICT (entry_id, locale_id) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
