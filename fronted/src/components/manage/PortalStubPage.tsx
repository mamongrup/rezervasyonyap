'use client'

import { Construction } from 'lucide-react'
import Link from 'next/link'

interface PortalStubPageProps {
  title: string
  description?: string
  icon?: React.ReactNode
  backPath?: string
  backLabel?: string
  features?: string[]
}

export default function PortalStubPage({
  title,
  description,
  icon,
  backPath,
  backLabel = 'Geri dön',
  features = [],
}: PortalStubPageProps) {
  return (
    <div className="container max-w-2xl py-14">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]">
          {icon ?? <Construction className="h-8 w-8" />}
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-neutral-900 dark:text-white">{title}</h1>

        {description ? (
          <p className="mt-3 max-w-md text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
        ) : (
          <p className="mt-3 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
            Bu bölüm geliştirme aşamasındadır. Yakında kullanıma açılacaktır.
          </p>
        )}

        {features.length > 0 ? (
          <ul className="mt-6 w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-4 text-left dark:border-neutral-700 dark:bg-neutral-900/40">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="mt-0.5 text-emerald-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
        ) : null}

        {backPath ? (
          <Link
            href={backPath}
            className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            ← {backLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
