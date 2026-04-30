-- location_pages tablosuna kapak resmi sütunu
ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS cover_image TEXT NOT NULL DEFAULT '';
