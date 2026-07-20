SET client_encoding = 'UTF8';


    INSERT INTO listings (id, organization_id, category_id, slug, status, currency_code, created_at, updated_at)
    VALUES ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM product_categories WHERE code = 'hotel'), 'adrasan-beltom-beach-hotel', 'published', 'TRY', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET category_id = (SELECT id FROM product_categories WHERE code = 'hotel'), status = 'published', currency_code = 'TRY', updated_at = NOW();
  

      INSERT INTO listing_translations (listing_id, locale_id, title, description)
      VALUES ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 1, 'Adrasan Beltom Beach Hotel', '<h2>Adrasan Sahilinde Deniz ve Doğa İle İç İçe Unutulmaz Bir Konaklama</h2>
<p>Adrasan Beltom Beach Hotel, Antalya''nın en huzurlu koylarından biri olan Adrasan sahilinde, denize sıfır ayrıcalıklı konumu ile misafirlerine eşsiz bir tatil imkanı sunmaktadır. Çam ormanlarının denizle kucaklaştığı bu özel lokasyonda, modern konforu sıcak bir misafirperverlikle harmanlamaktadır.</p>
<h2>Tesis Olanakları ve Hizmetler</h2>
<p>Misafirlerimizin rahatı için tesisimizde sunulan başlıca olanaklar:</p>
<ul>
<li>Denize sıfır özel plaj alanı, şezlong ve şemsiye imkanı</li>
<li>Açık yüzme havuzu ve güneşlenme terası</li>
<li>Akdeniz ve Ege mutfağından lezzetler sunan alakart restoran</li>
<li>Ücretsiz yüksek hızlı Wi-Fi erişimi ve otopark</li>
<li>24 saat resepsiyon, tur danışma ve oda servisi</li>
<li>Klimalı, deniz veya doğa manzaralı konforlu odalar</li>
</ul>
<h2>Konum ve Aktiviteler</h2>
<p>Tesisimiz, Suluada tekne turları kalkış noktasına ve Likya Yolu yürüyüş rotalarına son derece yakındır. Adrasan''ın berrak sularında dalış ve su sporları yapabilir, akşamları sahil boyunca huzurlu yürüyüşler gerçekleştirebilirsiniz.</p>')
      ON CONFLICT (listing_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    

      INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
      VALUES ('listing', '3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 1, 'Adrasan Beltom Beach Hotel | Adrasan Denize Sıfır Otel Rezervasyonu', 'Adrasan Sahilinde Deniz ve Doğa İle İç İçe Unutulmaz Bir Konaklama
Adrasan Beltom Beach Hotel, Antalya''nın en huzurlu koylarından biri olan Adrasan sa...', 'adrasan otel, beltom beach hotel, adrasan denize sifir otel')
      ON CONFLICT (entity_type, entity_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
    

      INSERT INTO listing_translations (listing_id, locale_id, title, description)
      VALUES ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 2, 'Adrasan Beltom Beach Hotel', '<h2>Unforgettable Beachfront Stay in Peaceful Adrasan Bay</h2>
<p>Adrasan Beltom Beach Hotel offers an exceptional holiday experience right on the beachfront of Adrasan, one of Antalya''s most serene bays. Nestled where pine forests meet the turquoise Mediterranean, the hotel combines modern comfort with authentic hospitality.</p>
<h2>Hotel Amenities & Services</h2>
<ul>
<li>Private beach area with complimentary sun loungers and umbrellas</li>
<li>Outdoor swimming pool and sunbathing terrace</li>
<li>À la carte restaurant serving Mediterranean local specialties</li>
<li>Free high-speed Wi-Fi internet and private parking</li>
<li>24-hour front desk, tour assistance, and room service</li>
<li>Air-conditioned rooms with balcony and sea/nature views</li>
</ul>
<h2>Location & Activities</h2>
<p>Ideally situated near Suluada boat tour departure points and the famous Lycian Way hiking trail, guests can enjoy scuba diving, water sports, or relaxing coastal strolls.</p>')
      ON CONFLICT (listing_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    

      INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
      VALUES ('listing', '3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 2, 'Adrasan Beltom Beach Hotel | Adrasan Beachfront Hotel Booking', 'Unforgettable Beachfront Stay in Peaceful Adrasan Bay
Adrasan Beltom Beach Hotel offers an exceptional holiday experience right on the beachfront of A...', 'adrasan otel, beltom beach hotel, adrasan denize sifir otel')
      ON CONFLICT (entity_type, entity_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
    

      INSERT INTO listing_translations (listing_id, locale_id, title, description)
      VALUES ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 5, 'Adrasan Beltom Beach Hotel', '<h2>Unvergesslicher Urlaub am Strand von Adrasan</h2>
<p>Das Adrasan Beltom Beach Hotel liegt direkt am kristallklaren Meer der Bucht von Adrasan. Mit moderner Ausstattung, eigenem Strandbereich und hervorragendem Restaurant ist es die perfekte Wahl für Erholungssuchende.</p>
<h2>Ausstattung & Services</h2>
<ul>
<li>Privater Strandbereich mit kostenfreien Liegen</li>
<li>Außenpool mit Sonnenterrasse</li>
<li>A-la-carte-Restaurant mit mediterraner Küche</li>
<li>Kostenloses WLAN und Parkplätze</li>
<li>24-Stunden-Rezeption und Klimaanlage in allen Zimmern</li>
</ul>')
      ON CONFLICT (listing_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    

      INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
      VALUES ('listing', '3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 5, 'Adrasan Beltom Beach Hotel | Adrasan Beachfront Hotel Booking', 'Unvergesslicher Urlaub am Strand von Adrasan
Das Adrasan Beltom Beach Hotel liegt direkt am kristallklaren Meer der Bucht von Adrasan. Mit moderner Au...', 'adrasan otel, beltom beach hotel, adrasan denize sifir otel')
      ON CONFLICT (entity_type, entity_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
    

      INSERT INTO listing_translations (listing_id, locale_id, title, description)
      VALUES ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 6, 'Отель Adrasan Beltom Beach Hotel', '<h2>Незабываемый отдых на первой береговой линии в Адрасане</h2>
<p>Отель Adrasan Beltom Beach Hotel расположен непосредственно на пляже живописной бухты Адрасан в Анталии. Сочетание морского бриза, соснового леса и современного комфорта создают отличные условия для отдыха.</p>
<h2>Удобства и услуги</h2>
<ul>
<li>Собственный пляж с бесплатными шезлонгами</li>
<li>Открытый бассейн с террасой для загара</li>
<li>Ресторан средиземноморской кухни</li>
<li>Бесплатный Wi-Fi и парковка</li>
<li>Круглосуточная стойка регистрации и кондиционер</li>
</ul>')
      ON CONFLICT (listing_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    

      INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
      VALUES ('listing', '3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 6, 'Отель Adrasan Beltom Beach Hotel | Adrasan Beachfront Hotel Booking', 'Незабываемый отдых на первой береговой линии в Адрасане
Отель Adrasan Beltom Beach Hotel расположен непосредственно на пляже живописной бухты Адрасан ...', 'adrasan otel, beltom beach hotel, adrasan denize sifir otel')
      ON CONFLICT (entity_type, entity_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
    

      INSERT INTO listing_translations (listing_id, locale_id, title, description)
      VALUES ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 7, '阿德拉桑贝尔通海滩酒店 (Adrasan Beltom Beach Hotel)', '<h2>阿德拉桑海滩前沿的难忘住宿体验</h2>
<p>Adrasan Beltom Beach Hotel 位于安塔利亚极具宁静魅力的阿德拉桑湾，紧邻蔚蓝大海。酒店将现代舒适设施与热情好客的服务完美融为一体。</p>
<h2>设施与服务</h2>
<ul>
<li>私人海滩区，配备免费太阳椅与遮阳伞</li>
<li>室外游泳池及日光露台</li>
<li>提供地中海特色美食的点餐餐厅</li>
<li>免费高速 Wi-Fi 和内部停车场</li>
<li>24小时前台服务及全套冷暖空调客房</li>
</ul>')
      ON CONFLICT (listing_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    

      INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
      VALUES ('listing', '3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 7, '阿德拉桑贝尔通海滩酒店 (Adrasan Beltom Beach Hotel) | Adrasan Beachfront Hotel Booking', '阿德拉桑海滩前沿的难忘住宿体验
Adrasan Beltom Beach Hotel 位于安塔利亚极具宁静魅力的阿德拉桑湾，紧邻蔚蓝大海。酒店将现代舒适设施与热情好客的服务完美融为一体。
设施与服务

私人海滩区，配备免费太阳椅与遮阳伞
室外游泳池及日光露台
提供地中海特色美食的点餐餐厅
免费高速 ...', 'adrasan otel, beltom beach hotel, adrasan denize sifir otel')
      ON CONFLICT (entity_type, entity_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
    

      INSERT INTO listing_translations (listing_id, locale_id, title, description)
      VALUES ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 8, 'Hôtel Adrasan Beltom Beach Hotel', '<h2>Séjour Inoubliable en Bord de Mer à Adrasan</h2>
<p>L''Adrasan Beltom Beach Hotel bénéficie d''un emplacement privilégié en première ligne de plage dans la baie paisible d''Adrasan. Confort moderne et accueil chaleureux au rendez-vous.</p>
<h2>Équipements et Services</h2>
<ul>
<li>Plage privée avec transats et parasols gratuits</li>
<li>Piscine extérieure et terrasse ensoleillée</li>
<li>Restaurant à la carte aux spécialités méditerranéennes</li>
<li>Wi-Fi haut débit gratuit et parking privé</li>
<li>Réception ouverte 24h/24 et chambres climatisées</li>
</ul>')
      ON CONFLICT (listing_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    

      INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
      VALUES ('listing', '3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 8, 'Hôtel Adrasan Beltom Beach Hotel | Adrasan Beachfront Hotel Booking', 'Séjour Inoubliable en Bord de Mer à Adrasan
L''Adrasan Beltom Beach Hotel bénéficie d''un emplacement privilégié en première ligne de plage dans la baie...', 'adrasan otel, beltom beach hotel, adrasan denize sifir otel')
      ON CONFLICT (entity_type, entity_id, locale_id)
      DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
    
DELETE FROM hotel_rooms WHERE listing_id = '3d07f898-4632-464d-85b8-68410ed44e00'::uuid;

    INSERT INTO hotel_rooms (listing_id, name, capacity, board_type, unit_count, meta_json)
    VALUES
      ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 'Standart Deniz Manzaralı Oda', 2, 'breakfast', 10, '{"bed_type": "1 Çift Kişilik veya 2 Tek Kişilik Yatak", "size_m2": 28}'::jsonb),
      ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 'Deluxe Bahçe Manzaralı Süit', 3, 'breakfast', 5, '{"bed_type": "1 Çift + 1 Tek Kişilik Yatak", "size_m2": 42}'::jsonb),
      ('3d07f898-4632-464d-85b8-68410ed44e00'::uuid, 'Aile Odası (2 Yatak Odalı)', 4, 'breakfast', 4, '{"bed_type": "1 Çift + 2 Tek Kişilik Yatak", "size_m2": 55}'::jsonb);
  

      INSERT INTO listings (id, organization_id, category_id, slug, status, currency_code, created_at, updated_at)
      VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM product_categories WHERE code = 'holiday_home'), 'bella-villa-1', 'published', 'TRY', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET category_id = (SELECT id FROM product_categories WHERE code = 'holiday_home'), status = 'published', currency_code = 'TRY', updated_at = NOW();
    

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 1, 'Bella Villa 1 - Fethiye Ölüdeniz''de Özel Havuzlu Müstakil Villa', '<h2>Ölüdeniz''e Yakın Konumda Modern ve Huzurlu Villa Tatili</h2>
<p>Bella Villa 1, Fethiye Ölüdeniz mevkisinde doğa içinde sessiz ve huzurlu bir konumda yer almaktadır. Modern mimarisi, müstakil özel yüzme havuzu ve bakımlı bahçesi ile 4 kişilik çekirdek aileler ve çiftler için unutulmaz bir tatil evidir.</p>
<h2>Villa Özellikleri ve Olanaklar</h2>
<ul>
<li>Özel yüzme havuzu ve korunaklı güneşlenme terası</li>
<li>2 ebeveyn banyolu klimalı yatak odası</li>
<li>Şık oturma grubu ve tam donanımlı modern Amerikan mutfak</li>
<li>Bahçe veranası, barbekü (mangal) alanı ve dış mekan yemek masası</li>
<li>Kablosuz internet (Wi-Fi), düz ekran TV, çamaşır makinesi</li>
<li>Özel otopark alanı ve güvenlik sistemi</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0001-4000-a000-000000000001'::uuid, 1, 'Bella Villa 1 - Fethiye Ölüdeniz''de Özel Havuzlu Müstakil Villa | Villa Kiralama', 'Ölüdeniz''e Yakın Konumda Modern ve Huzurlu Villa Tatili
Bella Villa 1, Fethiye Ölüdeniz mevkisinde doğa içinde sessiz ve huzurlu bir konumda yer almak...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 2, 'Bella Villa 1 - Private Pool Villa Near Oludeniz Fethiye', '<h2>Modern & Peaceful Holiday Villa Near Oludeniz Beach</h2>
<p>Bella Villa 1 is located in a tranquil natural setting near Oludeniz, Fethiye. Featuring modern architecture, a private swimming pool, and a landscaped garden, it is ideal for families or small groups of up to 4 guests.</p>
<h2>Features and Amenities</h2>
<ul>
<li>Private swimming pool with sunbathing terrace</li>
<li>2 air-conditioned ensuite bedrooms</li>
<li>Fully equipped open-plan kitchen and stylish lounge</li>
<li>Garden veranda with BBQ area and dining table</li>
<li>Wi-Fi internet, flat-screen TV, washer, private parking</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0001-4000-a000-000000000001'::uuid, 2, 'Bella Villa 1 - Private Pool Villa Near Oludeniz Fethiye | Villa Rental', 'Modern & Peaceful Holiday Villa Near Oludeniz Beach
Bella Villa 1 is located in a tranquil natural setting near Oludeniz, Fethiye. Featuring modern ar...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 5, 'Bella Villa 1 - Villa mit Privatem Pool nahe Ölüdeniz', '<h2>Moderne Ferienvilla für 4 Personen in Fethiye Ölüdeniz</h2>
<p>Die Bella Villa 1 bietet Platz für bis zu 4 Personen mit eigenem Pool und wunderschönem Garten nahe dem berühmten Ölüdeniz Strand.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0001-4000-a000-000000000001'::uuid, 5, 'Bella Villa 1 - Villa mit Privatem Pool nahe Ölüdeniz | Villa Rental', 'Moderne Ferienvilla für 4 Personen in Fethiye Ölüdeniz
Die Bella Villa 1 bietet Platz für bis zu 4 Personen mit eigenem Pool und wunderschönem Garten ...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 6, 'Вилла Белла 1 (Bella Villa 1) - Вилла с бассейном в Олюдениз Фетхие', '<h2>Современный дом для отдыха до 4 гостей неподалеку от пляжа Олюдениз</h2>
<p>Bella Villa 1 предлагает комфортный семейный отдых с частным бассейном, 2 спальнями с ванными комнатами и барбекю.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0001-4000-a000-000000000001'::uuid, 6, 'Вилла Белла 1 (Bella Villa 1) - Вилла с бассейном в Олюдениз Фетхие | Villa Rental', 'Современный дом для отдыха до 4 гостей неподалеку от пляжа Олюдениз
Bella Villa 1 предлагает комфортный семейный отдых с частным бассейном, 2 спальням...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 7, 'Bella Villa 1 - 费特希耶厄吕代尼兹附近的私人泳池别墅', '<h2>靠近厄吕代尼兹海滩的现代宁静度假别墅</h2>
<p>Bella Villa 1 位于费特希耶厄吕代尼兹地区，配有私人游泳池和 2 间带独立浴室的卧室，适合最多 4 位宾客入住。</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0001-4000-a000-000000000001'::uuid, 7, 'Bella Villa 1 - 费特希耶厄吕代尼兹附近的私人泳池别墅 | Villa Rental', '靠近厄吕代尼兹海滩的现代宁静度假别墅
Bella Villa 1 位于费特希耶厄吕代尼兹地区，配有私人游泳池和 2 间带独立浴室的卧室，适合最多 4 位宾客入住。...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 8, 'Bella Villa 1 - Villa avec Piscine Privée Près d''Oludeniz Fethiye', '<h2>Villa de Vacances Moderne pour 4 Personnes Près d''Oludeniz</h2>
<p>La Bella Villa 1 offre un cadre paisible avec piscine privée et jardin pour 4 personnes près de la plage d''Oludeniz.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0001-4000-a000-000000000001'::uuid, 8, 'Bella Villa 1 - Villa avec Piscine Privée Près d''Oludeniz Fethiye | Villa Rental', 'Villa de Vacances Moderne pour 4 Personnes Près d''Oludeniz
La Bella Villa 1 offre un cadre paisible avec piscine privée et jardin pour 4 personnes prè...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      
DELETE FROM listing_bedrooms WHERE listing_id = 'b1111111-0001-4000-a000-000000000001'::uuid;

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 0, 'Yatak Odası 1', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0001-4000-a000-000000000001'::uuid, 1, 'Yatak Odası 2', '1. Kat', '2 Adet Tek Kişilik Yatak', true);
      

      INSERT INTO listings (id, organization_id, category_id, slug, status, currency_code, created_at, updated_at)
      VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM product_categories WHERE code = 'holiday_home'), 'bella-villa-2', 'published', 'TRY', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET category_id = (SELECT id FROM product_categories WHERE code = 'holiday_home'), status = 'published', currency_code = 'TRY', updated_at = NOW();
    

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 1, 'Bella Villa 2 - Fethiye Ovacık''ta Babadağ Manzaralı Özel Lüks Villa', '<h2>Babadağ Manzarası Eşliğinde Ferah ve Konforlu Villa Tatili</h2>
<p>Bella Villa 2, Fethiye Ovacık mevkisinde Babadağ''ın eteklerinde konumlanmıştır. Geniş havuz terası, ferah yaşam alanları ve 3 yatak odası ile 6 kişilik aileler için tasarlanmış lüks bir müstakil villadır.</p>
<h2>Villa Özellikleri ve Olanaklar</h2>
<ul>
<li>Geniş özel yüzme havuzu ve şezlong alanı</li>
<li>3 konforlu yatak odası (2 ebeveyn banyolu) ve 3 banyo</li>
<li>Babadağ ve doğa manzaralı teras balkonu</li>
<li>Barbekü alanı, açık yemek masası ve veranda</li>
<li>Kablosuz internet, klima, çamaşır ve bulaşık makinesi</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0002-4000-a000-000000000002'::uuid, 1, 'Bella Villa 2 - Fethiye Ovacık''ta Babadağ Manzaralı Özel Lüks Villa | Villa Kiralama', 'Babadağ Manzarası Eşliğinde Ferah ve Konforlu Villa Tatili
Bella Villa 2, Fethiye Ovacık mevkisinde Babadağ''ın eteklerinde konumlanmıştır. Geniş havuz...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 2, 'Bella Villa 2 - Luxury Villa with Mountain Views in Ovacik Fethiye', '<h2>Spacious Villa with Babadag Mountain Views in Ovacik</h2>
<p>Bella Villa 2 is situated in Ovacik at the base of Mount Babadag. Featuring a large private pool, panoramic mountain views, and 3 bedrooms, it comfortably accommodates up to 6 guests.</p>
<h2>Features</h2>
<ul>
<li>Large private pool and sun terrace</li>
<li>3 comfortable bedrooms (2 ensuite)</li>
<li>Terrace balcony with scenic mountain views</li>
<li>Outdoor BBQ area and dining lounge</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0002-4000-a000-000000000002'::uuid, 2, 'Bella Villa 2 - Luxury Villa with Mountain Views in Ovacik Fethiye | Villa Rental', 'Spacious Villa with Babadag Mountain Views in Ovacik
Bella Villa 2 is situated in Ovacik at the base of Mount Babadag. Featuring a large private pool,...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 5, 'Bella Villa 2 - Luxusvilla mit Bergblick in Ovacik Fethiye', '<h2>Geräumige Villa am Fuße des Babadag für 6 Personen</h2>
<p>Die Bella Villa 2 bietet exklusiven Urlaub mit privatem Pool und Bergblick für bis zu 6 Personen.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0002-4000-a000-000000000002'::uuid, 5, 'Bella Villa 2 - Luxusvilla mit Bergblick in Ovacik Fethiye | Villa Rental', 'Geräumige Villa am Fuße des Babadag für 6 Personen
Die Bella Villa 2 bietet exklusiven Urlaub mit privatem Pool und Bergblick für bis zu 6 Personen....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 6, 'Вилла Белла 2 (Bella Villa 2) - Вилла с видом на горы в Оваджик', '<h2>Просторная вилла у подножия горы Бабадаг для 6 гостей</h2>
<p>Bella Villa 2 оборудована частным бассейном, 3 спальнями и панорамной террасой.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0002-4000-a000-000000000002'::uuid, 6, 'Вилла Белла 2 (Bella Villa 2) - Вилла с видом на горы в Оваджик | Villa Rental', 'Просторная вилла у подножия горы Бабадаг для 6 гостей
Bella Villa 2 оборудована частным бассейном, 3 спальнями и панорамной террасой....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 7, 'Bella Villa 2 - 费特希耶奥瓦哲克巴巴达格山景奢华别墅', '<h2>位于奥瓦哲克巴巴达格山脚下的宽敞别墅</h2>
<p>Bella Villa 2 位于费特希耶奥瓦哲克，配有大型私人游泳池和 3 间卧室，可容纳 6 位宾客入住。</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0002-4000-a000-000000000002'::uuid, 7, 'Bella Villa 2 - 费特希耶奥瓦哲克巴巴达格山景奢华别墅 | Villa Rental', '位于奥瓦哲克巴巴达格山脚下的宽敞别墅
Bella Villa 2 位于费特希耶奥瓦哲克，配有大型私人游泳池和 3 间卧室，可容纳 6 位宾客入住。...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 8, 'Bella Villa 2 - Villa de Luxe avec Vue Montagne à Ovacik Fethiye', '<h2>Villa Spacieuse au Pied du Mont Babadag pour 6 Personnes</h2>
<p>La Bella Villa 2 propose une piscine privée et une vue panoramique sur la montagne pour 6 personnes.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0002-4000-a000-000000000002'::uuid, 8, 'Bella Villa 2 - Villa de Luxe avec Vue Montagne à Ovacik Fethiye | Villa Rental', 'Villa Spacieuse au Pied du Mont Babadag pour 6 Personnes
La Bella Villa 2 propose une piscine privée et une vue panoramique sur la montagne pour 6 per...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      
DELETE FROM listing_bedrooms WHERE listing_id = 'b1111111-0002-4000-a000-000000000002'::uuid;

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 0, 'Yatak Odası 1', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 1, 'Yatak Odası 2', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0002-4000-a000-000000000002'::uuid, 2, 'Yatak Odası 3', '2. Kat', '2 Adet Tek Kişilik Yatak', false);
      

      INSERT INTO listings (id, organization_id, category_id, slug, status, currency_code, created_at, updated_at)
      VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM product_categories WHERE code = 'holiday_home'), 'bella-villa-3', 'published', 'TRY', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET category_id = (SELECT id FROM product_categories WHERE code = 'holiday_home'), status = 'published', currency_code = 'TRY', updated_at = NOW();
    

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 1, 'Bella Villa 3 - Fethiye Kayaköy''de Doğayla İç İçe Korunaklı Villa', '<h2>Tarihi Kayaköy''ün Büyüleyici Atmosferinde Muhafazakar Tatil</h2>
<p>Bella Villa 3, Fethiye Kayaköy bölgesinin huzurlu doğasında yer almaktadır. Dışarıdan görünmeyen korunaklı özel yüzme havuzu ile gözlerden uzak, sakin bir tatil arayan 4 kişilik aileler için idealdir.</p>
<h2>Villa Özellikleri ve Olanaklar</h2>
<ul>
<li>Dışarıdan görünmeyen korunaklı özel yüzme havuzu</li>
<li>2 adet ebeveyn banyolu konforlu yatak odası</li>
<li>Doğa manzaralı yeşil bahçe ve veranda</li>
<li>Klima, barbekü, Wi-Fi, otopark</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0003-4000-a000-000000000003'::uuid, 1, 'Bella Villa 3 - Fethiye Kayaköy''de Doğayla İç İçe Korunaklı Villa | Villa Kiralama', 'Tarihi Kayaköy''ün Büyüleyici Atmosferinde Muhafazakar Tatil
Bella Villa 3, Fethiye Kayaköy bölgesinin huzurlu doğasında yer almaktadır. Dışarıdan görü...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 2, 'Bella Villa 3 - Sheltered Private Pool Villa in Kayakoy Fethiye', '<h2>Private & Sheltered Pool Retreat in Historic Kayakoy</h2>
<p>Bella Villa 3 is located in peaceful Kayakoy, Fethiye. Featuring a completely sheltered private pool area, it provides a quiet and secluded holiday experience for up to 4 guests.</p>
<h2>Features</h2>
<ul>
<li>Secluded sheltered private swimming pool</li>
<li>2 comfortable ensuite bedrooms</li>
<li>Lush garden with mountain and nature views</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0003-4000-a000-000000000003'::uuid, 2, 'Bella Villa 3 - Sheltered Private Pool Villa in Kayakoy Fethiye | Villa Rental', 'Private & Sheltered Pool Retreat in Historic Kayakoy
Bella Villa 3 is located in peaceful Kayakoy, Fethiye. Featuring a completely sheltered private p...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 5, 'Bella Villa 3 - Geschützte Privatpool-Villa in Kayakoy', '<h2>Ruhiger Rückzugsort im historischen Kayakoy für 4 Personen</h2>
<p>Die Bella Villa 3 bietet vollkommen geschützten Privatpool für ungestörte Privatsphäre.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0003-4000-a000-000000000003'::uuid, 5, 'Bella Villa 3 - Geschützte Privatpool-Villa in Kayakoy | Villa Rental', 'Ruhiger Rückzugsort im historischen Kayakoy für 4 Personen
Die Bella Villa 3 bietet vollkommen geschützten Privatpool für ungestörte Privatsphäre....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 6, 'Вилла Белла 3 (Bella Villa 3) - Закрытая частная вилла в Каякей', '<h2>Уединенный отдых с приватным бассейном в Каякей Фетхие</h2>
<p>Bella Villa 3 идеально подходит для уединенного отдыха 4 гостей с закрытым бассейном.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0003-4000-a000-000000000003'::uuid, 6, 'Вилла Белла 3 (Bella Villa 3) - Закрытая частная вилла в Каякей | Villa Rental', 'Уединенный отдых с приватным бассейном в Каякей Фетхие
Bella Villa 3 идеально подходит для уединенного отдыха 4 гостей с закрытым бассейном....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 7, 'Bella Villa 3 - 费特希耶卡亚科伊隐蔽私人泳池别墅', '<h2>历史悠久的卡亚科伊隐蔽私人泳池度假别墅</h2>
<p>Bella Villa 3 位于费特希耶卡亚科伊，配有完全隐蔽的私人游泳池，适合 4 位宾客。</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0003-4000-a000-000000000003'::uuid, 7, 'Bella Villa 3 - 费特希耶卡亚科伊隐蔽私人泳池别墅 | Villa Rental', '历史悠久的卡亚科伊隐蔽私人泳池度假别墅
Bella Villa 3 位于费特希耶卡亚科伊，配有完全隐蔽的私人游泳池，适合 4 位宾客。...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 8, 'Bella Villa 3 - Villa avec Piscine Sans Vis-à-Vis à Kayakoy', '<h2>Havre de Paix Sans Vis-à-Vis à Kayakoy Fethiye</h2>
<p>La Bella Villa 3 offre une totale intimité avec sa piscine privée sans vis-à-vis pour 4 personnes.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0003-4000-a000-000000000003'::uuid, 8, 'Bella Villa 3 - Villa avec Piscine Sans Vis-à-Vis à Kayakoy | Villa Rental', 'Havre de Paix Sans Vis-à-Vis à Kayakoy Fethiye
La Bella Villa 3 offre une totale intimité avec sa piscine privée sans vis-à-vis pour 4 personnes....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      
DELETE FROM listing_bedrooms WHERE listing_id = 'b1111111-0003-4000-a000-000000000003'::uuid;

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 0, 'Yatak Odası 1', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0003-4000-a000-000000000003'::uuid, 1, 'Yatak Odası 2', '1. Kat', '2 Adet Tek Kişilik Yatak', true);
      

      INSERT INTO listings (id, organization_id, category_id, slug, status, currency_code, created_at, updated_at)
      VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM product_categories WHERE code = 'holiday_home'), 'bella-villa-4', 'published', 'TRY', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET category_id = (SELECT id FROM product_categories WHERE code = 'holiday_home'), status = 'published', currency_code = 'TRY', updated_at = NOW();
    

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 1, 'Bella Villa 4 - Kalkan Merkezde Eşsiz Deniz Manzaralı Villa', '<h2>Kalkan Körfezi Manzaralı Geniş Havuzlu Lüks Tatil Evi</h2>
<p>Bella Villa 4, Kalkan merkeze ve plaja yakın mesafede yer almaktadır. Kesintisiz deniz manzarası, geniş yüzme havuzu ve 3 yatak odası ile 6 kişilik kalabalık aileler için mükemmel bir tatil seçeneğidir.</p>
<h2>Villa Özellikleri ve Olanaklar</h2>
<ul>
<li>Özel yüzme havuzu ve deniz manzaralı güneşlenme terası</li>
<li>3 adet konforlu yatak odası ve 3 banyo</li>
<li>Merkeze ve restorana yürüme mesafesinde lokasyon</li>
<li>Modern mutfak, Wi-Fi, klima, barbekü</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0004-4000-a000-000000000004'::uuid, 1, 'Bella Villa 4 - Kalkan Merkezde Eşsiz Deniz Manzaralı Villa | Villa Kiralama', 'Kalkan Körfezi Manzaralı Geniş Havuzlu Lüks Tatil Evi
Bella Villa 4, Kalkan merkeze ve plaja yakın mesafede yer almaktadır. Kesintisiz deniz manzarası...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 2, 'Bella Villa 4 - Sea View Luxury Villa in Kalkan Center', '<h2>Breathtaking Kalkan Bay Sea Views & Private Pool</h2>
<p>Bella Villa 4 is situated close to Kalkan town center and beach. Offering spectacular sea views, a large private pool, and 3 bedrooms, it comfortably hosts up to 6 guests.</p>
<h2>Features</h2>
<ul>
<li>Private pool with panoramic sea views</li>
<li>3 comfortable bedrooms and 3 bathrooms</li>
<li>Walking distance to town amenities</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0004-4000-a000-000000000004'::uuid, 2, 'Bella Villa 4 - Sea View Luxury Villa in Kalkan Center | Villa Rental', 'Breathtaking Kalkan Bay Sea Views & Private Pool
Bella Villa 4 is situated close to Kalkan town center and beach. Offering spectacular sea views, a la...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 5, 'Bella Villa 4 - Luxusvilla mit Meerblick in Kalkan', '<h2>Traumhafter Meerblick auf die Bucht von Kalkan für 6 Personen</h2>
<p>Die Bella Villa 4 bietet exklusiven Meerblick und Privatpool nahe dem Zentrum von Kalkan.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0004-4000-a000-000000000004'::uuid, 5, 'Bella Villa 4 - Luxusvilla mit Meerblick in Kalkan | Villa Rental', 'Traumhafter Meerblick auf die Bucht von Kalkan für 6 Personen
Die Bella Villa 4 bietet exklusiven Meerblick und Privatpool nahe dem Zentrum von Kalkan...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 6, 'Вилла Белла 4 (Bella Villa 4) - Вилла с видом на море в центре Калкана', '<h2>Завораживающий вид на залив Калкана и частный бассейн</h2>
<p>Bella Villa 4 предлагает комфортное размещение для 6 гостей рядом с центром Калкана.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0004-4000-a000-000000000004'::uuid, 6, 'Вилла Белла 4 (Bella Villa 4) - Вилла с видом на море в центре Калкана | Villa Rental', 'Завораживающий вид на залив Калкана и частный бассейн
Bella Villa 4 предлагает комфортное размещение для 6 гостей рядом с центром Калкана....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 7, 'Bella Villa 4 - 卡尔坎中心无敌海景奢华别墅', '<h2>开阔的卡尔坎湾海景与私人游泳池</h2>
<p>Bella Villa 4 靠近卡尔坎镇中心，拥有开阔的海景和大型私人游泳池，适合 6 位宾客。</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0004-4000-a000-000000000004'::uuid, 7, 'Bella Villa 4 - 卡尔坎中心无敌海景奢华别墅 | Villa Rental', '开阔的卡尔坎湾海景与私人游泳池
Bella Villa 4 靠近卡尔坎镇中心，拥有开阔的海景和大型私人游泳池，适合 6 位宾客。...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 8, 'Bella Villa 4 - Villa de Luxe avec Vue Mer à Kalkan Centre', '<h2>Vue Panoramique sur la Baie de Kalkan et Piscine Privée</h2>
<p>La Bella Villa 4 propose un séjour de luxe pour 6 personnes près du centre de Kalkan.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0004-4000-a000-000000000004'::uuid, 8, 'Bella Villa 4 - Villa de Luxe avec Vue Mer à Kalkan Centre | Villa Rental', 'Vue Panoramique sur la Baie de Kalkan et Piscine Privée
La Bella Villa 4 propose un séjour de luxe pour 6 personnes près du centre de Kalkan....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      
DELETE FROM listing_bedrooms WHERE listing_id = 'b1111111-0004-4000-a000-000000000004'::uuid;

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 0, 'Yatak Odası 1', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 1, 'Yatak Odası 2', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0004-4000-a000-000000000004'::uuid, 2, 'Yatak Odası 3', '2. Kat', '2 Adet Tek Kişilik Yatak', false);
      

      INSERT INTO listings (id, organization_id, category_id, slug, status, currency_code, created_at, updated_at)
      VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM product_categories WHERE code = 'holiday_home'), 'bella-villa-5', 'published', 'TRY', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET category_id = (SELECT id FROM product_categories WHERE code = 'holiday_home'), status = 'published', currency_code = 'TRY', updated_at = NOW();
    

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 1, 'Bella Villa 5 - Fethiye Hisarönü''nde Lüks ve Geniş Müstakil Villa', '<h2>Kalabalık Aileler İçin Geniş Bahçeli ve Özel Havuzlu Tatil Evi</h2>
<p>Bella Villa 5, Ölüdeniz ve Hisarönü bölgesinde yer almaktadır. 4 yatak odası ile 8 kişilik kalabalık aileler ve arkadaş grupları için tasarlanmış geniş bahçeli, havuzlu ve konforlu bir villadır.</p>
<h2>Villa Özellikleri ve Olanaklar</h2>
<ul>
<li>10m x 4m ebatlarında geniş özel yüzme havuzu</li>
<li>4 adet konforlu yatak odası ve 3 banyo (8 kişi kapasiteli)</li>
<li>Ölüdeniz plajına araçla 5 dakika mesafe</li>
<li>Barbekü alanı, geniş bahçe veranası, Wi-Fi, klima</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0005-4000-a000-000000000005'::uuid, 1, 'Bella Villa 5 - Fethiye Hisarönü''nde Lüks ve Geniş Müstakil Villa | Villa Kiralama', 'Kalabalık Aileler İçin Geniş Bahçeli ve Özel Havuzlu Tatil Evi
Bella Villa 5, Ölüdeniz ve Hisarönü bölgesinde yer almaktadır. 4 yatak odası ile 8 kişi...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 2, 'Bella Villa 5 - Spacious Private Pool Villa Near Oludeniz', '<h2>Large Garden & Private Pool Villa for Up to 8 Guests</h2>
<p>Bella Villa 5 is situated in the Hisaronu / Oludeniz region. Featuring 4 bedrooms, a spacious garden, and a private pool, it accommodates up to 8 guests comfortably.</p>
<h2>Features</h2>
<ul>
<li>10m x 4m private swimming pool and sun terrace</li>
<li>4 spacious bedrooms and 3 bathrooms (Capacity 8 guests)</li>
<li>Only 5-minute drive to famous Oludeniz beach</li>
</ul>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0005-4000-a000-000000000005'::uuid, 2, 'Bella Villa 5 - Spacious Private Pool Villa Near Oludeniz | Villa Rental', 'Large Garden & Private Pool Villa for Up to 8 Guests
Bella Villa 5 is situated in the Hisaronu / Oludeniz region. Featuring 4 bedrooms, a spacious gar...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 5, 'Bella Villa 5 - Große Villa mit Privatpool nahe Ölüdeniz', '<h2>Geräumige Ferienvilla für 8 Personen nahe Ölüdeniz</h2>
<p>Die Bella Villa 5 bietet viel Platz mit 4 Schlafzimmern und großem Pool nahe Ölüdeniz.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0005-4000-a000-000000000005'::uuid, 5, 'Bella Villa 5 - Große Villa mit Privatpool nahe Ölüdeniz | Villa Rental', 'Geräumige Ferienvilla für 8 Personen nahe Ölüdeniz
Die Bella Villa 5 bietet viel Platz mit 4 Schlafzimmern und großem Pool nahe Ölüdeniz....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 6, 'Вилла Белла 5 (Bella Villa 5) - Просторная вилла для 8 гостей в Хисароню', '<h2>Просторный дом с большим бассейном и садом для 8 человек</h2>
<p>Bella Villa 5 находится в 5 минутах езды от пляжа Олюдениз с 4 спальнями.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0005-4000-a000-000000000005'::uuid, 6, 'Вилла Белла 5 (Bella Villa 5) - Просторная вилла для 8 гостей в Хисароню | Villa Rental', 'Просторный дом с большим бассейном и садом для 8 человек
Bella Villa 5 находится в 5 минутах езды от пляжа Олюдениз с 4 спальнями....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 7, 'Bella Villa 5 - 厄吕代尼兹附近的宽敞私人泳池别墅', '<h2>带大型花园和私人游泳池的别墅，可容纳 8 位宾客</h2>
<p>Bella Villa 5 位于希萨勒尼/厄吕代尼兹地区，配有 4 间卧室和私人游泳池，适合最多 8 位宾客。</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0005-4000-a000-000000000005'::uuid, 7, 'Bella Villa 5 - 厄吕代尼兹附近的宽敞私人泳池别墅 | Villa Rental', '带大型花园和私人游泳池的别墅，可容纳 8 位宾客
Bella Villa 5 位于希萨勒尼/厄吕代尼兹地区，配有 4 间卧室和私人游泳池，适合最多 8 位宾客。...', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      

        INSERT INTO listing_translations (listing_id, locale_id, title, description)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 8, 'Bella Villa 5 - Spacieuse Villa avec Piscine Privée Près d''Oludeniz', '<h2>Grande Villa avec Jardin et Piscine Privée pour 8 Personnes</h2>
<p>La Bella Villa 5 propose 4 chambres et une grande piscine privée à 5 minutes d''Oludeniz.</p>')
        ON CONFLICT (listing_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
      

        INSERT INTO seo_metadata (entity_type, entity_id, locale_id, title, description, keywords)
        VALUES ('listing', 'b1111111-0005-4000-a000-000000000005'::uuid, 8, 'Bella Villa 5 - Spacieuse Villa avec Piscine Privée Près d''Oludeniz | Villa Rental', 'Grande Villa avec Jardin et Piscine Privée pour 8 Personnes
La Bella Villa 5 propose 4 chambres et une grande piscine privée à 5 minutes d''Oludeniz....', 'kiralik villa, bella villa, ozel havuzlu villa')
        ON CONFLICT (entity_type, entity_id, locale_id)
        DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords;
      
DELETE FROM listing_bedrooms WHERE listing_id = 'b1111111-0005-4000-a000-000000000005'::uuid;

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 0, 'Yatak Odası 1', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 1, 'Yatak Odası 2', '1. Kat', '1 Adet Çift Kişilik Yatak', true);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 2, 'Yatak Odası 3', '2. Kat', '2 Adet Tek Kişilik Yatak', false);
      

        INSERT INTO listing_bedrooms (listing_id, sort_order, name, floor_label, beds_description, ensuite)
        VALUES ('b1111111-0005-4000-a000-000000000005'::uuid, 3, 'Yatak Odası 4', '2. Kat', '2 Adet Tek Kişilik Yatak', false);
      