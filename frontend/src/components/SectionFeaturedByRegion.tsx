'use client'

import type { TListingBase } from '@/types/listing-types'
import type { FeaturedByRegionConfig, FeaturedRegionEntry } from '@/types/listing-types'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Heading, Subheading } from '@/shared/Heading'
import { displayListingCategoryLine } from '@/lib/listing-category-display'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon, Location06Icon } from '@hugeicons/core-free-icons'
import Image from 'next/image'
import Link from 'next/link'
import { FC, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import StartRating from '@/components/StartRating'
import SaleOffBadge from '@/components/SaleOffBadge'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from '@/shared/Badge'
import ListingPrice from '@/components/ListingPrice'
// ─── Minimal listing card (like StayCard2 but generic) ───────────────────────

interface ListingCardProps {
  listing: TListingBase
  linkBase: string
  /** Örn. `/gece` veya `/gün` — yoksa `nightLabel` */
  priceUnit?: string
  nightLabel: string
  locale: string
}

function RegionListingCard({ listing, linkBase, priceUnit, nightLabel, locale }: ListingCardProps) {
  const vitrinHref = useVitrinHref()
  const { title, address, city, price, priceAmount, priceCurrency, reviewStart, reviewCount, saleOff, isAds, featuredImage, galleryImgs, like, handle } = listing
  const categoryLine = displayListingCategoryLine(listing, locale)
  const unitFromProp = priceUnit?.replace(/^\//, '').trim()
  const unitLabel = unitFromProp || nightLabel || 'gece'
  const listingHref = vitrinHref(`${linkBase}/${handle}`)

  const imgSrcRaw =
    (galleryImgs?.[0] && typeof galleryImgs[0] === 'string' ? galleryImgs[0] : undefined) ||
    (galleryImgs?.[0] as { src: string } | undefined)?.src ||
    featuredImage ||
    ''

  const [brokenImage, setBrokenImage] = useState(false)
  const trimmed = typeof imgSrcRaw === 'string' ? imgSrcRaw.trim() : ''
  const uploadsBlocked = trimmed.startsWith('/uploads/')
  const showRemoteImage = Boolean(trimmed) && !uploadsBlocked && !brokenImage

  return (
    <div className="group relative">
      {/* Image */}
      <div className="relative overflow-hidden rounded-xl">
        <Link href={listingHref} className="block">
          <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '75%' }}>
            {showRemoteImage ? (
              <Image
                src={trimmed}
                fill
                alt={title ?? 'listing'}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 24vw"
                unoptimized={trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)}
                onError={() => setBrokenImage(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />
            )}
          </div>
        </Link>
        {saleOff && <SaleOffBadge desc={saleOff} className="absolute left-3 top-3 z-10" />}
        {isAds && (
          <Badge color="green" className="absolute left-3 bottom-3 z-10 !bg-white !text-neutral-900">
            ADS
          </Badge>
        )}
        <div className="absolute right-3 top-3 z-10">
          <BtnLikeIcon isLiked={like ?? false} />
        </div>
      </div>

      {/* Info — StayCard2 ile aynı tipografi */}
      <div className="mt-3 space-y-2">
        {categoryLine ? (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{categoryLine}</span>
        ) : null}
        <h3 className="text-base font-semibold text-neutral-900 capitalize dark:text-white">
          <Link href={listingHref} className="line-clamp-1 hover:underline">
            {title}
          </Link>
        </h3>
        <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          <HugeiconsIcon icon={Location06Icon} className="mb-0.5 h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{city ?? address}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {(price || priceAmount != null) && (
            <div>
              <ListingPrice
                className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
                price={price}
                priceAmount={priceAmount}
                priceCurrency={priceCurrency}
              />
              <span className="mx-1 text-sm font-normal text-neutral-400 dark:text-neutral-500">/</span>
              <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">{unitLabel}</span>
            </div>
          )}
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
      </div>
    </div>
  )
}

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  listings: TListingBase[]
  linkBase: string
  priceUnit?: string
  nightLabel: string
  locale: string
}

