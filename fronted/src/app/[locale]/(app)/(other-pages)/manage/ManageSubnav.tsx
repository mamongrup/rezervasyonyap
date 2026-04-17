'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { AUTH_TOKEN_STORAGE_KEY, getStoredAuthToken } from '@/lib/auth-storage'
import { canSeeManageNavPath } from '@/lib/manage-nav-access'
import { useManageT } from '@/lib/manage-i18n-context'
import { getAuthMe } from '@/lib/travel-api'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ManageAdminNavTree from './ManageAdminNavTree'
import ManageAgencyNavTree from './ManageAgencyNavTree'
import ManageStaffNavTree from './ManageStaffNavTree'
import ManageSupplierNavTree from './ManageSupplierNavTree'

const PORTAL_STORAGE_KEY = 'manage_panel_portal_v1'

export type ManagePortal = 'admin' | 'agency' | 'supplier' | 'staff'

/** Her menü yolu hangi portal altında görünür */
function pathToPortals(path: string): ManagePortal[] {
  if (path.startsWith('/manage/agency')) return ['agency']
  if (path.startsWith('/manage/supplier')) return ['supplier']
  if (path.startsWith('/manage/staff')) return ['staff']
  if (path.startsWith('/manage/catalog')) return ['admin', 'agency', 'supplier', 'staff']
  return ['admin']
}

function inferPortalFromPathname(pathname: string | null, vitrinPath: (internal: string) => string): ManagePortal | null {
  if (!pathname) return null
  const under = (path: string) => {
    const h = vitrinPath(path)
    return pathname === h || pathname.startsWith(`${h}/`)
  }
  if (under('/manage/agency')) return 'agency'
  if (under('/manage/supplier')) return 'supplier'
  if (under('/manage/staff')) return 'staff'
  const manageBase = vitrinPath('/manage')
  if (pathname === manageBase || pathname.startsWith(`${manageBase}/`)) return 'admin'
  return null
}

const NAV_LABEL_FALLBACK_TR: Record<string, string> = {
  'nav.admin_home': 'Yönetici paneli',
  'nav.admin': 'Yönetici',
  'nav.hero_menu': 'Hero menü',
  'nav.catalog': 'Katalog',
  'nav.i18n': 'Diller & çeviriler',
  'nav.agency_sales': 'Acente satış',
  'nav.agency': 'Acente',
  'nav.supplier': 'Tedarikçi',
  'nav.staff': 'Personel',
  'nav.no_access': 'Bu hesap için yönetim paneli bağlantısı yok (rol / izin).',
  'nav.portal_admin': 'Yönetici',
  'nav.portal_agency': 'Acente',
  'nav.portal_supplier': 'Tedarikçi',
  'nav.portal_staff': 'Personel',
  'nav.portal_select_label': 'Görünüm',
  'nav.portal_select_aria': 'Panelde hangi kullanıcı tipi menüsünü göstereceğinizi seçin',
}

const NAV_LABEL_FALLBACK_EN: Record<string, string> = {
  'nav.admin_home': 'Admin dashboard',
  'nav.admin': 'Admin',
  'nav.hero_menu': 'Hero menu',
  'nav.catalog': 'Catalog',
  'nav.i18n': 'Languages & translations',
  'nav.agency_sales': 'Agency sales',
  'nav.agency': 'Agency',
  'nav.supplier': 'Supplier',
  'nav.staff': 'Staff',
  'nav.no_access': 'No management links for this account (role / permission).',
  'nav.portal_admin': 'Administrator',
  'nav.portal_agency': 'Agency',
  'nav.portal_supplier': 'Supplier',
  'nav.portal_staff': 'Staff',
  'nav.portal_select_label': 'View as',
  'nav.portal_select_aria': 'Choose which user-type menu to show in the panel',
}

const PORTAL_ORDER: ManagePortal[] = ['admin', 'agency', 'supplier', 'staff']

const portalLabelKey: Record<ManagePortal, string> = {
  admin: 'nav.portal_admin',
  agency: 'nav.portal_agency',
  supplier: 'nav.portal_supplier',
  staff: 'nav.portal_staff',
}

function navLabel(locale: string, key: string, t: (k: string) => string): string {
  const fromApi = t(key)
  const lang = locale.toLowerCase().startsWith('en') ? 'en' : 'tr'
  const fb = lang === 'en' ? NAV_LABEL_FALLBACK_EN : NAV_LABEL_FALLBACK_TR
  const looksLikeRawKey = (s: string) => s === key || /^nav\.[a-z_]+$/.test(s) || /^admin\.[a-z_]+$/.test(s)
  const untranslated = !fromApi || fromApi.trim() === '' || looksLikeRawKey(fromApi)
  if (!untranslated) return fromApi
  return fb[key] ?? key
}

/** Temsili rotalar — izin ve portal belirleme için */
const items = [
  { path: '/manage/admin', labelKey: 'nav.admin_home' as const },
  { path: '/manage/catalog', labelKey: 'nav.catalog' as const },
  { path: '/manage/agency/sales', labelKey: 'nav.agency_sales' as const },
  { path: '/manage/agency', labelKey: 'nav.agency' as const },
  { path: '/manage/supplier', labelKey: 'nav.supplier' as const },
  { path: '/manage/staff', labelKey: 'nav.staff' as const },
] as const

