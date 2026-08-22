-- Blog kategorilerine zenginleştirme alanları
ALTER TABLE blog_categories
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Blog yazılarına zenginleştirme alanları
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_gallery_json JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS read_time_minutes INT,
  ADD COLUMN IF NOT EXISTS tags_json JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Blog çevirilerine özet alanı
ALTER TABLE blog_post_translations
  ADD COLUMN IF NOT EXISTS excerpt TEXT;
