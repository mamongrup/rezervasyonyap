-- MODÜL: Katalog — tatil evi hub / yan menü metinleri (tip & tema sayfaları).
-- Önkoşul: 197_manage_panel_i18n.sql, 246_manage_panel_i18n_de_ru_zh_fr.sql (locales)

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('catalog.hub_holiday_home_property_types'),
  ('catalog.hub_holiday_home_theme_presets'),
  ('catalog.hub_note_holiday_home_property_types'),
  ('catalog.hub_note_holiday_home_theme_presets')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM (VALUES
  ('catalog.hub_holiday_home_property_types', 'tr', 'Tatil evi tipi'),
  ('catalog.hub_holiday_home_property_types', 'en', 'Holiday home type'),
  ('catalog.hub_holiday_home_theme_presets', 'tr', 'Tatil evi teması'),
  ('catalog.hub_holiday_home_theme_presets', 'en', 'Holiday home theme'),
  ('catalog.hub_note_holiday_home_property_types', 'tr', 'İlan formunda «tip» açılır listesi — site ayarı JSON.'),
  ('catalog.hub_note_holiday_home_property_types', 'en', 'Listing form «type» dropdown — site setting JSON.'),
  ('catalog.hub_note_holiday_home_theme_presets', 'tr', 'Çip kodları ve vitrin tema kayıtları özeti.'),
  ('catalog.hub_note_holiday_home_theme_presets', 'en', 'Chip codes and public theme records summary.')
) AS s(entry_key, loc, value)
JOIN translation_entries e ON e.key = s.entry_key
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN locales l ON lower(l.code) = lower(s.loc)
WHERE NOT EXISTS (
  SELECT 1 FROM translation_values tv0
  WHERE tv0.entry_id = e.id AND tv0.locale_id = l.id
);

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN (
  SELECT * FROM (VALUES
    ('catalog.hub_holiday_home_property_types', 'de', 'Ferienhaus-Typ'),
    ('catalog.hub_holiday_home_property_types', 'ru', 'Тип дома отдыха'),
    ('catalog.hub_holiday_home_property_types', 'zh', '度假屋类型'),
    ('catalog.hub_holiday_home_property_types', 'fr', 'Type de maison de vacances'),

    ('catalog.hub_holiday_home_theme_presets', 'de', 'Ferienhaus-Thema'),
    ('catalog.hub_holiday_home_theme_presets', 'ru', 'Тема дома отдыха'),
    ('catalog.hub_holiday_home_theme_presets', 'zh', '度假屋主题'),
    ('catalog.hub_holiday_home_theme_presets', 'fr', 'Thème maison de vacances'),

    ('catalog.hub_note_holiday_home_property_types', 'de', 'Dropdown „Typ“ im Angebotsformular — Site-Einstellung JSON.'),
    ('catalog.hub_note_holiday_home_property_types', 'ru', 'Выпадающий список «тип» в форме объявления — JSON настройки сайта.'),
    ('catalog.hub_note_holiday_home_property_types', 'zh', '房源表单「类型」下拉 — 站点设置 JSON。'),
    ('catalog.hub_note_holiday_home_property_types', 'fr', 'Liste déroulante « type » du formulaire d''annonce — JSON des paramètres du site.'),

    ('catalog.hub_note_holiday_home_theme_presets', 'de', 'Chip-Codes und Übersicht öffentlicher Themeneinträge.'),
    ('catalog.hub_note_holiday_home_theme_presets', 'ru', 'Коды чипов и сводка записей тем витрины.'),
    ('catalog.hub_note_holiday_home_theme_presets', 'zh', '标签代码与前台主题记录摘要。'),
    ('catalog.hub_note_holiday_home_theme_presets', 'fr', 'Codes des puces et résumé des enregistrements de thème vitrine.')
  ) AS t(key, loc, value)
) AS s ON s.key = e.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
