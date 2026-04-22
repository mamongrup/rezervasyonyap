import { parseLenientJson } from '@/lib/json-parse'

export type SitePreviewLinksPayload = {
  ok?: boolean
  homePageLinks?: { label: string; path: string }[]
  mobileAccountPath?: string
}

/**
 * Next dev’de bazen `response.json()` bozuk/birleşik gövdede patlar.
 * Önbelleği kapatıp metni gevşek JSON ile parse eder.
 */
export async function fetchSitePreviewLinks(): Promise<SitePreviewLinksPayload> {
  const r = await fetch('/api/site-preview-links', { cache: 'no-store' })
  const text = await r.text()
  return parseLenientJson(text) as SitePreviewLinksPayload
}
