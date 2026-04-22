import LikeSaveBtns from '@/components/LikeSaveBtns'
import StartRating from '@/components/StartRating'
import { Badge } from '@/shared/Badge'
import { Divider } from '@/shared/divider'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React from 'react'

interface Props {
  title: string
  listingCategory: string
  reviewStart: number
  reviewCount: number
  address: string
  children?: React.ReactNode
  /** Galeriden en fazla 10 görsel seçerek paylaşım */
  shareGallery?: { galleryUrls: string[]; listingTitle: string; locale: string }
  /** Sosyal (Facebook / X / e-posta) paylaşım metni — verilmezse `title` kullanılır */
  shareTitle?: string
  /** Tatil evi tema etiketleri (yönetim panelindeki tema kodlarından çözümlenmiş metinler) */
  themePills?: string[]
  /** Şehir / bölge (ör. Kapadokya) — konum ikonunun yanında gösterilir */
  regionName?: string | null
}

const SectionHeader = ({
  address,
  listingCategory,
  reviewCount,
  reviewStart,
  title,
  children,
  shareGallery,
  shareTitle,
  themePills,
  regionName,
}: Props) => {
  const region = regionName?.trim() ?? ''
  const addr = address?.trim() ?? ''
  /** Pin satırı: tatil evinde şehir/bölge; aksi halde adres (sokak üst başlıkta tekrarlanmaz) */
  const pinPrimary = region || addr

  return (
    <div className="relative listingSection__wrap">
      <div className="flex flex-col items-stretch gap-y-6">
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {themePills && themePills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {themePills.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <Badge>{listingCategory}</Badge>
            )}
          </div>
          <LikeSaveBtns className="shrink-0 pt-0.5" galleryShare={shareGallery} shareTitle={shareTitle ?? title} />
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
          {pinPrimary ? (
            <>
              <span>·</span>
              <div className="flex items-center">
                <HugeiconsIcon
                  icon={Location06Icon}
                  size={20}
                  color="currentColor"
                  className="mb-0.5"
                  strokeWidth={1.5}
                />
                <span className="ms-1.5 text-neutral-700 dark:text-neutral-300">{pinPrimary}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <Divider className="w-14!" />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-700 sm:gap-x-8 xl:justify-start xl:gap-x-12 dark:text-neutral-300">
        {children}
      </div>
    </div>
  )
}

export default SectionHeader
