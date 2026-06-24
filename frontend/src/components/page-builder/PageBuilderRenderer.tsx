import { Fragment, type CSSProperties, type ReactNode } from 'react'
import type { FeaturedByRegionConfig, PageBuilderModule, TListingBase } from '@/types/listing-types'
import type { CategoryRegistryEntry } from '@/data/category-registry'
import type { TAuthor } from '@/data/authors'
import SectionFeaturedByRegion from '@/components/SectionFeaturedByRegion'
import { buildDefaultFeaturedRegionConfig } from '@/lib/featured-region-defaults'
import { resolveListingPriceUnit } from '@/lib/listing-category-display'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { pickLocalized, type LocalizedText } from '@/lib/localized-text'

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
import CategorySliderModule, { type CategorySliderModuleConfig } from './modules/CategorySliderModule'
import RegionSliderModule from './modules/RegionSliderModule'
import SlidersBannerModule from './modules/SlidersBannerModule'
import GeziOnerileriModule from './modules/GeziOnerileriModule'
import FeaturedPlacesModule from './modules/FeaturedPlacesModule'
import HowItWorksModule from './modules/HowItWorksModule'
import CategoryGridModule from './modules/CategoryGridModule'
import CategoryHubGridModule from './modules/CategoryHubGridModule'
import SectionVideosModule from './modules/SectionVideosModule'
import ClientSayModule from './modules/ClientSayModule'
import SearchResultsModule from './modules/SearchResultsModule'
import { renderMarketingModuleChunk } from './MarketingModulesDynamic'
import { getSharedTravelCategoryThumbnailsRaw } from '@/data/page-builder-config'
import { mergeRawThumbnailMaps } from '@/lib/category-thumbnail-entry'

/** `/bolge/…` vitrinında page builder slot’ları */
export interface RegionDetailPageSlots {
  hero: ReactNode
  breadcrumb: ReactNode
  listings: ReactNode
  exploreHotels: ReactNode | null
  newsletter: ReactNode
  about: ReactNode | null
  travelIdeas: ReactNode | null
  routes: ReactNode | null
  placesVitrin: ReactNode | null
  nearby: ReactNode | null
  map: ReactNode | null
  subdivisions: ReactNode | null
  emptyHint: ReactNode | null
}

/** Modül config içinden categoryThumbnails (string veya `{ src, objectPosition }`). */
function categoryThumbnailsRawFromModuleConfig(config: unknown): Record<string, unknown> {
  const raw = (config as Record<string, unknown> | undefined)?.categoryThumbnails
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim()
    if (!key) continue
    if (typeof v === 'string') {
      const t = v.trim()
      if (t) out[key] = t
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[key] = v
    }
  }
  return out
}

/** travel_category_images katmanı */
function thumbnailsFromTravelCategoryImagesModulesRaw(enabled: PageBuilderModule[]): Record<string, unknown> {
  return enabled.reduce<Record<string, unknown>>((acc, m) => {
    if (m.type !== 'travel_category_images') return acc
    const t = (m.config as Record<string, unknown> | undefined)?.thumbnails
    if (!t || typeof t !== 'object' || Array.isArray(t)) return acc
    for (const [k, v] of Object.entries(t as Record<string, unknown>)) {
      const key = k.trim()
      if (!key) continue
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (trimmed) acc[key] = trimmed
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        acc[key] = v
      }
    }
    return acc
  }, {})
}

/**
 * Bu sayfadaki slider/grid modüllerinde tanımlı `categoryThumbnails` birleşimi
 * (modül sırasına göre ilk tanımlanan slug kalır).
 */
function implicitSharedThumbnailsRawFirstWins(enabled: PageBuilderModule[]): Record<string, unknown> {
  const acc: Record<string, unknown> = {}
  for (const m of enabled) {
    if (m.type !== 'category_slider' && m.type !== 'category_grid') continue
    const next = categoryThumbnailsRawFromModuleConfig(m.config)
    for (const [k, v] of Object.entries(next)) {
      if (!(k in acc)) acc[k] = v
    }
  }
  return acc
}

