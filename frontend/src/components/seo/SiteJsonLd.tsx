import { COMPANY, companyAddressFull } from '@/lib/corporate/company'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { categoryOgImageUrl } from '@/lib/category-seo'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { allBrandSiteOrigins } from '@/lib/brand-sites'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import {
  brandingAssetPath,
  brandingSiteName,
  ogLocaleForSite,
  rawSiteDescription,
  toAbsoluteSiteUrl,
} from '@/lib/site-branding-seo'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import { resolveRequestBranding } from '@/lib/request-branding-seo'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import { vitrinHref } from '@/lib/vitrin-href'

type Props = {
  locale: string
}

function pickBrandingUrl(branding: Record<string, unknown>, key: string): string {
  const v = branding[key]
  return typeof v === 'string' && v.trim().startsWith('http') ? v.trim() : ''
}

/** TravelAgency + WebSite + kategori hiyerarşisi — marka ve sitelink sinyalleri. */
export default async function SiteJsonLd({ locale }: Props) {
  const pub = await getCachedSiteConfig()
  const { branding: hostBranding } = await resolveRequestBranding(
    (pub?.branding ?? null) as Record<string, unknown> | null,
  )
  const pubForBrand = pub ? { ...pub, branding: hostBranding } : pub
  const c = mergeBrandingIntoEnvContact(getSitePublicConfig(), hostBranding)
  const base = await resolveCanonicalBaseUrl()
  if (!base) return null
  const homePath = await vitrinHref(locale, '/')
  const baseNoSlash = base.replace(/\/$/, '')
  const home = toAbsoluteSiteUrl(baseNoSlash, homePath) ?? `${baseNoSlash}${homePath}`
  const siteName = brandingSiteName(pubForBrand)
  const description = rawSiteDescription(pubForBrand)
  const logoFromBranding = brandingAssetPath(pubForBrand, 'logo_url')
  const logoAbs =
    toAbsoluteSiteUrl(baseNoSlash, logoFromBranding) ||
    (c.logoUrl?.startsWith('http') ? c.logoUrl : toAbsoluteSiteUrl(baseNoSlash, c.logoUrl)) ||
    undefined

  const legalOrBrand =
    (c.orgLegalName && c.orgLegalName.trim()) || COMPANY.legalName || siteName || c.orgName

  const mapsUrl =
    pickBrandingUrl(hostBranding, 'google_maps_place_url') ||
    pickBrandingUrl(hostBranding, 'google_business_url') ||
    COMPANY.mapsUrl

  const placeId =
    typeof hostBranding.google_place_id === 'string' ? hostBranding.google_place_id.trim() : ''

  const sameAs = Array.from(
    new Set(
      [
        ...allBrandSiteOrigins().filter((o) => o !== baseNoSlash),
        c.socialFacebook,
        c.socialInstagram,
        c.socialX,
        c.socialYoutube,
        mapsUrl,
      ].filter(Boolean),
    ),
  )

  const street = c.address?.trim() || companyAddressFull()
  const phone = c.phone?.trim() || COMPANY.phones.reservation[0]
  const email = c.email?.trim() || COMPANY.email

  const organization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['TravelAgency', 'LocalBusiness'],
    '@id': `${baseNoSlash}/#organization`,
    name: legalOrBrand,
    alternateName: [COMPANY.brandName, COMPANY.agencyName, siteName].filter(
      (n, i, arr) => n && arr.indexOf(n) === i && n !== legalOrBrand,
    ),
    url: home,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY.address.line,
      addressLocality: COMPANY.address.city,
      addressRegion: COMPANY.address.region,
      postalCode: COMPANY.address.postalCode,
      addressCountry: COMPANY.address.countryCode,
      ...(street && street !== COMPANY.address.line ? { name: street } : {}),
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: COMPANY.address.geo.latitude,
      longitude: COMPANY.address.geo.longitude,
    },
    hasMap: mapsUrl,
    areaServed: {
      '@type': 'Country',
      name: 'Turkey',
    },
    priceRange: '$$',
  }

  if (description) organization.description = description
  if (logoAbs) organization.logo = logoAbs
  if (phone) organization.telephone = phone
  if (email) organization.email = email
  if (COMPANY.tursabNo) {
    organization.identifier = {
      '@type': 'PropertyValue',
      name: 'TÜRSAB',
      value: COMPANY.tursabNo,
    }
  }
  if (placeId) {
    organization.additionalProperty = {
      '@type': 'PropertyValue',
      name: 'google_place_id',
      value: placeId,
    }
  }
  if (sameAs.length) organization.sameAs = sameAs

  const categoryItems = await Promise.all(
    [...CATEGORY_REGISTRY]
      .sort((a, b) => a.navOrder - b.navOrder)
      .map(async (raw, index) => {
        const category = resolveCategoryDisplay(raw, locale)
        const href = await vitrinHref(locale, `${category.categoryRoute}/all`)
        const url = `${baseNoSlash}${href}`
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'CollectionPage',
            '@id': `${url}#category`,
            name: category.name,
            description: category.heroSubheading,
            url,
            image: categoryOgImageUrl(baseNoSlash, category.slug),
            isPartOf: { '@id': `${baseNoSlash}/#website` },
          },
        }
      }),
  )

  const website: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseNoSlash}/#website`,
    name: siteName || c.orgName,
    url: home,
    inLanguage: ogLocaleForSite(locale),
    publisher: { '@id': `${baseNoSlash}/#organization` },
    hasPart: categoryItems.map((entry) => entry.item),
  }

  if (description) website.description = description

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  )
}
