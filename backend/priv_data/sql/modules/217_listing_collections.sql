-- Koleksiyon sayfaları: "balayı villaları", "5 kabinli lüks yatlar" gibi
-- dinamik filtre kurallarına dayalı ilan grupları.

CREATE TABLE IF NOT EXISTS listing_collections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  description    TEXT,
  hero_image_url TEXT,
  filter_rules   JSONB NOT NULL DEFAULT '{}',
  -- Örnek filter_rules:
  -- {
  --   "q":              "balayı villa",
  --   "category_codes": ["villa","hotel"],
  --   "locations":      ["fethiye","ölüdeniz"],
  --   "tags":           ["balayı","deniz manzarası"],
  --   "min_price":      null,
  --   "max_price":      null
  -- }
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INT     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_collections_slug   ON listing_collections(slug);
CREATE INDEX IF NOT EXISTS idx_listing_collections_active ON listing_collections(is_active, sort_order);
