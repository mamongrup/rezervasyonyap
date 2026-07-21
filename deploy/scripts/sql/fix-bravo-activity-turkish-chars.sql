-- Bravo aktivite Türkçe karakter onarımı (? → Ö/ş/ğ/…)
-- Üret: node scripts/repair-bravo-turkish-encoding.mjs --write-sql
-- Uygula: ./deploy/apply-sql.sh deploy/scripts/sql/fix-bravo-activity-turkish-chars.sql
BEGIN;
-- fethiye-scuba-diving
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '2' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Fethiye Scuba Diving',
    description = '<h2>Fethiye Scuba Diving</h2>
<p>Fethiye''nin muhteşem koylarında ve berrak mavi sularında t&uuml;pl&uuml; dalış yapmanın keyfini &ccedil;ıkarın! Bu eşsiz deneyim, do?anın g&ouml;z alıcı g&uuml;zelliklerinin yanı sıra sualtı d&uuml;nyasının b&uuml;y&uuml;leyici canlılar?yla da tanıman?za olanak tan?yor.</p>
<p>Aktivitemiz, hem yeni başlayanlar hem de deneyimli dalgı&ccedil;lar i&ccedil;in uygundur. Deneyimli eğitmenlerimiz, sizin i&ccedil;in &ouml;zel olarak hazırlanan eğitimlerle, dalış g&uuml;venli?inizi sağlarken, Fethiye''nin en g&uuml;zel dalış noktaların? keşfetmenizi sağlar.</p>
<h3>&nbsp;</h3>
<h3>Program Detayları:</h3>
<p>Eğitim: Dalış &ouml;ncesinde teorik eğitim ve pratik uygulama</p>
<p>Dalış Noktalar?: 3 &ndash; 4 farklı noktada dalış</p>
<p>Ekipman: T&uuml;m dalış ekipmanlar? (maske, şnorkel, palet, t&uuml;p, dalış giysisi) temin edilir.</p>
<p>S&uuml;re: Dalış s&uuml;resi toplamda yaklaşık 3 - 4 saat</p>
<p>Katılımcı Sayısı: Gruplar, en fazla 8 kişilik k&uuml;&ccedil;&uuml;k ekipler halinde d&uuml;zenlenir.</p>
<h3>&nbsp;</h3>
<h3>Neden Fethiye''de Dalış?</h3>
<p>Fethiye, zengin deniz biyolojik &ccedil;eşitliliği ve muhteşem denizalt? manzaralarıyla &uuml;nl&uuml;d&uuml;r. Akvaryum Koyu, Kelebekler Vadisi ve Gemiler Adas? gibi g&ouml;z alıcı dalış noktalarında, reng&acirc;renk mercanlar, balıklar ve hatta lezzetli deniz yıldızlar?yla karşılaşabilirsiniz.</p>
<p>Dalış aktivitemize katılmak, hem yeni arkadaşl?klar kurmak hem de hayat boyu unutulmaz bir deneyim yaşamak i&ccedil;in m&uuml;kemmel bir fırsatt?r. Su alt?nda ge&ccedil;ireceğiniz her an, hem huzur dolu hem de heyecan verici bir macera olacakt?r.</p>
<h3>&nbsp;</h3>
<h3>Fiyata Dahil Olanlar</h3>
<ul>
<li>&Ccedil;ift Dalış: Deneme Dalış? ve Keşif Dalış?</li>
<li>Ekipmanlar (BCD, Maske, Reg&uuml;lat&ouml;r, Palet, Neopren)</li>
<li>T&uuml;rkiye Su Alt? Sporlar? Federasyonu&rsquo;na Bağlı Rehberler Tarafından Profesyonel Dalg?&ccedil;l?k Hizmeti</li>
<li>&Ouml;ğle Yemeği</li>
<li>Aktivite Sigortası</li>
</ul>
<p>&nbsp;</p>
<h3>Fiyata Dahil Olmayanlar</h3>
<ul>
<li>T&uuml;pl&uuml; Dalış Aktivitesi Boyunca &Ccedil;ekilecek Fotoğraf ve Videolar</li>
<li>Kişisel Harcamalar</li>
<li>Teknede Ekstra İ&ccedil;ecekler</li>
</ul>
<p>&nbsp;</p>
<h3>Rezervasyon ?&ccedil;in ?leti?im:</h3>
<p>Unutmay?n, yerlerin s?n?rl? oldu?unu g&ouml;z &ouml;n&uuml;nde bulundurarak erken rezervasyon yapt?rman?z? &ouml;neririz. Detayl? bilgi ve rezervasyon i&ccedil;in l&uuml;tfen bizimle ileti?ime ge&ccedil;in.</p>
<p>Fethiye&rsquo;de hem e?lenmek hem de do?anın tad?n? &ccedil;ıkarmak i&ccedil;in dalışa katılmay? unutmay?n!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '2' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '2' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Fethiye, Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '2' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- fethiye-jeep-safari
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '3' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Fethiye Jeep Safari',
    description = '<h2>Fethiye Jeep Safari: Macera Dolu Bir Keşif!</h2>
<p>Fethiye, T&uuml;rkiye''nin en g&ouml;zde turistik b&ouml;lgelerinden biri olup, muhteşem do?as?, tarihi zenginlikleri ve eşsiz plajlar? ile ziyaret&ccedil;ilerini kendine hayran b?rak?yor. Bu eşsiz g&uuml;zellikleri keşfetmenin en eğlenceli yollar?ndan biri ise Fethiye Jeep Safari turuna katılmakt?r.</p>
<p>&nbsp;</p>
<h3>Neden Jeep Safari?</h3>
<p>Jeep safari, Fethiye''nin en g&uuml;zel doğal alanlar?n? keşfetmek i&ccedil;in harika bir fırsat sunar. Da? yollar?ndan ge&ccedil;mek, gizli koyları ziyaret etmek ve nefes kesen manzaraların tad?n? &ccedil;ıkarmak i&ccedil;in bu deneyim eşsizdir. Ayr?ca, safari esnas?nda yerel k&uuml;lt&uuml;r&uuml; tan?ma ve fotoğraf &ccedil;ekme fırsat? da bulacaks?n?z.</p>
<p>&nbsp;</p>
<h3>Tur Detayları</h3>
<p>Jeep safari turlar? genellikle sabah saatlerinde ba?lar ve g&uuml;n boyu s&uuml;rer. Turlar, profesyonel ve deneyimli s&uuml;r&uuml;c&uuml;ler eşliğinde ger&ccedil;ekle?tirilir. Turu s?ras?nda katılımcılar, muhteşem Kelebekler Vadisi, &Ouml;l&uuml;deniz ve Saklıkent Kanyonu gibi yerleri ziyaret eder. Keyifli molalar verilir, y&uuml;zme fırsatlar? sunulur ve piknik yapma imkan? sa?lan?r.</p>
<p>&nbsp;</p>
<h3>Kimler Kat?labilir?</h3>
<p>Fethiye Jeep Safari turlar?na her ya?tan insan katılabilir. Ancak, &ouml;zellikle macera arayanlar ve do?a tutkunlar? i&ccedil;in b&uuml;y&uuml;k bir keyif sunar. Aileler &ccedil;ocuklar?yla birlikte katılabilirken, arkadaş gruplar? da unutulmaz an?lar biriktirebilir.</p>
<p>&nbsp;</p>
<h3>Haz?rl?klar</h3>
<p>Tura katılmadan &ouml;nce rahat giysiler ve kapal? ayakkab?lar giymek &ouml;nemlidir. Ayr?ca, g&uuml;ne? kremi, ?apka ve su ?i?i getirmek, hem konforunuz hem de sa?l???n?z i&ccedil;in faydal? olacakt?r.</p>
<p>&nbsp;</p>
<h3>Fethiye Jeep Safari Tur Program?</h3>
<p>Bulu?ma Noktas? : Turumuz, 4*4 Land Rover ara&ccedil;lar?m?zla sizi otelinizden alarak bağlıyor. Bulu?ma noktam?z olan petrol istasyonunda t&uuml;m ara&ccedil;lar?m?z bir araya gelir. Burada, g&uuml;n boyunca y&uuml;r&uuml;y&uuml;?lerde kullanabilece?iniz plastik ayakkab?lar ve su tabancalar? kiralanabilir. ?steyen misafirlerimiz, buradan su tabancas? ve plastik ayakkab?lar?n? temin edebilirler. Rehberimizin bilgilendirmesinden sonra turumuz, ilk dura??m?za do?ru hareket eder.</p>
<p>&nbsp;</p>
<h3>Su Sava?lar?</h3>
<p>Turumuzun en heyecan verici etkinliklerinden biri, petrol istasyonunda su tabancalar?n? kiralay?p ara&ccedil;lar?m?zda su dolu kovalar?n hazırland??? an. Kiral?k tabancalar ar?zalansa bile ?of&ouml;rlerimiz &uuml;cretsiz olarak sa?lam bir tabanca vererek misafirlerimizin eğlencesini yar?da kesmezler. Tur liderimiz tarafından se&ccedil;ilen yerlerde, ara&ccedil;lar?m?z aras?nda su sava?lar? ba?lar. Bu aktivite, s?cak havalarda serinlemek i&ccedil;in harika bir se&ccedil;enektir ve ya?mur ya?mad??? s&uuml;rece 7&rsquo;den 70&rsquo;e herkesin ho?una gider. Bu sava?ta herkesin i&ccedil;inde bir &ccedil;ocuk oldu?unu g&ouml;receksiniz. Ancak suyun bol olmas? nedeniyle, yan?n?zda yedek k?yafetler getirip fazla elektronik e?ya ta??maman?z? tavsiye ederiz. Su sava?lar?, g&uuml;n i&ccedil;inde 2 veya 3 kez yapılır ve kesinlikle unutulmayacak bir an? olarak kalacakt?r.</p>
<p>&nbsp;</p>
<h3>Gizlikent ?elalesi</h3>
<p>Ye?illikler ve ormanlar i&ccedil;inde ufak bir patika izleyerek Gizlikent ?elalesi&rsquo;ne do?ru yol al?yoruz. ?elaleye vard???m?zda, eşsiz g&uuml;zelli?i ile b&uuml;y&uuml;leyici Gizlikent ?elalesi&rsquo;nin g&uuml;zelli?ine hayran kalacaks?n?z. Buz gibi sularının alt?nda serinlemek ve bol bol fotoğraf &ccedil;ekmek i&ccedil;in ideal bir doğal g&uuml;zellik sunmaktad?r. Ancak, ?elaleye giri? &uuml;cretlidir. Yakla??k 1 saat serbest zaman ge&ccedil;irdikten sonra, ara&ccedil;lar?m?za binip rotam?za devam ediyoruz. Gizlikent ?elalesi, do?a sevenlerin unutulmaz an?lar?ndan biri olacakt?r.</p>
<p>&nbsp;</p>
<h3>Gizlikent Zipline</h3>
<p>Gizlikent Zipline, yeni ve heyecan verici bir deneyimle stresinizi azaltmanın ve rahatlamanın harika bir yoludur. Zipline&rsquo;da tam gaz u&ccedil;arken, zihninizi bo?altmak ve sadece anın tad?n? &ccedil;ıkarmak kolayd?r. T&uuml;m dikkatinizi u&ccedil;u?a odaklamal? ve konsantrasyonunuzu sa?lamal?s?n?z. Y&uuml;kseklikten g&ouml;rd&uuml;?&uuml;n&uuml;z manzara nefes kesici olabilir ve d&uuml;nyaya tamamen farklı bir a&ccedil;?dan bakman?z? sa?layabilir. Bu deneyimde dizleriniz titrerken bile, kendinizi daha &ouml;nce hi&ccedil; yaşamad???n?z kadar canlı ve &ouml;zg&uuml;r hissedebilirsiniz.</p>
<p>&nbsp;</p>
<h3>Saklıkent &Ouml;ğle Yemeği</h3>
<p>Ana yemek olarak 3 farklı ana yemek se&ccedil;ene?i olan Tavuk Izgara, Alabalık Izgara ve Omlet aras?ndan misafirlerimiz damak zevklerine uygun olan? tercih edebilirler. Ayr?ca, a&ccedil;?k b&uuml;femizdeki salata ve mezelerden de diledikleri kadar t&uuml;ketebilirler. Yeme?e e?lik edecek i&ccedil;ecekler ekstra olarak sunulmaktad?r.</p>
<p>&nbsp;</p>
<h3>Saklıkent Kanyon</h3>
<p>T&uuml;rkiye&rsquo;nin en uzun ve Avrupa&rsquo;nın ikinci en uzun kanyonlar?ndan biridir. Doğal g&uuml;zelli?i ile yaz s?ca??ndan ka&ccedil;mak isteyenler i&ccedil;in serinleyebilecekleri buz gibi sularıyla &uuml;nl&uuml;d&uuml;r. Kanyonun en y&uuml;ksek noktas? 300 metre ve toplam uzunlu?u 18 kilometredir. Serbest zaman s&uuml;remiz 50-60 dakikad?r ve giri? &uuml;creti ekstrad?r.</p>
<p>&nbsp;</p>
<h3>Ringo Rafting</h3>
<p>Saklıkent nehrinde yapabilece?iniz ekstra bir aktivitedir. Ya? s?n?rlamas? olmayan, 0.5 metre derinli?inde ve her yaşa uygun olan bu etkinlik, 7&rsquo;den 70&rsquo;e herkesin keyifle yapabilece?i bir aktivitedir. Bu etkinli?e katılmak isteyenler, &uuml;cretlerini tur liderimize &ouml;deyerek kay?t yapt?rabilirler.</p>
<p>&nbsp;</p>
<h3>&Ccedil;amur Banyosu</h3>
<p>Kendinizi &ouml;zg&uuml;r hissetmek ve stresten ar?nmak i&ccedil;in deneyebilece?iniz ilgin&ccedil; bir aktivitedir. Denize girer gibi &ccedil;amura girerek eğlenceli bir deneyim yaşayabilirsiniz. Rehberimiz y&ouml;netiminde, grup halinde yap?lan bu etkinlik sonras? du?lar?n?z? alabilirsiniz. Giri? &uuml;cretsizdir. &Ccedil;amur banyosu sonras?nda 1 saatlik dinlenme molas? verilir ve ard?ndan sabah ald???m?z otellere do?ru yolculu?umuz ba?lar.</p>
<p>&nbsp;</p>
<h3>&Uuml;crete Dahil Olanlar</h3>
<ul>
<li>&nbsp;&Ouml;ğle Yemeği</li>
<li>&nbsp;Rehberlik Hizmeti</li>
</ul>
<p>&nbsp;</p>
<h3>&Uuml;crete Dahil Olmayanlar</h3>
<ul>
<li>Kanyona Giri? &Uuml;creti</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '3' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '3' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Fethiye, Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '3' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- 12-adalar-tekne-turu
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '4' LIMIT 1);
UPDATE listing_translations lt
SET title = '12 Adalar Tekne Turu',
    description = '<h2>12 Adalar Tekne Turu: Fethiye Limanı&rsquo;ndan Unutulmaz Bir Macera!</h2>
<p>Fethiye, muhteşem do?as?, tarihi zenginlikleri ve kristal berrakl???ndaki deniziyle T&uuml;rkiye&rsquo;nin en g&ouml;zde tatil destinasyonlar?ndan biridir. Bu g&uuml;zel sahil kasabas?nın sundu?u en keyifli aktivitelerden biri, 12 Adalar Tekne Turu''dur. Fethiye Limanı''ndan hareket eden bu tur, hem dinlenmek hem de keşfetmek isteyenler i&ccedil;in eşsiz bir deneyim sunuyor.</p>
<p>&nbsp;</p>
<h3>Turun Detayları</h3>
<p><strong>B&uuml;y&uuml;leyici Adalar:&nbsp;</strong>Tekne turu, Fethiye''nin etraf?ndaki g&ouml;z alıcı adalarda durarak, ziyaret&ccedil;ilere harika manzaralar ve aktivite olanaklar? sunmaktad?r. 12 Adalar Tekne Turu, K?z?l Ada, G&ouml;cek Adas?, Tersane Adas? ve daha bir&ccedil;ok etkileyici lokasyonda y&uuml;zme molalar?, şnorkelle dalış imkan? ve sahilde dinlenme fırsatlar? sa?lamaktad?r.</p>
<p>&nbsp;</p>
<p><strong>G&uuml;n&uuml;birlik Keşif :</strong> Tur genellikle sabah erken saatlerde ba?lar ve g&uuml;n boyunca s&uuml;rer. Fethiye Limanı&rsquo;ndan hareketle, g&uuml;ne?in ?s?tan ???klar? alt?nda deniz yolculu?u yaparak adalara do?ru ilerlersiniz. Teknenin g&uuml;vertesinde g&uuml;ne?lenip, serin denizin tad?n? &ccedil;ıkarabilirsiniz.</p>
<p>&nbsp;</p>
<p><strong>Lezzetli ?kramlar :&nbsp;</strong>Tur boyunca, baz? turlar ekstra olarak &ouml;?le yemeklerini de i&ccedil;ermektedir. Taze malzemelerle hazırlanan yerel lezzetlerin tad?na bakma fırsat? bulacaks?n?z.</p>
<p>&nbsp;</p>
<h3>Neden 12 Adalar Tekne Turu?</h3>
<p><strong>Doğal G&uuml;zellikler:</strong> Eşsiz koyları, temiz plajlar? ve muhteşem manzaraları ile 12 Adalar, do?a severler i&ccedil;in bir cennet. Dalgalar?n sesi eşliğinde huzurlu anlar yaşayacaks?n?z.</p>
<p>&nbsp;</p>
<p><strong>Macera ve Eğlence:</strong> Y&uuml;zme, snorkeling, ya da sadece g&uuml;ne?lenmek i&ccedil;in bir&ccedil;ok aktivite mevcut. Arkada?lar?n?zla ya da ailenizle ge&ccedil;ireceğiniz keyifli bir g&uuml;n i&ccedil;in m&uuml;kemmel bir se&ccedil;enek.</p>
<p>&nbsp;</p>
<p><strong>Rahatlama F?rsat?:</strong> G&uuml;nl&uuml;k yaşam?n stresinden uzakla?arak, huzurlu bir atmosferde dinlenme ve yenilenme imkan? bulacaks?n?z.</p>
<p>&nbsp;</p>
<h3>Fiyata Dahil Olanlar</h3>
<ul>
<li>&Ouml;ğle Yemeği</li>
<li>Rehberlik Hizmeti</li>
</ul>
<p>&nbsp;</p>
<h3>Fiyata Dahil Olmayanlar</h3>
<ul>
<li>İ&ccedil;ecekler</li>
<li>Fotoğraf ve video &ccedil;ekimi</li>
</ul>
<p>&nbsp;</p>
<h3>Biletinizi Al?n!</h3>
<p>Unutulmaz bir yaz tatili deneyimi yaşamak ve 12 Adalar&rsquo;?n b&uuml;y&uuml;leyici g&uuml;zelliklerini keşfetmek i&ccedil;in tur biletlerinizi hemen al?n! Fethiye Limanı''ndan hareket eden 12 Adalar Tekne Turu, hem yerli hem de yabanc? ziyaret&ccedil;iler i&ccedil;in ideal bir aktivitedir.</p>
<p>&nbsp;</p>
<p>Hayalinizdeki yaz tatilini yaşamak i&ccedil;in bu fırsat? ka&ccedil;?rmay?n. G&ouml;z alıcı manzaralarda, turkuaz sularda y&uuml;zme ve g&uuml;ne?lenme heyecan?n? yaşamak i&ccedil;in tur biletinizi ?imdi al?n ve unutulmaz an?lara imza at?n!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '4' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '4' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Fethiye, Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '4' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- oludeniz-tekne-turu
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '5' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Ölüdeniz Tekne Turu',
    description = '<h2>&Ouml;l&uuml;deniz Tekne Turu</h2>
