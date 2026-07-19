/**
 * Fethiye Kayaköy — Kayaköy Kuzey Villa + Kayaköy Güney Villa (Villagezegeni + Drive, EUR).
 *
 *   node scripts/import-kayakoy-kuzey-guney-villas.mjs
 *   node scripts/import-kayakoy-kuzey-guney-villas.mjs --dry-run
 *   node scripts/import-kayakoy-kuzey-guney-villas.mjs --skip-images
 */
import { driveFolderGalleryUrls } from './lib/google-drive-folder.mjs'
import { runManualHolidayHomeImport } from './lib/manual-holiday-home-db.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')
const STATUS = process.argv.includes('--draft') ? 'draft' : 'published'
const YEAR = 2026

function html(sections) {
  return sections
    .map((s) => {
      if (s.type === 'h2') return `<h2>${s.text}</h2>`
      if (s.type === 'ul') return `<ul>${s.items.map((i) => `<li>${i}</li>`).join('')}</ul>`
      return `<p>${s.text}</p>`
    })
    .join('')
}

function monthBands(rows) {
  return rows.map(([from, to, price, label]) => ({
    from: `${YEAR}-${from}`,
    to: `${YEAR}-${to}`,
    baseNightly: price,
    label,
  }))
}

const SHARED_AMENITIES = [
  'Özel havuz',
  'Jakuzi',
  'Wi-Fi',
  'Klima',
  'Barbekü',
  'Bahçe',
  'Şezlong',
  'Açık otopark',
  'Bulaşık makinesi',
  'Çamaşır makinesi',
  'Buzdolabı',
  'Fırın',
  'Mikrodalga',
  'TV',
  'Güvenlik kamerası',
]

const RULE_CODES = ['no_pets']
const THEMES_KUZEY = ['nature', 'pool', 'jacuzzi', 'luxury', 'family', 'honeymoon', 'conservative']
const THEMES_GUNEY = ['nature', 'pool', 'jacuzzi', 'luxury', 'family', 'conservative']

