-- MODÜL: Kategori sözleşme havuzu, ilan bağlantısı, rezervasyonda kabul kanıtı
-- Önkoşul: 050_catalog_listings, 030_i18n, 060_booking_commerce

CREATE TABLE category_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id SMALLINT NOT NULL REFERENCES product_categories (id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_category_contracts_platform ON category_contracts (category_id, code)
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX uq_category_contracts_org ON category_contracts (organization_id, category_id, code)
  WHERE organization_id IS NOT NULL;

CREATE TABLE category_contract_translations (
  contract_id UUID NOT NULL REFERENCES category_contracts (id) ON DELETE CASCADE,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  PRIMARY KEY (contract_id, locale_id)
);

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS category_contract_id UUID REFERENCES category_contracts (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_listings_category_contract ON listings (category_contract_id)
  WHERE category_contract_id IS NOT NULL;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS contract_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_snapshots_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON TABLE category_contracts IS 'Per-category contract templates; organization_id NULL = platform-wide pool.';
COMMENT ON COLUMN listings.category_contract_id IS 'Exactly one active contract from this listing category pool.';
COMMENT ON COLUMN reservations.contract_snapshots_json IS 'Snapshot at checkout: locale, lines[{listing_id, contract_id, version, title, body}].';

-- Örnek havuz (holiday_home) — checkout denemesi için; üretimde panelden güncellenir.
INSERT INTO category_contracts (category_id, organization_id, code, version, is_active, sort_order)
SELECT pc.id, NULL, 'default', 1, TRUE, 0
FROM product_categories pc
WHERE pc.code = 'holiday_home'
  AND NOT EXISTS (
    SELECT 1 FROM category_contracts x
    WHERE x.category_id = pc.id AND x.organization_id IS NULL AND x.code = 'default'
  );

INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  'Örnek kiralama sözleşmesi',
  E'Bu metin örnektir. Yönetim panelinden «Kategori sözleşmeleri» bölümünden güncelleyin.\n\n'
  || E'1. Taraflar ve konu\n2. Ödeme ve iptal\n3. Sorumluluklar\n'
FROM category_contracts cc
JOIN product_categories pc ON pc.id = cc.category_id AND pc.code = 'holiday_home'
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.code = 'default' AND loc.code = 'tr'
  AND NOT EXISTS (
    SELECT 1 FROM category_contract_translations t
    WHERE t.contract_id = cc.id AND t.locale_id = loc.id
  );
