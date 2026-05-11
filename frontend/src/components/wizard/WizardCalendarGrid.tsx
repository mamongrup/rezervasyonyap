'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { MergedCalendarRow } from '@/lib/listing-availability-calendar-merge'

const TR_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

/** YYYY-MM-01 → all days in that month as [YYYY-MM-DD, weekdayIndex(Mon=0)] */
function buildMonthCells(year: number, month: number): { iso: string; wd: number }[] {
  const cells: { iso: string; wd: number }[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    const wd = (d.getDay() + 6) % 7 // Mon=0..Sun=6
    cells.push({ iso: d.toISOString().slice(0, 10), wd })
    d.setDate(d.getDate() + 1)
  }
  return cells
}

interface PricePopoverProps {
  row: MergedCalendarRow
  onSave: (price: string) => void
  onClose: () => void
}
function PricePopover({ row, onSave, onClose }: PricePopoverProps) {
  const [val, setVal] = useState(row.price_override)
  return (
    <div className="absolute z-50 mt-1 w-44 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900" style={{ top: '100%', left: '50%', transform: 'translateX(-50%)' }}>
      <p className="mb-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200">{row.day}</p>
      <input
        autoFocus
        type="number"
        min="0"
        step="1"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onSave(val); onClose() }
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Fiyat geçersiz kıl…"
        className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => { onSave(val); onClose() }}
          className="flex-1 rounded-lg bg-primary-600 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
        >
          Kaydet
        </button>
        <button
          type="button"
          onClick={() => { onSave(''); onClose() }}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300"
        >
          Sıfırla
        </button>
      </div>
    </div>
  )
}

interface MonthGridProps {
  year: number
  month: number
  rowMap: Map<string, MergedCalendarRow>
  today: string
  popoverDay: string | null
  dragSelecting: boolean
  dragAvailable: boolean
  onDayMouseDown: (iso: string, row: MergedCalendarRow | undefined) => void
  onDayMouseEnter: (iso: string) => void
  onDayPriceClick: (iso: string, e: React.MouseEvent) => void
  onPopoverSave: (iso: string, price: string) => void
  onPopoverClose: () => void
}

