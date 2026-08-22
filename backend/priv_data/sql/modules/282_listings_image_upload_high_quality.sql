-- İlan (`folder=listings`) görsel yükleme profili: daha yüksek çözünürlük + AVIF kalite.
-- Yeni yüklemeler `upload-image` ile bu profilden işlenir; mevcut İlanlar görseli yeniden yüklenene kadar eski dosyada kalır.

UPDATE image_upload_profiles
SET
  width      = 1600,
  height     = 1200,
  quality    = 78,
  thumb_size = 384,
  description = 'İlan galeri — yüksek kalite (Retina kartlar + detay). Yönetim → Görsel kalitesi ile değiştirilebilir.'
WHERE folder = 'listings';
