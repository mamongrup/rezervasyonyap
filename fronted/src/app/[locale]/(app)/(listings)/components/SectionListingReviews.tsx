'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { createReview, listReviews } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import ButtonCircle from '@/shared/ButtonCircle'
import { Divider } from '@/shared/divider'
import { ArrowRight02Icon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SectionHeading } from './SectionHeading'

interface ApiReview {
  id: string
  rating: number
  title?: string | null
  body?: string | null
  reviewer_display_name?: string | null
  created_at: string
  has_verified_purchase?: boolean
}

interface Props {
  listingId?: string
  reviewCount: number
  reviewStart: number
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          className="p-0.5" aria-label={`${n} yıldız`}
        >
          <HugeiconsIcon
            icon={StarIcon}
            className={clsx('size-6 transition-colors', (hovered || value) >= n ? 'text-yellow-400' : 'text-gray-200')}
            strokeWidth={1.75}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review, labels }: { review: ApiReview; labels: { guest: string; verified: string } }) {
  const date = new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const initial = (review.reviewer_display_name ?? labels.guest)[0].toUpperCase()
  return (
    <div className="flex gap-x-4 py-7">
      <div className="pt-0.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {initial}
        </div>
      </div>
      <div className="grow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{review.reviewer_display_name ?? labels.guest}</div>
            <span className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{date}</span>
          </div>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <HugeiconsIcon
                key={n}
                icon={StarIcon}
                className={clsx(review.rating >= n ? 'text-yellow-400' : 'text-gray-200', 'size-5 shrink-0')}
                strokeWidth={1.75}
              />
            ))}
          </div>
        </div>
        {review.title && <p className="mt-2 font-medium text-neutral-800 dark:text-neutral-200">{review.title}</p>}
        {review.body && <p className="mt-1.5 text-sm/relaxed text-neutral-700 dark:text-neutral-300">{review.body}</p>}
        {review.has_verified_purchase && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            {labels.verified}
          </span>
        )}
      </div>
    </div>
  )
}

export default function SectionListingReviews({ listingId, reviewCount: initCount, reviewStart }: Props) {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const T = getMessages(locale).reviews

  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [count, setCount] = useState(initCount)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [text, setText] = useState('')
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!listingId) return
    setLoadingReviews(true)
    listReviews({ entity_type: 'listing', entity_id: listingId })
      .then((res) => { setReviews(res.reviews as ApiReview[]); setCount(res.reviews.length) })
      .catch(() => {})
      .finally(() => setLoadingReviews(false))
  }, [listingId])

  async function onSubmit() {
    if (!text.trim()) return
    if (rating === 0) { setSubmitError(T.pickStar); return }
    if (!listingId) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const token = getStoredAuthToken() ?? undefined
      const created = await createReview({ entity_type: 'listing', entity_id: listingId, rating, body: text.trim() }, token)
      const newReview: ApiReview = {
        id: (created as { id?: string }).id ?? String(Date.now()),
        rating,
        body: text.trim(),
        reviewer_display_name: T.you,
        created_at: new Date().toISOString(),
      }
      setReviews((prev) => [newReview, ...prev])
      setCount((c) => c + 1)
      setText(''); setRating(0)
      setSubmitOk(true)
      setTimeout(() => setSubmitOk(false), 4000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : T.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  const titleWithCount = T.sectionTitle.replace('{count}', String(count))

  return (
    <div className="flex flex-col gap-y-6 pt-8 sm:gap-y-8">
      <div>
        <SectionHeading>{titleWithCount}</SectionHeading>
        <div className="mt-4 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <HugeiconsIcon
              key={n}
              icon={StarIcon}
              className={clsx(reviewStart >= n ? 'text-yellow-400' : 'text-gray-200', 'size-6 shrink-0')}
              strokeWidth={1.75}
            />
          ))}
          {reviewStart > 0 && (
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{reviewStart.toFixed(1)}</span>
          )}
        </div>
      </div>

      <Divider className="w-14!" />

      <div className="space-y-3">
        <StarPicker value={rating} onChange={setRating} />
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
            placeholder={T.writePlaceholder}
            className="h-16 w-full rounded-full border border-neutral-200 bg-white px-6 pr-16 text-base focus:border-primary-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
          <div className="absolute end-2 top-1/2 -translate-y-1/2">
            <ButtonCircle className="size-12!" onClick={onSubmit} disabled={submitting}>
              <HugeiconsIcon icon={ArrowRight02Icon} className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
            </ButtonCircle>
          </div>
        </div>
        {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
        {submitOk && <p className="text-sm text-green-600 dark:text-green-400">{T.submitSuccess}</p>}
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {loadingReviews ? (
          <div className="py-8 text-center text-sm text-neutral-400">{T.loading}</div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-400">{T.empty}</div>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} labels={{ guest: T.guest, verified: T.verified }} />)
        )}
      </div>
    </div>
  )
}
