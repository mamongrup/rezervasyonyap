'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  getAdminUserRoles,
  listAdminUsers,
  updateAdminUserRole,
  type AdminRoleAssignment,
  type AdminUserRow,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type RoleFilter = 'all' | 'customer' | 'agency' | 'supplier' | 'staff' | 'admin'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  agency: 'Acente',
  supplier: 'Tedarikçi',
  staff: 'Personel',
  customer: 'Müşteri',
}

const ROLE_CLASSES: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  agency: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  supplier: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  staff: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  customer: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', ROLE_CLASSES[role] ?? ROLE_CLASSES.customer)}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function TcBadge({ verified }: { verified?: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <BadgeCheck className="h-3 w-3" />
        TC ✓
      </span>
    )
  }
  return (
    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-400 dark:bg-neutral-800">
      Doğrulanmadı
    </span>
  )
}

// Row with expandable role editor
function UserRow({
  user,
  token,
  onRefresh,
}: {
  user: AdminUserRow
  token: string
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [roles, setRoles] = useState<AdminRoleAssignment[] | null>(null)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true)
    try {
      const res = await getAdminUserRoles(token, user.id)
      setRoles(res.roles)
    } finally {
      setLoadingRoles(false)
    }
  }, [token, user.id])

  const handleExpand = () => {
    setExpanded((v) => !v)
    if (!expanded && roles === null) {
      void loadRoles()
    }
  }

  const toggleRole = useCallback(
    async (roleCode: string, hasRole: boolean) => {
      setUpdatingRole(roleCode)
      try {
        const res = await updateAdminUserRole(token, {
          user_id: user.id,
          role_code: roleCode,
          op: hasRole ? 'revoke' : 'grant',
        })
        setRoles(res.roles)
      } finally {
        setUpdatingRole(null)
      }
    },
    [token, user.id],
  )

  const AVAILABLE_ROLES = ['admin', 'agency', 'supplier', 'staff']

  return (
    <>
      <tr
        className={clsx(
          'cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40',
          expanded && 'bg-neutral-50 dark:bg-neutral-800/40',
        )}
        onClick={handleExpand}
      >
        <td className="py-3 pl-5">
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {user.display_name || '—'}
            </p>
            <p className="text-xs text-neutral-400">{user.email}</p>
          </div>
        </td>
        <td className="py-3">
          {/* TC doğrulama durumu — backend'den geldiğinde user.tc_verified kullanılır */}
          <TcBadge verified={(user as { tc_verified?: boolean }).tc_verified} />
        </td>
        <td className="py-3 text-xs text-neutral-400">
          {new Date(user.created_at).toLocaleDateString('tr-TR')}
        </td>
        <td className="py-3 pr-5 text-right">
          <button type="button" className="text-neutral-400 hover:text-neutral-600">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-neutral-50 dark:bg-neutral-800/40">
          <td colSpan={4} className="border-b border-neutral-100 px-5 pb-4 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1 text-xs font-medium text-neutral-500">
                <Shield className="h-3.5 w-3.5" />
                Roller:
              </div>
              {loadingRoles ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              ) : (
                AVAILABLE_ROLES.map((roleCode) => {
                  const hasRole = roles?.some((r) => r.role_code === roleCode) ?? false
                  return (
                    <button
                      key={roleCode}
                      type="button"
                      disabled={updatingRole === roleCode}
                      onClick={(e) => {
                        e.stopPropagation()
                        void toggleRole(roleCode, hasRole)
                      }}
                      className={clsx(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                        hasRole
                          ? (ROLE_CLASSES[roleCode] ?? '') + ' ring-1 ring-inset ring-current'
                          : 'border border-neutral-200 text-neutral-400 hover:border-neutral-400 dark:border-neutral-700',
                      )}
                    >
                      {updatingRole === roleCode
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : null}
                      {ROLE_LABELS[roleCode] ?? roleCode}
                    </button>
                  )
                })
              )}
              <p className="ml-auto text-xs text-neutral-400">
                ID: <span className="font-mono">{user.id.slice(0, 8)}…</span>
              </p>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MembersPageClient({ roleFilter = 'all' }: { roleFilter?: RoleFilter }) {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<RoleFilter>(roleFilter)

  const token = getStoredAuthToken() ?? ''

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAdminUsers(token, search.trim() || undefined)
      setUsers(res.users)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Üyeler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token, search])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return users
    // We don't have role info in the user row — show all users when no filter
    // In a real implementation, the API would support role filtering
    return users
  }, [users, activeFilter])

  const PAGE_TITLES: Record<RoleFilter, string> = {
    all: 'Tüm Üyeler',
    customer: 'Müşteriler',
    agency: 'Acenteler',
    supplier: 'Tedarikçiler',
    staff: 'Personel',
    admin: 'Yöneticiler',
  }

  const PAGE_DESCRIPTIONS: Record<RoleFilter, string> = {
    all: 'Tüm kayıtlı kullanıcılar. Rol atamaları için bir satıra tıklayın.',
    customer: 'Müşteri rolündeki kullanıcılar.',
    agency: 'Acente rolündeki kullanıcılar.',
    supplier: 'Tedarikçi rolündeki kullanıcılar.',
    staff: 'Personel rolündeki kullanıcılar.',
    admin: 'Yönetici rolündeki kullanıcılar.',
  }

  const exportCsv = () => {
    const rows = [
      ['Ad Soyad', 'E-posta', 'Kayıt tarihi'],
      ...filtered.map((u) => [u.display_name, u.email, new Date(u.created_at).toLocaleDateString('tr-TR')]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    a.download = `uyeler-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Başlık */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {PAGE_TITLES[activeFilter]}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{PAGE_DESCRIPTIONS[activeFilter]}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {/* Rol Sekmeler */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['all', 'customer', 'agency', 'supplier', 'staff', 'admin'] as RoleFilter[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setActiveFilter(r)}
            className={clsx(
              'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === r
                ? 'bg-[color:var(--manage-primary)] text-white'
                : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400',
            )}
          >
            {PAGE_TITLES[r]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          placeholder="Ad veya e-posta ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load()}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <Users className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">
              {users.length === 0 ? 'Henüz üye yok.' : 'Arama ile eşleşen üye bulunamadı.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                <th className="py-3 pl-5 text-left">Üye</th>
                <th className="py-3 text-left">TC Doğrulama</th>
                <th className="py-3 text-left">Kayıt tarihi</th>
                <th className="py-3 pr-5 text-right">Roller</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <UserRow key={u.id} user={u} token={token} onRefresh={load} />
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        {filtered.length} üye{filtered.length !== users.length ? ` / toplam ${users.length}` : ''}
        {' '}— Rol değiştirmek için satıra tıklayın.
      </p>
    </div>
  )
}
