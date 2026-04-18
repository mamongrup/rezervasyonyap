-- MODÜL: Sözleşme kapsamı — genel, satış, kategori (ilan yalnızca kategori kapsamına bağlanır)
-- Önkoşul: 204_category_contracts.sql

ALTER TABLE category_contracts
  ADD COLUMN IF NOT EXISTS contract_scope TEXT NOT NULL DEFAULT 'category';

UPDATE category_contracts
SET contract_scope = 'category'
WHERE contract_scope IS NULL OR btrim(contract_scope) = '';

ALTER TABLE category_contracts
  DROP CONSTRAINT IF EXISTS category_contracts_scope_category_ck;

ALTER TABLE category_contracts
  ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE category_contracts
  ADD CONSTRAINT category_contracts_scope_category_ck CHECK (
    (contract_scope = 'category' AND category_id IS NOT NULL)
    OR (contract_scope IN ('general', 'sales') AND category_id IS NULL)
  );

ALTER TABLE category_contracts
  DROP CONSTRAINT IF EXISTS category_contracts_scope_check;

ALTER TABLE category_contracts
  ADD CONSTRAINT category_contracts_scope_check
  CHECK (contract_scope IN ('general', 'sales', 'category'));

COMMENT ON COLUMN category_contracts.contract_scope IS 'general = site geneli; sales = satış koşulları; category = ürün kategorisi havuzu (ilan FK).';

DROP INDEX IF EXISTS uq_category_contracts_platform;
DROP INDEX IF EXISTS uq_category_contracts_org;

CREATE UNIQUE INDEX uq_cc_category_platform ON category_contracts (category_id, code)
  WHERE organization_id IS NULL AND contract_scope = 'category';

CREATE UNIQUE INDEX uq_cc_category_org ON category_contracts (organization_id, category_id, code)
  WHERE organization_id IS NOT NULL AND contract_scope = 'category';

CREATE UNIQUE INDEX uq_cc_general_platform ON category_contracts (code)
  WHERE organization_id IS NULL AND contract_scope = 'general';

CREATE UNIQUE INDEX uq_cc_sales_platform ON category_contracts (code)
  WHERE organization_id IS NULL AND contract_scope = 'sales';

CREATE UNIQUE INDEX uq_cc_general_org ON category_contracts (organization_id, code)
  WHERE organization_id IS NOT NULL AND contract_scope = 'general';

CREATE UNIQUE INDEX uq_cc_sales_org ON category_contracts (organization_id, code)
  WHERE organization_id IS NOT NULL AND contract_scope = 'sales';

CREATE OR REPLACE FUNCTION fn_listing_category_contract_must_be_category_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_contract_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM category_contracts c
      WHERE c.id = NEW.category_contract_id AND c.contract_scope = 'category'
    ) THEN
      RAISE EXCEPTION 'listing.category_contract_id must reference contract_scope = category';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listing_category_contract_scope ON listings;
CREATE TRIGGER trg_listing_category_contract_scope
  BEFORE INSERT OR UPDATE OF category_contract_id ON listings
  FOR EACH ROW
  EXECUTE PROCEDURE fn_listing_category_contract_must_be_category_scope();
