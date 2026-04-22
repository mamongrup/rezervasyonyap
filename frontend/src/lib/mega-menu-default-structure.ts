/** Mega menü site ayarı şablonu — yalnızca id + url; metinler `navMenus.megaMenu` (dil dosyaları) */

export type MegaMenuStoredChild = { id: string; url: string }

export type MegaMenuStoredGroup = {
  id: string
  url: string
  children: MegaMenuStoredChild[]
}

/** Varsayılan yapı — `getNavigation()` mega menü ile uyumlu id’ler */
export const DEFAULT_MEGA_MENU_STRUCTURE: MegaMenuStoredGroup[] = [
  {
    id: '1',
    url: '#',
    children: [
      { id: '1-1', url: '/oteller/all' },
      { id: '1-2', url: '/tatil-evleri/all' },
      { id: '1-3', url: '/yat-kiralama/all' },
    ],
  },
  {
    id: '1b',
    url: '#',
    children: [
      { id: '1b-1', url: '/turlar/all' },
      { id: '1b-2', url: '/aktiviteler/all' },
      { id: '1b-3', url: '/kruvaziyer/all' },
      { id: '1b-4', url: '/hac-umre/all' },
      { id: '1b-5', url: '/vize/all' },
    ],
  },
  {
    id: '1c',
    url: '#',
    children: [
      { id: '1c-1', url: '/ucak-bileti/all' },
      { id: '1c-2', url: '/arac-kiralama/all' },
      { id: '1c-3', url: '/feribot/all' },
      { id: '1c-4', url: '/transfer/all' },
    ],
  },
  {
    id: '2',
    url: '#',
    children: [
      { id: '2-1', url: '/otel/best-western-cedars-hotel' },
      { id: '2-2', url: '/arac/peugeot-108' },
      { id: '2-3', url: '/aktivite/generate-interactive-markets' },
    ],
  },
  {
    id: '4',
    url: '/#',
    children: [
      { id: '4-1', url: '/authors/truelock-alric' },
      { id: '4-2', url: '/blog' },
      { id: '4-3', url: '/checkout' },
      { id: '4-5', url: '/contact' },
      { id: '4-6', url: '/login' },
      { id: '4-8', url: '/account' },
      { id: '4-7', url: '/add-listing/1' },
    ],
  },
]

export const KNOWN_MEGA_GROUP_IDS = DEFAULT_MEGA_MENU_STRUCTURE.map((g) => g.id)
