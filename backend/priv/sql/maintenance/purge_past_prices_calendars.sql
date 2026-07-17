-- Aylık / günlük: içinde bulunulan ayın 1'inden önceki fiyat bandı ve müsaitlik satırlarını sil.
-- Örnek: bugün 2026-07-17 → cutoff = 2026-07-01 (Haziran ve öncesi gider).
-- Büyük tablolarda batch ile siler (disk I/O spike'ını sınırlar).

\set ON_ERROR_STOP on

\echo '=== purge_past_prices_calendars ==='

DO $body$
DECLARE
  cutoff date := date_trunc('month', CURRENT_DATE)::date;
  batch int := 50000;
  deleted int;
  total bigint := 0;
BEGIN
  RAISE NOTICE 'cutoff=% (bu aydan önceki kayıtlar silinir)', cutoff;

  -- 1) Sezon fiyat kuralları: bitiş tarihi cutoff'tan önce olanlar
  LOOP
    WITH doomed AS (
      SELECT id
      FROM listing_price_rules
      WHERE valid_to IS NOT NULL
        AND valid_to < cutoff
      LIMIT batch
    )
    DELETE FROM listing_price_rules r
    USING doomed d
    WHERE r.id = d.id;
    GET DIAGNOSTICS deleted = ROW_COUNT;
    total := total + deleted;
    EXIT WHEN deleted = 0;
    RAISE NOTICE 'listing_price_rules deleted_batch=% total=%', deleted, total;
    PERFORM pg_sleep(0.05);
  END LOOP;

  total := 0;
  -- 2) Tatil evi / genel müsaitlik takvimi
  LOOP
    WITH doomed AS (
      SELECT listing_id, day
      FROM listing_availability_calendar
      WHERE day < cutoff
      LIMIT batch
    )
    DELETE FROM listing_availability_calendar c
    USING doomed d
    WHERE c.listing_id = d.listing_id AND c.day = d.day;
    GET DIAGNOSTICS deleted = ROW_COUNT;
    total := total + deleted;
    EXIT WHEN deleted = 0;
    RAISE NOTICE 'listing_availability_calendar deleted_batch=% total=%', deleted, total;
    PERFORM pg_sleep(0.05);
  END LOOP;

  total := 0;
  -- 3) Otel oda müsaitlik takvimi (en büyük tablo)
  LOOP
    WITH doomed AS (
      SELECT hotel_room_id, day
      FROM hotel_room_availability_calendar
      WHERE day < cutoff
      LIMIT batch
    )
    DELETE FROM hotel_room_availability_calendar c
    USING doomed d
    WHERE c.hotel_room_id = d.hotel_room_id AND c.day = d.day;
    GET DIAGNOSTICS deleted = ROW_COUNT;
    total := total + deleted;
    EXIT WHEN deleted = 0;
    RAISE NOTICE 'hotel_room_availability_calendar deleted_batch=% total=%', deleted, total;
    PERFORM pg_sleep(0.1);
  END LOOP;

  RAISE NOTICE 'purge_past_prices_calendars finished cutoff=%', cutoff;
END
$body$;

\echo 'purge_past_prices_calendars done'
