# Aktarılan Ürünler İçin İçerik ve SEO Standardı

Bu standart otel, villa/tatil evi, yat, aktivite, tur, gemi turu, feribot, araç kiralama, transfer ve uçuş dâhil tüm ürün aktarımları için zorunludur.

## İşlem sırası

1. Sağlayıcının kaynak dili doğru tespit edilir; kaynak metin yanlış dil alanına yazılmaz.
2. Türkçe sürüm, profesyonel bir seyahat editörü tarafından hazırlanmış gibi yazım ve noktalama kurallarına göre düzenlenir.
3. Türkçe içerik doğrulandıktan sonra her aktif vitrin dili için bağımsız ve doğal bir yerelleştirme hazırlanır.
4. Her dil için benzersiz SEO başlığı, meta açıklaması ve doğal anahtar kelimeler üretilir.
5. Kalite kontrolünden geçmeyen dil sürümü tamamlanmış kabul edilmez ve yeniden işleme kuyruğunda kalır.

## Zorunlu kalite kuralları

- Başlık, açıklama ve ziyaretçiye gösterilen diğer detaylar hedef dilde olmalıdır.
- Açıklama kısa paragraflar, anlamlı başlıklar ve uygun listelerle kolay taranmalıdır; tek parça metin kabul edilmez.
- Oda ve pansiyon tipleri, olanaklar, konum, program, dâhil/hariç hizmetler, kurallar ve önemli bilgiler doğal hedef dilde yazılmalıdır.
- Özel adlar ile doğrulanabilir fiyat, tarih, kapasite, ölçü, rota, konum ve hizmet bilgileri korunmalıdır.
- Bilgi uydurulamaz; abartılı reklam dili, tekrar ve anahtar kelime doldurma kullanılamaz.
- Görünür HTML entity, bozuk karakter, güvensiz HTML ve başka dilden kalan metin bulunamaz.
- İzin verilen açıklama etiketleri: `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<strong>`.

Bu kurallar `backend/src/travel/ai/listing_content_http.gleam` içindeki Türkçe editör, çeviri ve SEO aşamalarında ortak zorunlu standart olarak uygulanır.

