import { interpolate } from '@/utils/interpolate'

export type HotelRoomDisplayFields = {
  capacity: number | null
  bedType?: string | null
  beds?: number | null
  sizeM2?: number | null
}

export function getHotelRoomGuestLabel(
  room: Pick<HotelRoomDisplayFields, 'capacity'>,
  guestsShort: string,
): string | null {
  if (room.capacity == null) return null
  return interpolate(guestsShort, { count: String(room.capacity) })
}

export function getHotelRoomBedLabel(
  room: Pick<HotelRoomDisplayFields, 'bedType' | 'beds'>,
  bedsShort: string,
): string | null {
  if (room.bedType?.trim()) return room.bedType.trim()
  if (room.beds && room.beds > 0) {
    return interpolate(bedsShort, { count: String(room.beds) })
  }
  return null
}

export function getHotelRoomSizeLabel(
  room: Pick<HotelRoomDisplayFields, 'sizeM2'>,
  sizeTemplate: string,
): string | null {
  if (typeof room.sizeM2 !== 'number' || room.sizeM2 <= 0) return null
  return interpolate(sizeTemplate, { value: String(room.sizeM2) })
}

/** Modal üst satırı: kişi | yatak | alan */
export function buildHotelRoomMetaPipeLine(
  room: HotelRoomDisplayFields,
  guestsShort: string,
  bedsShort: string,
  sizeTemplate: string,
): string | null {
  const parts = [
    getHotelRoomGuestLabel(room, guestsShort),
    getHotelRoomBedLabel(room, bedsShort),
    getHotelRoomSizeLabel(room, sizeTemplate),
  ].filter(Boolean) as string[]
  return parts.length > 0 ? parts.join(' | ') : null
}
