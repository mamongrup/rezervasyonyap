/**
 * Kruvaziyer vitrin hub kartları — Gezinomi gemi-turlari landing yapısına benzer.
 * Marka (gemi hattı) ve rota kategorileri ayrı grid'lerde gösterilir.
 */

import type { CategoryHubGridCard } from '@/components/page-builder/modules/CategoryHubGridModule'
import { categoryFacetSlugForCode } from '@/lib/category-facet-routes'

const IMG = {
  msc: 'https://images.unsplash.com/photo-1548574505-5e239950ee19?w=800&q=80',
  costa: 'https://images.unsplash.com/photo-1559592413-7e9766626253?w=800&q=80',
  royal: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800&q=80',
  celebrity: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=800&q=80',
  princess: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  celestyal: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=800&q=80',
  norwegian: 'https://images.unsplash.com/photo-1586500036706-1ad2ca1e3e64?w=800&q=80',
  carnival: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c2f?w=800&q=80',
  oceania: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
  selectum: 'https://images.unsplash.com/photo-1571115764595-644a1f5134b1?w=800&q=80',
  disney: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  med: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  greek: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80',
  america: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  nordic: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&q=80',
  asia: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  turkey: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
  caribbean: 'https://images.unsplash.com/photo-1544551763-77ef69d2c8d0?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1548574505-5e239950ee19?w=800&q=80',
}

function isEn(locale: string) {
  return locale === 'en' || locale.startsWith('en-')
}

function facetPath(locale: string, queryKey: 'cruise_line' | 'cruise_route', code: string): string {
  const slug = categoryFacetSlugForCode('kruvaziyer', locale, queryKey, code)
  return slug ? `/kruvaziyer/${slug}` : `/kruvaziyer/all?${queryKey}=${encodeURIComponent(code)}`
}

type HubDef = {
  id: string
  titleTr: string
  titleEn: string
  image: string
  queryKey: 'cruise_line' | 'cruise_route'
  code: string
}

const CRUISE_BRAND_HUBS: HubDef[] = [
  { id: 'msc', titleTr: 'MSC Cruises', titleEn: 'MSC Cruises', image: IMG.msc, queryKey: 'cruise_line', code: 'msc' },
  { id: 'costa', titleTr: 'Costa Cruises', titleEn: 'Costa Cruises', image: IMG.costa, queryKey: 'cruise_line', code: 'costa' },
  { id: 'royal-caribbean', titleTr: 'Royal Caribbean', titleEn: 'Royal Caribbean', image: IMG.royal, queryKey: 'cruise_line', code: 'royal-caribbean' },
  { id: 'celebrity', titleTr: 'Celebrity Cruises', titleEn: 'Celebrity Cruises', image: IMG.celebrity, queryKey: 'cruise_line', code: 'celebrity' },
  { id: 'princess', titleTr: 'Princess Cruises', titleEn: 'Princess Cruises', image: IMG.princess, queryKey: 'cruise_line', code: 'princess' },
  { id: 'celestyal', titleTr: 'Celestyal Cruises', titleEn: 'Celestyal Cruises', image: IMG.celestyal, queryKey: 'cruise_line', code: 'celestyal' },
  { id: 'norwegian', titleTr: 'Norwegian Cruise Line', titleEn: 'Norwegian Cruise Line', image: IMG.norwegian, queryKey: 'cruise_line', code: 'norwegian' },
  { id: 'carnival', titleTr: 'Carnival Cruises', titleEn: 'Carnival Cruises', image: IMG.carnival, queryKey: 'cruise_line', code: 'carnival' },
  { id: 'oceania', titleTr: 'Oceania Cruises', titleEn: 'Oceania Cruises', image: IMG.oceania, queryKey: 'cruise_line', code: 'oceania' },
  { id: 'selectum-blu', titleTr: 'Selectum Blu Cruises', titleEn: 'Selectum Blu Cruises', image: IMG.selectum, queryKey: 'cruise_line', code: 'selectum-blu' },
  { id: 'pullman', titleTr: 'Pullman Cruises', titleEn: 'Pullman Cruises', image: IMG.default, queryKey: 'cruise_line', code: 'pullman' },
  { id: 'miray', titleTr: 'Miray Cruises', titleEn: 'Miray Cruises', image: IMG.default, queryKey: 'cruise_line', code: 'miray' },
  { id: 'aroya', titleTr: 'Aroya Cruises', titleEn: 'Aroya Cruises', image: IMG.default, queryKey: 'cruise_line', code: 'aroya' },
  { id: 'disney', titleTr: 'Disney Cruise Line', titleEn: 'Disney Cruise Line', image: IMG.disney, queryKey: 'cruise_line', code: 'disney' },
  { id: 'amadeus', titleTr: 'Amadeus River Cruises', titleEn: 'Amadeus River Cruises', image: IMG.nordic, queryKey: 'cruise_line', code: 'amadeus' },
  { id: 'luxury', titleTr: 'Luxury Cruise', titleEn: 'Luxury Cruise', image: IMG.oceania, queryKey: 'cruise_line', code: 'luxury' },
]

