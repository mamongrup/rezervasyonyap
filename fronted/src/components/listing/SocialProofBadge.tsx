'use client'

import React from 'react'

type Props = {
  listingId: string
  className?: string
  /** API base override (yoksa NEXT_PUBLIC_API_URL). */
  apiBase?: string
}

type Stats = {
  viewers_now: number
  last_booked_minutes_ago: number | null
  recent_bookings_24h: number
}

function getOrCreateSession(): string {
  if (typeof window === 'undefined') return ''
  let s = window.sessionStorage.getItem('travel_view_session')
  if (!s) {
    s = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.sessionStorage.setItem('travel_view_session', s)
  }
  return s
}

export default function SocialProofBadge({ listingId, className, apiBase }: Props) {
  const [stats, setStats] = React.useState<Stats | null>(null)
  const base = apiBase ?? process.env.NEXT_PUBLIC_API_URL

  React.useEffect(() => {
    if (!base || !listingId) return
    const sk = getOrCreateSession()
    let active = true
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let fetchTimer: ReturnType<typeof setInterval> | null = null

    const ping = async () => {
      try {
        await fetch(`${base}/api/v1/public/listings/${encodeURIComponent(listingId)}/view-ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_key: sk }),
          keepalive: true,
        })
      } catch {
        /* sessizce yut */
      }
    }
    const refresh = async () => {
      try {
        const res = await fetch(
          `${base}/api/v1/public/listings/${encodeURIComponent(listingId)}/social-proof`,
          { cache: 'no-store' },
        )
        if (!res.ok) return
        const data = (await res.json()) as Stats
        if (active) setStats(data)
      } catch {
        /* sessizce yut */
      }
    }

    ping().then(refresh)
    pingTimer = setInterval(ping, 30_000)
    fetchTimer = setInterval(refresh, 30_000)

    return () => {
      active = false
      if (pingTimer) clearInterval(pingTimer)
      if (fetchTimer) clearInterval(fetchTimer)
    }
  }, [base, listingId])

  if (!stats) return null

  const items: { icon: string; text: string; tone: 'orange' | 'rose' | 'emerald' }[] = []
  if (stats.viewers_now > 1) {
    items.push({
      icon: '👀',
      text: `Şu anda ${stats.viewers_now} kişi bakıyor`,
      tone: 'orange',
    })
  }
  if (stats.last_booked_minutes_ago !== null && stats.last_booked_minutes_ago >= 0) {
    const m = stats.last_booked_minutes_ago
    const txt = m < 60 ? `${m} dakika önce` : `${Math.floor(m / 60)} saat önce`
    items.push({ icon: '🔥', text: `Son rezervasyon ${txt}`, tone: 'rose' })
  }
  if (stats.recent_bookings_24h >= 3) {
    items.push({
      icon: '✨',
      text: `Son 24 saatte ${stats.recent_bookings_24h} rezervasyon`,
      tone: 'emerald',
    })
  }
  if (items.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {items.map((it, i) => {
        const toneCls =
          it.tone === 'orange'
            ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800'
            : it.tone === 'rose'
              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800'
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneCls}`}
          >
            <span aria-hidden>{it.icon}</span>
            <span>{it.text}</span>
          </span>
        )
      })}
    </div>
  )
}
