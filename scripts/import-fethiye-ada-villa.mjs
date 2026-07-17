/**
 * Ada Villa — Airbnb #672181424354502311 + 2026 EUR sezon + tüm tarihler müsait.
 *
 *   node scripts/import-fethiye-ada-villa.mjs
 *   node scripts/import-fethiye-ada-villa.mjs --dry-run
 *   node scripts/import-fethiye-ada-villa.mjs --skip-images
 */
import { scrapeAirbnbListing } from './lib/airbnb-scrape.mjs'
import { buildCalendarDays } from './lib/akdenizvillam-calendar.mjs'
import { runManualHolidayHomeImport } from './lib/manual-holiday-home-db.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')
const STATUS = process.argv.includes('--draft') ? 'draft' : 'published'
const ROOM_ID = '672181424354502311'
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

const seasonalPrices = [
  { from: `${YEAR}-06-01`, to: `${YEAR}-06-30`, baseNightly: 458, label: 'Haziran' },
  { from: `${YEAR}-07-01`, to: `${YEAR}-07-31`, baseNightly: 556, label: 'Temmuz' },
  { from: `${YEAR}-08-01`, to: `${YEAR}-08-31`, baseNightly: 556, label: 'Ağustos' },
  { from: `${YEAR}-09-01`, to: `${YEAR}-09-14`, baseNightly: 550, label: '1–15 Eylül' },
  { from: `${YEAR}-09-15`, to: `${YEAR}-09-30`, baseNightly: 486, label: '15–30 Eylül' },
  { from: `${YEAR}-10-01`, to: `${YEAR}-10-31`, baseNightly: 417, label: 'Ekim' },
  { from: `${YEAR}-11-01`, to: `${YEAR}-11-30`, baseNightly: 417, label: 'Kasım' },
]

const CLEANING = 100
const DEPOSIT = 100
const MIN_STAY = 5
const minPrice = Math.min(...seasonalPrices.map((b) => b.baseNightly))
const maxPrice = Math.max(...seasonalPrices.map((b) => b.baseNightly))

const THEMES = ['beachfront', 'sea_view', 'pool', 'jacuzzi', 'luxury', 'family']

