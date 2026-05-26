-- Sosyal kuyruk: platform (facebook / instagram / pinterest) + sonuç alanları

ALTER TABLE social_share_jobs
  ADD COLUMN IF NOT EXISTS network TEXT NOT NULL DEFAULT 'facebook';

ALTER TABLE social_share_jobs
  ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE social_share_jobs
  ADD COLUMN IF NOT EXISTS external_post_id TEXT;

ALTER TABLE social_share_jobs
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

ALTER TABLE social_share_jobs
  DROP CONSTRAINT IF EXISTS social_share_jobs_network_check;

ALTER TABLE social_share_jobs
  ADD CONSTRAINT social_share_jobs_network_check
  CHECK (network IN ('instagram', 'facebook', 'twitter', 'pinterest'));

CREATE UNIQUE INDEX IF NOT EXISTS social_share_jobs_pending_listing_network_uq
  ON social_share_jobs (entity_id, network)
  WHERE status = 'pending' AND entity_type = 'listing';

CREATE INDEX IF NOT EXISTS social_share_jobs_pending_created_idx
  ON social_share_jobs (created_at)
  WHERE status = 'pending';
