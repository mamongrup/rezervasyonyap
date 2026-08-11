-- Kaynak sayfadaki 22 Agustos son dolu gecesinin cikis sabahini onar.
-- Yeni senkronlar bu siniri kod tarafinda son dolu gece + 1 gun olarak kurar;
-- bu idempotent upsert daha once yazilmis canli kaydi dogru duruma getirir.
INSERT INTO listing_availability_calendar (
  listing_id,
  day,
  is_available,
  am_available,
  pm_available,
  price_override,
  day_status
)
SELECT
  l.id,
  DATE '2026-08-23',
  true,
  false,
  true,
  NULL,
  NULL
FROM listings l
WHERE l.id = '70241c23-1ad0-422c-9fff-21ab1e75f3e0'::uuid
ON CONFLICT (listing_id, day) DO UPDATE
SET
  is_available = true,
  am_available = false,
  pm_available = true;
