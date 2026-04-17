'use client'

import ImageUpload from '@/components/editor/ImageUpload'
import {
  DEFAULT_MEGA_MENU_STRUCTURE,
  type MegaMenuStoredChild,
  type MegaMenuStoredGroup,
  KNOWN_MEGA_GROUP_IDS,
} from '@/lib/mega-menu-default-structure'
import { DEFAULT_MEGA_MENU_SIDEBAR_STORED } from '@/lib/mega-menu-sidebar-defaults'
import { parseMegaMenuSidebarStored } from '@/data/mega-menu-sidebar'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getSitePublicConfig, upsertSiteSetting } from '@/lib/travel-api'
import type { MegaMenuSidebarStored } from '@/types/mega-menu-sidebar'
import { getMessages } from '@/utils/getT'
import { Check, Loader2, Plus, Save, Trash2, GripVertical, ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { useParams } from 'next/navigation'

function normalizeMegaMenuRaw(raw: unknown): MegaMenuStoredGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_MEGA_MENU_STRUCTURE
  const out: MegaMenuStoredGroup[] = []
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue
    const gr = g as Record<string, unknown>
    const gid = typeof gr.id === 'string' ? gr.id : ''
    const gurl = typeof gr.url === 'string' ? gr.url : '#'
    const childrenIn = Array.isArray(gr.children) ? gr.children : []
    const gi = out.length
    const children: MegaMenuStoredChild[] = childrenIn.map((c, ci) => {
      const ch = c as Record<string, unknown>
      return {
        id: typeof ch.id === 'string' ? ch.id : `g${gi}-c${ci}`,
        url: typeof ch.url === 'string' ? ch.url : '',
      }
    })
    if (gid) out.push({ id: gid, url: gurl, children })
  }
  return out.length > 0 ? out : DEFAULT_MEGA_MENU_STRUCTURE
}

