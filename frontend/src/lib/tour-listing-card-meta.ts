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

const AIRPORT_DEPARTURE_CITIES: Record<string, string> = {
  saw: 'İstanbul',
  ist: 'İstanbul',
  esb: 'Ankara',
  adb: 'İzmir',
  diy: 'Diyarbakır',
  szf: 'Samsun',
  gzt: 'Gaziantep',
  ayt: 'Antalya',
  dlm: 'Dalaman',
  bod: 'Bodrum',
  tzx: 'Trabzon',
  erz: 'Erzurum',
  vas: 'Sivas',
  asr: 'Kayseri',
}

function normalizeAirportNameToCity(name: string): string | null {
  const raw = normKey(name)
  if (!raw) return null
  if (raw.includes('sabiha') || raw.includes('ataturk') || raw.includes('istanbul')) return 'İstanbul'
  if (raw.includes('esenboga') || raw.includes('ankara')) return 'Ankara'
  if (raw.includes('adnan menderes') || raw.includes('izmir')) return 'İzmir'
  if (raw.includes('diyarbakir')) return 'Diyarbakır'
  if (raw.includes('samsun') || raw.includes('carsamba')) return 'Samsun'
  if (raw.includes('antalya')) return 'Antalya'
  if (raw.includes('trabzon')) return 'Trabzon'
  if (raw.includes('gaziantep')) return 'Gaziantep'

  const cleaned = name
    .replace(/\b(international|havaliman[iı]|airport)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned.length > 0 && cleaned.length <= 32 ? cleaned : null
}

/** Wtatil dönem / snapshot ham kalkış değerini vitrin etiketine çevirir */
export function mapTourDepartureCityLabel(raw?: string | null): string | null {
  const text = String(raw ?? '').trim()
  if (!text) return null

  if (text.includes('||')) {
    const [namePart, codePart] = text.split('||')
    const code = normKey(codePart)
    if (code && AIRPORT_DEPARTURE_CITIES[code]) return AIRPORT_DEPARTURE_CITIES[code]
    const fromName = normalizeAirportNameToCity(namePart)
    if (fromName) return fromName
  }

  if (/^[A-Za-z]{3}$/.test(text)) {
    const fromCode = AIRPORT_DEPARTURE_CITIES[normKey(text)]
    if (fromCode) return fromCode
  }

  if (text.length <= 40 && !text.startsWith('{')) return text
  return null
}

function mapDepartureMetaLabel(departureRaw?: string): string | null {
  const city = mapTourDepartureCityLabel(departureRaw)
  return city ? `Kalkış: ${city}` : null
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
    mapDepartureMetaLabel(tour.departureCity),
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
