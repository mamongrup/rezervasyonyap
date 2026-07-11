'use client'

import { formatManageApiCatch, formatManageApiError } from '@/lib/manage-api-error-tr'
import {
  normalizeCatalogVertical,
  type CatalogListingVerticalCode,
} from '@/lib/catalog-listing-vertical'
import { extractHolidayHomePoolsFromVerticalMeta, unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import { listPublicCategoryThemeItems } from '@/lib/catalog-theme-items-api'
import { parseHolidayThemeCodes } from '@/lib/holiday-theme-codes'
import { VILLA_THEME_CHIP_PRESETS } from '@/lib/villa-theme-chip-presets'
import {
  parseHolidayHomeFaqListingOverlay,
  parseHolidayHomeFaqTemplatePayload,
  pickHolidayHomeFaqText,
  withHolidayHomeFaqTemplateDefaults,
} from '@/lib/holiday-home-faq-merge'
import {
  defaultHeroKeysFromSort,
  imageHasMeaningfulScene,
  MANAGE_HERO_PREVIEW_META_KEY,
  parseHeroPreviewKeysFromVertical,
  pickHeroKeysFromTaggedImages,
} from '@/lib/holiday-listing-hero-preview'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { isStayRentalCategory } from '@/lib/stay-rental-categories'
import { DEFAULT_LISTING_PREPAYMENT_PERCENT } from '@/lib/listing-prepayment'
import { managePublicDetailPathForVertical } from '@/lib/stay-detail-routes'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthProfile, getStoredAuthToken } from '@/lib/auth-storage'
import {
  initCatalogManageOrganizationFromMe,
  writeStoredCatalogOrganizationId,
} from '@/lib/catalog-manage-organization'
import { useManageT } from '@/lib/manage-i18n-context'
import {
  addListingImage,
  computeListingNearbyPois,
  patchListingNearbyPois,
  createIcalFeed,
  createListingPriceRule,
  createManageCatalogListing,
  createManageMealPlan,
  createListingExternalBooking,
  deleteListingExternalBooking,
  deleteListingPriceRule,
  deleteManageMealPlan,
  deleteIcalFeed,
  syncIcalFeed,
  patchIcalFeed,
  patchListingExternalBooking,
  patchVerticalHolidayHome,
  patchVerticalYacht,
  getVerticalYacht,
  getAuthMe,
  getListingAttributeValues,
  getListingAvailabilityCalendar,
  getListingBasics,
  getListingIcalExportToken,
  getListingMeta,
  getListingNearbyPois,
  getListingOwnerContact,
  getListingPerks,
  getListingPriceLineSelections,
  getManageListingTranslations,
  getPublicCurrencies,
  getSeoMetadata,
  getVerticalMeta,
  fetchPublicHolidayHomePropertyTypes,
  listAttributeDefs,
  listAttributeGroups,
  listIcalFeeds,
  listListingImages,
  getManageCategoryAccommodationRules,
  getVerticalHolidayHome,
  listListingExternalBookings,
  listListingPriceRules,
  listManageCatalogListings,
  listManageMealPlans,
  listManageCategoryContracts,
  putListingAvailabilityCalendar,
  rotateListingIcalExportToken,
  listPriceLineItems,
  listSiteSettings,
  patchListingBasics,
  patchListingSlug,
  patchListingPerks,
  patchManageListingContract,
  patchManageHotelDetails,
  getManageHotelDetails,
  putListingAttributeValues,
  putListingMeta,
  putListingOwnerContact,
  putManageListingTranslations,
  putVerticalMeta,
  putListingPriceLineSelections,
  upsertSeoMetadata,
  updateManageMealPlan,
  postListingToFacebook,
  MEAL_PLAN_LABELS,
  MEAL_OPTIONS,
  MEAL_EXTRAS_OPTIONS,
  type AttributeDef,
  type AttributeGroup,
  type CategoryAccommodationRuleItem,
  type IcalFeed,
  type ListingExternalBookingRow,
  type ListingImage,
  type ListingPriceRuleRow,
  type ManageListingRow,
  type MealPlanCode,
  type MealPlanItem,
  type NearbyPoi,
  type PriceLineItem,
  type ListingMeta,
} from '@/lib/travel-api'
import { mergeCalendarRows, type MergedCalendarRow } from '@/lib/listing-availability-calendar-merge'
import WizardCalendarGrid from '@/components/wizard/WizardCalendarGrid'
import HolidayHomeBedroomsEditor from '@/components/manage/HolidayHomeBedroomsEditor'
import HotelRoomsEditor from '@/components/manage/HotelRoomsEditor'
import HotelRoomAvailabilityEditor from '@/components/manage/HotelRoomAvailabilityEditor'
import HotelPromotionsEditor from '@/components/manage/HotelPromotionsEditor'
import HotelActivitiesEditor from '@/components/manage/HotelActivitiesEditor'
import HotelVitrinContentEditor from '@/components/manage/HotelVitrinContentEditor'
import {
  defaultHolidayHomePropertyTypeItems,
  holidayPropertyLabelForLocale,
  resolvePropertyTypeToSlug,
  type HolidayHomePropertyTypeItem,
} from '@/lib/holiday-property-type-options'
import { listingImageSubPath, slugifyMediaSegment } from '@/lib/upload-media-paths'
import { buildPlacePhotoProxySrc } from '@/lib/nearby-poi-image'
import { slugifyListingSlug } from '@/lib/slug-latin-tr'
import { MANAGE_FORM_CONTAINER_CLASS } from '@/components/manage/ManageFormShell'
import { HeroSlotPickerModal } from '@/components/manage/HeroSlotPickerModal'
import { ManageListingGalleryHeroPreview } from '@/components/manage/ManageListingGalleryHeroPreview'
import { HotelFacetSelectPanels } from '@/components/catalog/HotelFacetSelectPanels'
import ListingNearbyPoisSection from '@/components/travel/ListingNearbyPoisSection'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import { ManageAiTranslateToolbar } from '@/components/manage/ManageAiTranslateToolbar'
import { useManageAiLocaleRows } from '@/hooks/use-manage-ai-locales'
import { callAiTranslate } from '@/lib/manage-content-ai'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import RichEditor from '@/components/editor/RichEditor'
import ImageUpload from '@/components/editor/ImageUpload'
import MapPicker from '@/components/editor/MapPicker'
import { Field, Label } from '@/shared/fieldset'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import WizardStepNav, { type WizardStep } from '@/components/wizard/WizardStepNav'

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

function initSeoByCodes(codes: readonly string[]): Record<string, ListingSeoDraft> {
  const o: Record<string, ListingSeoDraft> = {}
  for (const c of codes) o[c] = emptyListingSeo()
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

function emptyListingByLocaleForCodes(codes: readonly string[]): Record<string, { title: string; description: string }> {
  const o: Record<string, { title: string; description: string }> = {}
  for (const c of codes) o[c] = { title: '', description: '' }
  return o
}

function parseRuleJson(json: string): {
  base: string
  weekend: string
  minNights: string
  label: string
  weekly: string
  compareAt: string
} {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>
    return {
      base: String(obj.base_nightly ?? obj.base_price ?? ''),
      weekend: String(obj.weekend_nightly ?? obj.weekend_price ?? ''),
      minNights: String(obj.min_nights ?? obj.minimum_nights ?? ''),
      label: String(obj.label ?? obj.season_name ?? ''),
      weekly: String(obj.weekly_total ?? ''),
      compareAt: String(
        obj.compare_at_nightly ?? obj.list_nightly ?? obj.original_nightly ?? obj.msrp_nightly ?? '',
      ),
    }
  } catch {
    return { base: '', weekend: '', minNights: '', label: '', weekly: '', compareAt: '' }
  }
}

function buildRuleJson(
  base: string,
  weekend: string,
  minNights: string,
  label: string,
  weeklyTotal: string,
  compareAt: string,
): string {
  const obj: Record<string, string | number> = {}
  if (label.trim()) obj.label = label.trim()
  if (base.trim()) obj.base_nightly = base.trim()
  if (weekend.trim()) obj.weekend_nightly = weekend.trim()
  if (weeklyTotal.trim()) obj.weekly_total = weeklyTotal.trim()
  if (compareAt.trim()) obj.compare_at_nightly = compareAt.trim()
  if (minNights.trim()) obj.min_nights = parseInt(minNights.trim(), 10)
  return JSON.stringify(obj)
}

const MEAL_PLAN_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])
const STAY_ACCOMMODATION_RULE_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])

/** `listing_meal_plans` güncellemesi için güvenli JSON dizi (PG jsonb + decode uyumu) */
function coerceMealPlanCodeArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const x of raw) {
    if (typeof x === 'string' && x.trim()) out.push(x.trim())
    else if (typeof x === 'number' && Number.isFinite(x)) out.push(String(x))
  }
  return out
}

/** Arama `price_from` ve rezervasyon kotası `listing_meal_plans` ile aynı kaynak — vitrin senkronu */
async function ensureHolidayHomeMealPlanNightly(
  token: string,
  listingId: string,
  pricePerNight: number,
  currencyCode: string,
  orgParam?: { organizationId?: string },
): Promise<void> {
  const { meal_plans } = await listManageMealPlans(token, listingId, orgParam)
  const active = meal_plans.filter((p) => p.is_active)
  const priceStr = String(pricePerNight)
  const cur = currencyCode.trim().toUpperCase() || 'TRY'
  if (active.length === 0) {
    await createManageMealPlan(
      token,
      listingId,
      {
        plan_code: 'room_only',
        label: 'Konaklama',
        price_per_night: priceStr,
        currency_code: cur,
      },
      orgParam,
    )
    return
  }
  const roomOnly = active.filter((p) => p.plan_code === 'room_only')
  const targets = roomOnly.length > 0 ? roomOnly : active
  for (const p of targets) {
    await updateManageMealPlan(
      token,
      listingId,
      p.id,
      {
        label: p.label,
        label_en: p.label_en,
        included_meals: coerceMealPlanCodeArray(p.included_meals),
        included_extras: coerceMealPlanCodeArray(p.included_extras),
        price_per_night: priceStr,
        currency_code: (cur || p.currency_code).trim().toUpperCase() || 'TRY',
        is_active: true,
        sort_order: p.sort_order,
      },
      orgParam,
    )
  }
}

/** İlan düzenlemede vitrin `price_from` önce kurala bakıyor — «Gecelik Ücret» ile `listing_price_rules.base_nightly` senkron kalmalı */
async function syncHolidayHomeDefaultPriceRule(
  token: string,
  listingId: string,
  pricePerNight: number,
  orgParam?: { organizationId?: string },
): Promise<void> {
  const { rules } = await listListingPriceRules(token, listingId, orgParam)
  const ruleHasBase = (raw: string): boolean => {
    try {
      const j = JSON.parse(raw) as Record<string, unknown>
      return j.base_nightly != null && String(j.base_nightly).trim() !== ''
    } catch {
      return false
    }
  }
  const target =
    rules.find((r) => {
      try {
        const j = JSON.parse(r.rule_json) as { label?: unknown }
        return j.label === 'Varsayılan fiyat'
      } catch {
        return false
      }
    }) ??
    rules.find((r) => ruleHasBase(r.rule_json)) ??
    null

  if (rules.length === 0) {
    await createListingPriceRule(
      token,
      listingId,
      {
        rule_json: JSON.stringify({
          base_nightly: pricePerNight,
          label: 'Varsayılan fiyat',
        }),
      },
      orgParam,
    )
    return
  }

  if (!target) {
    await createListingPriceRule(
      token,
      listingId,
      {
        rule_json: JSON.stringify({
          base_nightly: pricePerNight,
          label: 'Varsayılan fiyat',
        }),
      },
      orgParam,
    )
    return
  }

  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(target.rule_json) as Record<string, unknown>
  } catch {
    obj = {}
  }
  obj.base_nightly = pricePerNight
  if (obj.label == null || String(obj.label).trim() === '') {
    obj.label = 'Varsayılan fiyat'
  }
  await deleteListingPriceRule(token, listingId, target.id, orgParam)
  await createListingPriceRule(
    token,
    listingId,
    {
      rule_json: JSON.stringify(obj),
      valid_from: target.valid_from ?? undefined,
      valid_to: target.valid_to ?? undefined,
    },
    orgParam,
  )
}

function parseBaseNightlyFromRuleJson(ruleJson: string): number | undefined {
  try {
    const j = JSON.parse(ruleJson) as { base_nightly?: unknown }
    const raw = j.base_nightly
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw
    if (typeof raw === 'string') {
      const n = parseFloat(raw.replace(/\s/g, '').replace(',', '.'))
      return Number.isFinite(n) && n > 0 ? n : undefined
    }
  } catch {
    /* ignore */
  }
  return undefined
}

const HERO_SLOT_LABELS = ['Manzara', 'Havuz', 'Salon & mutfak', 'Yatak odası', 'Banyo'] as const

function listingImagesFromPendingKeys(keys: readonly string[]): ListingImage[] {
  return keys.map((storage_key, idx) => ({
    id: `pending:${storage_key}:${idx}`,
    sort_order: idx,
    storage_key,
    original_mime: 'image/avif',
    alt_text_key: null,
    created_at: '',
    scene_code: null,
  }))
}

async function saveRequiredStep<T>(label: string, step: Promise<T>): Promise<T> {
  try {
    return await step
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown_error'
    throw new Error(`${label}: ${msg}`)
  }
}

/** Panel metin alanları → API/SQL uyumlu ondalık (virgül/binlik → nokta). */
function basicsDecimalField(raw: string): string | undefined {
  let t = raw.trim().replace(/\s/g, '').replace(/%/g, '')
  if (!t || t === '__null__') return undefined
  // Türkçe binlik yalnızca net örüntülerde: 1.234,56 veya 1.234.567 (DB'deki 20.000 ≠ 20000)
  if (t.includes(',') && t.includes('.')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3}){2,}$/.test(t)) {
    t = t.replace(/\./g, '')
  } else if (t.includes(',')) {
    t = t.replace(',', '.')
  }
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n < 0) return undefined
  return String(n)
}

/** Tam sayı alanları (min stay, onay süresi saat). */
function basicsIntField(raw: string): string | undefined {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!t || t === '__null__') return undefined
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n)) return undefined
  return String(Math.max(0, Math.round(n)))
}

