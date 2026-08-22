-- Super Host nightly recompute — token gerektirmez (DB-side).
-- Çalıştırma: psql -f backend/priv/sql/cron/recompute_super_host.sql

BEGIN;

-- 1) organization_metrics tablosunu reviews + reservations'tan tazeleyelim.
WITH org_stats AS (
  SELECT o.id AS org_id,
    COALESCE((
      SELECT AVG(rv.rating)::NUMERIC(3, 2)
      FROM reviews rv
      JOIN listings l2 ON l2.id = rv.entity_id
      WHERE rv.entity_type = 'listing'
        AND rv.status = 'approved'
        AND l2.organization_id = o.id
    ), 0)::NUMERIC(3, 2) AS avg_rating,
    COALESCE((
      SELECT COUNT(*)::INT
      FROM reviews rv2
      JOIN listings l3 ON l3.id = rv2.entity_id
      WHERE rv2.entity_type = 'listing'
        AND rv2.status = 'approved'
        AND l3.organization_id = o.id
    ), 0)::INT AS total_reviews,
    COALESCE((
      SELECT COUNT(*) FROM reservations r
      JOIN listings l4 ON l4.id = r.listing_id
      WHERE l4.organization_id = o.id
        AND r.status = 'confirmed'
        AND r.created_at > now() - interval '12 months'
    ), 0)::INT AS completed_bookings_12mo,
    COALESCE((
      SELECT CASE WHEN COUNT(*) = 0 THEN 0
                  ELSE (SUM(CASE WHEN r2.status = 'cancelled' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
             END
      FROM reservations r2
      JOIN listings l5 ON l5.id = r2.listing_id
      WHERE l5.organization_id = o.id
        AND r2.created_at > now() - interval '12 months'
    ), 0)::NUMERIC(5, 2) AS cancellation_rate
  FROM organizations o
)
INSERT INTO organization_metrics
  (organization_id, avg_rating, total_reviews, completion_rate, cancellation_rate, response_time_hours, completed_bookings_12mo, calculated_at)
SELECT org_id, avg_rating, total_reviews,
       GREATEST(0, 100.0 - cancellation_rate)::NUMERIC(5, 2) AS completion_rate,
       cancellation_rate,
       0,
       completed_bookings_12mo,
       now()
FROM org_stats
ON CONFLICT (organization_id) DO UPDATE SET
  avg_rating = EXCLUDED.avg_rating,
  total_reviews = EXCLUDED.total_reviews,
  completion_rate = EXCLUDED.completion_rate,
  cancellation_rate = EXCLUDED.cancellation_rate,
  completed_bookings_12mo = EXCLUDED.completed_bookings_12mo,
  calculated_at = now();

-- 2) Kriterlere göre rozeti aç/kapat (manuel toggle'lar bu adımda override'lanır).
UPDATE organizations o
SET is_super_host = (
      m.avg_rating >= 4.7
      AND m.completed_bookings_12mo >= 10
      AND m.cancellation_rate <= 1.0
    ),
    super_host_since = CASE
      WHEN (m.avg_rating >= 4.7 AND m.completed_bookings_12mo >= 10 AND m.cancellation_rate <= 1.0)
           AND o.is_super_host = FALSE THEN now()
      WHEN NOT (m.avg_rating >= 4.7 AND m.completed_bookings_12mo >= 10 AND m.cancellation_rate <= 1.0)
        THEN NULL
      ELSE o.super_host_since
    END
FROM organization_metrics m
WHERE m.organization_id = o.id;

COMMIT;

\echo 'Super-host recompute tamamlandı.'
