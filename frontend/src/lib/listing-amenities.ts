/**
 * Konaklama ilan detayı — olanaklar bölümü için tek kaynak ikon kütüphanesi (Lucide).
 * Görünüm (boyut/renk): `ListingAmenitiesSection` — Chisfis satır ikonlarıyla uyum (24px, nötr gri, stroke 1.5).
 */
import type { LucideIcon } from 'lucide-react'
import {
  AirVent,
  Anchor,
  Baby,
  Bath,
  BedDouble,
  Bell,
  Bubbles,
  CableCar,
  ChefHat,
  Cctv,
  Coffee,
  Compass,
  Crown,
  DoorOpen,
  Droplets,
  Dumbbell,
  Flame,
  Glasses,
  Heart,
  Landmark,
  Microwave,
  Mountain,
  Palmtree,
  ParkingCircle,
  RefreshCw,
  Refrigerator,
  Sailboat,
  Shield,
  ShieldCheck,
  Ship,
  Shirt,
  Sparkles,
  SprayCan,
  Thermometer,
  Trees,
  Tv,
  Umbrella,
  Users,
  UtensilsCrossed,
  Volume2,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
  Wine,
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
    const groupId = getAmenityGroupId(id, variant) ?? 'comfort'
    buckets[groupId].push(id)
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

/** Bravo `imported_amenity` slug → Lucide (panel ikonu yoksa). */
/** Tatil evi vitrin temaları — `category_theme_items` + yaygın ek kodlar (`pool`, `jacuzzi`). */
export const HOLIDAY_THEME_ICONS: Record<string, LucideIcon> = {
  sea_view: Waves,
  beachfront: Umbrella,
  conservative: ShieldCheck,
  luxury: Crown,
  honeymoon: Heart,
  honeymoon_villa: Heart,
  family: Users,
  nature: Trees,
  historic: Landmark,
  jacuzzi: Bubbles,
  spa: Bath,
  pool: Palmtree,
}

/** Yat kiralama vitrin temaları — `yacht_charter` + ortak kodlar. */
export const YACHT_THEME_ICONS: Record<string, LucideIcon> = {
  ...HOLIDAY_THEME_ICONS,
  bareboat: Compass,
  motor_yat: Ship,
  motor_yacht: Ship,
  yelkenli: Sailboat,
  sailing: Sailboat,
  katamaran: Ship,
  gulet: Anchor,
  superyat: Crown,
  rib: Ship,
  crewed: Users,
  charter_with_captain: Anchor,
  fishing: Waves,
  diving: Waves,
  water_sports: Waves,
}

export const IMPORTED_AMENITY_ICONS: Record<string, LucideIcon> = {
  'bebek-besigi': Baby,
  'bebeklere-uygun': Baby,
  bilardo: Dumbbell,
  balkon: DoorOpen,
  balcony: DoorOpen,
  barbeku: Flame,
  barbekü: Flame,
  bbq: Flame,
  'bulasik-makinesi': Bubbles,
  // Eski TR slug (ı/ş NFD bozulması): Bulaşık → bulas-k-…
  'bulas-k-makinesi': Bubbles,
  buzdolabi: Refrigerator,
  buzdolab: Refrigerator,
  'camasir-makinesi': WashingMachine,
  'camas-r-makinesi': WashingMachine,
  'cocuklara-uygun': Users,
  'dus-kabini': Bath,
  garaj: ParkingCircle,
  'havlu-nevresim': BedDouble,
  internet: Wifi,
  jakuzi: Bubbles,
  'kahve-makinasi': Coffee,
  'kahve-makinas': Coffee,
  kettle: Coffee,
  klima: AirVent,
  'mama-sandalyesi': Baby,
  mangal: Flame,
  'masa-tenisi': Dumbbell,
  mikrodalga: Microwave,
  'mutfak-gerecleri': ChefHat,
  'oda-ici-banyo': Bath,
  otopark: ParkingCircle,
  'sac-kurutma': Wind,
  sauna: Bath,
  'sauna-hamam': Bath,
  'spor-salonu': Dumbbell,
  supurge: SprayCan,
  'tost-makinesi': Flame,
  'tv-dvd': Tv,
  'tv-uydu': Tv,
  utu: Shirt,
  'utu-utu-masasi': Shirt,
  uydu: Tv,
  'wi-fi': Wifi,
  wifi: Wifi,
  generator: RefreshCw,
  air_conditioning: AirVent,
  elevator: DoorOpen,
  reception_24h: RefreshCw,
  breakfast: UtensilsCrossed,
  safe: Shield,
  minibar: Wine,
  room_service: Bell,
  water_toys: Waves,
  snorkeling: Waves,
  tender_dinghy: Ship,
}

/** Anahtar/etiket içinde geçen kelimeye göre tema ikonu (Lucide). */
const AMENITY_KEYWORD_ICONS: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  [/wi-?fi|internet/, Wifi],
  [/buzdolab|fridge|refrigerat/, Refrigerator],
  [/bulas|dishwasher/, Bubbles],
  [/camas|washer|laundry|washing/, WashingMachine],
  [/klima|air.?cond|airvent/, AirVent],
  [/kahve|coffee|kettle|cay/, Coffee],
  [/mikrodalga|microwave/, Microwave],
  [/tost|toaster|mangal|barbe|bbq|grill/, Flame],
  [/utu|iron/, Shirt],
  [/balkon|balcony|teras|terrace/, DoorOpen],
  [/sauna|hamam/, Bath],
  [/jakuzi|jacuzzi|spa/, Bubbles],
  [/bebek|baby|mama/, Baby],
  [/cocuk|child|kids|family|aile/, Users],
  [/\btv\b|uydu|dvd|smart.?tv/, Tv],
  [/otopark|garaj|parking|park/, ParkingCircle],
  [/dus|shower|banyo|bath|toilet/, Bath],
  [/sac.?kurut|hair.?dry/, Wind],
  [/mutfak|kitchen|chef|ocak/, ChefHat],
  [/havuz|pool/, Palmtree],
  [/deniz|sea|beach|plaj/, Waves],
]

