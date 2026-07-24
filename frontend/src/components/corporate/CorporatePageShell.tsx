import Image from 'next/image'
import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  heroSrc?: string
  heroAlt?: string
  updatedLabel?: string
  children: ReactNode
}

/** Yasal / kurumsal sayfa kabuğu — hero görsel + okunaklı tipografi */
export default function CorporatePageShell({
  title,
  subtitle,
  heroSrc,
  heroAlt = '',
  updatedLabel = 'Son güncelleme: Temmuz 2026',
  children,
}: Props) {
  return (
    <div className="bg-white dark:bg-neutral-950">
      {heroSrc ? (
        <div className="relative h-48 w-full overflow-hidden sm:h-64 lg:h-72">
          <Image
            src={heroSrc}
            alt={heroAlt}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 container pb-8">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{subtitle}</p> : null}
          </div>
        </div>
      ) : (
        <div className="container max-w-3xl pt-16 lg:pt-24">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-neutral-600 dark:text-neutral-400">{subtitle}</p> : null}
        </div>
      )}

      <div className="container max-w-3xl py-12 lg:py-16">
        <p className="mb-8 text-xs font-medium tracking-wide text-neutral-400 uppercase">{updatedLabel}</p>
        <div className="prose prose-neutral max-w-none prose-headings:scroll-mt-28 prose-a:text-primary-600 dark:prose-invert dark:prose-a:text-primary-400">
          {children}
        </div>
      </div>
    </div>
  )
}
