'use client'

import React, { useEffect, useState } from 'react'
import { ArrowUpRight01Icon, Message01Icon, SecurityCheckIcon, ShieldCheckIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { WhatsAppListingCTA } from '@/components/WhatsAppListingCTA'

interface Props {
  priceLabel?: string
  priceUnit?: string
  targetElementId?: string
  ctaText?: string
  listingTitle: string
  listingUrl?: string
  whatsAppPhone?: string
}

export default function MobileStickyReservationBar({
  priceLabel,
  priceUnit = '/ gece',
  targetElementId = 'listing-reservation',
  ctaText = 'Oda & Tarih Seç',
  listingTitle,
  listingUrl,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Hero/fotoğraf bölümünü geçtikten sonra (450px) göster
      const shouldShow = window.scrollY > 420
      setVisible(shouldShow)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleScrollToBooking = () => {
    const target =
      document.getElementById(targetElementId) ||
      document.getElementById('listing-reservation') ||
      document.getElementById('hotel-rooms')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!visible) return null

  return (
    <aside
      aria-label="Mobil Hızlı Rezervasyon"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200/90 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-900/95 lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        {/* Sol Taraf: Fiyat & Güven Rozeti */}
        <div className="flex min-w-0 flex-col">
          {priceLabel ? (
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                {priceLabel}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {priceUnit}
              </span>
            </div>
          ) : (
            <div className="text-xs font-semibold text-primary-600 dark:text-primary-400">
              En İyi Fiyat Garantisi
            </div>
          )}

          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <HugeiconsIcon icon={ShieldCheckIcon} className="size-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">TÜRSAB Onaylı & Güvenli</span>
          </div>
        </div>

        {/* Sağ Taraf: WhatsApp + Rezervasyon Butonu */}
        <div className="flex shrink-0 items-center gap-2">
          {listingTitle && (
            <WhatsAppListingCTA
              listingTitle={listingTitle}
              listingUrl={listingUrl}
            />
          )}

          <button
            type="button"
            onClick={handleScrollToBooking}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 active:scale-[0.98] dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            <span>{ctaText}</span>
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </aside>
  )
}
