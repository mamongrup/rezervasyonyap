-- Kampanya & paket tatil isimleri için çoklu dil desteği.
-- JSONB alan: { "tr": "Yaz Kampanyası", "en": "Summer Campaign", ... }
-- Vitrin tarafı aktif locale'i dener; yoksa `name` (TR varsayılan) kolonuna düşer.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS name_translations JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE holiday_packages
  ADD COLUMN IF NOT EXISTS name_translations JSONB NOT NULL DEFAULT '{}'::jsonb;
