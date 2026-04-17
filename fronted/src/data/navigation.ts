export type TNavigationItem = Partial<{
  id: string
  href: string
  name: string
  type?: 'dropdown' | 'mega-menu'
  isNew?: boolean
  children?: TNavigationItem[]
}>

/** API yok veya boş menüde kullanılan yerleşik üst şerit (yönetimde `header` menüsü ile değiştirilebilir) */
export const STATIC_NAVIGATION: TNavigationItem[] = [
    {
      id: '1',
      href: '/oteller/all',
      name: 'Oteller',
    },
    {
      id: '2',
      href: '/tatil-evleri/all',
      name: 'Tatil Evleri & Villalar',
    },
    {
      id: '4',
      href: '/arac-kiralama/all',
      name: 'Araç Kiralama',
    },
    {
      id: '6',
      href: '/ilan-ver',
      name: '📋 İlan Ver',
    },
    {
      id: '5',
      href: '/',
      name: 'Kategoriler',
      type: 'mega-menu',
      children: [
        {
          id: '1',
          href: '#',
          name: 'Konaklama',
          children: [
            { id: '1-1', href: '/oteller/all', name: 'Oteller' },
            { id: '1-2', href: '/tatil-evleri/all', name: 'Tatil Evleri & Villalar' },
            { id: '1-3', href: '/yat-kiralama/all', name: 'Yat Kiralama' },
          ],
        },
        {
          id: '1b',
          href: '#',
          name: 'Deneyimler',
          children: [
            { id: '1b-1', href: '/turlar/all', name: 'Turlar' },
            { id: '1b-2', href: '/aktiviteler/all', name: 'Aktiviteler' },
            { id: '1b-3', href: '/kruvaziyer/all', name: 'Kruvaziyer' },
            { id: '1b-4', href: '/hac-umre/all', name: 'Hac & Umre' },
            { id: '1b-5', href: '/vize/all', name: 'Vize Hizmetleri' },
          ],
        },
        {
          id: '1c',
          href: '#',
          name: 'Ulaşım',
          children: [
            { id: '1c-1', href: '/ucak-bileti/all', name: 'Uçak Bileti' },
            { id: '1c-2', href: '/arac-kiralama/all', name: 'Araç Kiralama' },
            { id: '1c-3', href: '/feribot/all', name: 'Feribot' },
            { id: '1c-4', href: '/transfer/all', name: 'Transfer' },
          ],
        },
        {
          id: '2',
          href: '#',
          name: 'İlan Sayfaları',
          children: [
            { id: '2-1', href: '/otel/best-western-cedars-hotel', name: 'Otel detay' },
            { id: '2-2', href: '/arac/peugeot-108', name: 'Araç detay' },
            { id: '2-3', href: '/aktivite/generate-interactive-markets', name: 'Deneyim detay' },
          ],
        },
        {
          id: '4',
          href: '/#',
          name: 'Other Pages',
          type: 'dropdown',
          children: [
            { id: '4-1', href: '/authors/truelock-alric', name: 'Host profile' },
            { id: '4-2', href: '/blog', name: 'Blog' },
            { id: '4-3', href: '/checkout', name: 'Checkout' },
            { id: '4-5', href: '/contact', name: 'Contact' },
            { id: '4-6', href: '/login', name: 'Login/Signup' },
            { id: '4-8', href: '/account', name: 'Account' },
            { id: '4-7', href: '/add-listing/1', name: 'Add listing' },
          ],
        },
      ],
    },
]

export async function getNavigation(): Promise<TNavigationItem[]> {
  try {
    const { fetchPublicNavMenuItems } = await import('@/lib/travel-api')
    const { buildNavTreeFromItems } = await import('@/lib/nav-from-api')
    const { withDevNoStore } = await import('@/lib/api-fetch-dev')
    const { items } = await fetchPublicNavMenuItems('header', undefined, withDevNoStore({ next: { revalidate: 120 } }))
    if (items.length > 0) {
      return buildNavTreeFromItems(items)
    }
  } catch {
    /* Backend kapalı veya menü yok */
  }
  return STATIC_NAVIGATION
}

type RawMegaChild = { id?: string; label?: string; url: string }
type RawMegaGroup = { id: string; label?: string; url?: string; children?: RawMegaChild[] }

