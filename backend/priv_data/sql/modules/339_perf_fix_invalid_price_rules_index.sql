-- MODÜL: performans düzeltme — geçersiz (INVALID) price_rules index onarımı + sıralama index'i
--
-- Kök neden: 335_perf_catalog_listings_indexes.sql, idx_listing_price_rules_listing'i
-- `CREATE INDEX CONCURRENTLY` ile kuruyor. CONCURRENTLY üretimde yarıda kesilirse
-- INVALID bir index bırakır; planner onu kullanmaz (Seq Scan), `IF NOT EXISTS` de
-- "zaten var" görüp yeniden kurmaz. Sonuç: vitrin liste sorgusunda satır başına
-- listing_price_rules (~16k satır) tam taranıyordu (EXPLAIN: ~53ms × 24 loop ≈ 1.3 sn).
--
-- Çözüm: index'i düşür ve CONCURRENTLY OLMADAN yeniden kur (küçük tablo, ms'ler;
-- kurulum sırasında geçerli (valid) olması garanti). Ardından ANALYZE.
DROP INDEX IF EXISTS idx_listing_price_rules_listing;
CREATE INDEX IF NOT EXISTS idx_listing_price_rules_listing
  ON listing_price_rules (listing_id);

-- page_ids hızlı yol: WHERE category_id + status ORDER BY created_at DESC LIMIT N.
-- Mevcut (category_id, status) index'i sıralamayı kapsamadığı için Parallel Seq Scan + Sort
-- oluşuyordu (EXPLAIN: ~158ms). Bu bileşik index taramayı index-only'e indirir.
CREATE INDEX IF NOT EXISTS idx_listings_cat_status_created
  ON listings (category_id, status, created_at DESC);

ANALYZE listing_price_rules;
ANALYZE listings;
