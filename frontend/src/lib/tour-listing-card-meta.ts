import type { TListingTour } from '@/types/listing-types'

function normKey(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function mapTravelLabel(travelType?: string, transportRaw?: string): string | null {
  const code = normKey(travelType)
  if (code === 'plane') return 'Uçak ile yolculuk'
  if (code === 'bus') return 'Otobüs ile yolculuk'
  if (code === 'both') return 'Uçak+otobüs ile yolculuk'
  if (code === 'own') return 'Kendi aracıyla yolculuk'

  const raw = normKey(transportRaw)
  if (!raw) return null
  if (raw.includes('ucak') && raw.includes('otobus')) return 'Uçak+otobüs ile yolculuk'
  if (raw.includes('plane') && raw.includes('bus')) return 'Uçak+otobüs ile yolculuk'
  if (raw === '1' || raw.includes('ucak') || raw.includes('plane') || raw.includes('air'))
    return 'Uçak ile yolculuk'
  if (raw === '2' || raw.includes('otobus') || raw.includes('bus')) return 'Otobüs ile yolculuk'
  if (raw === '3' || raw.includes('karma') || raw.includes('mixed')) return 'Uçak+otobüs ile yolculuk'

  return null
}

function mapMealLabel(mealRaw?: string): string | null {
  const raw = normKey(mealRaw)
  if (!raw) return null

  if (
    raw.includes('room') ||
    raw.includes('yemeksiz') ||
    raw.includes('sadece oda') ||
    raw === '0' ||
    raw === 'room_only'
  ) {
    return 'Oda'
  }
  if (
    raw.includes('kahvalti') ||
    raw.includes('breakfast') ||
    raw.includes('bed') ||
    raw === '1' ||
    raw === 'bb' ||
    raw === 'bed_breakfast'
  ) {
    return 'Oda - Kahvaltı'
  }
  if (
    raw.includes('yarim') ||
    raw.includes('half') ||
    raw === '2' ||
    raw === 'hb' ||
    raw === 'half_board'
  ) {
    return 'Yarım Pansiyon'
  }
  if (
    raw.includes('tam') ||
    raw.includes('full') ||
    raw === '3' ||
    raw === 'fb' ||
    raw === 'full_board'
  ) {
    return 'Tam Pansiyon'
  }

  // Wtatil bazen ham metin döner — olduğu gibi göster
  const original = String(mealRaw ?? '').trim()
  if (original.length > 0 && original.length <= 40) return original
  return null
}

function mapVisaLabel(visaRequired?: boolean): string | null {
  if (visaRequired === true) return 'Vizeli'
  if (visaRequired === false) return 'Vizesiz'
  return null
}

function formatDuration(nights?: number, days?: number): string | null {
  const n = nights != null && nights > 0 ? nights : null
  const d = days != null && days > 0 ? days : n != null ? n + 1 : null
  if (n != null && d != null) return `${n} Gece - ${d} Gündüz`
  if (n != null) return `${n} Gece`
  if (d != null) return `${d} Gündüz`
  return null
}

function joinMetaParts(parts: Array<string | null>): string | null {
  const visible = parts.filter((part): part is string => Boolean(part))
  return visible.length > 0 ? visible.join(' | ') : null
}

/** Tur vitrin kartı — bölge satırından sonra en fazla 2 kompakt meta satırı */
export function buildTourListingCardMetaLines(tour: TListingTour, _locale = 'tr'): string[] {
  const lines: string[] = []

  const rowOne = joinMetaParts([
    mapVisaLabel(tour.visaRequired),
    mapTravelLabel(tour.travelType, tour.transportType),
  ])
  if (rowOne) lines.push(rowOne)

  const rowTwo = joinMetaParts([
    formatDuration(tour.durationNights, tour.durationDays),
    mapMealLabel(tour.mealType),
  ])
  if (rowTwo) lines.push(rowTwo)

  return lines
}
