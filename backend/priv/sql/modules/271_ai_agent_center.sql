-- DeepSeek Agent Merkezi: supervisor, özel gün takibi ve onaylı öneri akışı.

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  feature_profile_code TEXT REFERENCES ai_feature_profiles (code) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'draft_only'
    CHECK (mode IN ('disabled', 'draft_only', 'auto_low_risk')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'disabled')),
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  schedule_json JSONB NOT NULL DEFAULT '{}',
  scope_json JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS feature_profile_code TEXT REFERENCES ai_feature_profiles (code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS schedule_json JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT NOT NULL REFERENCES ai_agents (code) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'scheduled', 'system')),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  input_json JSONB NOT NULL DEFAULT '{}',
  summary_json JSONB NOT NULL DEFAULT '{}',
  error TEXT
);

ALTER TABLE ai_agent_runs
  ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'scheduled', 'system')),
  ADD COLUMN IF NOT EXISTS input_json JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_agent_created
  ON ai_agent_runs (agent_code, started_at DESC);

CREATE TABLE IF NOT EXISTS ai_agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT NOT NULL REFERENCES ai_agents (code) ON DELETE CASCADE,
  run_id UUID REFERENCES ai_agent_runs (id) ON DELETE SET NULL,
  ai_job_id UUID REFERENCES ai_jobs (id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  target_key TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  payload_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'applied', 'rejected', 'expired')),
  reviewer_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_agent_recommendations
  ADD COLUMN IF NOT EXISTS reviewer_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_recommendations_open_target
  ON ai_agent_recommendations (agent_code, kind, target_key)
  WHERE status IN ('pending', 'approved', 'applied');

