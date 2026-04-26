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

/**
 * Inline ikonun hangi viewport genişliğinden itibaren görüneceğini belirleyen
 * Tailwind class — eski `calcMaxInline(width)` mantığı CSS'e taşındı.
 *
 * Index sırası:
 *  - 0..3 → her zaman görünür (en az 4 kategori; 320px ekranda dahi sığar)
 *  - 4    → ≥ 400px
 *  - 5    → ≥ 500px
 *  - 6    → sm  (≥ 640)
 *  - 7    → md  (≥ 768)
 *  - 8    → lg  (≥ 1024)
 *  - 9+   → xl  (≥ 1280)
 *
 * SSR'de tüm 10 kategori HTML'e yazılır; viewport büyüdükçe CSS sırayla
 * gizli olanları açar. Bu sayede **JS hiç çalışmadan da** doğru görünüm
 * gelir ve **CLS = 0** olur.
 */
function inlineVisibilityClass(i: number): string {
  if (i < 4) return 'flex'
  if (i === 4) return 'hidden min-[400px]:flex'
  if (i === 5) return 'hidden min-[500px]:flex'
  if (i === 6) return 'hidden sm:flex'
  if (i === 7) return 'hidden md:flex'
  if (i === 8) return 'hidden lg:flex'
  return 'hidden xl:flex'
}

/**
 * Aynı eşiklerin tersi — bir kategori inline'da gizliyse "Daha fazla"
 * dropdown'da görünür olmalı. JS'siz CSS-only kontrolü.
 */
function overflowVisibilityClass(i: number): string {
  if (i < 4) return 'hidden'
  if (i === 4) return 'flex min-[400px]:hidden'
  if (i === 5) return 'flex min-[500px]:hidden'
  if (i === 6) return 'flex sm:hidden'
  if (i === 7) return 'flex md:hidden'
  if (i === 8) return 'flex lg:hidden'
  return 'flex xl:hidden'
}

/** Kaç kategori varsa (≤9) tüm 10 ikon görünür → "More" düğmesi gizlenebilir. */
function moreButtonVisibilityClass(total: number): string {
  if (total <= 4) return 'hidden'
  if (total <= 5) return 'flex min-[400px]:hidden'
  if (total <= 6) return 'flex min-[500px]:hidden'
  if (total <= 7) return 'flex sm:hidden'
  if (total <= 8) return 'flex md:hidden'
  if (total <= 9) return 'flex lg:hidden'
  return 'flex xl:hidden'
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

const LABEL_DE: Record<string, string> = {
  oteller:        'Hotel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yacht',
  turlar:         'Tour',
  aktiviteler:    'Aktivität',
  vize:           'Visum',
  'ucak-bileti':  'Flug',
  'arac-kiralama': 'Auto',
  feribot:        'Fähre',
  transfer:       'Transfer',
}

const LABEL_RU: Record<string, string> = {
  oteller:        'Отель',
  'tatil-evleri': 'Вилла',
  'yat-kiralama': 'Яхта',
  turlar:         'Тур',
  aktiviteler:    'Активность',
  vize:           'Виза',
  'ucak-bileti':  'Рейс',
  'arac-kiralama': 'Авто',
  feribot:        'Паром',
  transfer:       'Трансфер',
}

const LABEL_ZH: Record<string, string> = {
  oteller:        '酒店',
  'tatil-evleri': '别墅',
  'yat-kiralama': '游艇',
  turlar:         '旅游',
  aktiviteler:    '活动',
  vize:           '签证',
  'ucak-bileti':  '航班',
  'arac-kiralama': '租车',
  feribot:        '渡轮',
  transfer:       '接送',
}

const LABEL_FR: Record<string, string> = {
  oteller:        'Hôtel',
  'tatil-evleri': 'Villa',
  'yat-kiralama': 'Yacht',
  turlar:         'Tour',
  aktiviteler:    'Activité',
  vize:           'Visa',
  'ucak-bileti':  'Vol',
  'arac-kiralama': 'Voiture',
  feribot:        'Ferry',
  transfer:       'Transfert',
}

const LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
  tr: LABEL_TR,
  en: LABEL_EN,
  de: LABEL_DE,
  ru: LABEL_RU,
  zh: LABEL_ZH,
  fr: LABEL_FR,
}

function pickLabel(locale: string, slug: string, fallback: string): string {
  const lc = (locale || 'tr').toLowerCase().slice(0, 2)
  const map = LABEL_BY_LOCALE[lc] ?? LABEL_EN
  return map[slug] ?? LABEL_EN[slug] ?? fallback
}

const MORE_LABEL: Record<string, string> = {
  tr: 'Daha fazla',
  en: 'More',
  de: 'Mehr',
  ru: 'Больше',
  zh: '更多',
  fr: 'Plus',
}

