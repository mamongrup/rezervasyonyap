'use client'

import {
  ensureTawkScriptLoaded,
  isTawkConfigured,
  setTawkRuntimeConfig,
  syncTawkCurrentPage,
} from '@/lib/tawk-widget'
import { getSitePublicConfig as fetchSitePublicConfig } from '@/lib/travel-api'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Tawk.to — Monitoring / canlı ziyaretçi sayısı için gizli warm-load.
 * UI balonu gösterilmez (`tawk-widget` hide CSS + hideWidget); yalnız socket açılır.
 * Mobilde de yüklenir — aksi halde Monitoring boş kalır (trafik çoğunlukla mobil).
 */
export default function TawkWidgetLoader() {
  const pathname = usePathname()
  const hideOnManage = pathname?.includes('/manage')
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    if (hideOnManage) return
    let cancelled = false
    let warmTimer: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined

    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (cancelled) return
        setTawkRuntimeConfig(pub.branding ?? null)
        const ready = isTawkConfigured()
        setConfigured(ready)
        if (!ready) return

        // LCP sonrası: kısa gecikme + idle — Monitoring ping’i erken gelsin,
        // balon flash’ı CSS/hideWidget ile engellenir.
        const warm = () => {
          if (cancelled) return
          void ensureTawkScriptLoaded()
        }
        const scheduleWarm = () => {
          warmTimer = setTimeout(warm, 2500)
        }
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          idleId = window.requestIdleCallback(scheduleWarm, { timeout: 6000 })
        } else {
          scheduleWarm()
        }
      })
      .catch(() => {
        if (!cancelled) setTawkRuntimeConfig(null)
      })

    return () => {
      cancelled = true
      if (warmTimer) clearTimeout(warmTimer)
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
    }
  }, [hideOnManage])

  useEffect(() => {
    if (hideOnManage || !configured) return
    if (typeof window === 'undefined' || !window.Tawk_API?.setAttributes) return
    const id = window.setTimeout(() => syncTawkCurrentPage(), 400)
    return () => window.clearTimeout(id)
  }, [pathname, hideOnManage, configured])

  return null
}
