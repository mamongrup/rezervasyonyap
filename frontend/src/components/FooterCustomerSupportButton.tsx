'use client'

import { Headset } from 'lucide-react'

export function FooterCustomerSupportButton({
  onClick,
  ariaLabel,
}: {
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative -mt-4 shrink-0 cursor-pointer touch-manipulation transition-transform hover:scale-[1.04] active:scale-95"
    >
      <span className="flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_8px_22px_rgba(79,70,229,0.42)] ring-[3px] ring-white dark:ring-neutral-950">
        <Headset className="size-7" strokeWidth={2} aria-hidden />
      </span>
    </button>
  )
}
