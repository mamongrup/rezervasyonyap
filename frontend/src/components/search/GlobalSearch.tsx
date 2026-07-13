'use client'

import type { SearchSuggestion } from '@/app/api/listing-search/route'
import { useRegisterVitrinOverlay } from '@/components/aside/aside'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import clsx from 'clsx'
import { ArrowRight, Layers, Loader2, MapPin, Search, Tag, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Overlay search modal ─────────────────────────────────────────────────────
export function SearchModal({ onClose, locale }: { onClose: () => void; locale: string }) {
  useRegisterVitrinOverlay(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const cacheRef = useRef(new Map<string, SearchSuggestion[]>())
  const latestQueryRef = useRef('')

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

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    },
    []
  )

  const search = useCallback(
    (rawQuery: string) => {
      const q = rawQuery.trim()
      latestQueryRef.current = q
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()

      if (q.length < 3) {
        setSuggestions([])
        setLoading(false)
        return
      }

      const cacheKey = `${locale}:${q.toLocaleLowerCase(locale)}`
      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        setSuggestions(cached)
        setSelectedIdx(-1)
        setLoading(false)
        return
      }

      setLoading(true)
      // Klavye akışını bir araya getirirken kullanıcıya hissedilir bir bekleme
      // ekleme. Devam eden istek yukarıda iptal edildiği için kısa gecikme API'yi
      // gereksiz eski sorgulardan korumaya devam eder.
      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController()
        abortRef.current = controller
        try {
          const res = await fetch(`/api/listing-search?q=${encodeURIComponent(q)}&locale=${locale}&limit=8`, {
            signal: controller.signal,
          })
          if (!res.ok) throw new Error(`listing_search_${res.status}`)
          const data = (await res.json()) as { suggestions: SearchSuggestion[] }
          const next = Array.isArray(data.suggestions) ? data.suggestions : []
          cacheRef.current.set(cacheKey, next)
          if (latestQueryRef.current !== q) return
          setSuggestions(next)
          setSelectedIdx(-1)
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
          if (latestQueryRef.current !== q) return
          setSuggestions([])
        } finally {
          if (latestQueryRef.current === q) setLoading(false)
        }
      }, 40)
    },
    [locale]
  )

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
    <div className="fixed inset-0 z-[999] flex flex-col bg-neutral-950/55 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full border-b border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto max-w-4xl px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-inner transition focus-within:border-neutral-300 focus-within:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-neutral-600 dark:focus-within:bg-neutral-900">
              <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-neutral-400" />
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
                className="w-full border-0 bg-transparent py-4 pr-12 pl-12 text-base font-medium text-neutral-900 ring-0 outline-none placeholder:font-normal placeholder:text-neutral-400 focus:border-0 focus:ring-0 focus:outline-none focus-visible:outline-none sm:text-lg dark:text-white"
              />
              {loading && (
                <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-primary-500" />
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Aramayı kapat"
              className="flex-shrink-0 rounded-xl p-3 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <X className="size-6" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-xs text-neutral-400">
            <span>Otel, villa, tur, bölge veya özellik arayın</span>
            <span className="hidden sm:inline">↑↓ seç · Enter aç · Esc kapat</span>
          </div>
        </div>
      </div>

      {/* Results */}
      {(suggestions.length > 0 || query.trim().length >= 3) && (
        <div className="mx-auto mt-3 w-full max-w-4xl px-4" onClick={(e) => e.stopPropagation()}>
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            {suggestions.length === 0 && !loading && query.trim().length >= 3 ? (
              <div className="px-5 py-8 text-center text-neutral-500">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">
                  <strong>{query}</strong> için sonuç bulunamadı
                </p>
                <Link
                  href={`${vitrinPath('/ara')}?q=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="mt-3 inline-block text-sm text-link-muted-underline"
                >
                  Tüm listelemelerde ara →
                </Link>
              </div>
            ) : (
              <ul className="max-h-[min(65vh,620px)] overflow-y-auto p-2">
                {loading && suggestions.length === 0
                  ? Array.from({ length: 3 }, (_, idx) => (
                      <li
                        key={`search-loading-${idx}`}
                        className="flex animate-pulse items-center gap-4 rounded-2xl px-3 py-3"
                      >
                        <div className="size-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/5 rounded bg-neutral-100 dark:bg-neutral-800" />
                          <div className="h-3 w-3/5 rounded bg-neutral-100 dark:bg-neutral-800" />
                        </div>
                      </li>
                    ))
                  : null}
                {suggestions.map((s, idx) => (
                  <li key={s.id}>
                    <Link
                      href={vitrinPath(s.href)}
                      onClick={onClose}
                      className={clsx(
                        'group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-neutral-100/80 dark:hover:bg-neutral-800',
                        selectedIdx === idx &&
                          'bg-primary-50 ring-1 ring-primary-200 dark:bg-primary-900/20 dark:ring-primary-800'
                      )}
                    >
                      {s.image ? (
                        <img
                          src={s.image}
                          alt=""
                          className="size-14 flex-shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-black/5"
                        />
                      ) : (
                        <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                          {s.type === 'collection' ? (
                            <Layers className="size-6 text-primary-500" />
                          ) : (
                            <Tag className="size-6 text-neutral-400" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-neutral-900 sm:text-base dark:text-white">
                            {s.title}
                          </span>
                          {s.type === 'collection' && (
                            <span className="flex-shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                              Koleksiyon
                            </span>
                          )}
                        </div>
                        {s.subtitle && (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="truncate">{s.subtitle}</span>
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
                {!loading && query.trim().length >= 3 && (
                  <li className="border-t border-neutral-100 dark:border-neutral-800">
                    <Link
                      href={`${vitrinPath('/ara')}?q=${encodeURIComponent(query)}`}
                      onClick={onClose}
                      className="group m-1 flex items-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950/30"
                    >
                      <Search className="size-4" />
                      <span className="flex-1">&ldquo;{query}&rdquo; için tüm sonuçları gör</span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
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
        className="relative -m-2.5 flex cursor-pointer items-center justify-center gap-2 rounded-full p-2.5 text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Search className="size-5" />
        {!iconOnly ? <span className="text-sm font-medium">Ara</span> : null}
      </button>
      {open && <SearchModal onClose={() => setOpen(false)} locale={locale} />}
    </>
  )
}
