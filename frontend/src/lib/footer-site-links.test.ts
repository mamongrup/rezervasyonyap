import { describe, expect, it } from 'vitest'
import savedFooterConfig from '../../public/site-data/footer.json'
import { DEFAULT_FOOTER_SITE_CONFIG } from '@/lib/footer-site-defaults'
import { getFooterSiteConfig } from '@/lib/footer-site-config'
import {
  buildFooterFiveSectionLayout,
  FOOTER_CATEGORIES_TITLE_I18N,
  FOOTER_COMPANY_TITLE_I18N,
  FOOTER_PARTNERSHIPS_TITLE_I18N,
  FOOTER_REGIONS_TITLE_I18N,
  FOOTER_SUPPORT_TITLE_I18N,
} from '@/lib/footer-site-layout'

const requiredCategoryLinks = [
  '/oteller/all',
  '/tatil-evleri/all',
  '/yat-kiralama/all',
  '/turlar/all',
  '/aktiviteler/all',
  '/arac-kiralama/all',
  '/transfer/all',
  '/feribot/all',
  '/ucak-bileti/all',
  '/vize/all',
  '/hac-umre/all',
  '/kruvaziyer/all',
  '/plaj-sezlong/all',
  '/sinema-biletleri/all',
  '/restoran-rezervasyon/all',
  '/contact?service=esim',
  '/contact?service=seyahat-sigortasi',
]

const expectedExploreGroups = {
  Konaklama: ['Otel', 'Villa', 'Yat'],
  Deneyim: ['Tur', 'Cruise', 'Hac & Umre', 'Aktivite', 'Şezlong', 'Restoran', 'Sinema'],
  Yolculuk: ['Araç', 'Uçak', 'Transfer', 'Feribot'],
  Hizmetler: ['Vize', 'eSIM', 'Sigorta'],
}

const activeLocales = ['tr', 'en', 'de', 'ru', 'zh', 'fr']

function linksOf(config: {
  columns: Array<{ links: Array<{ nameTr: string; href: string }> }>
}) {
  return config.columns.flatMap((column) => column.links)
}

describe('footer site links', () => {
  it.each([
    ['default config', DEFAULT_FOOTER_SITE_CONFIG],
    ['saved config', savedFooterConfig],
  ])('%s keeps the public navigation complete and correctly targeted', (_name, config) => {
    const links = linksOf(config)
    const hrefs = links.map((link) => link.href)

    expect(hrefs).toEqual(expect.arrayContaining(requiredCategoryLinks))
    expect(links.find((link) => link.nameTr === 'Nasıl Çalışır?')?.href).toBe(
      '/about#nasil-calisir',
    )
    expect(links.find((link) => link.nameTr === 'Tedarikçi Faydaları')?.href).toBe(
      '/tesis-yonetimi',
    )
    expect(links.find((link) => link.nameTr === 'Tesis Yönetimi')?.href).toBe(
      '/tesis-yonetimi',
    )
    expect(hrefs).not.toContain('/ilan-ver#nasil-calisir')
  })

  it.each([
    ['default config', DEFAULT_FOOTER_SITE_CONFIG],
    ['saved config', savedFooterConfig],
  ])('%s groups discovery links in the requested order', (_name, config) => {
    const groups = Object.fromEntries(
      config.columns.slice(0, 4).map((column) => [
        column.titleTr,
        column.links.map((link) => link.nameTr),
      ]),
    )

    expect(groups).toEqual(expectedExploreGroups)
  })

  it.each([
    ['default config', DEFAULT_FOOTER_SITE_CONFIG],
    ['saved config', savedFooterConfig],
  ])('%s keeps every discovery label complete in all storefront languages', (_name, config) => {
    const discoveryColumns = config.columns.slice(0, 4) as Array<{
      title_i18n?: Record<string, string>
      links: Array<{ name_i18n?: Record<string, string> }>
    }>

    for (const column of discoveryColumns) {
      expect(Object.keys(column.title_i18n ?? {})).toEqual(expect.arrayContaining(activeLocales))
      for (const link of column.links) {
        expect(Object.keys(link.name_i18n ?? {})).toEqual(expect.arrayContaining(activeLocales))
      }
    }
  })

  it('builds the requested five-section footer without dropping links', () => {
    const columns = DEFAULT_FOOTER_SITE_CONFIG.columns.map((column) => ({
      title: column.titleTr,
      links: column.links.map((link) => ({ name: link.nameTr, href: link.href })),
    }))
    const layout = buildFooterFiveSectionLayout(columns)

    expect(layout.categoryGroups.map((group) => group.title)).toEqual([
      'Konaklama',
      'Deneyim',
      'Hizmetler',
      'Bölgeler',
    ])
    expect(layout.categoryGroups[2].links.map((link) => link.name)).toEqual([
      'Araç',
      'Uçak',
      'Transfer',
      'Feribot',
      'Vize',
      'eSIM',
      'Sigorta',
    ])
    expect(layout.categoryGroups[3].links.map((link) => link.name)).toEqual([
      'İstanbul',
      'Antalya',
      'Bodrum',
      'Marmaris',
      'Kapadokya',
      'Tüm Bölgeler',
    ])
    expect([layout.support.title, layout.company.title, layout.partners.title]).toEqual([
      'Destek',
      'Kurumsal',
      'Ortaklık',
    ])
  })

  it('keeps the new section headings complete in all storefront languages', () => {
    for (const labels of [
      FOOTER_CATEGORIES_TITLE_I18N,
      FOOTER_REGIONS_TITLE_I18N,
      FOOTER_SUPPORT_TITLE_I18N,
      FOOTER_COMPANY_TITLE_I18N,
      FOOTER_PARTNERSHIPS_TITLE_I18N,
    ]) {
      expect(Object.keys(labels)).toEqual(expect.arrayContaining(activeLocales))
      for (const locale of activeLocales) {
        expect(labels[locale as keyof typeof labels]).toBeTruthy()
      }
    }
  })

  it('normalizes every visible footer label for all active storefront languages', async () => {
    const config = await getFooterSiteConfig()
    const maps = [
      config.tagline_i18n,
      ...config.trustBadges.flatMap((badge) => [badge.title_i18n, badge.subtitle_i18n]),
      ...config.columns.flatMap((column) => [
        column.title_i18n,
        ...column.links.map((link) => link.name_i18n),
      ]),
      ...config.legalLinks.map((link) => link.name_i18n),
    ]

    for (const map of maps) {
      for (const locale of activeLocales) {
        expect(map?.[locale as keyof typeof map]).toBeTruthy()
      }
    }
  })
})
