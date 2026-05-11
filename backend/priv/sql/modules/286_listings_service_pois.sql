-- 286: İlan için temel ihtiyaç ve ulaşım mesafeleri (Temel İhtiyaçlar + Ulaşım blokları)
-- amenities_pois_json: market, restoran, cafe, eczane, hastane
-- transport_pois_json: havalimani, otogar, minibus_dolmus

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS amenities_pois_json JSONB,
  ADD COLUMN IF NOT EXISTS transport_pois_json JSONB;

COMMENT ON COLUMN listings.amenities_pois_json IS
  'Tesise en yakın temel hizmetler [{type,label,distance_km}]. Google Places API ile doldurulur.';

COMMENT ON COLUMN listings.transport_pois_json IS
  'Tesise en yakın ulaşım noktaları [{type,label,distance_km}]. Google Places API ile doldurulur.';
