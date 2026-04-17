'use client'

import {
  createGoogleMerchantProduct,
  createInstagramShopLink,
  deleteInstagramShopLink,
  listGoogleMerchantProducts,
  listInstagramShopLinks,
  listWhatsappOrderIntents,
  patchGoogleMerchantProduct,
  patchInstagramShopLink,
  type InstagramShopLink,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import clsx from 'clsx'
import { AlertCircle, Instagram, Loader2, MessageCircle, RefreshCw, ShoppingBag } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidListingUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

export default function AdminMerchantIntegrationsSection() {
  const [listingId, setListingId] = useState('')
  const [gmpRows, setGmpRows] = useState<
    {
      id: string
      listing_id: string
      merchant_product_id: string | null
      last_push_at: string | null
      status: string
    }[]
  >([])
  const [igLinks, setIgLinks] = useState<InstagramShopLink[]>([])
  const [gmpErr, setGmpErr] = useState<string | null>(null)
  const [igErr, setIgErr] = useState<string | null>(null)
  const [loadingGmp, setLoadingGmp] = useState(false)
  const [loadingIg, setLoadingIg] = useState(false)
  const [newMpid, setNewMpid] = useState('')
  const [newStatus, setNewStatus] = useState('pending')
  const [newIgMedia, setNewIgMedia] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [waIntents, setWaIntents] = useState<
    { id: string; phone: string; cart_id: string | null; payload_json: string; created_at: string }[]
  >([])
  const [loadingWa, setLoadingWa] = useState(false)
  const [waErr, setWaErr] = useState<string | null>(null)

  const listingOk = useMemo(() => {
    const t = listingId.trim()
    return t.length > 0 && isValidListingUuid(t)
  }, [listingId])

  const listingTouchedInvalid = useMemo(() => {
    const t = listingId.trim()
    return t.length > 0 && !isValidListingUuid(t)
  }, [listingId])

  const loadGmp = useCallback(async () => {
    const token = getStoredAuthToken()
    const lid = listingId.trim()
    if (!token || !listingOk) return
    setGmpErr(null)
    setLoadingGmp(true)
    try {
      const r = await listGoogleMerchantProducts(token, lid)
      setGmpRows(r.products)
    } catch (e) {
      setGmpErr(e instanceof Error ? e.message : 'gmp_load_failed')
    } finally {
      setLoadingGmp(false)
    }
  }, [listingId, listingOk])

  const loadIg = useCallback(async () => {
    const token = getStoredAuthToken()
    const lid = listingId.trim()
    if (!listingOk) return
    setIgErr(null)
    setLoadingIg(true)
    try {
      const r = await listInstagramShopLinks(lid, token ?? undefined)
      setIgLinks(r.links)
    } catch (e) {
      setIgErr(e instanceof Error ? e.message : 'ig_load_failed')
    } finally {
      setLoadingIg(false)
    }
  }, [listingId, listingOk])

  async function onAddGmp(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    const lid = listingId.trim()
    if (!token || !listingOk) return
    setBusy('gmp-add')
    setGmpErr(null)
    try {
      await createGoogleMerchantProduct(token, {
        listing_id: lid,
        merchant_product_id: newMpid.trim() || undefined,
        status: newStatus.trim() || 'pending',
      })
      setNewMpid('')
      await loadGmp()
    } catch (e) {
      setGmpErr(e instanceof Error ? e.message : 'gmp_add_failed')
    } finally {
      setBusy(null)
    }
  }

  async function onPatchGmp(id: string, status: string) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(`gmp-${id}`)
    setGmpErr(null)
    try {
      await patchGoogleMerchantProduct(token, id, { status })
      await loadGmp()
    } catch (e) {
      setGmpErr(e instanceof Error ? e.message : 'gmp_patch_failed')
    } finally {
      setBusy(null)
    }
  }

  async function onAddIg(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    const lid = listingId.trim()
    const mid = newIgMedia.trim()
    if (!token || !listingOk || !mid) return
    setBusy('ig-add')
    setIgErr(null)
    try {
      await createInstagramShopLink(token, { listing_id: lid, instagram_media_id: mid, sync_enabled: true })
      setNewIgMedia('')
      await loadIg()
    } catch (e) {
      setIgErr(e instanceof Error ? e.message : 'ig_add_failed')
    } finally {
      setBusy(null)
    }
  }

  async function onToggleIg(link: InstagramShopLink) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(`ig-${link.id}`)
    setIgErr(null)
    try {
      await patchInstagramShopLink(token, link.id, { sync_enabled: !link.sync_enabled })
      await loadIg()
    } catch (e) {
      setIgErr(e instanceof Error ? e.message : 'ig_patch_failed')
    } finally {
      setBusy(null)
    }
  }

  const loadWaIntents = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) return
    setWaErr(null)
    setLoadingWa(true)
    try {
      const r = await listWhatsappOrderIntents(token, 100)
      setWaIntents(r.intents)
    } catch (e) {
      setWaErr(e instanceof Error ? e.message : 'wa_intents_load_failed')
    } finally {
      setLoadingWa(false)
    }
  }, [])

  async function onDeleteIg(id: string) {
    if (!confirm('Bu Instagram shop bağlantısı silinsin mi?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(`ig-del-${id}`)
    setIgErr(null)
    try {
      await deleteInstagramShopLink(token, id)
      await loadIg()
    } catch (e) {
      setIgErr(e instanceof Error ? e.message : 'ig_delete_failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Adım 1: ilan */}
      <section className="rounded-2xl border border-[color:var(--manage-sidebar-border)] bg-[color:var(--manage-page-bg)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--manage-primary)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--manage-primary-soft)] text-[11px] text-[color:var(--manage-primary)]">
            1
          </span>
          Hangi ilan?
        </div>
        <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">İlan seçimi</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Katalogdan bir ilanı açıp adres çubuğundaki veya detay sayfasındaki{' '}
          <strong className="font-medium">UUID</strong> değerini buraya yapıştırın. Tüm tablolar bu ilan için çalışır.
        </p>

        <Field className="mt-5 max-w-xl">
          <Label htmlFor="merchant-listing-id">İlan UUID</Label>
          <Input
            id="merchant-listing-id"
            className={clsx(
              'mt-1.5 font-mono text-sm',
              listingTouchedInvalid && 'border-red-300 ring-1 ring-red-200 dark:border-red-800 dark:ring-red-900/50',
            )}
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            spellCheck={false}
          />
          {listingTouchedInvalid ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Geçerli bir UUID formatı girin (8-4-4-4-12 hex).
            </p>
          ) : (
            <p className="mt-2 text-xs text-neutral-500">
              Örnek: <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono dark:bg-neutral-800">a1b2c3d4-e5f6-7890-abcd-ef1234567890</code>
            </p>
          )}
        </Field>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ButtonPrimary
            type="button"
            disabled={loadingGmp || !listingOk || !getStoredAuthToken()}
            onClick={() => void loadGmp()}
            className="inline-flex items-center gap-2"
          >
            {loadingGmp ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Google Merchant kayıtlarını yükle
          </ButtonPrimary>
          <button
            type="button"
            disabled={loadingIg || !listingOk}
            onClick={() => void loadIg()}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            {loadingIg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
            Instagram bağlantılarını yükle
          </button>
        </div>
        {!getStoredAuthToken() ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Google Merchant için oturum (token) gerekir.</p>
        ) : null}
      </section>

      <details className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
        <summary className="cursor-pointer font-medium text-neutral-700 dark:text-neutral-300">
          İzin gereksinimleri (teknik)
        </summary>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          <li>
            Google Merchant: okuma <code className="font-mono">admin.integrations.read</code>, yazma{' '}
            <code className="font-mono">admin.integrations.write</code>
          </li>
          <li>
            Instagram Shop: <code className="font-mono">admin.social.read</code> /{' '}
            <code className="font-mono">admin.social.write</code>
          </li>
          <li>
            WhatsApp niyetleri: <code className="font-mono">admin.integrations.read</code>
          </li>
          <li>
            Ödeme anahtarları sunucu ortamında (<code className="font-mono">PAYTR_MERCHANT_*</code>) — bu sayfada tutulmaz.
          </li>
        </ul>
      </details>

      {/* Google Merchant */}
      <section className="rounded-2xl border border-[color:var(--manage-sidebar-border)] bg-white p-6 dark:bg-neutral-900/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Google Merchant ürün kayıtları</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Ürün feed / Merchant Center ile eşleşen kayıtlar. Önce yukarıda ilanı seçip listeyi yükleyin.
            </p>
          </div>
        </div>

        {gmpErr ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {gmpErr}
          </p>
        ) : null}

        <form onSubmit={(e) => void onAddGmp(e)} className="mt-6 grid gap-4 sm:grid-cols-12 sm:items-end">
          <Field className="sm:col-span-5">
            <Label htmlFor="gmp-merchant-pid">Ürün kimliği (opsiyonel)</Label>
            <Input
              id="gmp-merchant-pid"
              className="mt-1.5 font-mono text-xs"
              value={newMpid}
              onChange={(e) => setNewMpid(e.target.value)}
              placeholder="Google Merchant Center ürün ID"
            />
            <p className="mt-1 text-[11px] text-neutral-500">Boş bırakılabilir; sonra güncellenebilir.</p>
          </Field>
          <Field className="sm:col-span-3">
            <Label htmlFor="gmp-status">Durum</Label>
            <select
              id="gmp-status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="pending">Beklemede (pending)</option>
              <option value="active">Aktif (active)</option>
            </select>
          </Field>
          <div className="sm:col-span-4">
            <ButtonPrimary type="submit" disabled={busy === 'gmp-add' || !listingOk} className="w-full sm:w-auto">
              {busy === 'gmp-add' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy === 'gmp-add' ? 'Ekleniyor…' : 'Kayıt ekle'}
            </ButtonPrimary>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2.5">Kayıt</th>
                <th className="px-3 py-2.5">Merchant ürün ID</th>
                <th className="px-3 py-2.5">Durum</th>
                <th className="px-3 py-2.5">Son gönderim</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {gmpRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-neutral-500">
                    <p className="font-medium text-neutral-700 dark:text-neutral-300">Henüz kayıt yok</p>
                    <p className="mt-2 max-w-md text-sm">
                      Geçerli bir ilan UUID&apos;si girip <strong>Google Merchant kayıtlarını yükle</strong> deyin veya
                      yukarıdan yeni kayıt ekleyin.
                    </p>
                  </td>
                </tr>
              ) : (
                gmpRows.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2.5 font-mono text-xs text-neutral-600">{r.id.slice(0, 8)}…</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{r.merchant_product_id ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          r.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-neutral-600">{r.last_push_at ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        disabled={busy === `gmp-${r.id}`}
                        onClick={() => void onPatchGmp(r.id, r.status === 'active' ? 'pending' : 'active')}
                        className="text-xs font-medium text-[color:var(--manage-primary)] underline"
                      >
                        {r.status === 'active' ? 'Beklemeye al' : 'Aktifleştir'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Instagram */}
      <section className="rounded-2xl border border-[color:var(--manage-sidebar-border)] bg-white p-6 dark:bg-neutral-900/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Instagram Shop bağlantıları</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Meta katalog / alışveriş için medya ID. Tam Graph API senkronu ayrı worker veya entegrasyon hesabı ile yapılır.
            </p>
          </div>
        </div>

        {igErr ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {igErr}
          </p>
        ) : null}

        <form onSubmit={(e) => void onAddIg(e)} className="mt-6 flex flex-wrap items-end gap-3">
          <Field className="min-w-[16rem] max-w-xl grow">
            <Label htmlFor="ig-media-id">Instagram medya ID</Label>
            <Input
              id="ig-media-id"
              className="mt-1.5 font-mono text-xs"
              value={newIgMedia}
              onChange={(e) => setNewIgMedia(e.target.value)}
              placeholder="Meta catalog / media id"
            />
          </Field>
          <ButtonPrimary type="submit" disabled={busy === 'ig-add' || !listingOk || !newIgMedia.trim()}>
            {busy === 'ig-add' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy === 'ig-add' ? 'Ekleniyor…' : 'Bağlantı ekle'}
          </ButtonPrimary>
        </form>

        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2.5">Medya ID</th>
                <th className="px-3 py-2.5">Senkron</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {igLinks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-neutral-500">
                    <p className="font-medium text-neutral-700 dark:text-neutral-300">Bağlantı yok</p>
                    <p className="mt-2 text-sm">
                      İlan UUID&apos;si ile <strong>Instagram bağlantılarını yükle</strong> deyin veya yeni medya ID ekleyin.
                    </p>
                  </td>
                </tr>
              ) : (
                igLinks.map((l) => (
                  <tr key={l.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2.5 font-mono text-xs">{l.instagram_media_id}</td>
                    <td className="px-3 py-2.5">
                      {l.sync_enabled ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Açık
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800">
                          Kapalı
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 space-x-3">
                      <button
                        type="button"
                        disabled={busy === `ig-${l.id}`}
                        onClick={() => void onToggleIg(l)}
                        className="text-xs font-medium text-[color:var(--manage-primary)] underline"
                      >
                        Senkronu değiştir
                      </button>
                      <button
                        type="button"
                        disabled={busy === `ig-del-${l.id}`}
                        onClick={() => void onDeleteIg(l.id)}
                        className="text-xs font-medium text-red-600 underline dark:text-red-400"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="rounded-2xl border border-[color:var(--manage-sidebar-border)] bg-white p-6 dark:bg-neutral-900/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">WhatsApp sipariş niyetleri</h3>
              <p className="mt-1 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
                Tıkla-WhatsApp ile kaydedilen telefon, sepet ve payload. Bu liste ilan seçiminden bağımsızdır.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loadingWa}
            onClick={() => void loadWaIntents()}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium dark:border-neutral-600 dark:bg-neutral-900"
          >
            {loadingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Son 100 kaydı yükle
          </button>
        </div>

        {waErr ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {waErr}
          </p>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2.5">Oluşturulma</th>
                <th className="px-3 py-2.5">Telefon</th>
                <th className="px-3 py-2.5">Sepet</th>
                <th className="px-3 py-2.5">Payload</th>
              </tr>
            </thead>
            <tbody>
              {waIntents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-neutral-500">
                    <p className="font-medium text-neutral-700 dark:text-neutral-300">Kayıt yok veya henüz yüklenmedi</p>
                    <p className="mt-2 text-sm">Yukarıdaki düğmeyle son kayıtları çekin.</p>
                  </td>
                </tr>
              ) : (
                waIntents.map((row) => (
                  <tr key={row.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2.5 align-top text-xs text-neutral-600">{row.created_at}</td>
                    <td className="px-3 py-2.5 align-top font-mono text-xs">{row.phone}</td>
                    <td className="px-3 py-2.5 align-top font-mono text-xs">{row.cart_id ?? '—'}</td>
                    <td className="max-w-md px-3 py-2.5 align-top font-mono text-[10px] break-all text-neutral-600">
                      {row.payload_json}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
