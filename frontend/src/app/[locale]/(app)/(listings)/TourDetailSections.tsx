import ListingDescriptionExpandable, { HTML_PREVIEW_MAX_TOUR } from '@/components/listing/ListingDescriptionExpandable'
import { LISTING_DETAIL_SECTION_GAP_Y, LISTING_SECTION_STACKED } from '@/app/[locale]/(app)/(listings)/listing-section-classes'
import { Divider } from '@/shared/divider'
import { Fragment, type ReactNode } from 'react'
import {
  Bus,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  Info,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export type TourItineraryDay = {
  day: number
  title: string
  description: string
  /** Gezinomi / zengin program metni — sanitize edilmiş HTML */
  descriptionHtml?: string
}

export type TourOverviewItem = {
  label: string
  value: string
  icon: 'duration' | 'group' | 'transport' | 'guide' | 'visa' | 'language' | 'location'
}

export type TourSectionNavItem = {
  id: string
  label: string
  eyebrow?: string
}

const ICONS: Record<TourOverviewItem['icon'], typeof Clock3> = {
  duration: Clock3,
  group: Users,
  transport: Bus,
  guide: ShieldCheck,
  visa: FileText,
  language: Globe2,
  location: MapPin,
}

export function TourSectionNav({
  items,
  locale = 'tr',
}: {
  items: TourSectionNavItem[]
  locale?: string
}) {
  if (items.length < 2) return null
  const td = getMessages(locale).listing.tourDetail

  return (
    <nav aria-label={td.sectionNavAriaLabel} className="-mx-1 overflow-x-auto px-1">
      <div className="flex min-w-max items-center gap-2 rounded-full border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="group rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            {item.label}
            {item.eyebrow ? (
              <span className="ml-2 text-xs font-normal text-neutral-400 group-hover:text-neutral-500 dark:text-neutral-500">
                {item.eyebrow}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </nav>
  )
}

export type TourInfoSection = {
  id: string
  title: string
  html: string
}

export function TourOverviewSection({
  items,
  programHtml,
  locale = 'tr',
}: {
  items: TourOverviewItem[]
  programHtml?: string
  locale?: string
}) {
  if (items.length === 0 && !programHtml?.trim()) return null
  const td = getMessages(locale).listing.tourDetail

  return (
    <section id="tour-section-about" className={LISTING_SECTION_STACKED}>
      <SectionHeading>{td.aboutTitle}</SectionHeading>
      <Divider className="w-14!" />
      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <div
                key={`${item.label}:${item.value}`}
                className="flex gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      {programHtml?.trim() && locale ? (
        <ListingDescriptionExpandable locale={locale} html={programHtml} />
      ) : null}
    </section>
  )
}

export function TourInfoSections({
  sections,
  insertAfterSectionId,
  insertNode,
  locale = 'tr',
}: {
  sections: TourInfoSection[]
  /** Örn. `tour-section-flights-info` sonrası uçuş tablosu */
  insertAfterSectionId?: string
  insertNode?: ReactNode
  locale?: string
}) {
  if (sections.length === 0) {
    return insertNode ?? null
  }

  const nodes: ReactNode[] = []
  let inserted = false

  for (const section of sections) {
    nodes.push(
      <section key={section.id} id={section.id} className={LISTING_SECTION_STACKED}>
        <SectionHeading>{section.title}</SectionHeading>
        <Divider className="w-14!" />
        <ListingDescriptionExpandable locale={locale} html={section.html} previewMax={HTML_PREVIEW_MAX_TOUR} />
      </section>,
    )
    if (insertAfterSectionId === section.id && insertNode) {
      nodes.push(<Fragment key="tour-insert-after-info">{insertNode}</Fragment>)
      inserted = true
    }
  }

  if (insertNode && insertAfterSectionId && !inserted && !sections.some((s) => s.id === insertAfterSectionId)) {
    nodes.push(<Fragment key="tour-insert-fallback">{insertNode}</Fragment>)
  }

  return <div id="tour-section-extra-info" className={`flex flex-col ${LISTING_DETAIL_SECTION_GAP_Y}`}>{nodes}</div>
}

export function TourItinerarySection({
  days,
  locale = 'tr',
}: {
  days: TourItineraryDay[]
  locale?: string
}) {
  const visibleDays = days.filter((d) => d.title.trim() || d.description.trim())
  if (visibleDays.length === 0) return null
  const td = getMessages(locale).listing.tourDetail

  return (
    <section id="tour-section-program" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{td.programTitle}</SectionHeading>
        <SectionSubheading>{td.programSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="space-y-4">
        {visibleDays.map((day) => (
          <article key={`${day.day}:${day.title}`} className="relative rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                {day.day}
              </span>
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {day.title.trim() ||
                    interpolate(td.itineraryDayFallback, { day: String(day.day) })}
                </h3>
                {day.descriptionHtml?.trim() ? (
                  <div
                    className="prose prose-sm mt-2 max-w-none leading-relaxed text-neutral-600 dark:prose-invert dark:text-neutral-300 [&_p]:my-2 [&_p:first-child]:mt-0"
                    dangerouslySetInnerHTML={{ __html: day.descriptionHtml.trim() }}
                  />
                ) : day.description.trim() ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-neutral-600 dark:text-neutral-300">
                    {day.description.trim()}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function TourIncludedExcludedSection({
  included,
  excluded,
  locale = 'tr',
}: {
  included: string[]
  excluded: string[]
  locale?: string
}) {
  if (included.length === 0 && excluded.length === 0) return null
  const td = getMessages(locale).listing.tourDetail

  return (
    <section id="tour-section-services" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{td.includedExcludedTitle}</SectionHeading>
        <SectionSubheading>{td.includedExcludedSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-4 md:grid-cols-2">
        <TourBulletCard
          tone="included"
          title={td.includedTitle}
          items={included}
          empty={td.includedEmpty}
        />
        <TourBulletCard
          tone="excluded"
          title={td.excludedTitle}
          items={excluded}
          empty={td.excludedEmpty}
        />
      </div>
    </section>
  )
}

export function TourNotesSection({
  notes,
  locale = 'tr',
}: {
  notes: string[]
  locale?: string
}) {
  const visibleNotes = notes.filter((n) => n.trim())
  if (visibleNotes.length === 0) return null
  const td = getMessages(locale).listing.tourDetail

  return (
    <section id="tour-section-notes" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{td.importantNotesTitle}</SectionHeading>
        <SectionSubheading>{td.importantNotesSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="space-y-3">
        {visibleNotes.map((note, index) => (
          <div
            key={`${index}:${note}`}
            className="flex gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" aria-hidden />
            <span>{note}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function TourBulletCard({
  title,
  items,
  empty,
  tone,
}: {
  title: string
  items: string[]
  empty: string
  tone: 'included' | 'excluded'
}) {
  const isIncluded = tone === 'included'
  const Icon = isIncluded ? CheckCircle2 : XCircle

  return (
    <div
      className={
        isIncluded
          ? 'rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20'
          : 'rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/50 dark:bg-amber-950/20'
      }
    >
      <h3
        className={
          isIncluded
            ? 'text-sm font-semibold text-emerald-800 dark:text-emerald-200'
            : 'text-sm font-semibold text-amber-900 dark:text-amber-200'
        }
      >
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${isIncluded ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-400 dark:text-neutral-500">{empty}</p>
      )}
    </div>
  )
}

export function TourDeparturePointsSection({
  points,
  locale = 'tr',
}: {
  points: Array<{ id: string; city: string; address: string }>
  locale?: string
}) {
  if (points.length === 0) return null
  const td = getMessages(locale).listing.tourDetail

  return (
    <section id="tour-section-departures" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{td.departurePointsTitle}</SectionHeading>
        <SectionSubheading>{td.departurePointsSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <ul className="space-y-3">
        {points.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
          >
            {p.city ? (
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.city}</p>
            ) : null}
            {p.address ? (
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{p.address}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function TourPeriodTimesSection({
  labels,
  locale = 'tr',
}: {
  labels: string[]
  locale?: string
}) {
  if (labels.length === 0) return null
  const td = getMessages(locale).listing.tourDetail

  return (
    <section id="tour-section-period-times" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{td.periodTimesTitle}</SectionHeading>
        <SectionSubheading>{td.periodTimesSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <span
            key={label}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200"
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
