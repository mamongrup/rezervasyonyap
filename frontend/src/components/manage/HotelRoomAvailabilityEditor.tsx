'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  getHotelRoomAvailabilityCalendar,
  listManageHotelRooms,
  putHotelRoomAvailabilityCalendar,
  type ManageHotelRoomRow,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type AvailRow = {
  day: string
  available_units: number
  price_override: string
  weekday: number
}

function monthIsoRange(year: number, monthIndex: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const last = new Date(year, monthIndex + 1, 0).getDate()
  return {
    from: `${year}-${pad(monthIndex + 1)}-01`,
    to: `${year}-${pad(monthIndex + 1)}-${pad(last)}`,
  }
}

function buildMonthRows(
  from: string,
  to: string,
  apiDays: { day: string; available_units: number; price_override: string | null }[],
  defaultUnits: number,
): AvailRow[] {
  const byDay = new Map(apiDays.map((d) => [d.day, d]))
  const rows: AvailRow[] = []
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().slice(0, 10)
    const hit = byDay.get(day)
    rows.push({
      day,
      available_units: hit?.available_units ?? defaultUnits,
      price_override: hit?.price_override ?? '',
      weekday: d.getDay(),
    })
  }
  return rows
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

const WEEKDAY_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function HotelRoomAvailabilityEditor({
  listingId,
  organizationId,
}: {
  listingId: string
  organizationId?: string
}) {
  const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined

  const [rooms, setRooms] = useState<ManageHotelRoomRow[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [selectedRoomId, setSelectedRoomId] = useState('')

  const boot = new Date()
  const [viewYear, setViewYear] = useState(boot.getFullYear())
  const [viewMonthIdx, setViewMonthIdx] = useState(boot.getMonth())

  const [rows, setRows] = useState<AvailRow[]>([])
  const [calLoading, setCalLoading] = useState(false)
  const [calSaving, setCalSaving] = useState(false)
  const [calErr, setCalErr] = useState<string | null>(null)
  const [calOk, setCalOk] = useState<string | null>(null)
  const [bulkPrice, setBulkPrice] = useState('')

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)
  const maxUnits = Math.max(1, selectedRoom?.unit_count ?? 1)

  const loadRooms = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setRoomsLoading(false)
      return
    }
    setRoomsLoading(true)
    try {
      const res = await listManageHotelRooms(token, listingId, orgParam)
      const list = res.rooms ?? []
      setRooms(list)
      setSelectedRoomId((prev) => (prev && list.some((r) => r.id === prev) ? prev : list[0]?.id ?? ''))
    } catch {
      setRooms([])
      setSelectedRoomId('')
    } finally {
      setRoomsLoading(false)
    }
  }, [listingId, organizationId])

  useEffect(() => {
    void loadRooms()
  }, [loadRooms])

  const monthRange = useMemo(
    () => monthIsoRange(viewYear, viewMonthIdx),
    [viewYear, viewMonthIdx],
  )

  const loadCalendar = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token || !selectedRoomId) return
    setCalLoading(true)
    setCalErr(null)
    setCalOk(null)
    try {
      const res = await getHotelRoomAvailabilityCalendar(
        token,
        listingId,
        selectedRoomId,
        monthRange,
        orgParam,
      )
      setRows(buildMonthRows(monthRange.from, monthRange.to, res.days ?? [], maxUnits))
    } catch (e) {
      setCalErr(
        e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('availability_load_failed'),
      )
    } finally {
      setCalLoading(false)
    }
  }, [listingId, selectedRoomId, monthRange, maxUnits, organizationId])

  useEffect(() => {
    if (selectedRoomId) void loadCalendar()
  }, [selectedRoomId, loadCalendar])

  function setDayUnits(day: string, units: number) {
    const clamped = Math.min(Math.max(0, units), maxUnits)
    setRows((prev) => prev.map((r) => (r.day === day ? { ...r, available_units: clamped } : r)))
  }

  function bulkSetUnits(units: number) {
    const clamped = Math.min(Math.max(0, units), maxUnits)
    setRows((prev) => prev.map((r) => ({ ...r, available_units: clamped })))
  }

  function applyBulkPrice() {
    if (!bulkPrice.trim()) return
    setRows((prev) => prev.map((r) => ({ ...r, price_override: bulkPrice.trim() })))
  }

  async function saveCalendar() {
    const token = getStoredAuthToken()
    if (!token || !selectedRoomId) return
    setCalSaving(true)
    setCalErr(null)
    setCalOk(null)
    try {
      await putHotelRoomAvailabilityCalendar(
        token,
        listingId,
        selectedRoomId,
        {
          days: rows.map((r) => ({
            day: r.day,
            available_units: r.available_units,
            price_override: r.price_override.trim() || null,
          })),
        },
        orgParam,
      )
      setCalOk('Oda müsaitliği kaydedildi.')
    } catch (e) {
      setCalErr(
        e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('availability_save_failed'),
      )
    } finally {
      setCalSaving(false)
    }
  }

  function prevMonth() {
    if (viewMonthIdx === 0) {
      setViewYear((y) => y - 1)
      setViewMonthIdx(11)
    } else setViewMonthIdx((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonthIdx === 11) {
      setViewYear((y) => y + 1)
      setViewMonthIdx(0)
    } else setViewMonthIdx((m) => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonthIdx, 1).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  })

  const rowByDay = useMemo(() => new Map(rows.map((r) => [r.day, r])), [rows])
  const grid = buildMonthGrid(viewYear, viewMonthIdx)

  if (roomsLoading) {
    return <p className="text-sm text-neutral-400">Odalar yükleniyor…</p>
  }

  if (rooms.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        Müsaitlik tanımlamak için önce «Özellikler» adımında en az bir oda tipi ekleyin ve kaydedin.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Her gün için seçili oda tipinden kaç odanın müsait olduğunu belirleyin. 0 = o gün tamamen dolu; maksimum değer
        oda tipindeki toplam oda adedidir ({maxUnits}).
      </p>

      <Field className="block max-w-md">
        <Label>Oda tipi</Label>
        <select
          className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          value={selectedRoomId}
          onChange={(e) => setSelectedRoomId(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.unit_count ?? 1} oda)
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold capitalize">{monthLabel}</span>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => void loadCalendar()}
          disabled={calLoading}
          className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          {calLoading ? 'Yükleniyor…' : 'Yenile'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/40">
        <span className="text-xs font-semibold text-neutral-500">Toplu:</span>
        <button
          type="button"
          onClick={() => bulkSetUnits(maxUnits)}
          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
        >
          Tümü müsait ({maxUnits})
        </button>
        <button
          type="button"
          onClick={() => bulkSetUnits(0)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 dark:border-red-800 dark:text-red-400"
        >
          Tümü dolu (0)
        </button>
        <div className="ml-2 flex items-center gap-1">
          <Input
            type="text"
            inputMode="decimal"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            placeholder="Toplu gece fiyatı…"
            className="h-8 w-28 text-xs"
          />
          <button
            type="button"
            onClick={applyBulkPrice}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs text-blue-700 dark:border-blue-800 dark:text-blue-400"
          >
            Fiyat uygula
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="grid min-w-[320px] grid-cols-7 border-b border-neutral-100 bg-neutral-50 text-center text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
          {WEEKDAY_TR.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-neutral-100 dark:bg-neutral-800">
          {grid.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="min-h-[4.5rem] bg-white dark:bg-neutral-900" />
            }
            const row = rowByDay.get(cell.dateStr)
            const units = row?.available_units ?? maxUnits
            const tone =
              units === 0
                ? 'bg-red-50 dark:bg-red-950/20'
                : units < maxUnits
                  ? 'bg-amber-50 dark:bg-amber-950/20'
                  : 'bg-emerald-50 dark:bg-emerald-950/20'
            return (
              <div
                key={cell.dateStr}
                className={`min-h-[4.5rem] bg-white p-1.5 dark:bg-neutral-900 ${tone}`}
              >
                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{cell.dayNum}</div>
                <select
                  className="mt-1 w-full rounded border border-neutral-200 bg-white px-1 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-800"
                  value={String(units)}
                  onChange={(e) => setDayUnits(cell.dateStr, Number.parseInt(e.target.value, 10) || 0)}
                >
                  {Array.from({ length: maxUnits + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}/{maxUnits}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ButtonPrimary type="button" onClick={() => void saveCalendar()} disabled={calSaving || calLoading}>
          {calSaving ? 'Kaydediliyor…' : 'Oda müsaitliğini kaydet'}
        </ButtonPrimary>
        {calOk ? <span className="text-sm text-emerald-600 dark:text-emerald-400">{calOk}</span> : null}
        {calErr ? <span className="text-sm text-red-600 dark:text-red-400">{calErr}</span> : null}
      </div>
    </div>
  )
}
