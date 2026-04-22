/**
 * Universal listing type definitions for all category card variants.
 * Each category card is a thin wrapper around ListingCard with a specific config.
 */

import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import type { HolidayHomePools } from '@/lib/listing-pools'

export type MealPlanSummary = 'room_only' | 'meal_only' | 'both'

/** Konaklama rezervasyonu — panelden (`listings` + `listing_meta`) vitrine yansır */
export interface StayBookingRules {
  /** Minimum konaklama süresi (gece) — `listings.min_stay_nights` */
  minStayNights?: number
  /** Kaç gün önceden rezervasyon — `listing_meta.min_advance_booking_days` */
  minAdvanceBookingDays?: number
  /** Bu geceden kısa konaklamalarda ek ücret — `listing_meta.min_short_stay_nights` + `short_stay_fee` */
  minShortStayNights?: number
  shortStayFeeAmount?: number
  /** `listings.allow_sub_min_stay_gap_booking` — vitrin takviminde ayrıntı için */
  allowSubMinStayGapBooking?: boolean
}

export interface TListingBase {
  id: string
  title: string
  handle: string
  address?: string
  /** Şehir / bölge adı (ör. "Antalya", "İstanbul") — bölgeye göre gruplamada kullanılır */
  city?: string
  price?: string
  /** API / sayısal fiyat — seçilen para birimine çevrilebilir */
  priceAmount?: number
  /** ISO para kodu (örn. TRY, EUR) */
  priceCurrency?: string
  reviewStart?: number
  reviewCount?: number
  like?: boolean
  saleOff?: string | null
  /** İndirim yüzdesi — sayısal değer, ör. 20 => "%20 indirim" */
  discountPercent?: number
  /** Yeni ilan — son 30 gün içinde eklendi */
  isNew?: boolean
  /** Kampanyalı ilan — özel kampanya veya erken rezervasyon fırsatı */
  isCampaign?: boolean
  /** İlan eklenme tarihi (ISO string) */
  createdAt?: string
  isAds?: string | null
  /** Kültür ve Turizm Bakanlığı / tesis kayıt no — vitrin */
  ministryLicenseRef?: string
  /** Ön ödeme yüzdesi (sayısal metin) — vitrin */
  prepaymentPercent?: string
  /** İptal politikası — panelden serbest metin (`listings.cancellation_policy_text`) */
  cancellationPolicyText?: string
  /** Otel dikeyi — panel `hotel_type` kodu; vitrinde tema öğesi etiketi ile gösterilir */
  hotelTypeCode?: string
  /** Tatil evi tema kodları (API / mock) */
  themeCodes?: string[]
  /** Konaklama rezervasyon kuralları (API) */
  stayBookingRules?: StayBookingRules
  /** Hasar depozitosu — `listings.first_charge_amount` (vitrin arama) */
  firstChargeAmount?: number
  /** Tatil evi dikey meta `extra_fees` (etiket + tutar + birim) */
  listingExtraFees?: Array<{ label: string; amount: string; unit: string }>
  featuredImage?: string
  galleryImgs?: string[]
  listingCategory?: string
  /**
   * Backend `product_categories.code` — API `category_code` / `listing_vertical`.
   * SEO JSON-LD ve dikey seçimde `listingCategory` metninden önceliklidir.
   */
  listingVertical?: CatalogListingVerticalCode
  description?: string
  map?: { lat: number; lng: number }
  /**
   * Yemek planı özeti — listing kartlarında rozet göstermek için.
   * `'meal_only'` veya `'both'` ise yemek badgesi gösterilir.
   */
  mealPlanSummary?: MealPlanSummary | null
  /** Otel / tatil evi / yat vitrin kartları ve arama sonuçları (diğer dikeylerde kullanılmaz) */
  maxGuests?: number
  bedrooms?: number
  beds?: number
  bathrooms?: number
}

// ─── Konaklama Türleri ────────────────────────────────────────────────────────

export interface TListingHotel extends TListingBase {
  stars?: number
}

export interface TListingHolidayHome extends TListingBase {
  pool?: boolean
  beachFront?: boolean
  /** Panel `vertical_holiday_home` meta — açık / ısıtmalı / çocuk havuzu */
  pools?: HolidayHomePools
  /** API’de havuz yokken gösterilen örnek veri */
  poolsDemo?: boolean
}

export interface TListingYacht extends TListingBase {
  lengthM?: number
  capacity?: number
  cabins?: number
  crew?: number
  type?: string // 'gulet' | 'katamaran' | 'motor yat'
}

// ─── Deneyim Türleri ──────────────────────────────────────────────────────────

