'use client'

import HeroSearchFormMobile from '@/components/HeroSearchFormMobile/HeroSearchFormMobile'

/** lg altı: Chisfis mobil vitrin — yalnızca arama hapı; hamburger üst çubukta yok (menü alt gezinmeden). */
export default function MobileSiteTopBar({ locale }: { locale: string }) {
  return (
    <div className="min-h-[42px] w-full min-w-0">
      <HeroSearchFormMobile locale={locale} className="max-w-none" />
    </div>
  )
}
