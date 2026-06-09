/**
 * Wtatil katalog → vitrin tur alanları (`vertical_tour`, snapshot, açıklama).
 *
 * Panel / detay sayfası beklediği kaynaklar:
 *   - listing_attributes vertical_tour/v1 — overview, dahil/hariç, gün gün program
 *   - listing_attributes wtatil/snapshot — arama kartları, ülke kartları
 *   - listing_translations.description — program + genel şartlar HTML/metin
 */

const DAY_HEADING_RE = /(?:^|\n)\s*(\d+)\.?\s*Gün\s*:?\s*([^\n]+)/gi

function pickText(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

function normKey(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function stripHtml(raw) {
  return String(raw ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \u00a0]+/g, ' ')
    .trim()
}

/** Wtatil `transportType` → panel `travel_type` kodu (plane | bus | both | own). */
export function mapWtatilTransportToTravelType(transportType) {
  const raw = normKey(transportType)
  if (!raw) return ''

  if (raw === '1' || raw.includes('ucak') || raw.includes('plane') || raw.includes('air') || raw.includes('flight')) {
    return 'plane'
  }
  if (raw === '2' || raw.includes('otobus') || raw.includes('bus') || raw.includes('coach')) {
    return 'bus'
  }
  if (
    raw === '3' ||
    raw.includes('karma') ||
    raw.includes('mixed') ||
    (raw.includes('ucak') && raw.includes('otobus')) ||
    (raw.includes('plane') && raw.includes('bus'))
  ) {
    return 'both'
  }
  if (raw.includes('kendi') || raw.includes('own') || raw.includes('individual') || raw.includes('ozel arac')) {
    return 'own'
  }
  return ''
}

/** Konaklama tipi — mealType / tourType / program metninden tahmin. */
export function mapWtatilAccommodationType(tour) {
  const hay = [
    pickText(tour, 'accommodationType', 'accommodation_type'),
    pickText(tour.tourType, 'name', 'text'),
    pickText(tour.mealType, 'name', 'text'),
    tour.tourProgram,
    tour.generalConditions,
  ]
    .filter(Boolean)
    .join(' ')
  const raw = normKey(hay)

  if (raw.includes('gunubirlik') || raw.includes('gunluk') || raw.includes('daily') || raw.includes('no stay')) {
    return 'none'
  }
  if (raw.includes('kamp') || raw.includes('camping')) return 'camping'
  if (raw.includes('villa')) return 'villa'
  if (raw.includes('hostel') || raw.includes('pansiyon')) return 'hostel'
  if (raw.includes('otel') || raw.includes('hotel') || raw.includes('konaklama')) return 'hotel'
  return ''
}

export function parseWtatilVisaRequired(visaDetail) {
  if (visaDetail == null) return false
  if (typeof visaDetail === 'boolean') return visaDetail
  if (typeof visaDetail === 'number') return visaDetail > 0
  if (typeof visaDetail === 'object') {
    const required = visaDetail.required ?? visaDetail.isRequired ?? visaDetail.visaRequired
    if (typeof required === 'boolean') return required
    if (required != null && String(required).trim()) {
      const s = normKey(required)
      if (s === 'false' || s === '0' || s === 'no' || s === 'hayir') return false
      return true
    }
    const text = pickText(visaDetail, 'name', 'text', 'description', 'detail')
    if (!text) return Object.keys(visaDetail).length > 0
    const s = normKey(text)
    if (s.includes('gerekmez') || s.includes('not required') || s.includes('vizesiz')) return false
    return true
  }
  const s = normKey(visaDetail)
  if (!s || s === 'null' || s === '{}') return false
  if (s.includes('gerekmez') || s.includes('not required') || s.includes('vizesiz')) return false
  return true
}

export function parseWtatilIsGuided(tour) {
  const hay = [
    pickText(tour.tourType, 'name', 'text'),
    tour.freeServices,
    tour.tourProgram,
    tour.generalConditions,
  ]
    .filter(Boolean)
    .join(' ')
  const raw = normKey(hay)
  if (raw.includes('rehbersiz') || raw.includes('self guided') || raw.includes('serbest')) return false
  if (raw.includes('rehber') || raw.includes('guided') || raw.includes('escort')) return true
  return false
}

/** Ücretli / dahil metinlerini vitrin listesine çevirir. */
export function splitWtatilServiceList(raw) {
  const text = stripHtml(raw)
  if (!text) return []
  const parts = text
    .split(/\n+|(?:\s*;\s*)|(?:\s*•\s*)|(?:\s*-\s+(?=[A-Za-zÇĞİÖŞÜçğıöşü0-9]))/)
    .map((x) => x.replace(/^[\d]+[\.)]\s*/, '').trim())
    .filter(Boolean)
  const seen = new Set()
  const out = []
  for (const line of parts) {
    const key = line.toLocaleLowerCase('tr')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

/** Wtatil `tourProgram` → panel `itinerary[]`. */
export function parseWtatilItinerary(tourProgram) {
  const plain = stripHtml(tourProgram)
  if (!plain) return []

  const matches = [...plain.matchAll(DAY_HEADING_RE)]
  if (!matches.length) return []

  const days = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const dayNum = Number(match[1])
    const title = String(match[2] ?? '').trim()
    const start = (match.index ?? 0) + match[0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? plain.length) : plain.length
    let description = plain.slice(start, end).trim()
    if (i === matches.length - 1) {
      description = description.replace(/Konaklama\s*;[\s\S]*/i, '').trim()
    }
    if (!title && !description) continue
    days.push({
      day: Number.isFinite(dayNum) && dayNum > 0 ? dayNum : i + 1,
      title,
      description,
    })
  }
  return days
}

export function buildWtatilTourDescription(tour) {
  const descriptionParts = [
    tour?.tourProgram,
    tour?.generalConditions,
    tour?.paidServices ? `Ücretli: ${tour.paidServices}` : '',
    tour?.freeServices ? `Dahil: ${tour.freeServices}` : '',
  ].filter(Boolean)
  return descriptionParts.join('\n\n').trim()
}

export function buildWtatilTourSnapshot(tour) {
  return {
    catalog: tour,
    meal_type: tour?.mealType ?? null,
    transport_type: tour?.transportType ?? null,
    tour_type: tour?.tourType ?? null,
    tour_area: tour?.tourArea ?? null,
    countries: tour?.countries ?? null,
    visa_detail: tour?.visaDetail ?? null,
    definite_departure: tour?.definiteDeparture ?? null,
    suggested: tour?.suggested ?? null,
    supplier_id: tour?.supplierId ?? null,
    updated_at: tour?.updatedDate ?? null,
  }
}

/**
 * Wtatil katalog (+ opsiyonel enrich.transport) → `vertical_tour` gövdesi.
 * @param {Record<string, unknown>} tour
 * @param {{ transport?: Record<string, unknown> | null } | null} [enrich]
 */
export function buildWtatilVerticalTourMeta(tour, enrich = null) {
  const nights = Number(tour?.numberOfNights)
  const durationDays =
    Number.isFinite(nights) && nights > 0 ? String(nights + 1) : pickText(tour, 'durationDays', 'duration_days')

  const travelFromTransport = mapWtatilTransportToTravelType(tour?.transportType)
  const travelFromEnrich = mapWtatilTransportToTravelType(
    pickText(enrich?.transport, 'transportType', 'departureTransportType'),
  )

  const maxPeopleRaw =
    tour?.maxPerson ??
    tour?.maxPersonCount ??
    tour?.maxGroupSize ??
    tour?.quota ??
    enrich?.transport?.maxQuota

  let maxPeople = ''
  const maxNum = Number(maxPeopleRaw)
  if (Number.isFinite(maxNum) && maxNum > 0) maxPeople = String(Math.trunc(maxNum))

  const languages =
    pickText(tour, 'languages', 'language') ||
    (Array.isArray(tour?.languages) ? tour.languages.map((x) => pickText(x, 'name', 'text', 'code')).filter(Boolean).join(', ') : '')

  return {
    duration_days: durationDays,
    min_people: pickText(tour, 'minPerson', 'minPersonCount', 'minGroupSize'),
    max_people: maxPeople,
    visa_required: parseWtatilVisaRequired(tour?.visaDetail),
    travel_type: travelFromTransport || travelFromEnrich,
    is_guided: parseWtatilIsGuided(tour),
    accommodation_type: mapWtatilAccommodationType(tour),
    languages,
    min_day_before_booking: pickText(tour, 'minDayBeforeBooking', 'minBookingDay'),
    wtatil_package_ref: tour?.id != null ? String(tour.id) : '',
    includes: splitWtatilServiceList(tour?.freeServices),
    excludes: splitWtatilServiceList(tour?.paidServices),
    itinerary: parseWtatilItinerary(tour?.tourProgram),
  }
}

/** Panel PUT ile uyumlu zarf. */
export function wrapVerticalTourMeta(data) {
  return { category: 'tour', data }
}

/**
 * Snapshot + vertical_tour (+ isteğe bağlı çeviri) yazar.
 * @param {import('pg').Client} pgClient
 */
export async function applyWtatilTourVitrinFields(
  pgClient,
  listingId,
  { snapshot, verticalTour, localeTrId = null, title = null, description = null },
) {
  if (snapshot && Object.keys(snapshot).length) {
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'wtatil', 'snapshot', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [listingId, JSON.stringify(snapshot)],
    )
  }

  if (verticalTour && Object.keys(verticalTour).length) {
    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'vertical_tour', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [listingId, JSON.stringify(wrapVerticalTourMeta(verticalTour))],
    )
  }

  if (localeTrId && (title != null || description != null)) {
    await pgClient.query(
      `INSERT INTO listing_translations (listing_id, locale_id, title, description)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (listing_id, locale_id) DO UPDATE SET
         title = COALESCE(EXCLUDED.title, listing_translations.title),
         description = COALESCE(EXCLUDED.description, listing_translations.description)`,
      [listingId, localeTrId, title, description || null],
    )
  }
}

/** Katalog tur + enrich → vitrin paketi. */
export function buildWtatilTourVitrinPackage(tour, enrich = null) {
  return {
    snapshot: buildWtatilTourSnapshot(tour),
    verticalTour: buildWtatilVerticalTourMeta(tour, enrich),
    title: String(tour?.name || '').trim(),
    description: buildWtatilTourDescription(tour),
  }
}
