'use client'

import HamburgerBtnMenu from '@/components/Header/HamburgerBtnMenu'
import HeroSearchFormMobile from '@/components/HeroSearchFormMobile/HeroSearchFormMobile'
import Logo from '@/shared/Logo'

/** lg altı: Mobil vitrin üst çubuğu — sol logo, orta arama hapı, sağ hamburger menü (kategoriler). */
export default function MobileSiteTopBar({ locale }: { locale: string }) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
      {/* Sol: Logo / Marka ikonu */}
      <div className="flex shrink-0 items-center max-w-[90px] xs:max-w-[115px] overflow-hidden [&_img]:max-h-8 [&_img]:w-auto [&_img]:object-contain">
        <Logo locale={locale} showSlogan={false} className="shrink-0" />
      </div>

      {/* Orta: Arama alanı */}
      <div className="min-w-0 flex-1">
        <HeroSearchFormMobile locale={locale} className="max-w-none" />
      </div>

      {/* Sağ: Hamburger menü butonu (kategoriler) */}
      <div className="flex shrink-0 items-center justify-center">
        <HamburgerBtnMenu className="flex size-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
      </div>
    </div>
  )
}
