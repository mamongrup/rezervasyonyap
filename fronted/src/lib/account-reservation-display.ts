/** Tarih (YYYY-MM-DD veya ISO) — yerel takvimde gösterim, saat dilimi kayması olmaması için UTC. */
export function formatReservationDateOnly(raw: string | undefined, locale: string): string {
  const t = (raw ?? '').trim()
  if (!t) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    const dt = new Date(Date.UTC(y, mo - 1, d))
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(dt)
  }
  const parsed = new Date(t)
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed)
  }
  return t
}

export function formatReservationDateTime(raw: string | undefined, locale: string): string {
  const t = (raw ?? '').trim()
  if (!t) return '—'
  const parsed = new Date(t)
  if (Number.isNaN(parsed.getTime())) return t
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

export function formatReservationMoney(
  amount: string | undefined,
  currency: string | undefined,
  locale: string,
): string {
  const n = Number.parseFloat(String(amount ?? '').trim())
  if (!Number.isFinite(n)) return '—'
  const cur = String(currency ?? '')
    .trim()
    .toUpperCase()
  if (cur.length === 3) {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(n)
    } catch {
      return `${n.toFixed(2)} ${cur}`
    }
  }
  return n.toFixed(2)
}

export function labeledStatus(
  raw: string | undefined,
  prefix: string,
  messages: Record<string, string>,
): string {
  const s = (raw ?? '').trim().toLowerCase()
  if (!s) return '—'
  const key = `${prefix}_${s}`
  return messages[key] ?? raw ?? '—'
}

export function bookingStatusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase()
  if (s === 'confirmed' || s === 'completed') {
    return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200'
  }
  if (s === 'cancelled') {
    return 'bg-red-100 text-red-900 dark:bg-red-900/35 dark:text-red-200'
  }
  if (s === 'held' || s === 'inquiry') {
    return 'bg-amber-100 text-amber-950 dark:bg-amber-900/30 dark:text-amber-100'
  }
  return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
}

export function paymentStatusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase()
  if (s === 'completed' || s === 'refunded') {
    return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200'
  }
  if (s === 'disputed') {
    return 'bg-red-100 text-red-900 dark:bg-red-900/35 dark:text-red-200'
  }
  if (s === 'held' || s === 'pending_confirm' || s === 'supplier_notified') {
    return 'bg-sky-100 text-sky-950 dark:bg-sky-900/30 dark:text-sky-100'
  }
  return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
}
