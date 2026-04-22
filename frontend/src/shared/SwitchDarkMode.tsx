'use client'

import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTheme } from '@/components/theme-provider'
import React from 'react'
interface SwitchDarkModeProps {
  className?: string
}
const SwitchDarkMode: React.FC<SwitchDarkModeProps> = ({ className = '' }) => {
  const { setTheme, theme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`flex h-12 w-12 items-center justify-center self-center rounded-full text-2xl text-neutral-700 hover:bg-neutral-100 focus:outline-hidden md:text-3xl dark:text-neutral-300 dark:hover:bg-neutral-800 ${className}`}
    >
      <span className="sr-only">Enable dark mode</span>
      {theme === 'dark' ? (
        <HugeiconsIcon icon={Moon02Icon} className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <HugeiconsIcon icon={Sun03Icon} className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  )
}

export default SwitchDarkMode
