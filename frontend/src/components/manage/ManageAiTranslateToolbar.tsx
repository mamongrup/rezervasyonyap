'use client'

import { Globe, Loader2 } from 'lucide-react'

export type ManageAiLocaleOption = { code: string; label: string; flag: string }

type Props = {
  locales: ManageAiLocaleOption[]
  /** Genelde `tr` hariç */
  targetLocale: string
  onTargetLocaleChange: (code: string) => void
  onTranslate: () => void
  /** Birincil dilden tüm `locales` öğelerine sırayla çeviri (isteğe bağlı) */
  onTranslateAll?: () => void
  translating?: boolean
  disabled?: boolean
  className?: string
  buttonLabel?: string
  allButtonLabel?: string
}

export function ManageAiTranslateToolbar({
  locales,
  targetLocale,
  onTargetLocaleChange,
  onTranslate,
  onTranslateAll,
  translating,
  disabled,
  className = '',
  buttonLabel = 'AI Çevir',
  allButtonLabel = 'Tüm dillere',
}: Props) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-1.5 py-1 dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    >
      <select
        value={targetLocale}
        onChange={(e) => onTargetLocaleChange(e.target.value)}
        disabled={disabled || translating}
        className="max-w-[140px] rounded-md border-0 bg-transparent py-0.5 pl-1 text-xs text-neutral-700 outline-none dark:text-neutral-200"
        title="Çeviri hedef dili"
      >
        {locales.map((loc) => (
          <option key={loc.code} value={loc.code}>
            {loc.flag} {loc.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled || translating}
        onClick={onTranslate}
        className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
        title="Kaynak dildeki içeriği seçilen dile çevirir (varsayılan kaynak: site birincil dili)"
      >
        {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
        {buttonLabel}
      </button>
      {onTranslateAll ? (
        <button
          type="button"
          disabled={disabled || translating || locales.length === 0}
          onClick={onTranslateAll}
          className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/70"
          title="Birincil kaynak dilden bu listedeki tüm dillere sırayla çevirir"
        >
          {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
          {allButtonLabel}
        </button>
      ) : null}
    </div>
  )
}
