'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

const HeroSearchFormMobileDynamic = dynamic(() => import('./HeroSearchFormMobile'), {
  ssr: false,
  loading: () => (
    <div
      className="mx-auto h-10 w-full max-w-lg animate-pulse rounded-full bg-neutral-200/80 dark:bg-neutral-700/80"
      aria-busy="true"
      aria-label="Yükleniyor"
    />
  ),
})

export type HeroSearchFormMobileLazyProps = ComponentProps<typeof HeroSearchFormMobileDynamic>

export default function HeroSearchFormMobileLazy(props: HeroSearchFormMobileLazyProps) {
  return <HeroSearchFormMobileDynamic {...props} />
}