<p>&Ouml;l&uuml;deniz, yeşil ve mavi tonlarının muhteşem birle?imiyle "Tanr?''nın D&uuml;nyaya Bah?etti?i Cennet" olarak an?lmaktad?r. Bu eşsiz doğal g&uuml;zellikleri keşfetmek i&ccedil;in &Ouml;l&uuml;deniz Tekne Turu''na katılmaya ne dersiniz? Tarih boyunca Likya Uygarl??? gibi bir&ccedil;ok medeniyete ev sahipli?i yapm?? olan &Ouml;l&uuml;deniz, huzurlu bir tatil ge&ccedil;irmek isteyenler i&ccedil;in ideal bir destinasyondur. Tekne turlar? sayesinde b&ouml;lgenin en gizli kalm?? g&uuml;zelliklerini keşfetme imkan? sizi bekliyor.</p>
<p>&nbsp;</p>
<h3>&Ouml;l&uuml;deniz Tekne Turu Rotas?</h3>
<p>&Ouml;l&uuml;deniz Tekne Turu, her g&uuml;n saat 10:30''da &Ouml;l&uuml;deniz Plajı''ndan bağlıyor. Turu katılan misafirlerimizin ilk dura??, b&uuml;y&uuml;leyici Mavi Ma?ara olacak. Toplamda alt? durak ile dolu olan bu yolculuk, unutulmaz an?lar biriktirmenizi sağlar.</p>
<p>&nbsp;</p>
<h3>Mavi Ma?ara</h3>
<p>Berrak deniz suyuyla b&uuml;y&uuml;leyici manzaralar sunan Mavi Ma?ara, su alt? keyfini doyas?ya yaşamak isteyenler i&ccedil;in bir cennet. Dalış yapmak isteyenler i&ccedil;in de &ouml;nemli bir nokta olan bu b&ouml;lge, &Ouml;l&uuml;deniz Koylar? Turu ile ke?fedilmelidir. Ard?ndan, yolculu?umuz Kelebekler Vadisi&rsquo;ne devam edecek.</p>
<p>&nbsp;</p>
<h3>Kelebekler Vadisi</h3>
<p>Dik kayal?klarla &ccedil;evrili bu vadide 80&rsquo;den fazla kelebek t&uuml;r&uuml;n&uuml; g&ouml;rebileceksiniz. Burada y&uuml;r&uuml;y&uuml;? yaparken kelebekleri izleme fırsat? bulacak ve denizin tad?n? &ccedil;ıkarabileceksiniz. Kelebekler Vadisi Tekne Turu, sarp yama&ccedil;lardan d&uuml;?en ?elalelerin muhteşem manzaras?yla dolu bir deneyim sunacak. Harika manzara fotoğraflar? &ccedil;ekmek i&ccedil;in m&uuml;kemmel bir lokasyon!</p>
<p>&nbsp;</p>
<h3>St. Nicholas Adas?</h3>
<p>Tarihi ve k&uuml;lt&uuml;rel zenginlikleriyle dolu St. Nicolas Adas?, adanın zirvesinde yer alan kilisesiyle dikkat &ccedil;ekiyor. Tarihe ilgi duyanlar i&ccedil;in ka&ccedil;?r?lmamas? gereken bir nokta olan adaya deniz yoluyla olduk&ccedil;a kolay ula?abilirsiniz. Tur esnas?nda zengin bir a&ccedil;?k b&uuml;fe ile &ouml;?le yemeği sunulmaktad?r. Rotam?zdaki her durakta misafirlerimize yaklaşık 1 saat verilen molalar, b&ouml;lgenin tad?n? &ccedil;ıkarman?z? sa?lamakta.</p>
<p>&nbsp;</p>
<h3>Akvaryum Koyu</h3>
<p>Mavinin binbir tonunu g&ouml;rebilece?iniz Akvaryum Koyu, muhteşem dibinde dalış yapmak isteyenler i&ccedil;in bi&ccedil;ilmi? kaftan.</p>
<p>&nbsp;</p>
<h3>Deve Plajı</h3>
<p>Ad?n? deveye benzeyen k&uuml;&ccedil;&uuml;k adac?klardan alan Deve Plajı, uzun bir g&uuml;n&uuml;n ard?ndan kendinizi alt?n rengi kumlara b?rakabilece?iniz bir plaj.&nbsp;</p>
<p>&nbsp;</p>
<h3>So?uk Su Koyu</h3>
<p>Da?lardan gelen kaynak sularıyla olu?an bu koy, do?anın harika bir par&ccedil;as?n? sunmaktad?r. &Ccedil;am ormanlar? ile &ccedil;evrili bu doğal alan, serin ve taze bir y&uuml;zme deneyimi sunar. So?uk Su Koyu&rsquo;nda, do?anın g&uuml;zellikleri ile karşılaş?rken eşsiz bir deneyim yaşayacaks?n?z. Tekne personelimiz, ge&ccedil;i? yapt???n?z her nokta hakk?nda bilgi vererek gezinizin eğitimli ve keyifli ge&ccedil;mesini sağlar.</p>
<p>&nbsp;</p>
<p>G&uuml;n&uuml;n sonunda, Deve Plajı&rsquo;nda g&uuml;n bat?m?n? izleyebilir, dilerseniz denizde y&uuml;zerek ya da g&uuml;ne?in keyfini &ccedil;ıkararak vakit ge&ccedil;irebilirsiniz. Tur, saat 18.00&rsquo;de &Ouml;l&uuml;deniz Plajı&rsquo;na d&ouml;n&uuml;?le son bulur.</p>
<p>&nbsp;</p>
<p>&Ouml;l&uuml;deniz Tekne Turlar?, siz ve sevdiklerinizin bir arada unutulmaz an?lar yaşamas?n? sağlar. G&uuml;n boyunca doğal g&uuml;zelliklerin tad?n? &ccedil;ıkararak eğlenceli bir g&uuml;n ge&ccedil;irmeniz i&ccedil;in harika bir fırsat sunar.</p>
<p>&nbsp;</p>
<h3>&Uuml;crete Dahil Olanlar</h3>
<ul>
<li>&Ouml;ğle yemeği</li>
<li>Rehberlik</li>
</ul>
<p>&nbsp;</p>
<h3>&Uuml;crete Dahil Olmayanlar</h3>
<ul>
<li>İ&ccedil;ecekler</li>
</ul>
<p>&nbsp;</p>
<p>&Ouml;l&uuml;deniz Adalar Turlar? ile kristal berrakl???ndaki denizde ve yemyeşil do?anın i&ccedil;inde dinlendirici bir g&uuml;n ge&ccedil;irebilirsiniz. Ayr?ca, ekonomik fiyat se&ccedil;enekleriyle t&uuml;m sevdikleriniz i&ccedil;in uygun bir deneyim sa?l?yoruz. Online rezervasyon yaparken &ouml;deme se&ccedil;eneklerimizi inceleyerek ekstra fırsatlar? ka&ccedil;?rmay?n.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '5' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '5' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Ölüdeniz, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '5' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- kayakoy-at-turu
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '6' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Kayaköy At Turu',
    description = '<h2>Kayak&ouml;y At Turu</h2>
<h3>Fethiye Kayak&ouml;y&rsquo;de At Turu: Doğanın Kalbinde Eşsiz Bir Deneyim</h3>
<p>Fethiye&rsquo;nin tarihi ve doğal g&uuml;zellikleriyle dolu Kayak&ouml;y b&ouml;lgesi, hem huzurlu bir ka&ccedil;amak hem de macera arayanlar i&ccedil;in muhteşem bir destinasyon. Doğanın kalbinde, yeşil vadiler ve tarihi kal?nt?lar aras?nda ger&ccedil;ekle?tirilen at turlar?, hem yerli hem de yabanc? turistler i&ccedil;in benzersiz bir deneyim sunuyor.</p>
<p>&nbsp;</p>
<h3>Kayak&ouml;y ve Eşsiz Manzaralar?</h3>
<p>Kayak&ouml;y, 1920&rsquo;li y?llardan kalma ta? evlerin aras?nda huzur dolu bir y&uuml;r&uuml;y&uuml;? yapman?z? sağlar. Bu tarih kokan b&ouml;lge, do?a ile i&ccedil; i&ccedil;e, sakin bir atmosfere sahiptir. At turu s?ras?nda, Kayak&ouml;y&rsquo;&uuml;n olağan&uuml;st&uuml; manzaraların? ke?federken, &ccedil;evredeki koyların ve da?lar?n etkileyici g&ouml;r&uuml;nt&uuml;s&uuml;yle b&uuml;y&uuml;leneceksiniz. Fethiye&rsquo;nin eşsiz g&uuml;zelliklerini bir at?n s?rt?nda hissetmek, bu deneyimi unutulmaz k?l?yor.</p>
<p>&nbsp;</p>
<h3>At Turlar?nın Avantajlar?</h3>
<p>At turlar?, hem macera dolu hem de rahatlat?c? bir aktivitedir. &Ouml;zellikle do?a y&uuml;r&uuml;y&uuml;?&uuml;n&uuml; seven, farklı bir bak?? a&ccedil;?s?yla manzaray? g&ouml;rmek isteyenler i&ccedil;in ideal bir se&ccedil;enek. Atlar?n yava? ve sakin temposu, do?anın tad?n? &ccedil;ıkarman?za olanak tan?r. Uzman rehberler eşliğinde yap?lan bu turlar, her seviyeden katılımcıya hitap eder; yeni başlayanlar i&ccedil;in &ouml;zel eğitimler verilirken, deneyimli biniciler i&ccedil;in daha zorlu parkurlar sunulmaktad?r.</p>
<p>&nbsp;</p>
<h3>Fethiye Kayak&ouml;y At Turu Deneyiminiz Nasıl Ge&ccedil;iyor?</h3>
<p>Fethiye Kayak&ouml;y&rsquo;deki at turlar?nın genellikle 1 saat ile 3 saat aras?nda de?i?en se&ccedil;enekleri bulunmaktad?r. Turlar, do?a y&uuml;r&uuml;y&uuml;?leri, &ccedil;am a?a&ccedil;lar?nın aras?ndaki patikalar veya antik kal?nt?lara dair bilgilerle zenginle?tirilir. Hem eğlenceli hem de &ouml;?retici bir deneyim sunan bu turlar, grup veya bireysel katıl?mlara a&ccedil;?kt?r.</p>
<p>&nbsp;</p>
<h3>Rezervasyon ve Kat?l?m</h3>
<p>Fethiye Kayak&ouml;y&rsquo;de at turuna katılmak olduk&ccedil;a kolay. ?ehir merkezinde yer alan bir&ccedil;ok tur ?irketi, &ouml;nceden rezervasyon yapman?za olanak tan?r. &Ouml;zellikle yaz aylar?nda yo?un talep g&ouml;rd&uuml;?&uuml;nden, yerinizi &ouml;nceden ay?rtman?zda fayda var. Online platformlardan veya telefonla ileti?im kurarak hızl?ca rezervasyon yapabilirsiniz.</p>
<p>&nbsp;</p>
<h3>Neden At Turu Se&ccedil;melisiniz?</h3>
<p>Doğa ile Ba?lant? Kurma: ?ehir hayat?nın karma?as?ndan uzak, doğal g&uuml;zelliklerin i&ccedil;inde yer al?rs?n?z.</p>
<p>Eşsiz An?lar: Payla??lan an?lar, sevdiklerinizle unutulmaz anlar yaşayarak sizi bir araya getirir.</p>
<p>B&uuml;t&uuml;n Aile ?&ccedil;in Uygun: Hem yeti?kinler hem de &ccedil;ocuklar i&ccedil;in g&uuml;venli ve eğlenceli bir aktivitedir.</p>
<p>Yerel Rehberler: B&ouml;lgeyi tan?yan deneyimli rehberler sayesinde, tarihi ve do?a g&uuml;zellikleri hakk?nda bilgi edinirsiniz.</p>
<p>Fethiye Kayak&ouml;y&rsquo;deki at turlar?, sadece bir macera de?il, ayn? zamanda unutulmaz bir do?a deneyimidir. G&uuml;ne?li bir g&uuml;nde, do?anın tad?n? &ccedil;ıkararak, eski ta? evlerin aras?nda s&uuml;z&uuml;lmek ve g&uuml;zel manzaraların tad?n? &ccedil;ıkarmak i&ccedil;in hemen rezervasyonunuzu yap?n. Bu eşsiz deneyimleri yaşamaktan kendinizi mahrum etmeyin!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '6' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '6' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Kayaköy, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '6' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- fethiye-atv-turu-quad-bike
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '7' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Fethiye ATV Turu (Quad Bike)',
    description = '<h2>Fethiye ATV Turu (Quad Bike)</h2>
<h3>ATV Turu Kayak&ouml;y''de - Heyecan Dolu Bir Macera</h3>
<p>Fethiye''nin olağan&uuml;st&uuml; g&uuml;zelli?e sahip Kayak&ouml;y b&ouml;lgesini keşfetmek i&ccedil;in en heyecan verici se&ccedil;enek, ATV (Quad Bike) Turu. Bu turu tercih etmeniz, size benzersiz bir deneyim yaşatacak.</p>
<p>&nbsp;</p>
<p>ATV Turu, sizi Kayak&ouml;y''&uuml;n ?ss?z ve doğal g&uuml;zellikleri aras?nda gezintiye &ccedil;ıkar?yor. Saatlerce s&uuml;ren zorlu ama bir o kadar da keyifli parkurlarda, engebeli arazilerde ve da? yollar?nda heyecan dolu bir macera sizi bekliyor.</p>
<p>&nbsp;</p>
<p>Tecr&uuml;beli rehberlerimiz eşliğinde, g&uuml;venlik &ouml;nlemlerini de eksiksiz alarak, do?anın kuca??nda benzersiz bir deneyim yaşayacaks?n?z. Maceraperest ruhunuzu doyuracak, adrenalini zirveye &ccedil;ıkaracak bu tur, fotoğraf ve video &ccedil;ekimi i&ccedil;in de m&uuml;kemmel fırsatlar sunuyor.</p>
<p>&nbsp;</p>
<p>Turu tamamlad?ktan sonra, Kayak&ouml;y''&uuml;n tarihi ve efsanevi atmosferini hissederek, b&ouml;lgenin muhteşem manzaraların? seyredebilirsiniz. T&uuml;m bu deneyimler, sizi b&uuml;y&uuml;leyecek ve Fethiye seyahatinizin unutulmaz bir par&ccedil;as? olacak.</p>
<p>&nbsp;</p>
<p>Fethiye Atv Turu, Fethiye atv safari turunda, tarihi Kayak&ouml;y&rsquo;de tozlu ve &ccedil;amurlu patika yollarda macera ve adrenalin dolu bir g&uuml;n sizi bekliyor. Ehliyet ve Tecr&uuml;be gerektirmeyen bu turda motorlar 4 tekerlekli ve otomatik vitestir. Otellerinizden servisimizle al?nd?ktan sonra tur başlang?&ccedil; noktas? olan &ouml;zel parkurumuza var?l?yor.&nbsp;</p>
<p>&nbsp;</p>
<p>Atv safari turu Kayak&ouml;y mevkinde ki ormanl?k alanda bulunan b&ouml;lgenin en b&uuml;y&uuml;k doğal parkurunda ger&ccedil;ekle?mektedir. Burada ki k?sa bir eğitim s&uuml;r&uuml;?&uuml;nden sonra extreme dolu macera bağlıyor.&nbsp; Atv motor turunda isterseniz tek motora 2 kişi yada tek kişi olarak motorlar? s&uuml;rebiliyorsunuz. Motor ekipmanlar? ve otelden servis tur &uuml;cretine dahildir. Siz konuklar?m?z tur bitiminden sonra yine otellerinize servis arac?m?zla b?rak?larak macera dolu turunuz sonlan?yor.</p>
<p>&nbsp;</p>
<p>Bu tur i&ccedil;in toplam 3 saat zaman ay?rman?z yeterlidir. G&uuml;n i&ccedil;erisinde &uuml;&ccedil; farklı zamanda d&uuml;zenlenen turumuza hangi zaman dilimi size uygunsa o saati tercih ederek rezervasyon yapt?rabiliyorsunuz. 14 ya??ndan k&uuml;&ccedil;&uuml;klerin&nbsp; ve rutin rahats?zl??? olanlar?n bu tura katılmas?n? tavsiye etmiyoruz.</p>
<p>&nbsp;</p>
<h3>Fethiye Atv Safari Turu Tavsiyeleri</h3>
<p>&Ouml;l&uuml;deniz atv safari turu tozlu ve &ccedil;amurlu yollarda d&uuml;zenlendi?i i&ccedil;in yan?n?zda yedek k?yafet getirmenizi tavsiye ederiz. Motor turuna ba?lamadan &ouml;nce mutlaka g&ouml;revlilerin verdi?i g&uuml;venlik ekipmanlar?n? takman?z? &ouml;neriyoruz. E?er a??r? s?cak ile probleminiz varsa, sabah yada ak?am&uuml;st&uuml; saatlerinde ki tura katılman?z? tavsiye ederiz. Ayr?ca bu adrenalin dolu g&uuml;n&uuml; unutulmaz bir an?ya &ccedil;evirmek isterseniz k&uuml;&ccedil;&uuml;k bir &uuml;cret vererek profesyonel olarak yap?lan fotoğraf &ccedil;ekimlerini sat?n alabilirsiniz.</p>
<p>&nbsp;</p>
<h3>Tur Saatlerimiz:</h3>
<p>10.00 -&nbsp;14.00 -&nbsp;16.00</p>
<p>&nbsp;</p>
<h3>Parkur Bilgilendirme;</h3>
<p>2 Adet Parkur bulunmaktad?r. 1. parkur 25 dk ard?ndan 10 dk mola verilir. 2.parkur olan Da? parkuru 35 dk d?r.</p>
<p>ATV Turu, Kayak&ouml;y gezinizin en heyecan verici aktivitesi olacak. Rezervasyonlar?n?z? ?imdi yapt?rarak, bu benzersiz maceraya katıl?n!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '7' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '7' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Kayaköy, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '7' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- 12-adalar-ozel-tekne-turu
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '8' LIMIT 1);
UPDATE listing_translations lt
SET title = '12 Adalar Özel Tekne Turu',
    description = '<h2>12 Adalar &Ouml;zel Tekne Turu</h2>
