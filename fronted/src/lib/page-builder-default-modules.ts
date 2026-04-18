import { getCategoryBySlug } from '@/data/category-registry'
import type { PageBuilderModule } from '@/types/listing-types'
import type { AppMessages } from '../../public/locales/en'
import { interpolate } from '@/utils/interpolate'

const STAY_SLUGS = new Set(['oteller', 'tatil-evleri', 'yat-kiralama'])
const EXPERIENCE_SLUGS = new Set(['turlar', 'aktiviteler', 'kruvaziyer'])
const TRANSPORT_SLUGS = new Set(['arac-kiralama', 'feribot', 'transfer'])

function stayModules(slug: string, m: AppMessages, categoryName: string): Omit<PageBuilderModule, 'id'>[] {
  const s = m.pageBuilderDefaults.stay
  const base = `/${slug}/all`
  return [
    {
      type: 'hero',
      enabled: true,
      order: 1,
      config: { showSearchForm: true, style: 'full', heading: '', subheading: '', images: ['', '', ''] },
    },
    {
      type: 'featured_by_region',
      enabled: true,
      order: 2,
      config: {
        heading: s.featuredByRegion.heading,
        subheading: s.featuredByRegion.subheading,
        viewAllHref: base,
        regions: [],
      },
    },
    {
      type: 'listings_grid',
      enabled: true,
      order: 3,
      config: {
        title: s.newListings.title,
        subheading: s.newListings.subheading,
        filterMode: 'new',
        showTabs: false,
        count: 8,
        viewAllHref: base,
        viewAllLabel: s.newListings.viewAllLabel,
      },
    },
    {
      type: 'listings_slider',
      enabled: true,
      order: 4,
      config: {
        title: s.discounted.title,
        subheading: s.discounted.subheading,
        filterMode: 'discounted',
        showTabs: false,
        count: 8,
        viewAllHref: base,
        viewAllLabel: s.discounted.viewAllLabel,
      },
    },
    {
      type: 'listings_grid',
      enabled: true,
      order: 5,
      config: {
        title: s.campaign.title,
        subheading: s.campaign.subheading,
        filterMode: 'campaign',
        showTabs: false,
        count: 4,
        viewAllHref: base,
        viewAllLabel: s.campaign.viewAllLabel,
      },
    },
    { type: 'why_us', enabled: true, order: 6, config: { title: s.whyUs.title } },
    {
      type: 'top_providers',
      enabled: true,
      order: 7,
      config: {
        heading: s.topProviders.heading,
        subheading: s.topProviders.subheading,
        ctaText: s.topProviders.ctaText,
        ctaHref: '/manage',
        maxCount: 5,
        showCategoryFilter: false,
      },
    },
    {
      type: 'become_provider',
      enabled: true,
      order: 8,
      config: {
        heading: s.becomeProvider.heading,
        subheading: interpolate(s.becomeProvider.subheading, { categoryName }),
        ctaText: s.becomeProvider.ctaText,
        ctaHref: '/ilan-ver',
        secondaryCtaText: s.becomeProvider.secondaryCtaText,
        secondaryCtaHref: '/ilan-ver#nasil-calisir',
        bgVariant: 'gradient',
      },
    },
    { type: 'testimonials', enabled: true, order: 9, config: { title: s.testimonials.title } },
    { type: 'newsletter', enabled: true, order: 10, config: {} },
    {
      type: 'video_gallery',
      enabled: false,
      order: 11,
      config: {
        title: `🎬 ${categoryName} Videoları`,
        subtitle: `${categoryName} hakkında en iyi videoları izleyin.`,
        videos: [],
      },
    },
  ]
}

function experienceModules(m: AppMessages): Omit<PageBuilderModule, 'id'>[] {
  const e = m.pageBuilderDefaults.experience
  return [
    {
      type: 'hero',
      enabled: true,
      order: 1,
      config: { showSearchForm: true, style: 'full', heading: '', subheading: '', images: ['', '', ''] },
    },
    { type: 'listings_slider', enabled: true, order: 2, config: { title: e.popular.title, count: 8 } },
    {
      type: 'promo_banner',
      enabled: true,
      order: 3,
      config: {
        title: e.promoBanner.title,
        description: e.promoBanner.description,
        ctaText: e.promoBanner.ctaText,
        ctaHref: '#',
      },
    },
    { type: 'testimonials', enabled: true, order: 4, config: {} },
    { type: 'newsletter', enabled: true, order: 5, config: {} },
    {
      type: 'video_gallery',
      enabled: false,
      order: 6,
      config: { title: '🎬 Videolar', subtitle: 'En iyi deneyim videolarını izleyin.', videos: [] },
    },
  ]
}

