-- Pazar yetenekleri toplu migration:
-- A) Sepete kupon iliştirme
-- D) Anında onay (instant_book)
-- E) Mobil-özel fiyat (mobile_discount_percent)
-- G) Süper Ev Sahibi rozeti (organization_metrics + organizations.is_super_host)

-- ── A) Sepete iliştirilen kupon (sepet başına 1 kupon) ────────────────────
CREATE TABLE IF NOT EXISTS cart_coupons (
  cart_id UUID PRIMARY KEY REFERENCES carts (id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  -- Snapshot: kuponun uygulandığı andaki tip + değer (geçmişe yönelik tutarlılık).
  discount_type TEXT NOT NULL,
  discount_value NUMERIC(14, 4) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_coupons_coupon ON cart_coupons (coupon_id);

-- Rezervasyonda indirim snapshot'ı (kupon kayıtsız bile silinse rezervasyon korunur).
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons (id) ON DELETE SET NULL;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

-- ── D) Anında onay ─────────────────────────────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS instant_book BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_listings_instant_book
  ON listings (instant_book)
  WHERE instant_book = TRUE;

-- ── E) Mobil-özel fiyat indirimi (yüzde) ────────────────────────────────────
-- 0 = mobil indirim yok; >0 = mobil cihazda toplam fiyat üzerinden % indirim.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS mobile_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
  CHECK (mobile_discount_percent >= 0 AND mobile_discount_percent <= 50);

-- ── G) Süper Ev Sahibi rozeti ────────────────────────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_super_host BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS super_host_since TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_super_host
  ON organizations (is_super_host)
  WHERE is_super_host = TRUE;

-- Özetlenmiş ev sahibi metrikleri — periyodik (haftalık) job ile yenilenir.
-- Şimdilik admin elle de dolduruyor / set'liyor.
CREATE TABLE IF NOT EXISTS organization_metrics (
  organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
  avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  total_reviews INT NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,    -- iptal etmeden tamamlanan rezervasyon yüzdesi
  cancellation_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  response_time_hours INT NOT NULL DEFAULT 0,
  completed_bookings_12mo INT NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
