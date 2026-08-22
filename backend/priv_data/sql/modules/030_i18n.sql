-- MODÜL: sınırsız dil / çeviri anahtarları
CREATE TABLE IF NOT EXISTS locales (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_rtl BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS translation_namespaces (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE
);

INSERT INTO translation_namespaces (code) VALUES
  ('ui'), ('email'), ('sms'), ('seo'), ('listing'), ('validation')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS translation_entries (
  id BIGSERIAL PRIMARY KEY,
  namespace_id SMALLINT NOT NULL REFERENCES translation_namespaces (id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  UNIQUE (namespace_id, key)
);

CREATE TABLE IF NOT EXISTS translation_values (
  id BIGSERIAL PRIMARY KEY,
  entry_id BIGINT NOT NULL REFERENCES translation_entries (id) ON DELETE CASCADE,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, locale_id)
);

CREATE INDEX IF NOT EXISTS idx_translation_values_locale ON translation_values (locale_id);

INSERT INTO locales (code, name, is_rtl) VALUES
  ('tr', 'Türkçe', FALSE),
  ('en', 'English', FALSE)
ON CONFLICT (code) DO NOTHING;
