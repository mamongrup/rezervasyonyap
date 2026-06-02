import type { HolidayHomeFaqStoredItem } from '@/lib/holiday-home-faq-merge'

/** Platform tatil evi SSS şablonu — tüm ilanlara varsayılan olarak birleştirilir. */
export const HOLIDAY_HOME_DEFAULT_FAQ_ITEMS: HolidayHomeFaqStoredItem[] = [
  {
    id: 'faq_common_01',
    question: {
      tr: 'Giriş ve çıkış saatleri nedir?',
      en: 'What are the check-in and check-out times?',
      de: 'Wann sind Check-in und Check-out?',
      ru: 'Во сколько заезд и выезд?',
      zh: '入住和退房时间是几点？',
      fr: 'Quelles sont les heures d’arrivée et de départ ?',
    },
    answer: {
      tr: 'Giriş ve çıkış saatleri ilan sayfasında ve rezervasyon onayında yazar. Erken giriş veya geç çıkış, takvim ve temizlik planına bağlı olarak önceden yazılı onayla mümkün olabilir.',
      en: 'Check-in and check-out times are shown on the listing and in your booking confirmation. Early check-in or late check-out may be possible with prior written approval, depending on the calendar and cleaning schedule.',
      de: 'Check-in und Check-out stehen auf der Anzeige und in der Buchungsbestätigung. Früher Check-in oder später Check-out sind nach vorheriger schriftlicher Zustimmung ggf. möglich.',
      ru: 'Время заезда и выезда указано на странице объявления и в подтверждении бронирования. Ранний заезд или поздний выезд возможны по предварительному согласованию.',
      zh: '入住和退房时间见房源页与预订确认。提前入住或延迟退房需事先书面确认，视房态与清洁安排而定。',
      fr: 'Les heures sont indiquées sur l’annonce et la confirmation. Arrivée anticipée ou départ tardif possible sur accord écrit préalable.',
    },
  },
  {
    id: 'faq_common_02',
    question: {
      tr: 'Minimum kaç gece konaklamam gerekir?',
      en: 'What is the minimum stay?',
      de: 'Wie lang ist der Mindestaufenthalt?',
      ru: 'Какой минимальный срок проживания?',
      zh: '最少需要住几晚？',
      fr: 'Quelle est la durée minimale de séjour ?',
    },
    answer: {
      tr: 'Minimum gece sayısı ilan detayında belirtilir. Bazı mülklerde daha kısa konaklamalar için ek kısa konaklama ücreti uygulanabilir; tutar ve koşullar fiyat özetinde gösterilir.',
      en: 'The minimum number of nights is stated on the listing. Some properties charge an extra short-stay fee for shorter bookings; the amount and conditions appear in the price summary.',
      de: 'Die Mindestnächte stehen in der Anzeige. Bei kürzeren Aufenthalten kann ein Kurzaufenthaltszuschlag anfallen.',
      ru: 'Минимальное число ночей указано в объявлении. За более короткое проживание может взиматься доплата.',
      zh: '最少入住晚数见房源说明。部分房源对少于最低天数的预订可能收取短住附加费。',
      fr: 'Le nombre minimum de nuits figure sur l’annonce. Un supplément court séjour peut s’appliquer.',
    },
  },
  {
    id: 'faq_common_03',
    question: {
      tr: 'Rezervasyonu iptal edersem ne olur?',
      en: 'What happens if I cancel my booking?',
      de: 'Was passiert bei Stornierung?',
      ru: 'Что будет при отмене бронирования?',
      zh: '取消预订会怎样？',
      fr: 'Que se passe-t-il en cas d’annulation ?',
    },
    answer: {
      tr: 'İptal ve iade koşulları her ilanda ayrı tanımlanır. Rezervasyon öncesi ilgili iptal metnini okuyun; ön ödeme, kapora ve iade süreleri buna bağlıdır.',
      en: 'Cancellation and refund rules vary by listing. Please read the cancellation policy before booking; prepayment, deposit and refund timing depend on it.',
      de: 'Storno- und Erstattungsregeln sind je Anzeige unterschiedlich. Bitte vor der Buchung die Stornobedingungen lesen.',
      ru: 'Условия отмены и возврата зависят от объявления. Ознакомьтесь с политикой отмены до бронирования.',
      zh: '取消与退款规则因房源而异，请在预订前阅读取消政策。',
      fr: 'Les conditions d’annulation et de remboursement varient selon l’annonce. Lisez la politique avant de réserver.',
    },
  },
  {
    id: 'faq_common_04',
    question: {
      tr: 'Hasar depozitosu alınıyor mu, nasıl iade edilir?',
      en: 'Is a damage deposit required and how is it refunded?',
      de: 'Gibt es eine Kaution und wie wird sie zurückgezahlt?',
      ru: 'Берётся ли залог за ущерб и как его возвращают?',
      zh: '是否收取押金，如何退还？',
      fr: 'Y a-t-il une caution dommages et comment est-elle restituée ?',
    },
    answer: {
      tr: 'Depozito tutarı ilanda belirtilir. Çıkışta kontrol sonrası hasar veya ek ücret yoksa, iade süreci ev sahibi politikasına göre kart veya hesaba yapılır.',
      en: 'The deposit amount is shown on the listing. After check-out inspection, if there is no damage or extra charge, the refund is processed per the host policy to your card or account.',
      de: 'Die Kaution steht in der Anzeige. Nach der Abreisekontrolle wird sie bei keinem Schaden gemäß Host-Richtlinie erstattet.',
      ru: 'Сумма залога указана в объявлении. После проверки при выезде залог возвращается при отсутствии повреждений.',
      zh: '押金金额见房源说明。退房检查无损坏或额外费用后，按房东政策退还。',
      fr: 'Le montant de la caution est sur l’annonce. Après l’état des lieux de départ, remboursement selon la politique de l’hôte.',
    },
  },
  {
    id: 'faq_common_05',
    question: {
      tr: 'Temizlik, çarşaf ve havlu fiyata dahil mi?',
      en: 'Are cleaning, bed linen and towels included?',
      de: 'Sind Reinigung, Bettwäsche und Handtücher inbegriffen?',
      ru: 'Включены ли уборка, постельное бельё и полотенца?',
      zh: '清洁、床品和毛巾是否包含？',
      fr: 'Le ménage, le linge de lit et les serviettes sont-ils inclus ?',
    },
    answer: {
      tr: 'Çoğu tatil evinde çıkış temizliği ve temel çarşaf/havlu seti fiyata dahildir. Ekstra veya ara temizlik talepleri genelde ayrı ücretlidir; detaylar ilan açıklamasında yer alır.',
      en: 'Most holiday homes include departure cleaning and a basic linen/towel set. Extra or mid-stay cleaning is usually charged separately; see the listing description.',
      de: 'In den meisten Ferienhäusern sind Endreinigung und Grundausstattung an Bettwäsche/Handtüchern enthalten. Zusatzreinigung ist meist kostenpflichtig.',
      ru: 'Обычно включены уборка при выезде и базовый комплект белья и полотенец. Дополнительная уборка, как правило, оплачивается отдельно.',
      zh: '多数度假屋含退房清洁及基本床品毛巾。额外或中途清洁通常另收费。',
      fr: 'La plupart des locations incluent le ménage de départ et le linge de base. Ménage supplémentaire souvent en sus.',
    },
  },
  {
    id: 'faq_common_06',
    question: {
      tr: 'Ön ödeme ve kalan tutar nasıl ödenir?',
      en: 'How do I pay the deposit and balance?',
      de: 'Wie zahle ich Anzahlung und Restbetrag?',
      ru: 'Как оплачиваются предоплата и остаток?',
      zh: '定金和尾款如何支付？',
      fr: 'Comment payer l’acompte et le solde ?',
    },
    answer: {
      tr: 'Ön ödeme oranı ve ödeme yöntemleri rezervasyon sırasında gösterilir. Kalan tutar varışta veya takvimde belirtilen tarihte, ilan koşullarına göre ödenebilir.',
      en: 'The prepayment rate and payment methods are shown when you book. The balance may be due on arrival or on a date stated in the listing terms.',
      de: 'Anzahlung und Zahlungsarten werden bei der Buchung angezeigt. Der Restbetrag ist ggf. bei Anreise fällig.',
      ru: 'Размер предоплаты и способы оплаты указаны при бронировании. Остаток может оплачиваться по прибытии.',
      zh: '预付比例与支付方式在预订时显示。尾款可能到店支付或按房源条款日期支付。',
      fr: 'L’acompte et les moyens de paiement s’affichent à la réservation. Le solde peut être dû à l’arrivée.',
    },
  },
  {
    id: 'faq_common_07',
    question: {
      tr: 'Anahtarı nasıl alacağım?',
      en: 'How do I get the keys?',
      de: 'Wie erhalte ich die Schlüssel?',
      ru: 'Как получить ключи?',
      zh: '如何领取钥匙？',
      fr: 'Comment récupérer les clés ?',
    },
    answer: {
      tr: 'Giriş yöntemi ilana göre değişir: kodlu kasa, akıllı kilit, karşılama personeli veya ev sahibi teslimi. Talimatlar rezervasyon onayından sonra paylaşılır.',
      en: 'Access varies: key safe, smart lock, meet-and-greet or host handover. Instructions are shared after booking confirmation.',
      de: 'Zugang per Schlüsseltresor, Smart Lock, Empfang oder Übergabe durch den Gastgeber. Anweisungen nach Buchungsbestätigung.',
      ru: 'Способ доступа разный: сейф с кодом, умный замок, встреча или передача от хозяина. Инструкции после подтверждения.',
      zh: '入住方式因房源而异：密码锁、智能锁、接待或房东交接。确认后提供说明。',
      fr: 'Accès variable : boîte à clés, serrure connectée, accueil ou remise par l’hôte. Consignes après confirmation.',
    },
  },
  {
    id: 'faq_common_08',
    question: {
      tr: 'Havuz kullanımı ve kuralları nelerdir?',
      en: 'What are the pool rules?',
      de: 'Welche Poolregeln gelten?',
      ru: 'Какие правила пользования бассейном?',
      zh: '泳池使用规则是什么？',
      fr: 'Quelles sont les règles de la piscine ?',
    },
    answer: {
      tr: 'Havuz varsa sezon, derinlik ve ısıtma bilgisi ilanda yer alır. Çocuk gözetimi, gece kullanımı ve güvenlik kurallarına uymanız gerekir; ısıtma ücreti ayrıca belirtilebilir.',
      en: 'If there is a pool, season, depth and heating are on the listing. Supervise children, follow safety rules; heating may be charged extra.',
      de: 'Bei Pool: Saison, Tiefe und Beheizung in der Anzeige. Kinder beaufsichtigen, Sicherheitsregeln beachten.',
      ru: 'Если есть бассейн, сезон и правила указаны в объявлении. Соблюдайте технику безопасности; подогрев может оплачиваться отдельно.',
      zh: '如有泳池，开放季节、深度和加热见房源说明。请遵守安全规则，儿童需看护。',
      fr: 'Si piscine : saison, profondeur et chauffage sur l’annonce. Respect des règles de sécurité ; chauffage éventuellement en sus.',
    },
  },
  {
    id: 'faq_common_09',
    question: {
      tr: 'Evcil hayvan kabul ediliyor mu?',
      en: 'Are pets allowed?',
      de: 'Sind Haustiere erlaubt?',
      ru: 'Можно ли с домашними животными?',
      zh: '可以带宠物吗？',
      fr: 'Les animaux sont-ils acceptés ?',
    },
    answer: {
      tr: 'Evcil hayvan politikası ilan bazında değişir. İzin verilen mülklerde ek ücret veya depozito istenebilir; rezervasyon öncesi yazılı teyit alın.',
      en: 'Pet policy varies by listing. Allowed properties may charge extra fees or deposit; confirm in writing before booking.',
      de: 'Haustierregeln je Anzeige. Zusatzgebühren oder Kaution möglich; vor Buchung schriftlich bestätigen.',
      ru: 'Правила для животных зависят от объявления. Возможны доплата или залог; уточните до бронирования.',
      zh: '宠物政策因房源而异，可能收取额外费用或押金，预订前请书面确认。',
      fr: 'Politique animaux variable. Frais ou caution possibles ; confirmer par écrit avant réservation.',
    },
  },
  {
    id: 'faq_common_10',
    question: {
      tr: 'İnternet, elektrik ve su dahil mi?',
      en: 'Are Wi‑Fi, electricity and water included?',
      de: 'Sind WLAN, Strom und Wasser inbegriffen?',
      ru: 'Включены ли интернет, электричество и вода?',
      zh: '网络、电和水是否包含？',
      fr: 'Internet, électricité et eau sont-ils inclus ?',
    },
    answer: {
      tr: 'Çoğu ilanda kablosuz internet ve standart tüketim fiyata dahildir. Aşırı tüketim, klima ücreti veya yerel konaklama vergisi ayrıca belirtilebilir; detaylar ilan ve fiyat özetinde yer alır.',
      en: 'Most listings include Wi‑Fi and normal utility use. Excess consumption, A/C surcharges or local tourist tax may apply; see the listing and price summary.',
      de: 'Meist inkl. WLAN und normaler Verbrauch. Mehrverbrauch, Klima-Zuschlag oder Kurtaxe können extra anfallen.',
      ru: 'Обычно включены Wi‑Fi и нормальное потребление. Возможны доплаты за перерасход, кондиционер или туристический налог.',
      zh: '多数房源含 Wi‑Fi 及正常用量。超额用电、空调费或地方税可能另计。',
      fr: 'Souvent Wi‑Fi et consommation standard inclus. Surconsommation, clim ou taxe de séjour possibles en sus.',
    },
  },
]

export function holidayHomeDefaultFaqPayload(): { items: HolidayHomeFaqStoredItem[] } {
  return { items: HOLIDAY_HOME_DEFAULT_FAQ_ITEMS }
}
