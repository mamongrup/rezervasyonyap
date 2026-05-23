'use client'

import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthProfile, getStoredAuthToken } from '@/lib/auth-storage'
import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { useManageT } from '@/lib/manage-i18n-context'
import { useCatalogListingUi, type CatalogListingUi } from '@/hooks/useCatalogListingUi'
import {
  initCatalogManageOrganizationFromMe,
  writeStoredCatalogOrganizationId,
} from '@/lib/catalog-manage-organization'
import { mergeCalendarRows, type MergedCalendarRow } from '@/lib/listing-availability-calendar-merge'
import {
  formatListingSeasonPeriodLabel,
  listingRuleCompareAtNightly,
} from '@/lib/listing-price-rules-public'
import {
  addManageHotelRoom,
  patchListingBasics,
  getListingBasics,
  deleteListingPriceRule,
  deleteManageHotelRoom,
  getAuthMe,
  getListingMeta,
  getListingOwnerContact,
  getListingAvailabilityCalendar,
  getManageHotelDetails,
  listListingPriceRules,
  listManageHotelRooms,
  patchManageHotelDetails,
  putListingMeta,
  putListingOwnerContact,
  putListingAvailabilityCalendar,
  createListingPriceRule,
  listIcalFeeds,
  createIcalFeed,
  patchIcalFeed,
  deleteIcalFeed,
  syncIcalFeed,
  getListingIcalExportToken,
  rotateListingIcalExportToken,
  listAttributeGroups,
  listAttributeDefs,
  getListingAttributeValues,
  putListingAttributeValues,
  listManageMealPlans,
  createManageMealPlan,
  updateManageMealPlan,
  deleteManageMealPlan,
  listPriceLineItems,
  getListingPriceLineSelections,
  putListingPriceLineSelections,
  getManageCategoryAccommodationRules,
  type CategoryAccommodationRuleItem,
  listManageCatalogListings,
  computeListingNearbyPois,
  listListingExternalBookings,
  createListingExternalBooking,
  patchListingExternalBooking,
  deleteListingExternalBooking,
  MEAL_PLAN_LABELS,
  MEAL_OPTIONS,
  MEAL_EXTRAS_OPTIONS,
  type AttributeGroup,
  type AttributeDef,
  type IcalFeed,
  type ListingExternalBookingRow,
  type ListingPriceRuleRow,
  type ManageHotelRoomRow,
  type MealPlanItem,
  type MealPlanCode,
  type PriceLineItem,
  type ListingMeta,
  listLocationPages,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { HolidayHomeIcalManagedRow } from '@/components/manage/HolidayHomeIcalManagedRow'
import ListingPerksManageCard from '@/components/manage/ListingPerksManageCard'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  Tag,
  Link2,
  CheckSquare,
  XSquare,
  Layers,
  Hotel,
  RefreshCw,
  Settings2,
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Images,
  ListChecks,
  ScrollText,
  ClipboardList,
  Info,
  Sparkles,
} from 'lucide-react'
import { filterHolidayHomeAttributeGroups } from '@/lib/holiday-home-listing-fields'
import { VerticalDetailsSection } from '../../../VerticalDetailsSection'
import ListingImagesSection from '../../../ListingImagesSection'
import PlacesAutocompleteInput from '@/components/editor/PlacesAutocompleteInput'
import MapPicker from '@/components/editor/MapPicker'

function verticalSectionTitle(verticalTitles: CatalogListingUi['verticalTitles'], categoryCode: string) {
  const m = verticalTitles as Record<string, string>
  return m[categoryCode] ?? m.default
}

/** Konaklama vitrininde kural seçimi — otel / tatil evi / yat */
const STAY_ACCOMMODATION_RULE_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])
const HOTEL_ROOM_META_EXAMPLE = JSON.stringify(
  {
    beds: 2,
    bed_type: '1 çift kişilik + 1 tek kişilik',
    size_m2: 32,
    description: 'Balkonlu, deniz veya bahçe manzaralı oda.',
    amenities: ['Minibar', 'Klima', 'Wi‑Fi'],
    image: '',
  },
  null,
  2,
)

/** `options_json` bozuk olsa bile UI'yi crash ettirmemek için güvenli parse. */
function parseOptionsJsonSafe(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string')
    }
    return []
  } catch {
    return []
  }
}

function parseAccommodationRuleIdsFromValueJson(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
    if (typeof v === 'string') {
      const inner = JSON.parse(v) as unknown
      return Array.isArray(inner) ? inner.filter((x): x is string => typeof x === 'string') : []
    }
  } catch {
    /* ignore */
  }
  return []
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function addDaysIso(isoDate: string, delta: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

// Ham rule_json'dan okunabilir alan çıkar
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
        obj.compare_at_nightly ??
          obj.list_nightly ??
          obj.original_nightly ??
          obj.msrp_nightly ??
          '',
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

function ManageMoneyWithCompare({
  amount,
  compareAt,
  currencyCode,
  locale,
}: {
  amount: number
  compareAt: number | null | undefined
  currencyCode: string
  locale: string
}) {
  const showStrike = compareAt != null && compareAt > amount
  const main = formatManageListingMoney(amount, currencyCode, locale)
  if (!showStrike) {
    return <span className="font-medium text-slate-900 dark:text-slate-100">{main}</span>
  }
  return (
    <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5 tabular-nums font-medium text-slate-900 dark:text-slate-100">
      <span className="line-through text-neutral-400 dark:text-neutral-500">
        {formatManageListingMoney(compareAt, currencyCode, locale)}
      </span>
      <span>{main}</span>
    </span>
  )
}

function parseMoneyAmount(raw: string): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** rule_json içinden haftalık tutar — vitrin / özel import için opsiyonel alanlar */
function parseWeeklyFromRuleObject(obj: Record<string, unknown>): number | null {
  const keys = ['weekly_total', 'weekly_nightly', 'weekly_amount', 'weekly_price', 'weekly'] as const
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim()) {
      const n = Number.parseFloat(v.trim().replace(',', '.'))
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function formatManageListingMoney(amount: number, currencyCode: string, locale: string): string {
  const tag = locale === 'tr' ? 'tr-TR' : 'en-US'
  const cur = currencyCode.trim() || 'TRY'
  try {
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${Math.round(amount)} ${cur}`
  }
}

/** Tatil evi — Müsaitlik sekmesinin altında dönemsel fiyat özet tablosu */
function HolidayHomeSeasonalPricingCalendarSummary({
  rules,
  locale,
  currencyCode,
  seasonalUi,
  onGoToSeasonalTab,
}: {
  rules: ListingPriceRuleRow[]
  locale: string
  currencyCode: string
  seasonalUi: CatalogListingUi['seasonalPrice']
  onGoToSeasonalTab: () => void
}) {
  const sorted = useMemo(
    () =>
      [...rules].sort((a, b) => {
        const af = a.valid_from ?? ''
        const bf = b.valid_from ?? ''
        return af.localeCompare(bf)
      }),
    [rules],
  )

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{seasonalUi.calendarSummaryTitle}</h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-600 dark:text-slate-400">{seasonalUi.calendarSummaryIntro}</p>
        </div>
        <button
          type="button"
          onClick={onGoToSeasonalTab}
          className="shrink-0 rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:bg-slate-900 dark:text-primary-300 dark:hover:bg-primary-950/40"
        >
          {seasonalUi.calendarSummaryEditTab} →
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">{seasonalUi.calendarSummaryEmpty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide">{seasonalUi.calendarSummaryColPeriod}</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-right">{seasonalUi.calendarSummaryColNightly}</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-right">{seasonalUi.calendarSummaryColWeekly}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => {
                let obj: Record<string, unknown> = {}
                try {
                  obj = JSON.parse(r.rule_json) as Record<string, unknown>
                } catch {
                  obj = {}
                }
                const parsed = parseRuleJson(r.rule_json)
                const baseNum = parseMoneyAmount(parsed.base)
                const weekendNum = parseMoneyAmount(parsed.weekend)
                const weeklyStored = parseWeeklyFromRuleObject(obj)
                const weeklyNum = weeklyStored ?? (baseNum != null ? baseNum * 7 : null)

                const periodLabel = formatListingSeasonPeriodLabel(r, locale, {
                  defaultPeriod: seasonalUi.calendarSummaryDefaultPeriod,
                  rangeSep: ' - ',
                  rangeFromOpen: 've sonrası',
                  rangeUntil: 'Şu tarihe kadar:',
                })

                const compareNightly =
                  baseNum != null ? listingRuleCompareAtNightly(baseNum, r.rule_json) : null
                const compareWeekly =
                  weeklyNum != null && compareNightly != null ? compareNightly * 7 : null

                let nightlyCell: ReactNode
                if (baseNum != null) {
                  if (weekendNum != null && weekendNum !== baseNum) {
                    nightlyCell = (
                      <div className="text-right">
                        <ManageMoneyWithCompare
                          amount={baseNum}
                          compareAt={compareNightly}
                          currencyCode={currencyCode}
                          locale={locale}
                        />
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {seasonalUi.calendarSummaryWeekendNote}: {formatManageListingMoney(weekendNum, currencyCode, locale)}
                        </div>
                      </div>
                    )
                  } else {
                    nightlyCell = (
                      <ManageMoneyWithCompare
                        amount={baseNum}
                        compareAt={compareNightly}
                        currencyCode={currencyCode}
                        locale={locale}
                      />
                    )
                  }
                } else if (weeklyStored != null) {
                  const perNight = weeklyStored / 7
                  const perNightCompare =
                    compareWeekly != null ? compareWeekly / 7 : listingRuleCompareAtNightly(perNight, r.rule_json)
                  nightlyCell = (
                    <div className="text-right">
                      <ManageMoneyWithCompare
                        amount={perNight}
                        compareAt={perNightCompare}
                        currencyCode={currencyCode}
                        locale={locale}
                      />
                      <div className="text-xs text-slate-500 dark:text-slate-400">{seasonalUi.calendarSummaryDerivedNightlyNote}</div>
                    </div>
                  )
                } else {
                  nightlyCell = <span className="text-slate-400">—</span>
                }

                const weeklyCell =
                  weeklyNum != null ? (
                    <ManageMoneyWithCompare
                      amount={weeklyNum}
                      compareAt={compareWeekly}
                      currencyCode={currencyCode}
                      locale={locale}
                    />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )

                return (
                  <tr
                    key={r.id}
                    className={idx % 2 === 1 ? 'bg-slate-50/90 dark:bg-slate-800/30' : 'bg-white dark:bg-transparent'}
                  >
                    <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">{periodLabel}</td>
                    <td className="px-5 py-3.5 text-right align-top">{nightlyCell}</td>
                    <td className="px-5 py-3.5 text-right align-top">{weeklyCell}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Öznitelik Değerleri Bölümü ───────────────────────────────────────────────
function ListingAttributeValuesSection({
  listingId,
  categoryCode,
  token,
  organizationId,
}: {
  listingId: string
  categoryCode: string
  token: string
  /** Yönetici kapsamı: öznitelik listesi API’si için */
  organizationId?: string
}) {
  const ui = useCatalogListingUi()
  const params = useParams()
  const uiLocale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const [groups, setGroups] = useState<AttributeGroup[]>([])
  const [defsMap, setDefsMap] = useState<Record<string, AttributeDef[]>>({})
  const [values, setValues] = useState<Record<string, string>>({}) // "groupCode.key" → value
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const attrListParams = {
    categoryCode,
    locale: uiLocale,
    ...(organizationId ? { organizationId } : {}),
  }
  const defParams = { locale: uiLocale, ...(organizationId ? { organizationId } : {}) }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    void Promise.all([
      listAttributeGroups(token, attrListParams),
      getListingAttributeValues(token, listingId),
    ])
      .then(async ([gRes, vRes]) => {
        const gs = filterHolidayHomeAttributeGroups(gRes.groups, categoryCode)
        setGroups(gs)
        // load defs for each group
        const dm: Record<string, AttributeDef[]> = {}
        await Promise.all(
          gs.map((g) =>
            listAttributeDefs(token, g.id, defParams).then((r) => {
              dm[g.id] = r.defs
            }).catch(() => { dm[g.id] = [] }),
          ),
        )
        setDefsMap(dm)
        const vm: Record<string, string> = {}
        for (const v of vRes.values) {
          const raw = v.value_json
          // string JSON için tırnakları kaldır; bozuk JSON tüm haritayı yıkmasın.
          let value: string = raw
          if (typeof raw === 'string' && raw.startsWith('"')) {
            try {
              const parsed = JSON.parse(raw)
              value = typeof parsed === 'string' ? parsed : raw
            } catch {
              value = raw
            }
          }
          vm[`${v.group_code}.${v.key}`] = value
        }
        setValues(vm)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listingId, categoryCode, token, uiLocale, organizationId])

  function setValue(groupCode: string, key: string, val: string) {
    setValues((prev) => ({ ...prev, [`${groupCode}.${key}`]: val }))
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const payload = Object.entries(values)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => {
          const [group_code, ...rest] = k.split('.')
          return { group_code, key: rest.join('.'), value: v }
        })
      await putListingAttributeValues(token, listingId, payload)
      setMsg({ ok: true, text: ui.attrSaveOk })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed') })
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100'

  if (loading) return <p className="text-sm text-neutral-400">{ui.common.loading}</p>

  if (groups.length === 0) {
    const emptyHint =
      categoryCode === 'holiday_home' ? ui.attr.emptyAmenityGroupsHint : ui.attr.emptyGroupsHint
    const emptyTitle =
      categoryCode === 'holiday_home' ? ui.attr.emptyAmenityGroupsTitle : ui.attr.emptyGroupsTitle
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{emptyTitle}</p>
        <p className="mt-1 text-xs text-neutral-400">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const defs = defsMap[g.id] ?? []
        if (defs.length === 0) return null
        return (
          <div key={g.id} className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <div className="border-b border-neutral-100 px-6 py-4 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{g.name}</h3>
              <p className="mt-0.5 font-mono text-xs text-neutral-400">{g.code}</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {defs.filter((d) => d.is_active).map((d) => {
                const vk = `${g.code}.${d.code}`
                const val = values[vk] ?? ''
                return (
                  <div key={d.id}>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      {d.label}
                      {d.is_required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {d.field_type === 'boolean' ? (
                      <select
                        value={val}
                        onChange={(e) => setValue(g.code, d.code, e.target.value)}
                        className={`mt-1 ${inputCls}`}
                      >
                        <option value="">{ui.attr.selectPlaceholder}</option>
                        <option value="true">{ui.attr.yes}</option>
                        <option value="false">{ui.attr.no}</option>
                      </select>
                    ) : d.field_type === 'select' && d.options_json ? (
                      <select
                        value={val}
                        onChange={(e) => setValue(g.code, d.code, e.target.value)}
                        className={`mt-1 ${inputCls}`}
                      >
                        <option value="">{ui.attr.selectPlaceholder}</option>
                        {parseOptionsJsonSafe(d.options_json).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : d.field_type === 'number' ? (
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => setValue(g.code, d.code, e.target.value)}
                        className={`mt-1 ${inputCls}`}
                        placeholder="0"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setValue(g.code, d.code, e.target.value)}
                        className={`mt-1 ${inputCls}`}
                        placeholder={d.label}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm ${
          msg.ok
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
            : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
        }`}>
          {msg.text}
        </p>
      )}

      <ButtonPrimary type="button" disabled={busy} onClick={() => void save()}>
        {busy ? ui.common.ellipsis : categoryCode === 'holiday_home' ? ui.attr.saveAmenitiesBtn : ui.attrSaveBtn}
      </ButtonPrimary>
    </div>
  )
}

