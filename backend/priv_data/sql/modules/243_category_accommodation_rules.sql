-- Kategori bazlı konaklama kuralları (giriş/çıkış saatleri hariç — vitrinde ayrı gösterilir)
-- rules_json: [{"id":"uuid","severity":"ok"|"warn","labels":{"tr":"...","en":"..."}}]
CREATE TABLE IF NOT EXISTS category_accommodation_rule_sets (
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  category_code   TEXT NOT NULL,
  rules_json      JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, category_code)
);

CREATE INDEX IF NOT EXISTS idx_cat_acc_rules_cat ON category_accommodation_rule_sets (category_code);
