import type { CruiseVerticalMeta } from '@/lib/cruise-meta'
import { LISTING_SECTION_STACKED } from './listing-section-classes'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { formatCruisePlaceName } from '@/lib/cruise-route-display'
import { Anchor, Ship, Sparkles } from 'lucide-react'

export default function CruiseShipDetailsSection({
  meta,
  locale = 'tr',
}: {
  meta: CruiseVerticalMeta | null
  locale?: string
}) {
  if (!meta) return null

  const cd = getMessages(locale).listing.cruiseDetail
  const specs = (meta.ship_specs ?? []).filter(Boolean)
  const activities = (meta.ship_activities ?? []).filter(Boolean)
  const visits = (meta.visits ?? []).filter(Boolean)
  const shipImage = meta.ship_image_url?.trim()
  const deckPlan = meta.deck_plan_image_url?.trim()

  const hasContent =
    specs.length > 0 || activities.length > 0 || visits.length > 0 || Boolean(shipImage) || Boolean(deckPlan)
  if (!hasContent) return null

  return (
    <section id="cruise-ship-details" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{cd.shipDetailsTitle}</SectionHeading>
        <SectionSubheading>{cd.shipDetailsSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />

      {shipImage ? (
        <figure className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <img
            src={shipImage}
            alt={meta.ship_name?.trim() || cd.ship}
            className="h-auto max-h-80 w-full object-cover"
            loading="lazy"
          />
        </figure>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {specs.length > 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
            <div className="mb-3 flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{cd.shipSpecsTitle}</h3>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {specs.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {activities.length > 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {cd.shipActivitiesTitle}
              </h3>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {activities.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {visits.length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="mb-3 flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{cd.visitsTitle}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {visits.map((visit) => (
              <span
                key={visit}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
              >
                {formatCruisePlaceName(visit)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {deckPlan ? (
        <figure className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <figcaption className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200">
            {cd.deckPlanTitle}
          </figcaption>
          <img src={deckPlan} alt={cd.deckPlanTitle} className="h-auto w-full bg-white" loading="lazy" />
        </figure>
      ) : null}
    </section>
  )
}
