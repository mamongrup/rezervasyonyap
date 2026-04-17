'use client'

import {
  createSeoRedirect,
  deleteSeoRedirect,
  listSeoRedirects,
  type UrlRedirect,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useCallback, useEffect, useState } from 'react'

export default function SeoRedirectsSection() {
  const [rows, setRows] = useState<UrlRedirect[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fromPath, setFromPath] = useState('')
  const [toPath, setToPath] = useState('')
  const [statusCode, setStatusCode] = useState('301')
  const [locale, setLocale] = useState('')
  const [orgId, setOrgId] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    try {
      const r = await listSeoRedirects(token)
      setRows(r.redirects)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'load_failed')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const fp = fromPath.trim()
    const tp = toPath.trim()
    if (!fp || !tp) return
    setBusy(true)
    try {
      const sc = parseInt(statusCode, 10)
      await createSeoRedirect(token, {
        from_path: fp,
        to_path: tp,
        status_code: Number.isFinite(sc) ? sc : 301,
        ...(locale.trim() ? { locale: locale.trim() } : {}),
        ...(orgId.trim() ? { organization_id: orgId.trim() } : {}),
      })
      setFromPath('')
      setToPath('')
      setLocale('')
      setOrgId('')
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'create_failed')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string, from: string) {
    if (!confirm(`Bu yönlendirmeyi silinsin mi?\n${from}`)) return
    const token = getStoredAuthToken()
    if (!token) return
    setDeletingId(id)
    try {
      await deleteSeoRedirect(token, id)
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'delete_failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
      <h2 className="text-lg font-medium text-neutral-900 dark:text-white">301 / 302 URL yönlendirmeleri</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Kalıcı veya geçici yönlendirme kayıtları (<code className="font-mono text-xs">url_redirects</code>). Yönetici
        oturumu gerekir.
      </p>

      {loadErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{loadErr}</p> : null}

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <Label htmlFor="seo-from">Kaynak yol</Label>
          <Input
            id="seo-from"
            className="mt-1.5 font-mono text-sm"
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
            placeholder="/eski-sayfa"
            required
            autoComplete="off"
          />
        </Field>
        <Field className="sm:col-span-2">
          <Label htmlFor="seo-to">Hedef yol</Label>
          <Input
            id="seo-to"
            className="mt-1.5 font-mono text-sm"
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
            placeholder="/yeni-sayfa"
            required
            autoComplete="off"
          />
        </Field>
        <Field>
          <Label htmlFor="seo-code">HTTP kodu</Label>
          <select
            id="seo-code"
            className="mt-1.5 block w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={statusCode}
            onChange={(e) => setStatusCode(e.target.value)}
          >
            <option value="301">301 Moved permanently</option>
            <option value="302">302 Found</option>
          </select>
        </Field>
        <Field>
          <Label htmlFor="seo-locale">Dil kodu (isteğe bağlı)</Label>
          <Input
            id="seo-locale"
            className="mt-1.5 font-mono text-sm"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            placeholder="tr"
            autoComplete="off"
          />
        </Field>
        <Field className="sm:col-span-2">
          <Label htmlFor="seo-org">Kurum UUID (isteğe bağlı)</Label>
          <Input
            id="seo-org"
            className="mt-1.5 font-mono text-xs"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder=""
            autoComplete="off"
          />
        </Field>
        <div className="sm:col-span-2">
          <ButtonPrimary type="submit" disabled={busy}>
            {busy ? '…' : 'Yönlendirme ekle'}
          </ButtonPrimary>
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
              <th className="px-3 py-2 font-medium">Kaynak</th>
              <th className="px-3 py-2 font-medium">Hedef</th>
              <th className="px-3 py-2 font-medium">Kod</th>
              <th className="px-3 py-2 font-medium">Dil</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                  Kayıt yok veya yükleniyor.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2 font-mono text-xs">{r.from_path}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.to_path}</td>
                  <td className="px-3 py-2">{r.status_code}</td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {r.locale_id ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={() => void onDelete(r.id, r.from_path)}
                      className="text-xs font-medium text-red-600 underline disabled:opacity-50 dark:text-red-400"
                    >
                      {deletingId === r.id ? '…' : 'Sil'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
