-- Bella Villa 1–5: yanlış Fethiye/Ölüdeniz/Ovacık/Kayaköy seed metinlerini
-- İslamlar, Kaş (Birvillas) konumuna düzelt; pazarlama soneklerini düşür.
-- Seed UUID'ler (b1111111-000N) ile slug bella-villa-N ve villa-bella-*-islamlar hedeflenir.

-- ── 1) Konum / lisans / koordinat (seed + eski slug) ──────────────────────────
UPDATE listings l
SET location_name = v.location_name,
    map_lat = v.map_lat,
    map_lng = v.map_lng,
    ministry_license_ref = COALESCE(NULLIF(trim(l.ministry_license_ref), ''), v.license),
    updated_at = now()
FROM (VALUES
  ('b1111111-0001-4000-a000-000000000001'::uuid, 'bella-villa-1', 'İslamlar, Kaş, Antalya', 36.300408::float8, 29.410383::float8, '07-9339'),
  ('b1111111-0002-4000-a000-000000000002'::uuid, 'bella-villa-2', 'İslamlar, Kaş, Antalya', 36.300408::float8, 29.410383::float8, '07-9338'),
  ('b1111111-0003-4000-a000-000000000003'::uuid, 'bella-villa-3', 'İslamlar, Kaş, Antalya', 36.300408::float8, 29.410383::float8, '07-9337'),
  ('b1111111-0004-4000-a000-000000000004'::uuid, 'bella-villa-4', 'İslamlar, Kaş, Antalya', 36.300408::float8, 29.410383::float8, '07-9336'),
  ('b1111111-0005-4000-a000-000000000005'::uuid, 'bella-villa-5', 'İslamlar, Kaş, Antalya', 36.300408::float8, 29.410383::float8, '07-9335')
) AS v(id, slug, location_name, map_lat, map_lng, license)
WHERE l.id = v.id OR lower(l.slug) = lower(v.slug);

UPDATE listing_attributes la
SET value_json = coalesce(la.value_json, '{}'::jsonb) || jsonb_build_object(
  'city', 'Kaş',
  'address', 'İslamlar, Kaş, Antalya, Türkiye',
  'province_city', 'Antalya',
  'district_label', 'İslamlar',
  'region_display', 'İslamlar, Kaş',
  'lat', '36.300408',
  'lng', '29.410383'
)
FROM listings l
WHERE la.listing_id = l.id
  AND la.group_code = 'listing_meta'
  AND la.key = 'v1'
  AND (
    l.id IN (
      'b1111111-0001-4000-a000-000000000001'::uuid,
      'b1111111-0002-4000-a000-000000000002'::uuid,
      'b1111111-0003-4000-a000-000000000003'::uuid,
      'b1111111-0004-4000-a000-000000000004'::uuid,
      'b1111111-0005-4000-a000-000000000005'::uuid
    )
    OR lower(l.slug) IN ('bella-villa-1','bella-villa-2','bella-villa-3','bella-villa-4','bella-villa-5')
  );

-- Seed Manuel kopyalar: gerçek Birvillas ilanları varken yayın listesini kirletmesin
UPDATE listings
SET status = 'archived', updated_at = now()
WHERE id IN (
  'b1111111-0001-4000-a000-000000000001'::uuid,
  'b1111111-0002-4000-a000-000000000002'::uuid,
  'b1111111-0003-4000-a000-000000000003'::uuid,
  'b1111111-0004-4000-a000-000000000004'::uuid,
  'b1111111-0005-4000-a000-000000000005'::uuid
)
AND status IS DISTINCT FROM 'archived';

