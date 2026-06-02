import ListingDescriptionExpandable from '@/components/listing/ListingDescriptionExpandable'
import { LISTING_SECTION_STACKED } from '@/app/[locale]/(app)/(listings)/listing-section-classes'
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
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export type TourItineraryDay = {
  day: number
  title: string
  description: string
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

export function TourSectionNav({ items }: { items: TourSectionNavItem[] }) {
  if (items.length < 2) return null

  return (
    <nav aria-label="Tur bölümleri" className="-mx-1 overflow-x-auto px-1">
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
  locale,
}: {
  items: TourOverviewItem[]
  programHtml?: string
  locale?: string
}) {
  if (items.length === 0 && !programHtml?.trim()) return null

  return (
    <section id="tour-section-about" className={LISTING_SECTION_STACKED}>
      <SectionHeading>Tur Hakkında</SectionHeading>
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
}: {
  sections: TourInfoSection[]
  /** Örn. `tour-section-flights-info` sonrası uçuş tablosu */
  insertAfterSectionId?: string
  insertNode?: ReactNode
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
        <div dangerouslySetInnerHTML={{ __html: section.html }} />
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

  return <>{nodes}</>
}

export function TourItinerarySection({ days }: { days: TourItineraryDay[] }) {
  const visibleDays = days.filter((d) => d.title.trim() || d.description.trim())
  if (visibleDays.length === 0) return null

  return (
    <section id="tour-section-program" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>Tur Programı</SectionHeading>
        <SectionSubheading>Gün gün gezi akışı ve önemli duraklar.</SectionSubheading>
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
                  {day.title.trim() || `${day.day}. Gün`}
                </h3>
                {day.description.trim() ? (
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
}: {
  included: string[]
  excluded: string[]
}) {
  if (included.length === 0 && excluded.length === 0) return null

  return (
    <section id="tour-section-services" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>Dahil Olan / Olmayan Hizmetler</SectionHeading>
        <SectionSubheading>Tur paketinin kapsamını hızlıca karşılaştırın.</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-4 md:grid-cols-2">
        <TourBulletCard
          tone="included"
          title="Fiyata Dahil"
          items={included}
          empty="Dahil hizmet bilgisi eklenmemiş."
        />
        <TourBulletCard
          tone="excluded"
          title="Fiyata Dahil Değil"
          items={excluded}
          empty="Hariç hizmet bilgisi eklenmemiş."
        />
      </div>
    </section>
  )
}

export function TourNotesSection({ notes }: { notes: string[] }) {
  const visibleNotes = notes.filter((n) => n.trim())
  if (visibleNotes.length === 0) return null

  return (
    <section id="tour-section-notes" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>Önemli Notlar</SectionHeading>
        <SectionSubheading>Rezervasyon öncesi bilinmesi gereken koşullar.</SectionSubheading>
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
  const Icon = tone === 'included' ? CheckCircle2 : XCircle
  const color =
    tone === 'included'
      ? 'text-emerald-600 dark:text-emerald-300'
      : 'text-amber-600 dark:text-amber-300'

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-neutral-400 dark:text-neutral-500">{empty}</p>
      )}
    </div>
  )
}
