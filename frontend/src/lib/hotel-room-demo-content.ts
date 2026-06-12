import type { HotelRoomShowcaseItem } from '@/app/[locale]/(app)/(listings)/HotelRoomShowcase'
import { HOTEL_DEMO_LISTING_HANDLE } from '@/lib/hotel-detail-demo-content'

/** Demo oda galerisi — Unsplash (next.config remotePatterns). */
export const HOTEL_DEMO_ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=960&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=960&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=960&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=960&q=80',
] as const

export const HOTEL_DEMO_ROOM_DESCRIPTION =
  'Standard Double Room odalarımız Galata\'nın tarihi dokusuna uyumlu, modern ve ferah bir konfor sunar. Çift kişilik yatak, çalışma köşesi ve şehir manzaralı pencere ile şehri keşfederken dinlenebileceğiniz sakin bir ortam sağlar.'

export const HOTEL_DEMO_ROOM_AMENITIES = [
  'fast_wifi',
  'air_conditioning',
  'hair_dryer',
  'tv_smart',
  'shampoo',
  'body_soap',
  'safe',
  'minibar',
  'room_service',
] as const

/** Modalda * ile işaretlenecek ücretli özellikler. */
export const HOTEL_DEMO_ROOM_PAID_AMENITIES = new Set<string>(['minibar', 'room_service'])

export const HOTEL_DEMO_ROOM_SCORE = 8.6

export function applyHotelRoomDemoContent(
  handle: string,
  rooms: readonly HotelRoomShowcaseItem[],
): HotelRoomShowcaseItem[] {
  if (handle !== HOTEL_DEMO_LISTING_HANDLE) return [...rooms]
  return rooms.map((room) => ({
    ...room,
    images:
      room.images && room.images.length > 0 ? room.images : [...HOTEL_DEMO_ROOM_IMAGES],
    image: room.image?.trim() || HOTEL_DEMO_ROOM_IMAGES[0],
    description: room.description?.trim() || HOTEL_DEMO_ROOM_DESCRIPTION,
    sizeM2: room.sizeM2 ?? 24,
    beds: room.beds ?? 1,
    bedType: room.bedType?.trim() || '1 çift kişilik yatak',
    capacity: room.capacity ?? 2,
    amenities:
      room.amenities && room.amenities.length > 0
        ? room.amenities
        : [...HOTEL_DEMO_ROOM_AMENITIES],
    roomScore: room.roomScore ?? HOTEL_DEMO_ROOM_SCORE,
    paidAmenities:
      room.paidAmenities && room.paidAmenities.length > 0
        ? room.paidAmenities
        : [...HOTEL_DEMO_ROOM_PAID_AMENITIES],
  }))
}
