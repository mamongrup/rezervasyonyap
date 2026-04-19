import type { FeaturedByRegionConfig, PageBuilderModule, TListingBase } from '@/types/listing-types'
import type { CategoryRegistryEntry } from '@/data/category-registry'
import type { TAuthor } from '@/data/authors'
import SectionFeaturedByRegion from '@/components/SectionFeaturedByRegion'
import { buildDefaultFeaturedRegionConfig } from '@/lib/featured-region-defaults'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

import HeroModule from './modules/HeroModule'
import PromoBannerModule from './modules/PromoBannerModule'
import WhyUsModule from './modules/WhyUsModule'
import TestimonialsModule from './modules/TestimonialsModule'
import NewsletterModule from './modules/NewsletterModule'
import StatsModule from './modules/StatsModule'
import TextBlockModule from './modules/TextBlockModule'
import FAQModule from './modules/FAQModule'
import TopProvidersModule from './modules/TopProvidersModule'
import BecomeProviderModule from './modules/BecomeProviderModule'
import ListingsModule from './modules/ListingsModule'
import type { ListingsModuleConfig } from './modules/ListingsModule'
import VideoGalleryModule from './modules/VideoGalleryModule'
import ImageTextModule from './modules/ImageTextModule'
import DestinationCardsModule from './modules/DestinationCardsModule'
import PartnersModule from './modules/PartnersModule'
import CategorySliderModule from './modules/CategorySliderModule'
import SlidersBannerModule from './modules/SlidersBannerModule'
import GeziOnerileriModule from './modules/GeziOnerileriModule'
import FeaturedPlacesModule from './modules/FeaturedPlacesModule'
import HowItWorksModule from './modules/HowItWorksModule'
import CategoryGridModule from './modules/CategoryGridModule'
import SectionVideosModule from './modules/SectionVideosModule'
import ClientSayModule from './modules/ClientSayModule'
import SearchResultsModule from './modules/SearchResultsModule'
import ActiveCampaignsModule from './modules/ActiveCampaignsModule'
import EarlyBookingPromoModule from './modules/EarlyBookingPromoModule'
import LastMinutePromoModule from './modules/LastMinutePromoModule'
import CouponsStripModule from './modules/CouponsStripModule'
import HolidayPackagesModule from './modules/HolidayPackagesModule'
import CrossSellWidgetModule from './modules/CrossSellWidgetModule'

interface PageBuilderRendererProps {
  modules: PageBuilderModule[]
  category: CategoryRegistryEntry
  /** Optional search form node to inject into hero */
  searchFormNode?: React.ReactNode
  /** Optional listings node to inject into listings sections (legacy fallback) */
  listingsNode?: React.ReactNode
  /** Optional categories/destinations node */
  categoriesNode?: React.ReactNode
  /** Tüm ilanlar — listings_grid/slider/featured_by_region modülleri için */
  allListings?: TListingBase[]
  /** İlan detail URL prefix */
  listingLinkBase?: string
  /** Fiyat birimi */
  priceUnit?: string
  /** Dil — featured_by_region boş metinleri ve varsayılanları için */
  locale?: string
  /** İlan sağlayıcı listesi — top_providers modülü için */
  authors?: TAuthor[]
  /** Arama sayfası context — search_results modülü için */
  searchContext?: {
    query: string
    categoryFilter?: string
    page?: number
  }
  /**
   * Slider/banner gibi sayfa-spesifik veri okuyan modüller için varsayılan
   * dosya anahtarı. Anasayfada `"homepage"`, kategori sayfalarında otomatik
   * olarak `category.slug` kullanılır.
   */
  pageKey?: string
  /**
   * Sunucuda listingCardRenderer ile üretilmiş kartlar (id → node).
   * Fonksiyon client bileşenine geçirilemediği için burada yalnızca Record kullanılır.
   */
  listingCardsById?: Record<string, React.ReactNode>
}

/**
 * Renders a list of page builder modules in order.
 * The `hero`, `listings_grid`, `listings_slider`, and `categories_grid` modules
 * receive real data via injected nodes from the parent server component.
 */
