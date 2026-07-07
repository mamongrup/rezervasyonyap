import type { MergedCalendarRow } from '@/lib/listing-availability-calendar-merge'

/**
 * Kaydetmeden önce turnover (değişim) sınırlarını aç.
 *
 * Ay içindeki tam-blok (ÖÖ ve ÖS kapalı) kesintisiz aralıkların dış komşuları
 * müsaitse — yani bir rezervasyon kalıbıysa — aralığın ilk günü ÖÖ (sabah çıkış)
 * ve son günü ÖS (öğleden sonra giriş) açılır. Böylece bitişik rezervasyonlar
 * aynı giriş/çıkış gününü paylaşabilir (5–10 çıkış, 15–20 giriş gibi).
 *
 * Güvenlik kısıtları:
 *  - Yalnız 2+ günlük aralıklar; tek günlük tam blok (bakım) bozulmaz.
 *  - Ay kenarındaki (komşusu bilinmeyen) aralıklar değişmez.
 *  - İki yanı da dolu (sırt sırta) aralıklarda sınır açılmaz.
 */
export function applyTurnoverBoundaries(rows: MergedCalendarRow[]): MergedCalendarRow[] {
  const out = [...rows].sort((a, b) => a.day.localeCompare(b.day)).map((r) => ({ ...r }))
  const isFull = (r: MergedCalendarRow) => !r.am_available && !r.pm_available
  let i = 0
  while (i < out.length) {
    if (!isFull(out[i])) {
      i += 1
      continue
    }
    let j = i
    while (j + 1 < out.length && isFull(out[j + 1])) j += 1
    const prev = i - 1 >= 0 ? out[i - 1] : undefined
    const next = j + 1 < out.length ? out[j + 1] : undefined
    if (j > i && prev && next && !isFull(prev) && !isFull(next)) {
      out[i].am_available = true
      out[i].is_available = true
      out[j].pm_available = true
      out[j].is_available = true
    }
    i = j + 1
  }
  return out
}
