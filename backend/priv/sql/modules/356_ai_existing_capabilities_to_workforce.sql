-- Mevcut AI yeteneklerini operasyon kadrosuna bağlar.
-- İçerik/çeviri çıktıları taslak üretir; yayın, fiyat ve dış iletişim insan onayı gerektirir.

INSERT INTO ai_agents
  (code, feature_profile_code, display_name, description, mode, status, risk_level, schedule_json, scope_json, parent_code, org_role)
VALUES
  ('social_media_agent', 'social_caption', 'Sosyal Medya Yayın Uzmanı', 'Sosyal kanal için paylaşım metni, görsel seçimi ve yayın planı taslağı üretir.', 'draft_only', 'active', 'low', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"unit":"growth_operations","approval_required":true,"outputs":["caption","post_plan"]}'::jsonb, 'growth_ops_director', 'worker'),
  ('blog_content_agent', 'content_writer', 'Blog ve İçerik Yazarı', 'Blog, rehber ve kampanya içerikleri için araştırmaya dayalı taslak üretir.', 'draft_only', 'active', 'low', '{"cadence":"on_demand"}'::jsonb, '{"unit":"growth_operations","approval_required":true,"outputs":["blog_draft","page_copy"]}'::jsonb, 'growth_ops_director', 'worker'),
  ('seo_content_agent', 'seo_writer', 'SEO İçerik Uzmanı', 'Başlık, meta açıklama, yapılandırılmış içerik ve SEO iyileştirme taslağı üretir.', 'draft_only', 'active', 'low', '{"cadence":"on_demand"}'::jsonb, '{"unit":"growth_operations","approval_required":true,"outputs":["meta","seo_copy"]}'::jsonb, 'growth_ops_director', 'worker'),
  ('listing_translation_agent', 'translator', 'İlan Çeviri Uzmanı', 'Türkçe girilen ilan ve sayfa içeriğini desteklenen dillere çeviri taslağı olarak hazırlar.', 'draft_only', 'active', 'low', '{"cadence":"on_event","event":"turkish_content_saved"}'::jsonb, '{"unit":"listing_operations","source_locale":"tr","approval_required":true,"outputs":["listing_translation"]}'::jsonb, 'listing_ops_director', 'worker'),
  ('listing_copy_agent', 'listing_description_tr', 'İlan Metin Uzmanı', 'İlan bilgilerini anlaşılır Türkçe açıklama, özet ve SEO taslağına dönüştürür.', 'draft_only', 'active', 'low', '{"cadence":"on_demand"}'::jsonb, '{"unit":"listing_operations","approval_required":true,"outputs":["listing_description"]}'::jsonb, 'listing_ops_director', 'worker')
ON CONFLICT (code) DO UPDATE SET
  feature_profile_code = EXCLUDED.feature_profile_code,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  mode = EXCLUDED.mode,
  status = EXCLUDED.status,
  risk_level = EXCLUDED.risk_level,
  schedule_json = EXCLUDED.schedule_json,
  scope_json = EXCLUDED.scope_json,
  parent_code = EXCLUDED.parent_code,
  org_role = EXCLUDED.org_role,
  updated_at = now();

UPDATE ai_agents
SET parent_code = 'growth_ops_director', org_role = 'worker', updated_at = now()
WHERE code IN ('district_ideas_agent', 'place_blog_agent', 'region_content_agent', 'special_day_popup');

UPDATE ai_agents
SET parent_code = 'listing_ops_director', org_role = 'worker', updated_at = now()
WHERE code = 'image_agent';
