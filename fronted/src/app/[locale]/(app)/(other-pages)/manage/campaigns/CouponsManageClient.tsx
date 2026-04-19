'use client'

import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import MultiLangNamePanel, {
  parseMultiLangTranslations,
  stringifyMultiLangTranslations,
  type MultiLangTranslations,
} from '@/components/manage/MultiLangNamePanel'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  patchCouponLimits,
  type Coupon,
} from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function CouponsManageClient() {
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [name, setName] = useState('')
  const [nameTrans, setNameTrans] = useState<MultiLangTranslations>({})
  const [description, setDescription] = useState('')
  const [descTrans, setDescTrans] = useState<MultiLangTranslations>({})
  const [isPublic, setIsPublic] = useState(false)
  const [minOrderAmount, setMinOrderAmount] = useState('')
  const [allowedCategoryCodes, setAllowedCategoryCodes] = useState('')

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Oturum bulunamadı.')
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const r = await listCoupons(token)
      setRows(r.coupons ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Liste yüklenemedi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const c = code.trim().toUpperCase().replace(/\s+/g, '')
    const dv = discountValue.trim()
    if (!c || !dv) {
      setErr('Kod ve indirim değeri zorunlu.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const mu = maxUses.trim() === '' ? undefined : Number.parseInt(maxUses, 10)
      const created = await createCoupon(token, {
        code: c,
        discount_type: discountType,
        discount_value: dv,
        max_uses: mu !== undefined && Number.isFinite(mu) && mu > 0 ? mu : undefined,
        valid_from: validFrom.trim() || undefined,
        valid_to: validTo.trim() || undefined,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        name_translations: stringifyMultiLangTranslations(nameTrans),
        description_translations: stringifyMultiLangTranslations(descTrans),
        is_public: isPublic,
      })
      const moaTrim = minOrderAmount.trim()
      const catsTrim = allowedCategoryCodes.trim()
      if (created?.id && (moaTrim || catsTrim)) {
        try {
          await patchCouponLimits(token, created.id, {
            min_order_amount: moaTrim || undefined,
            allowed_category_codes: catsTrim || undefined,
          })
        } catch {
          // Limits opsiyonel; kupon oluşturulduğu için sessiz geç.
        }
      }
      setShowNew(false)
      setCode('')
      setDiscountValue('')
      setMaxUses('')
      setValidFrom('')
      setValidTo('')
      setName('')
      setNameTrans({})
      setDescription('')
      setDescTrans({})
      setIsPublic(false)
      setMinOrderAmount('')
      setAllowedCategoryCodes('')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('Bu kuponu silmek istediğinize emin misiniz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setErr(null)
    try {
      await deleteCoupon(token, id)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  return (
    <div className="space-y-8">
      <ManageFormPageHeader
        title="Kuponlar"
        subtitle={
          <span>
            İndirim kodları veritabanında saklanır; ödeme akışında doğrulama için backend kurallarına bağlıdır.{' '}
            <Link href={vitrinPath('/manage/campaigns')} className="font-medium text-[color:var(--manage-primary)] hover:underline">
              Tüm kampanyalar
            </Link>
          </span>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Yenile
        </button>
        <button
          type="button"
          onClick={() => {
            setShowNew((s) => !s)
            setErr(null)
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Yeni kupon
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
      )}

      {showNew && (
        <form
          onSubmit={(e) => void onCreate(e)}
          className="max-w-xl space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Yeni indirim kuponu</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Vitrin başlığı (Türkçe — kaynak)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Yaz Tatili Süper İndirim"
            />
          </div>
          <MultiLangNamePanel
            trText={name}
            translations={nameTrans}
            onChange={setNameTrans}
            fieldLabel="Vitrin başlığı"
            disabled={saving}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Açıklama (TR)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Kısa açıklama (örn. Tüm konaklamalarda geçerli)"
            />
          </div>
          <MultiLangNamePanel
            trText={description}
            translations={descTrans}
            onChange={setDescTrans}
            fieldLabel="Açıklama"
            disabled={saving}
            helpText="Üstteki TR açıklaması kaynaktır. Kısa, vitrinde görünecek metin."
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Kod</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm uppercase dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="YAZ2026"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cp-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600"
            />
            <label htmlFor="cp-public" className="text-xs text-neutral-700 dark:text-neutral-200">
              Vitrinde göster (Page Builder &quot;Kupon Şeridi&quot; modülü için herkese açık)
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Tür</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="percent">Yüzde (%)</option>
                <option value="fixed">Sabit tutar</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Değer</label>
              <input
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                placeholder={discountType === 'percent' ? '15' : '500'}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Maks. kullanım (boş = sınırsız)
            </label>
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              type="number"
              min={1}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Min. sepet tutarı (₺)
              </label>
              <input
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                type="number"
                step="0.01"
                min={0}
                placeholder="0 = sınırsız"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Örn. 2000 → sepet ₺2000 ve üstüyse uygulanır.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Geçerli kategori kodları
              </label>
              <input
                value={allowedCategoryCodes}
                onChange={(e) => setAllowedCategoryCodes(e.target.value)}
                placeholder="hotel, villa, tour"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Virgülle ayır. Boş = tüm kategoriler.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Geçerlilik başı</label>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Geçerlilik sonu</label>
              <input
                type="datetime-local"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Oluştur'}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-600"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 p-8 text-sm text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-sm text-neutral-500">Henüz kupon yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">İndirim</th>
                  <th className="px-4 py-3">Kullanım</th>
                  <th className="px-4 py-3">Geçerlilik</th>
                  <th className="px-4 py-3 text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{r.code}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                      {r.discount_type === 'percent' ? `%${r.discount_value}` : `${r.discount_value} TL`}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {r.used_count}
                      {r.max_uses != null ? ` / ${r.max_uses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {fmtDate(r.valid_from)} — {fmtDate(r.valid_to)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => void onDelete(r.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
