import type {
  ListingReviewCriteriaSummary,
  ReviewCriterionKey,
  ReviewTravelerTypeKey,
} from '@/lib/listing-review-criteria'
import { reviewOverallLabelFromScore } from '@/lib/listing-review-criteria'
import { getMessages } from '@/utils/getT'
import { Briefcase, Heart, User, Users, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'

const CRITERION_LABEL_KEYS: Record<
  ReviewCriterionKey,
  'location' | 'sleepQuality' | 'rooms' | 'service' | 'value' | 'cleanliness'
> = {
  location: 'location',
  sleep_quality: 'sleepQuality',
  rooms: 'rooms',
  service: 'service',
  value: 'value',
  cleanliness: 'cleanliness',
}

const TRAVELER_TYPE_LABEL_KEYS: Record<
  ReviewTravelerTypeKey,
  'business' | 'couple' | 'solo' | 'family' | 'friends'
> = {
  business: 'business',
  couple: 'couple',
  solo: 'solo',
  family: 'family',
  friends: 'friends',
}

const TRAVELER_TYPE_ICONS: Record<ReviewTravelerTypeKey, ReactNode> = {
  business: <Briefcase className="h-4 w-4" aria-hidden />,
  couple: <Heart className="h-4 w-4" aria-hidden />,
  solo: <User className="h-4 w-4" aria-hidden />,
  family: <Users className="h-4 w-4" aria-hidden />,
  friends: <UsersRound className="h-4 w-4" aria-hidden />,
}

export default function ListingReviewCriteriaSummaryPanel({
  summary,
  locale = 'tr',
}: {
  summary: ListingReviewCriteriaSummary
  locale?: string
}) {
  const T = getMessages(locale).reviews
  const TEn = getMessages('en').reviews
  const criteriaLabels = T.criteria ?? TEn.criteria ?? {}
  const criteriaLabelsEn = TEn.criteria ?? {}
  const travelerLabels = criteriaLabels.travelerTypes ?? criteriaLabelsEn.travelerTypes ?? {}

  const overallLabel =
    summary.overallLabel?.trim() ||
    reviewOverallLabelFromScore(summary.overallScore, {
      excellent: criteriaLabels.overallExcellent ?? criteriaLabelsEn.overallExcellent ?? 'Excellent',
      veryGood: criteriaLabels.overallVeryGood ?? criteriaLabelsEn.overallVeryGood ?? 'Very good',
      good: criteriaLabels.overallGood ?? criteriaLabelsEn.overallGood ?? 'Good',
      fair: criteriaLabels.overallFair ?? criteriaLabelsEn.overallFair ?? 'Fair',
    })

  const travelerTypes = summary.travelerTypes ?? []
  const hasTravelerColumn = travelerTypes.length > 0

  function criterionLabel(key: ReviewCriterionKey): string {
    const labelKey = CRITERION_LABEL_KEYS[key]
    return (
      (criteriaLabels[labelKey] as string | undefined) ??
      (criteriaLabelsEn[labelKey] as string | undefined) ??
      key
    )
  }

  function travelerLabel(key: ReviewTravelerTypeKey): string {
    const labelKey = TRAVELER_TYPE_LABEL_KEYS[key]
    return (
      (travelerLabels[labelKey] as string | undefined) ??
      (criteriaLabelsEn.travelerTypes?.[labelKey] as string | undefined) ??
      key
    )
  }

  return (
    <div
      className={
        hasTravelerColumn
          ? 'grid gap-6 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-5 sm:p-6 xl:grid-cols-[minmax(140px,180px)_1fr_minmax(190px,220px)] dark:border-neutral-800 dark:bg-neutral-900/40'
          : 'grid gap-6 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-5 sm:p-6 lg:grid-cols-[minmax(140px,180px)_1fr] dark:border-neutral-800 dark:bg-neutral-900/40'
      }
    >
      <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-100 bg-white px-4 py-5 text-center dark:border-neutral-800 dark:bg-neutral-900/60 lg:items-start lg:text-start">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {criteriaLabels.overallTitle ?? criteriaLabelsEn.overallTitle ?? 'Overall rating'}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-neutral-900 dark:text-white">
          {summary.overallScore.toFixed(1)}
        </p>
        <p className="mt-1 text-sm font-medium text-primary-700 dark:text-primary-300">{overallLabel}</p>
        {summary.totalReviewCount != null && summary.totalReviewCount > 0 ? (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {(criteriaLabels.totalReviews ?? criteriaLabelsEn.totalReviews ?? '{count} reviews').replace(
              '{count}',
              String(summary.totalReviewCount),
            )}
          </p>
        ) : null}
      </div>

      <div className="space-y-3.5">
        {summary.criteria.map((item) => (
          <div key={item.key}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">{criterionLabel(item.key)}</span>
              <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">
                {item.score.toFixed(1)}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-700"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-primary-700 dark:bg-primary-500"
                style={{ width: `${Math.min(100, (item.score / 5) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {hasTravelerColumn ? (
        <div className="rounded-xl border border-neutral-100 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900/60">
          <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {travelerLabels.title ?? criteriaLabelsEn.travelerTypes?.title ?? 'Traveler type'}
          </p>
          <ul className="space-y-2.5">
            {travelerTypes.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <span className="text-neutral-400 dark:text-neutral-500">
                    {TRAVELER_TYPE_ICONS[item.key]}
                  </span>
                  <span className="truncate">{travelerLabel(item.key)}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
