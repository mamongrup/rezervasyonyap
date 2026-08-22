-- Günlük: tamamlanmış AI / outbox / bildirim loglarını temizle.
-- Açık (queued/running) işlere dokunulmaz.
-- Retention: bitmiş kayıtlar 7 gün (work item 14 gün).

\set ON_ERROR_STOP on

\echo '=== purge_old_logs ==='

-- 1) AI iş işletim sistemi: tamamlanmış work item (+ CASCADE steps)
WITH doomed AS (
  SELECT id
  FROM ai_work_items
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND coalesce(completed_at, updated_at, created_at) < now() - interval '14 days'
  LIMIT 20000
)
DELETE FROM ai_work_items w
USING doomed d
WHERE w.id = d.id;

-- 2) Eski AI job kuyruğu
WITH doomed AS (
  SELECT id
  FROM ai_jobs
  WHERE status IN ('succeeded', 'failed')
    AND coalesce(finished_at, created_at) < now() - interval '7 days'
  LIMIT 50000
)
DELETE FROM ai_jobs j
USING doomed d
WHERE j.id = d.id;

-- 3) Event outbox
WITH doomed AS (
  SELECT id
  FROM ai_event_outbox
  WHERE status IN ('processed', 'failed', 'ignored')
    AND coalesce(processed_at, created_at) < now() - interval '7 days'
  LIMIT 50000
)
DELETE FROM ai_event_outbox o
USING doomed d
WHERE o.id = d.id;

-- 4) İlan içerik batch geçmişi
WITH doomed AS (
  SELECT id
  FROM ai_listing_content_batches
  WHERE status IN ('done', 'failed', 'skipped')
    AND updated_at < now() - interval '14 days'
  LIMIT 20000
)
DELETE FROM ai_listing_content_batches b
USING doomed d
WHERE b.id = d.id;

-- 5) Bildirim job geçmişi
WITH doomed AS (
  SELECT id
  FROM notification_jobs
  WHERE status IN ('sent', 'failed')
    AND coalesce(sent_at, scheduled_at) < now() - interval '30 days'
  LIMIT 50000
)
DELETE FROM notification_jobs n
USING doomed d
WHERE n.id = d.id;

\echo 'purge_old_logs done'
