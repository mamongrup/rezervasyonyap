import Image from 'next/image'
import Link from 'next/link'
import { getPublicRegionStats } from '@/lib/travel-api'
import { withDevNoStore } from '@/lib/api-fetch-dev'

interface DestinationCard {
  name: string
  description?: string
  imageUrl: string
  href?: string
  listingCount?: number
}

interface DestinationCardsConfig {
  title?: string
  subtitle?: string
  viewAllHref?: string
  viewAllLabel?: string
  layout?: 'grid' | 'masonry'
  columns?: 2 | 3 | 4
  cards?: DestinationCard[]
  /** Backend'den çekilecek kategori kodu (boş = tümü) */
  categoryCode?: string
  /** Gösterilecek maksimum bölge sayısı (varsayılan 6) */
  limit?: number
}

const DEFAULT_CARDS: DestinationCard[] = [
  {
    name: 'İstanbul',
    description: 'Tarihin ve modernliğin buluştuğu şehir',
    imageUrl: '/uploads/external/327b4a5ee60eeeee3364.avif',
    href: '/destinasyonlar/istanbul',
    listingCount: 248,
  },
  {
    name: 'Antalya',
    description: "Akdeniz'in turkuaz kıyıları",
    imageUrl: '/uploads/external/63200ac597e2024e4a64.avif',
    href: '/destinasyonlar/antalya',
    listingCount: 312,
  },
  {
    name: 'Kapadokya',
    description: 'Eşsiz peri bacaları ve balon turları',
    imageUrl: '/uploads/external/c95ee57cc8149fd22468.avif',
    href: '/destinasyonlar/kapadokya',
    listingCount: 87,
  },
  {
    name: 'Bodrum',
    description: "Ege'nin incisi, masmavi denizler",
    imageUrl: '/uploads/external/8f30fff1870e11828ed2.avif',
    href: '/destinasyonlar/bodrum',
    listingCount: 134,
  },
  {
    name: 'Trabzon',
    description: 'Yeşilin bin tonu, Karadeniz sıcaklığı',
    imageUrl: '/uploads/external/bf9c4864f1475d90ae39.avif',
    href: '/destinasyonlar/trabzon',
    listingCount: 56,
  },
  {
    name: 'Alaçatı',
    description: 'Taş evler ve rüzgar sörfü cenneti',
    imageUrl: '/uploads/external/46dd8d2f4dd073fe1431.avif',
    href: '/destinasyonlar/alacati',
    listingCount: 73,
  },
]

function DestinationCard({ card }: { card: DestinationCard }) {
  const inner = (
    <div className="group relative h-56 w-full overflow-hidden rounded-2xl shadow-md sm:h-64">
      <Image
        src={card.imageUrl}
        alt={card.name}
        fill
        className="object-cover transition duration-500 group-hover:scale-110"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-bold text-white drop-shadow">{card.name}</h3>
        {card.description && (
          <p className="mt-0.5 text-sm text-white/80 line-clamp-1">{card.description}</p>
        )}
        {card.listingCount !== undefined && (
          <span className="mt-1.5 inline-block rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-white">
            {card.listingCount}+ ilan
          </span>
        )}
      </div>

      {/* Hover border glow */}
      <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-transparent transition group-hover:ring-white/30" />
    </div>
  )

  if (card.href) {
    return <Link href={card.href}>{inner}</Link>
  }
  return <div>{inner}</div>
}

export default async function DestinationCardsModule({ config }: { config: DestinationCardsConfig }) {
  // Panelde manuel kart tanımlanmışsa onları kullan
  let cards: DestinationCard[] = config.cards?.length ? config.cards : []

  // Manuel kart yok → API'den gerçek bölgeleri çek
  if (cards.length === 0) {
    try {
      const limit = config.limit ?? 6
      const apiRegions = await getPublicRegionStats(
        config.categoryCode ?? '',
        limit,
        withDevNoStore({ next: { revalidate: 300 } }),
      )
      if (apiRegions.length > 0) {
        cards = apiRegions.map((r) => ({
          name: r.name,
          imageUrl: r.thumbnail,
          href: `/destinasyonlar/${r.slug}`,
          listingCount: r.count,
        }))
      }
    } catch {
      // API yoksa hardcoded fallback
    }
  }

  if (cards.length === 0) cards = DEFAULT_CARDS

  const cols = config.columns ?? 3

  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[cols]

  return (
    <section>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">
            {config.title ?? 'Popüler Destinasyonlar'}
          </h2>
          {config.subtitle && (
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">{config.subtitle}</p>
          )}
        </div>
        {config.viewAllHref && (
          <Link
            href={config.viewAllHref}
            className="shrink-0 text-sm font-medium text-primary-6000 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition"
          >
            {config.viewAllLabel ?? 'Tümünü Gör'} →
          </Link>
        )}
      </div>

      {/* Grid */}
      <div className={`grid ${gridClass} gap-4`}>
        {cards.map((card, i) => (
          <DestinationCard key={i} card={card} />
        ))}
      </div>
    </section>
  )
}
