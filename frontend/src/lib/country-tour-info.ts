/** Tur vitrininde gösterilen ülke pratik bilgileri — `location_pages.country_info_json`. */

export type CountryTourInfo = {
  languages?: string[]
  currencies?: string[]
  /** Ülke telefon kodu (ör. 381) */
  country_phone_code?: string
  consulate_phone?: string
  /** Türkiye'ye göre saat farkı (ör. "-1", "+2") */
  time_difference?: string
  voltage?: string
  /** Kısa genel tanıtım */
  general_description?: string
  taxes?: string
  tipping?: string
  flag_emoji?: string
  flag_url?: string
  emergency_numbers?: { label: string; number: string }[]
}

export type CountryTourInfoRow = {
  label: string
  value: string
}

export function parseCountryTourInfo(raw: unknown): CountryTourInfo {
  if (raw == null) return {}
  let obj: Record<string, unknown>
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return {}
    try {
      obj = JSON.parse(s) as Record<string, unknown>
    } catch {
      return {}
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>
  } else {
    return {}
  }

  const languages = Array.isArray(obj.languages)
    ? obj.languages.map(String).map((x) => x.trim()).filter(Boolean)
    : undefined
  const currencies = Array.isArray(obj.currencies)
    ? obj.currencies.map(String).map((x) => x.trim()).filter(Boolean)
    : undefined

  return {
    languages,
    currencies,
    country_phone_code: strField(obj.country_phone_code),
    consulate_phone: strField(obj.consulate_phone),
    time_difference: strField(obj.time_difference),
    voltage: strField(obj.voltage),
    general_description: strField(obj.general_description),
    taxes: strField(obj.taxes),
    tipping: strField(obj.tipping),
    flag_emoji: strField(obj.flag_emoji),
    flag_url: strField(obj.flag_url),
    emergency_numbers: Array.isArray(obj.emergency_numbers)
      ? obj.emergency_numbers
          .map((item) => {
            if (!item || typeof item !== 'object') return null
            const o = item as Record<string, unknown>
            const label = strField(o.label)
            const number = strField(o.number)
            if (!label && !number) return null
            return { label: label ?? '', number: number ?? '' }
          })
          .filter((x): x is { label: string; number: string } => x != null)
      : undefined,
  }
}

function strField(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s || undefined
}

/** Gezinomi tarzı kart satırları — boş alanlar atlanır. */
export function countryTourInfoRows(info: CountryTourInfo): CountryTourInfoRow[] {
  const rows: CountryTourInfoRow[] = []

  if (info.languages?.length) {
    rows.push({ label: 'Konuşulan Dil', value: info.languages.join(', ') })
  }
  if (info.currencies?.length) {
    rows.push({ label: 'Para Birimi', value: info.currencies.join(', ') })
  }
  if (info.time_difference) {
    rows.push({ label: 'Saat Farkı', value: info.time_difference })
  }
  if (info.voltage) {
    rows.push({ label: 'Voltaj', value: info.voltage })
  }
  if (info.general_description) {
    rows.push({ label: 'Genel', value: info.general_description })
  }

  const phoneParts: string[] = []
  if (info.country_phone_code) phoneParts.push(`Ülke kodu: ${info.country_phone_code}`)
  if (info.consulate_phone) phoneParts.push(`Konsolosluk telefonu: ${info.consulate_phone}`)
  if (phoneParts.length) {
    rows.push({ label: 'Telefon', value: phoneParts.join(' · ') })
  }

  if (info.taxes) rows.push({ label: 'Vergiler', value: info.taxes })
  if (info.tipping) rows.push({ label: 'Bahşiş', value: info.tipping })

  return rows
}

export function countryTourInfoHasContent(info: CountryTourInfo): boolean {
  return countryTourInfoRows(info).length > 0
}

export function mergeCountryTourInfo(
  existing: CountryTourInfo,
  generated: CountryTourInfo,
): CountryTourInfo {
  return {
    ...existing,
    ...generated,
    languages: generated.languages?.length ? generated.languages : existing.languages,
    currencies: generated.currencies?.length ? generated.currencies : existing.currencies,
    emergency_numbers: generated.emergency_numbers?.length
      ? generated.emergency_numbers
      : existing.emergency_numbers,
  }
}
