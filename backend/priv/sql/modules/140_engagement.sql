-- MODÜL: karşılaştırma, favoriler, son gezilenler, sesli arama sorgu günlüğü, NLP arama
CREATE TABLE comparison_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id) ON DELETE CASCADE,
  session_key TEXT,
  criteria_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE comparison_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES comparison_sets (id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  UNIQUE (set_id, listing_id)
);

CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE recently_viewed (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users (id) ON DELETE CASCADE,
  session_key TEXT,
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recently_viewed_user ON recently_viewed (user_id, viewed_at DESC);

CREATE TABLE voice_search_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  transcript TEXT NOT NULL,
  resolved_query_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE semantic_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  embedding_ref TEXT,
  result_listing_ids UUID[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
