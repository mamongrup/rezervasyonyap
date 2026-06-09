'use client'

import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  listManageHotelRooms,
  putManageHotelRooms,
  type ManageHotelRoomRow,
} from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export type HotelRoomDraft = {
  key: string
  id?: string
  name: string
  capacity: string
  board_type: string
  unit_count: string
  beds: string
  size_m2: string
  description: string
}

function emptyRow(): HotelRoomDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    capacity: '',
    board_type: '',
    unit_count: '1',
    beds: '',
    size_m2: '',
    description: '',
  }
}

function parseMeta(metaJson: string): Pick<HotelRoomDraft, 'beds' | 'size_m2' | 'description'> {
  try {
    const m = JSON.parse(metaJson || '{}') as Record<string, unknown>
    return {
      beds: m.beds != null ? String(m.beds) : '',
      size_m2: m.size_m2 != null ? String(m.size_m2) : m.size_sqm != null ? String(m.size_sqm) : '',
      description: typeof m.description === 'string' ? m.description : '',
    }
  } catch {
    return { beds: '', size_m2: '', description: '' }
  }
}

function buildMeta(row: HotelRoomDraft): string {
  const meta: Record<string, unknown> = {}
  if (row.beds.trim()) meta.beds = Number.parseInt(row.beds.trim(), 10) || row.beds.trim()
  if (row.size_m2.trim()) meta.size_m2 = Number.parseFloat(row.size_m2.trim()) || row.size_m2.trim()
  if (row.description.trim()) meta.description = row.description.trim()
  return JSON.stringify(meta)
}

function fromApi(rows: ManageHotelRoomRow[]): HotelRoomDraft[] {
  if (!rows.length) return [emptyRow()]
  return rows.map((r) => {
    const meta = parseMeta(r.meta_json)
    return {
      key: r.id,
      id: r.id,
      name: r.name ?? '',
      capacity: r.capacity ?? '',
      board_type: r.board_type ?? '',
      unit_count: String(r.unit_count ?? 1),
      ...meta,
    }
  })
}

export default function HotelRoomsEditor({
  listingId,
  organizationId,
  onSaved,
}: {
  listingId: string
  organizationId?: string
  onSaved?: (rooms: ManageHotelRoomRow[]) => void
}) {
  const [rows, setRows] = useState<HotelRoomDraft[]>([emptyRow()])
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
    void listManageHotelRooms(token, listingId, orgParam)
      .then((res) => {
        if (cancelled) return
        const mapped = fromApi(res.rooms ?? [])
        setRows(mapped)
        onSaved?.(res.rooms ?? [])
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
  }, [listingId, organizationId])

  async function handleSave() {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setMsg(null)
    try {
      const payload = rows
        .filter((r) => r.name.trim())
        .map((r) => ({
          id: r.id,
          name: r.name.trim(),
          capacity: r.capacity.trim() || undefined,
          board_type: r.board_type.trim() || undefined,
          unit_count: Math.max(1, Number.parseInt(r.unit_count.trim(), 10) || 1),
          meta_json: buildMeta(r),
        }))
      await putManageHotelRooms(token, listingId, payload, orgParam)
      const res = await listManageHotelRooms(token, listingId, orgParam)
      setRows(fromApi(res.rooms ?? []))
      onSaved?.(res.rooms ?? [])
      setMsg({ ok: true, text: 'Oda tipleri kaydedildi.' })
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'),
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-400">Oda tipleri yükleniyor…</p>

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Her satır bir oda tipini temsil eder. &quot;Oda adedi&quot; alanı aynı tipten kaç oda olduğunu belirtir (ör.
        5 adet Standart Oda). Vitrinde oda kartları bu kayıtlardan oluşur; müsaitlik takvimini bir sonraki adımda oda
        bazında tanımlayabilirsiniz.
      </p>
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li
            key={row.key}
            className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-800/40"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field className="block sm:col-span-2">
                <Label>Oda tipi adı</Label>
                <Input
                  className="mt-1"
                  value={row.name}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, name: e.target.value }
                    setRows(next)
                  }}
                  placeholder="Örn. Standart Oda, Deniz Manzaralı Süit"
                  required
                />
              </Field>
              <Field className="block">
                <Label>Oda adedi</Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1"
                  value={row.unit_count}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, unit_count: e.target.value }
                    setRows(next)
                  }}
                  placeholder="1"
                />
              </Field>
              <Field className="block">
                <Label>Kapasite (kişi)</Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1"
                  value={row.capacity}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, capacity: e.target.value }
                    setRows(next)
                  }}
                  placeholder="2"
                />
              </Field>
              <Field className="block">
                <Label>Pansiyon tipi</Label>
                <Input
                  className="mt-1"
                  value={row.board_type}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, board_type: e.target.value }
                    setRows(next)
                  }}
                  placeholder="Örn. Her şey dahil, Oda kahvaltı"
                />
              </Field>
              <Field className="block">
                <Label>Yatak sayısı</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={row.beds}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, beds: e.target.value }
                    setRows(next)
                  }}
                  placeholder="1"
                />
              </Field>
              <Field className="block">
                <Label>Alan (m²)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  className="mt-1"
                  value={row.size_m2}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, size_m2: e.target.value }
                    setRows(next)
                  }}
                  placeholder="24"
                />
              </Field>
            </div>
            <Field className="mt-3 block">
              <Label>Kısa açıklama</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={row.description}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...row, description: e.target.value }
                  setRows(next)
                }}
                placeholder="Oda özellikleri, manzara, vb."
              />
            </Field>
            {rows.length > 1 ? (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline dark:text-red-400"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Oda tipini kaldır
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <ButtonThird type="button" onClick={() => setRows([...rows, emptyRow()])}>
          <PlusCircle className="mr-1 inline h-4 w-4" />
          Oda tipi ekle
        </ButtonThird>
        <ButtonPrimary type="button" onClick={() => void handleSave()} disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Oda tiplerini kaydet'}
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
