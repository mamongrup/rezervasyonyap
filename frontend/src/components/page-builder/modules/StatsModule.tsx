import { Users, LayoutGrid, Globe, Star } from 'lucide-react'

interface StatItem {
  value: string
  label: string
  /** Geriye dönük uyumluluk için */
  emoji?: string
}

interface StatsConfig {
  title?: string
  items?: StatItem[]
}

const DEFAULT_STATS: StatItem[] = [
  { value: '50.000+', label: 'Mutlu Müşteri' },
  { value: '5.000+',  label: 'Aktif İlan'    },
  { value: '300+',    label: 'Destinasyon'   },
  { value: '4.9/5',   label: 'Ortalama Puan' },
]

const DEFAULT_ICONS = [
  { Icon: Users,      color: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' },
  { Icon: LayoutGrid, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'     },
  { Icon: Globe,      color: 'bg-sky-50 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400'                 },
  { Icon: Star,       color: 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400'         },
]

export default function StatsModule({ config }: { config: StatsConfig }) {
  const items = config.items ?? DEFAULT_STATS
  const isDefault = !config.items

  return (
    <section className="rounded-3xl bg-neutral-50 px-8 py-12 dark:bg-neutral-800">
      {config.title && (
        <h2 className="mb-10 text-center text-2xl font-bold text-neutral-900 dark:text-white">
          {config.title}
        </h2>
      )}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {items.map((stat, i) => {
          const def = DEFAULT_ICONS[i % DEFAULT_ICONS.length]
          return (
            <div key={i} className="flex flex-col items-center gap-3 text-center">
              {isDefault ? (
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${def.color}`}>
                  <def.Icon className="h-6 w-6" />
                </div>
              ) : stat.emoji ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-700">
                  <span className="text-2xl leading-none">{stat.emoji}</span>
                </div>
              ) : null}
              <div>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{stat.value}</div>
                <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
