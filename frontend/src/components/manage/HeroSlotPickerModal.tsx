'use client'

import clsx from 'clsx'
import type { ListingImage } from '@/lib/travel-api'

function srcForKey(key: string) {
  return key.startsWith('http') || key.startsWith('/') ? key : `/${key}`
}

export function HeroSlotPickerModal({
  open,
  title,
  images,
  selectedKey,
  onPick,
  onClose,
}: {
  open: boolean
  title: string
  images: ListingImage[]
  selectedKey?: string
  onPick: (storageKey: string) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-slot-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        className="relative z-[1] max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <h2 id="hero-slot-picker-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            ×
          </button>
        </div>
        <div className="max-h-[min(60vh,520px)] overflow-y-auto p-3">
          {images.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Önce galeriye görsel ekleyin.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((im) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => {
                    onPick(im.storage_key)
                    onClose()
                  }}
                  className={clsx(
                    'relative aspect-[4/3] overflow-hidden rounded-xl border-2 bg-neutral-100 transition hover:opacity-95 dark:bg-neutral-950',
                    selectedKey === im.storage_key
                      ? 'border-primary-600 ring-2 ring-primary-400/40'
                      : 'border-transparent hover:border-primary-400/60',
                  )}
                >
                  <img src={srcForKey(im.storage_key)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
