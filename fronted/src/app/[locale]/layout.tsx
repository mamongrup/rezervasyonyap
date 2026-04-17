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
  getPublicSiteUrl,
  metaSiteDescription,
  ogLocaleForSite,
  toAbsoluteSiteUrl,
} from '@/lib/site-branding-seo'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import type { Metadata } from 'next'
import type { SitePublicConfig } from '@/lib/travel-api'
import { getPublicCurrencyRates } from '@/lib/travel-api'
import { notFound } from 'next/navigation'

export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const rows = await fetchActiveLocales()
    return rows.map((r) => ({ locale: r.code }))
  } catch {
    return [
      { locale: 'tr' },
      { locale: 'en' },
      { locale: 'de' },
      { locale: 'ru' },
      { locale: 'zh' },
      { locale: 'fr' },
    ]
  }
}

function searchConsoleVerification(pub: SitePublicConfig | null): string {
  if (!pub?.analytics) return ''
  const an = pub.analytics as Record<string, unknown>
  return typeof an.search_console_verification === 'string' ? an.search_console_verification : ''
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const pub = await getCachedSiteConfig()
  const siteName = brandingSiteName(pub)
  const description = metaSiteDescription(pub)
  const keywords = brandingKeywords(pub, siteName)
  const scVerification = searchConsoleVerification(pub)

  const rows = await fetchActiveLocales()
  const codes = rows.map((r) => r.code)
  const base = getPublicSiteUrl()
  const hrefForLocale = (l: string) =>
    l === defaultLocale ? `${base}/` : `${base}/${l}`

  const titleBlock: Metadata['title'] = {
    template: `%s - ${siteName}`,
    default: siteName,
  }

  const verification: Metadata['verification'] = scVerification
    ? { google: scVerification }
    : undefined

  const logoPath = brandingAssetPath(pub, 'logo_url')
  const faviconPath = brandingAssetPath(pub, 'favicon_url')
  const ogImageUrl = toAbsoluteSiteUrl(base, logoPath)
  const faviconRel = faviconPath.trim() ? faviconPath : DEFAULT_FAVICON_PATH
  const faviconNormalized = faviconRel.startsWith('/') ? faviconRel : `/${faviconRel}`
  const faviconUrl = toAbsoluteSiteUrl(base, faviconNormalized)

  const canonical = base ? hrefForLocale(locale) : undefined
  const languages = Object.fromEntries(codes.map((l) => [l, l === defaultLocale ? '/' : `/${l}`]))

  const openGraph: Metadata['openGraph'] = {
    type: 'website',
    siteName,
    title: siteName,
    description,
    locale: ogLocaleForSite(locale),
    ...(canonical && { url: canonical }),
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
    alternates: {
      canonical: canonical ?? undefined,
      languages,
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
  const initialCurrencyRates = await getPublicCurrencyRates({
    next: { revalidate: 120 },
  } as RequestInit).catch(() => [] as Awaited<ReturnType<typeof getPublicCurrencyRates>>)
  return (
    <AvailableLocalesProvider locales={options}>
      <LocalizedRoutesProvider routes={localizedRoutes}>
        <LocaleProvider locale={locale}>
          <PreferredCurrencyProvider initialRates={initialCurrencyRates}>
            <SiteJsonLd locale={locale} />
            <GoogleScripts />
            <SiteUiHeaderHtml />
            {children}
            <SiteUiFooterHtml />
          </PreferredCurrencyProvider>
        </LocaleProvider>
      </LocalizedRoutesProvider>
    </AvailableLocalesProvider>
  )
}
