'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { useCatalogListingUi } from '@/hooks/useCatalogListingUi'
import ImageUpload from '@/components/editor/ImageUpload'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { listingImageSubPath, slugifyMediaSegment } from '@/lib/upload-media-paths'
import {
  addListingImage,
  deleteListingImage,
  getListingMeta,
  listListingImages,
  patchListingImageScene,
  putListingMeta,
  reorderListingImages,
  type ListingImage,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { LISTING_IMAGE_SCENE_OPTIONS } from '@/lib/listing-image-scenes'
import { GripVertical, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

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
  const ui = useCatalogListingUi()
  const [images, setImages] = useState<ListingImage[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadKey, setUploadKey] = useState(0)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoBusy, setVideoBusy] = useState(false)
  const [videoMsg, setVideoMsg] = useState<string | null>(null)
  const [aiSuggestBusyId, setAiSuggestBusyId] = useState<string | null>(null)
  const [aiBatchBusy, setAiBatchBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState<string | null>(null)

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
      const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined
      const r = await listListingImages(token, listingId, organizationId)
      setImages(r.images)
      try {
        const meta = await getListingMeta(token, listingId, orgParam)
        setYoutubeUrl(typeof meta.youtube_url === 'string' ? meta.youtube_url.trim() : '')
      } catch {
        /* meta opsiyonel */
      }
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'Görseller yüklenemedi')
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
      const baseOrder = images.length
      await Promise.all(
        cleaned.map((storage_key, i) =>
          addListingImage(
            token,
            listingId,
            {
              storage_key,
              original_mime: 'image/avif',
              sort_order: baseOrder + i,
            },
            organizationId,
          ),
        ),
      )
      await load()
      setUploadKey((k) => k + 1)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'Kayıt başarısız')
    } finally {
      setBusy(false)
    }
  }

  async function saveYoutubeUrl() {
    const token = getStoredAuthToken()
    if (!token) return
    const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined
    setVideoBusy(true)
    setVideoMsg(null)
    try {
      const prev = await getListingMeta(token, listingId, orgParam)
      await putListingMeta(token, listingId, { ...prev, youtube_url: youtubeUrl.trim() || undefined }, orgParam)
      setVideoMsg(ui.photosVideoSaved)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('listing_meta_save_failed'))
    } finally {
      setVideoBusy(false)
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
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  function sceneLooksUntagged(scene: string | null | undefined): boolean {
    const s = (scene ?? '').trim()
    return s === '' || s === 'unspecified'
  }

  function canAiSuggestStorageKey(key: string): boolean {
    const k = key.trim()
    if (!k || k.startsWith('http://') || k.startsWith('https://') || k.startsWith('/')) return false
    return k.startsWith('uploads/listings/')
  }

  async function fetchAiSceneSuggestion(storageKey: string): Promise<{ scene_code: string; note_tr?: string }> {
    const res = await fetch('/api/listing-image-scene-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storage_key: storageKey }),
    })
    const data = (await res.json()) as {
      scene_code?: string
      note_tr?: string
      error?: string
      message?: string
      retryAfterSec?: number
    }
    if (!res.ok) {
      const code = data.error ?? `http_${res.status}`
      const detail =
        code === 'vision_not_configured'
          ? data.message ??
            'DeepSeek veya OpenAI anahtarı tanımlı değil. Önce DEEPSEEK_API_KEY (veya panel Yapay zeka ayarı), gerekirse OPENAI_API_KEY ekleyin.'
          : code === 'rate_limited'
            ? `Çok sık istek. ${data.retryAfterSec ? `${data.retryAfterSec}s sonra deneyin.` : ''}`
            : code === 'forbidden'
              ? 'Yetkiniz yok.'
              : code === 'unauthorized'
                ? 'Oturum gerekli.'
                : code === 'image_not_found'
                  ? 'Dosya bulunamadı.'
                  : code === 'invalid_storage_key'
                    ? 'Geçersiz dosya yolu.'
                    : data.message ?? code
      throw new Error(detail)
    }
    const sc = typeof data.scene_code === 'string' ? data.scene_code.trim() : ''
    if (!sc) throw new Error('Öneri alınamadı')
    return { scene_code: sc, note_tr: data.note_tr }
  }

  async function applyAiSuggestion(im: ListingImage) {
    const token = getStoredAuthToken()
    if (!token) return
    setAiMsg(null)
    setAiSuggestBusyId(im.id)
    setErr(null)
    try {
      const { scene_code, note_tr } = await fetchAiSceneSuggestion(im.storage_key)
      await patchListingImageScene(
        token,
        listingId,
        im.id,
        { scene_code },
        organizationId,
      )
      await load()
      setAiMsg(note_tr ? `Öneri uygulandı: ${note_tr}` : 'Öneri uygulandı.')
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'AI önerisi alınamadı')
    } finally {
      setAiSuggestBusyId(null)
    }
  }

  async function applyAiSuggestionBatch() {
    const targets = images.filter(
      (im) => sceneLooksUntagged(im.scene_code) && canAiSuggestStorageKey(im.storage_key),
    )
    if (targets.length === 0) {
      setAiMsg('Önerilecek etiketsiz görsel yok.')
      return
    }
    if (
      !confirm(
        `${targets.length} görsel için yapay zeka sahne önerisi çalıştırılacak (API ücreti oluşabilir). Devam edilsin mi?`,
      )
    ) {
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    setAiBatchBusy(true)
    setAiMsg(null)
    setErr(null)
    try {
      let ok = 0
      for (const im of targets) {
        try {
          const { scene_code } = await fetchAiSceneSuggestion(im.storage_key)
          await patchListingImageScene(token, listingId, im.id, { scene_code }, organizationId)
          ok++
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          throw new Error(`${ok} görsel güncellendi; durdu: ${msg}`)
        }
        await new Promise((r) => setTimeout(r, 350))
      }
      await load()
      setAiMsg(`${ok} görsel için sahne önerisi uygulandı.`)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'Toplu öneri yarıda kesildi')
      await load()
    } finally {
      setAiBatchBusy(false)
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
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'Sahne güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  async function reorderDrag(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    const token = getStoredAuthToken()
    if (!token) return
    const ids = images.map((x) => x.id)
    const [removed] = ids.splice(fromIdx, 1)
    if (removed === undefined) return
    ids.splice(toIdx, 0, removed)
    setBusy(true)
    setErr(null)
    try {
      await reorderListingImages(token, listingId, ids, organizationId)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : 'Sıra güncellenemedi')
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
        <strong className="font-medium text-neutral-700 dark:text-neutral-300">Ön vitrin sırası:</strong> Her sahneden (deniz, havuz, salon…) en az bir fotoğraf seçilir; etiket yoksa yükleme sırası kullanılır.{' '}
        <span className="text-neutral-600 dark:text-neutral-400">Kartları sürükleyip bırakarak sırayı değiştirebilirsiniz.</span>
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        <strong className="font-medium text-neutral-700 dark:text-neutral-300">Yapay zeka önerisi:</strong>{' '}
        Sunucuda önce{' '}
        <code className="rounded bg-neutral-100 px-0.5 font-mono dark:bg-neutral-800">DEEPSEEK_API_KEY</code>{' '}
        (veya panel → Yapay zeka); görüntülü uç desteklemiyorsa{' '}
        <code className="rounded bg-neutral-100 px-0.5 font-mono dark:bg-neutral-800">OPENAI_API_KEY</code>{' '}
        kullanılabilir. Sonucu gözden geçirin.
      </p>
      {images.some(
        (im) => sceneLooksUntagged(im.scene_code) && canAiSuggestStorageKey(im.storage_key),
      ) ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || aiBatchBusy || !!aiSuggestBusyId}
            onClick={() => void applyAiSuggestionBatch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-950"
          >
            {aiBatchBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Etiketsizlere AI öner
          </button>
        </div>
      ) : null}

      <Field className="block max-w-2xl">
        <Label>{ui.listingForm.youtubeUrl}</Label>
        <Input
          type="url"
          className="mt-1 font-mono text-sm"
          value={youtubeUrl}
          onChange={(e) => {
            setYoutubeUrl(e.target.value)
            setVideoMsg(null)
          }}
          placeholder="https://www.youtube.com/watch?v=… veya kısa bağlantı"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{ui.photosVideoHint}</p>
        <ButtonPrimary type="button" className="mt-3" disabled={videoBusy} onClick={() => void saveYoutubeUrl()}>
          {videoBusy ? ui.common.ellipsis : ui.photosVideoSaveBtn}
        </ButtonPrimary>
        {videoMsg ? <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{videoMsg}</p> : null}
      </Field>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
        </div>
      ) : null}
      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
      {aiMsg ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{aiMsg}</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {images.map((im, idx) => (
          <div
            key={im.id}
            draggable={!busy}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', String(idx))
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              const raw = e.dataTransfer.getData('text/plain')
              const from = Number.parseInt(raw, 10)
              if (!Number.isFinite(from) || from === idx) return
              void reorderDrag(from, idx)
            }}
            className={`relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 ${
              busy ? '' : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            <div className="relative aspect-[4/3] w-full bg-neutral-200 dark:bg-neutral-950">
              <img
                src={
                  im.storage_key.startsWith('http') || im.storage_key.startsWith('/')
                    ? im.storage_key
                    : `/${im.storage_key}`
                }
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover select-none"
              />
              {!busy ? (
                <div
                  className="pointer-events-none absolute start-1 top-1 flex rounded bg-black/45 px-0.5 py-0.5 text-white backdrop-blur-[2px]"
                  title="Sürükleyerek taşıyın"
                  aria-hidden
                >
                  <GripVertical className="h-3 w-3 shrink-0 opacity-90" />
                </div>
              ) : null}
            </div>
            <div className="space-y-1 border-t border-neutral-100 bg-neutral-50 px-1.5 py-1 dark:border-neutral-700 dark:bg-neutral-900">
              <label className="block">
                <span className="sr-only">Sahne</span>
                <select
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  className="w-full rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-neutral-800 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-200"
                  value={im.scene_code ?? ''}
                  onChange={(e) => void setScene(im.id, e.target.value)}
                  disabled={busy || aiBatchBusy || aiSuggestBusyId !== null}
                >
                  {LISTING_IMAGE_SCENE_OPTIONS.map((o) => (
                    <option key={o.value || 'auto'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between gap-1">
                <span className="min-w-0 truncate font-mono text-[9px] text-neutral-500">
                  {im.storage_key.split('/').pop()}
                </span>
                <button
                  type="button"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  className="shrink-0 rounded p-0.5 text-violet-700 hover:bg-violet-50 disabled:opacity-40 dark:text-violet-300 dark:hover:bg-violet-950/40"
                  onClick={() => void applyAiSuggestion(im)}
                  disabled={
                    busy ||
                    aiBatchBusy ||
                    aiSuggestBusyId !== null ||
                    !canAiSuggestStorageKey(im.storage_key)
                  }
                  title={
                    canAiSuggestStorageKey(im.storage_key)
                      ? 'Yapay zeka ile sahne öner (DeepSeek öncelikli)'
                      : 'Yalnızca uploads/listings altındaki dosyalar için öneri'
                  }
                >
                  {aiSuggestBusyId === im.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  className="shrink-0 rounded p-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => void remove(im.id)}
                  disabled={busy}
                  title="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
