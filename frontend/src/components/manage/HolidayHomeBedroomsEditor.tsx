'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import {
  getVerticalHolidayHomeBedrooms,
  putVerticalHolidayHomeBedrooms,
  type ListingBedroomRow,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export type BedroomDraft = {
  key: string
  name: string
  floor_label: string
  beds_description: string
  ensuite: boolean
}

function emptyRow(): BedroomDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    floor_label: '',
    beds_description: '',
    ensuite: false,
  }
}

function fromApi(rows: ListingBedroomRow[]): BedroomDraft[] {
  if (!rows.length) return [emptyRow()]
  return rows.map((r) => ({
    key: r.id,
    name: r.name ?? '',
    floor_label: r.floor_label ?? '',
    beds_description: r.beds_description ?? '',
    ensuite: !!r.ensuite,
  }))
}

export default function HolidayHomeBedroomsEditor({ listingId }: { listingId: string }) {
  const [rows, setRows] = useState<BedroomDraft[]>([emptyRow()])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    void getVerticalHolidayHomeBedrooms(listingId)
      .then((res) => {
        if (cancelled) return
        setRows(fromApi(res.bedrooms ?? []))
      })
      .catch(() => {
        if (!cancelled) setRows([emptyRow()])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId])

  async function handleSave() {
    setBusy(true)
    setMsg(null)
    try {
      const payload = rows
        .map((r, i) => ({
          name: r.name.trim(),
          floor_label: r.floor_label.trim() || undefined,
          beds_description: r.beds_description.trim(),
          sort_order: i,
          ensuite: r.ensuite,
        }))
        .filter((r) => r.name || r.beds_description)
      await putVerticalHolidayHomeBedrooms(listingId, payload)
      const res = await getVerticalHolidayHomeBedrooms(listingId)
      setRows(fromApi(res.bedrooms ?? []))
      setMsg({ ok: true, text: 'Yatak odaları kaydedildi.' })
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'),
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-400">Yatak odaları yükleniyor…</p>

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Vitrinde &quot;Nerede uyuyacaksınız&quot; bölümünde kart olarak gösterilir. Oda adı, kat, yatak düzeni ve
        özel banyo bilgisini girin.
      </p>
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li
            key={row.key}
            className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-800/40"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="block">
                <Label>Oda adı</Label>
                <Input
                  className="mt-1"
                  value={row.name}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, name: e.target.value }
                    setRows(next)
                  }}
                  placeholder="Örn. Ana yatak odası"
                />
              </Field>
              <Field className="block">
                <Label>Kat</Label>
                <Input
                  className="mt-1"
                  value={row.floor_label}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, floor_label: e.target.value }
                    setRows(next)
                  }}
                  placeholder="Örn. 1"
                />
              </Field>
            </div>
            <Field className="mt-3 block">
              <Label>Yataklar</Label>
              <Input
                className="mt-1"
                value={row.beds_description}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...row, beds_description: e.target.value }
                  setRows(next)
                }}
                placeholder="Örn. 1 çift kişilik yatak"
              />
            </Field>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary-600"
                checked={row.ensuite}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...row, ensuite: e.target.checked }
                  setRows(next)
                }}
              />
              Özel banyo (ensuite)
            </label>
            {rows.length > 1 ? (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline dark:text-red-400"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Odayı kaldır
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <ButtonThird type="button" onClick={() => setRows([...rows, emptyRow()])}>
          <PlusCircle className="mr-1 inline h-4 w-4" />
          Oda ekle
        </ButtonThird>
        <ButtonPrimary type="button" onClick={() => void handleSave()} disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Yatak odalarını kaydet'}
        </ButtonPrimary>
      </div>
      {msg ? (
        <p
          className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  )
}
