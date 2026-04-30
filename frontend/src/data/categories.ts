import stayCategoryCoverImage from '@/images/hero-right-2.png'
import carCategoryCoverImage from '@/images/hero-right-car.png'
import experienceCategoryCoverImage from '@/images/hero-right-experience.png'
import filghtCategoryCoverImage from '@/images/hero-right-flight.png'
import { CATEGORY_REGISTRY, normalizeTravelCategoryHomeOrder } from '@/data/category-registry'
import { withDevNoStore } from '@/lib/api-fetch-dev'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { getPublicCategoryStats } from '@/lib/travel-api'

// stay categories --------
export async function getStayCategories() {
  return [
    {
      id: 'stay-cat://1',
      name: 'New York, USA',
      region: 'United States',
      handle: 'new-york-usa',
      href: '/stay-categories/new-york-usa',
      count: 5000,
      thumbnail:
        '/uploads/external/89576098f09083d5c693.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
    },
    {
      id: 'stay-cat://2',
      name: 'Singapore',
      region: 'Singapore',
      handle: 'singapore',
      href: '/stay-categories/singapore',
      count: 2500,
      thumbnail: '/uploads/external/604495586a104b5cbac8.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
    },
    {
      id: 'stay-cat://3',
      name: 'Paris, France',
      region: 'France',
      handle: 'paris-france',
      href: '/stay-categories/paris-france',
      count: 3000,
      thumbnail: '/uploads/external/f579f38dc529c6d599a3.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
    },
    {
      id: 'stay-cat://4',
      name: 'London, UK',
      region: 'United Kingdom',
      handle: 'london-uk',
      href: '/stay-categories/london-uk',
      count: 116288,
      thumbnail: '/uploads/external/699afbb0018e6546be9f.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
    },
    {
      id: 'stay-cat://5',
      name: 'Tokyo, Japan',
      region: 'Japan',
      handle: 'tokyo-japan',
      href: '/stay-categories/tokyo-japan',
      count: 5000,
      thumbnail: '/uploads/external/f7382cfceb0958ecab47.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'Lorem ipsum dolor sit amet',
    },
    {
      id: 'stay-cat://6',
      name: 'Maldives',
      region: 'Indian Ocean',
      handle: 'maldives',
      href: '/stay-categories/maldives',
      count: 7500,
      thumbnail: '/uploads/external/9281ffe1c0768320d7ad.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'The Maldives, officially the Republic of Maldives',
    },
    {
      id: 'stay-cat://7',
      name: 'Roma, Italy',
      region: 'Italy',
      handle: 'roma-italy',
      href: '/stay-categories/roma-italy',
      count: 8100,
      thumbnail: '/uploads/external/604495586a104b5cbac8.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'Italy, a European country with a long Mediterranean.',
    },
    {
      id: 'stay-cat://8',
      name: 'Enjoy the great cold',
      region: 'Arctic',
      handle: 'enjoy-the-great-cold',
      href: '/stay-categories/enjoy-the-great-cold',
      count: 15600,
      thumbnail: '/uploads/external/574be99acdc891ae0bad.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'The Arctic is the northernmost region of Earth.',
    },
    {
      id: 'stay-cat://9',
      name: 'Sleep in a floating way',
      region: 'Worldwide',
      handle: 'sleep-in-a-floating-way',
      href: '/stay-categories/sleep-in-a-floating-way',
      count: 1000,
      thumbnail: '/uploads/external/b3e6f5cbe4e373a9ca3d.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'A floating hotel is a type of hotel.',
    },
    {
      id: 'stay-cat://10',
      name: "In the billionaire's house",
      region: 'Worldwide',
      handle: 'in-the-billionaires-house',
      href: '/stay-categories/in-the-billionaires-house',
      count: 3000,
      thumbnail: '/uploads/external/19b53daad779201c1c16.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: "A billionaire's house.",
    },
    {
      id: 'stay-cat://11',
      name: 'Cool in the deep forest',
      region: 'Worldwide',
      handle: 'cool-in-the-deep-forest',
      href: '/stay-categories/cool-in-the-deep-forest',
      count: 6000,
      thumbnail: '/uploads/external/eb8793c010d75469e573.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'Cool in the deep forest.',
    },
    {
      id: 'stay-cat://12',
      name: 'Sunset in the desert',
      region: 'Worldwide',
      handle: 'sunset-in-the-desert',
      href: '/stay-categories/sunset-in-the-desert',
      count: 1000,
      thumbnail:
        '/uploads/external/b4b016792a6565bdecb1.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
      description: 'Sunset in the desert.',
    },
  ]
}
export async function getStayCategoryByHandle(handle?: string) {
  // lower case handle
  handle = handle?.toLowerCase()

  if (!handle || handle === 'all') {
    return {
      id: 'stay://all',
      name: 'Explore stays',
      handle: 'all',
      href: '/stay-categories/all',
      region: 'Worldwide',
      count: 144000,
      description: 'Explore all stays around the world',
      thumbnail:
        '/uploads/external/89576098f09083d5c693.avif',
      coverImage: {
        src: stayCategoryCoverImage.src,
        width: stayCategoryCoverImage.width,
        height: stayCategoryCoverImage.height,
      },
    }
  }

  // get all categories
  const categories = await getStayCategories()
  return categories.find((category) => category.handle === handle)
}

