'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { applyBrandingDomainOverrides, type BrandingDomainLogoOverride } from '@/lib/branding-for-host'
import { normalizeSiteLogoUrl, pickEffectiveSiteLogoUrls, resolveSiteLogoUrl } from '@/lib/resolve-site-logo-url'
import { siteUploadBrowserHref } from '@/lib/site-upload-browser-href'
import { getSitePublicConfig } from '@/lib/travel-api'
import { resolveLogoSlogan } from '@/lib/logo-slogan'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

const LS_KEY = 'travel_branding_cache'

interface LogoProps {
  className?: string
  src?: string
  darkSrc?: string
  alt?: string
  initialBranding?: BrandingConfig
  /** Logo yazısının altında yönetilebilir kısa marka sloganını gösterir. */
  showSlogan?: boolean
  locale?: string
  /** Yalnızca marka ikonunu gösterir (metin/slogan olmadan). */
  iconOnly?: boolean
  /** İkon animasyonu bayrağı (artık sabit/statik ikon kullanılır). */
  animated?: boolean
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
  logo_text_line1_color?: string
  logo_text_line2_color?: string
  logo_slogan?: string
  logo_slogan_i18n?: Record<string, string>
  /** Apex host → logo yazı override (`rezervasyonyap.com.tr` vb.) */
  domain_overrides?: Record<string, BrandingDomainLogoOverride>
  site_name?: string
  category_logos?: Record<string, CategoryLogo>
}

