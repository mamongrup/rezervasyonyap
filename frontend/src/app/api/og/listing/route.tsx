import { getExperienceListingByHandle, getStayListingByHandle } from '@/data/listings'
import { apiOriginForFetch } from '@/lib/api-origin'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { getPublicSiteUrl, toAbsoluteSiteUrl } from '@/lib/site-branding-seo'
import { normalizeSiteLogoUrl, resolveSiteLogoUrl } from '@/lib/resolve-site-logo-url'
import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import { HOLIDAY_THEME_FILTER_FALLBACK } from '@/lib/holiday-theme-filter-fallback'
import { parseHolidayThemeCodes } from '@/lib/holiday-theme-codes'
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
const SOCIAL_ICON_DIR = path.join(process.cwd(), 'public', 'social', 'icons')
/** Logo altı metin alanı (sol) */
const SOCIAL_TEMPLATE_TEXT = { x: 52, y: 250, w: 410 }

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

async function socialFrameDataUrl(): Promise<string | null> {
  try {
    const input = await sharp(SOCIAL_FRAME_FILE)
      .resize(SOCIAL_W, SOCIAL_H)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const data = input.data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      if (r < 12 && g < 12 && b < 12) {
        data[i + 3] = 0
      }
    }

    const png = await sharp(data, {
      raw: {
        width: input.info.width,
        height: input.info.height,
        channels: 4,
      },
    })
      .png()
      .toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null
  }
}

