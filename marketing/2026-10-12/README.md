# Rezervasyon Yap — kampanya dosyaları

Yedi kategori: otel, tatil evi, yat, tur, gemi turu, Club Med ve aktivite.
Her kategori için planlanan ortalama günlük bütçe 1.000 TRY; toplam 7.000 TRY.
Başlangıç hedefi Türkiye'de bulunan kullanıcılar ve Türkçe reklamlar. Diğer aktif
vitrin dilleri için metinler ayrıca hazırlanmıştır: en, de, ru, zh ve fr.

## Dosyalar

- `campaigns.json`: kategori bazında altı dilde 15 kısa başlık, 4 açıklama,
  uzun başlık, duyarlı reklam başlıkları, sosyal medya metni ve CTA.
- `assets/*.png`: yedi ayrı editoryal illüstrasyon. Belirli bir tesisin,
  yatın veya Club Med işletmesinin gerçek fotoğrafı olarak kullanılamaz.
- `preview-*.html`: arama, yatay, kare ve dikey reklam tasarım önizlemeleri.
  Kare/dikey tasarımlar HTML önizlemeleridir; bağımsız PNG dışa aktarımları değildir.
- `google-ads-search-tr.csv`: altı kategori için duraklatılmış arama reklamı
  aktarım dosyası. Club Med'in doğrulanmış hedef sayfası henüz bulunmadığından
  bu aktarımda yer almaz. Dosya henüz Google Ads'e yüklenmemiştir.

## Yayın durumu

Bu dosyalar hazırlık paketidir. Tamamı Google Ads'te kurulmuş ya da yayına
alınmış değildir. Otel için Google Ads taslağı oluşturma işlemi başlatılmıştır;
diğer kampanyaların hesap içinde oluşturulması beklemektedir.
Hedef URL'ler, canlı envanter ve dönüşüm ölçümü doğrulanmadan reklamlar çalıştırılmaz.
Club Med için mevcut gerçek ilanlar ve hedef sayfa ayrıca doğrulanmalıdır.
İndirim oranı, garanti veya dahil hizmet iddiası eklenmemiştir.

## Üretim ve doğrulama

Metinler `node build-campaigns.mjs` ile tüm dil alanları ve Google Ads karakter
sınırları için doğrulanır; `node build-preview.mjs` önizlemeleri ve CSV'yi üretir.
Çince karakterler uzunluk hesabında iki karakter olarak değerlendirilir.
Görseller imagegen becerisi ve yerleşik image_gen aracıyla üretilmiştir.

Ortak prompt: “Create one polished landscape advertising background for
Rezervasyon Yap [category] travel campaign. Editorial illustration of [scene].
Warm sunlight, navy and turquoise palette, tasteful textured illustrated shapes,
clear negative space on left for later typography. No text, no logos, no prices,
no identifiable actual property. Clearly illustrative, not a property photograph.
1.91:1 wide composition.”

Sahneler: Akdeniz otel avlusu ve havuz; bahçeli tatil villası; turkuaz denizde
yelkenli; tarihî sokaklar ve dağ rotaları; Akdeniz limanında gemi; soyut sahil
tatil tesisi ve rekreasyon; kano, yürüyüş ve şehir gezisi.

Kaynaklar: [Duyarlı arama reklamları](https://support.google.com/google-ads/answer/7684791),
[Duyarlı görüntülü reklamlar](https://support.google.com/google-ads/answer/7005917).
