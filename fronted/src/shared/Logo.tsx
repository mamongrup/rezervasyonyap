'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getSitePublicConfig } from '@/lib/travel-api'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

const LS_KEY = 'travel_branding_cache'

interface LogoProps {
  className?: string
  src?: string
  darkSrc?: string
  alt?: string
}

function detectCategoryCode(pathname: string): string | null {
  const segments = pathname.toLowerCase().split('/')
  const MAP: [string, string][] = [
    ['oteller', 'hotel'], ['stay-categories', 'hotel'],
    ['turlar', 'tour'], ['tour-categories', 'tour'],
    ['tatil-evleri', 'holiday_home'], ['villa', 'holiday_home'],
    ['arac-kiralama', 'car_rental'], ['car-categories', 'car_rental'],
    ['aktiviteler', 'activity'], ['experience-categories', 'activity'],
    ['kruvaziyer', 'cruise'], ['cruise', 'cruise'],
    ['yat-kiralama', 'yacht_charter'], ['yacht', 'yacht_charter'],
    ['ucak-bileti', 'flight'], ['flight-categories', 'flight'],
    ['hac-umre', 'hajj'],
    ['vize', 'visa'],
    ['transfer', 'transfer'],
    ['feribot', 'ferry'],
    ['plaj', 'beach_lounger'],
    ['sinema', 'cinema_ticket'],
    ['etkinlik', 'event'], ['konser', 'event'],
    ['restoran', 'restaurant_table'],
  ]
  for (const seg of segments) {
    for (const [key, code] of MAP) {
      if (seg === key || seg.startsWith(key)) return code
    }
  }
  return null
}

interface CategoryLogo { logo_url?: string; logo_url_dark?: string }

interface BrandingConfig {
  logo_url?: string
  logo_url_dark?: string
  logo_icon_url?: string
  logo_mode?: 'image' | 'icon_text'
  logo_text_line1?: string
  logo_text_line2?: string
  logo_text_line2_color?: string
  site_name?: string
  category_logos?: Record<string, CategoryLogo>
}

function readCachedBranding(): BrandingConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BrandingConfig
  } catch {
    return null
  }
}

function writeCachedBranding(b: BrandingConfig) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(b))
  } catch { /* ignore */ }
}

/** Metin logosu — logo URL yokken veya yüklenirken gösterilir */
function TextLogoFallback({ siteName, className }: { siteName?: string; className?: string }) {
  const name = siteName || 'Travel'
  const [first, ...rest] = name.split(' ')
  return (
    <span
      className={`inline-flex items-baseline gap-1 font-extrabold leading-none tracking-tight ${className ?? ''}`}
      style={{ fontSize: '1.45rem' }}
    >
      <span className="text-primary-600">{first}</span>
      {rest.length > 0 && (
        <span className="text-neutral-800 dark:text-white">{rest.join(' ')}</span>
      )}
    </span>
  )
}

const Logo: React.FC<LogoProps> = ({ className = 'w-auto', src, darkSrc, alt }) => {
  const pathname = usePathname() ?? ''
  const vitrinPath = useVitrinHref()

  /**
   * Hydration güvenliği: sunucu ve ilk istemci render AYNI başlangıç değerini
   * kullanmalı. localStorage sadece useEffect içinde okunur.
   */
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    if (src) return { logo_url: src, logo_url_dark: darkSrc ?? src, site_name: alt ?? 'Logo' }
    return { site_name: alt ?? '' }
  })
  const [categoryLogos, setCategoryLogos] = useState<Record<string, CategoryLogo>>({})

  useEffect(() => {
    if (src) return

    // 1) Önce cache'ten anında yükle (flash'ı önler)
    const cached = readCachedBranding()
    if (cached) {
      setBranding(cached)
      setCategoryLogos(cached.category_logos ?? {})
    }

    // 2) Sonra API'den güncel veriyi çek ve cache'i güncelle
    getSitePublicConfig()
      .then((cfg) => {
        const b = (cfg.branding ?? {}) as BrandingConfig & Record<string, unknown>
        const next: BrandingConfig = {
          logo_url: b.logo_url,
          logo_url_dark: b.logo_url_dark,
          logo_icon_url: b.logo_icon_url,
          logo_mode: b.logo_mode,
          logo_text_line1: b.logo_text_line1,
          logo_text_line2: b.logo_text_line2,
          logo_text_line2_color: b.logo_text_line2_color,
          site_name: b.site_name ?? (cfg as { site_name?: string }).site_name,
          category_logos: b.category_logos as Record<string, CategoryLogo> | undefined,
        }
        setBranding(next)
        writeCachedBranding(next)
        if (b.category_logos && typeof b.category_logos === 'object') {
          setCategoryLogos(b.category_logos as Record<string, CategoryLogo>)
        }
      })
      .catch(() => { /* cache veya fallback kullanılmaya devam eder */ })
  }, [src])

  const catCode = detectCategoryCode(pathname)
  const catLogo = catCode ? categoryLogos[catCode] : null

  const activeLogoUrl = catLogo?.logo_url || branding.logo_url || null
  const activeDarkUrl = catLogo?.logo_url_dark || catLogo?.logo_url || branding.logo_url_dark || branding.logo_url || null
  const altText = alt ?? branding.site_name ?? 'Logo'

  // ── Icon + Text mode ──────────────────────────────────────────────────────
  if (!catLogo && branding.logo_mode === 'icon_text' && branding.logo_icon_url) {
    const line1 = branding.logo_text_line1 || branding.site_name || ''
    const line2 = branding.logo_text_line2 || ''
    const line2Color = branding.logo_text_line2_color || '#f97316'

    return (
      <Link
        href={vitrinPath('/')}
        className={`inline-flex items-center gap-2.5 focus:ring-0 focus:outline-hidden ${className}`}
      >
        <img
          src={branding.logo_icon_url}
          alt={altText}
          className="h-14 w-14 shrink-0 object-contain"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <span className="flex flex-col leading-none">
          {line1 && (
            <span className="text-[18px] font-bold tracking-tight text-neutral-900 dark:text-white">
              {line1}
            </span>
          )}
          {line2 && (
            <span className="text-[14px] font-semibold tracking-wide" style={{ color: line2Color }}>
              {line2}
            </span>
          )}
        </span>
      </Link>
    )
  }

  // ── Full image mode ───────────────────────────────────────────────────────
  return (
    <Link
      href={vitrinPath('/')}
      className={`inline-flex items-center text-primary-600 focus:ring-0 focus:outline-hidden ${className}`}
    >
      {activeLogoUrl ? (
        <>
          <img
            src={activeLogoUrl}
            alt={altText}
            className="block max-h-[56px] w-auto dark:hidden"
            style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
          />
          <img
            src={activeDarkUrl ?? activeLogoUrl}
            alt={altText}
            className="hidden max-h-[56px] w-auto dark:block"
            style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
          />
        </>
      ) : (
        <TextLogoFallback siteName={branding.site_name} />
      )}
    </Link>
  )
}

export default Logo
