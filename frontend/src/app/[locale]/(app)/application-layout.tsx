import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import { DeferredLayoutWidgets } from '@/components/DeferredLayoutWidgets'
import { DeferredFooterWidgets } from '@/components/DeferredFooterWidgets'
import Header from '@/components/Header/Header'
import MobileFixedTopBar from '@/components/MobileFixedTopBar'
import MobileLayoutSpacer from '@/components/MobileLayoutSpacer'
import Aside from '@/components/aside'
import PageContentSkeleton from '@/components/PageContentSkeleton'
import type { ReactNode } from 'react'
import { Suspense } from 'react'

interface Props {
  children: ReactNode
  header?: ReactNode
  /** [locale] segment — varsayılan Header için gerekli */
  locale?: string
}

export async function ApplicationLayout({ children, header, locale = 'tr' }: Props) {
  return (
    <Aside.Provider>
      {/* Desktop — normal akış (sayfayla birlikte kayar); harita rotaları kendi layout'ında sticky Header3 kullanır.
          z-50: Header kendi stacking context'i oluşturur ve içerideki dropdown panel'leri (Popover z-40)
          her zaman sayfa içeriğindeki z-30 hero/arama formu blokları üzerinde kalır. */}
      <div className="relative z-50 hidden lg:block bg-white dark:bg-neutral-900">{header ? header : <Header locale={locale} />}</div>
      {/* Mobil arama — viewport’ta sabit. html/body `overflow-x-hidden` sticky’nin kaydırma atasını bozar → fixed + spacer.
          z-[60]: hero mozaik / kart katmanları (z-30) üstüne binmesin; iOS Safari’de dokunma hedefi kaybolmasın.
          touch-manipulation: 300ms tıklama gecikmesini kaldırır. */}
      <MobileFixedTopBar locale={locale} />
      <MobileLayoutSpacer />
      {/* Sayfa gövdesi Suspense ile sarıldı: rota geçişinde header kalır, içerik
          verisi gelene kadar anında iskelet gösterilir (algılanan hız artar). */}
      <Suspense fallback={<PageContentSkeleton />}>{children}</Suspense>
      <Suspense fallback={null}>
        <AsideSidebarNavigation locale={locale} />
      </Suspense>
      {/* Non-critical widgets deferred until after hydration for better LCP/TTI */}
      <DeferredFooterWidgets locale={locale} />
      <DeferredLayoutWidgets locale={locale} />
    </Aside.Provider>
  )
}
