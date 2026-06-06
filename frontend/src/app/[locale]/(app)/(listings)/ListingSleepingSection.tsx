'use client'

import type { ListingBedroomRow } from '@/lib/travel-api'
import { BedSingle01Icon } from '@/components/Icons'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { Divider } from '@/shared/divider'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export default function ListingSleepingSection({
  locale,
  bedrooms,
  className,
}: {
  locale: string
  bedrooms: ListingBedroomRow[]
  className?: string
}) {
  const messages = getMessages(locale)
  const copy = messages.listing.detailPage

  if (!bedrooms.length) return null

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{copy.sleepingTitle}</SectionHeading>
        <SectionSubheading>{copy.sleepingSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bedrooms.map((room) => {
          const title = room.name?.trim() || copy.sleepingTitle
          const floor =
            room.floor_label?.trim() ?
              interpolate(copy.sleepingFloor, { floor: room.floor_label.trim() })
            : null
          return (
            <li
              key={room.id}
              className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <BedSingle01Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
                  {floor ? (
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{floor}</p>
                  ) : null}
                </div>
              </div>
              {room.beds_description?.trim() ? (
                <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{room.beds_description.trim()}</p>
              ) : null}
              {room.ensuite ? (
                <p className="mt-2 text-xs font-medium text-primary-700 dark:text-primary-300">{copy.sleepingEnsuite}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
