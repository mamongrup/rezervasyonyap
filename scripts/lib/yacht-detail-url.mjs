/**
 * İlan meta'sından doğru kaynak detay sayfası URL'si.
 * Birleşmiş ilanlarda üst düzey source_url yanlış olabilir; enrichment_sources tercih edilir.
 */

import { fetchAllListingCards } from './baransen-api.mjs'

let baransenCardIndex = null

export async function loadBaransenCardIndex() {
  if (baransenCardIndex) return baransenCardIndex
  const cards = await fetchAllListingCards({})
  baransenCardIndex = new Map(cards.map((c) => [String(c.baransenId), c]))
  return baransenCardIndex
}

export function parseListingMeta(valueJson) {
  if (!valueJson) return {}
  if (typeof valueJson === 'object') return valueJson
  try {
    return JSON.parse(valueJson)
  } catch {
    return {}
  }
}

/** Baransen tekne detay sayfası — galeri burada. */
export async function resolveBaransenDetailUrl(row, { cardIndex = null } = {}) {
  const meta = parseListingMeta(row.value_json || row.meta)
  const fromEnrichment = meta.enrichment_sources?.baransen?.url
  if (fromEnrichment?.includes('baranselyachting.com')) return fromEnrichment

  const sourceUrl = row.source_url || meta.source_url
  if (sourceUrl?.includes('baranselyachting.com')) return sourceUrl

  const baransenId = String(
    row.baransen_id || row.external_listing_ref || meta.baransen_id || '',
  ).trim()
  if (!baransenId) return null

  const index = cardIndex || (await loadBaransenCardIndex())
  const card = index.get(baransenId)
  return card?.detailUrl || null
}

/** Albatros tekne detay sayfası. */
export function resolveAlbatrosDetailUrl(row) {
  const meta = parseListingMeta(row.value_json || row.meta)
  const fromEnrichment = meta.enrichment_sources?.albatros?.url
  if (fromEnrichment?.includes('albatrosyachting.com')) return fromEnrichment

  const sourceUrl = row.source_url || meta.source_url
  if (sourceUrl?.includes('albatrosyachting.com')) return sourceUrl

  const slug = row.albatros_slug || meta.albatros_slug
  if (slug) return `https://www.albatrosyachting.com/yat/${slug}/`

  return null
}
