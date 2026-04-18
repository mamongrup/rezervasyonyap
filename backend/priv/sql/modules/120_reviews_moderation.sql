-- MODÜL: yorumlar, moderasyon, IP engeli, harici yorum özeti (Trustpilot vb.)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  ip INET,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  has_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  photo_keys TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_entity ON reviews (entity_type, entity_id);

CREATE TABLE blocked_ips (
  id SERIAL PRIMARY KEY,
  ip INET NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE external_review_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  ai_summary TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
