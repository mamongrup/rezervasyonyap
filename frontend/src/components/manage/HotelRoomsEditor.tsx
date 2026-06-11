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

const BOARD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— Seçin —' },
  { value: 'room_only', label: 'Sadece oda' },
  { value: 'bed_breakfast', label: 'Oda + Kahvaltı' },
  { value: 'half_board', label: 'Yarım pansiyon' },
  { value: 'full_board', label: 'Tam pansiyon' },
  { value: 'all_inclusive', label: 'Her şey dahil' },
  { value: 'non_alcoholic_all_inclusive', label: 'Alkolsüz her şey dahil' },
  { value: 'ultra_all_inclusive', label: 'Ultra her şey dahil' },
]

export type HotelRoomDraft = {
  key: string
  id?: string
  name: string
  capacity: string
  board_type: string
  unit_count: string
  beds: string
  bed_type: string
  size_m2: string
  description: string
  image: string
  images: string
  amenities: string
  paid_amenities: string
  room_score: string
}

function emptyRow(): HotelRoomDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    capacity: '',
    board_type: '',
    unit_count: '1',
    beds: '',
    bed_type: '',
    size_m2: '',
    description: '',
    image: '',
    images: '',
    amenities: '',
    paid_amenities: '',
    room_score: '',
  }
}

function linesToArray(raw: string): string[] {
  return raw
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

function arrayToLines(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string').join('\n')
  }
  return ''
}

function parseMeta(metaJson: string): Omit<
  HotelRoomDraft,
  'key' | 'id' | 'name' | 'capacity' | 'board_type' | 'unit_count'
> {
  try {
    const m = JSON.parse(metaJson || '{}') as Record<string, unknown>
    return {
      beds: m.beds != null ? String(m.beds) : '',
      bed_type: typeof m.bed_type === 'string' ? m.bed_type : '',
      size_m2:
        m.size_m2 != null
          ? String(m.size_m2)
          : m.size_sqm != null
            ? String(m.size_sqm)
            : '',
      description: typeof m.description === 'string' ? m.description : '',
      image: typeof m.image === 'string' ? m.image : typeof m.hero_image === 'string' ? m.hero_image : '',
      images: arrayToLines(m.images),
      amenities: arrayToLines(m.amenities),
      paid_amenities: arrayToLines(m.paid_amenities),
      room_score: m.room_score != null ? String(m.room_score) : m.score != null ? String(m.score) : '',
    }
  } catch {
    return {
      beds: '',
      bed_type: '',
      size_m2: '',
      description: '',
      image: '',
      images: '',
      amenities: '',
      paid_amenities: '',
      room_score: '',
    }
  }
}

function buildMeta(row: HotelRoomDraft): string {
  const meta: Record<string, unknown> = {}
  if (row.beds.trim()) meta.beds = Number.parseInt(row.beds.trim(), 10) || row.beds.trim()
  if (row.bed_type.trim()) meta.bed_type = row.bed_type.trim()
  if (row.size_m2.trim()) meta.size_m2 = Number.parseFloat(row.size_m2.trim()) || row.size_m2.trim()
  if (row.description.trim()) meta.description = row.description.trim()
  if (row.image.trim()) meta.image = row.image.trim()
  const gallery = linesToArray(row.images)
  if (gallery.length > 0) meta.images = gallery
  const amenities = linesToArray(row.amenities)
  if (amenities.length > 0) meta.amenities = amenities
  const paid = linesToArray(row.paid_amenities)
  if (paid.length > 0) meta.paid_amenities = paid
  if (row.room_score.trim()) {
    const score = Number.parseFloat(row.room_score.trim().replace(',', '.'))
    if (Number.isFinite(score)) meta.room_score = score
  }
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
        Vitrindeki oda kartları bu kayıtlardan oluşur: kapasite, pansiyon, fotoğraflar, özellikler ve oda puanı dahil.
        Müsaitlik ve gece fiyatını aşağıdaki takvim bölümünden yönetin.
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
                />
              </Field>
              <Field className="block">
                <Label>Pansiyon tipi</Label>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  value={row.board_type}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, board_type: e.target.value }
                    setRows(next)
                  }}
                >
                  {BOARD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {row.board_type &&
                  !BOARD_TYPE_OPTIONS.some((o) => o.value === row.board_type) ? (
                    <option value={row.board_type}>{row.board_type}</option>
                  ) : null}
                </select>
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
                />
              </Field>
              <Field className="block">
                <Label>Yatak tipi</Label>
                <Input
                  className="mt-1"
                  value={row.bed_type}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, bed_type: e.target.value }
                    setRows(next)
                  }}
                  placeholder="Örn. French bed, Twin"
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
                />
              </Field>
              <Field className="block">
                <Label>Oda puanı</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  className="mt-1"
                  value={row.room_score}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, room_score: e.target.value }
                    setRows(next)
                  }}
                  placeholder="4.5"
                />
              </Field>
              <Field className="block sm:col-span-2">
                <Label>Kapak görseli URL</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={row.image}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...row, image: e.target.value }
                    setRows(next)
                  }}
                  placeholder="/uploads/... veya https://..."
                />
              </Field>
            </div>
            <Field className="mt-3 block">
              <Label>Galeri URL&apos;leri (her satır bir görsel)</Label>
              <Textarea
                className="mt-1 font-mono text-xs"
                rows={2}
                value={row.images}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...row, images: e.target.value }
                  setRows(next)
                }}
              />
            </Field>
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
              />
            </Field>
            <Field className="mt-3 block">
              <Label>Oda özellikleri (her satır bir madde)</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={row.amenities}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...row, amenities: e.target.value }
                  setRows(next)
                }}
                placeholder="Klima&#10;Minibar&#10;Saç kurutma makinesi"
              />
            </Field>
            <Field className="mt-3 block">
              <Label>Ücretli özellikler (vitrinde * ile gösterilir)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={row.paid_amenities}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...row, paid_amenities: e.target.value }
                  setRows(next)
                }}
                placeholder="Oda servisi"
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
