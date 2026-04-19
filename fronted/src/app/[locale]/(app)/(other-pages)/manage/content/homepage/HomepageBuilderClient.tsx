'use client'

import { ImageIcon, Loader2, Save, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

interface HomepageConfig {
  heroHeading: string
  heroSubheading: string
  heroCtaText: string
  /** Eski kayıtlar; ön yüzde `HOME_CATEGORY` vitrinine sabitlenir */
  heroCtaHref?: string
  heroImages: [string, string, string]
  updatedAt: string
}

// ─── Image Upload Slot ────────────────────────────────────────────────────────

function ImageSlot({
  label,
  description,
  value,
  index,
  onChange,
}: {
  label: string
  description: string
  value: string
  index: number
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'site')
        fd.append('subPath', 'anasayfa')
        fd.append('prefix', 'hero')
        fd.append('slot', String(index))
        const res = await fetch('/api/upload-image', { method: 'POST', body: fd, credentials: 'include' })
        const json = await res.json()
        if (json.ok) onChange(json.url as string)
      } finally {
        setUploading(false)
      }
    },
    [index, onChange],
  )

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label} <span className="text-xs text-neutral-400">({description})</span>
      </span>

      <div
        className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
            : 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-600'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) uploadFile(file)
        }}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={label}
              fill
              className="rounded-xl object-cover"
              unoptimized={value.startsWith('/uploads/')}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Yükle veya sürükle</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file)
          }}
        />
      </div>

      {/* URL input */}
      <input
        type="url"
        placeholder="veya görsel URL girin"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomepageBuilderClient() {
  const [config, setConfig] = useState<HomepageConfig>({
    heroHeading: 'Otel, Araba, Deneyim',
    heroSubheading: 'Bizimle seyahatiniz unutulmaz deneyimlerle dolacak.',
    heroCtaText: 'Aramaya Başla',
    heroImages: ['', '', ''],
    updatedAt: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/homepage-config')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.config) setConfig(data.config as HomepageConfig)
      })
      .finally(() => setLoading(false))
  }, [])

  const setImage = (i: number, url: string) => {
    const imgs = [...config.heroImages] as [string, string, string]
    imgs[i] = url
    setConfig((c) => ({ ...c, heroImages: imgs }))
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/homepage-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          heroCtaHref: '/oteller/all',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus({ type: 'success', msg: 'Kaydedildi! Değişiklikler canlıya yansımak için önbelleği temizleyin.' })
        setConfig((c) => ({ ...c, updatedAt: data.savedAt }))
      } else {
        setStatus({ type: 'error', msg: 'Kayıt başarısız.' })
      }
    } catch {
      setStatus({ type: 'error', msg: 'Bağlantı hatası.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Ana Sayfa Düzenleyici</h1>
          <p className="mt-1 text-sm text-neutral-500">Hero bölümünü ve görsellerini özelleştirin.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Önizle
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* Hero Section */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-neutral-800 dark:text-white">
          🖼️ Hero Bölümü
        </h2>

        <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          Ön yüzde başlık, alt metin ve CTA butonu <strong>otel kategorisi vitrinine</strong> (
          <code className="rounded bg-white/80 px-1 dark:bg-neutral-900">/oteller/all</code>, dil önekli)
          bağlanır; adres kodda <code className="rounded bg-white/80 px-1 dark:bg-neutral-900">HOME_CATEGORY</code> ile
          tanımlıdır.
        </p>

        <div className="space-y-4">
          {/* Text fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Ana Başlık
              </label>
              <input
                type="text"
                value={config.heroHeading}
                onChange={(e) => setConfig((c) => ({ ...c, heroHeading: e.target.value }))}
                placeholder="Otel, Araba, Deneyim"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-xs text-neutral-400">{'<br />'} ile satır sonu ekleyebilirsiniz.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Alt Başlık
              </label>
              <input
                type="text"
                value={config.heroSubheading}
                onChange={(e) => setConfig((c) => ({ ...c, heroSubheading: e.target.value }))}
                placeholder="Bizimle seyahatiniz..."
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              CTA Buton Metni
            </label>
            <input
              type="text"
              value={config.heroCtaText}
              onChange={(e) => setConfig((c) => ({ ...c, heroCtaText: e.target.value }))}
              placeholder="Aramaya Başla"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          {/* Mosaic Images */}
          <div>
            <p className="mb-3 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Mozaik Görseller{' '}
              <span className="font-normal text-neutral-400">(3 görsel yükleyin, hero sağında kolaj görünür)</span>
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ImageSlot
                label="Görsel 1"
                description="Sol üst"
                value={config.heroImages[0]}
                index={0}
                onChange={(url) => setImage(0, url)}
              />
              <ImageSlot
                label="Görsel 2"
                description="Sol alt"
                value={config.heroImages[1]}
                index={1}
                onChange={(url) => setImage(1, url)}
              />
              <ImageSlot
                label="Görsel 3"
                description="Sağ (tall)"
                value={config.heroImages[2]}
                index={2}
                onChange={(url) => setImage(2, url)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
        <strong>Not:</strong> Mozaik görseller için 3 görsel de dolu olmalıdır, aksi hâlde varsayılan tek görsel
        görünür. Başlıkta <code>{'<br />'}</code> ile satır sonu eklenebilir.
      </div>

      {config.updatedAt && (
        <p className="text-center text-xs text-neutral-400">
          Son kayıt: {new Date(config.updatedAt).toLocaleString('tr-TR')}
        </p>
      )}
    </div>
  )
}
