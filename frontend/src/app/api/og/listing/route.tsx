import { getExperienceListingByHandle, getStayListingByHandle } from '@/data/listings'
import { apiOriginForFetch } from '@/lib/api-origin'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { getPublicSiteUrl, toAbsoluteSiteUrl } from '@/lib/site-branding-seo'
import { normalizeSiteLogoUrl, resolveSiteLogoUrl } from '@/lib/resolve-site-logo-url'
import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import type { TListingBase } from '@/types/listing-types'
import { getPublicListingImages } from '@/lib/travel-api'
import {
  buildExperienceListingShareRows,
  buildStayListingShareRows,
  inferCatalogVerticalForStayListing,
} from '@/lib/social-share/listing-share-templates'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import path from 'node:path'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OG_W = 1200
const OG_H = 630
const SOCIAL_W = 1080
const SOCIAL_H = 1080
const SOCIAL_TEMPLATE_BASE = 1024

/** 1024×1024 marka şablonu — gri pebble alanı (piksel analizi) */
const SOCIAL_TEMPLATE_PHOTO = { x: 283, y: 75, w: 741, h: 835 }
const SOCIAL_TEMPLATE_FILE = path.join(process.cwd(), 'public', 'social', 'social-cover-template.png')
const SOCIAL_FRAME_FILE = path.join(process.cwd(), 'public', 'social', 'social-cover-frame.png')
const SOCIAL_PHOTO_MASK_FILE = path.join(process.cwd(), 'public', 'social', 'social-cover-photo-mask.png')
const SOCIAL_PHOTO_BLEED = 1.06
/** Logo altı metin alanı (sol) */
const SOCIAL_TEMPLATE_TEXT = { x: 32, y: 210, w: 300 }

function scaleSocialTemplate(n: number): number {
  return Math.round(n * (SOCIAL_W / SOCIAL_TEMPLATE_BASE))
}

async function pngFileDataUrl(file: string): Promise<string | null> {
  try {
    const input = await sharp(file)
      .resize(SOCIAL_W, SOCIAL_H)
      .png()
      .toBuffer()
    return `data:image/png;base64,${input.toString('base64')}`
  } catch {
    return null
  }
}

