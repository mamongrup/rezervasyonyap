'use client'

/**
 * Yönetim formlarında "isim/ad" alanı için 6 dilli (TR + 5 dil) çeviri paneli.
 *
 * - TR alanı kaynak olarak işaretlidir.
 * - "Boşları AI ile doldur" / "Hepsini yeniden çevir" butonları mevcut.
 * - Backend'e `JSON.stringify(translations)` olarak `name_translations` alanına gönderilir.
 *
 * Kampanya, paket tatil ve benzer "tek isim" alanlı formlarda kullanılır.
 */

import { aiErrorMessage, translateOneToMany } from '@/lib/manage-content-ai'
import Input from '@/shared/Input'
import { Field, Label } from '@/shared/fieldset'
import { useState } from 'react'

export const MULTILANG_NAME_LOCALES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
] as const

export type MultiLangTranslations = Record<string, string>

/** Backend `name_translations` JSONB string'ini güvenle haritaya çevirir. */
export function parseMultiLangTranslations(raw: string | undefined | null): MultiLangTranslations {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw) as unknown
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    const out: MultiLangTranslations = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof val === 'string') out[k] = val
    }
    return out
  } catch {
    return {}
  }
}

/** Backend'e gönderilecek JSONB string. Boş alanlar atlanır. */
export function stringifyMultiLangTranslations(map: MultiLangTranslations): string {
  const out: Record<string, string> = {}
  for (const lc of MULTILANG_NAME_LOCALES) {
    const v = (map[lc.code] ?? '').trim()
    if (v) out[lc.code] = v
  }
  return JSON.stringify(out)
}

export default function MultiLangNamePanel({
  trText,
  translations,
  onChange,
  disabled,
  fieldLabel = 'Ad',
  helpText,
}: {
  /** Form'daki Türkçe ana ad alanı (canlı). AI çevirisinde kaynak olarak kullanılır. */
  trText: string
  /** TR dışındaki diller. TR de saklanırsa burada da olabilir, ama kaynak `trText`'tir. */
  translations: MultiLangTranslations
  onChange: (next: MultiLangTranslations) => void
  disabled?: boolean
  fieldLabel?: string
  helpText?: string
}) {
  const [aiBusy, setAiBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const trValue = trText.trim()
  const aiDisabled = !trValue || disabled || aiBusy

  async function runAi(overwrite: boolean) {
    if (!trValue) {
      setMsg({ ok: false, text: 'Önce Türkçe ad alanını doldurun.' })
      return
    }
    setAiBusy(true)
    setMsg(null)
    try {
      const targets = MULTILANG_NAME_LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
      const out = await translateOneToMany({
        text: trValue,
        context: 'short_label',
        sourceLocale: 'tr',
        targetLocales: targets,
      })
      const next: MultiLangTranslations = { ...translations }
      for (const lc of targets) {
        const existing = (translations[lc] ?? '').trim()
        const fresh = out.ok[lc] ?? ''
        if (fresh && (overwrite || existing.length === 0)) {
          next[lc] = fresh
        }
      }
      onChange(next)
      const filled = Object.keys(out.ok).length
      const failedLocales = out.failed.map((f) => f.locale.toUpperCase()).join(', ')
      const firstFailReason = out.failed[0] ? aiErrorMessage(new Error(out.failed[0].error)) : ''
      const failTail = failedLocales
        ? ` Başarısız: ${failedLocales}${firstFailReason ? ` (${firstFailReason})` : ''}.`
        : ''
      setMsg({
        ok: filled > 0,
        text:
          filled > 0
            ? `${filled} dile AI çevirisi geldi. Kontrol edip kaydedin.` + failTail
            : `AI çeviri sonucu boş döndü.${firstFailReason ? ' Sebep: ' + firstFailReason : ' Ayarlar → Yapay Zeka anahtarını kontrol edin.'}`,
      })
    } catch (e) {
      setMsg({ ok: false, text: aiErrorMessage(e) })
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-3 dark:border-primary-900/40 dark:bg-primary-950/15">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
          {fieldLabel} — diğer diller
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={aiDisabled}
            onClick={() => void runAi(false)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-neutral-950 dark:hover:bg-amber-400"
            title="TR alanından boş olan diğer 5 dili AI ile doldur"
          >
            <span aria-hidden>✨</span>
            {aiBusy ? 'Çevriliyor…' : 'Boşları AI ile doldur'}
          </button>
          <button
            type="button"
            disabled={aiDisabled}
            onClick={() => void runAi(true)}
            className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
            title="TR'den 5 dili yeniden çevir (mevcut çevirilerin üzerine yazar)"
          >
            Hepsini yeniden çevir
          </button>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-neutral-500">
        {helpText ??
          'TR alanı yukarıdaki ana “Ad” girdisinden okunur. Çevirileri buradan düzenleyip kaydetmeyi unutmayın.'}
      </p>
      {msg ? (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-xs ${
            msg.ok
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
          }`}
        >
          {msg.text}
        </p>
      ) : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MULTILANG_NAME_LOCALES.filter((l) => l.code !== 'tr').map((l) => (
          <Field key={l.code}>
            <Label className="text-[11px]">{l.label}</Label>
            <Input
              className="mt-0.5 text-sm"
              value={translations[l.code] ?? ''}
              onChange={(e) => onChange({ ...translations, [l.code]: e.target.value })}
              disabled={disabled}
            />
          </Field>
        ))}
      </div>
    </div>
  )
}
