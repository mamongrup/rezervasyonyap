'use client'

import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useManageT } from '@/lib/manage-i18n-context'
import { getAuthMe, listManageCatalogListings, type ManageListingRow } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const ORG_STORAGE_KEY = 'catalog_manage_organization_id'

export default function CatalogManageListingsClient({ categoryCode }: { categoryCode: string }) {
  const t = useManageT()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<ManageListingRow[]>([])
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
        if (admin && typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(ORG_STORAGE_KEY) ?? ''
          if (saved) setOrgId(saved)
        }
      })
      .catch(() => setNeedOrg(false))
      .finally(() => setScopeReady(true))
  }, [])

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
      })
      setRows(r.listings)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('catalog.list_error'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [categoryCode, needOrg, orgId, search, t, locale])

  useEffect(() => {
    if (!scopeReady) return
    void load()
  }, [load, scopeReady])

  const saveOrg = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ORG_STORAGE_KEY, orgId.trim())
    }
    void load()
  }

  const base = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)

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

      <Link
        href={vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)}
        className="mt-6 inline-block text-sm text-primary-600 underline dark:text-primary-400"
      >
        {t('catalog.back_hub')}
      </Link>
    </div>
  )
}
