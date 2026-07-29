/**
 * Kategori liste sayfalama — sunucu bileşeni (useSearchParams yok → Suspense/hidden slot yok).
 * Tarihli villa aramasında pager, esnek sonuçların üstünde ilk HTML’de görünür.
 */

import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from '@/shared/Pagination'
import { getMessages } from '@/utils/getT'
import convertNumbThousand from '@/utils/convertNumbThousand'
import Link from 'next/link'

/** 1 … N arası sayfa numaraları; arada boşluklar `gap` */
function buildPaginationItems(current: number, totalPages: number): (number | 'gap')[] {
  if (totalPages < 1) return [1]
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const set = new Set<number>()
  set.add(1)
  set.add(totalPages)
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= totalPages) set.add(i)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push('gap')
    out.push(sorted[i]!)
  }
  return out
}

export function flattenListingSearchParams(
  sp: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!sp) return out
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue
    const s = Array.isArray(v) ? v[0] : v
    if (s == null || s === '') continue
    out[k] = s
  }
  return out
}

export function categoryListingPathname(
  locale: string,
  categorySlug: string,
  handle?: string | null,
): string {
  const loc = (locale || 'tr').trim() || 'tr'
  const slug = categorySlug.replace(/^\/+|\/+$/g, '')
  const h = (handle || 'all').replace(/^\/+|\/+$/g, '') || 'all'
  return `/${loc}/${slug}/${h}`
}

export type CategoryListingPaginationProps = {
  locale: string
  /** 1 tabanlı güncel sayfa (URL ile aynı) */
  page?: number
  /** Toplam ilan sayısı (API) */
  total?: number
  perPage?: number
  /** Locale dahil path, örn. `/tr/tatil-evleri/all` */
  pathname: string
  /** Mevcut query (page anahtarı yok sayılır / override edilir) */
  query?: Record<string, string>
}

export default function CategoryListingPagination({
  locale,
  page: pageProp = 1,
  total,
  perPage = 12,
  pathname,
  query = {},
}: CategoryListingPaginationProps) {
  const m = getMessages(locale)
  const p = m.common.pagination

  const totalPages =
    total == null || total < 0 ? 0 : Math.max(1, Math.ceil(total / Math.max(1, perPage)))

  const current =
    totalPages < 1 ? 1 : Math.min(Math.max(1, pageProp), totalPages)

  const makeHref = (pageNum: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (k === 'page' || v == null || v === '') continue
      sp.set(k, v)
    }
    if (pageNum > 1) sp.set('page', String(pageNum))
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  if (total == null || totalPages <= 1) {
    return null
  }

  const items = buildPaginationItems(current, totalPages)
  const shownFrom = (current - 1) * Math.max(1, perPage) + 1
  const shownTo = Math.min(current * Math.max(1, perPage), total)
  const nextHref = current < totalPages ? makeHref(current + 1) : null

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
        {shownFrom}–{shownTo} / {convertNumbThousand(total)}
        <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">·</span>
        {current}/{totalPages}
      </p>
      <Pagination aria-label={p.aria} className="w-full justify-between sm:justify-center">
        <PaginationPrevious href={current > 1 ? makeHref(current - 1) : null} aria-label={p.previous}>
          {p.previous}
        </PaginationPrevious>
        <PaginationList>
          {items.map((it, idx) =>
            it === 'gap' ? (
              <PaginationGap key={`gap-${idx}`} />
            ) : (
              <PaginationPage key={it} href={makeHref(it)} current={it === current}>
                {it}
              </PaginationPage>
            ),
          )}
        </PaginationList>
        <PaginationNext href={nextHref} aria-label={p.next}>
          {p.next}
        </PaginationNext>
      </Pagination>
      {nextHref ? (
        <Link
          href={nextHref}
          className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:hidden dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {p.next}
        </Link>
      ) : null}
    </div>
  )
}