async function buildMaskedSocialPhotoDataUrl(
  bgUrl: string,
  pageBase: string,
): Promise<string | null> {
  try {
    const scale = SOCIAL_W / SOCIAL_TEMPLATE_BASE
    const slot = SOCIAL_TEMPLATE_PHOTO
    const coverW = Math.round(slot.w * scale * SOCIAL_PHOTO_BLEED)
    const coverH = Math.round(slot.h * scale * SOCIAL_PHOTO_BLEED)
    const left = Math.round(slot.x * scale) - Math.round((coverW - slot.w * scale) / 2)
    const top = Math.round(slot.y * scale) - Math.round((coverH - slot.h * scale) / 2)

    let input: Buffer
    if (bgUrl.startsWith('data:')) {
      const b64 = bgUrl.split(',')[1]
      if (!b64) return null
      input = Buffer.from(b64, 'base64')
    } else {
      const fetchUrl = rewriteLoopbackUploadUrl(bgUrl, pageBase)
      const res = await fetchWithTimeout(fetchUrl, 3500)
      if (!res.ok) return null
      input = Buffer.from(await res.arrayBuffer())
    }

    const resized = await sharp(input)
      .resize({ width: coverW, height: coverH, fit: 'cover' })
      .png()
      .toBuffer()

    const placed = await sharp({
      create: {
        width: SOCIAL_W,
        height: SOCIAL_H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, left, top }])
      .png()
      .toBuffer()

    const mask = await sharp(SOCIAL_PHOTO_MASK_FILE)
      .resize(SOCIAL_W, SOCIAL_H)
      .ensureAlpha()
      .toBuffer()

    const masked = await sharp(placed)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer()

    return `data:image/png;base64,${masked.toString('base64')}`
  } catch {
    return null
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

function requestOriginBase(req: NextRequest): string {
  const configured = getPublicSiteUrl()
  if (configured) return configured
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`.replace(/\/$/, '')
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

function badgeFromCategoryCode(categoryCode: string, locale: string): string {
  switch (categoryCode.trim().toLowerCase()) {
    case 'holiday_home':
      return locale.startsWith('en') ? 'Holiday home' : 'Villa'
    case 'yacht_charter':
      return locale.startsWith('en') ? 'Yacht' : 'Yat'
    case 'tour':
      return locale.startsWith('en') ? 'Tour' : 'Tur'
    case 'activity':
      return locale.startsWith('en') ? 'Activity' : 'Aktivite'
    case 'hotel':
    default:
      return locale.startsWith('en') ? 'Hotel' : 'Otel'
  }
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

async function listingImageUrlsFromId(base: string, listingId: string | null): Promise<string[]> {
  const id = listingId?.trim()
  if (!id) return []
  const res = await getPublicListingImages(id).catch(() => null)
  return (res?.images ?? [])
    .map((img) => storageKeyToPublicUrl(img.storage_key ?? ''))
    .map((src) => (src ? toAbsoluteAssetUrl(base, src) ?? src : ''))
    .filter(Boolean)
    .slice(0, 6)
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

async function socialListingImage({
  bgUrl,
  badge,
  title,
  rows,
  pageBase,
}: {
  bgUrl: string | null
  badge: string
  title: string
  rows: { label: string; value: string }[]
  pageBase: string
}) {
  const text = {
    x: scaleSocialTemplate(SOCIAL_TEMPLATE_TEXT.x),
    y: scaleSocialTemplate(SOCIAL_TEMPLATE_TEXT.y),
    w: scaleSocialTemplate(SOCIAL_TEMPLATE_TEXT.w),
  }

  const templateUrl = await pngFileDataUrl(SOCIAL_TEMPLATE_FILE)
  const frameUrl = await pngFileDataUrl(SOCIAL_FRAME_FILE)
  const maskedPhotoUrl = bgUrl ? await buildMaskedSocialPhotoDataUrl(bgUrl, pageBase) : null
  const displayTitle = truncate(titleWithoutBadge(title, badge), 52)

  const rowPriority = (label: string) => {
    const l = label.toLocaleLowerCase('tr-TR')
    if (/bölge|location|konum/.test(l)) return 0
    if (/kişi|guest|kapasite|capacity/.test(l)) return 1
    if (/oda|bedroom|kabin|cabin/.test(l)) return 2
    if (/banyo|bath/.test(l)) return 3
    return 9
  }
  const detailRows = rows
    .filter((r) => !/fiyat|price/i.test(r.label))
    .sort((a, b) => rowPriority(a.label) - rowPriority(b.label))
    .slice(0, 4)

  return new ImageResponse(
    (
      <div
        style={{
          width: SOCIAL_W,
          height: SOCIAL_H,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        {!maskedPhotoUrl && templateUrl ? (
          <img
            src={templateUrl}
            alt=""
            width={SOCIAL_W}
            height={SOCIAL_H}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: SOCIAL_W,
              height: SOCIAL_H,
            }}
          />
        ) : null}

        {maskedPhotoUrl ? (
          <>
            <img
              src={maskedPhotoUrl}
              alt=""
              width={SOCIAL_W}
              height={SOCIAL_H}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: SOCIAL_W,
                height: SOCIAL_H,
              }}
            />
            {frameUrl ? (
              <img
                src={frameUrl}
                alt=""
                width={SOCIAL_W}
                height={SOCIAL_H}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: SOCIAL_W,
                  height: SOCIAL_H,
                }}
              />
            ) : null}
          </>
        ) : null}

        <div
          style={{
            position: 'absolute',
            left: text.x,
            top: text.y,
            width: text.w,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              color: '#0f172a',
              fontSize: 24,
              fontWeight: 900,
              lineHeight: 1.15,
              maxHeight: 88,
              overflow: 'hidden',
            }}
          >
            {displayTitle}
          </div>
          {detailRows.map((row) => (
            <div key={`${row.label}-${row.value}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
                {row.label.toLocaleUpperCase('tr-TR')}
              </span>
              <span style={{ color: '#0f172a', fontSize: 15, fontWeight: 800 }}>{row.value}</span>
            </div>
          ))}
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
  if (!handle) {
    return new Response('Missing handle', { status: 400 })
  }

  const base = requestOriginBase(req)

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

  const fallbackListingId = searchParams.get('listing_id')?.trim() || null
  const fallbackTitle = searchParams.get('title')?.trim() || ''
  const fallbackCategoryCode = searchParams.get('category_code')?.trim() || (kind === 'experience' ? 'tour' : 'hotel')
  const renderFallbackSocial = async () => {
    if (variant !== 'social' || !fallbackTitle) return null
    const imageUrls = await listingImageUrlsFromId(base, fallbackListingId)
    return socialListingImage({
      bgUrl: imageUrls[0] ?? null,
      badge: badgeFromCategoryCode(fallbackCategoryCode, locale),
      title: fallbackTitle,
      rows: [],
      pageBase: base,
    })
  }

  if (kind === 'stay') {
    const listing = await getStayListingByHandle(handle, locale)
    if (!listing?.id) {
      const fallback = await renderFallbackSocial()
      if (fallback) return fallback
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
      return socialListingImage({
        bgUrl,
        badge,
        title: listing.title,
        rows,
        pageBase: base,
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
    const fallback = await renderFallbackSocial()
    if (fallback) return fallback
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
    return socialListingImage({
      bgUrl,
      badge,
      title: listing.title,
      rows,
      pageBase: base,
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
