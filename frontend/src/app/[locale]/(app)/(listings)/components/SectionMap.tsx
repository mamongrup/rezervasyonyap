import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { Divider } from '@/shared/divider'
import { SectionHeading, SectionSubheading } from './SectionHeading'

interface Props {
  lat?: number
  lng?: number
  address?: string
  heading?: string
  subheading?: string
}

const SectionMap = async ({ lat, lng, address, heading = 'Konum', subheading }: Props) => {
  const cfg = await getCachedSiteConfig()
  const mapsApiKey =
    (cfg?.maps as Record<string, unknown> | undefined)?.api_key as string | undefined

  const mapSrc = lat && lng && mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${lat},${lng}&zoom=14`
    : lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`
    : undefined

  return (
    <div className="listingSection__wrap">
      <div>
        <SectionHeading>{heading}</SectionHeading>
        {(subheading ?? address) && (
          <SectionSubheading>{subheading ?? address}</SectionSubheading>
        )}
      </div>
      <Divider className="w-14!" />

      {mapSrc ? (
        <div className="aspect-w-5 rounded-2xl ring-1 ring-black/10 aspect-h-6 sm:aspect-h-3 lg:aspect-h-2 overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapSrc}
            className="rounded-2xl"
          />
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 text-sm">
          Harita bilgisi mevcut değil
        </div>
      )}

      {address && (
        <div className="mt-4 flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{address}</span>
        </div>
      )}
    </div>
  )
}

export default SectionMap
