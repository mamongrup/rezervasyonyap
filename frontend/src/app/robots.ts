import type { MetadataRoute } from 'next'
import { isAppLocale } from '@/lib/i18n-config'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'

/** Host’a göre Sitemap / Host satırı — marka domain cache karışmasın. */
export const dynamic = 'force-dynamic'

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
  '/forgot-password',
  '/checkout',
  '/orders',
  '/home-2',
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

/**
 * Host’a göre Host + Sitemap (marka domainleri kendi köküne işaret etmeli).
 * Aksi halde Google .com.tr / reservationinturkey.com’u .tr sitemap’ine yönlendirir.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (await resolveCanonicalBaseUrl()).replace(/\/$/, '')
  return {
    rules: [
      {
        userAgent: '*',
        // `/api` genel olarak kapalı. Daha spesifik allow kuralları (yol uzunluğu
        // önceliği) Googlebot / sosyal crawler'ların şu uçlara erişmesini sağlar:
        // - share-jpeg: Meta/Instagram paylaşım görselleri
        // - og/listing (+ og/ad): Open Graph / Twitter kart + Google görsel keşfi
        // `/api` kapalı; GSC’ye gönderilen API sitemap ve OG/share uçları açık.
        allow: [
          '/',
          '/api/social/share-jpeg',
          '/api/og/listing',
          '/api/og/ad',
          '/api/og/category',
          '/api/v1/seo/sitemap.xml',
        ],
        disallow: withLocalizedVariants(PRIVATE_SEGMENTS),
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  }
}
