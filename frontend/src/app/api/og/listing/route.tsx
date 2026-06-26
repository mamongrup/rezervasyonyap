import { getExperienceListingByHandle, getStayListingByHandle } from '@/data/listings'
import { apiOriginForFetch } from '@/lib/api-origin'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { VILLA_THEME_CHIP_PRESETS } from '@/lib/villa-theme-chip-presets'
import { getPublicSiteUrl, toAbsoluteSiteUrl } from '@/lib/site-branding-seo'
import { normalizeSiteLogoUrl, resolveSiteLogoUrl } from '@/lib/resolve-site-logo-url'
import type { TListingBase } from '@/types/listing-types'
import {
  buildExperienceListingShareRows,
  buildStayListingShareRows,
  inferCatalogVerticalForStayListing,
} from '@/lib/social-share/listing-share-templates'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OG_W = 1200
const OG_H = 630
const SOCIAL_W = 1080
const SOCIAL_H = 1080

type SocialImageQuality = 'low' | 'medium' | 'high'
type SocialDesignTheme =
  | 'luxury'
  | 'honeymoon'
  | 'large_family'
  | 'beachfront'
  | 'sea_view'
  | 'nature'
  | 'conservative'

function parseImageQuality(raw: string | null): SocialImageQuality {
  return raw === 'low' || raw === 'high' ? raw : 'medium'
}

function parseDesignTheme(raw: string | null): SocialDesignTheme {
  switch (raw) {
    case 'honeymoon':
    case 'large_family':
    case 'beachfront':
    case 'sea_view':
    case 'nature':
    case 'conservative':
      return raw
    case 'luxury':
    default:
      return 'luxury'
  }
}

