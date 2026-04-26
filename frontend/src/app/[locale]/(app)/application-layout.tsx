import { DeferredLayoutWidgets } from '@/components/DeferredLayoutWidgets'
import { DeferredFooterWidgets } from '@/components/DeferredFooterWidgets'
import Header from '@/components/Header/Header'
import HeroSearchFormMobile from '@/components/HeroSearchFormMobile/HeroSearchFormMobile'
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
      {/* Mobil arama çubuğu — viewport üstünde sabit; içerik bu yükseklik kadar aşağıdan başlar */}
      <div className="fixed inset-x-0 top-0 z-40 bg-white pt-[env(safe-area-inset-top,0px)] shadow-xs lg:hidden dark:bg-neutral-900">
        <div className="container flex h-20 items-center justify-center">
          <HeroSearchFormMobile locale={locale} />
        </div>
      </div>
      <div
        className="shrink-0 lg:hidden"
        style={{ height: 'calc(5rem + env(safe-area-inset-top, 0px))' }}
        aria-hidden
      />
      {children}
      {/* Non-critical widgets deferred until after hydration for better LCP/TTI */}
      <DeferredFooterWidgets locale={locale} />
      <DeferredLayoutWidgets locale={locale} />
    </Aside.Provider>
  )
}