const MORE_ARIA: Record<string, string> = {
  tr: 'Daha fazla kategori',
  en: 'More categories',
  de: 'Weitere Kategorien',
  ru: 'Больше категорий',
  zh: '更多类别',
  fr: 'Plus de catégories',
}

// ─── Hero'da gösterilecek üst kategoriler — statik fallback ──────────────────
const ALL_NAV_CATEGORIES = CATEGORY_REGISTRY.filter((c) => c.showInNav)
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
  /** Server component'ten gelen aktif slug listesi (sıralı). Verilirse API çağrısı yapılmaz. */
  activeSlugs,
}: {
  locale: string
  className?: string
  layout?: 'default' | 'spread'
  activeSlugs?: string[]
}) {
  const pathname = usePathname()
  const lc = (locale || 'tr').toLowerCase().slice(0, 2)

  const [overflowOpen, setOverflowOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const [slugOrder, setSlugOrder] = useState<Map<string, number> | null>(() =>
    activeSlugs != null && activeSlugs.length > 0
      ? new Map(activeSlugs.map((s, i) => [s, i]))
      : null,
  )

  /**
   * Her zaman güncel menü — ISR/önbellekli HTML'deki eski `activeSlugs` düzelir.
   * Yalnızca `response.ok` iken uygula: route hata dönerken boş `items` göndermez (502),
   * böylece eski listeyi yanlışlıkla silmeyiz. Boş başarılı yanıt = gerçekten yayında sekme yok.
   */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/hero-tabs')
        if (cancelled || !r.ok) return
        const data = (await r.json()) as {
          items?: { url: string | null; sort_order: number; is_published?: boolean }[]
        }
        const items = Array.isArray(data.items) ? data.items : []
        const map = new Map<string, number>()
        items.forEach((item) => {
          if (item.is_published === false) return
          const slug = (item.url ?? '').replace(/^\/+/, '').split('/')[0]
          if (slug) map.set(slug, item.sort_order)
        })
        setSlugOrder(map)
      } catch {
        /* ağ hatası — mevcut slugOrder */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cats = slugOrder
    ? ALL_NAV_CATEGORIES
        .filter((c) => slugOrder.has(c.slug))
        .sort((a, b) => (slugOrder.get(a.slug) ?? a.navOrder) - (slugOrder.get(b.slug) ?? b.navOrder))
    : ALL_NAV_CATEGORIES

  const spread = layout === 'spread'
  const totalCats = cats.length

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

  /**
   * Tek bir kategori linki. `extraClass` ile inline ya da overflow için
   * gerekli responsive görünürlük class'ı verilir; spread modunda gerek yoktur.
   */
  const catLink = (
    cat: typeof cats[0],
    extraClass: string,
  ) => {
    const active = isActive(pathname, cat.categoryRoute)
    const Icon = SLUG_ICON[cat.slug] ?? Home01Icon
    const label = pickLabel(lc, cat.slug, lc === 'tr' ? cat.name : cat.namePlural)
    return (
      <Link
        key={cat.slug}
        href={cat.categoryRoute}
        className={clsx(
          'group/tab cursor-pointer flex-col items-center gap-1.5 sm:gap-2',
          spread ? 'flex min-w-0 flex-1 basis-0' : clsx('shrink-0', extraClass),
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
      {cats.map((cat, i) =>
        catLink(cat, spread ? '' : inlineVisibilityClass(i)),
      )}

      {!spread && totalCats > 4 && (
        <>
          <button
            ref={btnRef}
            type="button"
            onClick={handleMoreClick}
            aria-label={MORE_ARIA[lc] ?? MORE_ARIA.en}
            aria-expanded={overflowOpen}
            className={clsx(
              'shrink-0 cursor-pointer flex-col items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-600 sm:gap-2 sm:text-sm dark:text-neutral-400 dark:hover:text-neutral-300',
              moreButtonVisibilityClass(totalCats),
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-500 sm:size-11">
              <HugeiconsIcon icon={Menu01Icon} className="size-[1.15rem] sm:size-5" strokeWidth={1.5} />
            </span>
            <span className="max-w-[5.5rem] truncate text-center font-normal">
              {MORE_LABEL[lc] ?? MORE_LABEL.en}
            </span>
          </button>

          {overflowOpen && typeof document !== 'undefined' &&
            createPortal(
              <div
                style={{ position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
                className="min-w-[13rem] rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
              >
                {cats.map((cat, i) => {
                  const active = isActive(pathname, cat.categoryRoute)
                  const Icon = SLUG_ICON[cat.slug] ?? Home01Icon
                  const label = pickLabel(lc, cat.slug, lc === 'tr' ? cat.name : cat.namePlural)
                  return (
                    <Link
                      key={cat.slug}
                      href={cat.categoryRoute}
                      onClick={() => setOverflowOpen(false)}
                      className={clsx(
                        overflowVisibilityClass(i),
                        'items-center gap-2 px-4 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800',
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
