'use client'

import { Globe, Loader2 } from 'lucide-react'

export type ManageAiLocaleOption = { code: string; label: string; flag: string }

type Props = {
  locales: ManageAiLocaleOption[]
  /** Genelde `tr` hariç */
  targetLocale: string
  onTargetLocaleChange: (code: string) => void
  onTranslate: () => void
  translating?: boolean
  disabled?: boolean
  className?: string
  buttonLabel?: string
}

export function ManageAiTranslateToolbar({
  locales,
  targetLocale,
  onTargetLocaleChange,
  onTranslate,
  translating,
  disabled,
  className = '',
  buttonLabel = 'AI Çevir',
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
        title="Türkçe kaynak içeriği seçilen dile çevirir"
      >
        {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
        {buttonLabel}
      </button>
    </div>
  )
}
