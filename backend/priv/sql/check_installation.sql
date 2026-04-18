-- Kurulum kontrolü — psql: \i priv/sql/check_installation.sql
-- veya: psql -U postgres -d travel -f priv/sql/check_installation.sql

\echo '=== 1) Temel tablolar (modül dosya adına yakın) ==='
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'locales',
    'translation_namespaces',
    'translation_entries',
    'translation_values',
    'localized_routes',
    'product_categories',
    'listings',
    'listing_translations',
    'listing_cruise_details',
    'listing_hajj_details',
    'listing_event_details',
    'listing_restaurant_table_details'
  )
ORDER BY table_name;

\echo ''
\echo '=== 2) Modül 196 — listings.listing_source ve product_categories sütunları ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'listings'
  AND column_name IN (
    'listing_source',
    'external_provider_code',
    'external_listing_ref',
    'last_synced_at'
  )
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'product_categories'
  AND column_name IN ('is_active', 'allows_manual_source', 'allows_api_source')
ORDER BY column_name;

\echo ''
\echo '=== 3) Modül 197 — manage namespace ve çeviri sayıları ==='
SELECT tn.code AS namespace, COUNT(DISTINCT te.id) AS entry_count, COUNT(tv.id) AS value_count
FROM translation_namespaces tn
LEFT JOIN translation_entries te ON te.namespace_id = tn.id
LEFT JOIN translation_values tv ON tv.entry_id = te.id
WHERE tn.code = 'manage'
GROUP BY tn.code;

\echo ''
\echo '=== 4) Modül 198 — localized_routes (blog / contact / legal) ==='
SELECT l.code AS locale, r.logical_key, r.path_segment
FROM localized_routes r
JOIN locales l ON l.id = r.locale_id
WHERE r.logical_key IN ('blog', 'contact', 'legal')
ORDER BY l.code, r.logical_key;

\echo ''
\echo '=== 5) Örnek: ürün kategorisi satır sayısı ve aktif olanlar ==='
SELECT
  COUNT(*) AS total_categories,
  COUNT(*) FILTER (WHERE COALESCE(is_active, TRUE)) AS active_categories
FROM product_categories;

\echo ''
\echo '=== 6) Örnek: ilan kaynak dağılımı (196 sonrası) ==='
SELECT listing_source, COUNT(*) AS n
FROM listings
GROUP BY listing_source
ORDER BY n DESC;

\echo ''
\echo 'Tamam. Eksik tablo/sütun veya 0 satır görürseniz ilgili modül SQL dosyasını çalıştırın (install_order.txt).'
