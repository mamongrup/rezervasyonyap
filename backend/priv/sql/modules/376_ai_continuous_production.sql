-- Sürekli içerik üretimi: güvenli AI kadrosunu aç, autopilot kapasitesini yükselt.
-- Para / fiyat / iade / sözleşme / dış yayın otomatikleri KAPALI kalır.

-- 1) Autopilot: daha sık keşif, daha geniş açık iş havuzu
UPDATE ai_autopilot_policy
SET enabled = TRUE,
    discovery_batch_size = 40,
    max_open_work_items = 500,
    rediscovery_cooldown = interval '3 days',
    auto_apply_verified_content = TRUE,
    auto_skip_external_distribution = TRUE,
    updated_at = now()
WHERE singleton;

INSERT INTO ai_autopilot_policy (singleton, enabled, discovery_batch_size, max_open_work_items)
VALUES (TRUE, TRUE, 40, 500)
ON CONFLICT (singleton) DO NOTHING;

-- 2) Özerklik: düşük riskli içerik otomatik; finansal/hukuki kilitler
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
    updated_at = now()
WHERE key = 'autonomy';

-- 3) Genel müdür + içerik/operasyon müdürleri aktif
UPDATE ai_agents
SET status = 'active',
    mode = CASE WHEN mode = 'disabled' THEN 'draft_only' ELSE mode END,
    updated_at = now()
WHERE code IN (
  'chief_ai_officer',
  'listing_ops_director',
  'growth_ops_director',
  'customer_ops_director',
  'data_ops_director',
  'supervisor'
);

-- Gelir / finans / risk müdürleri aktif ama yüksek risk — yalnızca draft_only
UPDATE ai_agents
SET status = 'active',
    mode = 'draft_only',
    updated_at = now()
WHERE code IN (
  'revenue_ops_director',
  'finance_ops_director',
  'risk_ops_director'
);

-- 4) Profili olan tüm işçiler: üretim için aktif
-- Yüksek riskliler draft_only; diğerleri auto_low_risk (watchdog + autopilot besler)
UPDATE ai_agents
SET status = 'active',
    mode = CASE
      WHEN risk_level = 'high' THEN 'draft_only'
      WHEN mode = 'disabled' THEN 'auto_low_risk'
      ELSE coalesce(nullif(mode, 'disabled'), 'auto_low_risk')
    END,
    updated_at = now()
WHERE org_role = 'worker'
  AND feature_profile_code IS NOT NULL;

-- Profili olmayan ama içerik hattına bağlı bilinen işçiler (profil atanmışsa zaten üstte)
UPDATE ai_agents
SET status = 'active',
    mode = CASE WHEN risk_level = 'high' THEN 'draft_only' ELSE 'auto_low_risk' END,
    updated_at = now()
WHERE code IN (
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
  'availability_guard_worker'
);

-- Fiyat / fatura / anomali: aktif ama asla oto-uygulama (draft_only)
UPDATE ai_agents
SET status = 'active',
    mode = 'draft_only',
    updated_at = now()
WHERE code IN (
  'pricing_insight_worker',
  'campaign_worker',
  'revenue_pricing_worker',
  'invoice_control_worker',
  'anomaly_worker'
);

-- 5) Runtime sağlık satırları
INSERT INTO ai_agent_runtime_state (agent_code, health_status)
SELECT code, 'idle'
FROM ai_agents
WHERE status = 'active'
ON CONFLICT (agent_code) DO UPDATE
SET health_status = CASE
      WHEN ai_agent_runtime_state.health_status IN ('quarantined', 'paused') THEN 'half_open'
      ELSE ai_agent_runtime_state.health_status
    END,
    circuit_open_until = NULL,
    updated_at = now();

-- 6) İlk tur: keşif + supervisor digest
SELECT ai_autopilot_tick();

-- Özet
SELECT
  org_role,
  status,
  mode,
  count(*) AS n
FROM ai_agents
GROUP BY org_role, status, mode
ORDER BY org_role, status, mode;
