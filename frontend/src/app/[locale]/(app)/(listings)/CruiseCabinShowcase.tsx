'use client'

import {
  cabinDisplayPrice,
  parseCabinFeatureLines,
  type CruiseCabinOption,
} from '@/lib/cruise-meta'
import { useFormatMoneyInPreferredCurrency } from '@/contexts/preferred-currency-context'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Ship, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import { useCruiseCabinSelection } from './CruiseCabinContext'
import CruiseCabinDetailModal from './CruiseCabinDetailModal'

const CABINS_PAGE_SIZE = 5
const ICON_STROKE = 1.5
const PREVIEW_ICON_WRAP =
  'flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'

function CabinPreviewRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
      <span className={PREVIEW_ICON_WRAP}>{icon}</span>
      <span className="min-w-0 flex-1 leading-snug py-1.5">{children}</span>
    </li>
  )
}

function CabinImageCarousel({
  images,
  alt,
  onNavigate,
}: {
  images: string[]
  alt: string
  onNavigate?: (e: React.MouseEvent) => void
}) {
  const [index, setIndex] = useState(0)
  const src = images[index] ?? images[0]
  if (!src) {
    return (
      <div className="flex h-full min-h-[168px] w-full items-center justify-center bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800 md:min-h-[200px]">
        <Ship className="size-8 opacity-40" strokeWidth={1.25} aria-hidden />
      </div>
    )
  }
  return (
    <div className="group/image relative h-full min-h-[168px] w-full overflow-hidden bg-neutral-100 md:min-h-[200px] dark:bg-neutral-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-500 group-hover/image:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60" />
      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Önceki fotoğraf"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate?.(e)
              setIndex((i) => (i - 1 + images.length) % images.length)
            }}
            className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md ring-1 ring-black/5 transition hover:bg-white dark:bg-neutral-900/95 dark:text-neutral-100"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Sonraki fotoğraf"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate?.(e)
              setIndex((i) => (i + 1) % images.length)
            }}
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md ring-1 ring-black/5 transition hover:bg-white dark:bg-neutral-900/95 dark:text-neutral-100"
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </button>
        </>
      ) : null}
    </div>
  )
}

