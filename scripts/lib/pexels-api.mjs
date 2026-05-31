/**
 * Pexels API — site_settings.pexels api_keys
 */
import { queryRows } from './psql-exec.mjs'

export function loadPexelsKeys() {
  const rows = queryRows(
    `SELECT coalesce(value_json->'api_keys', '[]'::jsonb) AS keys
     FROM site_settings WHERE key = 'pexels' AND organization_id IS NULL
     ORDER BY id DESC LIMIT 1`,
  )
  const keys = rows[0]?.keys
  const list = Array.isArray(keys) ? keys.map(String).map((k) => k.trim()).filter(Boolean) : []
  if (list.length === 0) throw new Error('site_settings.pexels api_keys boş')
  return list
}

export async function searchPexelsPhotos(apiKey, query, perPage = 10) {
  const u = new URL('https://api.pexels.com/v1/search')
  u.searchParams.set('query', query)
  u.searchParams.set('per_page', String(Math.min(15, perPage)))
  u.searchParams.set('locale', 'tr-TR')
  const res = await fetch(u.toString(), { headers: { Authorization: apiKey } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.photos ?? []).map((p) => ({
    url: p?.src?.large2x || p?.src?.original || p?.src?.large || '',
    id: p?.id,
    photographer: p?.photographer || '',
  })).filter((x) => x.url)
}

export async function fetchPexelsGalleryUrls(keys, queries, want = 6, delayMs = 400) {
  const urls = []
  const seen = new Set()
  let keyIdx = 0
  for (const q of queries) {
    if (urls.length >= want) break
    const key = keys[keyIdx % keys.length]
    keyIdx++
    const found = await searchPexelsPhotos(key, q, want + 4)
    await new Promise((r) => setTimeout(r, delayMs))
    for (const p of found) {
      if (seen.has(p.url)) continue
      seen.add(p.url)
      urls.push(p)
      if (urls.length >= want) break
    }
  }
  return urls.slice(0, want)
}
