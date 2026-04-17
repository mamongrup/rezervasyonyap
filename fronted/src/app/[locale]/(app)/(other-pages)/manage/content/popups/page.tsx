'use client'

import clsx from 'clsx'
import { Check, Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'

type Popup = { id: string; name: string; type: 'campaign' | 'cookie' | 'newsletter' | 'exit'; title: string; content: string; active: boolean; delay: number }

const POPUP_TYPES = [
  { code: 'campaign', label: 'Kampanya' },
  { code: 'cookie', label: 'Çerez Bildirimi' },
  { code: 'newsletter', label: 'Bülten Aboneliği' },
  { code: 'exit', label: 'Çıkış Niyeti' },
]

const DEMO: Popup[] = [
  { id: '1', name: 'Çerez Politikası', type: 'cookie', title: 'Çerezleri Kullanıyoruz', content: 'Deneyiminizi iyileştirmek için çerezler kullanıyoruz.', active: true, delay: 0 },
  { id: '2', name: 'Yaz Kampanyası', type: 'campaign', title: '%20 İndirim!', content: 'Yaz tatili rezervasyonlarında özel indirim!', active: false, delay: 3 },
]

export default function Page() {
  const [popups, setPopups] = useState<Popup[]>(DEMO)
  const [editing, setEditing] = useState<Popup | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    if (editing) setPopups((p) => p.map((popup) => popup.id === editing.id ? editing : popup))
    setEditing(null)
    setSaving(false)
  }

  const addPopup = () => {
    const newPopup: Popup = { id: Date.now().toString(), name: 'Yeni Popup', type: 'campaign', title: '', content: '', active: false, delay: 0 }
    setPopups((p) => [...p, newPopup])
    setEditing(newPopup)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Popup Yönetimi</h1>
          <p className="mt-1 text-sm text-neutral-500">Kampanya, çerez, bülten ve çıkış niyeti popup'larını yönetin.</p>
        </div>
        <button onClick={addPopup} className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />Yeni popup
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {popups.map((popup) => {
          const typeInfo = POPUP_TYPES.find((t) => t.code === popup.type)
          return (
            <div key={popup.id} className={clsx('rounded-2xl border p-5 shadow-sm', popup.active ? 'border-[color:var(--manage-primary)] bg-white dark:bg-neutral-900' : 'border-neutral-100 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50')}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{popup.name}</p>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
                    {typeInfo?.label ?? popup.type}
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <input type="checkbox" checked={popup.active} onChange={(e) => setPopups((p) => p.map((pp) => pp.id === popup.id ? { ...pp, active: e.target.checked } : pp))} className="rounded" />
                  Aktif
                </label>
              </div>
              <p className="mb-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">{popup.title}</p>
              <p className="mb-3 text-xs text-neutral-500 line-clamp-2">{popup.content}</p>
              <p className="text-[11px] text-neutral-400">{popup.delay}s gecikmeli</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setEditing({ ...popup })} className="flex-1 rounded-xl border border-neutral-200 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">Düzenle</button>
                <button onClick={() => setPopups((p) => p.filter((pp) => pp.id !== popup.id))} className="rounded-xl p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Popup Düzenle</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-neutral-400" /></button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Ad</label>
              <input value={editing.name} onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Tür</label>
              <select value={editing.type} onChange={(e) => setEditing((p) => p ? { ...p, type: e.target.value as Popup['type'] } : p)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                {POPUP_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Başlık</label>
              <input value={editing.title} onChange={(e) => setEditing((p) => p ? { ...p, title: e.target.value } : p)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">İçerik</label>
              <textarea value={editing.content} onChange={(e) => setEditing((p) => p ? { ...p, content: e.target.value } : p)} rows={3}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Gecikme (saniye)</label>
              <input type="number" min={0} value={editing.delay} onChange={(e) => setEditing((p) => p ? { ...p, delay: parseInt(e.target.value) || 0 } : p)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-700">İptal</button>
              <button onClick={() => void handleSave()} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Kaydet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
