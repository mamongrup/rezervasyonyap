import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import { safeTrimOrNull } from '@/lib/safe-string'
import {
  mergeNormalizedTechnical,
  normalizeSpecsRecord,
  normalizedFromYachtExtra,
  parseDescriptionSpecsBlock,
  type NormalizedYachtTechnical,
} from '@/lib/yacht-technical-specs-normalize'

export type YachtCharterSpecs = {
  boatCode?: string
  yachtType?: string
  buildYear?: string
  portName?: string
  lengthMeters?: string
  beamMeters?: string
  speedKnots?: string
  cabinCount?: string
  bathroomCount?: string
  passengerCount?: string
  airConditioning?: string
  crewCount?: string
  generator?: string
  captainIncluded?: 'yes' | 'no' | 'optional'
  fuelPolicy?: string
  portLat?: string
  portLng?: string
  includes: string[]
  excludes: string[]
}

export type ParseYachtCharterSpecsOpts = {
  description?: string | null
  listingMetaSpecs?: Record<string, string> | null
  locationLabel?: string | null
  maxGuests?: number | null
  roomCount?: number | null
  bathCount?: number | null
  bedCount?: number | null
}

function readStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
}

function readCaptain(raw: string | undefined | null): YachtCharterSpecs['captainIncluded'] | undefined {
  const v = raw?.trim().toLowerCase()
  if (v === 'yes' || v === 'no' || v === 'optional') return v
  return undefined
}

function specsFromNormalized(n: NormalizedYachtTechnical): Partial<YachtCharterSpecs> {
  return {
    ...(n.boatCode ? { boatCode: n.boatCode } : {}),
    ...(n.yachtType ? { yachtType: n.yachtType } : {}),
    ...(n.buildYear ? { buildYear: n.buildYear } : {}),
    ...(n.portName ? { portName: n.portName } : {}),
    ...(n.lengthMeters ? { lengthMeters: n.lengthMeters } : {}),
    ...(n.beamMeters ? { beamMeters: n.beamMeters } : {}),
    ...(n.speedKnots ? { speedKnots: n.speedKnots } : {}),
    ...(n.cabinCount ? { cabinCount: n.cabinCount } : {}),
    ...(n.bathroomCount ? { bathroomCount: n.bathroomCount } : {}),
    ...(n.passengerCount ? { passengerCount: n.passengerCount } : {}),
    ...(n.airConditioning ? { airConditioning: n.airConditioning } : {}),
    ...(n.crewCount ? { crewCount: n.crewCount } : {}),
    ...(n.generator ? { generator: n.generator } : {}),
    ...(n.fuelPolicy ? { fuelPolicy: n.fuelPolicy } : {}),
  }
}

function fallbackFromListingMeta(opts?: ParseYachtCharterSpecsOpts): NormalizedYachtTechnical {
  const out: NormalizedYachtTechnical = {}
  if (opts?.maxGuests && opts.maxGuests > 0) out.passengerCount = String(opts.maxGuests)
  if (opts?.roomCount && opts.roomCount > 0) out.cabinCount = String(opts.roomCount)
  if (opts?.bathCount && opts.bathCount > 0) out.bathroomCount = String(opts.bathCount)
  if (opts?.locationLabel?.trim()) out.portName = opts.locationLabel.trim()
  return out
}

/** Panel `listing_yacht_details` + `vertical_yacht_extra` + meta → vitrin teknik özellikler. */
export function parseYachtCharterSpecs(
  verticalYacht: Record<string, string> | null | undefined,
  yachtExtraMeta: unknown,
  opts?: ParseYachtCharterSpecsOpts,
): YachtCharterSpecs | null {
  const vy = verticalYacht ?? {}
  const extra = unwrapVerticalMetaPayload(yachtExtraMeta)

  const normalized = mergeNormalizedTechnical(
    fallbackFromListingMeta(opts),
    parseDescriptionSpecsBlock(opts?.description),
    normalizeSpecsRecord(opts?.listingMetaSpecs ?? undefined),
    {
      yachtType: safeTrimOrNull(extra.yacht_type as string | undefined) ?? safeTrimOrNull(vy.yacht_type) ?? undefined,
      lengthMeters:
        safeTrimOrNull(vy.length_meters) ??
        safeTrimOrNull(extra.length_meters as string | undefined) ??
        undefined,
      speedKnots:
        safeTrimOrNull(extra.speed_knots as string | undefined) ??
        safeTrimOrNull(vy.speed_knots) ??
        undefined,
      cabinCount:
        safeTrimOrNull(vy.cabin_count) ??
        safeTrimOrNull(extra.cabin_count as string | undefined) ??
        undefined,
      bathroomCount: safeTrimOrNull(extra.bathroom_count as string | undefined) ?? undefined,
      passengerCount: safeTrimOrNull(extra.passenger_count as string | undefined) ?? undefined,
    },
    normalizedFromYachtExtra(extra),
  )

  const base = specsFromNormalized(normalized)
  const captainIncluded = readCaptain(
    safeTrimOrNull(extra.captain_included as string | undefined) ?? safeTrimOrNull(vy.captain_included),
  )
  const portLat = safeTrimOrNull(vy.port_lat) ?? undefined
  const portLng = safeTrimOrNull(vy.port_lng) ?? undefined
  const includes = readStringList(extra.includes)
  const excludes = readStringList(extra.excludes)

  const merged: YachtCharterSpecs = {
    ...base,
    ...(captainIncluded ? { captainIncluded } : {}),
    ...(portLat ? { portLat } : {}),
    ...(portLng ? { portLng } : {}),
    includes,
    excludes,
  }

  const hasGridField = yachtCharterSpecsHasGridFields(merged)
  if (!hasGridField && includes.length === 0 && excludes.length === 0) return null
  return merged
}

export function yachtCharterSpecsHasGridFields(specs: YachtCharterSpecs): boolean {
  return Boolean(
    specs.boatCode ||
      specs.yachtType ||
      specs.buildYear ||
      specs.portName ||
      specs.lengthMeters ||
      specs.beamMeters ||
      specs.speedKnots ||
      specs.cabinCount ||
      specs.bathroomCount ||
      specs.passengerCount ||
      specs.airConditioning ||
      specs.crewCount ||
      specs.generator ||
      specs.captainIncluded ||
      specs.fuelPolicy ||
      (specs.portLat && specs.portLng),
  )
}
