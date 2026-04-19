-- MODÜL: sosyal medya paylaşımı (Instagram, Facebook, Twitter, Pinterest) + şablonlar
CREATE TABLE IF NOT EXISTS social_share_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL CHECK (network IN ('instagram', 'facebook', 'twitter', 'pinterest')),
  name TEXT NOT NULL,
  template_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_share_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  template_id UUID REFERENCES social_share_templates (id) ON DELETE SET NULL,
  image_keys TEXT[] NOT NULL DEFAULT '{}',
  caption_ai_generated TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instagram_shop_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  instagram_media_id TEXT NOT NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS instagram_story_mirror (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL UNIQUE,
  storage_key TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
