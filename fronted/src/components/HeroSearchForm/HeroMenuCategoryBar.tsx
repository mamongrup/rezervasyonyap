'use client'

import { stripLocalePrefix } from '@/lib/i18n-config'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { Link } from '@/shared/link'
import {
  AnchorIcon,
  Building03Icon,
  Compass01Icon,
  Home01Icon,
  Menu01Icon,
  Airplane02Icon,
  Car05Icon,
  HotAirBalloonFreeIcons,
  LegalDocument01Icon,
  Bus01Icon,
  FerryBoatIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ─── Ekran genişliğine göre kaç kategori inline gösterileceği ────────────────
function calcMaxInline(width: number): number {
  if (width < 360) return 4
  if (width < 480) return 5
  if (width < 600) return 6
  if (width < 768) return 7
  if (width < 1024) return 8
  if (width < 1280) return 9
  return 10
}

function useMaxInline() {
  // ssr:false ile yüklendiğinden window her zaman mevcuttur — flash olmaz
  const [max, setMax] = useState(() => calcMaxInline(window.innerWidth))
  useEffect(() => {
    const update = () => setMax(calcMaxInline(window.innerWidth))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return max
}

// ─── Slug → ikon eşlemesi ────────────────────────────────────────────────────
const SLUG_ICON: Record<string, IconSvgElement> = {
  oteller:        Building03Icon,
  'tatil-evleri': Home01Icon,
  'yat-kiralama': AnchorIcon,
  turlar:         Compass01Icon,
  aktiviteler:    HotAirBalloonFreeIcons,
  vize:           LegalDocument01Icon,
  'ucak-bileti':  Airplane02Icon,
  'arac-kiralama': Car05Icon,
  feribot:        FerryBoatIcon,
  transfer:       Bus01Icon,
}

// ─── Kısa etiketler ──────────────────────────────────────────────────────────
const LABEL_TR: Record<string, string> = {
  oteller:        'Otel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yat',
  turlar:         'Tur',
  aktiviteler:    'Aktivite',
  vize:           'Vize',
  'ucak-bileti':  'Uçuş',
  'arac-kiralama': 'Araç',
  feribot:        'Feribot',
  transfer:       'Transfer',
}

const LABEL_EN: Record<string, string> = {
  oteller:        'Hotel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yacht',
  turlar:         'Tour',
  aktiviteler:    'Activity',
  vize:           'Visa',
  'ucak-bileti':  'Flight',
  'arac-kiralama': 'Car',
  feribot:        'Ferry',
  transfer:       'Transfer',
}

// ─── Hero'da gösterilecek üst kategoriler (alt kategori olanlar hariç) ───────
const NAV_CATEGORIES = CATEGORY_REGISTRY.filter((c) => c.showInNav)
  .sort((a, b) => a.navOrder - b.navOrder)

// ─── Route aktif mi? ─────────────────────────────────────────────────────────
function isActive(pathname: string | null, hrefRaw: string): boolean {
  const { restPath } = stripLocalePrefix(pathname ?? '/')
  const href = (hrefRaw || '/').split('?')[0] ?? '/'
  if (href === '/' || href === '') return restPath === '/' || restPath === ''
  const trim = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)
  return trim(restPath) === trim(href) || trim(restPath).startsWith(`${trim(href)}/`)
}

export function HeroMenuCategoryBar({
  locale,
  className,
  /** Bölge hero: tüm kategoriler tek satırda yayılı, daha geniş aralık */
  layout = 'default',
}: {
  locale: string
  className?: string
  layout?: 'default' | 'spread'
}) {
  const pathname = usePathname()
  const maxInline = useMaxInline()
  const isTr = locale.toLowerCase().startsWith('tr')

  const [overflowOpen, setOverflowOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const spread = layout === 'spread'
  const inline = spread ? NAV_CATEGORIES : NAV_CATEGORIES.slice(0, maxInline)
  const overflow = spread ? [] : NAV_CATEGORIES.slice(maxInline)

  const handleMoreClick = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setOverflowOpen((v) => !v)
  }, [])

  useEffect(() => {
    if (!overflowOpen) return
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [overflowOpen])

  const catLink = (cat: typeof NAV_CATEGORIES[0]) => {
    const active = isActive(pathname, cat.categoryRoute)
    const Icon = SLUG_ICON[cat.slug] ?? Home01Icon
    const label = isTr ? (LABEL_TR[cat.slug] ?? cat.name) : (LABEL_EN[cat.slug] ?? cat.namePlural)
    return (
      <Link
        key={cat.slug}
        href={cat.categoryRoute}
        className={clsx(
          'group/tab flex cursor-pointer flex-col items-center gap-1.5 sm:gap-2',
          spread ? 'min-w-0 flex-1 basis-0' : 'shrink-0',
        )}
      >
        <span
          className={clsx(
            'flex size-10 items-center justify-center rounded-full border transition-colors sm:size-11',
            active
              ? 'border-primary-500 bg-white text-primary-600 shadow-sm dark:border-primary-400 dark:bg-neutral-900 dark:text-primary-400'
              : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300 hover:text-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-neutral-500',
          )}
        >
          <HugeiconsIcon
            icon={Icon}
            className="size-[1.15rem] sm:size-5"
            strokeWidth={active ? 1.75 : 1.5}
          />
        </span>
        <span
          className={clsx(
            'text-center text-xs sm:text-sm',
            spread ? 'max-w-none px-0.5 leading-tight' : 'max-w-[5.5rem] truncate',
            active
              ? 'font-semibold text-neutral-900 dark:text-neutral-100'
              : 'font-normal text-neutral-500 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300',
          )}
        >
          {label}
        </span>
      </Link>
    )
  }

  return (
    <div
      className={clsx(
        /** İkon satırı ↔ hap: referans (Chisfis) — hap’a yakın, daha az boşluk */
        'mb-3 flex items-end sm:mb-4',
        spread
          ? 'w-full min-w-0 flex-wrap justify-between gap-x-1 gap-y-4 sm:flex-nowrap sm:gap-x-2 md:gap-x-3'
          : 'flex-wrap gap-x-4 gap-y-3 sm:gap-x-6 md:gap-x-8',
        className,
      )}
    >
      {inline.map(catLink)}

      {overflow.length > 0 && (
        <>
          <button
            ref={btnRef}
            type="button"
            onClick={handleMoreClick}
            aria-label={isTr ? 'Daha fazla kategori' : 'More categories'}
            aria-expanded={overflowOpen}
            className="flex shrink-0 cursor-pointer flex-col items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-600 sm:gap-2 sm:text-sm dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-500 sm:size-11">
              <HugeiconsIcon icon={Menu01Icon} className="size-[1.15rem] sm:size-5" strokeWidth={1.5} />
            </span>
            <span className="max-w-[5.5rem] truncate text-center font-normal">
              {isTr ? 'Daha fazla' : 'More'}
            </span>
          </button>

          {overflowOpen && typeof document !== 'undefined' &&
            createPortal(
              <div
                style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
                className="min-w-[13rem] rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
              >
                {overflow.map((cat) => {
                  const active = isActive(pathname, cat.categoryRoute)
                  const Icon = SLUG_ICON[cat.slug] ?? Home01Icon
                  const label = isTr ? (LABEL_TR[cat.slug] ?? cat.name) : (LABEL_EN[cat.slug] ?? cat.namePlural)
                  return (
                    <Link
                      key={cat.slug}
                      href={cat.categoryRoute}
                      onClick={() => setOverflowOpen(false)}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        active
                          ? 'bg-primary-50 font-medium text-primary-800 dark:bg-primary-950/50 dark:text-primary-200'
                          : 'text-neutral-800 dark:text-neutral-200',
                      )}
                    >
                      <HugeiconsIcon icon={Icon} className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                      {label}
                    </Link>
                  )
                })}
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  )
}
