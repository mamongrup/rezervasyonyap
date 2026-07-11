'use client'

import { setTawkRuntimeConfig, isTawkConfigured } from '@/lib/tawk-widget'
import { getSitePublicConfig as fetchSitePublicConfig } from '@/lib/travel-api'
import { useEffect, useState } from 'react'

/** Tawk.to embed — panel `branding.tawk_*` veya env ile yüklenir */
export default function TawkWidgetLoader() {
  const [, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchSitePublicConfig(undefined)
      .then((pub) => {
        if (cancelled) return
        setTawkRuntimeConfig(pub.branding ?? null)
        setReady(isTawkConfigured())
      })
      .catch(() => {
        if (!cancelled) setTawkRuntimeConfig(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
