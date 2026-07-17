/**
 * Shared React.cache wrapper for site public config.
 * Import this in ANY server component that needs the config —
 * React.cache ensures only ONE fetch per request, no stream re-consumption.
 */
import { withDevNoStore } from '@/lib/api-fetch-dev'
import { cache } from 'react'
import { getSitePublicConfig, type SitePublicConfig } from './travel-api'

export const getCachedSiteConfig = cache(async (): Promise<SitePublicConfig | null> => {
  try {
    // Site config yalnız admin panelinden değişir; 15s aşırı sık disk cache yazımı
    // (fetch-cache I/O) yaratıyordu. 1 saat yeterli.
    return await getSitePublicConfig(undefined, withDevNoStore({ next: { revalidate: 3600 } }))
  } catch {
    return null
  }
})
