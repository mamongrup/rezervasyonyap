import { pickI18n, type I18nFieldMap } from '@/lib/i18n-field'

export type FooterDisplayLink = {
  name: string
  href?: string
}

export type FooterDisplayColumn = {
  title: string
  links: FooterDisplayLink[]
}

export type FooterFiveSectionLayout = {
  categoryGroups: FooterDisplayColumn[]
  destinations: FooterDisplayColumn
  support: FooterDisplayColumn
  company: FooterDisplayColumn
  partners: FooterDisplayColumn
}

export const FOOTER_CATEGORIES_TITLE_I18N: I18nFieldMap = {
  tr: 'Kategoriler',
  en: 'Categories',
  de: 'Kategorien',
  ru: 'Категории',
  zh: '分类',
  fr: 'Catégories',
}

export const FOOTER_REGIONS_TITLE_I18N: I18nFieldMap = {
  tr: 'Bölgeler',
  en: 'Regions',
  de: 'Regionen',
  ru: 'Регионы',
  zh: '地区',
  fr: 'Régions',
}

export const FOOTER_DESTINATIONS_TITLE_I18N: I18nFieldMap = FOOTER_REGIONS_TITLE_I18N

export const FOOTER_SUPPORT_TITLE_I18N: I18nFieldMap = {
  tr: 'Destek',
  en: 'Support',
  de: 'Support',
  ru: 'Поддержка',
  zh: '支持',
  fr: 'Support',
}

export const FOOTER_COMPANY_TITLE_I18N: I18nFieldMap = {
  tr: 'Kurumsal',
  en: 'Company',
  de: 'Unternehmen',
  ru: 'Компания',
  zh: '公司',
  fr: 'Entreprise',
}

export const FOOTER_PARTNERSHIPS_TITLE_I18N: I18nFieldMap = {
  tr: 'Ortaklık',
  en: 'Partnerships',
  de: 'Partnerschaften',
  ru: 'Партнёрство',
  zh: '合作',
  fr: 'Partenariats',
}

export function footerCategoriesTitle(locale: string): string {
  return pickI18n(FOOTER_CATEGORIES_TITLE_I18N, locale, 'Categories')
}

export function footerRegionsTitle(locale: string): string {
  return pickI18n(FOOTER_REGIONS_TITLE_I18N, locale, 'Regions')
}

export function footerDestinationsTitle(locale: string): string {
  return footerRegionsTitle(locale)
}

export function footerSupportTitle(locale: string): string {
  return pickI18n(FOOTER_SUPPORT_TITLE_I18N, locale, 'Support')
}

export function footerCompanyTitle(locale: string): string {
  return pickI18n(FOOTER_COMPANY_TITLE_I18N, locale, 'Company')
}

export function footerPartnershipsTitle(locale: string): string {
  return pickI18n(FOOTER_PARTNERSHIPS_TITLE_I18N, locale, 'Partnerships')
}

function findColumn(
  columns: FooterDisplayColumn[],
  predicate: (link: FooterDisplayLink) => boolean,
  fallbackIndex?: number,
): FooterDisplayColumn | undefined {
  const matched = columns.find((column) => column.links.some(predicate))
  if (matched) return matched
  if (fallbackIndex !== undefined && columns[fallbackIndex]) {
    return columns[fallbackIndex]
  }
  return undefined
}

function emptyColumn(defaultTitle = ''): FooterDisplayColumn {
  return { title: defaultTitle, links: [] }
}

/**
 * Yönetilebilir sekiz kaynak sütunu, vitrinde istenen beş ana bölüme dönüştürür:
 * 1. Marka (Logo, slogan, trust badges)
 * 2. Kategoriler (Konaklama, Deneyim, Hizmetler, Bölgeler açılır akordeon)
 * 3. Destek
 * 4. Kurumsal
 * 5. Ortaklık
 */
