import { cn } from '@/lib/utils'
import type { FooterDisplayColumn, FooterDisplayLink } from '@/lib/footer-site-layout'

const linkClassName =
  'break-words text-sm/6 text-gray-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
const headingClassName =
  'break-words text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-neutral-200'

function FooterLink({ link, preview }: { link: FooterDisplayLink; preview?: boolean }) {
  if (preview || !link.href) {
    return <span className={linkClassName}>{link.name}</span>
  }
  return (
    <a href={link.href} className={linkClassName}>
      {link.name}
    </a>
  )
}

function LinkList({ column, preview }: { column: FooterDisplayColumn; preview?: boolean }) {
  return (
    <ul role="list" className="mt-3 space-y-2.5">
      {column.links.map((link, index) => (
        <li key={`${column.title}-${link.name}-${index}`} className="min-w-0">
          <FooterLink link={link} preview={preview} />
        </li>
      ))}
    </ul>
  )
}

export function FooterCategorySection({
  title,
  groups,
  destinations,
  preview = false,
}: {
  title: string
  groups: FooterDisplayColumn[]
  destinations: FooterDisplayColumn
  preview?: boolean
}) {
  return (
    <section className="min-w-0">
      <h3 className={headingClassName}>{title}</h3>
      <div className="mt-4 divide-y divide-neutral-200/80 border-y border-neutral-200/80 dark:divide-neutral-800 dark:border-neutral-800">
        {groups.map((group, index) => (
          <details key={`${group.title}-${index}`} className="group py-1.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold text-gray-800 marker:content-none dark:text-neutral-200 [&::-webkit-details-marker]:hidden">
              <span>{group.title}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="size-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
              >
                <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="pb-3 ps-1">
              <LinkList column={group} preview={preview} />
            </div>
          </details>
        ))}
      </div>

      <div className="mt-6">
        <h4 className={cn(headingClassName, 'text-xs')}>{destinations.title}</h4>
        <LinkList column={destinations} preview={preview} />
      </div>
    </section>
  )
}

export function FooterPlainSection({
  column,
  preview = false,
}: {
  column: FooterDisplayColumn
  preview?: boolean
}) {
  return (
    <section className="min-w-0">
      <h3 className={headingClassName}>{column.title}</h3>
      <LinkList column={column} preview={preview} />
    </section>
  )
}
