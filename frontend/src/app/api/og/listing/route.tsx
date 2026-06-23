import { getExperienceListingByHandle, getStayListingByHandle } from '@/data/listings'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { getPublicSiteUrl, toAbsoluteSiteUrl } from '@/lib/site-branding-seo'
import type { TListingBase } from '@/types/listing-types'
import {
  buildExperienceListingShareRows,
  buildStayListingShareRows,
  inferCatalogVerticalForStayListing,
} from '@/lib/social-share/listing-share-templates'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OG_W = 1200
const OG_H = 630
const SOCIAL_W = 1080
const SOCIAL_H = 1080

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function socialListingImage({
  bgUrl,
  badge,
  title,
  rows,
  brand,
}: {
  bgUrl: string | null
  badge: string
  title: string
  rows: { label: string; value: string }[]
  brand: string
}) {
  const region = rows.find((r) => /bölge|location/i.test(r.label))?.value
  const infoRows = rows.filter((r) => !/fiyat|price/i.test(r.label)).slice(0, 4)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 38,
            display: 'flex',
            borderRadius: 52,
            border: '10px solid #0ea5b7',
            background: '#fff',
            boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
            overflow: 'hidden',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 68,
            top: 68,
            right: 68,
            bottom: 68,
            display: 'flex',
            borderRadius: 38,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #fff 0%, #fff 36%, #e0f7fa 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -180,
              top: 160,
              width: 560,
              height: 560,
              borderRadius: 999,
              background: 'rgba(251, 146, 60, 0.18)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -130,
              bottom: -110,
              width: 620,
              height: 620,
              borderRadius: 999,
              background: '#0ea5b7',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 72,
              top: 170,
              width: 580,
              height: 580,
              display: 'flex',
              borderRadius: 80,
              overflow: 'hidden',
              border: '14px solid #ffffff',
              boxShadow: '0 28px 80px rgba(15, 23, 42, 0.35)',
              transform: 'rotate(-2deg)',
            }}
          >
            {bgUrl ? (
              <img
                src={bgUrl}
                alt=""
                width={580}
                height={580}
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
              top: 42,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ color: '#0f766e', fontSize: 38, fontWeight: 800 }}>{brand}</div>
            <div style={{ color: '#ef4444', fontSize: 66, fontWeight: 900, letterSpacing: 1 }}>
              {truncate(title, 24).toLocaleUpperCase('tr-TR')}
            </div>
            <div style={{ color: '#1e3a8a', fontSize: 52, fontWeight: 700 }}>{badge}</div>
            {region ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ color: '#f59e0b', fontSize: 44 }}>●</span>
                <span style={{ color: '#0f172a', fontSize: 34, fontWeight: 800 }}>
                  {truncate(region, 18).toLocaleUpperCase('tr-TR')}
                </span>
              </div>
            ) : null}
          </div>

          <div
            style={{
              position: 'absolute',
              left: 66,
              bottom: 104,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {infoRows.map((row, i) => (
              <div key={`${row.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    background: '#0ea5b7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: 900,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ color: '#0f172a', fontSize: 34, fontWeight: 900 }}>{row.value}</span>
                  <span style={{ color: '#334155', fontSize: 30, fontWeight: 700 }}>
                    {row.label.toLocaleUpperCase('tr-TR')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              position: 'absolute',
              left: 54,
              right: 54,
              bottom: 34,
              display: 'flex',
              justifyContent: 'space-between',
              color: '#0f172a',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <span>rezervasyonyap.tr</span>
            <span>TURSAB NO: 13127</span>
          </div>
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
  if (!handle) {
    return new Response('Missing handle', { status: 400 })
  }

  const base = getPublicSiteUrl()
  if (!base) {
    return new Response('NEXT_PUBLIC_SITE_URL required for OG images', { status: 503 })
  }

  const brand = (process.env.NEXT_PUBLIC_SITE_NAME ?? '').trim() || 'Travel'

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
    const bgUrl = rawImg ? toAbsoluteSiteUrl(base, rawImg) ?? rawImg : null
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
        brand,
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
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>{brand}</div>
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
  const bgUrl = rawImg ? toAbsoluteSiteUrl(base, rawImg) ?? rawImg : null

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
      brand,
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
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>{brand}</div>
        </div>
      </div>
    ),
    { width: OG_W, height: OG_H },
  )
}
