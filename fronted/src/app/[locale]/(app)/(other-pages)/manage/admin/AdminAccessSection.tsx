'use client'

import {
  getAdminUserRoles,
  listAdminAuditLog,
  listAdminPermissions,
  listAdminRolePermissions,
  listAdminUsers,
  listRoles,
  updateAdminRolePermission,
  updateAdminUserRole,
  type AdminPermissionCatalogEntry,
  type AdminRoleAssignment,
  type AdminRolePermissionEntry,
  type AdminUserRow,
  type AdminAuditEvent,
  type RoleCatalogEntry,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useCallback, useEffect, useState } from 'react'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'err'; msg: string }
  | {
      kind: 'ok'
      catalog: RoleCatalogEntry[]
      users: AdminUserRow[]
      audit: AdminAuditEvent[]
      selectedUserId: string | null
      roles: AdminRoleAssignment[]
      permCatalog: AdminPermissionCatalogEntry[]
      rolePermEntries: AdminRolePermissionEntry[]
      matrixInstalled: boolean
      matrixLoadErr: string | null
    }

export default function AdminAccessSection() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [search, setSearch] = useState('')
  const [grantRole, setGrantRole] = useState('customer')
  const [grantOrgId, setGrantOrgId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  function pairKey(roleCode: string, permCode: string) {
    return `${roleCode}\t${permCode}`
  }

  function hasRolePermission(entries: AdminRolePermissionEntry[], roleCode: string, permCode: string) {
    return entries.some((e) => e.role_code === roleCode && e.permission_code === permCode)
  }

  const loadRolesForUser = useCallback(async (token: string, userId: string) => {
    const r = await getAdminUserRoles(token, userId)
    setState((prev) =>
      prev.kind === 'ok' ? { ...prev, selectedUserId: userId, roles: r.roles } : prev,
    )
  }, [])

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) { setState({ kind: 'no_token' }); return }
    setState({ kind: 'loading' })
    try {
      const [catalogRes, usersRes, auditRes] = await Promise.all([
        listRoles(),
        listAdminUsers(token),
        listAdminAuditLog(token),
      ])
      let permCatalog: AdminPermissionCatalogEntry[] = []
      let rolePermEntries: AdminRolePermissionEntry[] = []
      let matrixInstalled = false
      let matrixLoadErr: string | null = null
      try {
        const [p, rp] = await Promise.all([listAdminPermissions(token), listAdminRolePermissions(token)])
        permCatalog = p.permissions
        rolePermEntries = rp.entries
        matrixInstalled = Boolean(rp.matrix_installed ?? p.matrix_installed)
      } catch (e) {
        matrixLoadErr = e instanceof Error ? e.message : 'matrix_load_failed'
      }
      setState({
        kind: 'ok',
        catalog: catalogRes.roles,
        users: usersRes.users,
        audit: auditRes.events,
        selectedUserId: null,
        roles: [],
        permCatalog,
        rolePermEntries,
        matrixInstalled,
        matrixLoadErr,
      })
      const first = catalogRes.roles.find((r) => r.code === 'customer')?.code ?? catalogRes.roles[0]?.code ?? 'customer'
      setGrantRole(first)
    } catch (e) {
      setState({ kind: 'err', msg: e instanceof Error ? e.message : 'load_failed' })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function applySearch() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setBusy('search')
    try {
      const usersRes = await listAdminUsers(token, search.trim() || undefined)
      setState((prev) => prev.kind === 'ok' ? { ...prev, users: usersRes.users } : prev)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'search_failed')
    } finally {
      setBusy(null)
    }
  }

  async function selectUser(userId: string) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setBusy(`select-${userId}`)
    try {
      await loadRolesForUser(token, userId)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'roles_failed')
    } finally {
      setBusy(null)
    }
  }

  async function revoke(role_code: string, organization_id: string | null) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok' || !state.selectedUserId) return
    if (!confirm('Bu rol atamasını kaldırmak istediğinize emin misiniz?')) return
    setBusy('revoke')
    try {
      const r = await updateAdminUserRole(token, {
        user_id: state.selectedUserId,
        role_code,
        ...(organization_id ? { organization_id } : {}),
        op: 'revoke',
      })
      setState((prev) => prev.kind === 'ok' ? { ...prev, roles: r.roles } : prev)
      const auditRes = await listAdminAuditLog(token)
      setState((prev) => prev.kind === 'ok' ? { ...prev, audit: auditRes.events } : prev)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'revoke_failed')
    } finally {
      setBusy(null)
    }
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok' || !state.selectedUserId) return
    setBusy('grant')
    try {
      const r = await updateAdminUserRole(token, {
        user_id: state.selectedUserId,
        role_code: grantRole,
        ...(grantOrgId.trim() ? { organization_id: grantOrgId.trim() } : {}),
        op: 'grant',
      })
      setState((prev) => prev.kind === 'ok' ? { ...prev, roles: r.roles } : prev)
      setGrantOrgId('')
      const auditRes = await listAdminAuditLog(token)
      setState((prev) => prev.kind === 'ok' ? { ...prev, audit: auditRes.events } : prev)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'grant_failed')
    } finally {
      setBusy(null)
    }
  }

  async function toggleMatrixCell(roleCode: string, permissionCode: string, checked: boolean) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok' || !state.matrixInstalled) return
    const key = pairKey(roleCode, permissionCode)
    setBusy(`matrix-${key}`)
    try {
      await updateAdminRolePermission(token, {
        role_code: roleCode,
        permission_code: permissionCode,
        op: checked ? 'grant' : 'revoke',
      })
      const rp = await listAdminRolePermissions(token)
      const auditRes = await listAdminAuditLog(token)
      setState((prev) =>
        prev.kind === 'ok'
          ? { ...prev, rolePermEntries: rp.entries, matrixInstalled: Boolean(rp.matrix_installed ?? prev.matrixInstalled), audit: auditRes.events }
          : prev,
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'matrix_update_failed')
    } finally {
      setBusy(null)
    }
  }

  if (state.kind === 'loading') return <p className="p-6 text-neutral-500">Yükleniyor…</p>
  if (state.kind === 'no_token') return <p className="p-6 text-neutral-500">Yönetici girişi gerekli.</p>
  if (state.kind === 'err') return (
    <div className="p-6">
      <p className="text-red-600 dark:text-red-400 text-sm">{state.msg}</p>
      <button type="button" onClick={() => void load()} className="mt-3 text-sm underline text-primary-600">Tekrar dene</button>
    </div>
  )

  const { catalog, users, audit, selectedUserId, roles, permCatalog, rolePermEntries, matrixInstalled, matrixLoadErr } = state

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Erişim — Kullanıcılar & Roller</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Rol atamaları, rol × izin matrisi ve denetim günlüğü.
        </p>
      </div>

      {/* Rol × İzin Matrisi */}
      <section className="rounded-xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-6 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Rol × İzin Matrisi</h2>
        {matrixLoadErr && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            İzin listesi yüklenemedi ({matrixLoadErr}). <code className="font-mono">admin.permissions.read</code> gerekir.
          </p>
        )}
        {!matrixInstalled && !matrixLoadErr && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Veritabanında izin tabloları yok (migration 189). Önce migration uygulayın.
          </p>
        )}
        {permCatalog.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="sticky left-0 z-10 border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/80">Rol</th>
                  {permCatalog.map((p) => (
                    <th key={p.code} title={p.description}
                      className="max-w-[8rem] border-b border-l border-neutral-200 px-1 py-2 align-bottom font-mono text-[10px] leading-tight text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                      {p.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.map((row) => (
                  <tr key={row.code} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-xs dark:bg-neutral-900">{row.code}</td>
                    {permCatalog.map((p) => {
                      const on = hasRolePermission(rolePermEntries, row.code, p.code)
                      const cellBusy = busy === `matrix-${pairKey(row.code, p.code)}`
                      return (
                        <td key={p.code} className="border-l border-neutral-100 px-1 py-2 text-center dark:border-neutral-800">
                          <input type="checkbox" className="h-4 w-4 accent-primary-600"
                            checked={on} disabled={!matrixInstalled || cellBusy}
                            title={matrixInstalled ? p.description : 'Migration gerekli'}
                            onChange={(e) => void toggleMatrixCell(row.code, p.code, e.target.checked)} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Kullanıcı Arama */}
      <section className="rounded-xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-6 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Kullanıcılar</h2>
        <form className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => { e.preventDefault(); void applySearch() }}>
          <Field className="min-w-[12rem] grow">
            <Label>E-posta veya ad ara</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="@ veya ad" className="mt-1" />
          </Field>
          <ButtonPrimary type="submit" disabled={busy === 'search'}>{busy === 'search' ? '…' : 'Ara'}</ButtonPrimary>
        </form>

        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">E-posta</th>
                <th className="px-4 py-2">Ad</th>
                <th className="px-4 py-2">Kayıt</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-neutral-400">Sonuç yok.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className={'border-t border-neutral-100 dark:border-neutral-800 ' + (selectedUserId === u.id ? 'bg-primary-50/50 dark:bg-primary-950/20' : '')}>
                  <td className="px-4 py-2 font-mono text-xs">{u.email || '—'}</td>
                  <td className="px-4 py-2">{u.display_name || '—'}</td>
                  <td className="px-4 py-2 text-xs text-neutral-500">{u.created_at}</td>
                  <td className="px-4 py-2">
                    <button type="button" disabled={busy?.startsWith('select-')}
                      onClick={() => void selectUser(u.id)}
                      className="text-sm font-medium text-primary-600 underline dark:text-primary-400">
                      {selectedUserId === u.id ? 'Seçili' : 'Seç'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Seçili Kullanıcı Rolleri */}
      <section className="rounded-xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-6 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Seçili Kullanıcının Rolleri</h2>
        {!selectedUserId ? (
          <p className="mt-3 text-sm text-neutral-500">Yukarıdan bir kullanıcı seçin.</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-2">Rol</th>
                    <th className="px-4 py-2">Kurum ID</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-neutral-400">Rol yok.</td></tr>
                  ) : roles.map((r, i) => (
                    <tr key={`${r.role_code}-${r.organization_id ?? 'null'}-${i}`} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-4 py-2 font-mono text-xs">{r.role_code}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.organization_id ?? '—'}</td>
                      <td className="px-4 py-2">
                        <button type="button" disabled={busy === 'revoke'}
                          onClick={() => void revoke(r.role_code, r.organization_id)}
                          className="text-sm text-red-600 underline dark:text-red-400">Kaldır</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form onSubmit={grant} className="mt-5 flex flex-wrap items-end gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
              <Field className="min-w-[10rem]">
                <Label>Rol ekle</Label>
                <select className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  value={grantRole} onChange={(e) => setGrantRole(e.target.value)}>
                  {catalog.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
                  ))}
                </select>
              </Field>
              <Field className="min-w-[14rem] grow">
                <Label>Kurum UUID (isteğe bağlı)</Label>
                <Input value={grantOrgId} onChange={(e) => setGrantOrgId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="mt-1 font-mono text-xs" />
              </Field>
              <ButtonPrimary type="submit" disabled={busy === 'grant'}>{busy === 'grant' ? '…' : 'Rol Ver'}</ButtonPrimary>
            </form>
          </>
        )}
      </section>

      {/* Denetim Günlüğü */}
      <section className="rounded-xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-6 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Denetim Günlüğü</h2>
        <p className="mt-1 text-xs text-neutral-500">Son rol verme/kaldırma işlemleri</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">Zaman</th>
                <th className="px-4 py-2">İşlem</th>
                <th className="px-4 py-2">Hedef</th>
                <th className="px-4 py-2">Kullanıcı</th>
                <th className="px-4 py-2">Kurum</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-400">Kayıt yok.</td></tr>
              ) : audit.map((ev) => (
                <tr key={ev.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2 text-xs text-neutral-500">{ev.created_at}</td>
                  <td className="px-4 py-2 font-mono text-xs">{ev.action}</td>
                  <td className="px-4 py-2 text-xs">{ev.target_type}</td>
                  <td className="px-4 py-2 font-mono text-xs">{ev.user_id ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{ev.organization_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
