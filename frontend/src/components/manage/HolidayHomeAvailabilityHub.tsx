'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import {
  initCatalogManageOrganizationFromMe,
  writeStoredCatalogOrganizationId,
} from '@/lib/catalog-manage-organization'
import { getStoredAuthProfile, getStoredAuthToken } from '@/lib/auth-storage'
import {
  getAuthMe,
  getListingAvailabilityCalendar,
  listManageCatalogListings,
  putListingAvailabilityCalendar,
  type ManageListingRow,
} from '@/lib/travel-api'
import { mergeCalendarRows, type MergedCalendarRow } from '@/lib/listing-availability-calendar-merge'
import { applyTurnoverBoundaries } from '@/lib/availability-turnover-boundaries'
import { useCatalogListingUi } from '@/hooks/useCatalogListingUi'
import { useManageT } from '@/lib/manage-i18n-context'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

function formatHubMoney(amount: number, currencyCode: string, locale: string): string {
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

function monthIsoRange(year: number, monthIndex: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const last = new Date(year, monthIndex + 1, 0).getDate()
  return {
    from: `${year}-${pad(monthIndex + 1)}-01`,
    to: `${year}-${pad(monthIndex + 1)}-${pad(last)}`,
  }
}

function buildMonthGrid(
  year: number,
  monthIndex: number,
): ({ dateStr: string; dayNum: number } | null)[] {
  const first = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const padBefore = (first.getDay() + 6) % 7
  const cells: ({ dateStr: string; dayNum: number } | null)[] = []
  for (let i = 0; i < padBefore; i++) cells.push(null)
  const ym = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ dateStr: `${ym}${String(d).padStart(2, '0')}`, dayNum: d })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function listingShortRef(id: string): string {
  const t = id.trim()
  if (t.length <= 10) return t
  return `${t.slice(0, 8)}…`
}

