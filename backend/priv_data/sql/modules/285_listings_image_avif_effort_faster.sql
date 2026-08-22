-- İlan galerisi AVIF encode süresini kısaltır (Sharp effort düşük = daha hızlı CPU, biraz daha büyük dosya).
-- Kalite (quality) aynı kalır; yönetim → Görsel kalitesi ile değiştirilebilir.

UPDATE image_upload_profiles
SET
  effort      = 4,
  description = 'İlan galeri — hızlı AVIF encode (effort 4). Yönetim → Görsel kalitesi ile değiştirilebilir.'
WHERE folder = 'listings';
