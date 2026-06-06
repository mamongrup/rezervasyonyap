-- AI gezi rotaları (kara) + mavi yolculuk rotaları (deniz)
-- location_pages: trip_routes_json, blue_cruise_routes_json

ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS trip_routes_json JSONB NOT NULL DEFAULT '[]';

ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS blue_cruise_routes_json JSONB NOT NULL DEFAULT '[]';

-- Kara gezi rotaları — trip_planner profili (mevcut satırı güncelle)
INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'trip_planner',
  1,
  E'Görev: Verilen Türkiye bölgesi için 1–2 adet gerçekçi günlük gezi rotası üret.\n'
    'YALNIZCA JSON dizisi döndür; markdown veya açıklama ekleme.\n\n'
    'Format:\n'
    '[\n'
    '  {\n'
    '    "id": "3-gun-kultur",\n'
    '    "title": "3 Günlük Kültür Rotası",\n'
    '    "duration_days": 3,\n'
    '    "difficulty": "kolay|orta|zor",\n'
    '    "best_season": ["ilkbahar","yaz"],\n'
    '    "summary": "2 cümle özet",\n'
    '    "days": [\n'
    '      {\n'
    '        "day": 1,\n'
    '        "title": "Gün başlığı",\n'
    '        "stops": [\n'
    '          {"name": "Mekan", "summary": "Kısa not", "duration_hours": 1.5}\n'
    '        ],\n'
    '        "overnight": "Konaklama bölgesi"\n'
    '      }\n'
    '    ]\n'
    '  }\n'
    ']\n\n'
    'Kurallar:\n'
    '- Gerçek mekanlar; uydurma yer yok.\n'
    '- duration_days ile days uzunluğu uyumlu olsun.\n'
    '- Küçük beldeler için 1 rota (2–3 gün), büyük iller için en fazla 2 rota.\n'
    '- Input''taki travel_ideas_json varsa durakları oradan esinlen.\n'
    '- locale alanı varsa tüm metinleri o dilde yaz; yoksa Türkçe.',
  0.55
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature   = EXCLUDED.temperature;

-- Mavi yolculuk rotaları — yeni profil
INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'blue_cruise_routes',
  1,
  E'Görev: Verilen Türkiye kıyı bölgesi için 0–2 adet mavi yolculuk (gulet/motoryat) rotası üret.\n'
    'Kara içi veya denize uzak yerler için boş dizi [] döndür.\n'
    'YALNIZCA JSON dizisi döndür.\n\n'
    'Format:\n'
    '[\n'
    '  {\n'
    '    "id": "gocek-fethiye-7",\n'
    '    "title": "Göcek – Fethiye Klasik Mavi Tur",\n'
    '    "duration_nights": 7,\n'
    '    "summary": "2 cümle",\n'
    '    "embarkation": {"port": "Göcek"},\n'
    '    "disembarkation": {"port": "Fethiye"},\n'
    '    "vessel_types": ["gulet","motoryat"],\n'
    '    "legs": [\n'
    '      {"day": 1, "from": "Göcek", "to": "Tersane Adası", "anchor_type": "koy", "highlights": ["yüzme","akşam yemeği"]}\n'
    '    ]\n'
    '  }\n'
    ']\n\n'
    'Kurallar:\n'
    '- Ege/Akdeniz/Marmara kıyılarında gerçek liman ve koy isimleri.\n'
    '- duration_nights ile legs uzunluğu uyumlu.\n'
    '- locale varsa o dilde; yoksa Türkçe.',
  0.50
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature   = EXCLUDED.temperature;
