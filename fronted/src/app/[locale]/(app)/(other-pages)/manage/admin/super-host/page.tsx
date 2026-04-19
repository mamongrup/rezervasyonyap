'use client'

import React from 'react'
import { ManageAccessGuard } from '@/lib/use-manage-access'
import { getStoredAuthToken } from '@/lib/auth-storage'

export default function ManageSuperHostPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.super-host"
    >
      <SuperHostClient />
    </ManageAccessGuard>
  )
}

type OrgRow = {
  id: string
  name: string
  is_super_host: boolean
  super_host_since: string
  avg_rating: string
  total_reviews: string
  completion_rate: string
  cancellation_rate: string
  completed_bookings_12mo: string
  calculated_at: string
}

function fmtNum(s: string, dec = 2): string {
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return s
  return n.toFixed(dec)
}

function SuperHostClient() {
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const [orgs, setOrgs] = React.useState<OrgRow[]>([])
  const [loadingList, setLoadingList] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState('')

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''

  const loadList = React.useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Yetki bulunamadı.')
      return
    }
    if (!apiBase) {
      setErr('API URL tanımlı değil.')
      return
    }
    setLoadingList(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/super-host/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { organizations: OrgRow[] }
      setOrgs(data.organizations ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Liste yüklenemedi')
    } finally {
      setLoadingList(false)
    }
  }, [apiBase])

  React.useEffect(() => {
    void loadList()
  }, [loadList])

  const recompute = async () => {
    const token = getStoredAuthToken()
    if (!token || !apiBase) return
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/super-host/recompute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { ok: boolean; message: string }
      setMsg(data.message)
      await loadList()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Hata')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (org: OrgRow) => {
    const token = getStoredAuthToken()
    if (!token || !apiBase) return
    const next = !org.is_super_host
    setTogglingId(org.id)
    try {
      const res = await fetch(
        `${apiBase}/api/v1/admin/organizations/${encodeURIComponent(org.id)}/super-host`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ active: next }),
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOrgs((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, is_super_host: next } : o)),
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Güncellenemedi')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return orgs
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
    )
  }, [orgs, filter])

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold">Süper Ev Sahibi Yönetimi</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Booking ve Airbnb stilinde süper ev sahibi rozeti. Aşağıdaki kriterleri
        sağlayan organizasyonlar otomatik işaretlenir; kriterler dışı kalan veya
        özel kararlar için her organizasyona manuel açma/kapatma yapabilirsiniz.
      </p>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
        <li>Ortalama puan ≥ 4.7</li>
        <li>Son 12 ayda ≥ 10 onaylı rezervasyon</li>
        <li>İptal oranı ≤ %1</li>
      </ul>

      <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-900/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-amber-900 dark:text-amber-200">
              Tüm organizasyonlar için yeniden hesapla
            </div>
            <div className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
              Metrikleri yeniler ve kriterlere göre rozeti aktif/pasif eder.
            </div>
          </div>
          <button
            type="button"
            onClick={recompute}
            disabled={busy}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? 'Hesaplanıyor…' : '⭐ Şimdi hesapla'}
          </button>
        </div>
        {msg && (
          <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-3 text-sm text-red-700 dark:text-red-400">{err}</div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
          <div>
            <div className="text-sm font-semibold">Organizasyonlar &amp; metrikler</div>
            <div className="text-xs text-neutral-500">
              Toplam {orgs.length} organizasyon. ⭐ ile işaretliler süper ev sahibi.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Ad veya ID ara…"
              className="w-56 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button
              type="button"
              onClick={() => void loadList()}
              disabled={loadingList}
              className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {loadingList ? 'Yükleniyor…' : 'Yenile'}
            </button>
          </div>
        </div>

        {orgs.length === 0 && !loadingList ? (
          <p className="p-8 text-sm text-neutral-500">Organizasyon bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Organizasyon</th>
                  <th className="px-4 py-3">⭐</th>
                  <th className="px-4 py-3">Puan</th>
                  <th className="px-4 py-3">Yorum</th>
                  <th className="px-4 py-3">12ay rez.</th>
                  <th className="px-4 py-3">İptal %</th>
                  <th className="px-4 py-3">Hesap.</th>
                  <th className="px-4 py-3 text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {o.name || '—'}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-400">{o.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      {o.is_super_host ? (
                        <span title={o.super_host_since ? `Sahip oldu: ${o.super_host_since}` : ''}>
                          ⭐
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                      {fmtNum(o.avg_rating, 2)}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                      {o.total_reviews}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                      {o.completed_bookings_12mo}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                      {fmtNum(o.cancellation_rate, 2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {o.calculated_at || '—'}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => void toggle(o)}
                        disabled={togglingId === o.id}
                        className={
                          o.is_super_host
                            ? 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200'
                            : 'rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50'
                        }
                      >
                        {togglingId === o.id
                          ? '…'
                          : o.is_super_host
                            ? 'Rozeti kaldır'
                            : '⭐ Rozet ver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
