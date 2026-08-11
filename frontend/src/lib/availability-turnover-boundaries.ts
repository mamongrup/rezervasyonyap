import type { MergedCalendarRow } from '@/lib/listing-availability-calendar-merge'

/**
 * Kaydetmeden once tam kapali gece araliklarini giris/cikis yarimlarina cevirir.
 * Ilk dolu gunun sabahi musait kalir. Son dolu geceden sonraki cikis gununun
 * sabahi kapali, ogleden sonrasi musait olur.
 *
 * Tek gunluk bakim kapamalari ve ay kenarindaki bilinmeyen sinirlar degismez.
 * Daha once dogru sinir uygulanmis bir aralik tekrar kaydedildiginde iceri
 * kaymaz; bu donusum idempotenttir.
 */
export function applyTurnoverBoundaries(rows: MergedCalendarRow[]): MergedCalendarRow[] {
  const source = [...rows].sort((a, b) => a.day.localeCompare(b.day))
  const out = source.map((row) => ({ ...row }))
  const isFull = (row: MergedCalendarRow) => !row.am_available && !row.pm_available
  const isOpen = (row: MergedCalendarRow) => row.am_available && row.pm_available
  const isCheckinBoundary = (row: MergedCalendarRow) => row.am_available && !row.pm_available
  const isCheckoutBoundary = (row: MergedCalendarRow) => !row.am_available && row.pm_available

  let index = 0
  while (index < source.length) {
    if (!isFull(source[index])) {
      index += 1
      continue
    }

    let endIndex = index
    while (endIndex + 1 < source.length && isFull(source[endIndex + 1])) endIndex += 1
    const previous = index > 0 ? source[index - 1] : undefined
    const next = endIndex + 1 < source.length ? source[endIndex + 1] : undefined

    if (endIndex > index && previous && next) {
      if (isCheckinBoundary(previous) && isCheckoutBoundary(next)) {
        index = endIndex + 1
        continue
      }
      if (isOpen(previous) || isCheckoutBoundary(previous)) {
        out[index].am_available = true
        out[index].is_available = true
      }
      if (isOpen(next) || isCheckinBoundary(next)) {
        out[endIndex + 1].am_available = false
        out[endIndex + 1].is_available = true
      }
    }
    index = endIndex + 1
  }

  return out
}
