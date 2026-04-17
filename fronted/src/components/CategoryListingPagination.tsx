'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from '@/shared/Pagination'
import { getMessages } from '@/utils/getT'

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
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('gap')
    out.push(sorted[i])
  }
  return out
}

type Props = {
  locale: string
  /** 1 tabanlı güncel sayfa (URL ile aynı) */
  page?: number
  /** Toplam ilan sayısı (API) */
  total?: number
  perPage?: number
}

export default function CategoryListingPagination({
  locale,
  page: pageProp = 1,
  total,
  perPage = 12,
}: Props) {
  const m = getMessages(locale)
  const p = m.common.pagination
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = useMemo(() => {
    if (total == null || total < 0) return 0
    return Math.max(1, Math.ceil(total / Math.max(1, perPage)))
  }, [total, perPage])

  const current = useMemo(() => {
    if (totalPages < 1) return 1
    return Math.min(Math.max(1, pageProp), totalPages)
  }, [pageProp, totalPages])

  const makeHref = useCallback(
    (pageNum: number) => {
      const sp = new URLSearchParams(searchParams.toString())
      if (pageNum <= 1) sp.delete('page')
      else sp.set('page', String(pageNum))
      const qs = sp.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, searchParams],
  )

  if (total == null || totalPages <= 1) {
    return null
  }

  const items = buildPaginationItems(current, totalPages)

  return (
    <Pagination aria-label={p.aria}>
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
      <PaginationNext href={current < totalPages ? makeHref(current + 1) : null} aria-label={p.next}>
        {p.next}
      </PaginationNext>
    </Pagination>
  )
}