// experience categories --------
export async function getExperienceCategories() {
  return [
    {
      id: 'experience://5',
      name: 'Tokyo, Japan',
      handle: 'tokyo',
      region: 'Japan',
      href: '/experience-categories/tokyo',
      description: 'lorem ipsum dolor sit amet',
      count: 500,
      thumbnail: '/uploads/external/3e11e7d4af0c7ab629ba.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
    {
      id: 'experience://6',
      name: 'Denmark',
      handle: 'denmark',
      region: 'Europe',
      href: '/experience-categories/denmark',
      description: 'lorem ipsum dolor sit amet',
      count: 750,
      thumbnail: '/uploads/external/d40f61f6a7e1f9ef3275.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
    {
      id: 'experience://8',
      name: 'Baceno, Italy',
      handle: 'baceno-italy',
      region: 'Italy',
      href: '/experience-categories/baceno-italy',
      description: 'Baceno, a small town in the Piedmont region of Italy.',
      count: 8100,
      thumbnail: '/uploads/external/2c4637ee35d36e1bf4d2.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
    {
      id: 'experience://1',
      name: 'New York, USA',
      region: 'United States',
      handle: 'new-york',
      href: '/experience-categories/new-york',
      description: 'lorem ipsum dolor sit amet',
      count: 1000,
      thumbnail: '/uploads/external/978489b0881016539afb.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
    {
      id: 'experience://2',
      name: 'Singapore',
      region: 'South East Asia',
      handle: 'south-east-asia',
      href: '/experience-categories/south-east-asia',
      description: 'lorem ipsum dolor sit amet',
      count: 2500,
      thumbnail:
        '/uploads/external/6ebdcd21300f1012ea2c.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
    {
      id: 'experience://3',
      name: 'Paris, France',
      region: 'France',
      handle: 'paris',
      href: '/experience-categories/paris',
      description: 'lorem ipsum dolor sit amet',
      count: 2000,
      thumbnail: '/uploads/external/1968291aa1d67fd930a6.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
    {
      id: 'experience://4',
      name: 'London, UK',
      handle: 'london',
      region: 'United Kingdom',
      href: '/experience-categories/london',
      description: 'lorem ipsum dolor sit amet',
      count: 1500,
      thumbnail: '/uploads/external/1108dec51a235a815c01.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
    {
      id: 'experience://7',
      name: 'Roma, Italy',
      handle: 'roma-italy',
      region: 'Italy',
      href: '/experience-categories/roma-italy',
      description: 'Italy, a European country with a long Mediterranean.',
      count: 8100,
      thumbnail: '/uploads/external/8be2c8bf82802e7a9354.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    },
  ]
}
export async function getExperienceCategoryByHandle(handle?: string) {
  // lower case handle
  handle = handle?.toLowerCase()

  if (!handle || handle === 'all') {
    return {
      id: 'experience://all',
      name: 'Explore experiences',
      handle: 'all',
      region: 'Worldwide',
      href: '/experience-categories/all',
      description: 'lorem ipsum dolor sit amet',
      count: 3000,
      thumbnail:
        '/uploads/external/89576098f09083d5c693.avif',
      coverImage: {
        src: experienceCategoryCoverImage.src,
        width: experienceCategoryCoverImage.width,
        height: experienceCategoryCoverImage.height,
      },
    }
  }

  const categories = await getExperienceCategories()
  return categories.find((category) => category.handle === handle)
}

// Car categories --------
export async function getCarCategories() {
  return [
    {
      id: 'car://4',
      name: 'London, UK',
      handle: 'london',
      href: '/car-categories/london',
      count: 1000,
      thumbnail: '/uploads/external/699afbb0018e6546be9f.avif',
      coverImage: {
        src: carCategoryCoverImage.src,
        width: carCategoryCoverImage.width,
        height: carCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
      region: 'United Kingdom',
    },
    {
      id: 'car://5',
      name: 'Tokyo, Japan',
      handle: 'tokyo',
      href: '/car-categories/tokyo',
      count: 5000,
      thumbnail: '/uploads/external/f7382cfceb0958ecab47.avif',
      coverImage: {
        src: carCategoryCoverImage.src,
        width: carCategoryCoverImage.width,
        height: carCategoryCoverImage.height,
      },
      description: 'Lorem ipsum dolor sit amet, ',
      region: 'Japan',
    },
    {
      id: 'car://6',
      name: 'Maldives',
      handle: 'maldives',
      href: '/car-categories/maldives',
      count: 750,
      thumbnail: '/uploads/external/9281ffe1c0768320d7ad.avif',
      coverImage: {
        src: carCategoryCoverImage.src,
        width: carCategoryCoverImage.width,
        height: carCategoryCoverImage.height,
      },
      description: 'The Maldives, officially the Republic of Maldives',
      region: 'Indian Ocean',
    },
    {
      id: 'car://1',
      name: 'New York, USA',
      handle: 'new-york',
      href: '/car-categories/new-york',
      count: 1500,
      thumbnail:
        '/uploads/external/89576098f09083d5c693.avif',
      coverImage: {
        src: carCategoryCoverImage.src,
        width: carCategoryCoverImage.width,
        height: carCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
      region: 'United States',
    },
    {
      id: 'car://2',
      name: 'Singapore',
      handle: 'singapore',
      href: '/car-categories/singapore',
      count: 2500,
      thumbnail: '/uploads/external/604495586a104b5cbac8.avif',
      coverImage: {
        src: carCategoryCoverImage.src,
        width: carCategoryCoverImage.width,
        height: carCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
      region: 'Singapore',
    },
    {
      id: 'car://3',
      name: 'Paris, France',
      handle: 'paris',
      href: '/car-categories/paris',
      count: 3000,
      thumbnail: '/uploads/external/f579f38dc529c6d599a3.avif',
      coverImage: {
        src: carCategoryCoverImage.src,
        width: carCategoryCoverImage.width,
        height: carCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
      region: 'France',
    },
  ]
}
export async function getCarCategoryByHandle(handle?: string) {
  // lower case handle
  handle = handle?.toLowerCase()

  if (!handle || handle === 'all') {
    return {
      id: 'car://all',
      name: 'Car rentals',
      handle: 'all',
      href: '/car-categories/all',
      count: 3000,
      thumbnail:
        '/uploads/external/89576098f09083d5c693.avif',
      coverImage: {
        src: carCategoryCoverImage.src,
        width: carCategoryCoverImage.width,
        height: carCategoryCoverImage.height,
      },
      region: 'Worldwide',
      description: 'Explore all cars around the world',
    }
  }

  const categories = await getCarCategories()
  return categories.find((category) => category.handle === handle)
}

// Flight categories --------
export async function getFlightCategories() {
  return [
    {
      id: 'flight://1',
      name: 'New York',
      handle: 'new-york',
      href: '/flight-categories/new-york',
      count: 1500,
      thumbnail:
        '/uploads/external/89576098f09083d5c693.avif',
      coverImage: {
        src: filghtCategoryCoverImage.src,
        width: filghtCategoryCoverImage.width,
        height: filghtCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
      region: 'United States',
    },
    {
      id: 'flight://2',
      name: 'Singapore',
      handle: 'singapore',
      href: '/flight-categories/singapore',
      count: 2500,
      thumbnail: '/uploads/external/604495586a104b5cbac8.avif',
      coverImage: {
        src: filghtCategoryCoverImage.src,
        width: filghtCategoryCoverImage.width,
        height: filghtCategoryCoverImage.height,
      },
      description: 'lorem ipsum dolor sit amet',
      region: 'Singapore',
    },
  ]
}
export async function getFlightCategoryByHandle(handle?: string) {
  // lower case handle
  handle = handle?.toLowerCase()

  if (!handle || handle === 'all') {
    return {
      id: 'flight://all',
      name: 'Book Flights',
      handle: 'all',
      href: '/flight-categories/all',
      count: 3000,
      thumbnail:
        '/uploads/external/89576098f09083d5c693.avif',
      coverImage: {
        src: filghtCategoryCoverImage.src,
        width: filghtCategoryCoverImage.width,
        height: filghtCategoryCoverImage.height,
      },
      region: 'Worldwide',
      description: 'Explore all flights around the world',
    }
  }

  const categories = await getFlightCategories()
  return categories.find((category) => category.handle === handle)
}

// types
export type TStayCategory = Awaited<ReturnType<typeof getStayCategories>>[number]
export type TExperienceCategory = Awaited<ReturnType<typeof getExperienceCategories>>[number]
export type TCarCategory = Awaited<ReturnType<typeof getCarCategories>>[number]
export type TFlightCategory = Awaited<ReturnType<typeof getFlightCategories>>[number]
export type TCategory = TStayCategory | TExperienceCategory | TCarCategory | TFlightCategory | TTravelCategory

// ─── Kategori Görselleri ─────────────────────────────────────────────────────
/** Pexels thumbnail URLs for each category slug */
const CATEGORY_THUMBNAILS: Record<string, string> = {
  oteller:
    '/uploads/external/4e2cad429ba10635413c.avif',
  'tatil-evleri':
    '/uploads/external/8617586fba59e6c624d2.avif',
  'yat-kiralama':
    '/uploads/external/2b0678462ab30d3b5d84.avif',
  turlar:
    '/uploads/external/bda9ccb6e8fce406c360.avif',
  aktiviteler:
    '/uploads/external/c15ff70d6b98f26b6781.avif',
  kruvaziyer:
    '/uploads/external/e7b29d483282370aee7c.avif',
  'hac-umre':
    '/uploads/external/7d4d22b7b4d65a5d1cb1.avif',
  vize: '/uploads/external/a6d17baa4ce6e2f04973.avif',
  'ucak-bileti':
    '/uploads/external/c32b2ae1cced147cf838.avif',
  'arac-kiralama':
    '/uploads/external/856ef5f9932480496d10.avif',
  feribot:
    '/uploads/external/496a11e0cc1b55c3f9d7.avif',
  transfer:
    '/uploads/external/4eb5c8b66586b520aa17.avif',
}

const COVER_IMAGE_MAP = {
  stay: stayCategoryCoverImage,
  experience: experienceCategoryCoverImage,
  car: carCategoryCoverImage,
  flight: filghtCategoryCoverImage,
}

/** Frontend listingType → backend product_categories.code eşlemesi */
const LISTING_TYPE_TO_CAT_CODE: Record<string, string> = {
  'hotel':        'hotel',
  'holiday-home': 'holiday_home',
  'yacht':        'yacht_charter',
  'tour':         'tour',
  'activity':     'activity',
  'cruise':       'cruise',
  'hajj':         'hajj',
  'visa':         'visa',
  'flight':       'flight',
  'car-rental':   'car_rental',
  'ferry':        'ferry',
  'transfer':     'transfer',
}

/** Kategori bazlı ilan ve bölge istatistikleri — API yoksa fallback */
const CATEGORY_STATS: Record<string, { listingCount: number; regionCount: number }> = {
  oteller:          { listingCount: 7340,  regionCount: 81  },
  'tatil-evleri':   { listingCount: 4650,  regionCount: 42  },
  'yat-kiralama':   { listingCount: 8780,  regionCount: 18  },
  turlar:           { listingCount: 1510,  regionCount: 67  },
  aktiviteler:      { listingCount: 5470,  regionCount: 53  },
  kruvaziyer:       { listingCount: 7400,  regionCount: 24  },
  'hac-umre':       { listingCount: 3210,  regionCount: 11  },
  vize:             { listingCount: 5490,  regionCount: 195 },
  'ucak-bileti':    { listingCount: 9480,  regionCount: 120 },
  'arac-kiralama':  { listingCount: 2050,  regionCount: 45  },
  feribot:          { listingCount: 1390,  regionCount: 16  },
  transfer:         { listingCount: 1450,  regionCount: 38  },
}

/**
 * Returns all 12 travel categories from CATEGORY_REGISTRY as TCategory-compatible objects,
 * suitable for use in SectionSliderNewCategories and SectionGridCategoryBox.
 * Sıra: `site_settings` → `ui.travel_category_home_slugs` (yönetim: Ayarlar → Merchant & kategoriler).
 */
export async function getTravelCategories() {
  let slugOrder: string[] = normalizeTravelCategoryHomeOrder(null)
  let apiStats: Record<string, number> = {}

  try {
    const [pub, stats] = await Promise.all([
      getCachedSiteConfig(),
      getPublicCategoryStats(withDevNoStore({ next: { revalidate: 300 } })),
    ])
    const raw =
      pub?.ui && typeof pub.ui === 'object'
        ? (pub.ui as Record<string, unknown>).travel_category_home_slugs
        : undefined
    slugOrder = normalizeTravelCategoryHomeOrder(raw)
    apiStats = stats
  } catch {
    /* API yok — varsayılan sıra ve sayılar */
  }

  const rank = (slug: string) => {
    const i = slugOrder.indexOf(slug)
    return i === -1 ? 999 : i
  }
  const entries = [...CATEGORY_REGISTRY].sort(
    (a, b) => rank(a.slug) - rank(b.slug) || a.navOrder - b.navOrder,
  )

  return entries.map((entry) => {
    const fallback = CATEGORY_STATS[entry.slug] ?? { listingCount: 0, regionCount: 0 }
    const coverImg = COVER_IMAGE_MAP[entry.heroImageType] ?? stayCategoryCoverImage
    const catCode = LISTING_TYPE_TO_CAT_CODE[entry.listingType] ?? entry.listingType
    const liveCount = apiStats[catCode]
    const listingCount = typeof liveCount === 'number' && liveCount >= 0 ? liveCount : fallback.listingCount
    return {
      id: `travel-cat://${entry.slug}`,
      name: entry.name,
      region: entry.namePlural,
      handle: entry.slug,
      href: `${entry.categoryRoute}/all`,
      count: listingCount,
      regionCount: fallback.regionCount,
      thumbnail: CATEGORY_THUMBNAILS[entry.slug] ?? '',
      coverImage: {
        src: coverImg.src,
        width: coverImg.width,
        height: coverImg.height,
      },
      description: entry.heroSubheading,
      emoji: entry.emoji,
    }
  })
}

export type TTravelCategory = Awaited<ReturnType<typeof getTravelCategories>>[number]