-- ── 2) Villa Bella 1 Orkide ───────────────────────────────────────────────────
INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, v.title, v.description
FROM listings l
CROSS JOIN locales lo
JOIN (VALUES
  ('tr', 'Villa Bella 1 Orkide', $tr1$<section><h2>Villa Bella 1 Orkide: İslamlar’da özel havuzlu villa</h2>
<p>Villa Bella 1 Orkide, Kaş’ın İslamlar bölgesinde deniz ve doğa manzarasına yakın, sakin bir konaklama ortamı sunar. 2 kişilik kapasiteye sahip villa; 1 yatak odası, 1 banyo ve yalnızca misafirlerin kullanımındaki özel havuzuyla çiftler için düzenlenmiştir.</p>
<h2>Konaklama ve yaşam alanları</h2>
<ul><li>Jakuzili ve özel banyolu bir çift kişilik yatak odası</li><li>Klimalı yaşam alanı ve Wi-Fi</li><li>Tam donanımlı mutfak</li><li>Özel otopark ve barbekü alanı</li></ul>
<h2>Havuz ve dış alan</h2>
<p>Korunaklı açık havuz 7,3 × 3,5 metre ölçülerinde ve 1,5 metre derinliğindedir. Havuz ve villa ortak kullanıma açık değildir. Kırsal konum nedeniyle araç kullanımı önerilir; Kalkan merkezi araçla yaklaşık 10 dakika, en yakın market ve restoranlar yaklaşık 5 dakika mesafededir.</p>
<h2>Önemli bilgiler</h2>
<ul><li>Kültür ve Turizm Bakanlığı belge numarası: 07-9339</li><li>Kesin fiyat, müsaitlik, depozito ve iptal koşulları rezervasyon tarihine göre doğrulanmalıdır.</li><li>İslamlar kırsal bir bölge olduğundan mevsimsel böceklenme görülebilir.</li></ul></section>$tr1$),
  ('en', 'Villa Bella 1 Orkide', $en1$<section><h2>Villa Bella 1 Orkide — private pool villa in İslamlar</h2>
<p>Villa Bella 1 Orkide is in İslamlar, Kaş (Antalya), near sea and nature views. It sleeps 2 guests with 1 bedroom, 1 bathroom and a private pool for guests only.</p>
<ul><li>Double bedroom with ensuite bathroom and jacuzzi</li><li>Air-conditioned living area and Wi-Fi</li><li>Fully equipped kitchen, parking and BBQ</li></ul>
<p>Sheltered outdoor pool about 7.3 × 3.5 × 1.5 m. Kalkan centre is about 10 minutes by car. Ministry licence: 07-9339.</p></section>$en1$),
  ('de', 'Villa Bella 1 Orkide', $de1$<section><h2>Villa Bella 1 Orkide — Ferienvilla mit Privatpool in İslamlar</h2>
<p>Villa Bella 1 Orkide liegt in İslamlar, Kaş (Antalya), nahe Meer- und Naturpanorama. Für 2 Gäste: 1 Schlafzimmer, 1 Bad und privater Pool.</p>
<ul><li>Doppelzimmer mit eigenem Bad und Whirlpool</li><li>Klimatisierter Wohnbereich und WLAN</li><li>Voll ausgestattete Küche, Parkplatz und Grill</li></ul>
<p>Geschützter Außenpool ca. 7,3 × 3,5 × 1,5 m. Kalkan Zentrum ca. 10 Minuten mit dem Auto. Lizenz: 07-9339.</p></section>$de1$),
  ('ru', 'Villa Bella 1 Orkide', $ru1$<section><h2>Villa Bella 1 Orkide — вилла с частным бассейном в İslamlar</h2>
<p>Villa Bella 1 Orkide находится в районе İslamlar, Kaş (Antalya). До 2 гостей: 1 спальня, 1 ванная и частный бассейн только для гостей.</p>
<ul><li>Спальня с двуспальной кроватью, собственной ванной и джакузи</li><li>Гостиная с кондиционером и Wi‑Fi</li><li>Полностью оборудованная кухня, парковка и барбекю</li></ul>
<p>Открытый бассейн ок. 7,3 × 3,5 × 1,5 м. До центра Kalkan около 10 минут на авто. Лицензия: 07-9339.</p></section>$ru1$),
  ('zh', 'Villa Bella 1 Orkide', $zh1$<section><h2>Villa Bella 1 Orkide — İslamlar 私人泳池别墅</h2>
<p>Villa Bella 1 Orkide 位于 Antalya 省 Kaş 的 İslamlar，靠近海景与自然景观。可住 2 人，含 1 间卧室、1 间浴室及仅供客人使用的私人泳池。</p>
<ul><li>带独立卫浴与按摩浴缸的双人卧室</li><li>空调起居室与 Wi‑Fi</li><li>全套厨房、停车与烧烤区</li></ul>
<p>遮蔽室外泳池约 7.3 × 3.5 × 1.5 米。驾车约 10 分钟可达 Kalkan 中心。旅游经营许可证：07-9339。</p></section>$zh1$),
  ('fr', 'Villa Bella 1 Orkide', $fr1$<section><h2>Villa Bella 1 Orkide — villa avec piscine privée à İslamlar</h2>
<p>Villa Bella 1 Orkide se situe à İslamlar, Kaş (Antalya), près de la mer et de la nature. Capacité 2 personnes : 1 chambre, 1 salle de bain et piscine privée réservée aux hôtes.</p>
<ul><li>Chambre double avec salle de bain privative et jacuzzi</li><li>Salon climatisé et Wi‑Fi</li><li>Cuisine équipée, parking et barbecue</li></ul>
<p>Piscine extérieure abritée d’environ 7,3 × 3,5 × 1,5 m. Centre de Kalkan à environ 10 minutes en voiture. Licence : 07-9339.</p></section>$fr1$)
) AS v(locale, title, description) ON lower(lo.code) = v.locale
WHERE l.id = 'b1111111-0001-4000-a000-000000000001'::uuid
   OR lower(l.slug) IN ('bella-villa-1', 'villa-bella-1-orkide-islamlar')
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = CASE
    WHEN EXISTS (
      SELECT 1 FROM listings lx
      WHERE lx.id = listing_translations.listing_id
        AND lower(lx.slug) LIKE 'villa-bella-%'
    )
      AND coalesce(listing_translations.description, '') !~* 'fethiye|ölüdeniz|oludeniz|ovac[iı]k|kayak[oö]y|hisar[oö]n[uü]|babada[gğ]'
      AND length(coalesce(listing_translations.description, '')) > 80
    THEN listing_translations.description
    ELSE EXCLUDED.description
  END;

