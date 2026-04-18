-- MODÜL: medya işleme (AVIF), CDN (Bunny, Cloudflare)
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL,
  owner_id UUID NOT NULL,
  original_storage_key TEXT NOT NULL,
  original_mime TEXT NOT NULL,
  avif_storage_key TEXT,
  width INT,
  height INT,
  byte_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_owner ON media_files (owner_type, owner_id);

CREATE TABLE cdn_connections (
  id SMALLSERIAL PRIMARY KEY,
  provider_code TEXT NOT NULL UNIQUE CHECK (provider_code IN ('bunny', 'cloudflare')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  config_secret_ref TEXT NOT NULL,
  pull_zone_url TEXT
);
