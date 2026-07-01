/**
 * Kruvaziyer vitrin hub kartları — Gezinomi gemi-turlari landing yapısına benzer.
 * Görseller Gezinomi katalog kapaklarından (gerçek gemi fotoğrafları).
 */

import type { CategoryHubGridCard } from '@/components/page-builder/modules/CategoryHubGridModule'
import { categoryFacetSlugForCode } from '@/lib/category-facet-routes'

const GEIZ = 'https://images.gezinomi.com/fit-in/1600x900/filters:quality(90)/assets'

/** Gezinomi kategori link → kapak görseli */
const GEIZINOMI_HUB_IMAGES: Record<string, string> = {
  'msc-cruises-turlari': `${GEIZ}/msc-musica-ile-dunya-turu-121-gece-cruise-only-ic-bella-kabin-24222--1-31.01.2025135015-b0.jpg`,
  'costa-cruises-turlari': `${GEIZ}/costa-fortuna-ile-istanbul-hareketli-yunan-adalari-ic-kabin-23762--1-31.12.2024142530-b0.jpg`,
  'celebrity-cruises': `${GEIZ}/celebrity-xcel-ile-bati-akdeniz-1-agustos-ic-kabin-26564--1-28.08.2025132850-b0.jpg`,
  'royal-caribbean-cruises': `${GEIZ}/harmony-of-the-seas-ile-bati-akdeniz-temmuz-2026-26137--1-5.08.2025102142-b0.jpg`,
  'princess-cruises-turlari': `${GEIZ}/sapphire-princess-ile-buyuk-baltik-baskentleri-2-temmuz-2026-26009--1-29.07.2025135040-b0.jpg`,
  'celestyal-cruises-turlari': `${GEIZ}/promosyon-3-gece-celestyal-olympia-ile-yunan-adalari-atina-ia-ic-kabin-1860--1-6.2.2019162158-b0.jpg`,
  'norwegian-cruises': `${GEIZ}/norwegian-sun-ile-baltik-baskentleri-7-gece-ic-kabin-27072--1-16.09.2025124347-b0.jpg`,
  'selectum-blu-cruises-turlari': `${GEIZ}/blue-sapphire-ile-yunan-adalari-cesme-hareket-3-gece-kapida-vize-27686--1-11.12.2025174233-b0.jpg`,
  'aroya-cruises-turlari': `${GEIZ}/5-aroya-cruises-ile-ege-nin-incileri-suveys-kanali-sharm-el-sheikh-25438--1-23.05.2025175736-b0.jpg`,
  'amadeus-river-cruises': `${GEIZ}/5-deluxe-amadeus-cara-ile-ren-nehrinde-noel-pazarlari-nihat-sirdar-ile-90-lar-parti-25242--1-7.05.2025160557-b0.jpg`,
  'disney-cruise-gemi-turlari': `${GEIZ}/5-disney-dream-ile-britanya-adalari-irlanda-26814--1-4.09.2025144012-b0.jpg`,
  'luxury-cruise-turlari': `${GEIZ}/6-explora-i-ile-akdeniz-29359--1-21.01.2026111642-b0.jpg`,
  'akdeniz-gemi-turlari': `${GEIZ}/harmony-of-the-seas-ile-bati-akdeniz-temmuz-2026-26137--1-5.08.2025102142-b0.jpg`,
  'yunan-adalari-gemi-turlari': `${GEIZ}/promosyon-3-gece-celestyal-olympia-ile-yunan-adalari-atina-ia-ic-kabin-1860--1-6.2.2019162158-b0.jpg`,
  'ege-akdeniz-gemi-turlari': `${GEIZ}/ncl-viva-ile-galataport-binisli-ege-akdeniz-30489--1-4.04.2026150218-b0.jpg`,
  'amerika-gemi-turlari': `${GEIZ}/anthem-of-the-seas-ile-alaska-6-eylul-26863--1-5.09.2025132435-b0.jpg`,
  'turkiye-cikisli-gemi-turlari': `${GEIZ}/costa-fortuna-ile-istanbul-hareketli-yunan-adalari-ic-kabin-23762--1-31.12.2024142530-b0.jpg`,
  'vizesiz-gemi-turlari': `${GEIZ}/5-aroya-cruises-ile-ege-nin-incileri-suveys-kanali-sharm-el-sheikh-25438--1-23.05.2025175736-b0.jpg`,
  'baltik-baskentleri-gemi-turlari': `${GEIZ}/sapphire-princess-ile-buyuk-baltik-baskentleri-2-temmuz-2026-26009--1-29.07.2025135040-b0.jpg`,
  'uzakdogu-gemi-turlari': `${GEIZ}/diamond-princess-ile-japonya-guney-kore-27484--1-10.10.2025133456-b0.jpg`,
  'kanarya-adalari-gemi-turlari': `${GEIZ}/costa-diadema-ile-endulus-portekiz-kanarya-adalari-promo-ic-kabin-29207--1-14.01.2026145820-b0.jpg`,
  'guney-amerika-gemi-turlari': `${GEIZ}/celebrity-equinox-ile-guney-amerika-kiyilari-ramazan-bayrami-2027-30379--1-30.03.2026114617-b0.jpg`,
  'misir-gemi-turlari': `${GEIZ}/5-aroya-cruises-ile-ege-nin-incileri-suveys-kanali-sharm-el-sheikh-25438--1-23.05.2025175736-b0.jpg`,
  karayipler: `${GEIZ}/norwegian-luna-ile-bati-karayipler-30344--1-27.03.2026101956-b0.jpg`,
}

