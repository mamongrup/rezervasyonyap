-- Duraklatılmış AI kadrosunu güvenli modda aktifleştir.
-- Para / fiyat / iade / sözleşme / dış yayın otomatikleri KAPALI kalır.
-- Panel: POST /api/v1/ai/control-center/activate-workforce → aynı fonksiyon.

CREATE OR REPLACE FUNCTION ai_activate_safe_workforce() RETURNS TEXT
LANGUAGE plpgsql AS $$
BEGIN
  -- 1) Autopilot
  UPDATE ai_autopilot_policy
  SET enabled = TRUE,
      discovery_batch_size = GREATEST(coalesce(discovery_batch_size, 20), 40),
      max_open_work_items = GREATEST(coalesce(max_open_work_items, 100), 500),
      rediscovery_cooldown = interval '3 days',
      auto_apply_verified_content = TRUE,
      auto_skip_external_distribution = TRUE,
      updated_at = now()
  WHERE singleton;

  INSERT INTO ai_autopilot_policy (singleton, enabled, discovery_batch_size, max_open_work_items)
  VALUES (TRUE, TRUE, 40, 500)
  ON CONFLICT (singleton) DO NOTHING;

  -- 2) Özerklik politikası (yüksek risk kilitleri)
  UPDATE ai_operating_policies
  SET value_json = coalesce(value_json, '{}'::jsonb) || jsonb_build_object(
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
      updated_at = now()
  WHERE key = 'autonomy';

  -- 3) Genel müdür + operasyon müdürleri
  UPDATE ai_agents
  SET status = 'active',
      mode = CASE
        WHEN risk_level = 'high' THEN 'draft_only'
        WHEN mode IN ('disabled', 'paused') THEN 'auto_low_risk'
        ELSE coalesce(nullif(mode, 'disabled'), 'auto_low_risk')
      END,
      updated_at = now()
  WHERE org_role IN ('executive', 'director')
    AND code NOT IN (
      'revenue_ops_director', 'finance_ops_director', 'risk_ops_director'
    );

  UPDATE ai_agents
  SET status = 'active', mode = 'draft_only', updated_at = now()
  WHERE code IN (
    'revenue_ops_director',
    'finance_ops_director',
    'risk_ops_director',
    'supervisor'
  );

  -- 4) Tüm işçiler + bilinen uzman kodları
  UPDATE ai_agents
  SET status = 'active',
      mode = CASE
        WHEN risk_level = 'high' THEN 'draft_only'
        WHEN code IN (
          'pricing_insight_worker',
          'campaign_worker',
          'revenue_pricing_worker',
          'invoice_control_worker',
          'anomaly_worker'
        ) THEN 'draft_only'
        WHEN mode IN ('disabled', 'paused') THEN 'auto_low_risk'
        ELSE coalesce(nullif(mode, 'disabled'), 'auto_low_risk')
      END,
      updated_at = now()
  WHERE org_role = 'worker'
     OR feature_profile_code IS NOT NULL
     OR code IN (
       'listing_quality_worker',
       'catalog_copy_worker',
       'social_content_worker',
       'seo_content_worker',
       'daily_insight_worker',
       'special_day_popup',
       'sales_lead_worker',
       'support_triage_worker',
       'customer_understanding_worker',
       'product_match_worker',
       'reservation_comms_worker',
       'listing_intake_worker',
       'availability_guard_worker',
       'pricing_insight_worker',
       'campaign_worker',
       'revenue_pricing_worker',
       'invoice_control_worker',
       'anomaly_worker'
     );

  -- 5) Runtime: paused/karantina → idle
  INSERT INTO ai_agent_runtime_state (agent_code, health_status)
  SELECT code, 'idle'
  FROM ai_agents
  WHERE status = 'active'
  ON CONFLICT (agent_code) DO UPDATE
  SET health_status = CASE
        WHEN ai_agent_runtime_state.health_status IN ('paused', 'quarantined', 'degraded', 'half_open')
          THEN 'idle'
        ELSE ai_agent_runtime_state.health_status
      END,
      consecutive_failures = 0,
      circuit_open_until = NULL,
      last_error = NULL,
      updated_at = now();

  UPDATE ai_agent_runtime_state r
  SET health_status = 'paused', updated_at = now()
  FROM ai_agents a
  WHERE a.code = r.agent_code
    AND a.status IS DISTINCT FROM 'active'
    AND r.health_status IS DISTINCT FROM 'paused';

  BEGIN
    PERFORM ai_autopilot_tick();
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  BEGIN
    PERFORM ai_ops_supervisor_tick();
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'active_agents', (SELECT count(*) FROM ai_agents WHERE status = 'active'),
    'paused_agents', (SELECT count(*) FROM ai_agents WHERE status <> 'active'),
    'runtime_paused', (SELECT count(*) FROM ai_agent_runtime_state WHERE health_status = 'paused'),
    'runtime_ready', (SELECT count(*) FROM ai_agent_runtime_state WHERE health_status IN ('idle', 'healthy'))
  )::text;
END;
$$;

-- Kurulumda bir kez çalıştır
SELECT ai_activate_safe_workforce();
