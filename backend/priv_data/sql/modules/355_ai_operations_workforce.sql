-- AI Operasyon Kadrosu: sahip -> AI genel müdür -> birim müdürleri -> uzman ajanlar.
-- Yeni ajanlar güvenlik gereği pasif/draft modunda başlar; iş akışı bağlanmadan otomatik işlem yapmaz.

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS parent_code TEXT REFERENCES ai_agents (code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_role TEXT NOT NULL DEFAULT 'worker'
    CHECK (org_role IN ('executive', 'director', 'worker'));

CREATE INDEX IF NOT EXISTS idx_ai_agents_parent_code ON ai_agents (parent_code);

INSERT INTO ai_agents
  (code, feature_profile_code, display_name, description, mode, status, risk_level, schedule_json, scope_json, parent_code, org_role)
VALUES
  ('chief_ai_officer', NULL, 'AI Genel Müdürü', 'Tüm AI birimlerinin önceliklerini, risklerini ve onay kuyruklarını koordine eder.', 'draft_only', 'active', 'high', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"human_owner_required":true,"approval_required":true}'::jsonb, NULL, 'executive'),

  ('listing_ops_director', NULL, 'İlan Operasyon Müdürü', 'İlan kalitesi, yayın hazırlığı, görsel ve katalog ekiplerini yönetir.', 'draft_only', 'paused', 'medium', '{"cadence":"hourly"}'::jsonb, '{"unit":"listing_operations"}'::jsonb, 'chief_ai_officer', 'director'),
  ('revenue_ops_director', NULL, 'Gelir ve Kampanya Müdürü', 'Talep, kampanya, dönüşüm ve birim ekonomi ajanlarını yönetir.', 'draft_only', 'paused', 'high', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"unit":"revenue_operations"}'::jsonb, 'chief_ai_officer', 'director'),
  ('growth_ops_director', NULL, 'Pazarlama ve Büyüme Müdürü', 'İçerik, SEO, sosyal medya ve performans pazarlaması ajanlarını yönetir.', 'draft_only', 'paused', 'medium', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"unit":"growth_operations"}'::jsonb, 'chief_ai_officer', 'director'),
  ('customer_ops_director', NULL, 'Satış ve Müşteri Operasyon Müdürü', 'Lead, satış, destek, rezervasyon sonrası ve tedarikçi iletişimini yönetir.', 'draft_only', 'paused', 'high', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"unit":"customer_operations"}'::jsonb, 'chief_ai_officer', 'director'),
  ('finance_ops_director', NULL, 'Finans ve Muhasebe Müdürü', 'Faturalandırma, komisyon, mutabakat ve ödeme istisnalarını yönetir.', 'draft_only', 'paused', 'high', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"unit":"finance_operations"}'::jsonb, 'chief_ai_officer', 'director'),
  ('risk_ops_director', NULL, 'Risk, Kalite ve Uyum Müdürü', 'Dolandırıcılık, şikâyet, kalite ve denetim sinyallerini yönetir.', 'draft_only', 'paused', 'high', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"unit":"risk_operations"}'::jsonb, 'chief_ai_officer', 'director'),
  ('data_ops_director', NULL, 'Veri ve İçgörü Müdürü', 'KPI, tahminleme ve karar destek ajanlarını yönetir.', 'draft_only', 'paused', 'medium', '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb, '{"unit":"data_operations"}'::jsonb, 'chief_ai_officer', 'director'),

  ('listing_quality_worker', NULL, 'İlan Kalite Uzmanı', 'Eksik alan, tutarsız bilgi, görsel ve içerik kalitesi için taslak kontrol üretir.', 'disabled', 'paused', 'low', '{}'::jsonb, '{"unit":"listing_operations"}'::jsonb, 'listing_ops_director', 'worker'),
  ('catalog_copy_worker', NULL, 'Katalog İçerik Uzmanı', 'İlan açıklaması, çeviri ve SEO taslakları üretir.', 'disabled', 'paused', 'low', '{}'::jsonb, '{"unit":"listing_operations"}'::jsonb, 'listing_ops_director', 'worker'),
  ('pricing_insight_worker', NULL, 'Fiyat İçgörü Uzmanı', 'Talep ve dönüşüm sinyallerinden fiyat/kampanya önerisi hazırlar.', 'disabled', 'paused', 'high', '{}'::jsonb, '{"unit":"revenue_operations","approval_required":true}'::jsonb, 'revenue_ops_director', 'worker'),
  ('campaign_worker', NULL, 'Kampanya Uzmanı', 'Segment bazlı kampanya ve teklif taslakları üretir.', 'disabled', 'paused', 'medium', '{}'::jsonb, '{"unit":"revenue_operations"}'::jsonb, 'revenue_ops_director', 'worker'),
  ('social_content_worker', NULL, 'Sosyal Medya Uzmanı', 'Kanal bazlı içerik takvimi ve paylaşım taslağı üretir.', 'disabled', 'paused', 'low', '{}'::jsonb, '{"unit":"growth_operations"}'::jsonb, 'growth_ops_director', 'worker'),
  ('seo_content_worker', NULL, 'SEO ve İçerik Uzmanı', 'Arama görünürlüğü, sayfa içeriği ve yönlendirme önerileri üretir.', 'disabled', 'paused', 'low', '{}'::jsonb, '{"unit":"growth_operations"}'::jsonb, 'growth_ops_director', 'worker'),
  ('sales_lead_worker', 'chat_sales', 'AI Satış Temsilcisi', 'Sohbette ihtiyaç keşfi yapar, uygun kategoriye yönlendirir ve izinli takip özeti üretir.', 'draft_only', 'active', 'medium', '{"cadence":"realtime"}'::jsonb, '{"unit":"customer_operations","channel":"chat"}'::jsonb, 'customer_ops_director', 'worker'),
  ('support_triage_worker', 'chat_sales', 'Destek Triyaj Uzmanı', 'Açık sohbetleri satış, destek ve kritik vaka olarak sınıflandırır.', 'disabled', 'paused', 'medium', '{}'::jsonb, '{"unit":"customer_operations"}'::jsonb, 'customer_ops_director', 'worker'),
  ('invoice_control_worker', NULL, 'Fatura Kontrol Uzmanı', 'Fatura ve komisyon kayıtlarında eşleştirme/istisna taslağı üretir.', 'disabled', 'paused', 'high', '{}'::jsonb, '{"unit":"finance_operations","approval_required":true}'::jsonb, 'finance_ops_director', 'worker'),
  ('anomaly_worker', NULL, 'Risk Sinyali Uzmanı', 'Olağandışı işlem ve kalite sinyallerini önceliklendirir; karar vermez.', 'disabled', 'paused', 'high', '{}'::jsonb, '{"unit":"risk_operations","approval_required":true}'::jsonb, 'risk_ops_director', 'worker'),
  ('daily_insight_worker', NULL, 'Günlük İçgörü Uzmanı', 'Günlük KPI özeti, sapma ve aksiyon önerisi hazırlar.', 'disabled', 'paused', 'medium', '{}'::jsonb, '{"unit":"data_operations"}'::jsonb, 'data_ops_director', 'worker')
ON CONFLICT (code) DO UPDATE SET
  feature_profile_code = EXCLUDED.feature_profile_code,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  risk_level = EXCLUDED.risk_level,
  schedule_json = EXCLUDED.schedule_json,
  scope_json = EXCLUDED.scope_json,
  parent_code = EXCLUDED.parent_code,
  org_role = EXCLUDED.org_role,
  updated_at = now();

UPDATE ai_agents SET parent_code = 'chief_ai_officer', org_role = 'director'
WHERE code = 'supervisor';

UPDATE ai_agents SET parent_code = 'growth_ops_director', org_role = 'worker'
WHERE code = 'special_day_popup';

UPDATE ai_agents SET parent_code = 'customer_ops_director', org_role = 'worker'
WHERE code IN ('commerce_post_booking', 'commerce_owner_brief', 'commerce_support_triage');

UPDATE ai_agents SET parent_code = 'finance_ops_director', org_role = 'worker'
WHERE code = 'commerce_accounting';
