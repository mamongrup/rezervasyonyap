-- MODÜL: index temizliği ve ek performans index'leri
-- 335 ile eklenen idx_listing_images_listing_sort zaten (listing_id, sort_order, created_at) kapsar;
-- daha dar olan idx_listing_images_listing gereksiz yere planner'ı karıştırır.

-- 1. Tekrarlı/gereksiz index kaldır
DROP INDEX IF EXISTS idx_listing_images_listing;

-- 2. listing_attributes: listing_id aramaları (vitrin, panel) için partial/covering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_attributes_listing
  ON listing_attributes (listing_id);

-- 3. listing_availability_calendar: day_status filtreli erişimler için partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_avail_cal_day_status
  ON listing_availability_calendar (listing_id, day, day_status)
  WHERE day_status IS NOT NULL;

-- 4. listing_translations: locale bazlı toplu çekimler için
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_translations_locale
  ON listing_translations (locale_id);
