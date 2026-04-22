/**
 * Ortak vitrin ayarları (SEO, güven, footer, JSON-LD).
 * Tümü NEXT_PUBLIC_* — istemcide de okunabilir.
 */
export type SitePublicConfig = {
  siteUrl: string
  orgName: string
  orgLegalName: string
  logoUrl: string
  tagline: string
  tursabNo: string
  tursabVerifyUrl: string
  phone: string
  email: string
  address: string
  whatsappE164: string
  socialFacebook: string
  socialInstagram: string
  socialX: string
  socialYoutube: string
}

function trim(s: string | undefined): string {
  return typeof s === 'string' ? s.trim() : ''
}

export function getSitePublicConfig(): SitePublicConfig {
  return {
    siteUrl: trim(process.env.NEXT_PUBLIC_SITE_URL).replace(/\/$/, ''),
    orgName: trim(process.env.NEXT_PUBLIC_ORG_NAME) || 'Travel',
    orgLegalName: trim(process.env.NEXT_PUBLIC_ORG_LEGAL_NAME),
    logoUrl: trim(process.env.NEXT_PUBLIC_ORG_LOGO_URL),
    tagline: trim(process.env.NEXT_PUBLIC_SITE_TAGLINE),
    tursabNo: trim(process.env.NEXT_PUBLIC_TURSAB_NO),
    tursabVerifyUrl: trim(process.env.NEXT_PUBLIC_TURSAB_VERIFY_URL),
    phone: trim(process.env.NEXT_PUBLIC_SITE_PHONE),
    email: trim(process.env.NEXT_PUBLIC_SITE_EMAIL),
    address: trim(process.env.NEXT_PUBLIC_SITE_ADDRESS),
    whatsappE164: trim(process.env.NEXT_PUBLIC_WHATSAPP_E164).replace(/\D/g, ''),
    socialFacebook: trim(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL),
    socialInstagram: trim(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL),
    socialX: trim(process.env.NEXT_PUBLIC_SOCIAL_X_URL),
    socialYoutube: trim(process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL),
  }
}
