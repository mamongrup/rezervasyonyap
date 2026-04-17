import type { HeroSearchTab } from '@/data/category-registry'
import type { HeroSearchVertical } from '@/lib/hero-search-plan'

/** Hero arama sekmeleri (Stays / Cars / Experiences / Flights) — `HeroSearchTab` ile aynı anahtarlar */
const NAV: Record<HeroSearchTab, { en: string; tr: string }> = {
  Stays: { en: 'Stays', tr: 'Konaklama' },
  Cars: { en: 'Cars', tr: 'Araç' },
  Experiences: { en: 'Experiences', tr: 'Deneyimler' },
  Flights: { en: 'Flights', tr: 'Uçuş' },
}

export function verticalNavLabel(locale: string, tab: HeroSearchTab): string {
  const tr = locale.toLowerCase().startsWith('tr')
  return tr ? NAV[tab].tr : NAV[tab].en
}

/** Üst menü — kısa arama / vitrin açıklaması */
export function travelersPropertyDescription(locale: string): string {
  return locale.toLowerCase().startsWith('tr')
    ? 'Satın alınacak veya kiralanacak ideal yeri bulun'
    : 'Find the perfect place to buy or rent'
}

const HERO_VERTICAL: Record<HeroSearchVertical, { en: string; tr: string }> = {
  stay: { en: 'Stays', tr: 'Konaklama' },
  car: { en: 'Cars', tr: 'Araç kiralama' },
  experience: { en: 'Experiences', tr: 'Deneyimler' },
  flight: { en: 'Flights', tr: 'Uçuş' },
}

export function heroSearchVerticalLabel(locale: string, vertical: HeroSearchVertical): string {
  const tr = locale.toLowerCase().startsWith('tr')
  return tr ? HERO_VERTICAL[vertical].tr : HERO_VERTICAL[vertical].en
}
