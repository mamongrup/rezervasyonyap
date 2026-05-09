'use client'

import ButtonSecondary from '@/shared/ButtonSecondary'
import { stripHtml } from '@/lib/social-share/strip-html'
import { getMessages } from '@/utils/getT'
import { useState } from 'react'

/** Düz metin uzunluğu bu eşiği aşınca özet + “devamını göster” */
const PLAIN_PREVIEW_MAX = 520

function truncatePlainAtWord(plain: string, max: number): string {
  const t = plain.trim()
  if (t.length <= max) return t
  const slice = t.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  const minBreak = Math.floor(max * 0.65)
  const cut = lastSpace >= minBreak ? slice.slice(0, lastSpace) : slice
  return `${cut.trimEnd()}…`
}

export default function ListingDescriptionExpandable({
  html,
  locale,
}: {
  html: string
  locale: string
}) {
  const messages = getMessages(locale)
  const plain = stripHtml(html)
  const needsClamp = plain.length > PLAIN_PREVIEW_MAX
  const [expanded, setExpanded] = useState(false)

  const showMore = messages.listing.detailPage.descriptionShowMore
  const showLess = messages.listing.detailPage.descriptionShowLess

  if (!html.trim()) return null

  const prose =
    'prose prose-sm max-w-none leading-relaxed text-neutral-700 dark:text-neutral-300 dark:prose-invert'

  if (!needsClamp) {
    return <div className={prose} dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {expanded ? (
        <div className={prose} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {truncatePlainAtWord(plain, PLAIN_PREVIEW_MAX)}
        </p>
      )}
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