<h3>Fethiye Limanı&rsquo;ndan 12 Adalara &Ouml;zel Tekne Turlar?: Cennet Gibi Bir Ka&ccedil;amak</h3>
<p>Fethiye, T&uuml;rkiye&rsquo;nin g&uuml;neybat?s?nda, efsanevi g&uuml;zellikteki do?as?, tarihi kal?nt?lar? ve masmavi deniziyle yerli ve yabanc? turistlerin g&ouml;zdesi olmu?tur. &Ouml;zellikle Fethiye Limanı, b&ouml;lgenin en canlı ve hareketli noktalarından biri olarak &ouml;n plana &ccedil;?kmaktad?r. Buradan yap?lan 12 adalar turlar?, ziyaret&ccedil;ilere muhteşem bir deniz yolculu?u sunarak, hem dinlendirici hem de macera dolu bir deneyim yaşat?r.</p>
<p>&nbsp;</p>
<h3>1. Turlar?n ?&ccedil;eri?i</h3>
<p>Fethiye&rsquo;den 12 adalara yap?lan &ouml;zel tekne turlar? genellikle bir g&uuml;n s&uuml;rmektedir ve bu turlar, b&ouml;lgedeki en pop&uuml;ler adalar? kapsar. Bu adalar aras?nda G&ouml;cek Adalar?, Tersane Adas?, K?z?l Ada, Yass?ca Adalar? ve daha bir&ccedil;ok g&uuml;zel nokta bulunur.</p>
<p>Turlar, misafirlere &ccedil;eşitli aktiviteler sunar:</p>
<p><strong>Y&uuml;zme Duru?lar?:</strong> Turlar s?ras?nda tekne, genellikle sakin ve berrak sularda y&uuml;zme molalar? verir.</p>
<p><strong>şnorkelle Dalış:</strong> Baz? turlar, deniz alt? d&uuml;nyasın? keşfetmek isteyenler i&ccedil;in şnorkelle dalış imkan? sunar.</p>
<p><strong>Kum Plajlar?nda Dinlenme:</strong> Tur s?ras?nda g&uuml;zel kumsallarda dinlenme ve g&uuml;ne?lenme fırsatlar? da vard?r.</p>
<p><strong>Eşsiz Manzaralar:</strong> Her adada muhteşem fotoğraf fırsatlar? sunulur.</p>
<h3>&nbsp;</h3>
<h3>2. &Ouml;zel Tekne Turlar?</h3>
<p>&Ouml;zel tekne turlar?, gruplar halinde veya ailenizle gitmeyi tercih ederseniz ideal bir se&ccedil;enektir. Bu turlar?n avantajlar?:</p>
<p><strong>Kişiselle?tirilmi? Rotalar:</strong> ?stedi?iniz adalara gitme ?ans?.</p>
<p><strong>Hizmet Kalitesi:</strong> Genellikle daha az yolcu ile daha kaliteli bir hizmet al?rs?n?z.</p>
<p><strong>&Ouml;zel Yiyecek ve İ&ccedil;ecek:</strong> Misafirlerin iste?ine g&ouml;re yemek se&ccedil;enekleri sunulabilir.</p>
<p>Bir&ccedil;ok tekne, l&uuml;ks teknelerden, daha geleneksel ah?ap guletlere kadar geni? bir yelpazeye sahiptir.</p>
<p>&nbsp;</p>
<h3>3. Adalar ve Ziyaret Edilecek Yerler</h3>
<p>K?z?l Ada: Hem do?as? hem de tarihi kal?nt?lar?yla dikkat &ccedil;eker. Y&uuml;zme molas? ve piknik yapma imkan? sunar.</p>
<p><strong>Tersane Adas?:</strong> Antik kal?nt?lar? ve doğal g&uuml;zellikleri ile &ouml;ne &ccedil;ıkar. Y&uuml;zme ve ke?if yapmak i&ccedil;in harika bir yer.</p>
<p><strong>Yass?ca Adalar?:</strong> S?cak yaz g&uuml;nlerinde serinlemek i&ccedil;in ideal ve &ccedil;o?u zaman k&uuml;&ccedil;&uuml;k plajlar? ile tan?n?r.</p>
<p><strong>G&ouml;cek Adalar?:</strong> Burada bulunan zengin berrak sularda y&uuml;zme ve şnorkelle dalış yapma olana?? sunar.</p>
<p>&nbsp;</p>
<h3>4. Ula??m ve Rezervasyon</h3>
<p>Fethiye Limanı&rsquo;na ula??m olduk&ccedil;a kolayd?r. Dalaman Havaliman?&rsquo;na inenler, Fethiye&rsquo;ye 1 saatlik bir yolculuk yaparak limana ula?abilirler. Turlar i&ccedil;in rezervasyon yaparken, &ouml;nceden ara?t?rma yapman?z ve &ccedil;eşitli firmalar?n fiyatlar?n? karşılaşt?rman?z &ouml;nemlidir. ?yi bir &ccedil;evrimi&ccedil;i inceleme, do?ru bir se&ccedil;im yapman?za yard?mc? olabilir.</p>
<p>&nbsp;</p>
<h3>5. Tavsiyeler</h3>
<p>G&uuml;ne? Koruyucu Kullan?n: Uzun saatler g&uuml;ne? alt?nda kalaca??n?z i&ccedil;in, g&uuml;ne? koruyucu kullanmay? unutmay?n.</p>
<p>Hafif Giyin: Rahat ve hafif giysiler tercih edin.</p>
<p>Su ve At??t?rmal?k: Yan?n?za mutlaka su ve hafif at??t?rmal?klar al?n.</p>
<p>Erken Rezervasyon: &Ouml;zellikle yaz aylar?nda turlar yo?un olabilece?i i&ccedil;in, erken rezervasyon yapman?zda fayda var.</p>
<p>Fethiye liman?ndan 12 adalara yapaca??n?z bir tekne turu, sadece deniz ve g&uuml;ne?ten de?il, ayn? zamanda ke?if ve dinlencenin tad?n? &ccedil;ıkarman?z? sa?layacak eşsiz bir deneyim sunar. Doğayla i&ccedil; i&ccedil;e, tarihi alanlarda hazineler ke?federek, unutulmaz an?larla dolu bir g&uuml;n&uuml; geride b?rakacaks?n?z.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '8' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '8' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Fethiye, Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '8' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- oludeniz-aqua-park
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '9' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Ölüdeniz Aqua Park',
    description = '<h2>&Ouml;l&uuml;deniz Aqua Park</h2>
<p>Misafirlerinize sunabileceğiniz harika bir aktivite &ouml;nerisi var! Waterpark, Fethiye&rsquo;nin en b&uuml;y&uuml;k temal? su park? olarak dikkat &ccedil;ekiyor.</p>
<p>Park?m?zdaki t&uuml;m kayd?rak ve havuz kullan?mlar? misafir can g&uuml;venli?i a&ccedil;?s?ndan boy ve kilo k?s?tlamalar? i&ccedil;ermektedir ve bu k?s?tlamalar &uuml;retici firma standartlar? gere?i herhangi bir ?ekilde esnetilemez veya de?i?tirilemez.</p>
<p>Yapılacak extra harcamalar i&ccedil;in bilekliklere park i&ccedil;erisindeki 2 cash point noktas?nda (gi?e arkas?, Icon Bar) bakiye y&uuml;kleme i?lemi yap?labilmektedir. Waterpark i&ccedil;erisinde yap?lacak t&uuml;m harcamalarda bileklik kullan?lmaktad?r.</p>
<p>&nbsp;</p>
<h3>??te parkla ilgili &ouml;ne &ccedil;?kan baz? detaylar:</h3>
<p><strong>Konum ve Ula??m:</strong> Tesisinize yaln?zca 1 km uzakl?kta bulunan su park?na ara&ccedil;la 4 dakikada, yaya olarak ise 15 dakikada ula?abilirsiniz. Orka World Hotel misafirlerine &uuml;cretsiz giri? imkan? ve belirli saatlerde &uuml;cretsiz transfer hizmeti sunuluyor.</p>
<p><strong>Eğlence Aktiviteleri:</strong> Su park? 18,000 m&sup2; alanda, 13 kayd?rak ve 4 havuz ile donat?lm??. Kayd?raklar?n 7''si hem &ccedil;ocuklar hem de yeti?kinler i&ccedil;in, 5''i sadece &ccedil;ocuklar i&ccedil;in ve 1''i sadece yeti?kinlere &ouml;zel!</p>
<p><strong>&Ouml;zel Alanlar ve Yiyecek İ&ccedil;ecek:</strong> Parkta ayr?ca Mayan Dalga Havuzu, Volcano ?elale Havuzu, Kids Kingdom, 450 m uzunlu?unda Tembel Nehir ve &ccedil;eşitli yiyecek alanlar? mevcut. Yiyecek ve i&ccedil;ecekler ekstra &uuml;cretli, d??ar?dan yiyecek ve i&ccedil;ecek getirilmemektedir.</p>
<p><strong>G&uuml;venlik:</strong> T&uuml;m kayd?rak ve havuz kullan?mlar?, misafirlerin g&uuml;venli?i i&ccedil;in belirli boy ve kilo k?s?tlamalar?na tabi. Bu kurallar kesinlikle esnetilemiyor.</p>
<p><strong>&Ccedil;alışma Saatleri:</strong> Waterpark, her g&uuml;n 10:00 - 18:00 saatleri aras?nda hizmet veriyor.</p>
<p>&nbsp;</p>
<h3>Kurallar</h3>
<ul>
<li>D??ar?dan Yiyecek ve İ&ccedil;ecek getirilmemektedir.</li>
<li>Evcil hayvan al?nmamaktad?r.</li>
<li>0-3 Ya? aras? &uuml;cretsizdir.</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '9' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '9' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Ovacık, Ölüdeniz, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '9' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- calis-aqua-park
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '10' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Çalış Aqua Park',
    description = '<h2>&Ccedil;alış Aqua Park</h2>
<p>Fethiye, T&uuml;rkiye&rsquo;nin g&ouml;zde tatil beldelerinden biri olarak, doğal g&uuml;zellikleri ve eğlence olanaklar?yla tatilcileri kendine &ccedil;ekiyor. &Ccedil;alış Plajı b&ouml;lgesi ise &ouml;zellikle sahil keyfi, restoranlar ve &ccedil;eşitli aktiviteleri ile dikkat &ccedil;ekiyor. Bu b&ouml;lgede bulunan aqua parklar da aileler i&ccedil;in harika bir eğlence se&ccedil;ene?i sunuyor. ??te &Ccedil;alış Plajı b&ouml;lgesindeki aqua park hakk?nda detayl? bilgiler:</p>
<p>&nbsp;</p>
<h3>Aqua Park &Ouml;zellikleri</h3>
<p><strong>1. Su Kayd?raklar? ve Havuzlar:</strong></p>
<p>Aqua park, genellikle farklı y&uuml;ksekliklerde ve uzunluklarda bir&ccedil;ok su kayd?ra??na sahip. Aileler ve &ccedil;ocuklar i&ccedil;in uygun olan kayd?raklar, adrenalini y&uuml;ksek bir deneyim sunuyor. Ayr?ca, &ccedil;ocuk havuzlar? ile yeti?kin havuzlar? ayr?lm?? durumda, b&ouml;ylece her ya? grubuna hitap ediyor.</p>
<p>&nbsp;</p>
<p><strong>2. Dinlenme Alanlar?:</strong></p>
<p>Aqua parklar, su eğlencelerinin yanı sıra dinlenme alanlar? ile de donat?lm??t?r. ?ezlonglar ve g&ouml;lgelikler, g&uuml;ne?in tad?n? &ccedil;ıkarmak isteyenler i&ccedil;in rahat bir ortam sunuyor. &Ccedil;alış Plajı&rsquo;nın serin r&uuml;zgar? eşliğinde dinlenmek, olduk&ccedil;a keyifli bir deneyim.</p>
<p>&nbsp;</p>
<p><strong>3. Yenilik&ccedil;i Aktiviteler:</strong></p>
<p>Baz? aqua parklar, sadece kayd?raklarla de?il, ayn? zamanda dalga havuzlar?, temal? aktiviteler ve oyun alanlar? ile ziyaret&ccedil;ilerine &ccedil;eşitli eğlenceler sunar. Bu, &ouml;zellikle &ccedil;ocuklar i&ccedil;in eğlenceli ve unutulmaz anlar?n yaşanmas?n? sağlar.</p>
<p>&nbsp;</p>
<p><strong>4. Yiyecek ve İ&ccedil;ecek Se&ccedil;enekleri:</strong></p>
<p>Genellikle aqua park i&ccedil;erisinde kafe ve restoranlar bulunmaktad?r. Burada yerel ve uluslararas? mutfaklardan lezzetler tadabilir, serinletici i&ccedil;ecekler alabilirsiniz. Aileler i&ccedil;in snack barlar da hızl? at??t?rmal?k se&ccedil;enekleri sunar.</p>
<p>&nbsp;</p>
<p><strong>5. G&uuml;venlik &Ouml;nlemleri:</strong></p>
<p>&Ccedil;ocuklar?n g&uuml;venli?i i&ccedil;in aqua parklar, s&uuml;rekli olarak g&ouml;zlem yapan cankurtaranlarla donat?lm??t?r. Ayr?ca kayd?raklar?n ve havuzlar?n derinlikleri gibi &ccedil;eşitli g&uuml;venlik &ouml;nlemleri al?nmaktad?r.</p>
<p>&nbsp;</p>
<h3>Konum ve Ula??m</h3>
<p>&Ccedil;alış Plajı&rsquo;nda bulunan aqua park, plaja olduk&ccedil;a yak?n bir konumda yer al?yor. Fethiye merkezine ula??m olduk&ccedil;a kolayd?r; otob&uuml;s, taksi veya ara&ccedil; kiralama se&ccedil;enekleri ile aqua parka rahatl?kla ula?abilirsiniz. Ayr?ca, g&uuml;zel bir y&uuml;r&uuml;y&uuml;? yaparak da plaj boyunca gidip gelmek m&uuml;mk&uuml;nd&uuml;r.</p>
<p>&nbsp;</p>
<h3>Eğlencenin Suyunu &Ccedil;?kar?n!</h3>
<p>Fethiye &Ccedil;alış Plajı b&ouml;lgesindeki aqua park, hem eğlenceli zaman ge&ccedil;irmek hem de s?cak yaz g&uuml;nlerinde serinlemek i&ccedil;in m&uuml;kemmel bir yer. Ailecek keyifli vakit ge&ccedil;irebilir, yeni arkadaşl?klar edinebilir ve su aktiviteleri ile dolu bir g&uuml;n ge&ccedil;irebilirsiniz. T&uuml;m bu olanaklarla, Fethiye&rsquo;deki tatilinizin en eğlenceli anlar?ndan biri burada ger&ccedil;ekle?ebilir.</p>
<p>&nbsp;</p>
<h3>Kurallar</h3>
<ul>
<li>0-4 ya? &Uuml;CRETS?ZD?R.</li>
<li>D??ar?dan yiyecek ve i&ccedil;ecek al?nm?yor.</li>
<li>Evcil hayvan kabul edilmiyor.</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '10' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '10' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Foça, Sultans Aqua City, Mustafa Kemal Bulvarı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '10' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- saklikent-rafting-aktivitesi
UPDATE listings SET
  location_name = 'Seydikemer',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '11' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Saklıkent Rafting Aktivitesi',
    description = '<h2>Saklıkent Rafting Aktivitesi</h2>
