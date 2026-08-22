-- MODÜL: performans düzeltme — geçersiz (INVALID) idx_listings_cat_status onarımı
--
-- Kök neden: 335_perf_catalog_listings_indexes.sql, idx_listings_cat_status'ı
-- `CREATE INDEX CONCURRENTLY` ile kuruyor. CONCURRENTLY üretimde yarıda kesilirse
-- INVALID bir index bırakır; planner onu kullanmaz (Seq Scan riski), `IF NOT EXISTS`
-- de "zaten var" görüp onarmaz (bkz. 55-prod-incident-runbook.mdc §3).
--
-- Bu index zaten fazlalık: (category_id, status) önekini
-- idx_listings_cat_status_created (339) VE idx_listings_cat_status_vitrin (341)
-- kapsıyor — ikisi de aynı iki sütunla başlayıp ek sütun taşıyor. Bu yüzden
-- yeniden kurmak yerine geçersiz index'i düşürmek yeterli; sorgu planlayıcısı
-- zaten geçerli olan kapsayan index'leri kullanır.
DROP INDEX IF EXISTS idx_listings_cat_status;

ANALYZE listings;
