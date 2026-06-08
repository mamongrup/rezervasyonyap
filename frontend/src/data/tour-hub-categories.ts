/**
 * Tur vitrin hub kartları — Etstur yurtdışı landing yapısına benzer.
 * Linkler mevcut alt kategori, location ve tur filtre parametrelerine dayanır.
 */

import { tourSubcategoryListPath } from '@/lib/tour-subcategory-routes'

export type TourHubCategoryLink = {
  label: string
  /** Vitrin yolu: /turlar/... veya /turlar/all?... */
  path: string
}

export type TourHubCategory = {
  id: string
  title: string
  titleEn: string
  image: string
  /** Ana kart tıklaması */
  path: string
  links: TourHubCategoryLink[]
}

const IMG = {
  domestic: '/uploads/general/hero/turlar-1.avif',
  abroad: '/uploads/general/hero/turlar-2.avif',
  balkans: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=800&q=80',
  europe: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  visa: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  culture: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  departure: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  greek: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80',
  northEurope: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&q=80',
  farEast: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  centralAsia: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
  america: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  islands: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  middleEast: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
  africa: 'https://images.unsplash.com/photo-1516026672322-bc52c61acf55?w=800&q=80',
  nature: '/uploads/general/hero/turlar-3.avif',
  plane: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
  deals: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
}

function all(pathSuffix = '') {
  return `/turlar/all${pathSuffix}`
}

/** Tur alt kategori slug → `/turlar/all?…` (hub + alt kategori grid ile aynı) */
function tourSub(slug: Parameters<typeof tourSubcategoryListPath>[0]): string {
  return tourSubcategoryListPath(slug) ?? `/turlar/${slug}`
}

