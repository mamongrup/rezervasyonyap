-- 209 sonrası yüklenmiş veritabanları: yönetici metinlerinde ürün dışı atıf kaldırıldı (TR/EN güncelleme).

-- PostgreSQL: UPDATE hedef tablosu (tv) FROM zincirindeki JOIN koşullarında kullanılamaz;
-- locale eşlemesi WHERE içinde yapılır.
UPDATE translation_values AS tv
SET value = x.new_val, updated_at = now()
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN (
  SELECT * FROM (VALUES
    ('admin.overview_summary_tools_desc', 'tr', '— diller, katalog, SEO / denetim kısayolları.'),
    ('admin.overview_summary_tools_desc', 'en', '— languages, catalog, SEO / audit shortcuts.'),
    ('admin.tools_intro', 'tr', 'Operasyonel kısayollar: çeviri paketleri, vitrin menüsü, katalog, SEO ve denetim kayıtlarına hızlı erişim.'),
    ('admin.tools_intro', 'en', 'Operational shortcuts: quick access to translations, hero menu, catalog, SEO, and audit logs.'),
    ('admin.tools_card_i18n_desc', 'tr', 'Yerelleştirme paketleri ve arayüz metinleri (çeviri yönetimi).'),
    ('admin.tools_card_i18n_desc', 'en', 'Locale bundles and UI strings (translation management).'),
    ('admin.tools_cache_desc', 'tr', 'Tek tuşla tüm önbelleği silmek bu ortamda desteklenmiyor. Üretimde yeniden dağıtım, API yeniden başlatma veya CDN temizliği kullanın.'),
    ('admin.tools_cache_desc', 'en', 'A single “clear all caches” action is not available here. In production, use redeploy, API restart, or CDN purge.')
  ) AS t(key, loc, new_val)
) AS x ON e.key = x.key
JOIN locales l ON lower(l.code) = lower(x.loc)
WHERE tv.entry_id = e.id
  AND tv.locale_id = l.id;