CREATE INDEX IF NOT EXISTS idx_ai_agent_recommendations_status
  ON ai_agent_recommendations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT NOT NULL REFERENCES ai_agents (code) ON DELETE CASCADE,
  run_id UUID REFERENCES ai_agent_runs (id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES ai_agent_recommendations (id) ON DELETE SET NULL,
  decision_key TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  decision_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_decisions_agent_created
  ON ai_agent_decisions (agent_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_agent_decisions_recommendation
  ON ai_agent_decisions (recommendation_id)
  WHERE recommendation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_special_days (
  key TEXT PRIMARY KEY,
  primary_name TEXT NOT NULL,
  month SMALLINT,
  day SMALLINT,
  dates_by_year JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'special_day',
  default_cta_href TEXT NOT NULL DEFAULT '/oteller',
  icon TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#0EA5E9',
  lead_days INT NOT NULL DEFAULT 21,
  duration_days INT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (month IS NOT NULL AND day IS NOT NULL)
    OR dates_by_year <> '{}'::jsonb
  )
);

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'supervisor_agent',
  1,
  'Sen rezervasyonyap.tr içinde çalışan Supervisor Agent''sın.

Görevin: Diğer ürün ajanlarının güvenli ve tekrar üretmeyen şekilde çalışmasını denetlemek.

Kurallar:
- Çıktı SADECE geçerli JSON olsun; markdown, açıklama, kod bloğu yazma.
- Türkçe yaz.
- Canlı yayın, silme, müşteriyle iletişim veya finansal etki doğuran aksiyonları yüksek risk say.
- Düşük riskli içerik önerilerini bile önce taslak/onay akışına yönlendir.
- Aynı hedef için açık öneri varsa yeni öneri üretme; mevcut durumu raporla.

JSON şeması:
{
  "status": "ok|needs_attention|blocked",
  "checks": [
    {
      "agent_code": "special_day_popup",
      "target_key": "özel gün veya iş anahtarı",
      "result": "skip|draft|needs_review|error",
      "reason": "kısa gerekçe",
      "risk_level": "low|medium|high"
    }
  ],
  "summary": "kısa operasyon özeti"
}',
  0.35
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'special_day_popup_agent',
  1,
  'Sen rezervasyonyap.tr için çalışan DeepSeek tabanlı bir seyahat pazarlama ajanısın.

Görevin: Verilen özel gün için kullanıcıyı sıkmadan, kısa ve satışa yardımcı bir popup metni üretmek.

Kurallar:
- Çıktı SADECE geçerli JSON olsun; markdown, açıklama, kod bloğu yazma.
- Türkçe yaz.
- Abartılı indirim, kesin fiyat veya elde olmayan kampanya vaadi uydurma.
- Marka tonu: profesyonel, sıcak, güven veren, kısa.
- Kullanıcıyı bunaltma; başlık kısa, gövde 1-2 cümle.
- CTA metni 2-4 kelime olsun.

JSON şeması:
{
  "title": "kısa popup başlığı",
  "body": "1-2 cümlelik açıklama",
  "cta_text": "CTA",
  "cta_href": "/oteller veya /turlar gibi mevcut rota",
  "tone": "warm|family|patriotic|seasonal|premium",
  "icon": "tek kısa ikon",
  "accent_color": "#RRGGBB"
}',
  0.45
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;

INSERT INTO ai_agents
  (code, feature_profile_code, display_name, description, mode, status, risk_level, schedule_json, scope_json)
VALUES
  (
    'supervisor',
    'supervisor_agent',
    'Supervisor Agent',
    'Tüm ürün ajanlarını denetler; ilk fazda özel gün/popup önerilerini kontrol eder.',
    'draft_only',
    'active',
    'medium',
    '{"cadence":"daily","timezone":"Europe/Istanbul"}'::jsonb,
    '{"agents":["special_day_popup"],"approval_required":true}'::jsonb
  ),
  (
    'special_day_popup',
    'special_day_popup_agent',
    'Özel Gün Popup Agent',
    'Yaklaşan özel günleri takip eder ve DeepSeek ile popup önerisi üretir.',
    'draft_only',
    'active',
    'low',
    '{"cadence":"daily","lead_window_days":45,"timezone":"Europe/Istanbul"}'::jsonb,
    '{"channel":"popup","pages":["homepage"],"locales":["tr"]}'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  feature_profile_code = EXCLUDED.feature_profile_code,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  risk_level = EXCLUDED.risk_level,
  schedule_json = ai_agents.schedule_json || EXCLUDED.schedule_json,
  scope_json = ai_agents.scope_json || EXCLUDED.scope_json,
  updated_at = now();

INSERT INTO ai_special_days
  (key, primary_name, month, day, dates_by_year, category, default_cta_href, icon, accent_color, lead_days, duration_days)
VALUES
  ('23-nisan', '23 Nisan', 4, 23, '{}'::jsonb, 'national_day', '/oteller', 'TR', '#ef4444', 21, 2),
  ('1-mayis', '1 Mayıs', 5, 1, '{}'::jsonb, 'public_holiday', '/oteller', '*', '#16a34a', 21, 2),
  ('19-mayis', '19 Mayıs', 5, 19, '{}'::jsonb, 'national_day', '/turlar', 'TR', '#2563eb', 21, 2),
  ('30-agustos', '30 Ağustos', 8, 30, '{}'::jsonb, 'national_day', '/oteller', 'TR', '#dc2626', 21, 2),
  ('29-ekim', '29 Ekim', 10, 29, '{}'::jsonb, 'national_day', '/blog', 'TR', '#b91c1c', 21, 2),
  ('yilbasi', 'Yılbaşı', 12, 31, '{}'::jsonb, 'seasonal', '/oteller', '*', '#7c3aed', 35, 3),
  (
    'ramazan-bayrami',
    'Ramazan Bayramı',
    NULL,
    NULL,
    '{"2026":{"month":3,"day":20},"2027":{"month":3,"day":9},"2028":{"month":2,"day":26},"2029":{"month":2,"day":14},"2030":{"month":2,"day":4}}'::jsonb,
    'religious_holiday',
    '/oteller',
    '*',
    '#0f766e',
    45,
    4
  ),
  (
    'kurban-bayrami',
    'Kurban Bayramı',
    NULL,
    NULL,
    '{"2026":{"month":5,"day":27},"2027":{"month":5,"day":17},"2028":{"month":5,"day":5},"2029":{"month":4,"day":24},"2030":{"month":4,"day":13}}'::jsonb,
    'religious_holiday',
    '/oteller',
    '*',
    '#92400e',
    45,
    4
  )
ON CONFLICT (key) DO UPDATE SET
  primary_name = EXCLUDED.primary_name,
  month = EXCLUDED.month,
  day = EXCLUDED.day,
  dates_by_year = EXCLUDED.dates_by_year,
  category = EXCLUDED.category,
  default_cta_href = EXCLUDED.default_cta_href,
  icon = EXCLUDED.icon,
  accent_color = EXCLUDED.accent_color,
  lead_days = EXCLUDED.lead_days,
  duration_days = EXCLUDED.duration_days,
  updated_at = now();
