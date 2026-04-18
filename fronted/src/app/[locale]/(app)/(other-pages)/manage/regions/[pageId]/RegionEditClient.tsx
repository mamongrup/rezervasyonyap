'use client'

import {
  getLocationPage,
  patchLocationPage,
  listLocationCountries,
  listLocationRegions,
  listLocationDistricts,
  type LocationPage,
  type LocationCountry,
  type LocationRegion,
  type LocationDistrict,
  type TravelIdea,
  type ManualPoi,
  type LocationTranslations,
} from '@/lib/travel-api'
import { parseFreeformDoc } from '@/lib/freeform-banner-spec'
import { parseGalleryBundle } from '@/lib/hero-gallery-slots'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import { regionPublicHref } from '@/lib/region-public-path'
import { getPublicSiteUrl, toAbsoluteSiteUrl } from '@/lib/site-branding-seo'
import clsx from 'clsx'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import RichEditor from '@/components/editor/RichEditor'
import MapPicker from '@/components/editor/MapPicker'
import ImageUpload from '@/components/editor/ImageUpload'
import {
  MANAGE_FORM_CONTAINER_CLASS,
  MANAGE_STICKY_FOOTER_SCROLL_PADDING,
  ManageFormListingSection,
  ManageFormPageHeader,
} from '@/components/manage/ManageFormShell'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { ManageAiTranslateToolbar } from '@/components/manage/ManageAiTranslateToolbar'
import { callAiTranslate } from '@/lib/manage-content-ai'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Başlıktan SEO-uyumlu slug oluşturur (Türkçe karakter dönüşümü dahil) */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/İ/g, 'i').replace(/ı/g, 'i')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/[^a-z0-9/\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Locale config ────────────────────────────────────────────────────────────
const LOCALES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

const LOCALES_TR_TARGET = LOCALES.filter((l) => l.code !== 'tr')

const REGION_TYPES = [
  { value: 'country',     label: 'Ülke — tek başına ülke kaydı' },
  { value: 'province',    label: 'İl — harita noktası, alt ilçelerle bağlantı' },
  { value: 'district',    label: 'İlçe — harita noktası ve yakındaki mekanlar' },
  { value: 'destination', label: 'Destinasyon — özel tatil / keşif noktası, mekanlar dahil' },
]

/** Mekanlar (POI) modülünün gösterileceği bölge tipleri */
const POIS_VISIBLE = new Set(['district', 'destination'])

const POI_CATEGORIES = [
  'Plaj', 'Havalimanı', 'Otobüs Terminali', 'Marina', 'Restoran', 'Tarihi Alan',
  'Müze', 'Alışveriş Merkezi', 'Hastane', 'Eczane', 'Banka', 'Kamp Alanı', 'Diğer',
]

const SEO_BRAND_SUFFIX = ' | Mamon Travel'

/** Rich metinden SEO açıklaması için düz metin */
function stripHtmlToPlain(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fitMetaTitle(name: string): string {
  const n = name.trim() || 'Bölge'
  const max = 70
  if (n.length + SEO_BRAND_SUFFIX.length <= max) return n + SEO_BRAND_SUFFIX
  const room = max - SEO_BRAND_SUFFIX.length
  const cut = n.slice(0, Math.max(0, room - 1))
  const sp = cut.lastIndexOf(' ')
  const head = sp > room * 0.35 ? cut.slice(0, sp) : cut
  return `${head || n.slice(0, room)}…${SEO_BRAND_SUFFIX}`
}

function fitMetaDescription(plain: string, name: string, regionLabel: string): string {
  const max = 160
  const compact = plain.replace(/\s+/g, ' ').trim()
  if (compact.length >= 40) {
    if (compact.length <= max) return compact
    const cut = compact.slice(0, max - 1)
    const sp = cut.lastIndexOf(' ')
    return (sp > max * 0.35 ? cut.slice(0, sp) : cut) + '…'
  }
  const hint = regionLabel ? ` ${regionLabel} rehberi.` : ''
  let fallback = `${name} — konaklama, gezilecek yerler ve seyahat ipuçları Mamon Travel'da.${hint}`
  if (fallback.length > max) fallback = fallback.slice(0, max - 1) + '…'
  return fallback
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** country_info_json içindeki acil hatlar — eski format: yalnızca numara dizisi veya eksik alan */
function normalizeEmergencyNumbers(raw: unknown): { label: string; number: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { label: string; number: string }[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const n = item.trim()
      if (n) out.push({ label: '', number: n })
      continue
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      const label = typeof o.label === 'string' ? o.label.trim() : ''
      const num =
        typeof o.number === 'string'
          ? o.number.trim()
          : typeof o.num === 'string'
            ? o.num.trim()
            : ''
      if (label || num) out.push({ label, number: num })
    }
  }
  return out
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
const inputCls = 'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[color:var(--manage-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'
const textareaCls = `${inputCls} min-h-[120px] resize-y`
const labelCls = 'mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300'
const hintCls = 'mt-1 text-xs text-neutral-400'

function Card({
  title,
  children,
  action,
  plain,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  /** İlan ekleme (listingSection) içinde: çerçeve yok, bölüm başlığı + boşluk */
  plain?: boolean
}) {
  if (plain) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
          {action}
        </div>
        <div>{children}</div>
      </section>
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function ImageUploader({ label, hint, value, onChange, aspectRatio = '4/3' }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; aspectRatio?: string
}) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      {hint && <p className={`${hintCls} mb-2`}>{hint}</p>}
      <ImageUpload
        value={value}
        onChange={onChange}
        folder="regions"
        prefix={label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
        aspectRatio={aspectRatio}
        placeholder={`${label} yükleyin`}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RegionEditClient({ pageId }: { pageId: string }) {
  const routeParams = useParams<{ locale?: string }>()
  const routeLocale =
    typeof routeParams?.locale === 'string' && isAppLocale(routeParams.locale)
      ? routeParams.locale
      : defaultLocale

  const [page, setPage] = useState<LocationPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [activeLang, setActiveLang] = useState('tr')

  // ─── Content state ────────────────────────────────────────────────────────
  const [slugPath, setSlugPath] = useState('')
  const [slugLocked, setSlugLocked] = useState(true)   // true = auto-mode, false = manual edit
  const [regionType, setRegionType] = useState<'country' | 'province' | 'district' | 'destination'>('district')
  const [isPublished, setIsPublished] = useState(false)

  // ─── Country info (only for regionType === 'country') ─────────────────────
  const [ciLanguages, setCiLanguages] = useState<string[]>([])
  const [ciCurrencies, setCiCurrencies] = useState<string[]>([])
  const [ciConsulatePhone, setCiConsulatePhone] = useState('')
  const [ciEmergencyNumbers, setCiEmergencyNumbers] = useState<{ label: string; number: string }[]>([])
  const [ciFlagEmoji, setCiFlagEmoji] = useState('')
  const [ciFlagUrl, setCiFlagUrl] = useState('')
  const [ciLangInput, setCiLangInput] = useState('')
  const [ciCurrInput, setCiCurrInput] = useState('')

  // Per-language content
  const [translations, setTranslations] = useState<LocationTranslations>({
    tr: { name: '', description: '', meta_title: '', meta_description: '' },
    en: { name: '', description: '', meta_title: '', meta_description: '' },
    de: { name: '', description: '', meta_title: '', meta_description: '' },
    ru: { name: '', description: '', meta_title: '', meta_description: '' },
    fr: { name: '', description: '', meta_title: '', meta_description: '' },
    zh: { name: '', description: '', meta_title: '', meta_description: '' },
  })

  // ─── Images ───────────────────────────────────────────────────────────────
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [travelIdeasImageUrl, setTravelIdeasImageUrl] = useState('')
  /** Hero galerisi: tam olarak 3 resim (gallery_json olarak saklanır) */
  const [heroGallery, setHeroGallery] = useState<[string, string, string]>(['', '', ''])
  /** Serbest banner yerleşimi (Banner düzen motoru JSON) — boşsa klasik galeri dizisi */
  const [heroBannerLayoutJson, setHeroBannerLayoutJson] = useState('')

  // ─── Coordinates ──────────────────────────────────────────────────────────
  const [mapLat, setMapLat] = useState('')
  const [mapLng, setMapLng] = useState('')
  const [mapZoom, setMapZoom] = useState('12')

  // ─── District linkage ─────────────────────────────────────────────────────
  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [regions, setRegions] = useState<LocationRegion[]>([])
  const [districts, setDistricts] = useState<LocationDistrict[]>([])
  const [selCountry, setSelCountry] = useState('')
  const [selRegion, setSelRegion] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [loadingR, setLoadingR] = useState(false)
  const [loadingD, setLoadingD] = useState(false)

  // ─── Manual POIs ──────────────────────────────────────────────────────────
  const [manualPois, setManualPois] = useState<ManualPoi[]>([])
  const [newPoiCat, setNewPoiCat] = useState('')
  const [newPoiName, setNewPoiName] = useState('')
  const [newPoiDist, setNewPoiDist] = useState('5')
  const [newPoiLat, setNewPoiLat] = useState('')
  const [newPoiLng, setNewPoiLng] = useState('')
  const [fetchingDists, setFetchingDists] = useState(false)

  // ─── Travel ideas ─────────────────────────────────────────────────────────
  const [travelIdeas, setTravelIdeas] = useState<TravelIdea[]>([])
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null)

  // ─── SEO ──────────────────────────────────────────────────────────────────
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDesc, setMetaDesc] = useState('')

  // ─── AI (çeviri + Magic Text polish) ───────────────────────────────────────
  const [aiTargetLocale, setAiTargetLocale] = useState('en')
  const [aiTranslating, setAiTranslating] = useState(false)
  const [aiPolishTitle, setAiPolishTitle] = useState(false)
  const [aiPolishBody, setAiPolishBody] = useState(false)
  const [aiPolishFooterMeta, setAiPolishFooterMeta] = useState(false)

  // ─── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const [p, countriesRes] = await Promise.all([
          getLocationPage(pageId),
          listLocationCountries(),
        ])
        setPage(p)
        setSlugPath(p.slug_path)
        setRegionType(p.region_type ?? 'district')
        setIsPublished(p.is_published)
        setFeaturedImageUrl(p.featured_image_url ?? '')
        setHeroImageUrl(p.hero_image_url ?? '')
        setTravelIdeasImageUrl(p.travel_ideas_image_url ?? '')
        {
          const { urls, layout } = parseGalleryBundle(p.gallery_json as unknown)
          setHeroGallery(urls)
          setHeroBannerLayoutJson(layout ? JSON.stringify(layout, null, 2) : '')
        }
        setMapLat(p.map_lat ?? '')
        setMapLng(p.map_lng ?? '')
        setMapZoom(String(p.map_zoom ?? 12))
        setDistrictId(p.district_id ?? '')
        setMetaTitle(p.meta_title ?? '')
        setMetaDesc(p.meta_description ?? '')

        // Parse translations
        try {
          const parsed = JSON.parse(p.translations_json) as LocationTranslations
          const merged: LocationTranslations = {}
          for (const loc of LOCALES) {
            merged[loc.code] = {
              name: parsed[loc.code]?.name ?? (loc.code === 'tr' ? p.title ?? '' : ''),
              description: parsed[loc.code]?.description ?? (loc.code === 'tr' ? p.description ?? '' : ''),
              meta_title: parsed[loc.code]?.meta_title ?? '',
              meta_description: parsed[loc.code]?.meta_description ?? '',
            }
          }
          setTranslations(merged)
        } catch {
          setTranslations((prev) => ({
            ...prev,
            tr: { name: p.title ?? '', description: p.description ?? '', meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '' },
          }))
        }

        // Parse POIs
        try { setManualPois(JSON.parse(p.poi_manual_json) as ManualPoi[]) } catch { setManualPois([]) }
        // Parse travel ideas
        try { setTravelIdeas(JSON.parse(p.travel_ideas_json) as TravelIdea[]) } catch { setTravelIdeas([]) }
        // Parse country info
        try {
          const ci = JSON.parse(p.country_info_json ?? '{}') as {
            languages?: string[]
            currencies?: string[]
            consulate_phone?: string
            emergency_numbers?: { label: string; number: string }[]
            flag_emoji?: string
            flag_url?: string
          }
          setCiLanguages(ci.languages ?? [])
          setCiCurrencies(ci.currencies ?? [])
          setCiConsulatePhone(ci.consulate_phone ?? '')
          setCiEmergencyNumbers(normalizeEmergencyNumbers(ci.emergency_numbers))
          setCiFlagEmoji(ci.flag_emoji ?? '')
          setCiFlagUrl(ci.flag_url ?? '')
        } catch { /* ignore */ }

        setCountries(countriesRes.countries)
      } catch {
        // not found
      } finally {
        setLoading(false)
      }
    })()
  }, [pageId])

  useEffect(() => {
    document.documentElement.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pageId])

  const loadRegions = useCallback(async (cid: string) => {
    setLoadingR(true); setRegions([]); setDistricts([]); setSelRegion('')
    try { const r = await listLocationRegions(cid); setRegions(r.regions) }
    finally { setLoadingR(false) }
  }, [])

  const loadDistricts = useCallback(async (rid: string) => {
    setLoadingD(true); setDistricts([])
    try { const r = await listLocationDistricts(rid); setDistricts(r.districts) }
    finally { setLoadingD(false) }
  }, [])

  const setTransField = (locale: string, field: string, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }))
    // Auto-generate slug from TR name when locked
    if (locale === 'tr' && field === 'name' && slugLocked) {
      const base = slugPath.includes('/')
        ? slugPath.slice(0, slugPath.lastIndexOf('/') + 1)
        : ''
      setSlugPath(base + toSlug(value))
    }
  }

  const handleAutoSeo = useCallback(() => {
    const tr = translations['tr']
    const slugTail = slugPath.split('/').filter(Boolean).pop() ?? ''
    const nameRaw = (tr?.name ?? page?.title ?? slugTail).trim() || 'Bölge'
    const plain = stripHtmlToPlain(tr?.description ?? page?.description ?? '')
    const regionLabel =
      REGION_TYPES.find((r) => r.value === regionType)?.label?.split('—')[0]?.trim() ?? ''
    const title = fitMetaTitle(nameRaw)
    const desc = fitMetaDescription(plain, nameRaw || slugTail || 'Bölge', regionLabel)
    setMetaTitle(title.slice(0, 70))
    setMetaDesc(desc.slice(0, 160))
    setTranslations((prev) => ({
      ...prev,
      tr: {
        ...prev.tr,
        meta_title: title.slice(0, 70),
        meta_description: desc.slice(0, 160),
      },
    }))
    setSaveMsg({ ok: true, text: 'SEO başlık ve açıklama üretildi. Kaydetmeyi unutmayın.' })
  }, [translations, slugPath, page, regionType])

  const handleMagicPolishTitle = async () => {
    const raw = (translations[activeLang]?.name ?? '').trim()
    if (!raw) {
      setSaveMsg({ ok: false, text: 'Önce başlık (isim) alanına metin girin.' })
      return
    }
    setAiPolishTitle(true)
    setSaveMsg(null)
    try {
      const out = await callAiTranslate({
        text: raw,
        context: 'title',
        sourceLocale: activeLang,
        targetLocale: activeLang,
      })
      if (out) setTransField(activeLang, 'name', out.slice(0, 200))
      setSaveMsg({ ok: true, text: 'Başlık SEO ve yazım kurallarına göre iyileştirildi.' })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : 'İşlem başarısız' })
    } finally {
      setAiPolishTitle(false)
    }
  }

  const handleMagicPolishBody = async () => {
    const raw = (translations[activeLang]?.description ?? '').trim()
    if (!raw) {
      setSaveMsg({ ok: false, text: 'Önce açıklama içeriği girin.' })
      return
    }
    setAiPolishBody(true)
    setSaveMsg(null)
    try {
      const out = await callAiTranslate({
        text: raw,
        context: 'body',
        sourceLocale: activeLang,
        targetLocale: activeLang,
        pageSlug: slugPath,
      })
      if (out) setTransField(activeLang, 'description', out)
      setSaveMsg({
        ok: true,
        text: 'Açıklama iyileştirildi (vurgu ve iç linkler). Kaydetmeyi unutmayın.',
      })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : 'İşlem başarısız' })
    } finally {
      setAiPolishBody(false)
    }
  }

  const handleAiTranslateTrToTarget = async () => {
    if (aiTargetLocale === 'tr') {
      setSaveMsg({ ok: false, text: 'Hedef dil olarak Türkçe dışında bir dil seçin.' })
      return
    }
    const tr = translations['tr']
    const name = (tr?.name ?? '').trim()
    const desc = (tr?.description ?? '').trim()
    if (!name && !desc) {
      setSaveMsg({ ok: false, text: 'Önce Türkçe isim veya açıklama girin.' })
      return
    }
    setAiTranslating(true)
    setSaveMsg(null)
    try {
      const mtSrc = (metaTitle || tr?.meta_title || '').trim()
      const mdSrc = (metaDesc || tr?.meta_description || '').trim()
      const [tName, tDesc, tMetaTitle, tMetaDesc] = await Promise.all([
        name
          ? callAiTranslate({ text: name, context: 'title', sourceLocale: 'tr', targetLocale: aiTargetLocale })
          : Promise.resolve(''),
        desc
          ? callAiTranslate({
              text: desc,
              context: 'body',
              sourceLocale: 'tr',
              targetLocale: aiTargetLocale,
              pageSlug: slugPath,
            })
          : Promise.resolve(''),
        mtSrc
          ? callAiTranslate({ text: mtSrc, context: 'seo', sourceLocale: 'tr', targetLocale: aiTargetLocale })
          : Promise.resolve(''),
        mdSrc
          ? callAiTranslate({ text: mdSrc, context: 'seo', sourceLocale: 'tr', targetLocale: aiTargetLocale })
          : Promise.resolve(''),
      ])
      setTranslations((prev) => ({
        ...prev,
        [aiTargetLocale]: {
          ...prev[aiTargetLocale],
          name: tName || prev[aiTargetLocale]?.name || '',
          description: tDesc || prev[aiTargetLocale]?.description || '',
          meta_title: tMetaTitle || prev[aiTargetLocale]?.meta_title || '',
          meta_description: tMetaDesc || prev[aiTargetLocale]?.meta_description || '',
        },
      }))
      setSaveMsg({
        ok: true,
        text: `${LOCALES.find((l) => l.code === aiTargetLocale)?.label ?? aiTargetLocale} çevirisi hazır. Kaydetmeyi unutmayın.`,
      })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : 'Çeviri başarısız' })
    } finally {
      setAiTranslating(false)
    }
  }

  const handleFooterAiPolishMeta = async () => {
    const mt = (metaTitle || translations['tr']?.meta_title || '').trim()
    const md = (metaDesc || translations['tr']?.meta_description || '').trim()
    if (!mt && !md) {
      setSaveMsg({ ok: false, text: 'Önce meta alanlarını doldurun veya “SEO Otomatik” kullanın.' })
      return
    }
    setAiPolishFooterMeta(true)
    setSaveMsg(null)
    try {
      const [t1, t2] = await Promise.all([
        mt ? callAiTranslate({ text: mt, context: 'seo', sourceLocale: 'tr', targetLocale: 'tr' }) : Promise.resolve(''),
        md ? callAiTranslate({ text: md, context: 'seo', sourceLocale: 'tr', targetLocale: 'tr' }) : Promise.resolve(''),
      ])
      if (t1) setMetaTitle(t1.slice(0, 70))
      if (t2) setMetaDesc(t2.slice(0, 160))
      setTranslations((prev) => ({
        ...prev,
        tr: {
          ...prev.tr,
          meta_title: t1 ? t1.slice(0, 70) : prev.tr?.meta_title,
          meta_description: t2 ? t2.slice(0, 160) : prev.tr?.meta_description,
        },
      }))
      setSaveMsg({ ok: true, text: 'Meta alanları SEO ve yazım için iyileştirildi.' })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : 'İşlem başarısız' })
    } finally {
      setAiPolishFooterMeta(false)
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const trLang = translations['tr'] ?? {}
      await patchLocationPage(pageId, {
        slug_path: slugPath || undefined,
        district_id: districtId || undefined,
        title: trLang.name || undefined,
        description: trLang.description || undefined,
        meta_title: metaTitle || undefined,
        meta_description: metaDesc || undefined,
        is_published: isPublished,
        region_type: regionType,
        featured_image_url: featuredImageUrl || undefined,
        hero_image_url: heroImageUrl || undefined,
        travel_ideas_image_url: travelIdeasImageUrl || undefined,
        gallery_json: (() => {
          const trimmed = heroBannerLayoutJson.trim()
          if (trimmed) {
            try {
              const layout = parseFreeformDoc(JSON.parse(trimmed) as unknown)
              if (layout) {
                return JSON.stringify({
                  images: [heroGallery[0] ?? '', heroGallery[1] ?? '', heroGallery[2] ?? ''],
                  layout,
                })
              }
            } catch {
              throw new Error('Hero banner yerleşim JSON geçersiz (Banner düzen motoru formatı).')
            }
          }
          return JSON.stringify([heroGallery[0] ?? '', heroGallery[1] ?? '', heroGallery[2] ?? ''])
        })(),
        map_lat: mapLat || undefined,
        map_lng: mapLng || undefined,
        translations_json: JSON.stringify(translations),
        travel_ideas_json: JSON.stringify(travelIdeas),
        poi_manual_json: JSON.stringify(manualPois),
        country_info_json: JSON.stringify({
          languages: ciLanguages,
          currencies: ciCurrencies,
          consulate_phone: ciConsulatePhone,
          emergency_numbers: ciEmergencyNumbers,
          flag_emoji: ciFlagEmoji,
          flag_url: ciFlagUrl,
        }),
      })
      try {
        const p = await getLocationPage(pageId)
        {
          const { urls, layout } = parseGalleryBundle(p.gallery_json as unknown)
          setHeroGallery(urls)
          setHeroBannerLayoutJson(layout ? JSON.stringify(layout, null, 2) : '')
        }
      } catch {
        /* kayıt başarılı; yenileme isteğe bağlı */
      }
      setSaveMsg({ ok: true, text: 'Değişiklikler kaydedildi.' })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : 'Kaydedilemedi' })
    } finally { setSaving(false) }
  }

  // ─── Manual POI ───────────────────────────────────────────────────────────
  const addManualPoi = () => {
    if (!newPoiName.trim()) return
    const latNum = newPoiLat.trim() ? parseFloat(newPoiLat) : null
    const lngNum = newPoiLng.trim() ? parseFloat(newPoiLng) : null

    // Koordinat ve bölge merkezi varsa mesafeyi otomatik hesapla
    let distKm = parseFloat(newPoiDist) || 5
    if (latNum != null && lngNum != null && mapLat && mapLng) {
      distKm = Math.round(haversineKm(parseFloat(mapLat), parseFloat(mapLng), latNum, lngNum) * 10) / 10
    }

    setManualPois((prev) => [
      ...prev,
      {
        id: uid(),
        category: newPoiCat || 'Diğer',
        name: newPoiName.trim(),
        distance_km: distKm,
        lat: latNum,
        lng: lngNum,
      },
    ])
    setNewPoiName('')
    setNewPoiLat('')
    setNewPoiLng('')
  }

  const removeManualPoi = (id: string) => setManualPois((prev) => prev.filter((p) => p.id !== id))

  const fetchNearbyDistances = async () => {
    if (!mapLat || !mapLng) { alert('Önce koordinatları girin ve kaydedin.'); return }
    setFetchingDists(true)
    try {
      const res = await fetch('/api/places-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: parseFloat(mapLat), lng: parseFloat(mapLng), type: 'airport', radius: 150000, maxResults: 3 }),
      })
      if (res.ok) {
        const data = await res.json() as { places?: { name: string; distanceKm: number }[] }
        if (data.places?.length) {
          const newPois: ManualPoi[] = data.places.map((p) => ({
            id: uid(), category: 'Havalimanı', name: p.name, distance_km: p.distanceKm,
          }))
          setManualPois((prev) => [...prev.filter((p) => p.category !== 'Havalimanı'), ...newPois])
        }
      }
    } finally { setFetchingDists(false) }
  }

  // ─── Travel idea CRUD ─────────────────────────────────────────────────────
  const addTravelIdea = () => {
    setTravelIdeas((prev) => [
      ...prev,
      { id: uid(), image: '', title: '', link: '', summary: '' },
    ])
    setEditingIdeaId(travelIdeas.length > 0 ? null : null)
  }

  const updateTravelIdea = (id: string, field: keyof TravelIdea, value: string) => {
    setTravelIdeas((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }

  const removeTravelIdea = (id: string) => setTravelIdeas((prev) => prev.filter((i) => i.id !== id))

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />Yükleniyor…
      </div>
    )
  }
  if (!page) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-neutral-500">Bölge sayfası bulunamadı.</p>
        <Link href="/manage/regions" className="mt-4 text-sm text-[color:var(--manage-primary)] hover:underline">← Bölge listesine dön</Link>
      </div>
    )
  }

  const currentTranslation = translations[activeLang] ?? {}

  return (
    <div className={clsx('min-h-screen bg-neutral-50 dark:bg-neutral-950', MANAGE_STICKY_FOOTER_SCROLL_PADDING)}>
      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/manage/regions"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {translations['tr']?.name || page.slug_path}
            </p>
            <p className="font-mono text-xs text-neutral-400">{regionPublicHref(routeLocale, page.slug_path)}</p>
          </div>

          {/* Language tabs + AI çeviri */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              {LOCALES.map((loc) => (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => setActiveLang(loc.code)}
                  className={clsx(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    activeLang === loc.code
                      ? 'bg-white text-[color:var(--manage-primary)] shadow-sm dark:bg-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                  )}
                >
                  <span>{loc.flag}</span>
                  <span className="hidden lg:inline">{loc.label}</span>
                </button>
              ))}
            </div>
            <ManageAiTranslateToolbar
              locales={LOCALES_TR_TARGET}
              targetLocale={aiTargetLocale}
              onTargetLocaleChange={setAiTargetLocale}
              onTranslate={() => void handleAiTranslateTrToTarget()}
              translating={aiTranslating}
            />
          </div>
        </div>

        {/* Mobile language tabs + AI */}
        <div className="flex flex-col gap-2 border-t border-neutral-100 px-4 py-2 dark:border-neutral-800 md:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                type="button"
                onClick={() => setActiveLang(loc.code)}
                className={clsx(
                  'flex shrink-0 items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                  activeLang === loc.code
                    ? 'bg-[color:var(--manage-primary)]/10 text-[color:var(--manage-primary)]'
                    : 'text-neutral-500',
                )}
              >
                {loc.flag} {loc.label}
              </button>
            ))}
          </div>
          <ManageAiTranslateToolbar
            className="w-full min-w-0 flex-1 [&_select]:max-w-none"
            locales={LOCALES_TR_TARGET}
            targetLocale={aiTargetLocale}
            onTargetLocaleChange={setAiTargetLocale}
            onTranslate={() => void handleAiTranslateTrToTarget()}
            translating={aiTranslating}
          />
        </div>
      </div>

      {/* Sabit alt çubuk: hızlı erişim + yayın / kaydet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/95">
        <div className={clsx(MANAGE_FORM_CONTAINER_CLASS, 'flex flex-wrap items-center justify-between gap-3')}>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <span className="hidden text-xs font-semibold uppercase tracking-wide text-neutral-400 sm:inline">
              Hızlı erişim
            </span>
            <a
              href={regionPublicHref(routeLocale, slugPath)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              Public Sayfa
            </a>
            <Link
              href="/manage/regions/places"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Navigation className="h-3.5 w-3.5 shrink-0" />
              Google Mekanlar
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-1.5 dark:border-neutral-700">
            <span className="text-xs text-neutral-500">Yayın</span>
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={clsx(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                isPublished ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600',
              )}
              aria-pressed={isPublished}
              aria-label={isPublished ? 'Yayında' : 'Taslak'}
            >
              <span
                className={clsx(
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                  isPublished ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </button>
            <span className={clsx('text-xs font-semibold', isPublished ? 'text-emerald-600' : 'text-neutral-400')}>
              {isPublished ? 'Yayında' : 'Taslak'}
            </span>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          </div>
        </div>
      </div>

      {/* Save message */}
      {saveMsg ? (
        <div className={clsx(
          MANAGE_FORM_CONTAINER_CLASS,
          'mt-4 flex items-center gap-2 rounded-xl border py-3 text-sm',
          saveMsg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'border-red-200 bg-red-50 text-red-700',
        )}>
          {saveMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {saveMsg.text}
          <button type="button" onClick={() => setSaveMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className={clsx(MANAGE_FORM_CONTAINER_CLASS, 'pt-6 sm:pt-10')}>
        <ManageFormPageHeader
          title="Bölge düzenle"
          subtitle={
            <>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                {translations['tr']?.name?.trim() || page.slug_path}
              </span>
              <span className="ml-2 font-mono text-xs text-neutral-400">{regionPublicHref(routeLocale, slugPath)}</span>
            </>
          }
        />

        <ManageFormListingSection>
          {/* Konum İçeriği */}
          <Card plain title={`Konum İçeriği — ${LOCALES.find((l) => l.code === activeLang)?.flag} ${LOCALES.find((l) => l.code === activeLang)?.label}`}>
            <div className="space-y-4">
              {/* İsim + otomatik slug ─────────────────────────────── */}
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className={`${labelCls} mb-0`}>
                    İsim <span className="text-red-500">*</span>
                  </label>
                  <ManageAiMagicTextButton
                    loading={aiPolishTitle}
                    onClick={() => void handleMagicPolishTitle()}
                    title="SEO ve yazım kurallarına uygun başlık önerisi"
                  />
                </div>
                <input
                  type="text"
                  value={currentTranslation.name ?? ''}
                  onChange={(e) => setTransField(activeLang, 'name', e.target.value)}
                  placeholder="örn: Bodrum, Antalya…"
                  className={inputCls}
                />
                <p className={hintCls}>Aktif dil: {LOCALES.find((l) => l.code === activeLang)?.label}. Magic Text mevcut dilde iyileştirir.</p>
              </div>

              {/* Slug — auto-generated or manually edited */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={`${labelCls} mb-0`}>
                    Kalıcı Bağlantı (Slug)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (slugLocked) {
                        setSlugLocked(false)
                      } else {
                        // Re-lock: regenerate from TR name
                        const name = translations['tr']?.name ?? ''
                        const base = slugPath.includes('/')
                          ? slugPath.slice(0, slugPath.lastIndexOf('/') + 1)
                          : ''
                        setSlugPath(base + toSlug(name))
                        setSlugLocked(true)
                      }
                    }}
                    className={clsx(
                      'flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium transition-colors',
                      slugLocked
                        ? 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400',
                    )}
                  >
                    <Pencil className="h-3 w-3" />
                    {slugLocked ? 'Düzenle' : 'Kilitle'}
                  </button>
                </div>

                <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white focus-within:border-[color:var(--manage-primary)] dark:border-neutral-700 dark:bg-neutral-800">
                  {/* Site prefix */}
                  <span className="shrink-0 border-r border-neutral-100 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800/80">
                    {slugPath.includes('/') ? `…/${slugPath.slice(0, slugPath.lastIndexOf('/') + 1)}` : '/'}
                  </span>

                  {/* Slug segment — read-only or editable */}
                  {slugLocked ? (
                    <div className="flex flex-1 items-center justify-between gap-2 px-3 py-2">
                      <span className="font-mono text-sm text-neutral-800 dark:text-neutral-200">
                        {slugPath.includes('/') ? slugPath.slice(slugPath.lastIndexOf('/') + 1) : slugPath}
                      </span>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 dark:bg-neutral-700">
                        otomatik
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      autoFocus
                      value={slugPath}
                      onChange={(e) => setSlugPath(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9/-]/g, ''))}
                      placeholder="turkiye/mugla/bodrum"
                      className="flex-1 bg-transparent px-3 py-2 font-mono text-sm text-neutral-800 outline-none dark:text-neutral-200"
                    />
                  )}
                </div>
                <p className={hintCls}>
                  kalıcı bağlantı (iç): <span className="font-mono text-neutral-600 dark:text-neutral-300">/{slugPath}</span>
                  <span className="mt-1 block">
                    kamu adresi:{' '}
                    <span className="font-mono text-neutral-600 dark:text-neutral-300">{regionPublicHref(routeLocale, slugPath)}</span>
                  </span>
                </p>
              </div>

              <div>
                <label className={labelCls}>Bölge Tipi</label>
                <select
                  value={regionType}
                  onChange={(e) => setRegionType(e.target.value as typeof regionType)}
                  className={inputCls}
                >
                  {REGION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.value === 'country' ? 'Ülke' : t.value === 'province' ? 'İl' : t.value === 'district' ? 'İlçe' : 'Destinasyon'}
                    </option>
                  ))}
                </select>
                <p className={hintCls}>{REGION_TYPES.find((t) => t.value === regionType)?.label}</p>
              </div>

              <Card title="Ebeveyn Konum">
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Ülke</label>
                    <select
                      value={selCountry}
                      onChange={(e) => {
                        setSelCountry(e.target.value)
                        if (e.target.value) void loadRegions(e.target.value)
                      }}
                      className={inputCls}
                    >
                      <option value="">Seçin…</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`${labelCls} flex items-center gap-1`}>
                      İl {loadingR ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    </label>
                    <select
                      value={selRegion}
                      disabled={regions.length === 0}
                      onChange={(e) => {
                        setSelRegion(e.target.value)
                        if (e.target.value) void loadDistricts(e.target.value)
                      }}
                      className={`${inputCls} disabled:opacity-50`}
                    >
                      <option value="">Seçin…</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`${labelCls} flex items-center gap-1`}>
                      İlçe {loadingD ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    </label>
                    <select
                      value={districtId}
                      disabled={districts.length === 0}
                      onChange={(e) => setDistrictId(e.target.value)}
                      className={`${inputCls} disabled:opacity-50`}
                    >
                      <option value="">Seçin…</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {districtId && (
                    <p className={hintCls}>
                      Seçili:{' '}
                      <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">{districtId.slice(0, 8)}…</code>
                    </p>
                  )}
                </div>
              </Card>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className={`${labelCls} mb-0`}>Açıklama</label>
                  <ManageAiMagicTextButton
                    loading={aiPolishBody}
                    onClick={() => void handleMagicPolishBody()}
                    title="SEO, okunabilirlik, kalın vurgu ve iç linkler"
                  />
                </div>
                <RichEditor
                  value={currentTranslation.description ?? ''}
                  onChange={(html) => setTransField(activeLang, 'description', html)}
                  placeholder="Bu bölge hakkında detaylı açıklama…"
                  minHeight={220}
                />
              </div>
            </div>
          </Card>

          {/* Hero Gallery - 3 images */}
          <Card plain title="Hero Galerisi">
            <p className="mb-5 text-xs text-neutral-500">
              Bölge detay sayfasının üstünde gösterilir. Üç görsel yükleyin (1–2–3 sırası sabit). İsteğe bağlı:{' '}
              <strong>Banner düzen motorundan</strong> kopyaladığınız JSON’u aşağıya yapıştırın; böylece kutu
              konumları ve <code className="rounded bg-neutral-100 px-0.5 dark:bg-neutral-800">slotIndex</code> ile
              hangi görselin nereye gideceği sitede de aynı olur. Boş bırakırsanız klasik üçlü yerleşim kullanılır.
            </p>

            {/* Live preview — üst + alt satır (panelde masaüstü düzeni) */}
            {heroGallery.some((u) => u.trim()) && (
              <div className="mb-5 flex h-52 min-h-[13rem] w-full max-w-xl flex-col gap-2 overflow-hidden rounded-2xl sm:h-56 md:max-w-2xl">
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  {heroGallery[0] ? (
                    <img src={heroGallery[0]} alt="Hero 1" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[2.5rem] items-center justify-center text-neutral-300">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
                  <div className="min-h-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    {heroGallery[1] ? (
                      <img src={heroGallery[1]} alt="Hero 2" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full min-h-[2.5rem] items-center justify-center text-neutral-300">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-h-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    {heroGallery[2] ? (
                      <img src={heroGallery[2]} alt="Hero 3" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full min-h-[2.5rem] items-center justify-center text-neutral-300">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3 image upload slots */}
            <div className="grid gap-4 sm:grid-cols-3">
              {([0, 1, 2] as const).map((i) => (
                <div key={i}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={clsx(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                      i === 0 ? 'bg-[color:var(--manage-primary)]' : 'bg-neutral-400',
                    )}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      {i === 0
                        ? 'Sağ (uzun) — slot 0'
                        : i === 1
                          ? 'Sol üst — slot 1'
                          : 'Sol alt — slot 2'}
                    </span>
                  </div>
                  <ImageUpload
                    value={heroGallery[i]}
                    onChange={(url) => {
                      const next = [...heroGallery] as [string, string, string]
                      next[i] = url
                      setHeroGallery(next)
                    }}
                    folder="regions"
                    prefix={`hero-${i + 1}`}
                    aspectRatio={i === 0 ? '3/4' : '4/3'}
                    placeholder="Resim yükle"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Serbest hero yerleşimi (JSON, isteğe bağlı)
              </label>
              <textarea
                value={heroBannerLayoutJson}
                onChange={(e) => setHeroBannerLayoutJson(e.target.value)}
                rows={8}
                placeholder='{"version":2,"outerAspect":"4/3","layers":[...]}'
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-[11px] text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Her katmanda <code className="rounded bg-neutral-100 px-0.5 dark:bg-neutral-800">slotIndex</code>: 0, 1
                veya 2 ile hangi yüklenen görsele denk geleceğini belirtebilirsiniz. Kaydetmeden önce JSON’u kontrol
                edin.
              </p>
            </div>
          </Card>

          {/* Other Images */}
          <Card plain title="Diğer Görseller">
            <div className="grid gap-5 sm:grid-cols-3">
              <ImageUploader
                label="Öne Çıkan Resim"
                hint="Kategori bazlı gösterim"
                value={featuredImageUrl}
                onChange={setFeaturedImageUrl}
              />
              <ImageUploader
                label="Başlık Resmi"
                hint="Bölge detay hero banner"
                value={heroImageUrl}
                onChange={setHeroImageUrl}
              />
              <ImageUploader
                label="Gezi Fikirleri Resmi"
                hint="Sağ blok, kırpılmış gösterim"
                value={travelIdeasImageUrl}
                onChange={setTravelIdeasImageUrl}
              />
            </div>
          </Card>

          {/* Coordinates + Map */}
          <Card plain title="Coğrafi Koordinat">
            <p className="mb-3 text-xs text-neutral-500">
              Haritaya tıklayarak veya arama yaparak pin koyun. Koordinatlar otomatik dolar.
            </p>
            <MapPicker
              lat={mapLat}
              lng={mapLng}
              zoom={parseInt(mapZoom) || 12}
              onChange={(lat, lng) => { setMapLat(lat); setMapLng(lng) }}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Enlem</label>
                <input type="text" value={mapLat} onChange={(e) => setMapLat(e.target.value)} placeholder="37.000000" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div>
                <label className={labelCls}>Boylam</label>
                <input type="text" value={mapLng} onChange={(e) => setMapLng(e.target.value)} placeholder="35.000000" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div>
                <label className={labelCls}>Yakınlaştırma</label>
                <input type="number" min={1} max={20} value={mapZoom} onChange={(e) => setMapZoom(e.target.value)} className={inputCls} />
              </div>
            </div>
          </Card>

          {/* ── Ülke Bilgileri (yalnızca ülke tipinde) ───────────────────── */}
          {regionType === 'country' && (
            <Card plain title="🌍 Ülke Bilgileri">
              <div className="space-y-5">

                {/* Bayrak */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className={`${labelCls} mb-0`}>Bayrak</label>
                    <button
                      type="button"
                      onClick={() => {
                        const name = translations['tr']?.name?.trim() ?? ''
                        if (!name) { alert('Önce ülke adını (Türkçe) girin.'); return }
                        // ISO2 eşleştir
                        const found = countries.find(
                          (c) => c.name.toLowerCase() === name.toLowerCase() ||
                                 c.name.toLowerCase().includes(name.toLowerCase()) ||
                                 name.toLowerCase().includes(c.name.toLowerCase())
                        )
                        if (found) {
                          const iso = found.iso2.toLowerCase().trim()
                          setCiFlagUrl(`https://flagcdn.com/w320/${iso}.png`)
                          // Emoji: her harf → regional indicator (A=0x1F1E6)
                          const emoji = [...found.iso2.toUpperCase()]
                            .map((ch) => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65))
                            .join('')
                          setCiFlagEmoji(emoji)
                        } else {
                          alert(`"${name}" adıyla eşleşen ülke bulunamadı. ISO2 kodu ile manuel girin.`)
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-[color:var(--manage-primary)] px-3 py-1.5 text-xs font-semibold text-[color:var(--manage-primary)] hover:bg-[color:var(--manage-primary)]/5"
                    >
                      <Globe className="h-3.5 w-3.5" /> Ülke Adından Otomatik Yükle
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    {/* Flag image upload */}
                    <div>
                      <ImageUpload
                        value={ciFlagUrl}
                        onChange={setCiFlagUrl}
                        folder="regions"
                        prefix="flag"
                        aspectRatio="3/2"
                        className="max-w-[min(100%,280px)]"
                        placeholder="Bayrak görseli yükle veya URL gir"
                      />
                      <p className={`${hintCls} mt-1`}>
                        PNG veya SVG · Otomatik yükleme ülke adına göre flagcdn.com kullanır
                      </p>
                    </div>

                    {/* Flag preview + emoji */}
                    <div className="flex flex-col items-center gap-2 min-w-[96px]">
                      {ciFlagUrl ? (
                        <img
                          src={ciFlagUrl}
                          alt="Bayrak önizleme"
                          className="h-16 w-24 rounded-lg border border-neutral-200 object-cover shadow-sm dark:border-neutral-700"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="flex h-16 w-24 items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 text-3xl dark:border-neutral-700">
                          {ciFlagEmoji || '🏳️'}
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-center text-[10px] font-medium text-neutral-500">Emoji</label>
                        <input
                          type="text"
                          value={ciFlagEmoji}
                          onChange={(e) => setCiFlagEmoji(e.target.value)}
                          placeholder="🇹🇷"
                          className="w-24 rounded-lg border border-neutral-200 px-2 py-1 text-center text-lg focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                          maxLength={8}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Konuşulan Diller */}
                <div>
                  <label className={labelCls}>Konuşulan Diller</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {ciLanguages.map((lang, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                        {lang}
                        <button type="button" onClick={() => setCiLanguages((prev) => prev.filter((_, idx) => idx !== i))} className="ml-1 text-blue-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ciLangInput}
                      onChange={(e) => setCiLangInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && ciLangInput.trim()) {
                          e.preventDefault()
                          setCiLanguages((prev) => [...prev, ciLangInput.trim()])
                          setCiLangInput('')
                        }
                      }}
                      placeholder="ör: Türkçe, İngilizce…"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => { if (ciLangInput.trim()) { setCiLanguages((prev) => [...prev, ciLangInput.trim()]); setCiLangInput('') } }}
                      className="shrink-0 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className={hintCls}>Enter veya virgül ile ekleyin</p>
                </div>

                {/* Kullanılan Para Birimleri */}
                <div>
                  <label className={labelCls}>Kullanılan Para Birimleri</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {ciCurrencies.map((curr, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {curr}
                        <button type="button" onClick={() => setCiCurrencies((prev) => prev.filter((_, idx) => idx !== i))} className="ml-1 text-emerald-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ciCurrInput}
                      onChange={(e) => setCiCurrInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && ciCurrInput.trim()) {
                          e.preventDefault()
                          setCiCurrencies((prev) => [...prev, ciCurrInput.trim().toUpperCase()])
                          setCiCurrInput('')
                        }
                      }}
                      placeholder="ör: TRY, EUR, USD…"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => { if (ciCurrInput.trim()) { setCiCurrencies((prev) => [...prev, ciCurrInput.trim().toUpperCase()]); setCiCurrInput('') } }}
                      className="shrink-0 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className={hintCls}>ISO para birimi kodları (ör: TRY, EUR)</p>
                </div>

                {/* Konsolosluk Telefonu */}
                <div>
                  <label className={labelCls}>Konsolosluk / Büyükelçilik Telefonu</label>
                  <input
                    type="text"
                    value={ciConsulatePhone}
                    onChange={(e) => setCiConsulatePhone(e.target.value)}
                    placeholder="+90 312 000 0000"
                    className={inputCls}
                  />
                  <p className={hintCls}>Türkiye'nin ilgili ülkedeki konsolosluğu veya tersi</p>
                </div>

                {/* Acil Numaralar */}
                <div>
                  <label className={labelCls}>Acil Arama Numaraları</label>
                  {ciEmergencyNumbers.length > 0 && (
                    <div className="mb-1.5 hidden gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                        Hizmet adı (örn. Polis, Ambulans)
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Kısa numara</span>
                      <span className="w-8 shrink-0" aria-hidden />
                    </div>
                  )}
                  {ciEmergencyNumbers.map((en, i) => (
                    <div
                      key={i}
                      className="mb-2 flex flex-col gap-2 rounded-xl border border-neutral-100 p-3 sm:flex-row sm:items-end sm:gap-2 sm:border-0 sm:p-0 dark:border-neutral-800"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 block text-[11px] font-medium text-neutral-500 sm:hidden">Hizmet adı</span>
                        <input
                          type="text"
                          value={en.label}
                          onChange={(e) =>
                            setCiEmergencyNumbers((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)),
                            )
                          }
                          placeholder="örn. Polis, Ambulans, İtfaiye"
                          className={inputCls}
                          aria-label="Acil hat — hizmet adı"
                        />
                      </div>
                      <div className="w-full shrink-0 sm:w-28">
                        <span className="mb-1 block text-[11px] font-medium text-neutral-500 sm:hidden">Numara</span>
                        <input
                          type="text"
                          inputMode="tel"
                          value={en.number}
                          onChange={(e) =>
                            setCiEmergencyNumbers((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, number: e.target.value } : x)),
                            )
                          }
                          placeholder="örn. 112"
                          className={`${inputCls} font-mono`}
                          aria-label="Acil hat — numara"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCiEmergencyNumbers((prev) => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 self-end text-neutral-300 hover:text-red-500 sm:pb-2"
                        aria-label="Satırı sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCiEmergencyNumbers((prev) => [...prev, { label: '', number: '' }])}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 hover:border-[color:var(--manage-primary)] hover:text-[color:var(--manage-primary)] dark:border-neutral-700"
                  >
                    <Plus className="h-4 w-4" /> Numara Ekle
                  </button>
                  <p className={hintCls}>İmdat (112), Polis (155), İtfaiye (110) gibi ülkeye özgü numaralar</p>
                </div>

              </div>
            </Card>
          )}

          {/* Manual POIs — yalnızca ilçe ve destinasyon */}
          {POIS_VISIBLE.has(regionType) && (
          <Card
            plain
            title="Mekanlara Uzaklıklar (İlçe / Destinasyon)"
            action={
              <button
                type="button"
                disabled={fetchingDists || !mapLat || !mapLng}
                onClick={() => void fetchNearbyDistances()}
                className="flex items-center gap-1.5 rounded-lg bg-[color:var(--manage-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {fetchingDists ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                Mekanlara Olan Mesafeleri Getir
              </button>
            }
          >
            <p className={`${hintCls} mb-4`}>
              İl veya ilçe için haritada konumu işaretleyin, ardından butona tıklayın. API'de çıkmayan mekanları aşağıdan manuel ekleyin.
            </p>

            {/* Existing POIs */}
            {manualPois.length > 0 && (
              <div className="mb-4 overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 text-xs font-semibold text-neutral-400 dark:bg-neutral-800/50">
                      <th className="py-2 pl-4 text-left">Kategori</th>
                      <th className="py-2 text-left">Mekan Adı</th>
                      <th className="py-2 text-center">Mesafe (km)</th>
                      <th className="py-2 text-center">Koordinat</th>
                      <th className="py-2 pr-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                    {manualPois.map((poi) => (
                      <tr key={poi.id}>
                        <td className="py-2 pl-4 text-xs text-neutral-500">{poi.category}</td>
                        <td className="py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{poi.name}</td>
                        <td className="py-2 text-center text-sm font-mono">{poi.distance_km}</td>
                        <td className="py-2 text-center">
                          {poi.lat != null && poi.lng != null ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                              <MapPin className="h-2.5 w-2.5" />
                              {poi.lat.toFixed(3)}, {poi.lng.toFixed(3)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-300">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <button type="button" onClick={() => removeManualPoi(poi.id)} className="text-neutral-300 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add new POI */}
            <div className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
              <p className="mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Manuel Mekan Ekle</p>
              <p className={`${hintCls} mb-3`}>API'de çıkmayan mekanları kategori seçip ad ve mesafe girerek ekleyin. Kaydet ile birlikte saklanır.</p>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto_auto]">
                <div>
                  <label className={`${labelCls} text-xs`}>Kategori</label>
                  <select value={newPoiCat} onChange={(e) => setNewPoiCat(e.target.value)} className={`${inputCls} w-40`}>
                    <option value="">-- Seçin --</option>
                    {POI_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelCls} text-xs`}>Mekan Adı</label>
                  <input
                    type="text"
                    value={newPoiName}
                    onChange={(e) => setNewPoiName(e.target.value)}
                    placeholder="Örn: Ölüdeniz Plajı"
                    className={inputCls}
                    onKeyDown={(e) => e.key === 'Enter' && addManualPoi()}
                  />
                </div>
                <div>
                  <label className={`${labelCls} text-xs`}>Mesafe (km)</label>
                  <input type="number" min={0} step={0.1} value={newPoiDist} onChange={(e) => setNewPoiDist(e.target.value)} className={`${inputCls} w-24`} />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addManualPoi}
                    className="flex items-center gap-1.5 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Ekle
                  </button>
                </div>
              </div>
            </div>
          </Card>
          )}

          {/* Travel Ideas */}
          <Card
            plain
            title="Otomasyonlu Gezi Fikirleri"
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-[color:var(--manage-primary)] px-3 py-1.5 text-xs font-semibold text-[color:var(--manage-primary)] hover:bg-[color:var(--manage-primary)]/5"
                >
                  <Sparkles className="h-3.5 w-3.5" /> İçerikleri Yapay Zeka Yaz
                </button>
              </div>
            }
          >
            {travelIdeas.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-neutral-400">Henüz gezi fikri eklenmemiş.</p>
              </div>
            ) : (
              <div className="mb-4 space-y-3">
                {travelIdeas.map((idea, idx) => (
                  <div key={idea.id} className={clsx(
                    'rounded-xl border p-4 transition-colors dark:border-neutral-800',
                    editingIdeaId === idea.id ? 'border-[color:var(--manage-primary)]/30 bg-[color:var(--manage-primary)]/5' : 'border-neutral-100',
                  )}>
                    <div className="flex items-start gap-3">
                      {idea.image ? (
                        <img src={idea.image} alt={idea.title} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xl dark:bg-neutral-800">🗺️</div>
                      )}
                      <div className="min-w-0 flex-1">
                        {editingIdeaId === idea.id ? (
                          <div className="space-y-2">
                            <ImageUpload
                              value={idea.image}
                              onChange={(url) => updateTravelIdea(idea.id, 'image', url)}
                              folder="travel_ideas"
                              prefix="idea"
                              aspectRatio="16/9"
                              placeholder="Gezi fikri resmi"
                            />
                            <input type="text" value={idea.title} onChange={(e) => updateTravelIdea(idea.id, 'title', e.target.value)} placeholder="Başlık / Blog Bağlantısı" className={inputCls} />
                            <input type="url" value={idea.link} onChange={(e) => updateTravelIdea(idea.id, 'link', e.target.value)} placeholder="https://…" className={inputCls} />
                            <textarea value={idea.summary} onChange={(e) => updateTravelIdea(idea.id, 'summary', e.target.value)} placeholder="İçindekiler Özeti" className={`${inputCls} min-h-[60px]`} rows={2} />
                            <button type="button" onClick={() => setEditingIdeaId(null)} className="text-xs text-[color:var(--manage-primary)] hover:underline">✓ Tamam</button>
                          </div>
                        ) : (
                          <>
                            <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">{idea.title || `Gezi Fikri ${idx + 1}`}</p>
                            {idea.summary && <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{idea.summary}</p>}
                            {idea.link && <a href={idea.link} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-[color:var(--manage-primary)] hover:underline truncate">{idea.link}</a>}
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {editingIdeaId !== idea.id && (
                          <button type="button" onClick={() => setEditingIdeaId(idea.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={() => removeTravelIdea(idea.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={addTravelIdea}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-500 hover:border-[color:var(--manage-primary)] hover:text-[color:var(--manage-primary)] dark:border-neutral-700"
            >
              <Plus className="h-4 w-4" /> Öğe Ekle
            </button>
          </Card>

          {/* SEO */}
          <Card
            plain
            title="Search Engine"
            action={
              <button
                type="button"
                onClick={handleAutoSeo}
                className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400"
              >
                <Search className="h-3 w-3" /> SEO Otomatik
              </button>
            }
          >
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-semibold text-neutral-500">
                  {toAbsoluteSiteUrl(getPublicSiteUrl(), regionPublicHref(routeLocale, slugPath)) ??
                    `${getPublicSiteUrl()}${regionPublicHref(routeLocale, slugPath)}`}
                </p>
              </div>
              <div>
                <label className={labelCls}>Meta Başlık</label>
                <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO başlığı…" className={inputCls} />
                <p className={`${hintCls} text-right`}>{metaTitle.length}/70</p>
              </div>
              <div>
                <label className={labelCls}>Meta Açıklama</label>
                <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="SEO açıklaması…" className={`${inputCls} min-h-[80px]`} rows={3} />
                <p className={`${hintCls} text-right`}>{metaDesc.length}/160</p>
              </div>
              {(metaTitle || metaDesc) && (
                <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Google Önizleme</p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{metaTitle || translations['tr']?.name || slugPath}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{metaDesc}</p>
                </div>
              )}

              {/* Per-language SEO */}
              {activeLang !== 'tr' && (
                <div className="rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
                  <p className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                    {LOCALES.find((l) => l.code === activeLang)?.flag} {LOCALES.find((l) => l.code === activeLang)?.label} SEO
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={currentTranslation.meta_title ?? ''}
                      onChange={(e) => setTransField(activeLang, 'meta_title', e.target.value)}
                      placeholder="Meta başlık…"
                      className={inputCls}
                    />
                    <textarea
                      value={currentTranslation.meta_description ?? ''}
                      onChange={(e) => setTransField(activeLang, 'meta_description', e.target.value)}
                      placeholder="Meta açıklama…"
                      className={`${inputCls} min-h-[80px]`}
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Footer: SEO optimizasyon */}
          <Card plain title="SEO optimizasyonu">
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Türkçe meta başlık ve açıklamayı yapay zeka ile SEO ve yazım kurallarına göre iyileştirir. Önce üstteki “Search Engine” alanlarını doldurun veya “SEO Otomatik” kullanın.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={aiPolishFooterMeta}
                  onClick={() => void handleFooterAiPolishMeta()}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                >
                  {aiPolishFooterMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  AI ile meta iyileştir
                </button>
                <button
                  type="button"
                  onClick={handleAutoSeo}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <Search className="h-4 w-4" />
                  Kural tabanlı SEO doldur
                </button>
              </div>
            </div>
          </Card>
        </ManageFormListingSection>
      </div>
    </div>
  )
}
