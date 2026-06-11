'use client'

import { ManageMediaPickerModal } from '@/components/manage/ManageMediaPickerModal'
import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  HOTEL_VALID_CAMPAIGNS_SETTING_KEY,
  parseHotelValidCampaignsPayload,
  pickHotelValidCampaignTitle,
  type HotelValidCampaignScope,
  type HotelValidCampaignStoredItem,
} from '@/lib/hotel-valid-campaigns'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { listSiteSettings, upsertSiteSetting } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

function newItem(sortOrder: number): HotelValidCampaignStoredItem {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `camp_${Date.now()}`,
    enabled: true,
    title: { tr: '' },
    logoUrl: '',
    linkUrl: '',
    scope: 'all',
    listingIds: [],
    sortOrder,
  }
}

export default function HotelValidCampaignsManageClient() {
  const [sectionTitleTr, setSectionTitleTr] = useState("Otel'de Geçerli Kampanyalar")
  const [items, setItems] = useState<HotelValidCampaignStoredItem[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [mediaPickerFor, setMediaPickerFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoaded(true)
      return
    }
    try {
      const res = await listSiteSettings(token, { scope: 'platform', key: HOTEL_VALID_CAMPAIGNS_SETTING_KEY })
      const row = res.settings[0]
      const parsed = parseHotelValidCampaignsPayload(
        row?.value_json?.trim() ? JSON.parse(row.value_json) : { items: [] },
      )
      setSectionTitleTr(pickHotelValidCampaignTitle({ ...newItem(0), title: parsed.sectionTitle }, 'tr'))
      setItems(parsed.items)
    } catch {
      setItems([])
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function patchItem(index: number, patch: Partial<HotelValidCampaignStoredItem>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function moveItem(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const tmp = next[index]
      next[index] = next[target]!
      next[target] = tmp!
      return next.map((row, i) => ({ ...row, sortOrder: i }))
    })
  }

  async function saveAll() {
    const token = getStoredAuthToken()
    if (!token) {
      setErr('Kaydetmek için yönetici olarak giriş yapın.')
      return
    }
    const cleaned = items
      .map((row, i) => ({
        ...row,
        sortOrder: i,
        title: { ...row.title, tr: (row.title.tr ?? '').trim() },
      }))
      .filter((row) => pickHotelValidCampaignTitle(row, 'tr').trim().length > 0)

    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await upsertSiteSetting(token, {
        key: HOTEL_VALID_CAMPAIGNS_SETTING_KEY,
        value_json: JSON.stringify({
          sectionTitle: { tr: sectionTitleTr.trim() || "Otel'de Geçerli Kampanyalar" },
          items: cleaned,
        }),
      })
      setItems(cleaned)
      setMsg('Kaydedildi.')
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'))
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) {
    return (
      <div className="p-8 text-neutral-500">Yükleniyor…</div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Otel detay kampanyaları</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Otel ilan sayfasında otel adı ve konum bilgisinin hemen altında gösterilir. «Tüm oteller» genel
          kampanyalar; «Seçili oteller» yalnızca belirttiğiniz ilanlarda görünür. Tek bir otel için ek
          kartlar: Katalog → Otel → ilan detayı → «Otel&apos;de geçerli kampanyalar».
        </p>
      </header>

      <Field>
        <Label>Bölüm başlığı (TR)</Label>
        <Input value={sectionTitleTr} onChange={(e) => setSectionTitleTr(e.target.value)} />
      </Field>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Kampanya #{index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  aria-label="Yukarı taşı"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Aşağı taşı"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label>Başlık (TR)</Label>
                <Input
                  value={item.title.tr ?? ''}
                  onChange={(e) =>
                    patchItem(index, { title: { ...item.title, tr: e.target.value } })
                  }
                />
              </Field>
              <Field>
                <Label>Link (isteğe bağlı)</Label>
                <Input
                  value={item.linkUrl}
                  onChange={(e) => patchItem(index, { linkUrl: e.target.value })}
                  placeholder="https://… veya /tr/kampanyalar"
                />
              </Field>
              <Field className="sm:col-span-2">
                <Label>Logo</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {item.logoUrl ? (
                    <span className="relative h-12 w-12 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                      <Image src={item.logoUrl} alt="" fill className="object-contain p-1" unoptimized />
                    </span>
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400">
                      <ImageIcon className="h-5 w-5" />
                    </span>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600"
                    onClick={() => setMediaPickerFor(item.id)}
                  >
                    Görsel seç
                  </button>
                  {item.logoUrl ? (
                    <button
                      type="button"
                      className="text-sm text-neutral-500 underline"
                      onClick={() => patchItem(index, { logoUrl: '' })}
                    >
                      Kaldır
                    </button>
                  ) : null}
                </div>
              </Field>
              <Field>
                <Label>Gösterim</Label>
                <select
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                  value={item.scope}
                  onChange={(e) =>
                    patchItem(index, { scope: e.target.value as HotelValidCampaignScope })
                  }
                >
                  <option value="all">Tüm oteller</option>
                  <option value="listings">Seçili oteller</option>
                </select>
              </Field>
              <Field>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => patchItem(index, { enabled: e.target.checked })}
                  />
                  Aktif
                </Label>
              </Field>
              {item.scope === 'listings' ? (
                <Field className="sm:col-span-2">
                  <Label>Otel ilan ID’leri (virgülle)</Label>
                  <Input
                    value={item.listingIds.join(', ')}
                    onChange={(e) =>
                      patchItem(index, {
                        listingIds: e.target.value
                          .split(/[,\s]+/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="uuid, uuid, …"
                  />
                </Field>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-200"
        onClick={() => setItems((prev) => [...prev, newItem(prev.length)])}
      >
        <Plus className="h-4 w-4" />
        Kampanya ekle
      </button>

      {err ? <p className="text-sm text-rose-600">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}

      <ButtonPrimary onClick={() => void saveAll()} disabled={busy}>
        {busy ? 'Kaydediliyor…' : 'Kaydet'}
      </ButtonPrimary>

      <ManageMediaPickerModal
        open={mediaPickerFor != null}
        title="Kampanya logosu"
        uploadTarget={{
          folder: 'site',
          subPath: 'hotel-valid-campaigns',
          prefix: 'logo',
        }}
        onClose={() => setMediaPickerFor(null)}
        onSelect={(url) => {
          if (!mediaPickerFor) return
          const idx = items.findIndex((x) => x.id === mediaPickerFor)
          if (idx >= 0) patchItem(idx, { logoUrl: url })
          setMediaPickerFor(null)
        }}
      />
    </div>
  )
}
