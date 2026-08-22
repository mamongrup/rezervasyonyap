-- Popüler turizm beldeleri (destination) — ilçe altı semt/koy/mahalle vitrinleri
-- Idempotent: ON CONFLICT (slug_path) DO NOTHING
-- is_published = false — panelden veya UPDATE ile yayına alın

INSERT INTO location_pages (slug_path, district_id, region_id, country_id, region_type, title, is_published)
SELECT v.slug, d.id, r.id, r.country_id, 'destination', v.title, false
FROM districts d
JOIN regions r ON r.id = d.region_id
JOIN countries c ON c.id = r.country_id
CROSS JOIN (VALUES
  -- MUĞLA / Fethiye
  ('tr/mugla/fethiye/oludeniz', 'fethiye', 'Ölüdeniz'),
  ('tr/mugla/fethiye/calis', 'fethiye', 'Çalış'),
  ('tr/mugla/fethiye/kayakoy', 'fethiye', 'Kayaköy'),
  ('tr/mugla/fethiye/gocek', 'fethiye', 'Göcek'),
  ('tr/mugla/fethiye/ovacik', 'fethiye', 'Ovacık'),
  ('tr/mugla/fethiye/yaniklar', 'fethiye', 'Yanıklar'),
  ('tr/mugla/fethiye/faralya', 'fethiye', 'Faralya'),
  ('tr/mugla/fethiye/kabak', 'fethiye', 'Kabak'),
  -- ANTALYA / Kaş (Kaş ilçesi Muğla değil Antalya ilindedir)
  ('tr/antalya/kas/kalkan', 'kas', 'Kalkan'),
  ('tr/antalya/kas/patara', 'kas', 'Patara'),
  ('tr/antalya/kas/islamlar', 'kas', 'İslamlar'),
  ('tr/antalya/kas/gemiler', 'kas', 'Gemiler'),
  ('tr/antalya/kas/buyukcakil', 'kas', 'Büyükçakıl'),
  ('tr/antalya/kas/kucukcakil', 'kas', 'Küçükçakıl'),
  ('tr/antalya/kas/ugur', 'kas', 'Uğrar'),
  ('tr/antalya/kas/limanagzi', 'kas', 'Limanağzı'),
  -- MUĞLA / Bodrum
  ('tr/mugla/bodrum/gumusluk', 'bodrum', 'Gümüşluk'),
  ('tr/mugla/bodrum/yalikavak', 'bodrum', 'Yalıkavak'),
  ('tr/mugla/bodrum/turkbuku', 'bodrum', 'Türkbükü'),
  ('tr/mugla/bodrum/bitez', 'bodrum', 'Bitez'),
  ('tr/mugla/bodrum/gumbet', 'bodrum', 'Gümbet'),
  ('tr/mugla/bodrum/ortakent', 'bodrum', 'Ortakent'),
  ('tr/mugla/bodrum/turgutreis', 'bodrum', 'Turgutreis'),
  ('tr/mugla/bodrum/konacik', 'bodrum', 'Konacık'),
  -- MUĞLA / Marmaris
  ('tr/mugla/marmaris/icmeler', 'marmaris', 'İçmeler'),
  ('tr/mugla/marmaris/turunc', 'marmaris', 'Turunç'),
  ('tr/mugla/marmaris/hisaronu', 'marmaris', 'Hisarönü'),
  ('tr/mugla/marmaris/amos', 'marmaris', 'Amos'),
  -- MUĞLA / Datça
  ('tr/mugla/datca/palamutbuku', 'datca', 'Palamutbükü'),
  ('tr/mugla/datca/knidos', 'datca', 'Knidos'),
  ('tr/mugla/datca/emecik', 'datca', 'Emecik'),
  -- ANTALYA / Alanya
  ('tr/antalya/alanya/konakli', 'alanya', 'Konaklı'),
  ('tr/antalya/alanya/mahmutlar', 'alanya', 'Mahmutlar'),
  ('tr/antalya/alanya/avsallar', 'alanya', 'Avsallar'),
  ('tr/antalya/alanya/okurcalar', 'alanya', 'Okurcalar'),
  ('tr/antalya/alanya/incekum', 'alanya', 'İncekum'),
  ('tr/antalya/alanya/kestel', 'alanya', 'Kestel'),
  -- ANTALYA / Kemer
  ('tr/antalya/kemer/camyuva', 'kemer', 'Çamyuva'),
  ('tr/antalya/kemer/goynuk', 'kemer', 'Göynük'),
  ('tr/antalya/kemer/beldibi', 'kemer', 'Beldibi'),
  ('tr/antalya/kemer/kiris', 'kemer', 'Kiriş'),
  -- ANTALYA / Manavgat / Side
  ('tr/antalya/manavgat/side', 'manavgat', 'Side'),
  ('tr/antalya/manavgat/colakli', 'manavgat', 'Çolaklı'),
  ('tr/antalya/manavgat/kumkoy', 'manavgat', 'Kumköy'),
  ('tr/antalya/manavgat/evrenseki', 'manavgat', 'Evrenseki'),
  -- ANTALYA / Serik / Belek
  ('tr/antalya/serik/belek', 'serik', 'Belek'),
  ('tr/antalya/serik/kadriye', 'serik', 'Kadriye'),
  ('tr/antalya/serik/bogazkent', 'serik', 'Boğazkent'),
  -- ANTALYA / Kumluca
  ('tr/antalya/kumluca/adrasan', 'kumluca', 'Adrasan'),
  ('tr/antalya/kumluca/olympos', 'kumluca', 'Olympos'),
  ('tr/antalya/kumluca/cirali', 'kumluca', 'Çıralı'),
  -- ANTALYA / Demre / Kekova
  ('tr/antalya/demre/kale', 'demre', 'Kale (Üçağız)'),
  ('tr/antalya/demre/cayagzi', 'demre', 'Çayağzı'),
  -- İSTANBUL / turistik semtler (Beşiktaş, Kadıköy ilçeleri)
  ('tr/istanbul/besiktas/ortakoy', 'besiktas', 'Ortakoy'),
  ('tr/istanbul/besiktas/bebek', 'besiktas', 'Bebek'),
  ('tr/istanbul/kadikoy/moda', 'kadikoy', 'Moda'),
  ('tr/istanbul/kadikoy/caddebostan', 'kadikoy', 'Caddebostan')
) AS v(slug, dslug, title)
WHERE c.iso2 = 'TR'
  AND r.slug = split_part(v.slug, '/', 3)
  AND d.slug = v.dslug
ON CONFLICT (slug_path) DO NOTHING;