<h3>Unutulmaz Doğa ve Macera Deneyimi,&nbsp;Saklıkent Kanyonu&rsquo;nda Rafting: G&uuml;venli ve Efsanevi Bir Macera</h3>
<p>Saklıkent Kanyonu, T&uuml;rkiye&rsquo;nin en g&uuml;zel doğal g&uuml;zelliklerinden biri olarak, yaln?zca g&ouml;rsel ?&ouml;len sunmakla kalmaz, ayn? zamanda do?a i&ccedil;i rafting deneyimi i&ccedil;in m&uuml;kemmel bir destinasyondur. Serin suları, y&uuml;ksek kayal?k duvarlar? ve etkileyici manzaralarıyla Saklıkent Rafting, macera tutkunlar?na eşsiz bir adrenalin deneyimi sunar.</p>
<p>&nbsp;</p>
<h3>Saklıkent Kanyonu&rsquo;nda Rafting Yaparken Dikkat Edilmesi Gerekenler</h3>
<ul>
<li><strong>G&uuml;venlik Ekipmanlar?:</strong> Kask, can yele?i ve uygun ayakkab?lar?n?z? her zaman tak?n. Standartlara uygun ekipman kullanmak g&uuml;venli?inizi art?r?r.</li>
<li><strong>Rafting Deneyimi ve Y&uuml;zme Becerileri:</strong> Her seviyeye uygun rafting turlar? mevcuttur. Acemiyseniz, uzman rehberler eşliğinde g&uuml;venle rafting yapabilirsiniz. Y&uuml;zme bilmek avantaj sağlar, panik yapmamaya &ouml;zen g&ouml;sterin.</li>
<li><strong>Rehber Talimatlar?na Uyun:</strong> G&uuml;venli?iniz i&ccedil;in rehberin verdi?i t&uuml;m talimatlara dikkatle uyun.</li>
<li><strong>Doğaya Sayg? ve &Ccedil;evre Temizli?i:</strong> Doğal g&uuml;zellikleri koruyun, &ccedil;&ouml;p b?rakmay?n, do?aya zarar vermeyin.</li>
<li><strong>Hava Durumu Kontrol&uuml;:</strong> Hava ?artlar?n? &ouml;nceden kontrol edin, ?iddetli ya?mur veya f?rt?na gibi olumsuz ko?ullarda rafting yap?lmaz.</li>
<li><strong>?leti?im ve Tak?m &Ccedil;alışmas?:</strong> Ekip i&ccedil;i ileti?im ve uyum, hem g&uuml;venlik hem de eğlence a&ccedil;?s?ndan &ccedil;ok &ouml;nemlidir.</li>
<li><strong>Su S?cakl??? ve Ak?nt? G&uuml;c&uuml;:</strong> Su s?cakl??? ve ak?nt? hız?n? &ouml;?renin, zorluk seviyesini g&ouml;z &ouml;n&uuml;nde bulundurun.</li>
<li><strong>Valiz ve Malzeme G&uuml;venli?i:</strong> Su ge&ccedil;irmez s?rt &ccedil;antas?yla k?yafet, yiyecek ve suyu g&uuml;venle ta??yabilirsiniz.</li>
<li><strong>Suya D&uuml;?me Durumu:</strong> Panik yapmadan, m&uuml;mk&uuml;nse s?rt &uuml;st&uuml; y&uuml;zerek ak?nt?dan uzakla??n.</li>
<li><strong>Tak?m &Ccedil;alışmas? ve Uyum:</strong> Birlikte hareket edin, koordinasyonu sa?lay?n.</li>
</ul>
<p>Bu &ouml;nemli noktaları dikkate alarak Saklıkent Kanyonu&rsquo;nda rafting deneyiminizi g&uuml;venli ve keyifli hale getirebilirsiniz. Sorular?n?z veya ekstra bilgi istedi?iniz durumlar i&ccedil;in bizimle ileti?ime ge&ccedil;mekten &ccedil;ekinmeyin!</p>
<p>&nbsp;</p>
<h3>Saklıkent Kanyonu&rsquo;nda Rafting: Doğayla ?&ccedil; ?&ccedil;e Macera</h3>
<p>Saklıkent Kanyonu, T&uuml;rkiye&rsquo;nin en etkileyici doğal alanlar?ndan biridir. Yakla??k 14 km uzunlu?undaki bu muhteşem kanyon, y&uuml;ksek kayal?k duvarlar? ve serin suları ile do?a ve macera arayanlara eşsiz bir rafting deneyimi sunar. Bu doğal g&uuml;zellikler, her mevsim ziyaret&ccedil;ilerini b&uuml;y&uuml;ler.</p>
<p>&nbsp;</p>
<h3>Saklıkent Kanyonu Manzaras? ve Giri?</h3>
<p>Dar giri? yolu sizi cennete a&ccedil;ar gibi hissettirir. Kanyon boyunca y&uuml;r&uuml;y&uuml;? yap?p doğal g&uuml;zellikleri ke?fedebilir, fotoğraf &ccedil;ekebilir ve do?anın kucaklay?c? atmosferinin tad?n? &ccedil;ıkarabilirsiniz.</p>
<p>&nbsp;</p>
<h3>En Uygun Zamanlar ve Rafting Turlar?</h3>
<p>?lkbahar ve yaz aylar?, rafting i&ccedil;in en ideal d&ouml;nemlerdir. Erimeyen kar sularıyla olu?an ak?nt?lar, adrenalin dolu anlar ve unutulmaz bir do?a deneyimi sağlar. Rehberler eşliğinde d&uuml;zenlenen rafting turlar?, her seviyeden katılımcıya a&ccedil;?kt?r ve g&uuml;venli ekipmanlar ile ger&ccedil;ekle?tirilir.</p>
<p>&nbsp;</p>
<h3>Rafting Turunun Detayları</h3>
<ul>
<li><strong>Toplanma:</strong> Katılımcılar, &ouml;nceden belirlenmi? saatte Kalkan Aktivite Ofisi&rsquo;nde bulu?ur.</li>
<li><strong>Ula??m:</strong> Yakla??k 1 saatlik keyifli yolculuk sonras? kanyona ula??l?r.</li>
<li><strong>Y&uuml;r&uuml;y&uuml;? ve Haz?rl?k:</strong> Rehber eşliğinde k?sa tan?t?m ve do?a y&uuml;r&uuml;y&uuml;?&uuml; i&ccedil;in haz?r olun.</li>
<li><strong>Rafting:</strong> G&uuml;venlik ekipmanlar? da??t?l?r ve kanyonun derin sularında heyecan dolu rafting ba?lar. Hızl? akan su ve doğal engellerle dolu parkurda macera dolu anlar yaşars?n?z.</li>
</ul>
<h3>&nbsp;</h3>
<h3>Rafting Sonras? ve Ekstra Aktiviteler</h3>
<p>Rafting sonras?, nehir k?y?s?nda dinlenebilir, doğal &ccedil;amur banyosu yapabilir ve cildinizi tazeleyebilirsiniz. Ayr?ca, a&ccedil;?k b&uuml;fe men&uuml; ile lezzetli &ouml;?le yemeği molas? da sizi bekliyor.</p>
<p>&nbsp;</p>
<h3>Saklıkent Kanyonu&rsquo;nda Unutulmaz Macera</h3>
<p>Doğa tutkunlar? i&ccedil;in vazge&ccedil;ilmez bir deneyim olan rafting, yeni arkadaşl?klar kurmak ve do?ayla i&ccedil; i&ccedil;e olmak i&ccedil;in ideal. Adrenalin seviyorsan?z ya da sadece do?anın tad?n? &ccedil;ıkarmak istiyorsan?z, Saklıkent Rafting ile benzersiz an?lar biriktirebilirsiniz.</p>
<p>&nbsp;</p>
<p><strong>&Uuml;cretsiz otopark, kilitli emanet kasas? ve indirimli &ouml;?le yemeği imkanlar?m?zla sizi bekliyoruz.</strong></p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '11' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '11' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Kayadibi, Saklikent kanyonu, Fethiye/Muğla, Türkiye',
  'district_label', 'Seydikemer',
  'city', 'Seydikemer'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '11' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- dalaman-rafting-aktivitesi
UPDATE listings SET
  location_name = 'Dalaman',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '12' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Dalaman Rafting Aktivitesi',
    description = '<h2>Dalaman Rafting Aktivitesi</h2>
<h3>Dalaman Rafting Aktivitesi: Heyecan Dolu Maceranız Burada Başlıyor!</h3>
<p>Dalaman Nehri, T&uuml;rkiye&rsquo;nin g&uuml;neybat?s?nda, muhteşem do?as? ve etkileyici manzaralarıyla adrenalin tutkunlar?na kap?lar?n? aral?yor. &Ouml;zellikle yaz aylar?nda gelgitlere bağlı olarak debisi artan bu nehir, amat&ouml;r ve profesyonel raftinge uygun bir&ccedil;ok parkura sahip. Dalaman rafting aktivitesi, hem do?a severlerin hem de macera arayanlar?n vazge&ccedil;ilmez bir tercihi haline gelmi?tir. ??te bu heyecan dolu aktivitenin detayları!</p>
<p>&nbsp;</p>
<h3>Neden Dalaman''da Rafting?</h3>
<p>Dalaman Rafting, raftingin sundu?u adrenalin dolu deneyimi doğal g&uuml;zelliklerle birle?tiriyor. B&uuml;y&uuml;leyici da? manzaraları, yeşil ormanlar ve tertemiz su, dalgalarla bulu?an heyecanlı anlar?n arka plan?n? olu?turuyor. Ak?nt?lar, başlang?&ccedil; seviyesindeki katılımcılara uygunken, daha deneyimli sporcular i&ccedil;in de zorlu parkurlar mevcut. B&ouml;lgede muhteşem bir do?a y&uuml;r&uuml;y&uuml;?&uuml;, y&uuml;zme ve piknik gibi alternatif aktiviteler de bulunuyor, bu da g&uuml;n&uuml; dolu dolu ge&ccedil;irmenizi sa?l?yor.</p>
<p>&nbsp;</p>
<h3>Rafting Rotas?</h3>
<p>Dalaman Nehri&rsquo;ndeki rafting rotas?, her seviyeden katılımcıya hitap edebilir. Genel olarak 10 km ile 13 km aras?nda de?i?en parkurlar, belirli zorluk derecelerine sahip. Bu rotalar &uuml;zerinde:</p>
<p>&nbsp;</p>
<p><strong>Başlangı&ccedil; Seviyesi:</strong> Suya yeni ad?m atanlar i&ccedil;in idealdir. Hafif ak?nt?lara sahip b&ouml;l&uuml;mlerle ba?layarak, temel teknikleri &ouml;?renebilirsiniz.</p>
<p>&nbsp;</p>
<p><strong>Orta Seviye:</strong> Daha fazla heyecan arayanlar i&ccedil;in uygun rotalard?r. Burada daha fazla dalga, daha zorlu virajlar ve keyifli m&uuml;cadeleler sizi bekliyor.</p>
<p>&nbsp;</p>
<p><strong>?leri Seviye:</strong> Deneyimli rafting tutkunlar? i&ccedil;in tasarlanm?? parkurlard?r. Zorlu ak?nt?lar ve s&uuml;rpriz engellerle doludur. Bu parkurda dikkatli olmak ve tak?m &ccedil;al??mas? &ouml;nemlidir.</p>
<p>&nbsp;</p>
<h3>Rafting Turu S&uuml;reci</h3>
<p>Dalaman rafting aktiviteleri genellikle sabah erken saatlerde ba?lar. Tur ?irketleri, katılımcılar? otellerinden alarak, nehir kenar?ndaki başlang?&ccedil; noktas?na g&ouml;t&uuml;r&uuml;r. Burada g&uuml;venlik ekipmanlar?nın da??t?m?nın yanı s?ra, uzman eğitmenlerden k?sa bir eğitim al?rs?n?z. Kayak, y&uuml;zerken ve botla ilgili temel bilgileri kaparken; nehirdeki ak?nt?larda nasıl hareket edece?inizi &ouml;?renirsiniz.</p>
<p>&nbsp;</p>
<p>Rafting turu genellikle 4 ile 6 saat s&uuml;rer. Bu s&uuml;re zarf?nda do?anın tad?n? &ccedil;ıkarabilir, fotoğraflar &ccedil;ekebilir ve arkadaşlar?n?zla eğlenceli anlar payla?abilirsiniz. T&uuml;m g&uuml;n s&uuml;ren bu macera sonras?nda, genelde katılımcılara yemek ikram edilir. Bu, maceranın ard?ndan enerjinizi toparlamak i&ccedil;in m&uuml;kemmel bir fırsatt?r.</p>
<p>&nbsp;</p>
<h3>G&uuml;venlik &Ouml;nlemleri</h3>
<p>Dalaman rafting etkinlikleri, katılımcılar?n g&uuml;venli?i &ouml;n planda tutularak d&uuml;zenlenir. &Ouml;ncelikle, botlar ve ekipmanlar her sezon &ouml;ncesinde denetlenir. Ayr?ca, t&uuml;m katılımcılara kask, can yele?i gibi g&uuml;venlik ekipmanlar? sa?lan?r. E?itmenler, ayr?ca her zaman yan?n?zdad?r ve acil durumlar i&ccedil;in eğitim alm??lard?r.</p>
<p>&nbsp;</p>
<h3>Fiyatlar ve Rezervasyon</h3>
<p>Dalaman rafting turlar?, bir&ccedil;ok lokasyonda farklı fiyatland?rma se&ccedil;enekleri sunmaktad?r. Genellikle fiyatlar; tur s&uuml;resi, sa?lanan yemek ve ekipman hizmetlerine bağlı olarak de?i?ir. Do?ru bilgi almak ve en uygun fiyatlarla rezervasyon yapmak i&ccedil;in turistik web sitelerini ziyaret edebilir veya do?rudan tur ?irketleriyle ileti?ime ge&ccedil;ebilirsiniz. Erken rezervasyon, genellikle indirim ve kampanya avantajlar? sağlar.</p>
<p>&nbsp;</p>
<h3>Eğlence ve Adrenalin</h3>
<p>Dalaman Rafting, hem do?a sporlar? i&ccedil;in yeni başlayanlar hem de deneyimli maceraperestler i&ccedil;in harika bir fırsat. Bu etkinlik, hem stres atmak hem de do?anın tad?n? &ccedil;ıkarmak i&ccedil;in m&uuml;kemmel bir yoldur. Arkada?lar?n?zla veya ailenizle keyifli anlar yaşarken, sundu?umuz doğal g&uuml;zelliklerin tad?n? &ccedil;ıkarabilirsiniz.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '12' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '12' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Dalaman Çayı, Türkiye',
  'district_label', 'Dalaman',
  'city', 'Dalaman'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '12' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- oludeniz-parasailing-aktivitesi
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '13' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Ölüdeniz Parasailing Aktivitesi',
    description = '<h2>&Ouml;l&uuml;deniz Parasailing Aktivitesi</h2>
<p>&Ouml;l&uuml;deniz, T&uuml;rkiye''nin muhteşem doğal g&uuml;zellikleriyle &uuml;nl&uuml; bir beldesidir ve burada yap?lan parasailing aktiviteleri, ziyaret&ccedil;ilere eşsiz bir deneyim sunar. E?er adrenalin dolu bir macera ar?yorsan?z, &Ouml;l&uuml;deniz Parasailing tam size g&ouml;re!</p>
<p>&nbsp;</p>
<h3>&Ouml;l&uuml;deniz Parasailing Hakk?nda</h3>
<h3>Nedir?</h3>
<p>Parasailing, bir para?&uuml;tle, genellikle bir botun arkas?nda &ccedil;ekilerek yap?lan bir su sporu aktivitesidir. &Ouml;l&uuml;deniz''de, muhteşem mavi lag&uuml;n manzaras? eşliğinde, y&uuml;kseklere u&ccedil;manın keyfini &ccedil;ıkarabilirsiniz.</p>
<p>&nbsp;</p>
<h3>Deneyim:</h3>
<p>Parasailing s?ras?nda, profesyonel ekip tarafından g&uuml;vende tutulaca??n?zdan emin olabilirsiniz. ?lk olarak eğitim alacak, ard?ndan botla a&ccedil;?larak para?&uuml;t&uuml;n&uuml;z&uuml; alacaks?n?z. Suya do?ru y&uuml;kselerek, muhteşem manzaraların tad?n? &ccedil;ıkaracaks?n?z. Y&uuml;ksekten bakarken, g&uuml;n bat?m?nın eşsiz renklerini g&ouml;rmek ya da masmavi suyun &uuml;zerinde s&uuml;z&uuml;lmek olduk&ccedil;a b&uuml;y&uuml;leyici bir deneyimdir.</p>
<p>&nbsp;</p>
<h3>G&uuml;venlik:</h3>
<p>&Ouml;l&uuml;deniz Parasailing hizmeti sunan akredite ?irketler, en son g&uuml;venlik standartlar?na uyarak, g&uuml;venli ve keyifli bir deneyim sa?lamaktad?r. Tecr&uuml;beli pilotlar, her a?amada rehberlik edecek ve g&uuml;venli?iniz i&ccedil;in gereken &ouml;nlemleri alacakt?r.</p>
<p>&nbsp;</p>
<h3>Rezervasyon ve Kat?l?m</h3>
<h3>Nasıl Rezervasyon Yapılır?</h3>
<p>&Ouml;l&uuml;deniz&rsquo;deki bir&ccedil;ok tur ?irketi, parasailing aktiviteleri sunmaktad?r. Rezervasyon yapmak olduk&ccedil;a kolayd?r. &Ccedil;evrimi&ccedil;i platformlar &uuml;zerinden veya yerel ofislerle ileti?ime ge&ccedil;erek yerinizi ay?rtabilir, grup veya &ouml;zel turlar hakk?nda bilgi alabilirsiniz. &Ouml;zellikle yaz sezonunda talep yo?un oldu?u i&ccedil;in &ouml;nceden rezervasyon yapman?z &ouml;nerilir.</p>
<p>&nbsp;</p>
<h3>Fiyatlar ve Paketler:</h3>
<p>Parasailing fiyatlar?, sezona ve tur ?irketine g&ouml;re de?i?iklik g&ouml;sterebilir. Genellikle, u&ccedil;u? s&uuml;resi ve deneyim paketine g&ouml;re farklı se&ccedil;enekler sunulmaktad?r. Ayr?ca grup indirimleri ve &ouml;zel g&uuml;nler i&ccedil;in indirimler de bulmak m&uuml;mk&uuml;nd&uuml;r.</p>
<p>&nbsp;</p>
<h3>Heyecan Dolu Anlar</h3>
<p>Eşsiz manzaralar eşliğinde, kişisel bir u&ccedil;u? deneyimi yaşamak i&ccedil;in &Ouml;l&uuml;deniz Parasailing&rsquo;e katıl?n! Unutulmaz an?lar biriktirece?iniz bu aktivite, hem heyecan? hem de do?anın eşsiz g&uuml;zelliklerini bir arada sunuyor.</p>
<p>&nbsp;</p>
<p>Macera dolu bir g&uuml;n ge&ccedil;irmek i&ccedil;in ?imdi rezervasyon yap?n ve unutulmaz an?lar biriktirin! Sizi bekliyoruz!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '13' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '13' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Ölüdeniz, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '13' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- oludeniz-jet-ski-aktivitesi
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '14' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Ölüdeniz Jet Ski Aktivitesi',
    description = '<h2>&Ouml;l&uuml;deniz Jet Ski Aktivitesi</h2>
