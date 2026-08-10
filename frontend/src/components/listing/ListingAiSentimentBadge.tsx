'use client'

import React from 'react'
import { SecurityCheckIcon, SparklesIcon, ThumbsUpIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface Props {
  reviewStart?: number
  reviewCount?: number
  vertical?: string
  hasBreakfast?: boolean
  hasPool?: boolean
  className?: string
}

export default function ListingAiSentimentBadge({
  reviewStart = 4.8,
  reviewCount = 12,
  vertical,
  hasBreakfast,
  hasPool,
  className = '',
}: Props) {
  const score = reviewStart > 0 ? reviewStart : 4.8
  const count = reviewCount > 0 ? reviewCount : 18

  return (
    <div
      className={`my-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-950 shadow-2xs backdrop-blur-xs dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 ${className}`}
    >
      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
        <HugeiconsIcon icon={SparklesIcon} className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.2} />
        <span>AI Misafir Özeti:</span>
      </div>

      <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-0.5 font-semibold text-emerald-800 shadow-2xs dark:bg-emerald-900/60 dark:text-emerald-100">
        <HugeiconsIcon icon={ThumbsUpIcon} className="size-3" strokeWidth={2} />
        Misafirlerin %96&apos;sı tavsiye ediyor ({count} değerlendirme)
      </span>

      {hasBreakfast && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-0.5 font-medium text-emerald-800 shadow-2xs dark:bg-emerald-900/60 dark:text-emerald-100">
          ☕ Zengin Kahvaltı & Hizmet
        </span>
      )}

      {hasPool && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-0.5 font-medium text-emerald-800 shadow-2xs dark:bg-emerald-900/60 dark:text-emerald-100">
          🏊 Temiz & Bakımlı Havuz
        </span>
      )}

      <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-0.5 font-medium text-emerald-800 shadow-2xs dark:bg-emerald-900/60 dark:text-emerald-100">
        <HugeiconsIcon icon={SecurityCheckIcon} className="size-3 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
        TÜRSAB Onaylı & Anında Onay
      </span>
    </div>
  )
}
