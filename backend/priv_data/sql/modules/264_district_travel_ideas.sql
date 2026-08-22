-- İlçe gezi fikirleri: AI profili + tüm ilçelere location_pages kaydı
-- Bu migration idempotent'dir (ON CONFLICT / IF NOT EXISTS).

-- 1. Yeni AI feature profili: district_travel_ideas
INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'district_travel_ideas',
  1,
  E'Türkiye''de bir ilçe veya bölge için 3-5 adet "gezilesi yer" içeriği oluştur.\n'
  'YALNIZCA aşağıdaki JSON dizisi formatında yanıt ver; başka hiçbir şey yazma:\n'
  '[\n'
  '  {"id": 1, "title": "Yer Adı", "summary": "Kısa açıklama (2-3 cümle). Tarihi, doğal veya kültürel önemi belirt."},\n'
  '  ...\n'
  ']\n'
  'Kurallar:\n'
  '- id alanı 1''den başlayan tam sayı olsun\n'
  '- title: özgün, çarpıcı yer adı (Türkçe)\n'
  '- summary: 2-3 cümle, bilgilendirici ve akıcı Türkçe\n'
  '- Yalnızca JSON döndür, markdown veya açıklama ekleme',
  0.75
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature   = EXCLUDED.temperature;

-- 2. Tüm ilçeler için location_pages kaydı oluştur (eğer yoksa)
INSERT INTO location_pages (slug_path, district_id, region_type, is_published)
SELECT
  co.iso2 || '/' || r.slug || '/' || d.slug  AS slug_path,
  d.id                                         AS district_id,
  'district'                                   AS region_type,
  false                                        AS is_published
FROM   districts d
JOIN   regions   r  ON r.id  = d.region_id
JOIN   countries co ON co.id = r.country_id
ON CONFLICT (slug_path) DO NOTHING;