<p>10 Dakika : 4000 TL<br />15 Dakika : 4500 TL<br />30 Dakika : 6500 TL<br />60 Dakika : 15.000 TL</p>
<p>&nbsp;</p>
<p>&Ouml;l&uuml;deniz, T&uuml;rkiye''nin muhteşem doğal g&uuml;zellikleriyle &uuml;nl&uuml; bir tatil beldesidir ve jet ski gibi su sporlar? i&ccedil;in harika bir yerdir. Jet ski aktivitesi, hem adrenalin arayanlar hem de deniz &uuml;zerinde keyifli bir zaman ge&ccedil;irmek isteyenler i&ccedil;in m&uuml;kemmel bir se&ccedil;enektir.</p>
<p>&nbsp;</p>
<h3>&Ouml;l&uuml;deniz''de Jet Ski Deneyimi</h3>
<p>Eğlenceli ve Heyecan Verici: Jet ski, hız ve su &uuml;zerindeki manevra kabiliyetinizle birlikte harika bir heyecan sunar. D&uuml;zg&uuml;n bir deneyim i&ccedil;in genellikle k?sa bir eğitimin ard?ndan hemen deneye ba?layabilirsiniz.</p>
<p>&nbsp;</p>
<p><strong>G&uuml;zellikler E?li?inde:</strong> &Ouml;l&uuml;deniz''in eşsiz g&uuml;zelliklerini denizden g&ouml;rmek, harika bir manzara sunar. Mavi Lag&uuml;n ve etraf?ndaki doğal koylar jet ski yaparken mutlaka etkileyici bir arka plan sunar.</p>
<p>&nbsp;</p>
<p><strong>Kiralama Se&ccedil;enekleri:</strong> Genellikle saatlik ya da g&uuml;nl&uuml;k kiralama se&ccedil;enekleri bulunmaktad?r. Fiyatlar sezona g&ouml;re de?i?iklik g&ouml;sterebilir.</p>
<p>&nbsp;</p>
<p><strong>G&uuml;venlik &Ouml;nlemleri:</strong> Jet ski yaparken mutlaka can yele?i giymeniz ve g&uuml;venlik talimatlar?na uyman?z &ouml;nemlidir. Sulara dalmadan &ouml;nce, gerekli g&uuml;venlik &ouml;nlemlerini ald???n?zdan emin olun.</p>
<p>&nbsp;</p>
<p>Rehberli Turlar: ?sterseniz, rehberli jet ski turlar? da mevcuttur. Bu turlar, g&uuml;zel koylara ve gizli plajlara gitmenizi sa?layabilir.</p>
<p>&nbsp;</p>
<h3>Aktif Olmadan &Ouml;nce D&uuml;?&uuml;nmeniz Gerekenler</h3>
<p><strong>Deniz Durumu:</strong> Havanın ve deniz durumunun elveri?li oldu?undan emin olun.</p>
<p><strong>Kişisel Rahatl?k:</strong> Daha &ouml;nce jet ski deneyiminiz yoksa, ilk ba?ta rehberli bir tura katılmay? d&uuml;?&uuml;nebilirsiniz.</p>
<p><strong>Fiziksel Durum:</strong> Herkes i&ccedil;in uygun olmayabilir; sa?l?k durumunuza dikkat edin.</p>
<p>Jet ski aktivitesinin d???nda, &Ouml;l&uuml;deniz''de bir&ccedil;ok ba?ka su sporu da yapabilirsiniz; yelken, dalış veya su kaya?? gibi.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '14' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '14' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Ölüdeniz, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '14' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- kas-jeep-safari
UPDATE listings SET
  location_name = 'Kaş',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '15' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Kaş Jeep Safari',
    description = '<h2>Kaş ve Kalkan Başlangı&ccedil;l? Jeep Safari</h2>
<h3>Saklıkent Jeep Safari Turu: Yo?un Bir Macera</h3>
<p>Saklıkent Kanyonu, T&uuml;rkiye''nin en uzun kanyonu olarak &ouml;ne &ccedil;?kmakta ve Kaş''tan yap?lan jeep safari turlar?yla bu muhteşem doğal g&uuml;zelli?i keşfetmek i&ccedil;in harika bir fırsat sunmaktad?r. Saklıkent Jeep Safari, katılımcılara unutulmaz an?lar ve adrenalini dolu bir g&uuml;n vadediyor. ??te bu tur hakk?nda detayl? bilgiler:</p>
<p>&nbsp;</p>
<h3>Tur Program?nın Ana Hatlar?</h3>
<p>&nbsp;</p>
<h4>K&ouml;y Ziyareti ve ?kramlar</h4>
<p>Tura ba?lamadan &ouml;nce, yerel k&ouml;ylerde &ccedil;ay ikramlar? eşliğinde dinlenme fırsat? bulacaks?n?z. Ayr?ca, k&ouml;yde d&uuml;zenlenecek olan su sava??yla &ccedil;ocukluk an?lar?n? canland?rarak eğlenceli bir başlang?&ccedil; yapacaks?n?z.</p>
<p>&nbsp;</p>
<h4>Kanyon Y&uuml;r&uuml;y&uuml;?&uuml;</h4>
<p>Profesyonel rehber eşliğinde ger&ccedil;ekle?tirece?iniz kanyon y&uuml;r&uuml;y&uuml;?&uuml;nde, do?anın sundu?u benzersiz manzaralara tan?kl?k edeceksiniz. Saklıkent Kanyonu&rsquo;nun derinliklerinde, etkileyici kayal?k yap?lar?n ve serinletici akarsuların tad?n? &ccedil;ıkaracaks?n?z.</p>
<p>&nbsp;</p>
<h4>Bodyrafting Aktivitesi</h4>
<p>Adrenalin dolu bir macera i&ccedil;in kanala atlayarak bodyrafting yapabilirsiniz. Buz gibi kaynak sularında y&uuml;zmek, heyecan dolu anlar yaşaman?z? sa?layacak. Bu aktivite, do?anın sundu?u &ouml;zg&uuml;rl&uuml;?&uuml;n tad?n? &ccedil;ıkarman?z i&ccedil;in m&uuml;kemmel bir fırsat.</p>
<p>&nbsp;</p>
<h4>&Ouml;ğle Yemeği</h4>
<p>G&uuml;n&uuml;n ilerleyen saatlerinde &ouml;?le yemeği molas? verilecektir. Yerel lezzetlerle taze bir enerji depolad?ktan sonra, serin sularda eğlencenin devam? i&ccedil;in hazırlan?n.</p>
<p>&nbsp;</p>
<h4>Tubing (Funny Rafting)</h4>
<p>&Ouml;ğle yemeğinin ard?ndan isteyen katılımcılar, nehirde s&ouml;rf yapma imkan? bulacak. Tubing aktivitesi, suyun &uuml;zerinde kayarak keyifli dakikalar ge&ccedil;irmenizi sa?layacak.</p>
<p>&nbsp;</p>
<h4>Antik Kent Ziyareti</h4>
<p>Tura likya medeniyetinin ilk ba?kenti olan Xanthos antik kentini ziyaret etme fırsat? sunulacak. Burada tarihi kal?nt?lar aras?nda gezinerek, b&ouml;lgenin k&uuml;lt&uuml;rel miras?n? ke?fedeceksiniz. Ard?ndan, Patara antik ?ehrini gezip, Patara plaj?nda denizin tad?n? &ccedil;ıkarma fırsat?n?z olacak.</p>
<p>&nbsp;</p>
<h4>Kaputaş Plajı ve Geri D&ouml;n&uuml;?</h4>
<p>Turun son noktas?, T&uuml;rkiye&rsquo;nin en g&uuml;zel plajlar?ndan biri olan Kaputaş Plajı olacak. Burada g&uuml;ne?in bat???n? izleyerek, harika bir g&uuml;n&uuml;n ard?ndan Kaş&rsquo;a d&ouml;n&uuml;? yapacaks?n?z.</p>
<p>&nbsp;</p>
<h3>Heyecan Dolu Bir G&uuml;n</h3>
<p>Saklıkent Jeep Safari Turu, do?aseverler ve macera tutkunlar? i&ccedil;in m&uuml;kemmel bir deneyim sunmaktad?r. Farkl? aktiviteleri, ke?fe a&ccedil;?k do?as? ve eğlenceli atmosferi ile bu tur, unutulmaz an?lar biriktirmenizi sa?layacak. E?er heyecan verici bir g&uuml;n ge&ccedil;irmek istiyorsan?z, Saklıkent Jeep Safari tam size g&ouml;re!</p>
<h3>&nbsp;</h3>
<h3>&Uuml;crete Dahil Olanlar</h3>
<ul>
<li>Rehberlik hizmeti</li>
<li>&Ouml;ğle yemeği</li>
</ul>
<p>&nbsp;</p>
<h3>&Uuml;crete Dahil Olmayanlar</h3>
<ul>
<li>Kanyona giri?</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '15' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '15' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Kaş/Antalya, Türkiye',
  'district_label', 'Kaş',
  'city', 'Kaş'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '15' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- kas-scuba-diving
UPDATE listings SET
  location_name = 'Kaş',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '16' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Kaş Scuba Diving',
    description = '<h2>Kaş Scuba Diving: Akdeniz&rsquo;in Derinliklerine Yolculuk</h2>
<p>Kaş, T&uuml;rkiye''nin en g&uuml;zel sahil beldelerinden biri olarak, dalış meraklılar? i&ccedil;in adeta bir cennettir. Eşsiz deniz yaşam?, berrak mavi suları ve etkileyici su alt? manzaraları ile Kaş, hem başlang?&ccedil; seviyesindeki dalıcılar hem de profesyoneller i&ccedil;in unutulmaz bir deneyim sunmaktad?r.</p>
<p>&nbsp;</p>
<h3>Neden Kaş&rsquo;ta Dalış?</h3>
<p>Hamuluk Tabiat Park?: Y&uuml;zlerce tekne gezisi ve dalış noktas? ile &uuml;nl&uuml; Hamuluk Tabiat Park?, etkileyici mercan resifleri, renkli balık s&uuml;r&uuml;leri ve tarihi bat?klar ile doludur. Burada hem y&uuml;zme hem de dalış keyfi yaşayabilirsiniz.</p>
<p>&nbsp;</p>
<p>Zengin Deniz Ya?am?: Akdeniz&rsquo;in en &ccedil;eşitli deniz yaşam?na ev sahipli?i yapan Kaş&rsquo;ta, deniz kaplumba?alar?, farklı t&uuml;rde balıklar ve etkileyici su alt? flora ve faunas? ile karşılaşabilirsiniz.</p>
<p>&nbsp;</p>
<p>Bat?k Dalışlar?: Su alt?nda ke?fedilmeyi bekleyen tarihi bat?klar, dalıcılar i&ccedil;in eşsiz bir deneyim sunar. Kaş&rsquo;ta yer alan bat?k gemiler, dalış tutkunlar?nın ilgisini &ccedil;eken unutulmaz anlar yaşat?r.</p>
<p>&nbsp;</p>
<p>?klim ve Su S?cakl???: Yaz aylar?nda s?cakl?k ortalamas? 30&deg;C&rsquo;ye kadar &ccedil;ıkarken, su s?cakl??? ise 23-27&deg;C aras?ndad?r. Bu da dalış i&ccedil;in m&uuml;kemmel bir ortam sağlar.</p>
<p>&nbsp;</p>
<h3>Dalış Eğitimleri ve Turlar?</h3>
<p>Kaş&rsquo;ta, d&uuml;nya standartlar?nda eğitmenler eşliğinde &ccedil;eşitli dalış kursları sunulmaktad?r. PADI ve SSI sertifikal? programlarla, başlang?&ccedil; seviyesinden ileri seviyeye kadar dalış eğitimi alabilirsiniz. Eğitimler, teorik bilgiler ve pratik dalışlarla desteklenerek, katılımcılara g&uuml;venli bir dalış deneyimi sağlar.</p>
<p>&nbsp;</p>
<p>Dalış turlar?m?za katılmak i&ccedil;in &ouml;nceden rezervasyon yapt?rman?z &ouml;nerilir. Hafta i&ccedil;i ve hafta sonu grup veya &ouml;zel dalış turlar? d&uuml;zenliyoruz. Ekibimiz, her dalış noktas?nda size rehberlik edecek ve toplulu?umuzun g&uuml;venli?ini sa?layacakt?r.</p>
<p>&nbsp;</p>
<h3>&Uuml;crete Dahil Olanlar</h3>
<ul>
<li>Rehberlik hizmeti</li>
<li>&Ouml;ğle yemeği</li>
</ul>
<p>&nbsp;</p>
<h3>&Uuml;crete Dahil Olmayanlar</h3>
<ul>
<li>Fotoğraf ve video &ccedil;ekimi</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '16' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '16' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Kaş/Antalya, Türkiye',
  'district_label', 'Kaş',
  'city', 'Kaş'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '16' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- patara-atv-turu-quad-bike
UPDATE listings SET
  location_name = 'Kaş',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '17' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Patara ATV Turu (Quad Bike)',
    description = '<h2 style="text-align: justify;">Patara ATV Turu (Quad Bike)</h2>
<p style="text-align: justify;">Patara ATV Turu, muhteşem manzaralar eşliğinde heyecan dolu bir macera arayanlar i&ccedil;in m&uuml;kemmel bir se&ccedil;enektir.&nbsp;</p>
<p style="text-align: justify;">Tur ba?lamadan &ouml;nce, katılımcılar g&uuml;venli kullan?m s&ouml;zle?mesini imzalad?ktan sonra, rehber eşliğinde ATV&rsquo;lerin tan?t?m? yapılır. Başlangı&ccedil; parkurunda k?sa bir deneme s&uuml;r&uuml;?&uuml; yapt?ktan sonra, as?l parkura ge&ccedil;ilir. Bu parkur, yaklaşık iki saat s&uuml;ren, b&uuml;y&uuml;leyici Patara Ulusal Park?&rsquo;nın &ccedil;ay a?z? mevkisine do?ru ilerler. Tura katılacaklar kum, toprak ve plaj parkurlar?nda heyecan verici bir s&uuml;r&uuml;? deneyimi yaşayacaklar. Ancak hız ve yar?? parkurlar?nın d???ndaki alanlarda hız limitleri uygulanmaktad?r.</p>
<p style="text-align: justify;">&nbsp;</p>
<p style="text-align: justify;">Turun ard?ndan katılımcılar, &ccedil;iftli?e d&ouml;n&uuml;? yaparak Kalkan Aktivite ofisine geri g&ouml;t&uuml;r&uuml;l&uuml;rler. Unutulmamas? gereken &ouml;nemli bir detay, yaz sezonunda ATV Turu başlang?&ccedil; saatlerinin s?cak havalara bağlı olarak de?i?ebilece?idir.</p>
<p style="text-align: justify;">&nbsp;</p>
<h3 style="text-align: justify;">Dikkat Edilmesi Gerekenler:</h3>
<p style="text-align: justify;"><strong>Ya? K?s?tlamalar?:</strong> 6 ya? alt?ndaki &ccedil;ocuklar i&ccedil;in uygun de?ildir. 16 ya??ndan k&uuml;&ccedil;&uuml;kler kendi ATV&rsquo;lerini kullanamazlar; ancak 12-16 ya? aras?ndaki misafirler, bir yeti?kinle birlikte rehberin belirledi?i parkurlarda ATV kullanabilirler.</p>
<p style="text-align: justify;"><strong>Sa?l?k Durumu:</strong> Bel ve s?rt a?r?s?, tansiyon hastal??? gibi rahats?zl?klar? olanlar?n bu turu yapmamalar? &ouml;nerilmektedir.</p>
<p style="text-align: justify;"><strong>G&uuml;venlik:</strong> Hızl? ve tehlikeli kullan?m kesinlikle yasakt?r; rehberin bu kurallara uymayan katılımcılar? turdan &ccedil;ıkarma yetkisi bulunmaktad?r.</p>
<p style="text-align: justify;"><strong>?ptal Politikas?:</strong> Turu en az 24 saat &ouml;ncesinde iptal ederseniz para iadesi yap?lmakta; ayn? g&uuml;n yap?lan iptallerde ise geri &ouml;deme yap?lmamaktad?r.</p>
<p style="text-align: justify;">&nbsp;</p>
<h3 style="text-align: justify;">Tavsiyeler:</h3>
<ul style="text-align: justify;">
<li>Rahat giysiler, yani k?sa ?ort, ti?&ouml;rt ve terlik bu tur i&ccedil;in uygundur.</li>
<li>Toz sebebiyle g&uuml;ne? g&ouml;zl&uuml;?&uuml; getirilmesi &ouml;nerilir.</li>
<li>G&uuml;ne? kremi kullan?m? tavsiye edilmektedir.</li>
</ul>
<p style="text-align: justify;">&nbsp;</p>
<p style="text-align: justify;">Kalkan ATV Turu, macera arayanlar i&ccedil;in benzersiz bir deneyim sunmakta ve doğal g&uuml;zellikler i&ccedil;inde heyecan dolu anlar yaşatmaktad?r. E?er do?ayla i&ccedil; i&ccedil;e, adrenalini y&uuml;ksek bir aktivite ar?yorsan?z, bu tur tam size g&ouml;re!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '17' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '17' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Patara Plajı, Gelemiş, Kaş/Antalya, Türkiye',
  'district_label', 'Kaş',
  'city', 'Kaş'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '17' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- patara-at-turu
