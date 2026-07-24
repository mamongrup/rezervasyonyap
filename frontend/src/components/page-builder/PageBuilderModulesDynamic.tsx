import type { ReactNode } from 'react'

const MODULE_LOADERS = {
  promo_banner: () => import('./modules/PromoBannerModule'),
  sliders_banner: () => import('./modules/SlidersBannerModule'),
  why_us: () => import('./modules/WhyUsModule'),
  testimonials: () => import('./modules/TestimonialsModule'),
  newsletter: () => import('./modules/NewsletterModule'),
  stats: () => import('./modules/StatsModule'),
  text_block: () => import('./modules/TextBlockModule'),
  faq: () => import('./modules/FAQModule'),
  top_providers: () => import('./modules/TopProvidersModule'),
  become_provider: () => import('./modules/BecomeProviderModule'),
  video_gallery: () => import('./modules/VideoGalleryModule'),
  image_text: () => import('./modules/ImageTextModule'),
  destination_cards: () => import('./modules/DestinationCardsModule'),
  partners: () => import('./modules/PartnersModule'),
  category_slider: () => import('./modules/CategorySliderModule'),
  region_slider: () => import('./modules/RegionSliderModule'),
  gezi_onerileri: () => import('./modules/GeziOnerileriModule'),
  featured_places: () => import('./modules/FeaturedPlacesModule'),
  how_it_works: () => import('./modules/HowItWorksModule'),
  category_grid: () => import('./modules/CategoryGridModule'),
  category_hub_grid: () => import('./modules/CategoryHubGridModule'),
  section_videos: () => import('./modules/SectionVideosModule'),
  client_say: () => import('./modules/ClientSayModule'),
  search_results: () => import('./modules/SearchResultsModule'),
} as const

export type PageBuilderDynamicModuleType = keyof typeof MODULE_LOADERS

/**
 * PageBuilderRenderer (RSC) içinden dinamik modül yükleme.
 * Webpack / Next.js her modülü ayrı bir JS chunk'ına böler.
 * Anasayfada kullanılmayan modüller bundle'ı şişirmez (LCP / TBT iyileşir).
 */
export async function renderPageBuilderModuleChunk(
  moduleKey: PageBuilderDynamicModuleType,
  reactKey: string,
  props: Record<string, unknown>,
): Promise<ReactNode> {
  const loader = MODULE_LOADERS[moduleKey]
  const { default: C } = await loader()
  const Component = C as unknown as React.ComponentType<any>
  return <Component key={reactKey} {...props} />
}
