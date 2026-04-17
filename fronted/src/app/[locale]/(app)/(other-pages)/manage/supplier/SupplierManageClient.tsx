'use client'

import {
  cancelSupplierInvoice,
  createSupplierInvoice,
  getSupplierCommissionAccruals,
  getSupplierInvoiceDetail,
  getSupplierPersistedCommissionAccruals,
  getSupplierMe,
  listSupplierAgencyCommissions,
  upsertSupplierAgencyCommission,
  deleteSupplierAgencyCommission,
  listSupplierInvoices,
  listSupplierListings,
  patchListingSocial,
  patchSupplierListing,
  listSupplierPromotionFeeRules,
  upsertSupplierPromotionFeeRule,
  deleteSupplierPromotionFeeRule,
  patchSupplierInvoiceNotes,
  previewSupplierInvoice,
  type SupplierAgencyCommissionRow,
  type SupplierCommissionAccruals,
  type PersistedCommissionAccruals,
  type SupplierInvoiceDetailResponse,
  type SupplierInvoicePreview,
  type SupplierInvoiceRow,
  type SupplierListingRow,
  type SupplierMe,
  type SupplierPromotionFeeRuleRow,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { CompanyVerificationWidget } from '@/components/travel/CompanyVerificationWidget'
import { invoiceErrorFromUnknown } from '@/lib/invoice-errors'
import { invoiceStatusBadgeClass, invoiceStatusLabelTr } from '@/lib/invoice-ui'
import { printCommissionInvoice } from '@/lib/print-commission-invoice'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

const PROMO_RULE_TYPES = ['ads_support', 'category_featured', 'homepage_feature'] as const

const PROMO_RULE_LABELS: Record<(typeof PROMO_RULE_TYPES)[number], string> = {
  ads_support: 'Reklam desteği',
  category_featured: 'Kategori öne çıkarma',
  homepage_feature: 'Ana sayfa öne çıkarma',
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'err'; msg: string }
  | {
      kind: 'ok'
      me: SupplierMe
      listings: SupplierListingRow[]
      agencyCommissions: SupplierAgencyCommissionRow[]
      promotionRules: SupplierPromotionFeeRuleRow[]
      commissionAccruals: SupplierCommissionAccruals
      persistedAccruals: PersistedCommissionAccruals
      invoices: SupplierInvoiceRow[]
      invoicesLoading: boolean
    }

export default function SupplierManageClient() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [commFrom, setCommFrom] = useState('')
  const [commTo, setCommTo] = useState('')
  const [commRefreshing, setCommRefreshing] = useState(false)
  const [invCurrency, setInvCurrency] = useState('')
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null)
  const [invoicePreview, setInvoicePreview] = useState<SupplierInvoicePreview | null>(null)
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState<string | null>(null)
  const [invoiceDetail, setInvoiceDetail] = useState<SupplierInvoiceDetailResponse | null>(null)
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false)
  const [invNotes, setInvNotes] = useState('')
  const [invoiceNotesDraft, setInvoiceNotesDraft] = useState('')
  const [invoiceDetailActionBusy, setInvoiceDetailActionBusy] = useState<'save_notes' | 'cancel' | null>(null)
  const [invoiceSectionError, setInvoiceSectionError] = useState<string | null>(null)
  const [listingDrafts, setListingDrafts] = useState<
    Record<string, { commission_percent: string; prepayment_amount: string; prepayment_percent: string }>
  >({})
  const [listingSaveBusy, setListingSaveBusy] = useState<string | null>(null)
  const [listingSocialBusy, setListingSocialBusy] = useState<string | null>(null)
  const [listingSaveError, setListingSaveError] = useState<string | null>(null)
  const [listingSearch, setListingSearch] = useState('')
  const [listingSearchBusy, setListingSearchBusy] = useState(false)
  const [promoEdits, setPromoEdits] = useState<Record<string, string>>({})
  const [promoBusy, setPromoBusy] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [sacDrafts, setSacDrafts] = useState<Record<string, string>>({})
  const [sacNewAgencyId, setSacNewAgencyId] = useState('')
  const [sacNewPercent, setSacNewPercent] = useState('')
  const [sacBusy, setSacBusy] = useState<string | null>(null)
  const [sacError, setSacError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    setInvoiceDetailOpen(null)
    setInvoiceDetail(null)
    setInvoiceSectionError(null)
    setListingSearch('')
    setPromoEdits({})
    setPromoError(null)
    setSacNewAgencyId('')
    setSacNewPercent('')
    setSacError(null)
    setState({ kind: 'loading' })
    try {
      const [me, listRes, sacRes, promoRes, commissionAccruals, persistedAccruals] = await Promise.all([
        getSupplierMe(token),
        listSupplierListings(token),
        listSupplierAgencyCommissions(token),
        listSupplierPromotionFeeRules(token),
        getSupplierCommissionAccruals(token),
        getSupplierPersistedCommissionAccruals(token),
      ])
      setState({
        kind: 'ok',
        me,
        listings: listRes.listings,
        agencyCommissions: sacRes.agency_commissions,
        promotionRules: promoRes.promotion_fee_rules,
        commissionAccruals,
        persistedAccruals,
        invoices: [],
        invoicesLoading: true,
      })
      void listSupplierInvoices(token)
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

  const listingsSig =
    state.kind === 'ok'
      ? state.listings
          .map(
            (l) =>
              `${l.id}:${l.commission_percent}:${l.prepayment_amount}:${l.prepayment_percent}:${l.slug}`,
          )
          .join('|')
      : ''

  useEffect(() => {
    if (state.kind !== 'ok') return
    setListingDrafts(
      Object.fromEntries(
        state.listings.map((r) => [
          r.id,
          {
            commission_percent: r.commission_percent ?? '',
            prepayment_amount: r.prepayment_amount ?? '',
            prepayment_percent: r.prepayment_percent ?? '',
          },
        ]),
      ),
    )
  }, [listingsSig])

  const agencySig =
    state.kind === 'ok'
      ? state.agencyCommissions.map((r) => `${r.id}:${r.commission_percent}`).join('|')
      : ''

  useEffect(() => {
    if (state.kind !== 'ok') return
    setSacDrafts(
      Object.fromEntries(state.agencyCommissions.map((r) => [r.id, r.commission_percent ?? ''])),
    )
  }, [agencySig, state.kind])

  useEffect(() => {
    if (invoiceDetail?.invoice) {
      setInvoiceNotesDraft(invoiceDetail.invoice.notes ?? '')
    }
  }, [invoiceDetail])

  async function applyCommissionRange() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setCommRefreshing(true)
    try {
      const q = {
        ...(commFrom.trim() ? { from: commFrom.trim() } : {}),
        ...(commTo.trim() ? { to: commTo.trim() } : {}),
      }
      const [commissionAccruals, persistedAccruals] = await Promise.all([
        getSupplierCommissionAccruals(token, q),
        getSupplierPersistedCommissionAccruals(token, q),
      ])
      setState((prev: LoadState) =>
        prev.kind === 'ok' ? { ...prev, commissionAccruals, persistedAccruals } : prev,
      )
    } catch (e) {
      setInvoiceSectionError(e instanceof Error ? e.message : 'commission_refresh_failed')
    } finally {
      setCommRefreshing(false)
    }
  }

  async function saveListingRow(id: string) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    const d = listingDrafts[id]
    if (!d) return
    if (d.commission_percent.trim() && d.prepayment_percent.trim()) {
      const c = parseFloat(String(d.commission_percent).replace(',', '.'))
      const p = parseFloat(String(d.prepayment_percent).replace(',', '.'))
      if (Number.isFinite(c) && Number.isFinite(p) && p < c) {
        setListingSaveError('Ön ödeme yüzdesi, komisyon oranından küçük olamaz.')
        return
      }
    }
    setListingSaveError(null)
    setListingSaveBusy(id)
    try {
      await patchSupplierListing(token, id, {
        commission_percent: d.commission_percent,
        prepayment_amount: d.prepayment_amount,
        prepayment_percent: d.prepayment_percent,
      })
      await load()
    } catch (e) {
      setListingSaveError(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setListingSaveBusy(null)
    }
  }

  async function updateListingSocialFlags(listingId: string, share: boolean, allowAi: boolean) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setListingSocialBusy(listingId)
    setListingSaveError(null)
    try {
      await patchListingSocial(token, listingId, {
        share_to_social: share,
        allow_ai_caption: allowAi,
      })
      const listRes = await listSupplierListings(token, listingSearch.trim() || undefined)
      setState((prev: LoadState) => (prev.kind === 'ok' ? { ...prev, listings: listRes.listings } : prev))
    } catch (e) {
      setListingSaveError(e instanceof Error ? e.message : 'social_patch_failed')
    } finally {
      setListingSocialBusy(null)
    }
  }

  async function savePromoRule(ruleType: (typeof PROMO_RULE_TYPES)[number]) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    const existing = state.promotionRules.find((r) => r.rule_type === ruleType)
    const pct = (promoEdits[ruleType] ?? existing?.extra_commission_percent ?? '').trim()
    if (!pct) {
      setPromoError('Ek komisyon oranı gerekli.')
      return
    }
    setPromoError(null)
    setPromoBusy(ruleType)
    try {
      await upsertSupplierPromotionFeeRule(token, {
        rule_type: ruleType,
        extra_commission_percent: pct,
      })
      const pr = await listSupplierPromotionFeeRules(token)
      setPromoEdits((prev) => {
        const next = { ...prev }
        delete next[ruleType]
        return next
      })
      setState((prev: LoadState) =>
        prev.kind === 'ok' ? { ...prev, promotionRules: pr.promotion_fee_rules } : prev,
      )
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : 'promo_save_failed')
    } finally {
      setPromoBusy(null)
    }
  }

  async function saveSacRow(row: SupplierAgencyCommissionRow) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    const pct = (sacDrafts[row.id] ?? row.commission_percent ?? '').trim()
    if (!pct) {
      setSacError('Komisyon yüzdesi gerekli.')
      return
    }
    setSacError(null)
    setSacBusy(row.id)
    try {
      const aid = row.agency_organization_id.trim()
      await upsertSupplierAgencyCommission(token, {
        ...(aid ? { agency_organization_id: aid } : {}),
        commission_percent: pct,
      })
      const list = await listSupplierAgencyCommissions(token)
      setState((prev: LoadState) =>
        prev.kind === 'ok' ? { ...prev, agencyCommissions: list.agency_commissions } : prev,
      )
    } catch (e) {
      setSacError(e instanceof Error ? e.message : 'sac_save_failed')
    } finally {
      setSacBusy(null)
    }
  }

  async function saveSacNew() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    const pct = sacNewPercent.trim()
    if (!pct) {
      setSacError('Yeni satır için komisyon yüzdesi gerekli.')
      return
    }
    setSacError(null)
    setSacBusy('new')
    try {
      const aid = sacNewAgencyId.trim()
      await upsertSupplierAgencyCommission(token, {
        ...(aid ? { agency_organization_id: aid } : {}),
        commission_percent: pct,
      })
      const list = await listSupplierAgencyCommissions(token)
      setSacNewAgencyId('')
      setSacNewPercent('')
      setState((prev: LoadState) =>
        prev.kind === 'ok' ? { ...prev, agencyCommissions: list.agency_commissions } : prev,
      )
    } catch (e) {
      setSacError(e instanceof Error ? e.message : 'sac_add_failed')
    } finally {
      setSacBusy(null)
    }
  }

  async function removeSacRow(row: SupplierAgencyCommissionRow) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setSacError(null)
    setSacBusy(row.id)
    try {
      await deleteSupplierAgencyCommission(token, row.id)
      const list = await listSupplierAgencyCommissions(token)
      setState((prev: LoadState) =>
        prev.kind === 'ok' ? { ...prev, agencyCommissions: list.agency_commissions } : prev,
      )
    } catch (e) {
      setSacError(e instanceof Error ? e.message : 'sac_delete_failed')
    } finally {
      setSacBusy(null)
    }
  }

  async function removePromoRule(ruleType: (typeof PROMO_RULE_TYPES)[number]) {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    const existing = state.promotionRules.find((r) => r.rule_type === ruleType)
    if (!existing) return
    setPromoError(null)
    setPromoBusy(ruleType)
    try {
      await deleteSupplierPromotionFeeRule(token, existing.id)
      const pr = await listSupplierPromotionFeeRules(token)
      setPromoEdits((prev) => {
        const next = { ...prev }
        delete next[ruleType]
        return next
      })
      setState((prev: LoadState) =>
        prev.kind === 'ok' ? { ...prev, promotionRules: pr.promotion_fee_rules } : prev,
      )
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : 'promo_delete_failed')
    } finally {
      setPromoBusy(null)
    }
  }

  async function applyListingSearch(e?: FormEvent) {
    e?.preventDefault()
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setListingSearchBusy(true)
    try {
      const r = await listSupplierListings(token, listingSearch.trim() || undefined)
      setState((prev) => (prev.kind === 'ok' ? { ...prev, listings: r.listings } : prev))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'listing_search_failed')
    } finally {
      setListingSearchBusy(false)
    }
  }

  async function resetListingSearch() {
    setListingSearch('')
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setListingSearchBusy(true)
    try {
      const r = await listSupplierListings(token)
      setState((prev) => (prev.kind === 'ok' ? { ...prev, listings: r.listings } : prev))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'listing_search_failed')
    } finally {
      setListingSearchBusy(false)
    }
  }

  if (state.kind === 'loading') {
    return <p className="text-neutral-600 dark:text-neutral-400">Yükleniyor…</p>
  }

  if (state.kind === 'no_token') {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-neutral-700 dark:text-neutral-300">
          Tedarikçi paneli için önce giriş yapın (üye oturumu).
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
    const isForbidden = state.msg === 'not_supplier' || state.msg === 'forbidden'
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-red-700 dark:text-red-300">
          {isForbidden
            ? 'Bu sayfa yalnızca tedarikçi rolü ve `supplier.portal` izni olan hesaplar içindir; `supplier_profiles` ve `organizations.org_type = supplier` gerekir.'
            : state.msg}
        </p>
        {!isForbidden ? (
          <button type="button" onClick={() => void load()} className="mt-4 text-sm underline">
            Tekrar dene
          </button>
        ) : null}
      </div>
    )
  }

  const {
    me,
    listings,
    agencyCommissions,
    promotionRules,
    commissionAccruals,
    persistedAccruals,
    invoices,
    invoicesLoading,
  } = state

  const previewLineCount =
    invoicePreview != null && invoicePreview.line_count !== ''
      ? Number(invoicePreview.line_count)
      : null
  const previewBlocksCreate =
    previewLineCount !== null && !Number.isNaN(previewLineCount) && previewLineCount === 0

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
      const d = await getSupplierInvoiceDetail(token, invoiceId)
      setInvoiceDetail(d)
    } catch (e) {
      setInvoiceSectionError(invoiceErrorFromUnknown(e))
      setInvoiceDetailOpen(null)
    } finally {
      setInvoiceDetailLoading(false)
    }
  }

  async function runInvoicePreview() {
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setInvoiceBusy('preview')
    setInvoicePreview(null)
    setInvoiceSectionError(null)
    try {
      const p = await previewSupplierInvoice(token, {
        period_from: commFrom.trim(),
        period_to: commTo.trim(),
        ...(invCurrency.trim() ? { currency_code: invCurrency.trim() } : {}),
      })
      setInvoicePreview(p)
    } catch (e) {
      setInvoiceSectionError(invoiceErrorFromUnknown(e))
    } finally {
      setInvoiceBusy(null)
    }
  }

  async function saveInvoiceNotes() {
    const id = invoiceDetailOpen
    if (!id || !invoiceDetail || invoiceDetail.invoice.status !== 'issued') return
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setInvoiceDetailActionBusy('save_notes')
    try {
      await patchSupplierInvoiceNotes(token, id, invoiceNotesDraft)
      const [invRes, d] = await Promise.all([listSupplierInvoices(token), getSupplierInvoiceDetail(token, id)])
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
      await cancelSupplierInvoice(token, id)
      const q = {
        ...(commFrom.trim() ? { from: commFrom.trim() } : {}),
        ...(commTo.trim() ? { to: commTo.trim() } : {}),
      }
      const [invRes, commissionAccruals, persistedAccruals] = await Promise.all([
        listSupplierInvoices(token),
        getSupplierCommissionAccruals(token, q),
        getSupplierPersistedCommissionAccruals(token, q),
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
      await createSupplierInvoice(token, {
        period_from: commFrom.trim(),
        period_to: commTo.trim(),
        ...(invCurrency.trim() ? { currency_code: invCurrency.trim() } : {}),
        ...(invNotes.trim() ? { notes: invNotes.trim() } : {}),
      })
      setInvoicePreview(null)
      setInvoiceDetailOpen(null)
      setInvoiceDetail(null)
      setInvNotes('')
      const invRes = await listSupplierInvoices(token)
      const persisted = await getSupplierPersistedCommissionAccruals(token, {
        ...(commFrom.trim() ? { from: commFrom.trim() } : {}),
        ...(commTo.trim() ? { to: commTo.trim() } : {}),
      })
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
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Tedarikçi</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        İlanlar, acente bazlı komisyonlar ve öne çıkarma ek oranları (G3.3 — ilk dilim).
      </p>

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
            <dt className="text-neutral-500">Profil oluşturulma</dt>
            <dd className="text-xs text-neutral-600">{me.profile_created_at}</dd>
          </div>
        </dl>
      </section>

      {/* ── Firma Doğrulama ──────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-lg font-medium">Firma Doğrulama</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Tedarikçi olarak faaliyet göstermek ve faturalama süreçlerini başlatmak için firmanızı VKN ile doğrulayın.
          Bilgileriniz GİB (Gelir İdaresi Başkanlığı) kayıtlarıyla karşılaştırılır ve admin ekibimiz tarafından onaylanır.
        </p>
        <div className="mt-4 max-w-xl">
          <CompanyVerificationWidget />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">İlanlar</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Komisyon % ve ön ödeme: boş bırakılan alanlar kayıtta değişmez; en az bir alan dolu olmalıdır. Slug veya ilan
          UUID ile arayabilirsiniz. Sosyal sütunları paylaşım kuyruğu ve AI alt yazı için (
          <span className="font-mono">supplier.portal</span>).
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => void applyListingSearch(e)}
        >
          <Field className="min-w-[12rem] flex-1">
            <Label htmlFor="supplier-listing-q">Ara</Label>
            <Input
              id="supplier-listing-q"
              className="mt-1 font-mono text-sm"
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              placeholder="slug veya UUID"
              autoComplete="off"
            />
          </Field>
          <ButtonPrimary type="submit" disabled={listingSearchBusy}>
            {listingSearchBusy ? '…' : 'Ara'}
          </ButtonPrimary>
          <button
            type="button"
            disabled={listingSearchBusy}
            onClick={() => void resetListingSearch()}
            className="text-sm font-medium text-neutral-600 underline disabled:opacity-50 dark:text-neutral-400"
          >
            Tümü
          </button>
        </form>
        {listingSaveError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{listingSaveError}</p>
        ) : null}
        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Bu kuruma bağlı ilan yok.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2">Slug (URL Yolu)</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2">PB</th>
                  <th className="px-4 py-2">Komisyon %</th>
                  <th className="px-4 py-2">Ön ödeme tutar</th>
                  <th className="px-4 py-2">Ön ödeme %</th>
                  <th className="px-4 py-2 text-center">Sosyal</th>
                  <th className="px-4 py-2 text-center">AI alt yazı</th>
                  <th className="px-4 py-2">Oluşturulma</th>
                  <th className="px-4 py-2 w-28" />
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {listings.map((r) => {
                  const d = listingDrafts[r.id] ?? {
                    commission_percent: r.commission_percent ?? '',
                    prepayment_amount: r.prepayment_amount ?? '',
                    prepayment_percent: r.prepayment_percent ?? '',
                  }
                  return (
                    <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-4 py-2 font-mono text-xs">{r.slug}</td>
                      <td className="px-4 py-2">{r.status}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.currency_code}</td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 max-w-[5rem] font-mono text-xs"
                          value={d.commission_percent}
                          onChange={(e) =>
                            setListingDrafts((prev) => {
                              const cur = prev[r.id] ?? {
                                commission_percent: r.commission_percent ?? '',
                                prepayment_amount: r.prepayment_amount ?? '',
                                prepayment_percent: r.prepayment_percent ?? '',
                              }
                              return { ...prev, [r.id]: { ...cur, commission_percent: e.target.value } }
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 max-w-[6rem] font-mono text-xs"
                          value={d.prepayment_amount}
                          onChange={(e) =>
                            setListingDrafts((prev) => {
                              const cur = prev[r.id] ?? {
                                commission_percent: r.commission_percent ?? '',
                                prepayment_amount: r.prepayment_amount ?? '',
                                prepayment_percent: r.prepayment_percent ?? '',
                              }
                              return { ...prev, [r.id]: { ...cur, prepayment_amount: e.target.value } }
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 max-w-[5rem] font-mono text-xs"
                          value={d.prepayment_percent}
                          onChange={(e) =>
                            setListingDrafts((prev) => {
                              const cur = prev[r.id] ?? {
                                commission_percent: r.commission_percent ?? '',
                                prepayment_amount: r.prepayment_amount ?? '',
                                prepayment_percent: r.prepayment_percent ?? '',
                              }
                              return { ...prev, [r.id]: { ...cur, prepayment_percent: e.target.value } }
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary-600"
                          checked={Boolean(r.share_to_social)}
                          disabled={listingSocialBusy === r.id}
                          title="Sosyal paylaşım kuyruğuna uygun"
                          onChange={(e) =>
                            void updateListingSocialFlags(
                              r.id,
                              e.target.checked,
                              e.target.checked ? Boolean(r.allow_ai_caption) : false,
                            )
                          }
                          aria-label="Sosyal paylaşım"
                        />
                      </td>
                      <td className="px-4 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary-600"
                          checked={Boolean(r.allow_ai_caption)}
                          disabled={listingSocialBusy === r.id || !r.share_to_social}
                          title="Önce sosyal işaretleyin"
                          onChange={(e) =>
                            void updateListingSocialFlags(
                              r.id,
                              Boolean(r.share_to_social),
                              e.target.checked,
                            )
                          }
                          aria-label="AI alt yazı"
                        />
                      </td>
                      <td className="px-4 py-2 text-xs text-neutral-600">{r.created_at}</td>
                      <td className="px-4 py-2">
                        <Link
                          href={vitrinPath(`/stay-listings/${encodeURIComponent(r.slug)}`)}
                          className="text-xs font-medium text-primary-600 underline dark:text-primary-400"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Sayfa
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          disabled={listingSaveBusy === r.id}
                          onClick={() => void saveListingRow(r.id)}
                          className="text-xs font-medium text-primary-600 underline disabled:opacity-50 dark:text-primary-400"
                        >
                          {listingSaveBusy === r.id ? '…' : 'Kaydet'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Acente komisyonları</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Acente kurum UUID&apos;si ile satır başına oran; alan boş bırakılırsa{' '}
          <span className="font-medium">varsayılan</span> (rezervasyonda acente yok / eşleşme yok) komisyonu tanımlanır.
          Tahakkuk hesapları bu tabloya göre ilgili acente veya varsayılan satırı kullanır.
        </p>
        {sacError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {sacError}
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">Acente org. ID</th>
                <th className="px-4 py-2">Komisyon %</th>
                <th className="px-4 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {agencyCommissions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-neutral-500">
                    Henüz satır yok. Aşağıdan varsayılan veya acente bazlı satır ekleyin.
                  </td>
                </tr>
              ) : (
                agencyCommissions.map((r) => {
                  const busy = sacBusy === r.id
                  const pctVal = sacDrafts[r.id] ?? r.commission_percent ?? ''
                  return (
                    <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-4 py-2 font-mono text-xs align-middle">
                        {r.agency_organization_id || '— (varsayılan)'}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="max-w-[8rem]"
                          value={pctVal}
                          disabled={busy}
                          onChange={(e) =>
                            setSacDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                          aria-label={`Komisyon % (${r.agency_organization_id || 'varsayılan'})`}
                        />
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <ButtonPrimary
                            type="button"
                            disabled={busy}
                            onClick={() => void saveSacRow(r)}
                          >
                            {busy ? '…' : 'Kaydet'}
                          </ButtonPrimary>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void removeSacRow(r)}
                            className="rounded-2xl border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-600">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Yeni satır</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <Field className="min-w-[14rem] flex-1">
              <Label>Acente kurum UUID (boş = varsayılan)</Label>
              <Input
                className="mt-1 font-mono text-xs"
                value={sacNewAgencyId}
                disabled={sacBusy === 'new'}
                onChange={(e) => setSacNewAgencyId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </Field>
            <Field className="min-w-[8rem]">
              <Label>Komisyon %</Label>
              <Input
                type="text"
                inputMode="decimal"
                className="mt-1"
                value={sacNewPercent}
                disabled={sacBusy === 'new'}
                onChange={(e) => setSacNewPercent(e.target.value)}
              />
            </Field>
            <ButtonPrimary type="button" disabled={sacBusy === 'new'} onClick={() => void saveSacNew()}>
              {sacBusy === 'new' ? '…' : 'Ekle / güncelle'}
            </ButtonPrimary>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/30">
        <h2 className="text-lg font-medium">Komisyon tahakkuku (tahmini — satır kalemleri)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          <span className="font-mono">confirmed</span> / <span className="font-mono">completed</span> rezervasyonlar;
          brüt <span className="font-mono">line_total</span>; oran: anlaşma + öne çıkarma kuralları toplamı. Tarih boşsa
          son 30 gün (rezervasyon <span className="font-mono">created_at</span>).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field className="min-w-[10rem]">
            <Label>Başlangıç</Label>
            <Input type="date" className="mt-1" value={commFrom} onChange={(e) => setCommFrom(e.target.value)} />
          </Field>
          <Field className="min-w-[10rem]">
            <Label>Bitiş</Label>
            <Input type="date" className="mt-1" value={commTo} onChange={(e) => setCommTo(e.target.value)} />
          </Field>
          <ButtonPrimary type="button" disabled={commRefreshing} onClick={() => void applyCommissionRange()}>
            {commRefreshing ? '…' : 'Güncelle'}
          </ButtonPrimary>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950/40">
            <div className="text-xs text-neutral-500">Rezervasyon adedi</div>
            <div className="text-2xl font-semibold">{commissionAccruals.reservation_count}</div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950/40">
            <div className="text-xs text-neutral-500">Brüt (satır)</div>
            <div className="text-2xl font-semibold">{commissionAccruals.gross_total}</div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950/40">
            <div className="text-xs text-neutral-500">Tahmini komisyon</div>
            <div className="text-2xl font-semibold">{commissionAccruals.commission_total}</div>
          </div>
        </div>

        <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Kalıcı tahakkuk (ödeme sonrası, DB)
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            <span className="font-mono">commission_accrual_lines</span>; filtre: <span className="font-mono">created_at</span>.
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
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Komisyon faturaları (tedarikçi)</h3>
          <p className="mt-1 text-xs text-neutral-500">
            <span className="font-mono">commission_accrual_lines</span> üzerinden, yukarıdaki tarih aralığı (boşsa son 30
            gün) ve isteğe bağlı para birimi. Birden fazla para birimi varsa{' '}
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
              title={previewBlocksCreate ? 'Önizlemede satır yok; fatura oluşturulamaz.' : undefined}
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
                          documentTitle: 'Tedarikçi komisyon faturası',
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

        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">Acente org.</th>
                <th className="px-4 py-2">Brüt</th>
                <th className="px-4 py-2">Komisyon</th>
              </tr>
            </thead>
            <tbody>
              {commissionAccruals.by_agency.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-neutral-500">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                commissionAccruals.by_agency.map((row, i) => (
                  <tr key={`${row.agency_organization_id ?? 'direct'}-${i}`} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-mono text-xs">
                      {row.agency_organization_id ?? '— (direkt / acente yok)'}
                    </td>
                    <td className="px-4 py-2">{row.gross_total}</td>
                    <td className="px-4 py-2">{row.commission_total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Öne çıkarma ek oranları</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Reklam, kategori ve ana sayfa öne çıkarma için ek komisyon yüzdeleri. Tahakkuk özetlerinde bu oranlar ilan
          komisyonuna eklenir.
        </p>
        {promoError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {promoError}
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">Alan</th>
                <th className="px-4 py-2">Ek komisyon %</th>
                <th className="px-4 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {PROMO_RULE_TYPES.map((ruleType) => {
                const row = promotionRules.find((r) => r.rule_type === ruleType)
                const value = promoEdits[ruleType] ?? row?.extra_commission_percent ?? ''
                const busy = promoBusy === ruleType
                return (
                  <tr key={ruleType} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {PROMO_RULE_LABELS[ruleType]}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-neutral-500">{ruleType}</span>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="max-w-[8rem]"
                        value={value}
                        disabled={busy}
                        onChange={(e) =>
                          setPromoEdits((prev) => ({ ...prev, [ruleType]: e.target.value }))
                        }
                        aria-label={`${PROMO_RULE_LABELS[ruleType]} ek komisyon`}
                      />
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="flex flex-wrap gap-2">
                        <ButtonPrimary
                          type="button"
                          disabled={busy}
                          onClick={() => void savePromoRule(ruleType)}
                        >
                          {busy ? '…' : 'Kaydet'}
                        </ButtonPrimary>
                        <button
                          type="button"
                          disabled={busy || !row}
                          onClick={() => void removePromoRule(ruleType)}
                          className="rounded-2xl border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
