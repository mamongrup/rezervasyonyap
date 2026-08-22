-- Gülbay Villa: Kayaköy AI metnini zorla Kalkan Kışla kaynağıyla değiştir + sezon fiyatları
-- Kaynak: https://www.akdenizvillam.com/kiralik-villalar/villa-gulbay
-- Hedef: id dcc70773-3833-4ba4-a0c3-b2f5e987b520 / slug gulbay-villa
-- Not: 390 üretimde uygulanmamış olabilir; bu modül idempotent zorlar.

UPDATE listings
SET location_name = 'Kalkan, Kışla, Antalya',
    map_lat = 36.25030473803806,
    map_lng = 29.41588852110522,
    ministry_license_ref = COALESCE(NULLIF(trim(ministry_license_ref), ''), '07-7842'),
    vitrin_price = 15390,
    min_stay_nights = 5,
    cleaning_fee_amount = 5000,
    -- hasar depozitosu first_charge olarak kalmıştı (tek fiyat gibi görünüyordu)
    first_charge_amount = CASE
      WHEN first_charge_amount IS NOT NULL AND abs(first_charge_amount - 12307.6) < 0.05 THEN NULL
      WHEN first_charge_amount IS NOT NULL AND first_charge_amount > 0 AND first_charge_amount < coalesce(vitrin_price, 15390) THEN first_charge_amount
      ELSE NULL
    END,
    external_provider_code = COALESCE(NULLIF(trim(external_provider_code), ''), 'akdenizvillam'),
    external_listing_ref = COALESCE(NULLIF(trim(external_listing_ref), ''), '1178'),
    updated_at = now()
WHERE id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid
   OR lower(slug) = 'gulbay-villa';

