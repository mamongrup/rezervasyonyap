-- İlan galeri AVIF kalitesi 90 (tablo üst sınırı 95).

UPDATE image_upload_profiles
SET
  quality     = 90,
  description = 'İlan galeri — yüksek kalite AVIF q90. Yönetim → Görsel kalitesi ile değiştirilebilir.'
WHERE folder = 'listings';
