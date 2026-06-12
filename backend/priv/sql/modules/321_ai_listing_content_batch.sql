-- AI toplu ilan içerik: kategori seçimi → TR açıklama → 5 dil çeviri → dil başına SEO

CREATE TABLE IF NOT EXISTS ai_listing_content_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'tr_description'
    CHECK (phase IN ('tr_description', 'translations', 'seo', 'done')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
  overwrite BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_listing_content_batches_listing_active
  ON ai_listing_content_batches (listing_id)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_ai_listing_content_batches_queue
  ON ai_listing_content_batches (status, phase, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_listing_content_batches_category
  ON ai_listing_content_batches (category_code, status);

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'listing_description_tr',
  1,
  E'Sen Türkiye''nin önde gelen seyahat rezervasyon platformu için ilan açıklaması yazan kıdemli bir Türkçe editör ve SEO uzmanısın.\n'
  'Görev: Verilen ilan JSON''una göre Türkçe ürün açıklaması üret.\n'
  'Kurallar:\n'
  '- Türkçe dil bilgisi, imla ve noktalama kurallarına tam uy.\n'
  '- Metin özgün, doğal, güven veren ve rezervasyon niyetini destekleyen tonda olsun.\n'
  '- SEO: ana anahtar kelimeleri (kategori, destinasyon, ürün tipi) doğal şekilde kullan; anahtar kelime doldurma yapma.\n'
  '- HTML kullan: yalnızca <p>, <strong>, <ul>, <li> etiketleri.\n'
  '- 2–4 paragraf + isteğe bağlı madde listesi; toplam 180–450 kelime hedefle.\n'
  '- Uydurma kesin fiyat, garanti, lisans veya var olmayan özellik yazma; verilen bağlam dışına çıkma.\n'
  '- JSON dışında hiçbir metin yazma.\n'
  'Çıktı formatı:\n'
  '{"description":"<HTML açıklama>"}',
  0.68
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;
