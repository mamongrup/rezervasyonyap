'use client'

/**
 * Kategori bazında fiyata dahil / hariç kalem listesi — tek tanım; ilanlarda seçim için kullanılır.
 */
import { getStoredAuthToken } from '@/lib/auth-storage'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import {
  createPriceLineItem,
  deletePriceLineItem,
  getAuthMe,
  listPriceLineItems,
  putPriceLineItemTranslations,
  type PriceLineItem,
} from '@/lib/travel-api'
import { aiErrorMessage, translateOneToMany } from '@/lib/manage-content-ai'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import { ManageAiMagicTextButton } from '@/components/manage/ManageAiMagicTextButton'
import clsx from 'clsx'
import { Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/** Diğer katalog yönetim ekranlarıyla paylaşılan: admin için seçili organizasyon UUID. */
const ORG_STORAGE_KEY = 'catalog_manage_organization_id'

const LINE_LOCALES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
] as const

/** Türkçe etiketten `code` üretir: TR karakterler latinleştirilir, alfanümerik dışı `_` olur. */
function labelToCode(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p
      className={`mt-2 rounded-lg px-3 py-2 text-xs ${
        msg.ok
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
      }`}
    >
      {msg.text}
    </p>
  )
}

export default function CatalogCategoryPriceLinesClient({ code }: { code: string }) {
  const [items, setItems] = useState<PriceLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [previewLocale, setPreviewLocale] = useState('tr')
  const [orgId, setOrgId] = useState('')
  const [needOrg, setNeedOrg] = useState(false)
  const [scopeReady, setScopeReady] = useState(false)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setScopeReady(true)
      return
    }
    void getAuthMe(token)
      .then((me) => {
        const perms = Array.isArray(me.permissions) ? me.permissions : []
        const roles = Array.isArray(me.roles) ? me.roles : []
        const admin =
          roles.some((r) => r.role_code === 'admin') ||
          perms.some((p) => p === 'admin.users.read' || p.startsWith('admin.'))
        setNeedOrg(admin)
        if (admin && typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(ORG_STORAGE_KEY) ?? ''
          if (saved) setOrgId(saved)
        }
      })
      .catch(() => setNeedOrg(false))
      .finally(() => setScopeReady(true))
  }, [])

  const orgParam = needOrg && orgId.trim() ? orgId.trim() : undefined

  const saveOrg = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ORG_STORAGE_KEY, orgId.trim())
    }
  }

  const load = useCallback(() => {
    if (!scopeReady) return
    if (needOrg && !orgParam) {
      setItems([])
      setLoading(false)
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    setLoading(true)
    void listPriceLineItems(token, { categoryCode: code, locale: previewLocale, organizationId: orgParam })
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [code, previewLocale, scopeReady, needOrg, orgParam])

  useEffect(() => {
    load()
  }, [load])

  const included = items.filter((i) => i.scope === 'included')
  const excluded = items.filter((i) => i.scope === 'excluded')

  return (
    <div className="flex h-full flex-col gap-6 pb-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {categoryLabelTr(code)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Dahil & Hariç (fiyat)
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Bu kategorideki ilanlar için fiyata dahil olan ve olmayan kalemleri bir kez tanımlayın; ilan düzenlemede kutulardan
          seçilir. Etiketler dil bazlıdır.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-neutral-500">Liste önizleme dili</label>
          <select
            value={previewLocale}
            onChange={(e) => setPreviewLocale(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {LINE_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {needOrg ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <Field className="block max-w-xl">
            <Label>Organizasyon UUID (admin)</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Input
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="a0000000-0000-4000-8000-000000000001"
                className="min-w-[280px] flex-1 font-mono text-sm"
              />
              <ButtonPrimary type="button" onClick={() => saveOrg()}>
                Kaydet & Yükle
              </ButtonPrimary>
            </div>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Yönetici hesabıyla bir organizasyonun katalog kalemlerini yönetiyorsunuz. Tedarikçi/acente
              hesaplarında bu alan gerekmez; otomatik olarak kendi organizasyonunuz seçilir.
            </p>
          </Field>
        </div>
      ) : null}

      {needOrg && !orgParam ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Devam etmek için bir organizasyon UUID girin.
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PriceColumn
            title="Fiyata dahil"
            scope="included"
            categoryCode={code}
            rows={included}
            onChanged={load}
            previewLocale={previewLocale}
            organizationId={orgParam}
          />
          <PriceColumn
            title="Fiyata hariç"
            scope="excluded"
            categoryCode={code}
            rows={excluded}
            onChanged={load}
            previewLocale={previewLocale}
            organizationId={orgParam}
          />
        </div>
      )}
    </div>
  )
}

function PriceColumn({
  title,
  scope,
  categoryCode,
  rows,
  onChanged,
  previewLocale,
  organizationId,
}: {
  title: string
  scope: 'included' | 'excluded'
  categoryCode: string
  rows: PriceLineItem[]
  onChanged: () => void
  previewLocale: string
  organizationId?: string
}) {
  const [form, setForm] = useState({ code: '', label: '', sort: '0', codeManual: false })
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [localMsg, setLocalMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [trans, setTrans] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const editItem = editingId ? rows.find((r) => r.id === editingId) : undefined

  useEffect(() => {
    if (!editItem) {
      setTrans({})
      return
    }
    const token = getStoredAuthToken()
    if (!token) return
    let cancelled = false
    void Promise.all(
      LINE_LOCALES.map((l) =>
        listPriceLineItems(token, { categoryCode, locale: l.code, organizationId }).then((r) => {
          const row = r.items.find((x) => x.id === editItem.id)
          return [l.code, row?.label ?? ''] as const
        }),
      ),
    ).then((pairs) => {
      if (!cancelled) setTrans(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [editItem, categoryCode, organizationId])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const cd = form.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!cd || !form.label.trim()) {
      setLocalMsg({ ok: false, text: 'Kod ve Türkçe etiket gerekli.' })
      return
    }
    setBusy(true)
    setLocalMsg(null)
    try {
      const created = await createPriceLineItem(
        token,
        {
          category_code: categoryCode,
          scope,
          code: cd,
          label: form.label.trim(),
          sort_order: form.sort.trim() || '0',
        },
        { organizationId },
      )
      const trLabel = form.label.trim()
      setForm({ code: '', label: '', sort: '0', codeManual: false })
      setTrans({ tr: trLabel })
      setEditingId(created.id)
      setLocalMsg({
        ok: true,
        text: 'Kalem eklendi. Aşağıdaki "Boşları AI ile doldur" ile diğer 5 dili otomatik üretebilirsiniz.',
      })
      onChanged()
    } catch (e) {
      setLocalMsg({ ok: false, text: e instanceof Error ? e.message : 'Kayıt başarısız' })
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Bu kalemi sil?')) return
    const token = getStoredAuthToken()
    if (!token) return
    try {
      await deletePriceLineItem(token, id, { organizationId })
      setEditingId(null)
      onChanged()
    } catch {
      /* ignore */
    }
  }

  async function handleAiTranslate(overwrite: boolean) {
    const trText = (trans.tr ?? '').trim() || (editItem?.label ?? '').trim()
    if (!trText) {
      setLocalMsg({ ok: false, text: 'Önce Türkçe etiket girin (TR alanı boş).' })
      return
    }
    setAiBusy(true)
    setLocalMsg(null)
    try {
      const targets = LINE_LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
      const out = await translateOneToMany({
        text: trText,
        context: 'short_label',
        sourceLocale: 'tr',
        targetLocales: targets,
      })
      setTrans((prev) => {
        const next: Record<string, string> = { ...prev, tr: trText }
        for (const lc of targets) {
          const existing = (prev[lc] ?? '').trim()
          const fresh = out.ok[lc] ?? ''
          if (fresh && (overwrite || existing.length === 0)) {
            next[lc] = fresh
          }
        }
        return next
      })
      const filled = Object.keys(out.ok).length
      const failedLocales = out.failed.map((f) => f.locale.toUpperCase()).join(', ')
      const firstFailReason = out.failed[0] ? aiErrorMessage(new Error(out.failed[0].error)) : ''
      const successText = `${filled} dile AI çevirisi geldi. Kontrol edip "Çevirileri kaydet"e basın.`
      const failTail = failedLocales
        ? ` Başarısız: ${failedLocales}${firstFailReason ? ` (${firstFailReason})` : ''}. "Hepsini yeniden çevir" ile tekrar deneyebilirsiniz.`
        : ''
      setLocalMsg({
        ok: filled > 0,
        text:
          filled > 0
            ? successText + failTail
            : `AI çeviri sonucu boş döndü.${firstFailReason ? ' Sebep: ' + firstFailReason : ' Ayarlar → Yapay Zeka bölümünde DeepSeek anahtarı tanımlı mı?'}`,
      })
    } catch (e) {
      setLocalMsg({ ok: false, text: aiErrorMessage(e) })
    } finally {
      setAiBusy(false)
    }
  }

  async function saveTranslations() {
    if (!editItem) return
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    try {
      const entries = LINE_LOCALES.map((l) => ({
        locale_code: l.code,
        label: (trans[l.code] ?? '').trim(),
      })).filter((e) => e.label.length > 0)
      if (entries.length === 0) {
        setLocalMsg({ ok: false, text: 'En az bir dilde etiket girin.' })
        return
      }
      await putPriceLineItemTranslations(token, editItem.id, { entries }, { organizationId })
      setLocalMsg({ ok: true, text: 'Çeviriler kaydedildi.' })
      setEditingId(null)
      onChanged()
    } catch (e) {
      setLocalMsg({ ok: false, text: e instanceof Error ? e.message : 'Kayıt başarısız' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border bg-white shadow-sm dark:bg-neutral-800',
        scope === 'included'
          ? 'border-emerald-200 dark:border-emerald-900/40'
          : 'border-amber-200 dark:border-amber-900/40',
      )}
    >
      <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
        <p className="text-xs text-neutral-400">Önizleme: {previewLocale}</p>
      </div>
      <div className="p-4">
        {rows.length === 0 ? (
          <p className="mb-3 text-xs text-neutral-400">Henüz kalem yok.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-600"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">{r.label || r.code}</p>
                  <p className="font-mono text-[11px] text-neutral-400">{r.code}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(r.id === editingId ? null : r.id)}
                    className="rounded-lg px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30"
                  >
                    Diller
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(r.id)}
                    className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {editItem ? (
          <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-900/40 dark:bg-primary-950/20">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Etiketler — {editItem.code}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <ManageAiMagicTextButton
                  loading={aiBusy}
                  disabled={busy}
                  onClick={() => void handleAiTranslate(false)}
                  title="TR'deki etiketten boş olan diğer 5 dili AI ile doldur (mevcut çevirilere dokunmaz)"
                >
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden>✨</span>
                    Boşları AI ile doldur
                  </span>
                </ManageAiMagicTextButton>
                <button
                  type="button"
                  disabled={aiBusy || busy}
                  onClick={() => void handleAiTranslate(true)}
                  className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  title="TR etiketten 5 dili yeniden çevir (mevcut çevirilerin üzerine yazar)"
                >
                  Hepsini yeniden çevir
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LINE_LOCALES.map((l) => (
                <Field key={l.code} className="block">
                  <Label className="text-[11px]">
                    {l.label}
                    {l.code === 'tr' ? <span className="ml-1 text-neutral-400">(kaynak)</span> : null}
                  </Label>
                  <Input
                    value={trans[l.code] ?? ''}
                    onChange={(e) => setTrans((p) => ({ ...p, [l.code]: e.target.value }))}
                    className="mt-0.5 text-sm"
                  />
                </Field>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-neutral-500">
              AI Türkçe alanı kaynak alır. Önce TR'yi doldurun, ardından çeviri butonlarını kullanın. Sonuçları her
              zaman gözden geçirip kaydedin.
            </p>
            <StatusMsg msg={localMsg} />
            <div className="mt-3 flex gap-2">
              <ButtonPrimary type="button" className="text-xs" disabled={busy || aiBusy} onClick={() => void saveTranslations()}>
                {busy ? '…' : 'Çevirileri kaydet'}
              </ButtonPrimary>
              <button type="button" className="text-xs text-neutral-500 underline" onClick={() => setEditingId(null)}>
                Kapat
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={(e) => void onAdd(e)} className="space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Yeni kalem</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field className="block">
              <Label className="text-[11px]">Türkçe etiket (zorunlu)</Label>
              <Input
                value={form.label}
                onChange={(e) => {
                  const newLabel = e.target.value
                  setForm((p) => ({
                    ...p,
                    label: newLabel,
                    code: p.codeManual ? p.code : labelToCode(newLabel),
                  }))
                }}
                placeholder="Havuz ısıtma"
                className="text-sm"
              />
            </Field>
            <Field className="block">
              <Label className="text-[11px]">Kod</Label>
              <Input
                value={form.code}
                onChange={(e) => {
                  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                  setForm((p) => ({
                    ...p,
                    code: cleaned,
                    codeManual: cleaned.length > 0,
                  }))
                }}
                placeholder="havuz_isitma"
                className="font-mono text-xs"
              />
              {!form.codeManual && form.code ? (
                <p className="mt-0.5 text-[10px] text-neutral-400">Etiketten otomatik üretildi.</p>
              ) : null}
            </Field>
            <Field className="block sm:col-span-2">
              <Label className="text-[11px]">Sıra</Label>
              <Input
                type="number"
                min="0"
                value={form.sort}
                onChange={(e) => setForm((p) => ({ ...p, sort: e.target.value }))}
                className="max-w-[120px]"
              />
            </Field>
          </div>
          <ButtonPrimary type="submit" disabled={busy} className="text-sm">
            {busy ? '…' : `+ ${title} ekle`}
          </ButtonPrimary>
          <StatusMsg msg={localMsg} />
        </form>
      </div>
    </div>
  )
}
