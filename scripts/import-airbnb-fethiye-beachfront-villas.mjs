/**
 * Fethiye Şövalye Adası — Airbnb denize sıfır villalar (Casapunto + Casablanca).
 *
 *   node scripts/import-airbnb-fethiye-beachfront-villas.mjs
 *   node scripts/import-airbnb-fethiye-beachfront-villas.mjs --dry-run
 *   node scripts/import-airbnb-fethiye-beachfront-villas.mjs --skip-images
 */
import { runAirbnbImport } from './lib/airbnb-listing-db.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')
const STATUS = process.argv.includes('--draft') ? 'draft' : 'published'

const THEMES = ['beachfront', 'sea_view', 'pool', 'luxury', 'family']

function html(sections) {
  return sections
    .map((s) => {
      if (s.type === 'h2') return `<h2>${s.text}</h2>`
      if (s.type === 'ul') {
        return `<ul>${s.items.map((i) => `<li>${i}</li>`).join('')}</ul>`
      }
      return `<p>${s.text}</p>`
    })
    .join('')
}

const CONTENT = {
  42526120: {
    translations: [
      {
        locale: 'tr',
        title: 'Casapunto Villa',
        description: html([
          { type: 'h2', text: 'Casapunto Villa' },
          {
            type: 'p',
            text: 'Casapunto Villa, Fethiye Körfezi’ndeki Şövalye Adası’nda denize sıfır konumda yer alan özel havuzlu bir tatil villasıdır. Ada içi ulaşım yalnızca tekneyle sağlanır; Çalış Plajı iskelesinden villa iskelesine yolculuk yaklaşık üç dakika sürer.',
          },
          {
            type: 'p',
            text: 'Panoramik deniz manzarası, korunaklı özel havuz ve villaya ait iskele ile plaj alanı sayesinde deniz keyfini doğrudan kapınızdan yaşarsınız. Adada motorlu araç bulunmaz; Fethiye’nin gürültüsünden uzak, sakin bir tatil sunar.',
          },
          { type: 'h2', text: 'Konaklama' },
          {
            type: 'ul',
            items: [
              '3 yatak odası, 3 banyo — 6 misafire kadar',
              'Bir odada iki tek kişilik yatak ve ebeveyn banyosu',
              'İki odada çift kişilik yatak; birinde jakuzili ebeveyn banyosu',
              'Salonda klima ve televizyon',
              'Özel açık havuz, jakuzi, şömine, tam donanımlı mutfak',
              'Barbekü, veranda/balkon ve bahçe oturma alanı',
            ],
          },
          { type: 'h2', text: 'Ulaşım ve alışveriş' },
          {
            type: 'p',
            text: 'Şövalye Adası’na Çalış Plajı veya Fethiye merkez iskelelerinden tekneyle ulaşılır. Çalış tarafında ücretli otopark vardır. Adada market yoktur; alışverişinizi Çalış veya Fethiye’den tamamlamanız gerekir. Taksi tekneler gün boyu çalışır; ücretler saat dilimine göre değişebilir.',
          },
        ]),
      },
      {
        locale: 'en',
        title: 'Casapunto Villa',
        description: html([
          { type: 'h2', text: 'Casapunto Villa' },
          {
            type: 'p',
            text: 'Casapunto Villa is a private-pool holiday home on Şövalye Island in the Gulf of Fethiye, set right on the water. Access is by boat only; the crossing from Çalış Beach pier to the villa pier takes about three minutes.',
          },
          {
            type: 'p',
            text: 'Enjoy panoramic sea views, a sheltered private pool and the villa’s own pier and swimming area. There are no motor vehicles on the island, so stays feel quiet while Fethiye remains close.',
          },
          { type: 'h2', text: 'Accommodation' },
          {
            type: 'ul',
            items: [
              '3 bedrooms and 3 bathrooms for up to 6 guests',
              'One bedroom with twin beds and an en-suite bathroom',
              'Two bedrooms with double beds; one with a jacuzzi en-suite',
              'Living room with air conditioning and TV',
              'Private outdoor pool, jacuzzi, fireplace and fully equipped kitchen',
              'Barbecue, terrace/balcony and garden seating',
            ],
          },
          { type: 'h2', text: 'Getting there & shopping' },
          {
            type: 'p',
            text: 'Reach Şövalye Island by boat from Çalış Beach or central Fethiye. Paid parking is available near the Çalış pier. There is no shop on the island; buy supplies in Çalış or Fethiye. Water taxis run throughout the day; fares may vary by time.',
          },
        ]),
      },
      {
        locale: 'de',
        title: 'Casapunto Villa',
        description: html([
          { type: 'h2', text: 'Casapunto Villa' },
          {
            type: 'p',
            text: 'Die Casapunto Villa liegt direkt am Wasser auf der Şövalye-Insel im Golf von Fethiye und verfügt über einen privaten Pool. Die Anreise erfolgt ausschließlich per Boot; von der Anlegestelle Çalış Beach bis zum Villensteg dauert die Fahrt etwa drei Minuten.',
          },
          {
            type: 'p',
            text: 'Panorama-Meerblick, geschützter Privatpool sowie eigener Steg und Badebereich prägen den Aufenthalt. Auf der Insel gibt es keine Kraftfahrzeuge – ruhig und dennoch nah an Fethiye.',
          },
          { type: 'h2', text: 'Unterkunft' },
          {
            type: 'ul',
            items: [
              '3 Schlafzimmer und 3 Bäder für bis zu 6 Gäste',
              'Ein Zimmer mit zwei Einzelbetten und eigenem Bad',
              'Zwei Zimmer mit Doppelbett; eines mit Jacuzzi-Bad',
              'Wohnbereich mit Klimaanlage und Fernseher',
              'Privater Außenpool, Jacuzzi, Kamin und voll ausgestattete Küche',
              'Grill, Terrasse/Balkon und Gartenmöbel',
            ],
          },
          { type: 'h2', text: 'Anreise und Einkaufen' },
          {
            type: 'p',
            text: 'Die Insel erreichen Sie per Boot von Çalış Beach oder aus dem Zentrum von Fethiye. Am Çalış-Pier gibt es kostenpflichtige Parkplätze. Auf der Insel gibt es keinen Markt; Einkäufe bitte in Çalış oder Fethiye erledigen. Wassertaxis verkehren den ganzen Tag; die Preise können je nach Uhrzeit variieren.',
          },
        ]),
      },
      {
        locale: 'ru',
        title: 'Villa Casapunto',
        description: html([
          { type: 'h2', text: 'Villa Casapunto' },
          {
            type: 'p',
            text: 'Villa Casapunto — дом для отпуска с частным бассейном на острове Шёвалье в заливе Фетхие, прямо у моря. Добраться можно только на лодке: путь от причала пляжа Чалыш до причала виллы занимает около трёх минут.',
          },
          {
            type: 'p',
            text: 'Панорамный вид на море, укрытый частный бассейн, собственный причал и место для купания. На острове нет моторного транспорта — тихо, но Фетхие рядом.',
          },
          { type: 'h2', text: 'Размещение' },
          {
            type: 'ul',
            items: [
              '3 спальни и 3 ванные — до 6 гостей',
              'Одна спальня с двумя односпальными кроватями и своей ванной',
              'Две спальни с двуспальными кроватями; в одной — джакузи',
              'Гостиная с кондиционером и телевизором',
              'Частный открытый бассейн, джакузи, камин и оборудованная кухня',
              'Барбекю, терраса/балкон и зона отдыха в саду',
            ],
          },
          { type: 'h2', text: 'Как добраться и покупки' },
          {
            type: 'p',
            text: 'До острова ходят лодки от пляжа Чалыш или центра Фетхие. У причала Чалыш есть платная парковка. Магазинов на острове нет — продукты лучше купить в Чалыше или Фетхие. Водные такси работают весь день; тарифы могут зависеть от времени суток.',
          },
        ]),
      },
      {
        locale: 'zh',
        title: 'Casapunto 别墅',
        description: html([
          { type: 'h2', text: 'Casapunto 别墅' },
          {
            type: 'p',
            text: 'Casapunto 别墅位于费特希耶海湾的 Şövalye 岛，紧邻海边，配有私人泳池。仅可乘船抵达；从 Çalış 海滩码头到别墅码头约需三分钟。',
          },
          {
            type: 'p',
            text: '可享全景海景、私密泳池以及别墅专属码头与下水区。岛上无机动车，环境安静，同时靠近费特希耶城区。',
          },
          { type: 'h2', text: '住宿设施' },
          {
            type: 'ul',
            items: [
              '3间卧室、3间浴室，最多可住6人',
              '一间配两张单人床与独立卫浴',
              '两间配双人床；其中一间卫浴含按摩浴缸',
              '客厅配空调与电视',
              '私人室外泳池、按摩浴缸、壁炉与设备齐全的厨房',
              '烧烤区、露台/阳台与花园座椅',
            ],
          },
          { type: 'h2', text: '交通与购物' },
          {
            type: 'p',
            text: '可从 Çalış 海滩或费特希耶市中心乘船前往。Çalış 码头附近有收费停车场。岛上无超市，请在 Çalış 或费特希耶采购。水上出租车全天运营，票价可能随时段变化。',
          },
        ]),
      },
      {
        locale: 'fr',
        title: 'Villa Casapunto',
        description: html([
          { type: 'h2', text: 'Villa Casapunto' },
          {
            type: 'p',
            text: 'La villa Casapunto est une maison de vacances avec piscine privée, située en bord de mer sur l’île de Şövalye dans le golfe de Fethiye. L’accès se fait uniquement en bateau ; la traversée depuis la jetée de Çalış Beach jusqu’à celle de la villa dure environ trois minutes.',
          },
          {
            type: 'p',
            text: 'Profitez d’une vue panoramique sur la mer, d’une piscine privée abritée et d’un ponton privé pour vous baigner. Aucun véhicule motorisé ne circule sur l’île : le calme est garanti, tout en restant proche de Fethiye.',
          },
          { type: 'h2', text: 'Hébergement' },
          {
            type: 'ul',
            items: [
              '3 chambres et 3 salles de bain pour 6 personnes maximum',
              'Une chambre avec deux lits simples et salle de bain privative',
              'Deux chambres avec lit double ; l’une avec jacuzzi',
              'Salon climatisé avec télévision',
              'Piscine extérieure privée, jacuzzi, cheminée et cuisine équipée',
              'Barbecue, terrasse/balcon et coin salon de jardin',
            ],
          },
          { type: 'h2', text: 'Accès et courses' },
          {
            type: 'p',
            text: 'Rejoignez l’île en bateau depuis Çalış Beach ou le centre de Fethiye. Un parking payant est disponible près de la jetée de Çalış. Il n’y a pas de magasin sur l’île ; faites vos courses à Çalış ou à Fethiye. Les taxis bateaux circulent toute la journée ; les tarifs peuvent varier selon l’horaire.',
          },
        ]),
      },
    ],
  },
  54114829: {
    translations: [
      {
        locale: 'tr',
        title: 'Casablanca Villa',
        description: html([
          { type: 'h2', text: 'Casablanca Villa' },
          {
            type: 'p',
            text: 'Casablanca Villa, Fethiye Şövalye Adası’nda denize sıfır konumdaki özel havuzlu bir tatil villasıdır. 360° panoramik deniz manzarası sunar. Adaya Çalış Plajı’ndan tekneyle yaklaşık üç dakikada ulaşılır.',
          },
          {
            type: 'p',
            text: 'Villanın önündeki özel iskelede şezlonglar ve denize inmek için merdiven bulunur. Ada sakin ve araçsızdır; Fethiye ise tekneyle kısa mesafededir.',
          },
          { type: 'h2', text: 'Konaklama' },
          {
            type: 'ul',
            items: [
              '3 yatak odası, 4 banyo — 6 misafire kadar',
              'Her yatak odasında çift kişilik yatak, klima, televizyon ve ebeveyn banyosu',
              'Salonda klima, televizyon ve ayrı WC/banyo',
              'Özel açık havuz, tam donanımlı mutfak, bulaşık makinesi ve barbekü',
              'Veranda/balkon, bahçe, açık hava duşu ve bahçe şöminesi',
              'Tekne bağlama yeri ve denize sıfır konum',
            ],
          },
          { type: 'h2', text: 'Ulaşım ve alışveriş' },
          {
            type: 'p',
            text: 'Ulaşım yalnızca tekneyledir (Çalış veya Fethiye merkez). Çalış iskelesi yanında ücretli otopark vardır. Adada market bulunmaz; ihtiyaçları Çalış veya Fethiye’den karşılayın. Taksi tekneler 7/24 hizmet verebilir; ücretler saate göre değişir.',
          },
        ]),
      },
      {
        locale: 'en',
        title: 'Casablanca Villa',
        description: html([
          { type: 'h2', text: 'Casablanca Villa' },
          {
            type: 'p',
            text: 'Casablanca Villa is a beachfront private-pool holiday home on Şövalye Island in Fethiye, with 360° panoramic sea views. Boat transfer from Çalış Beach takes about three minutes.',
          },
          {
            type: 'p',
            text: 'A private pier in front of the villa has sun loungers and a ladder into the sea. The car-free island stays peaceful while Fethiye remains a short boat ride away.',
          },
          { type: 'h2', text: 'Accommodation' },
          {
            type: 'ul',
            items: [
              '3 bedrooms and 4 bathrooms for up to 6 guests',
              'Each bedroom has a double bed, air conditioning, TV and en-suite bathroom',
              'Living room with air conditioning, TV and a separate WC/bathroom',
              'Private outdoor pool, fully equipped kitchen, dishwasher and barbecue',
              'Terrace/balcony, garden, outdoor shower and garden fireplace',
              'Boat mooring and direct sea access',
            ],
          },
          { type: 'h2', text: 'Getting there & shopping' },
          {
            type: 'p',
            text: 'Access is by boat only from Çalış or central Fethiye. Paid parking is available near the Çalış pier. There is no shop on the island; stock up in Çalış or Fethiye. Water taxis may run around the clock; fares vary by time of day.',
          },
        ]),
      },
      {
        locale: 'de',
        title: 'Casablanca Villa',
        description: html([
          { type: 'h2', text: 'Casablanca Villa' },
          {
            type: 'p',
            text: 'Die Casablanca Villa liegt direkt am Meer auf der Şövalye-Insel in Fethiye, mit privatem Pool und 360°-Panoramablick. Die Bootstour ab Çalış Beach dauert etwa drei Minuten.',
          },
          {
            type: 'p',
            text: 'Vor der Villa liegt ein privater Steg mit Liegen und einer Leiter zum Meer. Die autofreie Insel ist ruhig, Fethiye bleibt per Boot nah.',
          },
          { type: 'h2', text: 'Unterkunft' },
          {
            type: 'ul',
            items: [
              '3 Schlafzimmer und 4 Bäder für bis zu 6 Gäste',
              'Jedes Schlafzimmer mit Doppelbett, Klimaanlage, TV und eigenem Bad',
              'Wohnzimmer mit Klimaanlage, TV und separatem WC/Bad',
              'Privater Außenpool, voll ausgestattete Küche, Geschirrspüler und Grill',
              'Terrasse/Balkon, Garten, Außendusche und Gartenkamin',
              'Bootsliegeplatz und direkter Meereszugang',
            ],
          },
          { type: 'h2', text: 'Anreise und Einkaufen' },
          {
            type: 'p',
            text: 'Anreise nur per Boot von Çalış oder aus dem Zentrum von Fethiye. Kostenpflichtiges Parken am Çalış-Pier. Kein Markt auf der Insel – einkaufen in Çalış oder Fethiye. Wassertaxis können rund um die Uhr fahren; Preise je nach Uhrzeit.',
          },
        ]),
      },
      {
        locale: 'ru',
        title: 'Villa Casablanca',
        description: html([
          { type: 'h2', text: 'Villa Casablanca' },
          {
            type: 'p',
            text: 'Villa Casablanca — дом у самой воды на острове Шёвалье в Фетхие с частным бассейном и панорамным видом на 360°. Переправа на лодке от пляжа Чалыш занимает около трёх минут.',
          },
          {
            type: 'p',
            text: 'Перед виллой — частный причал с шезлонгами и лестницей в море. Остров без машин, спокойно; до Фетхие — короткая лодочная поездка.',
          },
          { type: 'h2', text: 'Размещение' },
          {
            type: 'ul',
            items: [
              '3 спальни и 4 ванные — до 6 гостей',
              'В каждой спальне двуспальная кровать, кондиционер, ТВ и своя ванная',
              'Гостиная с кондиционером, ТВ и отдельным санузлом',
              'Частный открытый бассейн, кухня, посудомоечная машина и барбекю',
              'Терраса/балкон, сад, уличный душ и садовый камин',
              'Место для швартовки и прямой выход к морю',
            ],
          },
          { type: 'h2', text: 'Как добраться и покупки' },
          {
            type: 'p',
            text: 'Только на лодке из Чалыша или центра Фетхие. Платная парковка у причала Чалыш. Магазинов на острове нет. Водные такси могут ходить круглосуточно; цена зависит от времени.',
          },
        ]),
      },
      {
        locale: 'zh',
        title: 'Casablanca 别墅',
        description: html([
          { type: 'h2', text: 'Casablanca 别墅' },
          {
            type: 'p',
            text: 'Casablanca 别墅位于费特希耶 Şövalye 岛，紧邻海边，配有私人泳池与 360° 全景海景。从 Çalış 海滩乘船约三分钟可达。',
          },
          {
            type: 'p',
            text: '别墅前方有私人码头，配有躺椅与入水梯。岛上无机动车，安静舒适，同时与费特希耶城区仅一船之隔。',
          },
          { type: 'h2', text: '住宿设施' },
          {
            type: 'ul',
            items: [
              '3间卧室、4间浴室，最多可住6人',
              '每间卧室配双人床、空调、电视与独立卫浴',
              '客厅配空调、电视与独立卫浴',
              '私人室外泳池、齐全厨房、洗碗机与烧烤设备',
              '露台/阳台、花园、户外淋浴与花园壁炉',
              '可停靠船只，直通海边',
            ],
          },
          { type: 'h2', text: '交通与购物' },
          {
            type: 'p',
            text: '仅可从 Çalış 或费特希耶市中心乘船前往。Çalış 码头附近有收费停车。岛上无超市。水上出租车可能全天运营，票价随时段变化。',
          },
        ]),
      },
      {
        locale: 'fr',
        title: 'Villa Casablanca',
        description: html([
          { type: 'h2', text: 'Villa Casablanca' },
          {
            type: 'p',
            text: 'La villa Casablanca est une maison de vacances en bord de mer sur l’île de Şövalye à Fethiye, avec piscine privée et vue panoramique à 360°. La traversée en bateau depuis Çalış Beach dure environ trois minutes.',
          },
          {
            type: 'p',
            text: 'Un ponton privé devant la villa propose transats et échelle d’accès à la mer. L’île sans voitures reste calme, tout en étant proche de Fethiye.',
          },
          { type: 'h2', text: 'Hébergement' },
          {
            type: 'ul',
            items: [
              '3 chambres et 4 salles de bain pour 6 personnes maximum',
              'Chaque chambre dispose d’un lit double, climatisation, TV et salle de bain privative',
              'Salon climatisé avec TV et WC/salle de bain séparés',
              'Piscine extérieure privée, cuisine équipée, lave-vaisselle et barbecue',
              'Terrasse/balcon, jardin, douche extérieure et cheminée de jardin',
              'Mouillage pour bateau et accès direct à la mer',
            ],
          },
          { type: 'h2', text: 'Accès et courses' },
          {
            type: 'p',
            text: 'Accès uniquement en bateau depuis Çalış ou le centre de Fethiye. Parking payant près de la jetée de Çalış. Pas de magasin sur l’île. Les taxis bateaux peuvent circuler 24h/24 ; les tarifs varient selon l’horaire.',
          },
        ]),
      },
    ],
  },
}

const ROOM_IDS = ['42526120', '54114829']

const results = []
for (const roomId of ROOM_IDS) {
  const content = CONTENT[roomId]
  console.log('Import Airbnb villa', roomId)
  const result = await runAirbnbImport(roomId, {
    dryRun: DRY_RUN,
    skipImages: SKIP_IMAGES,
    status: STATUS,
    extraThemes: THEMES,
    enrichPackage: (pkg) => {
      const tr = content.translations.find((t) => t.locale === 'tr')
      if (tr) {
        pkg.title = tr.title
        pkg.description = tr.description
      }
      pkg.translations = content.translations
      pkg.themeCodes = [...new Set([...(pkg.themeCodes || []), ...THEMES])]
      pkg.meta = {
        ...pkg.meta,
        city: 'Fethiye',
        province_city: 'Muğla',
        district_label: 'Şövalye Adası',
        region_display: 'Fethiye, Muğla',
      }
    },
  })
  results.push(result)
  console.log(JSON.stringify(result, null, 2))
}

console.log('Done:', results.map((r) => `${r.action}:${r.slug}`).join(', '))
