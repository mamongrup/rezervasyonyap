'use client'

import ListingSearchSuggestions from '@/components/search/ListingSearchSuggestions'
import { SEARCH_MIN_QUERY_LEN } from '@/lib/search-listings-display'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { Search } from 'lucide-react'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  locale: string
  initialQuery?: string
}

export default function AraPageSearch({ locale, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const showLive = query.trim().length >= SEARCH_MIN_QUERY_LEN

  const handleSubmit = (formData: FormData) => {
    const q = String(formData.get('q') ?? '').trim()
    const base = vitrinPath('/ara')
    router.push(q ? `${base}?q=${encodeURIComponent(q)}` : base)
  }

  return (
    <div className="relative mt-4">
      <Form action={handleSubmit}>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <Search className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İlan, destinasyon veya özellik ara…"
            autoComplete="off"
            className="w-full border-0 bg-transparent text-base focus:ring-0 focus:outline-none dark:text-white"
          />
        </div>
      </Form>
      {showLive ? (
        <div className="absolute start-0 end-0 top-full z-20 mt-2">
          <ListingSearchSuggestions query={query} locale={locale} showViewAllLink />
        </div>
      ) : null}
    </div>
  )
}
