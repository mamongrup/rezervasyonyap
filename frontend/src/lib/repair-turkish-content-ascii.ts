/**
 * Aktarımda Türkçe harfler ASCII `?` olmuş başlık/açıklama metinlerini onarır.
 * ç/ğ/ı/ö/ş/ü ve Ç/Ğ/İ/Ö/Ş/Ü (kelime başı + morfoloji).
 * Sunucu migration 416 ve scripts/lib/bravo-turkish-ascii-repair.mjs ile aynı kalıplar.
 * Üret: node scripts/generate-repair-turkish-content-ascii-ts.mjs
 */

const CONTENT_ASCII_PAIRS: [string, string][] = [
  ["Kaş&rsquo;?n", "Kaş&rsquo;ın"],
  ["KAŞ&RSQUO;?N", "KAŞ&RSQUO;IN"],
  ["Kaş&#39;?n", "Kaş&#39;ın"],
  ["Kaş&apos;?n", "Kaş&apos;ın"],
  ["alıcıs?", "alıcısı"],
  ["Alıcıs?", "Alıcısı"],
  ["ALICIS?", "ALICISI"],
  ["g?zel", "güzel"],
  ["G?zel", "Güzel"],
  ["G?ZEL", "GÜZEL"],
  ["g?neş", "güneş"],
  ["G?neş", "Güneş"],
  ["G?NEŞ", "GÜNEŞ"],
  ["g?ne?", "güneş"],
  ["g?nlük", "günlük"],
  ["G?nlük", "Günlük"],
  ["g?rünüm", "görünüm"],
  ["G?rünüm", "Görünüm"],
  ["g?rsel", "görsel"],
  ["G?rsel", "Görsel"],
  ["m?stakil", "müstakil"],
  ["M?stakil", "Müstakil"],
  ["M?STAKİL", "MÜSTAKİL"],
  ["pop?ler", "popüler"],
  ["Pop?ler", "Popüler"],
  ["POP?LER", "POPÜLER"],
  ["barbek?", "barbekü"],
  ["Barbek?", "Barbekü"],
  ["BARBEK?", "BARBEKÜ"],
  ["?cret", "ücret"],
  ["?CRET", "ÜCRET"],
  ["?lke", "ülke"],
  ["?LKE", "ÜLKE"],
  ["?rün", "ürün"],
  ["?RÜN", "ÜRÜN"],
  ["?zerinde", "üzerinde"],
  ["?zere", "üzere"],
  ["?nemli", "önemli"],
  ["?NEMLİ", "ÖNEMLİ"],
  ["?rnek", "örnek"],
  ["?RNEK", "ÖRNEK"],
  ["?zellik", "özellik"],
  ["?ZELLİK", "ÖZELLİK"],
  ["ö?le", "öğle"],
  ["Ö?le", "Öğle"],
  ["Ö?LE", "ÖĞLE"],
  ["??le", "öğle"],
  ["??LE", "ÖĞLE"],
  ["ö?ren", "öğren"],
  ["Ö?ren", "Öğren"],
  ["Ö?REN", "ÖĞREN"],
  ["??ren", "öğren"],
  ["ç?k??", "çıkış"],
  ["Ç?k??", "Çıkış"],
  ["Ç?KI?", "ÇIKIŞ"],
  ["ÇIKI?", "ÇIKIŞ"],
  ["i?in", "için"],
  ["İ?in", "İçin"],
  ["İ?İN", "İÇİN"],
  ["i?erik", "içerik"],
  ["İ?erik", "İçerik"],
  ["d?şün", "düşün"],
  ["D?şün", "Düşün"],
  ["D?Ş?N", "DÜŞÜN"],
  ["d??arı", "dışarı"],
  ["D??arı", "Dışarı"],
  ["D??ARI", "DIŞARI"],
  ["d??ar?", "dışarı"],
  ["bah?esinde", "bahçesinde"],
  ["Bah?esinde", "Bahçesinde"],
  ["bah?e", "bahçe"],
  ["Bah?e", "Bahçe"],
  ["BAH?E", "BAHÇE"],
  ["?ocuk", "çocuk"],
  ["?OCUK", "ÇOCUK"],
  ["?eviri", "çeviri"],
  ["?EVİRİ", "ÇEVİRİ"],
  ["?alış", "çalış"],
  ["çal?ş", "çalış"],
  ["?AL?Ş", "ÇALIŞ"],
  ["?ehir", "şehir"],
  ["?EHİR", "ŞEHİR"],
  ["?irket", "şirket"],
  ["?İRKET", "ŞİRKET"],
  ["?imşek", "şimşek"],
  ["?im?ek", "şimşek"],
  ["şim?ek", "şimşek"],
  ["?İMŞEK", "ŞİMŞEK"],
  ["?İM?EK", "ŞİMŞEK"],
  ["?emsiye", "şemsiye"],
  ["?ezlong", "şezlong"],
  ["??k ", "şık "],
  ["??k,", "şık,"],
  ["??k.", "şık."],
  ["??k;", "şık;"],
  ["??k!", "şık!"],
  ["??k)", "şık)"],
  ["(??k", "(şık"],
  ["??K ", "ŞIK "],
  ["Kaş'?n", "Kaş'ın"],
  ["Kaş'?N", "Kaş'ın"],
  ["KAŞ'?N", "KAŞ'IN"],
  ["Ka?'?n", "Kaş'ın"],
  ["Ka??'?n", "Kaş'ın"],
  ["Ka??'ın", "Kaş'ın"],
  ["Villamız?n", "Villamızın"],
  ["Villam?z?n", "Villamızın"],
  ["Villam?zın", "Villamızın"],
  ["VILLAMIZ?N", "VILLAMIZIN"],
  ["tasarlanmı?tır", "tasarlanmıştır"],
  ["Tasarlanm?şt?r", "Tasarlanmıştır"],
  ["TASARLANM?ŞT?R", "TASARLANMIŞTIR"],
  ["güne?lenme", "güneşlenme"],
  ["Güne?lenme", "Güneşlenme"],
  ["yak?n?ndaki", "yakınındaki"],
  ["yakın?ndaki", "yakınındaki"],
  ["yak?nındaki", "yakınındaki"],
  ["YAK?N?NDAKİ", "YAKININDAKİ"],
  ["çocuklar?n?z", "çocuklarınız"],
  ["çocuklar?nız", "çocuklarınız"],
  ["donan?ml?", "donanımlı"],
  ["donanıml?", "donanımlı"],
  ["donan?mlı", "donanımlı"],
  ["kaç?ş", "kaçış"],
  ["Kaç?ş", "Kaçış"],
  ["KAÇ?Ş", "KAÇIŞ"],
  ["f?rsat", "fırsat"],
  ["F?rsat", "Fırsat"],
  ["F?RSAT", "FIRSAT"],
  ["a?ıklama", "açıklama"],
  ["A?ıklama", "Açıklama"],
  ["A?IKLAMA", "AÇIKLAMA"],
  ["g?nübirlik", "günübirlik"],
  ["G?nübirlik", "Günübirlik"],
  ["denizk?y?", "denizkıyı"],
  ["denizkıy?", "denizkıyı"],
  ["denizk?yı", "denizkıyı"],
  ["a?r?lamaktan", "ağırlamaktan"],
  ["a??rlamaktan", "ağırlamaktan"],
  ["duyar?z", "duyarız"],
  ["DUYAR?Z", "DUYARIZ"],
  ["&uuml;rl&uuml;?&uuml;", "&uuml;rl&uuml;ğ&uuml;"],
  ["g&ouml;z&uuml;kmedi?i", "g&ouml;z&uuml;kmediği"],
  ["ihtiya&ccedil;lar?n?z", "ihtiya&ccedil;larınızı"],
  ["ge&ccedil;irece?iniz", "ge&ccedil;ireceğiniz"],
  ["ihtiya&ccedil;lar?n?", "ihtiya&ccedil;larını"],
  ["d&uuml;zenlenmi?tir", "d&uuml;zenlenmiştir"],
  ["&ccedil;e?itlili?i", "&ccedil;eşitliliği"],
  ["d&ouml;n&uuml;?ler", "d&ouml;n&uuml;şler"],
  ["se&ccedil;ilmi?tir", "se&ccedil;ilmiştir"],
  ["villalar?m?zdand?r", "villalarımızdandır"],
  ["hi&ccedil;bir ?ey", "hi&ccedil;bir şey"],
  ["ka&ccedil;?r?lmaz", "ka&ccedil;ırılmaz"],
  ["arkadaşlar?n?zla", "arkadaşlarınızla"],
  ["başlang?&ccedil;", "başlangı&ccedil;"],
  ["ihtiyaçlar?n?zı", "ihtiyaçlarınızı"],
  ["olamayaca??m?z?", "olamayacağımızı"],
  ["r&uuml;y&uuml;?", "r&uuml;y&uuml;ş"],
  ["se&ccedil;ene?i", "se&ccedil;eneği"],
  ["sunabilece?iniz", "sunabileceğiniz"],
  ["ula?abilirsiniz", "ulaşabilirsiniz"],
  ["yapabilece?iniz", "yapabileceğiniz"],
  ["&ccedil;?kar?n", "&ccedil;ıkarın"],
  ["&ccedil;ama??r", "&ccedil;amaşır"],
  ["g&uuml;venli?i", "g&uuml;venliği"],
  ["getirdi?imizde", "getirdiğimizde"],
  ["haz?rlanm??t?r", "hazırlanmıştır"],
  ["haz?rlanm?şt?r", "hazırlanmıştır"],
  ["ihtiyaçlar?n?z", "ihtiyaçlarınızı"],
  ["tamamlanm??t?r", "tamamlanmıştır"],
  ["tamamlanm?şt?r", "tamamlanmıştır"],
  ["tasarlanm??t?r", "tasarlanmıştır"],
  ["tasarlanm?şt?r", "tasarlanmıştır"],
  ["villalar?m?zda", "villalarımızda"],
  ["yaşayacaks?n?z", "yaşayacaksınız"],
  ["?&ccedil;ecek", "İ&ccedil;ecek"],
  ["&ccedil;ar?af", "&ccedil;arşaf"],
  ["anlataca??n?z", "anlatacağınız"],
  ["bulunmaktad?r", "bulunmaktadır"],
  ["dalg?&ccedil;", "dalgı&ccedil;"],
  ["donat?lm??t?r", "donatılmıştır"],
  ["ihtiyaçlar?n?", "ihtiyaçlarını"],
  ["sunulmaktad?r", "sunulmaktadır"],
  ["villalar?m?za", "villalarımıza"],
  ["yap?lmaktad?r", "yapılmaktadır"],
  ["&ccedil;?k??", "&ccedil;ıkış"],
  ["&Ccedil;?k??", "&Ccedil;ıkış"],
  ["&ccedil;?kar", "&ccedil;ıkar"],
  ["&Ccedil;al??", "&Ccedil;alış"],
  ["&ccedil;e?it", "&ccedil;eşit"],
  ["&ouml;?leden", "&ouml;ğleden"],
  ["al?nmaktad?r", "alınmaktadır"],
  ["bulacaks?n?z", "bulacaksınız"],
  ["d&uuml;nyas?", "d&uuml;nyası"],
  ["getirdi?imiz", "getirdiğimiz"],
  ["girildi?inde", "girildiğinde"],
  ["Korunakl?l?k", "Korunaklılık"],
  ["uzakl?ktad?r", "uzaklıktadır"],
  ["villalar?m?z", "villalarımız"],
  ["Villalar?m?z", "Villalarımız"],
  ["yan?tlanmas?", "yanıtlanması"],
  ["yemek masas?", "yemek masası"],
  ["yorgunlu?unu", "yorgunluğunu"],
  ["?&ccedil;in", "İ&ccedil;in"],
  ["a&ccedil;?k", "a&ccedil;ık"],
  ["A&ccedil;?k", "A&ccedil;ık"],
  ["ayr?nt?s?na", "ayrıntısına"],
  ["ekipmanlar?", "ekipmanları"],
  ["gizlili?ine", "gizliliğine"],
  ["haz?rlanm??", "hazırlanmış"],
  ["ihtiyac?n?z", "ihtiyacınız"],
  ["konumlanm??", "konumlanmış"],
  ["manzaralar?", "manzaraları"],
  ["manzaras?n?", "manzarasını"],
  ["mobilyalar?", "mobilyaları"],
  ["rahatlamas?", "rahatlaması"],
  ["sa? tarafta", "sağ tarafta"],
  ["seçilmi?tir", "seçilmiştir"],
  ["sunmaktad?r", "sunmaktadır"],
  ["tamamlanm??", "tamamlanmış"],
  ["tasar?m?yla", "tasarımıyla"],
  ["tasarlanm??", "tasarlanmış"],
  ["temizli?ini", "temizliğini"],
  ["yap?lm??t?r", "yapılmıştır"],
  ["yap?lm?şt?r", "yapılmıştır"],
  ["yeti?kinler", "yetişkinler"],
  ["?ezlonglar", "Şezlonglar"],
  ["&Ouml;?ren", "&Ouml;ğren"],
  ["almaktad?r", "almaktadır"],
  ["ayr?l??tan", "ayrılıştan"],
  ["donat?lm??", "donatılmış"],
  ["edilmi?tir", "edilmiştir"],
  ["fırsatlar?", "fırsatları"],
  ["g&uuml;ne?", "g&uuml;neş"],
  ["kar??lamak", "karşılamak"],
  ["kullan??l?", "kullanışlı"],
  ["kullanmay?", "kullanmayı"],
  ["oldu?undan", "olduğundan"],
  ["sa?layacak", "sağlayacak"],
  ["taraf?ndan", "tarafından"],
  ["Taraf?ndan", "Tarafından"],
  ["tasarlanm?", "tasarlanmı"],
  ["tutkunlar?", "tutkunları"],
  ["villam?z?n", "villamızın"],
  ["Villam?z?n", "Villamızın"],
  ["villam?zda", "villamızda"],
  ["villamız?n", "villamızın"],
  ["Villamız?n", "Villamızın"],
  ["yaşaman?z?", "yaşamanızı"],
  ["&ouml;?le", "&ouml;ğle"],
  ["&Ouml;?le", "&Ouml;ğle"],
  ["alt?ndaki", "altındaki"],
  ["aylar?nda", "aylarında"],
  ["Ba?lang??", "Başlangıç"],
  ["buzdolab?", "buzdolabı"],
  ["civar?nda", "civarında"],
  ["d??ar?dan", "dışarıdan"],
  ["detaylar?", "detayları"],
  ["Detaylar?", "Detayları"],
  ["ileti?ime", "iletişime"],
  ["iste?iniz", "isteğiniz"],
  ["kat?l?mc?", "katılımcı"],
  ["Kat?l?mc?", "Katılımcı"],
  ["kenar?nda", "kenarında"],
  ["korunakl?", "korunaklı"],
  ["korunmas?", "korunması"],
  ["kullan?m?", "kullanımı"],
  ["kurallar?", "kuralları"],
  ["maceran?z", "maceranız"],
  ["Maceran?z", "Maceranız"],
  ["manzaral?", "manzaralı"],
  ["Manzaral?", "Manzaralı"],
  ["manzaras?", "manzarası"],
  ["noktalar?", "noktaları"],
  ["olacakt?r", "olacaktır"],
  ["olacaktir", "olacaktır"],
  ["s?ras?nda", "sırasında"],
  ["sa?larken", "sağlarken"],
  ["Sakl?kent", "Saklıkent"],
  ["sıcakl???", "sıcaklığı"],
  ["sigortas?", "sigortası"],
  ["Sigortas?", "Sigortası"],
  ["temizli?i", "temizliği"],
  ["villam?za", "villamıza"],
  ["yap?la?ma", "yapılaşma"],
  ["yap?ld???", "yapıldığı"],
  ["?l?deniz", "Ölüdeniz"],
  ["?lm??t?r", "ılmıştır"],
  ["?renmeye", "ğrenmeye"],
  ["?slamlar", "İslamlar"],
  ["anlam?na", "anlamına"],
  ["aras?nda", "arasında"],
  ["ard?ndan", "ardından"],
  ["ba?ar?l?", "başarılı"],
  ["Ba?l?yor", "Başlıyor"],
  ["Ba?lang?", "Başlangı"],
  ["ba?layan", "başlayan"],
  ["bay?nd?r", "bayındır"],
  ["Bay?nd?r", "Bayındır"],
  ["de?ildir", "değildir"],
  ["doyas?ya", "doyasıya"],
  ["edilmi? ", "edilmiş "],
  ["foto?raf", "fotoğraf"],
  ["Foto?raf", "Fotoğraf"],
  ["gruplar?", "grupları"],
  ["hakk?nda", "hakkında"],
  ["haz?rlan", "hazırlan"],
  ["ilmi?tir", "ilmiştir"],
  ["K?z?lta?", "Kızıltaş"],
  ["kar??la?", "karşılaş"],
  ["kolayd?r", "kolaydır"],
  ["kurslar?", "kursları"],
  ["Kurslar?", "Kursları"],
  ["lar?n?zı", "larınızı"],
  ["ler?n?zı", "lerinizi"],
  ["makinas?", "makinası"],
  ["muhte?em", "muhteşem"],
  ["Muhte?em", "Muhteşem"],
  ["oldu?unu", "olduğunu"],
  ["olmad???", "olmadığı"],
  ["sa?lan?r", "sağlanır"],
  ["sal?ncak", "salıncak"],
  ["seçilmi?", "seçilmiş"],
  ["sporlar?", "sporları"],
  ["Sporlar?", "Sporları"],
  ["tasar?m?", "tasarımı"],
  ["teras?na", "terasına"],
  ["tti?inde", "ttiğinde"],
  ["uzakl???", "uzaklığı"],
  ["Villa ?n", "Villa İn"],
  ["villad?r", "villadır"],
  ["villam?z", "villamız"],
  ["Villam?z", "Villamız"],
  ["yakla??k", "yaklaşık"],
  ["Yakla??k", "Yaklaşık"],
  ["yap?lm??", "yapılmış"],
  ["yapman?z", "yapmanız"],
  ["yard?mc?", "yardımcı"],
  ["?ekilde", "şekilde"],
  ["?emsiye", "Şemsiye"],
  ["?ezlong", "Şezlong"],
  ["?imizde", "ımızde"],
  ["?norkel", "şnorkel"],
  ["Adalar?", "Adaları"],
  ["arkada?", "arkadaş"],
  ["ayr?lma", "ayrılma"],
  ["ba?lang", "başlang"],
  ["bir ?ey", "bir şey"],
  ["bula??k", "bulaşık"],
  ["Bulvar?", "Bulvarı"],
  ["detayl?", "detaylı"],
  ["di?imiz", "diğimiz"],
  ["di?inde", "diğinde"],
  ["Do?an?n", "Doğanın"],
  ["do?anın", "doğanın"],
  ["e?itmen", "eğitmen"],
  ["e?lence", "eğlence"],
  ["E?lence", "Eğlence"],
  ["edilmi?", "edilmiş"],
  ["fırsat?", "fırsatı"],
  ["Gelemi?", "Gelemiş"],
  ["giri?te", "girişte"],
  ["her ?ey", "her şey"],
  ["in?aas?", "inşaası"],
  ["K?z?lta", "Kızılta"],
  ["Kaputa?", "Kaputaş"],
  ["Kayak?y", "Kayaköy"],
  ["ki?ilik", "kişilik"],
  ["ki?isel", "kişisel"],
  ["Ki?isel", "Kişisel"],
  ["kiral?k", "kiralık"],
  ["koylar?", "koyları"],
  ["lar?n?z", "larınız"],
  ["ler?n?z", "leriniz"],
  ["lm??t?r", "lmıştır"],
  ["merakl?", "meraklı"],
  ["noktas?", "noktası"],
  ["Odalar?", "Odaları"],
  ["plaj?na", "plajına"],
  ["sak?nma", "sakınma"],
  ["sonras?", "sonrası"],
  ["sundu?u", "sunduğu"],
  ["T?rkiye", "Türkiye"],
  ["Tahanc?", "Tahancı"],
  ["tonlar?", "tonları"],
  ["turlar?", "turları"],
  ["Turlar?", "Turları"],
  ["uzakl?k", "uzaklık"],
  ["villas?", "villası"],
  ["Villas?", "Villası"],
  ["y?l?nda", "yılında"],
  ["ya?amak", "yaşamak"],
  ["yan?nda", "yanında"],
  ["yap?l?r", "yapılır"],
  ["Yap?l?r", "Yapılır"],
  ["yap?lan", "yapılan"],
  ["yap?lm?", "yapılmı"],
  ["?avd?r", "Çavdır"],
  ["?i?e?i", "Çiçeği"],
  ["?im?ek", "Şimşek"],
  ["?imiz ", "ımız "],
  ["an?lar", "anılar"],
  ["aynas?", "aynası"],
  ["ayr?ca", "ayrıca"],
  ["Ayr?ca", "Ayrıca"],
  ["ba?lar", "başlar"],
  ["bak?m?", "bakımı"],
  ["Bak?m?", "Bakımı"],
  ["balay?", "balayı"],
  ["Balay?", "Balayı"],
  ["d?şar?", "dışarı"],
  ["Dalış?", "Dalışı"],
  ["do?as?", "doğası"],
  ["dolab?", "dolabı"],
  ["e?itim", "eğitim"],
  ["E?itim", "Eğitim"],
  ["e?li?i", "eşliği"],
  ["f?rsat", "fırsat"],
  ["farkl?", "farklı"],
  ["her?ey", "her şey"],
  ["ilmi? ", "ilmiş "],
  ["imkan?", "imkanı"],
  ["k?l?f?", "kılıfı"],
  ["Ka?'?n", "Kaş'ın"],
  ["Kaş'?n", "Kaş'ın"],
  ["kaya??", "kayaşı"],
  ["ke?fet", "keşfet"],
  ["lar?n?", "larını"],
  ["ler?n?", "lerini"],
  ["li?ini", "liğini"],
  ["Liman?", "Limanı"],
  ["m??t?r", "mıştır"],
  ["m?şt?r", "mıştır"],
  ["masas?", "masası"],
  ["molas?", "molası"],
  ["n?şt?r", "mıştır"],
  ["ola?an", "olağan"],
  ["oldu?u", "olduğu"],
  ["olmas?", "olması"],
  ["Ovac?k", "Ovacık"],
  ["r?nda ", "rında "],
  ["r?nda,", "rında,"],
  ["r?nda.", "rında."],
  ["ra?men", "rağmen"],
  ["s?rada", "sırada"],
  ["sa?da ", "sağda "],
  ["sa?l?k", "sağlık"],
  ["sa?lam", "sağlam"],
  ["sa?lar", "sağlar"],
  ["say?s?", "sayısı"],
  ["Say?s?", "Sayısı"],
  ["sualt?", "sualtı"],
  ["sular?", "suları"],
  ["tad?n?", "tadını"],
  ["tak?m?", "takımı"],
  ["Teras?", "Terası"],
  ["ula??m", "ulaşım"],
  ["Ula??m", "Ulaşım"],
  ["vard?r", "vardır"],
  ["y?ld?z", "yıldız"],
  ["yap?da", "yapıda"],
  ["yast?k", "yastık"],
  ["Ye?ilk", "Yeşilk"],
  ["yele?i", "yeleği"],
  ["yeme?i", "yemeği"],
  ["Yeme?i", "Yemeği"],
  ["yukar?", "yukarı"],
  ["?al??", "Çalış"],
  ["?ehir", "Şehir"],
  ["?irin", "Şirin"],
  ["?leri", "İleri"],
  ["?n?z ", "ınız "],
  ["?n?z,", "ınız,"],
  ["?n?z.", "ınız."],
  ["?n?zı", "ınızı"],
  ["?nda ", "ında "],
  ["?nda.", "ında."],
  ["?nın ", "ının "],
  ["?ster", "İster"],
  ["'?na ", "'ına "],
  ["'?nın", "'ının"],
  ["a?a??", "aşağı"],
  ["Adas?", "Adası"],
  ["al?? ", "alış "],
  ["al?c?", "alıcı"],
  ["alan?", "alanı"],
  ["ba?l?", "bağlı"],
  ["Ba?l?", "Bağlı"],
  ["Bak?m", "Bakım"],
  ["bal?k", "balık"],
  ["Cal??", "Çalış"],
  ["canl?", "canlı"],
  ["ç?k??", "çıkış"],
  ["Ç?k??", "Çıkış"],
  ["dal??", "dalış"],
  ["Dal??", "Dalış"],
  ["dalg?", "dalgı"],
  ["de?il", "değil"],
  ["di?i ", "diği "],
  ["do?al", "doğal"],
  ["do?ru", "doğru"],
  ["e?li?", "eşli"],
  ["e?siz", "eşsiz"],
  ["E?siz", "Eşsiz"],
  ["f?r?n", "fırın"],
  ["geni?", "geniş"],
  ["Geni?", "Geniş"],
  ["giri?", "giriş"],
  ["Giri?", "Giriş"],
  ["k?r?k", "kırık"],
  ["K?sem", "Kösem"],
  ["kat?l", "katıl"],
  ["kay?p", "kayıp"],
  ["Ke?if", "Keşif"],
  ["li?i ", "liği "],
  ["li?i,", "liği,"],
  ["li?i.", "liği."],
  ["May?s", "Mayıs"],
  ["Mu?la", "Muğla"],
  ["n?nda", "nında"],
  ["nas?l", "nasıl"],
  ["Nas?l", "Nasıl"],
  ["odal?", "odalı"],
  ["Odal?", "Odalı"],
  ["odas?", "odası"],
  ["Odas?", "Odası"],
  ["olu?u", "oluşu"],
  ["Plaj?", "Plajı"],
  ["s?cak", "sıcak"],
  ["s?nda", "sında"],
  ["s?ra ", "sıra "],
  ["S?sla", "Sısla"],
  ["tan??", "tanı"],
  ["tan?r", "tanır"],
  ["y?l?n", "yılın"],
  ["yak?n", "yakın"],
  ["Yak?n", "Yakın"],
  ["yan? ", "yanı "],
  ["Yap?l", "Yapıl"],
  ["ye?il", "yeşil"],
  ["Ye?il", "Yeşil"],
  ["??k ", "şık "],
  ["??k,", "şık,"],
  ["??k.", "şık."],
  ["??te", "İşte"],
  ["?ato", "Şato"],
  ["?ay?", "Çayı"],
  ["?ey ", "şey "],
  ["?eye", "şeye"],
  ["?n? ", "ını "],
  ["?nı ", "ını "],
  ["'?n ", "'ın "],
  ["'?nı", "'ını"],
  ["'n?n", "'nın"],
  ["ad?m", "adım"],
  ["alt?", "altı"],
  ["ayn?", "aynı"],
  ["ç?k?", "çıkı"],
  ["Ç?k?", "Çıkı"],
  ["d?r ", "dır "],
  ["d?r.", "dır."],
  ["do?a", "doğa"],
  ["Do?a", "Doğa"],
  ["e?er", "eğer"],
  ["E?er", "Eğer"],
  ["Fo?a", "Foça"],
  ["in?a", "inşa"],
  ["k?sa", "kısa"],
  ["ki?i", "kişi"],
  ["n?n ", "nın "],
  ["pay?", "payı"],
  ["S?la", "Sıla"],
  ["s?rt", "sırt"],
  ["ş?n ", "şın "],
  ["t?r ", "tır "],
  ["t?r,", "tır,"],
  ["t?r.", "tır."],
  ["ya?a", "yaşa"],
  ["z?n ", "zın "],
  ["z?n,", "zın,"],
  ["z?n.", "zın."],
  ["?ki", "İki"],
  ["?lk", "İlk"],
  ["d??", "dış"],
  ["h?z", "hız"],
  ["H?z", "Hız"],
  ["Ka?", "Kaş"],
  ["ya?", "yaş"],
  ["Ya?", "Yaş"],
]

