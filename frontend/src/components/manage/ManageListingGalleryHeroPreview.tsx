'use client'

import clsx from 'clsx'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { LayoutGrid } from 'lucide-react'
import Link from 'next/link'

function srcForKey(key: string) {
  return key.startsWith('http') || key.startsWith('/') ? key : `/${key}`
}

const DEFAULT_HINTS = ['Manzara', 'Havuz', 'Salon & mutfak', 'Yatak odası', 'Banyo'] as const

type Props = {
  /** En fazla 5; boş string = boş kutu */
  urls: string[]
  /** Varsayılan: dolu slot sayısı veya urls filtresi */
  totalCount?: number
  emptyHint?: string
  manageHref?: string | null
  manageLabel?: string
  className?: string
  /** Etiket yokken kutuya tıklayınca görsel seçimi */
  interactiveSlots?: boolean
  onSlotClick?: (slotIndex: number) => void
  slotHints?: readonly string[]
  footerHint?: ReactNode
}

function SlotCaption({
  label,
  interactive,
}: {
  label: string
  interactive?: boolean
}) {
  return (
    <div className="pointer-events-none absolute end-1 bottom-1 max-w-[calc(100%-8px)] rounded bg-black/55 px-1 py-0.5">
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-white">{label}</p>
      {interactive ? (
        <p className="truncate text-[8px] text-white/85">Tıklayınca seç</p>
      ) : null}
    </div>
  )
}

/**
 * Vitrin benzeri özet: sol büyük kapak + sağda 2×2 küçük kare (en fazla 5 görsel).
 */
export function ManageListingGalleryHeroPreview({
  urls,
  totalCount,
  emptyHint = 'Henüz görsel yok',
  manageHref,
  manageLabel = 'Galeriyi düzenle',
  className,
  interactiveSlots = false,
  onSlotClick,
  slotHints = DEFAULT_HINTS,
  footerHint,
}: Props) {
  const hints = [...slotHints]
  while (hints.length < 5) hints.push(`Alan ${hints.length + 1}`)
  const five = urls.slice(0, 5)
  while (five.length < 5) five.push('')
  const filledCount = five.filter((u) => u.trim()).length
  const total = totalCount ?? filledCount
  const main = five[0]?.trim()
  const quad = five.slice(1, 5)

  const wrapInteractive =
    (idx: number) => (e: MouseEvent | KeyboardEvent) => {
      if (!interactiveSlots || !onSlotClick) return
      e.preventDefault()
      onSlotClick(idx)
    }

  const tileInteractiveCls =
    interactiveSlots && onSlotClick
      ? 'cursor-pointer focus-visible:ring-1 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-100 dark:focus-visible:ring-offset-neutral-900'
      : ''

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700',
        className,
      )}
    >
      <div className="flex min-h-[200px] flex-col gap-px md:min-h-[260px] md:flex-row md:gap-px">
        <div
          role={interactiveSlots && onSlotClick ? 'button' : undefined}
          tabIndex={interactiveSlots && onSlotClick ? 0 : undefined}
          onClick={interactiveSlots && onSlotClick ? wrapInteractive(0) : undefined}
          onKeyDown={
            interactiveSlots && onSlotClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') wrapInteractive(0)(e)
                }
              : undefined
          }
          className={clsx(
            'relative aspect-[4/3] w-full bg-neutral-200 md:aspect-auto md:w-1/2 md:min-h-[260px] dark:bg-neutral-950',
            tileInteractiveCls,
          )}
        >
          {main ? (
            <img src={srcForKey(main)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-3 p-4 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyHint}</p>
              {manageHref && !interactiveSlots ? (
                <Link
                  href={manageHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-primary-700"
                >
                  <LayoutGrid className="h-4 w-4" />
                  {manageLabel}
                </Link>
              ) : null}
            </div>
          )}
          {interactiveSlots && onSlotClick ? (
            <SlotCaption label={hints[0] ?? 'Kapak'} interactive />
          ) : null}
          {main ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
              {manageHref ? (
                <Link
                  href={manageHref}
                  className="pointer-events-auto absolute bottom-3 start-3 z-[2] inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-neutral-900 shadow-md hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {manageLabel}
                  {total > 5 ? ` (${total})` : ''}
                </Link>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="grid w-full grid-cols-2 gap-px md:w-1/2 md:gap-px">
          {[0, 1, 2, 3].map((i) => {
            const u = quad[i]?.trim() ?? ''
            const hi = hints[i + 1]
            return (
              <div
                key={i}
                role={interactiveSlots && onSlotClick ? 'button' : undefined}
                tabIndex={interactiveSlots && onSlotClick ? 0 : undefined}
                onClick={interactiveSlots && onSlotClick ? wrapInteractive(i + 1) : undefined}
                onKeyDown={
                  interactiveSlots && onSlotClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') wrapInteractive(i + 1)(e)
                      }
                    : undefined
                }
                className={clsx(
                  'relative aspect-[4/3] bg-neutral-200 dark:bg-neutral-950',
                  tileInteractiveCls,
                )}
              >
                {u ? (
                  <img src={srcForKey(u)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800/80">
                    {interactiveSlots ? (
                      <span className="px-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                        Seç
                      </span>
                    ) : null}
                  </div>
                )}
                {interactiveSlots && onSlotClick && hi ? (
                  <SlotCaption label={hi} interactive />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      {footerHint ? (
        <div className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400">
          {footerHint}
        </div>
      ) : total > 5 ? (
        <p className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400">
          Önizlemede ilk 5 görsel gösteriliyor · toplam {total} görsel
        </p>
      ) : null}
      {main && manageHref ? (
        <p className="border-t border-neutral-200 px-3 py-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          Tam liste, sıralama ve silme için{' '}
          <Link href={manageHref} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            galeri sayfasına
          </Link>{' '}
          gidin.
        </p>
      ) : null}
    </div>
  )
}
