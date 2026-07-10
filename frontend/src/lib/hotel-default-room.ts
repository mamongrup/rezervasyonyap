import type { HotelRoomShowcaseItem } from '@/app/[locale]/(app)/(listings)/HotelRoomShowcase'
import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'

/**
 * Tanımlı `hotel_rooms` kaydı olmayan oteller için sentetik "Standart Oda".
 * Bu id ile checkout ILAN BAZLI çalışmalı (gerçek oda id'si gönderilmez);
 * müsaitlik/fiyat API çağrıları 404 dönse de güvenli fallback `fallbackNightly`
 * (ilan vitrin/temel fiyatı) üzerinden çalışır.
 */
export const SYNTHETIC_HOTEL_ROOM_ID = '__vitrin_default_room__'

export function isSyntheticHotelRoomId(id: string | null | undefined): boolean {
  return (id ?? '').trim() === SYNTHETIC_HOTEL_ROOM_ID
}

/**
 * Oda kaydı olmayan bir otel için tek bir varsayılan oda üretir; hem rezervasyon
 * paneli (tarih → oda → yemek → kişi → toplam → Rezervasyon Yap) hem de otel
 * detayındaki oda listesi böylece her otelde görünür.
 */
export function buildDefaultHotelRoom(input: {
  name: string
  capacity: number | null
  images?: string[]
}): { bookingRoom: HotelRoomBookingOption; showcaseItem: HotelRoomShowcaseItem } {
  const name = input.name.trim() || 'Standart Oda'
  const capacityNum =
    input.capacity != null && Number.isFinite(input.capacity) && input.capacity > 0
      ? Math.floor(input.capacity)
      : null
  const images = (input.images ?? []).filter((u) => u.trim().length > 0)

  const bookingRoom: HotelRoomBookingOption = {
    id: SYNTHETIC_HOTEL_ROOM_ID,
    name,
    capacity: capacityNum != null ? String(capacityNum) : null,
    board_type: null,
    meta_json: '{}',
    unit_count: 1,
  }

  const showcaseItem: HotelRoomShowcaseItem = {
    id: SYNTHETIC_HOTEL_ROOM_ID,
    name,
    capacity: capacityNum,
    boardType: null,
    image: images[0] ?? null,
    images: images.length > 0 ? images : null,
    unitCount: 1,
  }

  return { bookingRoom, showcaseItem }
}