function basicsHighSeasonJson(ranges: Array<{ from: string; to: string }>): string | undefined {
  const clean = ranges
    .map((r) => ({ from: r.from.trim(), to: r.to.trim() }))
    .filter((r) => r.from !== '' && r.to !== '')
  if (clean.length === 0) return undefined
  return JSON.stringify(clean)
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

function mergePoolRow(src: unknown): PoolRow {
  const e = emptyPool()
  if (!src || typeof src !== 'object') return e
  const o = src as Record<string, unknown>
  return {
    enabled: Boolean(o.enabled),
    width: String(o.width ?? ''),
    length: String(o.length ?? ''),
    depth: String(o.depth ?? ''),
    description: String(o.description ?? ''),
    heating_fee_per_day: String(o.heating_fee_per_day ?? ''),
  }
}

function parseAttrValueJson(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  try {
    const p = JSON.parse(t) as unknown
    if (typeof p === 'string') return p
    if (typeof p === 'number' || typeof p === 'boolean') return String(p)
    return t
  } catch {
    return t
  }
}

/** Ek ücret satırı birimi (villa dikey meta `extra_fees`) */
type ExtraFeeUnit =
  | 'per_stay'
  | 'per_night'
  | 'per_person'
  | 'per_person_per_night'

const HOLIDAY_HOME_FAQ_SITE_KEY = 'catalog.holiday_home_default_faq'

function parseOptionsJsonSafe(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    /* ignore */
  }
  return []
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

export default function CatalogNewListingClient({
  categoryCode,
  editListingId,
}: {
  categoryCode: string
  /** Tatil evi: mevcut ilanı «yeni ilan» formuyla düzenle */
  editListingId?: string
}) {
  const t = useManageT()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const { allLocales, translateTargets, primaryLocale, localeCodes } = useManageAiLocaleRows()

  // ── Wizard adım yönetimi ──
  const TOTAL_STEPS = 7
  const WIZARD_STEPS: WizardStep[] = [
    {
      label: 'Temel Bilgi',
      shortLabel: '1',
      icon: <span className="text-xs font-bold">1</span>,
    },
    {
      label: 'Konum',
      shortLabel: '2',
      icon: <span className="text-xs font-bold">2</span>,
    },
    {
      label: 'Özellikler',
      shortLabel: '3',
      icon: <span className="text-xs font-bold">3</span>,
    },
    {
      label: 'Galeri',
      shortLabel: '4',
      icon: <span className="text-xs font-bold">4</span>,
    },
    {
      label: 'Takvim',
      shortLabel: '5',
      icon: <span className="text-xs font-bold">5</span>,
    },
    {
      label: 'Fiyat',
      shortLabel: '6',
      icon: <span className="text-xs font-bold">6</span>,
    },
    {
      label: 'Yayın',
      shortLabel: '7',
      icon: <span className="text-xs font-bold">7</span>,
    },
  ]

  const initialStep = Math.min(
    Math.max(0, parseInt(searchParams?.get('step') ?? '0', 10) || 0),
    TOTAL_STEPS - 1,
  )
  const [currentStep, setCurrentStep] = useState(initialStep)

  const goToStep = useCallback(
    (step: number) => {
      const clamped = Math.min(Math.max(0, step), TOTAL_STEPS - 1)
      setCurrentStep(clamped)
      const url = new URL(window.location.href)
      url.searchParams.set('step', String(clamped))
      router.replace(url.pathname + url.search, { scroll: false })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [router],
  )
  const localeCodesKey = localeCodes.join(',')

  // ── Temel alanlar ──
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [headerSlugEdit, setHeaderSlugEdit] = useState(false)
  const [headerSlugDraft, setHeaderSlugDraft] = useState('')
  const [headerSlugBusy, setHeaderSlugBusy] = useState(false)
  const [headerSlugErr, setHeaderSlugErr] = useState<string | null>(null)

  /** Tatil evi SSS — şablon satırları (TR önizleme), gizlenen şablon id'leri, ilana özel ekler */
  type FaqTplUi = { id: string; q_tr: string; a_tr: string }
  type FaqExtraUi = { id: string; q_tr: string; a_tr: string }
  const [faqTemplateRows, setFaqTemplateRows] = useState<FaqTplUi[]>([])
  const [faqExcludedTemplateIds, setFaqExcludedTemplateIds] = useState<Set<string>>(() => new Set())
  const [faqExtraRows, setFaqExtraRows] = useState<FaqExtraUi[]>([])
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [currencies, setCurrencies] = useState<{ code: string; name: string }[]>([])
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft')

  const [activeLang, setActiveLang] = useState(primaryLocale)
  const [listingByLocale, setListingByLocale] = useState(() => emptyListingByLocaleForCodes(localeCodes))
  const [seoByLocale, setSeoByLocale] = useState<Record<string, ListingSeoDraft>>(() => initSeoByCodes(localeCodes))
  const [seoPolishBusy, setSeoPolishBusy] = useState<string | null>(null)
  const [priceLineCatalog, setPriceLineCatalog] = useState<PriceLineItem[]>([])
  const [selectedPriceLineIds, setSelectedPriceLineIds] = useState<Set<string>>(new Set())
  const [aiTargetLocale, setAiTargetLocale] = useState(
    () => translateTargets[0]?.code ?? 'en',
  )
  const [aiTranslating, setAiTranslating] = useState(false)
  const [translateMsg, setTranslateMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [aiPolishTitle, setAiPolishTitle] = useState(false)
  const [aiPolishBody, setAiPolishBody] = useState(false)
  const submitIntentRef = useRef<'save' | 'save-show' | 'save-next'>('save')

  // ── Takvim adımı ──
  const [calRows, setCalRows] = useState<MergedCalendarRow[]>([])
  const [calLoaded, setCalLoaded] = useState(false)
  const [calBusy, setCalBusy] = useState<'load' | 'save' | null>(null)
  const [calSaveMsg, setCalSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [calSubTab, setCalSubTab] = useState<'calendar' | 'seasonal' | 'ical' | 'external'>('calendar')
  const [calFrom, setCalFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [calTo, setCalTo] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().slice(0, 10) })
  const [bulkPrice, setBulkPrice] = useState('')
  // ── Harici rezervasyon defteri ──
  const [externalBookings, setExternalBookings] = useState<ListingExternalBookingRow[]>([])
  const [extBusy, setExtBusy] = useState<string | null>(null)
  const [ebStayFrom, setEbStayFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [ebStayTo, setEbStayTo] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })
  const [ebSource, setEbSource] = useState('')
  const [ebSold, setEbSold] = useState('')
  const [ebReceived, setEbReceived] = useState('')
  const [ebRemaining, setEbRemaining] = useState('')
  const [ebFirstPayment, setEbFirstPayment] = useState('')
  const [ebNotes, setEbNotes] = useState('')
  const [ebEditingId, setEbEditingId] = useState<string | null>(null)

  // ── Dönemsel Fiyat (price rules) ──
  const [rules, setRules] = useState<ListingPriceRuleRow[]>([])
  const [ruleLabel, setRuleLabel] = useState('')
  const [ruleBase, setRuleBase] = useState('')
  const [ruleWeekend, setRuleWeekend] = useState('')
  const [ruleWeeklyTotal, setRuleWeeklyTotal] = useState('')
  const [ruleCompareAt, setRuleCompareAt] = useState('')
  const [ruleMinNights, setRuleMinNights] = useState('')
  const [ruleFrom, setRuleFrom] = useState('')
  const [ruleTo, setRuleTo] = useState('')
  const [ruleRaw, setRuleRaw] = useState('')
  const [showRawJson, setShowRawJson] = useState(false)
  const [ruleBusy, setRuleBusy] = useState(false)

  // ── Yemek Planları (meal plans) ──
  const [mealPlans, setMealPlans] = useState<MealPlanItem[]>([])
  const [mpFormOpen, setMpFormOpen] = useState(false)
  const [mpEditId, setMpEditId] = useState<string | null>(null)
  const [mpCode, setMpCode] = useState<MealPlanCode>('room_only')
  const [mpLabel, setMpLabel] = useState('')
  const [mpLabelEn, setMpLabelEn] = useState('')
  const [mpPrice, setMpPrice] = useState('')
  const [mpCurrency, setMpCurrency] = useState('TRY')
  const [mpMeals, setMpMeals] = useState<string[]>([])
  const [mpExtras, setMpExtras] = useState<string[]>([])
  const [mpActive, setMpActive] = useState(true)
  const [mpSort, setMpSort] = useState('0')
  const [mpBusy, setMpBusy] = useState(false)

  // ── iCal beslemeleri (tam yönetim) ──
  const [icalFeeds, setIcalFeeds] = useState<IcalFeed[]>([])
  const [icalFeedUrl, setIcalFeedUrl] = useState('')
  const [icalFeedPlus, setIcalFeedPlus] = useState('0')
  const [icalFeedMinus, setIcalFeedMinus] = useState('0')
  const [icalFeedEditId, setIcalFeedEditId] = useState<string | null>(null)
  const [icalFeedEditUrl, setIcalFeedEditUrl] = useState('')
  const [icalFeedEditPlus, setIcalFeedEditPlus] = useState('0')
  const [icalFeedEditMinus, setIcalFeedEditMinus] = useState('0')
  const [icalFeedBusy, setIcalFeedBusy] = useState<string | null>(null)

  const setAiTargetFromToolbar = (code: string) => {
    const picked = translateTargets.find((l) => l.code === code)
    if (picked) setAiTargetLocale(picked.code)
  }

  useEffect(() => {
    setListingByLocale((prev) => {
      const next = { ...prev }
      let changed = false
      for (const c of localeCodes) {
        if (!next[c]) {
          next[c] = { title: '', description: '' }
          changed = true
        }
      }
      return changed ? next : prev
    })
    setSeoByLocale((prev) => {
      const next = { ...prev }
      let changed = false
      for (const c of localeCodes) {
        if (!next[c]) {
          next[c] = emptyListingSeo()
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [localeCodesKey, localeCodes])

  useEffect(() => {
    setAiTargetLocale((cur) => {
      const targets = localeCodes.filter((c) => c !== primaryLocale)
      if (targets.includes(cur)) return cur
      return targets[0] ?? 'en'
    })
  }, [localeCodesKey, primaryLocale, localeCodes])

  useEffect(() => {
    setActiveLang((cur) => (localeCodes.includes(cur) ? cur : primaryLocale))
  }, [localeCodesKey, primaryLocale, localeCodes])

  // ── Fiyatlandırma ──
  const [basePrice, setBasePrice] = useState('')
  const [minStayNights, setMinStayNights] = useState('')
  const [cleaningFee, setCleaningFee] = useState('')
  const [shortStayFee, setShortStayFee] = useState('')
  const [shortStayMinNights, setShortStayMinNights] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [prepaymentPercent, setPrepaymentPercent] = useState(String(DEFAULT_LISTING_PREPAYMENT_PERCENT))
  const [commissionPercent, setCommissionPercent] = useState('')
  const [confirmDeadlineNormal, setConfirmDeadlineNormal] = useState('24')
  const [confirmDeadlineHigh, setConfirmDeadlineHigh] = useState('2')
  // Yüksek sezon tarih aralıkları: { from: string, to: string }[]
  const [highSeasonDates, setHighSeasonDates] = useState<Array<{ from: string; to: string }>>([])
  const [supplierPaymentNote, setSupplierPaymentNote] = useState('')
  const [avgAdCostPercent, setAvgAdCostPercent] = useState('')
  const [cancellationPolicyText, setCancellationPolicyText] = useState('')
  const [ministryLicenseRef, setMinistryLicenseRef] = useState('')
  const [externalListingRef, setExternalListingRef] = useState('')
  const [shareToSocial, setShareToSocial] = useState(true)
  const [allowAiCaption, setAllowAiCaption] = useState(true)
  const [allowSubMinStayGap, setAllowSubMinStayGap] = useState(false)
  const [fbPosting, setFbPosting] = useState(false)
  const [fbResult, setFbResult] = useState<{ ok: boolean; post_url?: string; error?: string; hint?: string } | null>(null)

  // ── Mülk bilgileri ──
  const [bedCount, setBedCount] = useState('')
  const [bathCount, setBathCount] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  /** Villa: en az kaç gün önceden rezervasyon + oda sayısı */
  const [minAdvanceBookingDays, setMinAdvanceBookingDays] = useState('')
  const [roomCount, setRoomCount] = useState('')
  const [squareMeters, setSquareMeters] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [propertyTypeItems, setPropertyTypeItems] = useState<HolidayHomePropertyTypeItem[]>(() =>
    defaultHolidayHomePropertyTypeItems(),
  )
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
  const [sourceReferenceUrl, setSourceReferenceUrl] = useState('')
  const [sourceImagesUrl, setSourceImagesUrl] = useState('')
  const [sourceAvailabilityUrl, setSourceAvailabilityUrl] = useState('')
  const [sourcePriceUrl, setSourcePriceUrl] = useState('')
  const [sourceAnalyzing, setSourceAnalyzing] = useState(false)
  const [sourceAnalyzeMessage, setSourceAnalyzeMessage] = useState('')
  /** İlan oluşmadan önce yüklenen galeri anahtarları; kayıtta `addListingImage` ile bağlanır */
  const [pendingGalleryKeys, setPendingGalleryKeys] = useState<string[]>([])
  /** Tatil evi düzenle: sunucudaki sıralı görseller (önizleme); yükleme ayrı galeri sayfasında */
  const [listingGalleryUrls, setListingGalleryUrls] = useState<string[]>([])
  /** Sahne kodları + sıra — vitrin özet kutuları için */
  const [listingGalleryImages, setListingGalleryImages] = useState<ListingImage[]>([])
  /** Etiketsiz modda 5 kutu için saklanan depolama anahtarları */
  const [heroManualStorageKeys, setHeroManualStorageKeys] = useState<string[]>(['', '', '', '', ''])
  const [heroPickerSlot, setHeroPickerSlot] = useState<number | null>(null)
  const [galleryUploadKey, setGalleryUploadKey] = useState(0)

  // ── Konum ──
  const [address, setAddress] = useState('')
  const [districtLabel, setDistrictLabel] = useState('')
  const [cityDisplay, setCityDisplay] = useState('')
  const [provinceCity, setProvinceCity] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [nearbyPois, setNearbyPois] = useState<NearbyPoi[]>([])
  const [nearbyPoisLoading, setNearbyPoisLoading] = useState(false)
  const [nearbyPoisBusy, setNearbyPoisBusy] = useState(false)
  const [nearbyPoisMsg, setNearbyPoisMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [mapsApiKey, setMapsApiKey] = useState('')
  const [newPoiName, setNewPoiName] = useState('')
  const [newPoiNote, setNewPoiNote] = useState('')
  const [newPoiLink, setNewPoiLink] = useState('')
  const [newPoiImage, setNewPoiImage] = useState('')

  // ── Vitrin promosyon (Tur2 yeni alanlar) ──
  /** Anında rezervasyon (tedarikçi onayı beklemeden) */
  const [instantBook, setInstantBook] = useState(false)
  /** Mobil cihazlardan rezervasyonda ek indirim (%) — boş = yok */
  const [mobileDiscountPercent, setMobileDiscountPercent] = useState('')
  /** Harici platformdan içe aktarma: Airbnb / Booking iCal besleme URL’si */
  const [icalImportUrl, setIcalImportUrl] = useState('')
  /** Bu ilanın vitrin takviminden üretilen herkese açık .ics adresi (dışa aktarım) */
  const [icalExportUrl, setIcalExportUrl] = useState<string | null>(null)
  const [icalExportLoading, setIcalExportLoading] = useState(false)
  const [icalExportRotateBusy, setIcalExportRotateBusy] = useState(false)
  /** Otel yıldızı (1–5) — sadece hotel kategorisinde */
  const [starRating, setStarRating] = useState('')
  const [hotelEtRef, setHotelEtRef] = useState('')
  const [hotelTcRef, setHotelTcRef] = useState('')

  // ── İlan sahibi ──
  const [ownerName, setOwnerName] = useState('')
  const [ownerBio, setOwnerBio] = useState('')
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
  const loadedContractIdRef = useRef('')

  // ── Öznitelikler (ilan eklemede seçim) ──
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([])
  const [attributeDefsByGroup, setAttributeDefsByGroup] = useState<Record<string, AttributeDef[]>>({})
  const [accRules, setAccRules] = useState<CategoryAccommodationRuleItem[]>([])
  const [villaThemes, setVillaThemes] = useState<string[]>([])
  const [villaThemeCatalog, setVillaThemeCatalog] = useState<{ code: string; label: string }[]>([])
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({})

  // ── UI ──
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const slugRef = useRef<HTMLInputElement>(null)
  const galleryKeysAtHydrateRef = useRef<Set<string>>(new Set())
  /** Adım 1 kaydı, POI listesi yüklenmeden DB'yi boşaltmasın. */
  const nearbyPoisHydratedRef = useRef(false)
  /** Tatil evi düzenlemede yeni iCal URL’si yalnızca hydrate’de olmayan adres için eklenir (çift kayıt önlenir). */
  const icalUrlsAtHydrateRef = useRef<Set<string>>(new Set())
  const [editListingReady, setEditListingReady] = useState(() => !editListingId)

  const isVilla = categoryCode === 'holiday_home'
  const isHotel = categoryCode === 'hotel'
  const isYacht = categoryCode === 'yacht_charter'
  const isStayRentalWizard = isStayRentalCategory(categoryCode)
  const catalogVertical = normalizeCatalogVertical(categoryCode)
  const listingPreviewBase = managePublicDetailPathForVertical(catalogVertical)
  const isTour = categoryCode === 'tour'

  const gallerySlugBase = slug.trim() ? slugifyMediaSegment(slug) : 'yeni-ilan'
  const gallerySubPath = listingImageSubPath(categoryCode, gallerySlugBase)

  const isStayRentalEdit = isStayRentalWizard && Boolean(editListingId)
  const galleryTotalCount = isStayRentalEdit ? listingGalleryUrls.length : pendingGalleryKeys.length

  const galleryImagesForHero = useMemo((): ListingImage[] => {
    if (!isStayRentalWizard) return []
    if (isStayRentalEdit) return listingGalleryImages
    return listingImagesFromPendingKeys(pendingGalleryKeys)
  }, [isStayRentalWizard, isStayRentalEdit, listingGalleryImages, pendingGalleryKeys])

  const galleryHasSceneTags = useMemo(
    () => galleryImagesForHero.some((im) => imageHasMeaningfulScene(im.scene_code)),
    [galleryImagesForHero],
  )

  const heroPreviewFiveKeys = useMemo(() => {
    if (!isStayRentalWizard) return []
    if (galleryHasSceneTags) return pickHeroKeysFromTaggedImages(galleryImagesForHero)
    const valid = new Set(galleryImagesForHero.map((im) => im.storage_key))
    return heroManualStorageKeys.map((k) => {
      const t = k.trim()
      return t && valid.has(t) ? t : ''
    })
  }, [categoryCode, galleryHasSceneTags, galleryImagesForHero, heroManualStorageKeys])

  const galleryManageHref =
    isStayRentalEdit && editListingId
      ? vitrinPath(
          `/manage/catalog/${encodeURIComponent(categoryCode)}/listings/${encodeURIComponent(editListingId)}/gallery`,
        )
      : null

  function onPendingGalleryBatchUploaded(urls: string[]) {
    const keys = urls.map((u) => u.trim()).filter(Boolean)
    if (keys.length === 0) return
    setPendingGalleryKeys((prev) => [...prev, ...keys])
    setGalleryUploadKey((n) => n + 1)
  }

  function removePendingGallery(idx: number) {
    setPendingGalleryKeys((prev) => prev.filter((_, j) => j !== idx))
  }

  async function analyzeReferenceUrl() {
    const url = sourceReferenceUrl.trim()
    if (!url) return setSourceAnalyzeMessage('Önce referans bağlantısını girin.')
    setSourceAnalyzing(true)
    setSourceAnalyzeMessage('')
    try {
      const res = await fetch('/api/listing-reference-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = (await res.json()) as {
        error?: string
        title?: string
        description?: string
        image?: string
        images?: string[]
        price?: string
        availabilityUrl?: string
      }
      if (!res.ok) throw new Error(data.error || 'Bağlantı okunamadı')
      if (data.title) setTitle(data.title)
      if (data.description) setDescription(data.description)
      if (data.image) {
        setSourceImagesUrl(data.image)
        setPendingGalleryKeys((previous) => previous.includes(data.image!) ? previous : [...previous, data.image!])
      }
      if (data.images?.length) {
        setPendingGalleryKeys((previous) => [...new Set([...previous, ...data.images!])])
      }
      if (data.price) setBasePrice(data.price)
      if (data.availabilityUrl) setSourceAvailabilityUrl(data.availabilityUrl)
      setSourceAnalyzeMessage(`Kaynak okundu${data.images?.length ? `; Drive klasöründen ${data.images.length} görsel galeriye eklendi` : ''}. Bulunan alanları kaydetmeden önce kontrol edin.`)
    } catch (error) {
      setSourceAnalyzeMessage(error instanceof Error ? error.message : 'Bağlantı okunamadı')
    } finally {
      setSourceAnalyzing(false)
    }
  }

  function addSourceImage() {
    let url = sourceImagesUrl.trim()
    if (!url) return setSourceAnalyzeMessage('Önce görsel bağlantısını girin.')
    const driveId = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/)?.[1]
    if (driveId) url = `https://drive.google.com/uc?export=download&id=${driveId}`
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    } catch {
      return setSourceAnalyzeMessage('Geçerli bir HTTPS görsel veya herkese açık Google Drive dosya bağlantısı girin.')
    }
    setPendingGalleryKeys((previous) => previous.includes(url) ? previous : [...previous, url])
    setSourceAnalyzeMessage('Görsel galeriye eklendi.')
  }

  useEffect(() => {
    if (!isStayRentalWizard) return
    document.documentElement.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [isStayRentalWizard])

  useEffect(() => {
    if (!editListingId) {
      icalUrlsAtHydrateRef.current = new Set()
      return
    }
    icalUrlsAtHydrateRef.current = new Set()
  }, [editListingId])

  useEffect(() => {
    if (!isVilla) return
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    void listPriceLineItems(token, { categoryCode, locale, ...orgParam })
      .then((r) => setPriceLineCatalog(r.items.filter((i) => i.is_active)))
      .catch(() => setPriceLineCatalog([]))
  }, [isStayRentalWizard, categoryCode, locale, needOrg, orgId])

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
          writeStoredCatalogOrganizationId(me.email, roleWithOrg.organization_id)
        } else if (typeof window !== 'undefined') {
          setOrgId(initCatalogManageOrganizationFromMe(me))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadedContractIdRef.current = ''
  }, [editListingId])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) {
      setContracts([])
      setContractsErr(null)
      if (!editListingId) setContractId('')
      return
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
        setContractsErr(null)
        if (editListingId) {
          const pending = loadedContractIdRef.current.trim()
          if (pending) setContractId(pending)
        } else {
          setContractId('')
        }
      })
      .catch((e) => {
        if (cancelled) return
        setContracts([])
        setContractsErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('contracts_load_failed'))
      })
    return () => { cancelled = true }
  }, [categoryCode, needOrg, orgId, editListingId])

  useEffect(() => {
    setHeaderSlugEdit(false)
    setHeaderSlugErr(null)
    setHeaderSlugDraft('')
  }, [editListingId])

  useEffect(() => {
    if (!isVilla || editListingId) return
    const token = getStoredAuthToken()
    if (!token) return
    let cancelled = false
    void listSiteSettings(token, { scope: 'platform', key: HOLIDAY_HOME_FAQ_SITE_KEY })
      .then((res) => {
        if (cancelled) return
        const rrow = res.settings[0]
        try {
          const raw = rrow?.value_json?.trim()
            ? parseHolidayHomeFaqTemplatePayload(JSON.parse(rrow.value_json) as unknown)
            : { items: [] }
          const payload = withHolidayHomeFaqTemplateDefaults(raw)
          setFaqTemplateRows(
            payload.items.map((it) => ({
              id: it.id,
              q_tr: pickHolidayHomeFaqText(it.question, 'tr'),
              a_tr: pickHolidayHomeFaqText(it.answer, 'tr'),
            })),
          )
        } catch {
          const payload = withHolidayHomeFaqTemplateDefaults({ items: [] })
          setFaqTemplateRows(
            payload.items.map((it) => ({
              id: it.id,
              q_tr: pickHolidayHomeFaqText(it.question, 'tr'),
              a_tr: pickHolidayHomeFaqText(it.answer, 'tr'),
            })),
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isVilla, editListingId])

  useEffect(() => {
    if (!isVilla) return
    void fetchPublicHolidayHomePropertyTypes()
      .then((vals) => {
        if (vals.length > 0) setPropertyTypeItems(vals)
      })
      .catch(() => {})
  }, [isVilla])

  useEffect(() => {
    if (!propertyType.trim()) return
    if (propertyTypeItems.length === 0) return
    const slug = resolvePropertyTypeToSlug(propertyType.trim(), propertyTypeItems)
    if (slug && slug !== propertyType) setPropertyType(slug)
  }, [propertyTypeItems, propertyType])

  const propertyTypeSelectRows = useMemo(() => {
    const cur = propertyType.trim()
    const rows = propertyTypeItems
    const known = rows.some((r) => r.slug === cur)
    if (!cur || known) return rows
    return [{ slug: cur, labels: { tr: cur } }, ...rows]
  }, [propertyType, propertyTypeItems])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    let cancelled = false
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    void listAttributeGroups(token, { categoryCode, locale, ...orgParam })
      .then(async (gRes) => {
        if (cancelled) return
        setAttributeGroups(gRes.groups)
        const defsMap: Record<string, AttributeDef[]> = {}
        await Promise.all(
          gRes.groups.map((g) =>
            listAttributeDefs(token, g.id, { locale, ...orgParam })
              .then((r) => {
                defsMap[g.id] = r.defs.filter((d) => d.is_active)
              })
              .catch(() => {
                defsMap[g.id] = []
              }),
          ),
        )
        if (!cancelled) setAttributeDefsByGroup(defsMap)
      })
      .catch(() => {
        if (!cancelled) {
          setAttributeGroups([])
          setAttributeDefsByGroup({})
        }
      })
    // Konaklama kuralları (hotel / holiday_home / yacht_charter) + villa tema kataloğu
    if (STAY_ACCOMMODATION_RULE_CATS.has(categoryCode)) {
      void getManageCategoryAccommodationRules(token, categoryCode, orgParam)
        .then((r) => { if (!cancelled) setAccRules(r) })
        .catch(() => { if (!cancelled) setAccRules([]) })
    }
    if (isStayRentalWizard) {
      void listPublicCategoryThemeItems({ categoryCode, locale })
        .then((r) => {
          if (cancelled) return
          const rows = r.items.length > 0
            ? r.items.map((i) => ({ code: i.code, label: i.label || i.code }))
            : VILLA_THEME_CHIP_PRESETS
          setVillaThemeCatalog(rows)
        })
        .catch(() => { if (!cancelled) setVillaThemeCatalog(VILLA_THEME_CHIP_PRESETS) })
    }
    return () => {
      cancelled = true
    }
  }, [categoryCode, locale, needOrg, orgId])

  /** Kayıtlı ilan: sistem üretimi .ics dışa aktarım URL’si (herkese açık takvim akışı) */
  useEffect(() => {
    if (
      !editListingId ||
      (!isStayRentalWizard && categoryCode !== 'hotel')
    ) {
      setIcalExportUrl(null)
      setIcalExportLoading(false)
      return
    }
    const token = getStoredAuthToken()
    if (!token) {
      setIcalExportUrl(null)
      setIcalExportLoading(false)
      return
    }
    if (needOrg && !orgId.trim()) {
      setIcalExportUrl(null)
      setIcalExportLoading(false)
      return
    }
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    let cancelled = false
    setIcalExportLoading(true)
    setIcalExportUrl(null)
    void getListingIcalExportToken(token, editListingId, orgParam)
      .then((r) => {
        if (!cancelled) setIcalExportUrl(r.url)
      })
      .catch(() => {
        if (!cancelled) setIcalExportUrl(null)
      })
      .finally(() => {
        if (!cancelled) setIcalExportLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [editListingId, categoryCode, needOrg, orgId])

  // Takvim adımına gelindiğinde ve henüz yüklenmemişse otomatik yükle
  useEffect(() => {
    if (currentStep === 4 && editListingId && !calLoaded && !calBusy) {
      void loadCalendar(editListingId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, editListingId, calLoaded])

  useEffect(() => {
    if (!editListingId) {
      setEditListingReady(true)
      galleryKeysAtHydrateRef.current = new Set()
      nearbyPoisHydratedRef.current = false
      setListingGalleryUrls([])
      setListingGalleryImages([])
      setHeroManualStorageKeys(['', '', '', '', ''])
      setNearbyPois([])
      setNearbyPoisLoading(false)
      setNearbyPoisBusy(false)
      return
    }
    const token = getStoredAuthToken()
    if (!token) {
      setEditListingReady(true)
      return
    }
    if (needOrg && !orgId.trim()) return

    let cancelled = false
    const lid = editListingId
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    const orgForImg = needOrg && orgId.trim() ? orgId.trim() : undefined

    setEditListingReady(false)
    setNearbyPoisLoading(true)
    nearbyPoisHydratedRef.current = false

    void (async () => {
      try {
        const [
          rowsRes,
          trans,
          basics,
          owner,
          meta,
          vertRaw,
          attrRes,
          priceSel,
          imgsRes,
          rulesRes,
          mealPlansRes,
          feedsRes,
          perks,
          faqTplRes,
          nearbyPoisRes,
        ] = await Promise.all([
          listManageCatalogListings(token, {
            categoryCode,
            search: lid,
            organizationId: orgParam?.organizationId,
            titleLocale: locale,
          }).catch(() => ({ listings: [] as ManageListingRow[], total: 0, page: 1, per_page: 0 })),
          getManageListingTranslations(token, lid, orgParam).catch(() => ({ translations: [] })),
          getListingBasics(token, lid, orgParam).catch(() => null),
          getListingOwnerContact(token, lid, orgParam).catch(() => null),
          getListingMeta(token, lid, orgParam).catch(() => null),
          getVerticalMeta<Record<string, unknown>>(
            lid,
            categoryCode,
          ).catch(() => ({} as Record<string, unknown>)),
          getListingAttributeValues(token, lid).catch(() => ({ values: [] })),
          getListingPriceLineSelections(token, lid, orgParam).catch(() => ({ item_ids: [] as string[] })),
          listListingImages(token, lid, orgForImg).catch(() => ({ images: [] })),
          listListingPriceRules(token, lid, orgParam).catch(() => ({ rules: [] })),
          listManageMealPlans(token, lid, orgParam).catch(() => ({ meal_plans: [] })),
          listIcalFeeds(lid).catch(() => ({ feeds: [] })),
          getListingPerks(lid).catch(() => null),
          listSiteSettings(token, { scope: 'platform', key: HOLIDAY_HOME_FAQ_SITE_KEY }).catch(() => ({
            settings: [] as { value_json?: string }[],
          })),
          isStayRentalWizard
            ? getListingNearbyPois(lid).catch(() => [] as NearbyPoi[])
            : Promise.resolve([] as NearbyPoi[]),
        ])

        if (cancelled) return

        setNearbyPois(Array.isArray(nearbyPoisRes) ? nearbyPoisRes : [])
        nearbyPoisHydratedRef.current = true

        const verticalMeta: Record<string, unknown> =
          typeof vertRaw === 'object' && vertRaw !== null && !Array.isArray(vertRaw)
            ? vertRaw
            : {}

        const faqSiteRow = faqTplRes.settings[0]
        if (isStayRentalWizard && categoryCode === 'holiday_home') {
          try {
            const raw = faqSiteRow?.value_json?.trim()
              ? parseHolidayHomeFaqTemplatePayload(JSON.parse(faqSiteRow.value_json) as unknown)
              : { items: [] }
            const payload = withHolidayHomeFaqTemplateDefaults(raw)
            setFaqTemplateRows(
              payload.items.map((it) => ({
                id: it.id,
                q_tr: pickHolidayHomeFaqText(it.question, 'tr'),
                a_tr: pickHolidayHomeFaqText(it.answer, 'tr'),
              })),
            )
          } catch {
            const payload = withHolidayHomeFaqTemplateDefaults({ items: [] })
            setFaqTemplateRows(
              payload.items.map((it) => ({
                id: it.id,
                q_tr: pickHolidayHomeFaqText(it.question, 'tr'),
                a_tr: pickHolidayHomeFaqText(it.answer, 'tr'),
              })),
            )
          }
        }

        const row = rowsRes.listings.find((x) => x.id === lid)
        if (row?.slug) {
          setSlug(row.slug)
          setSlugManual(true)
        }
        if (row?.currency_code?.trim()) setCurrency(row.currency_code.trim().toUpperCase())
        if (row?.category_contract_id?.trim()) {
          const ccId = row.category_contract_id.trim()
          loadedContractIdRef.current = ccId
          setContractId(ccId)
        }

        if (categoryCode === 'hotel') {
          try {
            const hd = await getManageHotelDetails(token, lid, orgParam)
            if (!cancelled) {
              if (hd.star_rating?.trim()) setStarRating(hd.star_rating.trim())
              setHotelEtRef(hd.etstur_property_ref?.trim() ?? '')
              setHotelTcRef(hd.tatilcom_property_ref?.trim() ?? '')
            }
          } catch {
            /* ignore */
          }
        }

        setListingByLocale((prev) => {
          const next = { ...prev }
          for (const tr of trans.translations) {
            next[tr.locale_code] = {
              title: tr.title ?? '',
              description: tr.description ?? '',
            }
          }
          return next
        })

        if (basics) {
          setStatus(basics.status === 'published' ? 'published' : basics.status === 'archived' ? 'archived' : 'draft')
          setMinStayNights(basics.min_stay_nights ?? '')
          setCleaningFee(basics.cleaning_fee_amount ?? '')
          setDepositAmount(basics.first_charge_amount ?? '')
          setPrepaymentPercent(basics.prepayment_percent ?? String(DEFAULT_LISTING_PREPAYMENT_PERCENT))
          setCommissionPercent(basics.commission_percent ?? '')
          setCancellationPolicyText(basics.cancellation_policy_text ?? '')
          setMinistryLicenseRef(basics.ministry_license_ref ?? '')
          setExternalListingRef(basics.external_listing_ref ?? '')
          setShareToSocial(Boolean(basics.share_to_social))
          setAllowAiCaption(Boolean(basics.allow_ai_caption))
          setAllowSubMinStayGap(Boolean(basics.allow_sub_min_stay_gap_booking))
          if (typeof basics.pool_size_label === 'string')
            setPoolSizeLabel(basics.pool_size_label)
          const bx = basics as unknown as Record<string, unknown>
          const cn = bx.confirm_deadline_normal_h
          if (typeof cn === 'string' && cn.trim()) setConfirmDeadlineNormal(cn.trim())
          const ch = bx.confirm_deadline_high_h
          if (typeof ch === 'string' && ch.trim()) setConfirmDeadlineHigh(ch.trim())
          const sn = bx.supplier_payment_note
          if (typeof sn === 'string') setSupplierPaymentNote(sn)
          const ac = bx.avg_ad_cost_percent
          if (typeof ac === 'string') setAvgAdCostPercent(ac)
          const hs = bx.high_season_dates_json
          if (typeof hs === 'string' && hs.trim()) {
            try {
              const parsed = JSON.parse(hs) as unknown
              if (Array.isArray(parsed)) {
                const ranges = parsed
                  .map((x) => {
                    if (!x || typeof x !== 'object') return null
                    const o = x as Record<string, unknown>
                    const from = String(o.from ?? '').trim()
                    const to = String(o.to ?? '').trim()
                    if (!from || !to) return null
                    return { from, to }
                  })
                  .filter((x): x is { from: string; to: string } => x != null)
                if (ranges.length > 0) setHighSeasonDates(ranges)
              }
            } catch {
              /* ignore */
            }
          }
        }

        if (owner) {
          setOwnerName(owner.contact_name ?? '')
          setOwnerBio(owner.contact_bio ?? '')
          setOwnerPhone(owner.contact_phone ?? '')
          setOwnerEmail(owner.contact_email ?? '')
        }

        if (meta) {
          setCheckInTime(meta.check_in_time ?? '')
          setCheckOutTime(meta.check_out_time ?? '')
          setBedCount(meta.bed_count ?? '')
          setBathCount(meta.bath_count ?? '')
          setMaxGuests(meta.max_guests ?? '')
          setMinAdvanceBookingDays(meta.min_advance_booking_days ?? '')
          {
            const rc = String(meta.room_count ?? '').trim()
            setRoomCount(rc || String(meta.bed_count ?? '').trim())
          }
          setPropertyType(meta.property_type ?? '')
          setYoutubeUrl(meta.youtube_url ?? '')
          setSourceReferenceUrl(meta.source_reference_url ?? '')
          setSourceImagesUrl(meta.source_images_url ?? '')
          setSourceAvailabilityUrl(meta.source_availability_url ?? '')
          setSourcePriceUrl(meta.source_price_url ?? '')
          setMinistryLicenseRef((prev) => (prev.trim() ? prev : (meta.tourism_cert_no ?? '')))
          setAddress(meta.address ?? '')
          setDistrictLabel(meta.district_label ?? '')
          setCityDisplay(meta.city ?? '')
          setProvinceCity(meta.province_city ?? '')
          const lt = meta.lat == null ? '' : String(meta.lat).trim()
          const lg = meta.lng == null ? '' : String(meta.lng).trim()
          setLat(lt)
          setLng(lg)
          setShortStayMinNights(meta.min_short_stay_nights ?? '')
          setShortStayFee(meta.short_stay_fee ?? '')
          setSquareMeters(meta.square_meters ?? '')
          setOwnerTcNo(meta.owner_tc_no ?? '')
          setOwnerBankName(meta.owner_bank_name ?? '')
          setOwnerIban(meta.owner_iban ?? '')
          setOwnerAccountType(meta.owner_account_type ?? '')
          setOwnerResidenceAddress(meta.owner_residence_address ?? '')
        }

        const poolsParsed = extractHolidayHomePoolsFromVerticalMeta(verticalMeta)
        if (poolsParsed) {
          setPools({
            open_pool: mergePoolRow(poolsParsed.open_pool),
            heated_pool: mergePoolRow(poolsParsed.heated_pool),
            children_pool: mergePoolRow(poolsParsed.children_pool),
          })
        }

        const efRaw = unwrapVerticalMetaPayload(verticalMeta).extra_fees
        if (Array.isArray(efRaw) && efRaw.length > 0) {
          const allowedUnits: ExtraFeeUnit[] = [
            'per_stay',
            'per_night',
            'per_person',
            'per_person_per_night',
          ]
          setExtraFees(
            efRaw.map((x) => {
              if (!x || typeof x !== 'object')
                return { label: '', amount: '', unit: 'per_stay' as ExtraFeeUnit }
              const o = x as Record<string, unknown>
              const u = String(o.unit ?? '')
              const unit = allowedUnits.includes(u as ExtraFeeUnit)
                ? (u as ExtraFeeUnit)
                : ('per_stay' as ExtraFeeUnit)
              return {
                label: String(o.label ?? ''),
                amount: String(o.amount ?? ''),
                unit,
              }
            }),
          )
        }

        const faqOv = parseHolidayHomeFaqListingOverlay(
          unwrapVerticalMetaPayload(verticalMeta).faq,
        )
        setFaqExcludedTemplateIds(
          faqOv.hidden_template_ids?.length ? new Set(faqOv.hidden_template_ids) : new Set(),
        )
        setFaqExtraRows(
          (faqOv.extra_items ?? []).map((it) => ({
            id: it.id,
            q_tr: pickHolidayHomeFaqText(it.question, 'tr'),
            a_tr: pickHolidayHomeFaqText(it.answer, 'tr'),
          })),
        )

        const nextAttr: Record<string, string> = {}
        for (const v of attrRes.values) {
          nextAttr[`${v.group_code}.${v.key}`] = parseAttrValueJson(v.value_json)
        }
        if (Object.keys(nextAttr).length > 0) {
          setAttributeValues((prev) => ({ ...prev, ...nextAttr }))
        }

        setSelectedPriceLineIds(new Set(priceSel.item_ids ?? []))

        const sortedImgs = [...imgsRes.images].sort((a, b) => a.sort_order - b.sort_order)
        const imgKeys = sortedImgs.map((im) => im.storage_key).filter(Boolean)
        galleryKeysAtHydrateRef.current = new Set(imgKeys)
        setListingGalleryUrls(imgKeys)
        setListingGalleryImages(sortedImgs)
        setPendingGalleryKeys([])

        const vmInner = unwrapVerticalMetaPayload(verticalMeta)
        const savedHero = parseHeroPreviewKeysFromVertical(vmInner)
        setHeroManualStorageKeys(savedHero ?? defaultHeroKeysFromSort(sortedImgs))

        setRules(rulesRes.rules ?? [])
        setMealPlans(mealPlansRes.meal_plans ?? [])
        setIcalFeeds(feedsRes?.feeds ?? [])

        // Villa temaları
        if (categoryCode === 'holiday_home') {
          void getVerticalHolidayHome(lid)
            .then((d) => setVillaThemes(parseHolidayThemeCodes(d.theme_codes)))
            .catch(() => {})
        } else if (categoryCode === 'yacht_charter') {
          void getVerticalYacht(lid)
            .then((d) => setVillaThemes(parseHolidayThemeCodes(d.theme_codes)))
            .catch(() => {})
        }

        const mpList = mealPlansRes.meal_plans ?? []
        const activeMp = mpList.filter((p) => p.is_active && p.price_per_night > 0)
        const roomOnlyMp = activeMp.filter((p) => p.plan_code === 'room_only')
        const planPickPool = roomOnlyMp.length > 0 ? roomOnlyMp : activeMp
        let hydratedNightly = ''
        if (planPickPool.length > 0) {
          const minPlan = planPickPool.reduce((a, b) =>
            a.price_per_night <= b.price_per_night ? a : b,
          )
          hydratedNightly = String(minPlan.price_per_night)
        }
        if (!hydratedNightly) {
          for (const r of rulesRes.rules) {
            const bn = parseBaseNightlyFromRuleJson(r.rule_json)
            if (bn != null) {
              hydratedNightly = String(bn)
              break
            }
          }
        }
        if (hydratedNightly) setBasePrice(hydratedNightly)

        const feedUrl = feedsRes.feeds[0]?.url
        if (feedUrl?.trim()) setIcalImportUrl(feedUrl.trim())
        icalUrlsAtHydrateRef.current = new Set(
          feedsRes.feeds.map((f) => (typeof f.url === 'string' ? f.url.trim() : '')).filter(Boolean),
        )

        if (perks) {
          setInstantBook(Boolean(perks.instant_book))
          const md = perks.mobile_discount_percent
          if (typeof md === 'number' && md > 0 && md <= 90) setMobileDiscountPercent(String(md))
        }

        const seoPairs = await Promise.all(
          localeCodes.map(async (code) => {
            try {
              const r = await getSeoMetadata({
                entity_type: 'listing',
                entity_id: lid,
                locale: code,
              })
              return [code, r.metadata] as const
            } catch {
              return [code, null] as const
            }
          }),
        )
        if (cancelled) return
        setSeoByLocale((prev) => {
          const next = { ...prev }
          for (const [code, md] of seoPairs) {
            if (!md) continue
            next[code] = {
              title: md.title ?? '',
              description: md.description ?? '',
              keywords: md.keywords ?? '',
              canonical_path: md.canonical_path ?? '',
              og_image_storage_key: md.og_image_storage_key ?? '',
              robots: md.robots ?? '',
            }
          }
          return next
        })
      } catch {
        /* kısmi yükleme — form yine açılır */
      } finally {
        if (!cancelled) {
          setEditListingReady(true)
          setNearbyPoisLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [editListingId, categoryCode, needOrg, orgId, locale, localeCodes, isStayRentalWizard, isHotel, isYacht])

  async function refreshNearbyPoisFromServer() {
    if (!editListingId || !lat.trim() || !lng.trim()) return
    const token = getStoredAuthToken()
    if (!token) {
      setNearbyPoisMsg({ ok: false, text: 'Oturum bulunamadı. Yeniden giriş yapın.' })
      return
    }
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setNearbyPoisMsg({ ok: false, text: 'Enlem ve boylam geçerli sayı olmalı.' })
      return
    }

    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    setNearbyPoisBusy(true)
    setNearbyPoisMsg(null)
    try {
      type PlaceRow = {
        name: string
        address: string
        types: string[]
        rating?: number
        placeId: string
        photoRef?: string
        lat: number
        lng: number
        distanceKm: number
      }

      const placeRowToPoi = (p: PlaceRow): NearbyPoi => ({
        title: p.name,
        summary: [
          p.address,
          p.rating ? `Puan: ${p.rating}/5` : '',
          (p.types ?? [])
            .filter((t) => !['point_of_interest', 'establishment'].includes(t))
            .slice(0, 2)
            .map((t) => t.replace(/_/g, ' '))
            .join(', '),
        ]
          .filter(Boolean)
          .join(' — '),
        image: p.photoRef
          ? buildPlacePhotoProxySrc(p.photoRef, 800)
          : undefined,
        link: `https://www.google.com/maps/place/?q=place_id:${p.placeId}`,
        place_id: p.placeId,
        lat: p.lat,
        lng: p.lng,
        distance_km: Math.round(p.distanceKm * 10) / 10,
      })

      // API anahtarını yükle (state → site ayarları → public maps-config)
      let apiKey = mapsApiKey.trim()
      if (!apiKey) {
        try {
          const s = await listSiteSettings(token, { scope: 'platform', key: 'maps' })
          const raw = s.settings?.[0]?.value_json ?? ''
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, unknown>
            apiKey = typeof parsed.google_maps_api_key === 'string' ? parsed.google_maps_api_key.trim() : ''
            if (apiKey) setMapsApiKey(apiKey)
          }
        } catch {
          /* ignore */
        }
      }
      if (!apiKey) {
        try {
          const cfgRes = await fetch('/api/maps-config')
          if (cfgRes.ok) {
            const cfg = (await cfgRes.json()) as { apiKey?: string }
            apiKey = cfg.apiKey?.trim() ?? ''
            if (apiKey) setMapsApiKey(apiKey)
          }
        } catch {
          /* ignore */
        }
      }

      let next: NearbyPoi[] = []
      let googleError: string | null = null

      // Google Places — birden fazla tip (bölge düzenleme ile aynı mantık)
      if (apiKey) {
        const googleTypes = ['tourist_attraction', 'park', 'natural_feature', 'museum']
        const byPlaceId = new Map<string, PlaceRow>()
        for (const googleType of googleTypes) {
          try {
            const placesRes = await fetch('/api/places-nearby', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: latNum,
                lng: lngNum,
                googleType,
                radiusM: 20_000,
                maxCount: 8,
                language: locale || 'tr',
                apiKey,
              }),
            })
            const pd = (await placesRes.json().catch(() => ({}))) as {
              places?: PlaceRow[]
              error?: string
            }
            if (!placesRes.ok) {
              googleError = pd.error ?? `Google Places HTTP ${placesRes.status}`
              break
            }
            for (const p of pd.places ?? []) {
              const prev = byPlaceId.get(p.placeId)
              if (!prev || p.distanceKm < prev.distanceKm) byPlaceId.set(p.placeId, p)
            }
            await new Promise((r) => setTimeout(r, 280))
          } catch (e) {
            googleError = e instanceof Error ? e.message : 'Google Places isteği başarısız'
            break
          }
        }
        if (!googleError && byPlaceId.size > 0) {
          next = [...byPlaceId.values()]
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 20)
            .map((p) => placeRowToPoi(p))
        }
      } else {
        googleError =
          'Google Maps API anahtarı yok. Yönetim → Ayarlar → Google sekmesinden anahtar ekleyin.'
      }

      // Yedek: bölge/ilçe travel_ideas — önce form koordinatlarını DB'ye yaz
      if (next.length === 0) {
        await putListingMeta(token, editListingId, { lat: lat.trim(), lng: lng.trim() }, orgParam).catch(
          () => {},
        )
        try {
          await computeListingNearbyPois(token, editListingId)
          next = await getListingNearbyPois(editListingId)
        } catch (e) {
          const backendMsg = formatManageApiCatch(e, 'Yakın mekan hesabı başarısız')
          if (googleError) {
            setNearbyPoisMsg({
              ok: false,
              text: `${googleError} Bölge yedeği: ${backendMsg}`,
            })
          } else {
            setNearbyPoisMsg({ ok: false, text: backendMsg })
          }
          return
        }
      }

      if (next.length > 0) {
        await patchListingNearbyPois(token, editListingId, next).catch(() => {})
        setNearbyPois(next)
        nearbyPoisHydratedRef.current = true
        const via = apiKey && !googleError ? 'Google Places' : 'bölge verisi'
        setNearbyPoisMsg({ ok: true, text: `${next.length} mekan eklendi (${via}).` })
      } else {
        setNearbyPois(next)
        nearbyPoisHydratedRef.current = true
        const hint = googleError
          ? googleError
          : 'Bu koordinat çevresinde sonuç bulunamadı. Bölge sayfasında gezi önerileri tanımlı mı kontrol edin veya manuel ekleyin.'
        setNearbyPoisMsg({ ok: false, text: hint })
      }
    } finally {
      setNearbyPoisBusy(false)
    }
  }

  async function saveNearbyPois(pois: NearbyPoi[]) {
    const token = getStoredAuthToken()
    if (!token || !editListingId) return
    setNearbyPois(pois)
    nearbyPoisHydratedRef.current = true
    await patchListingNearbyPois(token, editListingId, pois).catch(() => {})
  }

  function movePoiUp(index: number) {
    if (index === 0) return
    const next = [...nearbyPois]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    void saveNearbyPois(next)
  }

  function movePoiDown(index: number) {
    if (index === nearbyPois.length - 1) return
    const next = [...nearbyPois]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    void saveNearbyPois(next)
  }

  function deletePoi(index: number) {
    void saveNearbyPois(nearbyPois.filter((_, i) => i !== index))
  }

  function addManualPoi() {
    if (!newPoiName.trim()) return
    const poi: NearbyPoi = {
      title: newPoiName.trim(),
      summary: newPoiNote.trim() || undefined,
      link: newPoiLink.trim() || undefined,
      image: newPoiImage.trim() || undefined,
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      distance_km: 0,
    }
    void saveNearbyPois([...nearbyPois, poi])
    setNewPoiName('')
    setNewPoiNote('')
    setNewPoiLink('')
    setNewPoiImage('')
  }

  /** Galeri alt sayfasından dönünce önizlemeyi güncelle */
  useEffect(() => {
    if (!isStayRentalWizard || !editListingId) return
    const reloadPreview = () => {
      const token = getStoredAuthToken()
      if (!token) return
      if (needOrg && !orgId.trim()) return
      const orgForImg = needOrg && orgId.trim() ? orgId.trim() : undefined
      void listListingImages(token, editListingId, orgForImg)
        .then((r) => {
          const sorted = [...r.images].sort((a, b) => a.sort_order - b.sort_order)
          const keys = sorted.map((im) => im.storage_key).filter(Boolean)
          setListingGalleryUrls(keys)
          setListingGalleryImages(sorted)
          galleryKeysAtHydrateRef.current = new Set(keys)
        })
        .catch(() => {})
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') reloadPreview()
    }
    window.addEventListener('focus', reloadPreview)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', reloadPreview)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [isStayRentalWizard, categoryCode, editListingId, needOrg, orgId])

  /** Etiketsiz galeri: boş slotları sırayla doldur; geçersiz anahtarları temizle */
  useEffect(() => {
    if (!isStayRentalWizard) return
    if (galleryHasSceneTags) return
    if (galleryImagesForHero.length === 0) {
      setHeroManualStorageKeys(['', '', '', '', ''])
      return
    }
    setHeroManualStorageKeys((prev) => {
      const valid = new Set(galleryImagesForHero.map((im) => im.storage_key))
      const sanitized = prev.map((k) => {
        const t = k.trim()
        return t && valid.has(t) ? t : ''
      })
      if (sanitized.every((k) => !k.trim())) return defaultHeroKeysFromSort(galleryImagesForHero)
      return sanitized
    })
  }, [categoryCode, galleryHasSceneTags, galleryImagesForHero])

  function handleTitleChange(v: string) {
    if (isVilla) {
      setListingByLocale((prev) => ({
        ...prev,
        [activeLang]: { ...(prev[activeLang] ?? { title: '', description: '' }), title: v },
      }))
      if (activeLang === primaryLocale && !slugManual) setSlug(slugifyListingSlug(v))
      return
    }
    setTitle(v)
    if (!slugManual) setSlug(slugifyListingSlug(v))
  }

  function handleDescriptionChange(v: string) {
    if (isVilla) {
      setListingByLocale((prev) => ({
        ...prev,
        [activeLang]: { ...(prev[activeLang] ?? { title: '', description: '' }), description: v },
      }))
      return
    }
    setDescription(v)
  }

  async function runAiTranslateToLocale(targetCode: string) {
    const src = listingByLocale[primaryLocale]
    const tTit = (src?.title ?? '').trim()
    const tDesc = (src?.description ?? '').trim()
    const srcSeo = isVilla ? seoByLocale[primaryLocale] ?? emptyListingSeo() : emptyListingSeo()
    const slugRefVal = slugifyListingSlug(slug.trim())
    const [tTitle, tDescOut] = await Promise.all([
      tTit
        ? callAiTranslate({
            text: tTit,
            context: 'title',
            sourceLocale: primaryLocale,
            targetLocale: targetCode,
          })
        : Promise.resolve(''),
      tDesc
        ? callAiTranslate({
            text: tDesc,
            context: 'body',
            sourceLocale: primaryLocale,
            targetLocale: targetCode,
            ...(slugRefVal ? { pageSlug: slugRefVal } : {}),
          })
        : Promise.resolve(''),
    ])
    setListingByLocale((prev) => ({
      ...prev,
      [targetCode]: {
        ...prev[targetCode],
        title: tTitle || prev[targetCode]?.title || '',
        description: tDescOut || prev[targetCode]?.description || '',
      },
    }))
    if (isVilla) {
      const prevSeo = seoByLocale[primaryLocale] ?? emptyListingSeo()
      const sTit = prevSeo.title.trim()
      const sDesc = prevSeo.description.trim()
      const sKw = prevSeo.keywords.trim()
      const [seoTitle, seoDesc, seoKw] = await Promise.all([
        sTit
          ? callAiTranslate({
              text: sTit,
              context: 'seo',
              sourceLocale: primaryLocale,
              targetLocale: targetCode,
            })
          : Promise.resolve(''),
        sDesc
          ? callAiTranslate({
              text: sDesc.slice(0, 1200),
              context: 'seo',
              sourceLocale: primaryLocale,
              targetLocale: targetCode,
            })
          : Promise.resolve(''),
        sKw
          ? callAiTranslate({
              text: sKw,
              context: 'seo',
              sourceLocale: primaryLocale,
              targetLocale: targetCode,
            })
          : Promise.resolve(''),
      ])
      setSeoByLocale((prev) => ({
        ...prev,
        [targetCode]: {
          ...(prev[targetCode] ?? emptyListingSeo()),
          title: seoTitle || prev[targetCode]?.title || '',
          description: seoDesc || prev[targetCode]?.description || '',
          keywords: seoKw || prev[targetCode]?.keywords || '',
        },
      }))
    }
  }

  async function handleAiTranslateTrToTarget() {
    if (aiTargetLocale === primaryLocale) {
      setTranslateMsg({
        ok: false,
        text: `Çeviri hedefi birincil kaynak dilden (${primaryLocale.toUpperCase()}) farklı olmalı.`,
      })
      return
    }
    const src = listingByLocale[primaryLocale]
    const tTit = (src?.title ?? '').trim()
    const tDesc = (src?.description ?? '').trim()
    const srcSeo = isVilla ? seoByLocale[primaryLocale] ?? emptyListingSeo() : emptyListingSeo()
    const hasPrimarySeo =
      isVilla &&
      (srcSeo.title.trim() || srcSeo.description.trim() || srcSeo.keywords.trim())
    if (!tTit && !tDesc && !hasPrimarySeo) {
      const plabel = allLocales.find((l) => l.code === primaryLocale)?.label ?? primaryLocale
      setTranslateMsg({
        ok: false,
        text: `Önce ${plabel} dilinde başlık, açıklama veya SEO alanlarından en az birini doldurun.`,
      })
      return
    }
    setAiTranslating(true)
    setTranslateMsg(null)
    try {
      await runAiTranslateToLocale(aiTargetLocale)
      const label = allLocales.find((l) => l.code === aiTargetLocale)?.label ?? aiTargetLocale
      setTranslateMsg({
        ok: true,
        text: `${label} çevirisi hazır. Kaydetmeyi unutmayın.`,
      })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : 'Çeviri başarısız',
      })
    } finally {
      setAiTranslating(false)
    }
  }

  async function handleAiTranslateAllTargets() {
    const src = listingByLocale[primaryLocale]
    const tTit = (src?.title ?? '').trim()
    const tDesc = (src?.description ?? '').trim()
    const srcSeo = isVilla ? seoByLocale[primaryLocale] ?? emptyListingSeo() : emptyListingSeo()
    const hasPrimarySeo =
      isVilla &&
      (srcSeo.title.trim() || srcSeo.description.trim() || srcSeo.keywords.trim())
    if (!tTit && !tDesc && !hasPrimarySeo) {
      const plabel = allLocales.find((l) => l.code === primaryLocale)?.label ?? primaryLocale
      setTranslateMsg({
        ok: false,
        text: `Önce ${plabel} dilinde başlık, açıklama veya SEO alanlarından en az birini doldurun.`,
      })
      return
    }
    if (translateTargets.length === 0) {
      setTranslateMsg({ ok: false, text: 'Çevrilecek başka dil yok.' })
      return
    }
    setAiTranslating(true)
    setTranslateMsg(null)
    const failed: string[] = []
    try {
      for (const { code } of translateTargets) {
        try {
          await runAiTranslateToLocale(code)
        } catch {
          failed.push(code)
        }
      }
      const okAll = failed.length === 0
      setTranslateMsg({
        ok: okAll,
        text: okAll
          ? `Tüm dillere çeviri tamamlandı (${translateTargets.length}). Kaydetmeyi unutmayın.`
          : `Kısmen tamamlandı. Başarısız: ${failed.map((c) => c.toUpperCase()).join(', ')}. Diğer diller güncellendi; kaydedin.`,
      })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : 'Çeviri başarısız',
      })
    } finally {
      setAiTranslating(false)
    }
  }

  // ── Takvim yükle / kaydet ──
  async function loadCalendar(listingIdParam?: string) {
    const token = getStoredAuthToken()
    if (!token) return
    const id = listingIdParam ?? editListingId
    if (!id) return
    setCalBusy('load')
    setCalSaveMsg(null)
    try {
      const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
      const av = await getListingAvailabilityCalendar(token, id, { from: calFrom, to: calTo }, orgParam)
      setCalRows(mergeCalendarRows(calFrom, calTo, av.days))
      setCalLoaded(true)
    } catch {
      setCalSaveMsg({ ok: false, text: 'Takvim yüklenemedi.' })
    } finally {
      setCalBusy(null)
    }
  }

  // ── Toplu takvim işlemleri ──
  function bulkSetAll(available: boolean) {
    setCalRows((prev) => prev.map((r) => ({ ...r, am_available: available, pm_available: available, is_available: available })))
  }
  function bulkMarkWeekends(available: boolean) {
    setCalRows((prev) => prev.map((r) => r.weekday === 0 || r.weekday === 6 ? { ...r, am_available: available, pm_available: available, is_available: available } : r))
  }
  function applyBulkPrice() {
    if (!bulkPrice.trim()) return
    setCalRows((prev) => prev.map((r) => ({ ...r, price_override: bulkPrice.trim() })))
  }

  // ── Harici rezervasyon defteri ──
  async function loadExternalBookings() {
    const token = getStoredAuthToken()
    if (!token || !editListingId) return
    try {
      const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
      const res = await listListingExternalBookings(token, editListingId, orgParam)
      setExternalBookings(res.bookings)
    } catch { /* ignore */ }
  }

  function resetExternalBookingForm() {
    const today = new Date().toISOString().slice(0, 10)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)
    setEbEditingId(null)
    setEbStayFrom(today)
    setEbStayTo(nextWeek.toISOString().slice(0, 10))
    setEbSource(''); setEbSold(''); setEbReceived(''); setEbRemaining(''); setEbFirstPayment(''); setEbNotes('')
  }

  function beginEditExternalBooking(row: ListingExternalBookingRow) {
    setEbEditingId(row.id)
    setEbStayFrom(row.stay_from)
    setEbStayTo(row.stay_to)
    setEbSource(row.source_label)
    setEbSold(row.sold_total != null ? String(row.sold_total) : '')
    setEbReceived(row.amount_received != null ? String(row.amount_received) : '')
    setEbRemaining(row.amount_remaining != null ? String(row.amount_remaining) : '')
    setEbFirstPayment(row.first_payment_note)
    setEbNotes(row.notes)
  }

  async function saveExternalBooking() {
    const token = getStoredAuthToken()
    if (!token || !editListingId) return
    setExtBusy('save')
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    const body = {
      stay_from: ebStayFrom.trim(), stay_to: ebStayTo.trim(),
      source_label: ebSource.trim() || undefined,
      sold_total: ebSold.trim() || undefined, amount_received: ebReceived.trim() || undefined,
      amount_remaining: ebRemaining.trim() || undefined,
      first_payment_note: ebFirstPayment.trim() || undefined, notes: ebNotes.trim() || undefined,
    }
    try {
      if (ebEditingId) { await patchListingExternalBooking(token, editListingId, ebEditingId, body, orgParam) }
      else { await createListingExternalBooking(token, editListingId, body, orgParam) }
      resetExternalBookingForm()
      await loadExternalBookings()
    } catch { /* ignore */ }
    finally { setExtBusy(null) }
  }

  async function removeExternalBooking(id: string) {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    const token = getStoredAuthToken()
    if (!token || !editListingId) return
    setExtBusy(`del-${id}`)
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    try {
      await deleteListingExternalBooking(token, editListingId, id, orgParam)
      if (ebEditingId === id) resetExternalBookingForm()
      await loadExternalBookings()
    } catch { /* ignore */ }
    finally { setExtBusy(null) }
  }

  async function saveCalendar() {
    const token = getStoredAuthToken()
    if (!token || !editListingId) return
    setCalBusy('save')
    setCalSaveMsg(null)
    try {
      const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
      await putListingAvailabilityCalendar(
        token,
        editListingId,
        {
          days: calRows.map((r) => ({
            day: r.day,
            is_available: r.am_available || r.pm_available,
            am_available: r.am_available,
            pm_available: r.pm_available,
            price_override: r.price_override.trim(),
            day_status: r.day_status ?? null,
          })),
        },
        orgParam,
      )
      setCalSaveMsg({ ok: true, text: 'Takvim kaydedildi.' })
    } catch {
      setCalSaveMsg({ ok: false, text: 'Takvim kaydedilemedi.' })
    } finally {
      setCalBusy(null)
    }
  }

  // ── Dönemsel Fiyat handlers ──
  const orgParam2 = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined

  function ruleReset() {
    setRuleLabel('')
    setRuleBase('')
    setRuleWeekend('')
    setRuleWeeklyTotal('')
    setRuleCompareAt('')
    setRuleMinNights('')
    setRuleFrom('')
    setRuleTo('')
    setRuleRaw('')
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !editListingId) return
    const ruleJson = showRawJson
      ? ruleRaw.trim()
      : buildRuleJson(ruleBase, ruleWeekend, ruleMinNights, ruleLabel, ruleWeeklyTotal, ruleCompareAt)
    if (!ruleJson || ruleJson === '{}') return
    setRuleBusy(true)
    try {
      await createListingPriceRule(token, editListingId, { rule_json: ruleJson, valid_from: ruleFrom.trim() || undefined, valid_to: ruleTo.trim() || undefined }, orgParam2)
      const fresh = await listListingPriceRules(token, editListingId, orgParam2)
      setRules(fresh.rules)
      ruleReset()
    } catch { /* silent */ } finally { setRuleBusy(false) }
  }

  async function deleteRule(id: string) {
    const token = getStoredAuthToken()
    if (!token || !editListingId || !confirm('Bu fiyat dönemini silmek istiyor musunuz?')) return
    setRuleBusy(true)
    try {
      await deleteListingPriceRule(token, editListingId, id, orgParam2)
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch { /* silent */ } finally { setRuleBusy(false) }
  }

  // ── Yemek Planları handlers ──
  function mpResetForm() {
    setMpEditId(null); setMpCode('room_only'); setMpLabel(''); setMpLabelEn('')
    setMpPrice(''); setMpCurrency('TRY'); setMpMeals([]); setMpExtras([])
    setMpActive(true); setMpSort('0')
  }

  function mpOpenEdit(plan: MealPlanItem) {
    setMpEditId(plan.id)
    setMpCode(plan.plan_code as MealPlanCode)
    setMpLabel(plan.label ?? '')
    setMpLabelEn(plan.label_en ?? '')
    setMpPrice(String(plan.price_per_night ?? ''))
    setMpCurrency(plan.currency_code ?? 'TRY')
    setMpMeals(coerceMealPlanCodeArray(plan.included_meals))
    setMpExtras(coerceMealPlanCodeArray(plan.included_extras))
    setMpActive(plan.is_active ?? true)
    setMpSort(String(plan.sort_order ?? '0'))
    setMpFormOpen(true)
  }

  async function saveMealPlan(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !editListingId) return
    setMpBusy(true)
    const labelVal = mpLabel.trim() || MEAL_PLAN_LABELS[mpCode]?.tr || mpCode
    const labelEnVal = mpLabelEn.trim() || MEAL_PLAN_LABELS[mpCode]?.en
    try {
      if (mpEditId) {
        await updateManageMealPlan(token, editListingId, mpEditId, {
          label: labelVal,
          label_en: labelEnVal,
          price_per_night: String(parseFloat(mpPrice) || 0),
          currency_code: mpCurrency,
          included_meals: mpMeals,
          included_extras: mpExtras,
          is_active: mpActive,
          sort_order: parseInt(mpSort) || 0,
        }, orgParam2)
      } else {
        await createManageMealPlan(token, editListingId, {
          plan_code: mpCode,
          label: labelVal,
          label_en: labelEnVal,
          price_per_night: String(parseFloat(mpPrice) || 0),
          currency_code: mpCurrency,
          included_meals: mpMeals,
          included_extras: mpExtras,
        }, orgParam2)
      }
      const fresh = await listManageMealPlans(token, editListingId, orgParam2)
      setMealPlans(fresh.meal_plans ?? [])
      mpResetForm(); setMpFormOpen(false)
    } catch { /* silent */ } finally { setMpBusy(false) }
  }

  async function deleteMealPlan(id: string) {
    const token = getStoredAuthToken()
    if (!token || !editListingId || !confirm('Bu yemek planını silmek istiyor musunuz?')) return
    setMpBusy(true)
    try {
      await deleteManageMealPlan(token, editListingId, id, orgParam2)
      setMealPlans((prev) => prev.filter((p) => p.id !== id))
    } catch { /* silent */ } finally { setMpBusy(false) }
  }

  // ── iCal feed handlers (bu API'lar auth header almıyor — public endpoint) ──
  async function addIcalFeed() {
    if (!editListingId || !icalFeedUrl.trim()) return
    setIcalFeedBusy('add')
    try {
      await createIcalFeed({ listing_id: editListingId, url: icalFeedUrl.trim(), day_offset_plus: parseInt(icalFeedPlus) || 0, day_offset_minus: parseInt(icalFeedMinus) || 0 })
      const fresh = await listIcalFeeds(editListingId)
      setIcalFeeds(fresh.feeds ?? [])
      setIcalFeedUrl(''); setIcalFeedPlus('0'); setIcalFeedMinus('0')
    } catch { /* silent */ } finally { setIcalFeedBusy(null) }
  }

  async function saveEditIcalFeed() {
    if (!icalFeedEditId) return
    setIcalFeedBusy('edit')
    try {
      await patchIcalFeed(icalFeedEditId, { url: icalFeedEditUrl, day_offset_plus: parseInt(icalFeedEditPlus) || 0, day_offset_minus: parseInt(icalFeedEditMinus) || 0 })
      if (editListingId) {
        const fresh = await listIcalFeeds(editListingId)
        setIcalFeeds(fresh.feeds ?? [])
      }
      setIcalFeedEditId(null)
    } catch { /* silent */ } finally { setIcalFeedBusy(null) }
  }

  async function removeIcalFeed(id: string) {
    if (!confirm('Bu iCal beslemesini silmek istiyor musunuz?')) return
    setIcalFeedBusy(`del-${id}`)
    try {
      await deleteIcalFeed(id)
      setIcalFeeds((prev) => prev.filter((f) => f.id !== id))
    } catch { /* silent */ } finally { setIcalFeedBusy(null) }
  }

  async function syncIcalFeedNow(id: string) {
    setIcalFeedBusy(`sync-${id}`)
    try {
      await syncIcalFeed(id)
    } catch { /* silent */ } finally { setIcalFeedBusy(null) }
  }

  /** Bölge düzenle ile aynı: mevcut dilde SEO / yazım iyileştirmesi */
  const magicSourceLocale = isVilla ? activeLang : locale

  async function handleMagicPolishTitle() {
    const raw = isVilla
      ? (listingByLocale[activeLang]?.title ?? '').trim()
      : title.trim()
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
        if (isVilla) {
          setListingByLocale((prev) => ({
            ...prev,
            [activeLang]: {
              ...(prev[activeLang] ?? { title: '', description: '' }),
              title: v,
            },
          }))
          if (activeLang === primaryLocale && !slugManual) setSlug(slugifyListingSlug(v))
        } else {
          setTitle(v)
          if (!slugManual) setSlug(slugifyListingSlug(v))
        }
      }
      setTranslateMsg({ ok: true, text: 'Başlık SEO ve yazım kurallarına göre iyileştirildi.' })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : 'İşlem başarısız',
      })
    } finally {
      setAiPolishTitle(false)
    }
  }

  async function handleMagicPolishBody() {
    const raw = isVilla
      ? (listingByLocale[activeLang]?.description ?? '').trim()
      : description.trim()
    if (!raw) {
      setTranslateMsg({ ok: false, text: 'Önce açıklama içeriği girin.' })
      return
    }
    setAiPolishBody(true)
    setTranslateMsg(null)
    try {
      const slugRefVal = slugifyListingSlug(slug.trim())
      const out = await callAiTranslate({
        text: raw,
        context: 'body',
        sourceLocale: magicSourceLocale,
        targetLocale: magicSourceLocale,
        ...(slugRefVal ? { pageSlug: slugRefVal } : {}),
      })
      if (out) {
        if (isVilla) {
          setListingByLocale((prev) => ({
            ...prev,
            [activeLang]: {
              ...(prev[activeLang] ?? { title: '', description: '' }),
              description: out,
            },
          }))
        } else {
          setDescription(out)
        }
      }
      setTranslateMsg({
        ok: true,
        text: 'Açıklama iyileştirildi (vurgu ve okunabilirlik). Kaydetmeyi unutmayın.',
      })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : 'İşlem başarısız',
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
    if (!isVilla) return
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
        text: e instanceof Error ? formatManageApiError(e.message) : 'İşlem başarısız',
      })
    } finally {
      setSeoPolishBusy(null)
    }
  }

  async function handleMagicSeoDescription() {
    if (!isVilla) return
    const raw = (seoByLocale[activeLang]?.description ?? '').trim()
    if (!raw) {
      setTranslateMsg({ ok: false, text: 'Önce meta açıklaması yazın veya «İçerikten öner» kullanın.' })
      return
    }
    setSeoPolishBusy('desc')
    setTranslateMsg(null)
    try {
      const slugRefVal = slugifyListingSlug(slug.trim())
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
        text: e instanceof Error ? formatManageApiError(e.message) : 'İşlem başarısız',
      })
    } finally {
      setSeoPolishBusy(null)
    }
  }

  async function handleAiSuggestSeoFromContent() {
    if (!isVilla) return
    if (activeLang !== primaryLocale) {
      const plabel = allLocales.find((l) => l.code === primaryLocale)?.label ?? primaryLocale
      setTranslateMsg({ ok: false, text: `Bu öneriyi ${plabel} sekmesindeyken kullanın.` })
      return
    }
    const tit = (listingByLocale[primaryLocale]?.title ?? '').trim()
    const plain = stripHtmlToPlain(listingByLocale[primaryLocale]?.description ?? '')
    if (!tit && !plain) {
      setTranslateMsg({
        ok: false,
        text: `Önce ${allLocales.find((l) => l.code === primaryLocale)?.label ?? primaryLocale} başlık veya açıklama girin.`,
      })
      return
    }
    setSeoPolishBusy('suggest')
    setTranslateMsg(null)
    try {
      const slugRefVal = slugifyListingSlug(slug.trim())
      const [metaTitle, metaDesc] = await Promise.all([
        tit
          ? callAiTranslate({
              text: tit,
              context: 'seo',
              sourceLocale: primaryLocale,
              targetLocale: primaryLocale,
            })
          : Promise.resolve(''),
        plain
          ? callAiTranslate({
              text: plain.slice(0, 1200),
              context: 'seo',
              sourceLocale: primaryLocale,
              targetLocale: primaryLocale,
              ...(slugRefVal ? { pageSlug: slugRefVal } : {}),
            })
          : Promise.resolve(''),
      ])
      setSeoByLocale((prev) => ({
        ...prev,
        [primaryLocale]: {
          ...(prev[primaryLocale] ?? emptyListingSeo()),
          title: (metaTitle || prev[primaryLocale]?.title || '').slice(0, 70),
          description: (metaDesc || prev[primaryLocale]?.description || '').slice(0, 320),
        },
      }))
      setTranslateMsg({
        ok: true,
        text: `${allLocales.find((l) => l.code === primaryLocale)?.label ?? primaryLocale} SEO alanları ilan içeriğinden önerildi. Diğer diller için AI Çevir kullanın.`,
      })
    } catch (e) {
      setTranslateMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : 'İşlem başarısız',
      })
    } finally {
      setSeoPolishBusy(null)
    }
  }

  function toggleFaqTemplateIncluded(templateId: string) {
    setFaqExcludedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(templateId)) next.delete(templateId)
      else next.add(templateId)
      return next
    })
  }

  function addFaqExtraRow() {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `extra_${Date.now()}`
    setFaqExtraRows((rows) => [...rows, { id, q_tr: '', a_tr: '' }])
  }

  function removeFaqExtraRow(rowId: string) {
    setFaqExtraRows((rows) => rows.filter((r) => r.id !== rowId))
  }

  function patchFaqExtraRow(rowId: string, patch: Partial<{ q_tr: string; a_tr: string }>) {
    setFaqExtraRows((rows) => rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)))
  }

  function handleSlugChange(v: string) {
    setSlugManual(true)
    setSlug(slugifyListingSlug(v))
  }

  async function persistHeaderSlug() {
    if (!editListingId) return
    const token = getStoredAuthToken()
    if (!token) {
      setErr(t('catalog.session_missing'))
      return
    }
    const next = slugifyListingSlug(headerSlugDraft.trim())
    if (!next) {
      setHeaderSlugErr('Geçerli bir adres kodu (slug) girin.')
      return
    }
    setHeaderSlugErr(null)
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    setHeaderSlugBusy(true)
    try {
      const r = await patchListingSlug(token, editListingId, { slug: next }, orgParam)
      setSlug(r.slug)
      setSlugManual(true)
      setHeaderSlugEdit(false)
    } catch (e) {
      setHeaderSlugErr(
        formatManageApiError(e instanceof Error ? e.message : 'İşlem başarısız'),
      )
    } finally {
      setHeaderSlugBusy(false)
    }
  }

  function setPool(key: keyof typeof pools, field: keyof PoolRow, val: string | boolean) {
    setPools((p) => ({ ...p, [key]: { ...p[key], [field]: val } }))
  }

  function setAttributeValue(groupCode: string, key: string, value: string) {
    setAttributeValues((prev) => ({ ...prev, [`${groupCode}.${key}`]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const token = getStoredAuthToken()
    if (!token) { setErr(t('catalog.session_missing')); return }
    if (needOrg && !orgId.trim()) { setErr(t('catalog.org_required')); return }
    if (editListingId && !editListingReady) return
    if (contracts.length > 0 && !contractId.trim()) {
      setErr('Bu kategori için sözleşme havuzundan bir şablon seçin.'); return
    }
    if (commissionPercent.trim() || prepaymentPercent.trim()) {
      const c = parseFloat(commissionPercent.replace(',', '.').replace(/%/g, ''))
      const p = parseFloat(prepaymentPercent.replace(',', '.').replace(/%/g, ''))
      if (Number.isFinite(c) && Number.isFinite(p) && p < c) {
        setErr('Ön ödeme yüzdesi, komisyon oranından küçük olamaz (eşit veya büyük olmalı).')
        return
      }
    }
    const trTitle = (isVilla ? listingByLocale[primaryLocale]?.title?.trim() : title.trim()) ?? ''
    if (isVilla && !trTitle) {
      setErr(`${allLocales.find((l) => l.code === primaryLocale)?.label ?? primaryLocale} başlık zorunludur.`)
      setActiveLang(primaryLocale)
      return
    }

    setBusy(true)
    try {
      const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined

      // 1. İlanı oluştur (yalnızca yeni kayıt)
      let lid: string
      if (editListingId) {
        lid = editListingId
        if (contractId.trim()) {
          await saveRequiredStep(
            'Kategori sözleşmesi',
            patchManageListingContract(
              token,
              lid,
              { category_contract_id: contractId.trim() },
              orgParam,
            ),
          )
        }
      } else {
        const body: Parameters<typeof createManageCatalogListing>[1] = {
          category_code: categoryCode,
          slug: slugifyListingSlug(slug.trim()),
          currency_code: currency.trim().toUpperCase(),
          title: trTitle,
          title_locale: isVilla ? primaryLocale : locale,
        }
        if (needOrg) body.organization_id = orgId.trim()
        if (contractId.trim()) body.category_contract_id = contractId.trim()
        const created = await createManageCatalogListing(token, body)
        lid = created.id

        if (needOrg && typeof window !== 'undefined')
          writeStoredCatalogOrganizationId(getStoredAuthProfile()?.email ?? '', orgId.trim())
      }

      // 2. Çeviri / açıklama
      const translationEntries = isVilla
        ? allLocales.map((loc) => ({
            locale_code: loc.code,
            title: (listingByLocale[loc.code]?.title ?? '').trim(),
            description: (listingByLocale[loc.code]?.description ?? '').trim() || undefined,
          })).filter((e) => e.title.length > 0 || (e.description?.length ?? 0) > 0)
        : [{ locale_code: locale, title: title.trim(), description: description.trim() || undefined }]
      await saveRequiredStep(
        'Çeviri/açıklama kaydı',
        putManageListingTranslations(token, lid, { entries: translationEntries }, orgParam),
      )

      // 3. Temel gecelik — vitrin API önce `listing_price_rules.base_nightly`, sonra yemek planlarını okur
      if (!editListingId) {
        const price = parseFloat(basePrice.replace(',', '.'))
        if (Number.isFinite(price) && price > 0) {
          const ruleObj: Record<string, unknown> = {
            base_nightly: price,
            label: 'Varsayılan fiyat',
          }
          await saveRequiredStep(
            'Fiyat kaydı',
            createListingPriceRule(token, lid, { rule_json: JSON.stringify(ruleObj) }, orgParam),
          )
          if (categoryCode === 'holiday_home') {
            await ensureHolidayHomeMealPlanNightly(token, lid, price, currency.trim().toUpperCase() || 'TRY', orgParam)
              .catch((e) => console.warn('[meal_plan_sync]', e))
          }
        }
      } else if (editListingId && categoryCode === 'holiday_home') {
        const price = parseFloat(basePrice.replace(',', '.'))
        if (Number.isFinite(price) && price > 0) {
          // Soft-fail: vitrin senkronu — başarısız olsa da ana kayıt devam etsin
          await ensureHolidayHomeMealPlanNightly(token, lid, price, currency.trim().toUpperCase() || 'TRY', orgParam)
            .catch((e) => console.warn('[meal_plan_sync]', e))
          await syncHolidayHomeDefaultPriceRule(token, lid, price, orgParam)
            .catch((e) => console.warn('[price_rule_sync]', e))
        }
      }

      // 4. Temel ilan alanları
      const basicsBody: Parameters<typeof patchListingBasics>[2] = { status }
      const msn = basicsIntField(minStayNights)
      if (msn) basicsBody.min_stay_nights = msn
      const cleaning = basicsDecimalField(cleaningFee)
      if (cleaning) basicsBody.cleaning_fee_amount = cleaning
      else if (editListingId) basicsBody.cleaning_fee_amount = '__null__'
      const deposit = basicsDecimalField(depositAmount)
      if (deposit) basicsBody.first_charge_amount = deposit
      const prepay = basicsDecimalField(
        prepaymentPercent.trim() || String(DEFAULT_LISTING_PREPAYMENT_PERCENT),
      )
      if (prepay) basicsBody.prepayment_percent = prepay
      const comm = basicsDecimalField(commissionPercent)
      if (comm) basicsBody.commission_percent = comm
      if (poolSizeLabel.trim()) basicsBody.pool_size_label = poolSizeLabel.trim()
      if (supplierPaymentNote.trim()) basicsBody.supplier_payment_note = supplierPaymentNote.trim()
      const cdn = basicsIntField(confirmDeadlineNormal)
      if (cdn) basicsBody.confirm_deadline_normal_h = cdn
      const cdh = basicsIntField(confirmDeadlineHigh)
      if (cdh) basicsBody.confirm_deadline_high_h = cdh
      const hsd = basicsHighSeasonJson(highSeasonDates)
      if (hsd) basicsBody.high_season_dates_json = hsd
      const aac = basicsDecimalField(avgAdCostPercent)
      if (aac) basicsBody.avg_ad_cost_percent = aac
      if (cancellationPolicyText.trim()) basicsBody.cancellation_policy_text = cancellationPolicyText.trim()
      if (ministryLicenseRef.trim()) basicsBody.ministry_license_ref = ministryLicenseRef.trim()
      if (externalListingRef.trim()) basicsBody.external_listing_ref = externalListingRef.trim()
      basicsBody.share_to_social = shareToSocial
      basicsBody.allow_ai_caption = allowAiCaption
      basicsBody.allow_sub_min_stay_gap_booking = allowSubMinStayGap
      await saveRequiredStep('Temel ilan bilgileri kaydı', patchListingBasics(token, lid, basicsBody, orgParam))

      // 5. İlan sahibi
      if (ownerName.trim() || ownerBio.trim() || ownerPhone.trim() || ownerEmail.trim()) {
        await saveRequiredStep(
          'İlan sahibi kaydı',
          putListingOwnerContact(
            token,
            lid,
            {
              contact_name: ownerName.trim() || undefined,
              contact_bio: ownerBio.trim() || undefined,
              contact_phone: ownerPhone.trim() || undefined,
              contact_email: ownerEmail.trim() || undefined,
            },
            orgParam,
          ),
        )
      }

      // 6. Meta alanlar
      const metaBody: Record<string, string> = {}
      if (checkInTime.trim()) metaBody.check_in_time = checkInTime.trim()
      if (checkOutTime.trim()) metaBody.check_out_time = checkOutTime.trim()
      if (bedCount.trim()) metaBody.bed_count = bedCount.trim()
      if (bathCount.trim()) metaBody.bath_count = bathCount.trim()
      if (maxGuests.trim()) metaBody.max_guests = maxGuests.trim()
      if (minAdvanceBookingDays.trim()) metaBody.min_advance_booking_days = minAdvanceBookingDays.trim()
      if (roomCount.trim()) metaBody.room_count = roomCount.trim()
      if (isVilla && propertyType.trim()) metaBody.property_type = propertyType.trim()
      if (youtubeUrl.trim()) metaBody.youtube_url = youtubeUrl.trim()
      metaBody.source_reference_url = sourceReferenceUrl.trim()
      metaBody.source_images_url = sourceImagesUrl.trim()
      metaBody.source_availability_url = sourceAvailabilityUrl.trim()
      metaBody.source_price_url = sourcePriceUrl.trim()
      if (ministryLicenseRef.trim()) metaBody.tourism_cert_no = ministryLicenseRef.trim()
      if (address.trim()) metaBody.address = address.trim()
      if (isHotel) {
        if (districtLabel.trim()) metaBody.district_label = districtLabel.trim()
        if (cityDisplay.trim()) metaBody.city = cityDisplay.trim()
        if (provinceCity.trim()) metaBody.province_city = provinceCity.trim()
      }
      if (lat.trim()) metaBody.lat = lat.trim()
      if (lng.trim()) metaBody.lng = lng.trim()
      if (shortStayMinNights.trim()) metaBody.min_short_stay_nights = shortStayMinNights.trim()
      if (shortStayFee.trim()) metaBody.short_stay_fee = shortStayFee.trim()
      if (squareMeters.trim()) metaBody.square_meters = squareMeters.trim()
      if (isVilla && ownerTcNo.trim()) metaBody.owner_tc_no = ownerTcNo.trim()
      if (isVilla && ownerBankName.trim()) metaBody.owner_bank_name = ownerBankName.trim()
      if (isVilla && ownerIban.trim()) metaBody.owner_iban = ownerIban.replace(/\s/g, '').trim()
      if (isVilla && ownerAccountType.trim()) metaBody.owner_account_type = ownerAccountType.trim()
      if (isVilla && ownerResidenceAddress.trim())
        metaBody.owner_residence_address = ownerResidenceAddress.trim()
      if (Object.keys(metaBody).length > 0) {
        const existingMeta = await getListingMeta(token, lid, orgParam)
        const nextMeta: ListingMeta = { ...existingMeta, ...metaBody }
        await saveRequiredStep('Detay alanları kaydı', putListingMeta(token, lid, nextMeta, orgParam))
      }
      // Yakındaki gezilecek yerler: «Otomatik Güncelle» Google Places + patch ile DB'ye yazıyor.
      // Kayıtta compute çağrısı kaldırıldı; yalnızca yüklü form state kalıcılaştırılır.
      // POI listesi henüz gelmediyse veya koordinat yoksa DB'deki mevcut JSON'a dokunma.
      if (nearbyPoisHydratedRef.current && lat.trim() && lng.trim()) {
        await patchListingNearbyPois(token, lid, nearbyPois).catch(() => {})
      }

      const attrPayload = Object.entries(attributeValues)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => {
          const [group_code, ...rest] = k.split('.')
          return { group_code, key: rest.join('.'), value: v }
        })
      if (attrPayload.length > 0) {
        await saveRequiredStep('Özellik alanları kaydı', putListingAttributeValues(token, lid, attrPayload, orgParam))
      }

      if (isStayRentalWizard) {
        const vert: Record<string, unknown> = {}
        if (isVilla && (pools.open_pool.enabled || pools.heated_pool.enabled || pools.children_pool.enabled)) {
          vert.pools = pools
        }
        const ef = extraFees.filter((x) => x.label.trim() && x.amount.trim())
        if (ef.length) vert.extra_fees = ef
        vert.faq = {
          hidden_template_ids: [...faqExcludedTemplateIds],
          extra_items: faqExtraRows
            .filter((r) => r.q_tr.trim() && r.a_tr.trim())
            .map((r) => ({
              id: r.id,
              question: { tr: r.q_tr.trim() },
              answer: { tr: r.a_tr.trim() },
            })),
        }
        const imgsForHeroSave =
          editListingId ? listingGalleryImages : listingImagesFromPendingKeys(pendingGalleryKeys)
        const taggedForSave = imgsForHeroSave.some((im) => imageHasMeaningfulScene(im.scene_code))
        let heroPad = heroManualStorageKeys.map((k) => k.trim())
        while (heroPad.length < 5) heroPad.push('')
        heroPad = heroPad.slice(0, 5)
        if (!taggedForSave && imgsForHeroSave.length > 0 && heroPad.every((k) => !k)) {
          heroPad = defaultHeroKeysFromSort(imgsForHeroSave)
        }
        vert[MANAGE_HERO_PREVIEW_META_KEY] = heroPad
        const metaGroup = isYacht ? 'yacht_extra' : 'holiday_home'
        await saveRequiredStep(
          isYacht ? 'Yat kiralama detayları kaydı' : 'Tatil evi detayları kaydı',
          putVerticalMeta(token, lid, metaGroup, vert, orgParam),
        )
        if (isYacht) {
          await patchVerticalYacht(lid, { theme_codes: villaThemes }).catch(() => {})
        } else {
          await patchVerticalHolidayHome(lid, { theme_codes: villaThemes }).catch(() => {})
        }
      }

      if (isVilla) {
        for (const loc of allLocales) {
          const s = seoByLocale[loc.code] ?? emptyListingSeo()
          const hasAny =
            s.title.trim() ||
            s.description.trim() ||
            s.keywords.trim() ||
            s.canonical_path.trim() ||
            s.og_image_storage_key.trim() ||
            s.robots.trim()
          if (!hasAny) continue
          await saveRequiredStep(
            'SEO kaydı',
            upsertSeoMetadata(
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
            ),
          )
        }
      }

      if (isVilla) {
        await saveRequiredStep(
          'Fiyat satırları kaydı',
          putListingPriceLineSelections(token, lid, { item_ids: [...selectedPriceLineIds] }, orgParam),
        )
      }

      // Tur2: Vitrin promosyon — instant book + mobil indirim (best-effort).
      if (instantBook || mobileDiscountPercent.trim()) {
        const perksBody: { instant_book?: boolean; mobile_discount_percent?: number } = {}
        if (instantBook) perksBody.instant_book = true
        const mdPct = Number.parseFloat(mobileDiscountPercent.trim().replace(',', '.'))
        if (Number.isFinite(mdPct) && mdPct > 0 && mdPct <= 90) {
          perksBody.mobile_discount_percent = mdPct
        }
        if (Object.keys(perksBody).length > 0) {
          await saveRequiredStep('Vitrin promosyon kaydı', patchListingPerks(token, lid, perksBody, orgParam))
        }
      }

      // Tur2: iCal — tatil evi ana formda; otelde yeni ilanda tek kayıt; düzenlemede otel beslemeleri gelişmiş panelden.
      const icalUrlTrim = (sourceAvailabilityUrl.trim() || icalImportUrl.trim())
      if (icalUrlTrim) {
        if (isStayRentalWizard) {
          if (!editListingId || !icalUrlsAtHydrateRef.current.has(icalUrlTrim)) {
            await saveRequiredStep(
              'iCal bağlantısı kaydı',
              createIcalFeed({
                listing_id: lid,
                url: icalUrlTrim,
              }),
            )
            icalUrlsAtHydrateRef.current.add(icalUrlTrim)
          }
        } else if (!editListingId) {
          await saveRequiredStep(
            'iCal bağlantısı kaydı',
            createIcalFeed({
              listing_id: lid,
              url: icalUrlTrim,
            }),
          )
        }
      }

      // Otel detayları — yıldız + entegrasyon referansları
      if (categoryCode === 'hotel') {
        if (starRating.trim() || hotelEtRef.trim() || hotelTcRef.trim()) {
          await saveRequiredStep(
            'Otel detayları kaydı',
            patchManageHotelDetails(
              token,
              lid,
              {
                star_rating: starRating.trim() || undefined,
                etstur_property_ref: hotelEtRef.trim() || undefined,
                tatilcom_property_ref: hotelTcRef.trim() || undefined,
              },
              orgParam,
            ),
          )
        }
      }

      const orgIdForImages = needOrg && orgId.trim() ? orgId.trim() : undefined
      if (pendingGalleryKeys.length > 0) {
        let newImgIdx = 0
        const existingHydrated = galleryKeysAtHydrateRef.current
        for (let i = 0; i < pendingGalleryKeys.length; i++) {
          const key = pendingGalleryKeys[i]
          if (!key || existingHydrated.has(key)) continue
          await saveRequiredStep(
            'Galeri görseli kaydı',
            addListingImage(
              token,
              lid,
              {
                storage_key: key,
                original_mime: 'image/avif',
                sort_order: existingHydrated.size + newImgIdx,
              },
              orgIdForImages,
            ),
          )
          newImgIdx++
        }
      }

      if (
        lid &&
        (isStayRentalWizard || categoryCode === 'hotel')
      ) {
        void getListingIcalExportToken(token, lid, orgParam)
          .then((r) => setIcalExportUrl(r.url))
          .catch(() => {})
      }

      const manageUrl = vitrinPath(
        `/manage/catalog/${encodeURIComponent(categoryCode)}/listings/${encodeURIComponent(lid)}`,
      )
      const publicPath = managePublicDetailPathForVertical(categoryCode as CatalogListingVerticalCode)
      const publicStayUrl = vitrinPath(`${publicPath}/${encodeURIComponent(slugifyListingSlug(slug.trim()))}`)
      const intent = submitIntentRef.current
      submitIntentRef.current = 'save'
      if (intent === 'save-show') {
        window.open(publicStayUrl, '_blank', 'noopener,noreferrer')
      }
      if (intent === 'save-next') {
        goToStep(currentStep + 1)
        return
      }
      if (!editListingId) {
        router.push(`${manageUrl}?step=${currentStep}`)
      }
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : t('catalog.create_error'))
    } finally {
      setBusy(false)
    }
  }

  async function onRotateIcalExport() {
    if (!editListingId) return
    const token = getStoredAuthToken()
    if (!token) return
    if (
      !confirm(
        'Bu işlem eski .ics bağlantısını geçersiz kılar. Airbnb / Booking’de takvim adresini yeni URL ile güncellemeniz gerekir. Devam edilsin mi?',
      )
    ) {
      return
    }
    const orgParam = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    setIcalExportRotateBusy(true)
    try {
      const r = await rotateListingIcalExportToken(token, editListingId, orgParam)
      setIcalExportUrl(r.url)
    } catch {
      setErr('iCal dışa aktarım bağlantısı yenilenemedi.')
    } finally {
      setIcalExportRotateBusy(false)
    }
  }

  async function onCopyIcalExport() {
    if (!icalExportUrl) return
    try {
      await navigator.clipboard.writeText(icalExportUrl)
    } catch {
      /* sessiz */
    }
  }

  const listHref = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}/listings`)

  const listingTranslationsHref = editListingId
    ? vitrinPath(
        `/manage/catalog/${encodeURIComponent(categoryCode)}/listings/${encodeURIComponent(editListingId)}/translations`,
      )
    : ''
  const inputCls =
    'block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 disabled:opacity-50'
  const selectCls = inputCls

  /** Tatil evi / villa: Booking Core «Alan» akışına uygun blok sırası (içerik → sözleşme → mülk → giriş → fiyat → havuz → konum → iletişim) */

  const contractSection =
    (contracts.length > 0 || contractsErr) && (
      <Section title="İlan Sözleşmesi" subtitle="Kurallar ve checkout’ta gösterilir">
        {contractsErr ? (
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
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
            <HintText>Yayın ve checkout öncesi her ilana sözleşme bağlanmalıdır.</HintText>
          </Field>
        )}
      </Section>
    )

  const locationSection = (
    <Section title="Konum" subtitle="Adres, harita ve vitrinde görünen bölge bilgisi">
      {isHotel ? (
        <div className="mb-4 space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Vitrin konumu (otel adı altında)
          </p>
          <p className="text-xs text-neutral-500">Sıra: bölge (semt), ilçe, il — örn. Galata, Beyoğlu, İstanbul</p>
          <Grid3>
            <Field className="block">
              <Label>Semt / bölge</Label>
              <Input
                className="mt-1"
                value={districtLabel}
                onChange={(e) => setDistrictLabel(e.target.value)}
                placeholder="Galata"
              />
            </Field>
            <Field className="block">
              <Label>İlçe</Label>
              <Input
                className="mt-1"
                value={cityDisplay}
                onChange={(e) => setCityDisplay(e.target.value)}
                placeholder="Beyoğlu"
              />
            </Field>
            <Field className="block">
              <Label>İl</Label>
              <Input
                className="mt-1"
                value={provinceCity}
                onChange={(e) => setProvinceCity(e.target.value)}
                placeholder="İstanbul"
              />
            </Field>
          </Grid3>
        </div>
      ) : null}
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
      {editListingId ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          {/* Başlık */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433.57.57 0 00.281.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Yakındaki Gezilecek Yerler</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Önyüzde ilan sayfasında gösterilir · sürükleyerek sıralayın</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshNearbyPoisFromServer()}
              disabled={nearbyPoisBusy || !lat.trim() || !lng.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 ${nearbyPoisBusy ? 'animate-spin' : ''}`}>
                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
              </svg>
              {nearbyPoisBusy ? 'Güncelleniyor…' : 'Otomatik Güncelle'}
            </button>
          </div>

          {/* Uyarılar */}
          {!lat.trim() || !lng.trim() ? (
            <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
                <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              Mekan hesaplamak için enlem ve boylam koordinatları girilmeli.
            </div>
          ) : null}
          {nearbyPoisMsg ? (
            <div
              role="status"
              className={`mx-4 mt-3 rounded-xl px-3 py-2 text-xs ${
                nearbyPoisMsg.ok
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
              }`}
            >
              {nearbyPoisMsg.text}
            </div>
          ) : null}
          {nearbyPoisLoading ? (
            <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 animate-spin">
                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
              </svg>
              Mekanlar yükleniyor…
            </div>
          ) : null}

          {/* POI listesi */}
          {nearbyPois.length > 0 ? (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {nearbyPois.map((poi, i) => (
                <div
                  key={poi.place_id ?? i}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                >
                  {/* Numara */}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {i + 1}
                  </span>
                  {/* Görsel */}
                  {poi.image ? (
                    <img src={poi.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-neutral-400">
                        <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433.57.57 0 00.281.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {/* Başlık + özet */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{poi.title}</p>
                    {poi.summary ? (
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{poi.summary}</p>
                    ) : null}
                  </div>
                  {/* Aksiyon butonları — hover'da göster */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => movePoiUp(i)}
                      disabled={i === 0}
                      title="Yukarı taşı"
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-25 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => movePoiDown(i)}
                      disabled={i === nearbyPois.length - 1}
                      title="Aşağı taşı"
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-25 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06L7.25 11.44V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
                    <button
                      type="button"
                      onClick={() => deletePoi(i)}
                      title="Sil"
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !nearbyPoisLoading && lat.trim() && lng.trim() ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-neutral-400">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433.57.57 0 00.281.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Henüz mekan yok</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                &ldquo;Otomatik Güncelle&rdquo; ile Google Places&apos;ten çekin veya aşağıdan manuel ekleyin.
              </p>
            </div>
          ) : null}

          {/* Manuel mekan ekleme */}
          <details className="group border-t border-neutral-100 dark:border-neutral-800">
            <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-xs font-medium text-primary-600 transition hover:bg-primary-50/50 dark:text-primary-400 dark:hover:bg-primary-950/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
              Manuel Mekan Ekle
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="ml-auto h-3.5 w-3.5 rotate-0 transition-transform group-open:rotate-180">
                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="grid gap-2.5 px-4 pb-4 pt-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Mekan adı <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newPoiName}
                  onChange={(e) => setNewPoiName(e.target.value)}
                  placeholder="ör. Kayaköy Antik Kenti"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Kısa açıklama</label>
                <input
                  type="text"
                  value={newPoiNote}
                  onChange={(e) => setNewPoiNote(e.target.value)}
                  placeholder="ör. Tarihi Rum köyü, 3 km"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Google Maps linki</label>
                <input
                  type="text"
                  value={newPoiLink}
                  onChange={(e) => setNewPoiLink(e.target.value)}
                  placeholder="https://maps.google.com/…"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Görsel URL</label>
                <input
                  type="text"
                  value={newPoiImage}
                  onChange={(e) => setNewPoiImage(e.target.value)}
                  placeholder="https://…/resim.jpg"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <button
                  type="button"
                  onClick={addManualPoi}
                  disabled={!newPoiName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                  Listeye Ekle
                </button>
              </div>
            </div>
          </details>
        </div>
      ) : (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Yakın mekanlar, ilan ilk kez kaydedildikten sonra otomatik hesaplanıp burada gösterilir.
        </p>
      )}
    </Section>
  )

  const attributeSection = attributeGroups.length > 0 ? (
    <Section
      title="Öznitelikler"
      subtitle="Kategoriye ait özellikleri ilan oluştururken işaretleyin."
    >
      <div className="space-y-5">
        {attributeGroups.map((g) => {
          const defs = attributeDefsByGroup[g.id] ?? []
          if (defs.length === 0) return null
          return (
            <div key={g.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{g.name}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {defs.map((d) => {
                  const k = `${g.code}.${d.code}`
                  const v = attributeValues[k] ?? ''
                  const options = parseOptionsJsonSafe(d.options_json)
                  if (d.field_type === 'boolean') {
                    return (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
                      >
                        <input
                          type="checkbox"
                          checked={v === 'true'}
                          onChange={(e) => setAttributeValue(g.code, d.code, e.target.checked ? 'true' : '')}
                          className="h-4 w-4 accent-primary-600"
                        />
                        <span>{d.label}</span>
                      </label>
                    )
                  }
                  if (d.field_type === 'select') {
                    return (
                      <Field key={d.id} className="block">
                        <Label>{d.label}</Label>
                        <select
                          className={`mt-1 ${selectCls}`}
                          value={v}
                          onChange={(e) => setAttributeValue(g.code, d.code, e.target.value)}
                        >
                          <option value="">— Seçin —</option>
                          {options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )
                  }
                  return (
                    <Field key={d.id} className="block">
                      <Label>{d.label}</Label>
                      <Input
                        type={d.field_type === 'number' ? 'number' : 'text'}
                        className="mt-1"
                        value={v}
                        onChange={(e) => setAttributeValue(g.code, d.code, e.target.value)}
                      />
                    </Field>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  ) : null

  const hotelProfileSection =
    categoryCode === 'hotel' ? (
      <Section
        title="Otel Profili"
        subtitle="Referans otel sitelerindeki tip, tema, konaklama konsepti ve yıldız bilgilerini bu ilanla eşleştirin."
      >
        <div className="mb-5 rounded-xl border border-primary-200/80 bg-primary-50/50 p-4 text-xs text-primary-900 dark:border-primary-900/40 dark:bg-primary-950/25 dark:text-primary-100">
          <p className="font-medium">Vitrin eşlemesi</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-primary-900/90 dark:text-primary-100/90">
            <li>1–2. adım → başlık, konum (semt/ilçe/il), bakanlık belgesi</li>
            <li>Otel profili → yıldız, otel tipi, tema, konaklama tipi</li>
            <li>Kampanya / etkinlik → otel adı altı banner alanı</li>
            <li>3. adım → oda tipleri, vitrin metinleri, kampanya ve etkinlik</li>
            <li>5. adım takvim → oda bazlı müsaitlik ve fiyat</li>
            <li>Özellikler → tesis olanakları (akordeon)</li>
            <li>Vitrin metinleri → genel şartlar, ek tesis bölümleri, özel SSS</li>
            <li>6. adım → yemek planları (pansiyon seçenekleri)</li>
          </ul>
        </div>
        <HotelFacetSelectPanels
          locale={locale}
          selectCls={selectCls}
          hotelTypeCode={attributeValues['hotel.hotel_type_code'] ?? ''}
          setHotelTypeCode={(v) => setAttributeValue('hotel', 'hotel_type_code', v)}
          hotelThemeCode={attributeValues['hotel.theme_code'] ?? ''}
          setHotelThemeCode={(v) => setAttributeValue('hotel', 'theme_code', v)}
          hotelAccommodation={attributeValues['hotel.accommodation_code'] ?? ''}
          setHotelAccommodation={(v) => setAttributeValue('hotel', 'accommodation_code', v)}
          hotelStar={starRating}
          setHotelStar={setStarRating}
        />
        {editListingId ? (
          <Grid2 className="mt-5">
            <Field className="block">
              <Label>Etstur tesis referansı</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={hotelEtRef}
                onChange={(e) => setHotelEtRef(e.target.value)}
              />
            </Field>
            <Field className="block">
              <Label>Tatil.com tesis referansı</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={hotelTcRef}
                onChange={(e) => setHotelTcRef(e.target.value)}
              />
            </Field>
          </Grid2>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ['Tesis Özellikleri', 'Wi‑Fi, spa, otopark — 2. adımdaki özniteliklerden işaretleyin.'],
            ['Kampanya & Etkinlik', editListingId ? 'Aşağıda ilana özel kampanya ve etkinlik bannerlarını yönetin.' : 'İlan kaydından sonra kampanya ve etkinlik alanları açılır.'],
            ['Odalar', editListingId ? 'Oda tipleri ve müsaitlik takvimi (4. adım) vitrin rezervasyonunu besler.' : 'Kayıttan sonra oda tipleri ve adet alanları açılır.'],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{text}</p>
            </div>
          ))}
        </div>
      </Section>
    ) : null

  const formId = 'catalog-new-listing-form'

  const saveLocked = busy || (Boolean(editListingId) && !editListingReady)

  return (
    <div className="bg-neutral-50 pb-20 dark:bg-neutral-950 sm:pb-24">
      {editListingId && !editListingReady ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-neutral-950/85">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--manage-primary)]" />
        </div>
      ) : null}
      <>
          <div className="sticky top-0 z-20 border-b border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="space-y-3 px-4 py-3 sm:px-6">
              {/* Üst satır: geri + başlık (dillerle aynı satırda sıkışmasın) */}
              <div className="flex items-start gap-3">
                <Link
                  href={listHref}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                    {listingByLocale[primaryLocale]?.title?.trim() ||
                      `Yeni ilan — ${categoryLabelTr(categoryCode)}`}
                  </p>
                  {editListingId && (
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                      {headerSlugEdit ? (
                        <>
                          <Input
                            value={headerSlugDraft}
                            onChange={(e) => {
                              setHeaderSlugErr(null)
                              setHeaderSlugDraft(slugifyListingSlug(e.target.value))
                            }}
                            className="h-8 min-w-[10rem] flex-1 font-mono text-xs"
                            disabled={headerSlugBusy || saveLocked}
                            aria-label="Adres kodu"
                            placeholder="adres-kodu"
                          />
                          <button
                            type="button"
                            disabled={headerSlugBusy || saveLocked}
                            onClick={() => void persistHeaderSlug()}
                            title="Kaydet"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
                          >
                            {headerSlugBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={headerSlugBusy}
                            onClick={() => {
                              setHeaderSlugEdit(false)
                              setHeaderSlugErr(null)
                              setHeaderSlugDraft(slug.trim())
                            }}
                            title="İptal"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={saveLocked || headerSlugBusy}
                          onClick={() => {
                            setHeaderSlugDraft(slug.trim() ? slug.trim() : '')
                            setHeaderSlugErr(null)
                            setHeaderSlugEdit(true)
                          }}
                          title="Adres kodunu düzenle"
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Adres kodu
                        </button>
                      )}
                      {headerSlugErr ? (
                        <p className="text-xs text-red-600 dark:text-red-400">{headerSlugErr}</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Alt satır: dil seçimi + AI / bağlantılar (geri + gap hizası: w-8 + gap-3 = pl-11) */}
              <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800 sm:pl-11">
                <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
                  {allLocales.map((loc) => (
                    <button
                      key={loc.code}
                      type="button"
                      onClick={() => setActiveLang(loc.code)}
                      className={clsx(
                        'flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        activeLang === loc.code
                          ? 'bg-white text-[color:var(--manage-primary)] shadow-sm dark:bg-neutral-900'
                          : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                      )}
                    >
                      <span>{loc.flag}</span>
                      <span className="hidden sm:inline">{loc.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <ManageAiTranslateToolbar
                    className="min-w-0 flex-1 basis-[min(100%,16rem)] sm:flex-initial [&_select]:max-w-none"
                    locales={translateTargets}
                    targetLocale={aiTargetLocale}
                    onTargetLocaleChange={setAiTargetFromToolbar}
                    onTranslate={() => void handleAiTranslateTrToTarget()}
                    onTranslateAll={() => void handleAiTranslateAllTargets()}
                    translating={aiTranslating}
                  />
                  {listingTranslationsHref ? (
                    <Link
                      href={listingTranslationsHref}
                      prefetch={false}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-primary-300 dark:hover:bg-neutral-800"
                    >
                      Çeviriler
                    </Link>
                  ) : null}
                </div>
              </div>

              {/* Wizard adım navigasyonu */}
              <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800 sm:pl-11">
                <WizardStepNav
                  steps={WIZARD_STEPS}
                  currentStep={currentStep}
                  canJumpFreely={Boolean(editListingId)}
                  onStepClick={goToStep}
                />
              </div>
            </div>
          </div>
      </>

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
                  {editListingId ? 'İlan bilgileri' : 'Yeni ilan ekle'}
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
                    <p className="mt-1 text-xs text-neutral-400">Platform yöneticisi: hedef kurumun UUID bilgisini girin.</p>
                  )}
                </Field>
              </Section>
            )}

            {/* ── ADIM 0: Temel Bilgi ── */}
            {currentStep === 0 && !isVilla && contractSection}

            {/* ── ADIM 1: Konum ── */}
            {currentStep === 1 && !isVilla && locationSection}

            {/* ── ADIM 0 devam: İlan İçeriği ── */}
            {currentStep === 0 && (
            <>
            <Section title="Kaynak ve otomatik kontrol">
              <p className="mb-4 text-sm text-neutral-500">
                İlanın asıl sayfasını tanımlayın. Sistem başlık, açıklama, fiyat ve görsel bilgisini okuyup forma aktarır;
                kayıt sonrasında bu bağlantılar fiyat ve müsaitlik kontrollerinde kullanılır.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="block md:col-span-2">
                  <Label>İlan referans bağlantısı</Label>
                  <div className="flex gap-2">
                    <Input value={sourceReferenceUrl} onChange={(e) => setSourceReferenceUrl(e.target.value)} placeholder="https://..." />
                    <button type="button" disabled={sourceAnalyzing} onClick={() => void analyzeReferenceUrl()} className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
                      {sourceAnalyzing ? 'Okunuyor…' : 'Bilgileri getir'}
                    </button>
                  </div>
                </Field>
                <Field className="block">
                  <Label>Görsel bağlantısı (Google Drive veya doğrudan)</Label>
                  <div className="flex gap-2">
                    <Input value={sourceImagesUrl} onChange={(e) => setSourceImagesUrl(e.target.value)} placeholder="Herkese açık Drive dosyası ya da görsel URL'si" />
                    <button type="button" onClick={addSourceImage} className="shrink-0 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold dark:border-neutral-700">Galeriye ekle</button>
                  </div>
                </Field>
                <Field className="block">
                  <Label>Fiyat kontrol bağlantısı</Label>
                  <Input value={sourcePriceUrl} onChange={(e) => setSourcePriceUrl(e.target.value)} placeholder="Boşsa referans bağlantısı kullanılır" />
                </Field>
                <Field className="block md:col-span-2">
                  <Label>Müsaitlik bağlantısı (iCal / ICS veya kaynak sayfa)</Label>
                  <Input value={sourceAvailabilityUrl} onChange={(e) => setSourceAvailabilityUrl(e.target.value)} placeholder="https://.../calendar.ics" />
                </Field>
              </div>
              {sourceAnalyzeMessage ? <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{sourceAnalyzeMessage}</p> : null}
            </Section>
            {/* İlan İçeriği */}
            <Section
              title={
                isVilla
                  ? `İlan İçeriği — ${allLocales.find((l) => l.code === activeLang)?.flag ?? ''} ${allLocales.find((l) => l.code === activeLang)?.label ?? activeLang}`
                  : 'İlan İçeriği'
              }
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
                  value={isVilla ? (listingByLocale[activeLang]?.title ?? '') : title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="ör. Bodrumda Deniz Manzaralı Villa"
                  className="mt-1"
                  required={!isVilla}
                />
                {isVilla ? (
                  <HintText>
                    Türkçe başlık zorunludur; diğer dilleri AI Çevir ile doldurabilirsiniz. Magic Text mevcut dilde
                    iyileştirir.
                  </HintText>
                ) : (
                  <HintText>Magic Text, arayüz dilinizde başlığı SEO ve yazıma göre iyileştirir.</HintText>
                )}
              </Field>

              {!(isVilla && editListingId) ? (
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
                    disabled={Boolean(editListingId)}
                  />
                  <HintText>
                    {editListingId
                      ? 'Yayın adresi (slug) güvenlik nedeniyle buradan değiştirilemez.'
                      : 'Yalnız küçük harf, tire ve rakam. Başlıktan otomatik üretilir.'}
                  </HintText>
                </Field>
              ) : null}

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
                  value={isVilla ? (listingByLocale[activeLang]?.description ?? '') : description}
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

            {isVilla ? (
              <Section
                title="Sıkça sorulan sorular (SSS)"
                subtitle="Katalogdaki genel şablondan gelir; bu ilana uymayanları kapatın veya soru ekleyin."
              >
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Genel şablonu{' '}
                  <Link
                    href={vitrinPath('/manage/catalog/holiday_home/faq')}
                    className="font-medium text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
                  >
                    Katalog → Tatil Evi → SSS
                  </Link>{' '}
                  üzerinden düzenleyebilirsiniz.
                </p>
                {faqTemplateRows.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">
                    Henüz genel SSS tanımlı değil; yukarıdaki bağlantıdan ekleyebilirsiniz.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {faqTemplateRows.map((row) => (
                      <li
                        key={row.id}
                        className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900/40"
                      >
                        <label className="flex shrink-0 cursor-pointer items-start gap-2 pt-0.5">
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-neutral-300"
                            checked={!faqExcludedTemplateIds.has(row.id)}
                            onChange={() => toggleFaqTemplateIncluded(row.id)}
                            disabled={saveLocked}
                          />
                          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                            Göster
                          </span>
                        </label>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{row.q_tr}</p>
                          <p className="mt-1 whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">
                            {row.a_tr}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    Bu ilana özel sorular
                  </p>
                  <div className="mt-3 space-y-4">
                    {faqExtraRows.map((row) => (
                      <div key={row.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                        <div className="mb-2 flex justify-end">
                          <button
                            type="button"
                            disabled={saveLocked}
                            onClick={() => removeFaqExtraRow(row.id)}
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            Kaldır
                          </button>
                        </div>
                        <Field className="block">
                          <Label>Soru (TR)</Label>
                          <Input
                            className="mt-1"
                            value={row.q_tr}
                            onChange={(e) => patchFaqExtraRow(row.id, { q_tr: e.target.value })}
                            disabled={saveLocked}
                          />
                        </Field>
                        <Field className="mt-2 block">
                          <Label>Yanıt (TR)</Label>
                          <Textarea
                            className="mt-1 min-h-[72px]"
                            value={row.a_tr}
                            onChange={(e) => patchFaqExtraRow(row.id, { a_tr: e.target.value })}
                            disabled={saveLocked}
                          />
                        </Field>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={saveLocked}
                    onClick={addFaqExtraRow}
                    className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    + Soru ekle
                  </button>
                </div>
              </Section>
            ) : null}
            {/* Tatil evi: ilan tipi / tema adım 2’de (propertyType, villaThemes); buradaki öznitelik grupları yinelenirdi */}
            {!isVilla && attributeSection}
            </>
            )}

            {/* ── ADIM 3: Galeri ── */}
            {currentStep === 3 && (
            <Section
              title="Galeri"
              subtitle={
                isStayRentalEdit
                  ? 'Özet görünüm: sahne etiketli görseller varsa sıra otomatik belirlenir; etiket yoksa kutucuklara tıklayarak seçim yapılır (Kaydet ile saklanır). Tam yükleme ve sıralama galeri sayfasında.'
                  : isStayRentalWizard
                    ? 'Yeni ilanda görseller önce depoya yüklenir; kayıttan sonra düzenleme için galeri sayfasına gidilir. Özet kutuları etiketsizken tıklanarak seçilir.'
                    : 'Görseller önce depoya yüklenir; ilanı kaydedince ilana bağlanır.'
              }
            >
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Dosya yolu:{' '}
                <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
                  /uploads/listings/{gallerySubPath}/
                </code>
                — slug boşsa <code className="font-mono text-xs">yeni-ilan</code> kullanılır; mümkünse önce slug&apos;ı netleştirin.
              </p>

              <div className="mt-4 max-w-4xl">
                <ManageListingGalleryHeroPreview
                  urls={isStayRentalWizard ? heroPreviewFiveKeys : pendingGalleryKeys}
                  totalCount={isStayRentalWizard ? galleryTotalCount : pendingGalleryKeys.length}
                  manageHref={galleryManageHref}
                  manageLabel="Galeriyi düzenle"
                  emptyHint={
                    isStayRentalEdit
                      ? 'Henüz görsel yok — galeri sayfasından ekleyin.'
                      : 'Henüz görsel yok — aşağıdan yükleyin.'
                  }
                  interactiveSlots={
                    isStayRentalWizard &&
                    !galleryHasSceneTags &&
                    galleryImagesForHero.length > 0
                  }
                  onSlotClick={
                    isStayRentalWizard &&
                    !galleryHasSceneTags &&
                    galleryImagesForHero.length > 0
                      ? (i) => setHeroPickerSlot(i)
                      : undefined
                  }
                  slotHints={HERO_SLOT_LABELS}
                  footerHint={
                    isStayRentalWizard ? (
                      <>
                        <p>
                          {galleryHasSceneTags ? (
                            <>
                              Sahne etiketleri vitrin özetine göre kullanılır (deniz manzarası, havuz, yaşam
                              alanı, yatak, banyo). Deniz manzarası yoksa ilk iki kutu havuz görselleriyle
                              doldurulabilir.
                            </>
                          ) : (
                            <>
                              Sahne etiketi atanmamış görseller için kutucuklara tıklayıp kapak sırasını seçin.
                              Kayıtta bu sıra{' '}
                              {isYacht ? 'yat ilanı ek verisinde' : 'tatil evi ek verisinde'} saklanır.
                            </>
                          )}
                        </p>
                        <p className="mt-1 text-neutral-500 dark:text-neutral-500">
                          Toplu sahne için{' '}
                          <strong className="font-medium text-neutral-600 dark:text-neutral-400">
                            Galeri
                          </strong>{' '}
                          sayfasında &quot;Etiketsizlere AI öner&quot; veya kart üzerindeki yıldız ikonunu
                          kullanın (sunucuda{' '}
                          <code className="font-mono text-[11px]">DEEPSEEK_API_KEY</code>
                          ; yoksa <code className="font-mono text-[11px]">OPENAI_API_KEY</code>
                          ).
                        </p>
                        {galleryTotalCount > 5 ? (
                          <p className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                            Önizlemede ilk 5 görsel gösteriliyor · toplam {galleryTotalCount} görsel
                          </p>
                        ) : null}
                      </>
                    ) : undefined
                  }
                />
              </div>

              {isStayRentalWizard ? (
                <HeroSlotPickerModal
                  open={heroPickerSlot !== null}
                  title={
                    heroPickerSlot !== null ? `${HERO_SLOT_LABELS[heroPickerSlot]} — görsel seç` : ''
                  }
                  images={galleryImagesForHero}
                  selectedKey={
                    heroPickerSlot !== null ? heroManualStorageKeys[heroPickerSlot]?.trim() : undefined
                  }
                  onPick={(key) => {
                    if (heroPickerSlot === null) return
                    const idx = heroPickerSlot
                    setHeroManualStorageKeys((prev) => {
                      const next = [...prev]
                      while (next.length < 5) next.push('')
                      next[idx] = key
                      return next
                    })
                  }}
                  onClose={() => setHeroPickerSlot(null)}
                />
              ) : null}

              {!isStayRentalEdit && pendingGalleryKeys.length > 5 ? (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Aşağıda yer kaplamadan küçük özet ({pendingGalleryKeys.length} görsel). Çıkarmak için × kullanın.
                </p>
              ) : null}

              {!isStayRentalEdit && pendingGalleryKeys.length > 0 ? (
                <div className="mt-3 flex max-w-4xl gap-2 overflow-x-auto pb-1 pt-1">
                  {pendingGalleryKeys.map((im, idx) => (
                    <div
                      key={`${im}-${idx}`}
                      className="relative h-14 w-[5.25rem] shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      <img
                        src={im.startsWith('http') || im.startsWith('/') ? im : `/${im}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute end-0 top-0 rounded-bl-md bg-red-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white hover:bg-red-700 disabled:opacity-50"
                        onClick={() => removePendingGallery(idx)}
                        disabled={saveLocked}
                        title="Listeden çıkar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {!isStayRentalEdit ? (
                <Field className="mt-6">
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
              ) : null}
            </Section>
            )}

            {/* ── ADIM 2: Özellikler ── */}
            {currentStep === 2 && (
            <>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field className="block">
                      <Label>İlan tipi</Label>
                      <select
                        className={`mt-1 ${selectCls}`}
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                      >
                        <option value="">— Seçin —</option>
                        {propertyTypeSelectRows.map((row) => (
                          <option key={row.slug} value={row.slug}>
                            {holidayPropertyLabelForLocale(row, locale)}
                          </option>
                        ))}
                      </select>
                      <HintText>Listelerde alt kategori yerine bu tip satırı gösterilir.</HintText>
                      <HintText>
                        Tip listesini düzenlemek için{' '}
                        <Link
                          href={vitrinPath('/manage/catalog/holiday_home/property-types')}
                          className="font-medium text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
                        >
                          Katalog → Tatil Evi → Tatil evi tipi
                        </Link>{' '}
                        sayfasını kullanın.
                      </HintText>
                    </Field>
                    <Field className="block">
                      <Label>Kategori sözleşmesi</Label>
                      <select
                        className={`mt-1 ${selectCls}`}
                        value={contractId}
                        onChange={(e) => setContractId(e.target.value)}
                        required={contracts.length > 0}
                      >
                        <option value="">— Seçin —</option>
                        {contracts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                      <HintText>Bu ilan için uygulanacak sözleşme şablonu.</HintText>
                      {contractsErr && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          Sözleşme listesi yüklenemedi: {contractsErr}
                        </p>
                      )}
                    </Field>
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
                    <Field className="block">
                      <Label>Alan (m²)</Label>
                      <Input
                        type="number"
                        min="0"
                        className="mt-1"
                        value={squareMeters}
                        onChange={(e) => setSquareMeters(e.target.value)}
                        placeholder="ör: 180"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

            {hotelProfileSection}

            {isTour ? (
              <Section
                title="Tur Programı ve Paket Kapsamı"
                subtitle="Gün gün program, ulaşım türü, dahil/hariç hizmetler ve vize/rehber bilgileri kayıt sonrası Kategori Özellikleri sekmesinden yönetilir."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['Program', 'Her gün için başlık ve açıklama girerek vitrin timeline bölümünü besleyin.'],
                    ['Dahil / Hariç', 'Uçak, transfer, yemek, ekstra tur ve sigorta kapsamını iki listede belirtin.'],
                    ['Tarih & Fiyat', 'Kalkış dönemlerini takvim ve fiyat sekmelerinden tanımlayın.'],
                  ].map(([title, text]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/40"
                    >
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{text}</p>
                    </div>
                  ))}
                </div>
                {editListingId ? (
                  <Link
                    href={vitrinPath(`/manage/catalog/tour/listings/${encodeURIComponent(editListingId)}?tab=vertical`)}
                    className="mt-4 inline-flex rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Kategori Özellikleri sekmesine git
                  </Link>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-600 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
                    Önce ilanı kaydedin; ardından açılan düzenleme ekranında tur programını ve paket kapsamını ekleyebilirsiniz.
                  </p>
                )}
              </Section>
            ) : null}

            {isVilla && villaThemeCatalog.length > 0 && (
              <Section title="Temalar" subtitle="İlanı arama filtrelerinde öne çıkaracak özellikleri işaretleyin.">
                <div className="flex flex-wrap gap-3">
                  {villaThemeCatalog.map(({ code, label }) => (
                    <label key={code} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900">
                      <input type="checkbox" checked={villaThemes.includes(code)}
                        onChange={() => setVillaThemes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])}
                        className="h-4 w-4 accent-primary-600" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </Section>
            )}

            {isVilla ? (
              <Section
                title="Yatak odaları"
                subtitle="Oda adı, kat ve yatak düzeni — vitrin detayında listelenir."
              >
                {editListingId ? (
                  <HolidayHomeBedroomsEditor listingId={editListingId} />
                ) : (
                  <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-400">
                    İlanı kaydettikten sonra bu adımda yatak odası satırlarını ekleyebilirsiniz. Önce «Kaydet» ile
                    ilanı oluşturun; kayıt sonrası aynı sihirbazda bu bölüm açılır.
                  </p>
                )}
              </Section>
            ) : null}

            {isHotel ? (
              <Section
                title="Oda tipleri"
                subtitle="Her oda tipi için ad, kapasite, pansiyon, fotoğraf ve özellikleri girin."
              >
                {editListingId ? (
                  <HotelRoomsEditor
                    listingId={editListingId}
                    organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-400">
                    İlanı kaydettikten sonra bu adımda oda tiplerini ekleyebilirsiniz. Önce «Kaydet» ile ilanı
                    oluşturun; kayıt sonrası aynı sihirbazda oda satırları ve adet alanları açılır.
                  </p>
                )}
              </Section>
            ) : null}

            {isHotel && editListingId ? (
              <>
                <Section
                  title="Vitrin metinleri"
                  subtitle="Genel şartlar, ek tesis bölümleri ve özel SSS — otel detay sayfasında gösterilir."
                >
                  <HotelVitrinContentEditor
                    listingId={editListingId}
                    organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                  />
                </Section>
                <Section
                  title="Otel'de geçerli kampanyalar"
                  subtitle="Vitrinde otel adının altında yalnızca bu ilana özel kampanya kartları."
                >
                  <HotelPromotionsEditor
                    listingId={editListingId}
                    organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                  />
                </Section>
                <Section
                  title="Otel etkinlikleri"
                  subtitle="Kampanyaların altında banner olarak gösterilir; konaklama tarihine göre ek ücret uygulanır."
                >
                  <HotelActivitiesEditor
                    listingId={editListingId}
                    organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                    locale={locale}
                  />
                </Section>
              </>
            ) : null}

            {STAY_ACCOMMODATION_RULE_CATS.has(categoryCode) && accRules.length > 0 && (
              <Section
                title={isVilla ? 'Ev Kuralları' : 'Konaklama Kuralları'}
                subtitle={
                  isVilla
                    ? 'Havuz saatleri, evcil hayvan politikası ve diğer konaklama kurallarını seçin.'
                    : 'Evcil hayvan, çocuk, konsept ve tesis kullanım kurallarını misafire açık şekilde seçin.'
                }
              >
                <div className="flex flex-wrap gap-3">
                  {accRules.map((r) => {
                    const raw = attributeValues['catalog.accommodation_rule_ids'] ?? '[]'
                    let ids: string[] = []
                    try { ids = JSON.parse(raw) as string[] } catch { ids = [] }
                    const checked = ids.includes(r.id)
                    const label = r.labels[locale] ?? r.labels.tr ?? r.labels.en ?? Object.values(r.labels)[0] ?? r.id
                    return (
                      <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900">
                        <input type="checkbox" checked={checked}
                          onChange={() => {
                            const cur: string[] = (() => { try { return JSON.parse(attributeValues['catalog.accommodation_rule_ids'] ?? '[]') as string[] } catch { return [] } })()
                            const next = checked ? cur.filter((x) => x !== r.id) : [...cur, r.id]
                            setAttributeValues((prev) => ({ ...prev, 'catalog.accommodation_rule_ids': JSON.stringify(next) }))
                          }}
                          className="h-4 w-4 accent-primary-600" />
                        <span>{label}{' '}
                          <span className="text-xs text-neutral-400">({r.severity === 'warn' ? 'uyarı' : 'bilgi'})</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Giriş / Çıkış Saati (villa) — step 2 içinde */}
            {isVilla && (
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
              </>
            )}

            </>
            )}
            {/* ── ADIM 4: Takvim, Dönemsel Fiyat & iCal ── */}
            {currentStep === 4 && (
              <Section
                title="Takvim & Rezervasyon"
                subtitle={editListingId ? 'Müsaitlik, dönemsel fiyatlar ve iCal takvim senkronizasyonu.' : 'İlan kaydedildikten sonra bu bölümdeki tüm ayarlar aktif olur.'}
              >
                {!editListingId ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-neutral-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                      Önce ilanı kaydedin; ardından bu adımda müsaitlik (opsiyon / fırsat günleri), dönemsel fiyat
                      (liste fiyatı compare_at), iCal ve harici rezervasyon defteri kullanılabilir. Yatak odaları ve
                      referans kodu için 2. ve 6. adımlara da dönebilirsiniz.
                    </p>
                    <button type="button" onClick={() => goToStep(6)} className="mt-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                      Fiyat adımına geç →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Sub-tab navigation */}
                    <div className="mb-5 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
                      {([
                        { id: 'calendar' as const, label: 'Müsaitlik Takvimi' },
                        { id: 'seasonal' as const, label: 'Dönemsel Fiyat' },
                        { id: 'ical' as const, label: 'iCal Senkronizasyon' },
                        { id: 'external' as const, label: 'Harici Rezervasyon' },
                      ] as const).map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setCalSubTab(id)
                            if (id === 'external') void loadExternalBookings()
                          }}
                          className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${calSubTab === id ? 'border-b-2 border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* ── Müsaitlik Takvimi ── */}
                    {calSubTab === 'calendar' && (
                      <>
                    {isHotel ? (
                      <HotelRoomAvailabilityEditor
                        listingId={editListingId}
                        organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                      />
                    ) : (
                      <>
                        {/* Tarih aralığı seçici */}
                        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Başlangıç</label>
                            <input type="date" value={calFrom} onChange={(e) => setCalFrom(e.target.value)}
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Bitiş</label>
                            <input type="date" value={calTo} onChange={(e) => setCalTo(e.target.value)}
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200" />
                          </div>
                          <button type="button" onClick={() => void loadCalendar()} disabled={calBusy === 'load'}
                            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {calBusy === 'load' ? <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : null}
                            {calBusy === 'load' ? 'Yükleniyor…' : 'Yükle'}
                          </button>
                        </div>

                        {/* Toplu işlemler */}
                        {calRows.length > 0 && (
                          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/40">
                            <span className="mr-1 text-xs font-semibold text-neutral-500">Toplu:</span>
                            <button type="button" onClick={() => bulkSetAll(true)}
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-400">
                              ✓ Tümü Müsait
                            </button>
                            <button type="button" onClick={() => bulkSetAll(false)}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-400">
                              ✗ Tümü Dolu
                            </button>
                            <button type="button" onClick={() => bulkMarkWeekends(false)}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400">
                              H.Sonu Dolu
                            </button>
                            <button type="button" onClick={() => bulkMarkWeekends(true)}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400">
                              H.Sonu Müsait
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCalRows((prev) => prev.map((r) => ({ ...r, day_status: 'option' as const })))
                              }
                              className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-transparent dark:text-amber-300"
                            >
                              Tümü opsiyon
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCalRows((prev) => prev.map((r) => ({ ...r, day_status: 'promo' as const })))
                              }
                              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-300"
                            >
                              Tümü fırsat
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalRows((prev) => prev.map((r) => ({ ...r, day_status: null })))}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400"
                            >
                              Durumu temizle
                            </button>
                            <div className="flex items-center gap-1 ml-2">
                              <input type="text" inputMode="decimal" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)}
                                placeholder="Toplu fiyat…"
                                className="w-24 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800" />
                              <button type="button" onClick={applyBulkPrice}
                                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-transparent dark:text-blue-400">
                                Uygula
                              </button>
                            </div>
                          </div>
                        )}

                        {!calLoaded && calRows.length === 0 && (
                          <p className="py-4 text-center text-sm text-neutral-400">Yukarıdan tarih aralığı seçip Yükle butonuna tıklayın.</p>
                        )}
                        {calLoaded && (
                          <>
                            <WizardCalendarGrid rows={calRows} onChange={setCalRows} currencyCode={currency} />
                            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-700">
                              <button type="button" onClick={() => void saveCalendar()} disabled={calBusy === 'save'}
                                className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                              >
                                {calBusy === 'save' ? 'Kaydediliyor…' : 'Takvimi Kaydet'}
                              </button>
                              {calSaveMsg && (
                                <span className={`text-sm font-medium ${calSaveMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {calSaveMsg.text}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                      </>
                    )}

                    {/* ── Dönemsel Fiyat ── */}
                    {calSubTab === 'seasonal' && (
                      <div className="space-y-4">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Sezonluk fiyat dönemleri ekleyin. Her dönem için gecelik taban ücret, hafta sonu fiyatı ve geçerlilik tarihleri tanımlayabilirsiniz.
                        </p>

                        {/* Mevcut kurallar */}
                        {rules.length > 0 && (
                          <div className="space-y-2">
                            {rules.map((r) => {
                              const parsed = parseRuleJson(r.rule_json)
                              return (
                                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
                                  {parsed.label && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">{parsed.label}</span>}
                                  {parsed.base && <span className="text-sm font-medium text-neutral-900 dark:text-white">Gece: <span className="font-mono">{parsed.base}</span></span>}
                                  {parsed.compareAt && <span className="text-sm text-amber-800 dark:text-amber-200">Liste: <span className="font-mono">{parsed.compareAt}</span></span>}
                                  {parsed.weekly && <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Haftalık: <span className="font-mono">{parsed.weekly}</span></span>}
                                  {parsed.weekend && <span className="text-sm text-blue-700 dark:text-blue-300">Hft.sonu: <span className="font-mono">{parsed.weekend}</span></span>}
                                  {parsed.minNights && <span className="text-xs text-neutral-500">Min. {parsed.minNights} gece</span>}
                                  {(r.valid_from || r.valid_to) && <span className="font-mono text-xs text-neutral-500">{r.valid_from ?? '∞'} → {r.valid_to ?? '∞'}</span>}
                                  <button type="button" onClick={() => void deleteRule(r.id)} disabled={ruleBusy}
                                    className="ml-auto text-xs text-red-600 underline dark:text-red-400 disabled:opacity-50"
                                  >
                                    Sil
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {rules.length === 0 && <p className="text-sm text-neutral-400">Henüz dönemsel fiyat tanımlanmamış.</p>}

                        {/* Yeni kural formu */}
                        <div className="rounded-xl border border-dashed border-neutral-300 p-5 dark:border-neutral-600">
                          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Yeni Dönem Ekle</h3>
                          <form onSubmit={(e) => void addRule(e)} className="space-y-4">
                            {!showRawJson ? (
                              <div className="grid gap-4 sm:grid-cols-2">
                                <Field className="block">
                                  <Label>Sezon Adı</Label>
                                  <Input className="mt-1" value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} placeholder="Yaz sezonu" />
                                </Field>
                                <Field className="block">
                                  <Label>Min. Konaklama (gece)</Label>
                                  <Input type="number" min="1" className="mt-1" value={ruleMinNights} onChange={(e) => setRuleMinNights(e.target.value)} placeholder="3" />
                                </Field>
                                <Field className="block">
                                  <Label>Gecelik Taban Ücret</Label>
                                  <Input type="text" inputMode="decimal" className="mt-1 font-mono" value={ruleBase} onChange={(e) => setRuleBase(e.target.value)} placeholder="2500" />
                                </Field>
                                <Field className="block">
                                  <Label>Hafta Sonu Gecelik</Label>
                                  <Input type="text" inputMode="decimal" className="mt-1 font-mono" value={ruleWeekend} onChange={(e) => setRuleWeekend(e.target.value)} placeholder="3200" />
                                </Field>
                                <Field className="block sm:col-span-2">
                                  <Label>İndirim öncesi liste fiyatı (opsiyonel)</Label>
                                  <Input type="text" inputMode="decimal" className="mt-1 font-mono" value={ruleCompareAt} onChange={(e) => setRuleCompareAt(e.target.value)} placeholder="3000" />
                                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                    Satış geceliğinden yüksekse vitrin dönem tablosunda üstü çizili liste + indirimli fiyat gösterilir.
                                  </p>
                                </Field>
                                <Field className="block sm:col-span-2">
                                  <Label>Haftalık Toplam (opsiyonel)</Label>
                                  <Input type="text" inputMode="decimal" className="mt-1 font-mono" value={ruleWeeklyTotal} onChange={(e) => setRuleWeeklyTotal(e.target.value)} placeholder="70000" />
                                </Field>
                                <Field className="block">
                                  <Label>Başlangıç Tarihi</Label>
                                  <Input type="date" className="mt-1" value={ruleFrom} onChange={(e) => setRuleFrom(e.target.value)} />
                                </Field>
                                <Field className="block">
                                  <Label>Bitiş Tarihi</Label>
                                  <Input type="date" className="mt-1" value={ruleTo} onChange={(e) => setRuleTo(e.target.value)} />
                                </Field>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <Field className="block">
                                  <Label>Ham JSON (rule_json)</Label>
                                  <Textarea className="mt-1 font-mono text-sm" rows={3} value={ruleRaw} onChange={(e) => setRuleRaw(e.target.value)} placeholder='{"base_nightly":"2500","compare_at_nightly":"3000","min_nights":3}' />
                                </Field>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <Field className="block"><Label>Başlangıç Tarihi</Label><Input type="date" className="mt-1" value={ruleFrom} onChange={(e) => setRuleFrom(e.target.value)} /></Field>
                                  <Field className="block"><Label>Bitiş Tarihi</Label><Input type="date" className="mt-1" value={ruleTo} onChange={(e) => setRuleTo(e.target.value)} /></Field>
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                              <ButtonPrimary type="submit" disabled={ruleBusy}>
                                {ruleBusy ? '…' : 'Dönem Ekle'}
                              </ButtonPrimary>
                              <button type="button" onClick={() => setShowRawJson((v) => !v)} className="text-xs text-neutral-500 underline">
                                {showRawJson ? 'Form görünümü' : 'Ham JSON'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* ── iCal Takvim Senkronizasyonu ── */}
                    {calSubTab === 'ical' && (
                      <div className="space-y-5">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Airbnb, Booking.com veya başka bir platformdan iCal beslemesi ekleyin. Rezervasyonlar otomatik olarak senkronize edilir.
                        </p>

                        {/* Mevcut beslemeler */}
                        {icalFeeds.length > 0 && (
                          <div className="space-y-2">
                            {icalFeeds.map((f) => (
                              <div key={f.id} className={`rounded-xl border p-4 dark:border-neutral-700 ${icalFeedEditId === f.id ? 'border-primary-300 bg-primary-50/50 dark:bg-primary-950/20' : 'border-neutral-200 bg-neutral-50 dark:bg-neutral-800/40'}`}>
                                {icalFeedEditId === f.id ? (
                                  <div className="space-y-3">
                                    <Field className="block">
                                      <Label>URL</Label>
                                      <Input className="mt-1 font-mono text-xs" value={icalFeedEditUrl} onChange={(e) => setIcalFeedEditUrl(e.target.value)} />
                                    </Field>
                                    <div className="grid grid-cols-2 gap-3">
                                      <Field className="block"><Label>Gün ekle (+)</Label><Input type="number" className="mt-1" value={icalFeedEditPlus} onChange={(e) => setIcalFeedEditPlus(e.target.value)} /></Field>
                                      <Field className="block"><Label>Gün çıkar (−)</Label><Input type="number" className="mt-1" value={icalFeedEditMinus} onChange={(e) => setIcalFeedEditMinus(e.target.value)} /></Field>
                                    </div>
                                    <div className="flex gap-2">
                                      <ButtonPrimary type="button" onClick={() => void saveEditIcalFeed()} disabled={icalFeedBusy === 'edit'}>
                                        {icalFeedBusy === 'edit' ? '…' : 'Kaydet'}
                                      </ButtonPrimary>
                                      <button type="button" onClick={() => setIcalFeedEditId(null)} className="text-sm text-neutral-500 underline">İptal</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="flex-1 truncate font-mono text-xs text-neutral-700 dark:text-neutral-300" title={f.url}>{f.url}</span>
                                    {(f.day_offset_plus || f.day_offset_minus) ? (
                                      <span className="text-xs text-neutral-500">+{f.day_offset_plus ?? 0} / −{f.day_offset_minus ?? 0} gün</span>
                                    ) : null}
                                    <div className="flex gap-2">
                                      <button type="button" onClick={() => void syncIcalFeedNow(f.id)} disabled={icalFeedBusy === `sync-${f.id}`}
                                        className="text-xs text-primary-600 underline dark:text-primary-400 disabled:opacity-50"
                                      >
                                        {icalFeedBusy === `sync-${f.id}` ? '…' : 'Senkronize et'}
                                      </button>
                                      <button type="button" onClick={() => { setIcalFeedEditId(f.id); setIcalFeedEditUrl(f.url ?? ''); setIcalFeedEditPlus(String(f.day_offset_plus ?? 0)); setIcalFeedEditMinus(String(f.day_offset_minus ?? 0)) }}
                                        className="text-xs text-neutral-500 underline"
                                      >
                                        Düzenle
                                      </button>
                                      <button type="button" onClick={() => void removeIcalFeed(f.id)} disabled={icalFeedBusy === `del-${f.id}`}
                                        className="text-xs text-red-600 underline dark:text-red-400 disabled:opacity-50"
                                      >
                                        Sil
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {icalFeeds.length === 0 && <p className="text-sm text-neutral-400">Henüz iCal beslemesi eklenmemiş.</p>}

                        {/* Yeni besleme formu */}
                        <div className="rounded-xl border border-dashed border-neutral-300 p-5 dark:border-neutral-600">
                          <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Yeni Besleme Ekle</h3>
                          <div className="space-y-3">
                            <Field className="block">
                              <Label>iCal URL</Label>
                              <Input className="mt-1 font-mono text-sm" value={icalFeedUrl} onChange={(e) => setIcalFeedUrl(e.target.value)} placeholder="https://airbnb.com/calendar/ical/..." />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                              <Field className="block"><Label>Gün ekle (+)</Label><Input type="number" min="0" className="mt-1" value={icalFeedPlus} onChange={(e) => setIcalFeedPlus(e.target.value)} /></Field>
                              <Field className="block"><Label>Gün çıkar (−)</Label><Input type="number" min="0" className="mt-1" value={icalFeedMinus} onChange={(e) => setIcalFeedMinus(e.target.value)} /></Field>
                            </div>
                            <ButtonPrimary type="button" onClick={() => void addIcalFeed()} disabled={!icalFeedUrl.trim() || icalFeedBusy === 'add'}>
                              {icalFeedBusy === 'add' ? '…' : 'Besleme Ekle'}
                            </ButtonPrimary>
                          </div>
                        </div>

                        {/* Dışa aktarma URL'si */}
                        {editListingId && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                            <p className="mb-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">Dışa Aktarma URL (.ics)</p>
                            <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">Bu adresi diğer platformlarda «takvim içe aktar» olarak ekleyin.</p>
                            <div className="flex gap-2">
                              <input readOnly
                                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
                                value={icalExportLoading ? 'Yükleniyor…' : (icalExportUrl ?? 'İlan kaydedildikten sonra oluşturulur')}
                                onFocus={(e) => e.currentTarget.select()}
                              />
                              {icalExportUrl && (
                                <button type="button" onClick={() => void onCopyIcalExport()}
                                  className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-white disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                >
                                  Kopyala
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Harici Rezervasyon Defteri ── */}
                    {calSubTab === 'external' && (
                      <div className="space-y-5">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Platformumuz dışında yapılan rezervasyonları takip edin (Airbnb, Sahibinden, telefon vb.). Gelir ve ödeme durumunu kayıt altına alın.
                        </p>

                        {/* Form */}
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
                          <h4 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                            {ebEditingId ? 'Rezervasyonu Güncelle' : 'Yeni Rezervasyon Ekle'}
                          </h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field className="block">
                              <Label>Giriş tarihi</Label>
                              <input type="date" value={ebStayFrom} onChange={(e) => setEbStayFrom(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200" />
                            </Field>
                            <Field className="block">
                              <Label>Çıkış tarihi</Label>
                              <input type="date" value={ebStayTo} onChange={(e) => setEbStayTo(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200" />
                            </Field>
                          </div>
                          <div className="mt-3 grid gap-4 sm:grid-cols-3">
                            <Field className="block">
                              <Label>Kaynak (platform)</Label>
                              <Input className="mt-1" value={ebSource} onChange={(e) => setEbSource(e.target.value)} placeholder="Airbnb, telefon, vb." />
                            </Field>
                            <Field className="block">
                              <Label>Toplam satış ({currency})</Label>
                              <Input type="number" min="0" step="0.01" className="mt-1" value={ebSold} onChange={(e) => setEbSold(e.target.value)} placeholder="0" />
                            </Field>
                            <Field className="block">
                              <Label>Alınan ödeme ({currency})</Label>
                              <Input type="number" min="0" step="0.01" className="mt-1" value={ebReceived} onChange={(e) => setEbReceived(e.target.value)} placeholder="0" />
                            </Field>
                          </div>
                          <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <Field className="block">
                              <Label>Kalan ödeme ({currency})</Label>
                              <Input type="number" min="0" step="0.01" className="mt-1" value={ebRemaining} onChange={(e) => setEbRemaining(e.target.value)} placeholder="0" />
                            </Field>
                            <Field className="block">
                              <Label>İlk ödeme notu</Label>
                              <Input className="mt-1" value={ebFirstPayment} onChange={(e) => setEbFirstPayment(e.target.value)} placeholder="Kapora tarihi / miktarı" />
                            </Field>
                          </div>
                          <Field className="mt-3 block">
                            <Label>Notlar</Label>
                            <textarea value={ebNotes} onChange={(e) => setEbNotes(e.target.value)} rows={2}
                              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                              placeholder="Misafir adı, özel talepler…" />
                          </Field>
                          <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => void saveExternalBooking()} disabled={extBusy === 'save'}
                              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                              {extBusy === 'save' ? 'Kaydediliyor…' : ebEditingId ? 'Güncelle' : 'Ekle'}
                            </button>
                            {ebEditingId && (
                              <button type="button" onClick={resetExternalBookingForm}
                                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                              >
                                İptal
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Liste */}
                        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                          {externalBookings.length === 0 ? (
                            <p className="p-5 text-sm text-neutral-400">Henüz harici rezervasyon kaydı yok.</p>
                          ) : (
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-neutral-50 dark:bg-neutral-800/90">
                                <tr>
                                  {['Dönem', 'Kaynak', `Satış (${currency})`, `Alınan`, `Kalan`, 'Not', ''].map((h) => (
                                    <th key={h} className="px-3 py-2 text-xs font-medium text-neutral-500">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {externalBookings.map((row) => (
                                  <tr key={row.id} className="border-t border-neutral-100 dark:border-neutral-800">
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.stay_from} → {row.stay_to}</td>
                                    <td className="px-3 py-2 text-xs">{row.source_label || '—'}</td>
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.sold_total ?? '—'}</td>
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.amount_received ?? '—'}</td>
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.amount_remaining ?? '—'}</td>
                                    <td className="max-w-[12rem] px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">
                                      <span className="line-clamp-2" title={row.notes}>{row.notes || row.first_payment_note || '—'}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2">
                                      <div className="flex gap-1">
                                        <button type="button" onClick={() => beginEditExternalBooking(row)} disabled={Boolean(extBusy)}
                                          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                                          Düzenle
                                        </button>
                                        <button type="button" onClick={() => void removeExternalBooking(row.id)} disabled={Boolean(extBusy)}
                                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-400">
                                          Sil
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Section>
            )}

            {/* ── ADIM 5: Fiyat (villa Fiyatlandırma+EkÜcretler) ── */}
            {isVilla && currentStep === 5 && (
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
                      <Label>Hasar Depozitosu ({currency})</Label>
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
                        placeholder={String(DEFAULT_LISTING_PREPAYMENT_PERCENT)}
                      />
                      <HintText>
                        Standart %{DEFAULT_LISTING_PREPAYMENT_PERCENT}. İlan sahibine göre değiştirebilirsiniz; komisyon
                        oranından küçük olamaz (ikisi de girildiyse).
                      </HintText>
                    </Field>
                  </Grid3>

                  <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Kısa konaklama ücreti
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      Minimum gecenin altında kalınırsa bu tutar alınır
                    </p>
                    <Grid2 className="mt-4">
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
                        <Label>Kısa konaklama ücreti ({currency})</Label>
                        <Input
                          type="number" min="0" step="0.01" className="mt-1"
                          value={shortStayFee} onChange={(e) => setShortStayFee(e.target.value)}
                          placeholder="ör: 500"
                        />
                        <HintText>
                          Yalnızca yukarıdaki minimum geceden <strong>kısa</strong> konaklamalarda tek sefer uygulanır. Boş bırakılırsa yok.
                        </HintText>
                      </Field>
                    </Grid2>
                  </div>

                  <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Temizlik ücreti
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      İsteğe bağlı; konaklama başına tek sefer — minimum gece kuralından bağımsız
                    </p>
                    <Field className="mt-4 block max-w-md">
                      <Label>Temizlik ücreti ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)}
                        placeholder="ör: 750"
                      />
                      <HintText>Boş bırakılırsa tahsil edilmez. Vitrinde ek ücretler bölümünde gösterilir.</HintText>
                    </Field>
                  </div>

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
                        className="text-sm text-link-muted"
                      >
                        + Ek ücret satırı ekle
                      </button>
                    </div>
                  </div>
                </Section>
            )}

            {/* ── ADIM 2 devam: Havuz ── */}
            {currentStep === 2 && (categoryCode === 'holiday_home' ? (
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
            ))}

            {/* ── ADIM 1: Konum (villa) ── */}
            {currentStep === 1 && isVilla && locationSection}

            {/* ── ADIM 5 devam: Yemek Planları (hotel, holiday_home, yacht_charter) ── */}
            {currentStep === 5 && MEAL_PLAN_CATS.has(categoryCode) && editListingId && (
              <Section
                title="Yemek Planları"
                subtitle="Pansiyon seçenekleri ve gecelik ücretler. Ön yüzde «Pansiyon Seçenekleri» olarak listelenir."
              >
                {/* Plan listesi */}
                {mealPlans.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {mealPlans.map((plan) => (
                      <div key={plan.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40">
                        <span className="text-base">{MEAL_PLAN_LABELS[plan.plan_code as MealPlanCode]?.emoji ?? '🍽️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{plan.label ?? MEAL_PLAN_LABELS[plan.plan_code as MealPlanCode]?.tr}</p>
                          <p className="text-xs text-neutral-500">{plan.price_per_night} {plan.currency_code} / gece{plan.is_active ? '' : ' · Pasif'}</p>
                </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => mpOpenEdit(plan)} className="text-xs text-primary-600 underline dark:text-primary-400">Düzenle</button>
                          <button type="button" onClick={() => void deleteMealPlan(plan.id)} disabled={mpBusy} className="text-xs text-red-600 underline dark:text-red-400 disabled:opacity-50">Sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mealPlans.length === 0 && !mpFormOpen && (
                  <p className="mb-4 text-sm text-neutral-400">Henüz yemek planı eklenmemiş.</p>
                )}

                {/* Form */}
                {mpFormOpen && (
                  <div className="mb-4 rounded-2xl border border-primary-200 bg-primary-50/50 p-5 dark:border-primary-800 dark:bg-primary-950/20">
                    <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {mpEditId ? 'Planı Düzenle' : 'Yeni Plan'}
                    </h3>
                    <form onSubmit={(e) => void saveMealPlan(e)} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {!mpEditId && (
                          <Field className="block sm:col-span-2">
                            <Label>Plan Tipi</Label>
                            <select value={mpCode} onChange={(e) => { const v = e.target.value as MealPlanCode; setMpCode(v); if (!mpLabel) setMpLabel(MEAL_PLAN_LABELS[v]?.tr ?? ''); if (!mpLabelEn) setMpLabelEn(MEAL_PLAN_LABELS[v]?.en ?? '') }}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                            >
                              {(Object.keys(MEAL_PLAN_LABELS) as MealPlanCode[]).map((k) => (
                                <option key={k} value={k}>{MEAL_PLAN_LABELS[k].emoji} {MEAL_PLAN_LABELS[k].tr}</option>
                              ))}
                            </select>
                          </Field>
                        )}
                        <Field className="block"><Label>Etiket (TR)</Label><Input className="mt-1" value={mpLabel} onChange={(e) => setMpLabel(e.target.value)} placeholder="Yarım Pansiyon" /></Field>
                        <Field className="block"><Label>Etiket (EN)</Label><Input className="mt-1" value={mpLabelEn} onChange={(e) => setMpLabelEn(e.target.value)} placeholder="Half Board" /></Field>
                        <Field className="block"><Label>Gecelik Fiyat</Label><Input className="mt-1" type="number" min="0" value={mpPrice} onChange={(e) => setMpPrice(e.target.value)} placeholder="1500" /></Field>
                        <Field className="block">
                          <Label>Para Birimi</Label>
                          <select value={mpCurrency} onChange={(e) => setMpCurrency(e.target.value)} className="mt-1 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                            {['TRY', 'EUR', 'USD', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                        {mpCode !== 'room_only' && (
                          <div className="sm:col-span-2">
                            <Label className="mb-2 block text-sm font-medium">Dahil Öğünler</Label>
                            <div className="flex flex-wrap gap-2">
                              {MEAL_OPTIONS.map((opt) => (
                                <label key={opt.value} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition select-none ${mpMeals.includes(opt.value) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'}`}>
                                  <input type="checkbox" className="sr-only" checked={mpMeals.includes(opt.value)} onChange={(e) => setMpMeals(e.target.checked ? [...mpMeals, opt.value] : mpMeals.filter((v) => v !== opt.value))} />
                                  {opt.labelTr}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <Label className="mb-2 block text-sm font-medium">Dahil İkramlar</Label>
                          <div className="flex flex-wrap gap-2">
                            {MEAL_EXTRAS_OPTIONS.map((opt) => (
                              <label key={opt.value} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition select-none ${mpExtras.includes(opt.value) ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'}`}>
                                <input type="checkbox" className="sr-only" checked={mpExtras.includes(opt.value)} onChange={(e) => setMpExtras(e.target.checked ? [...mpExtras, opt.value] : mpExtras.filter((v) => v !== opt.value))} />
                                {opt.labelTr}
                              </label>
                            ))}
                          </div>
                        </div>
                        <Field className="block sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={mpActive} onChange={(e) => setMpActive(e.target.checked)} />
                            Aktif (ön yüzde görünsün)
                          </label>
                        </Field>
                      </div>
                      <div className="flex gap-3">
                        <ButtonPrimary type="submit" disabled={mpBusy}>{mpBusy ? '…' : mpEditId ? 'Güncelle' : 'Plan Ekle'}</ButtonPrimary>
                        <button type="button" onClick={() => { mpResetForm(); setMpFormOpen(false) }} className="text-sm text-neutral-500 underline">İptal</button>
                      </div>
                    </form>
                  </div>
                )}

                {!mpFormOpen && (
                  <button type="button" onClick={() => { mpResetForm(); setMpFormOpen(true) }}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:border-primary-400 hover:text-primary-700 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-primary-500 dark:hover:text-neutral-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>
                    Yeni Plan Ekle
                  </button>
                )}
              </Section>
            )}

            {/* ── ADIM 2 devam: Giriş/Çıkış (non-villa) ── */}
            {!isVilla && currentStep === 2 && (
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
              </>
            )}
            {/* ── ADIM 4 devam: Fiyatlandırma (non-villa) ── */}
            {!isVilla && currentStep === 5 && (
              <>
                {/* Fiyatlandırma — kısa konaklama + temizlik aynı kartta */}
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

                  <Grid3 className="mt-4">
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
                      <Label>Hasar Depozitosu ({currency})</Label>
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
                        placeholder={String(DEFAULT_LISTING_PREPAYMENT_PERCENT)}
                      />
                      <HintText>
                        Standart %{DEFAULT_LISTING_PREPAYMENT_PERCENT}. İlan sahibine göre değiştirebilirsiniz; komisyon
                        oranından küçük olamaz (ikisi de girildiyse).
                      </HintText>
                    </Field>
                  </Grid3>

                  <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Kısa konaklama ücreti
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      Minimum gecenin altında kalınırsa bu tutar alınır
                    </p>
                    <Grid2 className="mt-4">
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
                        <Label>Kısa konaklama ücreti ({currency})</Label>
                        <Input
                          type="number" min="0" step="0.01" className="mt-1"
                          value={shortStayFee} onChange={(e) => setShortStayFee(e.target.value)}
                          placeholder="ör: 500"
                        />
                        <HintText>
                          Yalnızca yukarıdaki minimum geceden <strong>kısa</strong> konaklamalarda tek sefer uygulanır. Boş bırakılırsa yok.
                        </HintText>
                      </Field>
                    </Grid2>
                  </div>

                  <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Temizlik ücreti
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      İsteğe bağlı; konaklama başına tek sefer — minimum gece kuralından bağımsız
                    </p>
                    <Field className="mt-4 block max-w-md">
                      <Label>Temizlik ücreti ({currency})</Label>
                      <Input
                        type="number" min="0" step="0.01" className="mt-1"
                        value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)}
                        placeholder="ör: 750"
                      />
                      <HintText>Boş bırakılırsa tahsil edilmez. Vitrinde ek ücretler bölümünde gösterilir.</HintText>
                    </Field>
                  </div>
                </Section>
              </>
            )}

            {/* ── ADIM 4 devam: Provizyon & Komisyon ── */}
            {currentStep === 5 && (
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
            )}

            {/* ── ADIM 5: Yayın ── */}
            {currentStep === 6 && (
            <>
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
              <Field className="block">
                <Label>İlan sahibi tanıtım metni</Label>
                <Textarea
                  value={ownerBio}
                  onChange={(e) => setOwnerBio(e.target.value)}
                  placeholder="Vitrinde ilan sahibi kartında görünecek kısa tanıtım. Boş bırakılırsa gösterilmez."
                  rows={4}
                  className="mt-1"
                />
                <HintText>
                  İlan açıklamasından otomatik kopyalanmaz; yalnızca burada yazdığınız metin vitrinde görünür.
                </HintText>
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
              {isVilla ? (
                <Field className="mt-3 block max-w-md">
                  <Label>İlan referans kodu</Label>
                  <Input
                    value={externalListingRef}
                    onChange={(e) => setExternalListingRef(e.target.value)}
                    placeholder="VIL-2024-001"
                    className="mt-1"
                  />
                  <HintText>Vitrin ve panelde görünen harici referans; kayıtta hemen yazılabilir.</HintText>
                </Field>
              ) : null}
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

                {/* Facebook paylaşım — yalnızca kaydedilmiş ilan */}
                {editListingId && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2]">
                        <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Facebook&apos;ta Paylaş</p>
                    </div>
                    <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                      İlanı Facebook sayfanıza hemen gönder. Admin → Sosyal Medya → API Ayarları → Meta bölümünde token girilmiş olmalı.
                    </p>
                    <button
                      type="button"
                      disabled={fbPosting}
                      onClick={async () => {
                        const token = getStoredAuthToken()
                        if (!token) return
                        setFbPosting(true)
                        setFbResult(null)
                        const r = await postListingToFacebook(token, editListingId, undefined, {
                          title: (isVilla ? listingByLocale[primaryLocale]?.title : title) || title,
                          handle: slug,
                          category_code: categoryCode,
                        })
                        setFbResult(r)
                        setFbPosting(false)
                      }}
                      className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {fbPosting ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      )}
                      {fbPosting ? 'Paylaşılıyor…' : 'Facebook\'ta Paylaş'}
                    </button>
                    {fbResult && (
                      <div className={`mt-3 rounded-xl border p-3 text-xs ${fbResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'}`}>
                        {fbResult.ok ? (
                          <>
                            ✓ Paylaşım başarılı!
                            {fbResult.post_url && (
                              <a href={fbResult.post_url} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
                                Gönderiyi gör →
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            ✗ {fbResult.error}
                            {fbResult.hint && <p className="mt-1 italic">{fbResult.hint}</p>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
            </>
            )}

            {/* ── ADIM 4 devam: Fiyata dahil (villa) ── */}
            {isVilla && currentStep === 5 && (
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
            )}

            {/* ── ADIM 5 devam: Vitrin Promosyon + SEO ── */}
            {currentStep === 6 && (
            <>
            {/* ────────── Vitrin promosyon (Tur2 yeni alanlar) ────────── */}
            <Section
              title="Vitrin Promosyon"
              subtitle="Anında rezervasyon, mobil indirim ve takvim senkronu (iCal)."
            >
              <Grid2>
                <Field className="block">
                  <Label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={instantBook}
                      onChange={(e) => setInstantBook(e.target.checked)}
                      className="h-4 w-4 accent-primary-600"
                    />
                    Anında rezervasyon (instant book)
                  </Label>
                  <HintText>Tedarikçi onayı beklemeden anında rezervasyon alınır.</HintText>
                </Field>

                <Field className="block">
                  <Label>Mobil indirim (%)</Label>
                  <Input
                    inputMode="decimal"
                    value={mobileDiscountPercent}
                    onChange={(e) => setMobileDiscountPercent(e.target.value)}
                    placeholder="örn. 5"
                    className="mt-1"
                  />
                  <HintText>Mobil cihazlardan rezervasyonda uygulanır (0–90).</HintText>
                </Field>
              </Grid2>

              {(isStayRentalWizard || categoryCode === 'hotel') ? (
                <div className="mt-2 space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">iCal</h3>

                  <Field className="block">
                    <Label>İçe aktarma URL’si</Label>
                    <Input
                      value={icalImportUrl}
                      onChange={(e) => setIcalImportUrl(e.target.value)}
                      placeholder="https://airbnb.com/calendar/ical/...."
                      className="mt-1 font-mono text-sm"
                    />
                    <HintText>
                      Airbnb / Booking vb. platformların verdiği iCal beslemesini yapıştırın; rezervasyonlar buraya
                      işlenir. Çift rezervasyon riskini azaltır.
                    </HintText>
                  </Field>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        Dışa aktarma URL’si (.ics)
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                      Bu adresi diğer platformlarda «takvim içe aktar / abonelik» olarak ekleyin — müsaitlik ve bloklar
                      bu siteden yayınlanır.
                    </p>
                  {editListingId ? (
                    <>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          readOnly
                          aria-label="İlan iCal dışa aktarma URL’si"
                          className="w-full flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
                          value={icalExportLoading ? 'Yükleniyor…' : (icalExportUrl ?? '')}
                          onFocus={(e) => e.currentTarget.select()}
                        />
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => void onCopyIcalExport()}
                            disabled={!icalExportUrl || icalExportLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-white disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          >
                            Kopyala
                          </button>
                          <button
                            type="button"
                            onClick={() => void onRotateIcalExport()}
                            disabled={icalExportRotateBusy || icalExportLoading}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/50 dark:bg-amber-900/25 dark:text-amber-200 dark:hover:bg-amber-900/40"
                          >
                            {icalExportRotateBusy ? '…' : 'Bağlantıyı yenile'}
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                        «Bağlantıyı yenile» eski URL’yi kullanılamaz yapar; harici platformlarda adresi güncellemeniz
                        gerekir.
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                      İlan kaydedildikten sonra burada kalıcı bir .ics adresi oluşturulur.
                    </p>
                  )}
                  </div>
                </div>
              ) : null}
            </Section>

            {/* SEO — villa: dil şeridine göre; API `seo_metadata` (daima içerik sonunda) */}
            {isVilla ? (
              <Section
                title={`SEO — ${
                  allLocales.find((l) => l.code === activeLang)?.flag ?? ''
                } ${allLocales.find((l) => l.code === activeLang)?.label ?? activeLang}`}
                subtitle="Arama sonuçları ve paylaşım önizlemesi için meta alanları; kayıt ilanın çok dilli SEO kaydına yazılır."
              >
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary-200/80 bg-primary-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-primary-900/40 dark:bg-primary-950/20">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    Manuel girebilir veya Türkçe sekmede içerikten öneri alabilirsiniz. Diğer diller için üstteki{' '}
                    <strong>AI Çevir</strong>, dolu Türkçe SEO alanlarını hedef dile taşır.
                  </p>
                  <button
                    type="button"
                    disabled={seoPolishBusy === 'suggest' || activeLang !== primaryLocale}
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
            ) : null}
            </>
            )}

            {/* Hata mesajı — her adımda */}
            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                {err}
              </div>
            )}

            {!isVilla ? (
              <Section
                title="Yayın Durumu"
                subtitle="İlanın kaydedildikten sonra vitrinde nasıl görüneceğini seçin."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { value: 'published', label: 'Yayında', hint: 'Vitrinde görünür.' },
                    { value: 'draft', label: 'Taslak', hint: 'Hazırlık aşamasında kalır.' },
                    { value: 'archived', label: 'Arşivlenmiş', hint: 'Vitrinden gizlenir.' },
                  ].map((item) => (
                    <label
                      key={item.value}
                      className={clsx(
                        'cursor-pointer rounded-xl border px-4 py-3 transition-colors',
                        status === item.value
                          ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value={item.value}
                          checked={status === item.value}
                          onChange={() => setStatus(item.value as 'draft' | 'published' | 'archived')}
                          className="h-4 w-4 accent-primary-600"
                        />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </span>
                      <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                        {item.hint}
                      </span>
                    </label>
                  ))}
                </div>
              </Section>
            ) : null}

          </div>

        </div>
        </div>

      </form>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/95"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
          <div
            className={clsx(
              MANAGE_FORM_CONTAINER_CLASS,
              'flex flex-wrap items-center justify-end gap-2 sm:justify-between sm:gap-3',
            )}
          >
            {/* Wizard Geri / İleri — villa sticky footer sol */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(currentStep - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  Geri
                </button>
              )}
              {currentStep < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (editListingId) {
                      submitIntentRef.current = 'save-next'
                      const formEl = document.getElementById(formId) as HTMLFormElement | null
                      formEl?.requestSubmit()
                    } else {
                      goToStep(currentStep + 1)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  İleri
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ) : null}
            <a
              href={
                slug.trim()
                  ? vitrinPath(`${listingPreviewBase}/${slugifyListingSlug(slug.trim())}`)
                  : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!slug.trim()) e.preventDefault()
              }}
              className={clsx(
                  'hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                !slug.trim() && 'opacity-40',
              )}
              aria-disabled={!slug.trim()}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              Önizleme
            </a>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-1.5 dark:border-neutral-700">
                <span className="text-xs text-neutral-500">Yayın</span>
                <button
                  type="button"
                  onClick={() => setStatus(status === 'published' ? 'draft' : 'published')}
                  disabled={Boolean(editListingId) && !editListingReady}
                  className={clsx(
                    'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    Boolean(editListingId) && !editListingReady ? 'opacity-40 cursor-wait' : '',
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
                disabled={saveLocked}
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
                disabled={saveLocked}
                onClick={() => {
                  submitIntentRef.current = 'save-show'
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Kaydet ve göster
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}
