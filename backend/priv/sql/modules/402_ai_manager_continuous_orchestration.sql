-- AI Genel Müdürü, üç dakikalık travel-ai-worker zamanlayıcısının her turunda
-- autopilot ve uzman işçi hatlarını koordine eder. Yüksek riskli işlemler mevcut
-- güvenlik politikaları gereği onay/taslak modunda kalır.

UPDATE ai_agents
SET status = 'active',
    mode = 'draft_only',
    schedule_json = coalesce(schedule_json, '{}'::jsonb) || jsonb_build_object(
      'cadence', 'continuous',
      'interval_minutes', 3,
      'timezone', 'Europe/Istanbul'
    ),
    scope_json = coalesce(scope_json, '{}'::jsonb) || jsonb_build_object(
      'orchestrates_all_workers', TRUE,
      'provider_order', jsonb_build_array('gemini_pool', 'deepseek_fallback')
    ),
    updated_at = now()
WHERE code = 'chief_ai_officer';

INSERT INTO ai_agent_runtime_state (agent_code, health_status)
SELECT 'chief_ai_officer', 'idle'
WHERE EXISTS (SELECT 1 FROM ai_agents WHERE code = 'chief_ai_officer')
ON CONFLICT (agent_code) DO UPDATE
SET health_status = 'idle',
    consecutive_failures = 0,
    circuit_open_until = NULL,
    last_error = NULL,
    updated_at = now();