export default function Page() {
  const params = useParams()
  const panelLocale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const preview = getMessages(panelLocale).navMenus.megaMenu

  const [items, setItems] = useState<MegaMenuStoredGroup[]>([])
  const [sidebar, setSidebar] = useState<MegaMenuSidebarStored>(DEFAULT_MEGA_MENU_SIDEBAR_STORED)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cfg = await getSitePublicConfig()
      const megamenu = (cfg as Record<string, unknown>).mega_menu
      setItems(normalizeMegaMenuRaw(megamenu))

      const rawSidebar = (cfg as Record<string, unknown>).mega_menu_sidebar
      const parsed = parseMegaMenuSidebarStored(rawSidebar)
      setSidebar(parsed ?? DEFAULT_MEGA_MENU_SIDEBAR_STORED)
    } catch {
      setItems(DEFAULT_MEGA_MENU_STRUCTURE)
      setSidebar(DEFAULT_MEGA_MENU_SIDEBAR_STORED)
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
      await upsertSiteSetting(token, { key: 'mega_menu', value_json: JSON.stringify(items) })
      await upsertSiteSetting(token, { key: 'mega_menu_sidebar', value_json: JSON.stringify(sidebar) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  const patchSidebar = (patch: Partial<MegaMenuSidebarStored>) => setSidebar((s) => ({ ...s, ...patch }))

  const addGroup = () =>
    setItems((p) => [...p, { id: `g-${Date.now()}`, url: '#', children: [{ id: `c-${Date.now()}`, url: '/' }] }])

  const removeGroup = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx))

  const updateGroup = (idx: number, patch: Partial<MegaMenuStoredGroup>) =>
    setItems((p) => p.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const addChild = (idx: number) =>
    updateGroup(idx, { children: [...items[idx].children, { id: `c-${Date.now()}`, url: '/' }] })

  const updateChild = (idx: number, ci: number, patch: Partial<MegaMenuStoredChild>) =>
    updateGroup(idx, {
      children: items[idx].children.map((c, j) => (j === ci ? { ...c, ...patch } : c)),
    })

  const removeChild = (idx: number, ci: number) =>
    updateGroup(idx, { children: items[idx].children.filter((_, j) => j !== ci) })

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <datalist id="mega-group-ids">
        {KNOWN_MEGA_GROUP_IDS.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Mega Menü</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Grup ve link yapısı burada; tüm metinler{' '}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">navMenus.megaMenu</code> dil dosyalarındadır. Önizleme panel dili:{' '}
            <strong>{panelLocale}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addGroup}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            Grup Ekle
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

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <code className="rounded bg-blue-100 px-1 font-mono text-xs dark:bg-blue-900/30">mega_menu</code> yalnızca id + url;{' '}
          <code className="rounded bg-blue-100 px-1 font-mono text-xs dark:bg-blue-900/30">mega_menu_sidebar</code> görsel + yol + sayı. Sağ kart metinleri{' '}
          <code className="rounded bg-blue-100 px-1 font-mono text-xs dark:bg-blue-900/30">navMenus.megaMenu.featured</code>.
        </span>
      </div>

      <section className="mb-10 rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/80 to-white p-6 shadow-sm dark:border-violet-900/40 dark:from-violet-950/40 dark:to-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Kategoriler paneli (sağ görsel)</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Başlık / açıklama / rozet / buton: <code className="text-xs">navMenus.megaMenu.featured</code>.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-neutral-200 bg-white/80 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-400">
          <p>
            <strong>{preview.featured.title}</strong> — {preview.featured.description}
          </p>
          <p className="mt-1">
            {preview.featured.badge} · {preview.featured.cta}
          </p>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">Görsel</p>
            <ImageUpload
              value={sidebar.thumbnail}
              onChange={(url) => patchSidebar({ thumbnail: url })}
              folder="general"
              subPath="mega-menu-sidebar"
              prefix="categories-panel"
              aspectRatio="16/10"
              placeholder="Resmi sürükleyin veya tıklayarak yükleyin"
            />
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Görsel sunucuya kaydedilir; önizlemeden değiştirebilir veya kaldırabilirsiniz.
            </p>
          </div>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">Hedef yol</span>
              <input
                value={sidebar.href}
                onChange={(e) => patchSidebar({ href: e.target.value })}
                className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">Sayı (istatistik)</span>
              <input
                type="number"
                min={0}
                value={sidebar.count}
                onChange={(e) => patchSidebar({ count: Number.parseInt(e.target.value, 10) || 0 })}
                className="max-w-xs rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
          </div>
        </div>
      </section>

      <h2 className="mb-4 text-base font-semibold text-neutral-800 dark:text-neutral-200">Menü grupları</h2>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const groupsPreview = preview.groups as Record<string, { title: string; links: Record<string, string> }>
          const gPreview = groupsPreview[item.id]
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <GripVertical className="hidden h-5 w-5 shrink-0 cursor-grab text-neutral-300 sm:block" />
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Grup id</label>
                    <input
                      list="mega-group-ids"
                      value={item.id}
                      onChange={(e) => updateGroup(idx, { id: e.target.value.trim() })}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-1.5 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Grup URL</label>
                    <input
                      value={item.url}
                      onChange={(e) => updateGroup(idx, { url: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-1.5 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    {item.children.length} alt link
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(idx)}
                    className="rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {gPreview ? (
                <div className="border-t border-neutral-100 bg-neutral-50/80 px-4 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-400">
                  Önizleme başlık: <strong>{gPreview.title}</strong>
                </div>
              ) : null}

              {expanded === item.id ? (
                <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-neutral-500">Alt linkler (id + url)</p>
                    <button
                      type="button"
                      onClick={() => addChild(idx)}
                      className="flex items-center gap-1 rounded-lg bg-[color:var(--manage-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[color:var(--manage-primary)]"
                    >
                      <Plus className="h-3 w-3" />
                      Ekle
                    </button>
                  </div>
                  <div className="space-y-2">
                    {item.children.map((child, ci) => {
                      const linkLabel = gPreview?.links?.[child.id]
                      return (
                        <div key={`${child.id}-${ci}`} className="flex flex-col gap-1 rounded-lg border border-neutral-100 p-2 sm:flex-row sm:items-center sm:gap-2 dark:border-neutral-700">
                          <input
                            value={child.id}
                            onChange={(e) => updateChild(idx, ci, { id: e.target.value.trim() })}
                            placeholder="alt-id"
                            className="flex-1 rounded-lg border border-neutral-200 px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
                          />
                          <input
                            value={child.url}
                            onChange={(e) => updateChild(idx, ci, { url: e.target.value })}
                            placeholder="/url"
                            className="flex-[2] rounded-lg border border-neutral-200 px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
                          />
                          <span className="text-xs text-neutral-400">{linkLabel ?? '—'}</span>
                          <button
                            type="button"
                            onClick={() => removeChild(idx, ci)}
                            className="px-1 text-neutral-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-16 dark:border-neutral-700">
          <p className="text-neutral-400">Henüz menü grubu yok.</p>
          <button type="button" onClick={addGroup} className="mt-3 flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> İlk grubu ekle
          </button>
        </div>
      ) : null}
    </div>
  )
}
