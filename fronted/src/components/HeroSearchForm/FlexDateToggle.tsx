'use client'

import React from 'react'

type Props = {
  /** Form input adı — URL'e flex_days olarak yansır. */
  name?: string
  defaultValue?: 0 | 3 | 7
  className?: string
}

/**
 * Esnek tarih: ±0 / 3 / 7 gün. Form içine yerleştirilebilir gizli + görünür kontrol.
 * Backend `flex_days` parametresi ile sonuç havuzunu genişletir (Faz F).
 */
export default function FlexDateToggle({ name = 'flex_days', defaultValue = 0, className }: Props) {
  const [val, setVal] = React.useState<0 | 3 | 7>(defaultValue)

  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-800/80 ${className ?? ''}`}
      role="group"
      aria-label="Esnek tarih"
    >
      <span aria-hidden>✨</span>
      <span className="text-neutral-700 dark:text-neutral-200">Esnek tarih</span>
      {([0, 3, 7] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setVal(opt)}
          aria-pressed={val === opt}
          className={`rounded-full px-2 py-0.5 text-xs transition ${
            val === opt
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
          }`}
        >
          {opt === 0 ? 'Tam' : `±${opt} gün`}
        </button>
      ))}
      <input type="hidden" name={name} value={String(val)} />
    </div>
  )
}
