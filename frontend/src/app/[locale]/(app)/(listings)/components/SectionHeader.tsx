import LikeSaveBtns from '@/components/LikeSaveBtns'
import StartRating from '@/components/StartRating'
import { Divider } from '@/shared/divider'
import { Location06Icon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React from 'react'

interface Props {
  title: string
  listingCategory: string
  reviewStart: number
  reviewCount: number
  address: string
  /** Vitrin favori — `engagement/favorites` */
  listingId?: string
  /** Panel `external_listing_ref` */
  referenceCode?: string | null
  /** Örn. «Referans kodu:» — `listing.detailHeader.referenceCode` */
  referenceCodeLabel?: string
  /** Otel adının altında gösterilen turizm işletme belgesi satırı */
  licenseLine?: string | null
  /** Otel sınıfı (yıldız sayısı) — görsel yıldızlar için */
  hotelStarRating?: number | null
  /** Otel sınıfı metni — örn. «4 yıldız» */
  hotelStarLine?: string | null
  /** Konaklama / pansiyon tipleri — virgülle birleştirilmiş metin */
  hotelBoardTypesLine?: string | null
  children?: React.ReactNode
  /** Galeriden en fazla 10 görsel seçerek paylaşım */
  shareGallery?: { galleryUrls: string[]; listingTitle: string; locale: string }
  /** Sosyal (Facebook / X / e-posta) paylaşım metni — verilmezse `title` kullanılır */
  shareTitle?: string
  /** Tatil evi tema etiketleri (yönetim panelindeki tema kodlarından çözümlenmiş metinler) */
  themePills?: string[]
  /** Bölge, ilçe, il — konum ikonunun yanında gösterilir (ör. Galata, Beyoğlu, İstanbul) */
  regionName?: string | null
  /** Yıldız puanı satırını gizle (tur vb.) */
  showReviews?: boolean
  /** `true`: alt çizgi/padding yok; üst kapsayıcı `gap-y-10` ile boşluk verir */
  stackedSections?: boolean
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
  listingId,
  referenceCode,
  referenceCodeLabel,
  licenseLine,
  hotelStarRating,
  hotelStarLine,
  hotelBoardTypesLine,
  showReviews = true,
  stackedSections = false,
}: Props) => {
  const starCount =
    typeof hotelStarRating === 'number' && hotelStarRating > 0
      ? Math.min(5, Math.floor(hotelStarRating))
      : 0
  const boardTypes = hotelBoardTypesLine?.trim() ?? ''
  const showHotelMeta = starCount > 0 || boardTypes.length > 0
  const region = regionName?.trim() ?? ''
  const addr = address?.trim() ?? ''
  /** Pin satırı: tatil evinde şehir/bölge; aksi halde adres (sokak üst başlıkta tekrarlanmaz) */
  const pinPrimary = region || addr
  const categorySr = listingCategory?.trim() ?? ''

  return (
    <div
      className={
        stackedSections ? 'relative listingSection__wrap--stacked' : 'relative listingSection__wrap'
      }
    >
      <div className="flex flex-col items-stretch gap-y-4">
        {categorySr ? <span className="sr-only">{categorySr}</span> : null}

        <div className="flex min-w-0 items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
          <LikeSaveBtns
            className="shrink-0 pt-1 sm:pt-0.5"
            galleryShare={shareGallery}
            shareTitle={shareTitle ?? title}
            listingId={listingId}
          />
        </div>

        {showHotelMeta ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            {starCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex items-center" aria-hidden>
                  {Array.from({ length: starCount }, (_, index) => (
                    <HugeiconsIcon
                      key={index}
                      icon={StarIcon}
                      className="size-4 text-amber-500"
                      strokeWidth={1.75}
                    />
                  ))}
                </span>
                {hotelStarLine?.trim() ? <span>{hotelStarLine.trim()}</span> : null}
              </span>
            ) : null}
            {starCount > 0 && boardTypes ? (
              <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
                ·
              </span>
            ) : null}
            {boardTypes ? <span>{boardTypes}</span> : null}
          </div>
        ) : null}

        {licenseLine?.trim() ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{licenseLine.trim()}</p>
        ) : null}

        {referenceCode?.trim() ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {referenceCodeLabel ? (
              <>
                <span>{referenceCodeLabel} </span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{referenceCode.trim()}</span>
              </>
            ) : (
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{referenceCode.trim()}</span>
            )}
          </p>
        ) : null}

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

        <Divider className="w-14" />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {showReviews ? <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} /> : null}
          {pinPrimary ? (
            <>
              {showReviews ? <span className="text-neutral-400 dark:text-neutral-500">·</span> : null}
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

        {children ? <Divider className="w-14" /> : null}

        {children ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SectionHeader
