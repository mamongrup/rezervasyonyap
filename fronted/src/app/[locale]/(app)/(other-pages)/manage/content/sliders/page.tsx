'use client'

import clsx from 'clsx'
import { GripVertical, Image, Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'

type Slide = { id: string; title: string; subtitle: string; imageUrl: string; buttonText: string; buttonUrl: string; active: boolean }

const DEMO: Slide[] = [
  { id: '1', title: 'Bodrum\'da Lüks Villa', subtitle: 'Deniz manzaralı tatil villalarını keşfedin', imageUrl: '', buttonText: 'Villalara Bak', buttonUrl: '/villas', active: true },
  { id: '2', title: 'Fethiye Tekne Turu', subtitle: 'Türkiye\'nin en güzel koylarında tekne keyfi', imageUrl: '', buttonText: 'Turları İncele', buttonUrl: '/tours', active: true },
]

export default function Page() {
  const [slides, setSlides] = useState<Slide[]>(DEMO)
  const [editing, setEditing] = useState<Slide | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    if (editing) setSlides((prev) => prev.map((s) => (s.id === editing.id ? editing : s)))
    setEditing(null)
    setSaving(false)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-950/40">
            <Image className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Slider Yönetimi</h1>
            <p className="mt-1 text-sm text-neutral-500">Ana sayfa ve bölge sayfalarındaki slaytları düzenleyin.</p>
          </div>
        </div>
        <button onClick={() => setSlides((p) => [...p, { id: Date.now().toString(), title: 'Yeni Slayt', subtitle: '', imageUrl: '', buttonText: '', buttonUrl: '', active: false }])}
          className="flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />Yeni slayt
        </button>
      </div>

      <div className="space-y-3">
        {slides.map((slide, idx) => (
          <div key={slide.id} className={clsx('flex items-center gap-3 rounded-2xl border p-4', slide.active ? 'border-[color:var(--manage-primary)] bg-white dark:bg-neutral-900' : 'border-neutral-100 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50')}>
            <GripVertical className="h-5 w-5 shrink-0 text-neutral-300" />
            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
              {slide.imageUrl ? <img src={slide.imageUrl} alt="" className="h-full w-full rounded-xl object-cover" /> : <Image className="h-6 w-6 text-neutral-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{slide.title}</p>
              <p className="text-xs text-neutral-500">{slide.subtitle}</p>
              <p className="mt-1 text-xs text-neutral-400">{slide.buttonText} → {slide.buttonUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                <input type="checkbox" checked={slide.active} onChange={(e) => setSlides((prev) => prev.map((s) => s.id === slide.id ? { ...s, active: e.target.checked } : s))} className="rounded" />
                Aktif
              </label>
              <button onClick={() => setEditing({ ...slide })} className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700">Düzenle</button>
              <button onClick={() => setSlides((p) => p.filter((s) => s.id !== slide.id))} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Slayt Düzenle</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-neutral-400" /></button>
            </div>
            {(
              [
                { key: 'title', label: 'Başlık' },
                { key: 'subtitle', label: 'Alt başlık' },
                { key: 'imageUrl', label: 'Görsel URL' },
                { key: 'buttonText', label: 'Buton metni' },
                { key: 'buttonUrl', label: 'Buton URL' },
              ] as const
            ).map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-neutral-500">{f.label}</label>
                <input
                  value={editing[f.key]}
                  onChange={(e) => setEditing((p) => (p ? { ...p, [f.key]: e.target.value } : p))}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            ))}
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
