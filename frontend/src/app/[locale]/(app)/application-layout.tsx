import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import { DeferredLayoutWidgets } from '@/components/DeferredLayoutWidgets'
import { DeferredFooterWidgets } from '@/components/DeferredFooterWidgets'
import Header from '@/components/Header/Header'
import MobileFixedTopBar from '@/components/MobileFixedTopBar'
import MobileLayoutSpacer from '@/components/MobileLayoutSpacer'
import SiteHeaderChrome from '@/components/SiteHeaderChrome'
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
      {/* Desktop: tam Header. Yönetim/personel: mobilde de aynı Header (SiteHeaderChrome).
          z-50: Header stacking context — dropdown’lar (Popover z-40) hero/arama (z-30) üstünde kalır. */}
      <SiteHeaderChrome>{header ? header : <Header locale={locale} />}</SiteHeaderChrome>
      {/* Mobil arama üst barı — /manage ve /staff’ta gizlenir (önyüz Header kullanılır). */}
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
