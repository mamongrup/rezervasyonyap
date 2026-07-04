'use client'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import {
  createSocialJob,
  createSocialTemplate,
  generateSocialCover,
  getPublicListingImages,
  listSocialJobs,
  listSocialListings,
  listSocialTemplates,
  patchListingSocial,
  postListingToFacebook,
  processSocialPendingJobs,
  type ManageListingRow,
  type SocialNetwork,
  type SocialPostType,
  type SocialShareJob,
  type SocialTemplate,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import type { DragEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, ChevronDown, Clock, ExternalLink, Facebook, GripVertical, ImageIcon, Layers, Loader2, Plus, RefreshCw, Search, Send, Sparkles, StopCircle, X, XCircle } from 'lucide-react'

// Sunucudaki deploy/scripts/social-process-pending.sh ile aynı varsayılan bekleme süreleri —
// Meta/Pinterest'in "too many actions" limitine takılmamak için gruplar arasında kasıtlı bekleme.
const BULK_BATCH_SLEEP_MS = 90_000
const BULK_RATE_LIMIT_SLEEP_MS = 300_000

type BulkPhase = 'idle' | 'running' | 'waiting' | 'rate_limited' | 'done' | 'stopped' | 'error'

interface BulkProcessState {
  phase: BulkPhase
  batch: number
  totalProcessed: number
  totalPosted: number
  totalFailed: number
  message: string | null
  countdown: number
}

const BULK_IDLE_STATE: BulkProcessState = {
  phase: 'idle',
  batch: 0,
  totalProcessed: 0,
  totalPosted: 0,
  totalFailed: 0,
  message: null,
  countdown: 0,
}

async function sleepWithCountdown(
  ms: number,
  cancelRef: { current: boolean },
  onTick: (remainingSeconds: number) => void,
): Promise<void> {
  const stepMs = 1000
  let remaining = ms
  while (remaining > 0 && !cancelRef.current) {
    onTick(Math.ceil(remaining / 1000))
    const step = Math.min(stepMs, remaining)
    await new Promise((resolve) => setTimeout(resolve, step))
    remaining -= step
  }
  onTick(0)
}

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

// Story/Reel şimdilik yalnız Instagram Graph API üzerinden desteklenir (bkz. social-auto-post.ts).
const SOCIAL_POST_TYPE_OPTIONS: Array<{ code: SocialPostType; label: string; hint: string }> = [
  { code: 'feed', label: 'Gönderi', hint: 'Klasik akış paylaşımı (Facebook + Instagram)' },
  { code: 'story', label: 'Story', hint: 'Sadece Instagram — kapak görseli 24 saatlik story olarak paylaşılır' },
  { code: 'reel', label: 'Reels', hint: 'Sadece Instagram — ilan fotoğraflarından otomatik 9:16 slayt videosu üretilir' },
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

type SocialImageQuality = 'low' | 'medium' | 'high'
type SocialCoverMode = 'free' | 'premium'
type SocialDesignTheme =
  | 'auto'
  | 'luxury'
  | 'honeymoon'
  | 'large_family'
  | 'beachfront'
  | 'sea_view'
  | 'nature'
  | 'conservative'

const IMAGE_QUALITY_OPTIONS: Array<{ code: SocialImageQuality; label: string; cost: string; hint: string }> = [
  { code: 'low', label: 'Düşük', cost: '~$0.005-$0.016', hint: 'Toplu deneme ve yüksek hacim' },
  { code: 'medium', label: 'Orta', cost: '~$0.011-$0.063', hint: 'Sosyal medya için önerilen denge' },
  { code: 'high', label: 'Yüksek', cost: '~$0.05-$0.21', hint: 'Premium görsel, daha pahalı' },
]

const COVER_MODE_OPTIONS: Array<{ code: SocialCoverMode; label: string; badge: string; hint: string }> = [
  {
    code: 'free',
    label: 'Ücretsiz şablon',
    badge: '0 maliyet',
    hint: 'İlan fotoğrafı, logo, tema çipleri ve bilgilerle otomatik kapak üretir. Toplu paylaşımlar için önerilir.',
  },
  {
    code: 'premium',
    label: 'Premium AI',
    badge: 'OpenAI',
    hint: 'OpenAI ile ilana özel farklı görsel üretir. Özel ilan ve kampanyalarda kullanın.',
  },
]

const DESIGN_THEME_OPTIONS: Array<{ code: SocialDesignTheme; label: string; hint: string; match?: string[] }> = [
  { code: 'auto', label: 'Otomatik', hint: 'İlan temasından seç' },
  { code: 'luxury', label: 'Lüks', hint: 'Gold, premium, sakin tipografi', match: ['luxury', 'jacuzzi', 'sauna'] },
  { code: 'honeymoon', label: 'Balayı', hint: 'Romantik, sıcak ve yumuşak tonlar', match: ['honeymoon', 'romantic'] },
  { code: 'large_family', label: 'Büyük aile', hint: 'Ferah, güven veren, kapasite vurgusu', match: ['family', 'child_friendly'] },
  { code: 'beachfront', label: 'Denize sıfır', hint: 'Turkuaz, sahil ve yaz hissi', match: ['beachfront'] },
  { code: 'sea_view', label: 'Deniz manzaralı', hint: 'Mavi tonlar, manzara vurgusu', match: ['sea_view'] },
  { code: 'nature', label: 'Doğa', hint: 'Yeşil, doğal, sakin tatil hissi', match: ['nature', 'garden', 'mountain_view'] },
  { code: 'conservative', label: 'Muhafazakar', hint: 'Mahremiyet, aile ve güven vurgusu', match: ['conservative'] },
]

function listingThemeCodes(listing: ManageListingRow | null): string[] {
  return (listing?.theme_codes ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function inferDesignThemeFromListing(listing: ManageListingRow | null): Exclude<SocialDesignTheme, 'auto'> {
  const codes = listingThemeCodes(listing)
  const title = listing?.title.toLocaleLowerCase('tr-TR') ?? ''
  const has = (keys: string[]) => keys.some((k) => codes.includes(k) || title.includes(k.replace('_', ' ')))
  if (has(['luxury', 'jacuzzi', 'sauna', 'lüks'])) return 'luxury'
  if (has(['honeymoon', 'romantic', 'balayı'])) return 'honeymoon'
  if (has(['family', 'child_friendly', 'aile'])) return 'large_family'
  if (has(['beachfront', 'denize sıfır', 'sahil'])) return 'beachfront'
  if (has(['sea_view', 'deniz manzarası', 'deniz'])) return 'sea_view'
  if (has(['nature', 'garden', 'mountain_view', 'doğa', 'bahçe'])) return 'nature'
  if (has(['conservative', 'muhafazakar'])) return 'conservative'
  return 'luxury'
}

function designThemeLabel(code: SocialDesignTheme): string {
  return DESIGN_THEME_OPTIONS.find((t) => t.code === code)?.label ?? code
}

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

// ─── Hızlı Meta Paylaşım Paneli ──────────────────────────────────────────────

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

function socialCoverPreviewUrl(
  listing: ManageListingRow | null,
  quality: SocialImageQuality,
  designTheme: Exclude<SocialDesignTheme, 'auto'>,
  cacheKey: number,
): string {
  if (!listing?.slug) return ''
  const kind = ogKindForCategory(listing.category_code)
  const q = new URLSearchParams({
    kind,
    handle: listing.slug,
    listing_id: listing.id,
    title: listing.title,
    category_code: listing.category_code,
    locale: 'tr',
    variant: 'social',
    image_quality: quality,
    design_theme: designTheme,
    v: String(cacheKey),
  })
  if (listing.theme_codes) q.set('theme_codes', listing.theme_codes)
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
  const [coverMode, setCoverMode] = useState<SocialCoverMode>('free')
  const [postType, setPostType] = useState<SocialPostType>('feed')
  const [imageQuality, setImageQuality] = useState<SocialImageQuality>('medium')
  const [designTheme, setDesignTheme] = useState<SocialDesignTheme>('auto')
  const [selectedListing, setSelectedListing] = useState<ManageListingRow | null>(null)
  const [generatedCover, setGeneratedCover] = useState<{ url: string; storage_key: string } | null>(null)
  const [coverPreviewRev, setCoverPreviewRev] = useState(() => Date.now())
  const [coverBusy, setCoverBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null)

  const activeNetworks = selectedNetworksFromState(networkState)
  const activeTemplates = templates.filter((t) => activeNetworks.includes(t.network as SocialNetwork))
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null
  const selectedCategory = SOCIAL_CATEGORIES.find((c) => c.code === categoryCode) ?? SOCIAL_CATEGORIES[0]
  const resolvedDesignTheme = designTheme === 'auto'
    ? inferDesignThemeFromListing(selectedListing)
    : designTheme
  const selectedThemeCodes = listingThemeCodes(selectedListing)

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
    setGeneratedCover(null)
  }, [categoryCode])

  useEffect(() => {
    setGeneratedCover(null)
    setCoverPreviewRev(Date.now())
  }, [selectedListing?.id, imageQuality, resolvedDesignTheme, coverMode])

  useEffect(() => {
    if (!networkState.instagram && postType !== 'feed') setPostType('feed')
  }, [networkState.instagram, postType])

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

  function socialDesignInstruction(body: string): string {
    const quality = IMAGE_QUALITY_OPTIONS.find((q) => q.code === imageQuality)?.label ?? imageQuality
    const theme = designThemeLabel(resolvedDesignTheme)
    const themeCodes = selectedThemeCodes.length > 0 ? selectedThemeCodes.join(', ') : 'tema kodu yok'
    const coverInstruction = coverMode === 'premium'
      ? `Premium AI görsel kalite tercihi: ${quality} (${imageQuality}).`
      : 'Kapak modu: ücretsiz statik şablon; OpenAI görsel üretimi kullanılmayacak.'
    return [
      body.trim() || DEFAULT_TEMPLATE_BODY,
      '',
      coverInstruction,
      `Tasarım ipucu: ${theme}. İlan tema kodları: ${themeCodes}. Kapakta logo, ilan adı, bölge, kişi/oda/banyo ve iletişim net okunmalı.`,
    ].join('\n')
  }

  async function ensureTemplate(token: string): Promise<string | undefined> {
    if (templateId) return templateId
    const network = activeNetworks[0] ?? 'facebook'
    const created = await createSocialTemplate(token, {
      network,
      name: `[${categoryCode}] ${templateName.trim() || 'Sosyal paylaşım şablonu'}`,
      template_body: socialDesignInstruction(templateBody),
    })
    setTemplates((prev) => [created, ...prev])
    setTemplateId(created.id)
    return created.id
  }

  async function queueListing(token: string, listing: ManageListingRow, tplId: string | undefined) {
    const keys = await listingImageKeys(listing.id)
    const imageKeys =
      postType !== 'reel' && coverMode === 'premium' && generatedCover && listing.id === selectedListing?.id
        ? [generatedCover.storage_key, ...keys.filter((k) => k !== generatedCover.storage_key)].slice(0, 10)
        : keys
    if (imageKeys.length === 0) throw new Error(`${listing.title}: image_keys_required`)
    // Bayraklar otomatik rotasyon için yardımcıdır; manuel kuyruk kaydı için zorunlu değildir.
    await patchListingSocial(token, listing.id, {
      share_to_social: true,
      allow_ai_caption: true,
    }).catch(() => undefined)
    for (const network of activeNetworks) {
      // Story/Reel yalnız Instagram'da desteklenir — diğer platformlar her zaman gönderi (feed) olarak kuyruğa girer.
      const jobPostType: SocialPostType = network === 'instagram' ? postType : 'feed'
      await createSocialJob(token, {
        entity_type: 'listing',
        entity_id: listing.id,
        network,
        post_type: jobPostType,
        template_id: tplId,
        image_keys: imageKeys,
      })
    }
  }

  async function onGenerateCover() {
    if (!selectedListing) return
    if (coverMode !== 'premium') {
      setError('Premium AI modunu seçmeden AI kapak üretilemez.')
      return
    }
    setCoverBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await generateSocialCover({
        listing: selectedListing,
        quality: imageQuality,
        design_theme: resolvedDesignTheme,
        prompt_hint: socialDesignInstruction(templateBody),
      })
      setGeneratedCover({ url: res.url, storage_key: res.storage_key })
      setMessage('AI kapak üretildi. Önizleme ve tek ilan kuyruğu artık bu kapağı kullanacak.')
    } catch (e) {
      setError(formatManageApiCatch(e, 'social_cover_generate_failed'))
    } finally {
      setCoverBusy(false)
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
        template_body: socialDesignInstruction(templateBody),
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
    if (postType !== 'feed' && !activeNetworks.includes('instagram')) {
      setError('Story/Reels için Instagram platformunu seçin.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const tplId = await ensureTemplate(token)
      await queueListing(token, selectedListing, tplId)
      setMessage(
        coverMode === 'premium' && generatedCover
          ? 'Tek ilan test kuyruğuna alındı. Worker premium AI kapağı ilk görsel olarak paylaşacak.'
          : 'Tek ilan test kuyruğuna alındı. Worker ücretsiz statik kapak şablonu ile paylaşacak.',
      )
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
    if (postType !== 'feed' && !activeNetworks.includes('instagram')) {
      setError('Story/Reels için Instagram platformunu seçin.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const tplId = await ensureTemplate(token)
      const published: ManageListingRow[] = []
      const pageSize = 500
      for (let offset = 0; ; offset += pageSize) {
        const res = await listSocialListings(token, {
          categoryCode,
          limit: pageSize,
          offset,
          titleLocale: 'tr',
        })
        const batch = res.listings.filter((l) => l.status === 'published')
        published.push(...batch)
        if (res.listings.length < pageSize) break
      }
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

  const coverUrl = generatedCover?.url ?? socialCoverPreviewUrl(selectedListing, imageQuality, resolvedDesignTheme, coverPreviewRev)

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Kategori Bazlı Sosyal Paylaşım
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Ücretsiz şablonla maliyetsiz kapak kullanın veya özel ilanlarda Premium AI kapak üretin. Worker panel kapalıyken 10 dakikalık zamanlayıcıyla paylaşır.
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

      <div className="space-y-5">
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

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">İçerik türü</label>
            <div className="grid gap-2 md:grid-cols-3">
              {SOCIAL_POST_TYPE_OPTIONS.map((opt) => {
                const active = postType === opt.code
                const disabled = opt.code !== 'feed' && !activeNetworks.includes('instagram')
                return (
                  <button
                    key={opt.code}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPostType(opt.code)}
                    title={disabled ? 'Story/Reels için Instagram platformunu seçin.' : opt.hint}
                    className={[
                      'rounded-xl border px-3 py-2 text-left transition',
                      disabled
                        ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-600'
                        : active
                          ? 'border-emerald-500 bg-white shadow-sm ring-2 ring-emerald-100 dark:bg-neutral-900 dark:ring-emerald-950/60'
                          : 'border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-emerald-950/20',
                    ].join(' ')}
                  >
                    <span className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-neutral-500 dark:text-neutral-400">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
            {postType === 'reel' && (
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                Reels videosu, ilan galerisindeki fotoğraflardan sunucuda otomatik üretilir (sessiz, ~10-20 sn). Kapak üretim modu Reels için kullanılmaz.
              </p>
            )}
          </div>

          <div className={postType === 'reel' ? 'hidden' : undefined}>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Kapak üretim modu</label>
            <div className="grid gap-2 md:grid-cols-2">
              {COVER_MODE_OPTIONS.map((opt) => {
                const active = coverMode === opt.code
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setCoverMode(opt.code)}
                    className={[
                      'rounded-2xl border p-4 text-left transition',
                      active
                        ? 'border-emerald-500 bg-white shadow-sm ring-2 ring-emerald-100 dark:bg-neutral-900 dark:ring-emerald-950/60'
                        : 'border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-emerald-950/20',
                    ].join(' ')}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}</span>
                      <span className={active ? 'rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white' : 'rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800'}>
                        {opt.badge}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-neutral-500 dark:text-neutral-400">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {coverMode === 'premium' ? (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                AI görsel kalitesi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_QUALITY_OPTIONS.map((opt) => {
                  const active = imageQuality === opt.code
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setImageQuality(opt.code)}
                      className={[
                        'rounded-xl border px-3 py-2 text-left transition',
                        active
                          ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-blue-300 hover:bg-blue-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
                      ].join(' ')}
                      title={opt.hint}
                    >
                      <span className="block text-xs font-semibold">{opt.label}</span>
                      <span className={active ? 'block text-[10px] text-blue-100' : 'block text-[10px] text-neutral-400'}>
                        {opt.cost}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Tasarım ipucu
                </label>
                <span className="text-[11px] text-neutral-500">
                  Aktif: {designThemeLabel(resolvedDesignTheme)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DESIGN_THEME_OPTIONS.map((opt) => {
                  const active = designTheme === opt.code
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setDesignTheme(opt.code)}
                      className={[
                        'rounded-xl border px-3 py-2 text-left text-xs transition',
                        active
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-amber-300 hover:bg-amber-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
                      ].join(' ')}
                      title={opt.hint}
                    >
                      <span className="block font-semibold">{opt.label}</span>
                      <span className={active ? 'block text-[10px] text-amber-50' : 'block text-[10px] text-neutral-400'}>
                        {opt.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedListing && designTheme === 'auto' ? (
                <p className="mt-1 text-[11px] text-neutral-500">
                  İlan teması: {selectedThemeCodes.length > 0 ? selectedThemeCodes.join(', ') : 'tema kodu yok'} → {designThemeLabel(resolvedDesignTheme)}
                </p>
              ) : null}
            </div>
          </div>
          ) : (
            <p className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-neutral-900 dark:text-emerald-300">
              Ücretsiz mod seçili: paylaşımda statik kapak şablonu kullanılır, OpenAI maliyeti oluşmaz. Özel ilan için Premium AI moduna geçip kapak üretebilirsiniz.
            </p>
          )}

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

          <div className={message || error ? 'space-y-2' : 'hidden'} aria-live="polite">
            <p className={message ? 'rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-neutral-900 dark:text-emerald-300' : 'hidden'}>
              {message ?? ''}
            </p>
            <p className={error ? 'rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300' : 'hidden'}>
              {error ?? ''}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            <ImageIcon className="h-4 w-4" />
            Kapak önizleme
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2" translate="no">
              <span
                className={[
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  generatedCover
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
                ].join(' ')}
              >
                {generatedCover ? 'AI kapak hazır' : coverMode === 'free' ? 'Ücretsiz şablon' : 'Statik önizleme'}
              </span>
              <button
                type="button"
                disabled={!selectedListing || Boolean(generatedCover)}
                onClick={() => setCoverPreviewRev(Date.now())}
                className={[
                  'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
                  generatedCover ? 'hidden' : '',
                ].join(' ')}
              >
                Önizlemeyi yenile
              </button>
              <button
                type="button"
                disabled={coverBusy || !selectedListing || coverMode !== 'premium'}
                onClick={() => void onGenerateCover()}
                className={[
                  'flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50',
                  coverMode === 'premium' ? '' : 'hidden',
                ].join(' ')}
              >
                <Loader2 className={coverBusy ? 'h-4 w-4 animate-spin' : 'hidden h-4 w-4'} />
                <Sparkles className={coverBusy ? 'hidden h-4 w-4' : 'h-4 w-4'} />
                <span>{coverBusy ? 'Üretiliyor…' : 'Premium AI Kapak Üret'}</span>
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-[620px]">
              {coverUrl ? (
                <img src={coverUrl} alt="Sosyal paylaşım kapağı" className="aspect-square w-full rounded-2xl object-cover shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-neutral-100 px-8 text-center text-sm text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
                  Önizleme için tek ilan seçin.
                </div>
              )}
            </div>
          </div>
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
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Facebook + Instagram&apos;da Paylaş</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">İlanı ada göre bulun, Facebook sayfanıza ve Instagram hesabınıza anında gönderin</p>
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
          {busy ? 'Paylaşılıyor…' : 'Facebook + Instagram\'da Paylaş'}
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
  const err = (j.error_message ?? '').trim()
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
          {j.status}
        </span>
        {j.network && (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {j.network}
          </span>
        )}
        {j.post_type && j.post_type !== 'feed' && (
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            {j.post_type === 'reel' ? 'Reels' : 'Story'}
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
      {err && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {err}
        </p>
      )}
    </div>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function AdminSocialSection() {
  const [jobs, setJobs] = useState<SocialShareJob[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'posted' | 'failed'>('all')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bulk, setBulk] = useState<BulkProcessState>(BULK_IDLE_STATE)
  const bulkCancelRef = useRef(false)
  const bulkRunningRef = useRef(false)

  const refresh = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setLoadErr(null)
    setLoading(true)
    try {
      const j = await listSocialJobs(token, {
        limit: 1000,
      })
      setJobs(j.jobs)
    } catch (e) {
      setLoadErr(formatManageApiCatch(e, 'social_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  // Sekme kapanırsa/bileşen kaldırılırsa döngüyü durdur.
  useEffect(() => () => { bulkCancelRef.current = true }, [])

  const runBulkProcess = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token || bulkRunningRef.current) return
    bulkRunningRef.current = true
    bulkCancelRef.current = false
    setLoadErr(null)
    setBulk({ ...BULK_IDLE_STATE, phase: 'running', message: 'Başlatılıyor…' })

    let batch = 0
    let totalProcessed = 0
    let totalPosted = 0
    let totalFailed = 0
    try {
      while (!bulkCancelRef.current) {
        batch += 1
        setBulk((s) => ({ ...s, phase: 'running', batch, message: `${batch}. grup işleniyor…`, countdown: 0 }))
        // Tek istek / tek iş — Instagram carousel + AI uzun sürer; büyük limit nginx 504 verir.
        const out = await processSocialPendingJobs(token, { limit: 1, rotate: false })
        totalProcessed += out.processed
        totalPosted += out.posted
        totalFailed += out.failed
        await refresh()

        if (out.processed === 0) {
          setBulk({ phase: 'done', batch, totalProcessed, totalPosted, totalFailed, message: 'Bekleyen iş kalmadı.', countdown: 0 })
          break
        }
        if (bulkCancelRef.current) break

        const failedResult = (out.results ?? []).find((r) => !r.ok)
        const rateLimited = out.posted === 0 && out.failed === 0 && Boolean(failedResult)
        if (rateLimited) {
          setBulk({
            phase: 'rate_limited',
            batch,
            totalProcessed,
            totalPosted,
            totalFailed,
            message: `Platform limiti tespit edildi (${failedResult?.error ?? 'rate limit'}). Bekleniyor…`,
            countdown: Math.ceil(BULK_RATE_LIMIT_SLEEP_MS / 1000),
          })
          await sleepWithCountdown(BULK_RATE_LIMIT_SLEEP_MS, bulkCancelRef, (countdown) =>
            setBulk((s) => (s.phase === 'rate_limited' ? { ...s, countdown } : s)))
        } else {
          setBulk({
            phase: 'waiting',
            batch,
            totalProcessed,
            totalPosted,
            totalFailed,
            message: out.failed > 0 ? 'Bir iş başarısız oldu, sonraki gruba geçmeden bekleniyor…' : 'Sonraki gruba geçmeden bekleniyor…',
            countdown: Math.ceil(BULK_BATCH_SLEEP_MS / 1000),
          })
          await sleepWithCountdown(BULK_BATCH_SLEEP_MS, bulkCancelRef, (countdown) =>
            setBulk((s) => (s.phase === 'waiting' ? { ...s, countdown } : s)))
        }
      }
      if (bulkCancelRef.current) {
        setBulk({ phase: 'stopped', batch, totalProcessed, totalPosted, totalFailed, message: 'Durduruldu.', countdown: 0 })
      }
    } catch (e) {
      setBulk({
        phase: 'error',
        batch,
        totalProcessed,
        totalPosted,
        totalFailed,
        message: formatManageApiCatch(e, 'social_worker_process_failed'),
        countdown: 0,
      })
    } finally {
      bulkRunningRef.current = false
    }
  }, [refresh])

  const stopBulkProcess = useCallback(() => {
    bulkCancelRef.current = true
  }, [])

  const bulkActive = bulk.phase === 'running' || bulk.phase === 'waiting' || bulk.phase === 'rate_limited'

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
            <p className="mt-0.5 text-xs text-[color:var(--manage-text-muted)]">Facebook / Instagram / Pinterest paylaşım kuyruğu ve kayıtları</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {bulkActive ? (
              <button
                type="button"
                onClick={stopBulkProcess}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <StopCircle className="h-3.5 w-3.5" />
                Durdur
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void runBulkProcess()}
                disabled={loading || counts.pending === 0}
                className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Tüm bekleyenleri işle
              </button>
            )}
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
        </div>

        {bulk.phase !== 'idle' && (
          <div
            className={[
              'mb-3 rounded-xl border px-4 py-3 text-sm',
              bulk.phase === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                : bulk.phase === 'rate_limited'
                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
                : bulk.phase === 'done'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300',
            ].join(' ')}
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center gap-2">
              {bulkActive ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : bulk.phase === 'done' ? <CheckCircle className="h-4 w-4 shrink-0" /> : bulk.phase === 'error' ? <XCircle className="h-4 w-4 shrink-0" /> : null}
              <span className="font-medium">{bulk.message}</span>
              {bulk.countdown > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold dark:bg-black/20">
                  <Clock className="h-3 w-3" />
                  {bulk.countdown}sn
                </span>
              )}
            </div>
            <p className="mt-1 text-xs opacity-80">
              Grup: {bulk.batch} · İşlenen: {bulk.totalProcessed} · Paylaşılan: {bulk.totalPosted} · Başarısız: {bulk.totalFailed}
            </p>
            {bulk.phase === 'rate_limited' && (
              <p className="mt-1 text-xs opacity-80">
                Facebook/Instagram/Pinterest kısa süreli işlem limitine takıldı — otomatik olarak bekleyip tekrar denenecek, bir şey yapmanıza gerek yok.
              </p>
            )}
          </div>
        )}

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
