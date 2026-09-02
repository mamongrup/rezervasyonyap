-- MODÜL: Arama sorgusundaki lateral join'leri hızlandıran composite index'ler.
-- listing_attributes: 5 farklı lateral join (hotel_attr, hotel_theme_attr, hotel_acc_attr,
--   tour_attr, wtatil_snap, lm) her arama sorgusunda tetikleniyor.
-- Mevcut idx_listing_attributes_listing (listing_id) tek sütunlu — group_code ve key
-- filtresi için tarama yapıyor. Composite index ile index-only scan mümkün.

-- 1) listing_attributes: listing_id + group_code + key
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_attributes_lgk
  ON listing_attributes (listing_id, group_code, key);

-- 2) listing_meal_plans: vitrin lateral meal_vitrin için
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_meal_plans_active
  ON listing_meal_plans (listing_id, is_active)
  INCLUDE (price_per_night, plan_code, sort_order);

-- 3) listing_price_rules: price_rule lateral için (min/max nightly)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_price_rules_lid
  ON listing_price_rules (listing_id, valid_from, valid_to);

-- 4) reservation availability check —inventory_holds taramasını hızlandırır
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_holds_lid_status_dates
  ON inventory_holds (listing_id, status, starts_on, ends_on)
  WHERE status = 'active';

-- 5) reservation availability check —reservations taramasını hızlandırır
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_lid_status_dates
  ON reservations (listing_id, status, starts_on, ends_on)
  WHERE status IN ('held', 'confirmed');