interface PageBuilderRendererProps {
  modules: PageBuilderModule[]
  category: CategoryRegistryEntry
  /** Optional search form node to inject into hero */
  searchFormNode?: ReactNode
  /** Optional listings node to inject into listings sections (legacy fallback) */
  listingsNode?: ReactNode
  /** Optional categories/destinations node */
  categoriesNode?: ReactNode
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
  listingCardsById?: Record<string, ReactNode>
  /** «Tümünü gör» — locale dahil vitrin yolu (örn. /tr/turlar/all) */
  listingsBrowseHref?: string
  /** Varsayılan `div` — anasayfada `section` ile ek sarmalayıcı olmadan semantik + daha az DOM */
  rootAs?: 'div' | 'section'
  /** Kök öğeye (örn. `contentVisibility` — PSI DOM/style maliyeti) */
  rootStyle?: CSSProperties
  /** Kategori vitrinı | bölge detay vitrinı */
  layoutVariant?: 'category' | 'region_detail'
  /** Yalnız `layoutVariant === 'region_detail'` iken kullanılır */
  regionSlots?: RegionDetailPageSlots
}

/**
 * Renders a list of page builder modules in order.
 * The `hero`, `listings_grid`, `listings_slider`, and `categories_grid` modules
 * receive real data via injected nodes from the parent server component.
 */