export interface TListingTour extends TListingBase {
  durationDays?: number
  maxGroupSize?: number
  difficulty?: 'easy' | 'moderate' | 'hard'
  included?: string[]
  departureCity?: string
}

export interface TListingActivity extends TListingBase {
  durationHours?: number
  maxGroupSize?: number
  minAge?: number
  included?: string[]
}

export interface TListingCruise extends TListingBase {
  nights?: number
  ports?: string[]
  shipName?: string
  departurePort?: string
  arrivalPort?: string
}

export interface TListingHajj extends TListingBase {
  packageType?: 'hac' | 'umre'
  departureCity?: string
  departureDate?: string
  nights?: number
  hotelStars?: number
  flightIncluded?: boolean
  transportIncluded?: boolean
  visaIncluded?: boolean
}

export interface TListingVisa extends TListingBase {
  country?: string
  countryCode?: string // ISO 2-letter for flag
  visaType?: string // 'Turistik' | 'İş' | 'Öğrenci' | 'e-Vize'
  processingDays?: number
  maxStayDays?: number
  price?: string
  isOnlineApplicable?: boolean
  requiredDocuments?: string[]
}

// ─── Ulaşım Türleri ───────────────────────────────────────────────────────────

export interface TListingTransfer extends TListingBase {
  fromLocation?: string
  toLocation?: string
  vehicleType?: string // 'VIP Sedan' | 'Minivan' | 'Otobüs'
  capacity?: number
  isPrivate?: boolean
  durationMin?: number
}

export interface TListingFerry extends TListingBase {
  fromPort?: string
  toPort?: string
  company?: string
  companyLogo?: string
  departureTime?: string
  durationMin?: number
  vehicleAllowed?: boolean
  cabinAvailable?: boolean
}

export interface TListingCar extends TListingBase {
  seats?: number
  gearshift?: string
  airbags?: number
  fuelType?: string
}

// ─── Kategori filtre sekmeleri (`ListingFilterTabs` / `CategoryPageTemplate`) ─

export type FilterOption =
  | {
      label: string
      name: string
      tabUIType: 'checkbox'
      options: { name: string; value?: string; description?: string; defaultChecked?: boolean }[]
    }
  | {
      label: string
      name: string
      tabUIType: 'select-number'
      options: { name: string; max: number }[]
    }
  | {
      label: string
      name: string
      tabUIType: 'price-range'
      min: number
      max: number
    }

// ─── Kart Konfigürasyonu ──────────────────────────────────────────────────────

export interface CardConfig {
  /** URL prefix for the detail page link, e.g. '/otel' */
  linkBase: string
  /** Price unit label shown after the price, e.g. '/gece' */
  priceUnit?: string
  /** Image ratio class, e.g. 'aspect-w-4 aspect-h-3' */
  ratioClass?: string
  /** Function to extract an extra info line from the listing */
  extraInfo?: (data: TListingBase, locale: string) => string | null
  /** Badge text for the listing category label override */
  categoryLabel?: string
}

// ─── Page Builder Türleri ─────────────────────────────────────────────────────

export type PageBuilderModuleType =
  | 'hero'
  | 'listings_grid'
  | 'listings_slider'
  | 'featured_by_region'
  | 'top_providers'
  | 'become_provider'
  | 'categories_grid'
  | 'promo_banner'
  | 'text_block'
  | 'image_text'
  | 'stats'
  | 'testimonials'
  | 'newsletter'
  | 'destination_cards'
  | 'why_us'
  | 'faq'
  | 'partners'
  | 'video_gallery'
  | 'sliders_banner'
  // Anasayfa & arama sayfası modülleri
  | 'category_slider'
  | 'gezi_onerileri'
  | 'featured_places'
  | 'how_it_works'
  | 'category_grid'
  | 'section_videos'
  | 'client_say'
  | 'search_results'
  // Marketing modülleri (admin → vitrin)
  | 'active_campaigns'
  | 'early_booking_promo'
  | 'last_minute_promo'
  | 'coupons_strip'
  | 'holiday_packages'
  | 'cross_sell_widget'

/** Bölgeye göre öne çıkarma modülü config tipi */
export interface FeaturedRegionEntry {
  name: string        // "Antalya"
  slug: string        // "antalya"
  listingIds?: string[] // boşsa o şehrin tüm ilanları gösterilir
}

export interface FeaturedByRegionConfig {
  heading?: string
  subheading?: string
  viewAllHref?: string
  regions: FeaturedRegionEntry[]
}

export interface PageBuilderModule {
  id: string
  type: PageBuilderModuleType
  enabled: boolean
  order: number
  config: Record<string, unknown>
}

export interface CategoryPageBuilderConfig {
  categorySlug: string
  modules: PageBuilderModule[]
  updatedAt: string
}
