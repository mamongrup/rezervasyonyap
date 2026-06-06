/** Yerel takvim günü — `toISOString()` UTC kayması yapmaz (TR saat dilimi). */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalYmd(s?: string): Date | null {
  if (!s?.trim()) return null
  const d = new Date(`${s.trim()}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}
