-- Tatil evi (ve benzeri) kategoriler için vitrin "Tema" kodları — çok dilli etiketler.
-- İlan seçimi: listing_holiday_home_details.theme_codes (text[]) ile aynı kodlar kullanılır.

CREATE TABLE category_theme_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL,
  code TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_code, code)
);

CREATE INDEX idx_category_theme_items_cat ON category_theme_items (category_code, sort_order);

CREATE TABLE category_theme_item_translations (
  item_id UUID NOT NULL REFERENCES category_theme_items (id) ON DELETE CASCADE,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  PRIMARY KEY (item_id, locale_id)
);

-- Örnek temalar (holiday_home) — kodlar VerticalDetailsSection ile uyumlu
INSERT INTO category_theme_items (category_code, code, sort_order) VALUES
  ('holiday_home', 'sea_view', 10),
  ('holiday_home', 'beachfront', 20),
  ('holiday_home', 'conservative', 30),
  ('holiday_home', 'luxury', 40),
  ('holiday_home', 'honeymoon', 50),
  ('holiday_home', 'family', 60),
  ('holiday_home', 'nature', 70),
  ('holiday_home', 'historic', 80);

INSERT INTO category_theme_item_translations (item_id, locale_id, label)
SELECT i.id, lo.id,
  CASE i.code
    WHEN 'sea_view' THEN 'Deniz manzaralı'
    WHEN 'beachfront' THEN 'Denize sıfır'
    WHEN 'conservative' THEN 'Muhafazakar'
    WHEN 'luxury' THEN 'Lüks'
    WHEN 'honeymoon' THEN 'Balayı'
    WHEN 'family' THEN 'Aile'
    WHEN 'nature' THEN 'Doğa içinde'
    WHEN 'historic' THEN 'Tarihi / butik'
    ELSE i.code
  END
FROM category_theme_items i
CROSS JOIN locales lo
WHERE lo.code = 'tr';