const VILLAS = [
  {
    key: 'kuzey',
    slug: 'kayakoy-kuzey-villa',
    externalRef: '2447',
    sourceUrl: 'https://www.villagezegeni.com/kiralik-villa/villa-kuzey-kayakoy',
    driveFolderId: '108zEApaO7QF1xMjQKitS9DKFBJw9Z524',
    title: 'Kayaköy Kuzey Villa',
    themeCodes: THEMES_KUZEY,
    poolDims: { width: '5', length: '11', depth: '1.60' },
    poolSizeLabel: '11×5×1.60 m',
    seasonalPrices: monthBands([
      ['04-01', '04-30', 417, 'Nisan'],
      ['05-01', '05-31', 486, 'Mayıs'],
      ['06-01', '06-30', 639, 'Haziran'],
      ['07-01', '07-31', 764, 'Temmuz'],
      ['08-01', '08-31', 764, 'Ağustos'],
      ['09-01', '09-14', 750, '1–15 Eylül'],
      ['09-15', '09-30', 650, '15–30 Eylül'],
      ['10-01', '10-31', 520, 'Ekim'],
      ['11-01', '11-30', 480, 'Kasım'],
      ['12-01', '12-31', 415, 'Aralık'],
    ]),
    shortStayFee: 150,
    damageDeposit: 500,
    translations: {
      tr: {
        title: 'Kayaköy Kuzey Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Kuzey Villa' },
          {
            type: 'p',
            text: 'Kayaköy Kuzey Villa, Fethiye Kayaköy’de doğanın içinde konumlanan, özel havuzlu ve jakuzili lüks bir tatil villasıdır. Altı kişilik kapasitesiyle aileler, arkadaş grupları ve balayı çiftleri için sakin bir konaklama sunar. Tam korunaklı havuzu sayesinde muhafazakâr misafirler için de uygundur.',
          },
          { type: 'h2', text: 'Konaklama' },
          {
            type: 'ul',
            items: [
              '3 yatak odası, 4 yatak ve 3 banyo; en fazla 6 misafir',
              'Jakuzili ebeveyn odası (çift kişilik yatak, klima, özel banyo)',
              'İkinci çift kişilik oda (klima ve özel banyo)',
              'İkiz yataklı oda (iki tek kişilik yatak, klima ve özel banyo)',
              'Geniş salon, donanımlı mutfak, bahçe yemek alanı ve salıncak',
              'Özel dikdörtgen havuz: 11 m × 5 m, derinlik 1,60 m',
            ],
          },
          { type: 'h2', text: 'Konum ve mesafeler' },
          {
            type: 'p',
            text: 'Kayaköy merkezine yaklaşık 1 km, Gemiler Plajı’na 5 km, Fethiye otogarına 10 km ve Dalaman Havalimanı’na 65 km uzaklıktadır. En yakın market yaklaşık 1 km, restoranlar 2 km mesafededir.',
          },
          { type: 'h2', text: 'Önemli bilgiler' },
          {
            type: 'ul',
            items: [
              'Giriş 16:00, çıkış 10:00',
              'Fiyata elektrik, su, tüpgaz, giriş temizliği, havuz-bahçe bakımı ve Wi‑Fi dahildir',
              'Kısa konaklama ücreti 150 €; hasar depozitosu 500 €',
              'Sezon fiyatları Euro cinsindendir; %15 komisyon dahildir, KDV ayrıca uygulanabilir',
              'Evcil hayvan kabul edilmez; parti ve yüksek ses yasaktır',
            ],
          },
        ]),
      },
      en: {
        title: 'Kayaköy Kuzey Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Kuzey Villa' },
          {
            type: 'p',
            text: 'Kayaköy Kuzey Villa is a luxury holiday villa with a private pool and jacuzzi, set in nature in Kayaköy, Fethiye. Sleeping up to six guests, it suits families, friends and honeymoon couples. The fully sheltered pool also makes it suitable for conservative guests.',
          },
          { type: 'h2', text: 'Accommodation' },
          {
            type: 'ul',
            items: [
              '3 bedrooms, 4 beds and 3 bathrooms for up to 6 guests',
              'Master bedroom with double bed, air conditioning, jacuzzi and en-suite bathroom',
              'Second double bedroom with air conditioning and en-suite bathroom',
              'Twin room with two single beds, air conditioning and en-suite bathroom',
              'Spacious living room, equipped kitchen, garden dining area and swing',
              'Private rectangular pool: 11 m × 5 m, depth 1.60 m',
            ],
          },
          { type: 'h2', text: 'Location' },
          {
            type: 'p',
            text: 'About 1 km from Kayaköy centre, 5 km from Gemiler Beach, 10 km from Fethiye bus station and 65 km from Dalaman Airport. The nearest market is about 1 km away; restaurants are around 2 km.',
          },
          { type: 'h2', text: 'Good to know' },
          {
            type: 'ul',
            items: [
              'Check-in 16:00, check-out 10:00',
              'Electricity, water, gas, arrival cleaning, pool/garden care and Wi‑Fi are included',
              'Short-stay fee €150; damage deposit €500',
              'Seasonal rates are in euros; 15% commission included, VAT may apply separately',
              'No pets; parties and loud noise are not allowed',
            ],
          },
        ]),
      },
      de: {
        title: 'Kayaköy Kuzey Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Kuzey Villa' },
          {
            type: 'p',
            text: 'Kayaköy Kuzey Villa ist eine luxuriöse Ferienvilla mit privatem Pool und Whirlpool in der Natur von Kayaköy/Fethiye. Für bis zu sechs Gäste geeignet – Familien, Freundesgruppen und Flitterwochenpaare. Der voll geschützte Pool macht sie auch für konservative Gäste passend.',
          },
          { type: 'h2', text: 'Unterkunft' },
          {
            type: 'ul',
            items: [
              '3 Schlafzimmer, 4 Betten und 3 Bäder für maximal 6 Gäste',
              'Masterzimmer mit Doppelbett, Klimaanlage, Whirlpool und eigenem Bad',
              'Zweites Doppelzimmer mit Klimaanlage und Bad',
              'Zweibettzimmer mit zwei Einzelbetten, Klimaanlage und Bad',
              'Geräumiges Wohnzimmer, ausgestattete Küche, Essbereich im Garten und Schaukel',
              'Privater Rechteckpool: 11 m × 5 m, Tiefe 1,60 m',
            ],
          },
          { type: 'h2', text: 'Lage' },
          {
            type: 'p',
            text: 'Etwa 1 km zum Zentrum von Kayaköy, 5 km zum Gemiler-Strand, 10 km zum Busbahnhof Fethiye und 65 km zum Flughafen Dalaman.',
          },
          { type: 'h2', text: 'Wichtige Hinweise' },
          {
            type: 'ul',
            items: [
              'Check-in 16:00, Check-out 10:00',
              'Strom, Wasser, Gas, Ankunftsreinigung, Pool-/Gartenpflege und WLAN inklusive',
              'Kurzaufenthaltsgebühr 150 €; Kaution 500 €',
              'Saisonpreise in Euro; 15 % Provision inklusive, MwSt. ggf. zusätzlich',
              'Keine Haustiere; Partys und laute Musik nicht erlaubt',
            ],
          },
        ]),
      },
      ru: {
        title: 'Kayaköy Kuzey Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Kuzey Villa' },
          {
            type: 'p',
            text: 'Kayaköy Kuzey Villa — роскошная вилла с частным бассейном и джакузи среди природы в Каякее (Фетхие). Вмещает до 6 гостей: семьи, компании друзей и молодожёны. Полностью закрытый бассейн удобен и для консервативных гостей.',
          },
          { type: 'h2', text: 'Размещение' },
          {
            type: 'ul',
            items: [
              '3 спальни, 4 кровати и 3 ванные комнаты — до 6 гостей',
              'Главная спальня с двуспальной кроватью, кондиционером, джакузи и своей ванной',
              'Вторая двуспальная комната с кондиционером и ванной',
              'Комната с двумя односпальными кроватями, кондиционером и ванной',
              'Просторная гостиная, оборудованная кухня, обеденная зона в саду и качели',
              'Частный прямоугольный бассейн: 11 × 5 м, глубина 1,60 м',
            ],
          },
          { type: 'h2', text: 'Расположение' },
          {
            type: 'p',
            text: 'Около 1 км до центра Каякея, 5 км до пляжа Гемилер, 10 км до автовокзала Фетхие и 65 км до аэропорта Даламан.',
          },
          { type: 'h2', text: 'Важно знать' },
          {
            type: 'ul',
            items: [
              'Заезд с 16:00, выезд до 10:00',
              'Электричество, вода, газ, уборка при заезде, уход за бассейном/садом и Wi‑Fi включены',
              'Уборка 150 €; депозит 500 €',
              'Сезонные цены в евро; комиссия 15% включена, НДС может начисляться отдельно',
              'Домашние животные не принимаются; вечеринки запрещены',
            ],
          },
        ]),
      },
      zh: {
        title: 'Kayaköy Kuzey Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Kuzey Villa' },
          {
            type: 'p',
            text: 'Kayaköy Kuzey Villa 位于费特希耶 Kayaköy 的自然环境中，配有私人泳池与按摩浴缸，最多可住 6 人，适合家庭、朋友与蜜月旅客。泳池完全遮蔽，也适合注重隐私的宾客。',
          },
          { type: 'h2', text: '住宿设施' },
          {
            type: 'ul',
            items: [
              '3 间卧室、4 张床与 3 间浴室，最多 6 位客人',
              '主卧含双人床、空调、按摩浴缸与独立卫浴',
              '第二间双人卧室含空调与独立卫浴',
              '双床房含两张单人床、空调与独立卫浴',
              '宽敞客厅、配备齐全的厨房、花园用餐区与秋千',
              '私人矩形泳池：11 m × 5 m，水深 1.60 m',
            ],
          },
          { type: 'h2', text: '位置' },
          {
            type: 'p',
            text: '距 Kayaköy 中心约 1 公里，Gemiler 海滩约 5 公里，费特希耶汽车站约 10 公里，达拉曼机场约 65 公里。',
          },
          { type: 'h2', text: '重要信息' },
          {
            type: 'ul',
            items: [
              '入住 16:00，退房 10:00',
              '电费、水费、煤气、入住清洁、泳池/花园维护与 Wi‑Fi 已含',
              '清洁费 150 欧元；押金 500 欧元',
              '季节价格以欧元计价；含 15% 佣金，增值税可能另计',
              '不接受宠物；禁止派对与大声喧哗',
            ],
          },
        ]),
      },
      fr: {
        title: 'Kayaköy Kuzey Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Kuzey Villa' },
          {
            type: 'p',
            text: 'Kayaköy Kuzey Villa est une villa de vacances de luxe avec piscine privée et jacuzzi, au cœur de la nature à Kayaköy (Fethiye). Capacité de six personnes : familles, amis et couples en lune de miel. La piscine entièrement abritée convient aussi aux séjours plus privés.',
          },
          { type: 'h2', text: 'Hébergement' },
          {
            type: 'ul',
            items: [
              '3 chambres, 4 lits et 3 salles de bain pour 6 personnes maximum',
              'Suite parentale avec lit double, climatisation, jacuzzi et salle de bain privative',
              'Deuxième chambre double avec climatisation et salle de bain',
              'Chambre twin avec deux lits simples, climatisation et salle de bain',
              'Grand salon, cuisine équipée, coin repas au jardin et balançoire',
              'Piscine privée rectangulaire : 11 m × 5 m, profondeur 1,60 m',
            ],
          },
          { type: 'h2', text: 'Emplacement' },
          {
            type: 'p',
            text: 'Environ 1 km du centre de Kayaköy, 5 km de la plage de Gemiler, 10 km de la gare routière de Fethiye et 65 km de l’aéroport de Dalaman.',
          },
          { type: 'h2', text: 'À savoir' },
          {
            type: 'ul',
            items: [
              'Arrivée 16h00, départ 10h00',
              'Électricité, eau, gaz, ménage d’arrivée, entretien piscine/jardin et Wi‑Fi inclus',
              'Frais de ménage 150 € ; caution 500 €',
              'Tarifs saisonniers en euros ; commission de 15 % incluse, TVA éventuelle en sus',
              'Animaux non admis ; fêtes et bruit fort interdits',
            ],
          },
        ]),
      },
    },
  },
  {
    key: 'guney',
    slug: 'kayakoy-guney-villa',
    externalRef: '2448',
    sourceUrl: 'https://www.villagezegeni.com/kiralik-villa/villa-guney-kayakoy-',
    driveFolderId: '1-AS01BZ0t_cVKYEGEEiGm7XHM7VNX9HY',
    title: 'Kayaköy Güney Villa',
    themeCodes: THEMES_GUNEY,
    poolDims: { width: '5', length: '11.5', depth: '1.60' },
    poolSizeLabel: '11.5×5×1.60 m',
    seasonalPrices: monthBands([
      ['04-01', '04-30', 486, 'Nisan'],
      ['05-01', '05-31', 556, 'Mayıs'],
      ['06-01', '06-30', 694, 'Haziran'],
      ['07-01', '07-31', 833, 'Temmuz'],
      ['08-01', '08-31', 833, 'Ağustos'],
      ['09-01', '09-14', 800, '1–15 Eylül'],
      ['09-15', '09-30', 700, '15–30 Eylül'],
      ['10-01', '10-31', 580, 'Ekim'],
      ['11-01', '11-30', 500, 'Kasım'],
      ['12-01', '12-31', 485, 'Aralık'],
    ]),
    shortStayFee: 150,
    damageDeposit: 500,
    translations: {
      tr: {
        title: 'Kayaköy Güney Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Güney Villa' },
          {
            type: 'p',
            text: 'Kayaköy Güney Villa, Fethiye Kayaköy’de doğayla iç içe, özel havuzlu ve jakuzili lüks bir tatil villasıdır. Altı kişilik kapasitesiyle aileler ve arkadaş grupları için geniştir; tam korunaklı havuzu ve salıncağıyla sakin bir tatil atmosferi sunar.',
          },
          { type: 'h2', text: 'Konaklama' },
          {
            type: 'ul',
            items: [
              '3 yatak odası, 4 yatak ve 3 banyo; en fazla 6 misafir',
              'Jakuzili ebeveyn odası (çift kişilik yatak, klima, özel banyo)',
              'İkinci çift kişilik oda (klima ve özel banyo)',
              'İkiz yataklı oda (iki tek kişilik yatak, klima ve özel banyo)',
              'Geniş salon, donanımlı mutfak, bahçe yemek alanı ve salıncak',
              'Özel dikdörtgen havuz: 11,5 m × 5 m, derinlik 1,60 m',
            ],
          },
          { type: 'h2', text: 'Konum ve mesafeler' },
          {
            type: 'p',
            text: 'Kayaköy merkezine yaklaşık 1 km, Gemiler Plajı’na 5 km, Fethiye otogarına 10 km ve Dalaman Havalimanı’na 65 km uzaklıktadır.',
          },
          { type: 'h2', text: 'Önemli bilgiler' },
          {
            type: 'ul',
            items: [
              'Giriş 16:00, çıkış 10:00',
              'Fiyata elektrik, su, tüpgaz, giriş temizliği, havuz-bahçe bakımı ve Wi‑Fi dahildir',
              'Kısa konaklama ücreti 150 €; hasar depozitosu 500 €',
              'Sezon fiyatları Euro cinsindendir; %15 komisyon dahildir, KDV ayrıca uygulanabilir',
              'Evcil hayvan kabul edilmez; parti ve yüksek ses yasaktır',
            ],
          },
        ]),
      },
      en: {
        title: 'Kayaköy Güney Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Güney Villa' },
          {
            type: 'p',
            text: 'Kayaköy Güney Villa is a luxury holiday villa with a private pool and jacuzzi in Kayaköy, Fethiye. Sleeping six guests, it works well for families and friends, with a fully sheltered pool and garden swing for a quiet stay.',
          },
          { type: 'h2', text: 'Accommodation' },
          {
            type: 'ul',
            items: [
              '3 bedrooms, 4 beds and 3 bathrooms for up to 6 guests',
              'Master bedroom with double bed, air conditioning, jacuzzi and en-suite bathroom',
              'Second double bedroom with air conditioning and en-suite bathroom',
              'Twin room with two single beds, air conditioning and en-suite bathroom',
              'Spacious living room, equipped kitchen, garden dining area and swing',
              'Private rectangular pool: 11.5 m × 5 m, depth 1.60 m',
            ],
          },
          { type: 'h2', text: 'Location' },
          {
            type: 'p',
            text: 'About 1 km from Kayaköy centre, 5 km from Gemiler Beach, 10 km from Fethiye bus station and 65 km from Dalaman Airport.',
          },
          { type: 'h2', text: 'Good to know' },
          {
            type: 'ul',
            items: [
              'Check-in 16:00, check-out 10:00',
              'Electricity, water, gas, arrival cleaning, pool/garden care and Wi‑Fi are included',
              'Short-stay fee €150; damage deposit €500',
              'Seasonal rates are in euros; 15% commission included, VAT may apply separately',
              'No pets; parties and loud noise are not allowed',
            ],
          },
        ]),
      },
      de: {
        title: 'Kayaköy Güney Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Güney Villa' },
          {
            type: 'p',
            text: 'Kayaköy Güney Villa ist eine luxuriöse Ferienvilla mit privatem Pool und Whirlpool in Kayaköy/Fethiye. Für sechs Gäste geeignet – ideal für Familien und Freundesgruppen, mit voll geschütztem Pool und Gartenschaukel.',
          },
          { type: 'h2', text: 'Unterkunft' },
          {
            type: 'ul',
            items: [
              '3 Schlafzimmer, 4 Betten und 3 Bäder für maximal 6 Gäste',
              'Masterzimmer mit Doppelbett, Klimaanlage, Whirlpool und eigenem Bad',
              'Zweites Doppelzimmer mit Klimaanlage und Bad',
              'Zweibettzimmer mit zwei Einzelbetten, Klimaanlage und Bad',
              'Geräumiges Wohnzimmer, ausgestattete Küche, Essbereich im Garten und Schaukel',
              'Privater Rechteckpool: 11,5 m × 5 m, Tiefe 1,60 m',
            ],
          },
          { type: 'h2', text: 'Lage' },
          {
            type: 'p',
            text: 'Etwa 1 km zum Zentrum von Kayaköy, 5 km zum Gemiler-Strand, 10 km zum Busbahnhof Fethiye und 65 km zum Flughafen Dalaman.',
          },
          { type: 'h2', text: 'Wichtige Hinweise' },
          {
            type: 'ul',
            items: [
              'Check-in 16:00, Check-out 10:00',
              'Strom, Wasser, Gas, Ankunftsreinigung, Pool-/Gartenpflege und WLAN inklusive',
              'Kurzaufenthaltsgebühr 150 €; Kaution 500 €',
              'Saisonpreise in Euro; 15 % Provision inklusive, MwSt. ggf. zusätzlich',
              'Keine Haustiere; Partys und laute Musik nicht erlaubt',
            ],
          },
        ]),
      },
      ru: {
        title: 'Kayaköy Güney Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Güney Villa' },
          {
            type: 'p',
            text: 'Kayaköy Güney Villa — роскошная вилла с частным бассейном и джакузи в Каякее (Фетхие). Рассчитана на 6 гостей: семьи и компании друзей. Полностью закрытый бассейн и садовые качели создают спокойную атмосферу.',
          },
          { type: 'h2', text: 'Размещение' },
          {
            type: 'ul',
            items: [
              '3 спальни, 4 кровати и 3 ванные — до 6 гостей',
              'Главная спальня с двуспальной кроватью, кондиционером, джакузи и своей ванной',
              'Вторая двуспальная комната с кондиционером и ванной',
              'Комната с двумя односпальными кроватями, кондиционером и ванной',
              'Просторная гостиная, оборудованная кухня, обеденная зона в саду и качели',
              'Частный прямоугольный бассейн: 11,5 × 5 м, глубина 1,60 м',
            ],
          },
          { type: 'h2', text: 'Расположение' },
          {
            type: 'p',
            text: 'Около 1 км до центра Каякея, 5 км до пляжа Гемилер, 10 км до автовокзала Фетхие и 65 км до аэропорта Даламан.',
          },
          { type: 'h2', text: 'Важно знать' },
          {
            type: 'ul',
            items: [
              'Заезд с 16:00, выезд до 10:00',
              'Электричество, вода, газ, уборка при заезде, уход за бассейном/садом и Wi‑Fi включены',
              'Уборка 150 €; депозит 500 €',
              'Сезонные цены в евро; комиссия 15% включена, НДС может начисляться отдельно',
              'Домашние животные не принимаются; вечеринки запрещены',
            ],
          },
        ]),
      },
      zh: {
        title: 'Kayaköy Güney Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Güney Villa' },
          {
            type: 'p',
            text: 'Kayaköy Güney Villa 位于费特希耶 Kayaköy，配有私人泳池与按摩浴缸，最多可住 6 人，适合家庭与朋友出行。泳池完全遮蔽，花园配有秋千，氛围安静私密。',
          },
          { type: 'h2', text: '住宿设施' },
          {
            type: 'ul',
            items: [
              '3 间卧室、4 张床与 3 间浴室，最多 6 位客人',
              '主卧含双人床、空调、按摩浴缸与独立卫浴',
              '第二间双人卧室含空调与独立卫浴',
              '双床房含两张单人床、空调与独立卫浴',
              '宽敞客厅、配备齐全的厨房、花园用餐区与秋千',
              '私人矩形泳池：11.5 m × 5 m，水深 1.60 m',
            ],
          },
          { type: 'h2', text: '位置' },
          {
            type: 'p',
            text: '距 Kayaköy 中心约 1 公里，Gemiler 海滩约 5 公里，费特希耶汽车站约 10 公里，达拉曼机场约 65 公里。',
          },
          { type: 'h2', text: '重要信息' },
          {
            type: 'ul',
            items: [
              '入住 16:00，退房 10:00',
              '电费、水费、煤气、入住清洁、泳池/花园维护与 Wi‑Fi 已含',
              '清洁费 150 欧元；押金 500 欧元',
              '季节价格以欧元计价；含 15% 佣金，增值税可能另计',
              '不接受宠物；禁止派对与大声喧哗',
            ],
          },
        ]),
      },
      fr: {
        title: 'Kayaköy Güney Villa',
        description: html([
          { type: 'h2', text: 'Kayaköy Güney Villa' },
          {
            type: 'p',
            text: 'Kayaköy Güney Villa est une villa de vacances de luxe avec piscine privée et jacuzzi à Kayaköy (Fethiye). Capacité de six personnes, idéale pour familles et amis, avec piscine entièrement abritée et balançoire au jardin.',
          },
          { type: 'h2', text: 'Hébergement' },
          {
            type: 'ul',
            items: [
              '3 chambres, 4 lits et 3 salles de bain pour 6 personnes maximum',
              'Suite parentale avec lit double, climatisation, jacuzzi et salle de bain privative',
              'Deuxième chambre double avec climatisation et salle de bain',
              'Chambre twin avec deux lits simples, climatisation et salle de bain',
              'Grand salon, cuisine équipée, coin repas au jardin et balançoire',
              'Piscine privée rectangulaire : 11,5 m × 5 m, profondeur 1,60 m',
            ],
          },
          { type: 'h2', text: 'Emplacement' },
          {
            type: 'p',
            text: 'Environ 1 km du centre de Kayaköy, 5 km de la plage de Gemiler, 10 km de la gare routière de Fethiye et 65 km de l’aéroport de Dalaman.',
          },
          { type: 'h2', text: 'À savoir' },
          {
            type: 'ul',
            items: [
              'Arrivée 16h00, départ 10h00',
              'Électricité, eau, gaz, ménage d’arrivée, entretien piscine/jardin et Wi‑Fi inclus',
              'Frais de ménage 150 € ; caution 500 €',
              'Tarifs saisonniers en euros ; commission de 15 % incluse, TVA éventuelle en sus',
              'Animaux non admis ; fêtes et bruit fort interdits',
            ],
          },
        ]),
      },
    },
  },
]