function MonthGrid({
  year, month, rowMap, today, popoverDay,
  onDayMouseDown, onDayMouseEnter, onDayPriceClick, onPopoverSave, onPopoverClose,
}: MonthGridProps) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  // Pad start of week (Mon=0)
  const startWd = cells[0]?.wd ?? 0

  return (
    <div className="min-w-[256px] flex-1">
      <p className="mb-3 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {TR_MONTHS[month]} {year}
      </p>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {TR_DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
            {d}
          </div>
        ))}
        {/* Empty start cells */}
        {Array.from({ length: startWd }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {cells.map(({ iso, wd }) => {
          const row = rowMap.get(iso)
          const isPast = iso < today
          const isToday = iso === today
          const isAvailable = row ? (row.am_available || row.pm_available) : true
          const hasPrice = !!row?.price_override?.trim()
          const isWeekend = wd >= 5

          return (
            <div
              key={iso}
              className="relative"
              onMouseDown={() => !isPast && onDayMouseDown(iso, row)}
              onMouseEnter={() => !isPast && onDayMouseEnter(iso)}
            >
              <div
                className={[
                  'flex h-10 flex-col items-center justify-center rounded-lg text-xs transition-all select-none',
                  isPast
                    ? 'cursor-not-allowed opacity-30'
                    : 'cursor-pointer',
                  !isPast && isAvailable
                    ? isWeekend
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50'
                      : 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                    : !isPast
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/25 dark:text-red-400 dark:hover:bg-red-950/40 line-through'
                      : '',
                  isToday ? 'ring-2 ring-primary-500 ring-offset-1' : '',
                ].join(' ')}
              >
                <span className="font-medium leading-none">
                  {parseInt(iso.slice(8), 10)}
                </span>
                {hasPrice && !isPast && (
                  <span className="mt-0.5 text-[9px] leading-none text-neutral-500 dark:text-neutral-400">
                    {row!.price_override}
                  </span>
                )}
              </div>

              {/* Price override button */}
              {!isPast && isAvailable && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDayPriceClick(iso, e) }}
                  className="absolute -right-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] text-neutral-400 opacity-0 shadow hover:opacity-100 hover:text-primary-600 group-hover:opacity-100 dark:bg-neutral-800 dark:text-neutral-500"
                  title="Fiyat geçersiz kılma"
                >
                  ₺
                </button>
              )}

              {popoverDay === iso && (
                <PricePopover
                  row={row ?? { day: iso, is_available: true, am_available: true, pm_available: true, price_override: '', weekday: wd }}
                  onSave={(p) => onPopoverSave(iso, p)}
                  onClose={onPopoverClose}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface WizardCalendarGridProps {
  rows: MergedCalendarRow[]
  onChange: (rows: MergedCalendarRow[]) => void
  currencyCode?: string
}

export default function WizardCalendarGrid({ rows, onChange, currencyCode = 'TRY' }: WizardCalendarGridProps) {
  const today = isoToday()
  const [viewYear, setViewYear] = useState(() => {
    const d = new Date()
    return d.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    return new Date().getMonth()
  })
  const [popoverDay, setPopoverDay] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{ active: boolean; available: boolean }>({ active: false, available: true })
  const isDragging = useRef(false)

  const rowMap = useMemo(() => new Map(rows.map((r) => [r.day, r])), [rows])

  const toggleDay = useCallback((iso: string, makeAvailable: boolean, existingRow?: MergedCalendarRow) => {
    const existing = existingRow ?? rowMap.get(iso)
    if (existing) {
      onChange(rows.map((r) =>
        r.day === iso
          ? { ...r, am_available: makeAvailable, pm_available: makeAvailable, is_available: makeAvailable }
          : r
      ))
    } else {
      const wd = (new Date(iso + 'T12:00:00').getDay() + 6) % 7
      onChange([...rows, {
        day: iso, weekday: wd,
        is_available: makeAvailable, am_available: makeAvailable, pm_available: makeAvailable,
        price_override: '',
      }].sort((a, b) => a.day.localeCompare(b.day)))
    }
  }, [rows, rowMap, onChange])

  const handleDayMouseDown = useCallback((iso: string, row: MergedCalendarRow | undefined) => {
    if (iso < today) return
    const currentlyAvailable = row ? (row.am_available || row.pm_available) : true
    const nextAvailable = !currentlyAvailable
    isDragging.current = true
    setDragState({ active: true, available: nextAvailable })
    toggleDay(iso, nextAvailable, row)
    setPopoverDay(null)
  }, [today, toggleDay])

  const handleDayMouseEnter = useCallback((iso: string) => {
    if (!isDragging.current || iso < today) return
    toggleDay(iso, dragState.available)
  }, [today, dragState.available, toggleDay])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    setDragState((d) => ({ ...d, active: false }))
  }, [])

  const bulkSetAll = useCallback((available: boolean) => {
    onChange(rows.map((r) =>
      r.day >= today
        ? { ...r, am_available: available, pm_available: available, is_available: available }
        : r
    ))
  }, [rows, today, onChange])

  const bulkMarkWeekends = useCallback((available: boolean) => {
    onChange(rows.map((r) =>
      r.day >= today && (r.weekday === 5 || r.weekday === 6)
        ? { ...r, am_available: available, pm_available: available, is_available: available }
        : r
    ))
  }, [rows, today, onChange])

  const handlePopoverSave = useCallback((iso: string, price: string) => {
    const existing = rowMap.get(iso)
    if (existing) {
      onChange(rows.map((r) => r.day === iso ? { ...r, price_override: price } : r))
    }
  }, [rows, rowMap, onChange])

  // Compute month B (next month after viewMonth)
  const monthBYear = viewMonth === 11 ? viewYear + 1 : viewYear
  const monthBMonth = (viewMonth + 1) % 12

  // Stats
  const futureRows = rows.filter((r) => r.day >= today)
  const availCount = futureRows.filter((r) => r.am_available || r.pm_available).length
  const totalCount = futureRows.length

  return (
    <div
      className="select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Bulk actions */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Toplu işlem:</span>
        <button
          type="button"
          onClick={() => bulkSetAll(true)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/50 dark:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
          </svg>
          Tümü müsait
        </button>
        <button
          type="button"
          onClick={() => bulkSetAll(false)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
          Tümünü kapat
        </button>
        <button
          type="button"
          onClick={() => bulkMarkWeekends(false)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Hft. sonları kapat
        </button>
        <button
          type="button"
          onClick={() => bulkMarkWeekends(true)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Hft. sonları aç
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-emerald-100 dark:bg-emerald-950/40" />
          Müsait
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-red-50 dark:bg-red-950/25" />
          Kapalı
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full ring-2 ring-primary-500" />
          Bugün
        </span>
        <span className="ml-auto font-medium">
          {availCount} / {totalCount} gün müsait
        </span>
      </div>

      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
            else setViewMonth(viewMonth - 1)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {TR_MONTHS[viewMonth]} {viewYear} — {TR_MONTHS[monthBMonth]} {monthBYear}
        </span>
        <button
          type="button"
          onClick={() => {
            if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
            else setViewMonth(viewMonth + 1)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Two-month grid */}
      <div className="flex flex-col gap-8 sm:flex-row sm:gap-6">
        <MonthGrid
          year={viewYear} month={viewMonth}
          rowMap={rowMap} today={today} popoverDay={popoverDay}
          dragSelecting={dragState.active} dragAvailable={dragState.available}
          onDayMouseDown={handleDayMouseDown}
          onDayMouseEnter={handleDayMouseEnter}
          onDayPriceClick={(iso) => setPopoverDay(popoverDay === iso ? null : iso)}
          onPopoverSave={handlePopoverSave}
          onPopoverClose={() => setPopoverDay(null)}
        />
        <MonthGrid
          year={monthBYear} month={monthBMonth}
          rowMap={rowMap} today={today} popoverDay={popoverDay}
          dragSelecting={dragState.active} dragAvailable={dragState.available}
          onDayMouseDown={handleDayMouseDown}
          onDayMouseEnter={handleDayMouseEnter}
          onDayPriceClick={(iso) => setPopoverDay(popoverDay === iso ? null : iso)}
          onPopoverSave={handlePopoverSave}
          onPopoverClose={() => setPopoverDay(null)}
        />
      </div>

      {/* Hint */}
      <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
        Günlere tıklayarak veya sürükleyerek müsaitliği değiştirin. ₺ simgesine tıklayarak günlük fiyat geçersiz kılma ekleyebilirsiniz.
      </p>
    </div>
  )
}