export function getImportedAmenityIcon(key: string): LucideIcon | null {
  const k = String(key ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
  if (!k) return null
  const dashed = k.replace(/_/g, '-')
  if (IMPORTED_AMENITY_ICONS[k]) return IMPORTED_AMENITY_ICONS[k]
  if (IMPORTED_AMENITY_ICONS[dashed]) return IMPORTED_AMENITY_ICONS[dashed]
  for (const [re, icon] of AMENITY_KEYWORD_ICONS) {
    if (re.test(dashed) || re.test(k)) return icon
  }
  return null
}

export function getHolidayThemeIcon(key: string): LucideIcon | null {
  const k = String(key ?? '').trim().toLowerCase()
  if (!k) return null
  return HOLIDAY_THEME_ICONS[k] ?? null
}

export function getYachtThemeIcon(key: string): LucideIcon | null {
  const k = String(key ?? '').trim().toLowerCase()
  if (!k) return null
  return YACHT_THEME_ICONS[k] ?? null
}

export function getStayRentalThemeIcon(
  key: string,
  category: 'holiday_home' | 'yacht_charter' = 'holiday_home',
): LucideIcon | null {
  if (category === 'yacht_charter') {
    return getYachtThemeIcon(key) ?? getHolidayThemeIcon(key)
  }
  return getHolidayThemeIcon(key)
}

export function getAmenityIconForKey(key: string, label?: string): LucideIcon {
  const k = String(key ?? '').trim().toLowerCase()
  if (k in LISTING_AMENITY_ICONS) {
    return getListingAmenityIcon(k as ListingAmenityId)
  }
  const themeIcon = getHolidayThemeIcon(k)
  if (themeIcon) return themeIcon
  return (
    getImportedAmenityIcon(k) ??
    (label ? getImportedAmenityIcon(label) : null) ??
    Sparkles
  )
}
