'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { aiErrorMessage, translateOneToMany } from '@/lib/manage-content-ai'
import { normalizeLocalizedText, type LocalizedText, pickLocalized } from '@/lib/localized-text'

export const PB_FIELD_LABEL_CLS = 'text-xs font-medium text-neutral-600 dark:text-neutral-400'

/** Kenarlık + tipografi (gerekirse başına `w-full` veya `flex-1 min-w-0` ekleyin) */
export const PB_TEXT_INPUT_CORE_CLS =
  'rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'

/** Tam genişlik tek satır metin — liste ve grid hücreleri için */
export const PB_TEXT_INPUT_CLS = `w-full ${PB_TEXT_INPUT_CORE_CLS}`

export const PB_LOCALES = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'RU' },
  { code: 'zh', label: 'ZH' },
  { code: 'fr', label: 'FR' },
] as const

function LocalizedField({
  label,
  value,
  onChange,
  placeholder,
  inputClassName = PB_TEXT_INPUT_CLS,
  asTextarea = false,
  rows = 2,
}: {
  label: string
  value: unknown
  onChange: (next: LocalizedText) => void
  placeholder?: string
  inputClassName?: string
  asTextarea?: boolean
  rows?: number
}) {
  const norm = useMemo(() => normalizeLocalizedText(value, 8000), [value])
  const [active, setActive] = useState<string>('tr')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const activeVal = pickLocalized(norm, active, '')

  function setLocaleValue(locale: string, text: string) {
    const next: LocalizedText = { ...norm }
    const t = text ?? ''
    if (t.trim()) next[locale] = t
    else delete next[locale]
    onChange(next)
  }

  async function aiTranslate(overwrite: boolean) {
    const trText = (norm.tr ?? '').trim()
    if (!trText) {
      setMsg('Önce TR alanını doldurun.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const targets = PB_LOCALES.filter((l) => l.code !== 'tr').map((l) => l.code)
      const out = await translateOneToMany({
        text: trText,
        context: 'short_label',
        sourceLocale: 'tr',
        targetLocales: targets,
      })
      const next: LocalizedText = { ...norm, tr: trText }
      for (const lc of targets) {
        const existing = (next[lc] ?? '').trim()
        const fresh = (out.ok[lc] ?? '').trim()
        if (fresh && (overwrite || existing.length === 0)) next[lc] = fresh
      }
      onChange(next)
      const filled = Object.keys(out.ok).length
      const failedLocales = out.failed.map((f) => f.locale.toUpperCase()).join(', ')
      setMsg(
        filled > 0
          ? `${filled} dile çeviri geldi.${failedLocales ? ` Başarısız: ${failedLocales}.` : ''}`
          : 'AI çeviri sonucu boş döndü.',
      )
    } catch (e) {
      setMsg(aiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={PB_FIELD_LABEL_CLS}>{label}</label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            value={active}
            onChange={(e) => setActive(e.target.value)}
            disabled={busy}
          >
            {PB_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !(norm.tr ?? '').trim()}
            onClick={() => void aiTranslate(false)}
            className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            AI (boşları)
          </button>
          <button
            type="button"
            disabled={busy || !(norm.tr ?? '').trim()}
            onClick={() => void aiTranslate(true)}
            className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            AI (üstüne)
          </button>
        </div>
      </div>
      {asTextarea ? (
        <textarea
          placeholder={placeholder}
          value={activeVal}
          onChange={(e) => setLocaleValue(active, e.target.value)}
          rows={rows}
          className={`${inputClassName} resize-none`}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={activeVal}
          onChange={(e) => setLocaleValue(active, e.target.value)}
          className={inputClassName}
        />
      )}
      {msg ? <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{msg}</p> : null}
    </div>
  )
}

export function LocalizedTextFieldRow({
  label,
  value,
  onChange,
  placeholder,
  inputClassName = PB_TEXT_INPUT_CLS,
}: {
  label: string
  value: unknown
  onChange: (next: LocalizedText) => void
  placeholder?: string
  inputClassName?: string
}) {
  return (
    <LocalizedField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      inputClassName={inputClassName}
      asTextarea={false}
    />
  )
}

export function SectionFieldsTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-widest text-neutral-400 ${className ?? ''}`.trim()}>
      {children}
    </p>
  )
}

export function SimpleTextFieldRow({
  label,
  value,
  onChange,
  placeholder,
  inputClassName = PB_TEXT_INPUT_CLS,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  inputClassName?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={PB_FIELD_LABEL_CLS}>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </div>
  )
}

export function HeadingSubheadingFields({
  config,
  onChange,
  headingKey,
  subheadingKey,
  labels,
  placeholders,
  layout = 'grid',
  subheadingAsTextarea = false,
  subheadingRows = 2,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
  headingKey: string
  subheadingKey: string
  labels?: { heading?: string; subheading?: string }
  placeholders?: { heading?: string; subheading?: string }
  layout?: 'grid' | 'stack'
  subheadingAsTextarea?: boolean
  subheadingRows?: number
}) {
  const wrapperCls = layout === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'

  return (
    <div className={wrapperCls}>
      <LocalizedField
        label={labels?.heading ?? 'Başlık'}
        value={config[headingKey]}
        placeholder={placeholders?.heading}
        onChange={(next) => onChange({ ...config, [headingKey]: next })}
      />
      <LocalizedField
        label={labels?.subheading ?? 'Alt Başlık'}
        value={config[subheadingKey]}
        placeholder={placeholders?.subheading}
        asTextarea={subheadingAsTextarea}
        rows={subheadingRows}
        onChange={(next) => onChange({ ...config, [subheadingKey]: next })}
      />
    </div>
  )
}
