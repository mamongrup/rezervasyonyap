-- Travelrobot (KPlus) dış referans alanları

ALTER TABLE listing_tour_details
  ADD COLUMN IF NOT EXISTS travelrobot_tour_code TEXT;

CREATE INDEX IF NOT EXISTS idx_listing_tour_details_travelrobot_code
  ON listing_tour_details (travelrobot_tour_code)
  WHERE travelrobot_tour_code IS NOT NULL AND trim(travelrobot_tour_code) <> '';

COMMENT ON COLUMN listing_tour_details.travelrobot_tour_code IS 'Travelrobot/KPlus TourCode (GetTourDetails, SearchTour)';
