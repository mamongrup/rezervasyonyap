import type { ActiveCampaignsConfig } from '@/components/page-builder/modules/ActiveCampaignsModule'
import type { BecomeProviderModuleConfig } from '@/components/page-builder/modules/BecomeProviderModule'
import type { CategoryGridModuleConfig } from '@/components/page-builder/modules/CategoryGridModule'
import type { CategorySliderModuleConfig } from '@/components/page-builder/modules/CategorySliderModule'
import type { ClientSayModuleConfig } from '@/components/page-builder/modules/ClientSayModule'
import type { CouponsStripConfig } from '@/components/page-builder/modules/CouponsStripModule'
import type { CrossSellWidgetConfig } from '@/components/page-builder/modules/CrossSellWidgetModule'
import type { DestinationCardsModuleConfig } from '@/components/page-builder/modules/DestinationCardsModule'
import type { EarlyBookingPromoConfig } from '@/components/page-builder/modules/EarlyBookingPromoModule'
import type { FAQModuleConfig } from '@/components/page-builder/modules/FAQModule'
import type { FeaturedPlacesModuleConfig } from '@/components/page-builder/modules/FeaturedPlacesModule'
import type { GeziOnerileriModuleConfig } from '@/components/page-builder/modules/GeziOnerileriModule'
import type { HolidayPackagesConfig } from '@/components/page-builder/modules/HolidayPackagesModule'
import type { HowItWorksModuleConfig } from '@/components/page-builder/modules/HowItWorksModule'
import type { ImageTextModuleConfig } from '@/components/page-builder/modules/ImageTextModule'
import type { LastMinutePromoConfig } from '@/components/page-builder/modules/LastMinutePromoModule'
import type { ListingsModuleConfig } from '@/components/page-builder/modules/ListingsModule'
import type { NewsletterModuleConfig } from '@/components/page-builder/modules/NewsletterModule'
import type { PartnersModuleConfig } from '@/components/page-builder/modules/PartnersModule'
import type { PromoBannerModuleConfig } from '@/components/page-builder/modules/PromoBannerModule'
import type { RegionSliderModuleConfig } from '@/components/page-builder/modules/RegionSliderModule'
import type { SearchResultsModuleConfig } from '@/components/page-builder/modules/SearchResultsModule'
import type { SectionVideosModuleConfig } from '@/components/page-builder/modules/SectionVideosModule'
import type { SlidersBannerModuleConfig } from '@/components/page-builder/modules/SlidersBannerModule'
import type { StatsModuleConfig } from '@/components/page-builder/modules/StatsModule'
import type { TestimonialsModuleConfig } from '@/components/page-builder/modules/TestimonialsModule'
import type { TextBlockModuleConfig } from '@/components/page-builder/modules/TextBlockModule'
import type { TopProvidersModuleConfig } from '@/components/page-builder/modules/TopProvidersModule'
import type { VideoGalleryConfig } from '@/components/page-builder/modules/VideoGalleryModule'
import type { WhyUsModuleConfig } from '@/components/page-builder/modules/WhyUsModule'

import type { FeaturedByRegionConfig, PageBuilderModuleType } from './listing-types'

/** JSON olarak saklanan serbest yapı — slot modülleri ve genişletilebilir alanlar */
export type PageBuilderJsonConfig = Record<string, unknown>

/** Kategori vitrin hero — `HeroModule` ile uyumlu; JSON’da ek anahtarlar saklanabilir */
export interface HeroModuleConfig {
  heading?: string
  subheading?: string
  ctaText?: string
  ctaHref?: string
  backgroundUrl?: string
  style?: 'full' | 'compact' | 'minimal'
  showSearchForm?: boolean
  overlayOpacity?: number
  /** Anasayfa vb. — dikey kategori sekmelerini gizle */
  hideVerticalTabs?: boolean
  images?: string[] | Record<string, unknown>
}

/**
 * Her `PageBuilderModuleType` için persist / render config.
 * Eksik anahtar `PageBuilderModule` birleşiminde tip hatası verir.
 */
export interface PageBuilderModuleConfigByType {
  hero: HeroModuleConfig
  listings_grid: ListingsModuleConfig
  listings_slider: ListingsModuleConfig
  featured_by_region: Partial<FeaturedByRegionConfig>
  top_providers: TopProvidersModuleConfig
  become_provider: BecomeProviderModuleConfig
  categories_grid: PageBuilderJsonConfig
  promo_banner: PromoBannerModuleConfig
  text_block: TextBlockModuleConfig
  image_text: ImageTextModuleConfig
  stats: StatsModuleConfig
  testimonials: TestimonialsModuleConfig
  newsletter: NewsletterModuleConfig
  destination_cards: DestinationCardsModuleConfig
  why_us: WhyUsModuleConfig
  faq: FAQModuleConfig
  partners: PartnersModuleConfig
  video_gallery: VideoGalleryConfig
  sliders_banner: SlidersBannerModuleConfig
  category_slider: CategorySliderModuleConfig
  travel_category_images: PageBuilderJsonConfig
  region_slider: RegionSliderModuleConfig
  gezi_onerileri: GeziOnerileriModuleConfig
  featured_places: FeaturedPlacesModuleConfig
  how_it_works: HowItWorksModuleConfig
  category_grid: CategoryGridModuleConfig
  section_videos: SectionVideosModuleConfig
  client_say: ClientSayModuleConfig
  search_results: SearchResultsModuleConfig
  active_campaigns: ActiveCampaignsConfig
  early_booking_promo: EarlyBookingPromoConfig
  last_minute_promo: LastMinutePromoConfig
  coupons_strip: CouponsStripConfig
  holiday_packages: HolidayPackagesConfig
  cross_sell_widget: CrossSellWidgetConfig
  region_detail_hero: PageBuilderJsonConfig
  region_detail_breadcrumb: PageBuilderJsonConfig
  region_detail_listings: PageBuilderJsonConfig
  region_detail_explore_hotels: PageBuilderJsonConfig
  region_detail_newsletter: PageBuilderJsonConfig
  region_detail_about: PageBuilderJsonConfig
  region_detail_travel_ideas: PageBuilderJsonConfig
  region_detail_places_vitrin: PageBuilderJsonConfig
  region_detail_nearby: PageBuilderJsonConfig
  region_detail_map: PageBuilderJsonConfig
  region_detail_subdivisions: PageBuilderJsonConfig
  region_detail_empty_hint: PageBuilderJsonConfig
}

export type PageBuilderModuleConfigFor<T extends PageBuilderModuleType> = PageBuilderModuleConfigByType[T]

export interface PageBuilderModuleBase {
  id: string
  enabled: boolean
  order: number
}

export type PageBuilderModule = {
  [T in PageBuilderModuleType]: PageBuilderModuleBase & {
    type: T
    config: PageBuilderModuleConfigFor<T>
  }
}[PageBuilderModuleType]