function socialThemeStyle(theme: SocialDesignTheme) {
  const luxury = {
    glass: 'rgba(6, 28, 48, 0.94)',
    glassChip: 'rgba(0, 0, 0, 0.38)',
    glassBorder: 'rgba(255,255,255,0.42)',
    gold: '#F0C020',
    goldLight: '#FFE566',
    white: '#FFFFFF',
    muted: 'rgba(255,255,255,0.92)',
    accent: '#7EE8FF',
    navy: '#041525',
  }
  switch (theme) {
    case 'honeymoon':
      return { ...luxury, glass: 'rgba(88,28,56,0.78)', accent: '#fda4af', gold: '#fda4af' }
    case 'large_family':
      return { ...luxury, glass: 'rgba(30,58,95,0.78)', gold: '#fdba74' }
    case 'beachfront':
      return { ...luxury, glass: 'rgba(8,70,90,0.78)', accent: '#20C5D8' }
    case 'sea_view':
      return { ...luxury, glass: 'rgba(8,60,80,0.78)', accent: '#20C5D8' }
    case 'nature':
      return { ...luxury, glass: 'rgba(20,60,40,0.78)', gold: '#bef264', accent: '#86efac' }
    case 'conservative':
      return { ...luxury, glass: 'rgba(15,70,65,0.78)', gold: '#5eead4' }
    case 'luxury':
    default:
      return luxury
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function assetBaseUrl(pageBase: string): string {
  return (
    process.env.NEXT_PUBLIC_UPLOADS_ORIGIN?.trim().replace(/\/$/, '') ||
    process.env.INTERNAL_API_ORIGIN?.trim().replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') ||
    pageBase
  )
}

function rewriteLoopbackUploadUrl(url: string, fallbackBase: string): string {
  try {
    if (!/^https?:\/\//i.test(url)) return url
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if ((host === 'localhost' || host === '127.0.0.1') && u.pathname.startsWith('/uploads/')) {
      return `${assetBaseUrl(fallbackBase)}${u.pathname}${u.search}`
    }
  } catch {
    /* yoksay */
  }
  return url
}

function toAbsoluteAssetUrl(pageBase: string, path: string): string | null {
  const p = path.trim()
  if (!p) return null
  if (/^https?:\/\//i.test(p)) return rewriteLoopbackUploadUrl(p, pageBase)
  const base = p.startsWith('/uploads/') || p.startsWith('/api/site-upload/')
    ? assetBaseUrl(pageBase)
    : pageBase
  const abs = toAbsoluteSiteUrl(base, p) ?? null
  return abs ? rewriteLoopbackUploadUrl(abs, pageBase) : null
}

function titleWithoutBadge(title: string, badge: string): string {
  const t = title.trim()
  const b = badge.trim()
  if (!t || !b) return t
  const re = new RegExp(`\\s+${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  return t.replace(re, '').trim() || t
}

function themeLabelsForCover(codes: readonly string[] | undefined): string[] {
  const preset = new Map(VILLA_THEME_CHIP_PRESETS.map((x) => [x.code, x.label] as const))
  const overrides: Record<string, string> = {
    sea_view: 'Deniz manzaralı',
    beachfront: 'Denize sıfır',
    conservative: 'Muhafazakar',
    luxury: 'Lüks',
    modern: 'Modern',
    nature: 'Doğa içinde',
    garden: 'Doğa içinde',
    mountain_view: 'Doğa içinde',
    jacuzzi: 'Jakuzi',
    sauna: 'Sauna',
    pool: 'Özel havuz',
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of codes ?? []) {
    const code = raw.trim().toLowerCase()
    if (!code || seen.has(code)) continue
    const label = overrides[code] ?? preset.get(code)
    if (!label) continue
    seen.add(code)
    out.push(label)
    if (out.length >= 5) break
  }
  return out
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

async function imageDataUrlForOg(
  url: string | null,
  opts: { width: number; height: number; fit: 'cover' | 'inside' },
  pageBase?: string,
): Promise<string | null> {
  if (!url) return null
  const fetchUrl = pageBase ? rewriteLoopbackUploadUrl(url, pageBase) : url
  try {
    const res = await fetchWithTimeout(fetchUrl, 3500)
    if (!res.ok) return null
    const input = Buffer.from(await res.arrayBuffer())
    const output = await sharp(input)
      .resize({
        width: opts.width,
        height: opts.height,
        fit: opts.fit,
        withoutEnlargement: opts.fit === 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer()
    return `data:image/png;base64,${output.toString('base64')}`
  } catch {
    return null
  }
}

function uniqueAbsoluteImageUrls(base: string, images: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of images) {
    const src = raw?.trim()
    if (!src) continue
    const abs = toAbsoluteAssetUrl(base, src) ?? src
    if (!abs || seen.has(abs)) continue
    seen.add(abs)
    out.push(abs)
    if (out.length >= 3) break
  }
  return out
}

async function socialMosaicDataUrls(base: string, images: Array<string | null | undefined>): Promise<string[]> {
  const urls = uniqueAbsoluteImageUrls(base, images)
  const dataUrls = await Promise.all(
    urls.map((url, index) =>
      imageDataUrlForOg(
        url,
        {
          width: index === 0 ? SOCIAL_W : 620,
          height: index === 0 ? SOCIAL_H : 820,
          fit: 'cover',
        },
        base,
      ),
    ),
  )
  return dataUrls.filter((url): url is string => Boolean(url))
}

function brandingText(b: Record<string, unknown> | null | undefined, key: string): string {
  const v = b?.[key]
  return typeof v === 'string' ? v.trim() : ''
}

async function fetchOgBranding(base: string): Promise<{
  logoUrl: string | null
  logoTextLine1: string
  logoTextLine2: string
  logoTextLine2Color: string
  phone: string
  tursabNo: string
}> {
  const fallback = {
    logoUrl: null,
    logoTextLine1: 'Rezervasyon',
    logoTextLine2: 'yap.com.tr',
    logoTextLine2Color: '#f97316',
    phone: process.env.NEXT_PUBLIC_SITE_PHONE?.trim() || '0850 466 0464 - 0532 397 7957',
    tursabNo: process.env.NEXT_PUBLIC_TURSAB_NO?.trim() || '13127',
  }
  const apiBase = apiOriginForFetch()
  if (!apiBase) return fallback
  try {
    const res = await fetchWithTimeout(`${apiBase}/api/v1/site/public-config`, 2500)
    if (!res.ok) return fallback
    const data = (await res.json()) as { branding?: Record<string, unknown> | null }
    const b = data.branding ?? null
    const rawLogo =
      normalizeSiteLogoUrl(brandingText(b, 'logo_url')) ??
      normalizeSiteLogoUrl(brandingText(b, 'logo_url_dark')) ??
      normalizeSiteLogoUrl(brandingText(b, 'logo_icon_url')) ??
      normalizeSiteLogoUrl(process.env.NEXT_PUBLIC_ORG_LOGO_URL)
    const resolvedLogo = rawLogo ? resolveSiteLogoUrl(rawLogo) : ''
    return {
      logoUrl: resolvedLogo ? toAbsoluteAssetUrl(base, resolvedLogo) ?? resolvedLogo : null,
      logoTextLine1: brandingText(b, 'logo_text_line1') || brandingText(b, 'site_name') || fallback.logoTextLine1,
      logoTextLine2: brandingText(b, 'logo_text_line2') || fallback.logoTextLine2,
      logoTextLine2Color: brandingText(b, 'logo_text_line2_color') || fallback.logoTextLine2Color,
      phone: brandingText(b, 'public_phone') || fallback.phone,
      tursabNo: brandingText(b, 'tursab_no') || fallback.tursabNo,
    }
  } catch {
    return fallback
  }
}

function rowSvg(label: string, color: string, size = 26) {
  const iconStyle = { width: size, height: size }
  const l = label.toLocaleLowerCase('tr-TR')
  if (/kişi|guest|kapasite|capacity/.test(l)) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
  if (/oda|bedroom|kabin|cabin/.test(l)) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M2 4v16" />
        <path d="M2 8h18a2 2 0 0 1 2 2v10" />
        <path d="M2 17h20" />
      </svg>
    )
  }
  if (/banyo|bath/.test(l)) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M4 12h16" />
        <path d="M6 12v5c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-5" />
        <path d="M8 12V8a4 4 0 0 1 8 0v4" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function socialListingImage({
  bgUrl,
  mosaicUrls,
  badge,
  title,
  rows,
  branding,
  designTheme,
  themeLabels,
}: {
  bgUrl: string | null
  mosaicUrls?: string[]
  badge: string
  title: string
  rows: { label: string; value: string }[]
  branding: Awaited<ReturnType<typeof fetchOgBranding>>
  designTheme: SocialDesignTheme
  themeLabels?: string[]
}) {
  const style = socialThemeStyle(designTheme)
  const region = rows.find((r) => /bölge|location/i.test(r.label))?.value
  const rowPriority = (label: string) => {
    const l = label.toLocaleLowerCase('tr-TR')
    if (/kişi|guest|kapasite|capacity/.test(l)) return 0
    if (/oda|bedroom|kabin|cabin/.test(l)) return 1
    if (/banyo|bath/.test(l)) return 2
    return 9
  }
  const infoRows = rows
    .filter((r) => !/fiyat|price|bölge|location/i.test(r.label))
    .sort((a, b) => rowPriority(a.label) - rowPriority(b.label))
    .slice(0, 3)
  const titleText = title.trim()
  const titleLen = titleText.length
  const titleFont =
    titleLen > 40 ? 28 : titleLen > 32 ? 32 : titleLen > 24 ? 36 : titleLen > 18 ? 40 : 44
  const regionText = region ? truncate(region, 24).toLocaleUpperCase('tr-TR') : badge.toLocaleUpperCase('tr-TR')
  const textShadow = '0 2px 10px rgba(0,0,0,0.65)'
  const chips = (themeLabels ?? []).slice(0, 4)
  const photos = (mosaicUrls ?? []).filter(Boolean)
  const mainPhoto = photos[0] ?? bgUrl
  const mainImgData = mainPhoto?.startsWith('data:') ? mainPhoto : null
  const footerAgency = 'Mamon Plus Travel Agency'
  const footerWebsite = 'www.rezervasyonyap.com.tr'
  const footerEmail = 'info@rezervasyonyap.com.tr'
  const footerPhone = branding.phone || '0850 466 0464 - 0532 397 7957'
  const CARD_W = 500
  const CARD_H = 1000
  const CARD_LEFT = 40
  const CARD_TOP = 40
  const LOGO_H = 76
  const LOGO_PAD_X = 22
  const LOGO_PAD_Y = 10
  const LOGO_IMG_W = CARD_W - LOGO_PAD_X * 2
  const LOGO_IMG_H = LOGO_H - LOGO_PAD_Y * 2
  const CONTENT_W = CARD_W - 80

  return new ImageResponse(
    (
      <div
        style={{
          width: SOCIAL_W,
          height: SOCIAL_H,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: style.navy,
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        {/* Katman 1 — tam ekran villa fotoğrafı */}
        {mainImgData ? (
          <img
            src={mainImgData}
            alt=""
            width={SOCIAL_W}
            height={SOCIAL_H}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: SOCIAL_W,
              height: SOCIAL_H,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: SOCIAL_W,
              height: SOCIAL_H,
              display: 'flex',
              background: `linear-gradient(135deg, ${style.navy} 0%, #0a3558 100%)`,
            }}
          />
        )}

        {/* Katman 2 — sol panel okunabilirliği için koyu scrim */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: SOCIAL_W,
            height: SOCIAL_H,
            display: 'flex',
            background: `linear-gradient(90deg, rgba(4,12,24,0.92) 0%, rgba(4,12,24,0.82) 48%, rgba(4,12,24,0.35) 72%, rgba(4,12,24,0.12) 100%)`,
          }}
        />

        {/* Katman 3 — premium glass kart (tüm içerik tek panelde) */}
        <div
          style={{
            position: 'absolute',
            left: CARD_LEFT,
            top: CARD_TOP,
            width: CARD_W,
            height: CARD_H,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            borderRadius: 32,
            background: style.glass,
            border: `1px solid ${style.glassBorder}`,
            boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
            padding: '0 0 40px 0',
          }}
        >
          {/* Koyu okuma — metin kontrastı */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: CARD_W,
              height: CARD_H,
              display: 'flex',
              borderRadius: 32,
              background: 'rgba(4, 16, 32, 0.82)',
            }}
          />

          {/* Cam üst parlama çizgisi */}
          <div
            style={{
              position: 'absolute',
              left: 32,
              top: 32,
              width: CARD_W - 64,
              height: 1,
              display: 'flex',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            }}
          />

          {/* Logo — kart üstü, orantılı ve ortalı */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              background: 'rgba(255,255,255,0.96)',
              width: CARD_W,
              height: LOGO_H,
              padding: `${LOGO_PAD_Y}px ${LOGO_PAD_X}px`,
            }}
          >
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt=""
                width={LOGO_IMG_W}
                height={LOGO_IMG_H}
                style={{
                  width: LOGO_IMG_W,
                  height: LOGO_IMG_H,
                  objectFit: 'contain',
                  objectPosition: 'center center',
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: LOGO_IMG_W, height: LOGO_IMG_H }}>
                <span style={{ color: style.gold, fontSize: 26, fontWeight: 900 }}>✈</span>
                <span style={{ color: style.navy, fontSize: 22, fontWeight: 800 }}>{branding.logoTextLine1}</span>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              alignItems: 'stretch',
              padding: '28px 40px 0',
            }}
          >

          {/* Villa adı — tam başlık, uzunluğa göre küçük punto */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              width: CONTENT_W,
              marginTop: 32,
              color: style.white,
              fontSize: titleFont,
              fontWeight: 900,
              lineHeight: 1.14,
              letterSpacing: 0.2,
              textShadow,
            }}
          >
            {titleText}
          </div>

          {/* Altın ayırıcı */}
          <div
            style={{
              display: 'flex',
              marginTop: 16,
              width: 64,
              height: 4,
              borderRadius: 999,
              background: style.gold,
            }}
          />

          {/* Tema etiketleri */}
          {chips.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
              {chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: 'flex',
                    padding: '9px 16px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.45)',
                    border: `1px solid rgba(240,192,32,0.55)`,
                    color: style.white,
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textShadow,
                  }}
                >
                  {chip.toLocaleUpperCase('tr-TR')}
                </div>
              ))}
            </div>
          ) : null}

          {/* Konum */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.45)', width: CONTENT_W }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={style.gold} style={{ width: 20, height: 20 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span style={{ color: style.white, fontSize: 19, fontWeight: 900, letterSpacing: 1.2, textShadow }}>{regionText}</span>
          </div>

          {/* Özellikler — kapasite / oda / banyo (aşağıda, ortalı) */}
          {infoRows.length > 0 ? (
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 52,
                marginLeft: 12,
                padding: '20px 18px',
                borderRadius: 18,
                background: 'rgba(0,0,0,0.42)',
                border: `1px solid ${style.glassBorder}`,
                width: CONTENT_W - 24,
              }}
            >
              {infoRows.map((row, i) => (
                <div
                  key={`${row.label}-${i}`}
                  style={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 6px',
                    borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.18)' : 'none',
                  }}
                >
                  {rowSvg(row.label, style.gold, 26)}
                  <span style={{ color: style.white, fontSize: 28, fontWeight: 900, lineHeight: 1, textShadow }}>{row.value}</span>
                  <span style={{ color: style.muted, fontSize: 13, fontWeight: 800, letterSpacing: 0.8, textShadow }}>
                    {row.label.toLocaleUpperCase('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', flex: 1, minHeight: 48 }} />

          {/* CTA — altın buton, koyu metin */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: CONTENT_W,
              marginLeft: 0,
              height: 58,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${style.goldLight} 0%, ${style.gold} 100%)`,
              color: '#1a1a1a',
              fontSize: 17,
              fontWeight: 900,
              letterSpacing: 1.8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            Detayları İncele
          </div>

          {/* İletişim — alt bilgi */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginTop: 24,
              padding: '20px 18px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.48)',
              border: `1px solid ${style.glassBorder}`,
              width: CONTENT_W,
              marginLeft: 0,
            }}
          >
            <span style={{ color: style.gold, fontSize: 18, fontWeight: 900, letterSpacing: 0.4, textShadow }}>
              {footerAgency}
            </span>
            <span style={{ color: style.white, fontSize: 17, fontWeight: 800, textShadow }}>{footerWebsite}</span>
            <span style={{ color: style.white, fontSize: 17, fontWeight: 800, textShadow }}>{footerEmail}</span>
            <span style={{ color: style.white, fontSize: 17, fontWeight: 800, textShadow }}>{footerPhone}</span>
          </div>
          </div>
        </div>
      </div>
    ),
    {
      width: SOCIAL_W,
      height: SOCIAL_H,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kind = searchParams.get('kind') === 'experience' ? 'experience' : 'stay'
  const handle = searchParams.get('handle')?.trim()
  const locale = searchParams.get('locale')?.trim() || 'tr'
  const variant = searchParams.get('variant') === 'social' ? 'social' : 'og'
  const imageQuality = parseImageQuality(searchParams.get('image_quality'))
  const designTheme = parseDesignTheme(searchParams.get('design_theme'))
  if (!handle) {
    return new Response('Missing handle', { status: 400 })
  }

  const base = getPublicSiteUrl()
  if (!base) {
    return new Response('NEXT_PUBLIC_SITE_URL required for OG images', { status: 503 })
  }

  const rawBranding = await fetchOgBranding(base)
  const branding = {
    ...rawBranding,
    logoUrl: await imageDataUrlForOg(
      rawBranding.logoUrl,
      {
        width: 330,
        height: 92,
        fit: 'inside',
      },
      base,
    ),
  }

  if (kind === 'stay') {
    const listing = await getStayListingByHandle(handle, locale)
    if (!listing?.id) {
      return new Response('Not found', { status: 404 })
    }

    const vertical = inferCatalogVerticalForStayListing({
      listingVertical: normalizeCatalogVertical(listing.listingVertical),
      listingCategory: listing.listingCategory,
    })
    const rows = buildStayListingShareRows(
      {
        title: listing.title,
        listingVertical: normalizeCatalogVertical(listing.listingVertical),
        listingCategory: listing.listingCategory,
        city: listing.city,
        address: listing.address,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        beds: listing.beds,
        maxGuests: listing.maxGuests,
        price: listing.price,
        stars: 'stars' in listing ? (listing as { stars?: number }).stars : undefined,
        lengthM: 'lengthM' in listing ? (listing as { lengthM?: number }).lengthM : undefined,
        capacity: 'capacity' in listing ? (listing as { capacity?: number }).capacity : undefined,
        cabins: 'cabins' in listing ? (listing as { cabins?: number }).cabins : undefined,
      },
      locale,
    )

    const rawImg = listing.featuredImage || listing.galleryImgs?.[0]
    const bgUrl = rawImg ? toAbsoluteAssetUrl(base, rawImg) ?? rawImg : null
    const badge =
      vertical === 'holiday_home'
        ? locale.startsWith('en')
          ? 'Holiday home'
          : 'Villa'
        : vertical === 'yacht_charter'
          ? locale.startsWith('en')
            ? 'Yacht'
            : 'Yat'
          : locale.startsWith('en')
            ? 'Hotel'
            : 'Otel'

    if (variant === 'social') {
      const mosaicUrls = await socialMosaicDataUrls(base, [
        listing.featuredImage,
        ...(listing.galleryImgs ?? []),
      ])
      const socialBgUrl = await imageDataUrlForOg(
        bgUrl,
        {
          width: SOCIAL_W,
          height: SOCIAL_H,
          fit: 'cover',
        },
        base,
      )
      return socialListingImage({
        bgUrl: socialBgUrl ?? bgUrl,
        mosaicUrls,
        badge,
        title: listing.title,
        rows,
        branding,
        designTheme,
        themeLabels: themeLabelsForCover(listing.themeCodes),
      })
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            background: '#0f172a',
          }}
        >
          {bgUrl ? (
             
            <img
              src={bgUrl}
              alt=""
              width={OG_W}
              height={OG_H}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : null}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.1) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 28,
              right: 32,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {badge}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '36px 44px 40px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div
              style={{
                color: '#fff',
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1.15,
                textShadow: '0 2px 24px rgba(0,0,0,0.5)',
              }}
            >
              {truncate(listing.title, 90)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {rows.map((row, i) => (
                <div
                  key={`r-${i}-${row.label}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 18px',
                    borderRadius: 14,
                    background: 'rgba(15,23,42,0.72)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    minWidth: 120,
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, marginBottom: 4 }}>
                    {row.label}
                  </span>
                  <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>{branding.logoTextLine1}</div>
          </div>
        </div>
      ),
      { width: OG_W, height: OG_H },
    )
  }

  const listing = await getExperienceListingByHandle(handle, locale)
  if (!listing?.id) {
    return new Response('Not found', { status: 404 })
  }

  const rows = buildExperienceListingShareRows(
    {
      title: listing.title,
      listingVertical: normalizeCatalogVertical(listing.listingVertical),
      listingCategory: listing.listingCategory,
      city: (listing as TListingBase).city,
      address: listing.address,
      durationTime: listing.durationTime,
      maxGuests: listing.maxGuests,
      price: listing.price,
    },
    locale,
  )

  const rawImg = listing.featuredImage || listing.galleryImgs?.[0]
  const bgUrl = rawImg ? toAbsoluteAssetUrl(base, rawImg) ?? rawImg : null

  const v = normalizeCatalogVertical(listing.listingVertical)
  const badge =
    v === 'activity'
      ? locale.startsWith('en')
        ? 'Activity'
        : 'Aktivite'
      : locale.startsWith('en')
        ? 'Tour'
        : 'Tur'

  if (variant === 'social') {
    const mosaicUrls = await socialMosaicDataUrls(base, [
      listing.featuredImage,
      ...(listing.galleryImgs ?? []),
    ])
    const socialBgUrl = await imageDataUrlForOg(
      bgUrl,
      {
        width: SOCIAL_W,
        height: SOCIAL_H,
        fit: 'cover',
      },
      base,
    )
    return socialListingImage({
      bgUrl: socialBgUrl ?? bgUrl,
      mosaicUrls,
      badge,
      title: listing.title,
      rows,
      branding,
      designTheme,
      themeLabels: [],
    })
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: '#0f172a',
        }}
      >
        {bgUrl ? (
           
          <img
            src={bgUrl}
            alt=""
            width={OG_W}
            height={OG_H}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.1) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 32,
            padding: '10px 18px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {badge}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '36px 44px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.15,
              textShadow: '0 2px 24px rgba(0,0,0,0.5)',
            }}
          >
            {truncate(listing.title, 90)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {rows.map((row, i) => (
              <div
                key={`r-${i}-${row.label}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 18px',
                  borderRadius: 14,
                  background: 'rgba(15,23,42,0.72)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  minWidth: 120,
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, marginBottom: 4 }}>
                  {row.label}
                </span>
                <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>{branding.logoTextLine1}</div>
        </div>
      </div>
    ),
    { width: OG_W, height: OG_H },
  )
}