const CRUISE_HUB_FALLBACK = GEIZINOMI_HUB_IMAGES['royal-caribbean-cruises']!

function isEn(locale: string) {
  return locale === 'en' || locale.startsWith('en-')
}

function facetPath(locale: string, queryKey: 'cruise_line' | 'cruise_route', code: string): string {
  const slug = categoryFacetSlugForCode('kruvaziyer', locale, queryKey, code)
  return slug ? `/kruvaziyer/${slug}` : `/kruvaziyer/all?${queryKey}=${encodeURIComponent(code)}`
}

function hubImage(gezinomiLink: string): string {
  return GEIZINOMI_HUB_IMAGES[gezinomiLink] || CRUISE_HUB_FALLBACK
}

type HubDef = {
  id: string
  titleTr: string
  titleEn: string
  gezinomiLink: string
  queryKey: 'cruise_line' | 'cruise_route'
  code: string
}

const CRUISE_BRAND_HUBS: HubDef[] = [
  { id: 'msc', titleTr: 'MSC Cruises', titleEn: 'MSC Cruises', gezinomiLink: 'msc-cruises-turlari', queryKey: 'cruise_line', code: 'msc' },
  { id: 'costa', titleTr: 'Costa Cruises', titleEn: 'Costa Cruises', gezinomiLink: 'costa-cruises-turlari', queryKey: 'cruise_line', code: 'costa' },
  { id: 'royal-caribbean', titleTr: 'Royal Caribbean', titleEn: 'Royal Caribbean', gezinomiLink: 'royal-caribbean-cruises', queryKey: 'cruise_line', code: 'royal-caribbean' },
  { id: 'celebrity', titleTr: 'Celebrity Cruises', titleEn: 'Celebrity Cruises', gezinomiLink: 'celebrity-cruises', queryKey: 'cruise_line', code: 'celebrity' },
  { id: 'princess', titleTr: 'Princess Cruises', titleEn: 'Princess Cruises', gezinomiLink: 'princess-cruises-turlari', queryKey: 'cruise_line', code: 'princess' },
  { id: 'celestyal', titleTr: 'Celestyal Cruises', titleEn: 'Celestyal Cruises', gezinomiLink: 'celestyal-cruises-turlari', queryKey: 'cruise_line', code: 'celestyal' },
  { id: 'norwegian', titleTr: 'Norwegian Cruise Line', titleEn: 'Norwegian Cruise Line', gezinomiLink: 'norwegian-cruises', queryKey: 'cruise_line', code: 'norwegian' },
  { id: 'carnival', titleTr: 'Carnival Cruises', titleEn: 'Carnival Cruises', gezinomiLink: 'royal-caribbean-cruises', queryKey: 'cruise_line', code: 'carnival' },
  { id: 'oceania', titleTr: 'Oceania Cruises', titleEn: 'Oceania Cruises', gezinomiLink: 'luxury-cruise-turlari', queryKey: 'cruise_line', code: 'oceania' },
  { id: 'selectum-blu', titleTr: 'Selectum Blu Cruises', titleEn: 'Selectum Blu Cruises', gezinomiLink: 'selectum-blu-cruises-turlari', queryKey: 'cruise_line', code: 'selectum-blu' },
  { id: 'pullman', titleTr: 'Pullman Cruises', titleEn: 'Pullman Cruises', gezinomiLink: 'msc-cruises-turlari', queryKey: 'cruise_line', code: 'pullman' },
  { id: 'miray', titleTr: 'Miray Cruises', titleEn: 'Miray Cruises', gezinomiLink: 'celestyal-cruises-turlari', queryKey: 'cruise_line', code: 'miray' },
  { id: 'aroya', titleTr: 'Aroya Cruises', titleEn: 'Aroya Cruises', gezinomiLink: 'aroya-cruises-turlari', queryKey: 'cruise_line', code: 'aroya' },
  { id: 'disney', titleTr: 'Disney Cruise Line', titleEn: 'Disney Cruise Line', gezinomiLink: 'disney-cruise-gemi-turlari', queryKey: 'cruise_line', code: 'disney' },
  { id: 'amadeus', titleTr: 'Amadeus River Cruises', titleEn: 'Amadeus River Cruises', gezinomiLink: 'amadeus-river-cruises', queryKey: 'cruise_line', code: 'amadeus' },
  { id: 'luxury', titleTr: 'Luxury Cruise', titleEn: 'Luxury Cruise', gezinomiLink: 'luxury-cruise-turlari', queryKey: 'cruise_line', code: 'luxury' },
]

