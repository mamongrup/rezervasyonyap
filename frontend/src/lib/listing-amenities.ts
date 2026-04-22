/**
 * Konaklama ilan detayı — olanaklar bölümü için tek kaynak ikon kütüphanesi (Lucide).
 * Görünüm (boyut/renk): `ListingAmenitiesSection` — Chisfis satır ikonlarıyla uyum (24px, nötr gri, stroke 1.5).
 */
import type { LucideIcon } from 'lucide-react'
import {
  Bath,
  Bubbles,
  CableCar,
  ChefHat,
  Cctv,
  DoorOpen,
  Droplets,
  Glasses,
  Mountain,
  Palmtree,
  ParkingCircle,
  RefreshCw,
  Sparkles,
  SprayCan,
  Thermometer,
  Tv,
  Volume2,
  WashingMachine,
  Wifi,
  Wind,
} from 'lucide-react'

/** Otel / benzeri — şablondaki başlıca olanaklar */
export const HOTEL_AMENITY_IDS = [
  'fast_wifi',
  'bathtub',
  'hair_dryer',
  'sound_system',
  'shampoo',
  'body_soap',
  'water_energy',
  'jacuzzi',
  'cable_car',
  'tv_smart',
  'cctv',
  'vr_tour',
] as const

/** Tatil evi — doğru ikon eşlemesi ile */
export const VILLA_AMENITY_IDS = [
  'wifi',
  'full_kitchen',
  'smart_tv',
  'pool_garden',
  'climate',
  'bathroom_supplies',
  'laundry',
  'secure_parking',
  'balcony_terrace',
  'scenic_view',
] as const

export type HotelAmenityId = (typeof HOTEL_AMENITY_IDS)[number]
export type VillaAmenityId = (typeof VILLA_AMENITY_IDS)[number]
export type ListingAmenityId = HotelAmenityId | VillaAmenityId

/** Modalda gösterim sırası (iç/dış mekan + 3–4 grup); boş gruplar atlanır */
export const AMENITY_GROUP_ORDER = ['interior', 'exterior', 'comfort', 'digital'] as const
export type AmenityGroupId = (typeof AMENITY_GROUP_ORDER)[number]

const HOTEL_AMENITY_GROUP: Record<HotelAmenityId, AmenityGroupId> = {
  bathtub: 'interior',
  hair_dryer: 'interior',
  shampoo: 'interior',
  body_soap: 'interior',
  jacuzzi: 'interior',
  water_energy: 'interior',
  cable_car: 'exterior',
  cctv: 'exterior',
  sound_system: 'comfort',
  tv_smart: 'comfort',
  vr_tour: 'comfort',
  fast_wifi: 'digital',
}

const VILLA_AMENITY_GROUP: Record<VillaAmenityId, AmenityGroupId> = {
  full_kitchen: 'interior',
  climate: 'interior',
  bathroom_supplies: 'interior',
  laundry: 'interior',
  pool_garden: 'exterior',
  secure_parking: 'exterior',
  balcony_terrace: 'exterior',
  scenic_view: 'exterior',
  smart_tv: 'comfort',
  wifi: 'digital',
}

export function getAmenityGroupId(id: ListingAmenityId, variant: 'hotel' | 'villa'): AmenityGroupId {
  return variant === 'hotel'
    ? HOTEL_AMENITY_GROUP[id as HotelAmenityId]
    : VILLA_AMENITY_GROUP[id as VillaAmenityId]
}

/** Ana listedeki sıra korunarak gruplara ayrılır (her grupta öğe sırası listing sırasıyla uyumlu) */
export function buildGroupedAmenities(
  orderedIds: readonly ListingAmenityId[],
  variant: 'hotel' | 'villa',
): { groupId: AmenityGroupId; ids: ListingAmenityId[] }[] {
  const buckets: Record<AmenityGroupId, ListingAmenityId[]> = {
    interior: [],
    exterior: [],
    comfort: [],
    digital: [],
  }
  for (const id of orderedIds) {
    buckets[getAmenityGroupId(id, variant)].push(id)
  }
  return AMENITY_GROUP_ORDER.filter((g) => buckets[g].length > 0).map((groupId) => ({
    groupId,
    ids: buckets[groupId],
  }))
}

export const LISTING_AMENITY_ICONS = {
  fast_wifi: Wifi,
  bathtub: Bath,
  hair_dryer: Wind,
  sound_system: Volume2,
  shampoo: SprayCan,
  body_soap: Droplets,
  water_energy: RefreshCw,
  jacuzzi: Bubbles,
  cable_car: CableCar,
  tv_smart: Tv,
  cctv: Cctv,
  vr_tour: Glasses,
  wifi: Wifi,
  full_kitchen: ChefHat,
  smart_tv: Tv,
  pool_garden: Palmtree,
  climate: Thermometer,
  bathroom_supplies: Sparkles,
  laundry: WashingMachine,
  secure_parking: ParkingCircle,
  balcony_terrace: DoorOpen,
  scenic_view: Mountain,
} as const satisfies Record<ListingAmenityId, LucideIcon>

export function getListingAmenityIcon(id: ListingAmenityId): LucideIcon {
  return LISTING_AMENITY_ICONS[id]
}
