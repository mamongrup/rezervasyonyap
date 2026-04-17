'use client'

export const dynamic = 'force-dynamic'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { getStaffReservations, type StaffReservationRow } from '@/lib/travel-api'
import clsx from 'clsx'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500',
  pending: 'bg-amber-500',
  payment_pending: 'bg-blue-500',
  cancelled: 'bg-red-400',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export default function Page() {
  const [reservations, setReservations] = useState<StaffReservationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const token = getStoredAuthToken() ?? ''

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await getStaffReservations(token); setReservations(r.reservations) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { void load() }, [load])

  const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  const DAY_NAMES = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

  const firstDay = new Date(year, month, 1).getDay()
  const adjustedFirstDay = (firstDay + 6) % 7
  const daysInMonth = getDaysInMonth(year, month)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const reservationsByDay = useMemo(() => {
    const map: Record<number, StaffReservationRow[]> = {}
    reservations.forEach((r) => {
      if (!r.created_at) return
      const d = new Date(r.created_at)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        map[day] = map[day] ?? []
        map[day].push(r)
      }
    })
    return map
  }, [reservations, year, month])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40"><CalendarDays className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Rezervasyon Takvimi</h1>
            <p className="mt-1 text-sm text-neutral-500">Giriş tarihine göre aylık rezervasyon görünümü.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-36 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">{MONTH_NAMES[month]} {year}</span>
          <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? <div className="flex items-center gap-2 py-8 text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" />Yükleniyor…</div> : (
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-neutral-100 dark:border-neutral-800">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-neutral-400">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-neutral-50 p-1 dark:border-neutral-800" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayRes = reservationsByDay[day] ?? []
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
              return (
                <div key={day} className={clsx('min-h-[80px] border-b border-r border-neutral-50 p-1.5 dark:border-neutral-800', isToday && 'bg-blue-50 dark:bg-blue-950/20')}>
                  <span className={clsx('flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium', isToday ? 'bg-blue-600 text-white' : 'text-neutral-600 dark:text-neutral-400')}>
                    {day}
                  </span>
                  {dayRes.slice(0, 3).map((r) => (
                    <div key={r.id} className={clsx('mt-1 truncate rounded px-1 py-0.5 text-[10px] font-medium text-white', STATUS_COLORS[r.status] ?? 'bg-neutral-400')}>
                      {r.public_code ?? r.id.slice(0, 6)}
                    </div>
                  ))}
                  {dayRes.length > 3 ? <div className="mt-0.5 text-[10px] text-neutral-400">+{dayRes.length - 3}</div> : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {[
          { status: 'confirmed', label: 'Onaylı' },
          { status: 'pending', label: 'Bekliyor' },
          { status: 'payment_pending', label: 'Ödeme Bekleniyor' },
          { status: 'cancelled', label: 'İptal' },
        ].map((s) => (
          <div key={s.status} className="flex items-center gap-1.5">
            <div className={clsx('h-2.5 w-2.5 rounded-full', STATUS_COLORS[s.status])} />
            <span className="text-xs text-neutral-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
