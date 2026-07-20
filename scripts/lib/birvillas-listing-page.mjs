/** Birvillas Next.js sayfasına gömülü ilan verisini güvenli biçimde çıkarır. */

function nextFlightText(html) {
  let decoded = ''
  for (const match of String(html || '').matchAll(
    /<script>self\.__next_f\.push\((\[.*?\])\)<\/script>/gs,
  )) {
    try {
      const chunk = JSON.parse(match[1])
      if (typeof chunk[1] === 'string') decoded += chunk[1]
    } catch {
      // Bir bozuk RSC parçası diğer geçerli parçaların okunmasını engellemez.
    }
  }
  return decoded
}

function balancedObjectAt(text, start) {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const char = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return ''
}

export function parseBirvillasListingPage(html, listingId) {
  const decoded = nextFlightText(html)
  const needle = `"listing":{"id":"${listingId}"`
  const marker = decoded.indexOf(needle)
  if (marker < 0) return null
  const start = marker + '"listing":'.length
  const raw = balancedObjectAt(decoded, start)
  if (!raw) return null
  try {
    const listing = JSON.parse(raw)
    return listing?.id === listingId ? listing : null
  } catch {
    return null
  }
}

export async function fetchBirvillasListingPage(url, listingId) {
  const response = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; RezervasyonYapImport/1.0)' },
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) throw new Error(`birvillas_http_${response.status}:${listingId}`)
  const listing = parseBirvillasListingPage(await response.text(), listingId)
  if (!listing) throw new Error(`birvillas_embedded_listing_missing:${listingId}`)
  return listing
}

export function birvillasCalendarDays(listing) {
  const blocked = new Set([...(listing.notSelectableDates || []), ...(listing.disabledDates || [])])
  const rows = []
  for (const period of listing.dynamicPricing || []) {
    if (!period?.startDate || !period?.endDate || !(Number(period.price) > 0)) continue
    const day = new Date(`${period.startDate}T12:00:00Z`)
    const end = new Date(`${period.endDate}T12:00:00Z`)
    while (day <= end) {
      const iso = day.toISOString().slice(0, 10)
      rows.push({ day: iso, is_available: !blocked.has(iso), price_override: Number(period.price) })
      day.setUTCDate(day.getUTCDate() + 1)
    }
  }
  return rows
}

