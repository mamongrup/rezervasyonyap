'use client'

import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { detailPathForVertical } from '@/lib/stay-detail-routes'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useManageT } from '@/lib/manage-i18n-context'
import {
  createManageCatalogListing,
  createListingPriceRule,
  getAuthMe,
  getPublicCurrencies,
  listManageCategoryContracts,
  putManageListingTranslations,
  patchListingBasics,
  putListingOwnerContact,
  putListingMeta,
  putVerticalMeta,
  upsertSeoMetadata,
  listPriceLineItems,
  putListingPriceLineSelections,
  addListingImage,
  type PriceLineItem,
} from '@/lib/travel-api'
import { HOLIDAY_PROPERTY_TYPE_OPTIONS } from '@/lib/holiday-property-type-options'
import { listingImageSubPath, slugifyMediaSegment } from '@/lib/upload-media-paths'
import {
  MANAGE_FORM_CONTAINER_CLASS,
  MANAGE_STICKY_FOOTER_SCROLL_PADDING,
} from '@/components/manage/ManageFormShell'
import { MANAGE_EDITOR_LOCALE_TABS, MANAGE_EDITOR_LOCALES_TR_TARGET } from '@/components/manage/manage-editor-locales'
import { ManageStickyFormFooter } from '@/components/manage/ManageStickyFormFooter'
import { ManageStickyLangBar } from '@/components/manage/ManageStickyLangBar'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { ManageAiTranslateToolbar } from '@/components/manage/ManageAiTranslateToolbar'
import { callAiTranslate } from '@/lib/manage-content-ai'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import RichEditor from '@/components/editor/RichEditor'
import ImageUpload from '@/components/editor/ImageUpload'
import MapPicker from '@/components/editor/MapPicker'
import { Field, Label } from '@/shared/fieldset'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Lock,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

const ORG_STORAGE_KEY = 'catalog_manage_organization_id'

/** Arama / paylaşım — `upsertSeoMetadata` ile kayıt (listing) */
type ListingSeoDraft = {
  title: string
  description: string
  keywords: string
  canonical_path: string
  og_image_storage_key: string
  robots: string
}

function emptyListingSeo(): ListingSeoDraft {
  return {
    title: '',
    description: '',
    keywords: '',
    canonical_path: '',
    og_image_storage_key: '',
    robots: '',
  }
}

function initSeoByLocale(): Record<string, ListingSeoDraft> {
  const o: Record<string, ListingSeoDraft> = {}
  for (const l of MANAGE_EDITOR_LOCALE_TABS) o[l.code] = emptyListingSeo()
  return o
}

function stripHtmlToPlain(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function emptyListingByLocale(): Record<string, { title: string; description: string }> {
  const o: Record<string, { title: string; description: string }> = {}
  for (const l of MANAGE_EDITOR_LOCALE_TABS) o[l.code] = { title: '', description: '' }
  return o
}

/** Plaj/villa dikey formu ile uyumlu havuz satırları (Laravel sitedeki yapıya paralel) */
interface PoolRow {
  enabled: boolean
  width: string
  length: string
  depth: string
  description: string
  heating_fee_per_day: string
}
const emptyPool = (): PoolRow => ({
  enabled: false,
  width: '',
  length: '',
  depth: '',
  description: '',
  heating_fee_per_day: '',
})

/** Ek ücret satırı birimi (villa dikey meta `extra_fees`) */
type ExtraFeeUnit =
  | 'per_stay'
  | 'per_night'
  | 'per_person'
  | 'per_person_per_night'

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <div className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>
        )}
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  )
}

