'use client'

import {
  categoryLabelTr,
  fallbackProductCategories,
  type CatalogCategoryRow,
} from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useManageT } from '@/lib/manage-i18n-context'
import { listProductCategories } from '@/lib/travel-api'
import clsx from 'clsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

const SIDEBAR_LINK =
  'block rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--manage-text-muted)] transition-colors hover:bg-black/[0.04] hover:text-[color:var(--manage-text)] dark:hover:bg-white/[0.06]'
const SIDEBAR_LINK_ACTIVE =
  'block rounded-lg bg-[color:var(--manage-primary-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--manage-primary)]'

function isCatalogRoot(pathname: string | null, base: string) {
  return pathname === base || pathname === `${base}/`
}

function isUnderCategory(pathname: string | null, base: string, code: string) {
  if (!pathname) return false
  const seg = `${base}/${encodeURIComponent(code)}`
  return pathname === seg || pathname.startsWith(`${seg}/`)
}

function isUnderCatalog(pathname: string | null, base: string) {
  if (!pathname) return false
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** Kategori alt bağlantıları (özet dahil). */
function subItems(base: string, code: string, t: (k: string) => string) {
  const p = `${base}/${encodeURIComponent(code)}`
  const items: { href: string; label: string }[] = [
    { href: p, label: t('catalog.overview') || 'Özet' },
    { href: `${p}/listings`, label: t('catalog.hub_all_listings') || 'İlanlar' },
    { href: `${p}/listings/new`, label: t('catalog.hub_new_listing') || 'Yeni ilan' },
    { href: `${p}/attributes`, label: t('catalog.hub_attributes') || 'Öznitelikler' },
    {
      href: `${p}/price-inclusions`,
      label: manageTOr(t, 'catalog.hub_price_inclusions', 'Dahil / Hariç'),
    },
    { href: `${p}/accommodation-rules`, label: 'Kurallar' },
  ]
  if (code === 'hotel') {
    items.push({ href: `${p}/room-features`, label: 'Oda öznitelikleri' })
  }
  items.push(
    { href: `${p}/seo`, label: 'SEO' },
    { href: `${p}/availability`, label: 'Müsaitlik' },
    { href: `${p}/recovery`, label: 'Kurtarma' },
  )
  return items
}

function resolveActiveSub(pathname: string | null, items: { href: string }[]) {
  if (!pathname) return undefined
  return [...items].sort((a, b) => b.href.length - a.href.length).find((i) => {
    return pathname === i.href || pathname.startsWith(`${i.href}/`)
  })?.href
}

/** `t()` eksik anahtarda anahtarı döndürürse geri dönüş kullan (|| ile çalışmaz). */
function manageTOr(
  t: (k: string) => string,
  key: string,
  fallback: string,
) {
  const v = t(key).trim()
  return v === key || v === '' ? fallback : v
}

export default function ManageCatalogNavItem({
  onNavLinkClick,
  embedded = false,
}: {
  onNavLinkClick?: () => void
  /** true: ManageAdminNavTree içinde, grup açıkken sadece alt içerik render eder */
  embedded?: boolean
}) {
  const t = useManageT()
  const pathname = usePathname()
  const vitrinPath = useVitrinHref()
  const base = vitrinPath('/manage/catalog')

  const [rows, setRows] = useState<CatalogCategoryRow[]>([])
  const [userExpanded, setUserExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    void listProductCategories({ active_only: true })
      .then((r) => {
        if (!cancelled) setRows(r.categories)
      })
      .catch(() => {
        if (!cancelled) setRows(fallbackProductCategories())
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = useCallback(
    (code: string) => {
      if (isUnderCategory(pathname, base, code)) return
      setUserExpanded((p) => ({ ...p, [code]: !p[code] }))
    },
    [pathname, base],
  )

  const isOpen = useCallback(
    (code: string) => isUnderCategory(pathname, base, code) || userExpanded[code] === true,
    [pathname, base, userExpanded],
  )

  const inCatalog = isUnderCatalog(pathname, base)
  const onRoot = isCatalogRoot(pathname, base)

  const overview = t('catalog.overview') || 'Genel bakış'
  const heading = t('catalog.categories_heading') || 'Kategoriler'

  const catalogContent = (
    <div className={embedded ? '' : 'ms-3 mt-1 border-l border-[color:var(--manage-sidebar-border)] ps-2'}>
      {/* Genel bakış / özet */}
      <Link
        href={base}
        prefetch={false}
        onClick={() => onNavLinkClick?.()}
        className={clsx(
          'block rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
          onRoot
            ? 'text-[color:var(--manage-primary)]'
            : 'text-[color:var(--manage-text-muted)] hover:text-[color:var(--manage-text)]',
        )}
      >
        {overview}
      </Link>

      <p className="mt-2 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--manage-text-muted)]">
        {heading}
      </p>

      <ul className="space-y-0.5">
        {rows.map((c) => {
          const active = isUnderCategory(pathname, base, c.code)
          const open = isOpen(c.code)
          const items = subItems(base, c.code, t)
          const activeSub = resolveActiveSub(pathname, items)

          return (
            <li key={c.code}>
              <div className="flex items-stretch gap-0.5">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-disabled={active}
                  onClick={() => toggle(c.code)}
                  className={clsx(
                    'flex shrink-0 items-center justify-center rounded-l px-1 text-[color:var(--manage-text-muted)] hover:text-[color:var(--manage-text)]',
                    active && 'cursor-default opacity-40',
                  )}
                >
                  {open
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                <Link
                  href={`${base}/${encodeURIComponent(c.code)}`}
                  prefetch={false}
                  onClick={() => onNavLinkClick?.()}
                  className={clsx(
                    'min-w-0 flex-1 rounded-r px-1.5 py-1.5 text-xs transition-colors',
                    active
                      ? 'font-semibold text-[color:var(--manage-primary)]'
                      : 'text-[color:var(--manage-text-muted)] hover:text-[color:var(--manage-text)]',
                    !c.is_active && 'opacity-60',
                  )}
                >
                  {categoryLabelTr(c.code)}
                  {!c.is_active ? (
                    <span className="ms-1 text-[10px] opacity-60">({t('catalog.closed_badge') || 'kapalı'})</span>
                  ) : null}
                </Link>
              </div>

              {open ? (
                <ul className="ms-5 mt-0.5 space-y-0.5 border-l border-[color:var(--manage-sidebar-border)] ps-2">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        onClick={() => onNavLinkClick?.()}
                        className={clsx(
                          'block rounded px-2 py-1 text-xs transition-colors',
                          activeSub === item.href
                            ? 'font-semibold text-[color:var(--manage-primary)]'
                            : 'text-[color:var(--manage-text-muted)] hover:text-[color:var(--manage-text)]',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )

  if (embedded) {
    return <>{catalogContent}</>
  }

  return (
    <li>
      <Link
        href={base}
        prefetch={false}
        onClick={() => onNavLinkClick?.()}
        className={onRoot ? SIDEBAR_LINK_ACTIVE : SIDEBAR_LINK}
      >
        {t('catalog.index_title') || 'Katalog'}
      </Link>
      {inCatalog ? catalogContent : null}
    </li>
  )
}
