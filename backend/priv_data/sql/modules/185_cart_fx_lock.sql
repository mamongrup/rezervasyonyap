-- G2.1 — Sepet kur kilidi: checkout sırasında gösterim / denetim için TCMB (currency_rates) anlık kopyası
ALTER TABLE carts ADD COLUMN IF NOT EXISTS fx_locked_at TIMESTAMPTZ;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS fx_snapshot_json JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN carts.fx_locked_at IS 'Kur anlık görüntüsünün alındığı zaman (sepet oluşturulurken)';
COMMENT ON COLUMN carts.fx_snapshot_json IS 'policy, quote_currency (TRY), rates_to_try: { "EUR": 38.1, "TRY": 1 }, locked_at';
