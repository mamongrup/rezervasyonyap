'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { getLocaleFlatMessages } from '@/lib/locale-flat-messages'
import { getEnglishReferenceFlat } from '@/lib/reference-locale-source'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getTranslationBundle, upsertTranslation, type LocaleRow } from '@/lib/travel-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

const UI_NAMESPACE = 'ui'

type Props = {
  locales: LocaleRow[]
}

type Status = { kind: 'idle' | 'ok' | 'err'; text?: string }

export default function ReferenceLocalePanel({ locales }: Props) {
  const refFlat = useMemo(() => getEnglishReferenceFlat(), [])
  const refKeys = useMemo(() => Object.keys(refFlat).sort(), [refFlat])

  const [targetLocale, setTargetLocale] = useState('tr')
  const [filter, setFilter] = useState('')
  const [uiBundle, setUiBundle] = useState<Record<string, string>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [savingKey, setSavingKey] = useState<string | null>(null)

  /** API’de yoksa `public/locales/<dil>.ts` ile sağ sütunu doldurur. */
  const tsFlat = useMemo(() => getLocaleFlatMessages(targetLocale), [targetLocale])

  const loadTarget = useCallback(async (loc: string) => {
    setLoading(true)
    setStatus({ kind: 'idle' })
    try {
      const b = await getTranslationBundle(loc)
      const raw = b.namespaces?.[UI_NAMESPACE] as Record<string, string> | undefined
      setUiBundle(raw && typeof raw === 'object' ? raw : {})
      setEdits({})
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Hedef dil paketi yüklenemedi',
      })
      setUiBundle({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!targetLocale) return
    void loadTarget(targetLocale)
  }, [targetLocale, loadTarget])

  const filteredKeys = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return refKeys
    return refKeys.filter((k) => {
      const ref = refFlat[k] ?? ''
      const ts = tsFlat[k] ?? ''
      return (
        k.toLowerCase().includes(f) ||
        ref.toLowerCase().includes(f) ||
        (uiBundle[k] ?? '').toLowerCase().includes(f) ||
        ts.toLowerCase().includes(f) ||
        (edits[k] ?? '').toLowerCase().includes(f)
      )
    })
  }, [refKeys, refFlat, filter, uiBundle, edits, tsFlat])

  /** Arama yokken çok satır render etmeyi sınırla (tarayıcı performansı). */
  const MAX_UNFILTERED = 150
  const displayKeys = useMemo(() => {
    const f = filter.trim()
    if (f) return filteredKeys.slice(0, 800)
    return filteredKeys.slice(0, MAX_UNFILTERED)
  }, [filter, filteredKeys])

  function rowBaseline(key: string): string {
    const api = uiBundle[key]
    if (typeof api === 'string' && api.length > 0) return api
    return tsFlat[key] ?? ''
  }

  function draft(key: string): string {
    if (edits[key] !== undefined) return edits[key]
    return rowBaseline(key)
  }

  function setDraft(key: string, v: string) {
    setEdits((prev) => ({ ...prev, [key]: v }))
  }

  async function saveKey(key: string) {
    const token = getStoredAuthToken()
    if (!token) {
      setStatus({ kind: 'err', text: 'Yönetici oturumu gerekir.' })
      return
    }
    const value = draft(key)
    setSavingKey(key)
    setStatus({ kind: 'idle' })
    try {
      await upsertTranslation(token, {
        namespace: UI_NAMESPACE,
        key,
        locale: targetLocale,
        value,
      })
      setUiBundle((prev) => ({ ...prev, [key]: value }))
      setEdits((prev) => {
        const n = { ...prev }
        delete n[key]
        return n
      })
      setStatus({ kind: 'ok', text: `Kaydedildi: ${key}` })
    } catch (e) {
      setStatus({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Kayıt başarısız',
      })
    } finally {
      setSavingKey(null)
    }
  }

  const targetMeta = locales.find((l) => l.code === targetLocale)

  return (
    <section className="mt-10 border-t border-neutral-200 pt-10 dark:border-neutral-700">
      <h2 className="text-xl font-semibold">Referans dosya → dil çevirisi</h2>
      <p className="mt-2 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
        Sol sütun: tek kaynak <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">public/locales/en.ts</code>{' '}
        (derleme zamanı referans). Sağ sütun: önce veritabanı <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">ui</code> kaydı;
        yoksa aynı dilin <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">public/locales/&lt;dil&gt;.ts</code> metni gösterilir.
        Kaydet ile değer <code className="font-mono text-xs">translation_values</code> tablosuna yazılır.
      </p>

      {status.kind !== 'idle' && status.text && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            status.kind === 'ok'
              ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Field className="block min-w-[180px]">
          <Label>Hedef dil (kayıt)</Label>
          <select
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            value={targetLocale}
            onChange={(e) => setTargetLocale(e.target.value)}
          >
            {locales.map((l) => (
              <option key={l.id} value={l.code}>
                {l.name} ({l.code}){l.code === 'en' ? ' — referansla aynı dil' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field className="block min-w-[220px] flex-1">
          <Label>Anahtar veya metin ara</Label>
          <Input
            className="mt-1"
            placeholder="ör. submit, Min price…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </Field>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Toplam <span className="font-medium">{refKeys.length}</span> düz anahtar (dizi alanları hariç).{' '}
        {targetMeta && !targetMeta.is_active ? (
          <span className="text-amber-700 dark:text-amber-400">Seçili dil panelde pasif.</span>
        ) : null}
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">Hedef dil paketi yükleniyor…</p>
      ) : (
        <>
          {!filter.trim() && filteredKeys.length > MAX_UNFILTERED ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              Arama yapmadan yalnızca ilk {MAX_UNFILTERED} anahtar listelenir. Tümünü görmek için yukarıdan filtreleyin.
            </p>
          ) : null}
          {filter.trim() && filteredKeys.length > 800 ? (
            <p className="mt-2 text-xs text-neutral-500">Çok sonuç: ilk 800 eşleşme gösteriliyor; aramayı daraltın.</p>
          ) : null}

          <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="w-10 px-3 py-2 text-xs font-medium text-neutral-500">#</th>
                  <th className="min-w-[200px] px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Referans (en.ts)
                  </th>
                  <th className="min-w-[280px] px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Çeviri ({targetLocale})
                  </th>
                  <th className="w-28 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {displayKeys.map((key, idx) => {
                  const refText = refFlat[key] ?? ''
                  const dirty = draft(key) !== rowBaseline(key)
                  return (
                    <tr key={key} className={dirty ? 'bg-amber-50/50 dark:bg-amber-950/15' : undefined}>
                      <td className="px-3 py-2 align-top text-xs text-neutral-400">{idx + 1}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-mono text-[11px] text-neutral-500">{key}</div>
                        <div className="mt-1 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">{refText}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Textarea
                          className="font-mono text-sm"
                          rows={2}
                          value={draft(key)}
                          onChange={(e) => setDraft(key, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <ButtonPrimary
                          type="button"
                          className="!px-2 !py-1.5 text-xs"
                          disabled={savingKey === key || !dirty}
                          onClick={() => void saveKey(key)}
                        >
                          {savingKey === key ? '…' : 'Kaydet'}
                        </ButtonPrimary>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {displayKeys.length === 0 && (
            <p className="mt-4 text-sm text-neutral-500">Eşleşen anahtar yok.</p>
          )}
        </>
      )}
    </section>
  )
}
