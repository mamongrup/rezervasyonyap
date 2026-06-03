'use client'

import type { SearchSuggestion } from '@/app/api/listing-search/route'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { SEARCH_MIN_QUERY_LEN } from '@/lib/search-listings-display'
import { Link } from '@/shared/link'
import clsx from 'clsx'
import { Loader2, Search, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface Props {
  query: string
  locale: string
  onNavigate?: () => void
  className?: string
  showViewAllLink?: boolean
}

export default function ListingSearchSuggestions({
  query,
  locale,
  onNavigate,
  className,
  showViewAllLink = true,
}: Props) {
  const trimmed = query.trim()
  const vitrinPath = useVitrinHref()
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (trimmed.length < SEARCH_MIN_QUERY_LEN) {
      setSuggestions([])
      setLoading(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/listing-search?q=${encodeURIComponent(trimmed)}&locale=${locale}&limit=8`,
        )
        const data = (await res.json()) as { suggestions: SearchSuggestion[] }
        setSuggestions(data.suggestions ?? [])
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [trimmed, locale])

  if (trimmed.length < SEARCH_MIN_QUERY_LEN) return null

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60',
        className,
      )}
    >
      {loading && suggestions.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
          Aranıyor…
        </div>
      ) : null}

      {!loading && suggestions.length === 0 ? (
        <div className="px-4 py-5 text-center text-sm text-neutral-500">
          <strong className="text-neutral-700 dark:text-neutral-300">{trimmed}</strong> için sonuç yok
          {showViewAllLink ? (
            <Link
              href={`${vitrinPath('/ara')}?q=${encodeURIComponent(trimmed)}`}
              onClick={onNavigate}
              className="mt-2 block text-primary-600 hover:underline dark:text-primary-400"
            >
              Tüm sonuçlarda ara →
            </Link>
          ) : null}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <ul className="max-h-[min(50vh,320px)] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {suggestions.map((s) => (
            <li key={`${s.type}-${s.id}`}>
              <Link
                href={vitrinPath(s.href)}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/80"
              >
                {s.image ? (
                  <img src={s.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Tag className="h-5 w-5 text-neutral-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-start">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {s.title}
                  </p>
                  {s.subtitle ? (
                    <p className="truncate text-xs text-neutral-500">{s.subtitle}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
          {showViewAllLink ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onNavigate?.()
                  router.push(`${vitrinPath('/ara')}?q=${encodeURIComponent(trimmed)}`)
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary-600 hover:bg-neutral-50 dark:text-primary-400 dark:hover:bg-neutral-800/80"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">&ldquo;{trimmed}&rdquo; için tüm sonuçlar</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
