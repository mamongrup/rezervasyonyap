/** Wtatil ilanı → Gezinomi tur link eşleştirmesi (SearchAutoComplate API) */

import { wtatilSlugBase, wtatilSlugForMatch } from './gezinomi-gallery.mjs'

const API = 'https://apigezinomi.gezinomi.com/api/Tour/SearchAutoComplate'
const MIN_ACCEPT_SCORE = 62

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
  const a = fixKosovalTypo(wtatilSlugForMatch(listingSlug))
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

/** Başlık ↔ Gezinomi tur adı benzerliği (link farklı olsa bile) */
export function titleMatchScore(listingTitle, candidateName) {
  const a = normalizeForMatch(listingTitle)
  const b = normalizeForMatch(candidateName)
  if (!a || !b) return 0
  if (a === b) return 100
  const shorter = a.length <= b.length ? a : b
  const longer = a.length > b.length ? a : b
  if (shorter.length >= 14 && longer.includes(shorter)) return 88

  const words = String(listingTitle || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => normalizeForMatch(w))
    .filter((w) => w.length >= 4)
  if (!words.length) return 0
  let hits = 0
  for (const w of words) {
    if (b.includes(w)) hits++
  }
  return Math.round((hits / words.length) * 100)
}

function combinedScore(slug, title, row) {
  const slugScore = slugMatchScore(slug, row.link)
  const titleScore = titleMatchScore(title, row.name)
  return Math.max(slugScore, titleScore, Math.round(slugScore * 0.45 + titleScore * 0.55))
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
  return (j.data || []).filter((x) => x.type === 'Tour' && x.link && x.productId)
}

export function gezinomiLinkFromWtatilSlug(slug) {
  return wtatilSlugForMatch(slug)
}

/** Gezinomi sayfasındaki "Tur Kodu" (productId) — resim adında olmasa da API ile bulunur */
async function matchByGezinomiProductId(slug) {
  const nums = [...new Set((wtatilSlugBase(slug).match(/\d{4,6}/g) || []))]
  for (const num of nums) {
    if (num.length < 5) continue
    let results
    try {
      results = await searchGezinomiTours(num)
    } catch {
      continue
    }
    const exact = results.find((r) => String(r.productId) === num)
    if (exact) {
      return {
        score: 100,
        slugScore: slugMatchScore(slug, exact.link),
        titleScore: 0,
        link: exact.link,
        name: exact.name,
        productId: exact.productId,
        picture: exact.picture,
        query: `productId:${num}`,
        typeId: exact.typeId,
        pk: exact.pk,
        apiRow: exact,
      }
    }
  }
  return null
}

export async function matchListingToGezinomi({ slug, title }) {
  const byProductId = await matchByGezinomiProductId(slug)
  if (byProductId) return byProductId

  const derivedLink = gezinomiLinkFromWtatilSlug(slug)
  const slugWords = wtatilSlugForMatch(slug).replace(/-/g, ' ')
  const queries = [
    title,
    derivedLink.replace(/-/g, ' '),
    slugWords,
    slugWords.split(' ').slice(0, 10).join(' '),
    slugWords.split(' ').slice(0, 6).join(' '),
    slugWords.split(' ').slice(0, 4).join(' '),
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
      const score = combinedScore(slug, title, row)
      if (score < MIN_ACCEPT_SCORE) continue
      if (!best || score > best.score) {
        best = {
          score,
          slugScore: slugMatchScore(slug, row.link),
          titleScore: titleMatchScore(title, row.name),
          link: row.link,
          name: row.name,
          productId: row.productId,
          picture: row.picture,
          query,
          typeId: row.typeId,
          pk: row.pk,
          apiRow: row,
        }
      }
    }
    if (best?.score >= 92) break
  }

  if (!best?.productId) return null
  return best
}
