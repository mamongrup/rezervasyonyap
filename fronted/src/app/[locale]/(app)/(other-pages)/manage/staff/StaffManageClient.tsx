'use client'

import {
  addStaffPosCartLine,
  checkoutStaffPosCart,
  createStaffPosCart,
  getCart,
  getStaffInvoices,
  getStaffMe,
  getStaffReservations,
  listStaffListings,
  type CartDetail,
  type StaffInvoiceRow,
  type StaffListingRow,
  type StaffMe,
  type StaffReservationRow,
} from '@/lib/travel-api'
import CheckoutContractAcceptance, {
  type CheckoutContractAcceptancePayload,
} from '@/components/CheckoutContractAcceptance'
import { invoiceStatusLabelTr } from '@/lib/invoice-ui'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'

function formatStaffPosErr(msg: string): string {
  if (msg === 'forbidden') return 'POS için staff.pos.write izni gerekir. Yönetici rol–izin matrisinden ekleyin.'
  if (msg === 'listing_not_in_staff_org' || msg === 'pos_cart_foreign_listing')
    return 'Sepette yalnızca kendi kurumunuzun ilanları olabilir.'
  if (msg === 'listing_unavailable_or_currency_mismatch')
    return 'İlan yayında değil veya sepet para birimi ile ilan PB eşleşmiyor.'
  if (msg === 'contract_not_accepted') return 'Sözleşme onayı eksik.'
  if (msg === 'listing_contract_required') return 'Sepetteki ilanlardan birine kategori sözleşmesi atanmamış.'
  return msg
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no_token' }
  | { kind: 'err'; msg: string }
  | {
      kind: 'ok'
      me: StaffMe
      reservations: StaffReservationRow[]
      invoices: StaffInvoiceRow[]
      listings: StaffListingRow[]
    }

export default function StaffManageClient() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [listingSearch, setListingSearch] = useState('')
  const [listingSearchBusy, setListingSearchBusy] = useState(false)

  const [posCartId, setPosCartId] = useState<string | null>(null)
  const [posCurrency, setPosCurrency] = useState('TRY')
  const [posCart, setPosCart] = useState<CartDetail | null>(null)
  const [posLineListingId, setPosLineListingId] = useState('')
  const [posLineQty, setPosLineQty] = useState('1')
  const [posStarts, setPosStarts] = useState('')
  const [posEnds, setPosEnds] = useState('')
  const [posUnitPrice, setPosUnitPrice] = useState('')
  const [posGuestEmail, setPosGuestEmail] = useState('')
  const [posGuestName, setPosGuestName] = useState('')
  const [posGuestPhone, setPosGuestPhone] = useState('')
  const [posHoldMinutes, setPosHoldMinutes] = useState('30')
  const [posBusy, setPosBusy] = useState(false)
  const [posMsg, setPosMsg] = useState<string | null>(null)
  const [posLastCheckout, setPosLastCheckout] = useState<string | null>(null)
  const posContractRef = useRef<CheckoutContractAcceptancePayload>({
    ok: false,
    contract_accepted: false,
    general_contract_accepted: true,
    sales_contract_accepted: true,
  })
  const onPosContractValidity = useCallback((p: CheckoutContractAcceptancePayload) => {
    posContractRef.current = p
  }, [])

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setState({ kind: 'no_token' })
      return
    }
    setListingSearch('')
    setState({ kind: 'loading' })
    try {
      const [me, resv, inv, listingsRes] = await Promise.all([
        getStaffMe(token),
        getStaffReservations(token),
        getStaffInvoices(token),
        listStaffListings(token),
      ])
      setState({
        kind: 'ok',
        me,
        reservations: resv.reservations,
        invoices: inv.invoices,
        listings: listingsRes.listings,
      })
    } catch (e) {
      setState({ kind: 'err', msg: e instanceof Error ? e.message : 'load_failed' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!posCartId) {
      setPosCart(null)
      return
    }
    let cancelled = false
    void getCart(posCartId)
      .then((c) => {
        if (!cancelled) setPosCart(c)
      })
      .catch(() => {
        if (!cancelled) setPosCart(null)
      })
    return () => {
      cancelled = true
    }
  }, [posCartId])

  async function applyListingSearch(e?: FormEvent) {
    e?.preventDefault()
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setListingSearchBusy(true)
    try {
      const r = await listStaffListings(token, listingSearch.trim() || undefined)
      setState((prev) => (prev.kind === 'ok' ? { ...prev, listings: r.listings } : prev))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'listing_search_failed')
    } finally {
      setListingSearchBusy(false)
    }
  }

  async function startPosCart() {
    const token = getStoredAuthToken()
    if (!token) return
    setPosBusy(true)
    setPosMsg(null)
    setPosLastCheckout(null)
    try {
      const cur = posCurrency.trim().toUpperCase() || 'TRY'
      const r = await createStaffPosCart(token, cur)
      setPosCartId(r.id)
      setPosCurrency(r.currency_code || cur)
    } catch (e) {
      setPosMsg(formatStaffPosErr(e instanceof Error ? e.message : 'pos_cart_failed'))
      setPosCartId(null)
    } finally {
      setPosBusy(false)
    }
  }

  async function addPosLine(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !posCartId) return
    const qty = Number.parseInt(posLineQty, 10)
    if (!Number.isFinite(qty) || qty < 1) {
      setPosMsg('Adet en az 1 olmalı.')
      return
    }
    setPosBusy(true)
    setPosMsg(null)
    try {
      await addStaffPosCartLine(token, posCartId, {
        listing_id: posLineListingId.trim(),
        quantity: qty,
        starts_on: posStarts.trim(),
        ends_on: posEnds.trim(),
        unit_price: posUnitPrice.trim(),
      })
      const c = await getCart(posCartId)
      setPosCart(c)
    } catch (e) {
      setPosMsg(formatStaffPosErr(e instanceof Error ? e.message : 'pos_line_failed'))
    } finally {
      setPosBusy(false)
    }
  }

  async function submitPosCheckout(e: FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token || !posCartId) return
    if (!posContractRef.current.ok) {
      setPosMsg('Gerekli tüm sözleşmeler yüklenip müşteri adına onaylanmalıdır.')
      return
    }
    const hm = Number.parseInt(posHoldMinutes, 10)
    setPosBusy(true)
    setPosMsg(null)
    try {
      const cx = posContractRef.current
      const out = await checkoutStaffPosCart(token, posCartId, {
        guest_email: posGuestEmail.trim(),
        guest_name: posGuestName.trim(),
        ...(posGuestPhone.trim() ? { guest_phone: posGuestPhone.trim() } : {}),
        ...(Number.isFinite(hm) && hm >= 5 && hm <= 120 ? { hold_minutes: hm } : {}),
        contract_accepted: cx.contract_accepted,
        general_contract_accepted: cx.general_contract_accepted,
        sales_contract_accepted: cx.sales_contract_accepted,
        contract_locale: locale,
      })
      setPosLastCheckout(`${out.public_code} · ${out.payment_amount} ${out.currency_code} (kuruş)`)
      setPosCartId(null)
      setPosCart(null)
      setPosGuestEmail('')
      setPosGuestName('')
      setPosGuestPhone('')
      await load()
    } catch (e) {
      setPosMsg(formatStaffPosErr(e instanceof Error ? e.message : 'pos_checkout_failed'))
    } finally {
      setPosBusy(false)
    }
  }

  function discardPosCart() {
    setPosCartId(null)
    setPosCart(null)
    setPosMsg(null)
    setPosLastCheckout(null)
  }

  async function resetListingSearch() {
    setListingSearch('')
    const token = getStoredAuthToken()
    if (!token || state.kind !== 'ok') return
    setListingSearchBusy(true)
    try {
      const r = await listStaffListings(token)
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
        <p className="text-neutral-700 dark:text-neutral-300">Personel paneli için giriş yapın.</p>
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
    const forbidden = state.msg === 'not_staff'
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-red-700 dark:text-red-300">
          {forbidden
            ? 'Bu sayfa yalnızca `staff` rolü ve kurum bağlantısı olan hesaplar içindir (`user_roles`).'
            : state.msg}
        </p>
        {!forbidden ? (
          <button type="button" onClick={() => void load()} className="mt-4 text-sm underline">
            Tekrar dene
          </button>
        ) : null}
      </div>
    )
  }

  const { me, reservations, invoices, listings } = state

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Personel</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Kurumunuzun ilanları, bu ilanlara ait rezervasyonlar ve kurumunuza bağlı komisyon faturaları (salt okuma —
        G3.4). <span className="font-medium text-neutral-700 dark:text-neutral-300">Kasa (POS)</span> ile yayında ilan
        seçip misafir bilgisiyle held rezervasyon açabilirsiniz (<span className="font-mono">staff.pos.write</span>).
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">Kasa (POS)</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Sepet para birimi, satıra eklediğiniz ilanın PB ile aynı olmalıdır. Tutarları (birim fiyat) siz girersiniz;
          ödeme akışı site checkout ile devam eder.
        </p>
        {posLastCheckout ? (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            Son işlem: <span className="font-mono">{posLastCheckout}</span>
          </p>
        ) : null}
        {posMsg ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {posMsg}
          </p>
        ) : null}
        {!posCartId ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field className="w-28">
              <Label htmlFor="pos-cur">Sepet PB</Label>
              <Input
                id="pos-cur"
                className="mt-1 font-mono uppercase"
                value={posCurrency}
                onChange={(e) => setPosCurrency(e.target.value)}
                maxLength={3}
                autoComplete="off"
              />
            </Field>
            <ButtonPrimary type="button" disabled={posBusy} onClick={() => void startPosCart()}>
              {posBusy ? '…' : 'Yeni POS sepeti'}
            </ButtonPrimary>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">Açık sepet</span>
              <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs dark:bg-neutral-800">{posCartId}</code>
              <span className="text-neutral-500">PB: {posCart?.currency_code ?? posCurrency}</span>
              <button
                type="button"
                disabled={posBusy}
                onClick={() => discardPosCart()}
                className="text-sm font-medium text-red-600 underline disabled:opacity-50 dark:text-red-400"
              >
                Sepeti bırak
              </button>
            </div>
            <form className="grid gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void addPosLine(e)}>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Satır ekle</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field className="sm:col-span-2">
                  <Label htmlFor="pos-listing">İlan</Label>
                  <select
                    id="pos-listing"
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                    value={posLineListingId}
                    onChange={(e) => setPosLineListingId(e.target.value)}
                  >
                    <option value="">— Seçin —</option>
                    {listings
                      .filter((l) => l.status === 'published')
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.slug} ({l.currency_code})
                        </option>
                      ))}
                  </select>
                </Field>
                <Field>
                  <Label htmlFor="pos-qty">Adet</Label>
                  <Input
                    id="pos-qty"
                    type="number"
                    min={1}
                    className="mt-1"
                    value={posLineQty}
                    onChange={(e) => setPosLineQty(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="pos-s1">Başlangıç</Label>
                  <Input
                    id="pos-s1"
                    className="mt-1 font-mono text-sm"
                    placeholder="YYYY-MM-DD"
                    value={posStarts}
                    onChange={(e) => setPosStarts(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <Label htmlFor="pos-s2">Bitiş</Label>
                  <Input
                    id="pos-s2"
                    className="mt-1 font-mono text-sm"
                    placeholder="YYYY-MM-DD"
                    value={posEnds}
                    onChange={(e) => setPosEnds(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <Label htmlFor="pos-price">Birim fiyat</Label>
                  <Input
                    id="pos-price"
                    className="mt-1 font-mono text-sm"
                    value={posUnitPrice}
                    onChange={(e) => setPosUnitPrice(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
              </div>
              <ButtonPrimary type="submit" disabled={posBusy || !posLineListingId.trim()}>
                {posBusy ? '…' : 'Satıra ekle'}
              </ButtonPrimary>
            </form>
            {posCart && posCart.lines.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-3 py-2">İlan</th>
                      <th className="px-3 py-2">Adet</th>
                      <th className="px-3 py-2">Tarih</th>
                      <th className="px-3 py-2">Satır</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posCart.lines.map((ln) => (
                      <tr key={ln.id} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="px-3 py-2 font-mono text-xs">{ln.listing_id}</td>
                        <td className="px-3 py-2">{ln.quantity}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {ln.starts_on || '—'} → {ln.ends_on || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{ln.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <form className="grid gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700" onSubmit={(e) => void submitPosCheckout(e)}>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Misafir & held</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="pos-ge">E-posta</Label>
                  <Input
                    id="pos-ge"
                    type="email"
                    className="mt-1"
                    value={posGuestEmail}
                    onChange={(e) => setPosGuestEmail(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <Label htmlFor="pos-gn">Ad soyad</Label>
                  <Input
                    id="pos-gn"
                    className="mt-1"
                    value={posGuestName}
                    onChange={(e) => setPosGuestName(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <Label htmlFor="pos-gp">Telefon (isteğe bağlı)</Label>
                  <Input
                    id="pos-gp"
                    className="mt-1"
                    value={posGuestPhone}
                    onChange={(e) => setPosGuestPhone(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <Label htmlFor="pos-hold">Hold (dk, 5–120)</Label>
                  <Input
                    id="pos-hold"
                    type="number"
                    min={5}
                    max={120}
                    className="mt-1"
                    value={posHoldMinutes}
                    onChange={(e) => setPosHoldMinutes(e.target.value)}
                  />
                </Field>
              </div>
              {posCart && posCart.lines.length > 0 ? (
                <CheckoutContractAcceptance
                  listingId={posCart.lines[0]?.listing_id}
                  locale={locale}
                  onValidityChange={onPosContractValidity}
                />
              ) : null}
              <ButtonPrimary type="submit" disabled={posBusy}>
                {posBusy ? '…' : 'Held rezervasyon oluştur'}
              </ButtonPrimary>
            </form>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">Kurum</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-neutral-500">Ad</dt>
            <dd>{me.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Slug</dt>
            <dd className="font-mono">{me.slug}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="text-lg font-medium">İlanlar</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Kurumunuza ait ilanlar (salt okuma). Slug veya UUID ile süzebilirsiniz.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => void applyListingSearch(e)}
        >
          <Field className="min-w-[12rem] flex-1">
            <Label htmlFor="staff-listing-q">Ara</Label>
            <Input
              id="staff-listing-q"
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
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Durum</th>
                <th className="px-4 py-2">PB</th>
                <th className="px-4 py-2">Komisyon %</th>
                <th className="px-4 py-2">Ön ödeme</th>
                <th className="px-4 py-2">Oluşturulma</th>
                <th className="px-4 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-neutral-500" colSpan={7}>
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                listings.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-mono text-xs">{r.slug}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.currency_code}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.commission_percent || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.prepayment_amount || '—'} / {r.prepayment_percent || '—'}%
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="invoices" className="mt-10">
        <h2 className="text-lg font-medium">Komisyon faturaları</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Acente ve tedarikçi faturaları birlikte (son 80). Yalnızca görüntüleme.
        </p>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Kayıt yok.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2">Tür</th>
                  <th className="px-4 py-2">Fatura no</th>
                  <th className="px-4 py-2">Dönem</th>
                  <th className="px-4 py-2">PB</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2">Satır</th>
                  <th className="px-4 py-2">Komisyon</th>
                  <th className="px-4 py-2">Oluşturulma</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={`${inv.kind}-${inv.id}`} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2">
                      {inv.kind === 'agency' ? 'Acente' : 'Tedarikçi'}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      {inv.period_from} — {inv.period_to}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{inv.currency_code}</td>
                    <td className="px-4 py-2">{invoiceStatusLabelTr(inv.status)}</td>
                    <td className="px-4 py-2">{inv.line_count}</td>
                    <td className="px-4 py-2 font-mono text-xs">{inv.commission_total}</td>
                    <td className="px-4 py-2 text-xs text-neutral-600">{inv.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Rezervasyonlar</h2>
        {reservations.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Kayıt yok.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2">Kod</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2">İlan slug</th>
                  <th className="px-4 py-2">E-posta</th>
                  <th className="px-4 py-2">Oluşturulma</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-mono text-xs">{r.public_code}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.listing_slug.trim() ? (
                        <Link
                          href={vitrinPath(`/stay-listings/${encodeURIComponent(r.listing_slug)}`)}
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
                    <td className="px-4 py-2 text-xs">{r.guest_email}</td>
                    <td className="px-4 py-2 text-xs text-neutral-600">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
