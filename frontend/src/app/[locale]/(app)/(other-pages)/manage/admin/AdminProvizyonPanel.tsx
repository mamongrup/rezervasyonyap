'use client'

import React from 'react'
import {
  adminListProvizyon,
  adminCheckDeadlines,
  adminListEscalations,
  adminResolveEscalation,
  adminAddTransfer,
  adminCompleteTransfer,
  runOpsAgent,
  type ProvizyonReservation,
  type EscalationRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import PaymentScheduleCard from '@/components/checkout/PaymentScheduleCard'
import type { PaymentSchedule } from '@/lib/travel-api'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  held: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  pending_confirm: { label: 'Onay Bekliyor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  supplier_notified: { label: 'Onaylandı', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Tamamlandı', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' },
  refunded: { label: 'İade Edildi', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  disputed: { label: 'Sorunlu/Eskalasyon', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  full: 'Tam Ödeme',
  partial: 'Kısmi Ödeme',
}

function fmtTry(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return d
  }
}

function parseAiJobOutput(raw: string | null): string {
  if (!raw) return ''
  try {
    const j = JSON.parse(raw) as { text?: string }
    return typeof j.text === 'string' ? j.text : raw
  } catch {
    return raw
  }
}

// ── Rezervasyon Satırı ───────────────────────────────────────────────────────

function ReservationRow({ res, token, onRefresh }: { res: ProvizyonReservation; token: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = React.useState(false)
  const [transferType, setTransferType] = React.useState('checkin_prepaid')
  const [transferAmount, setTransferAmount] = React.useState('')
  const [transferNote, setTransferNote] = React.useState('')
  const [addingTransfer, setAddingTransfer] = React.useState(false)
  const [schedule, setSchedule] = React.useState<PaymentSchedule | null>(null)
  const [opsAiBusy, setOpsAiBusy] = React.useState(false)
  const [opsAiErr, setOpsAiErr] = React.useState<string | null>(null)
  const [opsAiText, setOpsAiText] = React.useState('')

  React.useEffect(() => {
    if (expanded && res.payment_schedule_json && res.payment_schedule_json !== '{}') {
      try {
        setSchedule(JSON.parse(res.payment_schedule_json) as PaymentSchedule)
      } catch { /* ignore */ }
    }
  }, [expanded, res.payment_schedule_json])

  const statusInfo = STATUS_LABELS[res.payment_status] ?? { label: res.payment_status, color: 'bg-neutral-100 text-neutral-600' }

  const handleAddTransfer = async () => {
    if (!transferAmount) return
    setAddingTransfer(true)
    try {
      await adminAddTransfer(token, res.id, { transfer_type: transferType, amount: transferAmount, notes: transferNote })
      setTransferAmount('')
      setTransferNote('')
      window.alert('Transfer kaydedildi.')
      onRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Hata')
    } finally {
      setAddingTransfer(false)
    }
  }

  const isDeadlinePassed = res.supplier_confirm_deadline
    ? new Date(res.supplier_confirm_deadline) < new Date()
    : false

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
      {/* Özet satır */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {res.public_code}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            {PAYMENT_TYPE_LABELS[res.payment_type] ?? res.payment_type}
          </span>
          {isDeadlinePassed && res.payment_status !== 'supplier_notified' && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Süre Doldu
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-right text-sm">
          <div>
            <p className="text-xs text-neutral-500">Misafir</p>
            <p className="font-medium text-neutral-800 dark:text-neutral-200">{res.guest_name}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Giriş</p>
            <p className="font-medium text-neutral-800 dark:text-neutral-200">{res.starts_on}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Ödenen</p>
            <p className="font-semibold text-green-700 dark:text-green-400">{fmtTry(res.amount_paid)}</p>
          </div>
          <svg
            className={`h-5 w-5 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Detay */}
      {expanded && (
        <div className="border-t border-neutral-100 p-4 dark:border-neutral-700">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Sol: Bilgiler */}
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold text-neutral-700 dark:text-neutral-300">Ödeme Detayları</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Komisyon</span>
                  <span>{fmtTry(res.commission_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tedarikçiye Transfer</span>
                  <span className="font-semibold">{fmtTry(res.supplier_prepaid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Girişte Misafirden</span>
                  <span>{fmtTry(res.guest_due_at_checkin)}</span>
                </div>
              </div>
              {res.supplier_confirm_deadline && (
                <div className={`rounded-lg px-3 py-2 text-xs ${isDeadlinePassed ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                  Onay Deadline: {fmtDate(res.supplier_confirm_deadline)}
                </div>
              )}
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-800 dark:bg-violet-950/25">
                <p className="text-xs font-medium text-violet-900 dark:text-violet-200">AI operasyon desteği</p>
                <p className="mt-1 text-xs text-violet-800/90 dark:text-violet-300/85">
                  Müşteri sohbeti değil; provizyon özeti ve benzer ilan önerileri (DeepSeek + aktif AI sağlayıcı).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      setOpsAiBusy(true)
                      setOpsAiErr(null)
                      setOpsAiText('')
                      try {
                        const r = await runOpsAgent(token, {
                          reservation_id: res.id,
                          event_type: 'provizyon_panel',
                        })
                        setOpsAiText(parseAiJobOutput(r.job.output_json))
                        if (r.job.status === 'failed' && r.job.error) setOpsAiErr(r.job.error)
                      } catch (e) {
                        setOpsAiErr(e instanceof Error ? e.message : 'ai_failed')
                      } finally {
                        setOpsAiBusy(false)
                      }
                    })()
                  }}
                  disabled={opsAiBusy}
                  className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {opsAiBusy ? 'Çalışıyor…' : 'Öneri üret'}
                </button>
                {opsAiErr && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{opsAiErr}</p>}
                {opsAiText ? (
                  <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-100 bg-white p-3 text-xs text-neutral-800 dark:border-violet-900 dark:bg-neutral-900 dark:text-neutral-200">
                    {opsAiText}
                  </pre>
                ) : null}
              </div>
            </div>

            {/* Sağ: Ödeme cetveli */}
            {schedule && (
              <PaymentScheduleCard schedule={schedule} target="supplier" />
            )}
          </div>

          {/* Transfer ekleme */}
          <div className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            <h4 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Transfer Kaydı Ekle
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                <option value="checkin_prepaid">Check-in Transferi</option>
                <option value="balance_final">Bakiye Transferi</option>
                <option value="commission_hold">Komisyon Tutma</option>
                <option value="refund_to_guest">Müşteriye İade</option>
              </select>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Tutar (TRY)"
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              />
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Not (isteğe bağlı)"
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              />
            </div>
            <button
              onClick={handleAddTransfer}
              disabled={addingTransfer || !transferAmount}
              className="mt-3 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {addingTransfer ? 'Kaydediliyor...' : 'Transfer Ekle'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Eskalasyon Satırı ────────────────────────────────────────────────────────

function EscalationRowItem({ esc, token, onRefresh }: { esc: EscalationRow; token: string; onRefresh: () => void }) {
  const [resolveStatus, setResolveStatus] = React.useState('resolved_alternative')
  const [note, setNote] = React.useState('')
  const [resolving, setResolving] = React.useState(false)
  const [opsAiBusy, setOpsAiBusy] = React.useState(false)
  const [opsAiErr, setOpsAiErr] = React.useState<string | null>(null)
  const [opsAiText, setOpsAiText] = React.useState('')

  const REASON_LABELS: Record<string, string> = {
    supplier_no_confirm: 'Tedarikçi Onaylamadı',
    supplier_cancelled: 'Tedarikçi İptal Etti',
    overbooking: 'Çift Rezervasyon',
    dispute: 'Anlaşmazlık',
  }

  const handleResolve = async () => {
    setResolving(true)
    try {
      await adminResolveEscalation(token, esc.id, { status: resolveStatus, note })
      onRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Hata')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 p-4 dark:border-red-800/50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {esc.public_code}
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {REASON_LABELS[esc.reason] ?? esc.reason}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{esc.listing_title}</p>
          <p className="text-xs text-neutral-500">{fmtDate(esc.escalated_at)}</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <select
            value={resolveStatus}
            onChange={(e) => setResolveStatus(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <option value="resolved_alternative">Alternatif Bulundu</option>
            <option value="resolved_refund">İade Yapıldı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Not..."
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {resolving ? '...' : 'Çöz'}
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                setOpsAiBusy(true)
                setOpsAiErr(null)
                setOpsAiText('')
                try {
                  const r = await runOpsAgent(token, {
                    reservation_id: esc.reservation_id,
                    event_type: `escalation:${esc.reason}`,
                  })
                  setOpsAiText(parseAiJobOutput(r.job.output_json))
                  if (r.job.status === 'failed' && r.job.error) setOpsAiErr(r.job.error)
                } catch (e) {
                  setOpsAiErr(e instanceof Error ? e.message : 'ai_failed')
                } finally {
                  setOpsAiBusy(false)
                }
              })()
            }}
            disabled={opsAiBusy}
            className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200"
          >
            {opsAiBusy ? 'AI…' : 'AI öneri'}
          </button>
        </div>
      </div>
      {opsAiErr && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{opsAiErr}</p>}
      {opsAiText ? (
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-violet-100 bg-white p-3 text-xs text-neutral-800 dark:border-violet-900 dark:bg-neutral-900 dark:text-neutral-200">
          {opsAiText}
        </pre>
      ) : null}
    </div>
  )
}

// ── Ana Panel ────────────────────────────────────────────────────────────────

type ActiveTab = 'active' | 'escalations' | 'all'

export default function AdminProvizyonPanel() {
  const [tab, setTab] = React.useState<ActiveTab>('active')
  const [reservations, setReservations] = React.useState<ProvizyonReservation[]>([])
  const [escalations, setEscalations] = React.useState<EscalationRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [checkingDeadlines, setCheckingDeadlines] = React.useState(false)
  const [lastDeadlineCheck, setLastDeadlineCheck] = React.useState<string | null>(null)
  const token = getStoredAuthToken() ?? ''

  const loadData = React.useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      if (tab === 'active') {
        const data = await adminListProvizyon(token)
        setReservations(data.reservations)
      } else if (tab === 'escalations') {
        const data = await adminListEscalations(token, 'open')
        setEscalations(data.escalations)
      } else {
        const data = await adminListProvizyon(token, '')
        setReservations(data.reservations)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tab, token])

  React.useEffect(() => { loadData() }, [loadData])

  const handleCheckDeadlines = async () => {
    setCheckingDeadlines(true)
    try {
      const res = await adminCheckDeadlines(token)
      setLastDeadlineCheck(
        res.escalated_count > 0
          ? `${res.escalated_count} rezervasyon eskalasyona alındı: ${res.escalated_codes.join(', ')}`
          : 'Süresi dolan rezervasyon yok.',
      )
      loadData()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Hata')
    } finally {
      setCheckingDeadlines(false)
    }
  }

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'active', label: 'Aktif Provizyon' },
    { id: 'escalations', label: 'Eskalasyonlar' },
    { id: 'all', label: 'Tümü' },
  ]

  return (
    <div className="space-y-6">
      {/* Başlık + Kontrol */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-white">Provizyon Yönetimi</h2>
          <p className="text-sm text-neutral-500">Bekleyen ödemeler, tedarikçi onayları ve transferler</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckDeadlines}
            disabled={checkingDeadlines}
            className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {checkingDeadlines ? 'Kontrol ediliyor...' : 'Deadline Kontrol'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Yenile
          </button>
        </div>
      </div>

      {lastDeadlineCheck && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          {lastDeadlineCheck}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800/50">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* İçerik */}
      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : tab === 'escalations' ? (
        <div className="space-y-3">
          {escalations.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">Açık eskalasyon yok.</p>
          ) : (
            escalations.map((esc) => (
              <EscalationRowItem key={esc.id} esc={esc} token={token} onRefresh={loadData} />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">Kayıt bulunamadı.</p>
          ) : (
            reservations.map((res) => (
              <ReservationRow key={res.id} res={res} token={token} onRefresh={loadData} />
            ))
          )}
        </div>
      )}

      {/* Özet istatistikler */}
      {tab !== 'escalations' && reservations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Bekleyen Onay',
              value: reservations.filter((r) => ['held', 'pending_confirm'].includes(r.payment_status)).length,
              color: 'text-amber-600',
            },
            {
              label: 'Onaylanan',
              value: reservations.filter((r) => r.payment_status === 'supplier_notified').length,
              color: 'text-green-600',
            },
            {
              label: 'Sorunlu',
              value: reservations.filter((r) => r.payment_status === 'disputed').length,
              color: 'text-red-600',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-700"
            >
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