UPDATE listing_attributes la
SET value_json = coalesce(la.value_json, '{}'::jsonb) || jsonb_build_object(
  'city', 'Kalkan',
  'address', 'Kalkan Kışla, Antalya',
  'province_city', 'Antalya',
  'district_label', 'Kışla',
  'region_display', 'Kalkan, Kışla, Antalya',
  'lat', '36.25030473803806',
  'lng', '29.41588852110522',
  'tourism_cert_no', '07-7842',
  'damage_deposit', '12307.6',
  'short_stay_fee', '5000',
  'check_in_time', '16:00',
  'check_out_time', '10:00',
  'max_guests', '6',
  'bed_count', '3',
  'bath_count', '3',
  'source_url', 'https://www.akdenizvillam.com/kiralik-villalar/villa-gulbay'
)
FROM listings l
WHERE la.listing_id = l.id
  AND (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND la.group_code = 'listing_meta' AND la.key = 'v1';

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Gülbay Villa', $dtr$<h2>Gülbay Villa</h2>
<h3>Özel Havuzlu, Merkezi Konumda, Deniz manzarası, Kalabalık Ailelere Uygun Villa</h3>
<p>Villa Gülbay , Kalkan Kışla mevkiinde konumlanan, 3 yatak odası ve 6 kişilik konaklama kapasitesi ile konforlu bir tatil sunan kiralık yazlık villadır . Tamamen deniz manzaralı olan villa, en yakın plaja sadece 300 metre mesafede yer almakta olup, tüm odalardan kesintisiz deniz manzarası sunmaktadır. Villanın süit yatak odasında jakuzi bulunmakta, özel yüzme havuzu ve havuz alanına bitişik sauna bölümü ile tatilinize ayrıcalık katmaktadır. Merkezi konumu ve sunduğu olanaklarla Villa Gülbay, aileler ve arkadaş grupları için ideal bir tatil alternatifidir. Not ) Villamızın havuz terasında sauna bulunmaktadır. Ekstra ücret karşılığında misafirlerimizin hizmetine açılmaktadır.</p>
<h3>Yatak Odaları</h3>
<p>1. Yatak Odası : Çift kişilik yatak, klima, komodin, elbise dolabı, makyaj masası, jakuzi, banyo ve tuvalet bulunmaktadır.</p>
<p>2. Yatak Odası : Çift kişilik yatak, klima, komodin, elbise dolabı, makyaj masası, banyo ve tuvalet bulunmaktadır.</p>
<p>3. Yatak Odası : Çift kişilik yatak, klima, komodin, elbise dolabı, makyaj masası, banyo ve tuvalet bulunmaktadır.</p>
<h3>Salon</h3>
<p>Villamızı salonunda oturma grubu, klima, yemek masası, uydu alıcı, TV, internet bulunmaktadır.</p>
<h3>Mutfak</h3>
<p>Villa Gülbay Amerikan mutfağında bulaşık makinası, buzdolabı, çamaşır makinası, ekmek kızartma makinası, yemek takımı, tencere tava takımı, çatal bıçak takımı, kettle, 4'lü ocak, mikrodalga fırın bulunmaktadır.</p>
<h3>Havuz ve Bahçe</h3>
<p>Villa Gülbay havuz terasında özel yüzme havuzu, şemsiye, şezlong, barbekü, oturma grubu bulunmaktadır.</p>
<h3>Temizlik ve Bakım</h3>
<p>Villa size temiz teslim edilmeden önce temizlik yapılır ve siz tatilinizi yaparken ve haftada 1 defa temizlik işleriniz halledilir. Böylece siz tatilinizin tadını çıkartırken temizlikle uğraşmak zorunda kalmazsınız. Ekstra temizlik isteğiniz takdirde villanızın temizliğinden sorumlu personellerimiz tarafından temizlik, yeni çarşaf, yastık kılıfı ve daha birçok hizmet personellerimiz tarafından ücrete tabi olarak halledilir. Doğa içerisinde harika konuma sahip olan villalarımızda ilaçlar düzenli olarak yapılır ve tatiliniz böcekler tarafından bölünme ihtimali en aza indirilir ama size %100 böcek görmeme garantisi veremiyoruz çünkü villalarımız doğada bulunuyor olup bu tarz durumlar yaşanabiliyor.</p>
<h3>Depozito</h3>
<p>Tatiliniz başlamadan önceki son adım olarak sizden depozito alınmaktadır. Herhangi bir hasar sonucunda kırık ve kayıp gibi problemler olmadığı taktirde villadan ayrılıştan 10 dakika önce villa/apart kontrol edilip herhangi bir sorun görünmediği takdirde depozito sizlere geri verilmektedir.</p>
<h3>Giriş ve Çıkış</h3>
<p>Bütün villa çeşitlerimiz için villalara ilk gün giriş saati öğleden sonra 16.00, tatilinizin sonunda ise villadan ayrılma saatiniz ise sabah 10.00’dur. Aradaki zaman diliminde hijyen için gerekli temizlik yapıldığından dolayı villaya giriş saatinizden erken gelme durumlarında sizlere yardımcı olamayacağımızı belirtmek durumundayız. Bu yüzden sizden ricamız villaya</p>
<p>saatlerinize dikkat etmeniz. Havuz etrafı korunaklı villalarımızda %100 görünmememe garantisi vermemekteyiz bu villalarımızda her zaman %5 sakınma payı mevcuttur. Kalkan; coğrafi yapısı bakımından, yamaç üzerine kurulmuş bir yerleşim yeridir. Kalkan ve çevresindeki köylerde bulunan tüm yazlıklarımıza ulaşmak için, yokuş yukarı çıkılmaktadır.</p>
<h3>Ödeme Bilgisi</h3>
<p>Şirketimiz ödemelerini kurumsal banka hesabına EFT/Havale/Swift yada online kredi kartı ödemesi yolu ile almaktadır.</p>$dtr$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'tr'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Gülbay Villa', $den$<h2>Gülbay Villa</h2>
<p>Gülbay Villa is a holiday villa in Kalkan, Kışla, Antalya, with 3 bedrooms, 3 bathrooms and space for up to 6 guests. It offers a full sea view and sits about 300 metres from the nearest beach.</p>
<h3>Facilities</h3>
<p>The suite bedroom has a jacuzzi. Guests have a private swimming pool (8×4×1.6) and a sauna on the pool terrace (extra charge when requested).</p>
<h3>Living spaces</h3>
<p>The living room includes seating, air conditioning, a dining table, satellite TV and Wi‑Fi. The open kitchen has a dishwasher, fridge, washing machine, toaster, kettle, hob and microwave.</p>
<h3>Stay details</h3>
<ul><li>Check-in 16:00, check-out 10:00</li>
<li>Ministry licence: 07-7842</li>
<li>Deposit is taken before arrival and returned after a checkout inspection if there is no damage</li></ul>$den$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'en'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Gülbay Villa', $dde$<h2>Gülbay Villa</h2>
<p>Gülbay Villa ist eine Ferienvilla in Kalkan, Kışla, Antalya mit 3 Schlafzimmern, 3 Bädern und Platz für bis zu 6 Gäste. Die Villa bietet Meerblick und liegt etwa 300 Meter vom nächsten Strand entfernt.</p>
<h3>Ausstattung</h3>
<p>Das Suite-Schlafzimmer verfügt über einen Whirlpool. Zur Villa gehören ein privater Pool (8×4×1.6) und eine Sauna auf der Poolterrasse (gegen Aufpreis).</p>
<h3>Aufenthaltsinfos</h3>
<ul><li>Check-in 16:00, Check-out 10:00</li>
<li>Tourismuslizenz: 07-7842</li>
<li>Kaution vor Anreise; Rückgabe nach Abreisekontrolle ohne Schäden</li></ul>$dde$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'de'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Gülbay Villa', $dru$<h2>Gülbay Villa</h2>
<p>Gülbay Villa — вилла для отдыха в районе Kalkan, Kışla, Antalya: 3 спальни, 3 ванные, до 6 гостей. Вилла с видом на море, около 300 м до ближайшего пляжа.</p>
<h3>Удобства</h3>
<p>В спальне-сьют есть джакузи. Есть частный бассейн (8×4×1.6) и сауна на террасе бассейна (за дополнительную плату).</p>
<h3>Правила заезда</h3>
<ul><li>Заезд 16:00, выезд 10:00</li>
<li>Лицензия: 07-7842</li>
<li>Депозит взимается до заезда и возвращается после осмотра при отсутствии повреждений</li></ul>$dru$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'ru'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Gülbay Villa', $dzh$<h2>Gülbay Villa</h2>
<p>Gülbay Villa 位于 Kalkan, Kışla, Antalya，设有 3 间卧室、3 间浴室，最多可住 6 人。别墅享有海景，距最近海滩约 300 米。</p>
<h3>设施</h3>
<p>套房卧室配有按摩浴缸。别墅拥有私人泳池（8×4×1.6）及泳池露台桑拿（按需额外收费）。</p>
<h3>入住须知</h3>
<ul><li>入住 16:00，退房 10:00</li>
<li>旅游经营许可证：07-7842</li>
<li>入住前收取押金；退房检查无损坏则退还</li></ul>$dzh$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'zh'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO listing_translations (listing_id, locale_id, title, description)
SELECT l.id, lo.id, 'Gülbay Villa', $dfr$<h2>Gülbay Villa</h2>
<p>Gülbay Villa est une villa de vacances à Kalkan, Kışla, Antalya, avec 3 chambres, 3 salles de bain et une capacité de 6 personnes. Elle offre une vue mer et se trouve à environ 300 m de la plage la plus proche.</p>
<h3>Équipements</h3>
<p>La chambre suite dispose d’un jacuzzi. La villa comprend une piscine privée (8×4×1.6) et un sauna sur la terrasse (supplément sur demande).</p>
<h3>Séjour</h3>
<ul><li>Arrivée 16:00, départ 10:00</li>
<li>Licence tourisme : 07-7842</li>
<li>Caution avant l’arrivée ; restitution après contrôle sans dommages</li></ul>$dfr$
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'fr'
ON CONFLICT (listing_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description)
SELECT 'listing', l.id, lo.id, 'Gülbay Villa', 'Gülbay Villa Gülbay Villa Özel Havuzlu, Merkezi Konumda, Deniz manzarası, Kalabalık Ailelere Uygun Villa Villa Gülbay , Kalkan Kışla mevkiinde konumlanan, 3 yat'
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'tr'
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description)
SELECT 'listing', l.id, lo.id, 'Gülbay Villa', 'Gülbay Villa Gülbay Villa Gülbay Villa is a holiday villa in Kalkan, Kışla, Antalya, with 3 bedrooms, 3 bathrooms and space for up to 6 guests. It offers a full'
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'en'
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description)
SELECT 'listing', l.id, lo.id, 'Gülbay Villa', 'Gülbay Villa Gülbay Villa Gülbay Villa ist eine Ferienvilla in Kalkan, Kışla, Antalya mit 3 Schlafzimmern, 3 Bädern und Platz für bis zu 6 Gäste. Die Villa biet'
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'de'
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description)
SELECT 'listing', l.id, lo.id, 'Gülbay Villa', 'Gülbay Villa Gülbay Villa Gülbay Villa — вилла для отдыха в районе Kalkan, Kışla, Antalya: 3 спальни, 3 ванные, до 6 гостей. Вилла с видом на море, около 300 м '
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'ru'
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description)
SELECT 'listing', l.id, lo.id, 'Gülbay Villa', 'Gülbay Villa Gülbay Villa Gülbay Villa 位于 Kalkan, Kışla, Antalya，设有 3 间卧室、3 间浴室，最多可住 6 人。别墅享有海景，距最近海滩约 300 米。 设施 套房卧室配有按摩浴缸。别墅拥有私人泳池（8×4×1.6）及泳池露台桑拿（按需额外收费）。 入住'
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'zh'
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description)
SELECT 'listing', l.id, lo.id, 'Gülbay Villa', 'Gülbay Villa Gülbay Villa Gülbay Villa est une villa de vacances à Kalkan, Kışla, Antalya, avec 3 chambres, 3 salles de bain et une capacité de 6 personnes. Ell'
FROM listings l CROSS JOIN locales lo
WHERE (l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa')
  AND lower(lo.code) = 'fr'
ON CONFLICT (entity_type, entity_id, locale_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Sezonluk fiyat bantları (Akdeniz Villam 2026)
DELETE FROM listing_price_rules
WHERE listing_id IN (
  SELECT id FROM listings
  WHERE id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(slug) = 'gulbay-villa'
);

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"25940","weekly_total":"181580","weekend_nightly":"","min_nights":"5"}'::jsonb, '2026-07-01'::date, '2026-08-31'::date
FROM listings l
WHERE l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa';

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"22420","weekly_total":"156940","weekend_nightly":""}'::jsonb, '2026-09-01'::date, '2026-09-30'::date
FROM listings l
WHERE l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa';

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"17150","weekly_total":"120050","weekend_nightly":""}'::jsonb, '2026-10-01'::date, '2026-10-31'::date
FROM listings l
WHERE l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa';

INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
SELECT l.id, '{"base_nightly":"15390","weekly_total":"107730","weekend_nightly":""}'::jsonb, '2026-11-01'::date, '2026-11-30'::date
FROM listings l
WHERE l.id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(l.slug) = 'gulbay-villa';

-- vitrin_price tazele (fiyat kurallarından min)
UPDATE listings l
SET vitrin_price = sub.min_price,
    updated_at = now()
FROM (
  SELECT listing_id,
         min((rule_json->>'base_nightly')::numeric) AS min_price
  FROM listing_price_rules
  WHERE listing_id IN (
    SELECT id FROM listings
    WHERE id = 'dcc70773-3833-4ba4-a0c3-b2f5e987b520'::uuid OR lower(slug) = 'gulbay-villa'
  )
    AND coalesce(rule_json->>'base_nightly','') ~ '^[0-9]+(\.[0-9]+)?$'
  GROUP BY listing_id
) sub
WHERE l.id = sub.listing_id;
