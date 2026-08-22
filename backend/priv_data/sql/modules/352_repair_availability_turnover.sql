-- Değişim günleri: sabah çıkış + öğleden sonra giriş aynı günde.
-- Eski iCal sync is_available=false yazınca vitrinde tam dolu görünüyordu.
UPDATE listing_availability_calendar cur
SET is_available = true
WHERE cur.am_available = false
  AND cur.pm_available = false
  AND cur.is_available = false
  AND (
    EXISTS (
      SELECT 1
      FROM listing_availability_calendar p
      WHERE p.listing_id = cur.listing_id
        AND p.day = cur.day - 1
        AND p.pm_available = true
    )
    OR EXISTS (
      SELECT 1
      FROM listing_availability_calendar n
      WHERE n.listing_id = cur.listing_id
        AND n.day = cur.day + 1
        AND n.am_available = true
    )
  );
