'use client'

import React from 'react'

type Perks = {
  instant_book: boolean
  mobile_discount_percent: number
  super_host: boolean
}

type Props = {
  listingId: string
  /** Mobil-özel indirim yüzdesi göstermek için temel fiyat (varsa). */
  basePrice?: number
  /** Para birimi simgesi (örn. "₺", "$"). */
  currencySymbol?: string
  className?: string
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return true
  return /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
}

export default function ListingPerksBadges({
  listingId,
  basePrice,
  currencySymbol = '₺',
  className,
}: Props) {
  const [perks, setPerks] = React.useState<Perks | null>(null)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    setIsMobile(isMobileDevice())
    const base = process.env.NEXT_PUBLIC_API_URL
    if (!base || !listingId) return
    let cancelled = false
    fetch(`${base}/api/v1/public/listings/${encodeURIComponent(listingId)}/perks`, {
      cache: 'force-cache',
      next: { revalidate: 300 },
    } as RequestInit)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Perks | null) => {
        if (!cancelled && d) setPerks(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [listingId])

  if (!perks) return null

  const mobileDiscount =
    isMobile && perks.mobile_discount_percent > 0 && basePrice && basePrice > 0
      ? (basePrice * perks.mobile_discount_percent) / 100
      : 0

  const items: { icon: string; label: string; tone: 'sky' | 'amber' | 'violet' }[] = []
  if (perks.instant_book) {
    items.push({ icon: '⚡', label: 'Anında Onay', tone: 'sky' })
  }
  if (perks.super_host) {
    items.push({ icon: '⭐', label: 'Süper Ev Sahibi', tone: 'amber' })
  }

  if (items.length === 0 && mobileDiscount === 0) return null

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((it, i) => {
            const cls =
              it.tone === 'sky'
                ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800'
                : it.tone === 'amber'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
                  : 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800'
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
              >
                <span aria-hidden>{it.icon}</span>
                <span>{it.label}</span>
              </span>
            )
          })}
        </div>
      )}
      {mobileDiscount > 0 && (
        <div className="rounded-xl border border-fuchsia-300 bg-fuchsia-50 px-3 py-2 text-xs font-medium text-fuchsia-800 dark:border-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">
          📱 Mobil cihazınızdasınız — %{perks.mobile_discount_percent} ek indirim:{' '}
          {currencySymbol}
          {mobileDiscount.toFixed(2)} tasarruf
        </div>
      )}
    </div>
  )
}
