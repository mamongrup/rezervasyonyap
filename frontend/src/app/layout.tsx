import { LocaleHtmlAttributes } from '@/components/LocaleHtmlAttributes'
import { ThemeProvider } from '@/components/theme-provider'
import { DirectionProvider } from '@/components/ui/direction'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { defaultLocale } from '@/lib/i18n-config'
import {
  brandingAssetPath,
  brandingKeywords,
  brandingSiteName,
  DEFAULT_FAVICON_PATH,
  getPublicSiteUrl,
  metaSiteDescription,
  ogLocaleForSite,
  toAbsoluteSiteUrl,
} from '@/lib/site-branding-seo'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { cn } from '@/lib/utils'
import '@/styles/tailwind.css'
import type { Metadata, Viewport } from 'next'
import type { SitePublicConfig } from '@/lib/travel-api'
import { Poppins } from 'next/font/google'
import 'rc-slider/assets/index.css'

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-sans',
  /**
   * 4 woff2 → 3'e indirildi (300 + 600 çıkarıldı). PSI mobil "Kritik istek zinciri"nde
   * her woff2 ~1.5-1.9 sn. 600 (semibold) çağrıları en yakın ağırlığa (700) düşürülür.
   * Görsel etki minimal, LCP / kritik yol kazancı yüksek.
   */
  weight: ['400', '500', '700'],
  display: 'swap',
  adjustFontFallback: true,
  fallback: ['system-ui', 'arial'],
})

const themeDirection =
  process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? ('rtl' as const) : ('ltr' as const)

function searchConsoleVerification(pub: SitePublicConfig | null): string {
  if (!pub?.analytics) return ''
  const an = pub.analytics as Record<string, unknown>
  return typeof an.search_console_verification === 'string' ? an.search_console_verification : ''
}

/** Kök şablon — çoğu sayfa `[locale]/layout` ile üzerine yazar; yine de admin `branding` ile uyumlu varsayılan. */
export async function generateMetadata(): Promise<Metadata> {
  const pub = await getCachedSiteConfig()
  const siteName = brandingSiteName(pub)
  const description = metaSiteDescription(pub)
  const keywords = brandingKeywords(pub, siteName)
  const scVerification = searchConsoleVerification(pub)
  const base = getPublicSiteUrl()
  const verification: Metadata['verification'] = scVerification ? { google: scVerification } : undefined

  const logoPath = brandingAssetPath(pub, 'logo_url')
  const faviconPath = brandingAssetPath(pub, 'favicon_url')
  const ogImageUrl = toAbsoluteSiteUrl(base, logoPath)
  const faviconRel = faviconPath.trim() ? faviconPath : DEFAULT_FAVICON_PATH
  const faviconNormalized = faviconRel.startsWith('/') ? faviconRel : `/${faviconRel}`
  const faviconUrl = toAbsoluteSiteUrl(base, faviconNormalized)

  const hrefForDefault = base ? `${base}/` : undefined

  const titleBlock: Metadata['title'] = {
    template: `%s - ${siteName}`,
    default: siteName,
  }

  const openGraph: Metadata['openGraph'] = {
    type: 'website',
    siteName,
    title: siteName,
    description,
    locale: ogLocaleForSite(defaultLocale),
    ...(hrefForDefault && { url: hrefForDefault }),
    ...(ogImageUrl && {
      images: [{ url: ogImageUrl, alt: siteName, width: 1200, height: 630 }],
    }),
  }

  const twitter: Metadata['twitter'] = {
    card: ogImageUrl ? 'summary_large_image' : 'summary',
    title: siteName,
    description,
    ...(ogImageUrl && { images: [ogImageUrl] }),
  }

  const icons: Metadata['icons'] = base
    ? {
        icon: [{ url: faviconUrl ?? faviconNormalized }],
        apple: [{ url: faviconUrl ?? faviconNormalized }],
      }
    : {
        icon: [{ url: faviconNormalized }],
        apple: [{ url: faviconNormalized }],
      }

  const core: Metadata = {
    applicationName: siteName,
    title: titleBlock,
    description,
    keywords,
    robots: { index: true, follow: true },
    verification,
    openGraph,
    twitter,
    icons,
  }

  if (base) {
    try {
      return { metadataBase: new URL(base), ...core }
    } catch {
      return core
    }
  }
  return core
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#171717' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={themeDirection === 'rtl' ? 'ar' : 'en'}
      dir={themeDirection}
      suppressHydrationWarning
      className={cn('font-sans', poppins.variable)}
    >
      <body className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <DirectionProvider dir={themeDirection} direction={themeDirection}>
            <FavoritesProvider>
              <div>
                <LocaleHtmlAttributes />
                {children}
              </div>
            </FavoritesProvider>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
