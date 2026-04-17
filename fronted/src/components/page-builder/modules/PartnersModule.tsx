import Image from 'next/image'
import Link from 'next/link'

interface PartnerItem {
  name: string
  logoUrl: string
  href?: string
  description?: string
}

interface PartnersConfig {
  title?: string
  subtitle?: string
  layout?: 'strip' | 'grid'
  columns?: 3 | 4 | 5 | 6
  showNames?: boolean
  backgroundStyle?: 'white' | 'light' | 'bordered'
  items?: PartnerItem[]
}

const DEFAULT_ITEMS: PartnerItem[] = [
  { name: 'Turkish Airlines', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Turkish_Airlines_logo.svg/1200px-Turkish_Airlines_logo.svg.png' },
  { name: 'Pegasus', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Pegasus_Airlines_logo.svg/1200px-Pegasus_Airlines_logo.svg.png' },
  { name: 'Booking.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Booking.com_logo.svg/1200px-Booking.com_logo.svg.png' },
  { name: 'Marriott', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Marriott_International_logo.svg/1200px-Marriott_International_logo.svg.png' },
  { name: 'Airbnb', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_Bélo.svg/1200px-Airbnb_Logo_Bélo.svg.png' },
  { name: 'Expedia', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Expedia_logo_2012.svg/1200px-Expedia_logo_2012.svg.png' },
]

function PartnerLogo({ item, showName }: { item: PartnerItem; showName?: boolean }) {
  const inner = (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-12 w-full">
        <Image
          src={item.logoUrl}
          alt={item.name}
          fill
          className="object-contain filter grayscale opacity-60 transition duration-300 hover:grayscale-0 hover:opacity-100"
          sizes="(max-width: 640px) 50vw, 20vw"
          unoptimized
        />
      </div>
      {showName && (
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{item.name}</span>
      )}
    </div>
  )

  if (item.href) {
    return (
      <Link href={item.href} target="_blank" rel="noopener noreferrer" className="block px-4 py-3">
        {inner}
      </Link>
    )
  }
  return <div className="px-4 py-3">{inner}</div>
}

export default function PartnersModule({ config }: { config: PartnersConfig }) {
  const items = config.items?.length ? config.items : DEFAULT_ITEMS
  const layout = config.layout ?? 'strip'
  const cols = config.columns ?? 4
  const showNames = config.showNames ?? false
  const bg = config.backgroundStyle ?? 'light'

  const gridClass = {
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6',
  }[cols]

  return (
    <section>
      {/* Header */}
      {(config.title || config.subtitle) && (
        <div className="mb-8 text-center">
          {config.title && (
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white md:text-2xl">
              {config.title}
            </h2>
          )}
          {config.subtitle && (
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{config.subtitle}</p>
          )}
        </div>
      )}

      {/* Logos */}
      <div
        className={
          bg === 'light'
            ? 'rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 px-4 py-6'
            : bg === 'bordered'
            ? 'rounded-2xl border border-neutral-200 dark:border-neutral-800 px-4 py-6'
            : 'px-4 py-2'
        }
      >
        {layout === 'strip' ? (
          /* Horizontal scrollable strip */
          <div className="flex items-center justify-between gap-6 overflow-x-auto scrollbar-none flex-wrap">
            {items.map((item, i) => (
              <div key={i} className="min-w-[100px] flex-1">
                <PartnerLogo item={item} showName={showNames} />
              </div>
            ))}
          </div>
        ) : (
          /* Grid layout */
          <div className={`grid ${gridClass} divide-x divide-y divide-neutral-100 dark:divide-neutral-800`}>
            {items.map((item, i) => (
              <PartnerLogo key={i} item={item} showName={showNames} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
