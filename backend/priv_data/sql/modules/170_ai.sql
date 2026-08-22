-- MODÜL: yapay zeka — tüm AI özellikleri tek başlık altında (DeepSeek + görev kuyruğu)
CREATE TABLE IF NOT EXISTS ai_providers (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  default_model TEXT,
  config_secret_ref TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO ai_providers (code, display_name, default_model, config_secret_ref, is_active) VALUES
  ('deepseek', 'DeepSeek', 'deepseek-chat', 'vault:deepseek', FALSE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_feature_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  provider_id SMALLINT NOT NULL REFERENCES ai_providers (id),
  system_prompt TEXT,
  temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.70
);

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt) VALUES
  ('region_hierarchy', 1, 'Coğrafi hiyerarşi ve koordinat üret.'),
  ('content_writer', 1, 'Blog, sayfa, ilan, bölge içeriği.'),
  ('seo_writer', 1, 'SEO başlık ve meta.'),
  ('translator', 1, 'Çok dilli SEO uyumlu çeviri.'),
  ('social_caption', 1, 'Sosyal paylaşım metni.'),
  ('review_summarizer', 1, 'Yorum özeti.'),
  ('nlp_search', 1, 'Doğal dil sorgu ayrıştırma.'),
  ('trip_planner', 1, 'Günlük rota ve çapraz satış.'),
  ('post_booking_concierge', 1, 'Rezervasyon sonrası ulaşım ve aktivite önerisi.'),
  ('price_hint', 1, 'Fiyat trendi / FOMO metni.'),
  ('image_enhance_prompt', 1, 'Görsel iyileştirme talimatı.'),
  ('chat_sales', 1, 'Satış ve çapraz satış sohbet.')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code TEXT NOT NULL REFERENCES ai_feature_profiles (code),
  input_json JSONB NOT NULL,
  output_json JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS ai_region_generation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id SMALLINT REFERENCES countries (id) ON DELETE CASCADE,
  country_name TEXT NOT NULL,
  step TEXT NOT NULL CHECK (step IN ('provinces', 'districts')),
  parent_region_id INT REFERENCES regions (id) ON DELETE CASCADE,
  job_id UUID REFERENCES ai_jobs (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_geo_blog_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_page_id UUID NOT NULL REFERENCES location_pages (id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL DEFAULT 'gezi-fikirleri',
  posts_to_create INT NOT NULL DEFAULT 5,
  job_id UUID REFERENCES ai_jobs (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS ai_post_booking_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  plan_json JSONB NOT NULL,
  email_job_id BIGINT REFERENCES notification_jobs (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
