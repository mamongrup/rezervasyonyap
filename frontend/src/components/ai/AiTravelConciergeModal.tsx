'use client'

import React, { useState } from 'react'
import {
  AiInnovation01Icon,
  Cancel01Icon,
  SparklesIcon,
  ArrowRight01Icon,
  Search01Icon,
  MapPinIcon,
  StarIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'

interface Recommendation {
  id: string
  title: string
  slug: string
  location?: string
  price?: string
  image?: string | null
  href: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  locale?: string
}

const QUICK_PROMPTS = [
  '🌴 Fethiye korunaklı havuzlu villa',
  '💑 Romantik jakuzili butik oteller',
  '⛵ Göcek haftalık lüks yat kiralama',
  '👨‍👩‍👧‍👦 Antalya çocuklu aile tatil köyü',
  '🍷 Kırklareli bağ evi & spa oteli',
]

export default function AiTravelConciergeModal({ isOpen, onClose, locale = 'tr' }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [results, setResults] = useState<Recommendation[]>([])

  if (!isOpen) return null

  const handleSearch = async (textToSearch?: string) => {
    const q = (textToSearch ?? query).trim()
    if (!q) return

    setLoading(true)
    setSummary(null)
    try {
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, locale }),
      })
      if (!res.ok) throw new Error('API failed')
      const data = await res.json()
      setSummary(data.summary)
      setResults(data.recommendations || [])
    } catch {
      setSummary('Aramanıza uygun sonuçlar yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    const clean = prompt.replace(/^[\p{Emoji}\s]+/u, '')
    setQuery(clean)
    handleSearch(clean)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/95 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-md shadow-primary-500/20">
              <HugeiconsIcon icon={SparklesIcon} className="size-5" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                AI Tatil Danışmanı
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Hayalinizdeki tatili doğal dilde yazın, yapay zeka en uygun ilanları önersin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </button>
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch()
          }}
          className="relative mt-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Örn: Fethiye'de 4 kişilik havuzlu villa veya Kaş'ta romantik otel..."
            className="w-full rounded-2xl border border-neutral-300 bg-neutral-50/80 py-3.5 pl-4 pr-12 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white dark:focus:border-primary-400 dark:focus:bg-neutral-800"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm transition-all hover:bg-primary-700 disabled:opacity-40"
          >
            <HugeiconsIcon icon={Search01Icon} className="size-4" strokeWidth={2.2} />
          </button>
        </form>

        {/* Quick Prompts */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleQuickPrompt(p)}
              className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-xs transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-primary-500 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="mt-6 max-h-[380px] overflow-y-auto pr-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="size-10 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
              <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Yapay zeka en uygun tatil fırsatlarını analiz ediyor...
              </p>
            </div>
          )}

          {!loading && summary && (
            <div className="mb-4 rounded-2xl bg-primary-50/70 p-3.5 text-sm font-medium text-primary-900 dark:bg-primary-950/40 dark:text-primary-200">
              {summary}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-500"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-700">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-neutral-400">
                        Görsel
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                      {item.title}
                    </h4>
                    {item.location && (
                      <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                        <HugeiconsIcon icon={MapPinIcon} className="size-3 shrink-0" />
                        <span>{item.location}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                      {item.price}
                    </p>
                  </div>

                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-600"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
