import { headers } from 'next/headers'

/**
 * İstek başlıklarından mobil / masaüstü tahmini (Tailwind `md` ile uyumlu).
 * Gerçek genişlik istemcide `useResponsiveCalendarMonthsShown` ile düzeltilir.
 */
export async function guessCalendarMonthsShownFromRequest(): Promise<1 | 2> {
  const h = await headers()
  const chMobile = h.get('sec-ch-ua-mobile')
  if (chMobile === '?1') return 1
  if (chMobile === '?0') return 2
  const ua = h.get('user-agent') ?? ''
  if (/Mobile|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return 1
  }
  return 2
}