type MeSlice = {
  permissions: string[]
  roles: { role_code: string; organization_id: string | null }[]
}

type ManageSubnavProps = {
  onNavLinkClick?: () => void
}

export function ManageSubnav({ onNavLinkClick }: ManageSubnavProps) {
  const t = useManageT()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [me, setMe] = useState<MeSlice | null | 'loading'>('loading')
  const [portal, setPortal] = useState<ManagePortal | null>(null)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setMe(null)
      return
    }
    let cancelled = false
    void getAuthMe(token)
      .then((r) => {
        if (cancelled) return
        setMe({
          permissions: Array.isArray(r.permissions) ? r.permissions : [],
          roles: Array.isArray(r.roles) ? r.roles : [],
        })
      })
      .catch(() => {
        if (!cancelled) setMe(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_TOKEN_STORAGE_KEY) return
      const token = getStoredAuthToken()
      if (!token) {
        setMe(null)
        return
      }
      void getAuthMe(token)
        .then((r) => {
          setMe({
            permissions: Array.isArray(r.permissions) ? r.permissions : [],
            roles: Array.isArray(r.roles) ? r.roles : [],
          })
        })
        .catch(() => setMe(null))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const permittedItems = useMemo(() => {
    if (me === 'loading' || me === null) return []
    return items.filter((item) => canSeeManageNavPath(item.path, me.permissions, me.roles))
  }, [me])

  const availablePortals = useMemo(() => {
    const s = new Set<ManagePortal>()
    for (const item of permittedItems) {
      for (const p of pathToPortals(item.path)) s.add(p)
    }
    return PORTAL_ORDER.filter((p) => s.has(p))
  }, [permittedItems])

  const persistPortal = useCallback(
    (p: ManagePortal, permitted: typeof permittedItems) => {
      setPortal(p)
      try {
        localStorage.setItem(PORTAL_STORAGE_KEY, p)
      } catch {
        /* ignore */
      }
      const visible = permitted.filter((i) => pathToPortals(i.path).includes(p))
      const stillOk = visible.some((i) => {
        const h = vitrinPath(i.path)
        return pathname === h || pathname?.startsWith(`${h}/`)
      })
      if (!stillOk && visible[0]) {
        router.push(vitrinPath(visible[0].path))
      }
    },
    [vitrinPath, pathname, router],
  )

  useEffect(() => {
    if (availablePortals.length === 0) return
    const fromUrl = inferPortalFromPathname(pathname, vitrinPath)
    if (fromUrl && availablePortals.includes(fromUrl)) {
      setPortal(fromUrl)
      try { localStorage.setItem(PORTAL_STORAGE_KEY, fromUrl) } catch { /* ignore */ }
      return
    }
    try {
      const raw = localStorage.getItem(PORTAL_STORAGE_KEY) as ManagePortal | null
      if (raw && availablePortals.includes(raw)) {
        setPortal(raw)
        return
      }
    } catch { /* ignore */ }
    setPortal(availablePortals[0])
  }, [availablePortals, pathname, vitrinPath])

  const showEmptyHint = me !== 'loading' && me !== null && permittedItems.length === 0
  const showPortalSelect = availablePortals.length > 1

  return (
    <nav className="overflow-y-auto" aria-label="Yönetim">
      {showEmptyHint ? (
        <p className="px-5 py-2 text-sm text-[color:var(--manage-text-muted)]">
          {navLabel(locale, 'nav.no_access', t)}
        </p>
      ) : (
        <div className="flex flex-col gap-3 py-2">
          {/* Portal seçici */}
          {me !== 'loading' && availablePortals.length > 0 && portal ? (
            <div className="px-4">
              <label
                htmlFor="manage-portal-select"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-[color:var(--manage-text-muted)]"
              >
                {navLabel(locale, 'nav.portal_select_label', t)}
              </label>
              {showPortalSelect ? (
                <select
                  id="manage-portal-select"
                  value={portal}
                  aria-label={navLabel(locale, 'nav.portal_select_aria', t)}
                  onChange={(e) => persistPortal(e.target.value as ManagePortal, permittedItems)}
                  className="w-full rounded-lg border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-sidebar-bg)] px-3 py-2 text-sm font-medium text-[color:var(--manage-text)] shadow-sm focus:border-[color:var(--manage-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--manage-primary)]"
                >
                  {availablePortals.map((p) => (
                    <option key={p} value={p}>
                      {navLabel(locale, portalLabelKey[p], t)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-page-bg)] px-3 py-2 text-sm font-medium text-[color:var(--manage-text)]">
                  {navLabel(locale, portalLabelKey[portal], t)}
                </p>
              )}
            </div>
          ) : null}

          {/* Portal menüsü: her portal kendi ağaç bileşenini kullanır */}
          {portal === 'admin' ? (
            <ManageAdminNavTree onNavLinkClick={onNavLinkClick} />
          ) : portal === 'supplier' ? (
            <ManageSupplierNavTree onNavLinkClick={onNavLinkClick} />
          ) : portal === 'agency' ? (
            <ManageAgencyNavTree onNavLinkClick={onNavLinkClick} />
          ) : portal === 'staff' ? (
            <ManageStaffNavTree onNavLinkClick={onNavLinkClick} />
          ) : null}
        </div>
      )}
    </nav>
  )
}
