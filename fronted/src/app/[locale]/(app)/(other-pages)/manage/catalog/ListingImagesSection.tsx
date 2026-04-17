'use client'

import ImageUpload from '@/components/editor/ImageUpload'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listingImageSubPath, slugifyMediaSegment } from '@/lib/upload-media-paths'
import {
  addListingImage,
  deleteListingImage,
  listListingImages,
  patchListingImageScene,
  reorderListingImages,
  type ListingImage,
} from '@/lib/travel-api'
import { Field, Label } from '@/shared/fieldset'
import { ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const SCENE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Vitrin: otomatik (sıra)' },
  { value: 'sea_view', label: 'Deniz / manzara' },
  { value: 'pool', label: 'Havuz' },
  { value: 'living', label: 'Salon / oturma' },
  { value: 'bedroom', label: 'Yatak odası' },
  { value: 'sauna', label: 'Sauna' },
  { value: 'hammam', label: 'Hamam' },
  { value: 'bathroom', label: 'Banyo' },
  { value: 'unspecified', label: 'Diğer / etiketsiz' },
]

type Props = {
  listingId: string
  categoryCode: string
  /** İlan slug (yönetim listesinden); klasör adı için */
  listingSlug: string
  /** Yönetici panel: `organization_id` sorgu parametresi (backend kapsamı) */
  organizationId?: string
}

export default function ListingImagesSection({
  listingId,
  categoryCode,
  listingSlug,
  organizationId,
}: Props) {
  const [images, setImages] = useState<ListingImage[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadKey, setUploadKey] = useState(0)

  const slugBase = listingSlug.trim()
    ? slugifyMediaSegment(listingSlug)
    : `ilan-${listingId.replace(/-/g, '').slice(0, 12)}`
  const sub = listingImageSubPath(categoryCode, slugBase)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const token = getStoredAuthToken()
      if (!token) {
        setErr('Oturum gerekli')
        return
      }
      const r = await listListingImages(token, listingId, organizationId)
      setImages(r.images)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Görseller yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [listingId, organizationId])

  useEffect(() => {
    void load()
  }, [load])

  async function onUploadedBatch(urls: string[]) {
    const token = getStoredAuthToken()
    if (!token) return
    const cleaned = urls.map((u) => u.trim()).filter(Boolean)
    if (cleaned.length === 0) return
    setBusy(true)
    setErr(null)
    try {
      let order = images.length
      for (const storage_key of cleaned) {
        await addListingImage(
          token,
          listingId,
          {
            storage_key,
            original_mime: 'image/avif',
            sort_order: order,
          },
          organizationId,
        )
        order += 1
      }
      await load()
      setUploadKey((k) => k + 1)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Bu görseli silmek istiyor musunuz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setErr(null)
    try {
      await deleteListingImage(token, listingId, id, organizationId)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  async function setScene(imageId: string, sceneCode: string) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setErr(null)
    try {
      await patchListingImageScene(
        token,
        listingId,
        imageId,
        { scene_code: sceneCode },
        organizationId,
      )
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sahne güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= images.length) return
    const token = getStoredAuthToken()
    if (!token) return
    const ids = images.map((x) => x.id)
    const t = ids[idx]
    ids[idx] = ids[j]
    ids[j] = t
    setBusy(true)
    try {
      await reorderListingImages(token, listingId, ids, organizationId)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sıra güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const nextIndex = images.length + 1

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Dosyalar <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">/uploads/listings/{sub}/</code>{' '}
        altında <code className="font-mono text-xs">{slugBase}-1.avif</code>, <code className="font-mono text-xs">{slugBase}-2.avif</code>…
        olarak saklanır.
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        <strong className="font-medium text-neutral-700 dark:text-neutral-300">Ön vitrin sırası:</strong> Her sahneden (deniz, havuz, salon…) en az bir fotoğraf seçilir; etiket yoksa yükleme sırası kullanılır.
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
        </div>
      ) : null}
      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((im, idx) => (
          <div
            key={im.id}
            className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                im.storage_key.startsWith('http') || im.storage_key.startsWith('/')
                  ? im.storage_key
                  : `/${im.storage_key}`
              }
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="space-y-1.5 border-t border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
              <label className="block">
                <span className="sr-only">Sahne</span>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-200"
                  value={im.scene_code ?? ''}
                  onChange={(e) => void setScene(im.id, e.target.value)}
                  disabled={busy}
                >
                  {SCENE_OPTIONS.map((o) => (
                    <option key={o.value || 'auto'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10px] text-neutral-500">{im.storage_key.split('/').pop()}</span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  onClick={() => void move(idx, -1)}
                  disabled={busy || idx === 0}
                  title="Yukarı"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  onClick={() => void move(idx, 1)}
                  disabled={busy || idx === images.length - 1}
                  title="Aşağı"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => void remove(im.id)}
                  disabled={busy}
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Field>
        <Label>Yeni görsel ekle</Label>
        <div className="mt-2 max-w-md">
          <ImageUpload
            key={`upload-${uploadKey}`}
            value=""
            onChange={() => {}}
            folder="listings"
            subPath={sub}
            prefix={slugBase}
            imageIndex={nextIndex}
            aspectRatio="4/3"
            multiple
            onBatchComplete={(urls) => void onUploadedBatch(urls)}
            placeholder={`${slugBase}-${nextIndex}.avif — çoklu seçim veya sürükleyip bırakın`}
          />
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Toplu yüklemede sıradaki numaralar {nextIndex}, {nextIndex + 1}, … kullanılır.
        </p>
      </Field>

      {busy && (
        <p className="text-xs text-neutral-500">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> İşleniyor…
        </p>
      )}
    </div>
  )
}
