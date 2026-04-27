'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * `HeroSectionWithSearchForm1` (`topSpacing="minimal"`) hero aramasını mobilde `hidden lg:block`
 * ile gizler — fakat çocuksuz bırakmadan önce bile `HeroSearchForm` mount edilirse yüzlerce KiB JS
 * mobilde parse/edilir ve LCP/TBT şişer. Bu sarmalayıcı yalnızca `lg` ve üzeri görünümde formu mount eder.
 */
export default function HeroSearchDesktopOnly({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setShow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (!show) return null
  return <>{children}</>
}
