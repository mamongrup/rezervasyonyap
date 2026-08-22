-- Tatil evi takvimi: opsiyon (hold) ve fırsat (promo) gün durumları
ALTER TABLE listing_availability_calendar
  ADD COLUMN IF NOT EXISTS day_status TEXT;

ALTER TABLE listing_availability_calendar
  DROP CONSTRAINT IF EXISTS listing_availability_calendar_day_status_check;

ALTER TABLE listing_availability_calendar
  ADD CONSTRAINT listing_availability_calendar_day_status_check
  CHECK (day_status IS NULL OR day_status IN ('option', 'promo'));
