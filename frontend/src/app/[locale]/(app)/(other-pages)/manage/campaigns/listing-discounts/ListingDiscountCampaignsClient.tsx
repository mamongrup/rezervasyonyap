'use client'

import { ManageFormPageHeader } from '@/components/manage/ManageFormShell'
import MultiLangNamePanel, {
  parseMultiLangTranslations,
  stringifyMultiLangTranslations,
  type MultiLangTranslations,
} from '@/components/manage/MultiLangNamePanel'
import { CATEGORY_LABEL_TR } from '@/lib/catalog-category-ui'
import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createCampaign,
  deleteCampaign,
  getCampaignListings,
  listCampaigns,
  listSocialListings,
  patchCampaign,
  putCampaignListings,
  type Campaign,
  type CampaignListingLink,
} from '@/lib/travel-api'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import clsx from 'clsx'
import { Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const CAMPAIGN_TYPE = 'listing_discount'

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

type ListingDraft = { listing_id: string; listing_title: string; discount_percent: string }

export default function ListingDiscountCampaignsClient() {
  const vitrinPath = useVitrinHref()
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [nameTrans, setNameTrans] = useState<MultiLangTranslations>({})
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [linkedListings, setLinkedListings] = useState<ListingDraft[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchCat, setSearchCat] = useState('holiday_home')
  const [searchHits, setSearchHits] = useState<Array<{ id: string; title: string }>>([])
  const [searching, setSearching] = useState(false)

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
    setCode('')
    setName('')
    setNameTrans({})
    setStartsAt('')
    setEndsAt('')
    setIsActive(true)
    setLinkedListings([])
    setSearchQ('')
    setSearchHits([])
    setShowForm(false)
  }

  async function openEdit(row: Campaign) {
    const token = getStoredAuthToken()
    if (!token) return
    setEditingId(row.id)
    setCode(row.code)
    setName(row.name)
    setNameTrans(parseMultiLangTranslations(row.name_translations))
    setStartsAt(fromIsoToLocal(row.starts_at))
    setEndsAt(fromIsoToLocal(row.ends_at))
    setIsActive(row.is_active)
    setShowForm(true)
    try {
      const r = await getCampaignListings(token, row.id)
      setLinkedListings(
        (r.listings ?? []).map((l: CampaignListingLink) => ({
          listing_id: l.listing_id,
          listing_title: l.listing_title,
          discount_percent: l.discount_percent?.trim() || '10',
        })),
      )
    } catch {
      setLinkedListings([])
    }
  }

  async function onSearchListings() {
    const token = getStoredAuthToken()
    if (!token || !searchQ.trim()) return
    setSearching(true)
    try {
      const r = await listSocialListings(token, {
        categoryCode: searchCat,
        search: searchQ.trim(),
        limit: 20,
      })
      setSearchHits(
        (r.listings ?? []).map((l) => ({
          id: l.id,
          title: l.title?.trim() || l.slug || l.id,
        })),
      )
    } catch {
      setSearchHits([])
    } finally {
      setSearching(false)
    }
  }

  function addListing(hit: { id: string; title: string }) {
    if (linkedListings.some((l) => l.listing_id === hit.id)) return
    setLinkedListings((prev) => [
      ...prev,
      { listing_id: hit.id, listing_title: hit.title, discount_percent: '10' },
    ])
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
        rules_json: JSON.stringify({ schema: 'listing_discount_v1' }),
        starts_at: toIsoLocal(startsAt),
        ends_at: toIsoLocal(endsAt),
        is_active: isActive,
      }
      let campaignId = editingId
      if (editingId) {
        await patchCampaign(token, editingId, body)
      } else {
        const c = nameToCode(n) || `indirim-${Date.now()}`
        const created = await createCampaign(token, {
          code: c,
          campaign_type: CAMPAIGN_TYPE,
          ...body,
        })
        campaignId = created.id
      }
      if (campaignId) {
        await putCampaignListings(
          token,
          campaignId,
          linkedListings.map((l) => ({
            listing_id: l.listing_id,
            discount_percent: l.discount_percent.trim() || '0',
          })),
        )
      }
      resetForm()
      await load()
    } catch (e) {
      setErr(formatManageApiCatch(e, 'Kaydedilemedi'))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(row: Campaign) {
    if (!window.confirm(`«${row.name}» silinsin mi?`)) return
    const token = getStoredAuthToken()
    if (!token) return
    setSaving(true)
    try {
      await deleteCampaign(token, row.id)
      await load()
    } catch (e) {
      setErr(formatManageApiCatch(e, 'Silinemedi'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ManageFormPageHeader
        title="İlana özel indirim kampanyaları"
        subtitle="Belirli ilanlara tarih aralığında geçerli indirim kampanyası tanımlayın. İlan detay sayfasında «Kampanyalar» bölümünde görünür."
      />

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <RefreshCw className={clsx('size-4', loading && 'animate-spin')} />
          Yenile
        </button>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white"
          >
            <Plus className="size-4" />
            Yeni kampanya
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Başlangıç</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Bitiş</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Aktif
          </label>

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">Kampanyaya dahil ilanlar</p>
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={searchCat}
                onChange={(e) => setSearchCat(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-sm"
              >
                {Object.entries(CATEGORY_LABEL_TR).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="İlan ara…"
                className="min-w-[12rem] flex-1 rounded-lg border px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => void onSearchListings()}
                disabled={searching}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                {searching ? '…' : 'Ara'}
              </button>
            </div>
            {searchHits.length > 0 ? (
              <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto rounded border bg-neutral-50 p-2 text-sm dark:bg-neutral-800">
                {searchHits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => addListing(hit)}
                      className="w-full rounded px-2 py-1 text-left hover:bg-white dark:hover:bg-neutral-700"
                    >
                      + {hit.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {linkedListings.length === 0 ? (
              <p className="text-sm text-neutral-500">Henüz ilan eklenmedi.</p>
            ) : (
              <ul className="space-y-2">
                {linkedListings.map((l) => (
                  <li key={l.listing_id} className="flex flex-wrap items-center gap-2 rounded border px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 font-medium">{l.listing_title}</span>
                    <label className="flex items-center gap-1 text-xs">
                      % indirim
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={l.discount_percent}
                        onChange={(e) =>
                          setLinkedListings((prev) =>
                            prev.map((x) =>
                              x.listing_id === l.listing_id
                                ? { ...x, discount_percent: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="w-16 rounded border px-2 py-1"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setLinkedListings((prev) => prev.filter((x) => x.listing_id !== l.listing_id))
                      }
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                      aria-label="Kaldır"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
          {filtered.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-900"
            >
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {fmtDate(row.starts_at)} → {fmtDate(row.ends_at)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{row.is_active ? 'Aktif' : 'Kapalı'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void openEdit(row)}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm"
                >
                  <Pencil className="size-3.5" />
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700"
                >
                  <Trash2 className="size-3.5" />
                  Sil
                </button>
              </div>
            </li>
          ))}
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
