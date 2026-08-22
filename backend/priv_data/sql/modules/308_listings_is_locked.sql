-- 308_listings_is_locked.sql
-- İlanın yanlışlıkla draft/arşiv'e alınmasını önlemek için kilit bayrağı.
-- is_locked = true iken PATCH basics aracılığıyla status 'draft' veya 'archived'
-- yapılamaz; unlock için aynı istekte is_locked: false gönderilmesi gerekir.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN listings.is_locked IS
  'true ise API ile status draft/archived yapılamaz (kilitli ilan koruması)';