UPDATE listings SET
  location_name = 'Kaş',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '18' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Patara At Turu',
    description = '<h2>Patara At Turu</h2>
<p>Bu at turu program?, Patara''nın g&uuml;zel do?as?nda ve tarihi alanlar?nda keyifli bir deneyim sunuyor gibi g&ouml;r&uuml;n&uuml;yor. ??te verdi?iniz bilgilere dayanarak tur hakk?nda baz? &ouml;nemli noktalar ve &ouml;neriler:</p>
<p>&nbsp;</p>
<h3>Tur Bilgileri</h3>
<p>Seanslar: G&uuml;nde &uuml;&ccedil; kez yap?lmaktad?r.</p>
<p>Sabah 09:00-11:00 aras?, &ouml;?leden sonra 15:30-17:30 aras? ve g&uuml;n bat?m? turu 18.30''da ger&ccedil;ekle?tiriliyor.</p>
<p>Ula??m: 15 dakikal?k bir yolculukla Patara Gelemiş k&ouml;y&uuml;ndeki at &ccedil;iftli?ine gidilir, dilerse direkt &ccedil;iftlikte bulu?ulabilir.</p>
<p>Tur S&uuml;resi: Yakla??k 2 saat s&uuml;r&uuml;yor, Patara antik kenti ve plaj &ccedil;evresinde yap?l?yor.</p>
<p>Deniz Aktiviteleri: Tecr&uuml;beli katılımcılar atlar?yla denize girebilir veya ko?turabilir, acemiler plaj boyunca rehberle birlikte ilerler.</p>
<p>&nbsp;</p>
<h3>Kat?labilecekler</h3>
<ul>
<li>Ya? S?n?rlamas?: 7 ya? alt? i&ccedil;in uygun de?ildir; onlara daha sakin bir alan sunulmaktad?r.</li>
<li>Sa?l?k Durumu: Bel, s?rt, tansiyon gibi kronik rahats?zl?klar? olan katılımcılar i&ccedil;in uygun de?ildir.</li>
</ul>
<p>&nbsp;</p>
<h3>Dikkat Edilmesi Gerekenler</h3>
<ul>
<li>Giyim: ?ort, ti?&ouml;rt ve terlik uygun, ancak uzun pantolon ve sa?lam ayakkab? daha iyi bir deneyim sunar.</li>
<li>G&uuml;ne? Koruma: ?apka, g&uuml;ne? g&ouml;zl&uuml;?&uuml; ve g&uuml;ne? kremi getirilmesi &ouml;nerilmektedir.</li>
<li>At Kontrol&uuml;: Acemilerin atlar?n? birinin tutarak y&uuml;r&uuml;tmesini istiyorlarsa, &ouml;nceden haber vermeleri gerekir (&uuml;cretli).</li>
</ul>
<p>&nbsp;</p>
<h3>Ekstra Bilgiler</h3>
<p>Bu tur, do?a ile i&ccedil; i&ccedil;e olabilece?iniz, tarihi yerleri ke?fedebilece?iniz ve atlarla keyifli vakit ge&ccedil;irebilece?iniz harika bir fırsat sunuyor.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '18' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '18' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Patara Plajı, Gelemiş, Kaş/Antalya, Türkiye',
  'district_label', 'Kaş',
  'city', 'Kaş'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '18' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- windsurf-baslangic
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '19' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Windsurf - Başlangıç',
    description = '<h2>Windsurf - Başlangı&ccedil; Seviyesi</h2>
<h3>Temel S&ouml;rf Kursları (3 Ders)</h3>
<p><strong>A &ndash; Teori</strong></p>
<p>Yakla??k 1 saatlik plajda teorik eğitim:</p>
<ul>
<li>R&uuml;zgar bilgisi</li>
<li>Malzeme bilgisi</li>
<li>G&uuml;venlik kurallar?</li>
<li>&Ccedil;evre bilinci</li>
</ul>
<p>&nbsp;</p>
<p><strong>B &ndash; Sim&uuml;lat&ouml;r Eğitimi</strong></p>
<p>Sim&uuml;lat&ouml;r, plajda bir board &uuml;zerine ger&ccedil;ek yelken tak?larak olu?turulur. Karada ve denizde gerekli bilgiler, sim&uuml;lat&ouml;rde g&ouml;sterilir:</p>
<ul>
<li>Boarda nasıl &ccedil;?k?l?r</li>
<li>Board &uuml;zerinde nasıl ve nerede ayakta durulur</li>
<li>Yelken sudan nasıl &ccedil;ıkar?l?r</li>
<li>Başlangı&ccedil; pozisyonu ve yelkene r&uuml;zgar doldurma</li>
<li>Y&ouml;nlendirme teknikleri</li>
<li>R&uuml;zgar &uuml;st&uuml; d&ouml;n&uuml;?ler</li>
</ul>
<p>&nbsp;</p>
<h3>C &ndash; Su &Uuml;st&uuml; S&ouml;rf Eğitimi</h3>
<p>Teori ve sim&uuml;lat&ouml;r eğitimlerinin denizde pratik uygulamas?. Her g&uuml;n saat 18:00&rsquo;de yaklaşık 1 saatlik teorik ve sim&uuml;lat&ouml;r dersleri yapılır; ard?ndan ertesi sabah saat 9:00-12:00 aras?nda pratik s&ouml;rf eğitimi ger&ccedil;ekle?tirilmektedir. ?lk temel kursu tamamlayan &ouml;?renciler, eğitim malzemesi kiralayabilirler.</p>
<p>&nbsp;</p>
<h3>VDWS (Alman S&ouml;rf ve Su Sporlar? Federasyonu) Uluslararas? Temel R&uuml;zgar S&ouml;rf&uuml; Lisans Kursu</h3>
<p>Okulumuz VDWS &uuml;yesidir ve eğitimcilerimiz VDWS temel r&uuml;zgar s&ouml;rf&uuml; lisans? vermeye yetkilidir. &Ouml;ğrencilerin 10 saatlik derslerin ard?ndan teori ve pratik s?navlar?nda ba?ar?l? olmas? gerekmektedir. Dersler kapsam?nda malzeme ve r&uuml;zgar bilgisi, d&ouml;n&uuml;?ler, yol verme kurallar?, yelken kurma ve ta??ma gibi konular ile yaz?l? s?nav yapılır.</p>
<p>&nbsp;</p>
<h3>Orta ve ?leri Seviye S&ouml;rf Kursları</h3>
<ul>
<li>Plajdan Başlangı&ccedil; (Beachstart): Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
<li>Denizden Başlangı&ccedil; (Waterstart): Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
<li>R&uuml;zgaralt? ve R&uuml;zgar &Uuml;st&uuml; D&ouml;n&uuml;?ler: Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '19' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '19' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '19' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- windsurf-profesyonel
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '20' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Windsurf - Profesyonel',
    description = '<h2>Windsurf - Profesyonel Seviyesi</h2>
<h3>Temel S&ouml;rf Kursları (3 Ders)</h3>
<p><strong>A &ndash; Teori</strong></p>
<p>Yakla??k 1 saatlik plajda teorik eğitim:</p>
<ul>
<li>R&uuml;zgar bilgisi</li>
<li>Malzeme bilgisi</li>
<li>G&uuml;venlik kurallar?</li>
<li>&Ccedil;evre bilinci</li>
</ul>
<p>&nbsp;</p>
<p><strong>B &ndash; Sim&uuml;lat&ouml;r Eğitimi</strong></p>
<p>Sim&uuml;lat&ouml;r, plajda bir board &uuml;zerine ger&ccedil;ek yelken tak?larak olu?turulur. Karada ve denizde gerekli bilgiler, sim&uuml;lat&ouml;rde g&ouml;sterilir:</p>
<ul>
<li>Boarda nasıl &ccedil;?k?l?r</li>
<li>Board &uuml;zerinde nasıl ve nerede ayakta durulur</li>
<li>Yelken sudan nasıl &ccedil;ıkar?l?r</li>
<li>Başlangı&ccedil; pozisyonu ve yelkene r&uuml;zgar doldurma</li>
<li>Y&ouml;nlendirme teknikleri</li>
<li>R&uuml;zgar &uuml;st&uuml; d&ouml;n&uuml;?ler</li>
</ul>
<p>&nbsp;</p>
<h3>C &ndash; Su &Uuml;st&uuml; S&ouml;rf Eğitimi</h3>
<p>Teori ve sim&uuml;lat&ouml;r eğitimlerinin denizde pratik uygulamas?. Her g&uuml;n saat 18:00&rsquo;de yaklaşık 1 saatlik teorik ve sim&uuml;lat&ouml;r dersleri yapılır; ard?ndan ertesi sabah saat 9:00-12:00 aras?nda pratik s&ouml;rf eğitimi ger&ccedil;ekle?tirilmektedir. ?lk temel kursu tamamlayan &ouml;?renciler, eğitim malzemesi kiralayabilirler.</p>
<p>&nbsp;</p>
<h3>VDWS (Alman S&ouml;rf ve Su Sporlar? Federasyonu) Uluslararas? Temel R&uuml;zgar S&ouml;rf&uuml; Lisans Kursu</h3>
<p>Okulumuz VDWS &uuml;yesidir ve eğitimcilerimiz VDWS temel r&uuml;zgar s&ouml;rf&uuml; lisans? vermeye yetkilidir. &Ouml;ğrencilerin 10 saatlik derslerin ard?ndan teori ve pratik s?navlar?nda ba?ar?l? olmas? gerekmektedir. Dersler kapsam?nda malzeme ve r&uuml;zgar bilgisi, d&ouml;n&uuml;?ler, yol verme kurallar?, yelken kurma ve ta??ma gibi konular ile yaz?l? s?nav yapılır.</p>
<p>&nbsp;</p>
<h3>Orta ve ?leri Seviye S&ouml;rf Kursları</h3>
<ul>
<li>Plajdan Başlangı&ccedil; (Beachstart): Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
<li>Denizden Başlangı&ccedil; (Waterstart): Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
<li>R&uuml;zgaralt? ve R&uuml;zgar &Uuml;st&uuml; D&ouml;n&uuml;?ler: Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '20' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '20' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '20' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- windsurf-wgitim
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '21' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Windsurf - Eğitim',
    description = '<h2>Windsurf - Eğitim</h2>
<h3>Temel S&ouml;rf Kursları (3 Ders)</h3>
<p><strong>A &ndash; Teori</strong></p>
<p>Yakla??k 1 saatlik plajda teorik eğitim:</p>
<ul>
<li>R&uuml;zgar bilgisi</li>
<li>Malzeme bilgisi</li>
<li>G&uuml;venlik kurallar?</li>
<li>&Ccedil;evre bilinci</li>
</ul>
<p>&nbsp;</p>
<p><strong>B &ndash; Sim&uuml;lat&ouml;r Eğitimi</strong></p>
<p>Sim&uuml;lat&ouml;r, plajda bir board &uuml;zerine ger&ccedil;ek yelken tak?larak olu?turulur. Karada ve denizde gerekli bilgiler, sim&uuml;lat&ouml;rde g&ouml;sterilir:</p>
<ul>
<li>Boarda nasıl &ccedil;?k?l?r</li>
<li>Board &uuml;zerinde nasıl ve nerede ayakta durulur</li>
<li>Yelken sudan nasıl &ccedil;ıkar?l?r</li>
<li>Başlangı&ccedil; pozisyonu ve yelkene r&uuml;zgar doldurma</li>
<li>Y&ouml;nlendirme teknikleri</li>
<li>R&uuml;zgar &uuml;st&uuml; d&ouml;n&uuml;?ler</li>
</ul>
<p>&nbsp;</p>
<h3>C &ndash; Su &Uuml;st&uuml; S&ouml;rf Eğitimi</h3>
<p>Teori ve sim&uuml;lat&ouml;r eğitimlerinin denizde pratik uygulamas?. Her g&uuml;n saat 18:00&rsquo;de yaklaşık 1 saatlik teorik ve sim&uuml;lat&ouml;r dersleri yapılır; ard?ndan ertesi sabah saat 9:00-12:00 aras?nda pratik s&ouml;rf eğitimi ger&ccedil;ekle?tirilmektedir. ?lk temel kursu tamamlayan &ouml;?renciler, eğitim malzemesi kiralayabilirler.</p>
<p>&nbsp;</p>
<h3>VDWS (Alman S&ouml;rf ve Su Sporlar? Federasyonu) Uluslararas? Temel R&uuml;zgar S&ouml;rf&uuml; Lisans Kursu</h3>
<p>Okulumuz VDWS &uuml;yesidir ve eğitimcilerimiz VDWS temel r&uuml;zgar s&ouml;rf&uuml; lisans? vermeye yetkilidir. &Ouml;ğrencilerin 10 saatlik derslerin ard?ndan teori ve pratik s?navlar?nda ba?ar?l? olmas? gerekmektedir. Dersler kapsam?nda malzeme ve r&uuml;zgar bilgisi, d&ouml;n&uuml;?ler, yol verme kurallar?, yelken kurma ve ta??ma gibi konular ile yaz?l? s?nav yapılır.</p>
<p>&nbsp;</p>
<h3>Orta ve ?leri Seviye S&ouml;rf Kursları</h3>
<ul>
<li>Plajdan Başlangı&ccedil; (Beachstart): Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
<li>Denizden Başlangı&ccedil; (Waterstart): Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
<li>R&uuml;zgaralt? ve R&uuml;zgar &Uuml;st&uuml; D&ouml;n&uuml;?ler: Teori, sim&uuml;lat&ouml;r ve suda pratik</li>
</ul>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '21' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '21' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '21' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- kitesurf
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '22' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Kitesurf',
    description = '<h2>Kitesurf</h2>
<h3>Kitesurf Nedir? Adrenalin Tutkunlar?nın Favori Sporu</h3>
<p>Kitesurf, r&uuml;zgar?n g&uuml;c&uuml;nden faydalanarak u&ccedil;urtmay? kontrol etti?iniz ve board ile suyun &uuml;zerinde kayd???n?z heyecan verici bir su sporudur. Elinizdeki bar sayesinde u&ccedil;urtmay? y&ouml;nlendirerek, suyla bulu?tu?unuz bu spor, adrenalin severler i&ccedil;in vazge&ccedil;ilmezdir. Fethiye&rsquo;de genellikle Nisan ve Ekim aylar? aras?nda tercih edilen kitesurf sezonu, yaz aylar?nda hava s?cakl??? nedeniyle daha uygundur.</p>
<p>&nbsp;</p>
<h3>Fethiye&rsquo;de Kitesurf Olanaklar? ve Malzeme Temini</h3>
<p>Fethiye&rsquo;de kitesurf yapmak i&ccedil;in gereken malzemeleri okulumuzdan temin edebilirsiniz. S&ouml;rf elbisesi sezon ba??nda kullan?labilir; di?er aylarda hava s?cak oldu?u i&ccedil;in elbise kullan?m? &ccedil;ok gerekli de?ildir. Ayr?ca, her seviyeye uygun ekipman ve ekipmanlar farklı ebatlarda mevcuttur.</p>
<p>&nbsp;</p>
<h3>Kitesurf Eğitimi ve Kurslar</h3>
<p>Yeni başlayanlar i&ccedil;in mutlaka eğitim almak ?artt?r. Kitesurf eğitimleri en az 8 saat olup, 4 saat karada ve 4 saat sudan olmak &uuml;zere iki a?amada yapılır. Eğitimin ilk k?sm? k&uuml;&ccedil;&uuml;k u&ccedil;urtmalarla ba?lar ve farklı ebatlarda u&ccedil;urtmalar kullan?l?r. &Ouml;ğrencilerin yetene?ine bağlı olarak, eğitimlerde farklı seviyeler bulunur.</p>
<p>&nbsp;</p>
<p>4 Saatlik Kara Eğitimi: D&uuml;?&uuml;k r&uuml;zgarda kite u&ccedil;urma, d&ouml;rt ipli kite kurulumu, kite havaland?rma, kontrol, g&uuml;&ccedil; elde etme, tek el ile kontrol ve kite indirme gibi temel beceriler kazan?l?r.</p>
<p>D&uuml;nyada ve Derin Sularnde Eğitimler: Tekne ile derin su ko?ullar?nda eğitim al?nabilir. Bu eğitimlerde, bordsuz kite kontrol&uuml;, g&uuml;&ccedil; kullanarak kendini s&uuml;r&uuml;kleme, bordu ayaklar?na takma, sudan kalk?? ve seyir konular? &ouml;?retilir.</p>
<h3>&nbsp;</h3>
<h3>Eğitim ve Seviye ?lerlemesi</h3>
<p>Daha &ouml;nce herhangi bir eğitim almam?? veya tamamlayamam?? &ouml;?rencilere, &ouml;zel ders se&ccedil;ene?i sunulmaktad?r. 8 saatlik temel eğitim yeterli de?ilse, daha fazla seans alabilirsiniz. ?leri seviye dersler ve uzmanl?k eğitimleri de mevcuttur. Bu sayede, Her su ko?ulunda g&uuml;venle kitesurf yapabilirsiniz.</p>
<p>&nbsp;</p>
<h3>R&uuml;zgar ve En Uygun Zamanlar</h3>
<p>Fethiye&rsquo;de r&uuml;zgar genellikle saat 11:00 civar?nda ba?lar ve ak?am saat 16:00-17:00 civar?nda yava?lar. G&uuml;n&uuml;n&uuml;z&uuml; de?erlendirmek ve g&uuml;n&uuml;birlik turlar ile Akyaka, Patara gibi b&ouml;lgelerde kite yapmak i&ccedil;in ideal zamanlar vard?r.</p>
<p>&nbsp;</p>
<h3>Daha fazla bilgi ve rezervasyon</h3>
<p>Daha detayl? bilgi almak veya kurslara ba?vurmak i&ccedil;in bizimle ileti?ime ge&ccedil;ebilirsiniz. Kitesurf, hem g&uuml;venli hem de eğlenceli bir spor olup, do?ru eğitimle kendinizi geli?tirebilirsiniz.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '22' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '22' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '22' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- kitesurf-egitim
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '23' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Kitesurf - Eğitim',
    description = '<h2>Kitesurf - Eğitim</h2>
