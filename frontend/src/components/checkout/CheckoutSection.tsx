'use client'

import { Divider } from '@/shared/divider'
import type { ReactNode } from 'react'

type Props = {
  step: number
  title: string
  children: ReactNode
  className?: string
}

export default function CheckoutSection({ step, title, children, className = '' }: Props) {
  return (
    <section className={className}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white dark:bg-primary-500">
          {step}
        </span>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      </div>
      <Divider className="my-6 w-14!" />
      <div className="space-y-6">{children}</div>
    </section>
  )
}
