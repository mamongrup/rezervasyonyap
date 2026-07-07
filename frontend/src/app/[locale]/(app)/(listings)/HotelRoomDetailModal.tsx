'use client'

import type { HotelRoomShowcaseItem } from './HotelRoomShowcase'
import ButtonClose from '@/shared/ButtonClose'
import {
  getHotelRoomBedLabel,
  getHotelRoomGuestLabel,
  getHotelRoomSizeLabel,
} from '@/lib/hotel-room-display'
import { getAmenityIconForKey } from '@/lib/listing-amenities'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { BedDouble, ChevronLeft, ChevronRight, Ruler, ThumbsUp, Users } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

const VISIBLE_AMENITY_COUNT = 4
const ICON_STROKE = 1.5
const META_ICON_WRAP =
  'flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
const AMENITY_ICON_WRAP =
  'flex size-8 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200/80 dark:bg-neutral-800/80 dark:text-neutral-300 dark:ring-neutral-700'

function RoomMetaItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
      <span className={META_ICON_WRAP}>{icon}</span>
      <span>{label}</span>
    </span>
  )
}

function RoomMetaDivider() {
  return <span className="hidden text-neutral-300 sm:inline dark:text-neutral-600">|</span>
}

function RoomAmenityListItem({
  amenityKey,
  label,
  isPaid,
}: {
  amenityKey: string
  label: string
  isPaid: boolean
}) {
  const Icon = getAmenityIconForKey(amenityKey)
  return (
    <li className="flex items-center gap-2.5 text-sm text-neutral-800 dark:text-neutral-200">
      <span className={AMENITY_ICON_WRAP}>
        <Icon className="size-4" strokeWidth={ICON_STROKE} aria-hidden />
      </span>
      <span>
        {label}
        {isPaid ? ' *' : ''}
      </span>
    </li>
  )
}

