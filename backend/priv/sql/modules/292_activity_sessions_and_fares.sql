-- Activity sessions and adult/child fares for GetYourGuide-style booking widgets.

CREATE TABLE IF NOT EXISTS listing_activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_listing_activity_sessions_listing
  ON listing_activity_sessions(listing_id, valid_from, valid_to, start_time);

CREATE TABLE IF NOT EXISTS listing_activity_session_fares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES listing_activity_sessions(id) ON DELETE CASCADE,
  fare_type text NOT NULL CHECK (fare_type IN ('adult', 'child')),
  price_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  currency_code text NOT NULL DEFAULT 'TRY',
  min_age integer NULL CHECK (min_age IS NULL OR min_age >= 0),
  max_age integer NULL CHECK (max_age IS NULL OR max_age >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, fare_type),
  CHECK (max_age IS NULL OR min_age IS NULL OR max_age >= min_age)
);

CREATE INDEX IF NOT EXISTS idx_listing_activity_session_fares_session
  ON listing_activity_session_fares(session_id);
