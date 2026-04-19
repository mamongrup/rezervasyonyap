-- Kuponlara müşteriye gösterilebilir başlık/açıklama + çoklu dil ekle.
-- code (mevcut) → uygulanan kod; name → vitrin başlığı; description → kısa anlatım.
-- *_translations JSONB: { "tr": "...", "en": "...", "de": "...", ... }

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS name_translations JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS description_translations JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Vitrin/şerit gösteriminde "yalnızca aktif" filtre kolaylığı için.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_coupons_public_active
  ON coupons (is_public)
  WHERE is_public = TRUE;
