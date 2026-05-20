import { Divider } from '@/shared/divider'
import { Clock3, Languages, MapPin, PackageCheck, Users } from 'lucide-react'
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
  description,
}: {
  items: ActivityOverviewItem[]
  description?: React.ReactNode
}) {
  if (items.length === 0 && !description) return null

  return (
    <section className="listingSection__wrap">
      <div>
        <SectionHeading>Aktivite Hakkında</SectionHeading>
        <SectionSubheading>Süre, buluşma noktası ve katılım bilgileri.</SectionSubheading>
      </div>
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
      {description ? <div className="prose prose-neutral mt-5 max-w-none dark:prose-invert">{description}</div> : null}
    </section>
  )
}
