import type { ReactNode } from 'react'
import { Info, Landmark, PlaneTakeoff, ShoppingBasket } from 'lucide-react'
import type { NearbyPoiCategory } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

export type HotelDistanceItem = {
  name: string
  distanceKm: number
  category?: NearbyPoiCategory
  popularity?: number
  manual?: boolean
}

const CATEGORY_ORDER: NearbyPoiCategory[] = [
  'beach',
  'ruins',
  'historic',
  'market',
  'restaurant',
  'hospital',
  'pharmacy',
  'airport',
  'bus_station',
  'port',
  'other',
]

const CATEGORY_LABELS: Record<string, Record<NearbyPoiCategory, string>> = {
  tr: {
    beach: 'Plajlar',
    ruins: 'Ören Yerleri',
    historic: 'Tarihi Alanlar',
    market: 'Marketler',
    restaurant: 'Restoranlar',
    hospital: 'Hastaneler',
    pharmacy: 'Eczaneler',
    airport: 'Havalimanları',
    bus_station: 'Otogarlar',
    port: 'Limanlar',
    other: 'Diğer Mekanlar',
  },
  en: {
    beach: 'Beaches',
    ruins: 'Archaeological Sites',
    historic: 'Historic Sites',
    market: 'Markets',
    restaurant: 'Restaurants',
    hospital: 'Hospitals',
    pharmacy: 'Pharmacies',
    airport: 'Airports',
    bus_station: 'Bus Terminals',
    port: 'Ports',
    other: 'Other Places',
  },
  de: {
    beach: 'Strände',
    ruins: 'Archäologische Stätten',
    historic: 'Historische Stätten',
    market: 'Märkte',
    restaurant: 'Restaurants',
    hospital: 'Krankenhäuser',
    pharmacy: 'Apotheken',
    airport: 'Flughäfen',
    bus_station: 'Busbahnhöfe',
    port: 'Häfen',
    other: 'Weitere Orte',
  },
  ru: {
    beach: 'Пляжи',
    ruins: 'Археологические памятники',
    historic: 'Исторические места',
    market: 'Магазины',
    restaurant: 'Рестораны',
    hospital: 'Больницы',
    pharmacy: 'Аптеки',
    airport: 'Аэропорты',
    bus_station: 'Автовокзалы',
    port: 'Порты',
    other: 'Другие места',
  },
  zh: {
    beach: '海滩',
    ruins: '考古遗址',
    historic: '历史景点',
    market: '市场',
    restaurant: '餐厅',
    hospital: '医院',
    pharmacy: '药店',
    airport: '机场',
    bus_station: '汽车站',
    port: '港口',
    other: '其他地点',
  },
  fr: {
    beach: 'Plages',
    ruins: 'Sites archéologiques',
    historic: 'Sites historiques',
    market: 'Marchés',
    restaurant: 'Restaurants',
    hospital: 'Hôpitaux',
    pharmacy: 'Pharmacies',
    airport: 'Aéroports',
    bus_station: 'Gares routières',
    port: 'Ports',
    other: 'Autres lieux',
  },
}

function formatDistance(locale: string, km: number): string {
  const sp = getMessages(locale).listing.servicePois
  return km < 1
    ? interpolate(sp.distanceMeters, { m: String(Math.round(km * 1000)) })
    : interpolate(sp.distanceKm, { km: km.toFixed(1) })
}

function DistanceColumn({
  icon,
  title,
  items,
  locale,
}: {
  icon: ReactNode
  title: string
  items: HotelDistanceItem[]
  locale: string
}) {
  if (!items.length) return null
  const labels = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.en
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => (item.category ?? 'other') === category),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex items-center gap-2.5 border-b border-neutral-100 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
        <span className="text-primary-600 dark:text-primary-400">{icon}</span>
        <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {grouped.map((group) => (
          <section key={`${title}-${group.category}`}>
            <h4 className="bg-neutral-50/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/30 dark:text-neutral-400">
              {labels[group.category]}
            </h4>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {group.items.map((item, index) => (
                <li
                  key={`${title}-${group.category}-${item.name}-${index}`}
                  className="flex items-baseline justify-between gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 text-sm leading-snug text-neutral-700 dark:text-neutral-300">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {formatDistance(locale, item.distanceKm)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

interface Props {
  historicPlaces: HotelDistanceItem[]
  surroundings: HotelDistanceItem[]
  transport: HotelDistanceItem[]
  locale?: string
  /** Bölüm başlığı — örn. «Yakındaki mekanlar» */
  title?: string
  /** Bölge etiketi — örn. «Kaş, Antalya» */
  regionLabel?: string
}

export default function HotelListingDistancesSection({
  historicPlaces,
  surroundings,
  transport,
  locale = 'tr',
  title,
  regionLabel,
}: Props) {
  const hd = getMessages(locale).listing.hotelDetail
  const hdFallback = getMessages('en').listing.hotelDetail
  const regionCopy = getMessages(locale).site.region
  const columns = [
    {
      key: 'historic',
      icon: <Landmark className="h-5 w-5" aria-hidden />,
      title: hd?.distancesColAttractions ?? hdFallback.distancesColAttractions,
      items: historicPlaces,
    },
    {
      key: 'surroundings',
      icon: <ShoppingBasket className="h-5 w-5" aria-hidden />,
      title: hd?.distancesColEssentials ?? hdFallback.distancesColEssentials,
      items: surroundings,
    },
    {
      key: 'transport',
      icon: <PlaneTakeoff className="h-5 w-5" aria-hidden />,
      title: hd?.distancesColTransport ?? hdFallback.distancesColTransport,
      items: transport,
    },
  ].filter((col) => col.items.length > 0)

  if (columns.length === 0) return null

  const footnote = hd?.distancesFootnote ?? hdFallback.distancesFootnote
  const region = regionLabel?.trim()
  const subtitle = region
    ? `${region}${regionCopy.nearbyPlacesFlatListingDistanceSuffix ?? ''}`
    : null

  return (
    <div className="space-y-3">
      {title || subtitle ? (
        <div>
          {title ? (
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
          ) : null}
          {subtitle ? (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => (
          <DistanceColumn
            key={col.key}
            icon={col.icon}
            title={col.title}
            items={col.items}
            locale={locale}
          />
        ))}
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{footnote}</span>
      </p>
    </div>
  )
}
