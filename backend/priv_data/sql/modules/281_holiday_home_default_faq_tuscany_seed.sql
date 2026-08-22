-- Tatil evi vitrin SSS şablonu — yalnızca platform ayarı henüz yoksa ekler.
-- (Pisa / Toskana kırsal villa kiralama sitelerinde sık görülen SSS temalarına
--  uygun Türkçe metinler; ilan bazlı overlay ile genişletilebilir.)

INSERT INTO site_settings (id, organization_id, key, value_json)
SELECT gen_random_uuid(),
       NULL,
       'catalog.holiday_home_default_faq',
       $faq${
  "items": [
    {
      "id": "faq_th_01",
      "question": {"tr": "Giriş ve çıkış saatleri nedir, esnek davranılabilir mi?"},
      "answer": {"tr": "Giriş ve çıkış saatleri ilan sayfasında belirtilir. Talebe göre erken giriş veya geç çıkış, takvim ve temizlik planına bağlı olarak mümkün olabilir; önceden yazmanız gerekir."}
    },
    {
      "id": "faq_th_02",
      "question": {"tr": "Minimum kaç gece konaklamam gerekiyor, kısa kalışlarda ek ücret var mı?"},
      "answer": {"tr": "Minimum konaklama süresi ilan detayında yazar. Bazı mülklerde minimum gecenin altındaki konaklamalar için tek seferlik kısa konaklama ücreti uygulanabilir; tutar ve eşik ilanda açıkça gösterilir."}
    },
    {
      "id": "faq_th_03",
      "question": {"tr": "Rezervasyon iptali nasıl çalışır?"},
      "answer": {"tr": "İptal ve iade koşulları her ilanda ayrı tanımlanır. Rezervasyon öncesi ilgili bölümdeki iptal metnini okuyun; ön ödeme veya depozito koşulları buna bağlıdır."}
    },
    {
      "id": "faq_th_04",
      "question": {"tr": "Hasar depozitosu ne zaman ve nasıl iade edilir?"},
      "answer": {"tr": "Depozito tutarı ilanda belirtilir. Çıkışta mülk kontrol edildikten sonra, hasar veya ek ücret kesintisi yoksa banka kartına veya hesaba iade süreci ev sahibi / tedarikçi politikasına göre tamamlanır."}
    },
    {
      "id": "faq_th_05",
      "question": {"tr": "Temizlik, çarşaf ve havlu dahil mi?"},
      "answer": {"tr": "Çoğu villada çıkış temizliği ve temel çarşaf/havlu seti fiyata dahildir; detaylar ilan açıklamasında yer alır. Ekstra temizlik veya ara temizlik talep ederseniz genelde ayrı ücrete tabidir."}
    },
    {
      "id": "faq_th_06",
      "question": {"tr": "Otopark veya garaj var mı?"},
      "answer": {"tr": "Mülk tipine göre bahçe içi park, ücretsiz sokak parkı veya ücretli park seçenekleri olabilir. Kesin bilgi ilanın ulaşım / park notlarında veya ev sahibi mesajında paylaşılır."}
    },
    {
      "id": "faq_th_07",
      "question": {"tr": "Yerel konaklama vergisi veya benzeri harçlar öder miyim?"},
      "answer": {"tr": "Bazı bölgelerde kişi başı veya gece başı yerel vergiler uygulanır. Söz konusu ücretler çoğu zaman varışta nakit veya kartla tahsil edilir; mümkünse ilan metninde veya rezervasyon onayında belirtilir."}
    },
    {
      "id": "faq_th_08",
      "question": {"tr": "Anahtarı nasıl alacağım, self check-in mümkün mü?"},
      "answer": {"tr": "Birçok evde kodlu kasa, kilit kutusu veya karşılama personeli ile giriş yapılır. Giriş günü ve saatine göre talimatlar rezervasyon onayından sonra veya varış saatinde paylaşılır."}
    },
    {
      "id": "faq_th_09",
      "question": {"tr": "Havuz sezonu ve kuralları nelerdir?"},
      "answer": {"tr": "Açık havuzlar hava tutumuna göre belirli aylarda kullanıma açılır. Çocuklar, dalgalanma ve gece kullanımı gibi kurallar mülk sahibinin güvenlik talimatlarında açıklanır."}
    },
    {
      "id": "faq_th_10",
      "question": {"tr": "Evcil hayvan kabul ediliyor mu?"},
      "answer": {"tr": "Evcil hayvan politikası ilan bazında değişir. İzin verilen mülklerde ek ücret veya depozito istenebilir; rezervasyon öncesi mutlaka teyit edin."}
    },
    {
      "id": "faq_th_11",
      "question": {"tr": "En yakın market, restoran ve tren / otobüs bağlantısı nasıl?"},
      "answer": {"tr": "Kırsal villalarda araç önerilir; Pisa, Lucca ve çevre kasabalara tren veya otobüs ile bağlantı genelde mümkündür. En yakın hizmetler ve süreler ev sahibi rehberinde veya lokasyon açıklamasında özetlenir."}
    },
    {
      "id": "faq_th_12",
      "question": {"tr": "Klima, ısıtma veya havuz ısıtması ek ücretli mi?"},
      "answer": {"tr": "Klimalı odalar ve merkezi ısıtma çoğu mülkte standarttır; tüketime veya sezona göre ek ücret olabilir. Isıtmalı havuzlarda günlük ısıtma ücreti ilan ve fiyat özetinde ayrı satır olarak gösterilir."}
    }
  ]
}$faq$::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM site_settings
  WHERE organization_id IS NULL
    AND key = 'catalog.holiday_home_default_faq'
);
