-- MODÜL: Katalog — tatil evi SSS hub menü metinleri (277 ile aynı kalıp).
-- Önkoşul: 197_manage_panel_i18n.sql, 246_manage_panel_i18n_de_ru_zh_fr.sql

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('catalog.hub_holiday_home_faq'),
  ('catalog.hub_note_holiday_home_faq')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM (VALUES
  ('catalog.hub_holiday_home_faq', 'tr', 'SSS şablonu'),
  ('catalog.hub_holiday_home_faq', 'en', 'FAQ template'),
  ('catalog.hub_note_holiday_home_faq', 'tr', 'Vitrin tatil evi SSS varsayılanı — site ayarı JSON; ilan overlay ile birleşir.'),
  ('catalog.hub_note_holiday_home_faq', 'en', 'Public holiday-home FAQ default — site setting JSON; merged with per-listing overlay.')
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
    ('catalog.hub_holiday_home_faq', 'de', 'FAQ-Vorlage'),
    ('catalog.hub_holiday_home_faq', 'ru', 'Шаблон FAQ'),
    ('catalog.hub_holiday_home_faq', 'zh', '常见问题模板'),
    ('catalog.hub_holiday_home_faq', 'fr', 'Modèle FAQ'),

    ('catalog.hub_note_holiday_home_faq', 'de', 'Öffentliche Ferienhaus-FAQ — Site-Einstellung JSON; mit Angebots-Overlay zusammengeführt.'),
    ('catalog.hub_note_holiday_home_faq', 'ru', 'Публичный FAQ домов отдыха — JSON настройки; объединяется с overlay объявления.'),
    ('catalog.hub_note_holiday_home_faq', 'zh', '前台度假屋常见问题默认 — 站点 JSON；与房源 overlay 合并。'),
    ('catalog.hub_note_holiday_home_faq', 'fr', 'FAQ vitrine maison de vacances — JSON paramètre site ; fusion avec overlay annonce.')
  ) AS t(key, loc, value)
) AS s ON s.key = e.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
