'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { CATEGORY_REGISTRY } from '@/data/category-registry'

interface RegionHeroConfig {
  category: string
  region: string
  heading: string
  subheading: string
  images: [string, string, string]
  updatedAt: string
}

// ─── Image upload slot ─────────────────────────────────────────────────────────

function ImageSlot({
  label,
  description,
  value,
  slot,
  categorySlug,
  regionHandle,
  onChange,
}: {
  label: string
  description: string
  value: string
  slot: number
  categorySlug: string
  regionHandle: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('category', `region-${categorySlug}-${regionHandle}`)
    form.append('slot', String(slot))
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: form })
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string }
      if (data.ok && data.url) onChange(data.url)
      else setError(data.error ?? 'Yükleme başarısız.')
    } catch {
      setError('Ağ hatası.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {label} <span className="font-normal text-neutral-400">{description}</span>
        </span>
        {value && (
          <button onClick={() => onChange('')} className="text-[10px] text-red-500 hover:text-red-700">
            Kaldır
          </button>
        )}
      </div>

      <div
        className={`relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          value
            ? 'border-primary-200 bg-neutral-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-neutral-50 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) void handleFile(f)
        }}
      >
        {value ? (
          <>
            <Image src={value} alt={label} fill className="object-cover" unoptimized={value.startsWith('/uploads/')} />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-5 w-5 text-white" />
              <span className="text-xs font-medium text-white">Değiştir</span>
            </div>
          </>
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <ImageIcon className="h-7 w-7" />
            <span className="text-xs">Tıkla veya sürükle</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
        />
      </div>

      <input
        type="text"
        placeholder="ya da URL girin…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Region hero editor ────────────────────────────────────────────────────────

function RegionHeroEditor({
  config,
  onSave,
  onDelete,
  onClose,
}: {
  config: RegionHeroConfig
  onSave: (updated: RegionHeroConfig) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const [heading, setHeading] = useState(config.heading)
  const [subheading, setSubheading] = useState(config.subheading)
  const [images, setImages] = useState<[string, string, string]>(config.images)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function setImage(i: number, url: string) {
    setImages((prev) => { const n = [...prev] as [string, string, string]; n[i] = url; return n })
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ ...config, heading, subheading, images })
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`"${config.category}/${config.region}" hero görselleri silinsin mi?`)) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
    onClose()
  }

  const catMeta = CATEGORY_REGISTRY.find((c) => c.slug === config.category)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Hero Görselleri Düzenle
            </h2>
            <p className="text-xs text-neutral-500">
              {catMeta?.emoji} {catMeta?.name ?? config.category} /&nbsp;
              <span className="font-mono font-medium">{config.region}</span>
              &nbsp;→&nbsp;
              <a
                href={`/${config.category}/${config.region}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                sayfayı görüntüle ↗
              </a>
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Text overrides */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Metin</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Başlık (boş bırakılırsa kategori başlığı)
              </label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder={`ör. ${catMeta?.name ?? ''} — ${config.region}`}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Alt Başlık
              </label>
              <textarea
                rows={2}
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
                className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>

          {/* 3 image slots */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Hero Görselleri (3 parça mozaik)
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {([0, 1, 2] as const).map((i) => (
                <ImageSlot
                  key={i}
                  label={`Görsel ${i + 1}`}
                  description={i === 0 ? 'Sağ kolon' : i === 1 ? 'Sol üst' : 'Sol alt'}
                  value={images[i]}
                  slot={i}
                  categorySlug={config.category}
                  regionHandle={config.region}
                  onChange={(url) => setImage(i, url)}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              3 görsel yüklendiğinde mozaik aktif olur. Boş bırakılırsa kategori varsayılan görseli kullanılır.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <button
            onClick={() => void handleDelete()}
            disabled={deleting || !config.updatedAt}
            className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:hover:bg-red-950/20"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Sıfırla
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            >
              İptal
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-primary-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RegionHeroImagesClient() {
  const [configs, setConfigs] = useState<RegionHeroConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editConfig, setEditConfig] = useState<RegionHeroConfig | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newCategory, setNewCategory] = useState(CATEGORY_REGISTRY[0]?.slug ?? '')
  const [newRegion, setNewRegion] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/region-hero')
      const data = (await res.json()) as { ok: boolean; configs: RegionHeroConfig[] }
      if (data.ok) setConfigs(data.configs.sort((a, b) => `${a.category}/${a.region}`.localeCompare(`${b.category}/${b.region}`)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  function openNewConfig() {
    if (!newRegion.trim()) return
    const blank: RegionHeroConfig = {
      category: newCategory,
      region: newRegion.trim().toLowerCase(),
      heading: '',
      subheading: '',
      images: ['', '', ''],
      updatedAt: '',
    }
    setEditConfig(blank)
    setShowAdd(false)
    setNewRegion('')
  }

  async function handleSave(updated: RegionHeroConfig) {
    try {
      const res = await fetch('/api/region-hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (data.ok) {
        setMsg({ ok: true, text: '✓ Kaydedildi.' })
        await loadAll()
        setEditConfig(null)
      } else {
        setMsg({ ok: false, text: data.error ?? 'Kayıt başarısız.' })
      }
    } catch {
      setMsg({ ok: false, text: 'Bir hata oluştu.' })
    }
  }

  async function handleDelete(category: string, region: string) {
    await fetch(`/api/region-hero?category=${category}&region=${region}`, { method: 'DELETE' })
    await loadAll()
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-950/40">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Bölge Hero Görselleri</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Her kategori × bölge kombinasyonu için hero mozaik görseli ve metin ayarları.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Bölge Ekle
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-primary-200 bg-white p-5 shadow-sm dark:border-primary-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Kategori</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {CATEGORY_REGISTRY.map((c) => (
                <option key={c.slug} value={c.slug}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Bölge (URL handle)</label>
            <input
              type="text"
              placeholder="antalya"
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openNewConfig()}
              className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={openNewConfig}
              disabled={!newRegion.trim()}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Oluştur &amp; Düzenle
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {msg && (
        <div
          className={`mb-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
            msg.ok
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {msg.text}
          <button onClick={() => setMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />Yükleniyor…
          </div>
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <MapPin className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Henüz bölge hero kaydı yok.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />İlk bölgeyi ekle
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-50 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/50">
                <th className="py-3 pl-5 text-left">Kategori / Bölge</th>
                <th className="py-3 text-left">Görseller</th>
                <th className="py-3 text-left">Son güncelleme</th>
                <th className="py-3 pr-5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {configs.map((cfg) => {
                const cat = CATEGORY_REGISTRY.find((c) => c.slug === cfg.category)
                const filledImages = cfg.images.filter(Boolean).length
                return (
                  <tr key={`${cfg.category}--${cfg.region}`} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
                        <div>
                          <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                            {cat?.emoji} {cat?.name ?? cfg.category}
                          </div>
                          <div className="font-mono text-[11px] text-neutral-500">/{cfg.category}/{cfg.region}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`relative h-8 w-12 overflow-hidden rounded-md ${
                              cfg.images[i] ? 'border border-green-200' : 'border border-dashed border-neutral-200 bg-neutral-50 dark:border-neutral-700'
                            }`}
                          >
                            {cfg.images[i] && (
                              <Image src={cfg.images[i]} alt="" fill className="object-cover" unoptimized />
                            )}
                          </div>
                        ))}
                        <span className={`text-xs font-medium ${filledImages === 3 ? 'text-green-600' : 'text-neutral-400'}`}>
                          {filledImages}/3
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-neutral-400">
                      {cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="py-3 pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/${cfg.category}/${cfg.region}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                          title="Sayfayı aç"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => setEditConfig(cfg)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
                          title="Düzenle"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(cfg.category, cfg.region)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        {configs.length} bölge hero kaydı · Görsel yüklenmemiş bölgeler kategori varsayılan görselini kullanır.
      </p>

      {editConfig && (
        <RegionHeroEditor
          config={editConfig}
          onSave={handleSave}
          onDelete={() => handleDelete(editConfig.category, editConfig.region)}
          onClose={() => setEditConfig(null)}
        />
      )}
    </div>
  )
}
