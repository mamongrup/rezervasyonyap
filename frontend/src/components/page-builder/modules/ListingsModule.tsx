'use client'

import { useState, useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import type { TListingBase } from '@/types/listing-types'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  GridIcon,
  Megaphone01Icon,
  SparklesIcon,
  Tag01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export type ListingFilterMode = 'all' | 'new' | 'discounted' | 'campaign'
export type ListingLayoutMode = 'grid' | 'slider'

interface Tab {
  id: ListingFilterMode
  label: string
  icon: ReactNode
  filter: (listing: TListingBase) => boolean
}

const tabIconClass = 'size-4 shrink-0'

const TABS: Tab[] = [
  {
    id: 'all',
    label: 'Tümü',
    icon: <HugeiconsIcon icon={GridIcon} className={tabIconClass} strokeWidth={1.75} />,
    filter: () => true,
  },
  {
    id: 'new',
    label: 'Yeni İlanlar',
    icon: <HugeiconsIcon icon={SparklesIcon} className={tabIconClass} strokeWidth={1.75} />,
    filter: (l) => {
      if (l.isNew) return true
      if (l.createdAt) {
        const days = (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        return days <= 30
      }
      return false
    },
  },
  {
    id: 'discounted',
    label: 'İndirimli',
    icon: <HugeiconsIcon icon={Tag01Icon} className={tabIconClass} strokeWidth={1.75} />,
    filter: (l) => Boolean(l.saleOff) || (l.discountPercent ?? 0) > 0,
  },
  {
    id: 'campaign',
    label: 'Kampanyalı',
    icon: <HugeiconsIcon icon={Megaphone01Icon} className={tabIconClass} strokeWidth={1.75} />,
    filter: (l) => Boolean(l.isCampaign),
  },
]

export interface ListingsModuleConfig {
  title?: string
  subheading?: string
  filterMode?: ListingFilterMode
  showTabs?: boolean
  layout?: ListingLayoutMode
  count?: number
  viewAllHref?: string
  viewAllLabel?: string
}

interface ListingsModuleProps {
  config: ListingsModuleConfig
  allListings: TListingBase[]
  /** Sunucuda önceden üretilmiş kartlar (listing id → node); fonksiyon client’a geçirilemez */
  cardsByListingId: Record<string, ReactNode>
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-16 dark:border-neutral-700">
      <span className="text-4xl">🔍</span>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Şu anda <strong>{label}</strong> kategorisinde ilan bulunmuyor.
      </p>
    </div>
  )
}

function ListingsSliderRow({
  filtered,
  cardsByListingId,
  emptyLabel,
}: {
  filtered: TListingBase[]
  cardsByListingId: Record<string, ReactNode>
  emptyLabel: string
}) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })

  if (filtered.length === 0) {
    return <EmptyState label={emptyLabel} />
  }

  return (
    <div className="relative">
      <div
        ref={sliderRef}
        className="hidden-scrollbar relative flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1"
      >
        {filtered.map((listing) => (
          <div
            key={listing.id}
            className="mySnapItem w-64 shrink-0 snap-start sm:w-72 lg:w-80"
          >
            {cardsByListingId[listing.id] ?? null}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 start-0 end-0 flex items-center justify-between">
        <div className="pointer-events-auto -ms-1 sm:-ms-3 xl:-ms-4">
          <ButtonCircle color="white" onClick={scrollToPrevSlide} className="shadow-md xl:size-11" disabled={isAtStart}>
            <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
          </ButtonCircle>
        </div>
        <div className="pointer-events-auto -me-1 sm:-me-3 xl:-me-4">
          <ButtonCircle color="white" onClick={scrollToNextSlide} className="shadow-md xl:size-11" disabled={isAtEnd}>
            <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
          </ButtonCircle>
        </div>
      </div>
    </div>
  )
}

export default function ListingsModule({ config, allListings, cardsByListingId }: ListingsModuleProps) {
  const {
    title,
    subheading,
    filterMode = 'all',
    showTabs = false,
    layout = 'grid',
    count = 8,
    viewAllHref,
    viewAllLabel = 'Tümünü Gör',
  } = config

  // If showTabs is true → user picks tab; otherwise locked to filterMode
  const [activeTab, setActiveTab] = useState<ListingFilterMode>(filterMode)

  const currentTab = TABS.find((t) => t.id === (showTabs ? activeTab : filterMode)) ?? TABS[0]

  const filtered = useMemo(
    () => allListings.filter(currentTab.filter).slice(0, count),
    [allListings, currentTab, count],
  )

  // Build badge label for active filter mode
  const badgeLabel =
    filterMode !== 'all' && !showTabs
      ? TABS.find((t) => t.id === filterMode)?.label
      : null

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {badgeLabel && (
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              {currentTab.icon}
              {badgeLabel}
            </span>
          )}
          {title && (
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white md:text-3xl">{title}</h2>
          )}
          {subheading && (
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{subheading}</p>
          )}
        </div>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {viewAllLabel}
            <HugeiconsIcon icon={ArrowRight02Icon} className="size-4 shrink-0" strokeWidth={1.75} />
          </Link>
        )}
      </div>

      {/* Tabs (only shown when showTabs === true) */}
      {showTabs && (
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const count = allListings.filter(tab.filter).length
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-400 hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-primary-500'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Grid / Slider */}
      {layout === 'grid' ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.length > 0 ? (
            filtered.map((listing) => (
              <div key={listing.id}>{cardsByListingId[listing.id] ?? null}</div>
            ))
          ) : (
            <EmptyState label={currentTab.label} />
          )}
        </div>
      ) : (
        <ListingsSliderRow
          filtered={filtered}
          cardsByListingId={cardsByListingId}
          emptyLabel={currentTab.label}
        />
      )}
    </section>
  )
}