function transportModules(m: AppMessages): Omit<PageBuilderModule, 'id'>[] {
  const t = m.pageBuilderDefaults.transport
  return [
    {
      type: 'hero',
      enabled: true,
      order: 1,
      config: { showSearchForm: true, style: 'compact', heading: '', subheading: '', images: ['', '', ''] },
    },
    { type: 'why_us', enabled: true, order: 2, config: {} },
    { type: 'listings_grid', enabled: true, order: 3, config: { title: t.popularRoutes.title, count: 12 } },
    { type: 'newsletter', enabled: true, order: 4, config: {} },
    {
      type: 'video_gallery',
      enabled: false,
      order: 5,
      config: { title: '🎬 Videolar', subtitle: 'Ulaşım hizmetlerimiz hakkında videolar.', videos: [] },
    },
  ]
}

function hajjModules(m: AppMessages): Omit<PageBuilderModule, 'id'>[] {
  const h = m.pageBuilderDefaults.hajj
  return [
    {
      type: 'hero',
      enabled: true,
      order: 1,
      config: { showSearchForm: true, style: 'full', heading: '', subheading: '', images: ['', '', ''] },
    },
    { type: 'listings_grid', enabled: true, order: 2, config: { title: h.packages.title, count: 8 } },
    { type: 'why_us', enabled: true, order: 3, config: { title: h.whyUs.title } },
    { type: 'testimonials', enabled: true, order: 4, config: {} },
    {
      type: 'video_gallery',
      enabled: false,
      order: 5,
      config: { title: '🎬 Hac & Umre Videoları', subtitle: 'Kutsal topraklara yolculuk videoları.', videos: [] },
    },
  ]
}

function visaModules(m: AppMessages): Omit<PageBuilderModule, 'id'>[] {
  const v = m.pageBuilderDefaults.visa
  return [
    {
      type: 'hero',
      enabled: true,
      order: 1,
      config: { showSearchForm: true, style: 'compact', heading: '', subheading: '', images: ['', '', ''] },
    },
    { type: 'listings_grid', enabled: true, order: 2, config: { title: v.popular.title, count: 12 } },
    { type: 'why_us', enabled: true, order: 3, config: {} },
    {
      type: 'video_gallery',
      enabled: false,
      order: 4,
      config: { title: '🎬 Vize Videoları', subtitle: 'Vize başvurusu hakkında bilgi videoları.', videos: [] },
    },
  ]
}

function flightModules(m: AppMessages): Omit<PageBuilderModule, 'id'>[] {
  const f = m.pageBuilderDefaults.flight
  return [
    {
      type: 'hero',
      enabled: true,
      order: 1,
      config: { showSearchForm: true, style: 'full', heading: '', subheading: '', images: ['', '', ''] },
    },
    { type: 'listings_grid', enabled: true, order: 2, config: { title: f.popularRoutes.title, count: 12 } },
    {
      type: 'promo_banner',
      enabled: true,
      order: 3,
      config: { title: f.lastMinute.title, ctaText: f.lastMinute.ctaText, ctaHref: '#' },
    },
    {
      type: 'video_gallery',
      enabled: false,
      order: 4,
      config: { title: '🎬 Uçuş Videoları', subtitle: 'En iyi destinasyonlara uçuş videoları.', videos: [] },
    },
  ]
}

