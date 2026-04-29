import { getCachedSiteConfig } from '@/lib/site-config-cache'
import {
  brandingAssetPath,
  brandingSiteName,
  getPublicSiteUrl,
  ogLocaleForSite,
  rawSiteDescription,
  toAbsoluteSiteUrl,
} from '@/lib/site-branding-seo'
import { getSitePublicConfig, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import { vitrinHref } from '@/lib/vitrin-href'

type Props = {
  locale: string
}

/** Organization + WebSite şeması — panel `branding` + ortam iletişim alanları birleşik. */
export default async function SiteJsonLd({ locale }: Props) {
  const pub = await getCachedSiteConfig()
  const c = mergeBrandingIntoEnvContact(getSitePublicConfig(), pub?.branding ?? null)
  const base = getPublicSiteUrl()
  if (!base) return null
  const homePath = await vitrinHref(locale, '/')
  const baseNoSlash = base.replace(/\/$/, '')
  const home = toAbsoluteSiteUrl(baseNoSlash, homePath) ?? `${baseNoSlash}${homePath}`
  const siteName = brandingSiteName(pub)
  const description = rawSiteDescription(pub)
  const logoFromBranding = brandingAssetPath(pub, 'logo_url')
  const logoAbs =
    toAbsoluteSiteUrl(base, logoFromBranding) ||
    (c.logoUrl?.startsWith('http') ? c.logoUrl : toAbsoluteSiteUrl(base, c.logoUrl)) ||
    undefined

  const legalOrBrand = (c.orgLegalName && c.orgLegalName.trim()) || siteName || c.orgName
  const sameAs = [c.socialFacebook, c.socialInstagram, c.socialX, c.socialYoutube].filter(Boolean)

  const organization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: legalOrBrand,
    url: home,
  }

  if (description) {
    organization.description = description
  }
  if (logoAbs) {
    organization.logo = logoAbs
  }
  if (c.phone) {
    organization.telephone = c.phone
  }
  if (c.email) {
    organization.email = c.email
  }
  if (c.address) {
    organization.address = {
      '@type': 'PostalAddress',
      streetAddress: c.address,
    }
  }
  if (sameAs.length) {
    organization.sameAs = sameAs
  }

  const website: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName || c.orgName,
    url: home,
    inLanguage: ogLocaleForSite(locale),
    publisher: {
      '@type': 'Organization',
      name: legalOrBrand,
    },
  }

  if (description) {
    website.description = description
  }

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
