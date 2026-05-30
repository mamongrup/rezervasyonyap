-- Turizm beldeleri (destination) için doğrulanmış WGS84 koordinatları.
-- Mesafe hesapları location_pages.map_lat/map_lng kullanır — ilçe merkezine düşmemesi için belde pinleri ayrı tutulur.
-- Idempotent: mevcut pin varsa günceller (doğruluk için).

UPDATE location_pages lp
SET map_lat = v.lat,
    map_lng = v.lng,
    updated_at = now()
FROM (VALUES
  -- MUĞLA / Fethiye
  ('tr/mugla/fethiye/oludeniz',   36.549600, 29.115000),
  ('tr/mugla/fethiye/calis',       36.653300, 29.126700),
  ('tr/mugla/fethiye/kayakoy',     36.574400, 29.091100),
  ('tr/mugla/fethiye/gocek',       36.753900, 28.942200),
  ('tr/mugla/fethiye/ovacik',      36.608900, 29.118900),
  ('tr/mugla/fethiye/yaniklar',    36.682200, 29.107800),
  ('tr/mugla/fethiye/faralya',     36.469400, 29.128900),
  ('tr/mugla/fethiye/kabak',       36.461100, 29.125000),
  -- ANTALYA / Kaş
  ('tr/antalya/kas/kalkan',        36.265300, 29.413600),
  ('tr/antalya/kas/patara',        36.263900, 29.316700),
  ('tr/antalya/kas/islamlar',      36.319400, 29.402800),
  ('tr/antalya/kas/gemiler',       36.528900, 29.475600),
  ('tr/antalya/kas/buyukcakil',    36.197800, 29.637800),
  ('tr/antalya/kas/kucukcakil',   36.199400, 29.640600),
  ('tr/antalya/kas/ugur',          36.201700, 29.635000),
  ('tr/antalya/kas/limanagzi',    36.198300, 29.647800),
  -- Eski yanlış slug (Muğla/Kaş) — taşıma sonrası koordinat
  ('tr/mugla/kas/kalkan',          36.265300, 29.413600),
  ('tr/mugla/kas/patara',          36.263900, 29.316700),
  ('tr/mugla/kas/islamlar',        36.319400, 29.402800),
  ('tr/mugla/kas/gemiler',         36.528900, 29.475600),
  ('tr/mugla/kas/buyukcakil',      36.197800, 29.637800),
  ('tr/mugla/kas/kucukcakil',     36.199400, 29.640600),
  ('tr/mugla/kas/ugur',            36.201700, 29.635000),
  ('tr/mugla/kas/limanagzi',      36.198300, 29.647800),
  -- MUĞLA / Bodrum
  ('tr/mugla/bodrum/gumusluk',     37.057200, 27.223900),
  ('tr/mugla/bodrum/yalikavak',    37.101100, 27.289700),
  ('tr/mugla/bodrum/turkbuku',     37.134700, 27.359200),
  ('tr/mugla/bodrum/bitez',        37.031100, 27.389400),
  ('tr/mugla/bodrum/gumbet',       37.026700, 27.401100),
  ('tr/mugla/bodrum/ortakent',     37.061100, 27.361100),
  ('tr/mugla/bodrum/turgutreis',   37.013900, 27.261100),
  ('tr/mugla/bodrum/konacik',      37.061700, 27.308900),
  -- MUĞLA / Marmaris
  ('tr/mugla/marmaris/icmeler',     36.758900, 28.205600),
  ('tr/mugla/marmaris/turunc',     36.748900, 28.238900),
  ('tr/mugla/marmaris/hisaronu',   36.783300, 28.033300),
  ('tr/mugla/marmaris/amos',       36.803300, 28.266700),
  -- MUĞLA / Datça
  ('tr/mugla/datca/palamutbuku',   36.721100, 27.563900),
  ('tr/mugla/datca/knidos',        36.686100, 27.375600),
  ('tr/mugla/datca/emecik',        36.761100, 27.511100),
  -- ANTALYA / Alanya
  ('tr/antalya/alanya/konakli',    36.550000, 31.916700),
  ('tr/antalya/alanya/mahmutlar',  36.488300, 32.090000),
  ('tr/antalya/alanya/avsallar',   36.616700, 31.783300),
  ('tr/antalya/alanya/okurcalar',  36.650000, 31.683300),
  ('tr/antalya/alanya/incekum',    36.566700, 31.833300),
  ('tr/antalya/alanya/kestel',     36.516700, 32.066700),
  -- ANTALYA / Kemer
  ('tr/antalya/kemer/camyuva',     36.566700, 30.566700),
  ('tr/antalya/kemer/goynuk',      36.666700, 30.550000),
  ('tr/antalya/kemer/beldibi',     36.700000, 30.583300),
  ('tr/antalya/kemer/kiris',       36.583300, 30.533300),
  -- ANTALYA / Manavgat
  ('tr/antalya/manavgat/side',     36.766700, 31.388900),
  ('tr/antalya/manavgat/colakli',  36.783300, 31.433300),
  ('tr/antalya/manavgat/kumkoy',   36.766700, 31.416700),
  ('tr/antalya/manavgat/evrenseki', 36.733300, 31.450000),
  -- ANTALYA / Serik
  ('tr/antalya/serik/belek',       36.862800, 31.055600),
  ('tr/antalya/serik/kadriye',     36.850000, 31.066700),
  ('tr/antalya/serik/bogazkent',   36.783300, 31.216700),
  -- ANTALYA / Kumluca
  ('tr/antalya/kumluca/adrasan',   36.366700, 30.433300),
  ('tr/antalya/kumluca/olympos',  36.396700, 30.475000),
  ('tr/antalya/kumluca/cirali',    36.416700, 30.483300),
  -- ANTALYA / Demre
  ('tr/antalya/demre/kale',        36.183300, 29.850000),
  ('tr/antalya/demre/cayagzi',     36.233300, 29.883300),
  -- İSTANBUL
  ('tr/istanbul/besiktas/ortakoy', 41.055300, 29.026400),
  ('tr/istanbul/besiktas/bebek',    41.077800, 29.043300),
  ('tr/istanbul/kadikoy/moda',      40.986100, 29.028900),
  ('tr/istanbul/kadikoy/caddebostan', 40.963900, 29.058300)
) AS v(slug_path, lat, lng)
WHERE lp.slug_path = v.slug_path
  AND lp.region_type = 'destination';

-- Yanlış il altındaki Kaş beldelerini doğru slug'a taşı (varsa)
UPDATE location_pages lp
SET slug_path = replace(lp.slug_path, 'tr/mugla/kas/', 'tr/antalya/kas/'),
    region_id = (SELECT r.id FROM regions r JOIN countries c ON c.id = r.country_id WHERE c.iso2 = 'TR' AND r.slug = 'antalya' LIMIT 1),
    updated_at = now()
WHERE lp.slug_path LIKE 'tr/mugla/kas/%'
  AND lp.region_type = 'destination'
  AND NOT EXISTS (
    SELECT 1 FROM location_pages x
    WHERE x.slug_path = replace(lp.slug_path, 'tr/mugla/kas/', 'tr/antalya/kas/')
  );
