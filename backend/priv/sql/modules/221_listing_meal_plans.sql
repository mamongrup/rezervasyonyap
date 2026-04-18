-- =====================================================================
-- MODÜL: Konaklama Yemek Planları (221)
-- Tatil evi / otel ilanları için yemekli/yemeksiz fiyat seçenekleri
-- =====================================================================

CREATE TABLE listing_meal_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  plan_code     TEXT NOT NULL CHECK (
    plan_code IN (
      'room_only',        -- Yemeksiz
      'bed_breakfast',    -- Oda Kahvaltı
      'half_board',       -- Yarım Pansiyon (sabah + akşam)
      'full_board',       -- Tam Pansiyon (3 öğün)
      'all_inclusive',    -- Her Şey Dahil
      'custom'            -- Özel (label ile tanımlanmış)
    )
  ),
  label         TEXT NOT NULL,            -- Türkçe görünen ad: "Yemeksiz", "Yarım Pansiyon"
  label_en      TEXT NOT NULL DEFAULT '', -- İngilizce görünen ad
  included_meals  JSONB NOT NULL DEFAULT '[]', -- ["breakfast","lunch","dinner","supper"]
  included_extras JSONB NOT NULL DEFAULT '[]', -- ["tea","coffee","minibar","snacks","welcome_drink","soft_drinks"]
  price_per_night NUMERIC(14,2) NOT NULL,
  currency_code   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON listing_meal_plans (listing_id);
CREATE UNIQUE INDEX ON listing_meal_plans (listing_id, plan_code);
