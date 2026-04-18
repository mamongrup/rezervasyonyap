'use client'

import AdminMerchantIntegrationsSection from './AdminMerchantIntegrationsSection'
import AdminSupplierApplicationsSection from './AdminSupplierApplicationsSection'
import AdminProvizyonPanel from './AdminProvizyonPanel'
import AdminNotificationSettingsSection from './AdminNotificationSettingsSection'
import AdminIntegrationsSettingsSection from './AdminIntegrationsSettingsSection'
import AdminAgencyCategoryGrantsSection from './AdminAgencyCategoryGrantsSection'
import AdminAgencyProfilesSection from './AdminAgencyProfilesSection'
import AdminSocialSection from './AdminSocialSection'
import AdminSeoRedirectsSection from './AdminSeoRedirectsSection'
import AdminBannersSection from './AdminBannersSection'
import AdminBlogSection from './AdminBlogSection'
import AdminNavigationSection from './AdminNavigationSection'
import AdminMessagingSection from './AdminMessagingSection'
import AdminAiSection from './AdminAiSection'
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
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { managePanelLabel } from '@/lib/manage-panel-i18n-fallback'
import { useManageT } from '@/lib/manage-i18n-context'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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

export default function AdminManageClient() {
  const t = useManageT()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [search, setSearch] = useState('')
  const [grantRole, setGrantRole] = useState('customer')
  const [grantOrgId, setGrantOrgId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  function pairKey(roleCode: string, permCode: string) {
    return `${roleCode}\t${permCode}`
  }

  function hasRolePermission(
    entries: AdminRolePermissionEntry[],
    roleCode: string,
    permCode: string,
  ) {
    return entries.some((e) => e.role_code === roleCode && e.permission_code === permCode)
  }

  const loadRolesForUser = useCallback(
    async (token: string, userId: string) => {
      const r = await getAdminUserRoles(token, userId)
      setState((prev) =>
        prev.kind === 'ok'
          ? { ...prev, selectedUserId: userId, roles: r.roles }
          : prev,
      )
    },
    [],
  )

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
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
      const first =
        catalogRes.roles.find((r) => r.code === 'customer')?.code ?? catalogRes.roles[0]?.code ?? 'customer'
      setGrantRole(first)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'load_failed'
      setState({ kind: 'err', msg })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function applySearch() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setBusy('search')
    try {
      const usersRes = await listAdminUsers(token, search.trim() || undefined)
      setState((prev) =>
        prev.kind === 'ok' ? { ...prev, users: usersRes.users } : prev,
      )
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
      setState((prev) =>
        prev.kind === 'ok'
          ? { ...prev, roles: r.roles }
          : prev,
      )
      const auditRes = await listAdminAuditLog(token)
      setState((prev) =>
        prev.kind === 'ok' ? { ...prev, audit: auditRes.events } : prev,
      )
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
      setState((prev) =>
        prev.kind === 'ok'
          ? { ...prev, roles: r.roles }
          : prev,
      )
      setGrantOrgId('')
      const auditRes = await listAdminAuditLog(token)
      setState((prev) =>
        prev.kind === 'ok' ? { ...prev, audit: auditRes.events } : prev,
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'grant_failed')
    } finally {
      setBusy(null)
    }
  }

  if (state.kind === 'loading') {
    return <p className="text-neutral-600 dark:text-neutral-400">Yükleniyor…</p>
  }

  if (state.kind === 'no_token') {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-neutral-700 dark:text-neutral-300">Yönetici paneli için önce giriş yapın.</p>
        <Link
          href={vitrinPath('/login')}
          className="mt-4 inline-block font-medium text-primary-600 underline dark:text-primary-400"
        >
          Giriş sayfası
        </Link>
      </div>
    )
  }

  if (state.kind === 'err') {
    const isForbidden = state.msg === 'not_admin' || state.msg === 'forbidden'
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-red-700 dark:text-red-300">
          {isForbidden
            ? 'Bu sayfa için gerekli yönetici izinleri yok veya oturum geçersiz. İlk yükleme tipik olarak `admin.users.read`, `admin.audit.read` ve izin matrisi için `admin.permissions.read` gerektirir; gömülü genel ayarlar için ayrıca `admin.integrations.write` (NetGSM / sanal POS) gibi kodlar kullanılabilir.'
            : state.msg}
        </p>
        {!isForbidden ? (
          <button type="button" onClick={() => void load()} className="mt-4 text-sm underline">
            Tekrar dene
          </button>
        ) : null}
      </div>
    )
  }

  const { catalog, users, audit, selectedUserId, roles, permCatalog, rolePermEntries, matrixInstalled, matrixLoadErr } =
    state

  async function toggleMatrixCell(roleCode: string, permissionCode: string, checked: boolean) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok' || !matrixInstalled) return
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
          ? {
              ...prev,
              rolePermEntries: rp.entries,
              matrixInstalled: Boolean(rp.matrix_installed ?? prev.matrixInstalled),
              audit: auditRes.events,
            }
          : prev,
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'matrix_update_failed')
    } finally {
      setBusy(null)
    }
  }

  const manageAdminHref = vitrinPath('/manage/admin')
  const settingsHref = vitrinPath('/manage/admin/settings')
  const toolsHref = vitrinPath('/manage/admin/tools')

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        {managePanelLabel(locale, 'admin.overview_title', t)}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {managePanelLabel(locale, 'admin.overview_intro_lead', t)}{' '}
        <Link href={settingsHref} className="font-medium text-primary-600 underline dark:text-primary-400">
          {managePanelLabel(locale, 'admin.hub_nav_settings', t)}
        </Link>{' '}
        {managePanelLabel(locale, 'admin.overview_intro_after_settings', t)}{' '}
        <Link href={toolsHref} className="font-medium text-primary-600 underline dark:text-primary-400">
          {managePanelLabel(locale, 'admin.hub_nav_tools', t)}
        </Link>{' '}
        {managePanelLabel(locale, 'admin.overview_intro_after_tools', t)}
      </p>

      <section
        className="mt-8 rounded-xl border border-primary-200/80 bg-primary-50/40 p-5 dark:border-primary-900/50 dark:bg-primary-950/20"
        aria-label="Kontrol paneli özeti"
      >
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Kontrol paneli — nerede ne var?</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Aşağıdaki bağlantılar bu sayfadaki bloklara kaydırır. Üst şeritte <strong className="font-medium">Katalog</strong>,{' '}
          <strong className="font-medium">Hero menü</strong>, <strong className="font-medium">Diller</strong> vb. ayrı
          sayfalara gider.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Bu sayfa (Yönetici)
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
              <li>
                <Link href={settingsHref} className="text-primary-600 underline dark:text-primary-400">
                  {managePanelLabel(locale, 'admin.overview_summary_settings', t)}
                </Link>{' '}
                {managePanelLabel(locale, 'admin.overview_summary_settings_desc', t)}
              </li>
              <li>
                <Link href={toolsHref} className="text-primary-600 underline dark:text-primary-400">
                  {managePanelLabel(locale, 'admin.hub_nav_tools', t)}
                </Link>{' '}
                {managePanelLabel(locale, 'admin.overview_summary_tools_desc', t)}
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-banners-block`} className="text-primary-600 underline dark:text-primary-400">
                  Banner yerleşimleri
                </a>
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-blog-block`} className="text-primary-600 underline dark:text-primary-400">
                  Blog
                </a>{' '}
                — kategoriler ve yazılar
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-navigation-block`} className="text-primary-600 underline dark:text-primary-400">
                  Menü, anasayfa düzeni, popup
                </a>{' '}
                — “sayfa” içerikleri ve vitrin
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-messaging-block`} className="text-primary-600 underline dark:text-primary-400">
                  E-posta / bildirim şablonları
                </a>
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-ai-block`} className="text-primary-600 underline dark:text-primary-400">
                  Yapay zeka
                </a>{' '}
                — sağlayıcılar ve iş kuyruğu
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-merchant-block`} className="text-primary-600 underline dark:text-primary-400">
                  Merchant / Instagram
                </a>
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-seo-block`} className="text-primary-600 underline dark:text-primary-400">
                  SEO yönlendirme &amp; 404
                </a>
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-social-block`} className="text-primary-600 underline dark:text-primary-400">
                  Sosyal paylaşım
                </a>
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-agency-grants-block`} className="text-primary-600 underline dark:text-primary-400">
                  Acente — kategori yetkileri
                </a>
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-agency-profiles-block`} className="text-primary-600 underline dark:text-primary-400">
                  Acente profilleri / belgeler
                </a>
              </li>
              <li>
                <a href={`${manageAdminHref}#admin-access-block`} className="text-primary-600 underline dark:text-primary-400">
                  Kullanıcılar, roller, izin matrisi
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Diğer yönetim sayfaları
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
              <li>
                <Link href={vitrinPath('/manage/catalog')} className="text-primary-600 underline dark:text-primary-400">
                  Katalog
                </Link>{' '}
                — ürün kategorileri (kod bazında), ilanlar, çeviri ve özellikler
              </li>
              <li>
                <Link href={vitrinPath('/manage/hero-menu')} className="text-primary-600 underline dark:text-primary-400">
                  Hero menü
                </Link>{' '}
                — anasayfa üst vitrin menüsü
              </li>
              <li>
                <Link href={vitrinPath('/manage/i18n')} className="text-primary-600 underline dark:text-primary-400">
                  Diller &amp; çeviriler
                </Link>
              </li>
              <li>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Rezervasyonlar</span> — tek bir “tüm
                rezervasyonlar” ekranı yok; kuruma göre:{' '}
                <Link href={vitrinPath('/manage/staff')} className="text-primary-600 underline dark:text-primary-400">
                  Personel
                </Link>
                ,{' '}
                <Link href={vitrinPath('/manage/agency')} className="text-primary-600 underline dark:text-primary-400">
                  Acente
                </Link>
                ,{' '}
                <Link href={vitrinPath('/manage/supplier')} className="text-primary-600 underline dark:text-primary-400">
                  Tedarikçi
                </Link>{' '}
                (satış testi:{' '}
                <Link href={vitrinPath('/manage/agency/sales')} className="text-primary-600 underline dark:text-primary-400">
                  Acente satış
                </Link>
                ).
              </li>
              <li>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Coğrafi bölgeler</span> — ayrı bir
                “bölgeler” yönetim sayfası bu arayüzde yok; konum bilgisi ilanlar ve katalog verisiyle ilişkilidir. AI
                iş kuyruğunda bölgeyle ilgili üretim varsa{' '}
                <a href={`${manageAdminHref}#admin-ai-block`} className="text-primary-600 underline dark:text-primary-400">
                  AI bölümü
                </a>
                nden takip edilir.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div id="admin-banners-block" className="scroll-mt-24" />
      <AdminBannersSection />

      <div id="admin-blog-block" className="scroll-mt-24" />
      <AdminBlogSection />

      <div id="admin-navigation-block" className="scroll-mt-24" />
      <AdminNavigationSection />

      <div id="admin-messaging-block" className="scroll-mt-24" />
      <AdminMessagingSection />

      <div id="admin-ai-block" className="scroll-mt-24" />
      <AdminAiSection />

      <div id="admin-merchant-block" className="scroll-mt-24" />
      <AdminMerchantIntegrationsSection />

      <div id="admin-seo-block" className="scroll-mt-24" />
      <AdminSeoRedirectsSection />

      <AdminSupplierApplicationsSection />

      <div id="admin-integrations-block" className="scroll-mt-24" />
      <AdminIntegrationsSettingsSection />

      <div id="admin-notifications-block" className="scroll-mt-24" />
      <AdminNotificationSettingsSection />

      <div id="admin-provizyon-block" className="scroll-mt-24" />
      <AdminProvizyonPanel />

      <div id="admin-agency-grants-block" className="scroll-mt-24" />
      <AdminAgencyCategoryGrantsSection />

      <div id="admin-agency-profiles-block" className="scroll-mt-24" />
      <AdminAgencyProfilesSection />

      <div id="admin-social-block" className="scroll-mt-24" />
      <AdminSocialSection />

      <div id="admin-access-block" className="scroll-mt-24 my-12 border-t border-neutral-200 dark:border-neutral-700" />

      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Erişim — kullanıcılar ve roller</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Rol atamaları, rol × izin matrisi ve denetim günlüğü. Kullanıcıya kurum bağlı rol için `organization_id` girin;
        platform geneli için boş bırakın.
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">Rol × izin matrisi</h2>
        {matrixLoadErr ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            İzin listesi yüklenemedi ({matrixLoadErr}). `admin.permissions.read` gerekir.
          </p>
        ) : null}
        {!matrixInstalled && !matrixLoadErr ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            Veritabanında izin tabloları yok (189). Matris salt okunur önizleme; değişiklik için migration
            uygulayın.
          </p>
        ) : null}
        {permCatalog.length === 0 && !matrixLoadErr ? (
          <p className="mt-2 text-sm text-neutral-500">İzin kataloğu boş.</p>
        ) : permCatalog.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="sticky left-0 z-10 border-b border-neutral-200 bg-neutral-50 px-2 py-2 dark:border-neutral-700 dark:bg-neutral-800/80">
                    Rol
                  </th>
                  {permCatalog.map((p) => (
                    <th
                      key={p.code}
                      title={p.description}
                      className="max-w-[8rem] border-b border-l border-neutral-200 px-1 py-2 align-bottom font-mono text-[10px] leading-tight text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      {p.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.map((row) => (
                  <tr key={row.code} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="sticky left-0 z-10 bg-white px-2 py-1 font-mono text-xs dark:bg-neutral-900">
                      {row.code}
                    </td>
                    {permCatalog.map((p) => {
                      const on = hasRolePermission(rolePermEntries, row.code, p.code)
                      const cellBusy = busy === `matrix-${pairKey(row.code, p.code)}`
                      return (
                        <td key={p.code} className="border-l border-neutral-100 px-1 py-1 text-center dark:border-neutral-800">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary-600"
                            checked={on}
                            disabled={!matrixInstalled || cellBusy}
                            title={matrixInstalled ? p.description : 'Migration gerekli'}
                            onChange={(e) => void toggleMatrixCell(row.code, p.code, e.target.checked)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">Kullanıcılar</h2>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void applySearch()
          }}
        >
          <Field className="min-w-[12rem] grow">
            <Label>E-posta veya ad (isteğe bağlı)</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Örn. @ veya ad"
              className="mt-1"
            />
          </Field>
          <ButtonPrimary type="submit" disabled={busy === 'search'}>
            {busy === 'search' ? '…' : 'Ara'}
          </ButtonPrimary>
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
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-neutral-500">
                    Sonuç yok.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className={
                      'border-t border-neutral-100 dark:border-neutral-800 ' +
                      (selectedUserId === u.id ? 'bg-primary-50/50 dark:bg-primary-950/20' : '')
                    }
                  >
                    <td className="px-4 py-2 font-mono text-xs">{u.email || '—'}</td>
                    <td className="px-4 py-2">{u.display_name || '—'}</td>
                    <td className="px-4 py-2 text-xs text-neutral-600">{u.created_at}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        disabled={busy?.startsWith('select-')}
                        onClick={() => void selectUser(u.id)}
                        className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
                      >
                        {selectedUserId === u.id ? 'Seçili' : 'Seç'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Seçili kullanıcının rolleri</h2>
        {!selectedUserId ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            Yukarıdan bir kullanıcı seçin.
          </p>
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
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-neutral-500">
                        Rol yok.
                      </td>
                    </tr>
                  ) : (
                    roles.map((r, i) => (
                      <tr key={`${r.role_code}-${r.organization_id ?? 'null'}-${i}`} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="px-4 py-2 font-mono text-xs">{r.role_code}</td>
                        <td className="px-4 py-2 font-mono text-xs">{r.organization_id ?? '—'}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            disabled={busy === 'revoke'}
                            onClick={() => void revoke(r.role_code, r.organization_id)}
                            className="text-sm text-red-600 underline dark:text-red-400"
                          >
                            Kaldır
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <form onSubmit={grant} className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <Field className="min-w-[10rem]">
                <Label>Rol ekle</Label>
                <select
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  value={grantRole}
                  onChange={(e) => setGrantRole(e.target.value)}
                >
                  {catalog.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.description}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className="min-w-[14rem] grow">
                <Label>Kurum UUID (isteğe bağlı)</Label>
                <Input
                  value={grantOrgId}
                  onChange={(e) => setGrantOrgId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="mt-1 font-mono text-xs"
                />
              </Field>
              <ButtonPrimary type="submit" disabled={busy === 'grant'}>
                {busy === 'grant' ? '…' : 'Rol ver'}
              </ButtonPrimary>
            </form>
          </>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Denetim günlüğü (son kayıtlar)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Rol verme/kaldırma işlemleri burada listelenir.
        </p>
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
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-neutral-500">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                audit.map((ev) => (
                  <tr key={ev.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 text-xs text-neutral-600">{ev.created_at}</td>
                    <td className="px-4 py-2 font-mono text-xs">{ev.action}</td>
                    <td className="px-4 py-2">{ev.target_type}</td>
                    <td className="px-4 py-2 font-mono text-xs">{ev.user_id ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{ev.organization_id ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
