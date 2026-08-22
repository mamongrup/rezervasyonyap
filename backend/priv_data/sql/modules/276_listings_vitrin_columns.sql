-- Vitrin liste kartları ve konum filtresi: kod tarafında kullanılan listings.* alanları (eksikse public/search düşer)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS review_avg NUMERIC(4, 2);

COMMENT ON COLUMN listings.featured_image_url IS 'Primary storefront hero image URL (liste kartları)';
COMMENT ON COLUMN listings.thumbnail_url IS 'Küçük önizleme görseli URL';
COMMENT ON COLUMN listings.location_name IS 'Konum etiketi (arama/filtre metni)';
COMMENT ON COLUMN listings.review_avg IS 'Özet yıldız ortalaması (örn. 4.85)';
