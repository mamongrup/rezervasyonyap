-- 260_image_upload_profiles.sql
-- Görsel yükleme profilleri (klasör başına boyut/kalite/effort/thumb).
--
-- Yönetim panelinden değiştirilebilir; upload-image API her isteğin başında
-- bu tabloyu okur (kısa TTL ile cache'lenir). Defaults PSI mobil hedeflerine
-- (LCP, "Serve images in next-gen formats", "Properly size images") göre
-- kalibre edilmiştir.

CREATE TABLE IF NOT EXISTS image_upload_profiles (
  folder         TEXT PRIMARY KEY,
  width          INT  NOT NULL CHECK (width  BETWEEN 64 AND 4096),
  height         INT  NOT NULL CHECK (height BETWEEN 64 AND 4096),
  fit            TEXT NOT NULL CHECK (fit IN ('cover', 'inside')),
  vivid          BOOLEAN NOT NULL DEFAULT FALSE,
  quality        INT  NOT NULL CHECK (quality BETWEEN 30 AND 95),
  effort         INT  NOT NULL CHECK (effort  BETWEEN 0  AND 9),
  thumb_size     INT  NOT NULL DEFAULT 0 CHECK (thumb_size BETWEEN 0 AND 1024),
  description    TEXT,
  display_order  INT  NOT NULL DEFAULT 100,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  image_upload_profiles IS 'Görsel yükleme klasörleri için boyut/kalite/thumb profili (PSI uyumlu).';
COMMENT ON COLUMN image_upload_profiles.fit         IS 'cover: tam kırp (fotoğraf). inside: oranı koru (logo/belge).';
COMMENT ON COLUMN image_upload_profiles.vivid       IS 'Saturation/brightness/kontrast boost (seyahat fotoğrafı).';
COMMENT ON COLUMN image_upload_profiles.thumb_size  IS '>0 ise aynı stem + -thumb.avif kare küçük versiyon üretilir.';

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_image_upload_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_image_upload_profiles_updated_at ON image_upload_profiles;
CREATE TRIGGER trg_image_upload_profiles_updated_at
BEFORE UPDATE ON image_upload_profiles
FOR EACH ROW EXECUTE FUNCTION set_image_upload_profiles_updated_at();

-- Default seed: PSI dengeli profil (kalite 60, effort 6).
-- ON CONFLICT DO NOTHING — yeniden çalışsa bile manuel değişiklikler korunur.
INSERT INTO image_upload_profiles
  (folder, width, height, fit, vivid, quality, effort, thumb_size, description, display_order)
VALUES
  ('hero',           1440,  810, 'cover',  TRUE,  60, 6, 256, 'Anasayfa hero / üst banner görselleri (LCP adayı).',                10),
  ('site',           1440,  810, 'cover',  TRUE,  60, 6,   0, 'Site geneli vitrin görselleri (logo dışı).',                        20),
  ('regions',        1080,  720, 'cover',  TRUE,  60, 6, 256, 'Bölge/destinasyon kart görselleri.',                                30),
  ('listings',        800,  600, 'cover',  TRUE,  60, 6, 256, 'İlan (otel/araç) galeri görselleri — kart/grid önizlemeli.',         40),
  ('tours',           800,  600, 'cover',  TRUE,  60, 6, 256, 'Tur/aktivite görselleri.',                                          50),
  ('events',          800,  600, 'cover',  TRUE,  60, 6, 256, 'Etkinlik görselleri.',                                              60),
  ('travel_ideas',    800,  600, 'cover',  TRUE,  60, 6, 256, 'Seyahat fikri / koleksiyon görselleri.',                            70),
  ('blog',           1080,  566, 'cover',  TRUE,  60, 6,   0, 'Blog kapak ve içerik görselleri.',                                  80),
  ('pages',          1080,  720, 'cover',  TRUE,  60, 6,   0, 'Genel CMS sayfa görselleri.',                                       90),
  ('icerik',         1080,  720, 'cover',  TRUE,  60, 6,   0, 'Sayfa/blog içerik (inline) görselleri.',                           100),
  ('general',        1080,  810, 'cover',  TRUE,  60, 6,   0, 'Sınıflandırılmamış genel görseller.',                              110),
  ('branding',        800,  600, 'inside', FALSE, 82, 6,   0, 'Logo/favicon — kayıpsız izlenim öncelikli (kalite yüksek).',       120),
  ('supplier-docs',  1400, 2000, 'inside', FALSE, 82, 6,   0, 'Tedarikçi belge görüntüleri (PDF değil; A4 dikey).',                130)
ON CONFLICT (folder) DO NOTHING;
