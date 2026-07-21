import type { LegalFaqBundle } from './types'

export const tr: LegalFaqBundle = {
  metaTitle: 'Sıkça Sorulan Sorular | Rezervasyon Yap',
  metaDescription:
    'Rezervasyon Yap ve Mamon Plus Travel Agency için rezervasyon, ödeme, iptal, otel, villa, tur, yat, ulaşım, vize, gizlilik ve iş ortaklığı soruları.',
  pageTitle: 'Yasal ve operasyonel sıkça sorulan sorular',
  pageLead:
    '{brand} üzerinden seyahat planlarken şirket kimliği, rezervasyon akışı, ödeme, iptal, konaklama, tur, ulaşım, vize, hesap güvenliği ve kişisel veriler hakkında bilmeniz gerekenleri bu sayfada topladık.',
  categoriesHeading: 'Konu başlıkları',
  backToCategories: 'Kategorilere dön',
  openCategory: 'Kategoriyi aç',
  questionsCount: '{count} soru',
  categories: [
    {
      id: 'general',
      title: 'Genel bilgiler ve şirket kimliği',
      description:
        '{brand}, seyahat ürünlerini güvenli ve şeffaf biçimde sunan {agency} markasının çevrim içi rezervasyon platformudur.',
      items: [
        {
          q: '{brand} hangi şirket tarafından işletiliyor?',
          a: '{brand}, {legalName} tarafından işletilir. Seyahat acentesi faaliyetleri {agency} adıyla yürütülür ve acente kaydı {tursab} olarak yapılmıştır. Merkez adresimiz {address}; resmi iletişim kanallarımız {email}, {phone}, {phone2} ve ofis hatlarımız {officePhones} üzerinden kullanılabilir.',
        },
        {
          q: 'Sitedeki bilgiler resmi teklif yerine geçer mi?',
          a: 'Sitedeki fiyat, müsaitlik, program ve görseller rezervasyon talebi anındaki sağlayıcı verilerine ve editoryal kontrole dayanır. Kesin hizmet kapsamı, ödeme koşulları ve varsa özel notlar rezervasyon onayı veya sözleşme ekranında netleşir. Tereddüt halinde /contact sayfasından yazılı teyit almanızı öneririz.',
        },
        {
          q: '{agency} hangi seyahat ürünleri için aracılık yapar?',
          a: 'Otel, villa, paket tur, günübirlik tur, yat kiralama, transfer, uçak, feribot ve talep edilen diğer seyahat hizmetlerinde aracılık veya organizasyon hizmeti verilebilir. Her ürünün tedarikçisi, operasyon modeli ve iptal şartı farklı olabilir. Bu nedenle ürün sayfasındaki açıklamalar ile /legal/terms ve /legal/cancellation metinleri birlikte okunmalıdır.',
        },
        {
          q: 'Rezervasyon öncesinde acenteyle nasıl iletişime geçebilirim?',
          a: 'Sorularınızı {email} adresine yazabilir, rezervasyon hatlarımız {phone} ve {phone2} üzerinden bize ulaşabilir veya /contact formunu kullanabilirsiniz. Yoğun dönemlerde yazılı talepler işlem sırasına göre cevaplanır. Acil seyahat tarihli taleplerde ürün adı, tarih, kişi sayısı ve iletişim numarası paylaşmanız süreci hızlandırır.',
        },
        {
          q: 'Platformdaki içerikler nasıl hazırlanır?',
          a: 'Ürün metinleri sağlayıcı bilgileri, sözleşme şartları ve editoryal kontroller kullanılarak hazırlanır. Ziyaretçiye gösterilen metinlerin anlaşılır, güncel ve yanıltıcı olmamasına özen gösterilir; ancak tesis, hava yolu, tekne sahibi veya yerel otorite kaynaklı değişiklikler olabilir. Önemli kararlar öncesinde güncel müsaitlik ve kapsam teyidi alınmalıdır.',
        },
        {
          q: 'Hangi hukuki metinleri incelemeliyim?',
          a: 'Genel kullanım ve satış koşulları için /legal/terms, iptal ve iade esasları için /legal/cancellation, kişisel veriler için /legal/privacy ve çerez tercihleri için /legal/cookies sayfalarını inceleyebilirsiniz. Bu metinler ürün sayfalarındaki özel koşullarla birlikte uygulanır. Özel koşul ile genel metin arasında fark varsa, ilgili ürün için açıkça bildirilen özel koşul öncelikli olabilir.',
        },
      ],
    },
    {
      id: 'booking',
      title: 'Rezervasyon süreci',
      description:
        'Arama, teklif, ön onay, ödeme ve kesin rezervasyon aşamalarında hangi adımların izlendiğini açıklar.',
      items: [
        {
          q: 'Rezervasyon nasıl oluşturulur?',
          a: 'Seçtiğiniz ürün için tarih, kişi sayısı, oda veya hizmet tipi gibi bilgileri girerek talep oluşturabilirsiniz. Sistem uygunluk ve fiyat bilgisini gösterir; bazı ürünlerde acente veya sağlayıcı onayı gerekebilir. Ödeme veya ön ödeme tamamlandığında, kesinleşen rezervasyon bilgileri kayıtlı iletişim adreslerinize iletilir.',
        },
        {
          q: 'Her talep otomatik olarak kesin rezervasyon mudur?',
          a: 'Hayır. Özellikle villa, yat, grup turu, özel transfer ve dinamik fiyatlı konaklamalarda talep önce müsaitlik kontrolüne alınabilir. Kesin rezervasyon, ödeme koşulları yerine getirildiğinde ve acente tarafından onaylandığında oluşur. Onay verilmeden yapılan ulaşım veya yan hizmet planları müşterinin kendi riskindedir.',
        },
        {
          q: 'Rezervasyon bilgilerimi nasıl kontrol etmeliyim?',
          a: 'Ad-soyad, kimlik veya pasaport bilgisi, tarih, kişi sayısı, yaş grupları, oda tipi ve özel talepler rezervasyon öncesinde dikkatle kontrol edilmelidir. Hatalı veya eksik bilgi, girişte ek ücret, hizmet reddi veya taşıyıcı kuralı nedeniyle işlem yapılamaması sonucunu doğurabilir. Yanlışlık fark ederseniz hemen {email} adresine yazın.',
        },
        {
          q: 'Özel talepler garanti edilir mi?',
          a: 'Bebek yatağı, bağlantılı oda, yüksek kat, erken giriş, özel menü, tekne rotası veya transfer bekleme süresi gibi talepler sağlayıcıya iletilir. Sağlayıcı yazılı olarak garanti vermedikçe bu talepler bağlayıcı hizmet unsuru sayılmaz. Ücretli veya müsaitliğe bağlı talepler için ek onay alınması gerekebilir.',
        },
        {
          q: 'Rezervasyon belgelerim ne zaman gönderilir?',
          a: 'Kesinleşen rezervasyonlarda voucher, sözleşme özeti, ödeme bilgisi veya operasyon notları elektronik ortamda paylaşılır. Bazı hizmetlerde nihai buluşma noktası, rehber bilgisi veya tekne kaptanı iletişimi seyahate yakın tarihte iletilebilir. Gelen belgeleri saklamanız ve hizmet başlangıcında yanınızda bulundurmanız gerekir.',
        },
        {
          q: 'Rezervasyonumu değiştirebilir miyim?',
          a: 'Tarih, isim, kişi sayısı veya hizmet kapsamı değişiklikleri ürün kurallarına, sağlayıcı onayına ve müsaitliğe bağlıdır. Değişiklik ek ücret, fiyat farkı veya iptal şartlarının yeniden uygulanması sonucunu doğurabilir. Talebinizi mümkün olduğunca erken ve yazılı olarak iletmeniz hak kaybı riskini azaltır.',
        },
      ],
    },
    {
      id: 'payment',
      title: 'Ödeme, güvenlik ve fatura',
      description:
        'Ödeme yöntemleri, tahsilat, kur farkı, fatura ve güvenli işlem konularındaki temel cevapları içerir.',
      items: [
        {
          q: 'Hangi ödeme yöntemleri kullanılabilir?',
          a: 'Ürüne göre kredi kartı, banka havalesi/EFT, sanal POS, taksitli ödeme veya acente tarafından bildirilen güvenli ödeme kanalları kullanılabilir. Ödeme yöntemi ve vade, ürün sayfasında veya rezervasyon onayında belirtilir. Ödeme kanalı dışında kişisel hesaba veya doğrulanmamış bağlantıya ödeme yapılmamalıdır.',
        },
        {
          q: 'Ön ödeme ve kalan ödeme nasıl işler?',
          a: 'Bazı rezervasyonlarda hizmeti bağlamak için ön ödeme alınır, kalan tutar ise belirlenen tarihte veya girişte ödenir. Kalan ödeme tarihi kaçırılırsa rezervasyon iptal şartlarına göre riske girebilir. Ödeme planı yazılı onayda yer aldığından, takvim hatırlatması oluşturmanız önerilir.',
        },
        {
          q: 'Fiyatlar hangi para biriminde tahsil edilir?',
          a: 'Ürün fiyatı Türk lirası veya ilgili hizmetin para birimi üzerinden gösterilebilir. Dövizli ürünlerde tahsilat günü kuru, banka komisyonu veya kart kuruluşu uygulaması nedeniyle ek fark doğabilir. Kesin tahsilat para birimi ödeme ekranında veya acente onayında açıkça belirtilir.',
        },
        {
          q: 'Fatura veya makbuz alabilir miyim?',
          a: 'Faturalandırma için ad-soyad veya şirket unvanı, T.C./vergi numarası, vergi dairesi ve adres bilgilerinin doğru paylaşılması gerekir. Aracılık edilen ürünlerde hizmet sağlayıcı faturası ile acente hizmet bedeli ayrı düzenlenebilir. Fatura talebinizi ödeme aşamasında veya gecikmeden {email} adresine iletmelisiniz.',
        },
        {
          q: 'Ödeme güvenliği nasıl sağlanır?',
          a: 'Kart işlemleri yetkili ödeme altyapıları üzerinden yürütülür; kart numarası gibi hassas bilgiler acente tarafından düz metin olarak talep edilmez. Şüpheli bağlantı, farklı alıcı adı veya olağan dışı ödeme isteği görürseniz işlem yapmadan önce {phone} numarasından doğrulama alın. Hesap güvenliği için tek kullanımlık banka şifrelerinizi kimseyle paylaşmayın.',
        },
        {
          q: 'Ödeme tamamlandıktan sonra fiyat değişir mi?',
          a: 'Kesin rezervasyon ve tahsilat tamamlandıktan sonra aynı hizmet kapsamı için fiyat sabitlenir. Ancak müşteri kaynaklı değişiklikler, kişi sayısı farkı, vergi/harç artışı, taşıyıcı ücretleri veya sağlayıcının zorunlu ek hizmetleri fiyatı etkileyebilir. Bu durumlarda fark ve gerekçe yazılı olarak paylaşılır.',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'İptal, iade ve mücbir sebep',
      description:
        'Paket tur, otel, villa ve diğer hizmetlerde iptal süreleri, no-show ve zorunlu değişiklik esaslarını özetler.',
      items: [
        {
          q: 'Paket turlarda 30 günlük iptal kuralı nedir?',
          a: 'Paket turlarda genel ilke olarak hareket tarihinden en az 30 gün önce yapılan yazılı iptal taleplerinde, sözleşmedeki zorunlu giderler ve varsa tahsil edilmiş kesintiler düşülerek iade değerlendirilir. 30 günden daha kısa sürede yapılan iptallerde tedarikçi, taşıyıcı ve sözleşme koşulları daha yüksek kesinti öngörebilir. Detaylı hüküm için /legal/cancellation sayfası esas alınır.',
        },
        {
          q: 'Otellerde 15/7/3 gün kademesi nasıl uygulanır?',
          a: 'Otel iptallerinde tesis türü, sezon, kampanya ve özel dönemlere göre 15, 7 veya 3 gün öncesine kadar daha esnek koşullar uygulanabilir. Bu sürelerden sonra ilk gece, belirli oran veya toplam bedel kesintisi gündeme gelebilir. İadesiz, erken rezervasyon veya özel kampanya fiyatlarında farklı ve daha sıkı koşullar geçerli olabilir.',
        },
        {
          q: 'No-show durumunda ne olur?',
          a: 'No-show, müşterinin hizmet başlangıcında haber vermeden tesise, tura, tekneye, araca veya taşıyıcıya katılmaması anlamına gelir. Bu durumda sağlayıcı hizmeti kullanılmış sayabilir ve iade hakkı doğmayabilir. Gecikme veya katılamama riski oluştuğunda acenteye ve hizmet sağlayıcıya mümkün olan en kısa sürede yazılı bilgi verilmelidir.',
        },
        {
          q: 'İade ne kadar sürede yapılır?',
          a: 'İade tutarı, iptal koşulları ve sağlayıcı mutabakatı netleştikten sonra ödeme yapılan kanala göre işleme alınır. Banka ve kart kuruluşlarının işlem süreleri acentenin kontrolü dışında olabilir. Yurt dışı kartları, taksitli işlemler veya dövizli tahsilatlarda iadenin karta yansıması daha uzun sürebilir.',
        },
        {
          q: 'Mücbir sebep iptal hakkı verir mi?',
          a: 'Doğal afet, salgın, resmi seyahat yasağı, güvenlik kararı, liman kapanması veya uçuş iptali gibi öngörülemeyen durumlar ürünün niteliğine göre değerlendirilir. Mücbir sebep her zaman otomatik tam iade anlamına gelmez; taşıyıcı, otel, yerel otorite ve sözleşme hükümleri birlikte uygulanır. Alternatif tarih, kredi hakkı veya kısmi iade seçenekleri yazılı olarak sunulabilir.',
        },
        {
          q: 'İptal talebimi nasıl iletmeliyim?',
          a: 'İptal veya değişiklik talepleri mutlaka yazılı olarak {email} adresine ya da /contact formuna iletilmelidir. Talepte rezervasyon numarası, ad-soyad, hizmet tarihi ve iptal gerekçesi yer almalıdır. Telefon görüşmeleri bilgilendirme sağlayabilir, ancak işlem tarihi açısından yazılı kayıt esas alınır.',
        },
      ],
    },
    {
      id: 'hotels',
      title: 'Oteller ve konaklama',
      description:
        'Otel giriş-çıkış saatleri, oda kullanımı, çocuk politikaları ve tesis kurallarına ilişkin cevaplar.',
      items: [
        {
          q: 'Otele giriş ve çıkış saatleri nasıldır?',
          a: 'Genellikle giriş saati öğleden sonra, çıkış saati ise sabah veya öğle öncesidir; kesin saatler tesis politikasına göre değişir. Erken giriş ve geç çıkış ancak müsaitlik ve tesis onayıyla mümkündür. Ücretli olabilecek bu talepler rezervasyonda not edilse bile garanti sayılmaz.',
        },
        {
          q: 'Oda tipi ve yatak düzeni garanti edilir mi?',
          a: 'Satın alınan oda tipi garanti edilir; yatak tipi, manzara, kat veya bağlantılı oda gibi detaylar tesis tarafından müsaitlik dahilinde karşılanır. Ürün sayfasında açıkça satılan bir özellik varsa rezervasyon kapsamına dahildir. Girişte farklı oda verilirse durum hemen resepsiyon ve acenteye bildirilmelidir.',
        },
        {
          q: 'Çocuk yaşı ve ek kişi bilgileri neden önemlidir?',
          a: 'Oteller çocuk yaşına, bebek yatağına, ek yatağa ve maksimum kapasiteye göre farklı fiyat veya kabul kuralı uygulayabilir. Yanlış yaş beyanı girişte fiyat farkı veya oda değişikliği gerektirebilir. Rezervasyon sırasında tüm misafirlerin giriş tarihindeki yaşları doğru verilmelidir.',
        },
        {
          q: 'Otel konsepti ve dahil hizmetler değişebilir mi?',
          a: 'Açık büfe, a la carte restoran, plaj, havuz, spa, animasyon veya sezonluk hizmetler tesis doluluğu, hava koşulu ve yerel düzenlemelere göre değişebilir. Ürün sayfasındaki konsept seyahat tarihindeki operasyon şartlarıyla birlikte yorumlanır. Kritik bir hizmet sizin için belirleyiciyse rezervasyon öncesi yazılı teyit alın.',
        },
        {
          q: 'Evcil hayvan, sigara ve tesis kuralları nasıl uygulanır?',
          a: 'Evcil hayvan kabulü, sigara kullanımı, yaş sınırı, depozito, kıyafet kuralı ve misafir kabulü gibi hükümler tesisin kendi kurallarıdır. Acentenin bu kuralları değiştirme yetkisi yoktur. Kurala aykırılık hizmetin reddi, ek temizlik ücreti veya depozito kesintisi doğurabilir.',
        },
        {
          q: 'Otel ile ilgili sorun yaşarsam ne yapmalıyım?',
          a: 'Sorun yaşandığında öncelikle tesis resepsiyonuna aynı gün başvurulmalı ve çözüm talep edilmelidir. Çözüm alınamazsa fotoğraf, belge ve kısa açıklamayla {email} adresine yazın veya rezervasyon hattını arayın. Seyahat bittikten sonra ilk kez bildirilen sorunlarda yerinde çözüm imkanı ortadan kalktığı için değerlendirme sınırlı kalabilir.',
        },
      ],
    },
    {
      id: 'villas',
      title: 'Villalar ve özel konaklama',
      description:
        'Villa kiralamalarında depozito, giriş prosedürü, hasar, kapasite ve özel ev kuralları hakkında bilgiler.',
      items: [
        {
          q: 'Villa rezervasyonlarında depozito neden alınır?',
          a: 'Villa, apart ve özel konaklama ürünlerinde hasar, kayıp eşya, olağan dışı temizlik veya enerji kullanımını güvence altına almak için depozito alınabilir. Depozito tutarı ve ödeme şekli ürün sayfasında veya voucher içinde belirtilir. Çıkış kontrolünde sorun yoksa sağlayıcının kuralına göre iade edilir.',
        },
        {
          q: 'Villaya giriş ve anahtar teslimi nasıl yapılır?',
          a: 'Giriş saati, buluşma noktası ve anahtar teslimi villa sahibi veya operasyon ekibi tarafından organize edilir. Kimlik bildirimi, kalan ödeme veya depozito işlemleri girişte tamamlanabilir. Gecikme durumunda operasyon ekibine önceden haber verilmesi gerekir; geç saat girişleri ek ücrete tabi olabilir.',
        },
        {
          q: 'Villa kapasitesini aşabilir miyim?',
          a: 'İlan edilen maksimum kişi kapasitesi, güvenlik, ruhsat ve konaklama kuralları nedeniyle aşılamaz. Çocuklar ve bebekler dahil tüm misafirler rezervasyonda bildirilmelidir. Bildirilmeyen kişi tespit edilirse ek ücret, hizmet reddi veya sözleşme feshi gündeme gelebilir.',
        },
        {
          q: 'Havuz, bahçe ve teknik arızalarda sorumluluk nasıl işler?',
          a: 'Özel havuz, jakuzi, bahçe, internet, klima veya elektrik-su sistemlerinde arıza oluşabilir. Sağlayıcıya zamanında bildirim yapılırsa makul sürede onarım veya alternatif çözüm aranır. Bölgesel kesinti, hava koşulu veya kamu altyapısı kaynaklı sorunlarda acente tazminat garantisi veremez.',
        },
        {
          q: 'Villa iptal şartları otellerden farklı mı?',
          a: 'Evet. Villalar sınırlı stoklu ve kişiye ayrılan ürünler olduğundan ön ödeme çoğu durumda iadesiz veya daha sıkı koşullara bağlı olabilir. Sezon, giriş tarihi ve ev sahibinin sözleşmesi iptal bedelini belirler. Rezervasyon öncesinde /legal/cancellation metnini ve ürünün özel şartlarını birlikte inceleyin.',
        },
        {
          q: 'Villada parti, etkinlik veya dış misafir kabul edilebilir mi?',
          a: 'Parti, yüksek sesli etkinlik, ticari çekim, düğün hazırlığı veya dış misafir kabulü ev sahibi onayına bağlıdır. Yazılı izin olmadan yapılan kullanımlar komşuluk, güvenlik ve ruhsat kurallarını ihlal edebilir. Böyle bir planınız varsa rezervasyon öncesinde kapsamı açıkça bildirmeniz gerekir.',
        },
      ],
    },
    {
      id: 'tours',
      title: 'Turlar ve aktiviteler',
      description:
        'Paket turlar, günübirlik geziler, rehberlik, minimum katılımcı ve program değişiklikleriyle ilgili sorular.',
      items: [
        {
          q: 'Tur programı kesin midir?',
          a: 'Tur programları planlanan rota, ziyaret noktaları ve hizmet kapsamını gösterir. Hava, trafik, resmi izin, müze kapanışı, güvenlik veya operasyonel nedenlerle sıralama ve süreler değişebilir. Ana hizmet kapsamını etkileyen önemli değişiklikler mümkün olduğunca önceden bildirilir.',
        },
        {
          q: 'Minimum katılımcı sayısı sağlanmazsa ne olur?',
          a: 'Bazı grup turları minimum katılımcı sayısına bağlıdır. Yeterli katılım oluşmazsa tur iptal edilebilir, farklı tarih önerilebilir veya fiyat farkıyla özel tur seçeneği sunulabilir. İptal acente kaynaklıysa tahsil edilen uygun tutarlar sözleşme koşullarına göre iade edilir.',
        },
        {
          q: 'Rehberlik dili ve buluşma noktası nasıl belirlenir?',
          a: 'Rehberlik dili ürün sayfasında veya rezervasyon onayında belirtilir. Buluşma noktası, saat ve iletişim bilgisi voucher içinde veya turdan önce paylaşılır. Misafirin buluşma saatinde hazır bulunmaması no-show olarak değerlendirilebilir.',
        },
        {
          q: 'Tura dahil olmayan harcamalar nelerdir?',
          a: 'Kişisel harcamalar, bazı müze girişleri, içecekler, isteğe bağlı aktiviteler, bahşişler ve programda dahil olduğu açıkça yazılmayan hizmetler genellikle hariçtir. Dahil-hariç listesi ürünün parçasıdır ve dikkatle okunmalıdır. Yerel ödemeler nakit veya farklı para birimi gerektirebilir.',
        },
        {
          q: 'Sağlık, yaş veya fiziksel uygunluk koşulları var mı?',
          a: 'Yürüyüş, tekne, dalış, safari, rafting veya uzun transfer içeren turlarda yaş, sağlık ve hareket kabiliyeti koşulları olabilir. Hamilelik, kronik hastalık, engellilik veya özel destek ihtiyacı rezervasyon öncesinde bildirilmelidir. Uygun olmayan katılımda sağlayıcı güvenlik gerekçesiyle hizmeti reddedebilir.',
        },
        {
          q: 'Paket tur sözleşmesini ne zaman görürüm?',
          a: 'Paket tur niteliğindeki hizmetlerde temel hizmetler, fiyat, iptal şartları ve taraf bilgileri satış öncesi veya onay aşamasında paylaşılır. Belgeleri okumadan ödeme yapmamanız ve anlamadığınız noktaları yazılı sormanız önemlidir. Genel hükümler için /legal/terms ve /legal/cancellation sayfaları da geçerlidir.',
        },
      ],
    },
    {
      id: 'yachts',
      title: 'Yat, tekne ve mavi yolculuk',
      description:
        'Yat kiralama, rota, hava koşulları, kaptan kararları, liman ve depozito süreçlerini açıklar.',
      items: [
        {
          q: 'Yat rotası rezervasyonla birlikte kesinleşir mi?',
          a: 'Rota, kiralanan tekne, süre, liman, hava koşulları ve yerel izinlere göre planlanır. Kaptan güvenlik nedeniyle koy, liman veya seyir sırasını değiştirme yetkisine sahiptir. Rezervasyon öncesi özel rota beklentilerinizi bildirmeniz, uygun tekne ve süre seçimi için önemlidir.',
        },
        {
          q: 'Hava koşulları nedeniyle tur değişirse iade yapılır mı?',
          a: 'Deniz ve hava güvenliği kaptan ve yetkili otoritelerin değerlendirmesine bağlıdır. Kötü hava nedeniyle rota kısalabilir, alternatif koylara geçilebilir veya çıkış ertelenebilir. İade, erteleme veya alternatif hizmet hakkı ürün sözleşmesine ve fiilen sağlanan hizmete göre belirlenir.',
        },
        {
          q: 'Yat kiralamada neler dahildir?',
          a: 'Tekne, kaptan veya mürettebat, yakıt limiti, temizlik, yemek, içecek, liman vergileri ve su sporları gibi kalemler tekneye göre değişir. Dahil olan ve olmayan hizmetler teklif veya ürün sayfasında belirtilir. Belirsiz kalemler için ödeme öncesinde yazılı teyit alınmalıdır.',
        },
        {
          q: 'Depozito ve hasar sorumluluğu nasıl uygulanır?',
          a: 'Bareboat veya özel kiralamalarda hasar depozitosu istenebilir. Tekne ekipmanına zarar, kayıp malzeme, olağan dışı temizlik veya sözleşmeye aykırı kullanım depozitodan mahsup edilebilir. Teslim ve iade kontrollerine katılmanız, varsa notları yazılı kayda geçirmeniz gerekir.',
        },
        {
          q: 'Teknede dışarıdan yiyecek-içecek getirebilir miyim?',
          a: 'Dışarıdan yiyecek-içecek, catering, menü değişikliği veya özel kutlama talepleri tekne işletmecisinin politikasına bağlıdır. Bazı teknelerde servis bedeli, temizlik ücreti veya menü zorunluluğu olabilir. Alerji ve beslenme tercihleri rezervasyon öncesi bildirilmelidir.',
        },
        {
          q: 'Liman, pasaport ve yurt dışı çıkış işlemlerinde kim sorumludur?',
          a: 'Yurt dışı rotalı mavi yolculuklarda pasaport, vize, çıkış harcı ve liman işlemleri misafirin sorumluluğundadır; acente operasyonel bilgilendirme sağlayabilir. Eksik belge nedeniyle çıkış yapılamaması müşteri kaynaklı sayılabilir. Güncel resmi kurallar seyahat öncesi kontrol edilmelidir.',
        },
      ],
    },
    {
      id: 'transport',
      title: 'Uçuş, feribot, transfer ve taşıma',
      description:
        'Taşıyıcı kuralları, bilet değişikliği, bagaj, gecikme, transfer bekleme ve operasyon bilgileri.',
      items: [
        {
          q: 'Uçak ve feribot biletlerinde hangi kurallar geçerlidir?',
          a: 'Uçak, feribot, otobüs ve benzeri taşıma hizmetlerinde ilgili taşıyıcının tarife, bagaj, isim değişikliği, iptal ve iade kuralları uygulanır. Acente bu kuralları değiştiremez; sadece işlem ve bilgilendirme desteği verebilir. Bilet kesildikten sonra ceza veya hizmet bedeli oluşabilir.',
        },
        {
          q: 'Bilette isim hatası varsa ne yapmalıyım?',
          a: 'İsimler kimlik veya pasaportla aynı olmalıdır. Harf hatası, ikinci ad eksikliği veya soyadı değişikliği taşıyıcı tarafından kabul edilmeyebilir. Hata fark edildiğinde derhal {email} adresine yazılmalı; düzeltme mümkünse taşıyıcı ücreti ve kuralına göre yapılır.',
        },
        {
          q: 'Transfer hizmetinde bekleme süresi nasıl hesaplanır?',
          a: 'Transferlerde bekleme süresi ürün tipine, havalimanı geliş saatine, uçuş takibine ve özel araç paylaşımına göre belirlenir. Uçuş gecikmelerinde operasyon ekibi bilgilendirilmeli, uçuş numarası doğru verilmelidir. Belirlenen sürenin aşılması ek ücret veya hizmet kaybı doğurabilir.',
        },
        {
          q: 'Bagaj ve özel ekipman kabulü garanti mi?',
          a: 'Bagaj hakkı taşıyıcı veya transfer aracının kapasitesine bağlıdır. Bebek arabası, spor ekipmanı, tekerlekli sandalye, evcil hayvan veya fazla bagaj önceden bildirilmelidir. Bildirilmeyen özel ekipman hizmet reddi veya ek araç/ücret gerektirebilir.',
        },
        {
          q: 'Taşıyıcı gecikmesi veya iptali halinde acentenin rolü nedir?',
          a: 'Taşıyıcının gecikmesi, sefer iptali, rota değişikliği veya operasyonel aksaması ilgili taşıyıcının sorumluluk kurallarına tabidir. Acente alternatiflerin araştırılması, sağlayıcıyla iletişim ve belge paylaşımı konusunda destek verir. Ek konaklama, yeni bilet veya transfer maliyetleri ürün şartlarına göre değerlendirilir.',
        },
        {
          q: 'Özel transferde güzergah değişikliği yapabilir miyim?',
          a: 'Özel transferler belirlenen başlangıç ve varış noktası için fiyatlandırılır. Ara durak, rota uzatma, bekleme veya farklı adrese geçiş ek ücret ve operasyon onayı gerektirebilir. Sürücüden doğrudan sözleşme dışı hizmet istemek yerine acente operasyon hattına bilgi verilmelidir.',
        },
      ],
    },
    {
      id: 'visa',
      title: 'Vize, pasaport ve seyahat belgeleri',
      description:
        'Vize danışmanlığı sınırları, konsolosluk kararı, belge sorumluluğu ve ülkeye giriş kuralları.',
      items: [
        {
          q: '{agency} vize merkezi midir?',
          a: '{agency} bir seyahat acentesidir; açıkça vize ürünü satılmadıkça resmi vize başvuru merkezi veya konsolosluk temsilcisi gibi hareket etmez. Seyahat ürünleriyle bağlantılı belge hazırlığı konusunda genel bilgilendirme yapılabilir. Nihai karar her zaman konsolosluk, sınır polisi veya yetkili resmi makam tarafından verilir.',
        },
        {
          q: 'Vize reddinde tur veya bilet iadesi yapılır mı?',
          a: 'Vize reddi, ürünün iptal koşullarını otomatik olarak ortadan kaldırmaz. Otel, tur, bilet veya taşıyıcı kuralları ne öngörüyorsa o uygulanır; iadesiz hizmetlerde kesinti oluşabilir. Vize riski bulunan seyahatlerde esnek iptal şartlı ürün seçmeniz ve başvuruyu erken yapmanız önerilir.',
        },
        {
          q: 'Pasaport geçerlilik süresi kimin sorumluluğundadır?',
          a: 'Pasaportun geçerlilik süresi, boş sayfa durumu, yıpranma, eski tip belge, çocuk muvafakati ve kimlik uygunluğu yolcunun sorumluluğundadır. Birçok ülke seyahat bitişinden sonra en az 6 ay geçerli pasaport isteyebilir. Güncel kuralları resmi kaynaklardan kontrol etmeden rezervasyonu kesinleştirmeyin.',
        },
        {
          q: 'Acentenin verdiği vize bilgisi bağlayıcı mıdır?',
          a: 'Acentenin sunduğu bilgiler genel yönlendirme niteliğindedir ve resmi makam kararının yerine geçmez. Vize türü, evrak listesi, randevu süresi, biyometri ve harçlar ülkeye ve kişisel duruma göre değişebilir. Resmi kaynak, konsolosluk ve yetkili başvuru kanalı her zaman önceliklidir.',
        },
        {
          q: 'Seyahat sigortası vize için yeterli midir?',
          a: 'Seyahat sağlık sigortası birçok vize başvurusunda zorunlu olabilir, ancak tek başına vize garantisi sağlamaz. Teminat limiti, ülke kapsamı ve tarih aralığı başvuru koşullarına uygun olmalıdır. Sigorta poliçesini satın almadan önce hedef ülkenin güncel şartlarını kontrol edin.',
        },
        {
          q: 'Eksik belge nedeniyle seyahate çıkamazsam ne olur?',
          a: 'Vize, pasaport, kimlik, aşı belgesi, ebeveyn muvafakati veya ülkeye giriş formu eksikliği yolcu kaynaklı kabul edilebilir. Bu nedenle taşıyıcı veya sınır görevlisi seyahati reddederse iade hakkı doğmayabilir. Acenteye danışabilirsiniz, ancak belge kontrolünün nihai sorumluluğu yolcuya aittir.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Hesap, erişim ve güvenlik',
      description:
        'Kullanıcı hesabı, iletişim bilgileri, şifre güvenliği, yetkisiz işlem ve bildirim yönetimi.',
      items: [
        {
          q: 'Hesap oluşturmak zorunlu mu?',
          a: 'Bazı ürünlerde hızlı talep için hesap zorunlu olmayabilir; ancak rezervasyon takibi, belge erişimi ve destek geçmişi için hesap kullanımı önerilir. Hesap bilgilerinizin güncel olması operasyon iletişimini kolaylaştırır. E-posta veya telefon değişikliklerini gecikmeden güncellemelisiniz.',
        },
        {
          q: 'Şifremi veya hesabımı nasıl korurum?',
          a: 'Güçlü ve benzersiz şifre kullanın, şifrenizi ve doğrulama kodlarınızı kimseyle paylaşmayın. Ortak cihazlarda oturumunuzu kapatın ve tarayıcıya kayıtlı kart/şifre bilgilerini dikkatli yönetin. Şüpheli giriş fark ederseniz hemen destek kanallarımıza yazın.',
        },
        {
          q: 'Hesabımdan yapılan işlemlerden kim sorumludur?',
          a: 'Hesabınızla yapılan rezervasyon talepleri, bilgi değişiklikleri ve yazışmalar size ait işlem olarak değerlendirilebilir. Yetkisiz kullanım şüphesi varsa mümkün olan en kısa sürede yazılı bildirim yapılmalıdır. Bildirim öncesi oluşan zararların değerlendirilmesi olayın niteliğine ve güvenlik kayıtlarına göre yapılır.',
        },
        {
          q: 'İletişim bilgilerim yanlışsa ne olur?',
          a: 'Yanlış e-posta veya telefon nedeniyle voucher, ödeme hatırlatması, operasyon değişikliği ya da iptal bildirimi size ulaşmayabilir. Bu durumdan doğan gecikme ve hak kayıpları müşterinin sorumluluğunda olabilir. Rezervasyon öncesi ve seyahate yakın tarihte iletişim bilgilerinizi kontrol edin.',
        },
        {
          q: 'Hesap veya rezervasyon geçmişimi silebilir miyim?',
          a: 'Kişisel veri haklarınız kapsamında erişim, düzeltme, silme veya işleme kısıtlama taleplerinizi iletebilirsiniz. Ancak fatura, sözleşme, uyuşmazlık ve yasal saklama yükümlülükleri nedeniyle bazı kayıtlar belirli süre tutulabilir. Ayrıntılar /legal/privacy sayfasında açıklanır.',
        },
        {
          q: 'Dolandırıcılık şüphesinde ne yapmalıyım?',
          a: '{brand} adına geldiğini söyleyen şüpheli mesaj, sahte ödeme bağlantısı veya farklı IBAN görürseniz ödeme yapmayın. {phone}, {phone2} veya {email} üzerinden doğrulama isteyin. Resmi site adresimiz {site} olup, güvenmediğiniz bağlantılarda kişisel bilgi veya kart bilgisi paylaşmayın.',
        },
      ],
    },
    {
      id: 'privacy',
      title: 'KVKK, gizlilik ve çerezler',
      description:
        'Kişisel verilerin işlenmesi, paylaşımı, saklanması, çerezler ve iletişim izinleri hakkında bilgiler.',
      items: [
        {
          q: 'Hangi kişisel veriler işlenir?',
          a: 'Rezervasyon ve destek süreçlerinde ad-soyad, iletişim bilgileri, kimlik veya pasaport bilgileri, seyahat tercihleri, ödeme işlem bilgileri ve talep yazışmaları işlenebilir. İşlenen veri ürün türüne göre değişir. Kapsam ve hukuki sebepler /legal/privacy sayfasında ayrıntılıdır.',
        },
        {
          q: 'Verilerim kimlerle paylaşılır?',
          a: 'Hizmetin sağlanması için otel, villa sahibi, tur operatörü, taşıyıcı, ödeme kuruluşu, sigorta şirketi, teknoloji hizmet sağlayıcısı ve yetkili kamu kurumlarıyla gerekli ölçüde paylaşım yapılabilir. Paylaşım, rezervasyonun kurulması ve yasal yükümlülüklerle sınırlı tutulur. Gereksiz veri aktarımından kaçınılır.',
        },
        {
          q: 'KVKK kapsamındaki haklarımı nasıl kullanırım?',
          a: 'Kişisel verilerinize erişme, düzeltme, silme, işleme itiraz etme ve diğer yasal haklarınızı {email} üzerinden iletebilirsiniz. Talebin kimliğinizi doğrulayacak bilgileri içermesi gerekir. Başvurular mevzuattaki süreler içinde değerlendirilir.',
        },
        {
          q: 'Çerezler neden kullanılır?',
          a: 'Çerezler siteyi çalıştırmak, güvenliği sağlamak, tercihleri hatırlamak, performansı ölçmek ve izin verilen durumlarda pazarlama deneyimini iyileştirmek için kullanılır. Zorunlu çerezler hizmetin çalışması için gereklidir. Tercihler ve ayrıntılı açıklamalar /legal/cookies sayfasında yer alır.',
        },
        {
          q: 'Pazarlama iletilerini kapatabilir miyim?',
          a: 'Ticari elektronik ileti izinlerinizi dilediğiniz zaman geri çekebilirsiniz. Rezervasyonla doğrudan ilgili zorunlu bilgilendirmeler pazarlama izninden bağımsız olarak gönderilebilir. İzin iptali için iletideki yöntemi kullanabilir veya {email} adresine yazabilirsiniz.',
        },
        {
          q: 'Ödeme bilgilerim saklanır mı?',
          a: 'Kart işlemleri yetkili ödeme altyapıları üzerinden gerçekleştirilir ve kart güvenlik bilgileri acente tarafından düz metin olarak saklanmaz. İşlem referansı, tahsilat sonucu ve muhasebe kayıtları yasal yükümlülükler için tutulabilir. Güvenlik şüphesinde bankanızla ve acenteyle derhal iletişime geçin.',
        },
      ],
    },
    {
      id: 'partners',
      title: 'Tedarikçiler ve acente iş ortakları',
      description:
        'Otel, villa, tur, transfer, yat ve acente iş ortaklığı başvuruları ile kalite beklentileri.',
      items: [
        {
          q: '{brand} üzerinde ürünümü nasıl yayınlatabilirim?',
          a: 'Otel, villa, tur, yat, transfer veya benzeri seyahat ürünleri için iş ortaklığı talebinizi /contact formundan ya da {email} adresinden iletebilirsiniz. Başvuruda şirket bilgileri, ruhsat veya yetki belgeleri, ürün açıklaması, fiyatlama modeli, görseller ve operasyon iletişimi yer almalıdır. Uygunluk değerlendirmesi sonrası ekip sizinle iletişime geçer.',
        },
        {
          q: 'Tedarikçilerden hangi belgeler istenir?',
          a: 'Ürün türüne göre vergi levhası, faaliyet belgesi, turizm işletme belgesi, tekne ruhsatı, sigorta, taşıma yetki belgesi, oda kaydı veya sözleşme yetkisini gösteren belgeler istenebilir. Belgelerin güncel ve doğrulanabilir olması gerekir. Eksik belgeyle ürün yayına alınmayabilir.',
        },
        {
          q: 'İçerik ve görsel kalite standartları nelerdir?',
          a: 'Ziyaretçiye sunulan metinler doğru, güncel, doğal ve yanıltıcı olmayan şekilde hazırlanmalıdır. Görseller ilgili ürüne ait olmalı; oda, villa, tekne veya tur deneyimini gerçeğe uygun göstermelidir. Yanlış görsel, abartılı vaat veya eksik kural bildirimi yayından kaldırma sebebi olabilir.',
        },
        {
          q: 'Fiyat ve müsaitlik bilgisi nasıl yönetilir?',
          a: 'Tedarikçi fiyat, kontenjan, dönem, kapalı tarih ve özel koşulları güncel tutmakla yükümlüdür. Yanlış fiyat veya müsaitlik nedeniyle müşteri mağduriyeti oluşursa sorumluluk sözleşme hükümlerine göre değerlendirilir. Kritik değişiklikler acenteye gecikmeden yazılı bildirilmelidir.',
        },
        {
          q: 'Acentelerle iş birliği mümkün mü?',
          a: 'Yetkili seyahat acenteleri, kurumsal satış ekipleri ve destinasyon uzmanlarıyla iş birliği değerlendirilebilir. Komisyon, marka kullanımı, müşteri iletişimi ve ödeme akışı yazılı mutabakatla belirlenir. Başvuru sırasında acente belge numarası ve yetkili kişi bilgileri paylaşılmalıdır.',
        },
        {
          q: 'Müşteri şikayetleri tedarikçilere nasıl yansıtılır?',
          a: 'Müşteri şikayetleri belge, tarih, rezervasyon kaydı ve operasyon notlarıyla birlikte tedarikçiye iletilir. Tedarikçiden makul sürede açıklama ve çözüm beklenir. Sürekli şikayet, doğrulanmış hizmet eksikliği veya yanıltıcı bilgi ürünün askıya alınmasına neden olabilir.',
        },
      ],
    },
  ],
}
