'use client'

import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import MultiLangNamePanel, {
  parseMultiLangTranslations,
  stringifyMultiLangTranslations,
  type MultiLangTranslations,
} from '@/components/manage/MultiLangNamePanel'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createCampaign,
  deleteCampaign,
  listCampaigns,
  patchCampaign,
  type Campaign,
} from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import clsx from 'clsx'
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const CAMPAIGN_TYPE = 'last_minute'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

function toIsoLocal(dtLocal: string): string | undefined {
  if (!dtLocal.trim()) return undefined
  const d = new Date(dtLocal)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function fromIsoToLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function parseLastRules(json: string): { maxH: number; minH: number; discount: number } {
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    return {
      maxH: typeof o.max_hours_before_checkin === 'number' ? o.max_hours_before_checkin : 72,
      minH: typeof o.min_hours_before_checkin === 'number' ? o.min_hours_before_checkin : 0,
      discount: typeof o.discount_percent === 'number' ? o.discount_percent : 15,
    }
  } catch {
    return { maxH: 72, minH: 0, discount: 15 }
  }
}

function buildLastRules(maxH: number, minH: number, discount: number): string {
  return JSON.stringify({
    schema: 'last_minute_v1',
    max_hours_before_checkin: maxH,
    min_hours_before_checkin: minH,
    discount_percent: discount,
  })
}

