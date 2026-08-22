-- Faz Tur1 — İlan şikayet/sorun bildirimleri.
-- Vitrin tarafında "Bu ilanı bildir" butonu için minimal kayıt tablosu.
-- Admin panelden sonradan listelenebilir; süreç ileride workflow'a bağlanabilir.

CREATE TABLE IF NOT EXISTS listing_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reason_code  TEXT        NOT NULL,
  message      TEXT        NOT NULL DEFAULT '',
  reporter_email TEXT      NOT NULL DEFAULT '',
  reporter_user_id UUID    REFERENCES users(id) ON DELETE SET NULL,
  status       TEXT        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listing_reports_status
  ON listing_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_reports_listing
  ON listing_reports (listing_id, created_at DESC);
