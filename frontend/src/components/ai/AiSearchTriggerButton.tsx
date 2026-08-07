'use client'

import React, { useState } from 'react'
import { SparklesIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import AiTravelConciergeModal from './AiTravelConciergeModal'

interface Props {
  locale?: string
  className?: string
}

export default function AiSearchTriggerButton({ locale = 'tr', className = '' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary-500/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 ${className}`}
      >
        <HugeiconsIcon icon={SparklesIcon} className="size-3.5 animate-pulse" strokeWidth={2.2} />
        <span>AI ile Tatil Bul</span>
      </button>

      <AiTravelConciergeModal isOpen={open} onClose={() => setOpen(false)} locale={locale} />
    </>
  )
}
