'use client'

import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createManageHotelPromotion,
  deleteManageHotelPromotion,
  listManageHotelPromotions,
  updateManageHotelPromotion,
  type HotelListingPromotion,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

type PromotionDraft = {
  key: string
  id?: string
  title: string
  title_en: string
  image_url: string
  link_url: string
  sort_order: string
  is_active: boolean
}

function emptyRow(sortOrder: number): PromotionDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    title_en: '',
    image_url: '',
    link_url: '',
    sort_order: String(sortOrder),
    is_active: true,
  }
}

function fromApi(rows: HotelListingPromotion[]): PromotionDraft[] {
  if (!rows.length) return [emptyRow(0)]
  return rows.map((r) => ({
    key: r.id,
    id: r.id,
    title: r.title,
    title_en: r.title_en,
    image_url: r.image_url,
    link_url: r.link_url,
    sort_order: String(r.sort_order),
    is_active: r.is_active,
  }))
}

export default function HotelPromotionsEditor({
  listingId,
  organizationId,
}: {
  listingId: string
  organizationId?: string
}) {
  const [rows, setRows] = useState<PromotionDraft[]>([emptyRow(0)])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const orgParam = organizationId?.trim() ? { organizationId: organizationId.trim() } : undefined

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { promotions } = await listManageHotelPromotions(token, listingId, orgParam)
        if (!cancelled) setRows(fromApi(promotions))
      } catch (e) {
        if (!cancelled) setMsg({ ok: false, text: formatManageApiCatch(e, 'load_failed') })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [listingId, organizationId])

  function updateRow(key: string, patch: Partial<PromotionDraft>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(prev.length)])
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? [emptyRow(0)] : prev.filter((r) => r.key !== key)))
  }

  async function saveAll() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      const { promotions: existing } = await listManageHotelPromotions(token, listingId, orgParam)
      const existingIds = new Set(existing.map((p) => p.id))
      const keptIds = new Set<string>()

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const title = row.title.trim()
        if (!title) continue
        const body = {
          title,
          title_en: row.title_en.trim(),
          image_url: row.image_url.trim(),
          link_url: row.link_url.trim(),
          is_active: row.is_active,
          sort_order: i,
        }
        if (row.id) {
          await updateManageHotelPromotion(token, listingId, row.id, body, orgParam)
          keptIds.add(row.id)
        } else {
          const created = await createManageHotelPromotion(token, listingId, body, orgParam)
          keptIds.add(created.id)
        }
      }

      for (const p of existing) {
        if (!keptIds.has(p.id) && existingIds.has(p.id)) {
          await deleteManageHotelPromotion(token, listingId, p.id, orgParam)
        }
      }

      const fresh = await listManageHotelPromotions(token, listingId, orgParam)
      setRows(fromApi(fresh.promotions))
      setMsg({ ok: true, text: 'Kampanyalar kaydedildi.' })
    } catch (e) {
      setMsg({ ok: false, text: formatManageApiCatch(e, 'save_failed') })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-400">Yükleniyor…</p>
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Kampanya {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kaldır
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="block sm:col-span-2">
              <Label>Başlık (TR)</Label>
              <Input
                className="mt-1"
                value={row.title}
                onChange={(e) => updateRow(row.key, { title: e.target.value })}
                placeholder="Örn. KoçAilem Tatil Otelleri (2026)"
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>Başlık (EN)</Label>
              <Input
                className="mt-1"
                value={row.title_en}
                onChange={(e) => updateRow(row.key, { title_en: e.target.value })}
                placeholder="Optional English title"
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>Logo görsel URL</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={row.image_url}
                onChange={(e) => updateRow(row.key, { image_url: e.target.value })}
                placeholder="/uploads/... veya https://..."
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>Bağlantı (isteğe bağlı)</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={row.link_url}
                onChange={(e) => updateRow(row.key, { link_url: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <Field className="flex items-center gap-2 sm:col-span-2">
              <input
                id={`promo-active-${row.key}`}
                type="checkbox"
                checked={row.is_active}
                onChange={(e) => updateRow(row.key, { is_active: e.target.checked })}
                className="rounded border-neutral-300"
              />
              <Label htmlFor={`promo-active-${row.key}`} className="!mb-0">
                Vitrinde göster
              </Label>
            </Field>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <ButtonThird type="button" onClick={addRow}>
          <PlusCircle className="me-1.5 inline h-4 w-4" />
          Kampanya ekle
        </ButtonThird>
        <ButtonPrimary type="button" disabled={busy} onClick={() => void saveAll()}>
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </ButtonPrimary>
      </div>

      {msg ? (
        <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
      ) : null}
    </div>
  )
}
