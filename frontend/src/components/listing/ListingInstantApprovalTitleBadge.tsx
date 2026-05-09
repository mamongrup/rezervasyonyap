'use client'

import React from 'react'

type Perks = {
  instant_book: boolean
}

/**
 * Yalnızca instant_book açıksa “Anında Onay” rozeti (yerleşim üst bileşende).
 */
export default function ListingInstantApprovalTitleBadge({ listingId }: { listingId: string }) {
  const [instantBook, setInstantBook] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL
    if (!base || !listingId) return
    let cancelled = false
    fetch(`${base}/api/v1/public/listings/${encodeURIComponent(listingId)}/perks`, {
      cache: 'force-cache',
      next: { revalidate: 300 },
    } as RequestInit)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Perks | null) => {
        if (!cancelled && d) setInstantBook(!!d.instant_book)
      })
      .catch(() => {
        if (!cancelled) setInstantBook(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId])

  if (instantBook !== true) return null

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold leading-none text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
      <span aria-hidden>⚡</span>
      <span>Anında Onay</span>
    </span>
  )
}
