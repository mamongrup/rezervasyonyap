'use client'

import { useState } from 'react'

interface CouponCopyButtonProps {
  code: string
  copyLabel: string
  copiedLabel: string
}

export default function CouponCopyButton({ code, copyLabel, copiedLabel }: CouponCopyButtonProps) {
  const [done, setDone] = useState(false)

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setDone(true)
        setTimeout(() => setDone(false), 1800)
      } catch {
        /* noop */
      }
      document.body.removeChild(ta)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${
        done
          ? 'bg-emerald-600 text-white'
          : 'bg-white text-primary-700 hover:bg-primary-100 dark:bg-neutral-800 dark:text-primary-300 dark:hover:bg-neutral-700'
      }`}
      aria-live="polite"
    >
      <span className="font-mono">{code}</span>
      <span className="ml-2 hidden sm:inline">{done ? copiedLabel : copyLabel}</span>
    </button>
  )
}