function ListingAccommodationRulesSection({
  listingId,
  categoryCode,
  token,
  organizationId,
  embedded,
}: {
  listingId: string
  categoryCode: string
  token: string
  organizationId?: string
  /** Üst kart başlık/giriş dışarıdaysa iç iç başlığı gösterme */
  embedded?: boolean
}) {
  const ui = useCatalogListingUi()
  const params = useParams()
  const loc = typeof params?.locale === 'string' ? params.locale : 'tr'
  const lang = loc.split('-')[0] ?? 'tr'
  const [rules, setRules] = useState<CategoryAccommodationRuleItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const orgIdForRules = organizationId?.trim() ?? ''
  const orgParamRules = orgIdForRules ? { organizationId: orgIdForRules } : undefined

  useEffect(() => {
    if (!token) return
    setLoading(true)
    void Promise.all([
      getManageCategoryAccommodationRules(token, categoryCode, orgParamRules),
      getListingAttributeValues(token, listingId),
    ])
      .then(([r, av]) => {
        setRules(r)
        const row = av.values.find((v) => v.group_code === 'catalog' && v.key === 'accommodation_rule_ids')
        setSelected(new Set(parseAccommodationRuleIdsFromValueJson(row?.value_json ?? '[]')))
      })
      .catch(() => {
        setRules([])
        setSelected(new Set())
      })
      .finally(() => setLoading(false))
  }, [listingId, categoryCode, token, orgIdForRules])

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      await putListingAttributeValues(token, listingId, [
        {
          group_code: 'catalog',
          key: 'accommodation_rule_ids',
          value: JSON.stringify([...selected]),
        },
      ])
      setMsg({ ok: true, text: ui.rulesSaveOk })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed') })
    } finally {
      setBusy(false)
    }
  }

  function ruleLabel(r: CategoryAccommodationRuleItem) {
    return r.labels[lang]?.trim() || r.labels.tr?.trim() || r.labels.en?.trim() || Object.values(r.labels)[0]?.trim() || r.id
  }

  if (loading) return <p className="text-sm text-neutral-400">{ui.common.loading}</p>
  if (rules.length === 0) {
    return (
      <div
        className={
          embedded
            ? 'rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center dark:border-neutral-700'
            : 'rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700'
        }
      >
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {ui.accommodationRules.emptyTitle}
        </p>
        <p className="mt-1 text-xs text-neutral-400">{ui.accommodationRules.emptyHint}</p>
      </div>
    )
  }

  const ruleChecks = (
    <div className={`flex flex-wrap gap-3 ${embedded ? '' : 'mt-3'}`}>
      {rules.map((r) => (
        <label
          key={r.id}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        >
          <input
            type="checkbox"
            checked={selected.has(r.id)}
            onChange={() => toggle(r.id)}
            className="h-4 w-4 accent-primary-600"
          />
          <span>
            {ruleLabel(r)}{' '}
            <span className="text-neutral-400">
              ({r.severity === 'warn' ? ui.rulesSeverityWarn : ui.rulesSeverityOk})
            </span>
          </span>
        </label>
      ))}
    </div>
  )

  const feedback = msg ? (
    <p
      className={`rounded-xl px-4 py-3 text-sm ${
        msg.ok
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
      }`}
    >
      {msg.text}
    </p>
  ) : null

  const saveBtn = (
    <ButtonPrimary type="button" disabled={busy} onClick={() => void save()}>
      {busy ? ui.common.ellipsis : ui.rulesSaveBtn}
    </ButtonPrimary>
  )

  if (embedded) {
    return (
      <div className="space-y-4">
        {ruleChecks}
        {feedback}
        {saveBtn}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{ui.accommodationRules.panelTitle}</h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{ui.accommodationRules.panelIntro}</p>
        {ruleChecks}
      </div>
      {feedback}
      {saveBtn}
    </div>
  )
}