const TR_LETTER = "[a-zA-ZçÇğĞıİöÖşŞüÜ]"
const TR_VOWEL = "[aeıioöuüAEIİOÖUÜ]"

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeApostrophes(s: string): string {
  return s.replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
}

/**
 * Kelime başı `?…` kalıpları (g?zel içindeki ?zel'e dokunmaz).
 * Ayrıca morfoloji: 'ın, mıştır, ğ/ş/ü/ö/ç/ı.
 */
function applySystematicTurkishAsciiRepair(input: string): string {
  if (typeof input !== "string" || !input.includes("?")) return input
  let c = input

  // Apostrof + iyelik: X'?n → X'ın (büyük/küçük)
  c = c.replace(new RegExp(`(${TR_LETTER})['']\\?n\\b`, "gi"), (_: string, l: string) => `${l}'ın`)
  c = c.replace(new RegExp(`(${TR_LETTER})['']\\?N\\b`, "g"), (_: string, l: string) => `${l}'IN`)

  // Fiil / sıfat ekleri
  c = c.replace(/m\?şt\?r\b/gi, "miştir")
  c = c.replace(/m\?\?t\?r\b/gi, "mıştır")
  c = c.replace(/m\?ştır\b/gi, "miştir")
  c = c.replace(/mı\?tır\b/gi, "mıştır")
  c = c.replace(/maktad\?r\b/gi, "maktadır")
  c = c.replace(/almaktad\?r\b/gi, "almaktadır")
  c = c.replace(/bulunmaktad\?r\b/gi, "bulunmaktadır")
  c = c.replace(/sonras\?d\?r\b/gi, "sonrasıdır")
  c = c.replace(/yasakt\?r\b/gi, "yasaktır")
  c = c.replace(/konumdad\?r\b/gi, "konumdadır")
  c = c.replace(/al\?nmaktad\?r\b/gi, "alınmaktadır")
  c = c.replace(/yap\?lamaz\b/gi, "yapılamaz")
  c = c.replace(/duyar\?z\b/gi, "duyarız")
  c = c.replace(/de\?ildir\b/gi, "değildir")
  c = c.replace(/de\?il\b/gi, "değil")
  c = c.replace(/DE\?İL\b/g, "DEĞİL")

  // ??k → şık (ışık ile çakışmasın: yalnız tek başına / sıfat)
  c = c.replace(/\?\?k\b/gi, (m: string) => (m === m.toUpperCase() ? "ŞIK" : "şık"))
  c = c.replace(/\?\?K\b/g, "ŞIK")

  // ü önce (güzel), sonra ö (göl)
  c = c.replace(/g\?z/gi, (m: string) => (m[0] === "G" ? "Güz" : "güz"))
  c = c.replace(/G\?Z/g, "GÜZ")
  c = c.replace(/g\?ne/gi, (m: string) => (m[0] === "G" ? "Güne" : "güne"))
  c = c.replace(/g\?n/gi, (m: string) => (m[0] === "G" ? "Gün" : "gün"))
  c = c.replace(/g\?r/gi, (m: string) => (m[0] === "G" ? "Gör" : "gör"))
  c = c.replace(/g\?l\b/gi, (m: string) => (m[0] === "G" ? "Göl" : "göl"))
  c = c.replace(/g\?(?=[a-zçğıöşü])/gi, (m: string) => (m[0] === "G" ? "Gö" : "gö"))

  c = c.replace(/ç\?k/gi, (m: string) => (m[0] === "Ç" ? "Çık" : "çık"))
  c = c.replace(/Ç\?K/g, "ÇIK")
  c = c.replace(/ç\?k\?\?/gi, "çıkış")
  c = c.replace(/çık\?\?/gi, "çıkış")
  c = c.replace(/ÇIKI\?/g, "ÇIKIŞ")

  c = c.replace(/i\?in\b/gi, "için")
  c = c.replace(/İ\?in\b/g, "İçin")
  c = c.replace(/İ\?İN\b/g, "İÇİN")
  c = c.replace(/i\?erik/gi, "içerik")
  c = c.replace(/i\?eri/gi, "içeri")

  c = c.replace(/d\?\?/gi, (m: string) => (m[0] === "D" ? "Dış" : "dış"))
  c = c.replace(/d\?ş/gi, (m: string) => (m[0] === "D" ? "Dış" : "dış"))
  c = c.replace(/D\?Ş/g, "DIŞ")

  c = c.replace(/k\?y\b/gi, (m: string) => (m[0] === "K" ? "Köy" : "köy"))
  c = c.replace(/ka\?\?/gi, (m: string) => (m[0] === "K" ? "Kaş" : "kaş"))
  c = c.replace(/KA\?\?/g, "KAŞ")
  c = c.replace(/f\?rsat/gi, (m: string) => (m[0] === "F" ? "Fırsat" : "fırsat"))
  c = c.replace(/Bay\?nd\?r/gi, "Bayındır")
  c = c.replace(/Bayınd\?r/gi, "Bayındır")
  c = c.replace(/ya\?am/gi, (m: string) => (m[0] === "Y" ? "Yaşam" : "yaşam"))
  c = c.replace(/do\?a/gi, (m: string) => (m[0] === "D" ? "Doğa" : "doğa"))
  c = c.replace(/m\?stakil/gi, (m: string) => (m[0] === "M" ? "Müstakil" : "müstakil"))
  c = c.replace(/pop\?ler/gi, (m: string) => (m[0] === "P" ? "Popüler" : "popüler"))
  c = c.replace(/barbek\?/gi, (m: string) => (m[0] === "B" ? "Barbekü" : "barbekü"))
  c = c.replace(/bah\?e/gi, (m: string) => (m[0] === "B" ? "Bahçe" : "bahçe"))

  // Kelime başı ? → Türkçe harf (ç/ğ/ı/ö/ş/ü + büyük); g?zel içine girmez
  c = c.replace(/(^|[\s>"'(])\?zel\b/g, "$1özel")
  c = c.replace(/(^|[\s>"'(])\?ZEL\b/g, "$1ÖZEL")
  c = c.replace(/(^|[\s>"'(])\?Zel\b/g, "$1Özel")
  c = c.replace(/(^|[\s>"'(])\?nemli/gi, "$1önemli")
  c = c.replace(/(^|[\s>"'(])\?NEMLİ/g, "$1ÖNEMLİ")
  c = c.replace(/(^|[\s>"'(])\?rnek/gi, "$1örnek")
  c = c.replace(/(^|[\s>"'(])\?cret/gi, "$1ücret")
  c = c.replace(/(^|[\s>"'(])\?CRET/g, "$1ÜCRET")
  c = c.replace(/(^|[\s>"'(])\?lke/gi, "$1ülke")
  c = c.replace(/(^|[\s>"'(])\?rün/gi, "$1ürün")
  c = c.replace(/(^|[\s>"'(])\?zere/gi, "$1üzere")
  c = c.replace(/(^|[\s>"'(])\?zerinde/gi, "$1üzerinde")
  c = c.replace(/(^|[\s>"'(])\?zellik/gi, "$1özellik")
  c = c.replace(/(^|[\s>"'(])\?ocuk/gi, "$1çocuk")
  c = c.replace(/(^|[\s>"'(])\?OCUK/g, "$1ÇOCUK")
  c = c.replace(/(^|[\s>"'(])\?eviri/gi, "$1çeviri")
  c = c.replace(/(^|[\s>"'(])\?alış/gi, "$1çalış")
  c = c.replace(/çal\?ş/gi, "çalış")
  c = c.replace(/(^|[\s>"'(])\?ezlong/gi, "$1şezlong")
  c = c.replace(/(^|[\s>"'(])\?emsiye/gi, "$1şemsiye")
  c = c.replace(/(^|[\s>"'(])\?ehir/gi, "$1şehir")
  c = c.replace(/(^|[\s>"'(])\?irket/gi, "$1şirket")
  c = c.replace(/(^|[\s>"'(])\?öyle/gi, "$1şöyle")
  c = c.replace(/(^|[\s>"'(])\?\?yle/gi, "$1şöyle")
  c = c.replace(/(^|[\s>"'(])\?imşek/gi, "$1şimşek")
  c = c.replace(/şim\?ek/gi, "şimşek")
  c = c.replace(/(^|[\s>"'(])\?ık\b/gi, "$1şık")
  c = c.replace(/(^|[\s>"'(])\?yle\b/gi, "$1öyle")
  c = c.replace(/b\?yle/gi, (m: string) => (m[0] === "B" ? "Böyle" : "böyle"))
  c = c.replace(/(^|[\s>"'(])\?\?le\b/gi, "$1öğle")
  c = c.replace(/ö\?le/gi, "öğle")
  c = c.replace(/Ö\?LE/g, "ÖĞLE")
  c = c.replace(/(^|[\s>"'(])\?ki\b/g, "$1İki")
  c = c.replace(/(^|[\s>"'(])\?lk\b/g, "$1İlk")
  c = c.replace(/(^|[\s>"'(])\?ato\b/g, "$1Şato")
  c = c.replace(/(^|[\s>"'(])\?ster\b/g, "$1İster")

  c = c.replace(/Villamız\?n/gi, "Villamızın")
  c = c.replace(/Villam\?z\?n/gi, "Villamızın")
  c = c.replace(/alan\?/gi, "alanı")
  c = c.replace(/odas\?/gi, "odası")
  c = c.replace(/yak\?n\?ndaki/gi, "yakınındaki")

  // ğ: ünlü?ünlü
  c = c.replace(new RegExp(`(${TR_VOWEL})\\?(${TR_VOWEL})`, "g"), (_: string, a: string, b: string) => `${a}ğ${b}`)

  // Harf?harf kalan → ı (soru işareti değil: ardından harf var)
  c = c.replace(
    new RegExp(`(${TR_LETTER})\\?(${TR_LETTER})`, "g"),
    (_: string, a: string, b: string) => `${a}ı${b}`,
  )

  // Bilinen sondaki bozuk ekler (Nedir? bozulmasın)
  c = c.replace(/([Oo])das\?/g, "$1dası")
  c = c.replace(/([Aa])lan\?/g, "$1lanı")
  c = c.replace(/([Bb])arbek\?/g, "$1arbekü")
  c = c.replace(/Odas\?/g, "Odası")
  c = c.replace(/Alan\?/g, "Alanı")

  // Kaş'ın güvenlik ağı
  c = c.replace(/Kaş'?n\b/gi, "Kaş'ın")
  c = c.replace(/KAŞ'?N\b/g, "KAŞ'IN")

  return c
}

function applyRepairPairs(input: string): string {
  let out = input
  // Uzun kalıp önce
  const sorted = [...CONTENT_ASCII_PAIRS].sort((a, b) => b[0].length - a[0].length)
  for (const [from, to] of sorted) {
    if (!from || from === to) continue
    // Kelime başı `?…` — ortada eşleşme yok (g?zel ≠ g + ?zel)
    if (from.startsWith("?") && !from.startsWith("??")) {
      const re = new RegExp(`(^|[^${"a-zA-ZçÇğĞıİöÖşŞüÜ"}])${escapeRegExp(from)}`, "g")
      out = out.replace(re, (_: string, pre: string) => `${pre}${to}`)
      continue
    }
    if (out.includes(from)) out = out.split(from).join(to)
  }
  return out
}


export function repairTurkishContentAscii(input: string | null | undefined): string {
  if (input == null) return ''
  let out = normalizeApostrophes(String(input))
  if (!out.includes('?') && !out.includes("'")) return out
  out = applyRepairPairs(out)
  if (out.includes('?')) out = applySystematicTurkishAsciiRepair(out)
  if (out.includes('?')) out = applyRepairPairs(out)
  out = out.replace(/Kaş'?n\b/gi, "Kaş'ın")
  return out
}
