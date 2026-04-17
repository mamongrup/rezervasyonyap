'use client'

import {
  HOTEL_AMENITY_IDS,
  VILLA_AMENITY_IDS,
  buildGroupedAmenities,
  getListingAmenityIcon,
  type AmenityGroupId,
  type ListingAmenityId,
} from '@/lib/listing-amenities'
import ButtonClose from '@/shared/ButtonClose'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import clsx from 'clsx'
import { useState } from 'react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

const PREVIEW_COUNT = 9

/** Şablondaki (Chisfis) satır ikonları: 24×24, nötr gri, ince çizgi — `Icons.tsx` (stroke 1.5) ile uyum */
const AMENITY_ICON_CLASS = 'h-6 w-6 shrink-0 text-neutral-600 dark:text-neutral-400'

function labelFor(messages: ReturnType<typeof getMessages>, id: string): string {
  const labels = messages.listing.amenities.labels
  return (labels as Record<string, string>)[id] ?? id
}

function groupTitle(messages: ReturnType<typeof getMessages>, groupId: AmenityGroupId): string {
  const g = messages.listing.amenities.groups as Record<string, string>
  return g[groupId] ?? groupId
}

export default function ListingAmenitiesSection({
  locale,
  variant,
  className,
}: {
  locale: string
  variant: 'hotel' | 'villa'
  className?: string
}) {
  const messages = getMessages(locale)
  const ids = (
    variant === 'hotel' ? HOTEL_AMENITY_IDS : VILLA_AMENITY_IDS
  ) as readonly ListingAmenityId[]

  const [open, setOpen] = useState(false)

  const previewIds = ids.slice(0, PREVIEW_COUNT)
  const remaining = Math.max(0, ids.length - PREVIEW_COUNT)

  const subtitle =
    variant === 'hotel' ? messages.listing.amenities.subtitleHotel : messages.listing.amenities.subtitleVilla

  const modalGroups = buildGroupedAmenities(ids, variant)

  return (
    <div className={clsx('listingSection__wrap', className)}>
      <div>
        <SectionHeading>{messages.listing.amenities.title}</SectionHeading>
        <SectionSubheading>{subtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid grid-cols-2 gap-4 text-sm text-neutral-700 sm:grid-cols-3 dark:text-neutral-300">
        {previewIds.map((id) => {
          const Icon = getListingAmenityIcon(id)
          return (
            <div key={id} className="flex items-center gap-x-3">
              <Icon className={AMENITY_ICON_CLASS} strokeWidth={1.5} aria-hidden />
              <span className="leading-snug">{labelFor(messages, id)}</span>
            </div>
          )
        })}
      </div>

      {remaining > 0 ? (
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
          <div className="flex justify-center sm:justify-start">
            <ButtonSecondary type="button" onClick={() => setOpen(true)} className="rounded-full px-6">
              {messages.listing.amenities.viewMore.replace('{count}', String(remaining))}
            </ButtonSecondary>
          </div>
        </div>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-[60]">
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:opacity-0 dark:bg-neutral-900 dark:ring-white/10"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-700">
              <h2 className="pe-8 text-lg font-semibold text-neutral-900 dark:text-white">
                {messages.listing.amenities.modalTitle}
              </h2>
              <CloseButton as={ButtonClose} className="shrink-0">
                <span className="sr-only">{messages.listing.amenities.close}</span>
              </CloseButton>
            </div>
            <div className="max-h-[min(72vh,620px)] overflow-y-auto px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-8">
                {modalGroups.map(({ groupId, ids: groupIds }) => (
                  <section key={groupId} aria-labelledby={`amenity-group-${groupId}`}>
                    <h3
                      id={`amenity-group-${groupId}`}
                      className="mb-3 text-sm font-semibold tracking-tight text-neutral-900 dark:text-white"
                    >
                      {groupTitle(messages, groupId)}
                    </h3>
                    <div className="grid grid-cols-1 gap-3.5 text-sm text-neutral-700 sm:grid-cols-2 dark:text-neutral-300">
                      {groupIds.map((id) => {
                        const Icon = getListingAmenityIcon(id)
                        return (
                          <div key={id} className="flex items-center gap-x-3">
                            <Icon className={AMENITY_ICON_CLASS} strokeWidth={1.5} aria-hidden />
                            <span className="leading-snug">{labelFor(messages, id)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
