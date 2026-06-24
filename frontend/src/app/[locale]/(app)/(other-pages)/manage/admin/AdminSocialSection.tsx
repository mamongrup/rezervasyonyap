'use client'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import {
  createSocialJob,
  createSocialTemplate,
  getPublicListingImages,
  listSocialJobs,
  listSocialListings,
  listSocialTemplates,
  patchListingSocial,
  postListingToFacebook,
  type ManageListingRow,
  type SocialNetwork,
  type SocialShareJob,
  type SocialTemplate,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import type { DragEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, ChevronDown, ExternalLink, Facebook, GripVertical, ImageIcon, Layers, Loader2, Plus, RefreshCw, Search, Send, Sparkles, X, XCircle } from 'lucide-react'

const SOCIAL_CATEGORIES = [
  { code: 'hotel', label: 'Otel' },
  { code: 'holiday_home', label: 'Villa / Tatil Evi' },
  { code: 'yacht_charter', label: 'Yat' },
  { code: 'tour', label: 'Tur' },
  { code: 'activity', label: 'Aktivite' },
  { code: 'flight', label: 'Uçak' },
  { code: 'car_rental', label: 'Araç Kiralama' },
]

const SOCIAL_NETWORKS: Array<{ code: SocialNetwork; label: string }> = [
  { code: 'facebook', label: 'Facebook' },
  { code: 'instagram', label: 'Instagram' },
]

const DEFAULT_TEMPLATE_BODY =
  '{{title}}\n{{region}} bölgesinde öne çıkan bu ilan için dikkat çekici Türkçe paylaşım metni yaz.\nÖne çıkan alanlar: fiyat {{price}}, oda {{rooms}}, banyo {{bathrooms}}, kişi {{guests}}.\nAçıklamada güven veren, satış odaklı ama abartısız bir ton kullan. Sonunda uygun ikonlar ve kısa çağrı ekle.\nURL: {{url}}'

const TEMPLATE_FIELDS = [
  { token: '{{title}}', label: 'Başlık', hint: 'İlan başlığı' },
  { token: '{{region}}', label: 'Bölge', hint: 'Şehir / bölge' },
  { token: '{{price}}', label: 'Fiyat', hint: 'Başlangıç fiyatı' },
  { token: '{{rooms}}', label: 'Oda', hint: 'Oda sayısı' },
  { token: '{{bathrooms}}', label: 'Banyo', hint: 'Banyo sayısı' },
  { token: '{{bedrooms}}', label: 'Yatak odası', hint: 'Yatak odası' },
  { token: '{{guests}}', label: 'Kişi', hint: 'Kapasite' },
  { token: '{{area}}', label: 'm²', hint: 'Alan bilgisi' },
  { token: '{{pool}}', label: 'Havuz', hint: 'Havuz bilgisi' },
  { token: '{{description}}', label: 'Açıklama', hint: 'İlan açıklaması' },
  { token: '{{url}}', label: 'URL', hint: 'İlan bağlantısı' },
]

// ─── İlan arama + seçici ──────────────────────────────────────────────────────

function ListingPicker({
  value,
  onSelect,
  categoryCode,
  categoryLabel,
}: {
  value: ManageListingRow | null
  onSelect: (listing: ManageListingRow | null) => void
  categoryCode?: string
  categoryLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ManageListingRow[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const loadListings = useCallback(async (nextQuery: string) => {
    const token = getStoredAuthToken()
    if (!token) return
    setSearching(true)
    setLoadError(null)
    try {
      const res = await listSocialListings(token, {
        categoryCode,
        search: nextQuery.trim() || undefined,
        limit: 20,
        titleLocale: 'tr',
      })
      setResults(res.listings)
      setOpen(true)
    } catch {
      setLoadError('İlanlar yüklenemedi.')
      setResults([])
      setOpen(true)
    } finally {
      setSearching(false)
    }
  }, [categoryCode])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) return
    debounceRef.current = setTimeout(async () => {
      await loadListings(query.trim())
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [loadListings, query])

  useEffect(() => {
    setQuery('')
    setResults([])
    setOpen(false)
    setLoadError(null)
  }, [categoryCode])

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-blue-300 bg-white px-4 py-3 dark:border-blue-700 dark:bg-neutral-900">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{value.title}</p>
          <p className="mt-0.5 text-xs text-neutral-400">{categoryLabel ?? value.category_code} · {value.status}</p>
        </div>
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery('') }}
          className="ml-3 shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center rounded-xl border border-neutral-300 bg-white px-3 dark:border-neutral-600 dark:bg-neutral-900">
        {searching
          ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
          : <Search className="h-4 w-4 shrink-0 text-neutral-400" />
        }
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setOpen(true); if (results.length === 0) void loadListings(query.trim()) }}
          placeholder={categoryLabel ? `${categoryLabel} ilanlarında ara…` : 'İlan adı ile arayın…'}
          className="w-full bg-transparent py-2.5 pl-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200"
        />
        {query && <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {results.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { onSelect(l); setOpen(false); setQuery('') }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{l.title}</p>
                <p className="text-xs text-neutral-400">{categoryLabel ?? l.category_code} · {l.status}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !searching && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-400">{loadError ?? 'Sonuç bulunamadı.'}</p>
        </div>
      )}
    </div>
  )
}

