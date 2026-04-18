-- MODÜL: sınırsız para birimi + merkez bankası kuru
CREATE TABLE currencies (
  id SMALLSERIAL PRIMARY KEY,
  code CHAR(3) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT,
  decimal_places SMALLINT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE currency_rates (
  id BIGSERIAL PRIMARY KEY,
  base_code CHAR(3) NOT NULL REFERENCES currencies (code),
  quote_code CHAR(3) NOT NULL REFERENCES currencies (code),
  rate NUMERIC(18, 8) NOT NULL,
  source TEXT NOT NULL DEFAULT 'central_bank',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_code, quote_code, fetched_at)
);

CREATE INDEX idx_currency_rates_pair ON currency_rates (base_code, quote_code);

INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('TRY', 'Turkish Lira', '₺', 2),
  ('EUR', 'Euro', '€', 2),
  ('USD', 'US Dollar', '$', 2)
ON CONFLICT (code) DO NOTHING;