const TRANSLATIONS = [
  {
    locale: 'tr',
    title: 'Ada Villa',
    description: html([
      { type: 'h2', text: 'Ada Villa' },
      {
        type: 'p',
        text: 'Ada Villa, Şövalye Adası’nda denize sıfır konumdaki özel havuzlu bir tatil villasıdır. Akdeniz’e birkaç adım mesafede, deniz manzaralı güneşlenme alanları ve konforlu yaşam alanlarıyla altı kişilik aile ve arkadaş gruplarına sakin bir ada tatili sunar. Adaya ulaşım tekneyle sağlanır.',
      },
      { type: 'h2', text: 'Konaklama' },
      {
        type: 'ul',
        items: [
          '3 yatak odası ve 3 banyo; en fazla 6 misafir',
          'Jakuzili ana yatak odası ve özel banyo',
          'Tüm yatak odalarında klima',
          'Donanımlı mutfak, salon ve deniz manzaralı güneşlenme terası',
          'Plaj erişimi; plajda 2, villada 5 şezlong',
          'Özel açık havuz ve bahçe dinlenme alanı',
        ],
      },
      { type: 'h2', text: 'Konum ve ulaşım' },
      {
        type: 'p',
        text: 'Villa Fethiye Körfezi’ndeki Şövalye Adası’ndadır. Anakara bağlantısı servis teknesiyle sağlanır; adada market bulunmaz, alışveriş için Fethiye / Çalış tarafına geçmek gerekir.',
      },
      { type: 'h2', text: 'Önemli bilgiler' },
      {
        type: 'ul',
        items: [
          'Giriş 16:00, çıkış 10:00',
          'Temizlik ücreti 100 €; hasar depozitosu 100 €',
          'Sezon fiyatları Euro cinsindendir; %15 komisyon dahildir, KDV ayrıca uygulanabilir',
          'Haziran–Kasım dönemi takvimde müsait olarak işaretlenmiştir',
          'Evcil hayvan kabul edilmez',
        ],
      },
    ]),
  },
  {
    locale: 'en',
    title: 'Ada Villa',
    description: html([
      { type: 'h2', text: 'Ada Villa' },
      {
        type: 'p',
        text: 'Ada Villa is a beachfront holiday home with a private pool on Şövalye Island. A few steps from the Mediterranean, it offers sea-view sun terraces and comfortable living space for up to six guests. Access is by boat.',
      },
      { type: 'h2', text: 'Accommodation' },
      {
        type: 'ul',
        items: [
          '3 bedrooms and 3 bathrooms for up to 6 guests',
          'Master bedroom with jacuzzi and en-suite bathroom',
          'Air conditioning in all bedrooms',
          'Equipped kitchen, living area and sea-view sun terrace',
          'Beach access; 2 loungers on the beach and 5 at the villa',
          'Private outdoor pool and garden seating',
        ],
      },
      { type: 'h2', text: 'Location' },
      {
        type: 'p',
        text: 'The villa sits on Şövalye Island in the Gulf of Fethiye. A service boat links the island to the mainland; there is no shop on the island, so shopping is done via Fethiye / Çalış.',
      },
      { type: 'h2', text: 'Good to know' },
      {
        type: 'ul',
        items: [
          'Check-in 16:00, check-out 10:00',
          'Cleaning fee €100; damage deposit €100',
          'Seasonal rates in euros; 15% commission included, VAT may apply separately',
          'June–November dates are marked available on the calendar',
          'No pets',
        ],
      },
    ]),
  },
  {
    locale: 'de',
    title: 'Ada Villa',
    description: html([
      { type: 'h2', text: 'Ada Villa' },
      {
        type: 'p',
        text: 'Ada Villa ist ein Ferienhaus direkt am Meer mit privatem Pool auf der Şövalye-Insel. Nur wenige Schritte zum Mittelmeer, mit Sonnenterrasse und Platz für bis zu sechs Gäste. Anreise per Boot.',
      },
      { type: 'h2', text: 'Unterkunft' },
      {
        type: 'ul',
        items: [
          '3 Schlafzimmer und 3 Bäder für maximal 6 Gäste',
          'Masterzimmer mit Whirlpool und eigenem Bad',
          'Klimaanlage in allen Schlafzimmern',
          'Ausgestattete Küche, Wohnbereich und Sonnenterrasse mit Meerblick',
          'Strandzugang; 2 Liegen am Strand und 5 an der Villa',
          'Privater Außenpool und Gartensitzplatz',
        ],
      },
      { type: 'h2', text: 'Lage' },
      {
        type: 'p',
        text: 'Die Villa liegt auf der Şövalye-Insel im Golf von Fethiye. Ein Serviceboot verbindet die Insel mit dem Festland; Einkäufe erfolgen über Fethiye / Çalış.',
      },
      { type: 'h2', text: 'Wichtige Hinweise' },
      {
        type: 'ul',
        items: [
          'Check-in 16:00, Check-out 10:00',
          'Reinigungsgebühr 100 €; Kaution 100 €',
          'Saisonpreise in Euro; 15 % Provision inklusive, MwSt. ggf. zusätzlich',
          'Juni–November im Kalender als verfügbar markiert',
          'Keine Haustiere',
        ],
      },
    ]),
  },
  {
    locale: 'ru',
    title: 'Ada Villa',
    description: html([
      { type: 'h2', text: 'Ada Villa' },
      {
        type: 'p',
        text: 'Ada Villa — дом для отпуска с частным бассейном прямо у моря на острове Шёвалье. В нескольких шагах от Средиземного моря, с террасой и размещением до 6 гостей. Добраться можно на лодке.',
      },
      { type: 'h2', text: 'Размещение' },
      {
        type: 'ul',
        items: [
          '3 спальни и 3 ванные — до 6 гостей',
          'Главная спальня с джакузи и своей ванной',
          'Кондиционер во всех спальнях',
          'Оборудованная кухня, гостиная и терраса с видом на море',
          'Выход к пляжу; 2 шезлонга на пляже и 5 у виллы',
          'Частный открытый бассейн и зона отдыха в саду',
        ],
      },
      { type: 'h2', text: 'Расположение' },
      {
        type: 'p',
        text: 'Вилла находится на острове Шёвалье в заливе Фетхие. Связь с берегом — на сервисной лодке; магазинов на острове нет, покупки — через Фетхие / Чалыш.',
      },
      { type: 'h2', text: 'Важно знать' },
      {
        type: 'ul',
        items: [
          'Заезд с 16:00, выезд до 10:00',
          'Уборка 100 €; депозит 100 €',
          'Сезонные цены в евро; комиссия 15% включена, НДС может начисляться отдельно',
          'Июнь–ноябрь отмечены в календаре как доступные',
          'Домашние животные не принимаются',
        ],
      },
    ]),
  },
  {
    locale: 'zh',
    title: 'Ada Villa',
    description: html([
      { type: 'h2', text: 'Ada Villa' },
      {
        type: 'p',
        text: 'Ada Villa 位于 Şövalye 岛，紧邻海边，配有私人泳池，最多可住 6 人。步行即可到达地中海，享有海景日光浴露台。需乘船抵达。',
      },
      { type: 'h2', text: '住宿设施' },
      {
        type: 'ul',
        items: [
          '3 间卧室与 3 间浴室，最多 6 位客人',
          '主卧含按摩浴缸与独立卫浴',
          '所有卧室配备空调',
          '配备齐全的厨房、客厅与海景日光浴露台',
          '可直达海滩；海滩 2 张躺椅，别墅 5 张躺椅',
          '私人室外泳池与花园休息区',
        ],
      },
      { type: 'h2', text: '位置' },
      {
        type: 'p',
        text: '别墅位于费特希耶海湾的 Şövalye 岛。通过服务船往返陆地；岛上无商店，购物需前往费特希耶 / Çalış。',
      },
      { type: 'h2', text: '重要信息' },
      {
        type: 'ul',
        items: [
          '入住 16:00，退房 10:00',
          '清洁费 100 欧元；押金 100 欧元',
          '季节价格以欧元计价；含 15% 佣金，增值税可能另计',
          '6–11 月日历均为可订',
          '不接受宠物',
        ],
      },
    ]),
  },
  {
    locale: 'fr',
    title: 'Ada Villa',
    description: html([
      { type: 'h2', text: 'Ada Villa' },
      {
        type: 'p',
        text: 'Ada Villa est une maison de vacances en bord de mer avec piscine privée sur l’île de Şövalye. À quelques pas de la Méditerranée, terrasse ensoleillée et capacité de six personnes. Accès en bateau.',
      },
      { type: 'h2', text: 'Hébergement' },
      {
        type: 'ul',
        items: [
          '3 chambres et 3 salles de bain pour 6 personnes maximum',
          'Suite parentale avec jacuzzi et salle de bain privative',
          'Climatisation dans toutes les chambres',
          'Cuisine équipée, salon et terrasse avec vue mer',
          'Accès plage ; 2 transats sur la plage et 5 à la villa',
          'Piscine extérieure privée et coin détente au jardin',
        ],
      },
      { type: 'h2', text: 'Emplacement' },
      {
        type: 'p',
        text: 'La villa se trouve sur l’île de Şövalye dans le golfe de Fethiye. Une navette bateau relie l’île au continent ; il n’y a pas de magasin sur l’île.',
      },
      { type: 'h2', text: 'À savoir' },
      {
        type: 'ul',
        items: [
          'Arrivée 16h00, départ 10h00',
          'Frais de ménage 100 € ; caution 100 €',
          'Tarifs saisonniers en euros ; commission de 15 % incluse, TVA éventuelle en sus',
          'Juin–novembre marqués disponibles au calendrier',
          'Animaux non admis',
        ],
      },
    ]),
  },
]