// ─── Hızlı Facebook Paylaşım Paneli ──────────────────────────────────────────

interface FbResult {
  ok: boolean
  post_url?: string
  listing_url?: string
  message_preview?: string
  error?: string
  hint?: string
}

function ogKindForCategory(categoryCode: string): 'stay' | 'experience' {
  return categoryCode === 'tour' || categoryCode === 'activity' || categoryCode === 'cruise'
    ? 'experience'
    : 'stay'
}

function socialCoverPreviewUrl(listing: ManageListingRow | null): string {
  if (!listing?.slug) return ''
  const kind = ogKindForCategory(listing.category_code)
  const q = new URLSearchParams({
    kind,
    handle: listing.slug,
    locale: 'tr',
    variant: 'social',
  })
  return `/api/og/listing?${q.toString()}`
}

async function listingImageKeys(listingId: string): Promise<string[]> {
  const res = await getPublicListingImages(listingId).catch(() => null)
  return (res?.images ?? [])
    .map((img) => img.storage_key?.trim() ?? '')
    .filter(Boolean)
    .slice(0, 10)
}

function selectedNetworksFromState(state: Record<SocialNetwork, boolean>): SocialNetwork[] {
  return SOCIAL_NETWORKS.map((n) => n.code).filter((code) => state[code])
}

