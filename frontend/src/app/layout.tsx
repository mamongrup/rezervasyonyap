import { LocaleHtmlAttributes } from '@/components/LocaleHtmlAttributes'
import SearchLoadingOverlay from '@/components/SearchLoadingOverlay'
import { ThemeProvider } from '@/components/theme-provider'
import { DirectionProvider } from '@/components/ui/direction'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import {
  brandingAssetPath,
  brandingKeywords,
  brandingSiteName,
  DEFAULT_FAVICON_PATH,
  metaSiteDescription,
  ogLocaleForSite,
  shareOgImageMeta,
  toAbsoluteSiteUrl,
} from '@/lib/site-branding-seo'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import {
  resolveRequestBranding,
  resolveSearchConsoleVerification,
} from '@/lib/request-branding-seo'
import { cn } from '@/lib/utils'
import '@/styles/tailwind.css'
import type { Metadata, Viewport } from 'next'
import type { SitePublicConfig } from '@/lib/travel-api'
import { headers } from 'next/headers'
import { Suspense } from 'react'

const themeDirection =
  process.env.NEXT_PUBLIC_THEME_DIR === 'rtl' ? ('rtl' as const) : ('ltr' as const)

/** Kök şablon — çoğu sayfa `[locale]/layout` ile üzerine yazar; yine de admin `branding` ile uyumlu varsayılan. */
export async function generateMetadata(): Promise<Metadata> {
  const pub = await getCachedSiteConfig()
  const { hostname, branding: hostBranding } = await resolveRequestBranding(
    (pub?.branding ?? null) as Record<string, unknown> | null,
  )
  const pubForBrand = (pub ? { ...pub, branding: hostBranding } : null) as SitePublicConfig | null
  const siteName = brandingSiteName(pubForBrand)
  const description = metaSiteDescription(pubForBrand)
  const keywords = brandingKeywords(pubForBrand, siteName)
  const scVerification = resolveSearchConsoleVerification(
    (pub?.analytics ?? null) as Record<string, unknown> | null,
    hostname,
  )
  const base = await resolveCanonicalBaseUrl()
  const verification: Metadata['verification'] = scVerification ? { google: scVerification } : undefined

  const faviconPath = brandingAssetPath(pubForBrand, 'favicon_url')
  const shareImage = shareOgImageMeta(base, pubForBrand, siteName)
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
    ...(shareImage && { images: [shareImage] }),
  }

  const twitter: Metadata['twitter'] = {
    card: shareImage ? 'summary_large_image' : 'summary',
    title: siteName,
    description,
    ...(shareImage && { images: [shareImage.url] }),
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const fromProxy = (h.get('x-html-lang') ?? '').trim().toLowerCase()
  const lang = fromProxy && isAppLocale(fromProxy) ? fromProxy : defaultLocale
  const dir = themeDirection === 'rtl' ? ('rtl' as const) : ('ltr' as const)

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={cn('light min-w-0 overflow-x-hidden font-sans')}
    >
      <body className="min-w-0 overflow-x-hidden bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <DirectionProvider dir={themeDirection} direction={themeDirection}>
            <FavoritesProvider>
              <div>
                <LocaleHtmlAttributes />
                <Suspense fallback={null}>
                  <SearchLoadingOverlay />
                </Suspense>
                {children}
              </div>
            </FavoritesProvider>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
