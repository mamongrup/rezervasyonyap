'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { getStoredAuthProfile, getStoredAuthToken } from '@/lib/auth-storage'
import {
  initCatalogManageOrganizationFromMe,
  writeStoredCatalogOrganizationId,
} from '@/lib/catalog-manage-organization'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useManageT } from '@/lib/manage-i18n-context'
import { getAuthMe, listManageCatalogListings, deleteManageCatalogListing, deleteManageCatalogListingsBulk, type ManageListingRow } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import clsx from 'clsx'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Languages,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

const STATUS_LABEL: Record<string, string> = {
  published: 'Yayında',
  draft: 'Taslak',
  archived: 'Arşiv',
  inactive: 'Pasif',
  pending: 'Beklemede',
}

const STATUS_CLASS: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  archived: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  inactive: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
}

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manuel',
  api: 'API',
  wtatil: 'Wtatil',
  excalibur: 'Excalibur',
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase()
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASS[key] ?? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
      )}
    >
      {STATUS_LABEL[key] ?? status}
    </span>
  )
}

function formatListingDate(iso: string): string {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function listingInitial(title: string, slug: string): string {
  const t = (title || slug || '?').trim()
  return (t[0] ?? '?').toLocaleUpperCase('tr-TR')
}

function avatarHue(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 360
  return `hsl(${h} 45% 42%)`
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
      <div className="mt-2 h-1 w-8 rounded-full" style={{ backgroundColor: accent }} />
    </div>
  )
}

