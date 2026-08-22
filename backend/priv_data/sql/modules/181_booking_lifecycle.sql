-- MODÜL: rezervasyon yaşam döngüsü — misafir kodu, satır kalemleri, envanter hold, audit
-- Önkoşul: 060_booking_commerce.sql

-- Misafir / API ile arama için kısa kod + sepet köprüsü
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS public_code TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS source_cart_id UUID REFERENCES carts (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION fn_set_reservation_public_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_code IS NULL OR TRIM(NEW.public_code) = '' THEN
    NEW.public_code := 'RSV-' || UPPER(SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 12));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservation_public_code ON reservations;
CREATE TRIGGER trg_reservation_public_code
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE PROCEDURE fn_set_reservation_public_code();

UPDATE reservations
SET public_code = 'RSV-' || UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 12))
WHERE public_code IS NULL OR TRIM(public_code) = '';

ALTER TABLE reservations ALTER COLUMN public_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_public_code ON reservations (public_code);

-- Çoklu kalem (satır bazlı snapshot)
CREATE TABLE IF NOT EXISTS reservation_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
  line_no SMALLINT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  starts_on DATE,
  ends_on DATE,
  unit_price NUMERIC(14, 2) NOT NULL,
  line_total NUMERIC(14, 2) NOT NULL,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  meta_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_reservation_line_items_res ON reservation_line_items (reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_line_items_listing ON reservation_line_items (listing_id);

-- Ödeme öncesi geçici kontenjan (çakışmayı azaltır)
CREATE TABLE IF NOT EXISTS inventory_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  cart_id UUID REFERENCES carts (id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'converted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_inventory_holds_active ON inventory_holds (listing_id, starts_on, ends_on)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_holds_expires ON inventory_holds (expires_at) WHERE status = 'active';

-- Durum geçişleri ve entegrasyon günlüğü
CREATE TABLE IF NOT EXISTS reservation_events (
  id BIGSERIAL PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_events_res ON reservation_events (reservation_id, created_at DESC);

-- Eski tek-listing rezervasyonları için tek satır üret (idempotent)
INSERT INTO reservation_line_items (
  reservation_id, listing_id, line_no, quantity, starts_on, ends_on,
  unit_price, line_total, tax_amount, fee_amount, meta_json
)
SELECT
  r.id,
  r.listing_id,
  1,
  1,
  r.starts_on,
  r.ends_on,
  COALESCE(
    NULLIF((r.price_breakdown_json->>'line_total')::NUMERIC, NULL),
    NULLIF((r.price_breakdown_json->>'total')::NUMERIC, NULL),
    NULLIF((r.price_breakdown_json->>'subtotal')::NUMERIC, NULL),
    0
  ),
  COALESCE(
    NULLIF((r.price_breakdown_json->>'total')::NUMERIC, NULL),
    NULLIF((r.price_breakdown_json->>'line_total')::NUMERIC, NULL),
    NULLIF((r.price_breakdown_json->>'subtotal')::NUMERIC, NULL),
    0
  ),
  0,
  0,
  '{}'::JSONB
FROM reservations r
WHERE NOT EXISTS (
  SELECT 1 FROM reservation_line_items li WHERE li.reservation_id = r.id
);
