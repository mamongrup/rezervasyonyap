import { LISTING_SECTION_STACKED } from '@/app/[locale]/(app)/(listings)/listing-section-classes'
import { Divider } from '@/shared/divider'
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Clock3, Languages, MapPin, PackageCheck, Users } from 'lucide-react'
import { getMessages } from '@/utils/getT'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export type ActivityOverviewItem = {
  label: string
  value: string
  icon: 'duration' | 'age' | 'capacity' | 'language' | 'meeting' | 'equipment'
}

const ICONS: Record<ActivityOverviewItem['icon'], typeof Clock3> = {
  duration: Clock3,
  age: Users,
  capacity: Users,
  language: Languages,
  meeting: MapPin,
  equipment: PackageCheck,
}

export default function ActivityOverviewSection({
  items,
  locale = 'tr',
}: {
  items: ActivityOverviewItem[]
  locale?: string
}) {
  if (items.length === 0) return null
  const ad = getMessages(locale).listing.activityDetail

  return (
    <section className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.aboutTitle}</SectionHeading>
        <SectionSubheading>{ad.aboutSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
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
    </section>
  )
}

export function ActivityDescriptionSection({
  children,
  locale = 'tr',
}: {
  children?: React.ReactNode
  locale?: string
}) {
  if (!children) return null
  const ad = getMessages(locale).listing.activityDetail

  return (
    <section id="activity-section-description" className={LISTING_SECTION_STACKED}>
      <SectionHeading>{ad.descriptionTitle}</SectionHeading>
      <Divider className="w-14!" />
      <div className="prose prose-neutral max-w-none dark:prose-invert">{children}</div>
    </section>
  )
}

export function ActivityRulesSection({
  rules,
  locale = 'tr',
}: {
  rules: string[]
  locale?: string
}) {
  const visibleRules = rules.map((r) => r.trim()).filter(Boolean)
  const ad = getMessages(locale).listing.activityDetail
  const rulesToShow = visibleRules.length > 0 ? visibleRules : (ad.defaultRules ?? [])
  if (rulesToShow.length === 0) return null

  return (
    <section id="activity-section-rules" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.rulesTitle}</SectionHeading>
        <SectionSubheading>{ad.rulesSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-3 sm:grid-cols-2">
        {rulesToShow.map((rule, index) => (
          <div
            key={`${index}:${rule}`}
            className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
              strokeWidth={1.75}
            />
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
