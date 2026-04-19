'use client'

import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import MultiLangNamePanel, {
  parseMultiLangTranslations,
  stringifyMultiLangTranslations,
  type MultiLangTranslations,
} from '@/components/manage/MultiLangNamePanel'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createHolidayPackage,
  deleteHolidayPackage,
  listHolidayPackages,
  patchHolidayPackage,
  type HolidayPackage,
} from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function HolidayPackagesManageClient() {
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<HolidayPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [nameTrans, setNameTrans] = useState<MultiLangTranslations>({})
  const [bundleJson, setBundleJson] = useState('[]')

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const r = await listHolidayPackages(token)
      setRows(r.packages ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Liste yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function resetForm() {
    setEditingId(null)
    setName('')
    setNameTrans({})
    setBundleJson('[]')
  }

  function openNew() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(p: HolidayPackage) {
    setEditingId(p.id)
    setName(p.name)
    setNameTrans(parseMultiLangTranslations(p.name_translations))
    try {
      const parsed = JSON.parse(p.bundle_json || '[]')
      setBundleJson(JSON.stringify(parsed, null, 2))
    } catch {
      setBundleJson(p.bundle_json || '[]')
    }
    setShowForm(true)
    setErr(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const n = name.trim()
    if (!n) {
      setErr('Paket adı zorunlu.')
      return
    }
    let bundle = bundleJson.trim()
    if (bundle === '') bundle = '[]'
    try {
      JSON.parse(bundle)
    } catch {
      setErr('Paket JSON geçerli değil.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const transStr = stringifyMultiLangTranslations(nameTrans)
      if (editingId) {
        await patchHolidayPackage(token, editingId, {
          name: n,
          name_translations: transStr,
          bundle_json: bundle,
        })
      } else {
        await createHolidayPackage(token, {
          name: n,
          name_translations: transStr,
          bundle_json: bundle,
        })
      }
      setShowForm(false)
      resetForm()
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('Bu paketi silmek istiyor musunuz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setErr(null)
    try {
      await deleteHolidayPackage(token, id)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  return (
    <div className="space-y-8">
      <ManageFormPageHeader
        title="Paket tatil"
        subtitle={
          <span>
            Uçuş + konaklama vb. birleşik teklifler <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">holiday_packages</code> tablosunda tutulur (kampanya türlerinden ayrıdır). Ödeme ve vitrin bağlantıları ileride
            tamamlanabilir; burada paket adı ve bileşen listesi (JSON) yönetilir.{' '}
            <Link href={vitrinPath('/manage/campaigns')} className="font-medium text-[color:var(--manage-primary)] hover:underline">
              Tüm kampanyalar
            </Link>
          </span>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Yenile
        </button>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Yeni paket
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="max-w-3xl space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {editingId ? 'Paketi düzenle' : 'Yeni paket'}
          </h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Paket adı <span className="text-neutral-400">(Türkçe — kaynak)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Bodrum 3 gece — uçuş + villa"
            />
          </div>
          <MultiLangNamePanel
            trText={name}
            translations={nameTrans}
            onChange={setNameTrans}
            disabled={saving}
            fieldLabel="Paket adı"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Bileşenler (JSON dizi)
            </label>
            <textarea
              value={bundleJson}
              onChange={(e) => setBundleJson(e.target.value)}
              rows={12}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
              spellCheck={false}
            />
            <p className="mt-2 text-[11px] text-neutral-500">
              Geçerli bir JSON dizi yazın (bileşenler: uçuş, konaklama vb. referansları). Şema ürün ihtiyacına göre genişletilebilir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Güncelle' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-600"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 p-8 text-sm text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-sm text-neutral-500">Henüz paket tanımı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Ad</th>
                  <th className="px-4 py-3">Oluşturulma</th>
                  <th className="px-4 py-3 text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="me-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(r.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
