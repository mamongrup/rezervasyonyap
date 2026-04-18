-- MODÜL: sepet, rezervasyon, ödeme, cüzdan, şeffaf fiyat kırılımı
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  session_key TEXT,
  currency_code CHAR(3) NOT NULL REFERENCES currencies (code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings (id),
  quantity INT NOT NULL DEFAULT 1,
  starts_on DATE,
  ends_on DATE,
  flexible_dates BOOLEAN NOT NULL DEFAULT FALSE,
  unit_price NUMERIC(14, 2) NOT NULL,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  guest_email TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'held', 'confirmed', 'cancelled', 'completed')),
  price_breakdown_json JSONB NOT NULL DEFAULT '{}',
  pdf_offer_path TEXT,
  pdf_confirmation_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_listing ON reservations (listing_id);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL REFERENCES currencies (code),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_providers (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  config_secret_ref TEXT NOT NULL,
  display_name TEXT NOT NULL
);

INSERT INTO payment_providers (code, is_active, config_secret_ref, display_name) VALUES
  ('paytr', FALSE, 'vault:paytr', 'PayTR'),
  ('paratika', FALSE, 'vault:paratika', 'Paratika');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations (id) ON DELETE SET NULL,
  provider_id SMALLINT NOT NULL REFERENCES payment_providers (id),
  provider_ref TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies (code),
  installments SMALLINT,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'authorized', 'captured', 'failed', 'refunded')),
  raw_response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_reservation ON payments (reservation_id);
