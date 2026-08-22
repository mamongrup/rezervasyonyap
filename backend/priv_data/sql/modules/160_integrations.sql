-- MODÜL: dış API ve ödeme/sosyal entegrasyon katmanı
CREATE TABLE IF NOT EXISTS integration_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL,
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  config_secret_ref TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  extra_json JSONB NOT NULL DEFAULT '{}',
  UNIQUE (provider_code, organization_id)
);

COMMENT ON TABLE integration_accounts IS 'wtatil, yolcu360, turna, instagram_graph, google_merchant, google_analytics, google_maps, paytr, paratika, bunny, cloudflare';

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  integration_account_id UUID NOT NULL REFERENCES integration_accounts (id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  detail_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS google_merchant_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  merchant_product_id TEXT,
  last_push_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS whatsapp_order_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  cart_id UUID REFERENCES carts (id) ON DELETE SET NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
