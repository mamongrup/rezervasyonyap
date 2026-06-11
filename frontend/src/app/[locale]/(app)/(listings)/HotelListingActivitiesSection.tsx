'use client'

import { useOptionalHotelStayBooking } from '@/app/[locale]/(app)/(listings)/hotel-stay-booking-context'
import useSnapSlider from '@/hooks/useSnapSlider'
import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import {
  activityAffectsStayPricing,
  hotelActivityLocalizedDescription,
  hotelActivityLocalizedTitle,
} from '@/lib/hotel-activity-pricing'
import type { HotelListingActivity } from '@/lib/travel-api'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Image from 'next/image'
import { useRef } from 'react'

function activityBannerSrc(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('/')) return t
  return storageKeyToPublicUrl(t)
}

function formatActivityDateLabel(iso: string, locale: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

function ActivityBannerCard({
  item,
  locale,
  inStay,
  affectsPricing,
}: {
  item: HotelListingActivity
  locale: string
  inStay: boolean
  affectsPricing: boolean
}) {
  const hd = getMessages(locale).listing.hotelDetail
  const hdFallback = getMessages('en').listing.hotelDetail
  const label = hotelActivityLocalizedTitle(item, locale)
  const description = hotelActivityLocalizedDescription(item, locale)
  const bannerSrc = activityBannerSrc(item.image_url)

  return (
    <article
      className={clsx(
        'w-full min-w-0 overflow-hidden rounded-2xl border shadow-sm transition',
        inStay && affectsPricing
          ? 'border-primary-200 ring-1 ring-primary-100 dark:border-primary-800 dark:ring-primary-900/40'
          : inStay
            ? 'border-sky-200 dark:border-sky-800'
            : 'border-neutral-200 dark:border-neutral-700',
      )}
    >
      <div className="relative h-36 w-full bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 sm:h-40">
        {bannerSrc ? (
          <Image
            src={bannerSrc}
            alt=""
            fill
            sizes="(max-width:640px) 100vw, 640px"
            className="object-cover"
            unoptimized={bannerSrc.startsWith('http')}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-base font-bold leading-snug sm:text-lg">{label}</p>
          <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm">
            {formatActivityDateLabel(item.activity_date, locale)}
          </p>
        </div>
        {inStay ? (
          <span className="absolute end-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-primary-700 shadow-sm">
            {hd.activitiesDuringStayBadge ?? hdFallback.activitiesDuringStayBadge}
          </span>
        ) : null}
      </div>
      {description ? (
        <div className="border-t border-neutral-100 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
          {inStay && affectsPricing ? (
            <p className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400">
              {hd.activitiesAutoPricingNote ?? hdFallback.activitiesAutoPricingNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export default function HotelListingActivitiesSection({
  locale,
  title,
  activities,
}: {
  locale: string
  title: string
  activities: HotelListingActivity[]
}) {
  const booking = useOptionalHotelStayBooking()
  const sliderRef = useRef<HTMLDivElement>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const hd = getMessages(locale).listing.hotelDetail
  const hdFallback = getMessages('en').listing.hotelDetail

  const visible = activities.filter((a) => a.is_active !== false)
  if (!visible.length) return null

  const hasDateRange = booking?.rangeStart != null && booking?.rangeEnd != null
  const useSlider = visible.length > 2
  const showArrows = useSlider && visible.length > 1

  return (
    <section
      aria-labelledby="hotel-listing-activities-heading"
      className="listingSection__wrap min-w-0"
    >
      <h2
        id="hotel-listing-activities-heading"
        className="text-lg font-bold text-neutral-900 dark:text-white md:text-xl"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {hd.activitiesBannerHint ?? hdFallback.activitiesBannerHint}
      </p>
      {!hasDateRange && booking ? (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {hd.activitiesSelectDatesForPricing ?? hdFallback.activitiesSelectDatesForPricing}
        </p>
      ) : null}

      {useSlider ? (
        <div className="relative mt-4 min-w-0">
          <div
            ref={sliderRef}
            className="hidden-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1"
          >
            {visible.map((item) => {
              const inStay = booking?.isActivityDateInStay(item) ?? false
              return (
                <div
                  key={item.id}
                  className="mySnapItem w-[min(100%,18rem)] shrink-0 snap-start sm:w-80"
                >
                  <ActivityBannerCard
                    item={item}
                    locale={locale}
                    inStay={inStay}
                    affectsPricing={activityAffectsStayPricing(item)}
                  />
                </div>
              )
            })}
          </div>
          {showArrows ? (
            <>
              <div className="absolute -start-3 top-[38%] z-10 -translate-y-1/2 sm:-start-4">
                <ButtonCircle
                  color="white"
                  onClick={scrollToPrevSlide}
                  className={clsx(isAtStart && 'opacity-30')}
                  aria-label={hd.activitiesScrollPrev ?? hdFallback.activitiesScrollPrev}
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                </ButtonCircle>
              </div>
              <div className="absolute -end-3 top-[38%] z-10 -translate-y-1/2 sm:-end-4">
                <ButtonCircle
                  color="white"
                  onClick={scrollToNextSlide}
                  className={clsx(isAtEnd && 'opacity-30')}
                  aria-label={hd.activitiesScrollNext ?? hdFallback.activitiesScrollNext}
                >
                  <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                </ButtonCircle>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {visible.map((item) => {
            const inStay = booking?.isActivityDateInStay(item) ?? false
            return (
              <li key={item.id} className="min-w-0">
                <ActivityBannerCard
                  item={item}
                  locale={locale}
                  inStay={inStay}
                  affectsPricing={activityAffectsStayPricing(item)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
