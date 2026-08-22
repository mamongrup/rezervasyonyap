-- MODÜL: etkinlik kişi başı ücret → konaklama günü ek ücreti (yılbaşı konseri vb.)
ALTER TABLE listing_hotel_activities
  ADD COLUMN IF NOT EXISTS stay_surcharge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

UPDATE listing_hotel_activities
SET stay_surcharge_amount = price_per_person
WHERE stay_surcharge_amount = 0
  AND price_per_person > 0;

ALTER TABLE listing_hotel_activities
  DROP COLUMN IF EXISTS price_per_person;
