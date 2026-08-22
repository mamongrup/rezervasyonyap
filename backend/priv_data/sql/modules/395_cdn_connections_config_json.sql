-- CDN panel config_json (Bunny / Cloudflare R2 alanları).
-- media_http.get_cdn_all / update_cdn_config bu sütunu okur/yazar.

ALTER TABLE cdn_connections
  ADD COLUMN IF NOT EXISTS config_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN cdn_connections.config_json IS
  'Sağlayıcıya özel alanlar (storage zone, API key, R2 keys, vb.) — panel CDN ayarları';
