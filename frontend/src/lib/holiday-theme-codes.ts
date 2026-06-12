import { HOLIDAY_THEME_FILTER_FALLBACK } from '@/lib/holiday-theme-filter-fallback'

/** `listing_holiday_home_details.theme_codes` — snake_case kodlar */
export const HOLIDAY_THEME_CODE_RE = /^[a-z][a-z0-9_]*$/i

const KNOWN_CODES = new Set(
  HOLIDAY_THEME_FILTER_FALLBACK.map((r) => r.code.trim().toLowerCase()),
)

function isThemeCode(s: string): boolean {
  return HOLIDAY_THEME_CODE_RE.test(s.trim())
}

function salvageKnownCodesFromGarbage(s: string): string[] {
  const lower = s.toLowerCase()
  const out: string[] = []
  for (const code of KNOWN_CODES) {
    if (lower.includes(code)) out.push(code)
  }
  return out
}

function tryParseJsonValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

function codesFromJsonValue(v: unknown): string[] {
  if (typeof v === 'string') {
    const t = v.trim()
    if (isThemeCode(t)) return [t.toLowerCase()]
    return expandHolidayThemeCodeToken(t)
  }
  if (Array.isArray(v)) {
    return v.flatMap((x) => (typeof x === 'string' ? expandHolidayThemeCodeToken(x) : []))
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.keys(v as Record<string, unknown>).flatMap((k) =>
      isThemeCode(k) ? [k.toLowerCase()] : [],
    )
  }
  return []
}

/** Tek parça: CSV, PG `{a,b}`, JSON dizi veya bozuk çift kodlama */
export function expandHolidayThemeCodeToken(raw: string): string[] {
  let s = raw.trim()
  if (!s) return []

  if (s.startsWith('{') && s.endsWith('}') && !s.includes('"')) {
    const inner = s.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').flatMap((part) => expandHolidayThemeCodeToken(part))
  }

  if (s.startsWith('[') || (s.startsWith('{') && s.includes('"'))) {
    let v: unknown = tryParseJsonValue(s)
    for (let depth = 0; depth < 4 && typeof v === 'string'; depth += 1) {
      const inner = v.trim()
      if (isThemeCode(inner)) return [inner.toLowerCase()]
      v = tryParseJsonValue(inner) ?? inner
    }
    const fromJson = codesFromJsonValue(v)
    if (fromJson.length) return fromJson
    return salvageKnownCodesFromGarbage(s)
  }

  if (s.includes(',')) {
    return s.split(',').flatMap((part) => expandHolidayThemeCodeToken(part))
  }

  const unquoted = s.replace(/^["']+|["']+$/g, '').trim()
  if (isThemeCode(unquoted)) return [unquoted.toLowerCase()]

  return salvageKnownCodesFromGarbage(s)
}

/**
 * API / meta `theme_codes` alanını güvenli kod listesine çevirir.
 * PG `::text` (`{luxury,family}`), virgül CSV ve bozuk JSON parçalarını tolere eder.
 */
/** Liste kartlarında gösterilmez — ilan detayında havuz/özellik olarak işlenir. */
export const HOLIDAY_THEME_CODES_EXCLUDED_FROM_LISTING_CARDS = new Set(['child_friendly'])

/** Vitrin kartı tema çipleri — `child_friendly` vb. hariç. */
export function filterHolidayThemeCodesForListingCards(codes: string[]): string[] {
  return parseHolidayThemeCodes(codes).filter(
    (code) => !HOLIDAY_THEME_CODES_EXCLUDED_FROM_LISTING_CARDS.has(code),
  )
}

export function parseHolidayThemeCodes(
  input: string | string[] | null | undefined,
): string[] {
  if (input == null) return []
  const tokens = Array.isArray(input) ? input : [input]
  const seen = new Set<string>()
  const out: string[] = []

  for (const token of tokens) {
    for (const code of expandHolidayThemeCodeToken(String(token ?? ''))) {
      const key = code.trim().toLowerCase()
      if (!key || !isThemeCode(key) || seen.has(key)) continue
      seen.add(key)
      out.push(key)
    }
  }
  return out
}
