'use client'

import {
  addCartLine,
  checkoutCart,
  createCart,
  getActivePaymentProvider,
  getAgencyBrowseListings,
  getAgencyMe,
  type AgencyBrowseListingRow,
  type AgencyMe,
} from '@/lib/travel-api'
import CheckoutContractAcceptance, {
  type CheckoutContractAcceptancePayload,
} from '@/components/CheckoutContractAcceptance'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

function toYmd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function formatAgencyFlowError(msg: string): string {
  if (msg === 'agency_document_pending' || msg === 'agency_document_rejected') {
    return 'Belge onayı olmadan ilan listesi ve satış kapalı. Yönetici onayından sonra tekrar deneyin.'
  }
  if (msg === 'agency_document_not_approved' || msg === 'agency_document_check_failed') {
    return 'Checkout için acente belge onayı gerekir.'
  }
  return msg
}

function defaultUnitPrice(row: AgencyBrowseListingRow): string {
  const fc = row.first_charge_amount?.trim()
  const prep = row.prepayment_amount?.trim()
  if (fc && fc !== '0' && fc !== '0.00') return fc
  if (prep && prep !== '0' && prep !== '0.00') return prep
  return '100.00'
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'err'; msg: string }
  | { kind: 'ok'; me: AgencyMe }

export default function AgencySalesClient() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState<AgencyBrowseListingRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [selected, setSelected] = useState<AgencyBrowseListingRow | null>(null)
  const [unitPrice, setUnitPrice] = useState('100.00')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const agencyContractRef = useRef<CheckoutContractAcceptancePayload>({
    ok: false,
    contract_accepted: false,
    general_contract_accepted: true,
    sales_contract_accepted: true,
  })
  const onAgencyContractValidity = useCallback((p: CheckoutContractAcceptancePayload) => {
    agencyContractRef.current = p
  }, [])

  const loadMe = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    try {
      const me = await getAgencyMe(token)
      setState({ kind: 'ok', me })
    } catch (e) {
      setState({ kind: 'err', msg: e instanceof Error ? e.message : 'load_failed' })
    }
  }, [])

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  async function runSearch() {
    const token = getStoredAuthToken()
    if (!token) return
    setListLoading(true)
    try {
      const res = await getAgencyBrowseListings(token, search.trim() || undefined)
      setListings(res.listings)
    } catch (e) {
      const m = e instanceof Error ? e.message : 'search_failed'
      alert(formatAgencyFlowError(m))
    } finally {
      setListLoading(false)
    }
  }

  function pickListing(row: AgencyBrowseListingRow) {
    setSelected(row)
    setUnitPrice(defaultUnitPrice(row))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok' || !selected) return
    const start = toYmd(startDate)
    const end = toYmd(endDate)
    const email = guestEmail.trim()
    const name = guestName.trim()
    if (!start || !end || !email || !name) {
      alert('Tarih, misafir e-posta ve ad zorunlu.')
      return
    }
    if (!agencyContractRef.current.ok) {
      alert('Gerekli tüm sözleşmeleri okuyup onaylamanız gerekir.')
      return
    }
    setSubmitting(true)
    try {
      const cart = await createCart(selected.currency_code)
      await addCartLine(
        cart.id,
        {
          listing_id: selected.id,
          quantity: 1,
          starts_on: start,
          ends_on: end,
          unit_price: unitPrice.trim() || '100.00',
          agency_organization_id: state.me.organization_id,
        },
        token,
      )
      const cx = agencyContractRef.current
      const out = await checkoutCart(
        cart.id,
        {
          guest_email: email,
          guest_name: name,
          ...(guestPhone.trim() ? { guest_phone: guestPhone.trim() } : {}),
          agency_organization_id: state.me.organization_id,
          contract_accepted: cx.contract_accepted,
          general_contract_accepted: cx.general_contract_accepted,
          sales_contract_accepted: cx.sales_contract_accepted,
          contract_locale: locale,
        },
        token,
      )
      const payload = {
        reservation_id: out.reservation_id,
        public_code: out.public_code,
        email,
        guest_name: name,
        payment_amount: out.payment_amount,
        currency_code: out.currency_code,
      }
      let provider: 'paytr' | 'paratika' | 'none' = 'none'
      try {
        const ap = await getActivePaymentProvider()
        if (ap.active === 'paytr' || ap.active === 'paratika') provider = ap.active
      } catch {
        /* ignore */
      }
      if (provider === 'none' && process.env.NEXT_PUBLIC_PAYTR_CHECKOUT !== '0') {
        provider = 'paytr'
      }
      if (provider === 'paytr') {
        sessionStorage.setItem('travel_paytr_checkout', JSON.stringify(payload))
        router.push(vitrinPath('/checkout/paytr'))
      } else if (provider === 'paratika') {
        sessionStorage.setItem('travel_paratika_checkout', JSON.stringify(payload))
        router.push(vitrinPath('/checkout/paratika'))
      } else {
        router.push(`${vitrinPath('/pay-done')}?code=${encodeURIComponent(out.public_code)}`)
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : 'checkout_failed'
      alert(formatAgencyFlowError(m))
    } finally {
      setSubmitting(false)
    }
  }

  if (state.kind === 'loading') {
    return <p className="text-neutral-600 dark:text-neutral-400">Yükleniyor…</p>
  }

  if (state.kind === 'no_token') {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-neutral-700 dark:text-neutral-300">Satış akışı için giriş yapın.</p>
        <Link
          href={vitrinPath('/login')}
          className="mt-4 inline-block font-medium text-primary-600 underline dark:text-primary-400"
        >
          Giriş
        </Link>
      </div>
    )
  }

  if (state.kind === 'err') {
    const forbidden = state.msg === 'not_agency'
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-red-700 dark:text-red-300">
          {forbidden ? 'Yalnızca acente hesapları.' : state.msg}
        </p>
        {!forbidden ? (
          <button type="button" onClick={() => void loadMe()} className="mt-4 text-sm underline">
            Tekrar dene
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Acente satış</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Yayında ilan seçin → sepet → checkout; rezervasyon bu acente kurumuna bağlanır (
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">agency_organization_id</code>). İlan arama ve
        satış için yönetici tarafından belge durumu <span className="font-mono">approved</span> olmalıdır; onaylı
        hesaplarda kurum iskonto % checkout tutarına yansır.
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">İlan ara</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Slug veya UUID"
            className="max-w-md"
          />
          <ButtonPrimary type="button" disabled={listLoading} onClick={() => void runSearch()}>
            {listLoading ? '…' : 'Listele'}
          </ButtonPrimary>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">Başlık</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Para</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-neutral-500">
                    Sonuç yok. “Listele” ile yayınlanan ilanları getirin.
                  </td>
                </tr>
              ) : (
                listings.map((row) => (
                  <tr key={row.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2">{row.title}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.slug}</td>
                    <td className="px-4 py-2">{row.currency_code}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
                        onClick={() => pickListing(row)}
                      >
                        {selected?.id === row.id ? 'Seçili' : 'Seç'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Rezervasyon + ödeme</h2>
        {!selected ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Önce tablodan bir ilan seçin.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 max-w-xl space-y-4">
            <p className="text-sm text-neutral-600">
              Seçili: <strong>{selected.title}</strong> ({selected.currency_code})
            </p>
            <Field>
              <Label>Birim fiyat</Label>
              <Input className="mt-1" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label>Başlangıç</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label>Bitiş</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field>
              <Label>Misafir e-posta</Label>
              <Input
                type="email"
                className="mt-1"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label>Misafir ad</Label>
              <Input className="mt-1" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
            </Field>
            <Field>
              <Label>Telefon (isteğe bağlı)</Label>
              <Input className="mt-1" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </Field>
            <CheckoutContractAcceptance
              listingId={selected.id}
              locale={locale}
              onValidityChange={onAgencyContractValidity}
            />
            <ButtonPrimary type="submit" disabled={submitting}>
              {submitting ? '…' : 'Rezervasyon oluştur ve ödemeye git'}
            </ButtonPrimary>
          </form>
        )}
      </section>
    </div>
  )
}
