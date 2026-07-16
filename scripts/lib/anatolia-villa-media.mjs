const SOURCE_ROOT = 'https://olivetreetravel.com/kalkan-villas-with-pools'
const CDN_IMAGE_RE = /https:\/\/c621446\.ssl\.cf3\.rackcdn\.com\/images\/cottages\/custom\/large\/\d+\.jpg/gi

export const ANATOLIA_VILLA_MEDIA_SOURCES = new Map([
  [28, { slug: 'anatolia-villa-1', licence: '07-4823', page: `${SOURCE_ROOT}/villa-anatolia-1/`, minImages: 50 }],
  [29, { slug: 'anatolia-villa-2', licence: '07-4826', page: `${SOURCE_ROOT}/villa-anatolia-2/`, minImages: 50 }],
  [30, { slug: 'anatolia-villa-3', licence: '07-4827', page: `${SOURCE_ROOT}/villa-anatolia-3/`, minImages: 40 }],
  [31, { slug: 'anatolia-villa-4', licence: '07-4828', page: `${SOURCE_ROOT}/villa-anatolia-4/`, minImages: 35 }],
])

export function anatoliaVillaMediaSource(legacyId) {
  return ANATOLIA_VILLA_MEDIA_SOURCES.get(Number(legacyId)) || null
}

async function fetchTextWithRetry(url, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en-GB,en;q=0.9',
          'user-agent': 'RezervasyonYap-MediaRepair/1.0',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.text()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
    }
  }
  throw new Error(`Kaynak sayfa alinamadi: ${url} (${lastError?.message || 'bilinmeyen hata'})`)
}

export async function fetchVerifiedAnatoliaGallery(legacyId) {
  const source = anatoliaVillaMediaSource(legacyId)
  if (!source) return null

  const html = await fetchTextWithRetry(source.page)
  const normalized = html.replace(/&ndash;|&#8211;|&#x2013;/gi, '-').replace(/\s+/g, ' ')
  if (!normalized.includes(source.licence)) {
    throw new Error(`Kaynak belge numarasi dogrulanamadi: ${source.slug} / ${source.licence}`)
  }

  const urls = [...new Set(html.match(CDN_IMAGE_RE) || [])]
  if (urls.length < source.minImages) {
    throw new Error(
      `Eksik kaynak galeri: ${source.slug} (${urls.length}/${source.minImages} minimum)`,
    )
  }

  return { ...source, legacyId: Number(legacyId), urls }
}
