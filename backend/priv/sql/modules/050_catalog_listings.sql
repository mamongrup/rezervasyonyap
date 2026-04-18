-- MODÜL: katalog — tüm ürün kategorileri (tek polymorphic çekirdek)
CREATE TABLE product_categories (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_key TEXT NOT NULL,
  parent_id SMALLINT REFERENCES product_categories (id),
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO product_categories (code, name_key, parent_id, sort_order) VALUES
  ('holiday_home', 'cat.holiday_home', NULL, 10),
  ('yacht_charter', 'cat.yacht_charter', NULL, 20),
  ('car_rental', 'cat.car_rental', NULL, 30),
  ('transfer', 'cat.transfer', NULL, 40),
  ('ferry', 'cat.ferry', NULL, 50),
  ('hotel', 'cat.hotel', NULL, 60),
  ('flight', 'cat.flight', NULL, 70),
  ('tour', 'cat.tour', NULL, 80),
  ('activity', 'cat.activity', NULL, 90),
  ('cruise', 'cat.cruise', NULL, 100),
  ('visa', 'cat.visa', NULL, 110),
  ('cinema_ticket', 'cat.cinema_ticket', NULL, 120),
  ('beach_lounger', 'cat.beach_lounger', NULL, 130);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  category_id SMALLINT NOT NULL REFERENCES product_categories (id),
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  currency_code CHAR(3) NOT NULL REFERENCES currencies (code),
  commission_percent NUMERIC(6, 3),
  prepayment_amount NUMERIC(14, 2),
  prepayment_percent NUMERIC(5, 2),
  first_charge_amount NUMERIC(14, 2),
  share_to_social BOOLEAN NOT NULL DEFAULT FALSE,
  allow_ai_caption BOOLEAN NOT NULL DEFAULT FALSE,
  min_stay_nights INT,
  cleaning_fee_amount NUMERIC(14, 2),
  pool_size_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_listings_org_cat ON listings (organization_id, category_id);
CREATE INDEX idx_listings_status ON listings (status);

CREATE TABLE listing_translations (
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (listing_id, locale_id)
);

CREATE TABLE listing_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  group_code TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}',
  UNIQUE (listing_id, group_code, key)
);

CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL,
  original_mime TEXT,
  alt_text_key TEXT,
  editor_state_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_images_listing ON listing_images (listing_id, sort_order);

CREATE TABLE listing_price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  rule_json JSONB NOT NULL,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE listing_availability_calendar (
  id BIGSERIAL PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  day DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  price_override NUMERIC(14, 2),
  UNIQUE (listing_id, day)
);

CREATE TABLE listing_owner_contacts (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT
);