/** Kategori slug’ına göre yerelleştirilmiş varsayılan page builder modülleri */
export function getLocalizedDefaultModules(slug: string, m: AppMessages): Omit<PageBuilderModule, 'id'>[] {
  const cat = getCategoryBySlug(slug)
  const categoryName = cat?.name ?? slug

  if (STAY_SLUGS.has(slug)) return stayModules(slug, m, categoryName)
  if (EXPERIENCE_SLUGS.has(slug)) return experienceModules(m)
  if (slug === 'hac-umre') return hajjModules(m)
  if (slug === 'vize') return visaModules(m)
  if (slug === 'ucak-bileti') return flightModules(m)
  if (TRANSPORT_SLUGS.has(slug)) return transportModules(m)

  return stayModules(slug, m, categoryName)
}

/** Arama sayfası için varsayılan page builder modülleri */
export function getSearchPageDefaultModules(): Omit<PageBuilderModule, 'id'>[] {
  return [
    {
      type: 'search_results',
      enabled: true,
      order: 1,
      config: { perPage: 24 },
    },
    {
      type: 'destination_cards',
      enabled: true,
      order: 2,
      config: {
        heading: 'Popüler Destinasyonlar',
        subheading: 'En çok tercih edilen tatil bölgelerini keşfedin',
      },
    },
    {
      type: 'become_provider',
      enabled: true,
      order: 3,
      config: {
        heading: 'İlan Vermek İster misiniz?',
        subheading: 'Siz de platformumuza katılın, milyonlarca gezgine ulaşın.',
        ctaText: 'Hemen Başla',
        ctaHref: '/ilan-ver',
        bgVariant: 'gradient',
      },
    },
    { type: 'newsletter', enabled: true, order: 4, config: {} },
  ]
}

/** Anasayfa için varsayılan page builder modülleri */
export function getHomepageDefaultModules(m: AppMessages): Omit<PageBuilderModule, 'id'>[] {
  const h = m.homePage
  return [
    {
      type: 'hero',
      enabled: true,
      order: 1,
      config: {
        showSearchForm: true,
        style: 'full',
        hideVerticalTabs: true,
        heading: '',
        subheading: '',
        images: ['', '', ''],
      },
    },
    { type: 'category_slider', enabled: true,  order: 2,  config: { heading: h.adventure.heading,        subheading: h.adventure.subheading,       cardType: 'card3', slice: 'first6' } },
    { type: 'gezi_onerileri',  enabled: true,  order: 3,  config: {} },
    { type: 'featured_by_region', enabled: true, order: 4, config: { heading: h.featuredStay.heading,     subheading: h.featuredStay.subheading,     viewAllHref: '/oteller/all', regions: [] } },
    { type: 'featured_places', enabled: true,  order: 5,  config: { heading: h.featuredPlaces.heading,   subHeading: h.featuredPlaces.subHeading,   viewAllHref: '/oteller/all' } },
    { type: 'how_it_works',    enabled: true,  order: 6,  config: { title: h.howItWorks.title,           subheading: h.howItWorks.subheading } },
    { type: 'top_providers',   enabled: true,  order: 7,  config: { heading: h.topProviders.heading,     subheading: h.topProviders.subheading,     ctaText: h.topProviders.cta, ctaHref: '/manage', maxCount: 10 } },
    { type: 'newsletter',      enabled: true,  order: 8,  config: { title: h.newsletter.title,           description: h.newsletter.description,    buttonText: h.newsletter.button, gradient: 'from-primary-600 to-primary-700' } },
    { type: 'category_grid',   enabled: true,  order: 9,  config: { heading: h.categoriesSection.heading, subheading: h.categoriesSection.subheading } },
    { type: 'become_provider', enabled: true,  order: 10, config: { heading: h.becomeProvider.heading,   subheading: h.becomeProvider.subheading,   ctaText: h.becomeProvider.cta, ctaHref: '/ilan-ver', secondaryCtaText: h.becomeProvider.secondaryCta, secondaryCtaHref: '/ilan-ver#nasil-calisir', bgVariant: 'gradient' } },
    { type: 'category_slider', enabled: true,  order: 11, config: { heading: h.discoverByType.heading,   subheading: h.discoverByType.subheading,   cardType: 'card5', slice: 'last6' } },
    { type: 'section_videos',  enabled: true,  order: 12, config: { heading: h.videoSection.heading,     subheading: h.videoSection.subheading } },
    { type: 'client_say',      enabled: true,  order: 13, config: { heading: h.clientSay.heading,        subHeading: h.clientSay.subHeading } },
  ]
}
