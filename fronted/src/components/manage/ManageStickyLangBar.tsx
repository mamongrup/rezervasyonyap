'use client'

import type { ReactNode } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MANAGE_FORM_CONTAINER_CLASS } from '@/components/manage/ManageFormShell'

export type ManageStickyLangTab = { code: string; label: string; flag: string }

type Props = {
  backHref: string
  titlePrimary: string
  titleSecondary?: string
  locales: readonly ManageStickyLangTab[]
  activeLocale: string
  onActiveLocaleChange: (code: string) => void
  /** Masaüstü: dil pill’leri + sağda (ör. AI çeviri) */
  toolbarRight?: ReactNode
  className?: string
}

export function ManageStickyLangBar({
  backHref,
  titlePrimary,
  titleSecondary,
  locales,
  activeLocale,
  onActiveLocaleChange,
  toolbarRight,
  className,
}: Props) {
  return (
    <div
      className={clsx(
        'sticky top-0 z-20 border-b border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
        className,
      )}
    >
      <div className={clsx(MANAGE_FORM_CONTAINER_CLASS, 'flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6')}>
        <Link
          href={backHref}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{titlePrimary}</p>
          {titleSecondary ? (
            <p className="truncate font-mono text-xs text-neutral-400">{titleSecondary}</p>
          ) : null}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
            {locales.map((loc) => (
              <button
                key={loc.code}
                type="button"
                onClick={() => onActiveLocaleChange(loc.code)}
                className={clsx(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  activeLocale === loc.code
                    ? 'bg-white text-[color:var(--manage-primary)] shadow-sm dark:bg-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                )}
              >
                <span>{loc.flag}</span>
                <span className="hidden lg:inline">{loc.label}</span>
              </button>
            ))}
          </div>
          {toolbarRight}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-neutral-100 px-4 py-2 dark:border-neutral-800 md:hidden">
        <div className="flex gap-1 overflow-x-auto">
          {locales.map((loc) => (
            <button
              key={loc.code}
              type="button"
              onClick={() => onActiveLocaleChange(loc.code)}
              className={clsx(
                'flex shrink-0 items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                activeLocale === loc.code
                  ? 'bg-[color:var(--manage-primary)]/10 text-[color:var(--manage-primary)]'
                  : 'text-neutral-500',
              )}
            >
              {loc.flag} {loc.label}
            </button>
          ))}
        </div>
        {toolbarRight ? <div className="w-full min-w-0 [&_select]:max-w-none">{toolbarRight}</div> : null}
      </div>
    </div>
  )
}
