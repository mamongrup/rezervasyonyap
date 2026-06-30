import { getFlightListingByHandle } from '@/data/listings'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import { stripHtml } from '@/lib/social-share/strip-html'
import { vitrinHref } from '@/lib/vitrin-href'
import { searchPublicListings } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { Airplane02Icon, ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import FlightCard from '@/components/FlightCard'
import type { TFlightListing } from '@/data/listings'
import HeaderGallery from '../../components/HeaderGallery'

type Props = { params: Promise<{ locale: string; handle: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, locale } = await params
  const msgs = getMessages(locale)
  const listing = await getFlightListingByHandle(handle, locale)
  if (!listing) return { title: msgs.flightDetail.routeNotFound }

  const title = listing.title
  const description = listing.description
    ? stripHtml(listing.description).slice(0, 155)
    : `${listing.title} — ${msgs.flightDetail.searchTitle}`

  const ogImage = listing.featuredImage ?? listing.galleryImgs?.[0] ?? null

  return {
    title,
    description,
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  }
}

/** Parse "IST → ESB" or "Istanbul – Ankara" into [from, to] parts */
function parseRoute(raw: string | undefined): [string, string] {
  if (!raw) return ['', '']
  const sep = raw.includes('→') ? '→' : raw.includes('–') ? '–' : raw.includes('-') ? '-' : null
  if (!sep) return [raw.trim(), '']
  const parts = raw.split(sep)
  return [parts[0]?.trim() ?? '', parts[1]?.trim() ?? '']
}

export default async function Page({ params }: Props) {
  const { handle, locale } = await params
  const msgs = getMessages(locale)
  const m = msgs.flightDetail

  const [listing, similarRes, backHref, searchHref] = await Promise.all([
    getFlightListingByHandle(handle, locale),
    searchPublicListings({ categoryCode: 'flight', locale, perPage: 6 }),
    vitrinHref(locale, '/ucak-bileti/all'),
    vitrinHref(locale, '/ucak-bileti/all'),
  ])
  if (!listing) redirect(await vitrinHref(locale, '/ucak-bileti/all'))

  // Parse from / to from location_name or title
  const [fromCode, toCode] = parseRoute(listing.address ?? listing.title)
  const fromDisplay = (listing as TFlightListing).departure?.trim() || fromCode
  const toDisplay = (listing as TFlightListing).arrival?.trim() || toCode

  // Price
  const priceStr = listing.price ?? null
  const priceCurrency = listing.priceCurrency ?? 'TRY'

  // Gallery
  const gallery = listing.galleryImgs ?? (listing.featuredImage ? [listing.featuredImage] : [])

  const similarFiltered = (similarRes?.listings ?? [])
    .filter((l) => l.slug !== handle)
    .slice(0, 3)
    .map((l) => mapPublicListingItemToListingBase(l, { locale })) as TFlightListing[]

  return (
    <main className="container mx-auto px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" strokeWidth={1.75} />
        {m.backToFlights}
      </Link>

      {/* Header — hero image + route badge */}
      <div className="relative mb-8 overflow-hidden rounded-2xl">
        {gallery.length > 0 ? (
          <HeaderGallery images={gallery} />
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-gradient-to-r from-sky-100 to-blue-200 dark:from-sky-950 dark:to-blue-900 sm:h-80">
            <HugeiconsIcon icon={Airplane02Icon} className="size-20 text-sky-300 dark:text-sky-700" strokeWidth={1} />
          </div>
        )}

        {/* Route overlay */}
        {(fromDisplay || toDisplay) && (
          <div className="absolute bottom-4 start-4 flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 text-white backdrop-blur-sm">
            <span className="text-xl font-bold">{fromDisplay}</span>
            <HugeiconsIcon icon={ArrowRight02Icon} className="size-5" strokeWidth={2} />
            <span className="text-xl font-bold">{toDisplay}</span>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Title & route info */}
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
              {listing.title}
            </h1>
            {listing.description && (
              <p className="text-neutral-600 dark:text-neutral-400">{stripHtml(listing.description)}</p>
            )}
          </div>

          {/* Route info card */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
            <h2 className="mb-4 text-base font-semibold text-neutral-800 dark:text-neutral-200">
              {m.routeInfo}
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wider text-neutral-500">{m.departure}</span>
                <span className="text-2xl font-bold text-neutral-900 dark:text-white">{fromDisplay || '–'}</span>
              </div>
              <HugeiconsIcon
                icon={Airplane02Icon}
                className="hidden size-8 text-sky-500 sm:block"
                strokeWidth={1.25}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wider text-neutral-500">{m.arrival}</span>
                <span className="text-2xl font-bold text-neutral-900 dark:text-white">{toDisplay || '–'}</span>
              </div>
              <div className="ms-auto rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                {m.directFlight}
              </div>
            </div>
          </div>
        </div>

        {/* Right — price & CTA */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            {priceStr ? (
              <div className="mb-1">
                <span className="text-sm text-neutral-500">{m.priceFrom} </span>
                <span className="text-3xl font-bold text-neutral-900 dark:text-white">{priceStr}</span>
              </div>
            ) : null}
            <p className="mb-5 text-xs text-neutral-400">{m.priceNote}</p>
            <Link
              href={searchHref}
              className="block w-full rounded-xl bg-primary-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              {m.searchButton}
            </Link>
            <p className="mt-4 text-center text-xs text-neutral-400">{m.bookCtaDesc}</p>
          </div>
        </div>
      </div>

      {/* Similar routes */}
      {similarFiltered.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {m.similarRoutes}
          </h2>
          <div className="flex flex-col gap-4">
            {similarFiltered.map((l) => (
              <FlightCard
                key={l.id}
                data={l}
                msgs={msgs.flightCard}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
