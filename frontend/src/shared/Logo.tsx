'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeSiteLogoUrl, pickEffectiveSiteLogoUrls, resolveSiteLogoUrl } from '@/lib/resolve-site-logo-url'
import { siteUploadBrowserHref } from '@/lib/site-upload-browser-href'
import { getSitePublicConfig } from '@/lib/travel-api'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useId, useRef, useState } from 'react'

const LS_KEY = 'travel_branding_cache'

/** WCAG bağıl parlaklık (0-1). Geçersiz hex → null. */
function hexRelativeLuminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const toLin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const r = toLin((n >> 16) & 0xff)
  const g = toLin((n >> 8) & 0xff)
  const b = toLin(n & 0xff)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Panelden gelen marka rengi beyaz header üzerinde WCAG AA (4.5:1) altında
 * kalabiliyor (ör. #f97316 → 2.8:1, Lighthouse contrast hatası). Light modda
 * rengi kademeli koyulaştırıp eşiği sağlar; dark modda orijinal renk kullanılır.
 */
function accessibleOnWhite(hex: string): string {
  const lum = hexRelativeLuminance(hex)
  if (lum === null) return hex
  let cur = hex.replace(/^#?/, '#')
  for (let i = 0; i < 12; i++) {
    const l = hexRelativeLuminance(cur)
    if (l === null) return hex
    const contrast = 1.05 / (l + 0.05)
    if (contrast >= 4.5) return cur
    const n = parseInt(cur.slice(1), 16)
    const dark = (c: number) => Math.max(0, Math.round(c * 0.88))
    const r = dark((n >> 16) & 0xff)
    const g = dark((n >> 8) & 0xff)
    const b = dark(n & 0xff)
    cur = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }
  return cur
}

interface LogoProps {
  className?: string
  src?: string
  darkSrc?: string
  alt?: string
  initialBranding?: BrandingConfig
}

function detectCategoryCode(pathname: string): string | null {
  const segments = pathname.toLowerCase().split('/')
  const MAP: [string, string][] = [
    ['oteller', 'hotel'],
    ['stay-categories', 'hotel'],
    ['turlar', 'tour'],
    ['tour-categories', 'tour'],
    ['tatil-evleri', 'holiday_home'],
    ['villa', 'holiday_home'],
    ['arac-kiralama', 'car_rental'],
    ['car-categories', 'car_rental'],
    ['aktiviteler', 'activity'],
    ['experience-categories', 'activity'],
    ['kruvaziyer', 'cruise'],
    ['cruise', 'cruise'],
    ['yat-kiralama', 'yacht_charter'],
    ['yacht', 'yacht_charter'],
    ['ucak-bileti', 'flight'],
    ['flight-categories', 'flight'],
    ['hac-umre', 'hajj'],
    ['vize', 'visa'],
    ['transfer', 'transfer'],
    ['feribot', 'ferry'],
    ['plaj', 'beach_lounger'],
    ['sinema', 'cinema_ticket'],
    ['etkinlik', 'event'],
    ['konser', 'event'],
    ['restoran', 'restaurant_table'],
  ]
  for (const seg of segments) {
    for (const [key, code] of MAP) {
      if (seg === key || seg.startsWith(key)) return code
    }
  }
  return null
}

interface CategoryLogo {
  logo_url?: string
  logo_url_dark?: string
}

export interface BrandingConfig {
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
  } catch {
    /* ignore */
  }
}

/** API/cache güncellemesinde geçerli logoyu silme — önceki oturumdaki gerçek URL korunur */
function mergeBrandingLogos(prev: BrandingConfig, next: BrandingConfig): BrandingConfig {
  const prevPicked = pickEffectiveSiteLogoUrls(prev.logo_url, prev.logo_url_dark)
  const nextPicked = pickEffectiveSiteLogoUrls(next.logo_url, next.logo_url_dark)
  return {
    ...next,
    logo_url: nextPicked.light ?? prevPicked.light ?? undefined,
    logo_url_dark: nextPicked.dark ?? prevPicked.dark ?? undefined,
  }
}

function logoImageFallback(src: string | null): string | null {
  if (!src) return null
  if (src.endsWith('.avif')) return `${src.slice(0, -'.avif'.length)}.webp`
  return null
}

/** Metin logosu — logo URL yokken veya yüklenirken gösterilir */
function TextLogoFallback({ siteName, className }: { siteName?: string; className?: string }) {
  const name = siteName || 'Travel'
  const [first, ...rest] = name.split(' ')
  return (
    <span
      className={`inline-flex items-baseline gap-1 leading-none font-extrabold tracking-tight ${className ?? ''}`}
      style={{ fontSize: '1.45rem' }}
    >
      <span className="text-primary-600">{first}</span>
      {rest.length > 0 && <span className="text-neutral-800 dark:text-white">{rest.join(' ')}</span>}
    </span>
  )
}

function AnimatedBrandIcon({
  src,
  alt,
  className,
  onError,
}: {
  src: string
  alt: string
  className?: string
  onError?: () => void
}) {
  const uid = useId().replace(/:/g, '')
  const tealFilter = `brand-teal-${uid}`
  const warmFilter = `brand-warm-${uid}`
  const sunClip = `brand-sun-${uid}`
  const [imageReady, setImageReady] = useState(false)
  const [animationCycle, setAnimationCycle] = useState(0)
  const hoverArmed = useRef(true)

  useEffect(() => {
    let active = true
    setImageReady(false)
    const image = new window.Image()
    image.onload = () => {
      if (active) setImageReady(true)
    }
    image.onerror = () => {
      if (active) onError?.()
    }
    image.src = src
    return () => {
      active = false
    }
  }, [src, onError])

  useEffect(() => {
    if (!imageReady) return
    const timer = window.setInterval(() => setAnimationCycle((cycle) => cycle + 1), 12_000)
    return () => window.clearInterval(timer)
  }, [imageReady])

  const rays = [
    { x: 45, y: 315, w: 210, h: 125, delay: 1.82 },
    { x: 245, y: 45, w: 185, h: 215, delay: 1.9 },
    { x: 585, y: 45, w: 105, h: 175, delay: 1.98 },
    { x: 775, y: 200, w: 130, h: 120, delay: 2.06 },
    { x: 845, y: 400, w: 110, h: 75, delay: 2.14 },
  ]

  if (!imageReady) {
    return <span className={`inline-block ${className ?? ''}`} aria-hidden="true" />
  }

  return (
    <svg
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={alt}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => {
        if (!hoverArmed.current) return
        hoverArmed.current = false
        setAnimationCycle((cycle) => cycle + 1)
      }}
      onMouseLeave={() => {
        hoverArmed.current = true
      }}
    >
      <style>{`
        .brand-wave-layer {
          clip-path: inset(0 100% 0 0);
          animation: brand-wave-in .72s cubic-bezier(.4,0,.2,1) forwards;
        }
        .brand-sun-layer {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: brand-sun-in 1.05s cubic-bezier(.3,.05,.2,1) .62s forwards;
        }
        .brand-ray-layer {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: brand-ray-in .34s cubic-bezier(.2,.9,.35,1.35) forwards;
        }
        .brand-final-layer { opacity: 0; animation: brand-final-in .01s linear 2.52s forwards; }
        @keyframes brand-wave-in { to { clip-path: inset(0 0 0 0); } }
        @keyframes brand-sun-in {
          0% { opacity: 0; transform: scale(.08) rotate(-12deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes brand-ray-in {
          0% { opacity: 0; transform: scale(.18) rotate(-10deg); }
          72% { opacity: 1; transform: scale(1.1) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes brand-final-in { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .brand-wave-layer, .brand-sun-layer, .brand-ray-layer { display: none; animation: none; }
          .brand-final-layer { opacity: 1; animation: none; }
        }
      `}</style>
      <defs>
        <filter id={tealFilter} colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            result="colorMask"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2 0 2 0 0"
          />
          <feComponentTransfer in="colorMask" result="thresholdMask">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="thresholdMask" operator="in" />
        </filter>
        <filter id={warmFilter} colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            result="colorMask"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  2 0 -2 0 0"
          />
          <feComponentTransfer in="colorMask" result="thresholdMask">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="thresholdMask" operator="in" />
        </filter>
        <clipPath id={sunClip}>
          <circle cx="548" cy="526" r="405" />
        </clipPath>
      </defs>
      <g key={animationCycle}>
        <g className="brand-wave-layer" filter={`url(#${tealFilter})`}>
          <image href={src} width="1024" height="1024" preserveAspectRatio="xMidYMid meet" onError={onError} />
        </g>
        <g className="brand-sun-layer" clipPath={`url(#${sunClip})`} filter={`url(#${warmFilter})`}>
          <image href={src} width="1024" height="1024" preserveAspectRatio="xMidYMid meet" />
        </g>
        {rays.map((ray, index) => (
          <svg
            key={`${ray.x}-${ray.y}`}
            x={ray.x}
            y={ray.y}
            width={ray.w}
            height={ray.h}
            viewBox={`${ray.x} ${ray.y} ${ray.w} ${ray.h}`}
            overflow="visible"
            className="brand-ray-layer"
            style={{ animationDelay: `${ray.delay + index * 0.015}s` }}
          >
            <g filter={`url(#${warmFilter})`}>
              <image href={src} width="1024" height="1024" preserveAspectRatio="xMidYMid meet" />
            </g>
          </svg>
        ))}
        <image
          className="brand-final-layer"
          href={src}
          width="1024"
          height="1024"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </svg>
  )
}

