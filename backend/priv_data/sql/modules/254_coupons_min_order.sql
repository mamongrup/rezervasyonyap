-- Faz G+: Kupon minimum sepet tutarı + uygulanabilir kategori filtresi.
-- Booking/Etstur paritesi: "₺2000+ alışverişe geçerli" + "Yalnızca otel ürünlerine".

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS min_order_currency CHAR(3);

-- Kupon belirtilen kategori kodlarındaki ilanlara uygulanır. Boş array = tüm kategoriler.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS allowed_category_codes TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_coupons_allowed_categories
  ON coupons USING GIN (allowed_category_codes);
