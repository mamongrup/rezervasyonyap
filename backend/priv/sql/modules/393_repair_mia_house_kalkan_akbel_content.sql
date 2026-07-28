-- Mia House Villa: yanlış AI metni (Fethiye Çalış Plajı) → Kalkan Akbel
-- Kaynak doğrulama: Hepsivilla / Myvillacity — Kalkan Akbel, 2 kişilik tiny house
-- Hedef: id 3517b88f-e6af-44b0-8872-5f30d63ee9ee / slug mia-house-villa

UPDATE listings
SET location_name = 'Kalkan, Akbel, Antalya',
    ministry_license_ref = COALESCE(NULLIF(trim(ministry_license_ref), ''), '07-9176'),
    updated_at = now()
WHERE id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid
   OR lower(slug) = 'mia-house-villa';

UPDATE listing_attributes la
SET value_json = coalesce(la.value_json, '{}'::jsonb) || jsonb_build_object(
  'city', 'Kalkan',
  'address', 'Kalkan Akbel, Antalya',
  'province_city', 'Antalya',
  'district_label', 'Akbel',
  'region_display', 'Kalkan, Akbel',
  'max_guests', '2',
  'bed_count', '1',
  'bath_count', '1',
  'room_count', '1',
  'property_type', 'villa',
  'pool_type', 'Özel açık havuz',
  'tourism_cert_no', '07-9176',
  'check_in_time', '16:00',
  'check_out_time', '10:00',
  'damage_deposit', '5000'
)
FROM listings l
WHERE la.listing_id = l.id
  AND (l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid OR lower(l.slug) = 'mia-house-villa')
  AND la.group_code = 'listing_meta'
  AND la.key = 'v1';

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Mia House Villa', $dtr$<section>
<h2>Mia House Villa: Kalkan Akbel’de deniz manzaralı tiny house</h2>
<p>Mia House Villa, Antalya’nın Kalkan beldesinde Akbel mevkiinde yer alan, 2 kişilik tiny house konseptli bir tatil evidir. Panoramik deniz manzarası, özel korunaklı yüzme havuzu ve terastaki jakuzi ile özellikle çiftler ve balayı konukları için düzenlenmiştir.</p>
<h2>Konaklama</h2>
<ul>
<li>1 yatak odası (çift kişilik yatak), 1 banyo</li>
<li>Maksimum 2 misafir</li>
<li>Klimalı mini salon, uydu TV ve Wi‑Fi</li>
<li>Mini Amerikan mutfak (buzdolabı, bulaşık ve çamaşır makinesi, ocak, fırın)</li>
</ul>
<h2>Havuz ve teras</h2>
<p>Özel açık havuz yaklaşık 7,5 × 3 metre ölçülerinde ve 1,5 metre derinliğindedir. Terasta jakuzi, şezlong, güneş şemsiyesi ve mangal alanı bulunur. Havuz bakımı günde bir kez yapılır.</p>
<h2>Konum</h2>
<ul>
<li>Kalkan merkez yaklaşık 2–2,5 km</li>
<li>Deniz yaklaşık 3 km</li>
<li>Market ve restoranlara yürüme mesafesi (bölgeye göre değişir)</li>
</ul>
<h2>Önemli bilgiler</h2>
<ul>
<li>Kültür ve Turizm Bakanlığı belge no: 07-9176</li>
<li>Giriş 16:00, çıkış 10:00</li>
<li>Hasar depozitosu genelde 5.000 TL (çıkış kontrolü sonrası iade)</li>
<li>Sezonluk kahvaltı ve evcil hayvan koşulları rezervasyon sırasında doğrulanmalıdır</li>
</ul>
</section>$dtr$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid OR lower(l.slug) = 'mia-house-villa')
  AND lower(lo.code) = 'tr'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Mia House Villa', $den$<section>
