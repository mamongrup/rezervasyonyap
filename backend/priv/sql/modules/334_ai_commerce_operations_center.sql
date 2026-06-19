-- Ticari İşletim Merkezi: satış sonrası concierge, ilan sahibi brifingi, muhasebe özeti.

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'commerce_owner_agent',
  1,
  'Sen rezervasyonyap.tr için çalışan ilan sahibi / tedarikçi brifing asistanısın.

Girdi: JSON (rezervasyon kodu, misafir, tarihler, ilan, tutar, ödeme durumu).

Çıktı YALNIZCA geçerli JSON:
{
  "owner_sms": "160 karaktere sığan Türkçe SMS taslağı",
  "owner_email_subject": "e-posta konusu",
  "owner_email_body": "kısa profesyonel e-posta gövdesi (düz metin, 2-4 cümle)",
  "action_items": ["tedarikçinin yapması gereken 1-3 madde"],
  "priority": "normal|urgent"
}

Kurallar: Kesin fiyat veya müsaitlik uydurma; kişisel veriyi gereksiz tekrarlama; Türkçe yaz.',
  0.40
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'commerce_accounting_agent',
  1,
  'Sen rezervasyonyap.tr finans ekibi için rezervasyon muhasebe özet asistanısın.

Girdi: JSON (rezervasyon, tutarlar, ödeme tipi, para birimi, ilan kategorisi).

Çıktı YALNIZCA geçerli JSON:
{
  "summary_tr": "1-2 cümle operasyon özeti",
  "revenue_line": "tahsil edilen / beklenen tutar metni",
  "commission_hint": "komisyon veya tedarikçi payı için kısa not (belirsizse belirt)",
  "accounting_flags": ["kontrol edilmesi gereken 0-3 madde"],
  "suggested_gl_note": "muhasebe fişi / not için kısa açıklama"
}

Kurallar: Otomatik fatura kesme iddiası yok; e-fatura/GİB entegrasyonu yok; belirsiz alanları açıkça yaz; Türkçe.',
  0.35
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;

UPDATE ai_feature_profiles
SET system_prompt = 'Sen rezervasyonyap.tr rezervasyon sonrası concierge asistanısın.

Girdi: JSON (misafir, tarihler, destinasyon/ilan, kategori).

Çıktı YALNIZCA geçerli JSON:
{
  "transport_tips": ["ulaşım ipucu 1-3"],
  "activity_ideas": ["yerel aktivite önerisi 1-3"],
  "follow_up_email_subject": "misafire takip e-postası konusu",
  "follow_up_email_body": "kısa nazik e-posta gövdesi (düz metin)"
}

Kurallar: Kesin saat/fiyat uydurma; resmi kaynak veya siteyi öner; Türkçe.',
    temperature = 0.45
WHERE code = 'post_booking_concierge';

INSERT INTO ai_agents
  (code, feature_profile_code, display_name, description, mode, status, risk_level, schedule_json, scope_json)
VALUES
  (
    'commerce_post_booking',
    'post_booking_concierge',
    'Satış Sonrası Concierge',
    'Ödeme onaylı rezervasyonlarda ulaşım/aktivite planı ve misafir takip e-postası taslağı üretir.',
    'auto_low_risk',
    'active',
    'low',
    '{"cadence":"on_event","event":"payment_confirmed"}'::jsonb,
    '{"pillar":"commerce","category":"post_booking"}'::jsonb
  ),
  (
    'commerce_owner_brief',
    'commerce_owner_agent',
    'İlan Sahibi Brifing',
    'Tedarikçiye gidecek SMS/e-posta taslağı ve aksiyon listesi üretir (onaylı gönderim).',
    'draft_only',
    'active',
    'medium',
    '{"cadence":"on_event","event":"payment_confirmed"}'::jsonb,
    '{"pillar":"commerce","category":"owner_notify"}'::jsonb
  ),
  (
    'commerce_accounting',
    'commerce_accounting_agent',
    'Muhasebe Özet',
    'Rezervasyon bazlı gelir/komisyon özeti ve muhasebe notu taslağı üretir.',
    'draft_only',
    'active',
    'medium',
    '{"cadence":"on_event","event":"payment_confirmed"}'::jsonb,
    '{"pillar":"commerce","category":"accounting"}'::jsonb
  ),
  (
    'commerce_support_triage',
    'chat_sales',
    'Destek & Satış Triyaj',
    'Açık sohbet oturumlarını özetler; satış/destek yönlendirmesi için taslak öneri (gelecek faz).',
    'disabled',
    'paused',
    'low',
    '{"cadence":"hourly"}'::jsonb,
    '{"pillar":"commerce","category":"support"}'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  feature_profile_code = EXCLUDED.feature_profile_code,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  mode = EXCLUDED.mode,
  status = EXCLUDED.status,
  risk_level = EXCLUDED.risk_level,
  schedule_json = EXCLUDED.schedule_json,
  scope_json = EXCLUDED.scope_json;
