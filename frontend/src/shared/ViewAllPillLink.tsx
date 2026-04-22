import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

/** Üst rozet (`bg-primary-50` …) ile aynı görsel dil — vitrin «Tümünü gör» CTA’ları. */
export const viewAllPillClassName =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800'

export function ViewAllPillLink({
  href,
  children,
  className = '',
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={`${viewAllPillClassName} ${className}`.trim()}>
      {children}
      <HugeiconsIcon icon={ArrowRight02Icon} className="size-4 shrink-0 rtl:rotate-180" strokeWidth={1.75} />
    </Link>
  )
}
