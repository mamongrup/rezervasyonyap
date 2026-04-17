import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

type FeatureCard = {
  icon?: LucideIcon
  title: string
  description: string
  badge?: 'soon' | 'beta' | 'new'
}

type StatCard = {
  label: string
  value: string
}

type Props = {
  title: string
  description?: string
  icon?: LucideIcon
  badge?: 'soon' | 'beta' | 'new'
  stats?: StatCard[]
  features?: FeatureCard[]
  children?: React.ReactNode
}

const BADGE_STYLES = {
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  beta: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  new: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}
const BADGE_LABEL = { soon: 'Yakında', beta: 'Beta', new: 'Yeni' }

export default function ManagePageStub({
  title,
  description,
  icon: Icon,
  badge,
  stats,
  features = [],
  children,
}: Props) {
  return (
    <div className="min-h-[60vh] p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-8 flex items-start gap-4">
        {Icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]">
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
            {badge ? (
              <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', BADGE_STYLES[badge])}>
                {BADGE_LABEL[badge]}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
          ) : null}
        </div>
      </div>

      {/* İstatistikler */}
      {stats && stats.length > 0 ? (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Çocuk içerik */}
      {children}

      {/* Özellik kartları */}
      {features.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const FIcon = f.icon
            return (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className="flex items-start gap-3">
                  {FIcon ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]">
                      <FIcon className="h-4 w-4" />
                    </div>
                  ) : null}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{f.title}</h3>
                      {f.badge ? (
                        <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-medium', BADGE_STYLES[f.badge])}>
                          {BADGE_LABEL[f.badge]}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{f.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