-- ── 3) Villa Bella 2 Sardunya ─────────────────────────────────────────────────
INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, v.title, v.description
FROM listings l
CROSS JOIN locales lo
JOIN (VALUES
  ('tr', 'Villa Bella 2 Sardunya', $tr2$<section><h2>Villa Bella 2 Sardunya: İslamlar’da özel havuzlu villa</h2>
<p>Villa Bella 2 Sardunya, Kaş’ın İslamlar bölgesinde deniz ve doğa manzarasına yakın, sakin bir konaklama ortamı sunar. 4 kişilik kapasiteye sahip villa; 2 yatak odası, 2 banyo ve yalnızca misafirlerin kullanımındaki özel havuzuyla aileler veya çiftler için düzenlenmiştir.</p>
<h2>Konaklama ve yaşam alanları</h2>
<ul><li>Jakuzili bir çift kişilik yatak odası</li><li>İki tek kişilik yatak bulunan ikinci yatak odası</li><li>Klimalı yaşam alanı ve Wi-Fi</li><li>Tam donanımlı mutfak</li><li>Özel otopark ve barbekü alanı</li></ul>
<h2>Havuz ve dış alan</h2>
<p>Korunaklı açık havuz 7,3 × 3,5 metre ölçülerinde ve 1,5 metre derinliğindedir. Havuz ve villa ortak kullanıma açık değildir. Kırsal konum nedeniyle araç kullanımı önerilir; Kalkan merkezi araçla yaklaşık 10 dakika, en yakın market ve restoranlar yaklaşık 5 dakika mesafededir.</p>
<h2>Önemli bilgiler</h2>
<ul><li>Kültür ve Turizm Bakanlığı belge numarası: 07-9338</li><li>Kesin fiyat, müsaitlik, depozito ve iptal koşulları rezervasyon tarihine göre doğrulanmalıdır.</li><li>İslamlar kırsal bir bölge olduğundan mevsimsel böceklenme görülebilir.</li></ul></section>$tr2$),
  ('en', 'Villa Bella 2 Sardunya', $en2$<section><h2>Villa Bella 2 Sardunya — private pool villa in İslamlar</h2>
<p>Villa Bella 2 Sardunya is in İslamlar, Kaş (Antalya). It sleeps 4 guests with 2 bedrooms, 2 bathrooms and a private guest-only pool.</p>
<ul><li>Double bedroom with jacuzzi</li><li>Second bedroom with twin beds</li><li>Air-conditioned living area, Wi-Fi, kitchen, parking and BBQ</li></ul>
<p>Sheltered outdoor pool about 7.3 × 3.5 × 1.5 m. Kalkan centre about 10 minutes by car. Ministry licence: 07-9338.</p></section>$en2$),
  ('de', 'Villa Bella 2 Sardunya', $de2$<section><h2>Villa Bella 2 Sardunya — Ferienvilla mit Privatpool in İslamlar</h2>
<p>Villa Bella 2 Sardunya liegt in İslamlar, Kaş (Antalya). Für 4 Gäste: 2 Schlafzimmer, 2 Bäder und privater Pool.</p>
<ul><li>Doppelzimmer mit Whirlpool</li><li>Zweites Schlafzimmer mit zwei Einzelbetten</li><li>Klimatisierter Wohnbereich, WLAN, Küche, Parkplatz und Grill</li></ul>
<p>Geschützter Außenpool ca. 7,3 × 3,5 × 1,5 m. Lizenz: 07-9338.</p></section>$de2$),
  ('ru', 'Villa Bella 2 Sardunya', $ru2$<section><h2>Villa Bella 2 Sardunya — вилла с частным бассейном в İslamlar</h2>
<p>Villa Bella 2 Sardunya в районе İslamlar, Kaş (Antalya). До 4 гостей: 2 спальни, 2 ванные и частный бассейн.</p>
<ul><li>Спальня с двуспальной кроватью и джакузи</li><li>Вторая спальня с двумя односпальными кроватями</li><li>Гостиная с кондиционером, Wi‑Fi, кухня, парковка и барбекю</li></ul>
<p>Открытый бассейн ок. 7,3 × 3,5 × 1,5 м. Лицензия: 07-9338.</p></section>$ru2$),
  ('zh', 'Villa Bella 2 Sardunya', $zh2$<section><h2>Villa Bella 2 Sardunya — İslamlar 私人泳池别墅</h2>
<p>Villa Bella 2 Sardunya 位于 Kaş İslamlar。可住 4 人，含 2 间卧室、2 间浴室及私人泳池。</p>
<ul><li>带按摩浴缸的双人卧室</li><li>第二间卧室含两张单人床</li><li>空调起居室、Wi‑Fi、厨房、停车与烧烤</li></ul>
<p>遮蔽室外泳池约 7.3 × 3.5 × 1.5 米。许可证：07-9338。</p></section>$zh2$),
  ('fr', 'Villa Bella 2 Sardunya', $fr2$<section><h2>Villa Bella 2 Sardunya — villa avec piscine privée à İslamlar</h2>
<p>Villa Bella 2 Sardunya se situe à İslamlar, Kaş (Antalya). Capacité 4 personnes : 2 chambres, 2 salles de bain et piscine privée.</p>
<ul><li>Chambre double avec jacuzzi</li><li>Seconde chambre avec lits jumeaux</li><li>Salon climatisé, Wi‑Fi, cuisine, parking et barbecue</li></ul>
<p>Piscine extérieure abritée d’environ 7,3 × 3,5 × 1,5 m. Licence : 07-9338.</p></section>$fr2$)
) AS v(locale, title, description) ON lower(lo.code) = v.locale
WHERE l.id = 'b1111111-0002-4000-a000-000000000002'::uuid
   OR lower(l.slug) IN ('bella-villa-2', 'villa-bella-2-sardunya-islamlar')
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = CASE
    WHEN EXISTS (
      SELECT 1 FROM listings lx
      WHERE lx.id = listing_translations.listing_id
        AND lower(lx.slug) LIKE 'villa-bella-%'
    )
      AND coalesce(listing_translations.description, '') !~* 'fethiye|ölüdeniz|oludeniz|ovac[iı]k|kayak[oö]y|hisar[oö]n[uü]|babada[gğ]'
      AND length(coalesce(listing_translations.description, '')) > 80
    THEN listing_translations.description
    ELSE EXCLUDED.description
  END;

