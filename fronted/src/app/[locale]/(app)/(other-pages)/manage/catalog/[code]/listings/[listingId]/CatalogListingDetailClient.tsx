'use client'

import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import { useManageT } from '@/lib/manage-i18n-context'
import { useCatalogListingUi, type CatalogListingUi } from '@/hooks/useCatalogListingUi'
import {
  addManageHotelRoom,
  deleteListingPriceRule,
  deleteManageHotelRoom,
  getAuthMe,
  getListingAvailabilityCalendar,
  getManageHotelDetails,
  listListingPriceRules,
  listManageHotelRooms,
  patchManageHotelDetails,
  putListingAvailabilityCalendar,
  createListingPriceRule,
  listIcalFeeds,
  createIcalFeed,
  patchIcalFeed,
  deleteIcalFeed,
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
  MEAL_PLAN_LABELS,
  MEAL_OPTIONS,
  MEAL_EXTRAS_OPTIONS,
  type AttributeGroup,
  type AttributeDef,
  type IcalFeed,
  type ListingAvailabilityDay,
  type ListingPriceRuleRow,
  type ManageHotelRoomRow,
  type MealPlanItem,
  type MealPlanCode,
  type PriceLineItem,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { VerticalDetailsSection } from '../../../VerticalDetailsSection'
import ListingImagesSection from '../../../ListingImagesSection'

const ORG_STORAGE_KEY = 'catalog_manage_organization_id'

function verticalSectionTitle(verticalTitles: CatalogListingUi['verticalTitles'], categoryCode: string) {
  const m = verticalTitles as Record<string, string>
  return m[categoryCode] ?? m.default
}

/** Konaklama vitrininde kural seçimi — otel / tatil evi / yat */
const STAY_ACCOMMODATION_RULE_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])

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

function mergeCalendarRows(
  from: string,
  to: string,
  apiDays: ListingAvailabilityDay[],
): {
  day: string
  is_available: boolean
  am_available: boolean
  pm_available: boolean
  price_override: string
  weekday: number
}[] {
  const map = new Map(apiDays.map((x) => [x.day, x]))
  const out: {
    day: string
    is_available: boolean
    am_available: boolean
    pm_available: boolean
    price_override: string
    weekday: number
  }[] = []
  let cur = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    const ex = map.get(key)
    const am = ex?.am_available ?? ex?.is_available ?? true
    const pm = ex?.pm_available ?? ex?.is_available ?? true
    const ia = ex?.is_available ?? (am || pm)
    out.push({
      day: key,
      weekday: cur.getDay(), // 0=Paz, 6=Cmt
      is_available: ia,
      am_available: am,
      pm_available: pm,
      price_override: ex?.price_override ?? '',
    })
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

// Ham rule_json'dan okunabilir alan çıkar
function parseRuleJson(json: string): { base: string; weekend: string; minNights: string; label: string } {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>
    return {
      base: String(obj.base_nightly ?? obj.base_price ?? ''),
      weekend: String(obj.weekend_nightly ?? obj.weekend_price ?? ''),
      minNights: String(obj.min_nights ?? obj.minimum_nights ?? ''),
      label: String(obj.label ?? obj.season_name ?? ''),
    }
  } catch {
    return { base: '', weekend: '', minNights: '', label: '' }
  }
}

