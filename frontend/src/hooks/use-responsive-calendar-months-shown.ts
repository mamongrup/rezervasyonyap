'use client'

import { useLayoutEffect, useState } from 'react'

/** Tailwind `md` (768px) — takvimde mobil 1 ay, geniş ekranda 2 ay */
const MD_MIN_WIDTH = '(min-width: 768px)'

/**
 * react-datepicker `monthsShown`: küçük ekranda 1, `md` ve üzeri 2.
 * `initial` sunucu tahmini (`guessCalendarMonthsShownFromRequest`) ile SSR/hidrasyon uyumu.
 * Mount’ta ve pencere yeniden boyanınca `matchMedia` ile gerçek değere hizalanır.
 */
export function useResponsiveCalendarMonthsShown(initial: 1 | 2 = 1): 1 | 2 {
  const [monthsShown, setMonthsShown] = useState<1 | 2>(initial)

  useLayoutEffect(() => {
    const mq = window.matchMedia(MD_MIN_WIDTH)
    const sync = () => setMonthsShown(mq.matches ? 2 : 1)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return monthsShown
}