function RegionSlider({ listings, linkBase, priceUnit, nightLabel, locale }: SliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const pag = getMessages(locale).common.pagination

  return (
    <div className="relative">
      <div
        ref={sliderRef}
        className="hidden-scrollbar relative -mx-2 flex snap-x snap-mandatory overflow-x-auto lg:-mx-3.5"
      >
        {listings.map((item) => (
          <div key={item.id} className="mySnapItem w-[17rem] shrink-0 px-2 lg:w-1/3 lg:px-3.5 xl:w-1/4">
            <RegionListingCard
              listing={item}
              linkBase={linkBase}
              priceUnit={priceUnit}
              nightLabel={nightLabel}
              locale={locale}
            />
          </div>
        ))}
      </div>

      <div className="absolute -start-3 top-[40%] z-10 -translate-y-1/2 sm:-start-5">
        <ButtonCircle color="white" onClick={scrollToPrevSlide} className="xl:size-11" disabled={isAtStart} aria-label={pag.previous}>
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
      <div className="absolute -end-3 top-[40%] z-10 -translate-y-1/2 sm:-end-5">
        <ButtonCircle color="white" onClick={scrollToNextSlide} className="xl:size-11" disabled={isAtEnd} aria-label={pag.next}>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
    </div>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

interface Props {
  className?: string
  /** Tüm ilanlar listesi */
  allListings: TListingBase[]
  /** Bölge yapılandırması (adminden veya default) */
  config: FeaturedByRegionConfig
  /** İlan detail URL prefix, ör. "/otel" */
  listingLinkBase?: string
  /** Fiyat birimi, ör. "/gece" */
  priceUnit?: string
  /** Boş bölge mesajı — verilmezse dil dosyasından */
  emptyListingsMessage?: string
}

/**
 * Bölge sekmeli ilan vitrin bölümü.
 * Config'de listingIds varsa sadece onları gösterir, yoksa o şehrin tüm ilanlarını getirir.
 */
const SectionFeaturedByRegion: FC<Props> = ({
  className = '',
  allListings,
  config,
  listingLinkBase = '/otel',
  priceUnit,
  emptyListingsMessage,
}) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const m = getMessages(locale)
  const {
    heading = m.pageBuilderDefaults.stay.featuredByRegion.heading,
    subheading = m.pageBuilderDefaults.stay.featuredByRegion.subheading,
    viewAllHref,
    regions,
  } = config

  // default: en fazla ilana sahip bölge
  const [activeSlug, setActiveSlug] = useState<string>(regions[0]?.slug ?? '')

  const activeRegion: FeaturedRegionEntry | undefined = regions.find((r) => r.slug === activeSlug)

  const filteredListings = activeRegion
    ? activeRegion.listingIds?.length
      ? allListings.filter((l) => activeRegion.listingIds!.includes(l.id))
      : allListings.filter((l) => l.city?.toLowerCase() === activeRegion.name.toLowerCase())
    : allListings

  if (!regions.length) return null

  return (
    <section className={`relative ${className}`}>
      <div className="relative mb-10 max-w-2xl lg:mb-12">
        <Heading level={2}>{heading}</Heading>
        {subheading && <Subheading className="mt-3.5">{subheading}</Subheading>}
      </div>

      {/* Bölge sekmeleri + Tümünü gör (SectionTabHeader ile aynı düzen) */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="hidden-scrollbar flex max-w-full grow flex-wrap gap-2 overflow-x-auto sm:gap-x-1.5">
          {regions.map((region) => (
            <button
              key={region.slug}
              type="button"
              onClick={() => setActiveSlug(region.slug)}
              className={`rounded-full px-4 py-2.5 text-sm leading-none font-medium whitespace-nowrap transition-colors sm:px-6 sm:py-3 ${
                activeSlug === region.slug
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:bg-black/5 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5'
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>
        {viewAllHref && (
          <ButtonSecondary className="ml-auto shrink-0" href={viewAllHref}>
            <span>{m.common['View all']}</span>
            <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
          </ButtonSecondary>
        )}
      </div>

      {/* Slider */}
      {filteredListings.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-400">
          {emptyListingsMessage ?? m.homePage.featuredStay.noListingsInRegion}
        </div>
      ) : (
        <RegionSlider
          listings={filteredListings}
          linkBase={listingLinkBase}
          priceUnit={priceUnit}
          nightLabel={m.common.night}
          locale={locale}
        />
      )}
    </section>
  )
}

export default SectionFeaturedByRegion

export { buildDefaultFeaturedRegionConfig } from '@/lib/featured-region-defaults'