-- ── 4) Villa Bella 3 Lale ─────────────────────────────────────────────────────
INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, v.title, v.description
FROM listings l
CROSS JOIN locales lo
JOIN (VALUES
  ('tr', 'Villa Bella 3 Lale', $tr3$<section><h2>Villa Bella 3 Lale: İslamlar’da özel havuzlu villa</h2>
<p>Villa Bella 3 Lale, Kaş’ın İslamlar bölgesinde deniz ve doğa manzarasına yakın, sakin bir konaklama ortamı sunar. 4 kişilik kapasiteye sahip villa; 2 yatak odası, 2 banyo ve yalnızca misafirlerin kullanımındaki özel havuzuyla aileler veya çiftler için düzenlenmiştir.</p>
<h2>Konaklama ve yaşam alanları</h2>
<ul><li>Özel banyolu iki yatak odası</li><li>Toplam dört kişilik konaklama düzeni ve jakuzi</li><li>Klimalı yaşam alanı ve Wi-Fi</li><li>Tam donanımlı mutfak</li><li>Özel otopark ve barbekü alanı</li></ul>
<h2>Havuz ve dış alan</h2>
<p>Özel açık havuz 7,3 × 3,5 metre ölçülerinde ve 1,5 metre derinliğindedir. Havuz ve villa ortak kullanıma açık değildir. Kırsal konum nedeniyle araç kullanımı önerilir; Kalkan merkezi araçla yaklaşık 10 dakika, en yakın market ve restoranlar yaklaşık 5 dakika mesafededir.</p>
<h2>Önemli bilgiler</h2>
<ul><li>Kültür ve Turizm Bakanlığı belge numarası: 07-9337</li><li>Kesin fiyat, müsaitlik, depozito ve iptal koşulları rezervasyon tarihine göre doğrulanmalıdır.</li><li>İslamlar kırsal bir bölge olduğundan mevsimsel böceklenme görülebilir.</li></ul></section>$tr3$),
  ('en', 'Villa Bella 3 Lale', $en3$<section><h2>Villa Bella 3 Lale — private pool villa in İslamlar</h2>
<p>Villa Bella 3 Lale is in İslamlar, Kaş (Antalya). It sleeps 4 guests with 2 bedrooms, 2 bathrooms and a private pool.</p>
<ul><li>Two bedrooms with private bathrooms</li><li>Jacuzzi comfort, kitchen, Wi-Fi, parking and BBQ</li></ul>
<p>Private outdoor pool about 7.3 × 3.5 × 1.5 m. Ministry licence: 07-9337.</p></section>$en3$),
  ('de', 'Villa Bella 3 Lale', $de3$<section><h2>Villa Bella 3 Lale — Ferienvilla mit Privatpool in İslamlar</h2>
<p>Villa Bella 3 Lale liegt in İslamlar, Kaş (Antalya). Für 4 Gäste: 2 Schlafzimmer, 2 Bäder und privater Pool.</p>
<ul><li>Zwei Schlafzimmer mit eigenem Bad</li><li>Whirlpool, Küche, WLAN, Parkplatz und Grill</li></ul>
<p>Privater Außenpool ca. 7,3 × 3,5 × 1,5 m. Lizenz: 07-9337.</p></section>$de3$),
  ('ru', 'Villa Bella 3 Lale', $ru3$<section><h2>Villa Bella 3 Lale — вилла с частным бассейном в İslamlar</h2>
<p>Villa Bella 3 Lale в районе İslamlar, Kaş (Antalya). До 4 гостей: 2 спальни, 2 ванные и частный бассейн.</p>
<ul><li>Две спальни с собственными ванными</li><li>Джакузи, кухня, Wi‑Fi, парковка и барбекю</li></ul>
<p>Частный открытый бассейн ок. 7,3 × 3,5 × 1,5 м. Лицензия: 07-9337.</p></section>$ru3$),
  ('zh', 'Villa Bella 3 Lale', $zh3$<section><h2>Villa Bella 3 Lale — İslamlar 私人泳池别墅</h2>
<p>Villa Bella 3 Lale 位于 Kaş İslamlar。可住 4 人，含 2 间卧室、2 间浴室及私人泳池。</p>
<ul><li>两间带独立卫浴的卧室</li><li>按摩浴缸、厨房、Wi‑Fi、停车与烧烤</li></ul>
<p>私人室外泳池约 7.3 × 3.5 × 1.5 米。许可证：07-9337。</p></section>$zh3$),
  ('fr', 'Villa Bella 3 Lale', $fr3$<section><h2>Villa Bella 3 Lale — villa avec piscine privée à İslamlar</h2>
<p>Villa Bella 3 Lale se situe à İslamlar, Kaş (Antalya). Capacité 4 personnes : 2 chambres, 2 salles de bain et piscine privée.</p>
<ul><li>Deux chambres avec salle de bain privative</li><li>Jacuzzi, cuisine, Wi‑Fi, parking et barbecue</li></ul>
<p>Piscine extérieure privée d’environ 7,3 × 3,5 × 1,5 m. Licence : 07-9337.</p></section>$fr3$)
) AS v(locale, title, description) ON lower(lo.code) = v.locale
WHERE l.id = 'b1111111-0003-4000-a000-000000000003'::uuid
   OR lower(l.slug) IN ('bella-villa-3', 'villa-bella-3-lale-islamlar')
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = CASE
    WHEN EXISTS (
      SELECT 1 FROM listings lx
      WHERE lx.id = listing_translations.listing_id
        AND lower(lx.slug) LIKE 'villa-bella-%'
    )
      AND coalesce(listing_translations.description, '') !~* 'fethiye|ölüdeniz|oludeniz|ovac[iı]k|kayak[oö]y|hisar[oö]n[uü]|babada[gğ]'
      AND length(coalesce(listing_translations.description, '')) > 80
    THEN listing_translations.description
    ELSE EXCLUDED.description
  END;

