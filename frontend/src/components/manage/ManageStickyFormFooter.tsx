'use client'

import clsx from 'clsx'
import { MANAGE_FORM_CONTAINER_CLASS } from '@/components/manage/ManageFormShell'

type Props = {
  children: React.ReactNode
  className?: string
  /** `sticky`: üst modal / panel içinde tam genişlik alt çubuk (viewport’a sabitlemez) */
  variant?: 'fixed' | 'sticky'
}

export function ManageStickyFormFooter({ children, className, variant = 'fixed' }: Props) {
  return (
    <div
      className={clsx(
        'z-30 border-t border-neutral-200 bg-white/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/95',
        variant === 'fixed'
          ? 'fixed inset-x-0 bottom-0'
          : 'sticky bottom-0 rounded-b-2xl',
        className,
      )}
    >
      <div
        className={clsx(
          MANAGE_FORM_CONTAINER_CLASS,
          'flex flex-wrap items-center justify-end gap-2 sm:justify-between sm:gap-3',
        )}
      >
        {children}
      </div>
    </div>
  )
}
