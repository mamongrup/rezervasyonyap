'use client'

import { getSitePublicConfig } from '@/lib/site-public-config'
import { useMemo } from 'react'

type Props = {
  /** İlan başlığı — mesajda kullanılır. */
  listingTitle: string
  /** İlan public URL'i — mesajda kullanılır (opsiyonel). */
  listingUrl?: string
  className?: string
}

/**
 * İlan detay sayfasındaki bağlamsal WhatsApp butonu.
 * Tıklanınca önceden doldurulmuş mesajla wa.me açar.
 */
export default function WhatsAppListingCTA({ listingTitle, listingUrl, className }: Props) {
  const wa = useMemo(() => getSitePublicConfig().whatsappE164, [])
  if (!wa) return null

  const lines = [
    `Merhaba, "${listingTitle}" ilanı hakkında bilgi almak istiyorum.`,
  ]
  if (listingUrl) lines.push(listingUrl)
  const text = encodeURIComponent(lines.join('\n'))
  const href = `https://wa.me/${wa}?text=${text}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#25D366] bg-[#25D366]/10 px-4 py-2.5 text-sm font-medium text-[#1a8d4a] transition hover:bg-[#25D366]/20 dark:border-[#25D366]/60 dark:text-[#5fe89a] ${className ?? ''}`}
    >
      <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487 1.213.523 2.16.836 2.898 1.07.708.225 1.348.193 1.86.117.567-.084 1.758-.718 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
      </svg>
      <span>WhatsApp ile sor</span>
    </a>
  )
}
