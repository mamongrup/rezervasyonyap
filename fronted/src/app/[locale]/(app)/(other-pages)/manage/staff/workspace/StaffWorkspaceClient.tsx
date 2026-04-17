'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { listStaffWorkspaceTasks, patchStaffWorkspaceTask, type WorkspaceTask } from '@/lib/travel-api'
import clsx from 'clsx'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]
const DAY_NAMES = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/** `month` 0–11 (Date ile aynı). */
function dueDayInMonth(due: string | null, year: number, month: number): number | null {
  if (!due || !due.trim()) return null
  const ymd = due.slice(0, 10)
  const parts = ymd.split('-')
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (y !== year || m !== month + 1) return null
  return d
}

export default function StaffWorkspaceClient() {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      setLoading(false)
      return
    }
    setErr(null)
    setLoading(true)
    try {
      const r = await listStaffWorkspaceTasks(token)
      setTasks(r.tasks)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const firstDay = new Date(year, month, 1).getDay()
  const adjustedFirstDay = (firstDay + 6) % 7
  const daysInMonth = getDaysInMonth(year, month)

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
    setSelectedDay(null)
  }

  const tasksByDueDay = useMemo(() => {
    const map: Record<number, WorkspaceTask[]> = {}
    tasks.forEach((t) => {
      const day = dueDayInMonth(t.due_date, year, month)
      if (day === null) return
      map[day] = map[day] ?? []
      map[day].push(t)
    })
    return map
  }, [tasks, year, month])

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })
  }, [tasks])

  const visibleTasks = useMemo(() => {
    if (selectedDay === null) return sortedTasks
    return sortedTasks.filter((t) => dueDayInMonth(t.due_date, year, month) === selectedDay)
  }, [sortedTasks, selectedDay, year, month])

  const undatedCount = useMemo(() => tasks.filter((t) => !t.due_date?.trim()).length, [tasks])

  async function toggle(t: WorkspaceTask) {
    const token = getStoredAuthToken()
    if (!token) return
    const next = t.status === 'done' ? 'open' : 'done'
    setBusy(t.id)
    try {
      await patchStaffWorkspaceTask(token, t.id, next)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Güncellenemedi')
    } finally {
      setBusy(null)
    }
  }

  function onDayClick(day: number) {
    setSelectedDay((prev) => (prev === day ? null : day))
  }

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">İş planı & görevler</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Bitiş tarihine göre aylık takvim; bir güne tıklayarak o güne ait görevleri süzebilirsiniz. Hatırlatma bilgileri
        listede yer alır.
      </p>

      {err ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin" /> Yükleniyor…
        </div>
      ) : tasks.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-400">Şu an size atanmış görev yok.</p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Bitiş tarihi takvimi</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  aria-label="Önceki ay"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="w-36 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {MONTH_NAMES[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  aria-label="Sonraki ay"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <div className="grid grid-cols-7 border-b border-neutral-100 dark:border-neutral-800">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-neutral-400">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[88px] border-b border-r border-neutral-50 dark:border-neutral-800"
                  />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dayTasks = tasksByDueDay[day] ?? []
                  const isToday =
                    new Date().getDate() === day &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year
                  const isSelected = selectedDay === day
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onDayClick(day)}
                      className={clsx(
                        'min-h-[88px] border-b border-r border-neutral-50 p-1.5 text-left transition-colors dark:border-neutral-800',
                        isToday && 'bg-indigo-50/80 dark:bg-indigo-950/25',
                        isSelected && 'ring-2 ring-inset ring-indigo-500 dark:ring-indigo-400',
                        !isSelected && 'hover:bg-neutral-50 dark:hover:bg-neutral-800/80',
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                          isToday
                            ? 'bg-indigo-600 text-white'
                            : 'text-neutral-600 dark:text-neutral-400',
                        )}
                      >
                        {day}
                      </span>
                      {dayTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className={clsx(
                            'mt-1 truncate rounded px-1 py-0.5 text-[10px] font-medium text-white',
                            t.status === 'done' ? 'bg-neutral-500' : 'bg-amber-500',
                          )}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 ? (
                        <div className="mt-0.5 text-[10px] text-neutral-400">+{dayTasks.length - 3}</div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Açık
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-400" />
                Tamamlandı
              </div>
            </div>
            {undatedCount > 0 ? (
              <p className="mt-2 text-xs text-neutral-400">
                Bu ayda bitiş tarihi olmayan {undatedCount} görev aşağıdaki listede (filtre: tüm görevler).
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {selectedDay === null
                  ? 'Tüm görevler'
                  : `${selectedDay} ${MONTH_NAMES[month]} ${year} — görevler`}
              </h2>
              {selectedDay !== null ? (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Tümünü göster
                </button>
              ) : null}
            </div>

            {visibleTasks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700">
                Bu görünümde görev yok.
              </p>
            ) : (
              <ul className="space-y-3">
                {visibleTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <button
                      type="button"
                      disabled={busy === t.id}
                      onClick={() => void toggle(t)}
                      className="mt-0.5 shrink-0 text-primary-600 disabled:opacity-50"
                      title={t.status === 'done' ? 'Yeniden aç' : 'Tamamlandı işaretle'}
                    >
                      {t.status === 'done' ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Circle className="h-6 w-6" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          t.status === 'done'
                            ? 'font-medium text-neutral-400 line-through'
                            : 'font-medium text-neutral-900 dark:text-white'
                        }
                      >
                        {t.title}
                      </p>
                      {t.body ? <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{t.body}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {t.due_date ? <span>Bitiş: {t.due_date}</span> : null}
                        {t.remind_at ? <span>· Hatırlatma: {t.remind_at}</span> : null}
                        {t.assign_to_all_staff ? <span>· Tüm personel görevi</span> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
