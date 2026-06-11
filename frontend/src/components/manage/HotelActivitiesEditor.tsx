'use client'

import { formatManageApiCatch } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  createManageHotelActivity,
  deleteManageHotelActivity,
  listManageHotelActivities,
  updateManageHotelActivity,
  type HotelListingActivity,
} from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type ActivityDraft = {
  key: string
  id?: string
  title: string
  title_en: string
  description: string
  description_en: string
  image_url: string
  activity_date: string
  stay_surcharge_amount: string
  currency_code: string
  sort_order: string
  is_active: boolean
}

function emptyRow(sortOrder: number): ActivityDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    title_en: '',
    description: '',
    description_en: '',
    image_url: '',
    activity_date: '',
    stay_surcharge_amount: '0',
    currency_code: 'TRY',
    sort_order: String(sortOrder),
    is_active: true,
  }
}

function fromApi(rows: HotelListingActivity[]): ActivityDraft[] {
  if (!rows.length) return [emptyRow(0)]
  return rows.map((r) => ({
    key: r.id,
    id: r.id,
    title: r.title,
    title_en: r.title_en,
    description: r.description,
    description_en: r.description_en,
    image_url: r.image_url,
    activity_date: r.activity_date.slice(0, 10),
    stay_surcharge_amount: String(r.stay_surcharge_amount),
    currency_code: r.currency_code || 'TRY',
    sort_order: String(r.sort_order),
    is_active: r.is_active,
  }))
}