export function buildFooterFiveSectionLayout(
  columns: FooterDisplayColumn[],
  locale: string = 'tr',
): FooterFiveSectionLayout {
  const stays =
    findColumn(
      columns,
      (l) =>
        Boolean(
          l.href?.includes('/oteller/all') ||
            l.href?.includes('/tatil-evleri/all') ||
            l.href?.includes('/yat-kiralama/all'),
        ),
      0,
    ) ?? emptyColumn()

  const experiences =
    findColumn(
      columns,
      (l) =>
        Boolean(
          l.href?.includes('/turlar/all') ||
            l.href?.includes('/kruvaziyer/all') ||
            l.href?.includes('/hac-umre/all') ||
            l.href?.includes('/aktiviteler/all') ||
            l.href?.includes('/plaj-sezlong/all'),
        ),
      1,
    ) ?? emptyColumn()

  const travel =
    findColumn(
      columns,
      (l) =>
        Boolean(
          l.href?.includes('/arac-kiralama/all') ||
            l.href?.includes('/ucak-bileti/all') ||
            l.href?.includes('/transfer/all') ||
            l.href?.includes('/feribot/all'),
        ),
      2,
    ) ?? emptyColumn()

  const services =
    findColumn(
      columns,
      (l) =>
        Boolean(
          l.href?.includes('/vize/all') ||
            l.href?.includes('service=esim') ||
            l.href?.includes('service=seyahat-sigortasi'),
        ),
      3,
    ) ?? emptyColumn()

  const destinationsCol =
    findColumn(
      columns,
      (l) =>
        Boolean(
          l.href?.includes('/oteller/istanbul') ||
            l.href?.includes('/oteller/antalya') ||
            l.href?.includes('/bolge/turkiye'),
        ),
      4,
    ) ?? emptyColumn()

  const supportCol =
    findColumn(
      columns,
      (l) => {
        if (!l.href) return false
        const clean = l.href.split('?')[0].split('#')[0].replace(/^\/[a-z]{2}(\/|$)/i, '/')
        const isCleanContact = clean === '/contact' || clean === '/iletisim'
        return Boolean(
          (isCleanContact && !l.href.includes('?')) ||
            l.href.includes('/legal/faq') ||
            l.href.includes('/legal/terms') ||
            l.href.includes('/legal/privacy') ||
            l.href.includes('/legal/cancellation') ||
            l.href.includes('/about#nasil-calisir'),
        )
      },
      5,
    ) ?? emptyColumn()

  const companyCol =
    findColumn(
      columns,
      (l) => {
        if (!l.href) return false
        const clean = l.href.split('?')[0].split('#')[0].replace(/^\/[a-z]{2}(\/|$)/i, '/')
        const isCleanAbout = clean === '/about' || clean === '/hakkimizda'
        return Boolean(
          (isCleanAbout && !l.href.includes('#')) ||
            l.href.includes('/blog') ||
            l.href.includes('/about#kariyer') ||
            l.href.includes('/about#basin') ||
            l.href.includes('/about#surdurulebilirlik'),
        )
      },
      6,
    ) ?? emptyColumn()

  const partnersCol =
    findColumn(
      columns,
      (l) =>
        Boolean(
          l.href?.includes('/tedarikci-ol') ||
            l.href?.includes('/tesis-yonetimi') ||
            l.href?.includes('/manage/supplier') ||
            l.href?.includes('/acente-ol') ||
            l.href?.includes('/manage/agency') ||
            l.href?.includes('/developer'),
        ),
      7,
    ) ?? emptyColumn()

  const regions: FooterDisplayColumn = {
    ...destinationsCol,
    title: footerRegionsTitle(locale),
  }

  return {
    categoryGroups: [
      stays,
      experiences,
      {
        title: services.title,
        links: [...travel.links, ...services.links],
      },
      regions,
    ],
    destinations: emptyColumn(),
    support: {
      ...supportCol,
      title: supportCol.title || footerSupportTitle(locale),
    },
    company: {
      ...companyCol,
      title: companyCol.title || footerCompanyTitle(locale),
    },
    partners: {
      ...partnersCol,
      title: footerPartnershipsTitle(locale),
    },
  }
}