/** Statik hub kart listesi — Wtatil lokasyon / alt kategori eşlemesi */
export function getTourHubCategories(locale: string): TourHubCategory[] {
  const isEn = locale === 'en' || locale.startsWith('en-')

  const categories: TourHubCategory[] = [
    {
      id: 'domestic-abroad',
      title: isEn ? 'Domestic & Abroad' : 'Yurt İçi & Dışı',
      titleEn: 'Domestic & Abroad',
      image: IMG.domestic,
      path: tourSub('yurtici-turlar'),
      links: [
        { label: isEn ? 'Domestic tours' : 'Yurt içi turlar', path: tourSub('yurtici-turlar') },
        { label: isEn ? 'International tours' : 'Yurt dışı turlar', path: tourSub('yurtdisi-turlar') },
      ],
    },
    {
      id: 'balkans',
      title: isEn ? 'Balkans' : 'Balkanlar',
      titleEn: 'Balkans',
      image: IMG.balkans,
      path: all('?location=balkan'),
      links: [
        { label: 'Belgrad', path: all('?location=belgrad') },
        { label: 'Saraybosna', path: all('?location=saraybosna') },
        { label: 'Budva', path: all('?location=budva') },
        { label: 'Mostar', path: all('?location=mostar') },
      ],
    },
    {
      id: 'visa-ease',
      title: isEn ? 'Visa Ease' : 'Vize Kolaylığı',
      titleEn: 'Visa Ease',
      image: IMG.visa,
      path: all('?location=vizesiz'),
      links: [
        { label: isEn ? 'Visa-free tours' : 'Vizesiz turlar', path: all('?location=vizesiz') },
        { label: isEn ? 'Balkans' : 'Balkan turları', path: all('?location=balkan') },
      ],
    },
    {
      id: 'special',
      title: isEn ? 'Special Experiences' : 'Özel Deneyimler',
      titleEn: 'Special Experiences',
      image: IMG.culture,
      path: tourSub('kultur-turlari'),
      links: [
        { label: isEn ? 'Cultural tours' : 'Kültür turları', path: tourSub('kultur-turlari') },
        { label: isEn ? 'Adventure tours' : 'Macera turları', path: tourSub('macera-turlari') },
        { label: isEn ? 'Religious tours' : 'Dini turlar', path: tourSub('dini-turlar') },
      ],
    },
    {
      id: 'departure',
      title: isEn ? 'Departure Point' : 'Hareket Noktası',
      titleEn: 'Departure Point',
      image: IMG.departure,
      path: all('?location=istanbul'),
      links: [
        { label: isEn ? 'From Istanbul' : 'İstanbul hareketli', path: all('?location=istanbul') },
        { label: isEn ? 'From Ankara' : 'Ankara hareketli', path: all('?location=ankara') },
        { label: isEn ? 'From Izmir' : 'İzmir hareketli', path: all('?location=izmir') },
        { label: isEn ? 'By plane' : 'Uçaklı turlar', path: all('?tour_travel_type=plane') },
      ],
    },
    {
      id: 'greek-islands',
      title: isEn ? 'Greek Islands' : 'Yunan Adaları',
      titleEn: 'Greek Islands',
      image: IMG.greek,
      path: all('?location=yunan'),
      links: [
        { label: 'Rodos', path: all('?location=rodos') },
        { label: 'Samos', path: all('?location=samos') },
        { label: 'Kos', path: all('?location=kos') },
        { label: 'Midilli', path: all('?location=midilli') },
      ],
    },
    {
      id: 'western-europe',
      title: isEn ? 'Western Europe' : 'Batı Avrupa',
      titleEn: 'Western Europe',
      image: IMG.europe,
      path: tourSub('avrupa-turlari'),
      links: [
        { label: 'Paris', path: all('?location=paris') },
        { label: 'Amsterdam', path: all('?location=amsterdam') },
        { label: isEn ? 'Benelux' : 'Benelüks', path: all('?location=benelux') },
        { label: 'Nice', path: all('?location=nice') },
      ],
    },
    {
      id: 'central-europe',
      title: isEn ? 'Central Europe' : 'Orta Avrupa',
      titleEn: 'Central Europe',
      image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80',
      path: all('?location=prag'),
      links: [
        { label: 'Prag', path: all('?location=prag') },
        { label: 'Viyana', path: all('?location=viyana') },
        { label: 'Budapeşte', path: all('?location=budapeste') },
      ],
    },
    {
      id: 'southern-europe',
      title: isEn ? 'Southern Europe' : 'Güney Avrupa',
      titleEn: 'Southern Europe',
      image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80',
      path: all('?location=italya'),
      links: [
        { label: isEn ? 'Italy' : 'İtalya', path: all('?location=italya') },
        { label: isEn ? 'Spain' : 'İspanya', path: all('?location=ispanya') },
        { label: 'Roma', path: all('?location=roma') },
        { label: 'Atina', path: all('?location=atina') },
      ],
    },
    {
      id: 'northern-europe',
      title: isEn ? 'Northern Europe' : 'Kuzey Avrupa',
      titleEn: 'Northern Europe',
      image: IMG.northEurope,
      path: all('?location=iskandinav'),
      links: [
        { label: isEn ? 'Scandinavia' : 'İskandinavya', path: all('?location=iskandinav') },
        { label: isEn ? 'Baltic' : 'Baltık', path: all('?location=baltik') },
      ],
    },
    {
      id: 'far-east',
      title: isEn ? 'Far East' : 'Uzak Doğu',
      titleEn: 'Far East',
      image: IMG.farEast,
      path: all('?location=japonya'),
      links: [
        { label: isEn ? 'Japan' : 'Japonya', path: all('?location=japonya') },
        { label: isEn ? 'Thailand' : 'Tayland', path: all('?location=tayland') },
        { label: isEn ? 'Korea' : 'Kore', path: all('?location=kore') },
        { label: 'Vietnam', path: all('?location=vietnam') },
      ],
    },
    {
      id: 'central-asia',
      title: isEn ? 'Central Asia & Caucasus' : 'Orta Asya & Kafkas',
      titleEn: 'Central Asia & Caucasus',
      image: IMG.centralAsia,
      path: all('?location=baku'),
      links: [
        { label: 'Bakü', path: all('?location=baku') },
        { label: 'Batum', path: all('?location=batum') },
        { label: 'Tiflis', path: all('?location=tiflis') },
      ],
    },
    {
      id: 'americas',
      title: isEn ? 'Americas' : 'Amerika Kıtası',
      titleEn: 'Americas',
      image: IMG.america,
      path: all('?location=amerika'),
      links: [
        { label: isEn ? 'USA' : 'Amerika', path: all('?location=amerika') },
        { label: 'Meksika', path: all('?location=meksika') },
        { label: isEn ? 'South America' : 'Güney Amerika', path: all('?location=guney amerika') },
      ],
    },
    {
      id: 'middle-east',
      title: isEn ? 'Middle East' : 'Orta Doğu',
      titleEn: 'Middle East',
      image: IMG.middleEast,
      path: all('?location=dubai'),
      links: [
        { label: 'Dubai', path: all('?location=dubai') },
        { label: 'Doha', path: all('?location=doha') },
        { label: 'Sharm El Sheikh', path: all('?location=sharm') },
      ],
    },
    {
      id: 'exotic-islands',
      title: isEn ? 'Exotic Islands' : 'Egzotik Adalar',
      titleEn: 'Exotic Islands',
      image: IMG.islands,
      path: all('?location=maldiv'),
      links: [
        { label: 'Maldivler', path: all('?location=maldiv') },
        { label: 'Bali', path: all('?location=bali') },
        { label: 'Phuket', path: all('?location=phuket') },
      ],
    },
    {
      id: 'nature',
      title: isEn ? 'Nature Tours' : 'Doğa Turları',
      titleEn: 'Nature Tours',
      image: IMG.nature,
      path: tourSub('doga-turlari'),
      links: [
        { label: isEn ? 'Nature' : 'Doğa turları', path: tourSub('doga-turlari') },
        { label: isEn ? '4–7 days' : '4–7 gece', path: all('?tour_duration=4-7') },
        { label: isEn ? '8+ days' : '8+ gece', path: all('?tour_duration=8%2B') },
      ],
    },
    {
      id: 'duration-short',
      title: isEn ? 'Short Breaks' : 'Kısa Kaçamaklar',
      titleEn: 'Short Breaks',
      image: IMG.plane,
      path: all('?tour_duration=2-3'),
      links: [
        { label: isEn ? '1–3 days' : '1–3 gece', path: all('?tour_duration=2-3') },
        { label: isEn ? 'Bus tours' : 'Otobüslü turlar', path: all('?tour_travel_type=bus') },
        { label: isEn ? 'No overnight stay' : 'Konaklamasız', path: all('?tour_accommodation=none') },
      ],
    },
    {
      id: 'deals',
      title: isEn ? 'Deals & Offers' : 'Kampanya & Fırsatlar',
      titleEn: 'Deals & Offers',
      image: IMG.deals,
      path: all('?sort=price_asc'),
      links: [
        { label: isEn ? 'Lowest price' : 'En uygun fiyat', path: all('?sort=price_asc') },
        { label: isEn ? 'Weekly tours' : 'Haftalık turlar', path: all('?tour_duration=4-7') },
        { label: isEn ? 'All tours' : 'Tüm turlar', path: '/turlar/all' },
      ],
    },
  ]

  return categories
}

export function tourHubCategoryTitle(cat: TourHubCategory, locale: string): string {
  const isEn = locale === 'en' || locale.startsWith('en-')
  return isEn ? cat.titleEn : cat.title
}

/** Page builder `category_hub_grid` modülü için turlar varsayılan config */
export function buildTurlarCategoryHubGridConfig(locale = 'tr') {
  const isEn = locale === 'en' || locale.startsWith('en-')
  return {
    heading: isEn ? 'International & domestic tours' : 'Yurt içi ve yurt dışı turlar',
    headingEn: 'International & domestic tours',
    subheading: isEn
      ? 'Browse tours by region, departure city, duration and travel style — pick a category to see matching programs.'
      : 'Bölge, kalkış noktası, süre ve ulaşım tipine göre tur seçeneklerini keşfedin; kategoriye tıklayarak ilgili programları listeleyin.',
    subheadingEn:
      'Browse tours by region, departure city, duration and travel style — pick a category to see matching programs.',
    cards: getTourHubCategories(locale).map((cat) => ({
      id: cat.id,
      title: cat.title,
      titleEn: cat.titleEn,
      image: cat.image,
      path: cat.path,
      links: cat.links.map((l) => ({ label: l.label, path: l.path })),
    })),
  }
}
