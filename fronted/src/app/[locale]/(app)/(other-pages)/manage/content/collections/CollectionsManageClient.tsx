'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import ImageUpload from '@/components/editor/ImageUpload'
import {
  createCollection,
  deleteCollection,
  listCollections,
  patchCollection,
  type CollectionFilterRules,
  type ListingCollection,
} from '@/lib/travel-api'
import clsx from 'clsx'
import {
  ExternalLink,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { callAiTranslate } from '@/lib/manage-content-ai'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const CATEGORY_OPTIONS = [
  { code: 'hotel', label: 'Otel' },
  { code: 'villa', label: 'Villa' },
  { code: 'tour', label: 'Tur' },
  { code: 'activity', label: 'Aktivite' },
  { code: 'yacht', label: 'Yat' },
  { code: 'car', label: 'Araç' },
  { code: 'hajj', label: 'Hac & Umre' },
  { code: 'visa', label: 'Vize' },
  { code: 'event', label: 'Etkinlik' },
]

function toSlug(s: string) {
  return s.toLowerCase()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/İ/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function parseRules(json: string): CollectionFilterRules {
  try { return JSON.parse(json) } catch { return {} }
}

// ─── Collection Edit Modal ────────────────────────────────────────────────────
function CollectionModal({
  collection,
  token,
  onClose,
  onSaved,
}: {
  collection: ListingCollection | null
  token: string
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !collection
  const initRules: CollectionFilterRules = collection ? parseRules(collection.filter_rules) : {}

  const [slug, setSlug] = useState(collection?.slug ?? '')
  const [title, setTitle] = useState(collection?.title ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [heroImage, setHeroImage] = useState(collection?.hero_image_url ?? '')
  const [isActive, setIsActive] = useState(collection?.is_active ?? true)
  const [sortOrder, setSortOrder] = useState(collection?.sort_order ?? 0)

  // Filter rules
  const [ruleQ, setRuleQ] = useState(initRules.q ?? '')
  const [ruleCats, setRuleCats] = useState<string[]>(initRules.category_codes ?? [])
  const [ruleLocations, setRuleLocations] = useState<string>(initRules.locations?.join(', ') ?? '')
  const [ruleMinPrice, setRuleMinPrice] = useState(initRules.min_price?.toString() ?? '')
  const [ruleMaxPrice, setRuleMaxPrice] = useState(initRules.max_price?.toString() ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiPolish, setAiPolish] = useState<'title' | 'desc' | null>(null)

  const toggleCat = (code: string) => {
    setRuleCats((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  const buildRules = (): CollectionFilterRules => ({
    ...(ruleQ.trim() ? { q: ruleQ.trim() } : {}),
    ...(ruleCats.length > 0 ? { category_codes: ruleCats } : {}),
    ...(ruleLocations.trim() ? { locations: ruleLocations.split(',').map((l) => l.trim()).filter(Boolean) } : {}),
    ...(ruleMinPrice ? { min_price: Number(ruleMinPrice) } : {}),
    ...(ruleMaxPrice ? { max_price: Number(ruleMaxPrice) } : {}),
  })

  const handleSave = async () => {
    if (!slug.trim() || !title.trim()) { setError('Slug ve başlık zorunlu'); return }
    setSaving(true)
    setError(null)
    const rules = JSON.stringify(buildRules())
    try {
      if (isNew) {
        await createCollection(token, {
          slug: slug.trim(),
          title: title.trim(),
          description: description || undefined,
          hero_image_url: heroImage || undefined,
          filter_rules: rules,
        })
      } else {
        await patchCollection(token, collection.id, {
          slug: slug.trim(),
          title: title.trim(),
          description: description || null,
          hero_image_url: heroImage || null,
          filter_rules: rules,
          sort_order: sortOrder,
          is_active: isActive,
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const polishTitle = async () => {
    if (!title.trim()) {
      setError('Önce başlık girin.')
      return
    }
    setAiPolish('title')
    setError(null)
    try {
      const out = await callAiTranslate({
        text: title,
        context: 'title',
        sourceLocale: 'tr',
        targetLocale: 'tr',
      })
      if (out) setTitle(out.slice(0, 200))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI hatası')
    } finally {
      setAiPolish(null)
    }
  }

  const polishDesc = async () => {
    if (!description.trim()) {
      setError('Önce açıklama girin.')
      return
    }
    setAiPolish('desc')
    setError(null)
    try {
      const out = await callAiTranslate({
        text: description,
        context: 'excerpt',
        sourceLocale: 'tr',
        targetLocale: 'tr',
        pageSlug: slug.trim() || 'collection',
      })
      if (out) setDescription(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI hatası')
    } finally {
      setAiPolish(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-neutral-900 shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <h3 className="text-lg font-semibold">{isNew ? 'Yeni Koleksiyon' : 'Koleksiyon Düzenle'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-neutral-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-sm font-medium">Başlık *</label>
                <ManageAiMagicTextButton
                  loading={aiPolish === 'title'}
                  onClick={() => void polishTitle()}
                />
              </div>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (isNew) setSlug(toSlug(e.target.value))
                }}
                placeholder="Balayı Villaları"
                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Slug *</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="balayı-villalari"
                className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-sm font-medium">Açıklama</label>
              <ManageAiMagicTextButton
                loading={aiPolish === 'desc'}
                onClick={() => void polishDesc()}
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Hero Resmi</label>
            <ImageUpload value={heroImage} onChange={setHeroImage} folder="general" prefix="col" compact aspectRatio="16/9" />
          </div>

          <hr className="border-neutral-200 dark:border-neutral-700" />
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary-500" />
              Filtre Kuralları
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Anahtar Kelime (başlık araması)</label>
                <input
                  value={ruleQ}
                  onChange={(e) => setRuleQ(e.target.value)}
                  placeholder="ör: balayı, deniz manzaralı, muhafazakâr"
                  className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-2">Kategoriler</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => toggleCat(c.code)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        ruleCats.includes(c.code)
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Bölge / Şehir (virgülle ayırın)</label>
                <input
                  value={ruleLocations}
                  onChange={(e) => setRuleLocations(e.target.value)}
                  placeholder="ör: Fethiye, Ölüdeniz, Bodrum"
                  className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Min Fiyat (TRY)</label>
                  <input
                    type="number"
                    value={ruleMinPrice}
                    onChange={(e) => setRuleMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Max Fiyat (TRY)</label>
                  <input
                    type="number"
                    value={ruleMaxPrice}
                    onChange={(e) => setRuleMaxPrice(e.target.value)}
                    placeholder="—"
                    className="w-full border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {!isNew && (
            <>
              <hr className="border-neutral-200 dark:border-neutral-700" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sıralama</span>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-20 border border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 text-sm bg-transparent text-center"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aktif</span>
                <button onClick={() => setIsActive((v) => !v)} className={clsx('transition-colors', isActive ? 'text-green-500' : 'text-neutral-400')}>
                  {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            </>
          )}

          {/* Preview JSON */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-3">
            <p className="text-xs text-neutral-400 mb-1 font-mono uppercase">Filtre kuralları (JSON)</p>
            <pre className="text-xs text-neutral-600 dark:text-neutral-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(buildRules(), null, 2)}
            </pre>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CollectionsManageClient() {
  const vitrinPath = useVitrinHref()
  const [token, setToken] = useState('')
  const [collections, setCollections] = useState<ListingCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCol, setEditingCol] = useState<ListingCollection | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { setToken(getStoredAuthToken() ?? '') }, [])

  const load = useCallback(() => {
    setLoading(true)
    listCollections({ all: true })
      .then((r) => setCollections(r.collections))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu koleksiyonu silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    try {
      await deleteCollection(token, id)
      setCollections((prev) => prev.filter((c) => c.id !== id))
    } catch {}
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Koleksiyonlar</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Dinamik ilan grupları — balayı villaları, lüks yatlar, denize sıfır oteller gibi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setEditingCol(null); setModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Yeni Koleksiyon
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Layers className="w-12 h-12 text-neutral-300" />
            <p className="text-neutral-500">Henüz koleksiyon yok</p>
            <button onClick={() => setModalOpen(true)} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm">İlk koleksiyonu oluştur</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => {
              const rules = parseRules(col.filter_rules)
              return (
                <div key={col.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-md transition-shadow">
                  {col.hero_image_url ? (
                    <img src={col.hero_image_url} alt="" className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                      <Layers className="w-8 h-8 text-primary-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">{col.title}</h3>
                        <p className="text-xs text-neutral-400 font-mono">{col.slug}</p>
                      </div>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full flex-shrink-0', col.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800')}>
                        {col.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    {col.description && (
                      <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{col.description}</p>
                    )}
                    {/* Rule chips */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rules.q && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                          🔍 {rules.q}
                        </span>
                      )}
                      {rules.category_codes?.slice(0, 2).map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          {c}
                        </span>
                      ))}
                      {rules.locations?.slice(0, 2).map((l) => (
                        <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />{l}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <Link
                        href={vitrinPath(`/kesfet/${col.slug}`)}
                        target="_blank"
                        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Önizle
                      </Link>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingCol(col); setModalOpen(true) }}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-primary-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(col.id)}
                          disabled={deleting === col.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 disabled:opacity-50"
                        >
                          {deleting === col.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <CollectionModal
          collection={editingCol}
          token={token}
          onClose={() => { setModalOpen(false); setEditingCol(null) }}
          onSaved={load}
        />
      )}
    </div>
  )
}
