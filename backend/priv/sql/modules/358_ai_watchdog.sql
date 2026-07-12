-- AI Watchdog: yarım/takılan işleri iyileştirir, sıradaki adımı ve AI job'unu hazırlar.

ALTER TABLE ai_work_item_steps
  ADD COLUMN IF NOT EXISTS ai_job_id UUID REFERENCES ai_jobs (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_work_item_steps_ai_job
  ON ai_work_item_steps (ai_job_id) WHERE ai_job_id IS NOT NULL;

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES
  ('content_intake_validator', 1, 'Sen içerik kabul ve doğrulama uzmanısın. Girdideki içerik türünü, eksik alanları, çelişkileri, doğrulanması gereken iddiaları, kişisel veri ve güvenlik risklerini denetle. Bilgi uydurma. Yalnızca JSON döndür: {"status":"ready|needs_data|blocked","missing":[],"conflicts":[],"risks":[],"next_action":""}.', 0.20),
  ('content_performance_analyst', 1, 'Sen içerik performans analistisin. Verilen ölçümlerden görüntülenme, tıklama, lead ve dönüşüm sapmalarını değerlendir. Veri yoksa bunu açıkça belirt. Yalnızca JSON döndür: {"status":"ok|needs_attention","insights":[],"actions":[],"measurement_gaps":[]}.', 0.25)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;

UPDATE ai_agents SET feature_profile_code = 'content_intake_validator', mode = 'draft_only', status = 'active', updated_at = now()
WHERE code = 'listing_quality_worker';

UPDATE ai_agents SET feature_profile_code = 'image_enhance_prompt', mode = 'draft_only', status = 'active', updated_at = now()
WHERE code = 'image_agent';

UPDATE ai_agents SET feature_profile_code = 'content_performance_analyst', mode = 'draft_only', status = 'active', updated_at = now()
WHERE code = 'daily_insight_worker';

CREATE OR REPLACE FUNCTION ai_watchdog_tick() RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id UUID;
  v_recovered INT := 0;
  v_completed INT := 0;
  v_promoted INT := 0;
  v_approvals INT := 0;
BEGIN
  -- Uzun süredir running kalan genel AI işlerini başarısız say; adım retry akışına girsin.
  UPDATE ai_jobs
  SET status = 'failed', error = 'watchdog_stale_timeout', finished_at = now()
  WHERE status = 'running' AND created_at < now() - interval '45 minutes';

  -- Başarılı AI job çıktısını workflow adımına aktar.
  UPDATE ai_work_item_steps s
  SET status = 'completed', output_json = coalesce(j.output_json, '{}'::jsonb), completed_at = now(), error = NULL, updated_at = now()
  FROM ai_jobs j
  WHERE s.ai_job_id = j.id AND s.status = 'running' AND j.status = 'succeeded';
  GET DIAGNOSTICS v_completed = ROW_COUNT;

  -- Başarısız işi retry limitine göre yeniden kuyruğa al veya kalıcı olarak kapat.
  UPDATE ai_work_item_steps s
  SET status = CASE WHEN s.retry_count < s.max_retries THEN 'queued' ELSE 'failed' END,
      retry_count = CASE WHEN s.retry_count < s.max_retries THEN s.retry_count + 1 ELSE s.retry_count END,
      ai_job_id = CASE WHEN s.retry_count < s.max_retries THEN NULL ELSE s.ai_job_id END,
      error = j.error,
      updated_at = now()
  FROM ai_jobs j
  WHERE s.ai_job_id = j.id AND s.status = 'running' AND j.status = 'failed';
  GET DIAGNOSTICS v_recovered = ROW_COUNT;

  -- Retry hakkı biten işler sessiz kalmasın; yalnızca çözülemeyen istisna sahibin kuyruğuna gelsin.
  INSERT INTO ai_agent_recommendations
    (agent_code, kind, target_key, title, reason, payload_json, status)
  SELECT 'supervisor', 'workflow_failure', s.id::text,
         'AI işi müdahale bekliyor: ' || s.stage_code,
         coalesce(s.error, 'Ajan adımı yeniden denemelere rağmen tamamlanamadı.'),
         jsonb_build_object('work_item_id', w.id, 'step_id', s.id, 'entity_type', w.entity_type, 'entity_id', w.entity_id, 'stage', s.stage_code, 'retry_count', s.retry_count),
         'pending'
  FROM ai_work_item_steps s JOIN ai_work_items w ON w.id=s.work_item_id
  WHERE s.status='failed'
  ON CONFLICT DO NOTHING;

  -- Onaylanan workflow önerilerini adım onayına dönüştür.
  UPDATE ai_work_item_steps s
  SET status = 'approved', completed_at = now(), updated_at = now()
  FROM ai_agent_recommendations r
  WHERE r.kind = 'workflow_step' AND r.target_key = s.id::text
    AND r.status IN ('approved','applied') AND s.status = 'awaiting_approval';

  -- Önceki adımları biten sıradaki waiting adımı ilerlet.
  WITH ready AS (
    SELECT s.id, s.requires_approval
    FROM ai_work_item_steps s
    JOIN ai_work_items w ON w.id = s.work_item_id
    WHERE s.status = 'waiting' AND w.status IN ('queued','running','awaiting_approval')
      AND NOT EXISTS (
        SELECT 1 FROM ai_work_item_steps p
        WHERE p.work_item_id = s.work_item_id AND p.stage_order < s.stage_order
          AND p.status NOT IN ('completed','approved','skipped')
      )
  )
  UPDATE ai_work_item_steps s
  SET status = CASE WHEN ready.requires_approval THEN 'awaiting_approval' ELSE 'queued' END, updated_at = now()
  FROM ready WHERE s.id = ready.id;
  GET DIAGNOSTICS v_promoted = ROW_COUNT;

  -- Onay bekleyen her adım için tek bir yönetici önerisi oluştur.
  INSERT INTO ai_agent_recommendations
    (agent_code, kind, target_key, title, reason, payload_json, status)
  SELECT coalesce(s.agent_code, 'supervisor'), 'workflow_step', s.id::text,
         'AI iş akışı onayı: ' || s.stage_code,
         w.entity_type || ' içeriğinin ' || s.stage_code || ' aşaması insan onayı gerektiriyor.',
         jsonb_build_object('work_item_id', w.id, 'step_id', s.id, 'entity_type', w.entity_type, 'entity_id', w.entity_id, 'stage', s.stage_code),
         'pending'
  FROM ai_work_item_steps s JOIN ai_work_items w ON w.id = s.work_item_id
  WHERE s.status = 'awaiting_approval'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_approvals = ROW_COUNT;

  -- Work item durumunu mevcut aktif adıma göre güncelle.
  UPDATE ai_work_items w
  SET status = CASE
        WHEN EXISTS (SELECT 1 FROM ai_work_item_steps s WHERE s.work_item_id=w.id AND s.status='failed') THEN 'failed'
        WHEN EXISTS (SELECT 1 FROM ai_work_item_steps s WHERE s.work_item_id=w.id AND s.status='awaiting_approval') THEN 'awaiting_approval'
        WHEN NOT EXISTS (SELECT 1 FROM ai_work_item_steps s WHERE s.work_item_id=w.id AND s.status NOT IN ('completed','approved','skipped')) THEN 'completed'
        ELSE 'running' END,
      current_stage = coalesce((SELECT s.stage_code FROM ai_work_item_steps s WHERE s.work_item_id=w.id AND s.status IN ('queued','running','awaiting_approval') ORDER BY s.stage_order LIMIT 1), current_stage),
      started_at = coalesce(started_at, now()),
      completed_at = CASE WHEN NOT EXISTS (SELECT 1 FROM ai_work_item_steps s WHERE s.work_item_id=w.id AND s.status NOT IN ('completed','approved','skipped')) THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE w.status IN ('queued','running','awaiting_approval');

  -- Tek tick'te sıradaki bir güvenli adımı ai_jobs kuyruğuna bağla.
  WITH candidate AS (
    SELECT s.id, s.work_item_id, s.stage_code, a.feature_profile_code, w.entity_type, w.entity_id, w.source_locale, w.input_json, w.context_json,
      coalesce((SELECT jsonb_object_agg(p.stage_code,p.output_json) FROM ai_work_item_steps p WHERE p.work_item_id=w.id AND p.status IN ('completed','approved')), '{}'::jsonb) AS previous_outputs,
      coalesce((SELECT jsonb_agg(jsonb_build_object('code',k.code,'title',k.title,'content',k.content,'trust',k.trust_level)) FROM (SELECT * FROM ai_knowledge_sources WHERE status='verified' AND locale IN (w.source_locale,'tr') ORDER BY trust_level DESC,updated_at DESC LIMIT 8) k), '[]'::jsonb) AS knowledge_context
    FROM ai_work_item_steps s
    JOIN ai_work_items w ON w.id=s.work_item_id
    JOIN ai_agents a ON a.code=s.agent_code
    WHERE s.status='queued' AND s.ai_job_id IS NULL
      AND a.status='active' AND a.feature_profile_code IS NOT NULL
    ORDER BY w.priority DESC, w.created_at, s.stage_order
    LIMIT 1 FOR UPDATE OF s SKIP LOCKED
  ), new_job AS (
    INSERT INTO ai_jobs (profile_code, input_json, status)
    SELECT feature_profile_code,
      jsonb_build_object('work_item_id', work_item_id, 'work_item_step_id', id, 'stage', stage_code, 'entity_type', entity_type, 'entity_id', entity_id, 'locale', source_locale, 'content', input_json, 'context', context_json, 'previous_outputs', previous_outputs, 'verified_knowledge', knowledge_context),
      'queued'
    FROM candidate RETURNING id
  )
  UPDATE ai_work_item_steps s
  SET ai_job_id = new_job.id, status='running', started_at=now(), updated_at=now()
  FROM candidate, new_job WHERE s.id=candidate.id
  RETURNING new_job.id INTO v_job_id;

  RETURN jsonb_build_object('job_id', v_job_id, 'completed_steps', v_completed, 'recovered_steps', v_recovered, 'promoted_steps', v_promoted, 'new_approvals', v_approvals)::text;
END;
$$;

CREATE OR REPLACE FUNCTION ai_watchdog_tick_job_id() RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT coalesce((ai_watchdog_tick()::jsonb ->> 'job_id'), '');
$$;