-- ── 5) Villa Bella 4 Leylak ───────────────────────────────────────────────────
INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, v.title, v.description
FROM listings l
CROSS JOIN locales lo
JOIN (VALUES
  ('tr', 'Villa Bella 4 Leylak', $tr4$<section><h2>Villa Bella 4 Leylak: İslamlar’da özel havuzlu villa</h2>
<p>Villa Bella 4 Leylak, Kaş’ın İslamlar bölgesinde deniz ve doğa manzarasına yakın, sakin bir konaklama ortamı sunar. 2 kişilik kapasiteye sahip villa; 1 yatak odası, 1 banyo ve yalnızca misafirlerin kullanımındaki özel havuzuyla çiftler için düzenlenmiştir.</p>
<h2>Konaklama ve yaşam alanları</h2>
<ul><li>Bir çift kişilik yatak bulunan yatak odası</li><li>Özel banyo ve jakuzi</li><li>Klimalı yaşam alanı ve Wi-Fi</li><li>Tam donanımlı mutfak</li><li>Özel otopark ve barbekü alanı</li></ul>
<h2>Havuz ve dış alan</h2>
<p>Villa, dışarıdan görünürlüğü azaltılmış özel açık havuz ve jakuzi olanağı sunar. Havuz ve villa ortak kullanıma açık değildir. Kırsal konum nedeniyle araç kullanımı önerilir; Kalkan merkezi araçla yaklaşık 10 dakika, en yakın market ve restoranlar yaklaşık 5 dakika mesafededir.</p>
<h2>Önemli bilgiler</h2>
<ul><li>Kültür ve Turizm Bakanlığı belge numarası: 07-9336</li><li>Kesin fiyat, müsaitlik, depozito ve iptal koşulları rezervasyon tarihine göre doğrulanmalıdır.</li><li>İslamlar kırsal bir bölge olduğundan mevsimsel böceklenme görülebilir.</li></ul></section>$tr4$),
  ('en', 'Villa Bella 4 Leylak', $en4$<section><h2>Villa Bella 4 Leylak — private pool villa in İslamlar</h2>
<p>Villa Bella 4 Leylak is in İslamlar, Kaş (Antalya). It sleeps 2 guests with 1 bedroom, 1 bathroom and a private pool with reduced external visibility.</p>
<ul><li>Double bedroom with private bathroom and jacuzzi</li><li>Kitchen, Wi-Fi, parking and BBQ</li></ul>
<p>Ministry licence: 07-9336. Kalkan centre about 10 minutes by car.</p></section>$en4$),
  ('de', 'Villa Bella 4 Leylak', $de4$<section><h2>Villa Bella 4 Leylak — Ferienvilla mit Privatpool in İslamlar</h2>
<p>Villa Bella 4 Leylak liegt in İslamlar, Kaş (Antalya). Für 2 Gäste: 1 Schlafzimmer, 1 Bad und privater Pool mit reduzierter Einsehbarkeit.</p>
<ul><li>Doppelzimmer mit Bad und Whirlpool</li><li>Küche, WLAN, Parkplatz und Grill</li></ul>
<p>Lizenz: 07-9336.</p></section>$de4$),
  ('ru', 'Villa Bella 4 Leylak', $ru4$<section><h2>Villa Bella 4 Leylak — вилла с частным бассейном в İslamlar</h2>
<p>Villa Bella 4 Leylak в районе İslamlar, Kaş (Antalya). До 2 гостей: 1 спальня, 1 ванная и частный бассейн с пониженной видимостью снаружи.</p>
<ul><li>Спальня с двуспальной кроватью, ванной и джакузи</li><li>Кухня, Wi‑Fi, парковка и барбекю</li></ul>
<p>Лицензия: 07-9336.</p></section>$ru4$),
  ('zh', 'Villa Bella 4 Leylak', $zh4$<section><h2>Villa Bella 4 Leylak — İslamlar 私人泳池别墅</h2>
<p>Villa Bella 4 Leylak 位于 Kaş İslamlar。可住 2 人，含 1 间卧室、1 间浴室及对外可见度较低的私人泳池。</p>
<ul><li>带独立卫浴与按摩浴缸的双人卧室</li><li>厨房、Wi‑Fi、停车与烧烤</li></ul>
<p>许可证：07-9336。</p></section>$zh4$),
  ('fr', 'Villa Bella 4 Leylak', $fr4$<section><h2>Villa Bella 4 Leylak — villa avec piscine privée à İslamlar</h2>
<p>Villa Bella 4 Leylak se situe à İslamlar, Kaş (Antalya). Capacité 2 personnes : 1 chambre, 1 salle de bain et piscine privée à visibilité réduite de l’extérieur.</p>
<ul><li>Chambre double avec salle de bain et jacuzzi</li><li>Cuisine, Wi‑Fi, parking et barbecue</li></ul>
<p>Licence : 07-9336.</p></section>$fr4$)
) AS v(locale, title, description) ON lower(lo.code) = v.locale
WHERE l.id = 'b1111111-0004-4000-a000-000000000004'::uuid
   OR lower(l.slug) IN ('bella-villa-4', 'villa-bella-4-leylak-islamlar')
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = CASE
    WHEN EXISTS (
      SELECT 1 FROM listings lx
      WHERE lx.id = listing_translations.listing_id
        AND lower(lx.slug) LIKE 'villa-bella-%'
    )
      AND coalesce(listing_translations.description, '') !~* 'fethiye|ölüdeniz|oludeniz|ovac[iı]k|kayak[oö]y|hisar[oö]n[uü]|babada[gğ]'
      AND length(coalesce(listing_translations.description, '')) > 80
    THEN listing_translations.description
    ELSE EXCLUDED.description
  END;

