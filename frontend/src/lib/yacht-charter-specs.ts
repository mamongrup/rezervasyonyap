import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import { safeTrimOrNull } from '@/lib/safe-string'

export type YachtCharterSpecs = {
  yachtType?: string
  lengthMeters?: string
  speedKnots?: string
  cabinCount?: string
  bathroomCount?: string
  passengerCount?: string
  captainIncluded?: 'yes' | 'no' | 'optional'
  fuelPolicy?: string
  portLat?: string
  portLng?: string
  includes: string[]
  excludes: string[]
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

/** Panel `listing_yacht_details` + `vertical_yacht_extra` meta → vitrin teknik özellikler. */
export function parseYachtCharterSpecs(
  verticalYacht: Record<string, string> | null | undefined,
  yachtExtraMeta: unknown,
): YachtCharterSpecs | null {
  const vy = verticalYacht ?? {}
  const extra = unwrapVerticalMetaPayload(yachtExtraMeta)

  const yachtType =
    safeTrimOrNull(extra.yacht_type as string | undefined) ??
    safeTrimOrNull(vy.yacht_type) ??
    undefined
  const lengthMeters =
    safeTrimOrNull(vy.length_meters) ?? safeTrimOrNull(extra.length_meters as string | undefined) ?? undefined
  const speedKnots =
    safeTrimOrNull(extra.speed_knots as string | undefined) ??
    safeTrimOrNull(vy.speed_knots) ??
    undefined
  const cabinCount =
    safeTrimOrNull(vy.cabin_count) ?? safeTrimOrNull(extra.cabin_count as string | undefined) ?? undefined
  const bathroomCount = safeTrimOrNull(extra.bathroom_count as string | undefined) ?? undefined
  const passengerCount = safeTrimOrNull(extra.passenger_count as string | undefined) ?? undefined
  const captainIncluded = readCaptain(
    safeTrimOrNull(extra.captain_included as string | undefined) ?? safeTrimOrNull(vy.captain_included),
  )
  const fuelPolicy =
    safeTrimOrNull(extra.fuel_policy as string | undefined) ??
    safeTrimOrNull(vy.fuel_policy) ??
    undefined
  const portLat = safeTrimOrNull(vy.port_lat) ?? undefined
  const portLng = safeTrimOrNull(vy.port_lng) ?? undefined
  const includes = readStringList(extra.includes)
  const excludes = readStringList(extra.excludes)

  const hasGridField = Boolean(
    yachtType ||
      lengthMeters ||
      speedKnots ||
      cabinCount ||
      bathroomCount ||
      passengerCount ||
      captainIncluded ||
      fuelPolicy ||
      (portLat && portLng),
  )

  if (!hasGridField && includes.length === 0 && excludes.length === 0) return null

  return {
    ...(yachtType ? { yachtType } : {}),
    ...(lengthMeters ? { lengthMeters } : {}),
    ...(speedKnots ? { speedKnots } : {}),
    ...(cabinCount ? { cabinCount } : {}),
    ...(bathroomCount ? { bathroomCount } : {}),
    ...(passengerCount ? { passengerCount } : {}),
    ...(captainIncluded ? { captainIncluded } : {}),
    ...(fuelPolicy ? { fuelPolicy } : {}),
    ...(portLat ? { portLat } : {}),
    ...(portLng ? { portLng } : {}),
    includes,
    excludes,
  }
}

export function yachtCharterSpecsHasGridFields(specs: YachtCharterSpecs): boolean {
  return Boolean(
    specs.yachtType ||
      specs.lengthMeters ||
      specs.speedKnots ||
      specs.cabinCount ||
      specs.bathroomCount ||
      specs.passengerCount ||
      specs.captainIncluded ||
      specs.fuelPolicy ||
      (specs.portLat && specs.portLng),
  )
}
