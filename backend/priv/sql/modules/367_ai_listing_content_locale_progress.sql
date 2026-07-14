-- İlan içerik yenilemesinde her dil ayrı tamamlanır. Eski çeviri, yenisi hazır
-- olana kadar yayında kalır; overwrite işleri aynı ilk dilde döngüye girmez.

CREATE TABLE IF NOT EXISTS ai_listing_content_batch_progress (
  batch_id UUID NOT NULL REFERENCES ai_listing_content_batches (id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('translations', 'seo')),
  locale_code TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, phase, locale_code)
);

CREATE INDEX IF NOT EXISTS idx_ai_listing_content_batch_progress_phase
  ON ai_listing_content_batch_progress (batch_id, phase);