const CRUISE_ROUTE_HUBS: HubDef[] = [
  { id: 'mediterranean', titleTr: 'Akdeniz Gemi Turları', titleEn: 'Mediterranean Cruises', image: IMG.med, queryKey: 'cruise_route', code: 'akdeniz-gemi-turlari' },
  { id: 'greek-islands', titleTr: 'Yunan Adaları Gemi Turları', titleEn: 'Greek Islands Cruises', image: IMG.greek, queryKey: 'cruise_route', code: 'yunan-adalari-gemi-turlari' },
  { id: 'aegean-med', titleTr: 'Ege & Akdeniz Gemi Turları', titleEn: 'Aegean & Mediterranean', image: IMG.greek, queryKey: 'cruise_route', code: 'ege-akdeniz-gemi-turlari' },
  { id: 'america', titleTr: 'Amerika Gemi Turları', titleEn: 'Americas Cruises', image: IMG.america, queryKey: 'cruise_route', code: 'amerika-gemi-turlari' },
  { id: 'turkey-departure', titleTr: 'Türkiye Çıkışlı Gemi Turları', titleEn: 'Departures from Turkey', image: IMG.turkey, queryKey: 'cruise_route', code: 'turkiye-cikisli-gemi-turlari' },
  { id: 'visa-free', titleTr: 'Vizesiz Gemi Turları', titleEn: 'Visa-free Cruises', image: IMG.med, queryKey: 'cruise_route', code: 'vizesiz-gemi-turlari' },
  { id: 'baltic', titleTr: 'Baltık Başkentleri', titleEn: 'Baltic Capitals', image: IMG.nordic, queryKey: 'cruise_route', code: 'baltik-baskentleri-gemi-turlari' },
  { id: 'far-east', titleTr: 'Uzakdoğu Gemi Turları', titleEn: 'Far East Cruises', image: IMG.asia, queryKey: 'cruise_route', code: 'uzakdogu-gemi-turlari' },
  { id: 'canary', titleTr: 'Kanarya Adaları', titleEn: 'Canary Islands', image: IMG.america, queryKey: 'cruise_route', code: 'kanarya-adalari-gemi-turlari' },
  { id: 'south-america', titleTr: 'Güney Amerika Gemi Turları', titleEn: 'South America Cruises', image: IMG.america, queryKey: 'cruise_route', code: 'guney-amerika-gemi-turlari' },
  { id: 'egypt', titleTr: 'Mısır Gemi Turları', titleEn: 'Egypt Cruises', image: IMG.med, queryKey: 'cruise_route', code: 'misir-gemi-turlari' },
  { id: 'caribbean', titleTr: 'Karayipler', titleEn: 'Caribbean', image: IMG.caribbean, queryKey: 'cruise_route', code: 'karayipler' },
]

function hubDefsToCards(locale: string, defs: HubDef[]): CategoryHubGridCard[] {
  const en = isEn(locale)
  return defs.map((d) => ({
    id: d.id,
    title: en ? d.titleEn : d.titleTr,
    titleEn: d.titleEn,
    image: d.image,
    path: facetPath(locale, d.queryKey, d.code),
    links: [],
  }))
}

export function getCruiseBrandHubCards(locale: string): CategoryHubGridCard[] {
  return hubDefsToCards(locale, CRUISE_BRAND_HUBS)
}

export function getCruiseRouteHubCards(locale: string): CategoryHubGridCard[] {
  return hubDefsToCards(locale, CRUISE_ROUTE_HUBS)
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

/** Filtre paneli — marka ve rota seçenekleri */
export function getCruiseLineFilterOptions(locale: string): { code: string; label: string }[] {
  const en = isEn(locale)
  return CRUISE_BRAND_HUBS.map((d) => ({ code: d.code, label: en ? d.titleEn : d.titleTr }))
}

export function getCruiseRouteFilterOptions(locale: string): { code: string; label: string }[] {
  const en = isEn(locale)
  return CRUISE_ROUTE_HUBS.map((d) => ({ code: d.code, label: en ? d.titleEn : d.titleTr }))
}
