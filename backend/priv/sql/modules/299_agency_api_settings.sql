-- 299_agency_api_settings.sql
-- Partner API: webhook ayarları + dakika başına istek sayacı (rate limit).

CREATE TABLE IF NOT EXISTS agency_api_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
  webhook_url TEXT,
  webhook_secret TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_api_usage (
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  minute_bucket TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, minute_bucket)
);

CREATE INDEX IF NOT EXISTS idx_agent_api_usage_bucket
  ON agent_api_usage (minute_bucket);

-- Eski sayaç satırlarını temizlemek için (isteğe bağlı cron yok; okuma sırasında yeterli).
CREATE OR REPLACE FUNCTION agent_api_usage_purge_old() RETURNS void AS $$
BEGIN
  DELETE FROM agent_api_usage WHERE minute_bucket < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql;
