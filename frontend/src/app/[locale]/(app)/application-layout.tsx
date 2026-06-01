import { DeferredLayoutWidgets } from '@/components/DeferredLayoutWidgets'
import { DeferredFooterWidgets } from '@/components/DeferredFooterWidgets'
import Header from '@/components/Header/Header'
import MobileSiteTopBar from '@/components/MobileSiteTopBar'
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
      {/* Mobil arama — viewport’ta sabit. html/body `overflow-x-hidden` sticky’nin kaydırma atasını bozar → fixed + spacer.
          z-[60]: hero mozaik / kart katmanları (z-30) üstüne binmesin; iOS Safari’de dokunma hedefi kaybolmasın.
          touch-manipulation: 300ms tıklama gecikmesini kaldırır. */}
      <div className="pointer-events-auto fixed inset-x-0 top-0 isolate z-[60] touch-manipulation bg-white pt-[env(safe-area-inset-top,0px)] shadow-xs lg:hidden dark:bg-neutral-900">
        <div className="container box-border flex h-auto min-h-0 w-full max-w-full items-center px-2 py-3 sm:px-4">
          <MobileSiteTopBar locale={locale} />
        </div>
      </div>
      <div
        className="shrink-0 lg:hidden"
        style={{ height: 'calc(5.25rem + env(safe-area-inset-top, 0px))' }}
        aria-hidden
      />
      {children}
      {/* Non-critical widgets deferred until after hydration for better LCP/TTI */}
      <DeferredFooterWidgets locale={locale} />
      <DeferredLayoutWidgets locale={locale} />
    </Aside.Provider>
  )
}
