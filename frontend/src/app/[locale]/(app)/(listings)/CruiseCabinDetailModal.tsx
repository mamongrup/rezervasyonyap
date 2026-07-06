'use client'

import {
  cabinDisplayPrice,
  parseCabinFeatureLines,
  type CruiseCabinOption,
  type CruiseMoney,
} from '@/lib/cruise-meta'
import { useFormatMoneyInPreferredCurrency } from '@/contexts/preferred-currency-context'
import ButtonClose from '@/shared/ButtonClose'
import { getMessages } from '@/utils/getT'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

function formatMoney(
  price: CruiseMoney | null | undefined,
  format: (amount: number | null | undefined, currency?: string) => string,
): string {
  if (!price?.amount) return '—'
  return format(price.amount, price.currency)
}

function ModalImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    setIndex(0)
  }, [images])
  const src = images[index] ?? images[0]

  useEffect(() => {
    for (const url of images) {
      if (!url || url === src) continue
      const img = new Image()
      img.src = url
    }
  }, [images, src])

  if (!src) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-800">
        —
      </div>
    )
  }
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
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
        </>
      ) : null}
    </div>
  )
}

export default function CruiseCabinDetailModal({
  open,
  onClose,
  locale,
  cabin,
  onSelectCabin,
}: {
  open: boolean
  onClose: () => void
  locale: string
  cabin: CruiseCabinOption | null
  onSelectCabin?: () => void
}) {
  const cd = getMessages(locale).listing.cruiseDetail
  const cs = (getMessages(locale).listing.cabinShowcase ?? {}) as Record<string, string>
  const format = useFormatMoneyInPreferredCurrency

  if (!cabin) return null

  const images = cabin.image_urls?.filter(Boolean) ?? []
  const features = parseCabinFeatureLines(cabin.description)
  const fromPrice = cabinDisplayPrice(cabin)

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[70]">
      <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          transition
          className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:translate-y-4 data-closed:opacity-0 sm:rounded-3xl dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-700">
            <div className="min-w-0 flex-1 pe-2">
              <h2 className="text-lg font-semibold leading-snug text-neutral-900 sm:text-xl dark:text-white">
                {cabin.name}
              </h2>
              {cabin.campaign ? (
                <p className="mt-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  {cabin.campaign}
                </p>
              ) : null}
            </div>
            <CloseButton as={ButtonClose} className="shrink-0">
              <span className="sr-only">{cs.close ?? 'Kapat'}</span>
            </CloseButton>
          </div>

          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            {images.length > 0 ? (
              <ModalImageGallery images={images} alt={cabin.name} />
            ) : null}

            {features.length > 0 ? (
              <div className={clsx(images.length > 0 && 'mt-6')}>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {cs.cabinFeaturesTitle ?? cd.shipSpecsTitle}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-primary-500">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {cd.cabinTypesTitle}
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                {fromPrice?.amount ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-600 dark:text-neutral-400">{cd.priceFrom}</dt>
                    <dd className="font-semibold text-neutral-900 dark:text-white">
                      {formatMoney(fromPrice, format)}
                    </dd>
                  </div>
                ) : null}
                {cabin.prices?.double_per_person?.amount ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-600 dark:text-neutral-400">{cd.priceDouble}</dt>
                    <dd className="font-medium">{formatMoney(cabin.prices.double_per_person, format)}</dd>
                  </div>
                ) : null}
                {cabin.prices?.single?.amount ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-600 dark:text-neutral-400">{cd.priceSingle}</dt>
                    <dd className="font-medium">{formatMoney(cabin.prices.single, format)}</dd>
                  </div>
                ) : null}
                {cabin.prices?.extra_bed?.amount ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-600 dark:text-neutral-400">{cd.priceExtraBed}</dt>
                    <dd className="font-medium">{formatMoney(cabin.prices.extra_bed, format)}</dd>
                  </div>
                ) : null}
                {(cabin.prices?.children ?? []).map((child) => (
                  <div key={child.label} className="flex justify-between gap-3">
                    <dt className="text-neutral-600 dark:text-neutral-400">
                      {cd.priceChild} ({child.label})
                    </dt>
                    <dd className="font-medium">{formatMoney(child, format)}</dd>
                  </div>
                ))}
              </dl>
              {cabin.footnote ? (
                <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-medium">{cd.cabinFootnote}: </span>
                  {cabin.footnote}
                </p>
              ) : null}
            </div>
          </div>

          {onSelectCabin ? (
            <div className="border-t border-neutral-200 px-5 py-4 sm:px-6 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => {
                  onSelectCabin()
                  onClose()
                }}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                {cs.selectCabin ?? cd.selectedCabin}
              </button>
            </div>
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
