-- AI Autopilot: discovers safe work, advances low-risk approvals and keeps the
-- specialist workforce busy without requiring the management panel to be open.
--
-- Financial, contractual, refund, reservation and external-publication actions
-- remain behind their existing policy/guard rails.

CREATE TABLE IF NOT EXISTS ai_autopilot_policy (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  discovery_batch_size INT NOT NULL DEFAULT 12 CHECK (discovery_batch_size BETWEEN 1 AND 100),
  max_open_work_items INT NOT NULL DEFAULT 250 CHECK (max_open_work_items BETWEEN 1 AND 5000),
  rediscovery_cooldown INTERVAL NOT NULL DEFAULT interval '7 days',
  auto_apply_verified_content BOOLEAN NOT NULL DEFAULT TRUE,
  auto_skip_external_distribution BOOLEAN NOT NULL DEFAULT TRUE,
  last_tick_at TIMESTAMPTZ,
  last_result_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ai_autopilot_policy (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

UPDATE ai_operating_policies
SET value_json = value_json || jsonb_build_object(
      'default', 'auto_low_risk',
      'auto_low_risk', TRUE,
      'auto_publish_verified_content', TRUE,
      'money', FALSE,
      'price', FALSE,
      'refund', FALSE,
      'contract', FALSE,
      'bulk_message', FALSE,
      'publish_external', FALSE
    ),
    description = 'Doğrulanmış ve kalite kapısını geçen düşük riskli içerik otomatik uygulanır; finansal, hukuki, rezervasyon ve dış yayın kararları korumalıdır.',
    updated_at = now()
WHERE key = 'autonomy';

CREATE OR REPLACE FUNCTION ai_autopilot_tick() RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  p ai_autopilot_policy%ROWTYPE;
  v_open INT := 0;
  v_capacity INT := 0;
  v_discovered INT := 0;
  v_auto_applied INT := 0;
  v_distribution_skipped INT := 0;
  v_result JSONB;
  listing_row RECORD;
BEGIN
  SELECT * INTO p FROM ai_autopilot_policy WHERE singleton FOR UPDATE;
  IF NOT FOUND OR NOT p.enabled THEN
    RETURN '{"enabled":false}'::jsonb::text;
  END IF;

  -- Serialize discovery even if more than one worker timer fires.
  IF NOT pg_try_advisory_xact_lock(hashtext('travel.ai.autopilot.tick')) THEN
    RETURN '{"enabled":true,"busy":true}'::jsonb::text;
  END IF;

  SELECT count(*) INTO v_open
  FROM ai_work_items
  WHERE status IN ('queued','running','awaiting_approval');
  v_capacity := greatest(0, least(p.discovery_batch_size, p.max_open_work_items - v_open));

  -- Find listings that are missing a complete active-locale storefront package.
  -- The full current source is supplied so workers never have to invent facts.
  IF v_capacity > 0 THEN
    FOR listing_row IN
      SELECT
        l.id,
        jsonb_build_object(
          'discovery_reason', 'missing_or_stale_storefront_content',
          'listing', to_jsonb(l),
          'category_code', pc.code,
          'translations', coalesce((
            SELECT jsonb_agg(
              jsonb_build_object(
                'locale', loc.code,
                'title', lt.title,
                'description', lt.description
              )
              ORDER BY loc.code
            )
            FROM listing_translations lt
            JOIN locales loc ON loc.id = lt.locale_id
            WHERE lt.listing_id = l.id
          ), '[]'::jsonb)
        ) AS payload
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id
      WHERE l.status IN ('draft','published')
        AND (
          (
            SELECT count(*)
            FROM locales loc
            WHERE loc.is_active
              AND EXISTS (
                SELECT 1
                FROM listing_translations lt
                WHERE lt.listing_id = l.id
                  AND lt.locale_id = loc.id
                  AND nullif(trim(lt.title), '') IS NOT NULL
                  AND nullif(trim(coalesce(lt.description, '')), '') IS NOT NULL
              )
          ) < (SELECT count(*) FROM locales WHERE is_active)
          OR (
            SELECT count(DISTINCT seo.locale)
            FROM content_localized_seo seo
            JOIN locales loc ON lower(loc.code) = lower(seo.locale) AND loc.is_active
            WHERE seo.entity_type = 'listing' AND seo.entity_id = l.id::text
          ) < (SELECT count(*) FROM locales WHERE is_active)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM ai_work_items w
          WHERE w.workflow_code = 'universal_content_lifecycle'
            AND w.entity_type = 'listing'
            AND w.entity_id = l.id::text
            AND (
              w.status IN ('queued','running','awaiting_approval')
              OR (w.status = 'completed' AND w.completed_at > now() - p.rediscovery_cooldown)
            )
        )
      ORDER BY
        CASE WHEN l.status = 'published' THEN 0 ELSE 1 END,
        l.updated_at DESC,
        l.id
      LIMIT v_capacity
    LOOP
      PERFORM ai_enqueue_content(
        'listing',
        listing_row.id::text,
        listing_row.payload,
        'tr',
        65
      );
      v_discovered := v_discovered + 1;
    END LOOP;
  END IF;

  -- A verified content package is reversible through ai_content_versions.
  -- Approving this step invokes the existing quality/source gate and artifact
  -- apply trigger; unsafe work therefore cannot pass this update.
  IF p.auto_apply_verified_content THEN
    WITH eligible AS (
      SELECT s.id
      FROM ai_work_item_steps s
      JOIN ai_work_items w ON w.id = s.work_item_id
      WHERE w.workflow_code = 'universal_content_lifecycle'
        AND s.stage_code = 'publish'
        AND s.status = 'awaiting_approval'
        AND coalesce(w.quality_score, 0) >= 85
        AND NOT EXISTS (
          SELECT 1 FROM ai_quality_evaluations q
          WHERE q.work_item_id = w.id AND NOT q.passed
        )
        AND EXISTS (
          SELECT 1
          FROM ai_content_artifacts a
          WHERE a.work_item_id = w.id
            AND a.stage_code = 'source_validation'
            AND ai_artifact_payload(a.data_json)->>'status' = 'ready'
        )
      ORDER BY w.priority DESC, w.created_at
      LIMIT p.discovery_batch_size
      FOR UPDATE OF s SKIP LOCKED
    )
    UPDATE ai_work_item_steps s
    SET status = 'approved',
        completed_at = now(),
        error = NULL,
        updated_at = now()
    FROM eligible
    WHERE s.id = eligible.id;
    GET DIAGNOSTICS v_auto_applied = ROW_COUNT;

    UPDATE ai_agent_recommendations r
    SET status = 'applied',
        review_note = 'Autopilot: doğrulanmış düşük riskli içerik kalite kapısından geçti.',
        reviewed_at = now(),
        applied_at = now(),
        updated_at = now()
    FROM ai_work_item_steps s
    WHERE r.kind = 'workflow_step'
      AND r.target_key = s.id::text
      AND s.stage_code = 'publish'
      AND s.status = 'approved'
      AND r.status = 'pending';
  END IF;

  -- External social distribution stays disabled by policy, but it must not stop
  -- the internal workflow from reaching its learn/completed stage.
  IF p.auto_skip_external_distribution
     AND NOT coalesce((
       SELECT (value_json->>'publish_external')::boolean
       FROM ai_operating_policies WHERE key = 'autonomy'
     ), FALSE)
  THEN
    UPDATE ai_work_item_steps s
    SET status = 'skipped',
        output_json = jsonb_build_object('reason', 'external_distribution_disabled_by_policy'),
        completed_at = now(),
        updated_at = now()
    FROM ai_work_items w
    WHERE w.id = s.work_item_id
      AND w.workflow_code = 'universal_content_lifecycle'
      AND s.stage_code = 'distribution'
      AND s.status IN ('waiting','awaiting_approval')
      AND NOT EXISTS (
        SELECT 1 FROM ai_work_item_steps prior
        WHERE prior.work_item_id = w.id
          AND prior.stage_order < s.stage_order
          AND prior.status NOT IN ('completed','approved','skipped')
      );
    GET DIAGNOSTICS v_distribution_skipped = ROW_COUNT;
  END IF;

  PERFORM ai_ops_supervisor_tick();

  v_result := jsonb_build_object(
    'enabled', TRUE,
    'open_before_tick', v_open,
    'capacity', v_capacity,
    'discovered', v_discovered,
    'auto_applied', v_auto_applied,
    'external_distribution_skipped', v_distribution_skipped,
    'at', now()
  );

  UPDATE ai_autopilot_policy
  SET last_tick_at = now(),
      last_result_json = v_result,
      updated_at = now()
  WHERE singleton;

  RETURN v_result::text;
EXCEPTION WHEN OTHERS THEN
  UPDATE ai_autopilot_policy
  SET last_tick_at = now(),
      last_result_json = jsonb_build_object('enabled', TRUE, 'error', SQLERRM, 'at', now()),
      updated_at = now()
  WHERE singleton;
  RAISE;
END;
$$;

SELECT ai_autopilot_tick();
