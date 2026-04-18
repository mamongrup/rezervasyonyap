-- Yönetici hub sekmeleri, Araçlar sayfası, özet giriş metinleri (manage namespace).

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('admin.hub_nav_overview'),
  ('admin.hub_nav_settings'),
  ('admin.hub_nav_tools'),
  ('admin.hub_nav_contracts'),
  ('admin.hub_nav_aria'),
  ('admin.overview_title'),
  ('admin.overview_intro_lead'),
  ('admin.overview_intro_after_settings'),
  ('admin.overview_intro_after_tools'),
  ('admin.overview_summary_settings'),
  ('admin.overview_summary_settings_desc'),
  ('admin.overview_summary_tools_desc'),
  ('admin.tools_title'),
  ('admin.tools_intro'),
  ('admin.tools_card_i18n_title'),
  ('admin.tools_card_i18n_desc'),
  ('admin.tools_card_hero_title'),
  ('admin.tools_card_hero_desc'),
  ('admin.tools_card_catalog_title'),
  ('admin.tools_card_catalog_desc'),
  ('admin.tools_card_seo_title'),
  ('admin.tools_card_seo_desc'),
  ('admin.tools_card_audit_title'),
  ('admin.tools_card_audit_desc'),
  ('admin.tools_open'),
  ('admin.tools_cache_title'),
  ('admin.tools_cache_desc')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN (
  SELECT * FROM (VALUES
    ('admin.hub_nav_overview', 'tr', 'Özet'),
    ('admin.hub_nav_overview', 'en', 'Overview'),
    ('admin.hub_nav_settings', 'tr', 'Ayarlar'),
    ('admin.hub_nav_settings', 'en', 'Settings'),
    ('admin.hub_nav_tools', 'tr', 'Araçlar'),
    ('admin.hub_nav_tools', 'en', 'Tools'),
    ('admin.hub_nav_contracts', 'tr', 'Kategori sözleşmeleri'),
    ('admin.hub_nav_contracts', 'en', 'Category contracts'),
    ('admin.hub_nav_aria', 'tr', 'Yönetici bölümleri'),
    ('admin.hub_nav_aria', 'en', 'Admin sections'),
    ('admin.overview_title', 'tr', 'Yönetici'),
    ('admin.overview_title', 'en', 'Administration'),
    ('admin.overview_intro_lead', 'tr', 'Üstteki sekmeler:'),
    ('admin.overview_intro_lead', 'en', 'Use the tabs above:'),
    ('admin.overview_intro_after_settings', 'tr', '(genel site, ödeme, kur, NetGSM…),'),
    ('admin.overview_intro_after_settings', 'en', '(site-wide, payments, FX, NetGSM…),'),
    ('admin.overview_intro_after_tools', 'tr', '(diller, katalog, SEO kısayolları). Bu sayfada içerik modülleri ve erişim yönetimi.'),
    ('admin.overview_intro_after_tools', 'en', '(languages, catalog, SEO shortcuts). On this page: content modules and access control.'),
    ('admin.overview_summary_settings', 'tr', 'Genel site ayarları'),
    ('admin.overview_summary_settings', 'en', 'General site settings'),
    ('admin.overview_summary_settings_desc', 'tr', '— ödeme, kur, NetGSM, SEO / sosyal / harita sekmeleri (ayrı sayfa)'),
    ('admin.overview_summary_settings_desc', 'en', '— payments, FX, NetGSM, SEO / social / map tabs (separate page)'),
    ('admin.overview_summary_tools_desc', 'tr', '— diller, katalog, SEO / denetim kısayolları.'),
    ('admin.overview_summary_tools_desc', 'en', '— languages, catalog, SEO / audit shortcuts.'),
    ('admin.tools_title', 'tr', 'Araçlar'),
    ('admin.tools_title', 'en', 'Tools'),
    ('admin.tools_intro', 'tr', 'Operasyonel kısayollar: çeviri paketleri, vitrin menüsü, katalog, SEO ve denetim kayıtlarına hızlı erişim.'),
    ('admin.tools_intro', 'en', 'Operational shortcuts: quick access to translations, hero menu, catalog, SEO, and audit logs.'),
    ('admin.tools_card_i18n_title', 'tr', 'Diller ve çeviriler'),
    ('admin.tools_card_i18n_title', 'en', 'Languages & translations'),
    ('admin.tools_card_i18n_desc', 'tr', 'Yerelleştirme paketleri ve arayüz metinleri (çeviri yönetimi).'),
    ('admin.tools_card_i18n_desc', 'en', 'Locale bundles and UI strings (translation management).'),
    ('admin.tools_card_hero_title', 'tr', 'Hero menü'),
    ('admin.tools_card_hero_title', 'en', 'Hero menu'),
    ('admin.tools_card_hero_desc', 'tr', 'Anasayfa üst vitrin menüsü.'),
    ('admin.tools_card_hero_desc', 'en', 'Homepage hero navigation and showcase.'),
    ('admin.tools_card_catalog_title', 'tr', 'Katalog'),
    ('admin.tools_card_catalog_title', 'en', 'Catalog'),
    ('admin.tools_card_catalog_desc', 'tr', 'Kategoriler, ilanlar, öznitelikler ve çeviriler.'),
    ('admin.tools_card_catalog_desc', 'en', 'Categories, listings, attributes and translations.'),
    ('admin.tools_card_seo_title', 'tr', 'SEO yönlendirme ve 404 günlüğü'),
    ('admin.tools_card_seo_title', 'en', 'SEO redirects & 404 log'),
    ('admin.tools_card_seo_desc', 'tr', 'Yönetici özet sayfasındaki SEO bölümünden yönlendirme ve 404 kayıtları.'),
    ('admin.tools_card_seo_desc', 'en', 'Redirects and not-found logs from the admin overview SEO section.'),
    ('admin.tools_card_audit_title', 'tr', 'Denetim günlüğü (erişim)'),
    ('admin.tools_card_audit_title', 'en', 'Audit log (access)'),
    ('admin.tools_card_audit_desc', 'tr', 'Rol atamaları ve izin değişiklikleri — yönetici özetinin altı.'),
    ('admin.tools_card_audit_desc', 'en', 'Role grants and permission changes — bottom of admin overview.'),
    ('admin.tools_open', 'tr', 'Aç →'),
    ('admin.tools_open', 'en', 'Open →'),
    ('admin.tools_cache_title', 'tr', 'Önbellek temizle'),
    ('admin.tools_cache_title', 'en', 'Clear cache'),
    ('admin.tools_cache_desc', 'tr', 'Tek tuşla tüm önbelleği silmek bu ortamda desteklenmiyor. Üretimde yeniden dağıtım, API yeniden başlatma veya CDN temizliği kullanın.'),
    ('admin.tools_cache_desc', 'en', 'A single “clear all caches” action is not available here. In production, use redeploy, API restart, or CDN purge.')
  ) AS t(key, loc, value)
) AS s ON s.key = e.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
