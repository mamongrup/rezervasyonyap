/**
 * TatilBudur / Bookeder oda tipi çarpanı — tek taban fiyattan oda farkı.
 * `scripts/enrich-tatilbudur-batch-prices.py` ile aynı mantık.
 */
export function hotelRoomRateFactor(name, index = 0) {
  const n = String(name || '').toLocaleLowerCase('tr-TR')
  if (/(suite|süit|suit|villa|family|aile|senior|(^|[^a-z])ev([^a-z]|$))/i.test(n)) return 1.35
  if (/(deluxe|delüks|superior|deniz|lake|havuz)/i.test(n)) return 1.18
  if (index === 0) return 1.0
  return 1.08 + Math.min(Number(index) || 0, 4) * 0.04
}

export function roundHotelNightlyTry(value) {
  const n = Math.round(Number(value) || 0)
  if (n <= 0) return 0
  if (n < 1000) return Math.max(500, Math.round(n / 50) * 50)
  return Math.round(n / 50) * 50
}

/**
 * Bazı odalarda rate varken diğerleri boşsa, taban (min mevcut) × oda çarpanı yazar.
 * Mevcut rate'lere dokunmaz.
 */
export function fillMissingHotelRoomRates(rooms, options = {}) {
  const list = Array.isArray(rooms) ? rooms.map((r) => ({ ...r, rates: [...(r.rates || [])] })) : []
  const existing = list.flatMap((room) =>
    (room.rates || [])
      .map((rate) => Number(rate.nightlyPrice ?? rate.nightly_price))
      .filter((n) => Number.isFinite(n) && n > 0),
  )
  const floor =
    existing.length > 0
      ? Math.min(...existing)
      : Number(options.floorNightly) > 0
        ? Number(options.floorNightly)
        : null
  if (floor == null) return list

  const template =
    list.find((room) => (room.rates || []).length > 0)?.rates?.[0] || {
      validFrom: options.validFrom ?? '2026-07-01',
      validTo: options.validTo ?? '2026-10-31',
      currency: options.currency ?? 'TRY',
      boardType: options.boardType ?? '',
    }

  return list.map((room, index) => {
    if ((room.rates || []).length > 0) return room
    const factor = hotelRoomRateFactor(room.name, index)
    const raw = floor * factor
    const nightlyPrice = Math.max(
      500,
      Math.abs(factor - 1) < 1e-9 ? Math.round(floor) : roundHotelNightlyTry(raw),
    )
    return {
      ...room,
      rates: [
        {
          validFrom: template.validFrom ?? template.valid_from ?? options.validFrom ?? null,
          validTo: template.validTo ?? template.valid_to ?? options.validTo ?? null,
          nightlyPrice,
          currency: String(template.currency || options.currency || 'TRY').toUpperCase(),
          boardType: String(
            template.boardType || template.board_type || room.boardType || options.boardType || '',
          ).trim(),
        },
      ],
    }
  })
}
