-- Dış kanal / manuel rezervasyon kayıtları (platform dışı satışlar — muhasebe & takip)
CREATE TABLE IF NOT EXISTS listing_external_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  stay_from DATE NOT NULL,
  stay_to DATE NOT NULL,
  source_label TEXT NOT NULL DEFAULT '',
  sold_total NUMERIC(14, 2),
  amount_received NUMERIC(14, 2),
  amount_remaining NUMERIC(14, 2),
  first_payment_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_external_bookings_dates_chk CHECK (stay_from <= stay_to)
);

CREATE INDEX IF NOT EXISTS idx_listing_external_bookings_listing
  ON listing_external_bookings (listing_id, stay_from DESC);
