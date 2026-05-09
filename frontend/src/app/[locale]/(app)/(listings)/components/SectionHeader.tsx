import LikeSaveBtns from '@/components/LikeSaveBtns'
import StartRating from '@/components/StartRating'
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
  const categorySr = listingCategory?.trim() ?? ''

  return (
    <div className="relative listingSection__wrap">
      <div className="flex flex-col items-stretch gap-y-4">
        {categorySr ? <span className="sr-only">{categorySr}</span> : null}

        <div className="flex min-w-0 items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
          <LikeSaveBtns
            className="shrink-0 pt-1 sm:pt-0.5"
            galleryShare={shareGallery}
            shareTitle={shareTitle ?? title}
          />
        </div>

        {themePills && themePills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {themePills.map((label, idx) => (
              <span
                key={`${label}-${idx}`}
                className="inline-flex items-center rounded-full border border-primary-200/90 bg-primary-50 px-3 py-1 text-sm font-medium text-primary-950 shadow-sm dark:border-primary-800/70 dark:bg-primary-950/35 dark:text-primary-100"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
          {pinPrimary ? (
            <>
              <span className="text-neutral-400 dark:text-neutral-500">·</span>
              <div className="flex min-w-0 items-center">
                <HugeiconsIcon
                  icon={Location06Icon}
                  size={20}
                  color="currentColor"
                  className="mb-0.5 shrink-0"
                  strokeWidth={1.5}
                />
                <span className="ms-1.5 line-clamp-2 text-neutral-700 dark:text-neutral-300">
                  {pinPrimary}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <Divider className="w-14" />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          {children}
        </div>
      </div>
    </div>
  )
}

export default SectionHeader
