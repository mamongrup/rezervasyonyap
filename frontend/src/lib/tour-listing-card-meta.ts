import type { TListingTour } from '@/types/listing-types'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

function normKey(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function mapTravelLabel(
  locale: string,
  travelType?: string,
  transportRaw?: string,
): string | null {
  const cm = getMessages(locale).listing.tourDetail.cardMeta
  const code = normKey(travelType)
  if (code === 'plane') return cm.travelPlane
  if (code === 'bus') return cm.travelBus
  if (code === 'both') return cm.travelBoth
  if (code === 'own') return cm.travelOwn

  const raw = normKey(transportRaw)
  if (!raw) return null
  if (raw.includes('ucak') && raw.includes('otobus')) return cm.travelBoth
  if (raw.includes('plane') && raw.includes('bus')) return cm.travelBoth
  if (raw === '1' || raw.includes('ucak') || raw.includes('plane') || raw.includes('air'))
    return cm.travelPlane
  if (raw === '2' || raw.includes('otobus') || raw.includes('bus')) return cm.travelBus
  if (raw === '3' || raw.includes('karma') || raw.includes('mixed')) return cm.travelBoth

  return null
}

function mapMealLabel(locale: string, mealRaw?: string): string | null {
  const cm = getMessages(locale).listing.tourDetail.cardMeta
  const raw = normKey(mealRaw)
  if (!raw) return null

  if (
    raw.includes('room') ||
    raw.includes('yemeksiz') ||
    raw.includes('sadece oda') ||
    raw === '0' ||
    raw === 'room_only'
  ) {
    return cm.mealRoomOnly
  }
  if (
    raw.includes('kahvalti') ||
    raw.includes('breakfast') ||
    raw.includes('bed') ||
    raw === '1' ||
    raw === 'bb' ||
    raw === 'bed_breakfast'
  ) {
    return cm.mealBreakfast
  }
  if (
    raw.includes('yarim') ||
    raw.includes('half') ||
    raw === '2' ||
    raw === 'hb' ||
    raw === 'half_board'
  ) {
    return cm.mealHalfBoard
  }
  if (
    raw.includes('tam') ||
    raw.includes('full') ||
    raw === '3' ||
    raw === 'fb' ||
    raw === 'full_board'
  ) {
    return cm.mealFullBoard
  }

  const original = String(mealRaw ?? '').trim()
  if (original.length > 0 && original.length <= 40) return original
  return null
}

function mapVisaLabel(locale: string, visaRequired?: boolean): string | null {
  const cm = getMessages(locale).listing.tourDetail.cardMeta
  if (visaRequired === true) return cm.visaRequired
  if (visaRequired === false) return cm.visaNotRequired
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

function mapDepartureMetaLabel(locale: string, departureRaw?: string): string | null {
  const city = mapTourDepartureCityLabel(departureRaw)
  if (!city) return null
  return interpolate(getMessages(locale).listing.tourDetail.cardMeta.departure, { city })
}

function formatDuration(locale: string, nights?: number, days?: number): string | null {
  const cm = getMessages(locale).listing.tourDetail.cardMeta
  const n = nights != null && nights > 0 ? nights : null
  const d = days != null && days > 0 ? days : n != null ? n + 1 : null
  if (n != null && d != null) {
    return interpolate(cm.durationNightsDays, { nights: String(n), days: String(d) })
  }
  if (n != null) return interpolate(cm.durationNights, { nights: String(n) })
  if (d != null) return interpolate(cm.durationDays, { days: String(d) })
  return null
}

function joinMetaParts(parts: Array<string | null>): string | null {
  const visible = parts.filter((part): part is string => Boolean(part))
  return visible.length > 0 ? visible.join(' | ') : null
}

/** Tur vitrin kartı — bölge satırından sonra en fazla 2 kompakt meta satırı */
export function buildTourListingCardMetaLines(tour: TListingTour, locale = 'tr'): string[] {
  const lines: string[] = []

  const rowOne = joinMetaParts([
    mapDepartureMetaLabel(locale, tour.departureCity),
    mapVisaLabel(locale, tour.visaRequired),
    mapTravelLabel(locale, tour.travelType, tour.transportType),
  ])
  if (rowOne) lines.push(rowOne)

  const rowTwo = joinMetaParts([
    formatDuration(locale, tour.durationNights, tour.durationDays),
    mapMealLabel(locale, tour.mealType),
  ])
  if (rowTwo) lines.push(rowTwo)

  return lines
}

const TOUR_LANGUAGE_ALIASES: Record<string, string> = {
  turkish: 'Türkçe',
  turkce: 'Türkçe',
  english: 'English',
  german: 'Deutsch',
  deutsch: 'Deutsch',
  russian: 'Русский',
  french: 'Français',
  chinese: '中文',
}

/** Tur meta dil kodlarını (tr, en) veya kısaltmaları okunur ada çevirir. */
export function formatTourLanguageLabels(codes: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []

  for (const raw of codes) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = normKey(trimmed)
    const fromCatalog = SITE_LOCALE_CATALOG.find((c) => c.code === key)?.name
    const label =
      fromCatalog ||
      TOUR_LANGUAGE_ALIASES[key] ||
      (trimmed.length > 3 && !/^[a-z]{2}$/i.test(trimmed) ? trimmed : null)
    if (!label) continue
    const dedupe = label.toLocaleLowerCase('tr')
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    out.push(label)
  }

  return out.join(', ')
}
