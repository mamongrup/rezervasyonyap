-- MODÜL: performans — vitrin ilan listesi kritik index'leri
-- Sorun: catalog/public/listings sorgusu 2000+ otel için 4+ sn sürüyor.
-- Bu iki index sorguyu ~10x hızlandırır.

-- 1. Kategori + durum bileşik index (ana filtre: WHERE status='published' AND category_id=N)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_cat_status
  ON listings (category_id, status);

-- 2. Fiyat kuralı listing_id index (lateral join her satır için full-scan yapıyor)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_price_rules_listing
  ON listing_price_rules (listing_id);

-- 3. listing_images lateral join (görseller için satır başı tarama)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_images_listing_sort
  ON listing_images (listing_id, sort_order, created_at);
