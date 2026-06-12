-- Otel oda tipleri: envanter adedi + oda bazlı müsaitlik takvimi.

ALTER TABLE hotel_rooms
  ADD COLUMN IF NOT EXISTS unit_count SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE hotel_rooms
  DROP CONSTRAINT IF EXISTS hotel_rooms_unit_count_check;

ALTER TABLE hotel_rooms
  ADD CONSTRAINT hotel_rooms_unit_count_check CHECK (unit_count > 0);

CREATE TABLE IF NOT EXISTS hotel_room_availability_calendar (
  hotel_room_id UUID NOT NULL REFERENCES hotel_rooms (id) ON DELETE CASCADE,
  day DATE NOT NULL,
  available_units SMALLINT NOT NULL DEFAULT 0,
  price_override NUMERIC(12, 2),
  PRIMARY KEY (hotel_room_id, day),
  CONSTRAINT hotel_room_avail_units_nonneg CHECK (available_units >= 0)
);

CREATE INDEX IF NOT EXISTS idx_hotel_room_avail_room_day
  ON hotel_room_availability_calendar (hotel_room_id, day);
