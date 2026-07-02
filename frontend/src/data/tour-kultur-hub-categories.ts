/**
 * Kültür tur vitrin hub kartları — Tatilsepeti / Gezinomi bölgesel alt kategoriler.
 */

import type { CategoryHubGridCard } from '@/components/page-builder/modules/CategoryHubGridModule'
import { KULTUR_REGION_CODES } from '@/lib/tour-kultur-regions'

const GEIZ = 'https://images.gezinomi.com/fit-in/1600x900/filters:quality(90)/assets'

/** Gezinomi kapak görselleri — audit/import sonrası güncellenebilir */
const HUB_IMAGES: Record<string, string> = {
  kapadokya:
    'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80',
  karadeniz:
    'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&q=80',
  gap: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80',
  'ege-akdeniz':
    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
  'ic-anadolu':
    'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&q=80',
  'dogu-anadolu':
    'https://images.unsplash.com/photo-1596484552834-65fd58efb48d?w=800&q=80',
  gunubirlik:
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
  marmara:
    'https://images.unsplash.com/photo-1527838837500-53ebbef81b32?w=800&q=80',
}

export type KulturTourHubRegion = {
  id: string
  code: string
  titleTr: string
  titleEn: string
  slug: string
  image: string
}

export const KULTUR_TOUR_HUB_REGIONS: KulturTourHubRegion[] = [
  {
    id: 'kapadokya',
    code: 'kapadokya',
    titleTr: 'Kapadokya Turları',
    titleEn: 'Cappadocia Tours',
    slug: 'kapadokya-turlari',
    image: HUB_IMAGES.kapadokya,
  },
  {
    id: 'karadeniz',
    code: 'karadeniz',
    titleTr: 'Karadeniz Turları',
    titleEn: 'Black Sea Tours',
    slug: 'karadeniz-turlari',
    image: HUB_IMAGES.karadeniz,
  },
  {
    id: 'gap',
    code: 'gap',
    titleTr: 'GAP Turları',
    titleEn: 'Southeast Anatolia Tours',
    slug: 'gap-turlari',
    image: HUB_IMAGES.gap,
  },
  {
    id: 'ege-akdeniz',
    code: 'ege-akdeniz',
    titleTr: 'Akdeniz-Ege Turları',
    titleEn: 'Aegean & Mediterranean',
    slug: 'ege-akdeniz-turlari',
    image: HUB_IMAGES['ege-akdeniz'],
  },
  {
    id: 'ic-anadolu',
    code: 'ic-anadolu',
    titleTr: 'İç Anadolu Turları',
    titleEn: 'Central Anatolia Tours',
    slug: 'ic-anadolu-turlari',
    image: HUB_IMAGES['ic-anadolu'],
  },
  {
    id: 'dogu-anadolu',
    code: 'dogu-anadolu',
    titleTr: 'Doğu Anadolu Turları',
    titleEn: 'Eastern Anatolia Tours',
    slug: 'dogu-anadolu-turlari',
    image: HUB_IMAGES['dogu-anadolu'],
  },
  {
    id: 'gunubirlik',
    code: 'gunubirlik',
    titleTr: 'Günübirlik Turlar',
    titleEn: 'Day Tours',
    slug: 'gunubirlik-turlar',
    image: HUB_IMAGES.gunubirlik,
  },
  {
    id: 'marmara',
    code: 'marmara',
    titleTr: 'Marmara Bölgesi',
    titleEn: 'Marmara Region',
    slug: 'marmara-turlari',
    image: HUB_IMAGES.marmara,
  },
]

function isEn(locale: string) {
  return locale === 'en' || locale.startsWith('en-')
}

function regionListPath(code: string, extra = '') {
  return `/turlar/all?tour_region=${encodeURIComponent(code)}${extra}`
}

export function getKulturTourHubCategories(locale: string): CategoryHubGridCard[] {
  const en = isEn(locale)
  return KULTUR_TOUR_HUB_REGIONS.map((r) => ({
    id: r.id,
    hubCode: r.code,
    title: en ? r.titleEn : r.titleTr,
    titleEn: r.titleEn,
    image: r.image,
    path: regionListPath(r.code),
    links: [
      {
        label: en ? 'All tours' : 'Tüm turlar',
        path: regionListPath(r.code),
      },
      ...(r.code === 'kapadokya' || r.code === 'karadeniz'
        ? [
            {
              label: en ? 'By plane' : 'Uçaklı turlar',
              path: regionListPath(r.code, '&tour_travel_type=plane'),
            },
          ]
        : []),
      {
        label: en ? 'By bus' : 'Otobüslü turlar',
        path: regionListPath(r.code, '&tour_travel_type=bus'),
      },
    ],
  }))
}

/** Page builder / kültür landing hub config */
export function buildKulturTourHubGridConfig(locale = 'tr') {
  const en = isEn(locale)
  return {
    heading: en ? 'Cultural tours across Turkey' : 'Türkiye kültür turları',
    headingEn: 'Cultural tours across Turkey',
    subheading: en
      ? 'Explore historical regions — Cappadocia, Black Sea, GAP and more. Pick a region to see matching programs.'
      : 'Kapadokya, Karadeniz, GAP ve daha fazlası — bölgeye göre kültür turlarını keşfedin.',
    subheadingEn:
      'Explore historical regions — Cappadocia, Black Sea, GAP and more. Pick a region to see matching programs.',
    cards: getKulturTourHubCategories(locale),
  }
}

export function allKulturRegionCodesParam(): string {
  return KULTUR_REGION_CODES.join(',')
}
