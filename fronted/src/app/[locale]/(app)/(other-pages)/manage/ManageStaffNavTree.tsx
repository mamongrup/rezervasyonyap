'use client'

import clsx from 'clsx'
import {
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ManageCatalogNavItem from './ManageCatalogNavItem'

type NavLeaf = { path: string; label: string }
type NavGroupDef = {
  id: string
  label: string
  Icon: React.ElementType
  items: NavLeaf[]
}

const GROUPS: NavGroupDef[] = [
  {
    id: 'dashboard',
    label: 'Genel Bakış',
    Icon: LayoutDashboard,
    items: [
      { path: '/manage/staff', label: 'Personel paneli' },
      { path: '/manage/staff/workspace', label: 'İş planı & görevler' },
      { path: '/manage/staff/profile', label: 'Kurum bilgileri' },
    ],
  },
  {
    id: 'pos',
    label: 'Kasa (POS)',
    Icon: ShoppingCart,
    items: [
      { path: '/manage/staff/pos', label: 'POS satış ekranı' },
      { path: '/manage/staff/pos/history', label: 'İşlem geçmişi' },
    ],
  },
  {
    id: 'listings',
    label: 'İlanlar',
    Icon: Package,
    items: [
      { path: '/manage/staff/listings', label: 'Tüm ilanlar' },
      { path: '/manage/staff/listings/published', label: 'Yayındaki ilanlar' },
      { path: '/manage/staff/listings/draft', label: 'Taslak ilanlar' },
    ],
  },
  {
    id: 'reservations',
    label: 'Rezervasyonlar',
    Icon: CalendarCheck,
    items: [
      { path: '/manage/staff/reservations', label: 'Tüm rezervasyonlar' },
      { path: '/manage/staff/calendar', label: 'Takvim görünümü' },
      { path: '/manage/staff/offers', label: 'Teklifler' },
    ],
  },
  {
    id: 'customers',
    label: 'Müşteriler',
    Icon: Users,
    items: [
      { path: '/manage/staff/customers', label: 'Müşteri listesi' },
      { path: '/manage/staff/customers/crm', label: 'Müşteri notları (CRM)' },
    ],
  },
  {
    id: 'invoices',
    label: 'Faturalar',
    Icon: CreditCard,
    items: [
      { path: '/manage/staff/invoices', label: 'Komisyon faturaları' },
      { path: '/manage/staff/reports', label: 'Satış raporları' },
    ],
  },
  {
    id: 'documents',
    label: 'Belgeler',
    Icon: FileText,
    items: [
      { path: '/manage/staff/contracts', label: 'Sözleşmeler' },
      { path: '/manage/staff/documents', label: 'Belgeler & dosyalar' },
    ],
  },
  {
    id: 'settings',
    label: 'Hesap',
    Icon: Settings,
    items: [
      { path: '/manage/staff/settings', label: 'Hesap ayarları' },
      { path: '/manage/staff/notifications', label: 'Bildirim tercihleri' },
    ],
  },
]

const CATALOG_GROUP_ID = 'catalog'

function isUnderPath(pathname: string | null, prefixed: string): boolean {
  if (!pathname) return false
  return pathname === prefixed || pathname.startsWith(`${prefixed}/`)
}

export default function ManageStaffNavTree({
  onNavLinkClick,
}: {
  onNavLinkClick?: () => void
}) {
  const pathname = usePathname()
  const vitrinPath = useVitrinHref()

  const [manualOpen, setManualOpen] = useState<Record<string, boolean | undefined>>({})
  const [navSearch, setNavSearch] = useState('')

  const isGroupAutoOpen = useCallback(
    (group: NavGroupDef) => {
      return group.items.some((i) => {
        const h = vitrinPath(i.path)
        return isUnderPath(pathname, h)
      })
    },
    [pathname, vitrinPath],
  )

  const isGroupOpen = useCallback(
    (group: NavGroupDef) => {
      const manual = manualOpen[group.id]
      if (manual !== undefined) return manual
      return isGroupAutoOpen(group)
    },
    [manualOpen, isGroupAutoOpen],
  )

  const isCatalogOpen = useMemo(() => {
    const manual = manualOpen[CATALOG_GROUP_ID]
    if (manual !== undefined) return manual
    const h = vitrinPath('/manage/catalog')
    return isUnderPath(pathname, h)
  }, [manualOpen, pathname, vitrinPath])

  const toggleGroup = useCallback((id: string, currentOpen: boolean) => {
    setManualOpen((prev) => ({ ...prev, [id]: !currentOpen }))
  }, [])

  const activeItemPath = useMemo(() => {
    const allItems = GROUPS.flatMap((g) => g.items)
    return [...allItems]
      .sort((a, b) => b.path.length - a.path.length)
      .find((i) => isUnderPath(pathname, vitrinPath(i.path)))?.path
  }, [pathname, vitrinPath])

  const LINK_BASE = 'block rounded px-2 py-1.5 text-xs transition-colors'
  const LINK_ACTIVE = clsx(LINK_BASE, 'font-semibold text-[color:var(--manage-primary)]')
  const LINK_IDLE = clsx(
    LINK_BASE,
    'text-[color:var(--manage-text-muted)] hover:text-[color:var(--manage-text)]',
  )

  const GROUP_BTN_BASE =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
  const GROUP_BTN_ACTIVE = clsx(
    GROUP_BTN_BASE,
    'bg-[color:var(--manage-primary-soft)] text-[color:var(--manage-primary)]',
  )
  const GROUP_BTN_IDLE = clsx(
    GROUP_BTN_BASE,
    'text-[color:var(--manage-text-muted)] hover:bg-black/[0.04] hover:text-[color:var(--manage-text)] dark:hover:bg-white/[0.06]',
  )

  const catalogHref = vitrinPath('/manage/catalog')
  const inCatalog = isUnderPath(pathname, catalogHref)

  const searchQuery = navSearch.toLowerCase().trim()
  const filteredGroups = searchQuery
    ? GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(searchQuery)),
      })).filter((g) => g.items.length > 0 || g.label.toLowerCase().includes(searchQuery))
    : GROUPS

  return (
    <div className="flex flex-col gap-0.5 px-2 pb-4">
      {/* Nav search */}
      <div className="mb-2 px-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Menüde ara…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="manage-staff-nav-search"
            className="w-full rounded-xl border border-[color:var(--manage-sidebar-border)] bg-transparent py-1.5 pl-8 pr-7 text-xs text-[color:var(--manage-text)] placeholder:text-neutral-400 focus:border-[color:var(--manage-primary)] focus:outline-none"
          />
          {navSearch ? (
            <button
              onClick={() => setNavSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ─── Katalog (dinamik) ─── */}
      <div className={searchQuery ? 'hidden' : ''}>
        <button
          type="button"
          onClick={() => toggleGroup(CATALOG_GROUP_ID, isCatalogOpen)}
          className={inCatalog ? GROUP_BTN_ACTIVE : GROUP_BTN_IDLE}
          aria-expanded={isCatalogOpen}
        >
          <Package className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Ürün Kataloğu</span>
          {isCatalogOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
        </button>
        {isCatalogOpen ? (
          <ul className="ms-4 mt-0.5 space-y-0.5 border-l border-[color:var(--manage-sidebar-border)] ps-1">
            <ManageCatalogNavItem onNavLinkClick={onNavLinkClick} embedded />
          </ul>
        ) : null}
      </div>

      {/* ─── Statik gruplar ─── */}
      {filteredGroups.map((group) => {
        const open = searchQuery ? true : isGroupOpen(group)
        const hasActive = group.items.some((i) => activeItemPath === i.path)
        const { Icon } = group

        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => !searchQuery && toggleGroup(group.id, open)}
              className={hasActive ? GROUP_BTN_ACTIVE : GROUP_BTN_IDLE}
              aria-expanded={open}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              {!searchQuery &&
                (open ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                ))}
            </button>

            {open ? (
              <ul className="ms-4 mt-0.5 space-y-0.5 border-l border-[color:var(--manage-sidebar-border)] ps-3">
                {group.items.map((item) => {
                  const active = activeItemPath === item.path
                  return (
                    <li key={item.path}>
                      <Link
                        href={vitrinPath(item.path)}
                        prefetch={false}
                        onClick={() => {
                          setNavSearch('')
                          onNavLinkClick?.()
                        }}
                        className={active ? LINK_ACTIVE : LINK_IDLE}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