function brandingForCurrentHost(b: BrandingConfig): BrandingConfig {
  if (typeof window === 'undefined') return b
  return applyBrandingDomainOverrides(b as Record<string, unknown>, window.location.hostname) as BrandingConfig
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

const Logo: React.FC<LogoProps> = ({
  className = 'w-auto',
  src,
  darkSrc,
  alt,
  initialBranding,
  showSlogan = false,
  locale = 'tr',
  iconOnly = false,
  animated = false,
}) => {
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
      const forHost = brandingForCurrentHost(initialBranding)
      writeCachedBranding(forHost)
      setBranding((prev) => {
        const picked = pickEffectiveSiteLogoUrls(
          forHost.logo_url ?? prev.logo_url,
          forHost.logo_url_dark ?? prev.logo_url_dark,
        )
        return {
          ...forHost,
          logo_url: picked.light ?? undefined,
          logo_url_dark: picked.dark ?? undefined,
          site_name: forHost.site_name ?? prev.site_name ?? alt ?? 'Logo',
        }
      })
    }

    if (!initialBranding) {
      // 1) Önce cache'ten anında yükle (flash'ı önler)
      const cached = readCachedBranding()
      if (cached) {
        const forHost = brandingForCurrentHost(cached)
        setBranding(forHost)
        setCategoryLogos(forHost.category_logos ?? {})
      }
    }

    // RSC ayarı cache'li olabilir. initialBranding/src verilmiş olsa bile güncel
    // public-config'i çek; domain yazısı ve renk değişiklikleri anında yansısın.
    getSitePublicConfig(undefined, { cache: 'no-store' })
      .then((cfg) => {
        const b = (cfg.branding ?? {}) as BrandingConfig & Record<string, unknown>
        const raw: BrandingConfig = {
          logo_url: b.logo_url,
          logo_url_dark: b.logo_url_dark,
          logo_icon_url: b.logo_icon_url,
          logo_mode: b.logo_mode,
          logo_text_line1: b.logo_text_line1,
          logo_text_line2: b.logo_text_line2,
          logo_text_line1_color: b.logo_text_line1_color,
          logo_text_line2_color: b.logo_text_line2_color,
          logo_slogan: b.logo_slogan,
          logo_slogan_i18n: b.logo_slogan_i18n as Record<string, string> | undefined,
          domain_overrides: b.domain_overrides,
          site_name: b.site_name ?? (cfg as { site_name?: string }).site_name,
          category_logos: b.category_logos as Record<string, CategoryLogo> | undefined,
        }
        const next = brandingForCurrentHost(raw)
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
  }, [src, initialBranding, alt])

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
  const slogan = showSlogan
    ? resolveLogoSlogan(branding as Record<string, unknown>, locale)
    : ''

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

  const iconUrl = normalizeSiteLogoUrl(branding.logo_icon_url) || '/images/logo-icon.png'

  // ── Sadece İkon Modu (arama alanı / kompakt üst çubuk) ─────────────────────
  if (iconOnly) {
    const effectiveIconUrl = iconUrl || '/images/logo-icon.png'
    if (effectiveIconUrl && !iconFailed) {
      return (
        <Link
          href={logoHref}
          className={`inline-flex shrink-0 items-center justify-center focus:ring-0 focus:outline-hidden ${className}`}
          aria-label={altText}
        >
          <img
            src={logoImgSrc(resolveSiteLogoUrl(effectiveIconUrl))}
            alt={altText}
            className="size-full shrink-0 object-contain"
            style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
            onError={() => setIconFailed(true)}
          />
        </Link>
      )
    }

    const canShowLight = !!renderedLightUrl && !lightFailed
    const canShowDark = !!renderedDarkUrl && !darkFailed
    const logoSrcLight = canShowLight ? logoImgSrc(resolveSiteLogoUrl(renderedLightUrl)) : ''
    const logoSrcDark = canShowDark ? logoImgSrc(resolveSiteLogoUrl(renderedDarkUrl)) : ''

    if (canShowLight || canShowDark) {
      return (
        <Link
          href={logoHref}
          className={`inline-flex shrink-0 items-center text-primary-600 focus:ring-0 focus:outline-hidden ${className}`}
          aria-label={altText}
        >
          {sameLogoAsset ? (
            <img
              src={logoSrcLight || logoSrcDark}
              alt={altText}
              className="block max-h-8 w-auto object-contain"
              style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
              onError={() => handleLightImageError(renderedLightUrl)}
            />
          ) : (
            <>
              {canShowLight ? (
                <img
                  src={logoSrcLight}
                  alt={altText}
                  className="block max-h-8 w-auto object-contain dark:hidden"
                  style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
                  onError={() => handleLightImageError(renderedLightUrl)}
                />
              ) : canShowDark ? (
                <img
                  src={logoSrcDark}
                  alt={altText}
                  className="block max-h-8 w-auto object-contain dark:hidden"
                  style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
                  onError={() => handleDarkImageError(renderedDarkUrl)}
                />
              ) : null}
              {canShowDark ? (
                <img
                  src={logoSrcDark}
                  alt={altText}
                  className="hidden max-h-8 w-auto object-contain dark:block"
                  style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
                  onError={() => handleDarkImageError(renderedDarkUrl)}
                />
              ) : null}
            </>
          )}
        </Link>
      )
    }

    return (
      <Link
        href={logoHref}
        className={`inline-flex shrink-0 items-center text-primary-600 focus:ring-0 focus:outline-hidden ${className}`}
        aria-label={altText}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-950 dark:text-primary-400">
          {(branding.site_name || 'T').charAt(0).toUpperCase()}
        </span>
      </Link>
    )
  }

  // ── Icon + Text mode ──────────────────────────────────────────────────────
  if (!catLogo && branding.logo_mode === 'icon_text' && iconUrl && !iconFailed) {
    const line1 = branding.logo_text_line1 || branding.site_name || ''
    const line2 = branding.logo_text_line2 || ''
    // Panel önizlemesi ile vitrinin marka rengi aynı olmalı; kaydedilen rengi
    // kontrast gerekçesiyle otomatik dönüştürmeden birebir uygula.
    const line1Color = branding.logo_text_line1_color?.trim() || '#171717'
    const line2Color = branding.logo_text_line2_color?.trim() || '#c2410c'

    return (
      <Link
        href={logoHref}
        className={`inline-flex items-center gap-2.5 focus:ring-0 focus:outline-hidden ${className}`}
      >
        <img
          src={logoImgSrc(resolveSiteLogoUrl(iconUrl))}
          alt={altText}
          className="h-14 w-14 shrink-0 object-contain"
          style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
          onError={() => setIconFailed(true)}
        />
        <span className="inline-flex min-w-0 flex-col justify-center whitespace-nowrap">
          <span className="inline-flex items-baseline gap-1 leading-none">
            {line1 && (
              <span
                className="text-[18px] font-bold tracking-tight"
                style={{ color: line1Color }}
              >
                {line1}
              </span>
            )}
            {line2 && (
              <span
                className="text-[18px] font-semibold tracking-tight"
                style={{ color: line2Color }}
              >
                {line2}
              </span>
            )}
          </span>
          {slogan ? (
            <span className="mt-1 text-[10px] leading-none font-medium tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
              {slogan}
            </span>
          ) : null}
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
        <span className="inline-flex flex-col">
          <TextLogoFallback siteName={branding.site_name} />
          {slogan ? (
            <span className="mt-1 text-[10px] leading-none font-medium tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
              {slogan}
            </span>
          ) : null}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={logoHref}
      className={`inline-flex items-center text-primary-600 focus:ring-0 focus:outline-hidden ${className}`}
    >
      <span className="inline-flex flex-col items-center">
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
        {slogan ? (
          <span className="mt-0.5 text-[10px] leading-none font-medium tracking-[0.08em] whitespace-nowrap text-neutral-500 dark:text-neutral-400">
            {slogan}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

export default Logo
