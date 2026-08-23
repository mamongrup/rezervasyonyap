'use client'

import HamburgerBtnMenu from '@/components/Header/HamburgerBtnMenu'
import HeroSearchFormMobile from '@/components/HeroSearchFormMobile/HeroSearchFormMobile'
import Logo from '@/shared/Logo'

/** lg altı: Mobil vitrin üst çubuğu — sol logo, orta arama hapı, sağ hamburger menü (kategoriler). */
export default function MobileSiteTopBar({ locale }: { locale: string }) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
      {/* Sol: Sadece Marka İkonu (Yüksekliği arama bölümü ile birebir aynı: size-12 sm:size-14) */}
      <div className="flex shrink-0 items-center justify-center">
        <Logo
          locale={locale}
          showSlogan={false}
          iconOnly
          animated={false}
          className="size-12 sm:size-14 shrink-0 transition-transform active:scale-95"
        />
      </div>

      {/* Orta: Arama alanı (Yüksekliği: h-12 sm:h-14) */}
      <div className="min-w-0 flex-1">
        <HeroSearchFormMobile locale={locale} className="max-w-none" />
      </div>

      {/* Sağ: Hamburger menü butonu (kategoriler) (Yüksekliği: size-12 sm:size-14) */}
      <div className="flex shrink-0 items-center justify-center">
        <HamburgerBtnMenu className="flex size-12 sm:size-14 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
      </div>
    </div>
  )
}