function RoomExtraAmenitiesDialog({
  open,
  onClose,
  title,
  amenities,
  amenityLabels,
  paidKeys,
  paidNote,
  closeLabel,
}: {
  open: boolean
  onClose: () => void
  title: string
  amenities: readonly string[]
  amenityLabels: Record<string, string>
  paidKeys: ReadonlySet<string>
  paidNote: string
  closeLabel: string
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[80]">
      <DialogBackdrop className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          transition
          className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:translate-y-4 data-closed:opacity-0 sm:rounded-3xl dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-700">
            <h2 className="pe-8 text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
            <CloseButton as={ButtonClose} className="shrink-0">
              <span className="sr-only">{closeLabel}</span>
            </CloseButton>
          </div>
          <div className="overflow-y-auto px-5 py-4 sm:px-6">
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {amenities.map((key) => {
                const label = amenityLabels[key] ?? key.replace(/_/g, ' ')
                return (
                  <RoomAmenityListItem
                    key={key}
                    amenityKey={key}
                    label={label}
                    isPaid={paidKeys.has(key)}
                  />
                )
              })}
            </ul>
            {paidKeys.size > 0 ? (
              <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">{paidNote}</p>
            ) : null}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function ModalImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    setIndex(0)
  }, [images])
  const src = images[index] ?? images[0]
  if (!src) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
        <BedDouble className="size-10" strokeWidth={1.25} aria-hidden />
      </div>
    )
  }
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
      <Image src={src} alt={alt} fill sizes="(min-width: 768px) 480px, 100vw" className="object-cover" />
      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Önceki"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md transition hover:bg-white dark:bg-neutral-900/90 dark:text-neutral-100"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Sonraki"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md transition hover:bg-white dark:bg-neutral-900/90 dark:text-neutral-100"
          >
            <ChevronRight className="size-5" strokeWidth={2} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={clsx(
                  'size-1.5 rounded-full transition',
                  i === index ? 'bg-white' : 'bg-white/50',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function HotelRoomDetailModal({
  open,
  onClose,
  locale,
  room,
  paidAmenityKeys,
  onSelectDates,
}: {
  open: boolean
  onClose: () => void
  locale: string
  room: HotelRoomShowcaseItem | null
  paidAmenityKeys?: ReadonlySet<string>
  onSelectDates?: () => void
}) {
  const messages = getMessages(locale)
  const dp = messages.listing.detailPage
  const rs = (messages.listing.roomShowcase ?? {}) as Record<string, string>
  const amenityLabels = messages.listing.amenities.labels as Record<string, string>
  const [extraAmenitiesOpen, setExtraAmenitiesOpen] = useState(false)

  useEffect(() => {
    setExtraAmenitiesOpen(false)
  }, [room?.id, open])

  if (!room) return null

  const guestLabel = getHotelRoomGuestLabel(room, dp.guestsShort)
  const bedLabel = getHotelRoomBedLabel(room, rs.bedsShort ?? '{count} yatak')
  const sizeLabel = getHotelRoomSizeLabel(room, rs.sizeM2 ?? '{value} m²')
  const hasMeta = guestLabel != null || bedLabel != null || sizeLabel != null

  const images =
    (room.images ?? []).filter(Boolean).length > 0
      ? (room.images ?? []).filter(Boolean)
      : room.image?.trim()
        ? [room.image.trim()]
        : []

  const paidKeys =
    paidAmenityKeys ??
    (room.paidAmenities ? new Set(room.paidAmenities) : new Set<string>())
  const amenities = room.amenities ?? []
  const hiddenAmenities = amenities.slice(VISIBLE_AMENITY_COUNT)
  const visibleAmenities = amenities.slice(0, VISIBLE_AMENITY_COUNT)

  return (
    <>
    <Dialog open={open} onClose={onClose} className="relative z-[70]">
      <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          transition
          className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:translate-y-4 data-closed:opacity-0 sm:rounded-3xl dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="flex items-stretch justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-700">
            <div className="min-w-0 flex-1 pe-2">
              <h2 className="text-lg font-semibold leading-snug text-neutral-900 sm:text-xl dark:text-white">
                {room.name}
              </h2>
              {hasMeta ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {guestLabel ? (
                    <RoomMetaItem
                      icon={<Users className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden />}
                      label={guestLabel}
                    />
                  ) : null}
                  {guestLabel && bedLabel ? <RoomMetaDivider /> : null}
                  {bedLabel ? (
                    <RoomMetaItem
                      icon={<BedDouble className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden />}
                      label={bedLabel}
                    />
                  ) : null}
                  {(guestLabel || bedLabel) && sizeLabel ? <RoomMetaDivider /> : null}
                  {sizeLabel ? (
                    <RoomMetaItem
                      icon={<Ruler className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden />}
                      label={sizeLabel}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
            <div
              className={clsx(
                'flex shrink-0 flex-col items-end',
                typeof room.roomScore === 'number' && room.roomScore > 0
                  ? 'justify-between gap-3'
                  : '',
              )}
            >
              <CloseButton as={ButtonClose} className="shrink-0">
                <span className="sr-only">{rs.close ?? 'Kapat'}</span>
              </CloseButton>
              {typeof room.roomScore === 'number' && room.roomScore > 0 ? (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-primary-800 ring-1 ring-primary-100 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-900/50">
                  <ThumbsUp className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  {interpolate(rs.roomScoreLabel ?? 'Tesisin oda puanı {score}', {
                    score: room.roomScore.toFixed(1),
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
            <div className="shrink-0 p-4 sm:p-5 lg:w-[58%] lg:border-e lg:border-neutral-200 dark:lg:border-neutral-700">
              <ModalImageGallery images={images} alt={room.name} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-5">
              {room.description?.trim() ? (
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {room.description.trim()}
                </p>
              ) : null}

              {amenities.length > 0 ? (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">
                    {rs.roomFeaturesTitle ?? 'Oda özellikleri'}
                  </h3>
                  <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {visibleAmenities.map((key) => {
                      const label = amenityLabels[key] ?? key.replace(/_/g, ' ')
                      return (
                        <RoomAmenityListItem
                          key={key}
                          amenityKey={key}
                          label={label}
                          isPaid={paidKeys.has(key)}
                        />
                      )
                    })}
                  </ul>
                  {hiddenAmenities.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExtraAmenitiesOpen(true)}
                      className="mt-3 inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                    >
                      {rs.showMoreFeatures ?? 'Diğer özellikleri göster'}
                    </button>
                  ) : null}
                  {paidKeys.size > 0 ? (
                    <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                      {rs.paidAmenityNote ?? '* ile işaretli özellikler ücretlidir'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {onSelectDates ? (
                <div className="mt-auto border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDates()
                      onClose()
                    }}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-primary-600/20 transition hover:bg-primary-700 hover:shadow-md"
                  >
                    {rs.selectDates ?? 'Tarih Seç'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>

    <RoomExtraAmenitiesDialog
      open={extraAmenitiesOpen}
      onClose={() => setExtraAmenitiesOpen(false)}
      title={rs.moreFeaturesModalTitle ?? 'Diğer oda özellikleri'}
      amenities={hiddenAmenities}
      amenityLabels={amenityLabels}
      paidKeys={paidKeys}
      paidNote={rs.paidAmenityNote ?? '* ile işaretli özellikler ücretlidir'}
      closeLabel={rs.close ?? 'Kapat'}
    />
    </>
  )
}
