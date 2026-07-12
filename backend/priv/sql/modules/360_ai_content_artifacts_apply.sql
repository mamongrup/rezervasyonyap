-- AI çıktılarının canlı içeriğe güvenli uygulanması: önce artefakt, sonra izinli alan adaptörü.

CREATE TABLE IF NOT EXISTS ai_content_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES ai_work_items (id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES ai_work_item_steps (id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  stage_code TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'tr',
  data_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','applied','rejected','invalid')),
  applied_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (step_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_ai_content_artifacts_work
  ON ai_content_artifacts (work_item_id, status, stage_code);

CREATE TABLE IF NOT EXISTS content_localized_seo (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  title TEXT,
  meta_title TEXT,
  meta_description TEXT,
  slug TEXT,
  structured_data_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id, locale)
);

CREATE OR REPLACE FUNCTION ai_harvest_step_artifact() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.output_json <> '{}'::jsonb THEN
    INSERT INTO ai_content_artifacts (work_item_id,step_id,entity_type,entity_id,stage_code,locale,data_json)
    SELECT NEW.work_item_id,NEW.id,w.entity_type,w.entity_id,NEW.stage_code,w.source_locale,NEW.output_json
    FROM ai_work_items w WHERE w.id=NEW.work_item_id
    ON CONFLICT (step_id,locale) DO UPDATE SET data_json=EXCLUDED.data_json,status='draft',updated_at=now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_harvest_step_artifact ON ai_work_item_steps;
CREATE TRIGGER trg_ai_harvest_step_artifact AFTER UPDATE OF status,output_json ON ai_work_item_steps
FOR EACH ROW EXECUTE FUNCTION ai_harvest_step_artifact();

CREATE OR REPLACE FUNCTION ai_artifact_payload(p JSONB) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p ? 'text' THEN
    BEGIN RETURN (p->>'text')::jsonb; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('body',p->>'text'); END;
  END IF;
  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION ai_apply_work_item_artifacts(p_work_item_id UUID) RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
  a RECORD; d JSONB; v_locale_id SMALLINT; v_count INT := 0; tr_id SMALLINT;
BEGIN
  SELECT id INTO tr_id FROM locales WHERE lower(code)='tr' LIMIT 1;
  PERFORM set_config('app.ai_apply','1',TRUE);

  FOR a IN SELECT * FROM ai_content_artifacts WHERE work_item_id=p_work_item_id AND status='draft' ORDER BY created_at LOOP
    d := ai_artifact_payload(a.data_json);
    BEGIN
      IF a.stage_code='tr_content' AND a.entity_type='listing' THEN
        UPDATE listing_translations SET
          title=coalesce(nullif(d->>'title',''),title),
          description=coalesce(nullif(d->>'description',''),nullif(d->>'body',''),description)
        WHERE listing_id=a.entity_id::uuid AND locale_id=tr_id;
      ELSIF a.stage_code='tr_content' AND a.entity_type='blog' THEN
        UPDATE blog_post_translations SET
          title=coalesce(nullif(d->>'title',''),title), body=coalesce(nullif(d->>'body',''),body), excerpt=coalesce(nullif(d->>'excerpt',''),excerpt)
        WHERE post_id=a.entity_id::uuid AND locale_id=tr_id;
      ELSIF a.stage_code='multilingual_seo' THEN
        INSERT INTO content_localized_seo (entity_type,entity_id,locale,title,meta_title,meta_description,slug,structured_data_json)
        SELECT a.entity_type,a.entity_id,coalesce(nullif(x->>'locale',''),'tr'),x->>'title',x->>'meta_title',x->>'meta_description',x->>'slug',coalesce(x->'structured_data','{}'::jsonb)
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(d->'seo')='array' THEN d->'seo' ELSE jsonb_build_array(d) END) x
        ON CONFLICT (entity_type,entity_id,locale) DO UPDATE SET title=EXCLUDED.title,meta_title=EXCLUDED.meta_title,meta_description=EXCLUDED.meta_description,slug=EXCLUDED.slug,structured_data_json=EXCLUDED.structured_data_json,updated_at=now();
      ELSIF a.stage_code='localization' AND jsonb_typeof(d->'translations')='array' THEN
        IF a.entity_type='listing' THEN
          INSERT INTO listing_translations (listing_id,locale_id,title,description)
          SELECT a.entity_id::uuid,l.id,x->>'title',nullif(coalesce(x->>'description',x->>'body'),'')
          FROM jsonb_array_elements(d->'translations') x JOIN locales l ON lower(l.code)=lower(x->>'locale')
          WHERE nullif(x->>'title','') IS NOT NULL
          ON CONFLICT (listing_id,locale_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description;
        ELSIF a.entity_type='blog' THEN
          INSERT INTO blog_post_translations (post_id,locale_id,title,body,excerpt)
          SELECT a.entity_id::uuid,l.id,x->>'title',nullif(x->>'body',''),nullif(x->>'excerpt','')
          FROM jsonb_array_elements(d->'translations') x JOIN locales l ON lower(l.code)=lower(x->>'locale')
          WHERE nullif(x->>'title','') IS NOT NULL
          ON CONFLICT (post_id,locale_id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,excerpt=EXCLUDED.excerpt;
        END IF;
      END IF;
      UPDATE ai_content_artifacts SET status='applied',applied_at=now(),updated_at=now(),error=NULL WHERE id=a.id;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE ai_content_artifacts SET status='invalid',error=SQLERRM,updated_at=now() WHERE id=a.id;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION ai_apply_on_publish_approval() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage_code='publish' AND NEW.status='approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM ai_apply_work_item_artifacts(NEW.work_item_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_apply_on_publish_approval ON ai_work_item_steps;
CREATE TRIGGER trg_ai_apply_on_publish_approval AFTER UPDATE OF status ON ai_work_item_steps
FOR EACH ROW EXECUTE FUNCTION ai_apply_on_publish_approval();
