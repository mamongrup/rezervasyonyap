-- Faz 313 — feribot sefer saatleri + gemi adı (Tilos Travel vitrin senkronu)

ALTER TABLE listing_ferry_details
  ADD COLUMN IF NOT EXISTS sailings_json JSONB;

-- sailings_json örnek:
-- {"departures":["08:25","16:30"],"vessel":"Sea Star Tilos","duration_minutes":90}
