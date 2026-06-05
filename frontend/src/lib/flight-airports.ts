/**
 * Turna uçuş araması — IATA havalimanı / şehir kodları.
 * Form gönderiminde URL'de `from=AYT&to=IST` kullanılır.
 */

export type FlightAirport = {
  code: string
  label: string
  city: string
  /** Arama eşlemesi (küçük harf) */
  terms: string[]
}

export const FLIGHT_AIRPORTS: FlightAirport[] = [
  { code: 'IST', label: 'İstanbul', city: 'İstanbul', terms: ['istanbul', 'ist', 'ataturk', 'atatürk', 'avrupa yakası'] },
  { code: 'SAW', label: 'Sabiha Gökçen', city: 'İstanbul', terms: ['sabiha', 'saw', 'gokcen', 'gökçen', 'anadolu yakası'] },
  { code: 'AYT', label: 'Antalya', city: 'Antalya', terms: ['antalya', 'ayt'] },
  { code: 'ESB', label: 'Ankara Esenboğa', city: 'Ankara', terms: ['ankara', 'esenboga', 'esenboğa', 'esb'] },
  { code: 'ADB', label: 'İzmir Adnan Menderes', city: 'İzmir', terms: ['izmir', 'adb', 'adnan menderes'] },
  { code: 'GZP', label: 'Gazipaşa (Alanya)', city: 'Alanya', terms: ['alanya', 'gazipasa', 'gazipaşa', 'gzp'] },
  { code: 'DLM', label: 'Dalaman', city: 'Dalaman', terms: ['dalaman', 'dlm', 'fethiye', 'gocek', 'göcek'] },
  { code: 'BJV', label: 'Milas-Bodrum', city: 'Bodrum', terms: ['bodrum', 'milas', 'bjv'] },
  { code: 'TZX', label: 'Trabzon', city: 'Trabzon', terms: ['trabzon', 'tzx'] },
  { code: 'GZT', label: 'Gaziantep', city: 'Gaziantep', terms: ['gaziantep', 'gzt'] },
  { code: 'ASR', label: 'Kayseri', city: 'Kayseri', terms: ['kayseri', 'kapadokya', 'nevsehir', 'nevşehir', 'asr'] },
  { code: 'NAV', label: 'Nevşehir Kapadokya', city: 'Nevşehir', terms: ['nevsehir', 'nevşehir', 'kapadokya', 'nav', 'urgup', 'ürgüp'] },
  { code: 'DIY', label: 'Diyarbakır', city: 'Diyarbakır', terms: ['diyarbakir', 'diyarbakır', 'diy'] },
  { code: 'ERZ', label: 'Erzurum', city: 'Erzurum', terms: ['erzurum', 'erz'] },
  { code: 'VAN', label: 'Van', city: 'Van', terms: ['van'] },
  { code: 'SZF', label: 'Samsun Çarşamba', city: 'Samsun', terms: ['samsun', 'szf'] },
  { code: 'KYA', label: 'Konya', city: 'Konya', terms: ['konya', 'kya'] },
  { code: 'LHR', label: 'Londra Heathrow', city: 'Londra', terms: ['londra', 'london', 'lhr', 'heathrow'] },
  { code: 'FRA', label: 'Frankfurt', city: 'Frankfurt', terms: ['frankfurt', 'fra'] },
  { code: 'DXB', label: 'Dubai', city: 'Dubai', terms: ['dubai', 'dxb'] },
  { code: 'CDG', label: 'Paris CDG', city: 'Paris', terms: ['paris', 'cdg'] },
  { code: 'AMS', label: 'Amsterdam', city: 'Amsterdam', terms: ['amsterdam', 'ams'] },
]

const BY_CODE = new Map(FLIGHT_AIRPORTS.map((a) => [a.code, a]))

function norm(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function airportDisplayName(airport: FlightAirport): string {
  return `${airport.label} (${airport.code})`
}

export function findAirportByCode(code: string): FlightAirport | undefined {
  const c = code.trim().toUpperCase()
  return BY_CODE.get(c)
}

/** Şehir adı, etiket veya IATA → kod (bulunamazsa null). */
export function resolveFlightAirportCode(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (/^[A-Za-z]{3}$/.test(raw)) {
    const hit = BY_CODE.get(raw.toUpperCase())
    return hit ? hit.code : raw.toUpperCase()
  }
  const q = norm(raw)
  for (const a of FLIGHT_AIRPORTS) {
    if (norm(a.label) === q || norm(a.city) === q) return a.code
    if (a.terms.some((t) => t === q || q.includes(t) || t.includes(q))) return a.code
  }
  const comma = raw.split(',')[0]?.trim()
  if (comma && comma !== raw) return resolveFlightAirportCode(comma)
  return null
}

export function searchFlightAirports(query: string, limit = 12): FlightAirport[] {
  const q = norm(query)
  if (!q) return FLIGHT_AIRPORTS.slice(0, 8)
  const scored: { a: FlightAirport; score: number }[] = []
  for (const a of FLIGHT_AIRPORTS) {
    let score = 0
    if (a.code.toLowerCase() === q) score = 100
    else if (a.code.toLowerCase().startsWith(q)) score = 80
    else if (norm(a.city).startsWith(q)) score = 70
    else if (norm(a.label).startsWith(q)) score = 65
    else if (norm(a.city).includes(q)) score = 50
    else if (norm(a.label).includes(q)) score = 45
    else if (a.terms.some((t) => t.startsWith(q) || t.includes(q))) score = 40
    if (score > 0) scored.push({ a, score })
  }
  scored.sort((x, y) => y.score - x.score)
  return scored.slice(0, limit).map((s) => s.a)
}

export const POPULAR_FLIGHT_AIRPORTS = ['IST', 'AYT', 'ESB', 'ADB', 'SAW', 'TZX'] as const
