import ConciergeChatWidget from '@/components/ConciergeChatWidget'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import Footer2 from '@/components/Footer2'
import WhatsAppFloatButton from '@/components/WhatsAppFloatButton'
import FooterQuickNavigation from '@/components/FooterQuickNavigation'
import Header from '@/components/Header/Header'
import HeroSearchFormMobile from '@/components/HeroSearchFormMobile/HeroSearchFormMobile'
import Aside from '@/components/aside'
import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import 'rc-slider/assets/index.css'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  header?: ReactNode
  /** [locale] segment — varsayılan Header için gerekli */
  locale?: string
}

export async function ApplicationLayout({ children, header, locale = 'tr' }: Props) {
  const pub = await getCachedSiteConfig()
  const ui = pub?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const bannerEnabled = cc?.banner_enabled !== false

  return (
    <Aside.Provider>
      {/* Desktop — normal akış (sayfayla birlikte kayar); harita rotaları kendi layout’ında sticky Header3 kullanır */}
      <div className="relative z-20 hidden lg:block bg-white dark:bg-neutral-900">{header ? header : <Header locale={locale} />}</div>
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
      {/*  */}
      {/* FooterQuickNavigation - Displays on mobile devices and is fixed at the bottom of the screen */}
      <FooterQuickNavigation />
      {/* Chose footer style here!!!! */}
      <Footer2 locale={locale} />
      <AsideSidebarNavigation locale={locale} />
      <WhatsAppFloatButton />
      <ConciergeChatWidget />
      <CookieConsentBanner locale={locale} bannerEnabled={bannerEnabled} />
    </Aside.Provider>
  )
}
