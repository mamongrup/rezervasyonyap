import { listExternalReviewSnapshots } from '@/lib/travel-api'

export type ReviewCriterionKey =
  | 'location'
  | 'sleep_quality'
  | 'rooms'
  | 'service'
  | 'value'
  | 'cleanliness'

export type ListingReviewCriterion = {
  key: ReviewCriterionKey
  score: number
}

export type ReviewTravelerTypeKey = 'business' | 'couple' | 'solo' | 'family' | 'friends'

export type ListingReviewTravelerType = {
  key: ReviewTravelerTypeKey
  count: number
}

export type ListingReviewCriteriaSummary = {
  overallScore: number
  overallLabel?: string | null
  criteria: ListingReviewCriterion[]
  travelerTypes?: ListingReviewTravelerType[]
  totalReviewCount?: number | null
  reviewSource?: string | null
}

const CRITERION_KEYS: ReviewCriterionKey[] = [
  'location',
  'sleep_quality',
  'rooms',
  'service',
  'value',
  'cleanliness',
]

const TRAVELER_TYPE_KEYS: ReviewTravelerTypeKey[] = [
  'business',
  'couple',
  'solo',
  'family',
  'friends',
]

function clampScore(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(5, Math.max(0, n))
}

function clampCount(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function parseTravelerTypesObject(raw: unknown): ListingReviewTravelerType[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const out: ListingReviewTravelerType[] = []
  for (const key of TRAVELER_TYPE_KEYS) {
    const count = clampCount(obj[key])
    if (count != null && count > 0) out.push({ key, count })
  }
  return out
}

function parseCriteriaObject(raw: unknown): ListingReviewCriterion[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const out: ListingReviewCriterion[] = []
  for (const key of CRITERION_KEYS) {
    const score = clampScore(obj[key])
    if (score != null) out.push({ key, score })
  }
  return out
}

export function parseListingReviewCriteriaSummary(raw: unknown): ListingReviewCriteriaSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const overallScore =
    clampScore(o.overall_score ?? o.overallScore ?? o.rating) ??
    clampScore(o.average_rating)
  const criteriaFromArray = Array.isArray(o.criteria)
    ? o.criteria
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const key = String(row.key ?? row.code ?? '').trim() as ReviewCriterionKey
          const score = clampScore(row.score ?? row.rating ?? row.value)
          if (!CRITERION_KEYS.includes(key) || score == null) return null
          return { key, score }
        })
        .filter((item): item is ListingReviewCriterion => item != null)
    : []
  const criteria = criteriaFromArray.length > 0 ? criteriaFromArray : parseCriteriaObject(o.criteria ?? o)
  if (criteria.length === 0) return null

  const computedOverall =
    overallScore ??
    criteria.reduce((sum, item) => sum + item.score, 0) / Math.max(criteria.length, 1)

  const overallLabel =
    typeof o.overall_label === 'string'
      ? o.overall_label
      : typeof o.overallLabel === 'string'
        ? o.overallLabel
        : null

  const travelerTypesRaw = o.traveler_types ?? o.travelerTypes
  const travelerTypesFromArray = Array.isArray(travelerTypesRaw)
    ? travelerTypesRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          const key = String(row.key ?? row.code ?? '').trim() as ReviewTravelerTypeKey
          const count = clampCount(row.count ?? row.reviews ?? row.value)
          if (!TRAVELER_TYPE_KEYS.includes(key) || count == null || count <= 0) return null
          return { key, count }
        })
        .filter((item): item is ListingReviewTravelerType => item != null)
    : []
  const travelerTypes =
    travelerTypesFromArray.length > 0
      ? travelerTypesFromArray
      : parseTravelerTypesObject(o.traveler_types ?? o.travelerTypes)

  const totalReviewCount = clampCount(
    o.total_review_count ?? o.totalReviewCount ?? o.review_count ?? o.reviewCount,
  )
  const reviewSource =
    typeof o.review_source === 'string'
      ? o.review_source
      : typeof o.reviewSource === 'string'
        ? o.reviewSource
        : typeof o.source === 'string'
          ? o.source
          : null

  return {
    overallScore: computedOverall,
    overallLabel,
    criteria,
    ...(travelerTypes.length > 0 ? { travelerTypes } : {}),
    ...(totalReviewCount != null ? { totalReviewCount } : {}),
    ...(reviewSource ? { reviewSource } : {}),
  }
}

export async function fetchListingReviewCriteriaSummarySafe(
  listingId: string,
): Promise<ListingReviewCriteriaSummary | null> {
  try {
    const { snapshots } = await listExternalReviewSnapshots({
      entity_type: 'listing',
      entity_id: listingId,
    })
    for (const snap of snapshots) {
      try {
        const parsed = parseListingReviewCriteriaSummary(JSON.parse(snap.snapshot_json || '{}'))
        if (parsed) {
          return {
            ...parsed,
            reviewSource: parsed.reviewSource ?? snap.source?.trim() ?? null,
          }
        }
      } catch {
        /* invalid snapshot */
      }
    }
  } catch {
    /* API unavailable */
  }
  return null
}

export function reviewOverallLabelFromScore(
  score: number,
  labels: { excellent: string; veryGood: string; good: string; fair: string },
): string {
  if (score >= 4.5) return labels.excellent
  if (score >= 4.0) return labels.veryGood
  if (score >= 3.5) return labels.good
  return labels.fair
}
