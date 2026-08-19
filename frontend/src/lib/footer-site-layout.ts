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

export function footerPartnershipsTitle(locale: string): string {
  return pickI18n(FOOTER_PARTNERSHIPS_TITLE_I18N, locale, 'Partnerships')
}

function findColumn(
  columns: FooterDisplayColumn[],
  href: string,
): FooterDisplayColumn | undefined {
  return columns.find((column) => column.links.some((link) => link.href === href))
}

function emptyColumn(): FooterDisplayColumn {
  return { title: '', links: [] }
}

/**
 * Yönetilebilir sekiz kaynak sütunu, vitrinde istenen beş ana bölüme dönüştürür:
 * marka + kategoriler + destek + kurumsal + ortaklık.
 * Başlığa göre değil bağlantıya göre eşleştirildiği için sütun sırası/dili değişebilir.
 */
export function buildFooterFiveSectionLayout(
  columns: FooterDisplayColumn[],
): FooterFiveSectionLayout {
  const stays = findColumn(columns, '/oteller/all') ?? emptyColumn()
  const experiences = findColumn(columns, '/turlar/all') ?? emptyColumn()
  const travel = findColumn(columns, '/arac-kiralama/all') ?? emptyColumn()
  const services = findColumn(columns, '/vize/all') ?? emptyColumn()
  const destinations = findColumn(columns, '/oteller/istanbul') ?? emptyColumn()
  const support = findColumn(columns, '/contact') ?? emptyColumn()
  const company = findColumn(columns, '/about') ?? emptyColumn()
  const partners = findColumn(columns, '/tedarikci-ol') ?? emptyColumn()

  return {
    categoryGroups: [
      stays,
      experiences,
      {
        title: services.title,
        links: [...travel.links, ...services.links],
      },
    ],
    destinations,
    support,
    company,
    partners,
  }
}
