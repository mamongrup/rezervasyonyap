'use client'

import {
  createBannerPlacement,
  deleteBannerPlacement,
  listBannerPlacements,
  patchBannerPlacement,
  type BannerPlacement,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

export default function AdminBannersSection() {
  const [rows, setRows] = useState<BannerPlacement[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [filterOrg, setFilterOrg] = useState('')
  const [filterLocale, setFilterLocale] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')

  const [newCode, setNewCode] = useState('home_hero')
  const [newImg, setNewImg] = useState('')
  const [newOrg, setNewOrg] = useState('')
  const [newLocale, setNewLocale] = useState('')
  const [newLink, setNewLink] = useState('')
  const [newActive, setNewActive] = useState(true)

  const [editId, setEditId] = useState<string | null>(null)
  const [editImg, setEditImg] = useState('')
  const [editLink, setEditLink] = useState('')
  const [editActive, setEditActive] = useState(true)

  const refresh = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    try {
      const r = await listBannerPlacements(token, {
        ...(filterOrg.trim() ? { organization_id: filterOrg.trim() } : {}),
        ...(filterLocale.trim() ? { locale: filterLocale.trim() } : {}),
        ...(filterActive === 'all' ? {} : { active: filterActive === 'true' }),
      })
      setRows(r.placements)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'banners_load_failed')
    }
  }, [filterOrg, filterLocale, filterActive])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    if (!newCode.trim() || !newImg.trim()) {
      setLoadErr('Yerleşim kodu ve görsel anahtarı zorunludur.')
      return
    }
    setBusy(true)
    setLoadErr(null)
    try {
      await createBannerPlacement(token, {
        placement_code: newCode.trim(),
        image_storage_key: newImg.trim(),
        ...(newOrg.trim() ? { organization_id: newOrg.trim() } : {}),
        ...(newLocale.trim() ? { locale: newLocale.trim() } : {}),
        ...(newLink.trim() ? { link_url: newLink.trim() } : {}),
        active: newActive,
      })
      setNewImg('')
      setNewLink('')
      await refresh()
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'banner_create_failed')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(p: BannerPlacement) {
    setEditId(p.id)
    setEditImg(p.image_storage_key)
    setEditLink(p.link_url ?? '')
    setEditActive(p.active)
  }

  async function onPatch(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !editId) return
    setBusy(true)
    setLoadErr(null)
    try {
      await patchBannerPlacement(token, editId, {
        image_storage_key: editImg.trim(),
        ...(editLink.trim() ? { link_url: editLink.trim() } : { link_url: '' }),
        active: editActive,
      })
      setEditId(null)
      await refresh()
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'banner_patch_failed')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Bu yerleşimi silmek istiyor musunuz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setLoadErr(null)
    try {
      await deleteBannerPlacement(token, id)
      if (editId === id) setEditId(null)
      await refresh()
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'banner_delete_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="admin-banners-block"
      className="mt-10 scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2 className="text-lg font-medium">Banner yerleşimleri</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Vitrin ana sayfası için yerleşim kodu olarak <span className="font-mono">home_hero</span> kullanın.
        Görsel, CDN&apos;de kayıtlı bir görsel anahtarına sahip olmalıdır. Bu bölüm yalnızca admin yetkisiyle erişilebilir.
      </p>
      {loadErr ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {loadErr}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field>
          <Label>Kurum (filtre)</Label>
          <Input className="mt-1 font-mono text-sm" value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)} />
        </Field>
        <Field>
          <Label>Dil (filtre)</Label>
          <Input className="mt-1 font-mono text-sm" placeholder="tr" value={filterLocale} onChange={(e) => setFilterLocale(e.target.value)} />
        </Field>
        <Field>
          <Label>Aktif</Label>
          <select
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as 'all' | 'true' | 'false')}
          >
            <option value="all">Tümü</option>
            <option value="true">Evet</option>
            <option value="false">Hayır</option>
          </select>
        </Field>
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="text-sm font-medium text-primary-600 underline disabled:opacity-50 dark:text-primary-400"
        >
          Yenile
        </button>
      </div>

      <ul className="mt-6 max-h-64 space-y-2 overflow-y-auto text-sm">
        {rows.length === 0 ? (
          <li className="text-neutral-500">Kayıt yok.</li>
        ) : (
          rows.map((p) => (
            <li key={p.id} className="rounded border border-neutral-100 p-2 dark:border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-neutral-800 dark:text-neutral-200">{p.placement_code}</span>
                <span className="text-xs text-neutral-500">{p.active ? 'aktif' : 'pasif'}</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">{p.image_storage_key}</div>
              <div className="mt-1 text-[10px] text-neutral-400">
                ID: {p.id} · Kurum: {p.organization_id ?? '—'} · Dil: {p.locale_id ?? '—'}
              </div>
              {p.link_url ? (
                <div className="mt-1 truncate text-xs text-primary-600 dark:text-primary-400">{p.link_url}</div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs font-medium text-primary-600 underline dark:text-primary-400"
                  onClick={() => startEdit(p)}
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 underline dark:text-red-400"
                  onClick={() => void onDelete(p.id)}
                  disabled={busy}
                >
                  Sil
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {editId != null ? (
        <form className="mt-6 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void onPatch(e)}>
          <h3 className="text-base font-medium text-neutral-900 dark:text-white">Yerleşim güncelle</h3>
          <Field>
            <Label>Görsel Anahtarı</Label>
            <Input className="mt-1 font-mono text-sm" value={editImg} onChange={(e) => setEditImg(e.target.value)} required />
          </Field>
          <Field>
            <Label>Bağlantı URL'si (boş bırakılırsa kaldırılır)</Label>
            <Input className="mt-1 text-sm" value={editLink} onChange={(e) => setEditLink(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
            Aktif
          </label>
          <div className="flex flex-wrap gap-2">
            <ButtonPrimary type="submit" disabled={busy}>
              {busy ? '…' : 'Kaydet'}
            </ButtonPrimary>
            <button type="button" className="text-sm underline" onClick={() => setEditId(null)}>
              İptal
            </button>
          </div>
        </form>
      ) : null}

      <form className="mt-8 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void onCreate(e)}>
        <h3 className="text-base font-medium text-neutral-900 dark:text-white">Yeni yerleşim</h3>
        <Field>
          <Label>Yerleşim Kodu</Label>
          <Input className="mt-1 font-mono text-sm" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
        </Field>
        <Field>
          <Label>Görsel Anahtarı</Label>
          <Input className="mt-1 font-mono text-sm" value={newImg} onChange={(e) => setNewImg(e.target.value)} required />
        </Field>
        <Field>
          <Label>Kurum (isteğe bağlı)</Label>
          <Input className="mt-1 font-mono text-sm" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
        </Field>
        <Field>
          <Label>Dil (isteğe bağlı)</Label>
          <Input className="mt-1 font-mono text-sm" placeholder="tr" value={newLocale} onChange={(e) => setNewLocale(e.target.value)} />
        </Field>
        <Field>
          <Label>Bağlantı URL'si (isteğe bağlı)</Label>
          <Input className="mt-1 text-sm" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
          Aktif
        </label>
        <ButtonPrimary type="submit" disabled={busy}>
          {busy ? '…' : 'Ekle'}
        </ButtonPrimary>
      </form>
    </section>
  )
}
