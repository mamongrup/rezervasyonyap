import type { MetadataRoute } from 'next'
import { isAppLocale } from '@/lib/i18n-config'

/**
 * Crawl bütçesini korumak için arka plan / kullanıcı paneli / API uçlarını
 * tarayıcılara kapatıyoruz. Hem öneksiz (`/manage`) hem her dilin önekli
 * formu (`/en/manage`, `/de/manage`, ...) için.
 *
 * Not: Buraya `noindex` HTTP header da eklemek gerekebilir; ancak `disallow`
 * çoğu botu erişimden alıkoyduğu için endeks edilme şansı çok düşer.
 */
const PRIVATE_SEGMENTS: string[] = [
  '/manage',
  '/api',
  '/account',
  '/login',
  '/register',
  '/reset-password',
  '/checkout',
  '/orders',
  '/_next',
]

/** Tüm dilllerin (örn. `en`, `de`, `ru`, `zh`, `fr`) önekli varyantını çoğaltır. */
function withLocalizedVariants(paths: string[]): string[] {
  // SUPPORTED_LOCALE_CODES'u import etmek yerine isAppLocale tabanlı bir
  // sabit liste kullanıyoruz; bu fonksiyon Next build sırasında bir kez çalışır.
  const locales = ['en', 'de', 'ru', 'zh', 'fr'].filter((l) => isAppLocale(l))
  const out = new Set<string>(paths)
  for (const p of paths) {
    for (const l of locales) {
      out.add(`/${l}${p}`)
    }
  }
  return Array.from(out).sort()
}

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: withLocalizedVariants(PRIVATE_SEGMENTS),
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  }
}