function buildRuleJson(base: string, weekend: string, minNights: string, label: string): string {
  const obj: Record<string, string | number> = {}
  if (label.trim()) obj.label = label.trim()
  if (base.trim()) obj.base_nightly = base.trim()
  if (weekend.trim()) obj.weekend_nightly = weekend.trim()
  if (minNights.trim()) obj.min_nights = parseInt(minNights.trim(), 10)
  return JSON.stringify(obj)
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
        const gs = gRes.groups
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
        // build values map
        const vm: Record<string, string> = {}
        for (const v of vRes.values) {
          const raw = v.value_json
          // strip surrounding quotes for string JSON
          vm[`${v.group_code}.${v.key}`] = raw.startsWith('"') ? JSON.parse(raw) as string : raw
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
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100'

  if (loading) return <p className="text-sm text-neutral-400">{ui.common.loading}</p>

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {ui.attr.emptyGroupsTitle}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {ui.attr.emptyGroupsHint}
        </p>
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
                        {(JSON.parse(d.options_json) as string[]).map((opt) => (
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
        {busy ? ui.common.ellipsis : ui.attrSaveBtn}
      </ButtonPrimary>
    </div>
  )
}

// ─── Konaklama kuralları (kategori şablonu — giriş/çıkış hariç) ───────────────
function ListingAccommodationRulesSection({
  listingId,
  categoryCode,
  token,
  organizationId,
}: {
  listingId: string
  categoryCode: string
  token: string
  organizationId?: string
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

  const orgQ = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined

  useEffect(() => {
    if (!token) return
    setLoading(true)
    void Promise.all([
      getManageCategoryAccommodationRules(token, categoryCode, orgQ),
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
  }, [listingId, categoryCode, token, orgQ])

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
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
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
      <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {ui.accommodationRules.emptyTitle}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {ui.accommodationRules.emptyHint}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{ui.accommodationRules.panelTitle}</h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {ui.accommodationRules.panelIntro}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
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
        {busy ? ui.common.ellipsis : ui.rulesSaveBtn}
      </ButtonPrimary>
    </div>
  )
}

// ─── Dahil / Hariç (fiyat katalogundan çok dilli etiket) ──────────────────────
function ListingPriceLinesSection({
  listingId,
  categoryCode,
  token,
}: {
  listingId: string
  categoryCode: string
  token: string
}) {
  const ui = useCatalogListingUi()
  const params = useParams()
  const loc = typeof params?.locale === 'string' ? params.locale : 'tr'
  const [items, setItems] = useState<PriceLineItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    void Promise.all([
      listPriceLineItems(token, { categoryCode, locale: loc }),
      getListingPriceLineSelections(token, listingId),
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
  }, [listingId, categoryCode, token, loc])

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
      await putListingPriceLineSelections(token, listingId, { item_ids: [...selected] })
      setMsg({ ok: true, text: ui.priceLinesSaveOk })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'save_failed' })
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

  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
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
  const [ruleMinNights, setRuleMinNights] = useState('')
  const [ruleFrom, setRuleFrom] = useState('')
  const [ruleTo, setRuleTo] = useState('')
  const [showRawJson, setShowRawJson] = useState(false)
  const [ruleRaw, setRuleRaw] = useState('')

  // ── Müsaitlik takvimi ──
  const [calFrom, setCalFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [calTo, setCalTo] = useState(() => addDaysIso(new Date().toISOString().slice(0, 10), 90))
  const [calRows, setCalRows] = useState<ReturnType<typeof mergeCalendarRows>>([])
  const [bulkPrice, setBulkPrice] = useState('')

  // ── iCal ──
  const [icalFeeds, setIcalFeeds] = useState<IcalFeed[]>([])
  const [icalUrl, setIcalUrl] = useState('')
  const [icalPlus, setIcalPlus] = useState('0')
  const [icalMinus, setIcalMinus] = useState('0')
  const [icalEditId, setIcalEditId] = useState<string | null>(null)
  const [icalEditUrl, setIcalEditUrl] = useState('')
  const [icalEditPlus, setIcalEditPlus] = useState('0')
  const [icalEditMinus, setIcalEditMinus] = useState('0')

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
  const MEAL_PLAN_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])
  const CALENDAR_INIT_CATS = new Set(['hotel', 'holiday_home', 'yacht_charter'])
  const [activeTab, setActiveTab] = useState<
    | 'calendar'
    | 'price'
    | 'ical'
    | 'vertical'
    | 'attributes'
    | 'price_lines'
    | 'accommodation_rules'
    | 'photos'
    | 'hotel'
    | 'meal_plans'
  >(CALENDAR_INIT_CATS.has(categoryCode) ? 'calendar' : 'vertical')

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
      })
      .catch(() => {})
  }, [categoryCode, listingId, needOrg, orgId])

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) return
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (admin && typeof window !== 'undefined') {
          setOrgId(window.localStorage.getItem(ORG_STORAGE_KEY) ?? '')
        }
      })
      .catch(() => {})
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
      setErr(e instanceof Error ? e.message : 'cal_load_failed')
    } finally {
      setBusy(null)
    }
  }, [listingId, needOrg, orgId, orgQ, calFrom, calTo])

  // İlk yükleme
  useEffect(() => {
    if (needOrg && !orgId.trim()) return
    void loadPriceRules()
    void loadHotel()
    void loadIcal()
    void loadCalendar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needOrg, orgId])

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
          })),
        },
        orgQ,
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'cal_save_failed')
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
      const finalJson = showRawJson
        ? ruleRaw.trim()
        : buildRuleJson(ruleBase, ruleWeekend, ruleMinNights, ruleLabel)
      await createListingPriceRule(
        token,
        listingId,
        { rule_json: finalJson, valid_from: ruleFrom.trim() || undefined, valid_to: ruleTo.trim() || undefined },
        orgQ,
      )
      setRuleLabel(''); setRuleBase(''); setRuleWeekend(''); setRuleMinNights(''); setRuleFrom(''); setRuleTo(''); setRuleRaw('')
      await loadPriceRules()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'rule_add_failed')
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
      setErr(e instanceof Error ? e.message : 'rule_del_failed')
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
      setErr(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setBusy(null)
    }
  }

  // ── Oda ekle ──
  async function onAddRoom(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !roomName.trim()) return
    setBusy('room-add')
    setErr(null)
    try {
      await addManageHotelRoom(token, listingId, { name: roomName.trim(), capacity: roomCap.trim() || undefined, board_type: roomBoard.trim() || undefined, meta_json: roomMeta.trim() || '{}' }, orgQ)
      setRoomName(''); setRoomCap(''); setRoomBoard(''); setRoomMeta('{}')
      await loadHotel()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'room_add_failed')
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
      setErr(e instanceof Error ? e.message : 'room_del_failed')
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
      setErr(e instanceof Error ? e.message : 'ical_add_failed')
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
      setErr(e instanceof Error ? e.message : 'ical_update_failed')
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
      setErr(e instanceof Error ? e.message : 'ical_del_failed')
    } finally {
      setBusy(null)
    }
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ORG_STORAGE_KEY, orgId.trim())
    }
    void loadPriceRules()
    void loadHotel()
    void loadCalendar()
    void loadIcal()
    void loadMealPlans()
  }

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
      setErr(e instanceof Error ? e.message : 'meal_plan_save_failed')
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
      setErr(e instanceof Error ? e.message : 'meal_plan_del_failed')
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
    ...(hasCalendar ? [{ id: 'calendar' as const, label: ui.tabs.calendar, Icon: CalendarDays }] : []),
    { id: 'price' as const, label: ui.tabs.price, Icon: Tag },
    { id: 'ical' as const, label: ui.tabs.ical, Icon: Link2 },
    { id: 'photos' as const, label: ui.tabs.photos, Icon: Images },
    { id: 'vertical' as const, label: ui.tabs.vertical, Icon: Settings2 },
    { id: 'attributes' as const, label: ui.tabs.attributes, Icon: Settings2 },
    { id: 'price_lines' as const, label: ui.tabs.price_lines, Icon: ListChecks },
    ...(STAY_ACCOMMODATION_RULE_CATS.has(categoryCode)
      ? [{ id: 'accommodation_rules' as const, label: ui.tabs.accommodation_rules, Icon: ScrollText }]
      : []),
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
                      {ui.seasonalPrice.preview} {buildRuleJson(ruleBase, ruleWeekend, ruleMinNights, ruleLabel) || '—'}
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

      {/* ═══ SEKME: iCAL SENKRONU ════════════════════════════════════════════ */}
      {activeTab === 'ical' && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
              <Link2 className="h-5 w-5 text-primary-600" />
              {ui.ical.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {ui.ical.intro}
            </p>

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
                            <td className="max-w-xs truncate px-4 py-2 font-mono text-xs">{feed.url}</td>
                            <td className="px-4 py-2 text-xs">{feed.day_offset_plus}</td>
                            <td className="px-4 py-2 text-xs">{feed.day_offset_minus}</td>
                            <td className="px-4 py-2 text-xs text-neutral-400">{feed.last_sync_at ?? ui.common.never}</td>
                            <td className="px-4 py-2">
                              <div className="flex gap-3">
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
        </div>
      )}

      {/* ═══ SEKME: GÖRSELLER ═══════════════════════════════════════════════ */}
      {activeTab === 'photos' && (
        <div className="mt-6">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white mb-4">
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
        </div>
      )}

      {/* ═══ SEKME: KATEGORİ ÖZELLİKLERİ ════════════════════════════════════ */}
      {activeTab === 'vertical' && (
        <div className="mt-6">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white mb-4">
              <Settings2 className="h-5 w-5 text-primary-600" />
              {verticalSectionTitle(ui.verticalTitles, categoryCode)}
            </h2>
            <VerticalDetailsSection categoryCode={categoryCode} listingId={listingId} />
          </div>
        </div>
      )}

      {/* ═══ SEKME: ÖZNİTELİKLER ══════════════════════════════════════════════ */}
      {activeTab === 'attributes' && (
        <div className="mt-6">
          <ListingAttributeValuesSection
            listingId={listingId}
            categoryCode={categoryCode}
            token={getStoredAuthToken() ?? ''}
            organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
          />
        </div>
      )}

      {/* ═══ SEKME: DAHİL / HARİÇ ══════════════════════════════════════════════ */}
      {activeTab === 'price_lines' && (
        <div className="mt-6">
          <ListingPriceLinesSection
            listingId={listingId}
            categoryCode={categoryCode}
            token={getStoredAuthToken() ?? ''}
          />
        </div>
      )}

      {activeTab === 'accommodation_rules' && STAY_ACCOMMODATION_RULE_CATS.has(categoryCode) && (
        <div className="mt-6">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
              <ScrollText className="h-5 w-5 text-primary-600" />
              {ui.accommodationRulesTitle}
            </h2>
            <ListingAccommodationRulesSection
              listingId={listingId}
              categoryCode={categoryCode}
              token={getStoredAuthToken() ?? ''}
              organizationId={needOrg && orgId.trim() ? orgId.trim() : undefined}
            />
          </div>
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
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{ui.hotel.roomsHeading}</h2>
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
              </Field>
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
