import { safeTrimOrNull } from '@/lib/safe-string'

/** Kanonik teknik alanlar — `vertical_yacht_extra` + vitrin */
export type NormalizedYachtTechnical = {
  boatCode?: string
  yachtType?: string
  buildYear?: string
  portName?: string
  lengthMeters?: string
  beamMeters?: string
  cabinCount?: string
  bathroomCount?: string
  airConditioning?: string
  crewCount?: string
  passengerCount?: string
  generator?: string
  speedKnots?: string
  fuelPolicy?: string
}

const KEY_ALIASES: Record<keyof NormalizedYachtTechnical, string[]> = {
  boatCode: ['tekne kodu', 'boat code', 'code', 'ref'],
  yachtType: ['tekne sınıfı', 'tekne sinifi', 'boat type', 'yacht type', 'class', 'yat tipi', 'tip'],
  buildYear: ['yapım yılı', 'yapim yili', 'build year', 'year built', 'model year'],
  portName: ['liman', 'port', 'marina', 'base port', 'kalkış', 'kalkis', 'departure'],
  lengthMeters: ['boy', 'length', 'tekne uzunluğu', 'tekne uzunlugu', 'loa', 'uzunluk'],
  beamMeters: ['en', 'beam', 'genişlik', 'genislik', 'width'],
  cabinCount: ['kabin', 'cabins', 'cabin'],
  bathroomCount: ['banyo', 'bathrooms', 'bathroom', 'wc'],
  airConditioning: ['klima', 'air conditioning', 'air con', 'ac'],
  crewCount: ['personel', 'crew', 'mürettebat', 'murettebat'],
  passengerCount: [
    'misafir kapasitesi',
    'misafir',
    'max guest',
    'guest capacity',
    'capacity',
    'kişi',
    'kisi',
    'yolcu',
    'pax',
  ],
  generator: ['jeneratör', 'jenerator', 'generator', 'genset'],
  speedKnots: ['hız', 'hiz', 'speed', 'max speed'],
  fuelPolicy: ['yakıt', 'yakit', 'fuel', 'fuel policy'],
}

const FIELD_MAP: Record<string, keyof NormalizedYachtTechnical> = {}
for (const [field, aliases] of Object.entries(KEY_ALIASES) as [keyof NormalizedYachtTechnical, string[]][]) {
  for (const alias of aliases) {
    FIELD_MAP[normKey(alias)] = field
  }
}

function normKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[:.]/g, '')
    .trim()
}

function canonicalField(label: string): keyof NormalizedYachtTechnical | null {
  const k = normKey(label)
  if (!k) return null
  if (FIELD_MAP[k]) return FIELD_MAP[k]
  for (const [alias, field] of Object.entries(FIELD_MAP)) {
    if (k.includes(alias) || alias.includes(k)) return field
  }
  return null
}

function setField(out: NormalizedYachtTechnical, field: keyof NormalizedYachtTechnical, value: string) {
  const v = value.trim()
  if (!v) return
  if (!out[field]) out[field] = v
}

export function parseDescriptionSpecsBlock(text: string | null | undefined): NormalizedYachtTechnical {
  const out: NormalizedYachtTechnical = {}
  const src = String(text ?? '')
  const idx = src.search(/teknik\s+özellikler|teknik\s+ozellikler/i)
  const block = idx >= 0 ? src.slice(idx) : src
  for (const line of block.split('\n')) {
    const trimmed = line.trim().replace(/^[-•*]\s*/, '')
    const m = trimmed.match(/^([^:–—-]+)\s*[:–—-]\s*(.+)$/)
    if (!m) continue
    const field = canonicalField(m[1])
    if (!field) continue
    setField(out, field, m[2])
  }
  return out
}

export function normalizeSpecsRecord(specs: Record<string, string> | null | undefined): NormalizedYachtTechnical {
  const out: NormalizedYachtTechnical = {}
  if (!specs) return out
  for (const [label, value] of Object.entries(specs)) {
    const field = canonicalField(label)
    if (field && value?.trim()) setField(out, field, value)
  }
  return out
}

export function mergeNormalizedTechnical(
  ...layers: Array<NormalizedYachtTechnical | null | undefined>
): NormalizedYachtTechnical {
  const out: NormalizedYachtTechnical = {}
  for (const layer of layers) {
    if (!layer) continue
    for (const [k, v] of Object.entries(layer) as [keyof NormalizedYachtTechnical, string | undefined][]) {
      if (v?.trim()) out[k] = v.trim()
    }
  }
  return out
}

/** `vertical_yacht_extra` JSON → normalize */
export function normalizedFromYachtExtra(extra: Record<string, unknown>): NormalizedYachtTechnical {
  const pick = (k: string) => safeTrimOrNull(String(extra[k] ?? '')) ?? undefined
  return {
    boatCode: pick('boat_code'),
    yachtType: pick('yacht_type'),
    buildYear: pick('build_year'),
    portName: pick('port_name'),
    lengthMeters: pick('length_meters'),
    beamMeters: pick('beam_meters'),
    cabinCount: pick('cabin_count'),
    bathroomCount: pick('bathroom_count'),
    airConditioning: pick('air_conditioning'),
    crewCount: pick('crew_count'),
    passengerCount: pick('passenger_count'),
    generator: pick('generator'),
    speedKnots: pick('speed_knots'),
    fuelPolicy: pick('fuel_policy'),
  }
}

export function formatAirConditioningLabel(
  raw: string | undefined,
  labels: { yes?: string; no?: string },
): string | null {
  const v = raw?.trim().toLowerCase()
  if (!v) return null
  if (v === 'yes' || v === 'var' || v === 'evet') return labels.yes ?? 'Var'
  if (v === 'no' || v === 'yok' || v === 'hayır' || v === 'hayir') return labels.no ?? 'Yok'
  return (raw ?? '').trim()
}
