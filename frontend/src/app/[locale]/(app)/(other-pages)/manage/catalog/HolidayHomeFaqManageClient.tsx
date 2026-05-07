'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import {
  parseHolidayHomeFaqTemplatePayload,
  pickHolidayHomeFaqText,
  type HolidayHomeFaqStoredItem,
} from '@/lib/holiday-home-faq-merge'
import { formatManageApiError } from '@/lib/manage-api-error-tr'
import { useManageT } from '@/lib/manage-i18n-context'
import { listSiteSettings, upsertSiteSetting } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Field, Label } from '@/shared/fieldset'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const SETTING_KEY = 'catalog.holiday_home_default_faq'

function newItem(): HolidayHomeFaqStoredItem {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `faq_${Date.now()}`,
    question: { tr: '' },
    answer: { tr: '' },
  }
}

export default function HolidayHomeFaqManageClient() {
  const t = useManageT()
  const [items, setItems] = useState<HolidayHomeFaqStoredItem[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoaded(true)
      return
    }
    let cancelled = false
    void listSiteSettings(token, { scope: 'platform', key: SETTING_KEY })
      .then((res) => {
        if (cancelled) return
        const row = res.settings[0]
        if (!row?.value_json?.trim()) {
          setItems([])
          setLoaded(true)
          return
        }
        try {
          const parsed = JSON.parse(row.value_json) as unknown
          const payload = parseHolidayHomeFaqTemplatePayload(parsed)
          setItems(payload.items.length > 0 ? payload.items : [])
        } catch {
          setItems([])
        }
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function persist(next: HolidayHomeFaqStoredItem[]) {
    const token = getStoredAuthToken()
    if (!token) return
    setBusy(true)
    setErr(null)
    try {
      await upsertSiteSetting(token, {
        key: SETTING_KEY,
        value_json: JSON.stringify({ items: next }),
      })
      setItems(next)
    } catch (e) {
      setErr(e instanceof Error ? formatManageApiError(e.message) : formatManageApiError('save_failed'))
    } finally {
      setBusy(false)
    }
  }

  function patchItem(index: number, patch: Partial<{ q: string; a: string }>) {
    setItems((prev) => {
      const copy = [...prev]
      const cur = copy[index]
      if (!cur) return prev
      const qTr =
        patch.q !== undefined ? patch.q : pickHolidayHomeFaqText(cur.question, 'tr')
      const aTr =
        patch.a !== undefined ? patch.a : pickHolidayHomeFaqText(cur.answer, 'tr')
      copy[index] = {
        ...cur,
        id: cur.id || newItem().id,
        question: { tr: qTr },
        answer: { tr: aTr },
      }
      return copy
    })
  }

  async function saveAll() {
    const cleaned = items
      .map((it) => ({
        ...it,
        id: it.id?.trim() || newItem().id,
        question: { tr: pickHolidayHomeFaqText(it.question, 'tr').trim() },
        answer: { tr: pickHolidayHomeFaqText(it.answer, 'tr').trim() },
      }))
      .filter(
        (it) =>
          pickHolidayHomeFaqText(it.question, 'tr') && pickHolidayHomeFaqText(it.answer, 'tr'),
      )
    await persist(cleaned)
  }

  async function removeAt(idx: number) {
    await persist(items.filter((_, i) => i !== idx))
  }

  async function addRow() {
    await persist([...items, newItem()])
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    const tmp = next[idx]
    next[idx] = next[j]!
    next[j] = tmp!
    await persist(next)
  }

  if (!loaded) {
    return <p className="text-sm text-neutral-500">Yükleniyor…</p>
  }

  if (!getStoredAuthToken()) {
    return <p className="text-sm text-neutral-500">Oturum gerekli.</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t('catalog.hub_holiday_home_faq')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Buradaki sorular yeni ve mevcut tatil evi ilanlarında varsayılan olarak gelir; ilan formundan bu
          ilana uymayanları kaldırabilir veya ilana özel sorular ekleyebilirsiniz. Kayıt{' '}
          <span className="font-mono text-xs">site_settings.{SETTING_KEY}</span>.
        </p>
      </div>

      {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <div className="space-y-4">
        {items.map((row, idx) => (
          <div
            key={row.id || idx}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <GripVertical className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                SSS #{idx + 1}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busy || idx === 0}
                  onClick={() => void move(idx, -1)}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || idx >= items.length - 1}
                  onClick={() => void move(idx, 1)}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeAt(idx)}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Field className="block">
              <Label>Soru (TR)</Label>
              <Input
                className="mt-1"
                value={pickHolidayHomeFaqText(row.question, 'tr')}
                onChange={(e) => patchItem(idx, { q: e.target.value })}
                placeholder="Örn. Havuz ısıtmalı mı?"
              />
            </Field>
            <Field className="mt-3 block">
              <Label>Yanıt (TR)</Label>
              <Textarea
                className="mt-1 min-h-[88px]"
                value={pickHolidayHomeFaqText(row.answer, 'tr')}
                onChange={(e) => patchItem(idx, { a: e.target.value })}
                placeholder="Kısa ve net yanıt…"
              />
            </Field>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <ButtonPrimary
          type="button"
          disabled={busy}
          onClick={() => void addRow()}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Soru ekle
        </ButtonPrimary>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveAll()}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Kaydet
        </button>
      </div>
    </div>
  )
}