export default function CatalogManageListingsClient({ categoryCode }: { categoryCode: string }) {
  const t = useManageT()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<ManageListingRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState<PageSizeOption>(50)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  const [scopeReady, setScopeReady] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setNeedOrg(false)
      setScopeReady(true)
      setLoading(false)
      return
    }
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        if (admin) {
          const resolved = initCatalogManageOrganizationFromMe(me)
          setOrgId(resolved)
          // Org ID otomatik çözüldüyse alanı gösterme
          setNeedOrg(!resolved.trim())
        }
      })
      .catch(() => setNeedOrg(false))
      .finally(() => setScopeReady(true))
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(id)
  }, [search])

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch, pageSize])

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr(t('catalog.session_missing'))
      setRows([])
      setLoading(false)
      return
    }
    if (needOrg && !orgId.trim()) {
      setErr(t('catalog.org_uuid_admin_error'))
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const r = await listManageCatalogListings(token, {
        categoryCode,
        search: debouncedSearch || undefined,
        organizationId: orgId.trim() || undefined,
        titleLocale: locale,
        page: pageIndex + 1,
        perPage: pageSize,
      })
      setRows(r.listings)
      setTotalCount(r.total)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : t('catalog.list_error'))
      setRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [categoryCode, needOrg, orgId, debouncedSearch, t, locale, pageIndex, pageSize])

  useEffect(() => {
    if (!scopeReady) return
    void load()
  }, [load, scopeReady])

  const saveOrg = () => {
    writeStoredCatalogOrganizationId(getStoredAuthProfile()?.email ?? '', orgId)
    void load()
  }

  const base = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rangeStart = totalCount === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = Math.min(totalCount, (pageIndex + 1) * pageSize)

  const pageStats = useMemo(() => {
    let published = 0
    let draft = 0
    for (const r of rows) {
      const s = r.status.toLowerCase()
      if (s === 'published') published++
      else if (s === 'draft') draft++
    }
    return { published, draft }
  }, [rows])

  const pageSizeSelectClass =
    'min-w-[4.25rem] appearance-none rounded-lg border border-neutral-200 bg-white py-1.5 pl-3 pr-8 text-sm tabular-nums text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'

  const orgParam = orgId.trim() || undefined

  /** Yönetici, tedarikçi (ilan sahibi), acente ve personel — kendi kurumlarındaki ilanları silebilir. */
  const canDeleteListings =
    scopeReady && !!getStoredAuthToken() && !(needOrg && !orgId.trim())

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    const pageIds = rows.map((r) => r.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const id of pageIds) next.delete(id)
      } else {
        for (const id of pageIds) next.add(id)
      }
      return next
    })
  }

  async function handleDeleteOne(row: ManageListingRow) {
    const token = getStoredAuthToken()
    if (!token) return
    const title = row.title?.trim() || row.slug
    if (
      !window.confirm(
        `«${title}» ilanı kalıcı olarak silinsin mi?\n\nÇeviriler, görseller ve fiyat kuralları da silinir. Rezervasyonu olan ilan silinemez.`,
      )
    ) {
      return
    }
    setDeleting(true)
    setErr(null)
    try {
      await deleteManageCatalogListing(token, row.id, orgParam)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
      await load()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'İlan silinemedi.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteSelected() {
    const token = getStoredAuthToken()
    if (!token || selectedIds.size === 0) return
    const n = selectedIds.size
    if (
      !window.confirm(
        `${n} ilan kalıcı olarak silinsin mi?\n\nRezervasyonu olan kayıtlar atlanır; diğerleri tamamen kaldırılır.`,
      )
    ) {
      return
    }
    setDeleting(true)
    setErr(null)
    try {
      const r = await deleteManageCatalogListingsBulk(token, [...selectedIds], orgParam)
      setSelectedIds(new Set())
      if (r.failed.length > 0) {
        const sample = r.failed
          .slice(0, 3)
          .map((f) => formatManageApiError(f.error))
          .join(' · ')
        setErr(
          `${r.deleted} silindi, ${r.failed.length} başarısız.${sample ? ` Örnek: ${sample}` : ''}`,
        )
      }
      await load()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'Toplu silme başarısız.')
    } finally {
      setDeleting(false)
    }
  }

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id))

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {t('catalog.listings_label')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {categoryLabelTr(categoryCode)} · {totalCount > 0 ? `${totalCount} kayıt` : 'Kayıt yok'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label={t('catalog.refresh')}
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            {t('catalog.refresh')}
          </button>
          <Link
            href={`${base}/listings/new`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            {t('catalog.new_listing')}
          </Link>
        </div>
      </div>

      {needOrg ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="block max-w-xl">
            <Label>{t('catalog.org_uuid_label')}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="a0000000-0000-4000-8000-000000000001"
                className="min-w-[280px] flex-1 font-mono text-sm"
              />
              <ButtonPrimary type="button" onClick={() => saveOrg()}>
                {t('catalog.save_load')}
              </ButtonPrimary>
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('catalog.org_uuid_hint')}</p>
          </Field>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Toplam (veritabanı)" value={totalCount} accent="#6366f1" />
        <KpiCard label="Yayında (bu sayfa)" value={pageStats.published} accent="#10b981" />
        <KpiCard label="Taslak (bu sayfa)" value={pageStats.draft} accent="#f59e0b" />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[min(100%,280px)] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('catalog.search_placeholder')}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        {canDeleteListings && selectedIds.size > 0 ? (
          <button
            type="button"
            onClick={() => void handleDeleteSelected()}
            disabled={deleting || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Seçilenleri sil ({selectedIds.size})
          </button>
        ) : null}
      </div>

      {err ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <span className="min-w-0 flex-1">{err}</span>
          <button type="button" onClick={() => setErr(null)} className="shrink-0 text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <FileText className="mb-3 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('catalog.no_rows')}</p>
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              {debouncedSearch
                ? 'Arama kriterlerini değiştirin veya yeni ilan ekleyin.'
                : 'İlk ilanı oluşturmak için «Yeni ilan» düğmesini kullanın.'}
            </p>
            <Link
              href={`${base}/listings/new`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              {t('catalog.new_listing')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/90 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-400">
                  {canDeleteListings ? (
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        aria-label="Bu sayfadaki tüm ilanları seç"
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3">{t('catalog.col_title')}</th>
                  <th className="px-4 py-3">{t('catalog.col_status')}</th>
                  <th className="px-4 py-3">{t('catalog.col_source')}</th>
                  <th className="px-4 py-3">{t('catalog.col_currency')}</th>
                  <th className="px-4 py-3">{t('catalog.col_created')}</th>
                  <th className="px-4 py-3 text-end">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {rows.map((r) => {
                  const detailHref = `${base}/listings/${encodeURIComponent(r.id)}`
                  const title = r.title?.trim() || '—'
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                    >
                      {canDeleteListings ? (
                        <td className="px-3 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelected(r.id)}
                            aria-label={`${title} seç`}
                            className="h-4 w-4 rounded border-neutral-300"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
                            style={{ backgroundColor: avatarHue(r.id) }}
                            aria-hidden
                          >
                            {listingInitial(title, r.slug)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={detailHref}
                              className="font-medium text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-neutral-200"
                            >
                              <span className="line-clamp-2">{title}</span>
                            </Link>
                            <p className="mt-0.5 truncate font-mono text-xs text-neutral-400 dark:text-neutral-500">
                              {r.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="inline-flex rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {SOURCE_LABEL[r.listing_source?.toLowerCase()] ?? r.listing_source ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="font-mono text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {r.currency_code || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs text-neutral-500 dark:text-neutral-400">
                        {formatListingDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={detailHref}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-600 dark:hover:text-neutral-200"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Detay
                          </Link>
                          <Link
                            href={`${detailHref}/translations`}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-600 dark:hover:text-neutral-200"
                          >
                            <Languages className="h-3.5 w-3.5" />
                            {t('catalog.translations_link')}
                          </Link>
                          {canDeleteListings ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteOne(r)}
                              disabled={deleting}
                              title="Kalıcı sil"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Sil
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && totalCount > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/90 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {rangeStart}–{rangeEnd}
            </span>
            {' / '}
            {totalCount} ilan
            {debouncedSearch ? (
              <span className="text-neutral-400">{` · «${debouncedSearch}»`}</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="shrink-0 text-xs text-neutral-500">Sayfa başına</span>
              <span className="relative inline-block">
                <select
                  value={pageSize}
                  disabled={loading}
                  onChange={(e) => setPageSize(Number(e.target.value) as PageSizeOption)}
                  className={pageSizeSelectClass}
                  aria-label="Sayfa başına ilan sayısı"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                  aria-hidden
                />
              </span>
            </label>
            <span className="text-xs tabular-nums text-neutral-500">
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageIndex === 0 || loading}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </button>
            <button
              type="button"
              disabled={(pageIndex + 1) * pageSize >= totalCount || loading}
              onClick={() => setPageIndex((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <Link
        href={vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)}
        className="mt-6 inline-flex text-sm text-link-muted-underline"
      >
        ← {t('catalog.back_hub')}
      </Link>
    </div>
  )
}