<h3>Kitesurf Nedir? Adrenalin Tutkunlar?nın Favori Sporu</h3>
<p>Kitesurf, r&uuml;zgar?n g&uuml;c&uuml;nden faydalanarak u&ccedil;urtmay? kontrol etti?iniz ve board ile suyun &uuml;zerinde kayd???n?z heyecan verici bir su sporudur. Elinizdeki bar sayesinde u&ccedil;urtmay? y&ouml;nlendirerek, suyla bulu?tu?unuz bu spor, adrenalin severler i&ccedil;in vazge&ccedil;ilmezdir. Fethiye&rsquo;de genellikle Nisan ve Ekim aylar? aras?nda tercih edilen kitesurf sezonu, yaz aylar?nda hava s?cakl??? nedeniyle daha uygundur.</p>
<p>&nbsp;</p>
<h3>Fethiye&rsquo;de Kitesurf Olanaklar? ve Malzeme Temini</h3>
<p>Fethiye&rsquo;de kitesurf yapmak i&ccedil;in gereken malzemeleri okulumuzdan temin edebilirsiniz. S&ouml;rf elbisesi sezon ba??nda kullan?labilir; di?er aylarda hava s?cak oldu?u i&ccedil;in elbise kullan?m? &ccedil;ok gerekli de?ildir. Ayr?ca, her seviyeye uygun ekipman ve ekipmanlar farklı ebatlarda mevcuttur.</p>
<p>&nbsp;</p>
<h3>Kitesurf Eğitimi ve Kurslar</h3>
<p>Yeni başlayanlar i&ccedil;in mutlaka eğitim almak ?artt?r. Kitesurf eğitimleri en az 8 saat olup, 4 saat karada ve 4 saat sudan olmak &uuml;zere iki a?amada yapılır. Eğitimin ilk k?sm? k&uuml;&ccedil;&uuml;k u&ccedil;urtmalarla ba?lar ve farklı ebatlarda u&ccedil;urtmalar kullan?l?r. &Ouml;ğrencilerin yetene?ine bağlı olarak, eğitimlerde farklı seviyeler bulunur.</p>
<p>&nbsp;</p>
<p>4 Saatlik Kara Eğitimi: D&uuml;?&uuml;k r&uuml;zgarda kite u&ccedil;urma, d&ouml;rt ipli kite kurulumu, kite havaland?rma, kontrol, g&uuml;&ccedil; elde etme, tek el ile kontrol ve kite indirme gibi temel beceriler kazan?l?r.</p>
<p>D&uuml;nyada ve Derin Sularnde Eğitimler: Tekne ile derin su ko?ullar?nda eğitim al?nabilir. Bu eğitimlerde, bordsuz kite kontrol&uuml;, g&uuml;&ccedil; kullanarak kendini s&uuml;r&uuml;kleme, bordu ayaklar?na takma, sudan kalk?? ve seyir konular? &ouml;?retilir.</p>
<h3>&nbsp;</h3>
<h3>Eğitim ve Seviye ?lerlemesi</h3>
<p>Daha &ouml;nce herhangi bir eğitim almam?? veya tamamlayamam?? &ouml;?rencilere, &ouml;zel ders se&ccedil;ene?i sunulmaktad?r. 8 saatlik temel eğitim yeterli de?ilse, daha fazla seans alabilirsiniz. ?leri seviye dersler ve uzmanl?k eğitimleri de mevcuttur. Bu sayede, Her su ko?ulunda g&uuml;venle kitesurf yapabilirsiniz.</p>
<p>&nbsp;</p>
<h3>R&uuml;zgar ve En Uygun Zamanlar</h3>
<p>Fethiye&rsquo;de r&uuml;zgar genellikle saat 11:00 civar?nda ba?lar ve ak?am saat 16:00-17:00 civar?nda yava?lar. G&uuml;n&uuml;n&uuml;z&uuml; de?erlendirmek ve g&uuml;n&uuml;birlik turlar ile Akyaka, Patara gibi b&ouml;lgelerde kite yapmak i&ccedil;in ideal zamanlar vard?r.</p>
<p>&nbsp;</p>
<h3>Daha fazla bilgi ve rezervasyon</h3>
<p>Daha detayl? bilgi almak veya kurslara ba?vurmak i&ccedil;in bizimle ileti?ime ge&ccedil;ebilirsiniz. Kitesurf, hem g&uuml;venli hem de eğlenceli bir spor olup, do?ru eğitimle kendinizi geli?tirebilirsiniz.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '23' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '23' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '23' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- wakeboard
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '24' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Wakeboard',
    description = '<h2>Wakeboard</h2>
<h3>Wakeboard Nedir? Wakeboard Nasıl Yapılır?</h3>
<p>Wakeboard, dengede durmay?, dalgalarla yar??may? ve tutunmay? gerektiren heyecan verici bir su sporudur. Bu spor, v&uuml;cut kaslar?n?z? aktif kullanman?z? sağlar ve denge odakl? bir spor oldu?u i&ccedil;in &ouml;zellikle denge ve g&uuml;&ccedil; geli?tirmek isteyenler i&ccedil;in idealdir.</p>
<p>&nbsp;</p>
<h3>Wakeboard Nasıl Yapılır?</h3>
<p>Wakeboard yaparken dengede durmak, dalgalara kar?? yar??mak ve ipe tutunarak &ccedil;ekilmeye devam etmek temel unsurlard?r. Bu sayede:</p>
<p>&nbsp;</p>
<ul>
<li>Denge kaslar?n?z aktif ?ekilde &ccedil;al???r.</li>
<li>V&uuml;cudunuzun her noktas?n? kullan?rs?n?z.</li>
<li>Denizin &uuml;zerinde dakikalar boyunca hakimiyet kurars?n?z.</li>
</ul>
<p>?lk denemenizde temel amac? do?ru dengede durmak ve tutunmay? &ouml;?renmek olmal?d?r. Bu temel sizi ilerletirip, k?sa s&uuml;rede daha ileri seviyelere ula?man?za yard?mc? olur.</p>
<p>&nbsp;</p>
<h3>Wakeboard&rsquo;da Ustala?mak</h3>
<p>Kayd?k&ccedil;a &ouml;zg&uuml;veniniz artar ve daha zor hareketleri deneyimleyebilirsiniz. Zamanla, kendinizi daha g&uuml;vende hissederek, &ccedil;ok daha &uuml;st seviyelere ula?abilirsiniz. Yeter ki istekli olun ve pratik yap?n.</p>
<p>&nbsp;</p>
<p>Unutmay?n, kar??n?zda hi&ccedil;bir engel kalmayacak ve kendinizi limitlerinizi zorlayarak denizin hakimi haline getirebilirsiniz.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '24' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '24' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '24' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- wake-surf
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '25' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Wake Surf',
    description = '<h2>Wake Surf</h2>
<h3>Wakesurf Nedir? Su S&uuml;rme Keyfini Ke?fedin!</h3>
<p>Wakesurf, suyun &uuml;zerinde s&uuml;r&uuml;klenerek ve teknenin arkas?ndaki dalgalar? kullanarak denge &uuml;zerinde durma sanat?d?r. Heyecan verici ve eğlenceli bir su sporu olan wakesurf, su &uuml;st&uuml;nde &ouml;zg&uuml;rce s&uuml;z&uuml;lme ve dalga &uuml;zerinde dans etme deneyimi sunar. Bu spor, hem yeni başlayanlar hem de deneyimli surf&ccedil;&uuml;ler i&ccedil;in uygun olup, suyun &uuml;st&uuml;nde keyifli vakit ge&ccedil;irmek isteyenlerin ilgisini &ccedil;eker.</p>
<p>&nbsp;</p>
<h3>Fethiye Water Sports ile Wakesurf Eğitimi</h3>
<p>Fethiye Water Sports olarak, profesyonel eğitmenler eşliğinde her seviyeden wakesurf tutkununa &ouml;zel dersler sunuyoruz. ?ster yeni başlayan olun, ister deneyimli bir surf&ccedil;&uuml;, programlar?m?zla suyun &uuml;st&uuml;nde &ouml;zg&uuml;rl&uuml;?&uuml; ve eğlenceyi keşfetmenizi sa?l?yoruz.</p>
<p>&nbsp;</p>
<h3>Neden Wakesurf?</h3>
<p>Teknenin yaratm?? oldu?u dalgalarla su &uuml;zerinde serbest&ccedil;e s&uuml;z&uuml;lme imkan?</p>
<p>Dalgalar &uuml;zerinde dans etme ve hareket &ouml;zg&uuml;rl&uuml;?&uuml;</p>
<p>Her ya? ve seviyeye uygun eğitimler</p>
<p>G&uuml;venli ve profesyonel ekipmanlar ile eğitim</p>
<p>Gel, Dalga &Uuml;zerinde Dans Etmenin Tad?n? &Ccedil;?kar!</p>
<p>Suyun &uuml;zerinde ba?ar?l? ve eğlenceli bir deneyim yaşamak istiyorsan?z, bizimle wakesurf yapmaya ba?lay?n. Profesyonel ekibimiz ve &ouml;zel eğitimlerimizle, suyun &uuml;st&uuml;nde kendinizi &ouml;zg&uuml;r hissedecek ve bu keyfi doyas?ya yaşayacaks?n?z.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '25' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '25' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '25' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- water-ski
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '26' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Water Ski',
    description = '<h2>Water Ski</h2>
<h3>Su Kaya?? Nasıl Yapılır? Keyifli ve Eğlenceli Bir Su Sporudur</h3>
<p>Su kaya??, temel olarak bildi?imiz kayak konseptiyle ayn?d?r. Ancak kar veya buz yerine, suyun &uuml;zerinde kayarken platformlar ayaklar?n?zda bulunur. Bu heyecan verici spor, denge kaslar?n?z? aktif kullanarak, deniz &uuml;zerinde ku?ular gibi s&uuml;z&uuml;lmenizi sağlar.</p>
<p>&nbsp;</p>
<h3>Su Kaya?? Nasıl Yapılır?</h3>
<p>Su kaya??nın &ccedil;al??ma prensibi olduk&ccedil;a basittir. ??te ad?m ad?m su kaya?? yapma s&uuml;reci:</p>
<p>&nbsp;</p>
<p>Platformlar? Tak?n: Ayaklar?n?za iki adet platform takars?n?z. Bu platformlar, kar veya buz de?il, su &uuml;zerinde kayman?za yard?mc? olur.</p>
<p>?pi Tutun: S&uuml;rat motoruna bağlı olan ipi tutarak, dayan?kl?l???n?z? korur ve denge sağlars?n?z.</p>
<p>Denge Kurma: Dengenizi sa?layarak, deniz &uuml;zerinde doğal bir ?ekilde ku?ular gibi s&uuml;z&uuml;lmeye ba?lars?n?z.</p>
<p>S&uuml;r&uuml;?: ??te bu kadar! Su kaya??nda &ouml;nemli olan, do?ru dengeyi kurmak ve keyfini &ccedil;ıkarmakt?r.</p>
<p>&nbsp;</p>
<h3>Neden Su Kaya???</h3>
<ul>
<li>G&uuml;zel bir deniz, mavi g&ouml;ky&uuml;z&uuml; ve k?y?ya selam duran kumsal ile &ccedil;evrili bir ortamda yapılır.</li>
<li>Deniz &uuml;zerinde ustal?kla kayarak, do?anın tad?n? &ccedil;ıkar?rs?n?z.</li>
<li>Her seviyeye uygun eğitimlerimiz sayesinde, yeni başlayanlar da k?sa s&uuml;rede ba?ar?l? olur.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Su kaya??n? yaparken, hem denge geli?ir hem de deniz ve do?anın g&uuml;zelliklerini yak?ndan keşfetmi? olursunuz. Eğlence ve adrenalini bir arada yaşamak i&ccedil;in bizimle su kaya?? yapmaya davetlisiniz!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '26' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '26' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '26' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- parasaling
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '27' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Parasaling',
    description = '<h2>Parasaling</h2>
<h3>Parasailing Nedir? Fethiye&rsquo;de Unutulmaz U&ccedil;u? Deneyimi</h3>
<p>Parasailing, &ouml;nceden herhangi bir eğitim veya &ccedil;aba gerektirmeden, herkesin rahatl?kla yapabilece?i adrenalin dolu bir su sporudur. ?ster tek ba??n?za u&ccedil;abilirsiniz, isterseniz e?iniz, arkadaşlar?n?z ya da &ccedil;ocuklar?n?zla birlikte bu eşsiz deneyimi yaşayabilirsiniz.</p>
<p>&nbsp;</p>
<h3>Parasailing Nasıl Yapılır?</h3>
<p>Tekneye Bağlı U&ccedil;u?: Parasailing, tekneye bağlı bir ipin yard?m?yla ger&ccedil;ekle?ir. Teknenin hızla ilerlemesiyle, r&uuml;zgar g&uuml;c&uuml;yle havalan?rs?n?z.</p>
<p>Y&uuml;kseklik: Yakla??k 300 metre y&uuml;ksekli?e kadar &ccedil;?kabilirsiniz.</p>
<p>Ekipman ve G&uuml;venlik: Can yele?i ve di?er g&uuml;venlik ekipmanlar?, eğitmenlerimiz tarafından sa?lan?r ve giydirilir. Sizin yapman?z gereken tek ?ey, muhteşem Fethiye &Ccedil;alış Plajı, ?&ouml;valye Adas? ve Ku? Cenneti manzaras?nın tad?n? &ccedil;ıkarmakt?r.</p>
<p>&nbsp;</p>
<h3>Ekstra Hizmetler</h3>
<p>U&ccedil;u? sonras?, heyecan dolu anlar?n?z? &ouml;l&uuml;ms&uuml;zle?tirmek i&ccedil;in profesyonel fotoğraf ve videolar?n?z? alabilirsiniz. Bu unutulmaz an?lar? &ouml;m&uuml;r boyu saklayabilirsiniz.</p>
<p>&nbsp;</p>
<h3>Neden Parasailing?</h3>
<ul>
<li>G&uuml;venli ve kolayd?r, &ouml;nceden eğitime gerek yoktur.</li>
<li>Aile, arkadaş veya sevgilinizle birlikte keyifli vakit ge&ccedil;irme imkan?.</li>
<li>Muhte?em doğal manzaralar eşliğinde bir deniz maceras?.</li>
<li>Adrenalin ve huzurun en g&uuml;zel kar???m?.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Parasailing, hem korkusuzlar hem de adrenaline a&ccedil;?ksan?z i&ccedil;in m&uuml;kemmel bir aktivitedir. Siz de bu eşsiz deneyimi yaşamak i&ccedil;in bizimle ileti?ime ge&ccedil;in ve Fethiye&rsquo;nin muhteşem manzaras?yla g&ouml;ky&uuml;z&uuml;nde &ouml;zg&uuml;rce u&ccedil;manın tad?n? &ccedil;ıkarın!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '27' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '27' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '27' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- ringo
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '28' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Ringo',
    description = '<h2>Ringo</h2>
<h3>Ringo Nedir? Denizde Heyecan Dolu Anlar ?&ccedil;in M&uuml;thi? Bir Su Sporu Arac?</h3>
<p>Ringo, ad?yla da s&ouml;ylendi?i gibi, genellikle yuvarlak bir tasar?ma sahip olan ve y&uuml;ksek hızla denizin &uuml;zerinde ilerlemenize yard?mc? olan pop&uuml;ler bir su sporlar? arac?d?r. Bir bot tarafından iple ba?lanan ringo, arkadaşlar?n?zla birlikte eğlenceli ve adrenalin dolu dakikalar yaşaman?z? sağlar.</p>
<p>&nbsp;</p>
<h3>Ringo Nasıl Kullan?l?r?</h3>
<ul>
<li>Yap?s?: Yuvarlak tasar?m? ve dayan?kl? malzemeleri ile dikkat &ccedil;eker.</li>
<li>Ba?lant?: Bir botun arkas?na bağlı olarak y&uuml;ksek hızlarda hareket eder.</li>
<li>??tah A&ccedil;?c? Eğlence: &Uuml;zerine 4 arkadaş?n?zla binebilir, yeleklerinizle g&uuml;venli bir ?ekilde suyun &uuml;zerinde e?lenebilirsiniz.</li>
<li>Heyecan ve Rekabet: D&uuml;?meden ne kadar uzun s&uuml;re durabilece?inizi veya dengede kalmay? ba?arabilece?inizi g&ouml;rebilirsiniz.</li>
</ul>
<p>&nbsp;</p>
<h3>Neden Ringo?</h3>
<ul>
<li>Hem &ccedil;ocuklar hem de yeti?kinler i&ccedil;in uygundur.</li>
<li>G&uuml;venli ve eğlenceli, adrenalin dolu bir su sporu.</li>
<li>Arkada?lar?n?zla farklı ve unutulmaz anlar yaşaman?z? sağlar.</li>
<li>Denizin &uuml;zerinde &ouml;zg&uuml;rce kaymanın tad?n? &ccedil;ıkar?rs?n?z.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Ringo, denizde eğlence ve maceray? bir araya getirir. D&uuml;?meden ne kadar s&uuml;re dengede kalabilece?inizi deneyerek, hem e?lenin hem de denge ve cesaretinizi geli?tirin. Eğlence dolu bu su sporunu denemek ve heyecan? payla?mak i&ccedil;in bizimle ileti?ime ge&ccedil;in!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '28' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '28' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '28' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- sup-board
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '29' LIMIT 1);
UPDATE listing_translations lt
SET title = 'SUP Board',
    description = '<h2>SUP Board</h2>
