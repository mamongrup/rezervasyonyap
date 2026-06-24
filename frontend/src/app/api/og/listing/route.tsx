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
    if (/kişi|guest|kapasite|capacity/.test(l)) return '👨‍👩‍👧'
    if (/oda|bedroom|kabin|cabin|yatak|bed\b/.test(l)) return '🛏'
    if (/banyo|bath/.test(l)) return '🛁'
    if (/süre|duration/.test(l)) return '⏱'
    return '✓'
  }
  const infoRows = rows
    .filter((r) => !/fiyat|price|bölge|location/i.test(r.label))
    .sort((a, b) => rowPriority(a.label) - rowPriority(b.label))
    .slice(0, 3)
  const titleTop = truncate(title, 24).toLocaleUpperCase('tr-TR')
  const badgeText = truncate(badge, 18).toLocaleUpperCase('tr-TR')
  const regionText = region ? truncate(region, 20).toLocaleUpperCase('tr-TR') : ''
  const brandText = brand.trim() || 'Rezervasyon Yap'

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
            inset: 0,
            background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 52%, #e5fbff 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -160,
            top: 222,
            width: 720,
            height: 720,
            display: 'flex',
            borderRadius: 999,
            border: '34px solid rgba(251, 146, 60, 0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -70,
            top: 310,
            width: 620,
            height: 620,
            display: 'flex',
            borderRadius: 999,
            border: '22px solid rgba(20, 184, 166, 0.12)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: -124,
            top: -42,
            width: 690,
            height: 1130,
            display: 'flex',
            borderRadius: '390px 0 0 390px',
            background: '#078fa0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 630,
            height: 1080,
            display: 'flex',
            borderRadius: '360px 0 0 360px',
            overflow: 'hidden',
            borderLeft: '22px solid #ffffff',
            boxShadow: '-26px 0 70px rgba(15, 23, 42, 0.22)',
          }}
        >
          {bgUrl ? (
            <img
              src={bgUrl}
              alt=""
              width={630}
              height={1080}
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
            top: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 72,
              height: 72,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #f97316, #facc15 46%, #0891b2 47%, #14b8a6)',
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
            <div style={{ color: '#334155', fontSize: 34, fontWeight: 500 }}>{brandText}</div>
            <div style={{ color: '#f97316', fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              rezervasyonyap.tr
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 58,
            top: 178,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxWidth: 500,
          }}
        >
          <div style={{ color: '#ef1f24', fontSize: 70, fontWeight: 900, letterSpacing: 1.4 }}>
            {titleTop}
          </div>
          <div style={{ color: '#1e3a8a', fontSize: 58, fontWeight: 500, letterSpacing: 1 }}>
            {badgeText}
          </div>
          {regionText ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
              <div style={{ color: '#facc15', fontSize: 54, lineHeight: 1 }}>●</div>
              <div style={{ color: '#1e3a8a', fontSize: 36, fontWeight: 900 }}>{regionText}</div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 74,
            top: 558,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {infoRows.map((row, i) => (
            <div key={`${row.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f766e',
                  background: 'rgba(20,184,166,0.12)',
                  fontSize: 30,
                }}
              >
                {rowIcon(row.label)}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ color: '#1e3a8a', fontSize: 38, fontWeight: 900 }}>{row.value}</span>
                <span style={{ color: '#1e3a8a', fontSize: 34, fontWeight: 900 }}>
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
            gap: 10,
            color: '#334155',
            fontSize: 23,
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#ef4444', fontSize: 24 }}>●</span>
            <span>rezervasyonyap.tr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#ef4444', fontSize: 24 }}>●</span>
            <span>0850 466 0464 - 0532 397 7957</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 58,
            bottom: 52,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            color: '#ffffff',
            fontSize: 26,
            fontWeight: 900,
            textShadow: '0 2px 12px rgba(15, 23, 42, 0.35)',
          }}
        >
          <span>TURSAB</span>
          <span>NO : 13127</span>
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
