'use client'

import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { Link } from '@/shared/link'
import {
  AnchorIcon,
  Building03Icon,
  Compass01Icon,
  Home01Icon,
  Airplane02Icon,
  Car05Icon,
  HotAirBalloonFreeIcons,
  LegalDocument01Icon,
  Bus01Icon,
  FerryBoatIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'

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

// ─── Hero'da gösterilecek üst kategoriler — statik fallback ──────────────────
const ALL_NAV_CATEGORIES = CATEGORY_REGISTRY.filter((c) => c.showInNav)
  .sort((a, b) => a.navOrder - b.navOrder)

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
  const lc = (locale || 'tr').toLowerCase().slice(0, 2)
  const slugOrder =
    activeSlugs != null && activeSlugs.length > 0
      ? new Map(activeSlugs.map((s, i) => [s, i]))
      : null

  const cats =
    slugOrder != null && slugOrder.size > 0
      ? ALL_NAV_CATEGORIES
          .filter((c) => slugOrder.has(c.slug))
          .sort((a, b) => (slugOrder.get(a.slug) ?? a.navOrder) - (slugOrder.get(b.slug) ?? b.navOrder))
      : ALL_NAV_CATEGORIES

  const spread = layout === 'spread'

  /**
   * Tek bir kategori linki. `extraClass` ile inline ya da overflow için
   * gerekli responsive görünürlük class'ı verilir; spread modunda gerek yoktur.
   */
  const catLink = (
    cat: typeof cats[0],
    extraClass: string,
  ) => {
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
            'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300 hover:text-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-neutral-500',
          )}
        >
          <HugeiconsIcon
            icon={Icon}
            className="size-[1.15rem] sm:size-5"
            strokeWidth={1.5}
          />
        </span>
        <span
          className={clsx(
            'text-center text-xs sm:text-sm',
            spread ? 'max-w-none px-0.5 leading-tight' : 'max-w-[5.5rem] truncate',
            'font-normal text-neutral-500 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300',
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
    </div>
  )
}