-- ── 6) Villa Bella 5 Kartal Yuvası ────────────────────────────────────────────
INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, v.title, v.description
FROM listings l
CROSS JOIN locales lo
JOIN (VALUES
  ('tr', 'Villa Bella 5 Kartal Yuvası', $tr5$<section><h2>Villa Bella 5 Kartal Yuvası: İslamlar’da özel havuzlu villa</h2>
<p>Villa Bella 5 Kartal Yuvası, Kaş’ın İslamlar bölgesinde deniz ve doğa manzarasına yakın, sakin bir konaklama ortamı sunar. 6 kişilik kapasiteye sahip villa; 3 yatak odası, 3 banyo ve yalnızca misafirlerin kullanımındaki özel havuzuyla aileler veya gruplar için düzenlenmiştir.</p>
<h2>Konaklama ve yaşam alanları</h2>
<ul><li>Üç çift kişilik yatak odası</li><li>Her yatak odasında özel banyo</li><li>Yatak odalarından birinde jakuzi</li><li>Klimalı yaşam alanı ve Wi-Fi</li><li>Tam donanımlı mutfak</li><li>Özel otopark ve barbekü alanı</li></ul>
<h2>Havuz ve dış alan</h2>
<p>Özel açık havuz 11 × 4 metre ölçülerinde ve 1,5 metre derinliğindedir. Havuz ve villa ortak kullanıma açık değildir. Kırsal konum nedeniyle araç kullanımı önerilir; Kalkan merkezi araçla yaklaşık 10 dakika, en yakın market ve restoranlar yaklaşık 5 dakika mesafededir.</p>
<h2>Önemli bilgiler</h2>
<ul><li>Kültür ve Turizm Bakanlığı belge numarası: 07-9335</li><li>Kesin fiyat, müsaitlik, depozito ve iptal koşulları rezervasyon tarihine göre doğrulanmalıdır.</li><li>İslamlar kırsal bir bölge olduğundan mevsimsel böceklenme görülebilir.</li></ul></section>$tr5$),
  ('en', 'Villa Bella 5 Kartal Yuvası', $en5$<section><h2>Villa Bella 5 Kartal Yuvası — private pool villa in İslamlar</h2>
<p>Villa Bella 5 Kartal Yuvası is in İslamlar, Kaş (Antalya). It sleeps 6 guests with 3 bedrooms, 3 bathrooms and a private guest-only pool.</p>
<ul><li>Three double bedrooms, each with private bathroom</li><li>Jacuzzi in one bedroom</li><li>Kitchen, Wi-Fi, parking and BBQ</li></ul>
<p>Private outdoor pool about 11 × 4 × 1.5 m. Ministry licence: 07-9335.</p></section>$en5$),
  ('de', 'Villa Bella 5 Kartal Yuvası', $de5$<section><h2>Villa Bella 5 Kartal Yuvası — Ferienvilla mit Privatpool in İslamlar</h2>
<p>Villa Bella 5 Kartal Yuvası liegt in İslamlar, Kaş (Antalya). Für 6 Gäste: 3 Schlafzimmer, 3 Bäder und privater Pool.</p>
<ul><li>Drei Doppelzimmer mit eigenem Bad</li><li>Whirlpool in einem Schlafzimmer</li><li>Küche, WLAN, Parkplatz und Grill</li></ul>
<p>Privater Außenpool ca. 11 × 4 × 1,5 m. Lizenz: 07-9335.</p></section>$de5$),
  ('ru', 'Villa Bella 5 Kartal Yuvası', $ru5$<section><h2>Villa Bella 5 Kartal Yuvası — вилла с частным бассейном в İslamlar</h2>
<p>Villa Bella 5 Kartal Yuvası в районе İslamlar, Kaş (Antalya). До 6 гостей: 3 спальни, 3 ванные и частный бассейн.</p>
<ul><li>Три спальни с двуспальными кроватями и собственными ванными</li><li>Джакузи в одной из спален</li><li>Кухня, Wi‑Fi, парковка и барбекю</li></ul>
<p>Частный открытый бассейн ок. 11 × 4 × 1,5 м. Лицензия: 07-9335.</p></section>$ru5$),
  ('zh', 'Villa Bella 5 Kartal Yuvası', $zh5$<section><h2>Villa Bella 5 Kartal Yuvası — İslamlar 私人泳池别墅</h2>
<p>Villa Bella 5 Kartal Yuvası 位于 Kaş İslamlar。可住 6 人，含 3 间卧室、3 间浴室及私人泳池。</p>
<ul><li>三间带独立卫浴的双人卧室</li><li>其中一间卧室配按摩浴缸</li><li>厨房、Wi‑Fi、停车与烧烤</li></ul>
<p>私人室外泳池约 11 × 4 × 1.5 米。许可证：07-9335。</p></section>$zh5$),
  ('fr', 'Villa Bella 5 Kartal Yuvası', $fr5$<section><h2>Villa Bella 5 Kartal Yuvası — villa avec piscine privée à İslamlar</h2>
<p>Villa Bella 5 Kartal Yuvası se situe à İslamlar, Kaş (Antalya). Capacité 6 personnes : 3 chambres, 3 salles de bain et piscine privée.</p>
<ul><li>Trois chambres doubles avec salle de bain privative</li><li>Jacuzzi dans l’une des chambres</li><li>Cuisine, Wi‑Fi, parking et barbecue</li></ul>
<p>Piscine extérieure privée d’environ 11 × 4 × 1,5 m. Licence : 07-9335.</p></section>$fr5$)
) AS v(locale, title, description) ON lower(lo.code) = v.locale
WHERE l.id = 'b1111111-0005-4000-a000-000000000005'::uuid
   OR lower(l.slug) IN ('bella-villa-5', 'villa-bella-5-kartal-yuvasi-islamlar')
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = CASE
    WHEN EXISTS (
      SELECT 1 FROM listings lx
      WHERE lx.id = listing_translations.listing_id
        AND lower(lx.slug) LIKE 'villa-bella-%'
    )
      AND coalesce(listing_translations.description, '') !~* 'fethiye|ölüdeniz|oludeniz|ovac[iı]k|kayak[oö]y|hisar[oö]n[uü]|babada[gğ]'
      AND length(coalesce(listing_translations.description, '')) > 80
    THEN listing_translations.description
    ELSE EXCLUDED.description
  END;