function ruleSummary(json: string): string {
  const r = parseLastRules(json)
  return `Girişe en fazla ${r.maxH} saat, en az ${r.minH} saat kala · %${r.discount} indirim`
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

export default function LastMinuteCampaignsClient() {
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [codeManual, setCodeManual] = useState(false)
  const [name, setName] = useState('')
  const [nameTrans, setNameTrans] = useState<MultiLangTranslations>({})
  const [maxHours, setMaxHours] = useState(72)
  const [minHours, setMinHours] = useState(0)
  const [discount, setDiscount] = useState(15)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [isActive, setIsActive] = useState(true)

  const filtered = useMemo(() => rows.filter((r) => r.campaign_type === CAMPAIGN_TYPE), [rows])

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

  function resetForm() {
    setEditingId(null)
    setCode('')
    setCodeManual(false)
    setName('')
    setNameTrans({})
    setMaxHours(72)
    setMinHours(0)
    setDiscount(15)
    setStartsAt('')
    setEndsAt('')
    setIsActive(true)
  }

  function openNew() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id)
    setCode(c.code)
    setCodeManual(true)
    setName(c.name)
    setNameTrans(parseMultiLangTranslations(c.name_translations))
    const r = parseLastRules(c.rules_json || '{}')
    setMaxHours(r.maxH)
    setMinHours(r.minH)
    setDiscount(r.discount)
    setStartsAt(fromIsoToLocal(c.starts_at))
    setEndsAt(fromIsoToLocal(c.ends_at))
    setIsActive(c.is_active)
    setShowForm(true)
    setErr(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const c = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    const n = name.trim()
    if (!c || !n) {
      setErr('Kod ve ad zorunlu.')
      return
    }
    if (maxHours < 1 || maxHours > 24 * 60) {
      setErr('Üst saat sınırı 1–1440 arasında olmalı.')
      return
    }
    if (minHours < 0 || minHours >= maxHours) {
      setErr('Alt saat sınırı 0 ile üst sınır arasında olmalı.')
      return
    }
    if (discount < 0 || discount > 100) {
      setErr('İndirim yüzdesi 0–100 arasında olmalı.')
      return
    }
    const rules = buildLastRules(maxHours, minHours, discount)
    const st = toIsoLocal(startsAt)
    const en = toIsoLocal(endsAt)
    setSaving(true)
    setErr(null)
    try {
      const transStr = stringifyMultiLangTranslations(nameTrans)
      if (editingId) {
        await patchCampaign(token, editingId, {
          code: c,
          name: n,
          name_translations: transStr,
          rules_json: rules,
          ...(st !== undefined ? { starts_at: st } : {}),
          ...(en !== undefined ? { ends_at: en } : {}),
          is_active: isActive,
        })
      } else {
        await createCampaign(token, {
          code: c,
          campaign_type: CAMPAIGN_TYPE,
          name: n,
          name_translations: transStr,
          rules_json: rules,
          starts_at: st,
          ends_at: en,
          is_active: isActive,
        })
      }
      setShowForm(false)
      resetForm()
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function onToggleActive(c: Campaign) {
    const token = getStoredAuthToken()
    if (!token) return
    setErr(null)
    try {
      await patchCampaign(token, c.id, { is_active: !c.is_active })
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Güncellenemedi')
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('Bu son dakika kampanyasını silmek istiyor musunuz?')) return
    const token = getStoredAuthToken()
    if (!token) return
    setErr(null)
    try {
      await deleteCampaign(token, id)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  return (
    <div className="space-y-8">
      <ManageFormPageHeader
        title="Son dakika"
        subtitle={
          <span>
            Giriş tarihine <strong>yakın zamanda</strong> yapılan rezervasyonlar için indirim penceresi (saat cinsinden).
            Erken rezervasyon “günler önce” mantığıdır —{' '}
            <Link href={vitrinPath('/manage/campaigns/early-booking')} className="font-medium text-[color:var(--manage-primary)] hover:underline">
              Erken rezervasyon
            </Link>{' '}
            sayfasını kullanın.
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
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Yeni son dakika kampanyası
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="max-w-2xl space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {editingId ? 'Kampanyayı düzenle' : 'Yeni kampanya'}
          </h2>
          <p className="text-xs text-neutral-500">
            Tür her zaman <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">last_minute</code> olarak
            kaydedilir; kurallar girişe kalan saat aralığına göredir (erken rezervasyondaki “gün önce” alanı yoktur).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Ad <span className="text-neutral-400">(Türkçe — kaynak)</span>
              </label>
              <input
                value={name}
                onChange={(e) => {
                  const v = e.target.value
                  setName(v)
                  if (!codeManual && !editingId) setCode(nameToCode(v))
                }}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="Hafta içi son dakika"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Kod</label>
              <input
                value={code}
                onChange={(e) => {
                  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                  setCode(cleaned)
                  setCodeManual(cleaned.length > 0)
                }}
                disabled={!!editingId}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="sondakika-haftaici"
              />
              {!editingId && !codeManual && code ? (
                <p className="mt-0.5 text-[10px] text-neutral-400">Addan otomatik üretildi.</p>
              ) : null}
            </div>
          </div>
          <MultiLangNamePanel
            trText={name}
            translations={nameTrans}
            onChange={setNameTrans}
            disabled={saving}
            fieldLabel="Kampanya adı"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Üst sınır (saat)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={maxHours}
                onChange={(e) => setMaxHours(Number.parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-[10px] text-neutral-400">Örn. 72: girişe en fazla 72 saat kala uygun.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Alt sınır (saat)
              </label>
              <input
                type="number"
                min={0}
                max={1439}
                value={minHours}
                onChange={(e) => setMinHours(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-[10px] text-neutral-400">Çok erken rezervasyonları hariç tutmak için.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                İndirim %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Başlangıç</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Bitiş</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Aktif
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Güncelle' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-600"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {loading && filtered.length === 0 ? (
          <div className="flex items-center gap-2 p-8 text-sm text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-sm text-neutral-500">Henüz son dakika kampanyası yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Ad</th>
                  <th className="px-4 py-3">Kural özeti</th>
                  <th className="px-4 py-3">Dönem</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{r.name}</td>
                    <td className="max-w-xs px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                      {ruleSummary(r.rules_json || '{}')}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {fmtDate(r.starts_at)} — {fmtDate(r.ends_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void onToggleActive(r)}
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          r.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
                        )}
                      >
                        {r.is_active ? 'Aktif' : 'Kapalı'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="me-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Düzenle
                      </button>
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
