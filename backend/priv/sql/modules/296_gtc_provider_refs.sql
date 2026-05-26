-- GTC API (otel + uçak) dış referans alanları

ALTER TABLE listing_hotel_details
  ADD COLUMN IF NOT EXISTS gtc_item_id TEXT;

CREATE INDEX IF NOT EXISTS idx_listing_hotel_details_gtc_item
  ON listing_hotel_details (gtc_item_id)
  WHERE gtc_item_id IS NOT NULL AND trim(gtc_item_id) <> '';

ALTER TABLE listing_flight_details
  ADD COLUMN IF NOT EXISTS gtc_route_key TEXT;

CREATE INDEX IF NOT EXISTS idx_listing_flight_details_gtc_route
  ON listing_flight_details (gtc_route_key)
  WHERE gtc_route_key IS NOT NULL AND trim(gtc_route_key) <> '';

COMMENT ON COLUMN listing_hotel_details.gtc_item_id IS 'GTC Hotel ItemId (Hotel/Hotels, Detail)';
COMMENT ON COLUMN listing_flight_details.gtc_route_key IS 'GTC uçuş rota anahtarı, örn. ayt-saw';