-- ── 7) SEO: temiz başlık + İslamlar özeti ─────────────────────────────────────
INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
SELECT 'listing', l.id, lo.id, lt.title,
       left(regexp_replace(coalesce(lt.description, ''), '<[^>]+>', ' ', 'g'), 160),
       'villa bella, islamlar villa, kas villa, ozel havuzlu villa'
FROM listings l
JOIN listing_translations lt ON lt.listing_id = l.id
JOIN locales lo ON lo.id = lt.locale_id
WHERE l.id IN (
  'b1111111-0001-4000-a000-000000000001'::uuid,
  'b1111111-0002-4000-a000-000000000002'::uuid,
  'b1111111-0003-4000-a000-000000000003'::uuid,
  'b1111111-0004-4000-a000-000000000004'::uuid,
  'b1111111-0005-4000-a000-000000000005'::uuid
)
OR lower(l.slug) IN (
  'bella-villa-1','bella-villa-2','bella-villa-3','bella-villa-4','bella-villa-5',
  'villa-bella-1-orkide-islamlar','villa-bella-2-sardunya-islamlar',
  'villa-bella-3-lale-islamlar','villa-bella-4-leylak-islamlar',
  'villa-bella-5-kartal-yuvasi-islamlar'
)
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  keywords = EXCLUDED.keywords;

