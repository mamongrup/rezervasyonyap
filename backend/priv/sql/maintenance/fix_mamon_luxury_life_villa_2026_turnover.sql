-- Mamon Luxury Life Villa: 27.09.2026 giris / 04.10.2026 cikis
-- Eski tam-gun kaydini gercek yarim-gun turnover sinirlarina cevirir.
DO $$
DECLARE
  v_listing_id uuid;
BEGIN
  SELECT l.id
    INTO STRICT v_listing_id
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE l.slug = 'mamon-luxury-life-villa'
    AND l.status = 'published'
    AND pc.code = 'holiday_home';

  INSERT INTO listing_availability_calendar (
    listing_id,
    day,
    is_available,
    am_available,
    pm_available
  )
  VALUES
    (v_listing_id, DATE '2026-09-27', TRUE, TRUE, FALSE),
    (v_listing_id, DATE '2026-10-04', TRUE, FALSE, TRUE)
  ON CONFLICT (listing_id, day) DO UPDATE
  SET is_available = EXCLUDED.is_available,
      am_available = EXCLUDED.am_available,
      pm_available = EXCLUDED.pm_available;
END
$$;

SELECT
  l.slug,
  c.day,
  c.is_available,
  c.am_available,
  c.pm_available
FROM listing_availability_calendar c
JOIN listings l ON l.id = c.listing_id
WHERE l.slug = 'mamon-luxury-life-villa'
  AND c.day IN (DATE '2026-09-27', DATE '2026-10-04')
ORDER BY c.day;
