import { describe, expect, it } from 'vitest'
import savedFooterConfig from '../../public/site-data/footer.json'
import { DEFAULT_FOOTER_SITE_CONFIG } from '@/lib/footer-site-defaults'

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
]

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
})
