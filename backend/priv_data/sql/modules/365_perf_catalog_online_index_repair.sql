-- MODÜL: canlı vitrin performans onarımı (online / bağlantı kopmasına dayanıklı)
--
-- Önceki indeksler yarıda kesildiğinde PostgreSQL onları INVALID bırakabilir.
-- Yeni isimlerle CONCURRENTLY oluşturmak; ziyaretçi trafiğini kilitlemeden planner'a
-- geçerli alternatifler verir. Bu dosya transaction içinde çalıştırılmamalıdır.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_price_rules_listing_online
  ON listing_price_rules (listing_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_images_listing_sort_online
  ON listing_images (listing_id, sort_order, created_at);

-- Yayındaki, fiyatı bulunan kategoriler için varsayılan vitrin sayfalama yolu.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_public_catalog_online
  ON listings (category_id, created_at DESC)
  WHERE status = 'published'
    AND coalesce(vitrin_price, first_charge_amount, 0) > 0;

ANALYZE listings;
ANALYZE listing_images;
ANALYZE listing_price_rules;
