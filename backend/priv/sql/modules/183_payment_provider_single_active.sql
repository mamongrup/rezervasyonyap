-- Aynı anda yalnızca bir sanal POS aktif olsun (panel: PayTR / Paratika seçimi).

CREATE UNIQUE INDEX IF NOT EXISTS payment_providers_single_active ON payment_providers ((1))
WHERE
  is_active;
