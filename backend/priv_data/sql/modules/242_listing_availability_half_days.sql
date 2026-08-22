-- Günlük müsaitlik: öğleden önce / sonra (Airbnb tarzı yarım gün görünümü için)
ALTER TABLE listing_availability_calendar
  ADD COLUMN IF NOT EXISTS am_available BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pm_available BOOLEAN NOT NULL DEFAULT TRUE;

-- Mevcut satırlar: tam gün bayrağından türet
UPDATE listing_availability_calendar
SET
  am_available = is_available,
  pm_available = is_available
WHERE TRUE;

-- Örnek (2026 Nisan — elle listing_id ile çalıştırın):
-- 17: ÖÖ boş ÖS dolu | 18–21,23–28: tam dolu | 22: tam dolu (takvimde iki yarı + orta çizgi) | 29: ÖÖ dolu ÖS boş
/*
INSERT INTO listing_availability_calendar (listing_id, day, is_available, am_available, pm_available, price_override)
VALUES
  ('YOUR-LISTING-UUID'::uuid, '2026-04-17', true,  true,  false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-18', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-19', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-20', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-21', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-22', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-23', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-24', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-25', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-26', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-27', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-28', false, false, false, null),
  ('YOUR-LISTING-UUID'::uuid, '2026-04-29', true,  false, true,  null)
ON CONFLICT (listing_id, day) DO UPDATE SET
  is_available = excluded.is_available,
  am_available = excluded.am_available,
  pm_available = excluded.pm_available,
  price_override = excluded.price_override;
*/
