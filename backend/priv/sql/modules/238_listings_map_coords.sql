-- Harita pinleri (ön yüz liste + harita görünümü)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS map_lat NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS map_lng NUMERIC(10, 7);

COMMENT ON COLUMN listings.map_lat IS 'WGS84 enlem — vitrin haritası';
COMMENT ON COLUMN listings.map_lng IS 'WGS84 boylam — vitrin haritası';