function buildPools(dims) {
  return {
    open_pool: {
      enabled: true,
      width: dims.width,
      length: dims.length,
      depth: dims.depth,
      description: 'Özel yüzme havuzu (tam korunaklı)',
      heating_fee_per_day: '',
    },
    heated_pool: {
      enabled: false,
      width: '',
      length: '',
      depth: '',
      description: '',
      heating_fee_per_day: '',
    },
    children_pool: {
      enabled: false,
      width: '',
      length: '',
      depth: '',
      description: '',
      heating_fee_per_day: '',
    },
  }
}

const results = []
for (const villa of VILLAS) {
  console.log('Import', villa.title, villa.driveFolderId)
  let galleryUrls = []
  if (!SKIP_IMAGES && !DRY_RUN) {
    // Yalnızca Google Drive — Villagezegeni CDN filigranlı, kullanılmaz.
    galleryUrls = await driveFolderGalleryUrls(villa.driveFolderId)
    console.log('Drive images:', galleryUrls.length)
    if (!galleryUrls.length) {
      throw new Error(`Drive görseli yok: ${villa.title} ${villa.driveFolderId}`)
    }
  } else if (DRY_RUN) {
    galleryUrls = [`https://drive.google.com/uc?id=dry-run-${villa.key}&export=download`]
  }

  const tr = villa.translations.tr
  const minPrice = Math.min(...villa.seasonalPrices.map((b) => b.baseNightly))
  const maxPrice = Math.max(...villa.seasonalPrices.map((b) => b.baseNightly))
  const translations = Object.entries(villa.translations).map(([locale, t]) => ({
    locale,
    title: t.title,
    description: t.description,
  }))

  const pkg = {
    provider: 'villagezegeni',
    slug: villa.slug,
    externalRef: villa.externalRef,
    sourceUrl: villa.sourceUrl,
    driveFolderId: villa.driveFolderId,
    title: tr.title,
    description: tr.description,
    translations,
    currency: 'EUR',
    seasonalPrices: villa.seasonalPrices,
    vitrinPrice: minPrice,
    shortStayFee: villa.shortStayFee,
    damageDeposit: villa.damageDeposit,
    minStayNights: 5,
    galleryUrls,
    amenities: SHARED_AMENITIES,
    themeCodes: villa.themeCodes,
    ruleCodes: RULE_CODES,
    pools: buildPools(villa.poolDims),
    poolSizeLabel: villa.poolSizeLabel,
    locationName: 'Kayaköy, Fethiye, Muğla',
    mapLat: '36.574400',
    mapLng: '29.091100',
    supplierPaymentNote: '2026 Euro fiyat listesi: %15 komisyon dahil; +%20 KDV ayrıca uygulanabilir.',
    priceNote: 'EUR seasonal; 15% commission included; +20% VAT may apply',
    meta: {
      city: 'Fethiye',
      province_city: 'Muğla',
      district_label: 'Kayaköy',
      region_display: 'Kayaköy, Fethiye',
      address: 'Kayaköy, Fethiye, Muğla, Türkiye',
      bed_count: '3',
      bath_count: '3',
      room_count: '3',
      max_guests: '6',
      property_type: 'villa',
      check_in_time: '16:00',
      check_out_time: '10:00',
      pool_type: 'Özel açık havuz (tam korunaklı)',
      damage_deposit: String(villa.damageDeposit),
      price_min: String(minPrice),
      price_max: String(maxPrice),
      currency: 'EUR',
      source_url: villa.sourceUrl,
      source_url_drive: `https://drive.google.com/drive/folders/${villa.driveFolderId}`,
    },
  }

  const result = await runManualHolidayHomeImport(pkg, {
    dryRun: DRY_RUN,
    skipImages: SKIP_IMAGES,
    status: STATUS,
  })
  results.push(result)
  console.log(JSON.stringify(result, null, 2))
}

console.log('Done:', results.map((r) => `${r.action}:${r.slug}:${r.imageCount || 0}img`).join(', '))
