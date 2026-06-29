'use client'

import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import MultiLangNamePanel, {
  parseMultiLangTranslations,
  stringifyMultiLangTranslations,
  type MultiLangTranslations,
} from '@/components/manage/MultiLangNamePanel'
import { CATEGORY_LABEL_TR, ORDERED_PRODUCT_CATEGORY_CODES } from '@/lib/catalog-category-ui'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createCampaign,
  listCampaigns,
  patchCampaign,
  type Campaign,
} from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import clsx from 'clsx'
import { Loader2, Pencil, Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const CAMPAIGN_TYPE = 'card_installment'

function parseInstallmentRules(json: string): { installmentCount: number; categoryCodes: string[] } {
  try {
    const o = JSON.parse(json) as { installment_count?: unknown; category_codes?: unknown }
    const installmentCount =
      typeof o.installment_count === 'number' && o.installment_count > 0
        ? Math.floor(o.installment_count)
        : 12
    const categoryCodes = Array.isArray(o.category_codes)
      ? o.category_codes.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      : []
    return { installmentCount, categoryCodes }
  } catch {
    return { installmentCount: 12, categoryCodes: [] }
  }
}

function buildInstallmentRules(installmentCount: number, categoryCodes: string[]): string {
  return JSON.stringify({
    schema: 'card_installment_v1',
    installment_count: installmentCount,
    category_codes: categoryCodes,
  })
}

export default function CardInstallmentCampaignClient() {
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('Tüm Kredi Kartlarına 12 Taksit')
  const [nameTrans, setNameTrans] = useState<MultiLangTranslations>({})
  const [installmentCount, setInstallmentCount] = useState(12)
  const [categoryCodes, setCategoryCodes] = useState<string[]>([
    'hotel',
    'holiday_home',
    'yacht_charter',
    'tour',
    'activity',
  ])
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
      setErr(formatManageApiCatch(e, 'Liste yüklenemedi'))
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
    setName('Tüm Kredi Kartlarına 12 Taksit')
    setNameTrans({})
    setInstallmentCount(12)
    setCategoryCodes(['hotel', 'holiday_home', 'yacht_charter', 'tour', 'activity'])
    setIsActive(true)
    setShowForm(false)
  }

  function openEdit(row: Campaign) {
    const rules = parseInstallmentRules(row.rules_json)
    setEditingId(row.id)
    setName(row.name)
    setNameTrans(parseMultiLangTranslations(row.name_translations))
    setInstallmentCount(rules.installmentCount)
    setCategoryCodes(rules.categoryCodes.length > 0 ? rules.categoryCodes : [...ORDERED_PRODUCT_CATEGORY_CODES])
    setIsActive(row.is_active)
    setShowForm(true)
  }

  function toggleCategory(code: string) {
    setCategoryCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    const token = getStoredAuthToken()
    if (!token) return
    const n = name.trim()
    if (!n) {
      setErr('Kampanya adı zorunlu.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const body = {
        name: n,
        name_translations: stringifyMultiLangTranslations(nameTrans),
        rules_json: buildInstallmentRules(installmentCount, categoryCodes),
        is_active: isActive,
      }
      if (editingId) {
        await patchCampaign(token, editingId, body)
      } else {
        await createCampaign(token, {
          code: 'card-installment-12',
          campaign_type: CAMPAIGN_TYPE,
          ...body,
        })
      }
      resetForm()
      await load()
    } catch (e) {
      setErr(formatManageApiCatch(e, 'Kaydedilemedi'))
    } finally {
      setSaving(false)
    }
  }

  async function onQuickToggle(row: Campaign) {
    const token = getStoredAuthToken()
    if (!token) return
    setSaving(true)
    try {
      await patchCampaign(token, row.id, { is_active: !row.is_active })
      await load()
    } catch (e) {
      setErr(formatManageApiCatch(e, 'Durum güncellenemedi'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ManageFormPageHeader
        title="Kart taksit kampanyası"
        subtitle="İlan detay sayfasında gösterilen «Tüm kredi kartlarına 12 taksit» kampanyasını yönetin. Hangi kategorilerde görüneceğini seçin."
      />

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <RefreshCw className={clsx('size-4', loading && 'animate-spin')} />
          Yenile
        </button>
        {!showForm && filtered.length === 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="size-4" />
            Kampanya oluştur
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form onSubmit={(e) => void onSave(e)} className="mb-8 space-y-4 rounded-xl border bg-white p-5 dark:bg-neutral-900">
          <div>
            <label className="mb-1 block text-sm font-medium">Kampanya adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
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
            <label className="mb-1 block text-sm font-medium">Taksit sayısı</label>
            <input
              type="number"
              min={2}
              max={24}
              value={installmentCount}
              onChange={(e) => setInstallmentCount(Number(e.target.value) || 12)}
              className="w-32 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Geçerli kategoriler</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ORDERED_PRODUCT_CATEGORY_CODES.map((code) => (
                <label key={code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={categoryCodes.includes(code)}
                    onChange={() => toggleCategory(code)}
                  />
                  {CATEGORY_LABEL_TR[code] ?? code}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">Hiçbiri seçilmezse tüm kategorilerde gösterilir.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Aktif (ilan detayında göster)
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Kaydet'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm">
              İptal
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const rules = parseInstallmentRules(row.rules_json)
            const cats =
              rules.categoryCodes.length > 0
                ? rules.categoryCodes.map((c) => CATEGORY_LABEL_TR[c] ?? c).join(', ')
                : 'Tüm kategoriler'
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-900"
              >
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {rules.installmentCount} taksit · {cats}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Durum: {row.is_active ? 'Aktif' : 'Kapalı'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onQuickToggle(row)}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                  >
                    {row.is_active ? 'Kapat' : 'Aç'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm"
                  >
                    <Pencil className="size-3.5" />
                    Düzenle
                  </button>
                </div>
              </li>
            )
          })}
          {filtered.length === 0 && !showForm ? (
            <li className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">
              Henüz kart taksit kampanyası yok.{' '}
              <button type="button" className="text-primary-600 underline" onClick={() => setShowForm(true)}>
                Oluştur
              </button>
            </li>
          ) : null}
        </ul>
      )}

      <p className="mt-6 text-sm text-neutral-500">
        <Link href={`${vitrinPath}/manage/campaigns`} className="text-primary-600 hover:underline">
          ← Tüm kampanyalar
        </Link>
      </p>
    </div>
  )
}
