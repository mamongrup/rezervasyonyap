-- MODÜL 413: AI listing-content seed kalite kapısı
-- Açıklamaya gömülü «Genel Kurallar» / şartlar → editoryal+SEO yeniden yazım kuyruğu.
-- Charset `?` onarımı migration 412 ile yapılır; çıplak `?` kapısı yok (Nedir? döngüsü).
-- 407 fonksiyonunu genişletir (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION ai_seed_listing_content_gaps(p_limit INT DEFAULT 50)
RETURNS TABLE(queue TEXT, category_code TEXT, queued BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit INT := greatest(1, least(coalesce(p_limit, 50), 500));
BEGIN
  -- Takılı running → pending
  UPDATE ai_listing_content_batches
  SET status = 'pending',
      error = coalesce(error, 'reset_stuck_running'),
      updated_at = now()
  WHERE status = 'running'
    AND updated_at < now() - interval '20 minutes';

  -- Eski hataları yeniden dene
  UPDATE ai_listing_content_batches
  SET status = 'pending', error = NULL, updated_at = now()
  WHERE status = 'failed'
    AND updated_at < now() - interval '6 hours';

  CREATE TEMP TABLE IF NOT EXISTS _ai_seed_gap_pick (
    listing_id UUID PRIMARY KEY,
    category_code TEXT NOT NULL,
    start_phase TEXT NOT NULL
  ) ON COMMIT DROP;
  DELETE FROM _ai_seed_gap_pick;

  INSERT INTO _ai_seed_gap_pick (listing_id, category_code, start_phase)
  SELECT listing_id, category_code, start_phase
  FROM (
    SELECT
      l.id AS listing_id,
      pc.code AS category_code,
      CASE
        WHEN NOT EXISTS (
          SELECT 1
          FROM listing_translations lt
          JOIN locales lo ON lo.id = lt.locale_id
          WHERE lt.listing_id = l.id
            AND lower(lo.code) = 'tr'
            AND length(coalesce(lt.description, '')) >= 120
            AND position('<p' in lower(coalesce(lt.description, ''))) > 0
            AND position('&nbsp' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel kurallar' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel şartlar' in lower(coalesce(lt.description, ''))) = 0
        ) THEN 'tr_description'
        WHEN (
          SELECT count(*)::int
          FROM listing_translations lt
          JOIN locales lo ON lo.id = lt.locale_id
          WHERE lt.listing_id = l.id
            AND coalesce(lo.is_active, true) = true
            AND lower(lo.code) <> 'tr'
            AND length(coalesce(lt.title, '')) > 0
            AND length(coalesce(lt.description, '')) > 80
            AND position('<p' in lower(coalesce(lt.description, ''))) > 0
            AND position('&nbsp' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel kurallar' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel şartlar' in lower(coalesce(lt.description, ''))) = 0
        ) < (
          SELECT count(*)::int FROM locales lo
          WHERE coalesce(lo.is_active, true) = true AND lower(lo.code) <> 'tr'
        ) THEN 'translations'
        ELSE 'seo'
      END AS start_phase,
      row_number() OVER (
        PARTITION BY pc.code
        ORDER BY
          CASE WHEN l.status = 'published' THEN 0 ELSE 1 END,
          l.updated_at DESC,
          l.id
      ) AS rn
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    WHERE coalesce(pc.is_active, true) = true
      AND l.status IN ('draft', 'published')
      AND (
        NOT EXISTS (
          SELECT 1
          FROM listing_translations lt
          JOIN locales lo ON lo.id = lt.locale_id
          WHERE lt.listing_id = l.id
            AND lower(lo.code) = 'tr'
            AND length(coalesce(lt.description, '')) >= 120
            AND position('<p' in lower(coalesce(lt.description, ''))) > 0
            AND position('&nbsp' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel kurallar' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel şartlar' in lower(coalesce(lt.description, ''))) = 0
        )
        OR (
          SELECT count(*)::int
          FROM listing_translations lt
          JOIN locales lo ON lo.id = lt.locale_id
          WHERE lt.listing_id = l.id
            AND coalesce(lo.is_active, true) = true
            AND lower(lo.code) <> 'tr'
            AND length(coalesce(lt.title, '')) > 0
            AND length(coalesce(lt.description, '')) > 80
            AND position('<p' in lower(coalesce(lt.description, ''))) > 0
            AND position('&nbsp' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel kurallar' in lower(coalesce(lt.description, ''))) = 0
            AND position('genel şartlar' in lower(coalesce(lt.description, ''))) = 0
        ) < (
          SELECT count(*)::int FROM locales lo
          WHERE coalesce(lo.is_active, true) = true AND lower(lo.code) <> 'tr'
        )
        OR (
          SELECT count(*)::int
          FROM seo_metadata sm
          JOIN locales lo ON lo.id = sm.locale_id
          WHERE sm.entity_type = 'listing'
            AND sm.entity_id = l.id
            AND coalesce(lo.is_active, true) = true
            AND length(coalesce(sm.title, '')) > 10
            AND length(coalesce(sm.description, '')) > 40
        ) < (
          SELECT count(*)::int FROM locales lo
          WHERE coalesce(lo.is_active, true) = true
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM ai_listing_content_batches b
        WHERE b.listing_id = l.id AND b.status IN ('pending', 'running')
      )
      AND NOT EXISTS (
        SELECT 1 FROM ai_listing_content_batches b
        WHERE b.listing_id = l.id
          AND b.status = 'failed'
          AND b.updated_at >= now() - interval '6 hours'
      )
  ) ranked
  WHERE rn <= v_limit;

  -- Önce done/skipped kayıtlarını yeniden aç (unique index: listing başına tek pending)
  UPDATE ai_listing_content_batches b
  SET phase = p.start_phase,
      status = 'pending',
      overwrite = false,
      error = NULL,
      updated_at = now()
  FROM _ai_seed_gap_pick p
  WHERE b.id = (
    SELECT x.id
    FROM ai_listing_content_batches x
    WHERE x.listing_id = p.listing_id
      AND x.status IN ('done', 'skipped')
    ORDER BY x.updated_at DESC, x.created_at DESC
    LIMIT 1
  );

  -- Hâlâ kuyrukta olmayanlar için yeni satır
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT p.listing_id, p.category_code, p.start_phase, 'pending', false
  FROM _ai_seed_gap_pick p
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_listing_content_batches b
    WHERE b.listing_id = p.listing_id AND b.status IN ('pending', 'running')
  );

  RETURN QUERY
  SELECT 'listing_content_gaps'::text, p.category_code, count(*)::bigint
  FROM _ai_seed_gap_pick p
  GROUP BY p.category_code
  ORDER BY p.category_code;
END;
$$;

COMMENT ON FUNCTION ai_seed_listing_content_gaps(INT) IS
  'Eksik TR/çeviri/SEO (seo_metadata) olan ilanları akıllı faz ile AI kuyruğuna alır; done kayıtlarını yeniden açar.';

-- 2) Autopilot: vitrin SEO tablosu = seo_metadata (content_localized_seo artifact yolu değil)
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

  IF NOT pg_try_advisory_xact_lock(hashtext('travel.ai.autopilot.tick')) THEN
    RETURN '{"enabled":true,"busy":true}'::jsonb::text;
  END IF;

  -- Storefront SEO zaten tamamsa eski yanlış keşif işlerini serbest bırak (kapasite)
  UPDATE ai_work_items w
  SET status = 'completed',
      completed_at = coalesce(w.completed_at, now()),
      updated_at = now(),
      input_json = coalesce(w.input_json, '{}'::jsonb)
        || jsonb_build_object(
             'autopilot_note',
             'completed_early: seo_metadata already complete for active locales'
           )
  WHERE w.workflow_code = 'universal_content_lifecycle'
    AND w.entity_type = 'listing'
    AND w.status IN ('queued', 'awaiting_approval')
    AND (
      SELECT count(*)::int
      FROM seo_metadata sm
      JOIN locales loc ON loc.id = sm.locale_id AND coalesce(loc.is_active, true)
      WHERE sm.entity_type = 'listing'
        AND sm.entity_id::text = w.entity_id
        AND length(coalesce(sm.title, '')) > 10
        AND length(coalesce(sm.description, '')) > 40
    ) >= (SELECT count(*)::int FROM locales WHERE coalesce(is_active, true));

  SELECT count(*) INTO v_open
  FROM ai_work_items
  WHERE status IN ('queued','running','awaiting_approval');
  v_capacity := greatest(0, least(p.discovery_batch_size, p.max_open_work_items - v_open));

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
            WHERE coalesce(loc.is_active, true)
              AND EXISTS (
                SELECT 1
                FROM listing_translations lt
                WHERE lt.listing_id = l.id
                  AND lt.locale_id = loc.id
                  AND nullif(trim(lt.title), '') IS NOT NULL
                  AND nullif(trim(coalesce(lt.description, '')), '') IS NOT NULL
              )
          ) < (SELECT count(*) FROM locales WHERE coalesce(is_active, true))
          OR (
            SELECT count(*)::int
            FROM seo_metadata sm
            JOIN locales loc ON loc.id = sm.locale_id AND coalesce(loc.is_active, true)
            WHERE sm.entity_type = 'listing'
              AND sm.entity_id = l.id
              AND length(coalesce(sm.title, '')) > 10
              AND length(coalesce(sm.description, '')) > 40
          ) < (SELECT count(*) FROM locales WHERE coalesce(is_active, true))
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
        -- listing_content batch zaten işliyorsa çift kuyruk açma
        AND NOT EXISTS (
          SELECT 1 FROM ai_listing_content_batches b
          WHERE b.listing_id = l.id AND b.status IN ('pending', 'running')
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

-- 3) Sürekli üretim politikasını açık tut
UPDATE ai_autopilot_policy
SET enabled = TRUE,
    discovery_batch_size = greatest(discovery_batch_size, 40),
    max_open_work_items = greatest(max_open_work_items, 500),
    rediscovery_cooldown = least(rediscovery_cooldown, interval '3 days'),
    auto_apply_verified_content = TRUE,
    auto_skip_external_distribution = TRUE,
    updated_at = now()
WHERE singleton;

INSERT INTO ai_autopilot_policy (singleton, enabled, discovery_batch_size, max_open_work_items)
VALUES (TRUE, TRUE, 40, 500)
ON CONFLICT (singleton) DO NOTHING;

-- İlk tur
SELECT ai_seed_listing_content_gaps(80);
SELECT ai_autopilot_tick();
