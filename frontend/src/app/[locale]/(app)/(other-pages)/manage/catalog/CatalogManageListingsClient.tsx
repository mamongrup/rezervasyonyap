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
import { getAuthMe, listManageCatalogListings, type ManageListingRow } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

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
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  /** Yönetici mi / org gerekli mi — getAuthMe bitmeden API çağrılmasın; yoksa ilk istek organization_id olmadan gider. */
  const [scopeReady, setScopeReady] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
        setNeedOrg(admin)
        if (admin) setOrgId(initCatalogManageOrganizationFromMe(me))
      })
      .catch(() => setNeedOrg(false))
      .finally(() => setScopeReady(true))
  }, [])

  useEffect(() => {
    setPageIndex(0)
  }, [search, pageSize])

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
        search: search.trim() || undefined,
        organizationId: needOrg ? orgId.trim() : undefined,
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
  }, [categoryCode, needOrg, orgId, search, t, locale, pageIndex, pageSize])

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

  const pageSizeSelectClass =
    'min-w-[4.25rem] appearance-none rounded-lg border border-neutral-200 bg-white py-1.5 pl-3 pr-8 text-sm tabular-nums text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {t('catalog.listings_label')} — {categoryLabelTr(categoryCode)}
      </h1>

      {needOrg ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
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

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field className="block min-w-[200px]">
          <Label>{t('catalog.search_placeholder')}</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1" />
        </Field>
        <ButtonPrimary type="button" onClick={() => void load()} disabled={loading}>
          {loading ? '…' : t('catalog.refresh')}
        </ButtonPrimary>
        <Link
          href={`${base}/listings/new`}
          className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500"
        >
          {t('catalog.new_listing')}
        </Link>
      </div>

      {err ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-2 font-medium">{t('catalog.col_title')}</th>
              <th className="px-3 py-2 font-medium">{t('catalog.col_slug')}</th>
              <th className="px-3 py-2 font-medium">{t('catalog.col_status')}</th>
              <th className="px-3 py-2 font-medium">{t('catalog.col_currency')}</th>
              <th className="px-3 py-2 font-medium">{t('catalog.col_source')}</th>
              <th className="px-3 py-2 font-medium">{t('catalog.col_created')}</th>
              <th className="px-3 py-2 font-medium">Detay</th>
              <th className="px-3 py-2 font-medium">{t('catalog.translations_link')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">
                  {t('catalog.no_rows')}
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="max-w-[220px] truncate px-3 py-2">{r.title || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.slug}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.currency_code}</td>
                <td className="px-3 py-2">{r.listing_source}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{r.created_at}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`${base}/listings/${encodeURIComponent(r.id)}`}
                    className="text-primary-600 underline dark:text-primary-400"
                  >
                    Aç
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`${base}/listings/${encodeURIComponent(r.id)}/translations`}
                    className="text-primary-600 underline dark:text-primary-400"
                  >
                    {t('catalog.translations_link')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && totalCount > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {rangeStart}–{rangeEnd}
            </span>
            {' · '}
            Toplam {totalCount} ilan
            {search.trim() ? (
              <span className="text-neutral-400">{` (arama: "${search.trim()}")`}</span>
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
                  className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
                  aria-hidden
                />
              </span>
            </label>
            <span className="text-xs text-neutral-500">
              Sayfa {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageIndex === 0 || loading}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </button>
            <button
              type="button"
              disabled={(pageIndex + 1) * pageSize >= totalCount || loading}
              onClick={() => setPageIndex((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <Link
        href={vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)}
        className="mt-6 inline-block text-sm text-primary-600 underline dark:text-primary-400"
      >
        {t('catalog.back_hub')}
      </Link>
    </div>
  )
}
