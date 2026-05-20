import { Divider } from '@/shared/divider'
import clsx from 'clsx'

export type HotelSectionNavItem = {
  id: string
  label: string
  eyebrow?: string
}

export default function HotelSectionNav({
  items,
  className,
}: {
  items: HotelSectionNavItem[]
  className?: string
}) {
  if (items.length < 2) return null

  return (
    <nav
      aria-label="Otel bölümleri"
      className={clsx(
        'sticky top-0 z-10 -mx-1 overflow-x-auto bg-white/90 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:bg-neutral-950/85 dark:supports-[backdrop-filter]:bg-neutral-950/70',
        className,
      )}
    >
      <div className="flex min-w-max items-center gap-2 rounded-full border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="group rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <span>{item.label}</span>
            {item.eyebrow ? (
              <span className="ml-2 text-xs font-normal text-neutral-400 group-hover:text-neutral-500 dark:text-neutral-500">
                {item.eyebrow}
              </span>
            ) : null}
          </a>
        ))}
      </div>
      <Divider className="mt-3" />
    </nav>
  )
}