-- ── 8) API ilanlarında kalan pazarlama soneklerini düşür ──────────────────────
WITH targets AS (
  SELECT lt.ctid AS row_id,
         trim(both FROM split_part(lt.title, ' - ', 1)) AS clean_title
  FROM listing_translations lt
  JOIN listings l ON l.id = lt.listing_id
  WHERE lower(l.slug) LIKE 'villa-bella-%islamlar%'
    AND lt.title LIKE '% - %'
    AND (
      lt.title ~* $$ - .+(da|de|ta|te|nda|nde).+(villa|apart|bungalov|daire)$$
      OR lt.title ~* $$ - .+(özel\s+havuzlu|huzurlu|lüks|manzaralı|doğayla)$$
    )
)
UPDATE listing_translations lt
SET title = t.clean_title
FROM targets t
WHERE lt.ctid = t.row_id
  AND lt.title IS DISTINCT FROM t.clean_title;

WITH targets AS (
  SELECT sm.ctid AS row_id,
         trim(both FROM split_part(sm.title, ' - ', 1)) AS clean_title
  FROM seo_metadata sm
  JOIN listings l ON l.id = sm.entity_id
  WHERE sm.entity_type = 'listing'
    AND lower(l.slug) LIKE 'villa-bella-%islamlar%'
    AND sm.title LIKE '% - %'
    AND (
      sm.title ~* $$ - .+(da|de|ta|te|nda|nde).+(villa|apart|bungalov|daire)$$
      OR sm.title ~* $$ - .+(özel\s+havuzlu|huzurlu|lüks|manzaralı|doğayla)$$
    )
)
UPDATE seo_metadata sm
SET title = t.clean_title
FROM targets t
WHERE sm.ctid = t.row_id
  AND sm.title IS DISTINCT FROM t.clean_title;

-- API villa konumunu da İslamlar’a sabitle
UPDATE listings
SET location_name = 'İslamlar, Kaş, Antalya',
    updated_at = now()
WHERE lower(slug) LIKE 'villa-bella-%islamlar%'
  AND location_name IS DISTINCT FROM 'İslamlar, Kaş, Antalya';
