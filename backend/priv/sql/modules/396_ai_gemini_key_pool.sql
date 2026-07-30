-- Gemini (AI Studio) sağlayıcı + çoklu API anahtar havuzu (kota bitince sıradaki key).
INSERT INTO ai_providers (code, display_name, default_model, config_secret_ref, is_active)
VALUES ('gemini', 'Google Gemini (AI Studio)', 'gemini-2.0-flash', 'vault:gemini', TRUE)
ON CONFLICT (code) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  default_model = COALESCE(NULLIF(trim(ai_providers.default_model), ''), EXCLUDED.default_model);

-- DeepSeek silinmez; yalnızca is_active ile pasife alınabilir (panel butonu).
-- Mevcut deepseek satırına dokunma.

CREATE TABLE IF NOT EXISTS ai_api_key_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL REFERENCES ai_providers (code) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  exhausted_until TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_api_key_slots_key_nonempty CHECK (length(trim(api_key)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_api_key_slots_pick
  ON ai_api_key_slots (provider_code, is_enabled, sort_order, created_at)
  WHERE is_enabled = TRUE;