const CRUISE_ROUTE_HUBS: HubDef[] = [
  { id: 'mediterranean', titleTr: 'Akdeniz Gemi Turları', titleEn: 'Mediterranean Cruises', gezinomiLink: 'akdeniz-gemi-turlari', queryKey: 'cruise_route', code: 'akdeniz-gemi-turlari' },
  { id: 'greek-islands', titleTr: 'Yunan Adaları Gemi Turları', titleEn: 'Greek Islands Cruises', gezinomiLink: 'yunan-adalari-gemi-turlari', queryKey: 'cruise_route', code: 'yunan-adalari-gemi-turlari' },
  { id: 'aegean-med', titleTr: 'Ege & Akdeniz Gemi Turları', titleEn: 'Aegean & Mediterranean', gezinomiLink: 'ege-akdeniz-gemi-turlari', queryKey: 'cruise_route', code: 'ege-akdeniz-gemi-turlari' },
  { id: 'america', titleTr: 'Amerika Gemi Turları', titleEn: 'Americas Cruises', gezinomiLink: 'amerika-gemi-turlari', queryKey: 'cruise_route', code: 'amerika-gemi-turlari' },
  { id: 'turkey-departure', titleTr: 'Türkiye Çıkışlı Gemi Turları', titleEn: 'Departures from Turkey', gezinomiLink: 'turkiye-cikisli-gemi-turlari', queryKey: 'cruise_route', code: 'turkiye-cikisli-gemi-turlari' },
  { id: 'visa-free', titleTr: 'Vizesiz Gemi Turları', titleEn: 'Visa-free Cruises', gezinomiLink: 'vizesiz-gemi-turlari', queryKey: 'cruise_route', code: 'vizesiz-gemi-turlari' },
  { id: 'baltic', titleTr: 'Baltık Başkentleri', titleEn: 'Baltic Capitals', gezinomiLink: 'baltik-baskentleri-gemi-turlari', queryKey: 'cruise_route', code: 'baltik-baskentleri-gemi-turlari' },
  { id: 'far-east', titleTr: 'Uzakdoğu Gemi Turları', titleEn: 'Far East Cruises', gezinomiLink: 'uzakdogu-gemi-turlari', queryKey: 'cruise_route', code: 'uzakdogu-gemi-turlari' },
  { id: 'canary', titleTr: 'Kanarya Adaları', titleEn: 'Canary Islands', gezinomiLink: 'kanarya-adalari-gemi-turlari', queryKey: 'cruise_route', code: 'kanarya-adalari-gemi-turlari' },
  { id: 'south-america', titleTr: 'Güney Amerika Gemi Turları', titleEn: 'South America Cruises', gezinomiLink: 'guney-amerika-gemi-turlari', queryKey: 'cruise_route', code: 'guney-amerika-gemi-turlari' },
  { id: 'egypt', titleTr: 'Mısır Gemi Turları', titleEn: 'Egypt Cruises', gezinomiLink: 'misir-gemi-turlari', queryKey: 'cruise_route', code: 'misir-gemi-turlari' },
  { id: 'caribbean', titleTr: 'Karayipler', titleEn: 'Caribbean', gezinomiLink: 'karayipler', queryKey: 'cruise_route', code: 'karayipler' },
]

