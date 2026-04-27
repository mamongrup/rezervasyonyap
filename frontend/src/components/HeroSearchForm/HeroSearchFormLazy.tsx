'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import { HeroSearchFormSkeleton } from './HeroSearchFormSkeleton'

/**
 * Ana sayfa / bölge / kategori şablonlarında hero arama formu.
 * `react-datepicker` tarih paneli açılınca (`DateRangePickerPanel` dynamic chunk).
 * Mobil hero slot’u `HeroSearchDesktopOnly` ile lg+ sınırlandığı için burada ekstra idle gecikmesi yok —
 * LCP için yapay bekleme kaldırıldı; `loading` yalnızca chunk indirilirken iskelet gösterir.
 */
const HeroSearchFormDynamic = dynamic(() => import('./HeroSearchForm'), {
  ssr: false,
  loading: () => <HeroSearchFormSkeleton />,
})

export default function HeroSearchFormLazy(props: ComponentProps<typeof HeroSearchFormDynamic>) {
  return <HeroSearchFormDynamic {...props} />
}
