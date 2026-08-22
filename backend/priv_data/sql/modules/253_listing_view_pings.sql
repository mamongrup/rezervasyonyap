-- Faz B: Sosyal kanıt — "X kişi bakıyor" pinglemesi.
-- Heartbeat: kullanıcı detay sayfasındayken her ~30sn ping atar, en son 5 dk
-- içindeki distinct session_key sayısı = viewers_now.

CREATE TABLE IF NOT EXISTS listing_view_pings (
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  session_key TEXT NOT NULL,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, session_key)
);

CREATE INDEX IF NOT EXISTS idx_listing_view_pings_recent
  ON listing_view_pings (listing_id, pinged_at DESC);

-- Gece otomatik temizlik için yardımcı view (cron eklenmeden de manuel çalışır):
-- DELETE FROM listing_view_pings WHERE pinged_at < now() - INTERVAL '1 day';