async function pngFileNativeDataUrl(file: string): Promise<string | null> {
  try {
    const input = await sharp(file).png().toBuffer()
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
      const res = await fetch(fetchUrl, { cache: 'no-store' })
      if (!res.ok) return null
      input = Buffer.from(await res.arrayBuffer())
    }

    const resized = await sharp(input, { failOn: 'none', limitInputPixels: false })
      .rotate()
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

    const maskAlpha = await sharp(SOCIAL_PHOTO_MASK_FILE)
      .resize(SOCIAL_W, SOCIAL_H)
      .ensureAlpha()
      .extractChannel('alpha')
      .threshold(160)
      .erode(1)
      .blur(0.45)
      .raw()
      .toBuffer()

    const mask = await sharp({
      create: {
        width: SOCIAL_W,
        height: SOCIAL_H,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .joinChannel(maskAlpha, {
        raw: { width: SOCIAL_W, height: SOCIAL_H, channels: 1 },
      })
      .png()
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

function titleFontSize(title: string): number {
  const len = title.trim().length
  if (len <= 18) return 42
  if (len <= 26) return 38
  if (len <= 34) return 34
  return 30
}

function socialThemeLabels(codes: string[] | string | null | undefined, locale: string): string[] {
  const labelMap = new Map(HOLIDAY_THEME_FILTER_FALLBACK.map((item) => [item.code, item.label]))
  return parseHolidayThemeCodes(codes)
    .map((code) => {
      if (!locale.startsWith('en')) return labelMap.get(code) ?? code.replaceAll('_', ' ')
      return code
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    })
    .slice(0, 3)
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
    // Satori yalnızca png/jpeg/gif destekler — avif/webp burada PNG'ye çevrilir.
    const output = await sharp(input, { failOn: 'none', limitInputPixels: false })
      .rotate()
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

/** Satori dinamik font indirme (₺ vb.) 400 veriyor — ASCII/para birimi metnine indir. */
function sanitizeOgText(value: string): string {
  return value
    .replaceAll('₺', 'TL')
    .replaceAll('€', 'EUR')
    .replaceAll('£', 'GBP')
    .replaceAll('¥', 'JPY')
    .replaceAll('₽', 'RUB')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

function sanitizeOgRows(rows: { label: string; value: string }[]): { label: string; value: string }[] {
  return rows.map((row) => ({
    label: sanitizeOgText(row.label),
    value: sanitizeOgText(row.value),
  }))
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
  title,
  rows,
  themes,
  pageBase,
  branding,
}: {
  bgUrl: string | null
  title: string
  rows: { label: string; value: string }[]
  themes: string[]
  pageBase: string
  branding: {
    logoUrl: string | null
    phone: string
    tursabNo: string
  }
}) {
  const text = {
    x: scaleSocialTemplate(SOCIAL_TEMPLATE_TEXT.x),
    y: scaleSocialTemplate(SOCIAL_TEMPLATE_TEXT.y),
    w: scaleSocialTemplate(SOCIAL_TEMPLATE_TEXT.w),
  }

  const templateUrl = await pngFileDataUrl(SOCIAL_TEMPLATE_FILE)
  const frameUrl = await socialFrameDataUrl()
  const maskedPhotoUrl = bgUrl ? await buildMaskedSocialPhotoDataUrl(bgUrl, pageBase) : null
  const displayTitle = truncate(sanitizeOgText(title.trim()), 52)
  const installmentText = 'Kredi kartına 12 Taksit'
  const [guestsIcon, bedroomsIcon, bathroomsIcon, locationIcon] =
    await Promise.all(
      ['guests.png', 'bedrooms.png', 'bathrooms.png', 'location.png'].map(
        (file) => pngFileNativeDataUrl(path.join(SOCIAL_ICON_DIR, file)),
      ),
    )

  const rowPriority = (label: string) => {
    const l = label.toLocaleLowerCase('tr-TR')
    if (/bölge|location|konum/.test(l)) return 0
    if (/kişi|guest|kapasite|capacity/.test(l)) return 1
    if (/oda|bedroom|kabin|cabin/.test(l)) return 2
    if (/banyo|bath/.test(l)) return 3
    return 9
  }
  const detailRows = sanitizeOgRows(
    rows
      .filter((r) => !/fiyat|price/i.test(r.label))
      .sort((a, b) => rowPriority(a.label) - rowPriority(b.label))
      .slice(0, 4),
  )
  const locationRow = detailRows.find((row) => rowPriority(row.label) === 0)
  const featureRows = detailRows.filter((row) => row !== locationRow).slice(0, 3)
  const featureIcon = (label: string) => {
    const l = label.toLocaleLowerCase('tr-TR')
    if (/kişi|guest|kapasite|capacity/.test(l)) return guestsIcon
    if (/oda|bedroom|kabin|cabin/.test(l)) return bedroomsIcon
    if (/banyo|bath/.test(l)) return bathroomsIcon
    return null
  }

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
        {templateUrl ? (
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
            gap: 7,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              color: '#ef1010',
              fontSize: titleFontSize(displayTitle),
              fontWeight: 900,
              lineHeight: 1.02,
              maxHeight: 108,
              overflow: 'hidden',
              textTransform: 'uppercase',
            }}
          >
            {displayTitle}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: scaleSocialTemplate(310),
              marginTop: 12,
              padding: '12px 18px',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #ef1010 0%, #f97316 100%)',
              color: '#ffffff',
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 0.2,
              boxShadow: '0 12px 26px rgba(239,16,16,0.18)',
            }}
          >
            {installmentText}
          </div>
          {locationRow ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              {locationIcon ? <img src={locationIcon} alt="" width={36} height={36} /> : null}
              <span style={{ color: '#13294b', fontSize: 25, fontWeight: 800, textTransform: 'uppercase' }}>
                {truncate(locationRow.value, 24)}
              </span>
            </div>
          ) : null}
        </div>

        {themes.length > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: text.x,
            top: scaleSocialTemplate(482),
            width: scaleSocialTemplate(335),
              display: 'flex',
              flexWrap: 'wrap',
            gap: 10,
            }}
          >
            {themes.map((theme) => (
              <div
                key={theme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 13px',
                  border: '2px solid #0c93a0',
                  borderRadius: 9,
                  background: 'rgba(255,255,255,0.9)',
                  color: '#13294b',
                  fontSize: 21,
                  fontWeight: 800,
                }}
              >
                {theme}
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            position: 'absolute',
            left: text.x,
            top: scaleSocialTemplate(635),
            width: text.w,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {featureRows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              {featureIcon(row.label) ? (
                <img src={featureIcon(row.label)!} alt="" width={50} height={50} />
              ) : (
                <span style={{ width: 50, height: 50 }} />
              )}
              <span style={{ color: '#13294b', fontSize: 27, fontWeight: 800, textTransform: 'uppercase' }}>
                {row.value} {row.label}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: scaleSocialTemplate(30),
            bottom: scaleSocialTemplate(24),
            width: scaleSocialTemplate(455),
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            color: '#13294b',
            lineHeight: 1.08,
          }}
        >
          {branding.logoUrl ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: scaleSocialTemplate(340),
                padding: '6px 10px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.96)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.14)',
              }}
            >
              <img
                src={branding.logoUrl}
                alt="Logo"
                width={scaleSocialTemplate(300)}
                height={scaleSocialTemplate(84)}
                style={{
                  objectFit: 'contain',
                  opacity: 1,
                }}
              />
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: '#0f2b52' }}>
            Mamon Plus Travel Agency
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: '#0f2b52' }}>
            www.rezervasyonyap.com.tr
          </div>
          <div style={{ display: 'flex', fontSize: 23, fontWeight: 700, color: '#0f2b52' }}>
            {branding.phone}
          </div>
          <div style={{ display: 'flex', fontSize: 21, fontWeight: 800, color: '#0f2b52' }}>
            TURSAB NO : {branding.tursabNo}
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
  const fallbackImagePath = searchParams.get('image')?.trim() || ''
  const fallbackThemes = socialThemeLabels(searchParams.get('theme_codes'), locale)
  const fallbackRows = [
    { label: locale.startsWith('en') ? 'Location' : 'Bölge', value: searchParams.get('location')?.trim() || '' },
    { label: locale.startsWith('en') ? 'Guests' : 'Kişi', value: searchParams.get('guests')?.trim() || '' },
    { label: locale.startsWith('en') ? 'Bedrooms' : 'Oda', value: searchParams.get('rooms')?.trim() || '' },
    { label: locale.startsWith('en') ? 'Bathrooms' : 'Banyo', value: searchParams.get('bathrooms')?.trim() || '' },
  ].filter((row) => row.value)
  const renderFallbackSocial = async () => {
    if (variant !== 'social' || !fallbackTitle) return null
    const imageUrls = await listingImageUrlsFromId(base, fallbackListingId)
    const fallbackImageUrl = fallbackImagePath.startsWith('/')
      ? toAbsoluteAssetUrl(base, fallbackImagePath)
      : null
    return socialListingImage({
      bgUrl: imageUrls[0] ?? fallbackImageUrl,
      title: fallbackTitle,
      rows: fallbackRows,
      themes: fallbackThemes,
      pageBase: base,
      branding,
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
    const bgUrlRaw = rawImg ? toAbsoluteAssetUrl(base, rawImg) ?? rawImg : null
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
        bgUrl: bgUrlRaw,
        title: listing.title,
        rows: sanitizeOgRows(rows),
        themes: socialThemeLabels(listing.themeCodes, locale).map(sanitizeOgText),
        pageBase: base,
        branding,
      })
    }

    const bgUrl = await imageDataUrlForOg(
      bgUrlRaw,
      { width: OG_W, height: OG_H, fit: 'cover' },
      base,
    )
    const ogRows = sanitizeOgRows(rows)

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
              gap: 18,
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
              {truncate(sanitizeOgText(listing.title), 90)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {ogRows.map((row, i) => (
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
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>
              {sanitizeOgText(branding.logoTextLine1)}
            </div>
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
  const bgUrlRaw = rawImg ? toAbsoluteAssetUrl(base, rawImg) ?? rawImg : null

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
      bgUrl: bgUrlRaw,
      title: listing.title,
      rows: sanitizeOgRows(rows),
      themes: [],
      pageBase: base,
      branding,
    })
  }

  const bgUrl = await imageDataUrlForOg(
    bgUrlRaw,
    { width: OG_W, height: OG_H, fit: 'cover' },
    base,
  )
  const ogRows = sanitizeOgRows(rows)

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
            gap: 18,
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
            {truncate(sanitizeOgText(listing.title), 90)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ogRows.map((row, i) => (
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
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>
            {sanitizeOgText(branding.logoTextLine1)}
          </div>
        </div>
      </div>
    ),
    { width: OG_W, height: OG_H },
  )
}