<h2>Mia House Villa — sea-view tiny house in Kalkan Akbel</h2>
<p>Mia House Villa is a 2-guest tiny house in Akbel, Kalkan (Antalya). It offers a panoramic sea view, a private sheltered pool and a terrace jacuzzi — designed for couples.</p>
<ul>
<li>1 bedroom, 1 bathroom, max 2 guests</li>
<li>Private pool about 7.5 × 3 × 1.5 m</li>
<li>Kitchenette, Wi‑Fi, air conditioning</li>
<li>Kalkan centre about 2–2.5 km; sea about 3 km</li>
<li>Ministry licence: 07-9176 · Check-in 16:00, check-out 10:00</li>
</ul>
</section>$den$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid OR lower(l.slug) = 'mia-house-villa')
  AND lower(lo.code) = 'en'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Mia House Villa', $dde$<section>
<h2>Mia House Villa — Tiny House mit Meerblick in Kalkan Akbel</h2>
<p>Mia House Villa ist ein Tiny House für 2 Personen in Akbel, Kalkan (Antalya), mit Panoramameerblick, privatem Pool und Jacuzzi auf der Terrasse.</p>
<ul>
<li>1 Schlafzimmer, 1 Bad, max. 2 Gäste</li>
<li>Privater Pool ca. 7,5 × 3 × 1,5 m</li>
<li>Kalkan Zentrum ca. 2–2,5 km</li>
<li>Lizenz: 07-9176 · Check-in 16:00, Check-out 10:00</li>
</ul>
</section>$dde$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid OR lower(l.slug) = 'mia-house-villa')
  AND lower(lo.code) = 'de'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Mia House Villa', $dru$<section>
<h2>Mia House Villa — tiny house с видом на море в Kalkan Akbel</h2>
<p>Mia House Villa — дом для двоих в районе Akbel, Kalkan (Antalya): панорамный вид на море, частный бассейн и джакузи на террасе.</p>
<ul>
<li>1 спальня, 1 ванная, до 2 гостей</li>
<li>Бассейн ок. 7,5 × 3 × 1,5 м</li>
<li>Центр Kalkan около 2–2,5 км</li>
<li>Лицензия: 07-9176 · Заезд 16:00, выезд 10:00</li>
</ul>
</section>$dru$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid OR lower(l.slug) = 'mia-house-villa')
  AND lower(lo.code) = 'ru'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Mia House Villa', $dzh$<section>
<h2>Mia House Villa — 位于 Kalkan Akbel 的海景 tiny house</h2>
<p>Mia House Villa 位于 Antalya 省 Kalkan 的 Akbel，为 2 人设计的 tiny house，享有海景、私人泳池与露台按摩浴缸。</p>
<ul>
<li>1 间卧室、1 间浴室，最多 2 人</li>
<li>私人泳池约 7.5 × 3 × 1.5 米</li>
<li>距 Kalkan 中心约 2–2.5 公里</li>
<li>许可证：07-9176 · 入住 16:00，退房 10:00</li>
</ul>
</section>$dzh$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid OR lower(l.slug) = 'mia-house-villa')
  AND lower(lo.code) = 'zh'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Mia House Villa', $dfr$<section>
<h2>Mia House Villa — tiny house avec vue mer à Kalkan Akbel</h2>
<p>Mia House Villa est un tiny house pour 2 personnes à Akbel, Kalkan (Antalya), avec vue mer panoramique, piscine privée et jacuzzi sur la terrasse.</p>
<ul>
<li>1 chambre, 1 salle de bain, max. 2 personnes</li>
<li>Piscine privée env. 7,5 × 3 × 1,5 m</li>
<li>Centre de Kalkan à env. 2–2,5 km</li>
<li>Licence : 07-9176 · Arrivée 16:00, départ 10:00</li>
</ul>
</section>$dfr$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid OR lower(l.slug) = 'mia-house-villa')
  AND lower(lo.code) = 'fr'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
SELECT 'listing', l.id, lo.id, 'Mia House Villa',
       left(regexp_replace(coalesce(lt.description, ''), '<[^>]+>', ' ', 'g'), 160),
       'mia house villa, kalkan akbel, tiny house kalkan, ozel havuzlu villa'
FROM listings l
JOIN listing_translations lt ON lt.listing_id = l.id
JOIN locales lo ON lo.id = lt.locale_id
WHERE l.id = '3517b88f-e6af-44b0-8872-5f30d63ee9ee'::uuid
   OR lower(l.slug) = 'mia-house-villa'
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  keywords = EXCLUDED.keywords;
