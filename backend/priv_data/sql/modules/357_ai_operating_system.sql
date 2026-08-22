-- AI İşletim Sistemi: olay -> workflow -> ajan adımları -> kalite/onay -> yayın/öğrenme.

CREATE TABLE IF NOT EXISTS ai_operating_policies (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_workflow_definitions (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  entity_types TEXT[] NOT NULL DEFAULT '{}',
  stages_json JSONB NOT NULL DEFAULT '[]',
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_code TEXT NOT NULL REFERENCES ai_workflow_definitions (code),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_locale TEXT NOT NULL DEFAULT 'tr',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','awaiting_approval','completed','failed','cancelled')),
  priority SMALLINT NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  current_stage TEXT NOT NULL DEFAULT 'intake',
  requested_by TEXT NOT NULL DEFAULT 'system',
  input_json JSONB NOT NULL DEFAULT '{}',
  context_json JSONB NOT NULL DEFAULT '{}',
  quality_score NUMERIC(5,2),
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_work_items_open_entity
  ON ai_work_items (workflow_code, entity_type, entity_id)
  WHERE status IN ('queued','running','awaiting_approval');

CREATE INDEX IF NOT EXISTS idx_ai_work_items_queue
  ON ai_work_items (status, priority DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS ai_work_item_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES ai_work_items (id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL,
  stage_order SMALLINT NOT NULL,
  agent_code TEXT REFERENCES ai_agents (code) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','queued','running','awaiting_approval','approved','completed','failed','skipped')),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count SMALLINT NOT NULL DEFAULT 0,
  max_retries SMALLINT NOT NULL DEFAULT 2,
  input_json JSONB NOT NULL DEFAULT '{}',
  output_json JSONB NOT NULL DEFAULT '{}',
  quality_json JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (work_item_id, stage_code)
);

CREATE INDEX IF NOT EXISTS idx_ai_work_item_steps_queue
  ON ai_work_item_steps (status, stage_order, created_at);

CREATE TABLE IF NOT EXISTS ai_event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  payload_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','processed','failed','ignored')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_event_outbox_pending
  ON ai_event_outbox (status, available_at, created_at);

INSERT INTO ai_operating_policies (key, value_json, description)
VALUES
  ('autonomy', '{"default":"draft_only","auto_low_risk":true,"money":false,"price":false,"refund":false,"contract":false,"bulk_message":false,"publish_external":false}'::jsonb, 'AI düşük riskli hazırlıkları yürütür; finansal, hukuki ve dış yayın kararları onay gerektirir.'),
  ('content_quality', '{"minimum_score":85,"require_sources":true,"reject_hallucinated_facts":true,"require_brand_tone":true,"require_accessibility":true}'::jsonb, 'Tüm içerik türleri için yayın kalite eşiği.'),
  ('localization', '{"source_locale":"tr","mode":"transcreation","translate_seo":false,"local_seo_required":true,"preserve_facts":true}'::jsonb, 'Çeviri değil yerelleştirme; her dil için ayrı SEO.'),
  ('human_attention', '{"only_exceptions":true,"daily_digest":true,"group_similar":true,"max_notifications_per_day":2}'::jsonb, 'Sahibin iş yükünü azaltan istisna bazlı bildirim politikası.')
ON CONFLICT (key) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO ai_workflow_definitions
  (code, display_name, description, entity_types, stages_json, version, is_active)
VALUES (
  'universal_content_lifecycle',
  'Evrensel İçerik Yaşam Döngüsü',
  'İlan, sayfa, bölge, blog ve diğer tüm içerikleri doğrulama, üretim, yerelleştirme, SEO, yayın ve öğrenme zincirinden geçirir.',
  ARRAY['listing','page','region','blog','campaign','category','destination','supplier'],
  '[
    {"code":"intake","agent":"listing_quality_worker","approval":false},
    {"code":"source_validation","agent":"listing_quality_worker","approval":false},
    {"code":"tr_content","agent":"listing_copy_agent","approval":false},
    {"code":"media","agent":"image_agent","approval":false},
    {"code":"localization","agent":"listing_translation_agent","approval":false},
    {"code":"multilingual_seo","agent":"seo_content_agent","approval":false},
    {"code":"quality_gate","agent":"supervisor","approval":false},
    {"code":"publish","agent":"supervisor","approval":true},
    {"code":"distribution","agent":"social_media_agent","approval":true},
    {"code":"learn","agent":"daily_insight_worker","approval":false}
  ]'::jsonb,
  1,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  entity_types = EXCLUDED.entity_types,
  stages_json = EXCLUDED.stages_json,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active,
  updated_at = now();

DROP FUNCTION IF EXISTS ai_enqueue_content(TEXT, TEXT, JSONB, TEXT, SMALLINT);

CREATE OR REPLACE FUNCTION ai_enqueue_content(
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_input_json JSONB DEFAULT '{}',
  p_source_locale TEXT DEFAULT 'tr',
  p_priority INT DEFAULT 50
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_id UUID;
BEGIN
  SELECT id INTO v_item_id
  FROM ai_work_items
  WHERE workflow_code = 'universal_content_lifecycle'
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status IN ('queued','running','awaiting_approval')
  LIMIT 1;

  IF v_item_id IS NOT NULL THEN
    UPDATE ai_work_items
    SET input_json = input_json || coalesce(p_input_json, '{}'::jsonb),
        priority = greatest(priority, p_priority),
        updated_at = now()
    WHERE id = v_item_id;
    RETURN v_item_id;
  END IF;

  INSERT INTO ai_work_items
    (workflow_code, entity_type, entity_id, source_locale, priority, input_json)
  VALUES
    ('universal_content_lifecycle', p_entity_type, p_entity_id, p_source_locale, p_priority, coalesce(p_input_json, '{}'::jsonb))
  RETURNING id INTO v_item_id;

  INSERT INTO ai_work_item_steps
    (work_item_id, stage_code, stage_order, agent_code, status, requires_approval)
  VALUES
    (v_item_id, 'intake', 10, 'listing_quality_worker', 'queued', FALSE),
    (v_item_id, 'source_validation', 20, 'listing_quality_worker', 'waiting', FALSE),
    (v_item_id, 'tr_content', 30, 'listing_copy_agent', 'waiting', FALSE),
    (v_item_id, 'media', 40, 'image_agent', 'waiting', FALSE),
    (v_item_id, 'localization', 50, 'listing_translation_agent', 'waiting', FALSE),
    (v_item_id, 'multilingual_seo', 60, 'seo_content_agent', 'waiting', FALSE),
    (v_item_id, 'quality_gate', 70, 'supervisor', 'waiting', FALSE),
    (v_item_id, 'publish', 80, 'supervisor', 'waiting', TRUE),
    (v_item_id, 'distribution', 90, 'social_media_agent', 'waiting', TRUE),
    (v_item_id, 'learn', 100, 'daily_insight_worker', 'waiting', FALSE);

  INSERT INTO ai_event_outbox (event_type, entity_type, entity_id, dedupe_key, payload_json)
  VALUES ('content.workflow.queued', p_entity_type, p_entity_id, 'workflow:' || v_item_id::text, jsonb_build_object('work_item_id', v_item_id));

  RETURN v_item_id;
END;
$$;
