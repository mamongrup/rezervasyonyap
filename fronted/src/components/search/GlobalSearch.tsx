'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, Tag, Layers } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import type { SearchSuggestion } from '@/app/api/listing-search/route'

const CATEGORY_LABELS: Record<string, string> = {
  hotel: 'Otel',
  villa: 'Villa',
  tour: 'Tur',
  activity: 'Aktivite',
  yacht: 'Yat',
  car: 'Araç',
  flight: 'Uçuş',
  transfer: 'Transfer',
  cruise: 'Kruvaziyer',
  hajj: 'Hac & Umre',
  visa: 'Vize',
  event: 'Etkinlik',
  ferry: 'Feribot',
}

// ─── Overlay search modal ─────────────────────────────────────────────────────
export function SearchModal({ onClose, locale }: { onClose: () => void; locale: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const search = (q: string) => {
    if (q.length < 3) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/listing-search?q=${encodeURIComponent(q)}&locale=${locale}&limit=8`,
        )
        const data = (await res.json()) as { suggestions: SearchSuggestion[] }
        setSuggestions(data.suggestions)
        setSelectedIdx(-1)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 280)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        router.push(vitrinPath(suggestions[selectedIdx].href))
        onClose()
      } else if (query.trim()) {
        router.push(`${vitrinPath('/ara')}?q=${encodeURIComponent(query.trim())}`)
        onClose()
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  search(e.target.value)
                }}
                onKeyDown={handleKeyDown}
                placeholder="İlan adı, yer, özellik ara… (ör: balayı villası, 5 kabinli yat)"
                className="w-full pl-10 pr-4 py-3 text-base border-0 focus:outline-none bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary-500" />
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {(suggestions.length > 0 || query.length >= 3) && (
        <div className="max-w-3xl mx-auto w-full px-4 mt-2" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
            {suggestions.length === 0 && !loading && query.length >= 3 ? (
              <div className="px-5 py-8 text-center text-neutral-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  <strong>{query}</strong> için sonuç bulunamadı
                </p>
                <Link
                  href={`${vitrinPath('/ara')}?q=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="inline-block mt-3 text-sm text-primary-600 hover:underline"
                >
                  Tüm listelemelerde ara →
                </Link>
              </div>
            ) : (
              <ul>
                {suggestions.map((s, idx) => (
                  <li key={s.id}>
                    <Link
                      href={vitrinPath(s.href)}
                      onClick={onClose}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors',
                        selectedIdx === idx && 'bg-primary-50 dark:bg-primary-900/20',
                      )}
                    >
                      {s.image ? (
                        <img
                          src={s.image}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                          {s.type === 'collection' ? (
                            <Layers className="w-5 h-5 text-primary-500" />
                          ) : (
                            <Tag className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-900 dark:text-white text-sm truncate">
                            {s.title}
                          </span>
                          {s.type === 'collection' && (
                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">
                              Koleksiyon
                            </span>
                          )}
                        </div>
                        {s.subtitle && (
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{s.subtitle}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
                {query.length >= 3 && (
                  <li className="border-t border-neutral-100 dark:border-neutral-800">
                    <Link
                      href={`${vitrinPath('/ara')}?q=${encodeURIComponent(query)}`}
                      onClick={onClose}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <Search className="w-4 h-4" />
                      &ldquo;{query}&rdquo; için tüm sonuçları gör
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Search Button (header'a eklenir) ─────────────────────────────────────────
export default function GlobalSearch({ locale = 'tr', iconOnly = false }: { locale?: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ara"
        className="relative -m-2.5 flex cursor-pointer items-center justify-center rounded-full p-2.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
      >
        <Search className="w-5 h-5" />
      </button>
      {open && <SearchModal onClose={() => setOpen(false)} locale={locale} />}
    </>
  )
}
