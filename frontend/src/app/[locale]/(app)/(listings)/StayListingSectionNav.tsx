'use client'

import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'

export type StaySectionNavItem = { id: string; label: string }

export default function StayListingSectionNav({ items }: { items: StaySectionNavItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '')

  const onClick = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }, [])

  useEffect(() => {
    if (items.length === 0) return
    const ids = items.map((i) => i.id)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: 0.1 },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <nav
      aria-label="Section navigation"
      className="sticky top-0 z-20 -mx-1 mb-1 overflow-x-auto border-b border-neutral-200/80 bg-white/95 py-2 backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-950/95"
    >
      <ul className="flex min-w-max gap-1 px-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onClick(item.id)}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                activeId === item.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
              )}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
