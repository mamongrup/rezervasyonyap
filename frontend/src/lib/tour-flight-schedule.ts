/** Wtatil tourProgram içindeki düz metin uçuş tablosu (Uçuş Detayları). */

export type TourFlightScheduleRow = {
  departureDate: string
  returnDate: string
  departureFlightNo?: string
  returnFlightNo?: string
  departureFrom?: string
  departureTo?: string
  returnFrom?: string
  returnTo?: string
}

const TR_MONTH: Record<string, number> = {
  ocak: 1,
  subat: 2,
  şubat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  mayıs: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  ağustos: 8,
  eylul: 9,
  eylül: 9,
  ekim: 10,
  kasim: 11,
  kasım: 11,
  aralik: 12,
  aralık: 12,
}

const DATE_IN_LINE =
  /(\d{1,2})\s+(Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik)\s+(\d{2,4})/gi

function normalizeMonthKey(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
}

function parseTurkishDate(day: string, monthName: string, yearPart: string): string {
  const m = TR_MONTH[normalizeMonthKey(monthName)]
  if (!m) return ''
  const d = Number(day)
  let y = Number(yearPart)
  if (yearPart.length === 2) y = 2000 + y
  if (!d || !y) return ''
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseFlightLine(line: string): TourFlightScheduleRow | null {
  const matches = [...line.matchAll(DATE_IN_LINE)]
  if (matches.length < 2) return null

  const departureDate = parseTurkishDate(matches[0][1], matches[0][2], matches[0][3])
  const returnDate = parseTurkishDate(matches[1][1], matches[1][2], matches[1][3])
  if (!departureDate || !returnDate) return null

  const tokens = line.trim().split(/\s+/)
  const flightNos = tokens.filter((t) => /^PC\d+$/i.test(t))
  const iata = tokens.filter((t) => /^[A-Z]{3}$/.test(t))

  return {
    departureDate,
    returnDate,
    departureFlightNo: flightNos[0],
    returnFlightNo: flightNos[1],
    departureFrom: iata[0],
    departureTo: iata[1],
    returnFrom: iata[2],
    returnTo: iata[3],
  }
}

/** Açıklama HTML/metninden uçuş satırlarını çıkarır. */
export function parseTourFlightSchedulesFromDescription(raw: string): TourFlightScheduleRow[] {
  if (!raw.trim()) return []

  const lines = raw.replace(/\r/g, '').split('\n')
  const rows: TourFlightScheduleRow[] = []
  let inFlightBlock = false

  for (const line of lines) {
    const plain = line.replace(/<[^>]+>/g, ' ').trim()
    if (!plain) continue

    if (/Uçuş Detayları/i.test(plain)) {
      inFlightBlock = true
      continue
    }

    if (inFlightBlock && /^\d+\s*\.\s*Gün/i.test(plain)) break

    const row = parseFlightLine(plain)
    if (row) {
      inFlightBlock = true
      rows.push(row)
      continue
    }

    if (inFlightBlock && rows.length > 0 && !/G\.UCUS|D\.UCUS|KALKIS/i.test(plain)) {
      break
    }
  }

  const seen = new Set<string>()
  return rows.filter((r) => {
    const key = `${r.departureDate}|${r.returnDate}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Ham uçuş tablosu bloğunu açıklamadan çıkarır (çift gösterim olmasın). */
export function stripFlightScheduleBlockFromDescription(raw: string): string {
  if (!/Uçuş Detayları/i.test(raw)) return raw

  const lines = raw.replace(/\r/g, '').split('\n')
  const out: string[] = []
  let skipping = false
  let skippedAny = false

  for (const line of lines) {
    const plain = line.replace(/<[^>]+>/g, ' ').trim()

    if (/Uçuş Detayları/i.test(plain)) {
      skipping = true
      skippedAny = true
      continue
    }

    if (skipping) {
      if (/^\d+\s*\.\s*Gün/i.test(plain)) {
        skipping = false
        out.push(line)
        continue
      }
      if (parseFlightLine(plain)) continue
      if (/G\.UCUS|D\.UCUS|KALKIS|VARIS/i.test(plain)) continue
      if (!plain && skippedAny) continue
      skipping = false
    }

    out.push(line)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function formatTourFlightDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}
