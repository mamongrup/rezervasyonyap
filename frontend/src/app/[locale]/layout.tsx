import ChunkLoadRecovery from '@/components/ChunkLoadRecovery'
import SiteJsonLd from '@/components/seo/SiteJsonLd'
import GoogleScripts from '@/components/seo/GoogleScripts'
import { SiteUiFooterHtml, SiteUiHeaderHtml } from '@/components/seo/SiteUiHtmlSnippets'
import { AvailableLocalesProvider } from '@/contexts/available-locales-context'
import { PreferredCurrencyProvider } from '@/contexts/preferred-currency-context'
import { LocalizedRoutesProvider } from '@/contexts/localized-routes-context'
import { LocaleProvider } from '@/contexts/locale-context'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import { fetchActiveLocales, fetchLocalizedRoutes } from '@/lib/i18n-server'
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
import type { Metadata } from 'next'
import type { SitePublicConfig } from '@/lib/travel-api'
import { getPublicCurrencyRates } from '@/lib/travel-api'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

export const dynamicParams = true
// Metadata ve vitrin verileri hostname/request bağlamına bağlıdır. Locale'leri
// statik parametre listesiyle build sırasında zorla üretmek Next 16 worker'ında
// request workStore olmadan hesap rotalarını prerender etmeye çalıştırıyordu.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
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

  const rows = await fetchActiveLocales()
  const codes = rows.map((r) => r.code)
  const base = (await resolveCanonicalBaseUrl()).replace(/\/$/, '')
  const hrefForLocale = (l: string) =>
    l === defaultLocale ? `${base}/` : `${base}/${l}`

  const titleBlock: Metadata['title'] = {
    template: `%s - ${siteName}`,
    default: siteName,
  }

  const verification: Metadata['verification'] = scVerification
    ? { google: scVerification }
    : undefined

  const faviconPath = brandingAssetPath(pubForBrand, 'favicon_url')
  const shareImage = shareOgImageMeta(base, pubForBrand, siteName)
  const faviconRel = faviconPath.trim() ? faviconPath : DEFAULT_FAVICON_PATH
  const faviconNormalized = faviconRel.startsWith('/') ? faviconRel : `/${faviconRel}`
  const faviconUrl = toAbsoluteSiteUrl(base, faviconNormalized)

  const canonical = base ? hrefForLocale(locale) : undefined
  // hreflang yalnızca mutlak kök biliniyorsa; aksi halde göreli `/` üretmek SEO araçlarında hataya düşer.
  const alternateLanguages: Record<string, string> | undefined = (() => {
    if (!base) return undefined
    const m: Record<string, string> = Object.fromEntries(codes.map((l) => [l, hrefForLocale(l)]))
    m['x-default'] = hrefForLocale(defaultLocale)
    return m
  })()

  const openGraph: Metadata['openGraph'] = {
    type: 'website',
    siteName,
    title: siteName,
    description,
    locale: ogLocaleForSite(locale),
    ...(canonical && { url: canonical }),
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
    alternates: {
      canonical: canonical ?? undefined,
      ...(alternateLanguages ? { languages: alternateLanguages } : {}),
    },
  }

  if (base) {
    try {
      return {
        metadataBase: new URL(base),
        ...core,
      }
    } catch {
      return core
    }
  }

  return core
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const rows = await fetchActiveLocales()
  const allowed = new Set(rows.map((r) => r.code))
  if (!isAppLocale(locale) || !allowed.has(locale)) {
    notFound()
  }
  const options = rows.map((r) => ({ code: r.code, name: r.name }))
  const localizedRoutes = await fetchLocalizedRoutes()
  // 300 sn: layout tüm sayfaları sarar; daha kısa revalidate tüm vitrinin
  // Cache-Control s-maxage'ini düşürür (PSI TTFB dalgalanması).
  const initialCurrencyRates = await getPublicCurrencyRates({
    next: { revalidate: 300 },
  } as RequestInit).catch(() => [] as Awaited<ReturnType<typeof getPublicCurrencyRates>>)
  return (
    <AvailableLocalesProvider locales={options}>
      <LocalizedRoutesProvider routes={localizedRoutes}>
        <LocaleProvider locale={locale}>
          <PreferredCurrencyProvider initialRates={initialCurrencyRates}>
            <ChunkLoadRecovery />
            {/* SEO/analitik ayarları uzak API'den gelir. Kritik içerik ve LCP
                bunların yanıtını beklemeden ayrı stream edilir. */}
            <Suspense fallback={null}>
              <SiteJsonLd locale={locale} />
              <GoogleScripts />
              <SiteUiHeaderHtml />
            </Suspense>
            {children}
            <Suspense fallback={null}>
              <SiteUiFooterHtml />
            </Suspense>
          </PreferredCurrencyProvider>
        </LocaleProvider>
      </LocalizedRoutesProvider>
    </AvailableLocalesProvider>
  )
}
