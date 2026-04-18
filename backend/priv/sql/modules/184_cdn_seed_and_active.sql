-- CDN satırları (Bunny / Cloudflare) + tek aktif bağlantı

INSERT INTO
  cdn_connections (provider_code, is_active, config_secret_ref, pull_zone_url)
VALUES
  ('bunny', FALSE, 'vault:bunny', NULL),
  ('cloudflare', FALSE, 'vault:cloudflare', NULL)
ON CONFLICT (provider_code) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS cdn_connections_single_active ON cdn_connections ((1))
WHERE
  is_active;
