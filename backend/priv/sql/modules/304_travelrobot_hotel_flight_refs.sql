-- Travelrobot (KPlus) otel ve uçak dış referans alanları

ALTER TABLE listing_hotel_details
  ADD COLUMN IF NOT EXISTS travelrobot_hotel_code TEXT;

CREATE INDEX IF NOT EXISTS idx_listing_hotel_details_travelrobot_code
  ON listing_hotel_details (travelrobot_hotel_code)
  WHERE travelrobot_hotel_code IS NOT NULL AND trim(travelrobot_hotel_code) <> '';

COMMENT ON COLUMN listing_hotel_details.travelrobot_hotel_code IS 'Travelrobot/KPlus HotelId veya ProductCode (GetHotelList)';

ALTER TABLE listing_flight_details
  ADD COLUMN IF NOT EXISTS travelrobot_flight_code TEXT;

CREATE INDEX IF NOT EXISTS idx_listing_flight_details_travelrobot_code
  ON listing_flight_details (travelrobot_flight_code)
  WHERE travelrobot_flight_code IS NOT NULL AND trim(travelrobot_flight_code) <> '';

COMMENT ON COLUMN listing_flight_details.travelrobot_flight_code IS 'Travelrobot/KPlus uçuş rota anahtarı veya FlightCode';
