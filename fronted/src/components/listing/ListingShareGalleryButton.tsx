'use client'

import { Button, ButtonCircle } from '@/shared/Button'
import ButtonClose from '@/shared/ButtonClose'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { CheckmarkCircle01Icon, Share03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { useCallback, useMemo, useState } from 'react'

const MAX_SELECT = 10

function toAbsoluteUrl(u: string): string {
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (typeof window === 'undefined') return u
  const path = u.startsWith('/') ? u : `/${u}`
  return `${window.location.origin}${path}`
}

async function urlsToImageFiles(urls: string[]): Promise<File[]> {
  const files: File[] = []
  for (let i = 0; i < urls.length; i++) {
    const url = toAbsoluteUrl(urls[i])
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
      if (!res.ok) continue
      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) continue
      const ext = blob.type.includes('png') ? 'png' : 'jpeg'
      files.push(new File([blob], `listing-${i + 1}.${ext}`, { type: blob.type || 'image/jpeg' }))
    } catch {
      /* CORS veya ağ — atla */
    }
  }
  return files
}

async function shareWithOptionalFiles(shareData: ShareData, files: File[]): Promise<void> {
  if (!navigator.share) {
    await navigator.clipboard.writeText(shareData.url ?? '')
    return
  }
  if (files.length === 0) {
    await navigator.share(shareData)
    return
  }
  let slice = [...files]
  while (slice.length > 0) {
    const can = navigator.canShare?.({ files: slice })
    if (can === false) {
      slice = slice.slice(0, -1)
      continue
    }
    try {
      await navigator.share({ ...shareData, files: slice })
      return
    } catch {
      slice = slice.slice(0, -1)
    }
  }
  await navigator.share(shareData)
}

export function ListingShareGalleryButton({
  galleryUrls,
  listingTitle,
  locale,
}: {
  galleryUrls: string[]
  listingTitle: string
  locale: string
}) {
  const m = getMessages(locale)
  const sg = m.listing.shareGallery

  const unique = useMemo(() => [...new Set(galleryUrls.filter(Boolean))], [galleryUrls])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const toggle = (index: number) => {
    setNotice(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
        return next
      }
      if (next.size >= MAX_SELECT) return prev
      next.add(index)
      return next
    })
  }

  const pickFirstTen = () => {
    setNotice(null)
    setSelected(new Set(unique.slice(0, MAX_SELECT).map((_, i) => i)))
  }

  const clearSelection = () => {
    setNotice(null)
    setSelected(new Set())
  }

  const onShare = useCallback(async () => {
    if (selected.size === 0) {
      setNotice(sg.noneSelected)
      return
    }
    const urls = [...selected].sort((a, b) => a - b).map((i) => unique[i])
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    setPending(true)
    setNotice(null)
    try {
      const files = await urlsToImageFiles(urls)
      const shareData: ShareData = {
        title: listingTitle,
        text: `${listingTitle}\n${shareUrl}`,
        url: shareUrl,
      }
      if (!navigator.share) {
        await navigator.clipboard.writeText(shareUrl)
        setNotice(sg.copied)
        return
      }
      await shareWithOptionalFiles(shareData, files)
      setOpen(false)
      setSelected(new Set())
    } catch (e) {
      const err = e as Error
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(shareUrl)
        setNotice(sg.copyFallback)
      } catch {
        setNotice(sg.shareFailed)
      }
    } finally {
      setPending(false)
    }
  }, [listingTitle, selected, sg, unique])

  if (unique.length === 0) return null

  return (
    <>
      <ButtonCircle outline type="button" onClick={() => setOpen(true)} title={sg.openTitle} aria-label={sg.openTitle}>
        <HugeiconsIcon icon={Share03Icon} size={20} strokeWidth={1.5} />
      </ButtonCircle>

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
              <div>
                <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {sg.title}
                </DialogTitle>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{sg.hint}</p>
                <p className="mt-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                  {selected.size} / {MAX_SELECT} {sg.selected}
                </p>
              </div>
              <CloseButton as={ButtonClose} onClick={() => setOpen(false)}>
                <span className="sr-only">{sg.cancel}</span>
              </CloseButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {unique.map((src, index) => {
                  const isOn = selected.has(index)
                  return (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      onClick={() => toggle(index)}
                      className={clsx(
                        'relative aspect-square overflow-hidden rounded-xl border-2 transition-colors',
                        isOn
                          ? 'border-primary-500 ring-2 ring-primary-400/40'
                          : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-600',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="size-full object-cover" />
                      {isOn && (
                        <span className="absolute end-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-primary-500 text-white shadow-md">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5" strokeWidth={2} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {notice && (
              <p className="px-5 text-sm text-amber-700 dark:text-amber-300" role="status">
                {notice}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-700">
              <div className="flex flex-wrap gap-2">
                <Button color="light" type="button" className="!px-3 !py-2 text-sm" onClick={pickFirstTen}>
                  {sg.pickFirst}
                </Button>
                <Button color="light" type="button" className="!px-3 !py-2 text-sm" onClick={clearSelection}>
                  {sg.clear}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button color="light" type="button" onClick={() => setOpen(false)}>
                  {sg.cancel}
                </Button>
                <Button color="primary" type="button" disabled={pending} onClick={() => void onShare()}>
                  {pending ? '…' : sg.share}
                </Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
