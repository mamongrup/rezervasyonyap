'use client'

import { categoryLabelTr, ORDERED_PRODUCT_CATEGORY_CODES } from '@/lib/catalog-category-ui'
import {
  listAdminAgencyCategoryGrants,
  upsertAdminAgencyCategoryGrant,
  type AdminAgencyCategoryGrantRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function AdminAgencyCategoryGrantsSection() {
  const [rows, setRows] = useState<AdminAgencyCategoryGrantRow[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [filterAgencyId, setFilterAgencyId] = useState('')
  const filterAgencyIdRef = useRef(filterAgencyId)
  filterAgencyIdRef.current = filterAgencyId
  const [formAgencyId, setFormAgencyId] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formApproved, setFormApproved] = useState(true)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    const fid = filterAgencyIdRef.current.trim()
    setLoadErr(null)
    try {
      const r = await listAdminAgencyCategoryGrants(
        token,
        fid ? { agency_organization_id: fid } : {},
      )
      setRows(r.grants)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'load_failed')
      setRows([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function submitUpsert(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const aid = formAgencyId.trim()
    const cat = formCategory.trim()
    if (!aid || !cat) return
    setBusy(true)
    try {
      await upsertAdminAgencyCategoryGrant(token, {
        agency_organization_id: aid,
        category_code: cat,
        approved: formApproved,
      })
      setFormCategory('')
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'upsert_failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleRow(r: AdminAgencyCategoryGrantRow) {
    const token = getStoredAuthToken()
    if (!token) return
    const next = r.approved !== 'true'
    setBusy(true)
    try {
      await upsertAdminAgencyCategoryGrant(token, {
        agency_organization_id: r.agency_organization_id,
        category_code: r.category_code,
        approved: next,
      })
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'toggle_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="admin-agency-grants-block"
      className="mt-10 scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Acente kategori yetkileri</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Hangi acente kurumunun hangi kategoride işlem yapabileceğini tanımlar (
        <span className="font-mono">agency_category_grants</span>); kategori, sistemdeki ürün kategorisi ile eşleşmelidir
        (ör. villa, araç kiralama, otel). Bu kurum için
        en az bir satır varsa acente ilan taraması ve <span className="font-mono">agency_organization_id</span> ile
        checkout yalnızca onaylı kategorilere izin verir; hiç satır yoksa kısıt uygulanmaz. Acente kurumu{' '}
        <span className="font-mono">org_type = agency</span> olmalıdır. İzinler:{' '}
        <span className="font-mono">admin.agency_category_grants.read</span> /{' '}
        <span className="font-mono">admin.agency_category_grants.write</span>.
      </p>
      {loadErr ? (
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200" role="alert">
          {loadErr}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field className="min-w-[14rem] flex-1">
          <Label htmlFor="acg-filter">Acente org. UUID ile süz (isteğe bağlı)</Label>
          <Input
            id="acg-filter"
            className="mt-1 font-mono text-xs"
            value={filterAgencyId}
            onChange={(e) => setFilterAgencyId(e.target.value)}
            placeholder="Boş = tümü"
          />
        </Field>
        <ButtonPrimary type="button" disabled={busy} onClick={() => void reload()}>
          {busy ? '…' : 'Listeyi yenile'}
        </ButtonPrimary>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              <th className="px-4 py-2">Acente</th>
              <th className="px-4 py-2">Kurum ID</th>
              <th className="px-4 py-2">Kategori</th>
              <th className="px-4 py-2">Onaylı</th>
              <th className="px-4 py-2 w-40" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-neutral-500">
                  Kayıt yok veya liste yüklenemedi.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2">{r.agency_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.agency_organization_id}</td>
                  <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200">
                    {categoryLabelTr(r.category_code)}
                  </td>
                  <td className="px-4 py-2">{r.approved === 'true' ? 'Evet' : 'Hayır'}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleRow(r)}
                      className="text-xs font-medium text-primary-600 underline disabled:opacity-50 dark:text-primary-400"
                    >
                      {r.approved === 'true' ? 'Reddet' : 'Onayla'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form
        className="mt-6 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-600"
        onSubmit={(e) => void submitUpsert(e)}
      >
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Yeni veya güncelle</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Field className="min-w-[14rem] flex-1">
            <Label htmlFor="acg-agency">Acente kurum UUID</Label>
            <Input
              id="acg-agency"
              required
              className="mt-1 font-mono text-xs"
              value={formAgencyId}
              onChange={(e) => setFormAgencyId(e.target.value)}
            />
          </Field>
          <Field className="min-w-[12rem] flex-1">
            <Label htmlFor="acg-cat">Kategori</Label>
            <select
              id="acg-cat"
              required
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
            >
              <option value="" disabled>
                Seçin…
              </option>
              {ORDERED_PRODUCT_CATEGORY_CODES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabelTr(c)}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formApproved}
              disabled={busy}
              onChange={(e) => setFormApproved(e.target.checked)}
            />
            Onaylı
          </label>
          <ButtonPrimary type="submit" disabled={busy}>
            {busy ? '…' : 'Kaydet'}
          </ButtonPrimary>
        </div>
      </form>
    </section>
  )
}