export default function PageBuilderRenderer({
  modules,
  category,
  searchFormNode,
  listingsNode,
  categoriesNode,
  allListings,
  listingLinkBase = '/otel',
  priceUnit = '/gece',
  locale = 'tr',
  authors = [],
  listingCardsById,
  searchContext,
  pageKey,
}: PageBuilderRendererProps) {
  const defaultSliderPageKey = pageKey ?? category.slug
  const messages = getMessages(locale)
  const enabled = [...modules].filter((m) => m.enabled).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-16 py-12 container">
      {enabled.map((module) => {
        const cfg = module.config as Record<string, unknown>

        switch (module.type) {
          case 'hero':
            // Hero is rendered OUTSIDE the container by CategoryPageTemplate
            return null

          case 'listings_grid':
          case 'listings_slider': {
            // listingCardsById + allListings — kartlar sunucuda üretildi (client’a fonksiyon yok)
            if (listingCardsById && allListings?.length) {
              const listingsCfg: ListingsModuleConfig = {
                title: cfg.title as string | undefined,
                subheading: cfg.subheading as string | undefined,
                filterMode: (cfg.filterMode as ListingsModuleConfig['filterMode']) ?? 'all',
                showTabs: (cfg.showTabs as boolean) ?? false,
                layout: module.type === 'listings_slider' ? 'slider' : 'grid',
                count: (cfg.count as number) ?? 8,
                viewAllHref: (cfg.viewAllHref as string) ?? `${category.categoryRoute}/all`,
                viewAllLabel: (cfg.viewAllLabel as string) ?? messages.common['View all'],
              }
              return (
                <ListingsModule
                  key={module.id}
                  config={listingsCfg}
                  allListings={allListings}
                  cardsByListingId={listingCardsById}
                />
              )
            }
            // Legacy fallback — injected node
            if (!listingsNode) return null
            return (
              <section key={module.id}>
                {Boolean(cfg.title) ? (
                  <h2 className="mb-8 text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">
                    {String(cfg.title)}
                  </h2>
                ) : null}
                {listingsNode}
              </section>
            )
          }

          case 'categories_grid':
            if (!categoriesNode) return null
            return (
              <section key={module.id}>
                {Boolean(cfg.title) ? (
                  <h2 className="mb-8 text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">
                    {String(cfg.title)}
                  </h2>
                ) : null}
                {categoriesNode}
              </section>
            )

          case 'promo_banner':
            return (
              <PromoBannerModule
                key={module.id}
                config={cfg as Parameters<typeof PromoBannerModule>[0]['config']}
              />
            )

          case 'sliders_banner':
            return (
              <SlidersBannerModule
                key={module.id}
                config={cfg as { pageKey?: string }}
                fallbackPageKey={defaultSliderPageKey}
                locale={locale}
              />
            )

          case 'why_us':
            return (
              <WhyUsModule
                key={module.id}
                config={cfg as Parameters<typeof WhyUsModule>[0]['config']}
              />
            )

          case 'testimonials':
            return (
              <TestimonialsModule
                key={module.id}
                config={{
                  ...(cfg as Parameters<typeof TestimonialsModule>[0]['config']),
                  categorySlug: category.slug,
                }}
              />
            )

          case 'newsletter':
            return (
              <NewsletterModule
                key={module.id}
                config={cfg as Parameters<typeof NewsletterModule>[0]['config']}
              />
            )

          case 'stats':
            return (
              <StatsModule
                key={module.id}
                config={cfg as Parameters<typeof StatsModule>[0]['config']}
              />
            )

          case 'text_block':
            return (
              <TextBlockModule
                key={module.id}
                config={cfg as Parameters<typeof TextBlockModule>[0]['config']}
              />
            )

          case 'faq':
            return (
              <FAQModule
                key={module.id}
                config={cfg as Parameters<typeof FAQModule>[0]['config']}
              />
            )

          case 'featured_by_region': {
            if (!allListings?.length) return null
            const regionCfg: FeaturedByRegionConfig =
              cfg.regions && Array.isArray(cfg.regions) && (cfg.regions as unknown[]).length > 0
                ? {
                    heading: (cfg.heading as string) || messages.homePage.featuredStay.heading,
                    subheading: (cfg.subheading as string) || '',
                    viewAllHref: (cfg.viewAllHref as string) || `${category.categoryRoute}/all`,
                    regions: cfg.regions as FeaturedByRegionConfig['regions'],
                  }
                : buildDefaultFeaturedRegionConfig(allListings, {
                    heading:
                      (cfg.heading as string) ||
                      interpolate(messages.categoryPage.featuredDefaultHeading, { category: category.name }),
                    subheading:
                      (cfg.subheading as string) || messages.categoryPage.featuredDefaultSubheading,
                    viewAllHref: (cfg.viewAllHref as string) || `${category.categoryRoute}/all`,
                  })
            return (
              <SectionFeaturedByRegion
                key={module.id}
                allListings={allListings}
                config={regionCfg}
                listingLinkBase={listingLinkBase}
                priceUnit={priceUnit}
              />
            )
          }

          case 'top_providers':
            return (
              <TopProvidersModule
                key={module.id}
                config={cfg as Parameters<typeof TopProvidersModule>[0]['config']}
                authors={authors}
                categorySlug={category.slug}
              />
            )

          case 'become_provider':
            return (
              <BecomeProviderModule
                key={module.id}
                config={cfg as Parameters<typeof BecomeProviderModule>[0]['config']}
              />
            )

          case 'video_gallery':
            return (
              <VideoGalleryModule
                key={module.id}
                config={cfg as Parameters<typeof VideoGalleryModule>[0]['config']}
              />
            )

          case 'image_text':
            return (
              <ImageTextModule
                key={module.id}
                config={cfg as Parameters<typeof ImageTextModule>[0]['config']}
              />
            )

          case 'destination_cards':
            return (
              <DestinationCardsModule
                key={module.id}
                config={cfg as Parameters<typeof DestinationCardsModule>[0]['config']}
              />
            )

          case 'partners':
            return (
              <PartnersModule
                key={module.id}
                config={cfg as Parameters<typeof PartnersModule>[0]['config']}
              />
            )

          case 'category_slider':
            return (
              <CategorySliderModule
                key={module.id}
                config={cfg as Parameters<typeof CategorySliderModule>[0]['config']}
              />
            )

          case 'gezi_onerileri':
            return (
              <GeziOnerileriModule
                key={module.id}
                config={{ ...(cfg as Parameters<typeof GeziOnerileriModule>[0]['config']), locale }}
              />
            )

          case 'featured_places':
            return (
              <FeaturedPlacesModule
                key={module.id}
                config={cfg as Parameters<typeof FeaturedPlacesModule>[0]['config']}
                locale={locale}
              />
            )

          case 'how_it_works':
            return (
              <HowItWorksModule
                key={module.id}
                config={cfg as Parameters<typeof HowItWorksModule>[0]['config']}
              />
            )

          case 'category_grid':
            return (
              <CategoryGridModule
                key={module.id}
                config={cfg as Parameters<typeof CategoryGridModule>[0]['config']}
              />
            )

          case 'section_videos':
            return (
              <SectionVideosModule
                key={module.id}
                config={cfg as Parameters<typeof SectionVideosModule>[0]['config']}
              />
            )

          case 'client_say':
            return (
              <ClientSayModule
                key={module.id}
                config={cfg as Parameters<typeof ClientSayModule>[0]['config']}
              />
            )

          case 'search_results':
            return (
              <SearchResultsModule
                key={module.id}
                config={cfg as Parameters<typeof SearchResultsModule>[0]['config']}
                query={searchContext?.query ?? ''}
                categoryFilter={searchContext?.categoryFilter}
                locale={locale}
                page={searchContext?.page ?? 1}
              />
            )

          // ─── Marketing modülleri (admin içerikleri vitrinde) ────────────────
          case 'active_campaigns':
            // @ts-expect-error Async Server Component — React 19 destekler
            return (
              <ActiveCampaignsModule
                key={module.id}
                config={cfg as Parameters<typeof ActiveCampaignsModule>[0]['config']}
                locale={locale}
              />
            )

          case 'early_booking_promo':
            // @ts-expect-error Async Server Component
            return (
              <EarlyBookingPromoModule
                key={module.id}
                config={cfg as Parameters<typeof EarlyBookingPromoModule>[0]['config']}
                locale={locale}
              />
            )

          case 'last_minute_promo':
            // @ts-expect-error Async Server Component
            return (
              <LastMinutePromoModule
                key={module.id}
                config={cfg as Parameters<typeof LastMinutePromoModule>[0]['config']}
                locale={locale}
              />
            )

          case 'coupons_strip':
            // @ts-expect-error Async Server Component
            return (
              <CouponsStripModule
                key={module.id}
                config={cfg as Parameters<typeof CouponsStripModule>[0]['config']}
                locale={locale}
              />
            )

          case 'holiday_packages':
            // @ts-expect-error Async Server Component
            return (
              <HolidayPackagesModule
                key={module.id}
                config={cfg as Parameters<typeof HolidayPackagesModule>[0]['config']}
                locale={locale}
              />
            )

          case 'cross_sell_widget':
            // @ts-expect-error Async Server Component
            return (
              <CrossSellWidgetModule
                key={module.id}
                config={cfg as Parameters<typeof CrossSellWidgetModule>[0]['config']}
                locale={locale}
              />
            )

          default:
            return null
        }
      })}
    </div>
  )
}
