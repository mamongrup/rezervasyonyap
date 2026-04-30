import { DeferredLayoutWidgets } from '@/components/DeferredLayoutWidgets'
import { DeferredFooterWidgets } from '@/components/DeferredFooterWidgets'
import Header from '@/components/Header/Header'
import HeroSearchFormMobileLazy from '@/components/HeroSearchFormMobile/HeroSearchFormMobileLazy'
import Aside from '@/components/aside'
import type { ReactNode } from 'react'

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
      {/* Mobil arama çubuğu — sticky (orijinal tema ile aynı; fixed + spacer yerine) */}
      <div className="sticky top-0 z-40 bg-white shadow-xs lg:hidden dark:bg-neutral-900">
        <div className="container flex h-20 items-center justify-center">
          <HeroSearchFormMobileLazy locale={locale} />
        </div>
      </div>
      {children}
      {/* Non-critical widgets deferred until after hydration for better LCP/TTI */}
      <DeferredFooterWidgets locale={locale} />
      <DeferredLayoutWidgets locale={locale} />
    </Aside.Provider>
  )
}
