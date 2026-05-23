-- Öznitelik tanımı vitrin ikonu (SVG/PNG/AVIF — /uploads/... yolu)
ALTER TABLE listing_attribute_defs
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN listing_attribute_defs.icon_url IS
  'Vitrin «Tesis özellikleri» satır ikonu; panelden yüklenen /uploads/... URL.';