// ─── Dahil / Hariç (fiyat katalogundan çok dilli etiket) ──────────────────────
function ListingPriceLinesSection({
  listingId,
  categoryCode,
  token,
  requireOrganizationId,
  organizationId,
}: {
  listingId: string
  categoryCode: string
  token: string
  /** Yönetici: kurum UUID gelmeden çağrı yapılmaz (`organization_id_required` önlenir). */
  requireOrganizationId?: boolean
  organizationId?: string
}) {
  const ui = useCatalogListingUi()
  const params = useParams()
  const loc = typeof params?.locale === 'string' ? params.locale : 'tr'
  const [items, setItems] = useState<PriceLineItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    if (requireOrganizationId && !organizationId?.trim()) {
      setLoading(false)
      setItems([])
      setSelected(new Set())
      return
    }
    setLoading(true)
    void Promise.all([
      listPriceLineItems(token, { categoryCode, locale: loc, ...orgParam }),
      getListingPriceLineSelections(token, listingId, orgParam),
    ])
      .then(([r, s]) => {
        setItems(r.items.filter((i) => i.is_active))
        setSelected(new Set(s.item_ids))
      })
      .catch(() => {
        setItems([])
        setSelected(new Set())
      })
      .finally(() => setLoading(false))
  }, [listingId, categoryCode, token, loc, requireOrganizationId, organizationId])

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      await putListingPriceLineSelections(token, listingId, { item_ids: [...selected] }, orgParam)
      setMsg({ ok: true, text: ui.priceLinesSaveOk })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed') })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-400">{ui.common.loading}</p>
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {ui.priceLines.emptyTitle}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {ui.priceLines.emptyHint}
        </p>
      </div>
    )
  }

  const included = items.filter((i) => i.scope === 'included')
  const excluded = items.filter((i) => i.scope === 'excluded')

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{ui.priceLines.includedHeading}</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {included.map((i) => (
            <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-neutral-900">
              <input
                type="checkbox"
                checked={selected.has(i.id)}
                onChange={() => toggle(i.id)}
                className="h-4 w-4 accent-emerald-600"
              />
              <span>{i.label || i.code}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">{ui.priceLines.excludedHeading}</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {excluded.map((i) => (
            <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-neutral-900">
              <input
                type="checkbox"
                checked={selected.has(i.id)}
                onChange={() => toggle(i.id)}
                className="h-4 w-4 accent-amber-600"
              />
              <span>{i.label || i.code}</span>
            </label>
          ))}
        </div>
      </div>
      {msg ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            msg.ok
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
          }`}
        >
          {msg.text}
        </p>
      ) : null}
      <ButtonPrimary type="button" disabled={busy} onClick={() => void save()}>
        {busy ? ui.common.ellipsis : ui.priceLinesSaveBtn}
      </ButtonPrimary>
    </div>
  )
}

function formatListingMoney(amount: number | null, currencyCode: string): string {
  if (amount === null) return '—'
  const cc = currencyCode.trim().toUpperCase() || 'TRY'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cc,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount} ${cc}`
  }
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function CatalogListingDetailClient({
  categoryCode,
  listingId,
}: {
  categoryCode: string
  listingId: string
}) {
  const t = useManageT()
  const ui = useCatalogListingUi()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const base = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)
  const transHref = `${base}/listings/${encodeURIComponent(listingId)}/translations`
  /** Tatil evi: ilan görselleri tam formda; çoklu iCal gelişmiş panelde kalır. */
  const showListingGalleryInMediaTab = categoryCode !== 'holiday_home'

  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  /** Yönetici `needOrg`/kurum UUID hydrate olmadan API çağrısı yapılmasın (scope query kaçağı). */
  const [manageIdentityReady, setManageIdentityReady] = useState(() => !getStoredAuthToken())
  const orgQ = useMemo(
    () => (needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined),
    [needOrg, orgId],
  )

  const [err, setErr] = useState<string | null>(null)

  // ── Otel alanları ──
  const [hotelDetails, setHotelDetails] = useState<{ star: string; et: string; tc: string } | null>(null)
  const [rooms, setRooms] = useState<ManageHotelRoomRow[]>([])
  const [roomName, setRoomName] = useState('')
  const [roomCap, setRoomCap] = useState('')
  const [roomBoard, setRoomBoard] = useState('')
  const [roomMeta, setRoomMeta] = useState('{}')

  // ── Fiyat kuralları ──
  const [rules, setRules] = useState<ListingPriceRuleRow[]>([])
  // Yapısal form alanları
  const [ruleLabel, setRuleLabel] = useState('')
  const [ruleBase, setRuleBase] = useState('')
  const [ruleWeekend, setRuleWeekend] = useState('')
  const [ruleWeeklyTotal, setRuleWeeklyTotal] = useState('')
  const [ruleCompareAt, setRuleCompareAt] = useState('')
  const [ruleMinNights, setRuleMinNights] = useState('')
  const [ruleFrom, setRuleFrom] = useState('')
  const [ruleTo, setRuleTo] = useState('')
  const [showRawJson, setShowRawJson] = useState(false)
  const [ruleRaw, setRuleRaw] = useState('')

  // ── Müsaitlik takvimi ──
  const [calFrom, setCalFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [calTo, setCalTo] = useState(() => addDaysIso(new Date().toISOString().slice(0, 10), 90))
  const [calRows, setCalRows] = useState<MergedCalendarRow[]>([])
  const [bulkPrice, setBulkPrice] = useState('')

  // ── Dış kaynaklı rezervasyon kayıtları ──
  const [externalBookings, setExternalBookings] = useState<ListingExternalBookingRow[]>([])
  const [extBusy, setExtBusy] = useState<string | null>(null)
  const [ebStayFrom, setEbStayFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [ebStayTo, setEbStayTo] = useState(() => addDaysIso(new Date().toISOString().slice(0, 10), 7))
  const [ebSource, setEbSource] = useState('')
  const [ebSold, setEbSold] = useState('')
  const [ebReceived, setEbReceived] = useState('')
  const [ebRemaining, setEbRemaining] = useState('')
  const [ebFirstPayment, setEbFirstPayment] = useState('')
  const [ebNotes, setEbNotes] = useState('')
  const [ebEditingId, setEbEditingId] = useState<string | null>(null)

  // ── iCal ──
  const [icalFeeds, setIcalFeeds] = useState<IcalFeed[]>([])
  const [icalUrl, setIcalUrl] = useState('')
  const [icalPlus, setIcalPlus] = useState('0')
  const [icalMinus, setIcalMinus] = useState('0')
  const [icalEditId, setIcalEditId] = useState<string | null>(null)
  const [icalEditUrl, setIcalEditUrl] = useState('')
  const [icalEditPlus, setIcalEditPlus] = useState('0')
  const [icalEditMinus, setIcalEditMinus] = useState('0')

  // ── iCal Export (bu ilanın .ics public URL'i) ──
  // Token yoksa ical-tab açıldığında lazy-load ile üretilir.
  const [icalExportUrl, setIcalExportUrl] = useState<string | null>(null)
  const [icalExportLoading, setIcalExportLoading] = useState(false)
  const icalExportFetchStartedRef = useRef(false)

  // ── Yemek Planları ──
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

  const [busy, setBusy] = useState<string | null>(null)
  const [listingSlug, setListingSlug] = useState('')
  const [listingCurrencyCode, setListingCurrencyCode] = useState('TRY')
  const [listingStatus, setListingStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [minStayNights, setMinStayNights] = useState('')
  const [cleaningFee, setCleaningFee] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [prepaymentPercent, setPrepaymentPercent] = useState('')
  const [commissionPercent, setCommissionPercent] = useState('')
  const [cancellationPolicy, setCancellationPolicy] = useState('')
  const [licenseRef, setLicenseRef] = useState('')
  const [externalListingRef, setExternalListingRef] = useState('')
  const [shareToSocial, setShareToSocial] = useState(true)
  const [allowAiCaption, setAllowAiCaption] = useState(true)
  const [allowGapBooking, setAllowGapBooking] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [checkInTime, setCheckInTime] = useState('')
  const [checkOutTime, setCheckOutTime] = useState('')
  const [bedCount, setBedCount] = useState('')
  const [bathCount, setBathCount] = useState('')
  const [squareMeters, setSquareMeters] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [address, setAddress] = useState('')
  const [districtLabel, setDistrictLabel] = useState('')
  const [cityDisplay, setCityDisplay] = useState('')
  const [provinceCity, setProvinceCity] = useState('')
  const [destinationOptions, setDestinationOptions] = useState<
    { id: string; title: string; districtName: string; regionName: string }[]
  >([])
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [minAdvanceBookingDays, setMinAdvanceBookingDays] = useState('')
  const [minShortStayNights, setMinShortStayNights] = useState('')
  const [shortStayFee, setShortStayFee] = useState('')
  const MEAL_PLAN_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])
  const CALENDAR_INIT_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])
  const [activeTab, setActiveTab] = useState<
    | 'listing'
    | 'calendar'
    | 'price'
    | 'media'
    | 'vertical'
    | 'hotel'
    | 'meal_plans'
  >(() => (categoryCode === 'holiday_home' ? 'calendar' : 'listing'))

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    void listManageCatalogListings(token, {
      categoryCode,
      search: listingId,
      organizationId: needOrg && orgId.trim() ? orgId.trim() : undefined,
    })
      .then((r) => {
        const row = r.listings.find((l) => l.id === listingId)
        if (row?.slug) setListingSlug(row.slug)
        if (row?.currency_code?.trim()) setListingCurrencyCode(row.currency_code.trim().toUpperCase())
      })
      .catch(() => {})
  }, [categoryCode, listingId, needOrg, orgId])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setManageIdentityReady(true)
      return
    }
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (admin && typeof window !== 'undefined') {
          setOrgId(initCatalogManageOrganizationFromMe(me))
        }
      })
      .catch(() => {})
      .finally(() => {
        setManageIdentityReady(true)
      })
  }, [])

  // ── Yükle: Fiyat kuralları ──
  const loadPriceRules = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    try {
      const pr = await listListingPriceRules(token, listingId, orgQ)
      setRules(pr.rules)
    } catch { /* ignore */ }
  }, [listingId, needOrg, orgId, orgQ])

  // ── Yükle: Otel verileri ──
  const loadHotel = useCallback(async () => {
    if (categoryCode !== 'hotel') return
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    try {
      const [d, r] = await Promise.all([
        getManageHotelDetails(token, listingId, orgQ),
        listManageHotelRooms(token, listingId, orgQ),
      ])
      setHotelDetails({
        star: d.star_rating ?? '',
        et: d.etstur_property_ref ?? '',
        tc: d.tatilcom_property_ref ?? '',
      })
      setRooms(r.rooms)
    } catch { /* ignore */ }
  }, [categoryCode, listingId, needOrg, orgId, orgQ])

  // ── Yükle: iCal beslemeleri ──
  const loadIcal = useCallback(async () => {
    try {
      const r = await listIcalFeeds(listingId)
      setIcalFeeds(r.feeds)
    } catch { /* ignore */ }
  }, [listingId])

  const loadListingForm = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    try {
      const [basics, owner, meta] = await Promise.all([
        getListingBasics(token, listingId, orgQ).catch(() => null),
        getListingOwnerContact(token, listingId, orgQ).catch(() => null),
        getListingMeta(token, listingId, orgQ).catch(() => null),
      ])
      if (basics) {
        if (basics.status === 'published' || basics.status === 'archived') {
          setListingStatus(basics.status as 'published' | 'archived')
        } else {
          setListingStatus('draft')
        }
        setMinStayNights(basics.min_stay_nights ?? '')
        setCleaningFee(basics.cleaning_fee_amount ?? '')
        setDepositAmount(basics.first_charge_amount ?? '')
        setPrepaymentPercent(basics.prepayment_percent ?? '')
        setCommissionPercent(basics.commission_percent ?? '')
        setCancellationPolicy(basics.cancellation_policy_text ?? '')
        setLicenseRef(basics.ministry_license_ref ?? '')
        setExternalListingRef(basics.external_listing_ref ?? '')
        setShareToSocial(Boolean(basics.share_to_social))
        setAllowAiCaption(Boolean(basics.allow_ai_caption))
        setAllowGapBooking(Boolean(basics.allow_sub_min_stay_gap_booking))
      }
      if (owner) {
        setOwnerName(owner.contact_name ?? '')
        setOwnerPhone(owner.contact_phone ?? '')
        setOwnerEmail(owner.contact_email ?? '')
      }
      if (meta) {
        const metaTxt = (v: unknown) =>
          v == null || v === '' ? '' : String(v).trim()
        setCheckInTime(meta.check_in_time ?? '')
        setCheckOutTime(meta.check_out_time ?? '')
        setBedCount(meta.bed_count ?? '')
        setBathCount(meta.bath_count ?? '')
        setSquareMeters(meta.square_meters ?? '')
        setMaxGuests(meta.max_guests ?? '')
        setAddress(meta.address ?? '')
        setDistrictLabel(meta.district_label ?? '')
        setCityDisplay(meta.city ?? '')
        setProvinceCity(meta.province_city ?? '')
        setLat(metaTxt(meta.lat))
        setLng(metaTxt(meta.lng))
        setMinAdvanceBookingDays(meta.min_advance_booking_days ?? '')
        setMinShortStayNights(meta.min_short_stay_nights ?? '')
        setShortStayFee(meta.short_stay_fee ?? '')
      }
    } catch {
      /* ignore */
    }
  }, [listingId, needOrg, orgId, orgQ])

  useEffect(() => {
    if (categoryCode !== 'holiday_home') return
    void listLocationPages({ limit: 400 })
      .then((res) => {
        const opts = res.pages
          .filter((p) => p.region_type === 'destination')
          .map((p) => {
            const parts = p.slug_path.split('/').filter(Boolean)
            const regionSlug = parts.length >= 2 ? parts[1]! : ''
            const districtSlug = parts.length >= 3 ? parts[2]! : ''
            const tail = parts.length >= 4 ? parts[3]! : parts[parts.length - 1] ?? ''
            const title = (p.title ?? '').trim() || tail.replace(/-/g, ' ')
            const slugLabel = (s: string) =>
              s
                .split('-')
                .filter(Boolean)
                .map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1))
                .join(' ')
            return {
              id: p.id,
              title,
              districtName: slugLabel(districtSlug),
              regionName: slugLabel(regionSlug),
            }
          })
        setDestinationOptions(opts)
      })
      .catch(() => {})
  }, [categoryCode])

  // ── Yükle: Takvim ──
  const loadCalendar = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    setBusy('cal-load')
    setErr(null)
    try {
      const av = await getListingAvailabilityCalendar(token, listingId, { from: calFrom, to: calTo }, orgQ)
      setCalRows(mergeCalendarRows(calFrom, calTo, av.days))
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('cal_load_failed'))
    } finally {
      setBusy(null)
    }
  }, [listingId, needOrg, orgId, orgQ, calFrom, calTo])

  const loadExternalBookings = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    setExtBusy('load')
    try {
      const r = await listListingExternalBookings(token, listingId, orgQ)
      setExternalBookings(r.bookings)
    } catch (e) {
      setErr(
        e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('external_bookings_query_failed'),
      )
    } finally {
      setExtBusy(null)
    }
  }, [listingId, needOrg, orgId, orgQ])

  function resetExternalBookingForm() {
    const today = new Date().toISOString().slice(0, 10)
    setEbEditingId(null)
    setEbStayFrom(today)
    setEbStayTo(addDaysIso(today, 7))
    setEbSource('')
    setEbSold('')
    setEbReceived('')
    setEbRemaining('')
    setEbFirstPayment('')
    setEbNotes('')
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
    if (!token) return
    if (needOrg && !orgId.trim()) return
    setExtBusy('save')
    setErr(null)
    const body = {
      stay_from: ebStayFrom.trim(),
      stay_to: ebStayTo.trim(),
      source_label: ebSource.trim() || undefined,
      sold_total: ebSold.trim() || undefined,
      amount_received: ebReceived.trim() || undefined,
      amount_remaining: ebRemaining.trim() || undefined,
      first_payment_note: ebFirstPayment.trim() || undefined,
      notes: ebNotes.trim() || undefined,
    }
    try {
      if (ebEditingId) {
        await patchListingExternalBooking(token, listingId, ebEditingId, body, orgQ)
      } else {
        await createListingExternalBooking(token, listingId, body, orgQ)
      }
      resetExternalBookingForm()
      await loadExternalBookings()
    } catch (e) {
      setErr(
        e instanceof Error
          ? formatManageApiError(e.message)
          : formatManageApiError(ebEditingId ? 'external_booking_update_failed' : 'external_booking_insert_failed'),
      )
    } finally {
      setExtBusy(null)
    }
  }

  async function removeExternalBooking(id: string) {
    const uiEb = ui.calendar.externalBookings
    if (!window.confirm(uiEb.deleteConfirm)) return
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    setExtBusy(`del-${id}`)
    setErr(null)
    try {
      await deleteListingExternalBooking(token, listingId, id, orgQ)
      if (ebEditingId === id) resetExternalBookingForm()
      await loadExternalBookings()
    } catch (e) {
      setErr(
        e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('external_booking_delete_failed'),
      )
    } finally {
      setExtBusy(null)
    }
  }

  // İlk yükleme — kimlik/kurum UUID belliyken çalış (admin için organization_id kaçırılmasın)
  useEffect(() => {
    if (!manageIdentityReady) return
    if (needOrg && !orgId.trim()) return
    void loadPriceRules()
    void loadHotel()
    void loadIcal()
    void loadCalendar()
    void loadExternalBookings()
    void loadListingForm()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageIdentityReady, needOrg, orgId])

  async function saveListingForm() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy('listing-save')
    setErr(null)
    try {
      await patchListingBasics(
        token,
        listingId,
        {
          status: listingStatus,
          min_stay_nights: minStayNights.trim() || undefined,
          cleaning_fee_amount: cleaningFee.trim() ? cleaningFee.trim() : '__null__',
          first_charge_amount: depositAmount.trim() || undefined,
          prepayment_percent: prepaymentPercent.trim() || undefined,
          commission_percent: commissionPercent.trim() || undefined,
          cancellation_policy_text: cancellationPolicy.trim() || undefined,
          ministry_license_ref: licenseRef.trim() || undefined,
          external_listing_ref: externalListingRef.trim() || undefined,
          share_to_social: shareToSocial,
          allow_ai_caption: allowAiCaption,
          allow_sub_min_stay_gap_booking: allowGapBooking,
        },
        orgQ,
      )
      await putListingOwnerContact(
        token,
        listingId,
        {
          contact_name: ownerName.trim() || undefined,
          contact_phone: ownerPhone.trim() || undefined,
          contact_email: ownerEmail.trim() || undefined,
        },
        orgQ,
      )
      const prev = await getListingMeta(token, listingId, orgQ)
      const next: ListingMeta = { ...prev }
      const assignTrim = (key: keyof ListingMeta, raw: string) => {
        const t = raw.trim()
        if (t) (next as Record<string, string>)[key as string] = t
        else delete (next as Record<string, unknown>)[key as string]
      }
      assignTrim('check_in_time', checkInTime)
      assignTrim('check_out_time', checkOutTime)
      assignTrim('bed_count', bedCount)
      assignTrim('bath_count', bathCount)
      assignTrim('square_meters', squareMeters)
      assignTrim('max_guests', maxGuests)
      assignTrim('address', address)
      assignTrim('district_label', districtLabel)
      assignTrim('city', cityDisplay)
      assignTrim('province_city', provinceCity)
      assignTrim('lat', String(lat ?? ''))
      assignTrim('lng', String(lng ?? ''))
      assignTrim('min_advance_booking_days', minAdvanceBookingDays)
      assignTrim('min_short_stay_nights', minShortStayNights)
      assignTrim('short_stay_fee', shortStayFee)
      if (typeof prev.youtube_url === 'string' && prev.youtube_url.trim()) {
        next.youtube_url = prev.youtube_url.trim()
      } else {
        delete next.youtube_url
      }
      await putListingMeta(token, listingId, next, orgQ)
      if (String(lat ?? '').trim() && String(lng ?? '').trim()) {
        await computeListingNearbyPois(token, listingId).catch(() => {})
      }
      await loadListingForm()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('listing_form_save_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Takvim kaydet ──
  async function saveCalendar() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy('cal-save')
    setErr(null)
    try {
      await putListingAvailabilityCalendar(
        token,
        listingId,
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
        orgQ,
      )
      await loadCalendar()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('cal_save_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Toplu işlem: tüm hafta sonlarını işaretle ──
  function bulkMarkWeekends(available: boolean) {
    setCalRows((prev) =>
      prev.map((r) =>
        r.weekday === 0 || r.weekday === 6
          ? { ...r, am_available: available, pm_available: available, is_available: available }
          : r,
      ),
    )
  }

  // ── Toplu işlem: seçili aralığa fiyat uygula ──
  function applyBulkPrice() {
    if (!bulkPrice.trim()) return
    setCalRows((prev) => prev.map((r) => ({ ...r, price_override: bulkPrice.trim() })))
  }

  // ── Tüm günleri müsait/dolu yap ──
  function bulkSetAll(available: boolean) {
    setCalRows((prev) =>
      prev.map((r) => ({ ...r, am_available: available, pm_available: available, is_available: available })),
    )
  }

  // ── Fiyat kuralı ekle ──
  async function onAddRule(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    setBusy('rule-add')
    setErr(null)
    try {
      if (ruleFrom && ruleTo && ruleFrom > ruleTo) {
        setErr(formatManageApiError('invalid_rule_date_range'))
        return
      }
      const finalJson = showRawJson
        ? ruleRaw.trim()
        : buildRuleJson(ruleBase, ruleWeekend, ruleMinNights, ruleLabel, ruleWeeklyTotal, ruleCompareAt)
      if (!showRawJson) {
        if (!ruleBase.trim() && !ruleWeeklyTotal.trim() && !ruleWeekend.trim()) {
          setErr(formatManageApiError('seasonal_price_base_or_weekly_required'))
          return
        }
      }
      if (!finalJson) {
        setErr(formatManageApiError('rule_json_required'))
        return
      }
      if (showRawJson) {
        try {
          JSON.parse(finalJson)
        } catch {
          setErr(formatManageApiError('rule_json_invalid'))
          return
        }
      }
      await createListingPriceRule(
        token,
        listingId,
        { rule_json: finalJson, valid_from: ruleFrom.trim() || undefined, valid_to: ruleTo.trim() || undefined },
        orgQ,
      )
      setRuleLabel('')
      setRuleBase('')
      setRuleWeekend('')
      setRuleWeeklyTotal('')
      setRuleCompareAt('')
      setRuleMinNights('')
      setRuleFrom('')
      setRuleTo('')
      setRuleRaw('')
      await loadPriceRules()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('rule_add_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Fiyat kuralı sil ──
  async function onDeleteRule(id: string) {
    if (!confirm(ui.confirmDeletePriceRule)) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(`rule-del-${id}`)
    setErr(null)
    try {
      await deleteListingPriceRule(token, listingId, id, orgQ)
      await loadPriceRules()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('rule_del_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Otel meta kaydet ──
  async function saveHotelMeta() {
    if (!hotelDetails) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy('hotel-meta')
    setErr(null)
    try {
      await patchManageHotelDetails(
        token,
        listingId,
        { star_rating: hotelDetails.star.trim() || undefined, etstur_property_ref: hotelDetails.et.trim() || undefined, tatilcom_property_ref: hotelDetails.tc.trim() || undefined },
        orgQ,
      )
      await loadHotel()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Oda ekle ──
  async function onAddRoom(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !roomName.trim()) return
    const meta = roomMeta.trim() || '{}'
    try {
      JSON.parse(meta)
    } catch {
      setErr(formatManageApiError('room_meta_json_invalid'))
      return
    }
    setBusy('room-add')
    setErr(null)
    try {
      await addManageHotelRoom(token, listingId, { name: roomName.trim(), capacity: roomCap.trim() || undefined, board_type: roomBoard.trim() || undefined, meta_json: meta }, orgQ)
      setRoomName(''); setRoomCap(''); setRoomBoard(''); setRoomMeta('{}')
      await loadHotel()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('room_add_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Oda sil ──
  async function onDeleteRoom(id: string) {
    if (!confirm(ui.confirmDeleteRoom)) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(`room-del-${id}`)
    setErr(null)
    try {
      await deleteManageHotelRoom(token, listingId, id, orgQ)
      await loadHotel()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('room_del_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── iCal ekle ──
  async function onAddIcal(e: React.FormEvent) {
    e.preventDefault()
    if (!icalUrl.trim()) return
    setBusy('ical-add')
    setErr(null)
    try {
      await createIcalFeed({
        listing_id: listingId,
        url: icalUrl.trim(),
        day_offset_plus: parseInt(icalPlus, 10) || 0,
        day_offset_minus: parseInt(icalMinus, 10) || 0,
      })
      setIcalUrl(''); setIcalPlus('0'); setIcalMinus('0')
      await loadIcal()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('ical_add_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── iCal güncelle ──
  async function onUpdateIcal(feedId: string) {
    setBusy(`ical-save-${feedId}`)
    setErr(null)
    try {
      await patchIcalFeed(feedId, {
        url: icalEditUrl.trim() || undefined,
        day_offset_plus: parseInt(icalEditPlus, 10) || 0,
        day_offset_minus: parseInt(icalEditMinus, 10) || 0,
      })
      setIcalEditId(null)
      await loadIcal()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('ical_update_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── iCal sil ──
  async function onDeleteIcal(feedId: string) {
    if (!confirm(ui.confirmDeleteIcal)) return
    setBusy(`ical-del-${feedId}`)
    setErr(null)
    try {
      await deleteIcalFeed(feedId)
      await loadIcal()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('ical_del_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── iCal manuel sync (Airbnb/Booking feed'inden takvimi anında yenile) ──
  async function onSyncIcal(feedId: string) {
    setBusy(`ical-sync-${feedId}`)
    setErr(null)
    try {
      const r = await syncIcalFeed(feedId)
      // Kullanıcıya kısa geri bildirim
      alert(
        ui.ical.syncOk
          .replace('{events}', String(r.event_count))
          .replace('{days}', String(r.day_count)),
      )
      await loadIcal()
      await loadCalendar()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('ical_sync_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Export URL: lazy load + rotate ──
  const loadExportUrl = useCallback(async () => {
    const t = getStoredAuthToken()
    if (!t) return
    if (needOrg && !orgId.trim()) return
    setIcalExportLoading(true)
    try {
      const r = await getListingIcalExportToken(t, listingId, orgQ)
      setIcalExportUrl(r.url)
    } catch {
      setIcalExportUrl(null)
    } finally {
      setIcalExportLoading(false)
    }
  }, [listingId, needOrg, orgId, orgQ])

  async function onRotateExport() {
    if (!confirm(ui.ical.rotateConfirm)) return
    const t = getStoredAuthToken()
    if (!t) return
    setBusy('ical-rotate')
    setErr(null)
    try {
      const r = await rotateListingIcalExportToken(t, listingId, orgQ)
      setIcalExportUrl(r.url)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('ical_export_rotate_failed'))
    } finally {
      setBusy(null)
    }
  }

  async function onCopyExport() {
    if (!icalExportUrl) return
    try {
      await navigator.clipboard.writeText(icalExportUrl)
    } catch { /* sessiz */ }
  }

  // ── Yükle: Yemek planları ──
  const loadMealPlans = useCallback(async () => {
    if (!MEAL_PLAN_CATS.has(categoryCode)) return
    const token = getStoredAuthToken()
    if (!token) return
    if (needOrg && !orgId.trim()) return
    try {
      const result = await listManageMealPlans(token, listingId, orgQ)
      setMealPlans(result.meal_plans)
    } catch { /* ignore */ }
  }, [categoryCode, listingId, needOrg, orgId, orgQ])

  useEffect(() => { void loadMealPlans() }, [loadMealPlans])

  const saveOrg = () => {
    const email = getStoredAuthProfile()?.email ?? ''
    writeStoredCatalogOrganizationId(email, orgId)
    void loadPriceRules()
    void loadHotel()
    void loadCalendar()
    void loadIcal()
    void loadMealPlans()
  }

  // iCal export URL: sekme başına tek otomatik yükleme (401/500 döngüsünü önler)
  useEffect(() => {
    if (activeTab !== 'media') {
      icalExportFetchStartedRef.current = false
      return
    }
    if (icalExportUrl !== null || icalExportLoading) return
    if (icalExportFetchStartedRef.current) return
    icalExportFetchStartedRef.current = true
    void loadExportUrl()
  }, [activeTab, icalExportUrl, icalExportLoading, loadExportUrl])

  function mpResetForm() {
    setMpFormOpen(false)
    setMpEditId(null)
    setMpCode('room_only')
    setMpLabel('')
    setMpLabelEn('')
    setMpPrice('')
    setMpCurrency('TRY')
    setMpMeals([])
    setMpExtras([])
    setMpActive(true)
    setMpSort('0')
  }

  function mpOpenEdit(plan: MealPlanItem) {
    setMpEditId(plan.id)
    setMpCode(plan.plan_code)
    setMpLabel(plan.label)
    setMpLabelEn(plan.label_en)
    setMpPrice(String(plan.price_per_night))
    setMpCurrency(plan.currency_code)
    setMpMeals(plan.included_meals)
    setMpExtras(plan.included_extras)
    setMpActive(plan.is_active)
    setMpSort(String(plan.sort_order))
    setMpFormOpen(true)
  }

  async function mpSave() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy('mp-save')
    setErr(null)
    try {
      if (mpEditId) {
        await updateManageMealPlan(token, listingId, mpEditId, {
          label: mpLabel, label_en: mpLabelEn,
          included_meals: mpMeals, included_extras: mpExtras,
          price_per_night: mpPrice, currency_code: mpCurrency,
          is_active: mpActive, sort_order: parseInt(mpSort, 10) || 0,
        }, orgQ)
      } else {
        await createManageMealPlan(token, listingId, {
          plan_code: mpCode, label: mpLabel, label_en: mpLabelEn,
          included_meals: mpMeals, included_extras: mpExtras,
          price_per_night: mpPrice, currency_code: mpCurrency,
        }, orgQ)
      }
      mpResetForm()
      await loadMealPlans()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('meal_plan_save_failed'))
    } finally {
      setBusy(null)
    }
  }

  async function mpDelete(planId: string) {
    if (!confirm(ui.confirmDeleteMealPlan)) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(`mp-del-${planId}`)
    setErr(null)
    try {
      await deleteManageMealPlan(token, listingId, planId, orgQ)
      await loadMealPlans()
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('meal_plan_del_failed'))
    } finally {
      setBusy(null)
    }
  }

  // ── Hazır olmayan durum ──
  if (needOrg && !orgId.trim()) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{ui.pageTitleGate}</h1>
        <p className="mt-1 font-mono text-xs text-neutral-500">{listingId}</p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="block max-w-xl">
            <Label>{t('catalog.org_uuid_label')}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="UUID"
                className="min-w-[280px] flex-1 font-mono text-sm"
              />
              <ButtonPrimary type="button" onClick={() => saveOrg()}>
                {t('catalog.save_load')}
              </ButtonPrimary>
            </div>
          </Field>
        </div>
      </div>
    )
  }

  // Takvim/müsaitlik gerektirmeyen kategoriler (fiyat/takvim yerine dikey formlar öncelikli)
  const CALENDAR_CATEGORIES = new Set([
    'hotel', 'holiday_home', 'yacht_charter', 'tour', 'activity',
    'ferry', 'car_rental', 'cruise', 'beach_lounger', 'cinema_ticket',
    'restaurant_table', 'event',
  ])
  const hasCalendar = CALENDAR_CATEGORIES.has(categoryCode)

  const tabs = [
    ...(categoryCode !== 'holiday_home'
      ? [{ id: 'listing' as const, label: ui.tabs.listing, Icon: Settings2 }]
      : []),
    ...(hasCalendar ? [{ id: 'calendar' as const, label: ui.tabs.calendar, Icon: CalendarDays }] : []),
    { id: 'price' as const, label: ui.tabs.price, Icon: Tag },
    {
      id: 'media' as const,
      label: categoryCode === 'holiday_home' ? ui.ical.title : ui.tabs.media,
      Icon: categoryCode === 'holiday_home' ? Link2 : Images,
    },
    { id: 'vertical' as const, label: ui.tabs.vertical, Icon: Settings2 },
    ...(categoryCode === 'hotel' ? [{ id: 'hotel' as const, label: ui.tabs.hotel, Icon: Hotel }] : []),
    ...(MEAL_PLAN_CATS.has(categoryCode) ? [{ id: 'meal_plans' as const, label: ui.tabs.meal_plans, Icon: UtensilsCrossed }] : []),
  ]

  return (
    <div>
      {/* Başlık — bölge/blog formları ile aynı desen */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <ManageFormPageHeader
          className="mb-0 min-w-0 flex-1"
          title={ui.pageTitle}
          subtitle={
            <>
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {categoryLabelTr(categoryCode)}
              </span>
              <span className="mt-2 block font-mono text-xs text-neutral-400">{listingId}</span>
            </>
          }
        />
        <div className="flex gap-2">
          <Link
            href={transHref}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-primary-300 dark:hover:bg-neutral-800"
          >
            {t('catalog.translations_link')}
          </Link>
          <Link
            href={`${base}/listings`}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            ← {ui.back}
          </Link>
        </div>
      </div>

      {/* Yönetici org alanı */}
      {needOrg && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="flex-1 min-w-[200px]">
            <Label className="text-xs">{t('catalog.org_uuid_label')}</Label>
            <Input value={orgId} onChange={(e) => setOrgId(e.target.value)} className="mt-1 font-mono text-xs" />
          </Field>
          <ButtonPrimary type="button" onClick={() => saveOrg()} className="text-xs">
            {t('catalog.save_load')}
          </ButtonPrimary>
        </div>
      )}

      {err && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>}

      {/* Sekmeler */}
      <div className="mt-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === id
                ? 'border-b-2 border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tatil evi: vitrin özellikleri tam ilan formunda; diğer kategorilerde özet kart kalsın. */}
      {categoryCode !== 'holiday_home' ? (
        <div className="mt-6">
          <ListingPerksManageCard
            listingId={listingId}
            organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
          />
        </div>
      ) : null}

      {/* ═══ SEKME: İLAN BİLGİLERİ (tatil evinde sekme yok — tam ilan formunda) ═════════════════ */}
      {activeTab === 'listing' && categoryCode !== 'holiday_home' && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{ui.listingForm.mainTitle}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field className="block">
                <Label>{ui.listingForm.slug}</Label>
                <Input className="mt-1 font-mono" value={listingSlug} disabled />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.status}</Label>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  value={listingStatus}
                  onChange={(e) => setListingStatus(e.target.value as 'draft' | 'published' | 'archived')}
                >
                  <option value="draft">{ui.listingForm.statusDraft}</option>
                  <option value="published">{ui.listingForm.statusPublished}</option>
                  <option value="archived">{ui.listingForm.statusArchived}</option>
                </select>
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.minStayNights}</Label>
                <Input className="mt-1" value={minStayNights} onChange={(e) => setMinStayNights(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.commissionPercent}</Label>
                <Input className="mt-1" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.licenseRef}</Label>
                <Input className="mt-1" value={licenseRef} onChange={(e) => setLicenseRef(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.externalListingRef}</Label>
                <Input
                  className="mt-1"
                  value={externalListingRef}
                  onChange={(e) => setExternalListingRef(e.target.value)}
                  placeholder="VIL-2024-001"
                />
              </Field>
            </div>
            <Field className="mt-4 block">
              <Label>{ui.listingForm.cancellationPolicy}</Label>
              <Textarea className="mt-1" rows={3} value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} />
            </Field>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <input type="checkbox" checked={shareToSocial} onChange={(e) => setShareToSocial(e.target.checked)} />
                {ui.listingForm.shareToSocial}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <input type="checkbox" checked={allowAiCaption} onChange={(e) => setAllowAiCaption(e.target.checked)} />
                {ui.listingForm.allowAiCaption}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <input type="checkbox" checked={allowGapBooking} onChange={(e) => setAllowGapBooking(e.target.checked)} />
                {ui.listingForm.allowGapBooking}
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {ui.listingForm.pricingCardTitle}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field className="block">
                <Label>{ui.listingForm.depositAmount}</Label>
                <Input className="mt-1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.prepaymentPercent}</Label>
                <Input className="mt-1" value={prepaymentPercent} onChange={(e) => setPrepaymentPercent(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.cleaningFee}</Label>
                <Input className="mt-1" value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{ui.listingForm.pricingCleaningHint}</p>
              </Field>
            </div>
            <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {ui.listingForm.pricingShortStayHeading}
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {ui.listingForm.pricingShortStayIntro}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field className="block">
                  <Label>{ui.listingForm.minShortStayNights}</Label>
                  <Input className="mt-1" value={minShortStayNights} onChange={(e) => setMinShortStayNights(e.target.value)} />
                </Field>
                <Field className="block">
                  <Label>
                    {ui.listingForm.shortStayFee} ({listingCurrencyCode})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1"
                    value={shortStayFee}
                    onChange={(e) => setShortStayFee(e.target.value)}
                    placeholder="500"
                  />
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{ui.listingForm.shortStayFeeHint}</p>
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{ui.listingForm.ownerTitle}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field className="block">
                <Label>{ui.listingForm.ownerName}</Label>
                <Input className="mt-1" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.ownerPhone}</Label>
                <Input className="mt-1" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.ownerEmail}</Label>
                <Input className="mt-1" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{ui.listingForm.metaTitle}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field className="block">
                <Label>{ui.listingForm.checkIn}</Label>
                <Input className="mt-1" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.checkOut}</Label>
                <Input className="mt-1" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.bedCount}</Label>
                <Input className="mt-1" value={bedCount} onChange={(e) => setBedCount(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.bathCount}</Label>
                <Input className="mt-1" value={bathCount} onChange={(e) => setBathCount(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.maxGuests}</Label>
                <Input className="mt-1" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.listingForm.minAdvanceBookingDays}</Label>
                <Input className="mt-1" value={minAdvanceBookingDays} onChange={(e) => setMinAdvanceBookingDays(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>Lat</Label>
                <Input className="mt-1" value={lat} onChange={(e) => setLat(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>Lng</Label>
                <Input className="mt-1" value={lng} onChange={(e) => setLng(e.target.value)} />
              </Field>
            </div>
            {categoryCode === 'holiday_home' ? (
              <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Vitrin konumu (kartta görünen)
                </p>
                <p className="text-xs text-neutral-500">
                  Örnek: Ölüdeniz, Fethiye, Muğla — destinasyon listesinden seçebilir veya elle yazabilirsiniz.
                </p>
                {destinationOptions.length > 0 ? (
                  <Field className="block">
                    <Label>Destinasyondan doldur</Label>
                    <select
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      defaultValue=""
                      onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        const d = destinationOptions.find((x) => x.id === id)
                        if (!d) return
                        setDistrictLabel(d.title)
                        setCityDisplay(d.districtName)
                        setProvinceCity(d.regionName)
                      }}
                    >
                      <option value="">— Seçin —</option>
                      {destinationOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}, {d.districtName}, {d.regionName}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field className="block">
                    <Label>Semt / mahalle</Label>
                    <Input className="mt-1" value={districtLabel} onChange={(e) => setDistrictLabel(e.target.value)} placeholder="Ölüdeniz" />
                  </Field>
                  <Field className="block">
                    <Label>İlçe</Label>
                    <Input className="mt-1" value={cityDisplay} onChange={(e) => setCityDisplay(e.target.value)} placeholder="Fethiye" />
                  </Field>
                  <Field className="block">
                    <Label>İl</Label>
                    <Input className="mt-1" value={provinceCity} onChange={(e) => setProvinceCity(e.target.value)} placeholder="Muğla" />
                  </Field>
                </div>
              </div>
            ) : null}
            <Field className="mt-4 block">
              <Label>{ui.listingForm.address}</Label>
              <div className="mt-1">
                <PlacesAutocompleteInput
                  value={address}
                  placeholder="Adres ara veya yazın…"
                  onChange={setAddress}
                  onPlaceSelect={(place) => {
                    setAddress(place.address)
                    setLat(place.lat.toFixed(6))
                    setLng(place.lng.toFixed(6))
                  }}
                />
              </div>
            </Field>
            <Field className="mt-4 block">
              <Label>{ui.listingForm.mapPickerTitle}</Label>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {ui.listingForm.mapPickerHint}
              </p>
              <MapPicker
                className="mt-2"
                lat={lat}
                lng={lng}
                zoom={13}
                onChange={(la, lo) => {
                  setLat(la)
                  setLng(lo)
                }}
              />
            </Field>
            <div className="mt-4">
              <ButtonPrimary type="button" onClick={() => void saveListingForm()} disabled={busy === 'listing-save'}>
                {busy === 'listing-save' ? ui.common.ellipsis : ui.listingForm.saveBtn}
              </ButtonPrimary>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SEKME: MÜSAİTLİK TAKVİMİ ═══════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
              <CalendarDays className="h-5 w-5 text-primary-600" />
              {ui.calendar.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {ui.calendar.intro}
            </p>

            {/* Tarih aralığı */}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field className="block">
                <Label>{ui.calendar.start}</Label>
                <Input type="date" className="mt-1" value={calFrom} onChange={(e) => setCalFrom(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.calendar.end}</Label>
                <Input type="date" className="mt-1" value={calTo} onChange={(e) => setCalTo(e.target.value)} />
              </Field>
              <ButtonPrimary type="button" onClick={() => void loadCalendar()} disabled={busy === 'cal-load'}>
                {busy === 'cal-load' ? <RefreshCw className="h-4 w-4 animate-spin" /> : ui.calendar.loadRange}
              </ButtonPrimary>
            </div>

            {/* Toplu işlemler */}
            {calRows.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/40">
                <span className="text-xs font-semibold text-neutral-500 mr-2">{ui.calendar.bulkLabel}</span>
                <button
                  type="button"
                  onClick={() => bulkSetAll(true)}
                  className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-400"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {ui.calendar.allAvailable}
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetAll(false)}
                  className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-400"
                >
                  <XSquare className="h-3.5 w-3.5" />
                  {ui.calendar.allBlocked}
                </button>
                <button
                  type="button"
                  onClick={() => bulkMarkWeekends(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400"
                >
                  {ui.calendar.weekendsBlocked}
                </button>
                <button
                  type="button"
                  onClick={() => bulkMarkWeekends(true)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400"
                >
                  {ui.calendar.weekendsAvailable}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalRows((prev) => prev.map((r) => ({ ...r, day_status: 'option' as const })))
                  }
                  className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-transparent dark:text-amber-300"
                >
                  {ui.calendar.bulkOption}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalRows((prev) => prev.map((r) => ({ ...r, day_status: 'promo' as const })))
                  }
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-300"
                >
                  {ui.calendar.bulkPromo}
                </button>
                <button
                  type="button"
                  onClick={() => setCalRows((prev) => prev.map((r) => ({ ...r, day_status: null })))}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400"
                >
                  {ui.calendar.bulkClearStatus}
                </button>
                <div className="flex items-center gap-1 ml-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder={ui.calendar.bulkPricePlaceholder}
                    className="w-24 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <button
                    type="button"
                    onClick={applyBulkPrice}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-transparent dark:text-blue-400"
                  >
                    <Layers className="h-3.5 w-3.5 inline mr-1" />
                    {ui.calendar.applyBulkToAll}
                  </button>
                </div>
              </div>
            )}

            {/* Takvim tablosu */}
            {calRows.length > 0 ? (
              <>
                <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800/90">
                      <tr>
                        <th className="px-3 py-2 text-xs text-neutral-500">{ui.calendar.colDate}</th>
                        <th className="px-3 py-2 text-xs text-neutral-500">{ui.calendar.colDay}</th>
                        <th className="px-3 py-2 text-xs text-neutral-500">{ui.calendar.colAm}</th>
                        <th className="px-3 py-2 text-xs text-neutral-500">{ui.calendar.colPm}</th>
                        <th className="px-3 py-2 text-xs text-neutral-500">{ui.calendar.colStatus}</th>
                        <th className="px-3 py-2 text-xs text-neutral-500">{ui.calendar.colPrice}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calRows.map((row, i) => {
                        const isWeekend = row.weekday === 0 || row.weekday === 6
                        return (
                          <tr
                            key={row.day}
                            className={`border-t border-neutral-100 dark:border-neutral-800 ${isWeekend ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''} ${!row.am_available && !row.pm_available ? 'opacity-50' : ''}`}
                          >
                            <td className="px-3 py-1.5 font-mono text-xs">{row.day}</td>
                            <td className={`px-3 py-1.5 text-xs font-medium ${isWeekend ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'}`}>
                              {ui.weekdaysShort[row.weekday]}
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="checkbox"
                                checked={row.am_available}
                                onChange={(e) => {
                                  const next = [...calRows]
                                  const am = e.target.checked
                                  const pm = row.pm_available
                                  next[i] = { ...row, am_available: am, is_available: am || pm }
                                  setCalRows(next)
                                }}
                                className="h-4 w-4 accent-primary-600"
                                title={ui.calendar.amTitle}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="checkbox"
                                checked={row.pm_available}
                                onChange={(e) => {
                                  const next = [...calRows]
                                  const pm = e.target.checked
                                  const am = row.am_available
                                  next[i] = { ...row, pm_available: pm, is_available: am || pm }
                                  setCalRows(next)
                                }}
                                className="h-4 w-4 accent-primary-600"
                                title={ui.calendar.pmTitle}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <select
                                className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-900"
                                value={row.day_status ?? ''}
                                onChange={(e) => {
                                  const next = [...calRows]
                                  const v = e.target.value
                                  next[i] = {
                                    ...row,
                                    day_status:
                                      v === 'option' || v === 'promo' ? v : null,
                                  }
                                  setCalRows(next)
                                }}
                              >
                                <option value="">{ui.calendar.statusNormal}</option>
                                <option value="option">{ui.calendar.statusOption}</option>
                                <option value="promo">{ui.calendar.statusPromo}</option>
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                className="w-32 rounded border border-neutral-200 bg-white px-2 py-0.5 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-900"
                                value={row.price_override}
                                onChange={(e) => {
                                  const next = [...calRows]
                                  next[i] = { ...row, price_override: e.target.value }
                                  setCalRows(next)
                                }}
                                placeholder="—"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <ButtonPrimary type="button" onClick={() => void saveCalendar()} disabled={busy === 'cal-save'}>
                    {busy === 'cal-save' ? ui.common.ellipsis : ui.calendar.calendarSave}
                  </ButtonPrimary>
                  <p className="self-center text-xs text-neutral-400">
                    {ui.calendar.statsLine
                      .replace('{n}', String(calRows.filter((r) => r.am_available || r.pm_available).length))
                      .replace('{total}', String(calRows.length))}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-neutral-400">{ui.calendar.emptyHint}</p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
                  <ClipboardList className="h-5 w-5 shrink-0 text-primary-600" />
                  {ui.calendar.externalBookings.title}
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-neutral-500 dark:text-neutral-400">
                  {ui.calendar.externalBookings.intro}
                </p>
              </div>
              <button
                type="button"
                title={ui.calendar.externalBookings.reloadRecords}
                onClick={() => void loadExternalBookings()}
                disabled={extBusy === 'load'}
                className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <RefreshCw className={`h-4 w-4 ${extBusy === 'load' ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field className="block">
                <Label>{ui.calendar.externalBookings.stayFrom}</Label>
                <Input type="date" className="mt-1" value={ebStayFrom} onChange={(e) => setEbStayFrom(e.target.value)} />
              </Field>
              <Field className="block">
                <Label>{ui.calendar.externalBookings.stayTo}</Label>
                <Input type="date" className="mt-1" value={ebStayTo} onChange={(e) => setEbStayTo(e.target.value)} />
              </Field>
              <Field className="block sm:col-span-2">
                <Label>{ui.calendar.externalBookings.colSource}</Label>
                <Input
                  className="mt-1"
                  value={ebSource}
                  onChange={(e) => setEbSource(e.target.value)}
                  placeholder={ui.calendar.externalBookings.sourcePlaceholder}
                />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field className="block">
                <Label>{ui.calendar.externalBookings.colSold}</Label>
                <Input
                  inputMode="decimal"
                  className="mt-1 font-mono text-sm"
                  value={ebSold}
                  onChange={(e) => setEbSold(e.target.value)}
                  placeholder={ui.calendar.externalBookings.soldPlaceholder}
                />
              </Field>
              <Field className="block">
                <Label>{ui.calendar.externalBookings.colReceived}</Label>
                <Input
                  inputMode="decimal"
                  className="mt-1 font-mono text-sm"
                  value={ebReceived}
                  onChange={(e) => setEbReceived(e.target.value)}
                  placeholder={ui.calendar.externalBookings.receivedPlaceholder}
                />
              </Field>
              <Field className="block">
                <Label>{ui.calendar.externalBookings.colRemaining}</Label>
                <Input
                  inputMode="decimal"
                  className="mt-1 font-mono text-sm"
                  value={ebRemaining}
                  onChange={(e) => setEbRemaining(e.target.value)}
                  placeholder={ui.calendar.externalBookings.remainingPlaceholder}
                />
              </Field>
            </div>
            <Field className="mt-3 block">
              <Label>{ui.calendar.externalBookings.colFirstPayment}</Label>
              <Input
                className="mt-1"
                value={ebFirstPayment}
                onChange={(e) => setEbFirstPayment(e.target.value)}
                placeholder={ui.calendar.externalBookings.firstPaymentPlaceholder}
              />
            </Field>
            <Field className="mt-3 block">
              <Label>{ui.calendar.externalBookings.colNotes}</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={ebNotes}
                onChange={(e) => setEbNotes(e.target.value)}
                placeholder={ui.calendar.externalBookings.notesPlaceholder}
              />
            </Field>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonPrimary
                type="button"
                onClick={() => void saveExternalBooking()}
                disabled={extBusy === 'save' || (needOrg && !orgId.trim())}
              >
                {extBusy === 'save'
                  ? ui.common.ellipsis
                  : ebEditingId
                    ? ui.calendar.externalBookings.saveBtn
                    : ui.calendar.externalBookings.addBtn}
              </ButtonPrimary>
              {ebEditingId ? (
                <button
                  type="button"
                  onClick={() => resetExternalBookingForm()}
                  disabled={extBusy === 'save'}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  {ui.calendar.externalBookings.cancelEdit}
                </button>
              ) : null}
            </div>

            <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              {externalBookings.length === 0 ? (
                <p className="p-4 text-sm text-neutral-400">{ui.calendar.externalBookings.empty}</p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/90">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-neutral-500">
                        {ui.calendar.externalBookings.colPeriod}
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-neutral-500">
                        {ui.calendar.externalBookings.colSource}
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-neutral-500">
                        {ui.calendar.externalBookings.colSold}
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-neutral-500">
                        {ui.calendar.externalBookings.colReceived}
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-neutral-500">
                        {ui.calendar.externalBookings.colRemaining}
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-neutral-500">
                        {ui.calendar.externalBookings.colFirstPayment}
                      </th>
                      <th className="min-w-[8rem] px-3 py-2 text-xs font-medium text-neutral-500">
                        {ui.calendar.externalBookings.colNotes}
                      </th>
                      <th className="px-3 py-2 text-xs font-medium text-neutral-500"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {externalBookings.map((row) => (
                      <tr key={row.id} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
                          {row.stay_from} → {row.stay_to}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">{row.source_label || '—'}</td>
                        <td className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
                          {formatListingMoney(row.sold_total, listingCurrencyCode)}
                        </td>
                        <td className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
                          {formatListingMoney(row.amount_received, listingCurrencyCode)}
                        </td>
                        <td className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
                          {formatListingMoney(row.amount_remaining, listingCurrencyCode)}
                        </td>
                        <td className="max-w-[12rem] px-3 py-2 align-top text-xs text-neutral-700 dark:text-neutral-300">
                          {row.first_payment_note || '—'}
                        </td>
                        <td className="max-w-[14rem] px-3 py-2 align-top text-xs text-neutral-600 dark:text-neutral-400">
                          <span className="line-clamp-2" title={row.notes}>
                            {row.notes || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => beginEditExternalBooking(row)}
                              disabled={Boolean(extBusy)}
                              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                              title={ui.calendar.externalBookings.editBtn}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeExternalBooking(row.id)}
                              disabled={Boolean(extBusy)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/30"
                              title={ui.calendar.externalBookings.deleteBtn}
                            >
                              <Trash2 className="h-3 w-3" />
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

          {categoryCode === 'holiday_home' ? (
            <HolidayHomeSeasonalPricingCalendarSummary
              rules={rules}
              locale={locale}
              currencyCode={listingCurrencyCode}
              seasonalUi={ui.seasonalPrice}
              onGoToSeasonalTab={() => setActiveTab('price')}
            />
          ) : null}
        </div>
      )}

      {/* ═══ SEKME: DÖNEMSEL FİYAT ════════════════════════════════════════════ */}
      {activeTab === 'price' && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
              <Tag className="h-5 w-5 text-primary-600" />
              {ui.seasonalPrice.rulesTitle}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {ui.seasonalPrice.rulesIntro}
            </p>

            {/* Mevcut kurallar */}
            {rules.length > 0 ? (
              <div className="mt-4 space-y-2">
                {rules.map((r) => {
                  const parsed = parseRuleJson(r.rule_json)
                  return (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/40"
                    >
                      {parsed.label && (
                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                          {parsed.label}
                        </span>
                      )}
                      {parsed.base && (
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {ui.seasonalPrice.badgeBase} <span className="font-mono">{parsed.base}</span>
                        </span>
                      )}
                      {parsed.compareAt && (
                        <span className="text-sm text-amber-800 dark:text-amber-200">
                          {ui.seasonalPrice.badgeCompareAt}{' '}
                          <span className="font-mono">{parsed.compareAt}</span>
                        </span>
                      )}
                      {parsed.weekly && (
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                          {ui.seasonalPrice.badgeWeekly} <span className="font-mono">{parsed.weekly}</span>
                        </span>
                      )}
                      {parsed.weekend && (
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          {ui.seasonalPrice.badgeWeekend} <span className="font-mono">{parsed.weekend}</span>
                        </span>
                      )}
                      {parsed.minNights && (
                        <span className="text-xs text-neutral-500">
                          {ui.seasonalPrice.minNightsSuffix.replace('{n}', String(parsed.minNights))}
                        </span>
                      )}
                      {(r.valid_from || r.valid_to) && (
                        <span className="text-xs text-neutral-500 font-mono">
                          {r.valid_from ?? '∞'} → {r.valid_to ?? '∞'}
                        </span>
                      )}
                      <div className="ml-auto flex gap-2">
                        <span className="text-xs text-neutral-400 font-mono truncate max-w-[180px]" title={r.rule_json}>
                          {r.rule_json}
                        </span>
                        <button
                          type="button"
                          onClick={() => void onDeleteRule(r.id)}
                          disabled={!!busy?.startsWith('rule-del')}
                          className="text-xs text-red-600 underline dark:text-red-400"
                        >
                          {ui.common.delete}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-400">{ui.seasonalPrice.emptyRules}</p>
            )}

            {/* Yeni kural formu */}
            <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-5 dark:border-neutral-600">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-4">{ui.seasonalPrice.newPeriodTitle}</h3>
              <form onSubmit={(e) => void onAddRule(e)} className="space-y-4">
                {!showRawJson ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field className="block">
                        <Label>{ui.seasonalPrice.seasonLabel}</Label>
                        <Input
                          className="mt-1"
                          value={ruleLabel}
                          onChange={(e) => setRuleLabel(e.target.value)}
                          placeholder={ui.seasonalPrice.seasonPlaceholder}
                        />
                      </Field>
                      <Field className="block">
                        <Label>{ui.seasonalPrice.minNightsLabel}</Label>
                        <Input
                          type="number"
                          min="1"
                          className="mt-1"
                          value={ruleMinNights}
                          onChange={(e) => setRuleMinNights(e.target.value)}
                          placeholder="3"
                        />
                      </Field>
                      <Field className="block">
                        <Label>{ui.seasonalPrice.baseNightlyLabel}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="mt-1 font-mono"
                          value={ruleBase}
                          onChange={(e) => setRuleBase(e.target.value)}
                          placeholder="2500"
                        />
                      </Field>
                      <Field className="block">
                        <Label>{ui.seasonalPrice.weekendLabel}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="mt-1 font-mono"
                          value={ruleWeekend}
                          onChange={(e) => setRuleWeekend(e.target.value)}
                          placeholder="3200"
                        />
                      </Field>
                      <Field className="block sm:col-span-2">
                        <Label>{ui.seasonalPrice.compareAtNightlyLabel}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="mt-1 font-mono"
                          value={ruleCompareAt}
                          onChange={(e) => setRuleCompareAt(e.target.value)}
                          placeholder="3000"
                        />
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {ui.seasonalPrice.compareAtNightlyHint}
                        </p>
                      </Field>
                      <Field className="block sm:col-span-2">
                        <Label>{ui.seasonalPrice.weeklyTotalLabel}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="mt-1 font-mono"
                          value={ruleWeeklyTotal}
                          onChange={(e) => setRuleWeeklyTotal(e.target.value)}
                          placeholder="70000"
                        />
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{ui.seasonalPrice.weeklyTotalHint}</p>
                      </Field>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 sm:col-span-2">{ui.seasonalPrice.priceEitherHint}</p>
                      <Field className="block">
                        <Label>{ui.seasonalPrice.validFrom}</Label>
                        <Input type="date" className="mt-1" value={ruleFrom} onChange={(e) => setRuleFrom(e.target.value)} />
                      </Field>
                      <Field className="block">
                        <Label>{ui.seasonalPrice.validTo}</Label>
                        <Input type="date" className="mt-1" value={ruleTo} onChange={(e) => setRuleTo(e.target.value)} />
                      </Field>
                    </div>
                    <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500 font-mono dark:bg-neutral-800">
                      {ui.seasonalPrice.preview}{' '}
                      {buildRuleJson(ruleBase, ruleWeekend, ruleMinNights, ruleLabel, ruleWeeklyTotal, ruleCompareAt) || '—'}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Field className="block">
                      <Label>{ui.seasonalPrice.ruleJsonLabel}</Label>
                      <Textarea
                        className="mt-1 font-mono text-sm"
                        rows={3}
                        value={ruleRaw}
                        onChange={(e) => setRuleRaw(e.target.value)}
                        placeholder={ui.seasonalPrice.rawJsonPlaceholder}
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field className="block">
                        <Label>{ui.seasonalPrice.validFrom}</Label>
                        <Input type="date" className="mt-1" value={ruleFrom} onChange={(e) => setRuleFrom(e.target.value)} />
                      </Field>
                      <Field className="block">
                        <Label>{ui.seasonalPrice.validTo}</Label>
                        <Input type="date" className="mt-1" value={ruleTo} onChange={(e) => setRuleTo(e.target.value)} />
                      </Field>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonPrimary type="submit" disabled={busy === 'rule-add'}>
                    {busy === 'rule-add' ? ui.common.ellipsis : ui.seasonalPrice.addPeriodBtn}
                  </ButtonPrimary>
                  <button
                    type="button"
                    onClick={() => setShowRawJson((v) => !v)}
                    className="text-xs text-neutral-500 underline"
                  >
                    {showRawJson ? ui.seasonalPrice.toggleStructured : ui.seasonalPrice.toggleRaw}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SEKME: MEDYA & iCAL (tatil evinde yalnızca çoklu iCal — görseller tam formda) ═══ */}
      {activeTab === 'media' && (
        <div className="mt-6 space-y-10">
          {showListingGalleryInMediaTab ? (
            <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
                <Images className="h-5 w-5 text-primary-600" />
                {ui.photosTitle}
              </h2>
              <ListingImagesSection
                listingId={listingId}
                categoryCode={categoryCode}
                listingSlug={listingSlug}
                organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
              />
            </div>
          ) : null}

          <div className="space-y-5">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
              <Link2 className="h-5 w-5 text-primary-600" />
              {ui.ical.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {ui.ical.intro}
            </p>
            {categoryCode === 'holiday_home' ? <HolidayHomeIcalManagedRow listingId={listingId} /> : null}

            {/* Mevcut beslemeler */}
            {icalFeeds.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-4 py-2 text-xs">{ui.ical.tableUrl}</th>
                      <th className="px-4 py-2 text-xs">{ui.ical.dayPlus}</th>
                      <th className="px-4 py-2 text-xs">{ui.ical.dayMinus}</th>
                      <th className="px-4 py-2 text-xs">{ui.ical.lastSync}</th>
                      <th className="px-4 py-2 text-xs"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {icalFeeds.map((feed) => (
                      <tr key={feed.id} className="border-t border-neutral-100 dark:border-neutral-800">
                        {icalEditId === feed.id ? (
                          <>
                            <td className="px-4 py-2">
                              <input
                                className="w-full rounded border border-neutral-300 px-2 py-1 text-xs font-mono dark:border-neutral-600 dark:bg-neutral-900"
                                value={icalEditUrl}
                                onChange={(e) => setIcalEditUrl(e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900"
                                value={icalEditPlus}
                                onChange={(e) => setIcalEditPlus(e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900"
                                value={icalEditMinus}
                                onChange={(e) => setIcalEditMinus(e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2 text-xs text-neutral-400">{feed.last_sync_at ?? '—'}</td>
                            <td className="px-4 py-2">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void onUpdateIcal(feed.id)}
                                  disabled={!!busy?.startsWith('ical-save')}
                                  className="text-xs text-primary-600 underline"
                                >
                                  {ui.common.save}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIcalEditId(null)}
                                  className="text-xs text-neutral-500 underline"
                                >
                                  {ui.common.cancel}
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="max-w-xs truncate px-4 py-2 font-mono text-xs">
                              <div className="truncate" title={feed.url}>{feed.url}</div>
                              {feed.last_error ? (
                                <div className="mt-1 inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300" title={feed.last_error}>
                                  <span>{ui.ical.lastError}:</span>
                                  <span className="max-w-[14rem] truncate">{feed.last_error}</span>
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-2 text-xs">{feed.day_offset_plus}</td>
                            <td className="px-4 py-2 text-xs">{feed.day_offset_minus}</td>
                            <td className="px-4 py-2 text-xs text-neutral-400">
                              {feed.last_sync_at ?? ui.common.never}
                              {typeof feed.last_event_count === 'number' && feed.last_event_count > 0 ? (
                                <div className="text-[10px] text-neutral-400">{feed.last_event_count} VEVENT</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => void onSyncIcal(feed.id)}
                                  disabled={busy === `ical-sync-${feed.id}`}
                                  className="text-xs text-emerald-600 underline disabled:opacity-50 dark:text-emerald-400"
                                >
                                  {busy === `ical-sync-${feed.id}` ? ui.common.ellipsis : ui.ical.syncBtn}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIcalEditId(feed.id)
                                    setIcalEditUrl(feed.url)
                                    setIcalEditPlus(String(feed.day_offset_plus))
                                    setIcalEditMinus(String(feed.day_offset_minus))
                                  }}
                                  className="text-xs text-primary-600 underline dark:text-primary-400"
                                >
                                  {ui.common.edit}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void onDeleteIcal(feed.id)}
                                  disabled={!!busy?.startsWith('ical-del')}
                                  className="text-xs text-red-600 underline dark:text-red-400"
                                >
                                  {ui.common.delete}
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-400">{ui.ical.empty}</p>
            )}

            {/* Yeni iCal ekle */}
            <form onSubmit={(e) => void onAddIcal(e)} className="mt-6 space-y-4 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-600">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{ui.ical.addFormTitle}</h3>
              <Field className="block">
                <Label>{ui.ical.urlLabel}</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  placeholder={ui.ical.urlPlaceholder}
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="block">
                  <Label>{ui.ical.offsetPlusLabel}</Label>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1 w-24"
                    value={icalPlus}
                    onChange={(e) => setIcalPlus(e.target.value)}
                  />
                </Field>
                <Field className="block">
                  <Label>{ui.ical.offsetMinusLabel}</Label>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1 w-24"
                    value={icalMinus}
                    onChange={(e) => setIcalMinus(e.target.value)}
                  />
                </Field>
              </div>
              <ButtonPrimary type="submit" disabled={busy === 'ical-add'}>
                {busy === 'ical-add' ? ui.common.ellipsis : ui.ical.addBtn}
              </ButtonPrimary>
            </form>
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              Export URL kartı — bu ilanın .ics public URL'si.
              Airbnb / Booking / VRBO yönetim panellerine yapıştırılır.
              ───────────────────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
              <Link2 className="h-5 w-5 text-emerald-600" />
              {ui.ical.exportTitle}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">{ui.ical.exportIntro}</p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                readOnly
                aria-label={ui.ical.exportTitle}
                className="w-full flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                value={icalExportLoading ? ui.ical.exportLoading : (icalExportUrl ?? '')}
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onCopyExport()}
                  disabled={!icalExportUrl}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  {ui.ical.copyBtn}
                </button>
                <button
                  type="button"
                  onClick={() => void onRotateExport()}
                  disabled={busy === 'ical-rotate'}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                >
                  {busy === 'ical-rotate' ? ui.common.ellipsis : ui.ical.rotateBtn}
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-neutral-400">{ui.ical.rotateNote}</p>
          </div>
          </div>
        </div>
      )}

      {/* ═══ SEKME: ÖZELLİKLER — tatil evi: tip → tema → olanaklar → kurallar → dahil/hariç ═══ */}
      {activeTab === 'vertical' && (
        <div className="mt-6 space-y-10">
          {categoryCode === 'holiday_home' ? (
            <>
              <VerticalDetailsSection
                categoryCode={categoryCode}
                listingId={listingId}
                organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                holidayHomeLayout="split_cards"
              />

              <section aria-labelledby="listing-amenities-heading">
                <h3
                  id="listing-amenities-heading"
                  className="mb-1 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white"
                >
                  <Sparkles className="h-5 w-5 shrink-0 text-primary-600" />
                  {ui.holidayHome.amenitiesTitle}
                </h3>
                <p className="mb-4 max-w-3xl text-xs text-neutral-500 dark:text-neutral-400">
                  {ui.holidayHome.amenitiesIntro}
                </p>
                <ListingAttributeValuesSection
                  listingId={listingId}
                  categoryCode={categoryCode}
                  token={getStoredAuthToken() ?? ''}
                  organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                />
              </section>

              {STAY_ACCOMMODATION_RULE_CATS.has(categoryCode) ? (
                <section aria-labelledby="listing-acc-rules-heading">
                  <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
                    <h3
                      id="listing-acc-rules-heading"
                      className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white"
                    >
                      <ScrollText className="h-5 w-5 shrink-0 text-primary-600" />
                      {ui.villaHouseRulesHeading}
                    </h3>
                    <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                      {ui.villaHouseRulesIntro}
                    </p>
                    <ListingAccommodationRulesSection
                      listingId={listingId}
                      categoryCode={categoryCode}
                      token={getStoredAuthToken() ?? ''}
                      organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                      embedded
                    />
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="listing-price-lines-heading">
                <h3
                  id="listing-price-lines-heading"
                  className="mb-1 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white"
                >
                  <ListChecks className="h-5 w-5 shrink-0 text-primary-600" />
                  {ui.tabs.price_lines}
                </h3>
                <p className="mb-4 max-w-3xl text-xs text-neutral-500 dark:text-neutral-400">
                  {ui.holidayHome.priceLinesIntro}
                </p>
                <ListingPriceLinesSection
                  listingId={listingId}
                  categoryCode={categoryCode}
                  token={getStoredAuthToken() ?? ''}
                  requireOrganizationId={needOrg}
                  organizationId={orgId.trim() || undefined}
                />
              </section>
            </>
          ) : (
            <>
              <section aria-labelledby="listing-attrs-heading">
                <h3
                  id="listing-attrs-heading"
                  className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white"
                >
                  <Layers className="h-5 w-5 shrink-0 text-primary-600" />
                  {ui.tabs.attributes}
                </h3>
                <ListingAttributeValuesSection
                  listingId={listingId}
                  categoryCode={categoryCode}
                  token={getStoredAuthToken() ?? ''}
                  organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                />
              </section>

              {STAY_ACCOMMODATION_RULE_CATS.has(categoryCode) ? (
                <section aria-labelledby="listing-acc-rules-heading">
                  <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
                    <h3
                      id="listing-acc-rules-heading"
                      className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white"
                    >
                      <ScrollText className="h-5 w-5 shrink-0 text-primary-600" />
                      {ui.tabs.accommodation_rules}
                    </h3>
                    <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                      {ui.accommodationRules.panelIntro}
                    </p>
                    <ListingAccommodationRulesSection
                      listingId={listingId}
                      categoryCode={categoryCode}
                      token={getStoredAuthToken() ?? ''}
                      organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                      embedded
                    />
                  </div>
                </section>
              ) : null}

              <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
                  <Settings2 className="h-5 w-5 text-primary-600" />
                  {verticalSectionTitle(ui.verticalTitles, categoryCode)}
                </h2>
                <VerticalDetailsSection
                  categoryCode={categoryCode}
                  listingId={listingId}
                  organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
                />
              </div>

              <section aria-labelledby="listing-price-lines-heading">
                <h3
                  id="listing-price-lines-heading"
                  className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white"
                >
                  <ListChecks className="h-5 w-5 shrink-0 text-primary-600" />
                  {ui.tabs.price_lines}
                </h3>
                <ListingPriceLinesSection
                  listingId={listingId}
                  categoryCode={categoryCode}
                  token={getStoredAuthToken() ?? ''}
                  requireOrganizationId={needOrg}
                  organizationId={orgId.trim() || undefined}
                />
              </section>
            </>
          )}
        </div>
      )}

      {/* ═══ SEKME: OTEL & ODALAR (yalnızca hotel kategorisi) ════════════════ */}
      {activeTab === 'hotel' && categoryCode === 'hotel' && (
        <div className="mt-6 space-y-6">
          {/* Otel meta */}
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
              <Hotel className="h-5 w-5 text-primary-600" />
              {ui.hotel.hotelInfoTitle}
            </h2>
            {hotelDetails ? (
              <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
                <Field className="block">
                  <Label>{ui.hotel.starLabel}</Label>
                  <Input className="mt-1" value={hotelDetails.star} onChange={(e) => setHotelDetails({ ...hotelDetails, star: e.target.value })} placeholder="4.5" />
                </Field>
                <Field className="block sm:col-span-2">
                  <Label>{ui.hotel.etRef}</Label>
                  <Input className="mt-1 font-mono text-sm" value={hotelDetails.et} onChange={(e) => setHotelDetails({ ...hotelDetails, et: e.target.value })} />
                </Field>
                <Field className="block sm:col-span-2">
                  <Label>{ui.hotel.tcRef}</Label>
                  <Input className="mt-1 font-mono text-sm" value={hotelDetails.tc} onChange={(e) => setHotelDetails({ ...hotelDetails, tc: e.target.value })} />
                </Field>
                <div className="sm:col-span-2">
                  <ButtonPrimary type="button" disabled={busy === 'hotel-meta'} onClick={() => void saveHotelMeta()}>
                    {busy === 'hotel-meta' ? ui.common.ellipsis : ui.common.save}
                  </ButtonPrimary>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-400">{ui.common.loading}</p>
            )}
          </div>

          {/* Odalar */}
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{ui.hotel.roomsHeading}</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
                  Oda kartları vitrindeki “Odalar” bölümünü besler. `meta_json` içinde yatak, m², açıklama, özellik ve görsel alanları varsa kart tasarımı zenginleşir.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <Info className="h-3.5 w-3.5" /> Vitrin ile aynı veri
              </span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-3 py-2">{ui.hotel.thName}</th>
                    <th className="px-3 py-2">{ui.hotel.thCapacity}</th>
                    <th className="px-3 py-2">{ui.hotel.thBoard}</th>
                    <th className="px-3 py-2">{ui.hotel.thMetaJson}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-neutral-400">{ui.hotel.noRooms}</td>
                    </tr>
                  ) : rooms.map((r) => (
                    <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.capacity ?? '—'}</td>
                      <td className="px-3 py-2">{r.board_type ?? '—'}</td>
                      <td className="max-w-xs truncate px-3 py-2 font-mono text-xs">{r.meta_json}</td>
                      <td className="px-3 py-2">
                        <button type="button" disabled={busy?.startsWith('room')} onClick={() => void onDeleteRoom(r.id)} className="text-xs text-red-600 underline dark:text-red-400">{ui.common.delete}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form onSubmit={(e) => void onAddRoom(e)} className="mt-5 grid max-w-2xl gap-4">
              <Field className="block">
                <Label>{ui.hotel.roomName}</Label>
                <Input className="mt-1" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="block">
                  <Label>{ui.hotel.capacity}</Label>
                  <Input className="mt-1" value={roomCap} onChange={(e) => setRoomCap(e.target.value)} />
                </Field>
                <Field className="block">
                  <Label>{ui.hotel.boardType}</Label>
                  <Input className="mt-1" value={roomBoard} onChange={(e) => setRoomBoard(e.target.value)} placeholder={ui.hotel.boardPlaceholder} />
                </Field>
              </div>
              <Field className="block">
                <Label>{ui.hotel.metaJson}</Label>
                <Textarea className="mt-1 font-mono text-sm" rows={3} value={roomMeta} onChange={(e) => setRoomMeta(e.target.value)} />
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Örnek alanlar: `beds`, `bed_type`, `size_m2`, `description`, `amenities`, `image`.
                </p>
              </Field>
              <button
                type="button"
                className="w-fit text-xs font-medium text-primary-600 underline decoration-primary-600/30 underline-offset-2 hover:text-primary-700 dark:text-primary-400"
                onClick={() => setRoomMeta(HOTEL_ROOM_META_EXAMPLE)}
              >
                Örnek oda JSON’unu doldur
              </button>
              <ButtonPrimary type="submit" disabled={busy === 'room-add'}>
                {busy === 'room-add' ? ui.common.ellipsis : ui.hotel.addRoom}
              </ButtonPrimary>
            </form>
          </div>
        </div>
      )}

      {/* ═══ SEKME: YEMEK PLANLARI ════════════════════════════════════════════ */}
      {activeTab === 'meal_plans' && MEAL_PLAN_CATS.has(categoryCode) && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
                <UtensilsCrossed className="h-5 w-5 text-primary-600" />
                {ui.mealPlans.title}
              </h2>
              <button
                type="button"
                onClick={() => { mpResetForm(); setMpFormOpen(true) }}
                className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" /> {ui.mealPlans.newPlan}
              </button>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {ui.mealPlans.intro}
            </p>

            {/* Form */}
            {mpFormOpen && (
              <div className="mt-5 rounded-2xl border border-primary-200 bg-primary-50/50 p-5 dark:border-primary-800 dark:bg-primary-950/20">
                <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {mpEditId ? ui.mealPlans.formEdit : ui.mealPlans.formNew}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Plan tipi (sadece yeni oluşturmada) */}
                  {!mpEditId && (
                    <Field className="block sm:col-span-2">
                      <Label>{ui.mealPlans.planType}</Label>
                      <select
                        value={mpCode}
                        onChange={(e) => {
                          const v = e.target.value as MealPlanCode
                          setMpCode(v)
                          if (!mpLabel) setMpLabel(MEAL_PLAN_LABELS[v]?.tr ?? '')
                          if (!mpLabelEn) setMpLabelEn(MEAL_PLAN_LABELS[v]?.en ?? '')
                        }}
                        className="mt-1 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      >
                        {(Object.keys(MEAL_PLAN_LABELS) as MealPlanCode[]).map((k) => (
                          <option key={k} value={k}>{MEAL_PLAN_LABELS[k].emoji} {MEAL_PLAN_LABELS[k].tr}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field className="block">
                    <Label>{ui.mealPlans.labelTr}</Label>
                    <Input className="mt-1" value={mpLabel} onChange={(e) => setMpLabel(e.target.value)} placeholder="Yarım Pansiyon" />
                  </Field>
                  <Field className="block">
                    <Label>{ui.mealPlans.labelEn}</Label>
                    <Input className="mt-1" value={mpLabelEn} onChange={(e) => setMpLabelEn(e.target.value)} placeholder="Half Board" />
                  </Field>
                  <Field className="block">
                    <Label>{ui.mealPlans.nightlyPrice}</Label>
                    <Input className="mt-1" type="number" min="0" value={mpPrice} onChange={(e) => setMpPrice(e.target.value)} placeholder="1500" />
                  </Field>
                  <Field className="block">
                    <Label>{ui.mealPlans.currency}</Label>
                    <select
                      value={mpCurrency}
                      onChange={(e) => setMpCurrency(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      {['TRY', 'EUR', 'USD', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  {/* Dahil Öğünler */}
                  {mpCode !== 'room_only' && (
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block text-sm font-medium">{ui.mealPlans.includedMeals}</Label>
                      <div className="flex flex-wrap gap-2">
                        {MEAL_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition select-none
                            border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900
                            has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700
                            dark:has-[:checked]:border-emerald-600 dark:has-[:checked]:bg-emerald-900/30 dark:has-[:checked]:text-emerald-300">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={mpMeals.includes(opt.value)}
                              onChange={(e) =>
                                setMpMeals(e.target.checked ? [...mpMeals, opt.value] : mpMeals.filter((m) => m !== opt.value))
                              }
                            />
                            {mpMeals.includes(opt.value) ? <Check className="h-3.5 w-3.5" /> : null}
                            {opt.labelTr}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Dahil İkramlar */}
                  {mpCode !== 'room_only' && (
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block text-sm font-medium">{ui.mealPlans.includedExtras}</Label>
                      <div className="flex flex-wrap gap-2">
                        {MEAL_EXTRAS_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition select-none
                            border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900
                            has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-700
                            dark:has-[:checked]:border-sky-600 dark:has-[:checked]:bg-sky-900/30 dark:has-[:checked]:text-sky-300">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={mpExtras.includes(opt.value)}
                              onChange={(e) =>
                                setMpExtras(e.target.checked ? [...mpExtras, opt.value] : mpExtras.filter((x) => x !== opt.value))
                              }
                            />
                            {mpExtras.includes(opt.value) ? <Check className="h-3.5 w-3.5" /> : null}
                            {opt.labelTr}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Düzenleme: Aktif + Sıra */}
                  {mpEditId && (
                    <>
                      <Field className="block">
                        <Label>{ui.mealPlans.sortOrder}</Label>
                        <Input className="mt-1" type="number" value={mpSort} onChange={(e) => setMpSort(e.target.value)} />
                      </Field>
                      <Field className="flex items-center gap-2 pt-6">
                        <input
                          id="mp-active"
                          type="checkbox"
                          checked={mpActive}
                          onChange={(e) => setMpActive(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                        />
                        <label htmlFor="mp-active" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{ui.mealPlans.active}</label>
                      </Field>
                    </>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <ButtonPrimary type="button" disabled={busy === 'mp-save'} onClick={() => void mpSave()}>
                    {busy === 'mp-save' ? ui.common.ellipsis : mpEditId ? ui.mealPlans.update : ui.mealPlans.add}
                  </ButtonPrimary>
                  <button type="button" onClick={mpResetForm} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Plan listesi */}
            <div className="mt-5 space-y-3">
              {mealPlans.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  {ui.mealPlans.empty}
                </p>
              ) : (
                mealPlans.sort((a, b) => a.sort_order - b.sort_order).map((plan) => {
                  const info = MEAL_PLAN_LABELS[plan.plan_code]
                  const mealLabels = plan.included_meals.map((m) => MEAL_OPTIONS.find((o) => o.value === m)?.labelTr ?? m)
                  const extraLabels = plan.included_extras.map((e) => MEAL_EXTRAS_OPTIONS.find((o) => o.value === e)?.labelTr ?? e)
                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${
                        plan.is_active
                          ? 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                          : 'border-neutral-100 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{info?.emoji ?? '🍽️'}</span>
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{plan.label}</span>
                            {plan.label_en && <span className="ml-2 text-xs text-neutral-400">({plan.label_en})</span>}
                            {!plan.is_active && <span className="ml-2 text-xs text-neutral-400">{ui.mealPlans.inactiveBadge}</span>}
                          </div>
                        </div>
                        {(mealLabels.length > 0 || extraLabels.length > 0) && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {mealLabels.map((l) => (
                              <span key={l} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{l}</span>
                            ))}
                            {extraLabels.map((l) => (
                              <span key={l} className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">{l}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary-600 dark:text-primary-400">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: plan.currency_code, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(plan.price_per_night)}
                          <span className="ml-1 text-xs font-normal text-neutral-400">{ui.mealPlans.perNight}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => mpOpenEdit(plan)}
                          className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy === `mp-del-${plan.id}`}
                          onClick={() => void mpDelete(plan.id)}
                          className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Önizleme bilgisi */}
            {mealPlans.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                <strong>{ui.mealPlans.previewTitle}</strong>{' '}
                {mealPlans.filter((p) => p.is_active).length === 1
                  ? mealPlans.find((p) => p.is_active)?.plan_code === 'room_only'
                    ? ui.mealPlans.previewSingleRoomOnly
                    : ui.mealPlans.previewSingleWithMeals
                  : ui.mealPlans.previewMultiple.replace(
                      '{n}',
                      String(mealPlans.filter((p) => p.is_active).length),
                    )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
