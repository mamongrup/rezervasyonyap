-- Kategori bazında fiyata dahil / hariç kalemleri — çok dilli etiketler; ilan seçimi junction tablosu
CREATE TABLE IF NOT EXISTS category_price_line_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  category_code    TEXT        NOT NULL,
  scope            TEXT        NOT NULL CHECK (scope IN ('included', 'excluded')),
  code             TEXT        NOT NULL,
  sort_order       INT         NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category_code, scope, code)
);

CREATE INDEX IF NOT EXISTS idx_cpli_org_cat ON category_price_line_items (organization_id, category_code, sort_order);

CREATE TABLE IF NOT EXISTS category_price_line_item_translations (
  item_id   UUID     NOT NULL REFERENCES category_price_line_items (id) ON DELETE CASCADE,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  label     TEXT     NOT NULL,
  PRIMARY KEY (item_id, locale_id)
);

CREATE TABLE IF NOT EXISTS listing_price_line_selections (
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES category_price_line_items (id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_lpls_item ON listing_price_line_selections (item_id);

-- API ile uyum: şemada eksikse `label`/`name` sütunları (213 ile tam eşleşmeyen kurulumlar için)
ALTER TABLE listing_attribute_groups ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE listing_attribute_defs ADD COLUMN IF NOT EXISTS label TEXT;