function CruiseCabinListRow({
  cabin,
  selected,
  cs,
  cd,
  onOpenDetail,
  onSelectCabin,
}: {
  cabin: CruiseCabinOption
  selected: boolean
  cs: Record<string, string>
  cd: Record<string, string>
  onOpenDetail: () => void
  onSelectCabin: () => void
}) {
  const format = useFormatMoneyInPreferredCurrency
  const images = cabin.image_urls?.filter(Boolean) ?? []
  const features = parseCabinFeatureLines(cabin.description)
  const previewFeatures = features.slice(0, 3)
  const fromPrice = cabinDisplayPrice(cabin)
  const priceLabel = fromPrice?.amount ? format(fromPrice.amount, fromPrice.currency) : '—'

  const openDetail = () => onOpenDetail()

  return (
    <article
      className={clsx(
        'overflow-hidden rounded-3xl bg-white shadow-sm ring-1 transition hover:shadow-md dark:bg-neutral-900/50',
        selected
          ? 'ring-primary-500/60 dark:ring-primary-400/50'
          : 'ring-neutral-200/80 hover:ring-neutral-300/80 dark:ring-neutral-700',
      )}
    >
      <div className="flex flex-col md:flex-row">
        <div
          role="button"
          tabIndex={0}
          onClick={openDetail}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openDetail()
            }
          }}
          className="relative w-full shrink-0 cursor-pointer overflow-hidden md:w-[260px] lg:w-[280px]"
        >
          <CabinImageCarousel images={images} alt={cabin.name} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            role="button"
            tabIndex={0}
            onClick={openDetail}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openDetail()
              }
            }}
            className="group cursor-pointer px-5 pt-5 pb-2"
          >
            <h3 className="text-lg font-semibold tracking-tight text-neutral-900 transition group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
              {cabin.name}
            </h3>
            {cabin.campaign ? (
              <p className="mt-1 text-xs font-medium text-primary-700 dark:text-primary-300">
                {cabin.campaign}
              </p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col md:flex-row">
            <div
              role="button"
              tabIndex={0}
              onClick={openDetail}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openDetail()
                }
              }}
              className="group flex min-w-0 flex-1 cursor-pointer flex-col gap-4 px-5 pb-5 pt-3 text-start md:border-s md:border-neutral-200/80 dark:md:border-neutral-700"
            >
              {previewFeatures.length > 0 ? (
                <ul className="space-y-2">
                  {previewFeatures.map((feature) => (
                    <CabinPreviewRow
                      key={feature}
                      icon={<Sparkles className="size-4" strokeWidth={ICON_STROKE} aria-hidden />}
                    >
                      {feature}
                    </CabinPreviewRow>
                  ))}
                </ul>
              ) : null}

              <span className="mt-auto inline-flex items-center gap-1 self-start text-xs font-medium text-neutral-500 transition group-hover:text-primary-700 dark:text-neutral-400 dark:group-hover:text-primary-300">
                {cs.clickForDetails ?? 'Detaylar için tıklayın'}
                <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            </div>

            <div className="relative flex shrink-0 flex-col items-stretch justify-center gap-4 border-t border-neutral-200/80 px-5 py-6 md:w-[210px] md:border-t-0 lg:w-[230px] dark:border-neutral-700">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-8 start-0 hidden w-px bg-neutral-200/80 md:block dark:bg-neutral-700"
              />
              <div className="text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {cd.priceFrom ?? 'Başlayan fiyat'}
                </p>
                <p className="text-2xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-white">
                  {priceLabel}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {cs.pricePerPersonHint ?? cd.priceDouble}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectCabin()
                }}
                className={clsx(
                  'inline-flex min-w-0 flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 transition hover:shadow-md',
                  selected
                    ? 'bg-primary-600 text-white ring-primary-600/20 hover:bg-primary-700'
                    : 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
                )}
              >
                {selected ? (cs.selectedCabin ?? cd.selectedCabin) : (cs.selectCabin ?? 'Kabin Seç')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function CruiseCabinShowcase({ locale = 'tr' }: { locale?: string }) {
  const ctx = useCruiseCabinSelection()
  const messages = getMessages(locale)
  const cd = messages.listing.cruiseDetail as Record<string, string>
  const cs = (messages.listing.cabinShowcase ?? {}) as Record<string, string>

  const [detailCabin, setDetailCabin] = useState<CruiseCabinOption | null>(null)
  const [visibleCount, setVisibleCount] = useState(CABINS_PAGE_SIZE)

  const cabins = ctx?.cabins ?? []

  useEffect(() => {
    setVisibleCount(CABINS_PAGE_SIZE)
  }, [cabins])

  if (cabins.length === 0) return null

  const visibleCabins = cabins.slice(0, visibleCount)
  const hasMore = visibleCount < cabins.length

  return (
    <div id="cruise-cabins" className="listingSection__wrap scroll-mt-28">
      <div>
        <SectionHeading>{cs.title ?? cd.cabinTypesTitle}</SectionHeading>
        <SectionSubheading>{cs.subtitle ?? cd.cabinTypesSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="flex flex-col gap-5">
        {visibleCabins.map((cabin) => (
          <CruiseCabinListRow
            key={cabin.id}
            cabin={cabin}
            selected={ctx?.selectedCabin?.id === cabin.id}
            cs={cs}
            cd={cd}
            onOpenDetail={() => setDetailCabin(cabin)}
            onSelectCabin={() => ctx?.selectCabinAndScroll(cabin.id)}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => Math.min(n + CABINS_PAGE_SIZE, cabins.length))}
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {cs.showMoreCabins ?? 'Devamını göster'}
          </button>
        </div>
      ) : null}

      <CruiseCabinDetailModal
        open={detailCabin != null}
        onClose={() => setDetailCabin(null)}
        locale={locale}
        cabin={detailCabin}
        onSelectCabin={
          detailCabin && ctx
            ? () => ctx.selectCabinAndScroll(detailCabin.id)
            : undefined
        }
      />
    </div>
  )
}
