'use client'

import { DEFAULT_CATALOG_MENU_STRUCTURE, KNOWN_CATALOG_ITEM_IDS, normalizeCatalogMenuIconKey } from '@/lib/catalog-menu-defaults'
import { CATALOG_MENU_ICON_OPTIONS } from '@/lib/catalog-menu-icons'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getSitePublicConfig, upsertSiteSetting } from '@/lib/travel-api'
import type { CatalogMenuStoredEntry } from '@/types/catalog-menu'
import { getMessages } from '@/utils/getT'
import { Check, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

function normalizeLoaded(raw: unknown): CatalogMenuStoredEntry[] {
  if (!Array.isArray(raw)) return DEFAULT_CATALOG_MENU_STRUCTURE
  const out: CatalogMenuStoredEntry[] = []
  for (const row of raw) {
    if (row === null || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (typeof o.id === 'string' && typeof o.href === 'string' && typeof o.icon === 'string') {
      out.push({
        id: o.id,
        href: o.href,
        icon: normalizeCatalogMenuIconKey(o.icon),
      })
    }
  }
  return out.length > 0 ? out : DEFAULT_CATALOG_MENU_STRUCTURE
}

export default function CatalogMenuPage() {
  const params = useParams()
  const panelLocale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const preview = getMessages(panelLocale).navMenus.catalogMenu

  const [items, setItems] = useState<CatalogMenuStoredEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cfg = await getSitePublicConfig()
      const raw = (cfg as Record<string, unknown>).catalog_menu
      setItems(normalizeLoaded(raw))
    } catch {
      setItems(DEFAULT_CATALOG_MENU_STRUCTURE)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setError('Kaydetmek için yönetici olarak giriş yapın.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await upsertSiteSetting(token, { key: 'catalog_menu', value_json: JSON.stringify(items) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  const addRow = () =>
    setItems((p) => [
      ...p,
      {
        id: `custom-${Date.now()}`,
        icon: 'house',
        href: '/',
      },
    ])

  const removeRow = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx))

  const patch = (idx: number, patch: Partial<CatalogMenuStoredEntry>) =>
    setItems((p) => p.map((row, i) => (i === idx ? { ...row, ...patch } : row)))

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <datalist id="catalog-menu-item-ids">
        {KNOWN_CATALOG_ITEM_IDS.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Katalog menüsü</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Sıra, hedef yol ve ikon burada; başlık ve açıklamalar tüm diller için{' '}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">public/locales/navMenus.*.ts</code> içinde{' '}
            <code className="rounded px-1 font-mono text-xs">navMenus.catalogMenu.items[&lt;id&gt;]</code> altında tanımlanır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            Öğe ekle
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors',
              saved ? 'bg-emerald-600' : 'bg-[color:var(--manage-primary)] hover:opacity-90',
              saving && 'opacity-60',
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Kaydedildi' : 'Kaydet'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        Panel önizlemesi (URL dil segmenti: <strong>{panelLocale}</strong>): başlıklar aşağıda salt okunur; düzenlemek için{' '}
        <code className="rounded bg-white/80 px-1 font-mono text-xs dark:bg-black/20">navMenus.tr.ts</code> /{' '}
        <code className="rounded bg-white/80 px-1 font-mono text-xs dark:bg-black/20">navMenus.en.ts</code> dosyalarını kullanın.
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const itemTexts = preview.items as Record<string, { title: string; description: string }>
          const text = itemTexts[item.id]
          return (
            <div
              key={`${item.id}-${idx}`}
              className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-neutral-500">Öğe {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">Öğe kimliği (dil dosyasında `items.&lt;id&gt;`)</span>
                  <input
                    list="catalog-menu-item-ids"
                    value={item.id}
                    onChange={(e) => patch(idx, { id: e.target.value.trim() })}
                    placeholder="1 … 10 veya özel anahtar"
                    className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">Yol</span>
                  <input
                    value={item.href}
                    onChange={(e) => patch(idx, { href: e.target.value })}
                    placeholder="/oteller/all"
                    className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">İkon</span>
                  <select
                    value={normalizeCatalogMenuIconKey(item.icon)}
                    onChange={(e) => patch(idx, { icon: e.target.value })}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {CATALOG_MENU_ICON_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                <p className="font-medium text-neutral-700 dark:text-neutral-300">Önizleme ({panelLocale})</p>
                <p className="mt-1">
                  <strong>{text?.title ?? item.id}</strong> — {text?.description ?? '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-16 dark:border-neutral-700">
          <p className="text-neutral-400">Liste boş.</p>
          <button
            type="button"
            onClick={addRow}
            className="mt-3 flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Öğe ekle
          </button>
        </div>
      ) : null}
    </div>
  )
}
