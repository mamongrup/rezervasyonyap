-- Çapraz satış: çok yönlü öneri grafiği (trigger → offer).
-- Aynı tabloda konaklama→uçak ve uçak→konaklama birlikte tutulur; yeni yön = yeni satır.

INSERT INTO cross_sell_rules (trigger_category_code, offer_category_code, message_key, discount_percent, priority)
SELECT v.tr, v.of, v.mk, NULL::numeric, v.pr
FROM (VALUES
  -- Konaklama / villa akışı
  ('holiday_home', 'flight', 'cross.from_stay.flight', 100),
  ('holiday_home', 'car_rental', 'cross.from_stay.car', 95),
  ('holiday_home', 'transfer', 'cross.from_stay.transfer', 90),
  ('holiday_home', 'activity', 'cross.from_stay.activity', 85),
  ('holiday_home', 'tour', 'cross.from_stay.tour', 80),
  ('hotel', 'flight', 'cross.from_hotel.flight', 100),
  ('hotel', 'car_rental', 'cross.from_hotel.car', 95),
  ('hotel', 'transfer', 'cross.from_hotel.transfer', 90),
  ('hotel', 'activity', 'cross.from_hotel.activity', 85),
  -- Uçuş / otobüs akışı (ters yön)
  ('flight', 'holiday_home', 'cross.from_flight.stay', 100),
  ('flight', 'hotel', 'cross.from_flight.hotel', 95),
  ('flight', 'car_rental', 'cross.from_flight.car', 90),
  ('flight', 'transfer', 'cross.from_flight.transfer', 88),
  ('flight', 'activity', 'cross.from_flight.activity', 82),
  -- Araç kiralama
  ('car_rental', 'holiday_home', 'cross.from_car.stay', 100),
  ('car_rental', 'hotel', 'cross.from_car.hotel', 95),
  ('car_rental', 'flight', 'cross.from_car.flight', 88),
  ('car_rental', 'transfer', 'cross.from_car.transfer', 85),
  ('car_rental', 'activity', 'cross.from_car.activity', 80),
  -- Transfer
  ('transfer', 'holiday_home', 'cross.from_transfer.stay', 100),
  ('transfer', 'hotel', 'cross.from_transfer.hotel', 95),
  ('transfer', 'flight', 'cross.from_transfer.flight', 90),
  ('transfer', 'car_rental', 'cross.from_transfer.car', 85),
  ('transfer', 'activity', 'cross.from_transfer.activity', 80),
  -- Aktivite / tur (konaklama + ulaşım)
  ('activity', 'holiday_home', 'cross.from_activity.stay', 100),
  ('activity', 'hotel', 'cross.from_activity.hotel', 95),
  ('activity', 'flight', 'cross.from_activity.flight', 88),
  ('activity', 'transfer', 'cross.from_activity.transfer', 86),
  ('activity', 'car_rental', 'cross.from_activity.car', 84),
  ('tour', 'holiday_home', 'cross.from_tour.stay', 100),
  ('tour', 'flight', 'cross.from_tour.flight', 90),
  ('tour', 'transfer', 'cross.from_tour.transfer', 88),
  ('tour', 'car_rental', 'cross.from_tour.car', 86),
  -- Yat
  ('yacht_charter', 'flight', 'cross.from_yacht.flight', 100),
  ('yacht_charter', 'transfer', 'cross.from_yacht.transfer', 95),
  ('yacht_charter', 'car_rental', 'cross.from_yacht.car', 90),
  ('yacht_charter', 'activity', 'cross.from_yacht.activity', 85),
  ('yacht_charter', 'holiday_home', 'cross.from_yacht.stay', 80),
  -- Feribot / gemi
  ('ferry', 'holiday_home', 'cross.from_ferry.stay', 95),
  ('ferry', 'car_rental', 'cross.from_ferry.car', 90),
  ('ferry', 'transfer', 'cross.from_ferry.transfer', 88),
  ('cruise', 'flight', 'cross.from_cruise.flight', 100),
  ('cruise', 'hotel', 'cross.from_cruise.hotel', 92),
  ('cruise', 'transfer', 'cross.from_cruise.transfer', 90)
) AS v(tr, of, mk, pr)
WHERE NOT EXISTS (
  SELECT 1 FROM cross_sell_rules c
  WHERE c.trigger_category_code = v.tr AND c.offer_category_code = v.of
)
ON CONFLICT DO NOTHING;
