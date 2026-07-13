-- AI Operations Supervisor: health, circuit breaker, incident grouping and executive digest.

CREATE TABLE IF NOT EXISTS ai_agent_runtime_state (
  agent_code TEXT PRIMARY KEY REFERENCES ai_agents(code) ON DELETE CASCADE,
  health_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (health_status IN ('healthy','idle','degraded','half_open','quarantined','paused')),
  consecutive_failures INT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  circuit_open_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_operations_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  agent_code TEXT REFERENCES ai_agents(code) ON DELETE SET NULL,
  profile_code TEXT,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','monitoring','resolved')),
  title TEXT NOT NULL,
  last_error TEXT NOT NULL DEFAULT '',
  occurrence_count INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ai_operations_incidents_open
  ON ai_operations_incidents(status,severity,last_seen_at DESC);

CREATE TABLE IF NOT EXISTS ai_executive_digests (
  digest_date DATE PRIMARY KEY,
  summary_json JSONB NOT NULL DEFAULT '{}',
  requires_attention BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_operations_policy (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  daily_cost_limit_usd NUMERIC(12,4) NOT NULL DEFAULT 50,
  max_jobs_per_hour INT NOT NULL DEFAULT 500,
  quarantine_after_failures INT NOT NULL DEFAULT 8,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO ai_operations_policy(singleton) VALUES(TRUE) ON CONFLICT(singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION ai_record_job_runtime() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE v_error TEXT := left(coalesce(NEW.error,'unknown_error'),1000);
BEGIN
  IF NEW.status NOT IN ('succeeded','failed') OR OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  INSERT INTO ai_agent_runtime_state
    (agent_code,health_status,consecutive_failures,last_seen_at,last_success_at,last_failure_at,last_error,circuit_open_until)
  SELECT a.code,CASE WHEN NEW.status='succeeded' THEN 'healthy' ELSE 'degraded' END,
    CASE WHEN NEW.status='succeeded' THEN 0 ELSE 1 END,now(),
    CASE WHEN NEW.status='succeeded' THEN now() END,CASE WHEN NEW.status='failed' THEN now() END,
    CASE WHEN NEW.status='failed' THEN v_error END,CASE WHEN NEW.status='failed' THEN now()+interval '5 minutes' END
  FROM ai_agents a WHERE a.feature_profile_code=NEW.profile_code
  ON CONFLICT(agent_code) DO UPDATE SET
    health_status=CASE WHEN NEW.status='succeeded' THEN 'healthy' WHEN ai_agent_runtime_state.consecutive_failures+1>=8 THEN 'quarantined' ELSE 'degraded' END,
    consecutive_failures=CASE WHEN NEW.status='succeeded' THEN 0 ELSE ai_agent_runtime_state.consecutive_failures+1 END,
    last_seen_at=now(),
    last_success_at=CASE WHEN NEW.status='succeeded' THEN now() ELSE ai_agent_runtime_state.last_success_at END,
    last_failure_at=CASE WHEN NEW.status='failed' THEN now() ELSE ai_agent_runtime_state.last_failure_at END,
    last_error=CASE WHEN NEW.status='succeeded' THEN NULL ELSE v_error END,
    circuit_open_until=CASE WHEN NEW.status='succeeded' THEN NULL
      WHEN ai_agent_runtime_state.consecutive_failures+1>=8 THEN now()+interval '6 hours'
      WHEN ai_agent_runtime_state.consecutive_failures+1>=5 THEN now()+interval '1 hour'
      WHEN ai_agent_runtime_state.consecutive_failures+1>=3 THEN now()+interval '15 minutes'
      ELSE now()+interval '5 minutes' END,updated_at=now();

  UPDATE ai_agents SET last_run_at=now(),updated_at=now() WHERE feature_profile_code=NEW.profile_code;

  IF NEW.status='failed' THEN
    INSERT INTO ai_operations_incidents(fingerprint,agent_code,profile_code,severity,title,last_error,metadata_json)
    SELECT md5(NEW.profile_code||':'||lower(regexp_replace(v_error,'[0-9a-f-]{16,}','{id}','g'))),a.code,NEW.profile_code,
      CASE WHEN coalesce(r.consecutive_failures,0)>=8 THEN 'critical' ELSE 'warning' END,
      a.display_name||' islem hatasi',v_error,jsonb_build_object('job_id',NEW.id)
    FROM ai_agents a LEFT JOIN ai_agent_runtime_state r ON r.agent_code=a.code WHERE a.feature_profile_code=NEW.profile_code
    ON CONFLICT(fingerprint) DO UPDATE SET status='open',severity=EXCLUDED.severity,last_error=EXCLUDED.last_error,
      occurrence_count=ai_operations_incidents.occurrence_count+1,last_seen_at=now(),resolved_at=NULL,metadata_json=EXCLUDED.metadata_json;
  ELSE
    UPDATE ai_operations_incidents SET status='resolved',resolved_at=now(),last_seen_at=now()
    WHERE status IN ('open','monitoring') AND agent_code IN (SELECT code FROM ai_agents WHERE feature_profile_code=NEW.profile_code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_record_job_runtime ON ai_jobs;
CREATE TRIGGER trg_ai_record_job_runtime AFTER UPDATE OF status,error ON ai_jobs FOR EACH ROW EXECUTE FUNCTION ai_record_job_runtime();

CREATE OR REPLACE FUNCTION ai_ops_supervisor_tick() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE v_digest JSONB; v_attention BOOLEAN; v_critical INT; v_degraded INT;
BEGIN
  INSERT INTO ai_agent_runtime_state(agent_code,health_status)
  SELECT code,CASE WHEN status='active' THEN 'idle' ELSE 'paused' END FROM ai_agents ON CONFLICT(agent_code) DO NOTHING;
  UPDATE ai_agent_runtime_state r SET health_status=CASE WHEN a.status<>'active' THEN 'paused'
      WHEN r.circuit_open_until<=now() AND r.health_status IN ('degraded','quarantined') THEN 'half_open'
      WHEN r.last_seen_at IS NULL THEN 'idle' ELSE r.health_status END,
    circuit_open_until=CASE WHEN r.circuit_open_until<=now() THEN NULL ELSE r.circuit_open_until END,updated_at=now()
  FROM ai_agents a WHERE a.code=r.agent_code;
  SELECT count(*) INTO v_critical FROM ai_operations_incidents WHERE status='open' AND severity='critical';
  SELECT count(*) INTO v_degraded FROM ai_agent_runtime_state WHERE health_status IN ('degraded','half_open','quarantined');
  v_attention := v_critical>0 OR EXISTS(SELECT 1 FROM ai_work_items WHERE status='failed' AND updated_at>now()-interval '24 hours');
  v_digest := jsonb_build_object('date',current_date,'critical_incidents',v_critical,'degraded_agents',v_degraded,
    'jobs_24h',(SELECT count(*) FROM ai_jobs WHERE created_at>now()-interval '24 hours'),
    'failed_jobs_24h',(SELECT count(*) FROM ai_jobs WHERE status='failed' AND created_at>now()-interval '24 hours'),
    'awaiting_approval',(SELECT count(*) FROM ai_work_items WHERE status='awaiting_approval'),
    'estimated_cost_today',coalesce((SELECT round(sum(estimated_cost_usd),4) FROM ai_jobs WHERE created_at>=current_date),0),
    'estimated_cost_30d',coalesce((SELECT round(sum(estimated_cost_usd),4) FROM ai_jobs WHERE created_at>now()-interval '30 days'),0),
    'daily_cost_limit_usd',(SELECT daily_cost_limit_usd FROM ai_operations_policy WHERE singleton));
  INSERT INTO ai_executive_digests(digest_date,summary_json,requires_attention) VALUES(current_date,v_digest,v_attention)
  ON CONFLICT(digest_date) DO UPDATE SET summary_json=EXCLUDED.summary_json,requires_attention=EXCLUDED.requires_attention,updated_at=now();
  INSERT INTO ai_agent_recommendations(agent_code,kind,target_key,title,reason,payload_json,status)
  SELECT 'chief_ai_officer','operations_incident',i.id::text,'AI Operasyon Amiri: mudahale gerekiyor',i.title||': '||i.last_error,
    jsonb_build_object('incident_id',i.id,'agent_code',i.agent_code,'occurrences',i.occurrence_count),'pending'
  FROM ai_operations_incidents i WHERE i.status='open' AND i.severity='critical' ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('critical',v_critical,'degraded',v_degraded,'requires_attention',v_attention)::text;
END;
$$;

-- Strengthen module-362 quality scoring with source truth and rendering hygiene.
-- Encoded HTML fragments such as &nbsp; must never reach the live catalogue.
CREATE OR REPLACE FUNCTION ai_evaluate_artifact_quality() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  d JSONB;
  v_score NUMERIC := 100;
  v_checks JSONB;
  v_agent TEXT;
  v_threshold NUMERIC := 85;
  v_has_entities BOOLEAN;
  v_source_ready BOOLEAN := TRUE;
BEGIN
  d := ai_artifact_payload(NEW.data_json);
  v_has_entities := d::text ~* '&(nbsp|amp|lt|gt|quot|#160);';
  IF d='{}'::jsonb THEN v_score:=v_score-40; END IF;
  IF v_has_entities THEN v_score:=v_score-45; END IF;
  IF d ? 'warnings' AND jsonb_typeof(d->'warnings')='array' AND jsonb_array_length(d->'warnings')>0 THEN
    v_score:=v_score-least(25,jsonb_array_length(d->'warnings')*5);
  END IF;
  IF d ? 'facts_preserved' AND coalesce((d->>'facts_preserved')::boolean,false)=false THEN v_score:=v_score-35; END IF;
  IF NEW.stage_code='source_validation' THEN
    v_source_ready := coalesce(d->>'status','blocked')='ready'
      AND jsonb_array_length(CASE WHEN jsonb_typeof(d->'missing')='array' THEN d->'missing' ELSE '[]'::jsonb END)=0
      AND jsonb_array_length(CASE WHEN jsonb_typeof(d->'conflicts')='array' THEN d->'conflicts' ELSE '[]'::jsonb END)=0
      AND jsonb_array_length(CASE WHEN jsonb_typeof(d->'risks')='array' THEN d->'risks' ELSE '[]'::jsonb END)=0;
    IF NOT v_source_ready THEN v_score:=0; END IF;
  END IF;
  IF NEW.stage_code='tr_content' AND coalesce(nullif(d->>'title',''),nullif(d->>'description',''),nullif(d->>'body','')) IS NULL THEN v_score:=v_score-45; END IF;
  IF NEW.stage_code='localization' AND jsonb_typeof(d->'translations') IS DISTINCT FROM 'array' THEN v_score:=v_score-45; END IF;
  IF NEW.stage_code='multilingual_seo' AND jsonb_typeof(d->'seo') IS DISTINCT FROM 'array' THEN v_score:=v_score-45; END IF;
  v_score:=greatest(0,least(100,v_score));
  SELECT s.agent_code INTO v_agent FROM ai_work_item_steps s WHERE s.id=NEW.step_id;
  v_checks:=jsonb_build_object('valid_payload',d<>'{}'::jsonb,'html_entities_clean',NOT v_has_entities,
    'source_ready',v_source_ready,'warnings',coalesce(d->'warnings','[]'::jsonb),'stage',NEW.stage_code);
  INSERT INTO ai_quality_evaluations(artifact_id,work_item_id,agent_code,score,threshold,passed,checks_json)
  VALUES(NEW.id,NEW.work_item_id,v_agent,v_score,v_threshold,v_score>=v_threshold,v_checks)
  ON CONFLICT(artifact_id) DO UPDATE SET score=EXCLUDED.score,passed=EXCLUDED.passed,checks_json=EXCLUDED.checks_json,created_at=now();
  UPDATE ai_work_items SET quality_score=(SELECT avg(q.score) FROM ai_quality_evaluations q WHERE q.work_item_id=NEW.work_item_id),updated_at=now() WHERE id=NEW.work_item_id;
  IF v_score<v_threshold THEN
    UPDATE ai_work_item_steps SET status=CASE WHEN retry_count<max_retries THEN 'queued' ELSE 'failed' END,
      retry_count=retry_count+1,ai_job_id=NULL,error='quality_below_threshold:'||v_score::text,updated_at=now()
    WHERE id=NEW.step_id;
    UPDATE ai_content_artifacts SET status='invalid',error='quality_below_threshold:'||v_score::text,updated_at=now() WHERE id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- A live publish requires a passing source-validation artifact and no failed quality check.
CREATE OR REPLACE FUNCTION ai_apply_on_publish_approval() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE v_bad INT; v_validation_status TEXT;
BEGIN
  IF NEW.stage_code='publish' AND NEW.status='approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT count(*) INTO v_bad FROM ai_quality_evaluations WHERE work_item_id=NEW.work_item_id AND passed=false;
    SELECT ai_artifact_payload(data_json)->>'status' INTO v_validation_status FROM ai_content_artifacts
    WHERE work_item_id=NEW.work_item_id AND stage_code='source_validation' ORDER BY created_at DESC LIMIT 1;
    IF v_bad>0 OR coalesce(v_validation_status,'blocked')<>'ready' THEN
      RAISE EXCEPTION 'ai_publish_gate_blocked: quality_failed=%, source_validation=%',v_bad,coalesce(v_validation_status,'missing');
    END IF;
    PERFORM ai_apply_work_item_artifacts(NEW.work_item_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ai_apply_on_publish_approval ON ai_work_item_steps;
CREATE TRIGGER trg_ai_apply_on_publish_approval BEFORE UPDATE OF status ON ai_work_item_steps
FOR EACH ROW EXECUTE FUNCTION ai_apply_on_publish_approval();

-- Existing installations have the shorter module-362 view. PostgreSQL does not
-- allow columns to be inserted into CREATE OR REPLACE VIEW, so rebuild safely.
DROP VIEW IF EXISTS ai_agent_health;
CREATE VIEW ai_agent_health AS
SELECT a.code,a.display_name,a.status,a.org_role,a.parent_code,
  coalesce(r.health_status,CASE WHEN a.status='active' THEN 'idle' ELSE 'paused' END) AS health_status,
  coalesce(r.consecutive_failures,0) AS consecutive_failures,r.last_seen_at,r.last_success_at,r.last_failure_at,r.circuit_open_until,
  (SELECT count(*) FROM ai_jobs j WHERE j.profile_code=a.feature_profile_code AND j.created_at>now()-interval '24 hours') AS jobs_24h,
  (SELECT count(*) FROM ai_jobs j WHERE j.profile_code=a.feature_profile_code AND j.status='succeeded' AND j.created_at>now()-interval '24 hours') AS succeeded_24h,
  (SELECT count(*) FROM ai_jobs j WHERE j.profile_code=a.feature_profile_code AND j.status='failed' AND j.created_at>now()-interval '24 hours') AS failed_24h,
  coalesce((SELECT round(avg(q.score),2) FROM ai_quality_evaluations q WHERE q.agent_code=a.code AND q.created_at>now()-interval '7 days'),0) AS quality_7d,
  coalesce((SELECT sum(j.estimated_cost_usd) FROM ai_jobs j WHERE j.profile_code=a.feature_profile_code AND j.created_at>now()-interval '30 days'),0) AS cost_30d
FROM ai_agents a LEFT JOIN ai_agent_runtime_state r ON r.agent_code=a.code;

SELECT ai_ops_supervisor_tick();
