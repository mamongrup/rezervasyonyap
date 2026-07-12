-- AI yönetişimi: doğrulanmış bilgi, kalite kapısı, maliyet tahmini ve ajan sağlık görünümü.

CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'tr',
  source_type TEXT NOT NULL DEFAULT 'knowledge',
  source_ref TEXT,
  scope_json JSONB NOT NULL DEFAULT '{}',
  trust_level SMALLINT NOT NULL DEFAULT 80 CHECK (trust_level BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('draft','verified','retired')),
  checksum TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_verified
  ON ai_knowledge_sources (locale,trust_level DESC) WHERE status='verified';

CREATE TABLE IF NOT EXISTS ai_quality_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES ai_content_artifacts(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL REFERENCES ai_work_items(id) ON DELETE CASCADE,
  agent_code TEXT,
  score NUMERIC(5,2) NOT NULL,
  threshold NUMERIC(5,2) NOT NULL DEFAULT 85,
  passed BOOLEAN NOT NULL,
  checks_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artifact_id)
);

ALTER TABLE ai_jobs
  ADD COLUMN IF NOT EXISTS estimated_input_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_output_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0;

INSERT INTO ai_knowledge_sources (code,title,content,locale,source_type,source_ref,scope_json,trust_level,status,checksum,verified_at)
SELECT 'support-kb-'||a.id::text,t.title,t.body,l.code,'support_kb',a.id::text,'{"channels":["chat","content","support"]}'::jsonb,90,'verified',md5(t.title||coalesce(t.body,'')),now()
FROM support_kb_articles a JOIN support_kb_article_translations t ON t.article_id=a.id JOIN locales l ON l.id=t.locale_id
WHERE a.published=true
ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,locale=EXCLUDED.locale,checksum=EXCLUDED.checksum,status='verified',verified_at=now(),updated_at=now();

INSERT INTO ai_knowledge_sources (code,title,content,locale,source_type,scope_json,trust_level,status,checksum,verified_at)
SELECT 'policy-'||key,key,value_json::text,'tr','operating_policy','{"channels":["all"]}'::jsonb,100,'verified',md5(value_json::text),now()
FROM ai_operating_policies
ON CONFLICT (code) DO UPDATE SET content=EXCLUDED.content,checksum=EXCLUDED.checksum,status='verified',verified_at=now(),updated_at=now();

CREATE OR REPLACE FUNCTION ai_estimate_job_usage() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('succeeded','failed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.estimated_input_tokens := greatest(1,length(NEW.input_json::text)/4);
    NEW.estimated_output_tokens := greatest(0,length(coalesce(NEW.output_json::text,''))/4);
    NEW.estimated_cost_usd := round((NEW.estimated_input_tokens*0.0000003 + NEW.estimated_output_tokens*0.0000012)::numeric,6);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ai_estimate_job_usage ON ai_jobs;
CREATE TRIGGER trg_ai_estimate_job_usage BEFORE UPDATE OF status,output_json ON ai_jobs FOR EACH ROW EXECUTE FUNCTION ai_estimate_job_usage();

CREATE OR REPLACE FUNCTION ai_evaluate_artifact_quality() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE d JSONB; v_score NUMERIC := 100; v_checks JSONB; v_agent TEXT; v_threshold NUMERIC := 85;
BEGIN
  d := ai_artifact_payload(NEW.data_json);
  IF d='{}'::jsonb THEN v_score:=v_score-40; END IF;
  IF d ? 'warnings' AND jsonb_array_length(coalesce(d->'warnings','[]'::jsonb))>0 THEN v_score:=v_score-least(25,jsonb_array_length(d->'warnings')*5); END IF;
  IF d ? 'facts_preserved' AND coalesce((d->>'facts_preserved')::boolean,false)=false THEN v_score:=v_score-35; END IF;
  IF NEW.stage_code='tr_content' AND coalesce(nullif(d->>'title',''),nullif(d->>'description',''),nullif(d->>'body','')) IS NULL THEN v_score:=v_score-45; END IF;
  IF NEW.stage_code='localization' AND jsonb_typeof(d->'translations') IS DISTINCT FROM 'array' THEN v_score:=v_score-45; END IF;
  IF NEW.stage_code='multilingual_seo' AND jsonb_typeof(d->'seo') IS DISTINCT FROM 'array' THEN v_score:=v_score-45; END IF;
  v_score:=greatest(0,least(100,v_score));
  SELECT s.agent_code INTO v_agent FROM ai_work_item_steps s WHERE s.id=NEW.step_id;
  v_checks:=jsonb_build_object('valid_payload',d<>'{}'::jsonb,'warnings',coalesce(d->'warnings','[]'::jsonb),'stage',NEW.stage_code);
  INSERT INTO ai_quality_evaluations(artifact_id,work_item_id,agent_code,score,threshold,passed,checks_json)
  VALUES(NEW.id,NEW.work_item_id,v_agent,v_score,v_threshold,v_score>=v_threshold,v_checks)
  ON CONFLICT(artifact_id) DO UPDATE SET score=EXCLUDED.score,passed=EXCLUDED.passed,checks_json=EXCLUDED.checks_json,created_at=now();
  UPDATE ai_work_items SET quality_score=(SELECT avg(q.score) FROM ai_quality_evaluations q WHERE q.work_item_id=NEW.work_item_id),updated_at=now() WHERE id=NEW.work_item_id;
  IF v_score<v_threshold THEN
    UPDATE ai_work_item_steps SET status=CASE WHEN retry_count<max_retries THEN 'queued' ELSE 'failed' END,retry_count=retry_count+1,ai_job_id=NULL,error='quality_below_threshold:'||v_score::text,updated_at=now()
    WHERE id=NEW.step_id;
    UPDATE ai_content_artifacts SET status='invalid',error='quality_below_threshold:'||v_score::text,updated_at=now() WHERE id=NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ai_evaluate_artifact_quality ON ai_content_artifacts;
CREATE TRIGGER trg_ai_evaluate_artifact_quality AFTER INSERT OR UPDATE OF data_json ON ai_content_artifacts FOR EACH ROW EXECUTE FUNCTION ai_evaluate_artifact_quality();

CREATE OR REPLACE VIEW ai_agent_health AS
SELECT a.code,a.display_name,a.status,a.org_role,a.parent_code,
  (select count(*) from ai_jobs j where j.profile_code=a.feature_profile_code and j.created_at>now()-interval '24 hours') AS jobs_24h,
  (select count(*) from ai_jobs j where j.profile_code=a.feature_profile_code and j.status='succeeded' and j.created_at>now()-interval '24 hours') AS succeeded_24h,
  (select count(*) from ai_jobs j where j.profile_code=a.feature_profile_code and j.status='failed' and j.created_at>now()-interval '24 hours') AS failed_24h,
  coalesce((select round(avg(q.score),2) from ai_quality_evaluations q where q.agent_code=a.code and q.created_at>now()-interval '7 days'),0) AS quality_7d,
  coalesce((select sum(j.estimated_cost_usd) from ai_jobs j where j.profile_code=a.feature_profile_code and j.created_at>now()-interval '30 days'),0) AS cost_30d
FROM ai_agents a;
