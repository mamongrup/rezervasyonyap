-- Bölge vitrinı: gezi fikirleri altında 3 sütun mekan + mesafe düzeni (JSON).
ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS nearby_vitrin_columns_json JSONB DEFAULT NULL;

COMMENT ON COLUMN location_pages.nearby_vitrin_columns_json IS
  'Vitrin: columns[].title + rows[].label; eşleme rows[].typeIds (region-places type id) ve/veya rows[].googleTypes. Boş {"columns":[]} = site varsayılanları.';
