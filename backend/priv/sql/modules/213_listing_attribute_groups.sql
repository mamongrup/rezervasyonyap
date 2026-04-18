-- Öznitelik grubu ve tanımları (EAV şeması için metadata katmanı)
-- Mevcut listing_attributes(listing_id, group_code, key, value_json) değerleri bu tanımlara bağlanır.

-- ─── Öznitelik Grupları ──────────────────────────────────────────────────────
CREATE TABLE listing_attribute_groups (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  code            TEXT        NOT NULL,
  category_codes  TEXT[]      NOT NULL DEFAULT '{}',  -- Boş = tüm kategoriler
  sort_order      INT         NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX idx_lag_org_active ON listing_attribute_groups (organization_id, is_active);

-- ─── Grup Çevirileri ─────────────────────────────────────────────────────────
CREATE TABLE listing_attribute_group_translations (
  group_id  UUID      NOT NULL REFERENCES listing_attribute_groups(id) ON DELETE CASCADE,
  locale_id SMALLINT  NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  name      TEXT      NOT NULL,
  PRIMARY KEY (group_id, locale_id)
);

-- ─── Öznitelik Tanımları ─────────────────────────────────────────────────────
CREATE TABLE listing_attribute_defs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES listing_attribute_groups(id) ON DELETE CASCADE,
  code        TEXT        NOT NULL,
  field_type  TEXT        NOT NULL DEFAULT 'text'
                          CHECK (field_type IN ('text','number','boolean','select','multiselect')),
  options_json JSONB,     -- select/multiselect için: ["Evet","Hayır"] ya da [{"value":"v","label":"l"}]
  sort_order  INT         NOT NULL DEFAULT 0,
  is_required BOOLEAN     NOT NULL DEFAULT false,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, code)
);

CREATE INDEX idx_lad_group_active ON listing_attribute_defs (group_id, is_active, sort_order);

-- ─── Öznitelik Tanım Çevirileri ──────────────────────────────────────────────
CREATE TABLE listing_attribute_def_translations (
  def_id    UUID      NOT NULL REFERENCES listing_attribute_defs(id) ON DELETE CASCADE,
  locale_id SMALLINT  NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  label     TEXT      NOT NULL,
  PRIMARY KEY (def_id, locale_id)
);
