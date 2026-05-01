-- AI Site Fill: favori mekan blog ajanı, kuyruk ve içerik ajan kayıtları

CREATE TABLE IF NOT EXISTS ai_place_blog_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_page_id UUID NOT NULL REFERENCES location_pages (id) ON DELETE CASCADE,
  posts_to_create INT NOT NULL DEFAULT 1 CHECK (posts_to_create BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_page_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_place_blog_batches_status
  ON ai_place_blog_batches (status, created_at);

INSERT INTO blog_categories (slug, name, description, is_active, sort_order)
VALUES (
  'favori-mekanlar',
  'Favori Mekanlar',
  'Bölgelere göre gezilecek popüler yerler ve favori mekan rehberleri.',
  TRUE,
  25
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE;

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'place_blog_writer',
  1,
  E'Sen rezervasyonyap.tr için çalışan seyahat blog yazarı ve yerel rota editörüsün.\n'
  'Görev: Verilen bölge ve travel_ideas_json içindeki gerçek mekanları kullanarak favori mekan blog yazısı üret.\n'
  'Kurallar:\n'
  '- Türkçe yaz.\n'
  '- Sadece HTML döndür; markdown, JSON, açıklama veya kod bloğu yazma.\n'
  '- h2, h3, p, ul, li, strong etiketlerini kullanabilirsin.\n'
  '- Mekanları uydurma; sadece verilen JSON içindeki mekanları ve bölge bilgisini temel al.\n'
  '- Varsa rating, adres, mesafe ve Google Maps linkini doğal ve ölçülü kullan.\n'
  '- Kesin fiyat, işletme çalışma saati veya garanti bilgi verme.\n'
  '- Yazı 700-1100 kelime aralığında, özgün, okunabilir ve gezi niyetine uygun olsun.',
  0.72
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;

INSERT INTO ai_agents
  (code, feature_profile_code, display_name, description, mode, status, risk_level, schedule_json, scope_json)
VALUES
  (
    'region_content_agent',
    'region_tourism_content',
    'Bölge İçerik Agent',
    'Eksik lokasyon tanıtımlarını ve bölge bloglarını üretir.',
    'draft_only',
    'active',
    'low',
    '{"cadence":"manual","timezone":"Europe/Istanbul"}'::jsonb,
    '{"content":["location_pages.description","region_blog_posts"],"locales":["tr"]}'::jsonb
  ),
  (
    'district_ideas_agent',
    'district_travel_ideas',
    'İlçe Gezi Fikirleri Agent',
    'İlçe gezi fikirleri ve favori mekan kaynaklarını üretir.',
    'draft_only',
    'active',
    'low',
    '{"cadence":"manual","timezone":"Europe/Istanbul"}'::jsonb,
    '{"content":["location_pages.travel_ideas_json"],"locales":["tr"]}'::jsonb
  ),
  (
    'place_blog_agent',
    'place_blog_writer',
    'Favori Mekan Blog Agent',
    'Travel ideas içindeki favori mekanlardan blog yazıları üretir.',
    'draft_only',
    'active',
    'low',
    '{"cadence":"manual","timezone":"Europe/Istanbul"}'::jsonb,
    '{"content":["blog_posts"],"source":"travel_ideas_json","locales":["tr"]}'::jsonb
  ),
  (
    'image_agent',
    NULL,
    'Görsel Agent',
    'Pexels ve mevcut lokasyon kapak görsellerini içeriklere bağlar.',
    'draft_only',
    'active',
    'low',
    '{"cadence":"manual","timezone":"Europe/Istanbul"}'::jsonb,
    '{"content":["location_pages.cover_image","blog_posts.featured_image_url"],"providers":["pexels"]}'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  feature_profile_code = EXCLUDED.feature_profile_code,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  risk_level = EXCLUDED.risk_level,
  schedule_json = EXCLUDED.schedule_json,
  scope_json = EXCLUDED.scope_json,
  updated_at = now();

UPDATE ai_agents
SET
  scope_json = jsonb_set(
    coalesce(scope_json, '{}'::jsonb),
    '{agents}',
    '["special_day_popup","region_content_agent","district_ideas_agent","place_blog_agent","image_agent"]'::jsonb,
    true
  ),
  description = 'Tüm ürün ajanlarını denetler; popup ve içerik üretim sağlığını kontrol eder.',
  updated_at = now()
WHERE code = 'supervisor';