export async function getNavMegaMenu(): Promise<TNavigationItem> {
  // Try to load mega menu from admin-managed site settings
  try {
    const { getCachedSiteConfig } = await import('@/lib/site-config-cache')
    const cfg = await getCachedSiteConfig()
    // Check top-level mega_menu key first, then branding.mega_menu
    const raw =
      (cfg != null && Array.isArray((cfg as Record<string, unknown>).mega_menu)
        ? (cfg as Record<string, unknown>).mega_menu
        : null) ??
      (cfg != null &&
      cfg.branding &&
      Array.isArray((cfg.branding as Record<string, unknown>).mega_menu)
        ? (cfg.branding as Record<string, unknown>).mega_menu
        : null)

    if (Array.isArray(raw) && raw.length > 0) {
      return {
        id: 'admin-mega-menu',
        name: '',
        type: 'mega-menu',
        children: (raw as RawMegaGroup[]).map((group, gi) => ({
          id: group.id ?? `g${gi}`,
          name: group.label ?? '',
          href: group.url || '#',
          children: (group.children ?? []).map((c, ci) => ({
            id: c.id ?? `g${gi}-c${ci}`,
            name: c.label ?? '',
            href: c.url || '#',
          })),
        })),
      }
    }
  } catch {
    // fall through to default
  }

  // Default: yerleşik listedeki mega menü (getNavigation() API çağırır; döngüyü önlemek için STATIC_NAVIGATION)
  const mega = STATIC_NAVIGATION.find((item) => item.type === 'mega-menu')
  return mega ?? {}
}

/** Mega menü — yapı site ayarı, görünen metinler dil dosyalarında (`navMenus.megaMenu`) */
export async function getNavMegaMenuLocalized(locale: string): Promise<TNavigationItem> {
  const { getMessages } = await import('@/utils/getT')
  const { localizeMegaMenu } = await import('@/lib/nav-menus-localize')
  const mega = await getNavMegaMenu()
  return localizeMegaMenu(mega, getMessages(locale))
}

/** Tam navigasyon — mega menü öğesi (id `5`) dil dosyalarıyla birleştirilir */
export async function getNavigationLocalized(locale: string): Promise<TNavigationItem[]> {
  const { getMessages } = await import('@/utils/getT')
  const { localizeMegaMenu } = await import('@/lib/nav-menus-localize')
  const { vitrinNavItemTree } = await import('@/lib/vitrin-href')
  const nav = await getNavigation()
  const mega = await getNavMegaMenu()
  const megaLoc = localizeMegaMenu(mega, getMessages(locale))
  const merged = nav.map((item) => {
    if (item.type === 'mega-menu') {
      return {
        ...item,
        ...megaLoc,
        id: item.id,
        type: 'mega-menu' as const,
        children: megaLoc.children,
      }
    }
    return item
  })
  return vitrinNavItemTree(locale, merged)
}

/** Mobil / yan çekmece menü — yerelleştirilmiş üst öğeler + mega kategoriler */
export async function getSidebarNavigation(locale: string): Promise<TNavigationItem[]> {
  const { getMessages } = await import('@/utils/getT')
  const { applySidebarNavLabels } = await import('@/lib/nav-sidebar-localize')
  const nav = await getNavigationLocalized(locale)
  return applySidebarNavLabels(nav, getMessages(locale))
}

export const getLanguages = async () => {
  return [
    {
      id: 'English',
      name: 'English',
      description: 'United State',
      href: '#',
      active: true,
    },
    {
      id: 'Vietnamese',
      name: 'Vietnamese',
      description: 'Vietnamese',
      href: '#',
    },
    {
      id: 'Francais',
      name: 'Francais',
      description: 'Belgique',
      href: '#',
    },
    {
      id: 'Francais',
      name: 'Francais',
      description: 'Canada',
      href: '#',
    },
    {
      id: 'Francais',
      name: 'Francais',
      description: 'Belgique',
      href: '#',
    },
    {
      id: 'Francais',
      name: 'Francais',
      description: 'Canada',
      href: '#',
    },
  ]
}

/** Header / dil-para açılır menüsü satırı */
export type HeaderCurrencyItem = {
  id: string
  name: string
  /** Daire içinde gösterilecek sembol (flex ile ortalanır) */
  glyph: string
}

/** API yokken şablon satırları için yaygın sembol eşlemesi */
function fallbackSymbolForCurrencyCode(code: string): string {
  const m: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    GBF: '£',
    TRY: '₺',
    SAR: '﷼',
    QAR: 'ر.ق',
  }
  return m[code.toUpperCase()] ?? ''
}

/** Yönetici panelindeki `name`; boşsa ISO kodu */
function headerCurrencyDisplayName(name: string | undefined, codeUpper: string): string {
  const n = (name ?? '').trim()
  return n.length > 0 ? n : codeUpper
}

/** Uzun sembol yerine ISO kodu; kısa sembol dairede flex ile ortalanır */
function headerCurrencyGlyph(symbol: string, code: string): string {
  const raw = (symbol || '').trim()
  const c = code.trim().toUpperCase()
  if (raw.length > 4) return c
  return raw || c
}