const Logo: React.FC<LogoProps> = ({ className = 'w-auto', src, darkSrc, alt, initialBranding }) => {
  const pathname = usePathname() ?? ''
  const vitrinPath = useVitrinHref()
  const logoHref = pathname.includes('/manage') ? vitrinPath('/manage/admin') : vitrinPath('/')
  /** Açık/koyu ayrı — gizli koyu tema img 404 verince açık logoyu düşürmez */
  const [lightFailed, setLightFailed] = useState(false)
  const [darkFailed, setDarkFailed] = useState(false)
  const [iconFailed, setIconFailed] = useState(false)
  const [lightOverride, setLightOverride] = useState<string | null>(null)
  const [darkOverride, setDarkOverride] = useState<string | null>(null)

  /**
   * Hydration güvenliği: sunucu ve ilk istemci render AYNI başlangıç değerini
   * kullanmalı. localStorage sadece useEffect içinde okunur.
   */
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    if (initialBranding) {
      const picked = pickEffectiveSiteLogoUrls(
        initialBranding.logo_url ?? src,
        initialBranding.logo_url_dark ?? darkSrc ?? src,
      )
      return {
        ...initialBranding,
        logo_url: picked.light ?? undefined,
        logo_url_dark: picked.dark ?? undefined,
        site_name: initialBranding.site_name ?? alt ?? 'Logo',
      }
    }
    if (src) {
      const picked = pickEffectiveSiteLogoUrls(src, darkSrc ?? src)
      return {
        logo_url: picked.light ?? undefined,
        logo_url_dark: picked.dark ?? undefined,
        site_name: alt ?? 'Logo',
      }
    }
    return { site_name: alt ?? '' }
  })
  const [categoryLogos, setCategoryLogos] = useState<Record<string, CategoryLogo>>(
    initialBranding?.category_logos ?? {},
  )

  useEffect(() => {
    if (initialBranding) {
      writeCachedBranding(initialBranding)
      return
    }
    if (src) return

    // 1) Önce cache'ten anında yükle (flash'ı önler)
    const cached = readCachedBranding()
    if (cached) {
      setBranding(cached)
      setCategoryLogos(cached.category_logos ?? {})
    }

    // 2) Sonra API'den güncel veriyi çek ve cache'i güncelle
    getSitePublicConfig(undefined, { cache: 'no-store' })
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
        setBranding((prev) => {
          const merged = mergeBrandingLogos(prev, next)
          writeCachedBranding(merged)
          return merged
        })
        if (b.category_logos && typeof b.category_logos === 'object') {
          setCategoryLogos(b.category_logos as Record<string, CategoryLogo>)
        }
      })
      .catch(() => {
        /* cache veya fallback kullanılmaya devam eder */
      })
  }, [src, initialBranding])

  const catCode = detectCategoryCode(pathname)
  const catLogo = catCode ? categoryLogos[catCode] : null

  const propsPicked = src ? pickEffectiveSiteLogoUrls(src, darkSrc ?? src) : null
  const categoryPicked = pickEffectiveSiteLogoUrls(catLogo?.logo_url, catLogo?.logo_url_dark)
  const sitePicked = propsPicked ?? pickEffectiveSiteLogoUrls(branding.logo_url, branding.logo_url_dark)
  const activeLogoUrl = categoryPicked.light ?? sitePicked.light
  const activeDarkUrl = categoryPicked.dark ?? sitePicked.dark
  const renderedLightUrl = lightOverride ?? activeLogoUrl
  const renderedDarkUrl = darkOverride ?? activeDarkUrl ?? activeLogoUrl
  const sameLogoAsset =
    !!renderedLightUrl &&
    !!renderedDarkUrl &&
    resolveSiteLogoUrl(renderedLightUrl) === resolveSiteLogoUrl(renderedDarkUrl)
  const altText = alt ?? branding.site_name ?? 'Logo'

  useEffect(() => {
    setLightFailed(false)
    setDarkFailed(false)
    setIconFailed(false)
    setLightOverride(null)
    setDarkOverride(null)
  }, [activeLogoUrl, activeDarkUrl])

  function handleLightImageError(raw: string | null) {
    const fallback = logoImageFallback(raw)
    if (fallback && fallback !== lightOverride) {
      setLightOverride(fallback)
      return
    }
    setLightFailed(true)
  }

  function handleDarkImageError(raw: string | null) {
    const fallback = logoImageFallback(raw)
    if (fallback && fallback !== darkOverride) {
      setDarkOverride(fallback)
      return
    }
    setDarkFailed(true)
  }

  function logoImgSrc(resolvedPath: string): string {
    if (!resolvedPath) return ''
    return siteUploadBrowserHref(resolvedPath)
  }

  // ── Icon + Text mode ──────────────────────────────────────────────────────
  const iconUrl = normalizeSiteLogoUrl(branding.logo_icon_url)
  if (!catLogo && branding.logo_mode === 'icon_text' && iconUrl && !iconFailed) {
    const line1 = branding.logo_text_line1 || branding.site_name || ''
    const line2 = branding.logo_text_line2 || ''
    // Varsayılan turuncu WCAG AA (≥4.5:1) — panel #f97316 verse bile
    // accessibleOnWhite light modda koyulaştırır; SSR'da da güvenli başlangıç.
    const line2Color = branding.logo_text_line2_color || '#c2410c'

    return (
      <Link
        href={logoHref}
        className={`inline-flex items-center gap-2.5 focus:ring-0 focus:outline-hidden ${className}`}
      >
        <AnimatedBrandIcon
          src={logoImgSrc(resolveSiteLogoUrl(iconUrl))}
          alt={altText}
          className="h-14 w-14 shrink-0 object-contain"
          onError={() => setIconFailed(true)}
        />
        <span className="inline-flex items-baseline gap-1 leading-none whitespace-nowrap">
          {line1 && (
            <span className="text-[18px] font-bold tracking-tight text-neutral-900 dark:text-white">{line1}</span>
          )}
          {line2 && (
            <span
              className="text-[18px] font-semibold tracking-tight text-[color:var(--logo-line2)] dark:text-[color:var(--logo-line2-dark)]"
              style={
                {
                  '--logo-line2': accessibleOnWhite(line2Color),
                  '--logo-line2-dark': line2Color,
                } as React.CSSProperties
              }
            >
              {line2}
            </span>
          )}
        </span>
      </Link>
    )
  }

  // ── Full image mode ───────────────────────────────────────────────────────
  const canShowLight = !!renderedLightUrl && !lightFailed
  const canShowDark = !!renderedDarkUrl && !darkFailed
  const logoSrcLight = canShowLight ? logoImgSrc(resolveSiteLogoUrl(renderedLightUrl)) : ''
  const logoSrcDark = canShowDark ? logoImgSrc(resolveSiteLogoUrl(renderedDarkUrl)) : ''

  if (!canShowLight && !canShowDark) {
    return (
      <Link
        href={logoHref}
        className={`inline-flex items-center text-primary-600 focus:ring-0 focus:outline-hidden ${className}`}
      >
        <TextLogoFallback siteName={branding.site_name} />
      </Link>
    )
  }

  return (
    <Link
      href={logoHref}
      className={`inline-flex items-center text-primary-600 focus:ring-0 focus:outline-hidden ${className}`}
    >
      {sameLogoAsset ? (
        <img
          src={logoSrcLight || logoSrcDark}
          alt={altText}
          className="block max-h-[56px] w-auto"
          style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
          onError={() => handleLightImageError(renderedLightUrl)}
        />
      ) : (
        <>
          {canShowLight ? (
            <img
              src={logoSrcLight}
              alt={altText}
              className="block max-h-[56px] w-auto dark:hidden"
              style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
              onError={() => handleLightImageError(renderedLightUrl)}
            />
          ) : canShowDark ? (
            <img
              src={logoSrcDark}
              alt={altText}
              className="block max-h-[56px] w-auto dark:hidden"
              style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
              onError={() => handleDarkImageError(renderedDarkUrl)}
            />
          ) : null}
          {canShowDark ? (
            <img
              src={logoSrcDark}
              alt={altText}
              className="hidden max-h-[56px] w-auto dark:block"
              style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
              onError={() => handleDarkImageError(renderedDarkUrl)}
            />
          ) : null}
        </>
      )}
    </Link>
  )
}

export default Logo
