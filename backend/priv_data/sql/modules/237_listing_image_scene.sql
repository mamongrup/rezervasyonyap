-- İlan galerisi: vitrin sırası için sahne etiketi (manuel; AI sonra eklenebilir)
ALTER TABLE listing_images
  ADD COLUMN IF NOT EXISTS scene_code TEXT;

COMMENT ON COLUMN listing_images.scene_code IS 'Vitrin sırası: sea_view, pool, living, bedroom, sauna, hammam, bathroom, unspecified (boş=belirtilmemiş)';
