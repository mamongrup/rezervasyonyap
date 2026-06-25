import { getExperienceListingByHandle, getStayListingByHandle } from '@/data/listings'
import { apiOriginForFetch } from '@/lib/api-origin'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
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
  switch (theme) {
    case 'honeymoon':
      return { title: '#db2777', secondary: '#7c2d12', panel: '#be185d', glow: '#fff1f2' }
    case 'large_family':
      return { title: '#ea580c', secondary: '#1e3a8a', panel: '#0f766e', glow: '#fef3c7' }
    case 'beachfront':
      return { title: '#0891b2', secondary: '#0f3d6e', panel: '#0284c7', glow: '#e0f7ff' }
    case 'sea_view':
      return { title: '#0e7490', secondary: '#1e3a8a', panel: '#0f91a1', glow: '#e5fbff' }
    case 'nature':
      return { title: '#15803d', secondary: '#365314', panel: '#047857', glow: '#ecfdf5' }
    case 'conservative':
      return { title: '#0f766e', secondary: '#1e3a8a', panel: '#115e59', glow: '#f0fdfa' }
    case 'luxury':
    default:
      return { title: '#ef1f24', secondary: '#1e3a8a', panel: '#078fa0', glow: '#e5fbff' }
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
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') ||
    pageBase
  )
}

