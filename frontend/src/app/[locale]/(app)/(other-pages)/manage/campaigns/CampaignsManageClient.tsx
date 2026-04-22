'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createCampaign,
  listCampaigns,
  type Campaign,
} from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import MultiLangNamePanel, {
  stringifyMultiLangTranslations,
  type MultiLangTranslations,
} from '@/components/manage/MultiLangNamePanel'
import Link from 'next/link'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'

/** Erken rezervasyon / son dakika / kupon / paket tatil ayrı sayfalarda yönetilir; burada diğer türler. */
const CAMPAIGN_TYPES: { value: string; label: string }[] = [
  { value: 'special_date', label: 'Özel tarih' },
  { value: 'birthday_member', label: 'Üye doğum günü' },
  { value: 'date_range', label: 'Tarih aralığı' },
  { value: 'custom', label: 'Özel' },
]

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Türkçe ad → kebab-case kod (TR karakterler latinleşir, alfanümerik dışı `-` olur). */
function nameToCode(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export default function CampaignsManageClient() {
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [code, setCode] = useState('')
  const [codeManual, setCodeManual] = useState(false)
  const [name, setName] = useState('')
  const [nameTrans, setNameTrans] = useState<MultiLangTranslations>({})
  const [ctype, setCtype] = useState('custom')
  const [isActive, setIsActive] = useState(true)

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
      const r = await listCampaigns(token)
      setRows(r.campaigns ?? [])
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
    const c = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    const n = name.trim()
    if (!c || !n) {
      setErr('Kod ve ad zorunlu.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await createCampaign(token, {
        code: c,
        campaign_type: ctype,
        name: n,
        name_translations: stringifyMultiLangTranslations(nameTrans),
        rules_json: '{}',
        is_active: isActive,
      })
      setShowNew(false)
      setCode('')
      setCodeManual(false)
      setName('')
      setNameTrans({})
      setCtype('custom')
      setIsActive(true)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  const sublinks = [
    { href: '/manage/campaigns/coupons', label: 'Kuponlar' },
    { href: '/manage/campaigns/early-booking', label: 'Erken rezervasyon' },
    { href: '/manage/campaigns/last-minute', label: 'Son dakika' },
    { href: '/manage/campaigns/packages', label: 'Paket tatil' },
  ]

  return (
    <div className="space-y-8">
      <ManageFormPageHeader
        title="Kampanyalar"
        subtitle={
          <span>
            Genel kampanya listesi. Erken rezervasyon, son dakika, kupon ve paket tatil için soldaki bağlantılar — her
            biri kendi veri modeli ve formu ile açılır; tür seçimi bu sayfadaki hızlı oluşturma ile karıştırılmamalıdır.
          </span>
        }
      />

      <div className="flex flex-wrap gap-2">
        {sublinks.map((l) => (
          <Link
            key={l.href}
            href={vitrinPath(l.href)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {l.label}
          </Link>
        ))}
      </div>

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
          onClick={() => { setShowNew((s) => !s); setErr(null) }}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Yeni kampanya
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
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Hızlı kampanya oluştur</h2>
          <p className="text-xs text-neutral-500">
            Kod benzersiz olmalı (küçük harf, rakam, tire). Kurallar şimdilik boş JSON; özel tarih / doğum günü /
            tarih aralığı gibi türler için buradan ekleyebilirsiniz. Erken rezervasyon ve son dakika için ilgili alt
            sayfaları kullanın.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Ad <span className="text-neutral-400">(Türkçe — kaynak)</span>
            </label>
            <input
              value={name}
              onChange={(e) => {
                const v = e.target.value
                setName(v)
                if (!codeManual) setCode(nameToCode(v))
              }}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Yaz kampanyası"
            />
          </div>
          <MultiLangNamePanel
            trText={name}
            translations={nameTrans}
            onChange={setNameTrans}
            disabled={saving}
            fieldLabel="Kampanya adı"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Kod</label>
            <input
              value={code}
              onChange={(e) => {
                const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                setCode(cleaned)
                setCodeManual(cleaned.length > 0)
              }}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="yaz2026"
            />
            {!codeManual && code ? (
              <p className="mt-0.5 text-[10px] text-neutral-400">Addan otomatik üretildi.</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Tür</label>
            <select
              value={ctype}
              onChange={(e) => setCtype(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Aktif
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-600">
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
          <p className="p-8 text-sm text-neutral-500">Henüz kampanya yok. “Yeni kampanya” ile ekleyebilirsiniz.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Tür</th>
                  <th className="px-4 py-3">Ad</th>
                  <th className="px-4 py-3">Başlangıç</th>
                  <th className="px-4 py-3">Bitiş</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{r.campaign_type}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{fmtDate(r.starts_at)}</td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{fmtDate(r.ends_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          r.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
                        )}
                      >
                        {r.is_active ? 'Aktif' : 'Kapalı'}
                      </span>
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
