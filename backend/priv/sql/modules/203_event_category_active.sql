-- MODÜL: Etkinlik kategorisi — konser, festival, tiyatro ilanları (listing_event_details)
-- Sinema (140) ile restoran (150) arasında listelenir.

UPDATE product_categories
SET is_active = TRUE, sort_order = 145
WHERE code = 'event';

-- İlan türü (isteğe bağlı; null = belirtilmemiş veya karma program)
ALTER TABLE listing_event_details
  ADD COLUMN IF NOT EXISTS event_kind TEXT;

ALTER TABLE listing_event_details DROP CONSTRAINT IF EXISTS listing_event_details_event_kind_check;
ALTER TABLE listing_event_details ADD CONSTRAINT listing_event_details_event_kind_check
  CHECK (
    event_kind IS NULL
    OR event_kind IN ('concert', 'festival', 'theater', 'other')
  );

COMMENT ON COLUMN listing_event_details.event_kind IS 'Primary format: concert | festival | theater | other.';
