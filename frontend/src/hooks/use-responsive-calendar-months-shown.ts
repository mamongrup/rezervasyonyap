'use client'

import { useEffect, useState } from 'react'

/** Tailwind `md` (768px) — takvimde mobil 1 ay, geniş ekranda 2 ay */
const MD_MIN_WIDTH = '(min-width: 768px)'

/**
 * react-datepicker `monthsShown`: küçük ekranda 1, `md` ve üzeri 2.
 * `initial` sunucu tahmini (`guessCalendarMonthsShownFromRequest`) ile SSR/hidrasyon uyumu.
 * `useLayoutEffect` yerine useEffect + rAF: mount’ta layout okuması commit ile aynı tura sıkışmaz (PSI forced reflow).
 */
export function useResponsiveCalendarMonthsShown(initial: 1 | 2 = 1): 1 | 2 {
  const [monthsShown, setMonthsShown] = useState<1 | 2>(initial)

  useEffect(() => {
    const mq = window.matchMedia(MD_MIN_WIDTH)
    const apply = () => setMonthsShown(mq.matches ? 2 : 1)
    let mountRaf = window.requestAnimationFrame(apply)
    let changeRaf = 0
    const onChange = () => {
      if (changeRaf) window.cancelAnimationFrame(changeRaf)
      changeRaf = window.requestAnimationFrame(() => {
        changeRaf = 0
        apply()
      })
    }
    mq.addEventListener('change', onChange)
    return () => {
      window.cancelAnimationFrame(mountRaf)
      if (changeRaf) window.cancelAnimationFrame(changeRaf)
      mq.removeEventListener('change', onChange)
    }
  }, [])

  return monthsShown
}
