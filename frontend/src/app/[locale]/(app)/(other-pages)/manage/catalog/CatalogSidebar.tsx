'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { categoryLabelTr, fallbackProductCategories, type CatalogCategoryRow } from '@/lib/catalog-category-ui'
import { useManageT } from '@/lib/manage-i18n-context'
import { listProductCategories } from '@/lib/travel-api'
import clsx from 'clsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

function pathUnderCategory(pathname: string | null, base: string, code: string): boolean {
  if (!pathname) return false
  const seg = `${base}/${encodeURIComponent(code)}`
  return pathname === seg || pathname.startsWith(`${seg}/`)
}

function resolveActiveSubHref(
  pathname: string | null,
  items: { href: string }[],
): string | undefined {
  if (!pathname) return undefined
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length)
  for (const it of sorted) {
    if (pathname === it.href || pathname.startsWith(`${it.href}/`)) return it.href
  }
  return undefined
}

/** HTML `id` for category submenu — safe for `aria-controls`. */
function catalogSidebarSubmenuId(code: string): string {
  return `catalog-sidebar-sub-${code.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

export default function CatalogSidebar() {
  const t = useManageT()
  const pathname = usePathname()
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<CatalogCategoryRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  /** Kategori kodu → kullanıcı chevron ile açtı (mevcut rota dışında). */
  const [userExpanded, setUserExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    void listProductCategories({ active_only: true })
      .then((r) => {
        if (!cancelled) {
          setRows(r.categories)
          setErr(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRows(fallbackProductCategories())
          setErr(t('catalog.api_fallback'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const base = vitrinPath('/manage/catalog')

  const expanded = useCallback(
    (code: string) => {
      if (pathUnderCategory(pathname, base, code)) return true
      return userExpanded[code] === true
    },
    [pathname, base, userExpanded],
  )

  const toggleExpand = useCallback((code: string) => {
    if (pathUnderCategory(pathname, base, code)) return
    setUserExpanded((prev) => ({ ...prev, [code]: !prev[code] }))
  }, [pathname, base])

  /** Katalog akışı: özet → ilanlar → yeni → öznitelikler → [otel: oda özn.] → SEO → müsaitlik → kurtarma */
  const sub = useMemo(
    () => (code: string) => {
      const enc = encodeURIComponent(code)
      const p = `${base}/${enc}`
      const items: { href: string; label: string }[] = [
        { href: p, label: t('catalog.sidebar_sub_summary') },
        { href: `${p}/listings`, label: t('catalog.hub_all_listings') },
        { href: `${p}/listings/new`, label: t('catalog.hub_new_listing') },
        { href: `${p}/attributes`, label: t('catalog.hub_attributes') },
        { href: `${p}/price-inclusions`, label: 'Dahil / Hariç' },
        { href: `${p}/accommodation-rules`, label: 'Kurallar' },
      ]
      if (code === 'hotel') {
        items.push({ href: `${p}/facet-options`, label: 'Tip / tema / konaklama' })
        items.push({ href: `${p}/room-features`, label: 'Oda öznitelikleri' })
      }
      items.push(
        { href: `${p}/seo`, label: 'SEO & açılış' },
        { href: `${p}/availability`, label: 'Kullanılabilirlik' },
        { href: `${p}/recovery`, label: 'Kurtarma' },
      )
      return items
    },
    [base, t],
  )

  return (
    <nav
      className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
      aria-label={t('catalog.sidebar_aria')}
    >
      <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        {t('catalog.categories_heading')}
      </p>
      {err ? <p className="mb-2 px-2 text-[11px] text-amber-700 dark:text-amber-300">{err}</p> : null}
      <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto">
        <li>
          <Link
            href={base}
            aria-current={pathname === base ? 'page' : undefined}
            className={clsx(
              'block rounded-lg px-2 py-2 text-sm',
              pathname === base
                ? 'bg-primary-100 font-medium text-primary-900 dark:bg-primary-950/50 dark:text-primary-100'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800',
            )}
          >
            {t('catalog.overview')}
          </Link>
        </li>
        {rows.map((c) => {
          const href = `${base}/${encodeURIComponent(c.code)}`
          const active = pathUnderCategory(pathname, base, c.code)
          const off = !c.is_active
          const open = expanded(c.code)
          const onPath = pathUnderCategory(pathname, base, c.code)
          const subMenuId = catalogSidebarSubmenuId(c.code)
          const hubCurrent = pathname === href

          return (
            <li key={c.code} className="rounded-lg">
              <div
                className={clsx(
                  'flex items-stretch gap-0.5 rounded-lg',
                  active && 'bg-primary-100/80 dark:bg-primary-950/40',
                )}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={subMenuId}
                  aria-disabled={onPath}
                  aria-label={open ? t('catalog.sidebar_collapse') : t('catalog.sidebar_expand')}
                  onClick={() => toggleExpand(c.code)}
                  className={clsx(
                    'flex shrink-0 items-center justify-center rounded-l-lg px-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
                    onPath && 'cursor-default opacity-40 hover:bg-transparent',
                  )}
                  disabled={onPath}
                >
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Link
                  href={href}
                  aria-current={hubCurrent ? 'page' : undefined}
                  className={clsx(
                    'min-w-0 flex-1 rounded-r-lg px-2 py-2 text-sm',
                    active
                      ? 'font-medium text-primary-900 dark:text-primary-100'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800',
                    off && 'opacity-60',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{categoryLabelTr(c.code)}</span>
                    {off ? (
                      <span className="text-[10px] font-normal text-neutral-500 dark:text-neutral-400">
                        {t('catalog.closed_badge')}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </div>
              <ul
                id={subMenuId}
                hidden={!open}
                className="ms-5 mt-0.5 space-y-0.5 border-l border-neutral-200 py-1 ps-2 dark:border-neutral-600"
              >
                {(() => {
                  const items = sub(c.code)
                  const activeSub = resolveActiveSubHref(pathname, items)
                  return items.map((item) => {
                    const subActive = item.href === activeSub
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={subActive ? 'page' : undefined}
                          className={clsx(
                            'block rounded-md px-2 py-1.5 text-xs',
                            subActive
                              ? 'bg-primary-100 font-medium text-primary-900 dark:bg-primary-950/50 dark:text-primary-100'
                              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })
                })()}
              </ul>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
