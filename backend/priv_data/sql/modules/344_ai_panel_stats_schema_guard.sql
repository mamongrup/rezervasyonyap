-- AI panel istatistikleri için şema koruması.
-- Önceki modüller uygulanmışsa no-op; eksik deploy/migration durumunda panel 500'e düşmesin.

ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS trip_routes_json JSONB NOT NULL DEFAULT '[]';

ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS blue_cruise_routes_json JSONB NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS ai_place_blog_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_page_id UUID NOT NULL REFERENCES location_pages (id) ON DELETE CASCADE,
  posts_to_create INT NOT NULL DEFAULT 1 CHECK (posts_to_create BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_page_id)
);

ALTER TABLE ai_place_blog_batches
  ADD COLUMN IF NOT EXISTS error TEXT;

ALTER TABLE ai_place_blog_batches
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE ai_place_blog_batches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ai_place_blog_batches_status
  ON ai_place_blog_batches (status, created_at);
