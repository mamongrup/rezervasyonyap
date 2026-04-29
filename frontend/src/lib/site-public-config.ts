/**
 * Ortak vitrin ayarları (SEO, güven, footer, JSON-LD).
 * Temel kaynak: `NEXT_PUBLIC_*` — istemcide de okunabilir.
 *
 * Veritabanı: `site_settings` satırı `branding` içinde aynı alanları
 * opsiyonel olarak geçersiz kılar (Genel ayarlar paneli):
 * - `social_facebook_url`, `social_instagram_url`, `social_x_url`, `social_youtube_url`
 * - `public_contact_email`, `public_phone`, `public_address`, `public_whatsapp_e164`
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

function pickBrandingString(b: Record<string, unknown> | null | undefined, key: string): string | undefined {
  if (!b) return undefined
  const v = b[key]
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t !== '' ? t : undefined
}

/** `getSitePublicConfig()` + `/api/v1/site/public-config` içindeki `branding` (env yedek kalır). */
export function mergeBrandingIntoEnvContact(
  env: SitePublicConfig,
  branding: Record<string, unknown> | null | undefined,
): SitePublicConfig {
  if (!branding || typeof branding !== 'object') return env
  const pick = (key: string, fallback: string) => pickBrandingString(branding, key) ?? fallback
  const wa = pickBrandingString(branding, 'public_whatsapp_e164')
  return {
    ...env,
    email: pick('public_contact_email', env.email),
    phone: pick('public_phone', env.phone),
    address: pick('public_address', env.address),
    whatsappE164: wa != null ? wa.replace(/\D/g, '') : env.whatsappE164,
    socialFacebook: pick('social_facebook_url', env.socialFacebook),
    socialInstagram: pick('social_instagram_url', env.socialInstagram),
    socialX: pick('social_x_url', env.socialX),
    socialYoutube: pick('social_youtube_url', env.socialYoutube),
  }
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
