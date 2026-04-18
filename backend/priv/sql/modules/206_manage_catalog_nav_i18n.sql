-- MODÜL: Katalog sidebar alt menü + öznitelik rehberi çevirileri; hub notlarını günceller.
-- Önkoşul: 197_manage_panel_i18n.sql

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('catalog.sidebar_expand'),
  ('catalog.sidebar_collapse'),
  ('catalog.sidebar_sub_summary'),
  ('catalog.attributes_intro'),
  ('catalog.attributes_core_title'),
  ('catalog.attributes_vertical_title'),
  ('catalog.attributes_vertical_fallback'),
  ('catalog.attributes_vertical_no_fields'),
  ('catalog.attributes_eav_title'),
  ('catalog.attributes_eav_body'),
  ('catalog.attributes_listing_hint')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM (VALUES
  ('catalog.sidebar_expand', 'tr', 'Alt menüyü aç'),
  ('catalog.sidebar_expand', 'en', 'Expand submenu'),
  ('catalog.sidebar_collapse', 'tr', 'Alt menüyü kapat'),
  ('catalog.sidebar_collapse', 'en', 'Collapse submenu'),
  ('catalog.sidebar_sub_summary', 'tr', 'Kategori özeti'),
  ('catalog.sidebar_sub_summary', 'en', 'Category hub'),
  ('catalog.attributes_intro', 'tr', 'Bu sayfa veritabanı şemasına göre salt okunur rehberdir. Öznitelik değerleri ilan kaydı üzerinden yönetilir; aşağıdaki bağlantılarla ilan listesine gidebilirsiniz.'),
  ('catalog.attributes_intro', 'en', 'This page is a read-only guide aligned with the database schema. Attribute values are managed per listing; use the links below to open listings.'),
  ('catalog.attributes_core_title', 'tr', 'Ortak çekirdek (listings + çeviriler)'),
  ('catalog.attributes_core_title', 'en', 'Shared core (listings + translations)'),
  ('catalog.attributes_vertical_title', 'tr', 'Bu kategorinin detay tablosu'),
  ('catalog.attributes_vertical_title', 'en', 'Category detail table'),
  ('catalog.attributes_vertical_fallback', 'tr', '(şemada ayrı detay tablosu tanımı yok — çekirdek + listing_attributes kullanın)'),
  ('catalog.attributes_vertical_fallback', 'en', '(no dedicated detail table in schema — use core + listing_attributes)'),
  ('catalog.attributes_vertical_no_fields', 'tr', 'Bu kategori için panelde alan listesi henüz tanımlı değil; veritabanı modülüne bakın.'),
  ('catalog.attributes_vertical_no_fields', 'en', 'No field list in the panel for this category yet; see the database module.'),
  ('catalog.attributes_eav_title', 'tr', 'Esnek anahtar–değer (listing_attributes)'),
  ('catalog.attributes_eav_title', 'en', 'Flexible key–value (listing_attributes)'),
  ('catalog.attributes_eav_body', 'tr', 'group_code, key ve value_json ile ilan başına ek alanlar. API / panel formu eklendiğinde buradan düzenlenebilir.'),
  ('catalog.attributes_eav_body', 'en', 'Per-listing extras via group_code, key and value_json. Editable once API or panel forms are wired.'),
  ('catalog.attributes_listing_hint', 'tr', 'Gerçek veri girişi için ilgili kategorideki ilanları açın; dikey alanlar ilan oluşturma / düzenleme akışına bağlanacaktır.'),
  ('catalog.attributes_listing_hint', 'en', 'Open listings in this category to enter data; vertical fields will hook into create/edit flows.')
) AS s(entry_key, loc, value)
JOIN translation_entries e ON e.key = s.entry_key
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN locales l ON lower(l.code) = lower(s.loc)
WHERE NOT EXISTS (
  SELECT 1 FROM translation_values tv0
  WHERE tv0.entry_id = e.id AND tv0.locale_id = l.id
);

-- hub kart notları (197’deki metinleri netleştirir)
UPDATE translation_values tv
SET value = x.new_v
FROM (VALUES
  ('catalog.hub_note_list', 'tr', 'Liste, arama ve ilan durumu.'),
  ('catalog.hub_note_list', 'en', 'List, search and listing status.'),
  ('catalog.hub_note_new', 'tr', 'Yeni taslak ilan formu.'),
  ('catalog.hub_note_new', 'en', 'New draft listing form.'),
  ('catalog.hub_note_attr', 'tr', 'Çekirdek + kategori tablosu alan rehberi (salt okunur).'),
  ('catalog.hub_note_attr', 'en', 'Core + category table field guide (read-only).')
) AS x(k, loc, new_v),
translation_entries e,
translation_namespaces n,
locales l
WHERE tv.entry_id = e.id
  AND n.id = e.namespace_id
  AND n.code = 'manage'
  AND l.id = tv.locale_id
  AND e.key = x.k
  AND lower(l.code) = lower(x.loc);
