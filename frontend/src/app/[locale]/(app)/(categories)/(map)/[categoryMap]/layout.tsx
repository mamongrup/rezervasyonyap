import { ApplicationLayout } from '../../../application-layout'
import Header3 from '@/components/Header/Header3'
import { getCategoryByMapRoute } from '@/data/category-registry'
import type { HeroSearchTab } from '@/data/category-registry'
import { notFound } from 'next/navigation'
import { type ReactNode } from 'react'

function isHeroSearchTab(x: string): x is HeroSearchTab {
  return x === 'Stays' || x === 'Experiences' || x === 'Cars' || x === 'Flights'
}

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string; categoryMap: string }>
}) {
  const { locale, categoryMap } = await params
  const reg = getCategoryByMapRoute(categoryMap)
  if (!reg?.mapRoute) notFound()
  const tab = isHeroSearchTab(reg.heroSearchTab) ? reg.heroSearchTab : 'Stays'
  return (
    <ApplicationLayout
      locale={locale}
      header={
        /** Üstte sabit: scroll’da kaybolmaz — sağdaki `sticky top-16` harita ile hizalı kalır, üstte beyaz boşluk oluşmaz */
        <div className="sticky top-0 z-50 w-full border-b border-neutral-100 bg-white dark:border-neutral-700 dark:bg-neutral-900">
          <Header3 initSearchFormTab={tab} />
        </div>
      }
    >
      {children}
    </ApplicationLayout>
  )
}
