import type { FooterTrustBadge } from '@/types/footer-site-config'

type Props = {
  badge: FooterTrustBadge
  locale: string
}

export function Footer2TrustBadge({ badge, locale }: Props) {
  const en = locale === 'en'
  const title = en ? badge.titleEn : badge.titleTr
  const subtitle = en ? badge.subtitleEn : badge.subtitleTr

  if (badge.variant === 'green') {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-green-200/60 bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-green-800/40 dark:from-green-950/40 dark:to-emerald-950/30">
        <div className="absolute inset-0 bg-gradient-to-r from-green-400/5 to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-200 dark:shadow-green-900/50">
            <svg className="size-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide text-green-800 dark:text-green-300">{title}</p>
            <p className="text-[11px] text-green-700/70 dark:text-green-400/70">{subtitle}</p>
          </div>
        </div>
      </div>
    )
  }

  if (badge.variant === 'blue') {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-blue-800/40 dark:from-blue-950/40 dark:to-indigo-950/30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200 dark:shadow-blue-900/50">
            <svg className="size-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide text-blue-800 dark:text-blue-300">{title}</p>
            <p className="text-[11px] text-blue-700/70 dark:text-blue-400/70">{subtitle}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-amber-800/40 dark:from-amber-950/40 dark:to-yellow-950/30">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 to-transparent" />
      <div className="relative flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 shadow-md shadow-amber-200 dark:shadow-amber-900/50">
          <svg className="size-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-amber-800 dark:text-amber-300">{title}</p>
          <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
