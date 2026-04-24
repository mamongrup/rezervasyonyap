'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SlidersBannerConfig, SlidersBannerSlide } from '@/data/page-builder-config'
import { pickLocalized } from '@/lib/sliders-i18n'

const HEIGHT_PX: Record<SlidersBannerConfig['height'], string> = {
  short: 'h-[280px] md:h-[360px]',
  normal: 'h-[360px] md:h-[480px]',
  tall: 'h-[460px] md:h-[640px]',
}

interface Props {
  config: SlidersBannerConfig
  /** Geçerli sayfa dili — slayt metinleri bu dile göre seçilir. */
  locale: string
}

export default function SlidersBannerCarousel({ config, locale }: Props) {
  const slides = (config.slides ?? []).filter(
    (s) => s.enabled !== false && (s.imageUrl || s.mobileImageUrl),
  )
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStart = useRef<number | null>(null)

  const goTo = useCallback(
    (i: number) => {
      const len = slides.length
      if (len === 0) return
      setActive(((i % len) + len) % len)
    },
    [slides.length],
  )

  const next = useCallback(() => goTo(active + 1), [active, goTo])
  const prev = useCallback(() => goTo(active - 1), [active, goTo])

  useEffect(() => {
    if (config.autoplayMs <= 0 || paused || slides.length < 2) return
    const id = window.setInterval(next, config.autoplayMs)
    return () => window.clearInterval(id)
  }, [config.autoplayMs, paused, next, slides.length])

  if (slides.length === 0) return null

  return (
    <section
      className={`relative w-full overflow-hidden rounded-3xl bg-neutral-200 shadow-sm dark:bg-neutral-800 ${HEIGHT_PX[config.height]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current
        if (start == null) return
        const end = e.changedTouches[0]?.clientX ?? start
        const dx = end - start
        if (Math.abs(dx) > 40) (dx > 0 ? prev : next)()
        touchStart.current = null
      }}
    >
      {slides.map((slide, idx) => (
        <Slide key={slide.id} slide={slide} active={idx === active} locale={locale} />
      ))}

      {config.showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Önceki slayt"
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 backdrop-blur transition hover:bg-white md:left-5 md:h-12 md:w-12"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Sonraki slayt"
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 backdrop-blur transition hover:bg-white md:right-5 md:h-12 md:w-12"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {config.showDots && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 md:bottom-6">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${i + 1}. slayda git`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === active ? 'w-8 bg-white' : 'w-2 bg-white/60 hover:bg-white/90'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function Slide({
  slide,
  active,
  locale,
}: {
  slide: SlidersBannerSlide
  active: boolean
  locale: string
}) {
  const overlay = Math.min(80, Math.max(0, slide.overlay ?? 35)) / 100
  const align = slide.align ?? 'center'
  const justify =
    align === 'left'
      ? 'items-start text-left'
      : align === 'right'
        ? 'items-end text-right'
        : 'items-center text-center'
  const textColor = slide.textTheme === 'dark' ? 'text-neutral-900' : 'text-white'

  const desktopUrl = slide.imageUrl || slide.mobileImageUrl || ''
  const mobileUrl = slide.mobileImageUrl || slide.imageUrl || ''

  // Locale'e göre metinler (boşsa varsayılan dilden fallback)
  const eyebrow = pickLocalized(slide.eyebrow, locale)
  const title = pickLocalized(slide.title, locale)
  const subtitle = pickLocalized(slide.subtitle, locale)
  const ctaText = pickLocalized(slide.ctaText, locale)

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!active}
    >
      {mobileUrl && (
        <Image
          src={mobileUrl}
          alt={title || eyebrow || 'Slider'}
          fill
          priority={active}
          fetchPriority={active ? 'high' : 'low'}
          sizes="100vw"
          className="object-cover md:hidden"
          unoptimized={/^https?:\/\//i.test(mobileUrl)}
        />
      )}
      {desktopUrl && (
        <Image
          src={desktopUrl}
          alt={title || eyebrow || 'Slider'}
          fill
          priority={active}
          fetchPriority={active ? 'high' : 'low'}
          sizes="100vw"
          className="hidden object-cover md:block"
          unoptimized={/^https?:\/\//i.test(desktopUrl)}
        />
      )}

      {overlay > 0 && (
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
      )}

      {(eyebrow || title || subtitle || (slide.ctaHref && ctaText)) && (
        <div
          className={`relative flex h-full w-full flex-col justify-center gap-4 px-6 md:px-16 ${justify} ${textColor}`}
        >
          <div className="flex max-w-2xl flex-col gap-3 md:gap-4">
            {eyebrow && (
              <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide backdrop-blur-sm">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="text-3xl font-bold leading-tight md:text-5xl">{title}</h2>
            )}
            {subtitle && <p className="text-sm opacity-90 md:text-lg">{subtitle}</p>}
            {slide.ctaHref && ctaText && (
              <Link
                href={slide.ctaHref}
                className="mt-2 inline-flex w-fit items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-lg transition hover:bg-neutral-100 md:text-base"
              >
                {ctaText}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