export default function HotelActivitiesEditor({
  listingId,
  organizationId,
  locale,
}: {
  listingId: string
  organizationId?: string
  locale: string
}) {
  const ui = getMessages(locale).manageCatalogListing.hotel.activities
  const uiFallback = getMessages('en').manageCatalogListing.hotel.activities
  const label = useMemo(
    () =>
      ({
        eventN: (n: number) =>
          interpolate(ui?.eventN ?? uiFallback.eventN, { n: String(n) }),
        remove: ui?.remove ?? uiFallback.remove,
        titleTr: ui?.titleTr ?? uiFallback.titleTr,
        titleEn: ui?.titleEn ?? uiFallback.titleEn,
        titleTrPlaceholder: ui?.titleTrPlaceholder ?? uiFallback.titleTrPlaceholder,
        descriptionTr: ui?.descriptionTr ?? uiFallback.descriptionTr,
        descriptionEn: ui?.descriptionEn ?? uiFallback.descriptionEn,
        bannerUrl: ui?.bannerUrl ?? uiFallback.bannerUrl,
        bannerUrlPlaceholder: ui?.bannerUrlPlaceholder ?? uiFallback.bannerUrlPlaceholder,
        activityDate: ui?.activityDate ?? uiFallback.activityDate,
        staySurcharge: ui?.staySurcharge ?? uiFallback.staySurcharge,
        currency: ui?.currency ?? uiFallback.currency,
        showOnSite: ui?.showOnSite ?? uiFallback.showOnSite,
        surchargeHint: ui?.surchargeHint ?? uiFallback.surchargeHint,
        addBtn: ui?.addBtn ?? uiFallback.addBtn,
        saveBtn: ui?.saveBtn ?? uiFallback.saveBtn,
        saving: ui?.saving ?? uiFallback.saving,
        saveOk: ui?.saveOk ?? uiFallback.saveOk,
        loading: ui?.loading ?? uiFallback.loading,
      }) as const,
    [ui, uiFallback],
  )

  const [rows, setRows] = useState<ActivityDraft[]>([emptyRow(0)])
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
        const { activities } = await listManageHotelActivities(token, listingId, orgParam)
        if (!cancelled) setRows(fromApi(activities))
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

  function updateRow(key: string, patch: Partial<ActivityDraft>) {
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
      const { activities: existing } = await listManageHotelActivities(token, listingId, orgParam)
      const existingIds = new Set(existing.map((p) => p.id))
      const keptIds = new Set<string>()

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const title = row.title.trim()
        const activityDate = row.activity_date.trim()
        if (!title || !activityDate) continue
        const body = {
          title,
          title_en: row.title_en.trim(),
          description: row.description.trim(),
          description_en: row.description_en.trim(),
          image_url: row.image_url.trim(),
          activity_date: activityDate,
          stay_surcharge_amount: Number.parseFloat(row.stay_surcharge_amount) || 0,
          currency_code: row.currency_code.trim() || 'TRY',
          is_active: row.is_active,
          sort_order: i,
        }
        if (row.id) {
          await updateManageHotelActivity(token, listingId, row.id, body, orgParam)
          keptIds.add(row.id)
        } else {
          const created = await createManageHotelActivity(token, listingId, body, orgParam)
          keptIds.add(created.id)
        }
      }

      for (const p of existing) {
        if (!keptIds.has(p.id) && existingIds.has(p.id)) {
          await deleteManageHotelActivity(token, listingId, p.id, orgParam)
        }
      }

      const fresh = await listManageHotelActivities(token, listingId, orgParam)
      setRows(fromApi(fresh.activities))
      setMsg({ ok: true, text: label.saveOk })
    } catch (e) {
      setMsg({ ok: false, text: formatManageApiCatch(e, 'save_failed') })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-400">{label.loading}</p>
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
              {label.eventN(index + 1)}
            </span>
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {label.remove}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="block sm:col-span-2">
              <Label>{label.titleTr}</Label>
              <Input
                className="mt-1"
                value={row.title}
                onChange={(e) => updateRow(row.key, { title: e.target.value })}
                placeholder={label.titleTrPlaceholder}
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>{label.titleEn}</Label>
              <Input
                className="mt-1"
                value={row.title_en}
                onChange={(e) => updateRow(row.key, { title_en: e.target.value })}
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>{label.descriptionTr}</Label>
              <Input
                className="mt-1"
                value={row.description}
                onChange={(e) => updateRow(row.key, { description: e.target.value })}
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>{label.descriptionEn}</Label>
              <Input
                className="mt-1"
                value={row.description_en}
                onChange={(e) => updateRow(row.key, { description_en: e.target.value })}
              />
            </Field>
            <Field className="block sm:col-span-2">
              <Label>{label.bannerUrl}</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={row.image_url}
                onChange={(e) => updateRow(row.key, { image_url: e.target.value })}
                placeholder={label.bannerUrlPlaceholder}
              />
            </Field>
            <Field className="block">
              <Label>{label.activityDate}</Label>
              <Input
                className="mt-1"
                type="date"
                value={row.activity_date}
                onChange={(e) => updateRow(row.key, { activity_date: e.target.value })}
              />
            </Field>
            <Field className="block">
              <Label>{label.staySurcharge}</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                value={row.stay_surcharge_amount}
                onChange={(e) => updateRow(row.key, { stay_surcharge_amount: e.target.value })}
              />
            </Field>
            <Field className="block">
              <Label>{label.currency}</Label>
              <Input
                className="mt-1 font-mono text-sm uppercase"
                value={row.currency_code}
                onChange={(e) => updateRow(row.key, { currency_code: e.target.value })}
                placeholder="TRY"
              />
            </Field>
            <p className="sm:col-span-2 text-xs text-neutral-500 dark:text-neutral-400">
              {label.surchargeHint}
            </p>
            <Field className="flex items-center gap-2 sm:col-span-2">
              <input
                id={`activity-active-${row.key}`}
                type="checkbox"
                checked={row.is_active}
                onChange={(e) => updateRow(row.key, { is_active: e.target.checked })}
                className="rounded border-neutral-300"
              />
              <Label htmlFor={`activity-active-${row.key}`} className="!mb-0">
                {label.showOnSite}
              </Label>
            </Field>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <ButtonThird type="button" onClick={addRow}>
          <PlusCircle className="me-1.5 inline h-4 w-4" />
          {label.addBtn}
        </ButtonThird>
        <ButtonPrimary type="button" disabled={busy} onClick={() => void saveAll()}>
          {busy ? label.saving : label.saveBtn}
        </ButtonPrimary>
      </div>

      {msg ? (
        <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
      ) : null}
    </div>
  )
}