<h3>SUP Board Nedir? Denizde Denge ve Sa?l?k ?&ccedil;in M&uuml;kemmel Bir Spor</h3>
<p>Dayan?kl?l???n?z? &ouml;l&ccedil;mek ve fiziksel sa?l???n?z? desteklemek ister misiniz? O zaman yapman?z gereken tek ?ey, SUP board (Stand Up Paddle Board) ile tanımak! SUP, yani stand up paddle, s&ouml;rf tahtas?nın &uuml;zerinde ayakta veya oturarak k&uuml;rek &ccedil;ekerek yap?lan eğlenceli ve faydal? bir su sporudur.</p>
<p>&nbsp;</p>
<h3>SUP Board Nasıl Oynan?r?</h3>
<ul>
<li><strong>Temel Bilgi:</strong> SUP Board, s&ouml;rf tahtas?yla denizde veya g&ouml;lde ayakta durarak ya da oturarak k&uuml;rek &ccedil;ekmenize olanak tan?r.</li>
<li><strong>Fiziksel Faydalar:</strong> D&uuml;zenli SUP yaparak g&uuml;&ccedil;, denge ve dayan?kl?l???n?z? geli?tirebilirsiniz.</li>
<li><strong>Her Sezon Uygun:</strong> Yaz?n s?cak havalarda, k???n ise serin havalarda denizle i&ccedil; i&ccedil;e olmanın en sa?l?kl? yollar?ndan biridir.</li>
</ul>
<h3>&nbsp;</h3>
<h3>Neden SUP Yapmal?s?n?z?</h3>
<ul>
<li>Bedeninizi zinde tutar.</li>
<li>Denge ve koordinasyonu art?r?r.</li>
<li>Sa?l?kl? bir yaşam tarz?na katk? sağlar.</li>
<li>Diledi?iniz zaman, diledi?iniz yerde deniz veya g&ouml;lde yapma &ouml;zg&uuml;rl&uuml;?&uuml; sunar.</li>
</ul>
<h3>Sonu&ccedil;</h3>
<p>Sup yaparken, hem kendinizi hem de bedeninizi g&uuml;&ccedil;lendirebilir, stresinizden ar?nabilirsiniz. Yaz?n veya k???n, suyla ha??r ne?ir olmak ve sa?l?kl? kalmak i&ccedil;in en do?ru spor SUP Board! Hemen denemek ve &uuml;cretsiz dan??manl?k almak i&ccedil;in bizimle ileti?ime ge&ccedil;in.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '29' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '29' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '29' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- mable
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '30' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Mable',
    description = '<h2>Mable</h2>
<h3>Mable Nedir? Konforlu ve Eğlenceli Bir Tatil Su Sporu</h3>
<p>Konforuna d&uuml;?k&uuml;n olanlar ve denizin &uuml;zerinde rahat&ccedil;a e?lenmek isteyenler i&ccedil;in m&uuml;kemmel bir se&ccedil;enek: Mable. Hem yatarken hem de oturarak denizin tad?n? &ccedil;ıkarabilece?iniz bu eğlenceli su sporu, tatilinizde unutulmaz an?lar biriktirmenize olanak tan?r.</p>
<p>&nbsp;</p>
<h3>Mable Nasıl Yapılır?</h3>
<ul>
<li>??te Temel Bilgi: Mable, genellikle 2 veya 5 kişinin birlikte yap?labildi?i, teknenin sizi sa?a sola kayd?rmas?yla ger&ccedil;ekle?en son derece eğlenceli bir tatil su sporudur.</li>
<li>?ster Hızl? ?ster Yava?: ?sterseniz hızland?rabilir, isterseniz daha sakin bir ?ekilde e?lenebilirsiniz.</li>
<li>Her Ya? Grubu Uygun: &Ccedil;ocuklar ve yeti?kinler birlikte yapabilir, ailecek denizin &uuml;zerinde keyifli vakit ge&ccedil;irebilirsiniz.</li>
<li>Unutulmaz An?lar: &Ouml;zellikle anne ve babalar, &ccedil;ocuklar?yla birlikte e?lenip g&uuml;zel an?lar biriktirmek i&ccedil;in tercih eder.</li>
</ul>
<p>&nbsp;</p>
<h3>Neden Mable Yapmal?s?n?z?</h3>
<ul>
<li>Tatilde eğlenceyi maksimuma &ccedil;ıkarmak i&ccedil;in ideal.</li>
<li>G&uuml;nl&uuml;k tekrar tekrar binmek isteyenler olur.</li>
<li>Konforlu ve g&uuml;venli bir ?ekilde deniz &uuml;zerinde deneyim yaşars?n?z.</li>
<li>Hem &ccedil;ocuklar hem de yeti?kinler i&ccedil;in uygundur.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Mable, konforu ve eğlenceyi bir araya getiren, tatilinize renk katacak ideal bir su sporudur. Denizin &uuml;zerinde rahatlay?p, e?lenmek ve keyifli an?lar biriktirmek i&ccedil;in hemen bize ula??n!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '30' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '30' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '30' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- banana
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '31' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Banana',
    description = '<h2>Banana</h2>
<h3>Banana Nedir? Tatilinize Eğlence Katacak Pop&uuml;ler Su Sporu</h3>
<p>Eğlencenin en enerjik ve heyecan verici versiyonlar?ndan biri olan Banana, muzun ?ngilizcesi olan "banana" kelimesinden esinlenmi?tir. Su sporlar? aras?nda en &ccedil;ok tercih edilenlerden biri olan bu eğlenceli aktivite, tatilinizde unutulmaz an?lar biriktirmenize olanak tan?r.</p>
<p>&nbsp;</p>
<h3>Banana Nasıl Yapılır?</h3>
<ul>
<li><strong>??te Temel Bilgi:</strong> Banana, genellikle 2 ila 8 kişiyle yap?labilen, y&uuml;ksek hızda denizde hareket eden ve sanki bir roketle ate?lenmi? gibi hissettiren eğlenceli bir su sporudur.</li>
<li><strong>Deneyim:</strong> Bu aktivitede &ouml;nemli olan, denizdeki denge ve cesarettir. D&uuml;?mek veya d&uuml;?memek ise tamamen sizin elinizde!</li>
<li><strong>Hız Se&ccedil;ene?i:</strong> Dilerseniz hızla gidebilir, dilerseniz daha yava? ve sakin bir seyir yapabilirsiniz.</li>
<li><strong>Grup Uygunlu?u:</strong> Aileden arkadaşlara kadar herkesle yap?labilir, gruplar halinde denizin tad?n? &ccedil;ıkarabilirsiniz.</li>
</ul>
<p>&nbsp;</p>
<h3>Neden Banana Denemelisiniz?</h3>
<ul>
<li>Tatilinizde adrenalini y&uuml;kselten en eğlenceli aktivitelerden biri.</li>
<li>Hem &ccedil;ocuklar hem de yeti?kinler i&ccedil;in uygundur.</li>
<li>Her seferinde farklı bir heyecan yaşat?rs?n?z.</li>
<li>G&uuml;venli ve eğlenceli bir su sporudur.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Banana su sporunun keyfini &ccedil;ıkarın ve denizdeki &ouml;zg&uuml;rl&uuml;?&uuml; yaÇayın! Hemen denemek ve bu eğlenceli deneyimi yaşamak i&ccedil;in bizimle ileti?ime ge&ccedil;in. Suya d&uuml;?mek, ya da hayatta kalmak sizin cesaretinize ve eğlencenize bağlı!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '31' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '31' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '31' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- kano
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '32' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Kano',
    description = '<h2>Kano</h2>
<h3>Yunus Deniz Bisikletleri (Kano Pedolo) Nedir? Aile ve Gruplar ?&ccedil;in Eğlenceli Bir Su Aktivitesi</h3>
<p>Yunus deniz bisikletlerimiz, grup olarak yapabilece?iniz &ccedil;ok keyifli ve eğlenceli bir su sporudur. Hem &ccedil;iftler hem de &ccedil;ocuklu aileler tarafından tercih edilen bu aktivite, deniz &uuml;zerinde unutulmaz anlar yaşaman?z? sağlar.</p>
<p>&nbsp;</p>
<h3>Yunus Deniz Bisikleti Nasıl Kullan?l?r?</h3>
<ul>
<li>Kapasite: 2 veya 4 kişi ile kullan?labilir. Ailecek ya da arkadaşlar?n?zla birlikte keyifli vakit ge&ccedil;irebilirsiniz.</li>
<li>Kolay Kullan?m: &Ccedil;ok kolay kullan?lan bu deniz bisikletleri, suyun sakin oldu?u durgun ve dalgas?z sularda en iyi performans? g&ouml;sterir.</li>
<li>Kiralama: Saatlik olarak kiraya verilir, uygun fiyatlar?yla tatilinize hareketlilik katar.</li>
<li>&Ccedil;ocuklar ?&ccedil;in G&uuml;venli: &Ccedil;ocuklar?n?z?n tatilini renklendirmek ve onlara denizde eğlenceli zamanlar yaşatmak i&ccedil;in ideal.</li>
</ul>
<h3>&nbsp;</h3>
<h3>Neden Yunus Deniz Bisikleti?</h3>
<ul>
<li>Durgun ve sakin sularda kullan?m? kolayd?r.</li>
<li>Hem eğlence hem de g&uuml;venli bir aktivitedir.</li>
<li>Aileler ve gruplar aras?nda pop&uuml;lerdir.</li>
<li>&Ccedil;ocuklar?n?z?n tatil an?lar?n? &ouml;zel k?lmanın harika bir yolu.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Yunus deniz bisikletleri ile deniz &uuml;zerinde e?lenmenin keyfini &ccedil;ıkarın! Hemen saatlik kiralama se&ccedil;eneklerimizle tatilinize yeni bir hareket kat?n ve sevdiklerinizle unutulmaz an?lar biriktirin.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '32' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '32' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '32' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- jetski
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '34' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Jetski',
    description = '<h2>Jetski</h2>
<h3>Jet Ski Nedir? Masmavi Sularda Hız ve Adrenalin ?&ccedil;in M&uuml;kemmel Bir Su Sporu</h3>
<p>Yamaha Wave Runner ve Bombardier JET SKI&rsquo;lerimizi kiralayarak masmavi sularda hızl? ve heyecan dolu bir deneyim yaşayabilirsiniz. Dalgalar? yararak veya dalgalar?n aras?ndan kayarken, adrenalin dolu anlar sizleri bekliyor!</p>
<p>&nbsp;</p>
<h3>Jet Ski Kullan?m? ve G&uuml;venlik</h3>
<ul>
<li>Kullan?m Alan?: Jet skilerimiz, sadece parkurda kullan?lmak &uuml;zere tasarlanm??t?r ve g&uuml;venli?inizi sa?lamak amac?yla parkur d???na &ccedil;?kman?za izin verilmez.</li>
<li>Ya? S?n?r?: 18 ya??ndan b&uuml;y&uuml;k olanlar kullanabilir. G&uuml;venli?iniz i&ccedil;in, kullan?m &ouml;ncesi eğitmenlerimiz tarafından detayl? talimatlar verilir.</li>
<li>Partnerli veya Solo: Dilerseniz tek ba??n?za, dilerseniz partneriniz veya &ccedil;ocuklar?n?zla kullanabilirsiniz.</li>
<li>??te Deneyim: Sabah saatlerinde d&uuml;z sularda hız yapabilir veya adrenalin dolu kay??lar deneyimleyebilirsiniz.</li>
<li>G&uuml;venli Kullan?m: E?itmenlerimiz eşliğinde g&uuml;venli ve kontroll&uuml; bir ?ekilde kullanabilirsiniz. Bu heyecan verici aktiviteyi denemek hi&ccedil; bu kadar kolay olmam??t?!</li>
</ul>
<p>&nbsp;</p>
<h3>Neden Jet Ski Denemelisiniz?</h3>
<ul>
<li>Dalgalar?n aras?ndan hızla kaymak ve sudaki &ouml;zg&uuml;rl&uuml;?&uuml; yaşamak.</li>
<li>Hem macera hem de serbestlik duygusunu bir arada hissetmek.</li>
<li>Aile ve arkadaşlar?n?zla eğlenceli vakit ge&ccedil;irmek.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Hız tutkunlar? ve macera severler, jet ski ile denizde adrenalin dolu saatler ge&ccedil;irebilir. Siz de bug&uuml;ne kadar denemediyseniz, hemen bizimle ileti?ime ge&ccedil;in ve bu eşsiz deneyimi yaÇayın!</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '34' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '34' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '34' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
-- katamaran
UPDATE listings SET
  location_name = 'Fethiye',
  updated_at = now()
WHERE id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '35' LIMIT 1);
UPDATE listing_translations lt
SET title = 'Katamaran',
    description = '<h2>Katamaran</h2>
<h3>Katamaran &Ouml;ğrenmeye Ne Dersiniz? Denizde Ser&uuml;vene Ba?lay?n!</h3>
<p>Tatilinizde katamaran kullanmay? &ouml;ğrenmeye ne dersiniz? Dalgalar?n &uuml;zerinden hızla seyir yapabilir, g&uuml;n bat?m?na do?ru yelken a&ccedil;abilir veya sabah serinli?inde hafif&ccedil;e yelkenlere r&uuml;zgar doldurarak g&uuml;ne ba?layabilirsiniz. G&uuml;n&uuml;n her saatinde katamaran eğitimi alma imkan? sunulmaktad?r.</p>
<p>&nbsp;</p>
<h3>Katamaran Nasıl &Ouml;ğrenilir?</h3>
<ul>
<li>Y&uuml;zde 100 Pratik ve G&uuml;venli Eğitimi: K?sa bir karada eğitim ile ba?lar, ard?ndan do?rudan suda pratik yapmaya ge&ccedil;ersiniz.</li>
<li>10 Saatlik Lisansl? Eğitim Paketi: Bu paket sayesinde katamaran kullanmay? &ouml;?renecek ve lisans alabilirsiniz.</li>
<li>Kapsaml? Eğitim ?&ccedil;eri?i: Katamaran? haz?rlama, suya indirme, seyir yapma, y&ouml;nlendirme, d&ouml;n&uuml;?ler, durmalar, park etme, g&uuml;venlik &ouml;nlemleri ve denizden kurtarma gibi temel bilgiler verilir.</li>
<li>?leri Seviye Dersler: Trapez kullanmay? &ouml;?renebilir veya eğitmen eşliğinde katamaran turlar?na katılabilirsiniz.</li>
</ul>
<p>&nbsp;</p>
<h3>Neden Katamaran &Ouml;ğrenmelisiniz?</h3>
<ul>
<li>&Ccedil;ok keyifli ve kullan?m? olduk&ccedil;a kolayd?r.</li>
<li>Aile ve arkadaşlar ile denizde heyecan dolu anlar yaşars?n?z.</li>
<li>Hem suyun tad?n? &ccedil;ıkar?p hem de deniz &uuml;zerinde gezinmek isteyenler i&ccedil;in idealdir.</li>
<li>Tatilinize farklı bir deneyim ve hareket katars?n?z.</li>
</ul>
<p>&nbsp;</p>
<h3>Sonu&ccedil;</h3>
<p>Bu yaz, katamaran kullanmay? &ouml;?renerek denizde &ouml;zg&uuml;rce seyahat etmenin tad?n? &ccedil;ıkarabilirsiniz. Hem e?lenin hem de yeni bir beceri edinin! Hemen bizimle ileti?ime ge&ccedil;in ve katamaran deneyimine ad?m at?n.</p>'
FROM locales lo
WHERE lt.listing_id = (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '35' LIMIT 1)
  AND lt.locale_id = lo.id
  AND lower(lo.code) = 'tr';
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '35' LIMIT 1), 'listing_meta', 'v1', jsonb_build_object(
  'address', 'Çalış Plajı, Fethiye/Muğla, Türkiye',
  'district_label', 'Fethiye',
  'city', 'Fethiye'
)
WHERE (SELECT id FROM listings WHERE external_provider_code = 'bravo_event' AND external_listing_ref = '35' LIMIT 1) IS NOT NULL
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;
SELECT l.slug, lt.title, l.location_name
FROM listings l
JOIN listing_translations lt ON lt.listing_id = l.id
JOIN locales lo ON lo.id = lt.locale_id AND lower(lo.code) = 'tr'
WHERE l.external_provider_code = 'bravo_event'
  AND l.slug IN (
    'oludeniz-jet-ski-aktivitesi',
    'kas-scuba-diving',
    'kas-jeep-safari',
    'oludeniz-tekne-turu',
    'calis-aqua-park'
  )
ORDER BY l.slug;
COMMIT;
