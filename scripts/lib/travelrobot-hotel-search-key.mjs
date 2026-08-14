/** SearchHotel yanıtındaki GetHotelRoomPrices anahtar adaylarını toplar. */
export function pickHotelSearchKeys(searchPayload, hotelRow = null) {
  const p = searchPayload?.Result ?? searchPayload?.result ?? searchPayload
  const row = hotelRow ?? {}
  const candidates = [
    row.SearchKey ?? row.searchKey ?? row.Data?.SearchKey ?? row.data?.searchKey,
    p?.SearchKey,
    p?.searchKey,
    row.Data?.Key,
    row.data?.key,
    row.Key,
    row.key,
    p?.Key,
    p?.key,
  ]
  return [...new Set(candidates.map((key) => String(key ?? '').trim()).filter(Boolean))]
}

export function pickHotelSearchKey(searchPayload, hotelRow = null) {
  return pickHotelSearchKeys(searchPayload, hotelRow)[0] ?? null
}
