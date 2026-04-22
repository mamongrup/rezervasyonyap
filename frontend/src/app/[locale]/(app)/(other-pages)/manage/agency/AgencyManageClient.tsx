'use client'

import {
  cancelAgencyInvoice,
  createAgencyApiKey,
  createAgencyInvoice,
  deleteAgencyApiKey,
  getAgencyCommissionAccruals,
  getAgencyCommissionRates,
  getAgencyPersistedCommissionAccruals,
  getAgentMe,
  getAgentSalesSummary,
  getAgencyBrowseListings,
  getAgencyMe,
  getAgencyReservations,
  getAgencyInvoiceDetail,
  getAgencySalesSummary,
  listAgentReservations,
  listAgencyApiKeys,
  listAgencyInvoices,
  patchAgencyInvoiceNotes,
  previewAgencyInvoice,
  type AgencyBrowseListingRow,
  type AgencyApiKeyRow,
  type AgencyCommissionAccruals,
  type AgencyCommissionRateRow,
  type AgencyInvoiceDetailResponse,
  type AgencyInvoiceRow,
  type AgencyInvoicePreview,
  type PersistedCommissionAccruals,
  type AgencyMe,
  type AgencySalesSummary,
  type MyReservationRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { AgencyVerificationWidget } from '@/components/travel/AgencyVerificationWidget'
import { invoiceErrorFromUnknown } from '@/lib/invoice-errors'
import { invoiceStatusBadgeClass, invoiceStatusLabelTr } from '@/lib/invoice-ui'
import { printCommissionInvoice } from '@/lib/print-commission-invoice'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { accountReservationListingHref } from '@/lib/account-reservation-listing-href'
import { formatReservationDateOnly, formatReservationDateTime } from '@/lib/account-reservation-display'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

function extractErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

function isAgencyDocumentGateMessage(msg: string): boolean {
  return msg === 'agency_document_pending' || msg === 'agency_document_rejected'
}

function formatAgencyBrowsePortalError(msg: string): string {
  if (isAgencyDocumentGateMessage(msg)) return 'Belge onayı olmadan ilan araması yapılamaz.'
  return msg
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'err'; msg: string }
  | {
      kind: 'ok'
      me: AgencyMe
      keys: AgencyApiKeyRow[]
      rates: AgencyCommissionRateRow[]
      reservations: MyReservationRow[]
      sales: AgencySalesSummary
      commissionAccruals: AgencyCommissionAccruals
      persistedAccruals: PersistedCommissionAccruals
      invoices: AgencyInvoiceRow[]
      invoicesLoading: boolean
      /** Belge onayı beklenirken / reddedilmişken portal alt uçları boş; kullanıcıya kısa açıklama */
      portalDocumentNotice?: string
    }

export default function AgencyManageClient() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [salesFrom, setSalesFrom] = useState('')
  const [salesTo, setSalesTo] = useState('')
  const [salesRefreshing, setSalesRefreshing] = useState(false)
  const [invCurrency, setInvCurrency] = useState('')
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null)
  const [invoicePreview, setInvoicePreview] = useState<AgencyInvoicePreview | null>(null)
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState<string | null>(null)
  const [invoiceDetail, setInvoiceDetail] = useState<AgencyInvoiceDetailResponse | null>(null)
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false)
  const [invNotes, setInvNotes] = useState('')
  const [invoiceNotesDraft, setInvoiceNotesDraft] = useState('')
  const [invoiceDetailActionBusy, setInvoiceDetailActionBusy] = useState<'save_notes' | 'cancel' | null>(null)
  const [invoiceSectionError, setInvoiceSectionError] = useState<string | null>(null)
  const [agentTestKey, setAgentTestKey] = useState('')
  const [agentTestFrom, setAgentTestFrom] = useState('')
  const [agentTestTo, setAgentTestTo] = useState('')
  const [agentTestBusy, setAgentTestBusy] = useState(false)
  const [agentTestErr, setAgentTestErr] = useState<string | null>(null)
  const [agentTestMe, setAgentTestMe] = useState<Awaited<ReturnType<typeof getAgentMe>> | null>(null)
  const [agentTestResv, setAgentTestResv] = useState<MyReservationRow[] | null>(null)
  const [agentTestSales, setAgentTestSales] = useState<AgencySalesSummary | null>(null)
  const [browseSearch, setBrowseSearch] = useState('')
  const [browseListings, setBrowseListings] = useState<AgencyBrowseListingRow[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseErr, setBrowseErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    setInvoiceDetailOpen(null)
    setInvoiceDetail(null)
    setInvoiceSectionError(null)
    setState({ kind: 'loading' })
    try {
      const me = await getAgencyMe(token)
      const emptyKeys = { api_keys: [] as AgencyApiKeyRow[] }
      const emptyRates = { commission_rates: [] as AgencyCommissionRateRow[] }
      const emptyResv = { reservations: [] as MyReservationRow[] }
      const emptySales: AgencySalesSummary = { reservation_count: '0', gross_total: '0', by_status: {} }
      const emptyComm: AgencyCommissionAccruals = {
        reservation_count: '0',
        gross_total: '0',
        commission_total: '0',
      }
      const emptyPersisted: PersistedCommissionAccruals = {
        accrual_line_count: '0',
        gross_total: '0',
        commission_total: '0',
      }

      const settled = await Promise.allSettled([
        listAgencyApiKeys(token),
        getAgencyCommissionRates(token),
        getAgencyReservations(token),
        getAgencySalesSummary(token),
        getAgencyCommissionAccruals(token),
        getAgencyPersistedCommissionAccruals(token),
      ])

      let firstFatal: string | null = null
      let sawDocRejected = false
      let sawDocPending = false
      for (const r of settled) {
        if (r.status !== 'rejected') continue
        const msg = extractErrorMessage(r.reason)
        if (isAgencyDocumentGateMessage(msg)) {
          if (msg === 'agency_document_rejected') sawDocRejected = true
          else sawDocPending = true
        } else {
          firstFatal ??= msg
        }
      }
      if (firstFatal) {
        setState({ kind: 'err', msg: firstFatal })
        return
      }

      const val = <T,>(i: number, empty: T): T => {
        const r = settled[i] as PromiseSettledResult<T>
        return r.status === 'fulfilled' ? r.value : empty
      }

      const keysRes = val(0, emptyKeys)
      const ratesRes = val(1, emptyRates)
      const resv = val(2, emptyResv)
      const sales = val(3, emptySales)
      const commissionAccruals = val(4, emptyComm)
      const persistedAccruals = val(5, emptyPersisted)

      const portalDocumentNotice =
        sawDocRejected || sawDocPending
          ? sawDocRejected
            ? 'Belge durumunuz reddedildi. Yönetici ile iletişime geçin; onaylanana kadar API anahtarları, rezervasyon listesi ve finans özeti bu sayfada boş kalır.'
            : 'Belge onayı bekleniyor. Yönetici belge durumunu onaylayana kadar API anahtarları, rezervasyon listesi ve finans özeti bu sayfada boş kalır.'
          : undefined

      setState({
        kind: 'ok',
        me,
        keys: keysRes.api_keys,
        rates: ratesRes.commission_rates,
        reservations: resv.reservations,
        sales,
        commissionAccruals,
        persistedAccruals,
        invoices: [],
        invoicesLoading: true,
        portalDocumentNotice,
      })
      void listAgencyInvoices(token)
        .then((invRes) => {
          setState((prev: LoadState) =>
            prev.kind === 'ok' ? { ...prev, invoices: invRes.invoices, invoicesLoading: false } : prev,
          )
        })
        .catch(() => {
          setState((prev: LoadState) => (prev.kind === 'ok' ? { ...prev, invoices: [], invoicesLoading: false } : prev))
        })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'load_failed'
      setState({ kind: 'err', msg })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (invoiceDetail?.invoice) {
      setInvoiceNotesDraft(invoiceDetail.invoice.notes ?? '')
    }
  }, [invoiceDetail])

  useEffect(() => {
    if (state.kind !== 'ok') return
    const token = getStoredAuthToken()
    if (!token) return
    let cancelled = false
    setBrowseLoading(true)
    setBrowseErr(null)
    void getAgencyBrowseListings(token)
      .then((r) => {
        if (!cancelled) setBrowseListings(r.listings)
      })
      .catch((e) => {
        if (!cancelled)
          setBrowseErr(formatAgencyBrowsePortalError(e instanceof Error ? e.message : 'browse_failed'))
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [state.kind])

  async function applySalesRange() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setSalesRefreshing(true)
    try {
      const q = {
        ...(salesFrom.trim() ? { from: salesFrom.trim() } : {}),
        ...(salesTo.trim() ? { to: salesTo.trim() } : {}),
      }
      const [sales, commissionAccruals, persistedAccruals] = await Promise.all([
        getAgencySalesSummary(token, q),
        getAgencyCommissionAccruals(token, q),
        getAgencyPersistedCommissionAccruals(token, q),
      ])
      setState((prev: LoadState) =>
        prev.kind === 'ok' ? { ...prev, sales, commissionAccruals, persistedAccruals } : prev,
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'sales_refresh_failed')
    } finally {
      setSalesRefreshing(false)
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    setCreating(true)
    setNewSecret(null)
    try {
      const res = await createAgencyApiKey(token, {
        ...(label.trim() ? { label: label.trim() } : {}),
      })
      setNewSecret(res.secret)
      setLabel('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'create_failed')
    } finally {
      setCreating(false)
    }
  }

  async function applyBrowseSearch(e?: FormEvent) {
    e?.preventDefault()
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setBrowseLoading(true)
    setBrowseErr(null)
    try {
      const r = await getAgencyBrowseListings(token, browseSearch.trim() || undefined)
      setBrowseListings(r.listings)
    } catch (err) {
      setBrowseErr(formatAgencyBrowsePortalError(err instanceof Error ? err.message : 'browse_failed'))
    } finally {
      setBrowseLoading(false)
    }
  }

  async function runAgentApiTest() {
    const key = agentTestKey.trim()
    if (!key.startsWith('trk_live_')) {
      setAgentTestErr('Anahtar trk_live_ ile başlamalıdır.')
      return
    }
    setAgentTestBusy(true)
    setAgentTestErr(null)
    setAgentTestMe(null)
    setAgentTestResv(null)
    setAgentTestSales(null)
    try {
      const q = {
        ...(agentTestFrom.trim() ? { from: agentTestFrom.trim() } : {}),
        ...(agentTestTo.trim() ? { to: agentTestTo.trim() } : {}),
      }
      const [me, resv, sales] = await Promise.all([
        getAgentMe(key),
        listAgentReservations(key),
        getAgentSalesSummary(key, q),
      ])
      setAgentTestMe(me)
      setAgentTestResv(resv.reservations)
      setAgentTestSales(sales)
    } catch (e) {
      setAgentTestErr(e instanceof Error ? e.message : 'agent_test_failed')
    } finally {
      setAgentTestBusy(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Bu anahtarı silmek istediğinize emin misiniz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setDeleting(id)
    try {
      await deleteAgencyApiKey(token, id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'delete_failed')
    } finally {
      setDeleting(null)
    }
  }

  if (state.kind === 'loading') {
    return <p className="text-neutral-600 dark:text-neutral-400">Yükleniyor…</p>
  }

  if (state.kind === 'no_token') {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-neutral-700 dark:text-neutral-300">
          Acente paneli için önce giriş yapın (üye oturumu).
        </p>
        <Link
          href={vitrinPath('/login')}
          className="mt-4 inline-block font-medium text-primary-600 underline dark:text-primary-400"
        >
          Giriş sayfası
        </Link>
      </div>
    )
  }

  if (state.kind === 'err') {
    const isForbidden = state.msg === 'not_agency' || state.msg === 'forbidden'
    const docPending = state.msg === 'agency_document_pending'
    const docRejected = state.msg === 'agency_document_rejected'
    const errMsg = docRejected
      ? 'Acente belge durumunuz reddedildi. Düzeltme ve yeniden değerlendirme için yönetici ile iletişime geçin.'
      : docPending
        ? 'Acente belge onayı bekleniyor. Yönetici, Acente profilleri bölümünden belge durumunu `approved` yapana kadar portal (ilan arama, API anahtarları, faturalar vb.) kapalıdır.'
        : isForbidden
          ? 'Bu sayfa yalnızca acente rolü atanmış hesaplar içindir. Yönetici kullanıcıya `agency` rolü ve kurum bağlantısı ekleyin (`user_roles`).'
          : state.msg
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-red-700 dark:text-red-300">{errMsg}</p>
        {!isForbidden && !docPending && !docRejected ? (
          <button type="button" onClick={() => void load()} className="mt-4 text-sm underline">
            Tekrar dene
          </button>
        ) : null}
      </div>
    )
  }

  const {
    me,
    keys,
    rates,
    reservations,
    sales,
    commissionAccruals,
    persistedAccruals,
    invoices,
    invoicesLoading,
    portalDocumentNotice,
  } = state

  const previewLineCount =
    invoicePreview != null && invoicePreview.line_count !== ''
      ? Number(invoicePreview.line_count)
      : null
  const previewBlocksCreate =
    previewLineCount !== null && !Number.isNaN(previewLineCount) && previewLineCount === 0

  async function runInvoicePreview() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setInvoiceBusy('preview')
    setInvoicePreview(null)
    setInvoiceSectionError(null)
    try {
      const p = await previewAgencyInvoice(token, {
        period_from: salesFrom.trim(),
        period_to: salesTo.trim(),
        ...(invCurrency.trim() ? { currency_code: invCurrency.trim() } : {}),
      })
      setInvoicePreview(p)
    } catch (e) {
      setInvoiceSectionError(invoiceErrorFromUnknown(e))
    } finally {
      setInvoiceBusy(null)
    }
  }

  async function toggleInvoiceDetail(invoiceId: string) {
    if (invoiceDetailOpen === invoiceId) {
      setInvoiceDetailOpen(null)
      setInvoiceDetail(null)
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    setInvoiceDetailOpen(invoiceId)
    setInvoiceDetail(null)
    setInvoiceDetailLoading(true)
    try {
      const d = await getAgencyInvoiceDetail(token, invoiceId)
      setInvoiceDetail(d)
    } catch (e) {
      setInvoiceSectionError(invoiceErrorFromUnknown(e))
      setInvoiceDetailOpen(null)
    } finally {
      setInvoiceDetailLoading(false)
    }
  }

  async function saveInvoiceNotes() {
    const id = invoiceDetailOpen
    if (!id || !invoiceDetail || invoiceDetail.invoice.status !== 'issued') return
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setInvoiceDetailActionBusy('save_notes')
    try {
      await patchAgencyInvoiceNotes(token, id, invoiceNotesDraft)
      const [invRes, d] = await Promise.all([listAgencyInvoices(token), getAgencyInvoiceDetail(token, id)])
      setState((prev: LoadState) => (prev.kind === 'ok' ? { ...prev, invoices: invRes.invoices } : prev))
      setInvoiceDetail(d)
      setInvoiceSectionError(null)
    } catch (e) {
      setInvoiceSectionError(invoiceErrorFromUnknown(e))
    } finally {
      setInvoiceDetailActionBusy(null)
    }
  }

  async function cancelOpenInvoice() {
    const id = invoiceDetailOpen
    if (!id || !invoiceDetail) return
    if (!confirm('Bu fatura iptal edilsin mi? Tahakkuk satırları bu faturadan ayrılır.')) return
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setInvoiceDetailActionBusy('cancel')
    try {
      await cancelAgencyInvoice(token, id)
      const q = {
        ...(salesFrom.trim() ? { from: salesFrom.trim() } : {}),
        ...(salesTo.trim() ? { to: salesTo.trim() } : {}),
      }
      const [invRes, commissionAccruals, persistedAccruals] = await Promise.all([
        listAgencyInvoices(token),
        getAgencyCommissionAccruals(token, q),
        getAgencyPersistedCommissionAccruals(token, q),
      ])
      setState((prev: LoadState) =>
        prev.kind === 'ok'
          ? { ...prev, invoices: invRes.invoices, commissionAccruals, persistedAccruals }
          : prev,
      )
      setInvoiceDetailOpen(null)
      setInvoiceDetail(null)
      setInvoiceSectionError(null)
    } catch (e) {
      setInvoiceSectionError(invoiceErrorFromUnknown(e))
    } finally {
      setInvoiceDetailActionBusy(null)
    }
  }

  async function runInvoiceCreate() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    if (!confirm('Seçilen dönem ve para birimi için fatura oluşturulsun mu? (Tahakkuk satırları bu faturaya bağlanır.)')) return
    setInvoiceBusy('create')
    setInvoiceSectionError(null)
    try {
      await createAgencyInvoice(token, {
        period_from: salesFrom.trim(),
        period_to: salesTo.trim(),
        ...(invCurrency.trim() ? { currency_code: invCurrency.trim() } : {}),
        ...(invNotes.trim() ? { notes: invNotes.trim() } : {}),
      })
      setInvoicePreview(null)
      const invRes = await listAgencyInvoices(token)
      const persisted = await getAgencyPersistedCommissionAccruals(token, {
        ...(salesFrom.trim() ? { from: salesFrom.trim() } : {}),
        ...(salesTo.trim() ? { to: salesTo.trim() } : {}),
      })
      setInvoiceDetailOpen(null)
      setInvoiceDetail(null)
      setInvNotes('')
      setState((prev: LoadState) =>
        prev.kind === 'ok'
          ? { ...prev, invoices: invRes.invoices, invoicesLoading: false, persistedAccruals: persisted }
          : prev,
      )
    } catch (e) {
      setInvoiceSectionError(invoiceErrorFromUnknown(e))
    } finally {
      setInvoiceBusy(null)
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Acente</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        API anahtarları, rezervasyonlar ve anlaşmalı komisyon oranları (G3.2). Checkout’ta{' '}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">agency_organization_id</code> ile
        acente kaydı bağlanır.
      </p>

      {portalDocumentNotice ? (
        <p
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          {portalDocumentNotice}
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">Kurum</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-neutral-500">Ad</dt>
            <dd>{me.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Slug (URL Yolu)</dt>
            <dd className="font-mono">{me.slug}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Belge durumu</dt>
            <dd>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  me.document_status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : me.document_status === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      : me.document_status === 'pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {me.document_status === 'approved'
                  ? '✓ Onaylandı'
                  : me.document_status === 'rejected'
                    ? '✗ Reddedildi'
                    : me.document_status === 'pending'
                      ? '⏳ İnceleniyor'
                      : me.document_status || '— Belge yok'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">İskonto %</dt>
            <dd>
              {me.discount_percent}
              <span className="mt-1 block text-xs text-neutral-500">
                Belge durumu <span className="font-mono">approved</span> iken acente checkout’ta satır toplamlarına
                uygulanır; <span className="font-mono">price_breakdown_json</span> içinde{' '}
                <span className="font-mono">agency_discount_percent</span> yazar.
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* ── TÜRSAB & Acente Doğrulama ────────────────────────────────────────── */}
      {me.document_status !== 'approved' && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">TÜRSAB Belge Doğrulaması</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Acente portalının tüm özelliklerine (API anahtarları, fatura, ilan erişimi) kavuşmak için TÜRSAB belge
            numaranızı ve firma bilgilerinizi girerek başvurun. Admin ekibimiz inceleyerek onaylayacaktır.
          </p>
          <div className="mt-4 max-w-xl">
            <AgencyVerificationWidget />
          </div>
        </section>
      )}

      <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">Yayında ilanlar</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Satış / yönlendirme için yayınlanmış ilanları arayın (en fazla 40 kayıt). Slug veya ilan UUID ile filtreleyebilirsiniz.
          Kurumunuza yönetici tarafından tanımlanmış en az bir kategori yetkisi varsa, yalnızca onaylı{' '}
          <span className="font-mono">product_categories.code</span> değerleri listelenir; hiç yetki kaydı yoksa tüm
          kategoriler görünür.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => void applyBrowseSearch(e)}
        >
          <Field className="min-w-[12rem] flex-1">
            <Label htmlFor="agency-browse-q">Ara</Label>
            <Input
              id="agency-browse-q"
              className="mt-1 font-mono text-sm"
              value={browseSearch}
              onChange={(e) => setBrowseSearch(e.target.value)}
              placeholder="slug veya UUID"
              autoComplete="off"
            />
          </Field>
          <ButtonPrimary type="submit" disabled={browseLoading}>
            {browseLoading ? '…' : 'Ara'}
          </ButtonPrimary>
        </form>
        {browseErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {browseErr}
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
                <th className="px-3 py-2 font-medium">Başlık</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">PB</th>
                <th className="px-3 py-2 font-medium">İlk tutar / ön ödeme</th>
                <th className="px-3 py-2 font-medium">Tedarikçi org.</th>
                <th className="px-3 py-2 w-28" />
              </tr>
            </thead>
            <tbody>
              {browseLoading && browseListings.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={6}>
                    Yükleniyor…
                  </td>
                </tr>
              ) : browseListings.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={6}>
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                browseListings.map((row) => (
                  <tr key={row.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="max-w-[14rem] px-3 py-2 text-neutral-800 dark:text-neutral-200">{row.title}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.slug}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.currency_code}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.first_charge_amount || '—'} / {row.prepayment_amount || '—'}
                    </td>
                    <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-[10px] text-neutral-600 dark:text-neutral-400">
                      {row.supplier_organization_id}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={vitrinPath(`/stay-listings/${encodeURIComponent(row.slug)}`)}
                        className="text-xs font-medium text-primary-600 underline dark:text-primary-400"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Sayfayı aç
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Satış özeti</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Tarih boşsa son 30 gün. Brüt toplam <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">price_breakdown_json.total</code>
          ; tahmini komisyon, tedarikçi anlaşmalarının{' '}
          <strong>ortalama</strong> yüzdesi ile çarpılır (gerçek dağılım tedarikçi başına değişir).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field className="min-w-[10rem]">
            <Label>Başlangıç</Label>
            <Input type="date" className="mt-1" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)} />
          </Field>
          <Field className="min-w-[10rem]">
            <Label>Bitiş</Label>
            <Input type="date" className="mt-1" value={salesTo} onChange={(e) => setSalesTo(e.target.value)} />
          </Field>
          <ButtonPrimary type="button" disabled={salesRefreshing} onClick={() => void applySalesRange()}>
            {salesRefreshing ? '…' : 'Özeti güncelle'}
          </ButtonPrimary>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="text-xs text-neutral-500">Rezervasyon adedi</div>
            <div className="text-2xl font-semibold">{sales.reservation_count}</div>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="text-xs text-neutral-500">Brüt toplam (JSON)</div>
            <div className="text-2xl font-semibold">{sales.gross_total}</div>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="text-xs text-neutral-500">Ort. komisyon % (anlaşma)</div>
            <div className="text-2xl font-semibold">
              {sales.average_commission_percent != null && sales.average_commission_percent !== ''
                ? sales.average_commission_percent
                : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <div className="text-xs text-neutral-500">Tahmini komisyon</div>
            <div className="text-2xl font-semibold">
              {sales.estimated_commission != null && sales.estimated_commission !== '' ? sales.estimated_commission : '—'}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-700">
          <div className="text-xs font-medium text-neutral-500">Duruma göre</div>
          <ul className="mt-2 space-y-1">
            {Object.entries(sales.by_status).map(([st, n]) => (
              <li key={st}>
                <span className="font-mono">{st}</span>: {n}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Komisyon tahakkuku (tahmini — satır kalemleri)
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Yalnızca <span className="font-mono">confirmed</span> / <span className="font-mono">completed</span>{' '}
            rezervasyonlar; brüt <span className="font-mono">reservation_line_items.line_total</span> üzerinden{' '}
            <span className="font-mono">supplier_agency_commissions</span> +{' '}
            <span className="font-mono">supplier_promotion_fee_rules</span> toplam % ile çarpılır. Yukarıdaki tarih
            aralığı &quot;Özeti güncelle&quot; ile aynıdır.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Rezervasyon adedi</div>
              <div className="text-xl font-semibold">{commissionAccruals.reservation_count}</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Brüt (satır toplamı)</div>
              <div className="text-xl font-semibold">{commissionAccruals.gross_total}</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Tahmini komisyon</div>
              <div className="text-xl font-semibold">{commissionAccruals.commission_total}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Kalıcı tahakkuk (ödeme sonrası, DB)
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            PayTR/Paratika <span className="font-mono">captured</span> sonrası yazılan{' '}
            <span className="font-mono">commission_accrual_lines</span>; filtre: kayıt{' '}
            <span className="font-mono">created_at</span>.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Satır adedi</div>
              <div className="text-xl font-semibold">{persistedAccruals.accrual_line_count}</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Brüt (kayıtlı)</div>
              <div className="text-xl font-semibold">{persistedAccruals.gross_total}</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-950/40">
              <div className="text-xs text-neutral-500">Komisyon (kayıtlı)</div>
              <div className="text-xl font-semibold">{persistedAccruals.commission_total}</div>
            </div>
          </div>
        </div>

        <div id="invoices" className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Komisyon faturaları</h3>
          <p className="mt-1 text-xs text-neutral-500">
            <span className="font-mono">commission_accrual_lines</span> üzerinden, yukarıdaki tarih aralığı (
            boşsa son 30 gün) ve isteğe bağlı para birimi ile kesilen kayıtlar. Birden fazla para birimi varsa{' '}
            <span className="font-mono">currency_code</span> girin (ör. <span className="font-mono">TRY</span>).
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field className="min-w-[8rem]">
              <Label>Para birimi (isteğe bağlı)</Label>
              <Input
                className="mt-1 font-mono text-sm"
                placeholder="TRY"
                value={invCurrency}
                onChange={(e) => setInvCurrency(e.target.value.toUpperCase())}
              />
            </Field>
            <ButtonPrimary type="button" disabled={invoiceBusy !== null} onClick={() => void runInvoicePreview()}>
              {invoiceBusy === 'preview' ? '…' : 'Önizle'}
            </ButtonPrimary>
            <ButtonPrimary
              type="button"
              disabled={invoiceBusy !== null || previewBlocksCreate}
              title={
                previewBlocksCreate
                  ? 'Önizlemede satır yok; fatura oluşturulamaz.'
                  : undefined
              }
              onClick={() => void runInvoiceCreate()}
            >
              {invoiceBusy === 'create' ? '…' : 'Fatura oluştur'}
            </ButtonPrimary>
          </div>
          <Field className="mt-3 max-w-xl">
            <Label>Fatura notu (isteğe bağlı)</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              placeholder="İç not veya açıklama"
            />
          </Field>
          {invoiceSectionError ? (
            <div
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              role="alert"
            >
              {invoiceSectionError}
            </div>
          ) : null}
          {invoicePreview ? (
            <div
              className={`mt-4 rounded-lg border bg-white p-4 text-sm dark:bg-neutral-950/40 ${
                previewBlocksCreate
                  ? 'border-amber-300 dark:border-amber-800/60'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className="font-medium">Önizleme</div>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-neutral-500">Dönem</dt>
                  <dd className="font-mono text-xs">
                    {invoicePreview.period_from || '—'} → {invoicePreview.period_to || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Para birimi</dt>
                  <dd className="font-mono">{invoicePreview.currency_code}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Satır</dt>
                  <dd>{invoicePreview.line_count}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Brüt / komisyon</dt>
                  <dd>
                    {invoicePreview.gross_total} / {invoicePreview.commission_total}
                  </dd>
                </div>
              </dl>
              {previewBlocksCreate ? (
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                  Satır sayısı 0 — bu dönem ve para birimi için fatura kesilemez. Tarih aralığını veya para birimini kontrol
                  edin.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2">Fatura no</th>
                  <th className="px-4 py-2">Dönem</th>
                  <th className="px-4 py-2">PB</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2">Satır</th>
                  <th className="px-4 py-2">Brüt</th>
                  <th className="px-4 py-2">Komisyon</th>
                  <th className="px-4 py-2">Oluşturulma</th>
                </tr>
              </thead>
              <tbody>
                {invoicesLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-neutral-500">
                      Yükleniyor…
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-neutral-500">
                      Henüz fatura yok.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      role="button"
                      tabIndex={0}
                      title={inv.status === 'cancelled' ? 'İptal edilmiş fatura — detay için tıklayın' : undefined}
                      onClick={() => void toggleInvoiceDetail(inv.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void toggleInvoiceDetail(inv.id)
                        }
                      }}
                      className={`cursor-pointer border-t border-neutral-100 dark:border-neutral-800 ${
                        inv.status === 'cancelled' ? 'opacity-60' : ''
                      } ${invoiceDetailOpen === inv.id ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-800/30`}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-2 text-xs">
                        {inv.period_from} → {inv.period_to}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{inv.currency_code}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${invoiceStatusBadgeClass(inv.status)}`}
                        >
                          {invoiceStatusLabelTr(inv.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2">{inv.line_count}</td>
                      <td className="px-4 py-2">{inv.gross_total}</td>
                      <td className="px-4 py-2">{inv.commission_total}</td>
                      <td className="px-4 py-2 text-xs text-neutral-600">{inv.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Satırları görmek için tabloda bir faturaya tıklayın (aynı faturaya tekrar tıklayınca kapanır).
          </p>
          {invoiceDetailOpen ? (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-neutral-900 dark:text-white">Fatura detayı</div>
                <div className="flex flex-wrap items-center gap-2">
                  {invoiceDetail && !invoiceDetailLoading ? (
                    <button
                      type="button"
                      onClick={() => {
                        const inv = invoiceDetail.invoice
                        const notesForPrint =
                          inv.status === 'issued' ? invoiceNotesDraft : (inv.notes ?? '')
                        printCommissionInvoice({
                          documentTitle: 'Acente komisyon faturası',
                          organizationName: me.name,
                          invoice_number: inv.invoice_number,
                          period_from: inv.period_from,
                          period_to: inv.period_to,
                          currency_code: inv.currency_code,
                          gross_total: inv.gross_total,
                          commission_total: inv.commission_total,
                          status_label: invoiceStatusLabelTr(inv.status),
                          notes: notesForPrint,
                          created_at: inv.created_at,
                          lines: invoiceDetail.lines.map((ln) => ({
                            public_code: ln.public_code,
                            gross_amount: ln.gross_amount,
                            commission_amount: ln.commission_amount,
                            currency_code: ln.currency_code,
                          })),
                        })
                      }}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      Yazdır / PDF
                    </button>
                  ) : null}
                  {invoiceDetail && !invoiceDetailLoading ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${invoiceStatusBadgeClass(invoiceDetail.invoice.status)}`}
                    >
                      {invoiceStatusLabelTr(invoiceDetail.invoice.status)}
                    </span>
                  ) : null}
                </div>
              </div>
              {invoiceDetailLoading ? (
                <p className="mt-3 text-sm text-neutral-500">Yükleniyor…</p>
              ) : invoiceDetail ? (
                <>
                  <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <span className="text-neutral-500">No:</span>{' '}
                    <span className="font-mono">{invoiceDetail.invoice.invoice_number}</span>
                  </p>
                  <div className="mt-4">
                    <Label className="text-xs">Not</Label>
                    {invoiceDetail.invoice.status === 'issued' ? (
                      <>
                        <Textarea
                          className="mt-1"
                          rows={3}
                          value={invoiceNotesDraft}
                          onChange={(e) => setInvoiceNotesDraft(e.target.value)}
                          disabled={invoiceDetailActionBusy !== null}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <ButtonPrimary
                            type="button"
                            disabled={invoiceDetailActionBusy !== null}
                            onClick={() => void saveInvoiceNotes()}
                          >
                            {invoiceDetailActionBusy === 'save_notes' ? '…' : 'Notu kaydet'}
                          </ButtonPrimary>
                          <button
                            type="button"
                            disabled={invoiceDetailActionBusy !== null}
                            onClick={() => void cancelOpenInvoice()}
                            className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            {invoiceDetailActionBusy === 'cancel' ? '…' : 'Faturayı iptal et'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
                        {invoiceDetail.invoice.notes?.trim() ? invoiceDetail.invoice.notes : '—'}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 text-sm font-medium text-neutral-900 dark:text-white">Satırlar</div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                        <tr>
                          <th className="px-3 py-2">Rez. kodu</th>
                          <th className="px-3 py-2">Brüt</th>
                          <th className="px-3 py-2">Komisyon</th>
                          <th className="px-3 py-2">PB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDetail.lines.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-neutral-500">
                              Satır yok.
                            </td>
                          </tr>
                        ) : (
                          invoiceDetail.lines.map((ln) => (
                            <tr key={ln.id} className="border-t border-neutral-100 dark:border-neutral-800">
                              <td className="px-3 py-2 font-mono">{ln.public_code}</td>
                              <td className="px-3 py-2">{ln.gross_amount}</td>
                              <td className="px-3 py-2">{ln.commission_amount}</td>
                              <td className="px-3 py-2 font-mono">{ln.currency_code}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Rezervasyonlar (bu acente)</h2>
        {reservations.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            Henüz kayıt yok. Checkout gövdesine geçerli acente kurum UUID’si ekleyin.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2">Kod</th>
                  <th className="px-4 py-2">İlan</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2">Tarih</th>
                  <th className="px-4 py-2">Oluşturulma</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-mono text-xs">{r.public_code}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {(r.listing_slug ?? '').trim() ? (
                        <Link
                          href={accountReservationListingHref(
                            (r.listing_slug ?? '').trim(),
                            r.listing_category_code,
                            vitrinPath,
                          )}
                          className="text-primary-600 underline dark:text-primary-400"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.listing_slug}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2">
                      {formatReservationDateOnly(r.starts_on, locale)} →{' '}
                      {formatReservationDateOnly(r.ends_on, locale)}
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-600">
                      {formatReservationDateTime(r.created_at, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Komisyon oranları (tedarikçi)</h2>
        {rates.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Kayıt yok.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2">Tedarikçi org. ID</th>
                  <th className="px-4 py-2">Komisyon %</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-mono text-xs">{r.supplier_organization_id}</td>
                    <td className="px-4 py-2">{r.commission_percent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">API anahtarları</h2>
        <form onSubmit={onCreate} className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="grow">
            <Label>Etiket (isteğe bağlı)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="örn. prod-satış" />
          </Field>
          <ButtonPrimary type="submit" disabled={creating}>
            {creating ? '…' : 'Yeni anahtar'}
          </ButtonPrimary>
        </form>
        {newSecret ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/40">
            <p className="font-medium text-amber-900 dark:text-amber-100">Anahtarı şimdi kopyalayın (bir daha gösterilmez):</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs">{newSecret}</pre>
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">Önek</th>
                <th className="px-4 py-2">Etiket</th>
                <th className="px-4 py-2">Kapsam</th>
                <th className="px-4 py-2">Oluşturulma</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-neutral-500">
                    Henüz anahtar yok.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-mono text-xs">{k.key_prefix}…</td>
                    <td className="px-4 py-2">{k.label || '—'}</td>
                    <td className="px-4 py-2 text-xs">{k.scopes.join(', ')}</td>
                    <td className="px-4 py-2 text-xs text-neutral-600">{k.created_at}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        disabled={deleting === k.id}
                        onClick={() => void onDelete(k.id)}
                        className="text-sm text-red-600 underline disabled:opacity-50 dark:text-red-400"
                      >
                        {deleting === k.id ? '…' : 'Sil'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">Agent API sınama (`trk_live_…`)</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Yeni oluşturduğunuz tam gizli anahtarı buraya yapıştırıp `/api/v1/agent/me`, rezervasyonlar ve satış özetini doğrulayın.
          Anahtar yalnızca tarayıcınızdan seyahat API’sine gider; sunucuya kaydedilmez.
        </p>
        <div className="mt-4 space-y-4 max-w-2xl">
          <Field>
            <Label htmlFor="agent-test-key">Tam API anahtarı</Label>
            <Input
              id="agent-test-key"
              type="password"
              className="mt-1.5 font-mono text-xs"
              value={agentTestKey}
              onChange={(e) => setAgentTestKey(e.target.value)}
              placeholder="trk_live_…"
              autoComplete="off"
            />
          </Field>
          <div className="flex flex-wrap items-end gap-4">
            <Field className="min-w-[10rem]">
              <Label>Satış özeti — başlangıç</Label>
              <Input type="date" className="mt-1" value={agentTestFrom} onChange={(e) => setAgentTestFrom(e.target.value)} />
            </Field>
            <Field className="min-w-[10rem]">
              <Label>Satış özeti — bitiş</Label>
              <Input type="date" className="mt-1" value={agentTestTo} onChange={(e) => setAgentTestTo(e.target.value)} />
            </Field>
          </div>
          <ButtonPrimary type="button" disabled={agentTestBusy} onClick={() => void runAgentApiTest()}>
            {agentTestBusy ? '…' : 'Sınama isteği gönder'}
          </ButtonPrimary>
        </div>
        {agentTestErr ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {agentTestErr}
          </p>
        ) : null}
        {agentTestMe ? (
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-200">GET /agent/me</div>
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-950/50">
                {JSON.stringify(agentTestMe, null, 2)}
              </pre>
            </div>
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-200">
                GET /agent/reservations ({agentTestResv?.length ?? 0} kayıt)
              </div>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-950/50">
                {JSON.stringify(agentTestResv ?? [], null, 2)}
              </pre>
            </div>
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-200">GET /agent/sales-summary</div>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-950/50">
                {JSON.stringify(agentTestSales, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
