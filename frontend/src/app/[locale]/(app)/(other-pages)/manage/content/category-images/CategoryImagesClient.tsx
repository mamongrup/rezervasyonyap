'use client'

import { CategoryThumbnailsGridSection } from '@/components/manage/TravelCategoryThumbnailsGrid'
import { Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function CategoryImagesClient() {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/shared-travel-category-thumbnails', { credentials: 'include' })
      const data = (await res.json()) as {
        ok?: boolean
        thumbnails?: Record<string, string>
        updatedAt?: string
        error?: string
      }
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error ?? 'Yüklenemedi.' })
        return
      }
      setThumbnails(data.thumbnails && typeof data.thumbnails === 'object' ? data.thumbnails : {})
      setUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : '')
    } catch {
      setMsg({ ok: false, text: 'Ağ hatası.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/shared-travel-category-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ thumbnails }),
      })
      const data = (await res.json()) as { ok?: boolean; savedAt?: string; error?: string }
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error ?? 'Kayıt başarısız.' })
        return
      }
      setUpdatedAt(typeof data.savedAt === 'string' ? data.savedAt : '')
      setMsg({ ok: true, text: 'Kaydedildi. Ön yüz birkaç saniye içinde güncellenir.' })
    } catch {
      setMsg({ ok: false, text: 'Kayıt sırasında hata oluştu.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Genel kategori kart görselleri</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Burada tanımlanan görseller <strong>ana sayfa</strong>, <strong>tüm kategori sayfaları</strong> ve{' '}
          <strong>arama şablonunda</strong> yer alan <strong>Kategori Slider</strong> /{' '}
          <strong>Kategori Grid</strong> modüllerine varsayılan olarak uygulanır. Bir modülde ayrı görsel
          doldurduysanız o değer önceliklidir. Ana sayfada «Kategori görselleri (paylaşımlı)» modülü varsa bu
          sayfadaki tanımların üzerine yazabilir (sayfa içi öncelik).
        </p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Sayfa düzeninde özelleştirmek için:{' '}
          <Link href="/manage/content/page-builder" className="font-medium text-primary-600 underline dark:text-primary-400">
            Kategori & arama sayfaları
          </Link>
          .
        </p>
        {updatedAt ? (
          <p className="mt-2 text-xs text-neutral-400">
            Son kayıt: <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString('tr-TR')}</time>
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Yükleniyor…</span>
        </div>
      ) : (
        <CategoryThumbnailsGridSection
          thumbnails={thumbnails}
          onThumbnailsChange={setThumbnails}
          description="Yüklenen dosyalar site/page-builder/kategori-kartlari/{slug}/ altına kaydedilir — sayfa oluşturucudaki kart görselleri ile aynı klasör yapısı."
        />
      )}

      {msg ? (
        <p
          className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          role="status"
        >
          {msg.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="text-sm text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Yenile
        </button>
      </div>
    </div>
  )
}