function SocialCampaignPlanner({ onQueued }: { onQueued: () => void }) {
  const [categoryCode, setCategoryCode] = useState('holiday_home')
  const [networkState, setNetworkState] = useState<Record<SocialNetwork, boolean>>({
    facebook: true,
    instagram: true,
    twitter: false,
    pinterest: false,
  })
  const [templates, setTemplates] = useState<SocialTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [templateName, setTemplateName] = useState('Kategori kampanya şablonu')
  const [templateBody, setTemplateBody] = useState(DEFAULT_TEMPLATE_BODY)
  const [selectedListing, setSelectedListing] = useState<ManageListingRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null)

  const activeNetworks = selectedNetworksFromState(networkState)
  const activeTemplates = templates.filter((t) => activeNetworks.includes(t.network as SocialNetwork))
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null
  const selectedCategory = SOCIAL_CATEGORIES.find((c) => c.code === categoryCode) ?? SOCIAL_CATEGORIES[0]

  const loadTemplates = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    try {
      const res = await listSocialTemplates(token)
      setTemplates(res.templates)
      if (!templateId && res.templates[0]) {
        setTemplateId(res.templates[0].id)
        setTemplateName(res.templates[0].name)
        setTemplateBody(res.templates[0].template_body)
      }
    } catch (e) {
      setError(formatManageApiCatch(e, 'social_templates_failed'))
    }
  }, [templateId])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    if (!selectedTemplate) return
    setTemplateName(selectedTemplate.name)
    setTemplateBody(selectedTemplate.template_body)
  }, [selectedTemplate])

  useEffect(() => {
    setSelectedListing(null)
  }, [categoryCode])

  function insertTemplateToken(token: string) {
    const el = templateTextareaRef.current
    const start = el?.selectionStart ?? templateBody.length
    const end = el?.selectionEnd ?? templateBody.length
    const spacerBefore = start > 0 && !/\s/.test(templateBody[start - 1] ?? '') ? ' ' : ''
    const spacerAfter = templateBody[end] && !/\s/.test(templateBody[end] ?? '') ? ' ' : ''
    const next = `${templateBody.slice(0, start)}${spacerBefore}${token}${spacerAfter}${templateBody.slice(end)}`
    const cursor = start + spacerBefore.length + token.length + spacerAfter.length
    setTemplateBody(next)
    window.setTimeout(() => {
      el?.focus()
      el?.setSelectionRange(cursor, cursor)
    }, 0)
  }

  function onTemplateDrop(e: DragEvent<HTMLTextAreaElement>) {
    const token = e.dataTransfer.getData('text/plain')
    if (!token.startsWith('{{')) return
    e.preventDefault()
    insertTemplateToken(token)
  }

  async function ensureTemplate(token: string): Promise<string | undefined> {
    if (templateId) return templateId
    const network = activeNetworks[0] ?? 'facebook'
    const created = await createSocialTemplate(token, {
      network,
      name: `[${categoryCode}] ${templateName.trim() || 'Sosyal paylaşım şablonu'}`,
      template_body: templateBody.trim() || DEFAULT_TEMPLATE_BODY,
    })
    setTemplates((prev) => [created, ...prev])
    setTemplateId(created.id)
    return created.id
  }

  async function queueListing(token: string, listing: ManageListingRow, tplId: string | undefined) {
    const keys = await listingImageKeys(listing.id)
    if (keys.length === 0) throw new Error(`${listing.title}: image_keys_required`)
    await patchListingSocial(token, listing.id, {
      share_to_social: true,
      allow_ai_caption: true,
    })
    for (const network of activeNetworks) {
      await createSocialJob(token, {
        entity_type: 'listing',
        entity_id: listing.id,
        network,
        template_id: tplId,
        image_keys: keys,
      })
    }
  }

  async function onSaveTemplate() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const created = await createSocialTemplate(token, {
        network: activeNetworks[0] ?? 'facebook',
        name: `[${categoryCode}] ${templateName.trim() || 'Sosyal paylaşım şablonu'}`,
        template_body: templateBody.trim() || DEFAULT_TEMPLATE_BODY,
      })
      setTemplates((prev) => [created, ...prev])
      setTemplateId(created.id)
      setMessage('Şablon kaydedildi ve seçildi.')
    } catch (e) {
      setError(formatManageApiCatch(e, 'social_template_create_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function onQueueSingle() {
    const token = getStoredAuthToken()
    if (!token || !selectedListing) return
    if (activeNetworks.length === 0) {
      setError('En az bir platform seçin.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const tplId = await ensureTemplate(token)
      await queueListing(token, selectedListing, tplId)
      setMessage('Tek ilan test kuyruğuna alındı. Worker çalıştığında AI metni ve kapakla paylaşılacak.')
      onQueued()
    } catch (e) {
      setError(formatManageApiCatch(e, 'social_single_queue_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function onQueueCategory() {
    const token = getStoredAuthToken()
    if (!token) return
    if (activeNetworks.length === 0) {
      setError('En az bir platform seçin.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const tplId = await ensureTemplate(token)
      const res = await listSocialListings(token, {
        categoryCode,
        limit: 500,
        titleLocale: 'tr',
      })
      const published = res.listings.filter((l) => l.status === 'published')
      let queued = 0
      let skipped = 0
      for (const listing of published) {
        try {
          await queueListing(token, listing, tplId)
          queued += activeNetworks.length
        } catch {
          skipped += 1
        }
      }
      setMessage(
        `${published.length} yayınlanmış ilan tarandı. ${queued} paylaşım işi kuyruğa alındı, ${skipped} ilan görsel/iş hatası nedeniyle atlandı.`,
      )
      onQueued()
    } catch (e) {
      setError(formatManageApiCatch(e, 'social_category_queue_failed'))
    } finally {
      setBusy(false)
    }
  }

  const coverUrl = socialCoverPreviewUrl(selectedListing)

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Kategori Bazlı AI Sosyal Paylaşım
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Kategori + şablon seçin; AI başlık/açıklama üretir, kapak ve 10 görselle kuyruğa alır. Worker panel kapalıyken 10 dakikalık zamanlayıcıyla paylaşır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTemplates()}
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-300"
        >
          Şablonları Yenile
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(220px,0.9fr)]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Kategori</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {SOCIAL_CATEGORIES.map((c) => {
                  const active = c.code === categoryCode
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCategoryCode(c.code)}
                      className={[
                        'rounded-xl border px-3 py-2 text-left text-xs font-medium transition',
                        active
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-emerald-950/30',
                      ].join(' ')}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Şablon</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="">Yeni şablon / elle düzenle</option>
                {activeTemplates.map((t) => <option key={t.id} value={t.id}>{t.network} · {t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Platformlar</label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_NETWORKS.map((n) => (
                <label key={n.code} className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                  <input
                    type="checkbox"
                    checked={networkState[n.code]}
                    onChange={(e) => setNetworkState((prev) => ({ ...prev, [n.code]: e.target.checked }))}
                  />
                  {n.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Şablon adı</label>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Tek ilan test seçimi</label>
              <ListingPicker
                value={selectedListing}
                onSelect={setSelectedListing}
                categoryCode={categoryCode}
                categoryLabel={selectedCategory.label}
              />
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                AI şablon talimatı
              </label>
              <textarea
                ref={templateTextareaRef}
                rows={8}
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onTemplateDrop}
                className="w-full resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 dark:border-neutral-600 dark:bg-neutral-900"
                placeholder="Alanları sağdan sürükleyip metinde görünmesini istediğiniz yere bırakın."
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Alanları sürükleyip metindeki istediğiniz sıraya bırakın veya etikete tıklayarak imlecin olduğu yere ekleyin. AI boş kalan oda/banyo gibi bilgileri açıklamadan çıkarmaya çalışır; bulamazsa doğal şekilde atlar.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                <GripVertical className="h-4 w-4 text-emerald-600" />
                Sürüklenebilir alanlar
              </div>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                {TEMPLATE_FIELDS.map((field) => (
                  <button
                    key={field.token}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', field.token)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={() => insertTemplateToken(field.token)}
                    className="group flex cursor-grab items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs transition hover:border-emerald-300 hover:bg-emerald-50 active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-emerald-950/30"
                    title={`${field.hint}: ${field.token}`}
                  >
                    <span>
                      <span className="block font-semibold text-neutral-800 dark:text-neutral-100">{field.label}</span>
                      <span className="block font-mono text-[10px] text-neutral-400">{field.token}</span>
                    </span>
                    <Plus className="h-3.5 w-3.5 text-neutral-400 group-hover:text-emerald-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void onSaveTemplate()} className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-300">
              Şablonu Kaydet
            </button>
            <button type="button" disabled={busy || !selectedListing} onClick={() => void onQueueSingle()} className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166FE5] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Tek İlanı Test Kuyruğuna Al
            </button>
            <button type="button" disabled={busy} onClick={() => void onQueueCategory()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              Bu Kategoriyi Toplu Kuyruğa Al
            </button>
          </div>

          {message && <p className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-neutral-900 dark:text-emerald-300">{message}</p>}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">{error}</p>}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            <ImageIcon className="h-4 w-4" />
            Kapak önizleme
          </div>
          {coverUrl ? (
            <img src={coverUrl} alt="Sosyal paylaşım kapağı" className="aspect-[1200/1500] w-full rounded-xl object-cover" />
          ) : (
            <div className="flex aspect-[1200/1500] items-center justify-center rounded-xl bg-neutral-100 px-6 text-center text-xs text-neutral-500 dark:bg-neutral-800">
              Önizleme için tek ilan seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FacebookQuickPost() {
  const [selectedListing, setSelectedListing] = useState<ManageListingRow | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<FbResult | null>(null)

  async function onPost() {
    const token = getStoredAuthToken()
    if (!token || !selectedListing) return
    setBusy(true)
    setResult(null)
    try {
      const r = await postListingToFacebook(token, selectedListing.id, caption.trim() || undefined, {
        title: selectedListing.title,
        handle: selectedListing.slug,
        category_code: selectedListing.category_code,
      })
      setResult(r)
    } catch (e) {
      setResult({ ok: false, error: formatManageApiCatch(e, 'facebook_post_failed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2]">
          <Facebook className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Facebook&apos;ta Paylaş</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">İlanı ada göre bulun, Facebook sayfanıza anında gönderin</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">İlan seç *</label>
          <ListingPicker value={selectedListing} onSelect={setSelectedListing} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Özel açıklama <span className="text-neutral-400">(opsiyonel — boş bırakılırsa ilan başlığı kullanılır)</span>
          </label>
          <textarea
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Harika bir tatil fırsatı! 🌊 Bu ilanı keşfedin…"
            className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
          />
        </div>

        <button
          type="button"
          onClick={() => void onPost()}
          disabled={busy || !selectedListing}
          className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
          {busy ? 'Paylaşılıyor…' : 'Facebook\'ta Paylaş'}
        </button>

        {/* Sonuç */}
        {result && (
          <div className={`mt-2 rounded-xl border p-4 ${result.ok ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20'}`}>
            <div className="flex items-start gap-2">
              {result.ok
                ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              }
              <div className="min-w-0 flex-1">
                {result.ok ? (
                  <>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Paylaşım başarılı!</p>
                    {result.post_url && (
                      <a href={result.post_url} target="_blank" rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs text-emerald-700 underline dark:text-emerald-300"
                      >
                        Gönderiyi göster <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {result.message_preview && (
                      <p className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-neutral-600 dark:border-emerald-800 dark:bg-neutral-900 dark:text-neutral-400">
                        &ldquo;{result.message_preview}&hellip;&rdquo;
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">Paylaşım başarısız</p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{result.error}</p>
                    {result.hint && (
                      <p className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-red-800 dark:bg-neutral-900 dark:text-neutral-300">
                        💡 {result.hint}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Kuyruk görünümü ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  posted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
}

function JobRow({ j }: { j: SocialShareJob }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
        {j.status}
      </span>
      {j.network && (
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {j.network}
        </span>
      )}
      <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{j.entity_type}</span>
      <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400" title={j.entity_id}>
        {j.entity_id.slice(0, 8)}…
      </span>
      {j.caption_ai_generated && (
        <span className="max-w-xs truncate text-xs text-neutral-600 dark:text-neutral-400" title={j.caption_ai_generated}>
          &ldquo;{j.caption_ai_generated.slice(0, 60)}&rdquo;
        </span>
      )}
      <span className="ml-auto text-[10px] text-neutral-400">{j.created_at ? new Date(j.created_at).toLocaleDateString('tr') : ''}</span>
    </div>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function AdminSocialSection() {
  const [jobs, setJobs] = useState<SocialShareJob[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'posted' | 'failed'>('all')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const statusFilterRef = useRef(statusFilter)
  statusFilterRef.current = statusFilter

  const refresh = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    setLoading(true)
    const st = statusFilterRef.current
    try {
      const j = await listSocialJobs(token, {
        ...(st !== 'all' ? { status: st } : {}),
        limit: 100,
      })
      setJobs(j.jobs)
    } catch (e) {
      setLoadErr(formatManageApiCatch(e, 'social_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const counts = {
    all: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    posted: jobs.filter((j) => j.status === 'posted').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  }

  const visibleJobs = statusFilter === 'all' ? jobs : jobs.filter((j) => j.status === statusFilter)

  return (
    <div className="space-y-6">
      {/* Kategori bazlı AI paylaşım */}
      <SocialCampaignPlanner onQueued={() => void refresh()} />

      {/* Paylaşım kuyruğu */}
      <div className="rounded-2xl border border-[color:var(--manage-card-border)] bg-[color:var(--manage-card-bg)] p-6 backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[color:var(--manage-text)]">Paylaşım Geçmişi</h3>
            <p className="mt-0.5 text-xs text-[color:var(--manage-text-muted)]">Facebook&apos;a gönderilen paylaşım kayıtları</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[color:var(--manage-card-border)] px-3 py-2 text-sm text-[color:var(--manage-text-muted)] hover:bg-[color:var(--manage-hover-bg)] disabled:opacity-50"
          >
            <RefreshCw className={['h-3.5 w-3.5', loading ? 'animate-spin' : ''].join(' ')} />
            Yenile
          </button>
        </div>

        {/* Durum filtreleri */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'pending', 'posted', 'failed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                statusFilter === s
                  ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400',
              ].join(' ')}
            >
              {s === 'all' ? 'Tümü' : s === 'pending' ? 'Bekleyen' : s === 'posted' ? 'Paylaşıldı' : 'Başarısız'}
              {' '}
              <span className="ml-0.5 text-[10px] opacity-70">({counts[s]})</span>
            </button>
          ))}
        </div>

        {loadErr && (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {loadErr}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : visibleJobs.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">Kayıt yok.</p>
        ) : (
          <div className="space-y-2">
            {visibleJobs.map((j) => <JobRow key={j.id} j={j} />)}
          </div>
        )}
      </div>
    </div>
  )
}
