import Image from 'next/image'
import Link from 'next/link'

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
}

const DEFAULT_CARDS: DestinationCard[] = [
  {
    name: 'İstanbul',
    description: 'Tarihin ve modernliğin buluştuğu şehir',
    imageUrl: 'https://images.pexels.com/photos/3662925/pexels-photo-3662925.jpeg',
    href: '/destinasyonlar/istanbul',
    listingCount: 248,
  },
  {
    name: 'Antalya',
    description: "Akdeniz'in turkuaz kıyıları",
    imageUrl: 'https://images.pexels.com/photos/3886519/pexels-photo-3886519.jpeg',
    href: '/destinasyonlar/antalya',
    listingCount: 312,
  },
  {
    name: 'Kapadokya',
    description: 'Eşsiz peri bacaları ve balon turları',
    imageUrl: 'https://images.pexels.com/photos/4388167/pexels-photo-4388167.jpeg',
    href: '/destinasyonlar/kapadokya',
    listingCount: 87,
  },
  {
    name: 'Bodrum',
    description: "Ege'nin incisi, masmavi denizler",
    imageUrl: 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg',
    href: '/destinasyonlar/bodrum',
    listingCount: 134,
  },
  {
    name: 'Trabzon',
    description: 'Yeşilin bin tonu, Karadeniz sıcaklığı',
    imageUrl: 'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg',
    href: '/destinasyonlar/trabzon',
    listingCount: 56,
  },
  {
    name: 'Alaçatı',
    description: 'Taş evler ve rüzgar sörfü cenneti',
    imageUrl: 'https://images.pexels.com/photos/2614818/pexels-photo-2614818.jpeg',
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

export default function DestinationCardsModule({ config }: { config: DestinationCardsConfig }) {
  const cards = config.cards?.length ? config.cards : DEFAULT_CARDS
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