function hubDefsToCards(locale: string, defs: HubDef[]): CategoryHubGridCard[] {
  const en = isEn(locale)
  const viewAllLabel = en ? 'View all cruises' : 'Tüm turları gör'
  return defs.map((d) => {
    const path = facetPath(locale, d.queryKey, d.code)
    return {
      id: d.id,
      hubCode: d.code,
      title: en ? d.titleEn : d.titleTr,
      titleEn: d.titleEn,
      image: hubImage(d.gezinomiLink),
      path,
      links: [{ label: viewAllLabel, path }],
    }
  })
}

export function getCruiseBrandHubCards(locale: string): CategoryHubGridCard[] {
  return hubDefsToCards(locale, CRUISE_BRAND_HUBS)
}

export function getCruiseRouteHubCards(locale: string): CategoryHubGridCard[] {
  return hubDefsToCards(locale, CRUISE_ROUTE_HUBS)
}

/** Page builder görsellerini koruyarak güncel path/link/stats ile birleştir */
export function mergeKruvaziyerHubCards(
  config: { heading?: string; headingEn?: string; cards?: CategoryHubGridCard[] },
  locale: string,
): CategoryHubGridCard[] {
  const heading = `${config.heading || ''} ${config.headingEn || ''}`.toLowerCase()
  const isRoute = heading.includes('rota') || heading.includes('route')
  const defaults = isRoute ? getCruiseRouteHubCards(locale) : getCruiseBrandHubCards(locale)
  const saved = Array.isArray(config.cards) ? config.cards : []
  if (saved.length === 0) return defaults

  const savedById = new Map(saved.map((c) => [c.id, c]))
  return defaults.map((def) => {
    const custom = savedById.get(def.id)
    if (!custom) return def
    return {
      ...def,
      title: custom.title?.trim() ? custom.title : def.title,
      titleEn: custom.titleEn?.trim() ? custom.titleEn : def.titleEn,
      image: custom.image?.trim() ? custom.image : def.image,
    }
  })
}

/** @deprecated mergeKruvaziyerHubCards kullanın */
export function resolveKruvaziyerHubCards(
  config: { heading?: string; headingEn?: string; cards?: CategoryHubGridCard[] },
  locale: string,
): CategoryHubGridCard[] {
  return mergeKruvaziyerHubCards(config, locale)
}

export function buildCruiseBrandHubGridConfig(locale = 'tr') {
  const en = isEn(locale)
  return {
    heading: en ? 'Cruise lines' : 'Gemi hatları',
    headingEn: 'Cruise lines',
    subheading: en
      ? 'Browse cruises by operator — MSC, Costa, Royal Caribbean and more.'
      : 'MSC, Costa, Royal Caribbean ve diğer gemi hatlarına göre kruvaziyer turlarını keşfedin.',
    subheadingEn: 'Browse cruises by operator — MSC, Costa, Royal Caribbean and more.',
    cards: getCruiseBrandHubCards(locale),
  }
}

export function buildCruiseRouteHubGridConfig(locale = 'tr') {
  const en = isEn(locale)
  return {
    heading: en ? 'Popular routes' : 'Popüler rotalar',
    headingEn: 'Popular routes',
    subheading: en
      ? 'Mediterranean, Greek Islands, Caribbean and other signature cruise routes.'
      : 'Akdeniz, Yunan Adaları, Karayipler ve diğer popüler gemi turu rotaları.',
    subheadingEn: 'Mediterranean, Greek Islands, Caribbean and other signature cruise routes.',
    cards: getCruiseRouteHubCards(locale),
  }
}

export function getCruiseLineFilterOptions(locale: string): { code: string; label: string }[] {
  const en = isEn(locale)
  return CRUISE_BRAND_HUBS.map((d) => ({ code: d.code, label: en ? d.titleEn : d.titleTr }))
}

export function getCruiseRouteFilterOptions(locale: string): { code: string; label: string }[] {
  const en = isEn(locale)
  return CRUISE_ROUTE_HUBS.map((d) => ({ code: d.code, label: en ? d.titleEn : d.titleTr }))
}