/** [from, to] dahil tüm günleri YYYY-MM-DD olarak üretir (aylar arası güvenli). */
function eachDayStrInclusive(fromYmd: string, toYmd: string): string[] {
  const out: string[] = []
  const [fy, fm, fd] = fromYmd.split('-').map(Number)
  const [ty, tm, td] = toYmd.split('-').map(Number)
  if (!fy || !fm || !fd || !ty || !tm || !td) return out
  const cur = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  const pad = (n: number) => String(n).padStart(2, '0')
  let guard = 0
  while (cur <= end && guard < 800) {
    out.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`)
    cur.setDate(cur.getDate() + 1)
    guard++
  }
  return out
}

export default function HolidayHomeAvailabilityHub({
  categoryCode = 'holiday_home',
}: {
  categoryCode?: 'holiday_home' | 'yacht_charter'
}) {
  const categoryLabel = categoryCode === 'yacht_charter' ? 'Yat kiralama' : 'Tatil evi'
  const t = useManageT()
  const ui = useCatalogListingUi()
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const base = vitrinPath(`/manage/catalog/${encodeURIComponent(categoryCode)}`)

  const [rows, setRows] = useState<ManageListingRow[]>([])
  const [search, setSearch] = useState('')
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  const [scopeReady, setScopeReady] = useState(false)
  const [listErr, setListErr] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const boot = new Date()
  const [viewYear, setViewYear] = useState(boot.getFullYear())
  const [viewMonthIdx, setViewMonthIdx] = useState(boot.getMonth())

  const [monthRows, setMonthRows] = useState<MergedCalendarRow[]>([])
  const [calLoading, setCalLoading] = useState(false)
  const [calSaving, setCalSaving] = useState(false)
  const [calErr, setCalErr] = useState<string | null>(null)
  const [calOk, setCalOk] = useState<string | null>(null)
  const [bulkPrice, setBulkPrice] = useState('')
  const [autoTurnover, setAutoTurnover] = useState(true)
  const [resCheckIn, setResCheckIn] = useState('')
  const [resCheckOut, setResCheckOut] = useState('')

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setNeedOrg(false)
      setScopeReady(true)
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
        if (admin) setOrgId(initCatalogManageOrganizationFromMe(me))
      })
      .catch(() => setNeedOrg(false))
      .finally(() => setScopeReady(true))
  }, [])

  const loadListings = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setListErr(t('catalog.session_missing'))
      setRows([])
      setListLoading(false)
      return
    }
    if (needOrg && !orgId.trim()) {
      setListErr(t('catalog.org_uuid_admin_error'))
      setRows([])
      setListLoading(false)
      return
    }
    setListLoading(true)
    setListErr(null)
    try {
      const r = await listManageCatalogListings(token, {
        categoryCode,
        search: search.trim() || undefined,
        organizationId: needOrg ? orgId.trim() : undefined,
        titleLocale: locale,
        page: 1,
        perPage: 500,
      })
      setRows(r.listings)
      setSelectedId((prev) => {
        if (prev && r.listings.some((x) => x.id === prev)) return prev
        return r.listings[0]?.id ?? null
      })
    } catch (e) {
      setListErr(e instanceof Error ? formatManageApiError(e.message) : t('catalog.list_error'))
      setRows([])
      setSelectedId(null)
    } finally {
      setListLoading(false)
    }
  }, [needOrg, orgId, search, t, locale])

  useEffect(() => {
    if (!scopeReady) return
    void loadListings()
  }, [loadListings, scopeReady])

  const loadMonthCalendar = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token || !selectedId) {
      setMonthRows([])
      return
    }
    if (needOrg && !orgId.trim()) {
      setMonthRows([])
      return
    }
    const orgQ = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    const { from, to } = monthIsoRange(viewYear, viewMonthIdx)
    setCalLoading(true)
    setCalErr(null)
    setCalOk(null)
    try {
      const av = await getListingAvailabilityCalendar(token, selectedId, { from, to }, orgQ)
      setMonthRows(mergeCalendarRows(from, to, av.days ?? []))
    } catch (e) {
      setCalErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('cal_load_failed'))
      setMonthRows([])
    } finally {
      setCalLoading(false)
    }
  }, [selectedId, viewYear, viewMonthIdx, needOrg, orgId])

  useEffect(() => {
    void loadMonthCalendar()
  }, [loadMonthCalendar])

  const rowByDay = useMemo(() => new Map(monthRows.map((r) => [r.day, r])), [monthRows])

  function patchDay(
    day: string,
    patch: Partial<Pick<MergedCalendarRow, 'am_available' | 'pm_available' | 'price_override'>>,
  ) {
    setMonthRows((prev) =>
      prev.map((r) => {
        if (r.day !== day) return r
        const next = { ...r, ...patch }
        if ('am_available' in patch || 'pm_available' in patch) {
          next.is_available = next.am_available || next.pm_available
        }
        return next
      }),
    )
    setCalOk(null)
  }

  function bulkMarkWeekends(available: boolean) {
    setMonthRows((prev) =>
      prev.map((r) =>
        r.weekday === 0 || r.weekday === 6
          ? { ...r, am_available: available, pm_available: available, is_available: available }
          : r,
      ),
    )
    setCalOk(null)
  }

  function applyBulkPrice() {
    if (!bulkPrice.trim()) return
    setMonthRows((prev) => prev.map((r) => ({ ...r, price_override: bulkPrice.trim() })))
    setCalOk(null)
  }

  function bulkSetAll(available: boolean) {
    setMonthRows((prev) =>
      prev.map((r) => ({ ...r, am_available: available, pm_available: available, is_available: available })),
    )
    setCalOk(null)
  }

  /**
   * Rezervasyon aralığını turnover modeliyle uygula (block) veya boşalt (free).
   * - Giriş günü: yalnız ÖS kapatılır/açılır (ÖÖ korunur → bitişik çıkışla turnover).
   * - Ara geceler: tam kapalı/açık.
   * - Çıkış günü: yalnız ÖÖ kapatılır/açılır (ÖS korunur → bitişik girişle turnover).
   * Fiyat override ve sınır günlerin diğer yarımı korunur. Aylar arası çalışır.
   */
  async function applyReservationRange(block: boolean) {
    const token = getStoredAuthToken()
    if (!token || !selectedId) return
    const ci = resCheckIn.trim()
    const co = resCheckOut.trim()
    if (!ci || !co) {
      setCalErr('Giriş ve çıkış tarihi girin.')
      return
    }
    if (ci >= co) {
      setCalErr('Çıkış tarihi girişten sonra olmalı.')
      return
    }
    if (needOrg && !orgId.trim()) return
    const orgQ = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    setCalSaving(true)
    setCalErr(null)
    setCalOk(null)
    try {
      // Sınır günlerinin diğer yarımını + gecelik fiyat override'ları korumak için
      // mevcut değerleri oku (turnover'ın bozulmaması için şart).
      const existing = await getListingAvailabilityCalendar(token, selectedId, { from: ci, to: co }, orgQ)
      const byDay = new Map((existing.days ?? []).map((d) => [d.day.trim(), d]))
      const days = eachDayStrInclusive(ci, co).map((d) => {
        const ex = byDay.get(d)
        const exAm = ex?.am_available ?? ex?.is_available ?? true
        const exPm = ex?.pm_available ?? ex?.is_available ?? true
        const price = ex?.price_override?.trim() ?? ''
        let am: boolean
        let pm: boolean
        if (d === ci) {
          am = exAm
          pm = block ? false : true
        } else if (d === co) {
          am = block ? false : true
          pm = exPm
        } else {
          am = !block
          pm = !block
        }
        return {
          day: d,
          is_available: am || pm,
          am_available: am,
          pm_available: pm,
          price_override: price,
        }
      })
      await putListingAvailabilityCalendar(token, selectedId, { days }, orgQ)
      await loadMonthCalendar()
      setCalOk(block ? 'Rezervasyon aralığı bloklandı (turnover) ✓' : 'Aralık boşaltıldı ✓')
    } catch (e) {
      setCalErr(
        e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('cal_save_failed'),
      )
    } finally {
      setCalSaving(false)
    }
  }

  async function saveMonthCalendar() {
    const token = getStoredAuthToken()
    if (!token || !selectedId) return
    if (needOrg && !orgId.trim()) return
    const orgQ = needOrg && orgId.trim() ? { organizationId: orgId.trim() } : undefined
    setCalSaving(true)
    setCalErr(null)
    setCalOk(null)
    try {
      const rowsToSave = autoTurnover ? applyTurnoverBoundaries(monthRows) : monthRows
      await putListingAvailabilityCalendar(
        token,
        selectedId,
        {
          days: rowsToSave.map((r) => ({
            day: r.day,
            is_available: r.am_available || r.pm_available,
            am_available: r.am_available,
            pm_available: r.pm_available,
            price_override: r.price_override.trim(),
          })),
        },
        orgQ,
      )
      await loadMonthCalendar()
      setCalOk(`${ui.calendar.calendarSave} ✓`)
    } catch (e) {
      setCalErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('cal_save_failed'))
    } finally {
      setCalSaving(false)
    }
  }

  const selectedRow = selectedId ? rows.find((r) => r.id === selectedId) : undefined

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonthIdx), [viewYear, viewMonthIdx])

  const monthTitle = useMemo(() => {
    const tag = locale === 'tr' ? 'tr-TR' : 'en-GB'
    return new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(
      new Date(viewYear, viewMonthIdx, 1),
    )
  }, [locale, viewYear, viewMonthIdx])

  const todayStr = new Date().toISOString().slice(0, 10)

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonthIdx + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonthIdx(d.getMonth())
  }

  function goToday() {
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonthIdx(d.getMonth())
  }

  const saveOrg = () => {
    writeStoredCatalogOrganizationId(getStoredAuthProfile()?.email ?? '', orgId)
    void loadListings()
  }

  const statsAvail = monthRows.filter((r) => r.am_available || r.pm_available).length

  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        Katalog
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Kullanılabilirlik
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{categoryLabel}</p>

      <p className="mt-4 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
        İlan seçin; görünen ay için günlük{' '}
        <strong className="font-medium text-neutral-900 dark:text-white">ÖÖ / ÖS</strong> müsaitliği ve{' '}
        <strong className="font-medium text-neutral-900 dark:text-white">gecelik fiyat override</strong> değerlerini
        doğrudan düzenleyin. Kayıt yalnızca bu ayın günlerini günceller (diğer tarihler etkilenmez). Dönemsel fiyat
        kuralları ve iCal için gelişmiş panele geçin.
      </p>

      {needOrg ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="block max-w-xl">
            <Label>{t('catalog.org_uuid_label')}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="a0000000-0000-4000-8000-000000000001"
                className="min-w-[280px] flex-1 font-mono text-sm"
              />
              <ButtonPrimary type="button" onClick={() => saveOrg()}>
                {t('catalog.save_load')}
              </ButtonPrimary>
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('catalog.org_uuid_hint')}</p>
          </Field>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:max-w-sm lg:border-r lg:border-neutral-200 lg:pr-6 dark:lg:border-neutral-700">
          <Field className="block">
            <Label>{t('catalog.search_placeholder')}</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadListings()
              }}
            />
          </Field>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-primary-600 underline dark:text-primary-400"
            onClick={() => void loadListings()}
          >
            {listLoading ? '…' : 'Listeyi yenile'}
          </button>
          {listErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{listErr}</p> : null}

          <div className="mt-4 max-h-[min(70vh,520px)] space-y-1 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/40 p-2 dark:border-neutral-700 dark:bg-neutral-900/30">
            {listLoading ? (
              <p className="px-2 py-4 text-sm text-neutral-500">{ui.common.loading}</p>
            ) : rows.length === 0 ? (
              <p className="px-2 py-4 text-sm text-neutral-500">{t('catalog.no_rows')}</p>
            ) : (
              rows.map((row) => {
                const active = row.id === selectedId
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`flex w-full flex-col items-start rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? 'border-primary-500 bg-white shadow-sm dark:border-primary-600 dark:bg-neutral-900'
                        : 'border-transparent bg-white/70 hover:border-neutral-200 dark:bg-neutral-900/40 dark:hover:border-neutral-600'
                    }`}
                  >
                    <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      #{listingShortRef(row.id)}
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.title?.trim() || '—'}</span>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {!selectedRow ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{ui.calendar.emptyHint}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-700">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{monthTitle}</h2>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {selectedRow.title}{' '}
                    <span className="font-mono text-[10px] text-neutral-400">({selectedRow.id})</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={goToday}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    Bugün
                  </button>
                  <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <button
                      type="button"
                      aria-label="Önceki ay"
                      onClick={() => shiftMonth(-1)}
                      className="p-2 text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Sonraki ay"
                      onClick={() => shiftMonth(1)}
                      className="p-2 text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={calLoading}
                    onClick={() => void loadMonthCalendar()}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${calLoading ? 'animate-spin' : ''}`} />
                    Ayı yenile
                  </button>
                  <Link
                    href={`${base}/listings/${encodeURIComponent(selectedRow.id)}/advanced`}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    Gelişmiş panel →
                  </Link>
                </div>
              </div>

              {calErr ? (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{calErr}</p>
              ) : null}
              {calOk ? (
                <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{calOk}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-3 text-xs dark:border-neutral-700 dark:bg-neutral-900/40">
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">{ui.calendar.bulkLabel}</span>
                <button
                  type="button"
                  onClick={() => bulkSetAll(true)}
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  {ui.calendar.allAvailable}
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetAll(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  {ui.calendar.allBlocked}
                </button>
                <button
                  type="button"
                  onClick={() => bulkMarkWeekends(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  {ui.calendar.weekendsBlocked}
                </button>
                <button
                  type="button"
                  onClick={() => bulkMarkWeekends(true)}
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  {ui.calendar.weekendsAvailable}
                </button>
                <Input
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder={ui.calendar.bulkPricePlaceholder}
                  className="h-8 w-24 text-xs"
                />
                <button
                  type="button"
                  onClick={() => applyBulkPrice()}
                  className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 font-medium text-primary-800 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200"
                >
                  {ui.calendar.applyBulkToAll}
                </button>
                <label
                  className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300"
                  title="Rezervasyon aralıklarının ilk günü sabah çıkışa, son günü öğleden sonra girişe açılır. Bakım için kapatın."
                >
                  <input
                    type="checkbox"
                    checked={autoTurnover}
                    onChange={(e) => setAutoTurnover(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary-600"
                  />
                  Turnover sınırlarını aç
                </label>
                <ButtonPrimary
                  type="button"
                  disabled={calSaving || calLoading || monthRows.length === 0}
                  onClick={() => void saveMonthCalendar()}
                  className="text-xs"
                >
                  {calSaving ? ui.common.ellipsis : ui.calendar.calendarSave}
                </ButtonPrimary>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-3 text-xs dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <span className="w-full font-semibold text-neutral-700 dark:text-neutral-200">
                  Rezervasyon aralığı (otomatik turnover)
                </span>
                <span className="w-full text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  Giriş–çıkış tarihi girin: giriş günü öğleden sonra dolu, aradaki geceler tam dolu, çıkış günü
                  öğleden önce dolu işaretlenir. Böylece aynı gün başka rezervasyon için giriş günü sabahı çıkış,
                  çıkış günü öğleden sonra yeni giriş açık kalır. Sınır günlerin diğer yarımı ve fiyatlar korunur.
                </span>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-neutral-500">Giriş</span>
                  <input
                    type="date"
                    value={resCheckIn}
                    onChange={(e) => setResCheckIn(e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-600 dark:bg-neutral-900"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-neutral-500">Çıkış</span>
                  <input
                    type="date"
                    value={resCheckOut}
                    onChange={(e) => setResCheckOut(e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-600 dark:bg-neutral-900"
                  />
                </label>
                <button
                  type="button"
                  disabled={calSaving || !resCheckIn || !resCheckOut}
                  onClick={() => void applyReservationRange(true)}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Rezervasyonu blokla
                </button>
                <button
                  type="button"
                  disabled={calSaving || !resCheckIn || !resCheckOut}
                  onClick={() => void applyReservationRange(false)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Aralığı boşalt
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                    <div key={dow} className="py-2">
                      {ui.weekdaysShort[dow]}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {grid.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="min-h-[96px] rounded-lg bg-transparent" />
                    }
                    const row = rowByDay.get(cell.dateStr)
                    const blocked = row ? !row.am_available && !row.pm_available : true
                    const priceRaw = row?.price_override?.trim() ?? ''
                    const priceNum =
                      priceRaw && Number.isFinite(Number.parseFloat(priceRaw.replace(',', '.')))
                        ? Number.parseFloat(priceRaw.replace(',', '.'))
                        : null
                    const isToday = cell.dateStr === todayStr

                    return (
                      <div
                        key={cell.dateStr}
                        className={`flex min-h-[104px] flex-col rounded-lg border p-1.5 ${
                          isToday
                            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
                            : 'border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900/60'
                        } ${blocked ? 'opacity-70' : ''}`}
                      >
                        <span className="text-center text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                          {cell.dayNum}
                        </span>
                        {row ? (
                          <>
                            <div className="mt-1 flex items-center justify-center gap-1">
                              <label className="flex cursor-pointer items-center gap-0.5" title={ui.calendar.amTitle}>
                                <input
                                  type="checkbox"
                                  checked={row.am_available}
                                  onChange={(e) =>
                                    patchDay(cell.dateStr, { am_available: e.target.checked })
                                  }
                                  className="h-3 w-3 accent-primary-600"
                                />
                                <span className="text-[9px] text-neutral-500">ÖÖ</span>
                              </label>
                              <label className="flex cursor-pointer items-center gap-0.5" title={ui.calendar.pmTitle}>
                                <input
                                  type="checkbox"
                                  checked={row.pm_available}
                                  onChange={(e) =>
                                    patchDay(cell.dateStr, { pm_available: e.target.checked })
                                  }
                                  className="h-3 w-3 accent-primary-600"
                                />
                                <span className="text-[9px] text-neutral-500">ÖS</span>
                              </label>
                            </div>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.price_override}
                              onChange={(e) => patchDay(cell.dateStr, { price_override: e.target.value })}
                              placeholder="₺"
                              className="mt-1 w-full rounded border border-neutral-200 bg-white px-0.5 py-0.5 text-center text-[10px] dark:border-neutral-600 dark:bg-neutral-900"
                              aria-label={`${cell.dateStr} ${ui.calendar.colPrice}`}
                            />
                            {priceNum != null ? (
                              <span className="mt-0.5 truncate text-center text-[9px] font-medium text-primary-600 dark:text-primary-400">
                                {formatHubMoney(priceNum, selectedRow.currency_code, locale)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="mt-2 text-center text-[9px] text-neutral-400">…</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {calLoading ? (
                <p className="mt-4 text-sm text-neutral-500">{ui.common.loading}</p>
              ) : monthRows.length > 0 ? (
                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {ui.calendar.statsLine
                    .replace('{n}', String(statsAvail))
                    .replace('{total}', String(monthRows.length))}
                </p>
              ) : null}

              <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-400">
                Override girmediğiniz günlerde vitrin fiyatı dönemsel kurallardan gelir. Bu ekranda kaydettiğiniz
                değerler <span className="font-mono">listing_availability_calendar</span> tablosuna yazılır (yalnızca
                görünen ayın günleri).
              </p>
            </>
          )}
        </section>
      </div>

      <p className="mt-10 text-sm">
        <Link href={base} className="text-primary-600 underline dark:text-primary-400">
          ← Kategori özeti
        </Link>
      </p>
    </div>
  )
}