function toAbsoluteAssetUrl(pageBase: string, path: string): string | null {
  const p = path.trim()
  if (!p) return null
  if (/^https?:\/\//i.test(p)) return p
  const base = p.startsWith('/uploads/') || p.startsWith('/api/site-upload/')
    ? assetBaseUrl(pageBase)
    : pageBase
  return toAbsoluteSiteUrl(base, p) ?? null
}

function titleWithoutBadge(title: string, badge: string): string {
  const t = title.trim()
  const b = badge.trim()
  if (!t || !b) return t
  const re = new RegExp(`\\s+${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  return t.replace(re, '').trim() || t
}

function titleLinesForCover(title: string): string[] {
  const words = title.toLocaleUpperCase('tr-TR').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  for (const word of words) {
    const current = lines[lines.length - 1] ?? ''
    if (!current || `${current} ${word}`.length > 15) {
      lines.push(word)
    } else {
      lines[lines.length - 1] = `${current} ${word}`
    }
  }
  return lines.slice(0, 3)
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
): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetchWithTimeout(url, 3500)
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

function socialListingImage({
  bgUrl,
  badge,
  title,
  rows,
  branding,
  designTheme,
}: {
  bgUrl: string | null
  badge: string
  title: string
  rows: { label: string; value: string }[]
  branding: Awaited<ReturnType<typeof fetchOgBranding>>
  designTheme: SocialDesignTheme
}) {
  const style = socialThemeStyle(designTheme)
  const region = rows.find((r) => /bölge|location/i.test(r.label))?.value
  const rowPriority = (label: string) => {
    const l = label.toLocaleLowerCase('tr-TR')
    if (/kişi|guest|kapasite|capacity/.test(l)) return 0
    if (/oda|bedroom|kabin|cabin/.test(l)) return 1
    if (/banyo|bath/.test(l)) return 2
    if (/yatak|bed\b/.test(l)) return 3
    if (/süre|duration/.test(l)) return 4
    return 9
  }
  const rowIcon = (label: string) => {
    const l = label.toLocaleLowerCase('tr-TR')
    if (/kişi|guest|kapasite|capacity/.test(l)) return 'K'
    if (/oda|bedroom|kabin|cabin/.test(l)) return 'O'
    if (/banyo|bath/.test(l)) return 'B'
    if (/yatak|bed\b/.test(l)) return 'Y'
    if (/süre|duration/.test(l)) return 'S'
    return '✓'
  }
  const infoRows = rows
    .filter((r) => !/fiyat|price|bölge|location/i.test(r.label))
    .sort((a, b) => rowPriority(a.label) - rowPriority(b.label))
    .slice(0, 3)
  const cleanTitle = titleWithoutBadge(title, badge)
  const titleLines = titleLinesForCover(truncate(cleanTitle, 28))
  const badgeText = truncate(badge, 18).toLocaleUpperCase('tr-TR')
  const regionText = region ? truncate(region, 20).toLocaleUpperCase('tr-TR') : ''
  const titleFont = titleLines.some((line) => line.length > 12) ? 42 : 50

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#f8fafc',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, #ffffff 0%, #f8fafc 48%, ${style.glow} 100%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -250,
            top: 470,
            width: 760,
            height: 760,
            display: 'flex',
            borderRadius: 999,
            border: '38px solid rgba(251, 146, 60, 0.14)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 315,
            top: -200,
            width: 520,
            height: 520,
            display: 'flex',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.52)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 38,
            top: 104,
            width: 500,
            height: 826,
            display: 'flex',
            borderRadius: 54,
            background: style.panel,
            boxShadow: '0 36px 80px rgba(15, 23, 42, 0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 66,
            top: 130,
            width: 472,
            height: 774,
            display: 'flex',
            borderRadius: 42,
            overflow: 'hidden',
            border: '12px solid #ffffff',
            boxShadow: '0 28px 72px rgba(15, 23, 42, 0.25)',
          }}
        >
          {bgUrl ? (
            <img
              src={bgUrl}
              alt=""
              width={472}
              height={774}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#0f172a' }} />
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 54,
            top: 54,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            width: 430,
            height: 92,
            zIndex: 3,
          }}
        >
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              width={320}
              height={86}
              style={{ width: 320, height: 86, objectFit: 'contain', objectPosition: 'left center' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  background: `linear-gradient(135deg, #f97316, #facc15 46%, ${style.panel} 47%, #14b8a6)`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 34,
                  fontWeight: 900,
                }}
              >
                R
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ color: '#334155', fontSize: 36, fontWeight: 500 }}>{branding.logoTextLine1}</span>
                  <span style={{ color: branding.logoTextLine2Color, fontSize: 24, fontWeight: 800 }}>
                    {branding.logoTextLine2}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 44,
            top: 172,
            width: 462,
            height: 728,
            display: 'flex',
            borderRadius: 42,
            background: 'rgba(255,255,255,0.82)',
            border: '1px solid rgba(226,232,240,0.95)',
            boxShadow: '0 28px 70px rgba(15, 23, 42, 0.10)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 76,
            top: 210,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: 392,
            zIndex: 3,
          }}
        >
          <div
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              borderRadius: 999,
              background: style.panel,
              color: '#ffffff',
              padding: '9px 18px',
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 1.2,
            }}
          >
            {badgeText}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {titleLines.map((line, i) => (
              <div
                key={`${line}-${i}`}
                style={{ color: style.title, fontSize: titleFont, fontWeight: 900, letterSpacing: 0.5, lineHeight: 0.98 }}
              >
                {line}
              </div>
            ))}
          </div>
          {regionText ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <div style={{ display: 'flex', width: 18, height: 18, borderRadius: 999, background: '#facc15' }} />
              <div style={{ color: style.secondary, fontSize: 28, fontWeight: 900 }}>{regionText}</div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 76,
            top: 565,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            zIndex: 3,
          }}
        >
          {infoRows.map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: 350,
                padding: '12px 16px',
                borderRadius: 20,
                background: '#ffffff',
                boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  background: style.panel,
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {rowIcon(row.label)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <span style={{ color: style.secondary, fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{row.value}</span>
                <span style={{ color: '#64748b', fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
                  {row.label.toLocaleUpperCase('tr-TR')}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 58,
            bottom: 54,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            color: '#334155',
            fontSize: 21,
            fontWeight: 700,
            zIndex: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#ef4444', fontSize: 24 }}>●</span>
            <span>rezervasyonyap.tr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#ef4444', fontSize: 24 }}>●</span>
            <span>{branding.phone}</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 58,
            bottom: 34,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            color: '#ffffff',
            fontSize: 25,
            fontWeight: 900,
            textShadow: '0 2px 12px rgba(15, 23, 42, 0.35)',
          }}
        >
          <span>TURSAB</span>
          <span>NO : {branding.tursabNo}</span>
        </div>
      </div>
    ),
    { width: SOCIAL_W, height: SOCIAL_H },
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
    logoUrl: await imageDataUrlForOg(rawBranding.logoUrl, {
      width: 330,
      height: 92,
      fit: 'inside',
    }),
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
      const socialBgUrl = await imageDataUrlForOg(bgUrl, {
        width: 472,
        height: 774,
        fit: 'cover',
      })
      return socialListingImage({
        bgUrl: socialBgUrl ?? bgUrl,
        badge,
        title: listing.title,
        rows,
        branding,
        designTheme,
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
    const socialBgUrl = await imageDataUrlForOg(bgUrl, {
      width: 472,
      height: 774,
      fit: 'cover',
    })
    return socialListingImage({
      bgUrl: socialBgUrl ?? bgUrl,
      badge,
      title: listing.title,
      rows,
      branding,
      designTheme,
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
