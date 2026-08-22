-- İlan API senkronizasyon işleri — panel import butonu + zamanlayıcı takibi.

CREATE TABLE IF NOT EXISTS provider_sync_jobs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT        NOT NULL,                    -- wtatil | travelrobot | turna | yolcu360
  status      TEXT        NOT NULL DEFAULT 'pending',  -- pending | running | done | error
  progress    INT         NOT NULL DEFAULT 0,          -- işlenen kayıt sayısı
  total       INT         NOT NULL DEFAULT 0,          -- toplam beklenen (0 = bilinmiyor)
  log_tail    TEXT        NOT NULL DEFAULT '',         -- son 2000 karakter log
  error_text  TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_provider_sync_jobs_provider
  ON provider_sync_jobs (provider, started_at DESC);

-- Zamanlama: site_settings key='import_schedule'
-- value_json: { "wtatil": [3,15], "travelrobot": [4], "turna": [], "yolcu360": [] }
-- Her değer o gün saat listesi (UTC). Boş dizi = zamanlama yok.