export default async function PageBuilderRenderer({
  modules,
  category,
  searchFormNode,
  listingsNode,
  categoriesNode,
  allListings,
  listingLinkBase = '/otel',
  priceUnit,
  locale = 'tr',
  authors = [],
  listingCardsById,
  listingsBrowseHref,
  searchContext,
  pageKey,
  rootAs = 'div',
  rootStyle,
  layoutVariant = 'category',
  regionSlots,
}: PageBuilderRendererProps) {
  const isRegionDetailLayout = layoutVariant === 'region_detail'
  const defaultSliderPageKey = pageKey ?? (isRegionDetailLayout ? 'bolge-detay' : category.slug)
  const messages = getMessages(locale)
  const effectivePriceUnit =
    priceUnit ?? resolveListingPriceUnit(category.detailRoute, locale)
  const defaultListingsBrowseHref =
    listingsBrowseHref ?? `${category.categoryRoute}/all`
  const enabled = [...modules].filter((m) => m.enabled).sort((a, b) => a.order - b.order)

  // Metin alanları artık `{ tr: "...", en: "...", ... }` olarak saklanabilir.
  // Modüller çoğunlukla string beklediği için burada locale'e göre çözüyoruz.
  function looksLikeLocalizedText(v: unknown): v is LocalizedText {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false
    const entries = Object.entries(v as Record<string, unknown>)
    if (entries.length === 0) return false
    let ok = 0
    for (const [k, val] of entries) {
      if (typeof val !== 'string') return false
      const code = k.trim().toLowerCase()
      if (/^[a-z]{2}(-[a-z0-9]{1,8})?$/i.test(code)) ok += 1
    }
    return ok >= 1
  }

  function resolveLocalizedDeep(v: unknown): unknown {
    if (looksLikeLocalizedText(v)) return pickLocalized(v, locale, '')
    if (Array.isArray(v)) return v.map(resolveLocalizedDeep)
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        out[k] = resolveLocalizedDeep(val)
      }
      return out
    }
    return v
  }

  const enabledResolved: PageBuilderModule[] = enabled.map((m) => ({
    ...m,
    // `resolveLocalizedDeep` stringleştirir; tip daraltması için union yapıyı koruyoruz.
    config: resolveLocalizedDeep(m.config) as PageBuilderModule['config'],
  })) as PageBuilderModule[]
  const needsCategoryThumbnails = enabled.some(
    (m) =>
      m.type === 'category_slider' ||
      m.type === 'category_grid' ||
      m.type === 'travel_category_images',
  )

  /**
   * Kategori kart thumb birleşim sırası (sonrakiler öncekini ezer):
   * 1) İçerik → Kategori Resimleri (`shared-travel-category-thumbnails.json`)
   * 2) Bu sayfadaki slider/grid modüllerinde tanımlı `categoryThumbnails` (ilk modül öncelikli)
   * 3) `travel_category_images` modülü (çoğunlukla ana sayfa)
   * Modül satırındaki `categoryThumbnails` en son yayına girer (slider/grid özel alanı).
   */
  const sharedCategoryThumbnails = needsCategoryThumbnails
    ? mergeRawThumbnailMaps(
        await getSharedTravelCategoryThumbnailsRaw(),
        implicitSharedThumbnailsRawFirstWins(enabled),
        thumbnailsFromTravelCategoryImagesModulesRaw(enabled),
      )
    : {}

  const Root = rootAs

  const rootLayoutClass = isRegionDetailLayout
    ? 'flex flex-col gap-0 min-w-0'
    : 'flex flex-col gap-16 py-12 container'

  return (
    <Root className={rootLayoutClass} style={rootStyle}>
      {await Promise.all(
        enabledResolved.map(async (module) => {
        switch (module.type) {
          case 'region_detail_hero':
            if (!isRegionDetailLayout || !regionSlots?.hero) return null
            return <Fragment key={module.id}>{regionSlots.hero}</Fragment>

          case 'region_detail_breadcrumb':
            if (!isRegionDetailLayout || !regionSlots?.breadcrumb) return null
            return <Fragment key={module.id}>{regionSlots.breadcrumb}</Fragment>

          case 'region_detail_listings':
            if (!isRegionDetailLayout || !regionSlots?.listings) return null
            return <Fragment key={module.id}>{regionSlots.listings}</Fragment>

          case 'region_detail_explore_hotels':
            if (!isRegionDetailLayout || !regionSlots?.exploreHotels) return null
            return <Fragment key={module.id}>{regionSlots.exploreHotels}</Fragment>

          case 'region_detail_newsletter':
            if (!isRegionDetailLayout || !regionSlots?.newsletter) return null
            return <Fragment key={module.id}>{regionSlots.newsletter}</Fragment>

          case 'region_detail_about':
            if (!isRegionDetailLayout || !regionSlots?.about) return null
            return <Fragment key={module.id}>{regionSlots.about}</Fragment>

          case 'region_detail_travel_ideas':
            if (!isRegionDetailLayout || !regionSlots?.travelIdeas) return null
            return <Fragment key={module.id}>{regionSlots.travelIdeas}</Fragment>

          case 'region_detail_routes':
            if (!isRegionDetailLayout || !regionSlots?.routes) return null
            return <Fragment key={module.id}>{regionSlots.routes}</Fragment>

          case 'region_detail_places_vitrin':
            if (!isRegionDetailLayout || !regionSlots?.placesVitrin) return null
            return <Fragment key={module.id}>{regionSlots.placesVitrin}</Fragment>

          case 'region_detail_nearby':
            if (!isRegionDetailLayout || !regionSlots?.nearby) return null
            return <Fragment key={module.id}>{regionSlots.nearby}</Fragment>

          case 'region_detail_map':
            if (!isRegionDetailLayout || !regionSlots?.map) return null
            return <Fragment key={module.id}>{regionSlots.map}</Fragment>

          case 'region_detail_subdivisions':
            if (!isRegionDetailLayout || !regionSlots?.subdivisions) return null
            return <Fragment key={module.id}>{regionSlots.subdivisions}</Fragment>

          case 'region_detail_empty_hint':
            if (!isRegionDetailLayout || !regionSlots?.emptyHint) return null
            return <Fragment key={module.id}>{regionSlots.emptyHint}</Fragment>

          case 'hero':
            // Hero is rendered OUTSIDE the container by CategoryPageTemplate
            return null

          case 'listings_grid':
          case 'listings_slider': {
            const cfg = module.config
            // listingCardsById + allListings — kartlar sunucuda üretildi (client’a fonksiyon yok)
            if (listingCardsById && allListings?.length) {
              const listingsCfg: ListingsModuleConfig = {
                title: cfg.title,
                subheading: cfg.subheading,
                filterMode: cfg.filterMode ?? 'all',
                showTabs: cfg.showTabs ?? false,
                layout: module.type === 'listings_slider' ? 'slider' : 'grid',
                count: cfg.count ?? 8,
                viewAllHref: cfg.viewAllHref ?? defaultListingsBrowseHref,
                viewAllLabel: cfg.viewAllLabel ?? messages.common['View all'],
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

          case 'categories_grid': {
            const cfg = module.config
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
          }

          case 'promo_banner': {
            const cfg = module.config
            return (
              <PromoBannerModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'sliders_banner': {
            const cfg = module.config
            return (
              <SlidersBannerModule
                key={module.id}
                config={cfg}
                fallbackPageKey={defaultSliderPageKey}
                locale={locale}
              />
            )
          }

          case 'why_us': {
            const cfg = module.config
            return (
              <WhyUsModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'testimonials': {
            const cfg = module.config
            return (
              <TestimonialsModule
                key={module.id}
                config={{
                  ...cfg,
                  categorySlug: category.slug,
                }}
              />
            )
          }

          case 'newsletter': {
            const cfg = module.config
            return (
              <NewsletterModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'stats': {
            const cfg = module.config
            return (
              <StatsModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'text_block': {
            const cfg = module.config
            return (
              <TextBlockModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'faq': {
            const cfg = module.config
            return (
              <FAQModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'featured_by_region': {
            const cfg = module.config
            if (!allListings?.length) return null
            const regionCfg: FeaturedByRegionConfig =
              cfg.regions && Array.isArray(cfg.regions) && cfg.regions.length > 0
                ? {
                    heading: cfg.heading || messages.homePage.featuredStay.heading,
                    subheading: cfg.subheading || '',
                    viewAllHref: cfg.viewAllHref || defaultListingsBrowseHref,
                    regions: cfg.regions,
                  }
                : buildDefaultFeaturedRegionConfig(allListings, {
                    heading:
                      cfg.heading ||
                      interpolate(messages.categoryPage.featuredDefaultHeading, { category: category.name }),
                    subheading: cfg.subheading || messages.categoryPage.featuredDefaultSubheading,
                    viewAllHref: cfg.viewAllHref || defaultListingsBrowseHref,
                  })
            return (
              <SectionFeaturedByRegion
                key={module.id}
                allListings={allListings}
                config={regionCfg}
                listingLinkBase={listingLinkBase}
                priceUnit={effectivePriceUnit}
              />
            )
          }

          case 'top_providers': {
            const cfg = module.config
            return (
              <TopProvidersModule
                key={module.id}
                config={cfg}
                authors={authors}
                categorySlug={category.slug}
              />
            )
          }

          case 'become_provider': {
            const cfg = module.config
            return (
              <BecomeProviderModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'video_gallery': {
            const cfg = module.config
            return (
              <VideoGalleryModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'image_text': {
            const cfg = module.config
            return (
              <ImageTextModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'destination_cards': {
            const cfg = module.config
            return (
              <DestinationCardsModule
                key={module.id}
                config={cfg}
                locale={locale}
              />
            )
          }

          case 'partners': {
            const cfg = module.config
            return (
              <PartnersModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'travel_category_images':
            return null

          case 'category_slider': {
            const sliderCfg = module.config
            const merged: CategorySliderModuleConfig = {
              ...sliderCfg,
              categoryThumbnails: mergeRawThumbnailMaps(sharedCategoryThumbnails, sliderCfg.categoryThumbnails ?? {}),
            }
            return (
              <CategorySliderModule
                key={module.id}
                config={merged}
              />
            )
          }

          case 'region_slider': {
            const cfg = module.config
            return (
              <RegionSliderModule
                key={module.id}
                config={cfg}
                locale={locale}
              />
            )
          }

          case 'gezi_onerileri': {
            const cfg = module.config
            return (
              <GeziOnerileriModule
                key={module.id}
                config={{ ...cfg, locale }}
              />
            )
          }

          case 'featured_places': {
            const cfg = module.config
            return (
              <FeaturedPlacesModule
                key={module.id}
                config={cfg}
                locale={locale}
              />
            )
          }

          case 'how_it_works': {
            const cfg = module.config
            return (
              <HowItWorksModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'category_grid': {
            const gridCfg = module.config
            return (
              <CategoryGridModule
                key={module.id}
                config={{
                  ...gridCfg,
                  categoryThumbnails: mergeRawThumbnailMaps(sharedCategoryThumbnails, gridCfg.categoryThumbnails ?? {}),
                }}
              />
            )
          }

          case 'category_hub_grid': {
            const hubCfg = module.config
            return (
              <CategoryHubGridModule
                key={module.id}
                config={hubCfg}
                locale={locale}
                categorySlug={category.slug}
              />
            )
          }

          case 'section_videos': {
            const cfg = module.config
            return (
              <SectionVideosModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'client_say': {
            const cfg = module.config
            return (
              <ClientSayModule
                key={module.id}
                config={cfg}
              />
            )
          }

          case 'search_results': {
            const cfg = module.config
            return (
              <SearchResultsModule
                key={module.id}
                config={cfg}
                query={searchContext?.query ?? ''}
                categoryFilter={searchContext?.categoryFilter}
                locale={locale}
                page={searchContext?.page ?? 1}
              />
            )
          }

          // ─── Marketing modülleri (dinamik chunk — admin içerikleri vitrinde) ─────────
          case 'active_campaigns':
            return await renderMarketingModuleChunk('active_campaigns', module.id, module.config, locale)

          case 'early_booking_promo':
            return await renderMarketingModuleChunk('early_booking_promo', module.id, module.config, locale)

          case 'last_minute_promo':
            return await renderMarketingModuleChunk('last_minute_promo', module.id, module.config, locale)

          case 'coupons_strip':
            return await renderMarketingModuleChunk('coupons_strip', module.id, module.config, locale)

          case 'holiday_packages':
            return await renderMarketingModuleChunk('holiday_packages', module.id, module.config, locale)

          case 'cross_sell_widget':
            return await renderMarketingModuleChunk('cross_sell_widget', module.id, module.config, locale)

          default:
            return null
        }
      }
      )
    )}
    </Root>
  )
}
