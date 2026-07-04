'use client'

import ButtonSecondary from '@/shared/ButtonSecondary'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { stripHtml } from '@/lib/social-share/strip-html'
import { getMessages } from '@/utils/getT'
import { useState } from 'react'

/** Düz metin uzunluğu bu eşiği aşınca özet + "devamını göster" */
const PLAIN_PREVIEW_MAX = 520

/** Tur bilgi bölümleri (Ücretli / Rehberlik vb.) için daha geniş eşik */
export const HTML_PREVIEW_MAX_TOUR = 420

/** Kapalı önizlemede yaklaşık 8–9 satır; HTML paragraf boşlukları korunur. */
const COLLAPSED_MAX_HEIGHT_CLASS = 'max-h-[14rem]'

export default function ListingDescriptionExpandable({
  html,
  locale,
  previewMax,
}: {
  html: string
  locale: string
  /** Özel eşik. Verilmezse varsayılan 520 kullanılır. */
  previewMax?: number
}) {
  const messages = getMessages(locale)
  const safeHtml = sanitizeRichCmsHtml(html)
  const plain = stripHtml(safeHtml)
  const limit = previewMax ?? PLAIN_PREVIEW_MAX
  const needsClamp = plain.length > limit
  const [expanded, setExpanded] = useState(false)

  const showMore = messages.listing.detailPage.descriptionShowMore
  const showLess = messages.listing.detailPage.descriptionShowLess

  if (!safeHtml.trim()) return null

  // Site genelindeki eski gövde boyutu (prose-sm). SEO hiyerarşisi h2/h3 ile gelir.
  const prose =
    'prose prose-sm max-w-none text-neutral-700 dark:text-neutral-300 dark:prose-invert ' +
    'prose-p:my-3 prose-p:leading-relaxed prose-p:first:mt-0 prose-p:last:mb-0 ' +
    'prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:leading-relaxed ' +
    'prose-strong:font-semibold prose-strong:text-neutral-900 dark:prose-strong:text-neutral-100 ' +
    'prose-headings:font-semibold prose-headings:text-neutral-900 dark:prose-headings:text-neutral-100 ' +
    'prose-h2:mb-3 prose-h2:mt-0 prose-h2:text-xl prose-h2:leading-snug ' +
    'prose-h3:mb-2 prose-h3:mt-5 prose-h3:text-base prose-h3:leading-snug ' +
    'prose-h4:mb-2 prose-h4:mt-4 prose-h4:text-sm'

  if (!needsClamp) {
    return <div className={prose} dangerouslySetInnerHTML={{ __html: safeHtml }} />
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="relative">
        <div
          className={
            expanded
              ? prose
              : `${prose} ${COLLAPSED_MAX_HEIGHT_CLASS} overflow-hidden`
          }
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
        {!expanded ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-neutral-900"
          />
        ) : null}
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />
      <div className="flex justify-center sm:justify-start">
        <ButtonSecondary
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="rounded-full px-6"
          aria-expanded={expanded}
        >
          {expanded ? showLess : showMore}
        </ButtonSecondary>
      </div>
    </div>
  )
}
