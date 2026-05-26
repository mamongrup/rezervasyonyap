/** Wtatil ilanı → Gezinomi tur link eşleştirmesi (SearchAutoComplate API) */

import { wtatilSlugBase } from './gezinomi-gallery.mjs'

const API = 'https://apigezinomi.gezinomi.com/api/Tour/SearchAutoComplate'

export function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '')
}

function fixKosovalTypo(s) {
  const n = normalizeForMatch(s)
  if (n.startsWith('kosoval') && !n.startsWith('kosovali')) {
    return `kosovali${n.slice(7)}`
  }
  return n
}

export function slugMatchScore(listingSlug, candidateLink) {
  const a = fixKosovalTypo(wtatilSlugBase(listingSlug))
  const b = fixKosovalTypo(candidateLink)
  if (!a || !b) return 0
  if (a === b) return 100
  if (a.includes(b) || b.includes(a)) return 85
  const minLen = Math.min(a.length, b.length)
  let common = 0
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) common++
    else break
  }
  return Math.round((common / Math.max(a.length, b.length)) * 100)
}

export async function searchGezinomiTours(query) {
  const q = String(query || '').trim()
  if (!q) return []
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'TravelGezinomiImport/1.0' },
    body: JSON.stringify({ Query: q }),
  })
  if (!r.ok) throw new Error(`SearchAutoComplate HTTP ${r.status}`)
  const j = await r.json()
  return (j.data || []).filter((x) => x.type === 'Tour' && x.link)
}

export function gezinomiLinkFromWtatilSlug(slug) {
  let base = wtatilSlugBase(slug)
  if (base.startsWith('kosoval-')) {
    base = `kosovali-${base.slice(8)}`
  }
  return base
}

export async function matchListingToGezinomi({ slug, title }) {
  const derivedLink = gezinomiLinkFromWtatilSlug(slug)
  const queries = [
    title,
    derivedLink.replace(/-/g, ' '),
    wtatilSlugBase(slug).replace(/-/g, ' '),
    wtatilSlugBase(slug).split('-').slice(0, 8).join(' '),
  ].filter(Boolean)

  let best = null
  const seenLinks = new Set()

  for (const query of queries) {
    let results
    try {
      results = await searchGezinomiTours(query)
    } catch {
      continue
    }
    for (const row of results) {
      if (seenLinks.has(row.link)) continue
      seenLinks.add(row.link)
      const score = slugMatchScore(slug, row.link)
      if (!best || score > best.score) {
        best = {
          score,
          link: row.link,
          name: row.name,
          productId: row.productId,
          picture: row.picture,
          query,
        }
      }
    }
    if (best?.score >= 95) break
  }

  const derivedScore = slugMatchScore(slug, derivedLink)
  if (derivedScore >= 85 && (!best || derivedScore > best.score)) {
    best = {
      score: derivedScore,
      link: derivedLink,
      name: title,
      productId: null,
      picture: null,
      query: 'slug-derived',
    }
  }

  if (!best || best.score < 55) return null
  return best
}