const TEMPLATE_CURRENCY_IDS = ['EUR', 'USD', 'GBF', 'SAR', 'QAR', 'BAD'] as const

export const getCurrencies = async (): Promise<HeaderCurrencyItem[]> => {
  return TEMPLATE_CURRENCY_IDS.map((id) => {
    const sym = fallbackSymbolForCurrencyCode(id)
    return {
      id,
      name: id.toUpperCase(),
      glyph: headerCurrencyGlyph(sym, id),
    }
  })
}

/**
 * Önce backend `currencies` tablosundaki aktif kayıtlar; API yoksa veya boşsa şablon listesi.
 */
export async function resolveHeaderCurrencies(): Promise<HeaderCurrencyItem[]> {
  try {
    const { withDevNoStore } = await import('@/lib/api-fetch-dev')
    const { getPublicCurrencies } = await import('@/lib/travel-api')
    const list = await getPublicCurrencies(withDevNoStore({ next: { revalidate: 30 } }))
    const active = list
      .filter((c) => c.is_active)
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code),
      )
    if (active.length === 0) return getCurrencies()
    return active.map((c) => {
      const code = c.code.trim().toUpperCase()
      return {
        id: code,
        name: headerCurrencyDisplayName(c.name, code),
        glyph: headerCurrencyGlyph(c.symbol, code),
      }
    })
  } catch {
    return getCurrencies()
  }
}

export const getHeaderDropdownCategories = async () => {
  return [
    {
      name: 'Women',
      handle: 'all',
      description: 'New items in 2025',
      icon: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16C15.866 16 19 12.866 19 9C19 5.13401 15.866 2 12 2C8.13401 2 5 5.13401 5 9C5 12.866 8.13401 16 12 16Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 16V22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15 19H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    `,
    },
    {
      name: 'Man',
      handle: 'page-style-2/all',
      description: 'Perfect for gentlemen',
      icon: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.25 21.5C14.5302 21.5 18 18.0302 18 13.75C18 9.46979 14.5302 6 10.25 6C5.96979 6 2.5 9.46979 2.5 13.75C2.5 18.0302 5.96979 21.5 10.25 21.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21.5 2.5L16 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15 2.5H21.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    `,
    },
    {
      name: 'Sports',
      handle: 'page-style-2/all',
      description: 'The needs of sports ',
      icon: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.1801 18C19.5801 18 20.1801 16.65 20.1801 15V9C20.1801 7.35 19.5801 6 17.1801 6C14.7801 6 14.1801 7.35 14.1801 9V15C14.1801 16.65 14.7801 18 17.1801 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.81995 18C4.41995 18 3.81995 16.65 3.81995 15V9C3.81995 7.35 4.41995 6 6.81995 6C9.21995 6 9.81995 7.35 9.81995 9V15C9.81995 16.65 9.21995 18 6.81995 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.81995 12H14.1799" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22.5 14.5V9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1.5 14.5V9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg> 
     `,
    },
    {
      name: 'Beauty',
      handle: 'shoes',
      description: 'Luxury and nobility',
      icon: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.7 18.98H7.30002C6.88002 18.98 6.41002 18.65 6.27002 18.25L2.13002 6.66999C1.54002 5.00999 2.23002 4.49999 3.65002 5.51999L7.55002 8.30999C8.20002 8.75999 8.94002 8.52999 9.22002 7.79999L10.98 3.10999C11.54 1.60999 12.47 1.60999 13.03 3.10999L14.79 7.79999C15.07 8.52999 15.81 8.75999 16.45 8.30999L20.11 5.69999C21.67 4.57999 22.42 5.14999 21.78 6.95999L17.74 18.27C17.59 18.65 17.12 18.98 16.7 18.98Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.5 22H17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.5 14H14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
     `,
    },
    {
      name: 'Jewelry',
      handle: 'page-style-2/all',
      description: 'Diamond always popular',
      icon: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.7998 3.40005L7.19982 7.70005C7.09982 7.90005 6.99982 8.20005 6.89982 8.40005L5.19982 17C5.09982 17.6 5.39982 18.3 5.89982 18.6L11.1998 21.6C11.5998 21.8 12.2998 21.8 12.6998 21.6L17.9998 18.6C18.4998 18.3 18.7998 17.6 18.6998 17L16.9998 8.40005C16.9998 8.20005 16.7998 7.90005 16.6998 7.70005L13.0998 3.40005C12.4998 2.60005 11.4998 2.60005 10.7998 3.40005Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16.8002 8.5L12.5002 20.7C12.3002 21.1 11.7002 21.1 11.6002 20.7L7.2002 8.5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
     `,
    },
  ]
}
