'use client'

import { getStoredAuthToken } from '@/lib/auth-storage'
import { HOLIDAY_HOME_DEFAULT_FAQ_ITEMS } from '@/data/holiday-home-default-faq'
import {
  parseHolidayHomeFaqTemplatePayload,
  pickHolidayHomeFaqText,
  withHolidayHomeFaqTemplateDefaults,
  type HolidayHomeFaqStoredItem,
} from '@/lib/holiday-home-faq-merge'
import { aiErrorMessage, translateOneToMany } from '@/lib/manage-content-ai'
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

const LOCALES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'RU' },
  { code: 'zh', label: 'ZH' },
  { code: 'fr', label: 'FR' },
] as const

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
  const [aiBusyId, setAiBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
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
        try {
          const parsed = row?.value_json?.trim()
            ? (JSON.parse(row.value_json) as unknown)
            : { items: [] }
          const payload = withHolidayHomeFaqTemplateDefaults(parseHolidayHomeFaqTemplatePayload(parsed))
          setItems(payload.items)
        } catch {
          setItems([...HOLIDAY_HOME_DEFAULT_FAQ_ITEMS])
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
    setMsg(null)
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

  function patchItem(
    index: number,
    patch: Partial<{ q: string; a: string; qByLocale: Record<string, string>; aByLocale: Record<string, string> }>,
  ) {
    setItems((prev) => {
      const copy = [...prev]
      const cur = copy[index]
      if (!cur) return prev
      const qBase: Record<string, string> =
        cur.question && typeof cur.question === 'object' && !Array.isArray(cur.question)
          ? { ...(cur.question as Record<string, string>) }
          : { tr: pickHolidayHomeFaqText(cur.question, 'tr') }
      const aBase: Record<string, string> =
        cur.answer && typeof cur.answer === 'object' && !Array.isArray(cur.answer)
          ? { ...(cur.answer as Record<string, string>) }
          : { tr: pickHolidayHomeFaqText(cur.answer, 'tr') }

      if (patch.q !== undefined) qBase.tr = patch.q
      if (patch.a !== undefined) aBase.tr = patch.a
      if (patch.qByLocale) {
        for (const [k, v] of Object.entries(patch.qByLocale)) qBase[k] = v
      }
      if (patch.aByLocale) {
        for (const [k, v] of Object.entries(patch.aByLocale)) aBase[k] = v
      }
      copy[index] = {
        ...cur,
        id: cur.id || newItem().id,
        question: qBase,
        answer: aBase,
      }
      return copy
    })
  }

  async function aiTranslateOne(index: number, overwrite: boolean) {
    const cur = items[index]
    if (!cur) return
    const id = cur.id || `row_${index}`
    const qTr = pickHolidayHomeFaqText(cur.question, 'tr').trim()
    const aTr = pickHolidayHomeFaqText(cur.answer, 'tr').trim()
    if (!qTr || !aTr) {
      setMsg({ ok: false, text: 'Önce TR soru ve TR yanıt alanını doldurun.' })
      return
    }
    setAiBusyId(id)
    setMsg(null)
    try {
      const targets = LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
      const [qOut, aOut] = await Promise.all([
        translateOneToMany({
          text: qTr,
          context: 'short_label',
          sourceLocale: 'tr',
          targetLocales: targets,
        }),
        translateOneToMany({
          text: aTr,
          context: 'body',
          sourceLocale: 'tr',
          targetLocales: targets,
        }),
      ])

      const qByLocale: Record<string, string> = {}
      const aByLocale: Record<string, string> = {}

      for (const lc of targets) {
        const qExisting = pickHolidayHomeFaqText(cur.question, lc).trim()
        const aExisting = pickHolidayHomeFaqText(cur.answer, lc).trim()
        const qFresh = (qOut.ok[lc] ?? '').trim()
        const aFresh = (aOut.ok[lc] ?? '').trim()
        if (qFresh && (overwrite || qExisting.length === 0)) qByLocale[lc] = qFresh
        if (aFresh && (overwrite || aExisting.length === 0)) aByLocale[lc] = aFresh
      }

      patchItem(index, { qByLocale, aByLocale })

      const filled = new Set([...Object.keys(qByLocale), ...Object.keys(aByLocale)]).size
      const failedLocales = [...qOut.failed, ...aOut.failed].map((f) => f.locale.toUpperCase())
      const uniqFailed = [...new Set(failedLocales)].join(', ')
      setMsg({
        ok: filled > 0,
        text: filled > 0 ? `AI çeviriler geldi. Kontrol edip “Kaydet”e basın.${uniqFailed ? ` Başarısız: ${uniqFailed}.` : ''}` : 'AI çeviri sonucu boş döndü.',
      })
    } catch (e) {
      setMsg({ ok: false, text: aiErrorMessage(e) })
    } finally {
      setAiBusyId(null)
    }
  }

  async function saveAll() {
    const cleaned = items
      .map((it) => ({
        ...it,
        id: it.id?.trim() || newItem().id,
        question:
          it.question && typeof it.question === 'object' && !Array.isArray(it.question)
            ? (it.question as Record<string, string>)
            : { tr: pickHolidayHomeFaqText(it.question, 'tr').trim() },
        answer:
          it.answer && typeof it.answer === 'object' && !Array.isArray(it.answer)
            ? (it.answer as Record<string, string>)
            : { tr: pickHolidayHomeFaqText(it.answer, 'tr').trim() },
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
      {msg ? (
        <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
          {msg.text}
        </p>
      ) : null}

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
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || aiBusyId === (row.id || `row_${idx}`)}
                onClick={() => void aiTranslateOne(idx, false)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                AI çeviri (boşları doldur)
              </button>
              <button
                type="button"
                disabled={busy || aiBusyId === (row.id || `row_${idx}`)}
                onClick={() => void aiTranslateOne(idx, true)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                AI çeviri (üstüne yaz)
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {LOCALES.filter((l) => l.code !== 'tr').map((lc) => (
                <div key={lc.code} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                  <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">{lc.label}</p>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Soru</p>
                      <Input
                        className="mt-1"
                        value={pickHolidayHomeFaqText(row.question, lc.code)}
                        onChange={(e) =>
                          patchItem(idx, { qByLocale: { [lc.code]: e.target.value } })
                        }
                        placeholder="—"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Yanıt</p>
                      <Textarea
                        className="mt-1 min-h-[72px]"
                        value={pickHolidayHomeFaqText(row.answer, lc.code)}
                        onChange={(e) =>
                          patchItem(idx, { aByLocale: { [lc.code]: e.target.value } })
                        }
                        placeholder="—"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
