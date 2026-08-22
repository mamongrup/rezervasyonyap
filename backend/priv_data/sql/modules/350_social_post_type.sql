-- Sosyal kuyruk: içerik türü (feed / story / reel). Story ve Reel şimdilik yalnız Instagram.

ALTER TABLE social_share_jobs
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'feed';

ALTER TABLE social_share_jobs
  DROP CONSTRAINT IF EXISTS social_share_jobs_post_type_check;

ALTER TABLE social_share_jobs
  ADD CONSTRAINT social_share_jobs_post_type_check
  CHECK (post_type IN ('feed', 'story', 'reel'));

-- Aynı ilan + network + post_type için birden fazla bekleyen iş olmasın; farklı
-- post_type'lar (ör. aynı ilan için feed + story) artık aynı anda bekleyebilir.
DROP INDEX IF EXISTS social_share_jobs_pending_listing_network_uq;

CREATE UNIQUE INDEX IF NOT EXISTS social_share_jobs_pending_listing_network_type_uq
  ON social_share_jobs (entity_id, network, post_type)
  WHERE status = 'pending' AND entity_type = 'listing';
