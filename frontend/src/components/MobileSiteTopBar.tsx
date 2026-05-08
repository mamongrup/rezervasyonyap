'use client'

import HamburgerBtnMenu from '@/components/Header/HamburgerBtnMenu'
import HeroSearchFormMobile from '@/components/HeroSearchFormMobile/HeroSearchFormMobile'

/** lg altı: Chisfis mobil — logo yok; menü + arama hapı tek satır. */
export default function MobileSiteTopBar({ locale }: { locale: string }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <div className="shrink-0">
        <HamburgerBtnMenu />
      </div>
      <div className="min-h-[42px] min-w-0 flex-1">
        <HeroSearchFormMobile locale={locale} className="max-w-none" />
      </div>
    </div>
  )
}