console.log('Scrape Airbnb', ROOM_ID)
const scraped = await scrapeAirbnbListing(ROOM_ID)
const tr = TRANSLATIONS.find((t) => t.locale === 'tr')
const calendarDays = buildCalendarDays(seasonalPrices, []) // tüm tarihler müsait

const pkg = {
  provider: 'airbnb',
  slug: 'fethiye-ada-villa',
  externalRef: ROOM_ID,
  sourceUrl: `https://www.airbnb.com.tr/rooms/${ROOM_ID}`,
  title: tr.title,
  description: tr.description,
  translations: TRANSLATIONS,
  currency: 'EUR',
  seasonalPrices,
  calendarDays,
  vitrinPrice: minPrice,
  cleaningFee: CLEANING,
  damageDeposit: DEPOSIT,
  minStayNights: MIN_STAY,
  galleryUrls: scraped.galleryUrls || [],
  amenities: scraped.amenities || [],
  themeCodes: [...new Set([...(scraped.themeCodes || []), ...THEMES])],
  ruleCodes: scraped.ruleCodes?.length ? scraped.ruleCodes : ['no_pets'],
  pools: {
    open_pool: {
      enabled: true,
      width: '',
      length: '',
      depth: '',
      description: 'Özel açık havuz',
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
  },
  poolSizeLabel: 'Özel havuz',
  locationName: 'Şövalye Adası, Fethiye, Muğla',
  mapLat: scraped.mapLat || '36.65146',
  mapLng: scraped.mapLng || '29.10012',
  tourismCertNo: scraped.tourismCertNo || '48-6290',
  supplierPaymentNote: '2026 Euro fiyat listesi (Ada): %15 komisyon dahil; +%20 KDV ayrıca uygulanabilir.',
  priceNote: 'EUR seasonal Ada column; 15% commission included; +20% VAT may apply',
  meta: {
    city: 'Fethiye',
    province_city: 'Muğla',
    district_label: 'Şövalye Adası',
    region_display: 'Şövalye Adası, Fethiye',
    address: scraped.locationName || 'Fethiye, Muğla, Türkiye',
    bed_count: String(scraped.bedrooms || 3),
    bath_count: String(scraped.bathrooms || 3),
    room_count: String(scraped.bedrooms || 3),
    max_guests: String(scraped.maxGuests || 6),
    property_type: 'villa',
    check_in_time: scraped.checkInTime || '16:00',
    check_out_time: scraped.checkOutTime || '10:00',
    pool_type: 'Özel açık havuz',
    damage_deposit: String(DEPOSIT),
    price_min: String(minPrice),
    price_max: String(maxPrice),
    currency: 'EUR',
    airbnb_room_id: ROOM_ID,
    source_url: `https://www.airbnb.com.tr/rooms/${ROOM_ID}`,
    lat: scraped.mapLat || '',
    lng: scraped.mapLng || '',
  },
}

console.log(
  JSON.stringify(
    {
      slug: pkg.slug,
      images: pkg.galleryUrls.length,
      bands: seasonalPrices.length,
      calendarDays: calendarDays.length,
      vitrinPrice: minPrice,
      dryRun: DRY_RUN,
    },
    null,
    2,
  ),
)

const result = await runManualHolidayHomeImport(pkg, {
  dryRun: DRY_RUN,
  skipImages: SKIP_IMAGES,
  status: STATUS,
})
console.log(JSON.stringify(result, null, 2))