function Grid2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-4 sm:grid-cols-2${className ? ` ${className}` : ''}`}>{children}</div>
}

function Grid3({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('grid gap-4 sm:grid-cols-3', className)}>{children}</div>
}

function HintText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-neutral-400">{children}</p>
}

export default function CatalogNewListingClient({ categoryCode }: { categoryCode: string }) {
  const t = useManageT()
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()

  // ── Temel alanlar ──
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [currency, setCurrency] = useState('TRY')
  const [currencies, setCurrencies] = useState<{ code: string; name: string }[]>([])
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  const [activeLang, setActiveLang] = useState(() =>
    MANAGE_EDITOR_LOCALE_TABS.some((l) => l.code === locale) ? locale : 'tr',
  )
  const [listingByLocale, setListingByLocale] = useState(emptyListingByLocale)
  const [seoByLocale, setSeoByLocale] = useState<Record<string, ListingSeoDraft>>(() => initSeoByLocale())
  const [seoPolishBusy, setSeoPolishBusy] = useState<string | null>(null)
  const [priceLineCatalog, setPriceLineCatalog] = useState<PriceLineItem[]>([])
  const [selectedPriceLineIds, setSelectedPriceLineIds] = useState<Set<string>>(new Set())
  const [aiTargetLocale, setAiTargetLocale] = useState(
    MANAGE_EDITOR_LOCALES_TR_TARGET[0]?.code ?? 'en',
  )
  const [aiTranslating, setAiTranslating] = useState(false)
  const [translateMsg, setTranslateMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [aiPolishTitle, setAiPolishTitle] = useState(false)
  const [aiPolishBody, setAiPolishBody] = useState(false)
  const submitIntentRef = useRef<'save' | 'save-show'>('save')

  const setAiTargetFromToolbar = (code: string) => {
    const picked = MANAGE_EDITOR_LOCALES_TR_TARGET.find((l) => l.code === code)
    if (picked) setAiTargetLocale(picked.code)
  }

  // ── Fiyatlandırma ──
  const [basePrice, setBasePrice] = useState('')
  const [minStayNights, setMinStayNights] = useState('')
  const [cleaningFee, setCleaningFee] = useState('')
  const [shortStayMinNights, setShortStayMinNights] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [prepaymentPercent, setPrepaymentPercent] = useState('')
  const [commissionPercent, setCommissionPercent] = useState('')
  const [confirmDeadlineNormal, setConfirmDeadlineNormal] = useState('24')
  const [confirmDeadlineHigh, setConfirmDeadlineHigh] = useState('2')
  // Yüksek sezon tarih aralıkları: { from: string, to: string }[]
  const [highSeasonDates, setHighSeasonDates] = useState<Array<{ from: string; to: string }>>([])
  const [supplierPaymentNote, setSupplierPaymentNote] = useState('')
  const [avgAdCostPercent, setAvgAdCostPercent] = useState('')
  const [cancellationPolicyText, setCancellationPolicyText] = useState('')
  const [ministryLicenseRef, setMinistryLicenseRef] = useState('')
  const [shareToSocial, setShareToSocial] = useState(true)
  const [allowAiCaption, setAllowAiCaption] = useState(true)
  const [allowSubMinStayGap, setAllowSubMinStayGap] = useState(false)

  // ── Mülk bilgileri ──
  const [bedCount, setBedCount] = useState('')
  const [bathCount, setBathCount] = useState('')
  const [squareMeters, setSquareMeters] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  /** Villa: en az kaç gün önceden rezervasyon + oda sayısı */
  const [minAdvanceBookingDays, setMinAdvanceBookingDays] = useState('')
  const [roomCount, setRoomCount] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [poolSizeLabel, setPoolSizeLabel] = useState('')
  const [pools, setPools] = useState<{
    open_pool: PoolRow
    heated_pool: PoolRow
    children_pool: PoolRow
  }>({
    open_pool: emptyPool(),
    heated_pool: emptyPool(),
    children_pool: emptyPool(),
  })
  const [extraFees, setExtraFees] = useState<Array<{ label: string; amount: string; unit: ExtraFeeUnit }>>([])

  // ── Giriş / çıkış saati ──
  const [checkInTime, setCheckInTime] = useState('16:00')
  const [checkOutTime, setCheckOutTime] = useState('10:00')

  // ── İçerik ──
  const [youtubeUrl, setYoutubeUrl] = useState('')
  /** İlan oluşmadan önce yüklenen galeri anahtarları; kayıtta `addListingImage` ile bağlanır */
  const [pendingGalleryKeys, setPendingGalleryKeys] = useState<string[]>([])
  const [galleryUploadKey, setGalleryUploadKey] = useState(0)

  // ── Konum ──
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  // ── İlan sahibi ──
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  /** Tatil evi — BTrans / ödeme beyanı (listing_meta) */
  const [ownerTcNo, setOwnerTcNo] = useState('')
  const [ownerBankName, setOwnerBankName] = useState('')
  const [ownerIban, setOwnerIban] = useState('')
  const [ownerAccountType, setOwnerAccountType] = useState('')
  const [ownerResidenceAddress, setOwnerResidenceAddress] = useState('')

  // ── Admin ──
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  const [orgIdLocked, setOrgIdLocked] = useState(false)

  // ── Sözleşme ──
  const [contracts, setContracts] = useState<{ id: string; code: string }[]>([])
  const [contractId, setContractId] = useState('')
  const [contractsErr, setContractsErr] = useState<string | null>(null)

  // ── UI ──
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const slugRef = useRef<HTMLInputElement>(null)

  const isVilla = categoryCode === 'holiday_home'
  const listingVertical = normalizeCatalogVertical(categoryCode) ?? 'hotel'
  const listingPublicDetailPath = detailPathForVertical(listingVertical)

  const gallerySlugBase = slug.trim() ? slugifyMediaSegment(slug) : 'yeni-ilan'
  const gallerySubPath = listingImageSubPath(categoryCode, gallerySlugBase)

  function onPendingGalleryBatchUploaded(urls: string[]) {
    const keys = urls.map((u) => u.trim()).filter(Boolean)
    if (keys.length === 0) return
    setPendingGalleryKeys((prev) => [...prev, ...keys])
    setGalleryUploadKey((n) => n + 1)
  }

  function removePendingGallery(idx: number) {
    setPendingGalleryKeys((prev) => prev.filter((_, j) => j !== idx))
  }

  function movePendingGallery(idx: number, dir: -1 | 1) {
    const j = idx + dir
    setPendingGalleryKeys((prev) => {
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const a = next[idx]
      const b = next[j]
      if (a === undefined || b === undefined) return prev
      next[idx] = b
      next[j] = a
      return next
    })
  }

  useEffect(() => {
    document.documentElement.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [categoryCode])

  useEffect(() => {
    if (!isVilla) return
    const token = getStoredAuthToken()
    if (!token) return
    void listPriceLineItems(token, { categoryCode: 'holiday_home', locale })
      .then((r) => setPriceLineCatalog(r.items.filter((i) => i.is_active)))
      .catch(() => setPriceLineCatalog([]))
  }, [isVilla, locale])

  useEffect(() => {
    getPublicCurrencies()
      .then((list) => {
        const active = list.filter((c) => c.is_active)
        setCurrencies(active.length > 0 ? active : [{ code: 'TRY', name: 'Turkish Lira' }])
      })
      .catch(() => setCurrencies([{ code: 'TRY', name: 'Turkish Lira' }]))
  }, [])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    void getAuthMe(token)
      .then((me) => {
        const roles = Array.isArray(me.roles) ? me.roles : []
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (!admin) return

        // Rol atamasından organization_id bul (tenant admin → kilitle, platform admin → localStorage)
        const roleWithOrg = roles.find((r) => r.organization_id)
        if (roleWithOrg?.organization_id) {
          setOrgId(roleWithOrg.organization_id)
          setOrgIdLocked(true)
          if (typeof window !== 'undefined')
            window.localStorage.setItem(ORG_STORAGE_KEY, roleWithOrg.organization_id)
        } else if (typeof window !== 'undefined') {
          setOrgId(window.localStorage.getItem(ORG_STORAGE_KEY) ?? '')
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) {
      setContracts([]); setContractsErr(null); setContractId(''); return
    }
    let cancelled = false
    void listManageCategoryContracts(token, {
      contractScope: 'category',
      categoryCode,
      ...(needOrg && orgId.trim() ? { organizationId: orgId.trim() } : {}),
    })
      .then((r) => {
        if (cancelled) return
        const rows = r.contracts.filter((c) => c.is_active === 'true' || c.is_active === 't')
        setContracts(rows.map((c) => ({ id: c.id, code: c.code })))
        setContractsErr(null); setContractId('')
      })
      .catch((e) => {
        if (cancelled) return
        setContracts([])
        setContractsErr(e instanceof Error ? e.message : 'contracts_load_failed')
      })
    return () => { cancelled = true }
  }, [categoryCode, needOrg, orgId])

  function handleTitleChange(v: string) {
    setListingByLocale((prev) => ({
      ...prev,
      [activeLang]: { ...(prev[activeLang] ?? { title: '', description: '' }), title: v },
    }))
    if (activeLang === 'tr' && !slugManual) setSlug(toSlug(v))
  }

  function handleDescriptionChange(v: string) {
    setListingByLocale((prev) => ({
      ...prev,
      [activeLang]: { ...(prev[activeLang] ?? { title: '', description: '' }), description: v },
    }))
  }

  async function handleAiTranslateTrToTarget() {
    const tr = listingByLocale['tr']
    const tTit = (tr?.title ?? '').trim()
    const tDesc = (tr?.description ?? '').trim()
    const trSeo = seoByLocale['tr'] ?? emptyListingSeo()
    const hasTrSeo =
      Boolean(trSeo.title.trim() || trSeo.description.trim() || trSeo.keywords.trim())
    if (!tTit && !tDesc && !hasTrSeo) {
      setTranslateMsg({ ok: false, text: 'Önce Türkçe başlık, açıklama veya SEO alanlarından en az birini doldurun.' })
      return
    }
    setAiTranslating(true)
    setTranslateMsg(null)
    try {
      const slugRefVal = slug.trim().toLowerCase()
      const [tTitle, tDescOut] = await Promise.all([
        tTit
          ? callAiTranslate({
              text: tTit,
              context: 'title',
              sourceLocale: 'tr',
              targetLocale: aiTargetLocale,
            })
          : Promise.resolve(''),
        tDesc
          ? callAiTranslate({
              text: tDesc,
              context: 'body',
              sourceLocale: 'tr',
              targetLocale: aiTargetLocale,
              ...(slugRefVal ? { pageSlug: slugRefVal } : {}),
            })
          : Promise.resolve(''),
      ])
      setListingByLocale((prev) => ({
        ...prev,
        [aiTargetLocale]: {
          ...prev[aiTargetLocale],
          title: tTitle || prev[aiTargetLocale]?.title || '',
          description: tDescOut || prev[aiTargetLocale]?.description || '',
        },
      }))
      const prevSeo = seoByLocale['tr'] ?? emptyListingSeo()
      const sTit = prevSeo.title.trim()
      const sDesc = prevSeo.description.trim()
      const sKw = prevSeo.keywords.trim()
      const [seoTitle, seoDesc, seoKw] = await Promise.all([
        sTit
          ? callAiTranslate({
              text: sTit,
              context: 'seo',
              sourceLocale: 'tr',
              targetLocale: aiTargetLocale,
            })
          : Promise.resolve(''),
        sDesc
          ? callAiTranslate({
              text: sDesc.slice(0, 1200),
              context: 'seo',
              sourceLocale: 'tr',
              targetLocale: aiTargetLocale,
            })
          : Promise.resolve(''),
        sKw
          ? callAiTranslate({
              text: sKw,
              context: 'seo',
              sourceLocale: 'tr',
              targetLocale: aiTargetLocale,
            })
          : Promise.resolve(''),
      ])
      setSeoByLocale((prev) => ({
        ...prev,
        [aiTargetLocale]: {
          ...(prev[aiTargetLocale] ?? emptyListingSeo()),
          title: seoTitle || prev[aiTargetLocale]?.title || '',
          description: seoDesc || prev[aiTargetLocale]?.description || '',
          keywords: seoKw || prev[aiTargetLocale]?.keywords || '',
        },
      }))
      const label = MANAGE_EDITOR_LOCALE_TABS.find((l) => l.code === aiTargetLocale)?.label ?? aiTargetLocale
      setTranslateMsg({
        ok: true,
        text: `${label} çevirisi hazır. Kaydetmeyi unutmayın.`,
      })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'Çeviri başarısız',
      })
    } finally {
      setAiTranslating(false)
    }
  }

  /** Bölge düzenle ile aynı: mevcut dilde SEO / yazım iyileştirmesi */
  const magicSourceLocale = activeLang

  async function handleMagicPolishTitle() {
    const raw = (listingByLocale[activeLang]?.title ?? '').trim()
    if (!raw) {
      setTranslateMsg({ ok: false, text: 'Önce başlık alanına metin girin.' })
      return
    }
    setAiPolishTitle(true)
    setTranslateMsg(null)
    try {
      const out = await callAiTranslate({
        text: raw,
        context: 'title',
        sourceLocale: magicSourceLocale,
        targetLocale: magicSourceLocale,
      })
      if (out) {
        const v = out.slice(0, 200)
        setListingByLocale((prev) => ({
          ...prev,
          [activeLang]: {
            ...(prev[activeLang] ?? { title: '', description: '' }),
            title: v,
          },
        }))
        if (activeLang === 'tr' && !slugManual) setSlug(toSlug(v))
      }
      setTranslateMsg({ ok: true, text: 'Başlık SEO ve yazım kurallarına göre iyileştirildi.' })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'İşlem başarısız',
      })
    } finally {
      setAiPolishTitle(false)
    }
  }

  async function handleMagicPolishBody() {
    const raw = (listingByLocale[activeLang]?.description ?? '').trim()
    if (!raw) {
      setTranslateMsg({ ok: false, text: 'Önce açıklama içeriği girin.' })
      return
    }
    setAiPolishBody(true)
    setTranslateMsg(null)
    try {
      const slugRefVal = slug.trim().toLowerCase()
      const out = await callAiTranslate({
        text: raw,
        context: 'body',
        sourceLocale: magicSourceLocale,
        targetLocale: magicSourceLocale,
        ...(slugRefVal ? { pageSlug: slugRefVal } : {}),
      })
      if (out) {
        setListingByLocale((prev) => ({
          ...prev,
          [activeLang]: {
            ...(prev[activeLang] ?? { title: '', description: '' }),
            description: out,
          },
        }))
      }
      setTranslateMsg({
        ok: true,
        text: 'Açıklama iyileştirildi (vurgu ve okunabilirlik). Kaydetmeyi unutmayın.',
      })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'İşlem başarısız',
      })
    } finally {
      setAiPolishBody(false)
    }
  }

  function patchSeo(partial: Partial<ListingSeoDraft>) {
    setSeoByLocale((prev) => ({
      ...prev,
      [activeLang]: { ...(prev[activeLang] ?? emptyListingSeo()), ...partial },
    }))
  }

  async function handleMagicSeoTitle() {
    const raw = (seoByLocale[activeLang]?.title ?? '').trim()
    if (!raw) {
      setTranslateMsg({ ok: false, text: 'Önce meta başlığı yazın veya «İçerikten öner» kullanın.' })
      return
    }
    setSeoPolishBusy('title')
    setTranslateMsg(null)
    try {
      const out = await callAiTranslate({
        text: raw,
        context: 'seo',
        sourceLocale: magicSourceLocale,
        targetLocale: magicSourceLocale,
      })
      if (out) patchSeo({ title: out.slice(0, 70) })
      setTranslateMsg({ ok: true, text: 'SEO başlığı mevcut dilde iyileştirildi.' })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'İşlem başarısız',
      })
    } finally {
      setSeoPolishBusy(null)
    }
  }

  async function handleMagicSeoDescription() {
    const raw = (seoByLocale[activeLang]?.description ?? '').trim()
    if (!raw) {
      setTranslateMsg({ ok: false, text: 'Önce meta açıklaması yazın veya «İçerikten öner» kullanın.' })
      return
    }
    setSeoPolishBusy('desc')
    setTranslateMsg(null)
    try {
      const slugRefVal = slug.trim().toLowerCase()
      const out = await callAiTranslate({
        text: raw.slice(0, 2000),
        context: 'seo',
        sourceLocale: magicSourceLocale,
        targetLocale: magicSourceLocale,
        ...(slugRefVal ? { pageSlug: slugRefVal } : {}),
      })
      if (out) patchSeo({ description: out.slice(0, 320) })
      setTranslateMsg({ ok: true, text: 'SEO açıklaması mevcut dilde iyileştirildi.' })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'İşlem başarısız',
      })
    } finally {
      setSeoPolishBusy(null)
    }
  }

  async function handleAiSuggestSeoFromContent() {
    if (activeLang !== 'tr') {
      setTranslateMsg({ ok: false, text: 'Bu öneriyi Türkçe sekmedeyken kullanın.' })
      return
    }
    const tit = (listingByLocale['tr']?.title ?? '').trim()
    const plain = stripHtmlToPlain(listingByLocale['tr']?.description ?? '')
    if (!tit && !plain) {
      setTranslateMsg({ ok: false, text: 'Önce Türkçe başlık veya açıklama girin.' })
      return
    }
    setSeoPolishBusy('suggest')
    setTranslateMsg(null)
    try {
      const slugRefVal = slug.trim().toLowerCase()
      const [metaTitle, metaDesc] = await Promise.all([
        tit
          ? callAiTranslate({
              text: tit,
              context: 'seo',
              sourceLocale: 'tr',
              targetLocale: 'tr',
            })
          : Promise.resolve(''),
        plain
          ? callAiTranslate({
              text: plain.slice(0, 1200),
              context: 'seo',
              sourceLocale: 'tr',
              targetLocale: 'tr',
              ...(slugRefVal ? { pageSlug: slugRefVal } : {}),
            })
          : Promise.resolve(''),
      ])
      setSeoByLocale((prev) => ({
        ...prev,
        tr: {
          ...(prev.tr ?? emptyListingSeo()),
          title: (metaTitle || prev.tr?.title || '').slice(0, 70),
          description: (metaDesc || prev.tr?.description || '').slice(0, 320),
        },
      }))
      setTranslateMsg({
        ok: true,
        text: 'Türkçe SEO alanları ilan içeriğinden önerildi. Diğer diller için AI Çevir kullanın.',
      })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'İşlem başarısız',
      })
    } finally {
      setSeoPolishBusy(null)
    }
  }

  function handleSlugChange(v: string) {
    setSlugManual(true)
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  function setPool(key: keyof typeof pools, field: keyof PoolRow, val: string | boolean) {
    setPools((p) => ({ ...p, [key]: { ...p[key], [field]: val } }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const token = getStoredAuthToken()
    if (!token) { setErr(t('catalog.session_missing')); return }
    if (needOrg && !orgId.trim()) { setErr(t('catalog.org_required')); return }
    if (contracts.length > 0 && !contractId.trim()) {
      setErr('Bu kategori için sözleşme havuzundan bir şablon seçin.'); return
    }
    if (commissionPercent.trim() && prepaymentPercent.trim()) {
      const c = parseFloat(commissionPercent.replace(',', '.'))
      const p = parseFloat(prepaymentPercent.replace(',', '.'))
      if (Number.isFinite(c) && Number.isFinite(p) && p < c) {
        setErr('Ön ödeme yüzdesi, komisyon oranından küçük olamaz (eşit veya büyük olmalı).')
        return
      }
    }
    const trTitle = (listingByLocale['tr']?.title ?? '').trim()
    if (!trTitle) {
      setErr('Türkçe başlık zorunludur.')
      setActiveLang('tr')
      return
    }

    setBusy(true)
    try {
      const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined

      // 1. İlanı oluştur
      const body: Parameters<typeof createManageCatalogListing>[1] = {
        category_code: categoryCode,
        slug: slug.trim().toLowerCase(),
        currency_code: currency.trim().toUpperCase(),
        title: trTitle,
        title_locale: 'tr',
      }
      if (needOrg) body.organization_id = orgId.trim()
      if (contractId.trim()) body.category_contract_id = contractId.trim()
      const created = await createManageCatalogListing(token, body)
      const lid = created.id

      if (needOrg && typeof window !== 'undefined')
        window.localStorage.setItem(ORG_STORAGE_KEY, orgId.trim())

      // 2. Çeviri / açıklama
      const translationEntries = MANAGE_EDITOR_LOCALE_TABS.map((loc) => ({
        locale_code: loc.code,
        title: (listingByLocale[loc.code]?.title ?? '').trim(),
        description: (listingByLocale[loc.code]?.description ?? '').trim() || undefined,
      })).filter((e) => e.title.length > 0 || (e.description?.length ?? 0) > 0)
      await putManageListingTranslations(token, lid, { entries: translationEntries }, orgParam).catch(() => {})

      // 3. Temel gecelik fiyat
      const price = parseFloat(basePrice.replace(',', '.'))
      if (Number.isFinite(price) && price > 0) {
        const ruleObj: Record<string, unknown> = {
          base_nightly: price,
          label: 'Varsayılan fiyat',
        }
        await createListingPriceRule(token, lid, { rule_json: JSON.stringify(ruleObj) }, orgParam).catch(() => {})
      }

      // 4. Temel ilan alanları
      const basicsBody: Parameters<typeof patchListingBasics>[2] = { status }
      if (minStayNights.trim()) basicsBody.min_stay_nights = minStayNights.trim()
      if (cleaningFee.trim()) basicsBody.cleaning_fee_amount = cleaningFee.trim()
      if (depositAmount.trim()) basicsBody.first_charge_amount = depositAmount.trim()
      if (prepaymentPercent.trim()) basicsBody.prepayment_percent = prepaymentPercent.trim()
      if (commissionPercent.trim()) basicsBody.commission_percent = commissionPercent.trim()
      if (poolSizeLabel.trim()) basicsBody.pool_size_label = poolSizeLabel.trim()
      if (supplierPaymentNote.trim()) basicsBody.supplier_payment_note = supplierPaymentNote.trim()
      if (confirmDeadlineNormal.trim()) basicsBody.confirm_deadline_normal_h = confirmDeadlineNormal.trim()
      if (confirmDeadlineHigh.trim()) basicsBody.confirm_deadline_high_h = confirmDeadlineHigh.trim()
      if (highSeasonDates.length > 0) basicsBody.high_season_dates_json = JSON.stringify(highSeasonDates)
      if (avgAdCostPercent.trim()) basicsBody.avg_ad_cost_percent = avgAdCostPercent.trim()
      if (cancellationPolicyText.trim()) basicsBody.cancellation_policy_text = cancellationPolicyText.trim()
      if (ministryLicenseRef.trim()) basicsBody.ministry_license_ref = ministryLicenseRef.trim()
      basicsBody.share_to_social = shareToSocial
      basicsBody.allow_ai_caption = allowAiCaption
      basicsBody.allow_sub_min_stay_gap_booking = allowSubMinStayGap
      await patchListingBasics(token, lid, basicsBody).catch(() => {})

      // 5. İlan sahibi
      if (ownerName.trim() || ownerPhone.trim() || ownerEmail.trim()) {
        await putListingOwnerContact(token, lid, {
          contact_name: ownerName.trim() || undefined,
          contact_phone: ownerPhone.trim() || undefined,
          contact_email: ownerEmail.trim() || undefined,
        }).catch(() => {})
      }

      // 6. Meta alanlar
      const metaBody: Record<string, string> = {}
      if (checkInTime.trim()) metaBody.check_in_time = checkInTime.trim()
      if (checkOutTime.trim()) metaBody.check_out_time = checkOutTime.trim()
      if (bedCount.trim()) metaBody.bed_count = bedCount.trim()
      if (bathCount.trim()) metaBody.bath_count = bathCount.trim()
      if (squareMeters.trim()) metaBody.square_meters = squareMeters.trim()
      if (maxGuests.trim()) metaBody.max_guests = maxGuests.trim()
      if (minAdvanceBookingDays.trim()) metaBody.min_advance_booking_days = minAdvanceBookingDays.trim()
      if (roomCount.trim()) metaBody.room_count = roomCount.trim()
      if (isVilla && propertyType.trim()) metaBody.property_type = propertyType.trim()
      if (youtubeUrl.trim()) metaBody.youtube_url = youtubeUrl.trim()
      if (ministryLicenseRef.trim()) metaBody.tourism_cert_no = ministryLicenseRef.trim()
      if (address.trim()) metaBody.address = address.trim()
      if (lat.trim()) metaBody.lat = lat.trim()
      if (lng.trim()) metaBody.lng = lng.trim()
      if (shortStayMinNights.trim()) metaBody.min_short_stay_nights = shortStayMinNights.trim()
      if (isVilla && ownerTcNo.trim()) metaBody.owner_tc_no = ownerTcNo.trim()
      if (isVilla && ownerBankName.trim()) metaBody.owner_bank_name = ownerBankName.trim()
      if (isVilla && ownerIban.trim()) metaBody.owner_iban = ownerIban.replace(/\s/g, '').trim()
      if (isVilla && ownerAccountType.trim()) metaBody.owner_account_type = ownerAccountType.trim()
      if (isVilla && ownerResidenceAddress.trim())
        metaBody.owner_residence_address = ownerResidenceAddress.trim()
      if (Object.keys(metaBody).length > 0) {
        await putListingMeta(token, lid, metaBody).catch(() => {})
      }

      if (categoryCode === 'holiday_home') {
        const vert: Record<string, unknown> = {}
        if (pools.open_pool.enabled || pools.heated_pool.enabled || pools.children_pool.enabled) {
          vert.pools = pools
        }
        const ef = extraFees.filter((x) => x.label.trim() && x.amount.trim())
        if (ef.length) vert.extra_fees = ef
        if (Object.keys(vert).length > 0) {
          await putVerticalMeta(token, lid, 'holiday_home', vert).catch(() => {})
        }
      }

      for (const loc of MANAGE_EDITOR_LOCALE_TABS) {
        const s = seoByLocale[loc.code] ?? emptyListingSeo()
        const hasAny =
          s.title.trim() ||
          s.description.trim() ||
          s.keywords.trim() ||
          s.canonical_path.trim() ||
          s.og_image_storage_key.trim() ||
          s.robots.trim()
        if (!hasAny) continue
        await upsertSeoMetadata(
          {
            entity_type: 'listing',
            entity_id: lid,
            locale: loc.code,
            title: s.title.trim(),
            description: s.description.trim(),
            keywords: s.keywords.trim(),
            canonical_path: s.canonical_path.trim(),
            og_image_storage_key: s.og_image_storage_key.trim(),
            robots: s.robots.trim(),
          },
          token,
        ).catch(() => {})
      }

      if (isVilla) {
        await putListingPriceLineSelections(token, lid, { item_ids: [...selectedPriceLineIds] }).catch(() => {})
      }

      const orgIdForImages = needOrg && orgId.trim() ? orgId.trim() : undefined
      if (pendingGalleryKeys.length > 0) {
        for (let i = 0; i < pendingGalleryKeys.length; i++) {
          const key = pendingGalleryKeys[i]
          if (!key) continue
          await addListingImage(
            token,
            lid,
            { storage_key: key, original_mime: 'image/avif', sort_order: i },
            orgIdForImages,
          ).catch(() => {})
        }
      }

      const manageUrl = vitrinPath(
        `/manage/catalog/${encodeURIComponent(categoryCode)}/listings/${encodeURIComponent(lid)}`,
      )
      const publicStayUrl = vitrinPath(
        `${listingPublicDetailPath}/${encodeURIComponent(slug.trim().toLowerCase())}`,
      )
      const intent = submitIntentRef.current
      submitIntentRef.current = 'save'
      if (intent === 'save-show') {
        window.open(publicStayUrl, '_blank', 'noopener,noreferrer')
      }
      router.push(manageUrl)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('catalog.create_error'))
    } finally {
      setBusy(false)
    }
  }

  const listHref = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}/listings`)

  const inputCls =
    'block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 disabled:opacity-50'
  const selectCls = inputCls

  /** Tatil evi / villa: Booking Core «Alan» akışına uygun blok sırası (içerik → sözleşme → mülk → giriş → fiyat → havuz → konum → iletişim) */

  const hasContractUi = contracts.length > 0 || Boolean(contractsErr)

  const contractInner =
    hasContractUi &&
    (contractsErr ? (
      <p className="text-sm text-amber-700 dark:text-amber-300">
        Sözleşme listesi yüklenemedi: {contractsErr}
      </p>
    ) : (
      <Field className="block">
        <Label>Kategori sözleşmesi (havuz)</Label>
        <select
          className={`mt-1 ${selectCls}`}
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          required
        >
          <option value="">— Seçin —</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <HintText>Yayın ve checkout öncesi her ilana sözleşme bağlanmalıdır.</HintText>
      </Field>
    ))

  /** Villa dışı: ayrı kart; villa: Fazladan Bilgi içinde ilan tipi ile yan yana */
  const contractSection =
    hasContractUi && (
      <Section title="İlan Sözleşmesi" subtitle="Kurallar ve checkout’ta gösterilir">
        {contractInner}
      </Section>
    )

  const locationSection = (
    <Section title="Konum" subtitle="Adres ve harita">
      <Field className="block">
        <Label>Gerçek Adres</Label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="ör: Gündoğan Mah., Bodrum, Muğla"
          className="mt-1"
        />
      </Field>
      <MapPicker
        lat={lat}
        lng={lng}
        onChange={(la, lo) => {
          setLat(la)
          setLng(lo)
        }}
        className="mt-3"
      />
      <Grid2 className="mt-3">
        <Field className="block">
          <Label>Enlem</Label>
          <Input
            type="text"
            className="mt-1 font-mono text-sm"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="37.066000"
          />
        </Field>
        <Field className="block">
          <Label>Boylam</Label>
          <Input
            type="text"
            className="mt-1 font-mono text-sm"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="27.306700"
          />
        </Field>
      </Grid2>
    </Section>
  )

  const formId = 'catalog-new-listing-form'

  return (
    <div className={clsx('min-h-screen bg-neutral-50 dark:bg-neutral-950', MANAGE_STICKY_FOOTER_SCROLL_PADDING)}>
      <ManageStickyLangBar
        backHref={listHref}
        titlePrimary={
          listingByLocale['tr']?.title?.trim() || `Yeni ilan — ${categoryLabelTr(categoryCode)}`
        }
        titleSecondary={slug.trim() ? `/${slug.trim()}` : undefined}
        locales={MANAGE_EDITOR_LOCALE_TABS}
        activeLocale={activeLang}
        onActiveLocaleChange={setActiveLang}
        toolbarRight={
          <ManageAiTranslateToolbar
            locales={MANAGE_EDITOR_LOCALES_TR_TARGET}
            targetLocale={aiTargetLocale}
            onTargetLocaleChange={setAiTargetFromToolbar}
            onTranslate={() => void handleAiTranslateTrToTarget()}
            translating={aiTranslating}
          />
        }
      />

      <form id={formId} onSubmit={(e) => void onSubmit(e)}>
        <div
          className={clsx(
            MANAGE_FORM_CONTAINER_CLASS,
            'mb-6 sm:mb-8 pt-4 sm:pt-5',
          )}
        >
          <header className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="min-w-0 text-sm text-neutral-500 dark:text-neutral-400">
                {categoryLabelTr(categoryCode)} kategorisi
              </p>
              <h1 className="shrink-0 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                Yeni ilan ekle
              </h1>
            </div>
            <div className="mt-4 border-b border-neutral-200 dark:border-neutral-700" />
          </header>
        </div>
        {translateMsg ? (
          <div
            className={clsx(
              MANAGE_FORM_CONTAINER_CLASS,
              'mb-4',
            )}
          >
            <div
              className={clsx(
                'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
                translateMsg.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300',
              )}
            >
              {translateMsg.text}
            </div>
          </div>
        ) : null}
        <div className={MANAGE_FORM_CONTAINER_CLASS}>
        <div>
          {/* ────────── Ana İçerik ────────── */}
          <div className="w-full space-y-5">

            {/* Admin: Org ID — kilitliyse hesaptan zaten gelir; boş kart göstermeyelim */}
            {needOrg && !orgIdLocked && (
              <Section title="Yönetici Ayarı">
                <Field className="block">
                  <Label>{t('catalog.org_uuid_label')}</Label>
                  <div className="relative mt-1">
                    <Input
                      value={orgId}
                      onChange={(e) => !orgIdLocked && setOrgId(e.target.value)}
                      readOnly={orgIdLocked}
                      className={`font-mono text-sm ${orgIdLocked ? 'cursor-default bg-neutral-50 pr-9 text-neutral-500 dark:bg-neutral-800/60' : ''}`}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      required
                    />
                    {orgIdLocked && (
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
                        <Lock className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  {orgIdLocked ? (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Hesabınızdan otomatik dolduruldu.</p>
                  ) : (
                    <p className="mt-1 text-xs text-neutral-400">Platform yöneticisi: hedef kurumun UUID'sini girin.</p>
                  )}
                </Field>
              </Section>
            )}

            {!isVilla && contractSection}
            {!isVilla && locationSection}

            {/* İlan İçeriği */}
            <Section
              title={`İlan İçeriği — ${MANAGE_EDITOR_LOCALE_TABS.find((l) => l.code === activeLang)?.flag ?? ''} ${MANAGE_EDITOR_LOCALE_TABS.find((l) => l.code === activeLang)?.label ?? activeLang}`}
            >
              <Field className="block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="mb-0">
                    Başlık <span className="text-red-500">*</span>
                  </Label>
                  <ManageAiMagicTextButton
                    loading={aiPolishTitle}
                    onClick={() => void handleMagicPolishTitle()}
                    title="SEO ve yazım kurallarına uygun başlık önerisi"
                  />
                </div>
                <Input
                  value={listingByLocale[activeLang]?.title ?? ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="ör. Bodrumda Deniz Manzaralı Villa"
                  className="mt-1"
                  required={activeLang === 'tr'}
                />
                <HintText>
                  Türkçe başlık zorunludur; diğer dilleri AI Çevir ile doldurabilirsiniz. Magic Text mevcut dilde
                  iyileştirir.
                </HintText>
              </Field>

              <Field className="block">
                <Label>
                  Slug (URL) <span className="text-red-500">*</span>
                </Label>
                <Input
                  ref={slugRef}
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="bodrum-deniz-manzarali-villa"
                  className="mt-1 font-mono text-sm"
                  required
                />
                <HintText>Yalnız küçük harf, tire ve rakam. Başlıktan otomatik üretilir.</HintText>
              </Field>

              <Field className="block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="mb-0">Açıklama</Label>
                  <ManageAiMagicTextButton
                    loading={aiPolishBody}
                    onClick={() => void handleMagicPolishBody()}
                    title="SEO, okunabilirlik, kalın vurgu ve iç linkler"
                  />
                </div>
                <RichEditor
                  value={listingByLocale[activeLang]?.description ?? ''}
                  onChange={handleDescriptionChange}
                  placeholder="İlan hakkında kapsamlı bir açıklama yazın…"
                  minHeight={200}
                  className="mt-1"
                />
              </Field>

              <Field className="block">
                <Label>Youtube Videosu</Label>
                <Input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1"
                />
              </Field>
            </Section>

            <Section title="Galeri" subtitle="Görseller önce depoya yüklenir; ilanı kaydedince ilana bağlanır. Sırayı ok ile değiştirebilirsiniz.">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Dosya yolu:{' '}
                <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
                  /uploads/listings/{gallerySubPath}/
                </code>
                — slug boşsa <code className="font-mono text-xs">yeni-ilan</code> kullanılır; mümkünse önce slug&apos;ı netleştirin.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingGalleryKeys.map((im, idx) => (
                  <div
                    key={`${im}-${idx}`}
                    className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={im.startsWith('http') || im.startsWith('/') ? im : `/${im}`}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 border-t border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
                      <span className="truncate font-mono text-[10px] text-neutral-500">
                        {im.split('/').pop()}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                          onClick={() => movePendingGallery(idx, -1)}
                          disabled={busy || idx === 0}
                          title="Yukarı"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                          onClick={() => movePendingGallery(idx, 1)}
                          disabled={busy || idx === pendingGalleryKeys.length - 1}
                          title="Aşağı"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          onClick={() => removePendingGallery(idx)}
                          disabled={busy}
                          title="Listeden çıkar"
                        >
                          <Trash2 className="h-4 w-4" />
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
                    key={`gallery-${galleryUploadKey}`}
                    value=""
                    onChange={() => {}}
                    folder="listings"
                    subPath={gallerySubPath}
                    prefix={gallerySlugBase}
                    imageIndex={pendingGalleryKeys.length + 1}
                    aspectRatio="4/3"
                    multiple
                    onBatchComplete={onPendingGalleryBatchUploaded}
                    placeholder={`${gallerySlugBase}-${pendingGalleryKeys.length + 1}.avif — çoklu seçim veya sürükleyip bırakın`}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  Toplu yüklemede dosya adları sırayla {gallerySlugBase}-{pendingGalleryKeys.length + 1},{' '}
                  {gallerySlugBase}-{pendingGalleryKeys.length + 2}, … olarak atanır.
                </p>
              </Field>
            </Section>

            {/* Fazladan Bilgi — villa: önceden rezervasyon, kişi/oda/banyo; diğer: yatak, alan… */}
            <Section
              title="Fazladan Bilgi"
              subtitle={
                isVilla
                  ? 'Kapasite, alan, oda/banyo ve rezervasyon kuralları'
                  : 'Yatak, banyo, alan ve minimum konaklama'
              }
            >
              {isVilla ? (
                <div className="space-y-4">
                  <div
                    className={clsx(
                      'grid gap-4',
                      hasContractUi ? 'lg:grid-cols-2 lg:items-start' : '',
                    )}
                  >
                    <Field className="block min-w-0">
                      <Label>İlan tipi</Label>
                      <select
                        className={`mt-1 ${selectCls}`}
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                      >
                        <option value="">— Seçin —</option>
                        {HOLIDAY_PROPERTY_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <HintText>Listelerde alt kategori yerine bu tip satırı gösterilir.</HintText>
                    </Field>
                    {hasContractUi ? <div className="min-w-0">{contractInner}</div> : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field className="block">
                      <Label>Kişi sayısı</Label>
                      <Input
                        type="number"
                        min="1"
                        className="mt-1"
                        value={maxGuests}
                        onChange={(e) => setMaxGuests(e.target.value)}
                        placeholder="ör: 8"
                      />
                      <HintText>Maksimum misafir (kapasite).</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Oda sayısı</Label>
                      <Input
                        type="number"
                        min="0"
                        className="mt-1"
                        value={roomCount}
                        onChange={(e) => setRoomCount(e.target.value)}
                        placeholder="ör: 4"
                      />
                    </Field>
                    <Field className="block">
                      <Label>Banyo sayısı</Label>
                      <Input
                        type="number"
                        min="0"
                        className="mt-1"
                        value={bathCount}
                        onChange={(e) => setBathCount(e.target.value)}
                        placeholder="ör: 2"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field className="block">
                      <Label>Alan (m²)</Label>
                      <Input
                        type="number"
                        min="0"
                        className="mt-1"
                        value={squareMeters}
                        onChange={(e) => setSquareMeters(e.target.value)}
                        placeholder="ör: 120"
                      />
                    </Field>
                    <Field className="block">
                      <Label>En az kaç gün önceden rezervasyon</Label>
                      <Input
                        type="number"
                        min="0"
                        className="mt-1"
                        value={minAdvanceBookingDays}
                        onChange={(e) => setMinAdvanceBookingDays(e.target.value)}
                        placeholder="ör: 7"
                      />
                      <HintText>Boş bırakılırsa ek kısıt yok.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Min. konaklama (gece)</Label>
                      <Input
                        type="number"
                        min="1"
                        className="mt-1"
                        value={minStayNights}
                        onChange={(e) => setMinStayNights(e.target.value)}
                        placeholder="ör: 2"
                      />
                      <HintText>Boş bırakılırsa minimum gece kısıtı yok.</HintText>
                    </Field>
                  </div>
                </div>
              ) : (
                <Grid3>
                  <Field className="block">
                    <Label>Yatak Sayısı</Label>
                    <Input
                      type="number" min="0" className="mt-1"
                      value={bedCount} onChange={(e) => setBedCount(e.target.value)}
                      placeholder="ör: 3"
                    />
                  </Field>
                  <Field className="block">
                    <Label>Banyo Sayısı</Label>
                    <Input
                      type="number" min="0" className="mt-1"
                      value={bathCount} onChange={(e) => setBathCount(e.target.value)}
                      placeholder="ör: 2"
                    />
                  </Field>
                  <Field className="block">
                    <Label>Alan (m²)</Label>
                    <Input
                      type="number" min="0" className="mt-1"
                      value={squareMeters} onChange={(e) => setSquareMeters(e.target.value)}
                      placeholder="ör: 120"
                    />
                  </Field>
                  <Field className="block">
                    <Label>Maksimum Misafir</Label>
                    <Input
                      type="number" min="1" className="mt-1"
                      value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)}
                      placeholder="ör: 8"
                    />
                  </Field>
                  <Field className="block">
                    <Label>Min. Konaklama (gece)</Label>
                    <Input
                      type="number" min="1" className="mt-1"
                      value={minStayNights} onChange={(e) => setMinStayNights(e.target.value)}
                      placeholder="ör: 2"
                    />
                    <HintText>Boş bırakılırsa minimum gece kısıtı yok.</HintText>
                  </Field>
                </Grid3>
              )}
            </Section>

            {isVilla ? (
              <>
                {/* Giriş / Çıkış — fiyat ve havuzdan önce (Booking Core sırası) */}
                <Section title="Giriş / Çıkış Saati">
                  <Grid2>
                    <Field className="block">
                      <Label>Giriş Saati (Check-in)</Label>
                      <Input
                        type="time" className="mt-1"
                        value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)}
                      />
                    </Field>
                    <Field className="block">
                      <Label>Çıkış Saati (Check-out)</Label>
                      <Input
                        type="time" className="mt-1"
                        value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)}
                      />
                    </Field>
                  </Grid2>
                </Section>

                <Section title="Fiyatlandırma">
                  <Field className="block max-w-md">
                    <Label>
                      Para Birimi <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      required
                      className={`mt-1 ${selectCls}`}
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                      {currencies.length === 0 && <option value="TRY">TRY — Turkish Lira</option>}
                    </select>
                  </Field>

                  <Grid3 className="mt-4">
                    <Field className="block">
                      <Label>Gecelik Ücret ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="0.00"
                      />
                      <HintText>Temel gecelik fiyat. İndirim ve kampanyalar ayrı modüllerden yönetilir.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Hasar Depositu ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0"
                      />
                      <HintText>Rezervasyon öncesi ya da varışta alınabilir, iade edilebilir.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Ön Ödeme Yüzdesi (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="1" className="mt-1"
                        value={prepaymentPercent} onChange={(e) => setPrepaymentPercent(e.target.value)}
                        placeholder="30"
                      />
                      <HintText>Komisyon oranından küçük olamaz (ikisi de girildiyse). Boşsa varsayılan uygulanır.</HintText>
                    </Field>
                  </Grid3>

                  <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Ek ücretler
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      Temizlik, evcil hayvan, erken giriş gibi kalemler — tutar ve hesaplama birimi
                    </p>
                    <p className="mb-3 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <strong>Kişi başı × gece:</strong> tutar × misafir sayısı × konaklama gecesi (ör. kahvaltı).
                    </p>
                    <div className="space-y-3">
                      {extraFees.map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-end gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
                        >
                          <Field className="block min-w-[140px] flex-1">
                            <Label>Kalem</Label>
                            <Input
                              className="mt-1"
                              value={row.label}
                              onChange={(e) => {
                                const copy = [...extraFees]
                                copy[i] = { ...copy[i], label: e.target.value }
                                setExtraFees(copy)
                              }}
                              placeholder="ör: Temizlik"
                            />
                          </Field>
                          <Field className="block w-28">
                            <Label>Tutar</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="mt-1"
                              value={row.amount}
                              onChange={(e) => {
                                const copy = [...extraFees]
                                copy[i] = { ...copy[i], amount: e.target.value }
                                setExtraFees(copy)
                              }}
                              placeholder="0"
                            />
                          </Field>
                          <Field className="block min-w-[220px] flex-1 sm:max-w-[min(100%,280px)]">
                            <Label>Birim</Label>
                            <select
                              className={`mt-1 ${selectCls}`}
                              value={row.unit}
                              onChange={(e) => {
                                const copy = [...extraFees]
                                copy[i] = {
                                  ...copy[i],
                                  unit: e.target.value as ExtraFeeUnit,
                                }
                                setExtraFees(copy)
                              }}
                            >
                              <option value="per_stay">Konaklama başına (sabit)</option>
                              <option value="per_night">Gece başına</option>
                              <option value="per_person">Kişi başına (tek sefer)</option>
                              <option value="per_person_per_night">Kişi başı × gece (ör. kahvaltı)</option>
                            </select>
                          </Field>
                          <button
                            type="button"
                            className="mb-0.5 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => setExtraFees(extraFees.filter((_, j) => j !== i))}
                          >
                            Sil
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setExtraFees([...extraFees, { label: '', amount: '', unit: 'per_stay' }])
                        }
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        + Ek ücret satırı ekle
                      </button>
                    </div>
                  </div>
                </Section>

                <Section title="Kısa Konaklama Ücreti" subtitle="Minimum gecenin altında kalınırsa bu tutar alınır">
                  <Grid2>
                    <Field className="block">
                      <Label>Minimum Gece Sayısı</Label>
                      <Input
                        type="number" min="1" className="mt-1"
                        value={shortStayMinNights} onChange={(e) => setShortStayMinNights(e.target.value)}
                        placeholder="ör: 5"
                      />
                      <HintText>Bu geceden az kalınırsa kısa konaklama ücreti uygulanır.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Kısa Konaklama Ücreti ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)}
                        placeholder="ör: 500"
                      />
                      <HintText>Boş bırakılırsa ücret uygulanmaz.</HintText>
                    </Field>
                  </Grid2>
                </Section>
              </>
            ) : null}

            {/* Havuz tipleri — tatil evi (plaj/villa dikey formu ile aynı yapı) */}
            {categoryCode === 'holiday_home' ? (
              <Section title="Havuz Bilgileri" subtitle="Açık, ısıtmalı ve çocuk havuzu — boyut ve ısıtma ücreti">
                <Field className="block">
                  <Label>Havuz etiketi / özet</Label>
                  <Input
                    value={poolSizeLabel}
                    onChange={(e) => setPoolSizeLabel(e.target.value)}
                    placeholder="ör: 8x4m, Isıtmalı, Sonsuzluk Havuzu"
                    className="mt-1"
                  />
                  <HintText>Özet etiket; ayrıntılar aşağıda. Villa özelliklerinde &ldquo;Özel Havuz&rdquo; işaretini de kullanın.</HintText>
                </Field>
                <div className="space-y-4">
                  {(
                    [
                      ['open_pool', 'Açık Havuz'],
                      ['heated_pool', 'Isıtmalı Havuz'],
                      ['children_pool', 'Çocuk Havuzu'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary-600"
                          checked={pools[key].enabled}
                          onChange={(e) => setPool(key, 'enabled', e.target.checked)}
                        />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                      {pools[key].enabled ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <Field className="block">
                            <Label>Genişlik (m)</Label>
                            <Input
                              type="number"
                              className="mt-1"
                              value={pools[key].width}
                              onChange={(e) => setPool(key, 'width', e.target.value)}
                              placeholder="8"
                            />
                          </Field>
                          <Field className="block">
                            <Label>Uzunluk (m)</Label>
                            <Input
                              type="number"
                              className="mt-1"
                              value={pools[key].length}
                              onChange={(e) => setPool(key, 'length', e.target.value)}
                              placeholder="16"
                            />
                          </Field>
                          <Field className="block">
                            <Label>Derinlik (m)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              className="mt-1"
                              value={pools[key].depth}
                              onChange={(e) => setPool(key, 'depth', e.target.value)}
                              placeholder="1.8"
                            />
                          </Field>
                          {key === 'heated_pool' ? (
                            <Field className="block">
                              <Label>Isıtma ücreti ({currency}/gece)</Label>
                              <Input
                                type="number"
                                className="mt-1"
                                value={pools[key].heating_fee_per_day}
                                onChange={(e) => setPool(key, 'heating_fee_per_day', e.target.value)}
                                placeholder="250"
                              />
                            </Field>
                          ) : null}
                          <Field className="block sm:col-span-3">
                            <Label>Açıklama / not</Label>
                            <Input
                              className="mt-1"
                              value={pools[key].description}
                              onChange={(e) => setPool(key, 'description', e.target.value)}
                              placeholder="Tuzlu su, infinity…"
                            />
                          </Field>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>
            ) : (
              <Section title="Havuz Bilgileri">
                <Field className="block">
                  <Label>Havuz etiketi / boyut</Label>
                  <Input
                    value={poolSizeLabel}
                    onChange={(e) => setPoolSizeLabel(e.target.value)}
                    placeholder="ör: 8x4m, Isıtmalı"
                    className="mt-1"
                  />
                  <HintText>Havuz yoksa boş bırakın.</HintText>
                </Field>
              </Section>
            )}

            {isVilla && locationSection}

            {isVilla && (
              <Section
                title="Pansiyon (yemekli / yemeksiz)"
                subtitle="Bu bilgiler yeni ilan formunda değil; ilan kaydından sonra «Yemek Planları» sekmesinde girilir"
              >
                <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                  <p>
                    İlanı bir kez kaydettikten sonra aynı ilanın sayfasında{' '}
                    <strong className="text-neutral-800 dark:text-neutral-200">İlan Yönetimi</strong> →{' '}
                    <strong className="text-neutral-800 dark:text-neutral-200">Yemek Planları</strong> sekmesine gidin;
                    <strong className="text-neutral-800 dark:text-neutral-200"> Yeni Plan</strong> ile her pansiyon seçeneği için ayrı satır açın.
                  </p>
                  <ul className="list-inside list-disc space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 dark:border-neutral-600 dark:bg-neutral-900/40">
                    <li>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">Yemekli / yemeksiz gecelik ücret</span>
                      {' — '}
                      Formda <strong>Gecelik Fiyat</strong> ve <strong>Para Birimi</strong>. Yemeksiz için plan tipi «Yemeksiz»; yemekli için kahvaltı, yarım pansiyon vb. seçin.
                    </li>
                    <li>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">Hangi öğünler dahil</span>
                      {' — '}
                      Yemekli planlarda <strong>Dahil Öğünler</strong> alanından işaretleyin (kahvaltı, öğle, akşam, gece yemeği).
                    </li>
                    <li>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">İkramlar</span>
                      {' — '}
                      Aynı planda <strong>Dahil İkramlar</strong> bölümünden seçin (çay/kahve, alkolsüz içecek, minibar, atıştırmalık, karşılama içeceği, meyve, barbekü vb.).
                    </li>
                  </ul>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    Ön yüzde «Pansiyon Seçenekleri» bu kayıtlarla listelenir. Kahvaltıyı kişi×gece ücretli satmak için ayrıca{' '}
                    <strong>Ek Ücretler</strong> bölümünde «Kişi başı × gece» birimini kullanabilirsiniz.
                  </p>
                </div>
              </Section>
            )}

            {!isVilla ? (
              <>
                {/* Giriş / Çıkış Saati */}
                <Section title="Giriş / Çıkış Saati">
                  <Grid2>
                    <Field className="block">
                      <Label>Giriş Saati (Check-in)</Label>
                      <Input
                        type="time" className="mt-1"
                        value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)}
                      />
                    </Field>
                    <Field className="block">
                      <Label>Çıkış Saati (Check-out)</Label>
                      <Input
                        type="time" className="mt-1"
                        value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)}
                      />
                    </Field>
                  </Grid2>
                </Section>

                {/* Kısa Konaklama Ücreti */}
                <Section title="Kısa Konaklama Ücreti" subtitle="Minimum gecenin altında kalınırsa bu tutar alınır">
                  <Grid2>
                    <Field className="block">
                      <Label>Minimum Gece Sayısı</Label>
                      <Input
                        type="number" min="1" className="mt-1"
                        value={shortStayMinNights} onChange={(e) => setShortStayMinNights(e.target.value)}
                        placeholder="ör: 5"
                      />
                      <HintText>Bu geceden az kalınırsa kısa konaklama ücreti uygulanır.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Kısa Konaklama Ücreti ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)}
                        placeholder="ör: 500"
                      />
                      <HintText>Boş bırakılırsa ücret uygulanmaz.</HintText>
                    </Field>
                  </Grid2>
                </Section>

                {/* Fiyatlandırma */}
                <Section title="Fiyatlandırma">
                  <Grid2>
                    <Field className="block">
                      <Label>
                        Para Birimi <span className="text-red-500">*</span>
                      </Label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        required
                        className={`mt-1 ${selectCls}`}
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                        {currencies.length === 0 && <option value="TRY">TRY — Turkish Lira</option>}
                      </select>
                    </Field>
                  </Grid2>

                  <Grid3>
                    <Field className="block">
                      <Label>Gecelik Ücret ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="0.00"
                      />
                      <HintText>Temel gecelik fiyat. İndirim ve kampanyalar ayrı kampanya modüllerinden yönetilir.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Hasar Depositu ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0"
                      />
                      <HintText>Rezervasyon öncesi ya da varışta alınabilir, iade edilebilir.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Ön Ödeme Yüzdesi (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="1" className="mt-1"
                        value={prepaymentPercent} onChange={(e) => setPrepaymentPercent(e.target.value)}
                        placeholder="30"
                      />
                      <HintText>Komisyon oranından küçük olamaz (ikisi de girildiyse). Boşsa varsayılan uygulanır.</HintText>
                    </Field>
                  </Grid3>
                </Section>
              </>
            ) : null}

            {/* Provizyon & Komisyon Ayarları */}
            <Section
              title="Provizyon & Komisyon Ayarları"
              subtitle="Ödeme akışı, tedarikçi onay süreleri ve yüksek sezon tanımı"
            >
              <Grid3>
                <Field className="block">
                  <Label>Komisyon Oranımız (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.1" className="mt-1"
                    value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="20"
                  />
                  <HintText>Ön ödeme ≥ komisyon kuralı otomatik uygulanır.</HintText>
                </Field>
                <Field className="block">
                  <Label>Ort. Reklam Gideri (%)</Label>
                  <Input
                    type="number" min="0" max="50" step="0.1" className="mt-1"
                    value={avgAdCostPercent} onChange={(e) => setAvgAdCostPercent(e.target.value)}
                    placeholder="5"
                  />
                  <HintText>AI fiyat optimizasyonu için kullanılır.</HintText>
                </Field>
                <Field className="block">
                  <Label>Normal Sezon Onay Süresi (saat)</Label>
                  <Input
                    type="number" min="1" max="72" step="1" className="mt-1"
                    value={confirmDeadlineNormal} onChange={(e) => setConfirmDeadlineNormal(e.target.value)}
                    placeholder="24"
                  />
                  <HintText>Tedarikçinin onaylaması için max süre.</HintText>
                </Field>
                <Field className="block">
                  <Label>Yüksek Sezon Onay Süresi (saat)</Label>
                  <Input
                    type="number" min="1" max="24" step="1" className="mt-1"
                    value={confirmDeadlineHigh} onChange={(e) => setConfirmDeadlineHigh(e.target.value)}
                    placeholder="2"
                  />
                  <HintText>Aynı gün hizmet: otomatik 30 dakikaya düşer.</HintText>
                </Field>
              </Grid3>

              {/* Yüksek sezon tarih aralıkları */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm/6 font-medium text-neutral-950 select-none dark:text-white">Yüksek Sezon Tarih Aralıkları</span>
                  <button
                    type="button"
                    onClick={() => setHighSeasonDates([...highSeasonDates, { from: '', to: '' }])}
                    className="rounded-lg bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400"
                  >
                    + Aralık Ekle
                  </button>
                </div>
                {highSeasonDates.length === 0 && (
                  <p className="text-xs text-neutral-400">Henüz aralık eklenmedi. Yüksek sezon yoksa boş bırakın.</p>
                )}
                {highSeasonDates.map((range, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="date"
                      value={range.from}
                      onChange={(e) => {
                        const copy = [...highSeasonDates]
                        copy[i] = { ...copy[i], from: e.target.value }
                        setHighSeasonDates(copy)
                      }}
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                    <span className="text-neutral-400">→</span>
                    <input
                      type="date"
                      value={range.to}
                      onChange={(e) => {
                        const copy = [...highSeasonDates]
                        copy[i] = { ...copy[i], to: e.target.value }
                        setHighSeasonDates(copy)
                      }}
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={() => setHighSeasonDates(highSeasonDates.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <Field className="mt-4 block">
                <Label>Tedarikçiye Ödeme Notu</Label>
                <textarea
                  value={supplierPaymentNote}
                  onChange={(e) => setSupplierPaymentNote(e.target.value)}
                  rows={2}
                  placeholder="ör: Kalan tutar nakit olarak girişte alınacaktır."
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                />
                <HintText>Bu not ödeme cetvelinde tedarikçiye gösterilir.</HintText>
              </Field>
            </Section>

            {/* İlan Sahibi Bilgileri (+ villa: BTrans / banka) */}
            <Section
              title="İlan Sahibi Bilgileri"
              subtitle={
                isVilla
                  ? 'Rezervasyon bildirimi (e-posta / WhatsApp) ve Gelir İdaresi (BTrans) süreçleri için iletişim, kimlik ve banka bilgileri.'
                  : 'Rezervasyon alındığında ilan sahibine e-posta ve WhatsApp ile bilgi gönderilir.'
              }
            >
              <Field className="block">
                <Label>{isVilla ? 'Villa sahibi adı soyadı' : 'İlan Sahibi Adı'}</Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="mt-1"
                />
              </Field>
              <Grid2>
                <Field className="block">
                  <Label>E-posta</Label>
                  <Input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="mt-1"
                  />
                </Field>
                <Field className="block">
                  <Label>Telefon (WhatsApp)</Label>
                  <Input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+90 5XX XXX XX XX"
                    className="mt-1"
                  />
                  <HintText>Ülke kodu ile birlikte. Rezervasyon bildirimi WhatsApp/SMS ile gönderilir.</HintText>
                </Field>
              </Grid2>
              {isVilla ? (
                <div className="mt-6 space-y-4 border-t border-neutral-100 pt-6 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    BTrans / banka ve adres
                  </p>
                  <p className="-mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    Gelir bildirimi ve hakediş ödemeleri için; alanlar isteğe bağlıdır, şube prosedürünüze göre
                    doldurun.
                  </p>
                  <Grid2>
                    <Field className="block">
                      <Label>T.C. kimlik numarası</Label>
                      <Input
                        inputMode="numeric"
                        autoComplete="off"
                        value={ownerTcNo}
                        onChange={(e) => setOwnerTcNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="11 haneli"
                        className="mt-1"
                        maxLength={11}
                      />
                    </Field>
                    <Field className="block">
                      <Label>Banka adı</Label>
                      <Input
                        value={ownerBankName}
                        onChange={(e) => setOwnerBankName(e.target.value)}
                        placeholder="ör: Türkiye İş Bankası"
                        className="mt-1"
                      />
                    </Field>
                  </Grid2>
                  <Grid2>
                    <Field className="block">
                      <Label>IBAN</Label>
                      <Input
                        value={ownerIban}
                        onChange={(e) => setOwnerIban(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                        placeholder="TR00 0000 0000 0000 0000 0000 00"
                        className="mt-1 font-mono text-sm"
                        maxLength={34}
                      />
                      <HintText>Boşluksuz veya TR ile birlikte yazabilirsiniz; kayıtta tek parça saklanır.</HintText>
                    </Field>
                    <Field className="block">
                      <Label>Hesap türü</Label>
                      <Input
                        value={ownerAccountType}
                        onChange={(e) => setOwnerAccountType(e.target.value)}
                        placeholder="ör: Vadesiz TL, döviz, ticari…"
                        className="mt-1"
                      />
                    </Field>
                  </Grid2>
                  <Field className="block">
                    <Label>İkametgâh / yerleşim adresi</Label>
                    <textarea
                      value={ownerResidenceAddress}
                      onChange={(e) => setOwnerResidenceAddress(e.target.value)}
                      rows={3}
                      placeholder="Mahalle, cadde, bina, ilçe, il — beyan edilen yerleşim adresi"
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    />
                  </Field>
                </div>
              ) : null}
            </Section>

            {/* İptal Politikası & Lisanslama */}
            <Section
              title="İptal Politikası & Lisanslama"
              subtitle="Yasal ve ticari gereklilikler"
            >
              <Field className="block">
                <Label>İptal Politikası</Label>
                <textarea
                  value={cancellationPolicyText}
                  onChange={(e) => setCancellationPolicyText(e.target.value)}
                  rows={3}
                  placeholder="ör: Check-in'den 30 gün öncesine kadar iptal ücretsizdir. 30-15 gün arasında %50, 15 günden kısa sürede %100 ücret alınır."
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                />
                <HintText>İlan detay sayfasında gösterilir.</HintText>
              </Field>
              <Field className="mt-3 block max-w-md">
                <Label>T.C. Kültür ve Turizm Bakanlığı belge / tesis numarası</Label>
                <Input
                  value={ministryLicenseRef}
                  onChange={(e) => setMinistryLicenseRef(e.target.value)}
                  placeholder="ör: 07-9512"
                  className="mt-1"
                />
                <HintText>Tek kayıt; ilan kaydında ve meta alanında (kurallar) aynı değer kullanılır.</HintText>
              </Field>
            </Section>

            {/* Sosyal Medya & AI Ayarları */}
            <Section title="Sosyal Medya & AI">
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Sosyal Medyada Paylaş</p>
                    <p className="text-xs text-neutral-400">İlan otomatik sosyal medya paylaşım kuyruğuna eklensin</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={shareToSocial}
                    onChange={(e) => setShareToSocial(e.target.checked)}
                    className="h-5 w-5 accent-primary-600"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">AI Başlık Üretimi</p>
                    <p className="text-xs text-neutral-400">AI bu ilan için otomatik sosyal medya metni oluşturabilsin</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowAiCaption}
                    onChange={(e) => setAllowAiCaption(e.target.checked)}
                    className="h-5 w-5 accent-primary-600"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Min. Gecelemede Boşluk Doldurma</p>
                    <p className="text-xs text-neutral-400">Takvimde boşlukları doldurmak için min. geceleme altında rezervasyona izin ver</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowSubMinStayGap}
                    onChange={(e) => setAllowSubMinStayGap(e.target.checked)}
                    className="h-5 w-5 accent-primary-600"
                  />
                </label>
              </div>
            </Section>

            {isVilla ? (
              <Section
                title="Fiyata dahil & hariç"
                subtitle="Katalogda tanımlı kalemleri işaretleyin; etiketler mevcut arayüz diline göre listelenir."
              >
                {priceLineCatalog.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Bu kategori için henüz kalem yok.{' '}
                    <Link
                      href={vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}/price-inclusions`)}
                      className="font-medium text-primary-600 underline dark:text-primary-400"
                    >
                      Dahil / Hariç
                    </Link>{' '}
                    sayfasından ekleyin.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/15">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                        Dahil
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {priceLineCatalog
                          .filter((i) => i.scope === 'included')
                          .map((i) => (
                            <label
                              key={i.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm dark:border-emerald-900/50 dark:bg-neutral-900"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPriceLineIds.has(i.id)}
                                onChange={() =>
                                  setSelectedPriceLineIds((prev) => {
                                    const n = new Set(prev)
                                    if (n.has(i.id)) n.delete(i.id)
                                    else n.add(i.id)
                                    return n
                                  })
                                }
                                className="h-4 w-4 accent-emerald-600"
                              />
                              {i.label || i.code}
                            </label>
                          ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 dark:border-amber-900/40 dark:bg-amber-950/15">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                        Hariç
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {priceLineCatalog
                          .filter((i) => i.scope === 'excluded')
                          .map((i) => (
                            <label
                              key={i.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm dark:border-amber-900/50 dark:bg-neutral-900"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPriceLineIds.has(i.id)}
                                onChange={() =>
                                  setSelectedPriceLineIds((prev) => {
                                    const n = new Set(prev)
                                    if (n.has(i.id)) n.delete(i.id)
                                    else n.add(i.id)
                                    return n
                                  })
                                }
                                className="h-4 w-4 accent-amber-600"
                              />
                              {i.label || i.code}
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </Section>
            ) : null}

            {/* SEO — dil şeridine göre; API `seo_metadata` */}
            <Section
              title={`SEO — ${
                MANAGE_EDITOR_LOCALE_TABS.find((l) => l.code === activeLang)?.flag ?? ''
              } ${MANAGE_EDITOR_LOCALE_TABS.find((l) => l.code === activeLang)?.label ?? activeLang}`}
              subtitle="Arama sonuçları ve paylaşım önizlemesi için meta alanları; kayıt ilanın çok dilli SEO kaydına yazılır."
            >
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary-200/80 bg-primary-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-primary-900/40 dark:bg-primary-950/20">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    Manuel girebilir veya Türkçe sekmede içerikten öneri alabilirsiniz. Diğer diller için üstteki{' '}
                    <strong>AI Çevir</strong>, dolu Türkçe SEO alanlarını hedef dile taşır.
                  </p>
                  <button
                    type="button"
                    disabled={seoPolishBusy === 'suggest' || activeLang !== 'tr'}
                    onClick={() => void handleAiSuggestSeoFromContent()}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 py-2 text-xs font-medium text-primary-800 disabled:opacity-40 dark:border-primary-800 dark:bg-neutral-900 dark:text-primary-200"
                    title="Türkçe başlık ve açıklamadan meta önerisi"
                  >
                    {seoPolishBusy === 'suggest' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    )}
                    İçerikten öner (TR)
                  </button>
                </div>

                <Field className="block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="mb-0">Meta başlık</Label>
                    <ManageAiMagicTextButton
                      loading={seoPolishBusy === 'title'}
                      onClick={() => void handleMagicSeoTitle()}
                      title="Mevcut dilde SEO meta başlığını iyileştir"
                    />
                  </div>
                  <Input
                    value={seoByLocale[activeLang]?.title ?? ''}
                    onChange={(e) => patchSeo({ title: e.target.value })}
                    placeholder="Örn. Bodrum’da deniz manzaralı kiralık villa"
                    className="mt-1"
                  />
                  <HintText>Önerilen uzunluk ~50–60 karakter; kayıtta kısaltılır.</HintText>
                </Field>

                <Field className="block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="mb-0">Meta açıklama</Label>
                    <ManageAiMagicTextButton
                      loading={seoPolishBusy === 'desc'}
                      onClick={() => void handleMagicSeoDescription()}
                      title="Mevcut dilde meta açıklamasını iyileştir"
                    />
                  </div>
                  <Textarea
                    rows={3}
                    value={seoByLocale[activeLang]?.description ?? ''}
                    onChange={(e) => patchSeo({ description: e.target.value })}
                    placeholder="Arama sonuçlarında görünecek kısa özet…"
                    className="mt-1"
                  />
                  <HintText>Düz metin; önerilen ~150–160 karakter.</HintText>
                </Field>

                <Field className="block">
                  <Label>Anahtar kelimeler</Label>
                  <Input
                    value={seoByLocale[activeLang]?.keywords ?? ''}
                    onChange={(e) => patchSeo({ keywords: e.target.value })}
                    placeholder="virgülle ayırın: bodrum, villa, havuz"
                    className="mt-1"
                  />
                </Field>

                <Grid2>
                  <Field className="block">
                    <Label>Canonical yol</Label>
                    <Input
                      className="mt-1 font-mono text-sm"
                      value={seoByLocale[activeLang]?.canonical_path ?? ''}
                      onChange={(e) => patchSeo({ canonical_path: e.target.value })}
                      placeholder="/tr/kiralik-villalar/..."
                    />
                    <HintText>İsteğe bağlı; site köküne göre yol.</HintText>
                  </Field>
                  <Field className="block">
                    <Label>OG görsel anahtarı</Label>
                    <Input
                      className="mt-1 font-mono text-sm"
                      value={seoByLocale[activeLang]?.og_image_storage_key ?? ''}
                      onChange={(e) => patchSeo({ og_image_storage_key: e.target.value })}
                      placeholder="depolama anahtarı (opsiyonel)"
                    />
                  </Field>
                </Grid2>

                <Field className="block max-w-md">
                  <Label>Robots</Label>
                  <Input
                    value={seoByLocale[activeLang]?.robots ?? ''}
                    onChange={(e) => patchSeo({ robots: e.target.value })}
                    placeholder="örn. index, follow veya noindex"
                    className="mt-1"
                  />
                </Field>
            </Section>

            {!isVilla ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Oluşturma Sonrası
                </h3>
                <ul className="space-y-1.5 text-xs text-blue-700 dark:text-blue-300">
                  <li>
                    • <strong>Galeri</strong> — Fotoğrafları ekleyin
                  </li>
                  <li>
                    • <strong>Takvim</strong> — Müsaitlik ve fiyat ayarlayın
                  </li>
                  <li>
                    • <strong>Çeviriler / SEO</strong> — Bu sayfada doldurduğunuz alanlar kayda gider; düzenleme
                    sayfasından güncelleyebilirsiniz
                  </li>
                  <li>
                    • <strong>Kategori özellikleri</strong> — İlan düzenlemeden tamamlayın
                  </li>
                  <li>
                    • <strong>iCal</strong> — Harici takvim bağlayın (desteklenen kategorilerde)
                  </li>
                </ul>
              </div>
            ) : null}

            {/* Hata mesajı */}
            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                {err}
              </div>
            )}

          </div>
        </div>
        </div>
      </form>

      <ManageStickyFormFooter>
        <a
          href={
            slug.trim() ? vitrinPath(`${listingPublicDetailPath}/${slug.trim().toLowerCase()}`) : '#'
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!slug.trim()) e.preventDefault()
          }}
          className={clsx(
            'order-2 inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:order-1',
            !slug.trim() && 'opacity-40',
          )}
          aria-disabled={!slug.trim()}
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          Önizleme
        </a>
        <div className="order-1 flex w-full flex-wrap items-center justify-end gap-2 sm:order-2 sm:w-auto sm:gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-1.5 dark:border-neutral-700">
            <span className="text-xs text-neutral-500">Yayın</span>
            <button
              type="button"
              onClick={() => setStatus(status === 'published' ? 'draft' : 'published')}
              className={clsx(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                status === 'published' ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600',
              )}
              aria-pressed={status === 'published'}
              aria-label={status === 'published' ? 'Yayında' : 'Taslak'}
            >
              <span
                className={clsx(
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                  status === 'published' ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </button>
            <span
              className={clsx(
                'text-xs font-semibold',
                status === 'published' ? 'text-emerald-600' : 'text-neutral-400',
              )}
            >
              {status === 'published' ? 'Yayında' : 'Taslak'}
            </span>
          </div>
          <button
            type="submit"
            form={formId}
            disabled={busy}
            onClick={() => {
              submitIntentRef.current = 'save'
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-60 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          <button
            type="submit"
            form={formId}
            disabled={busy}
            onClick={() => {
              submitIntentRef.current = 'save-show'
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kaydet ve göster
          </button>
        </div>
      </ManageStickyFormFooter>
    </div>
  )
}
