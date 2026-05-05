'use client'

import HamburgerBtnMenu from '@/components/Header/HamburgerBtnMenu'
import HeroSearchFormMobile from '@/components/HeroSearchFormMobile/HeroSearchFormMobile'
import Logo from '@/shared/Logo'
import clsx from 'clsx'

/** lg altı: Header ile aynı yan menü + logo + hero arama sırası (anasayfa / bölge / vitrin ortak). */
export default function MobileSiteTopBar({ locale }: { locale: string }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex shrink-0 items-center gap-1.5">
        <HamburgerBtnMenu />
        <Logo className={clsx('block max-h-9 w-auto max-w-[7.5rem] sm:max-w-[9rem]')} />
      </div>
      <div className="min-h-[42px] min-w-0 flex-1">
        <HeroSearchFormMobile locale={locale} className="max-w-none" />
      </div>
    </div>
  )
}
