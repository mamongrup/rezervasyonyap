-- location_pages: destination bölge tipi + ülke bilgileri JSON kolonu

-- Önce eski CHECK kısıtını kaldır, yenisini ekle
ALTER TABLE location_pages DROP CONSTRAINT IF EXISTS location_pages_region_type_check;
ALTER TABLE location_pages ADD CONSTRAINT location_pages_region_type_check
  CHECK (region_type IN ('country', 'province', 'district', 'destination'));

-- Ülke/bölge tip bazlı zengin bilgi alanı
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS country_info_json JSONB NOT NULL DEFAULT '{}';
