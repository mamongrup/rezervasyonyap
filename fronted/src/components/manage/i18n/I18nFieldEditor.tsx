'use client'

/**
 * I18nFieldEditor — sekme tabanlı çoklu-dil metin editörü.
 *
 * Site genelinde 6 dil desteği için ortak admin bileşeni.
 * Form state'i `{ tr, en, de, ru, zh, fr }` haritası şeklinde tutulur.
 *
 * Özellikler:
 *   - Sekme başlıkları, doluluk durumunu (✓ / boş) gösterir.
 *   - "Diğer dilleri TR'den doldur" yardımcı butonu.
 *   - `ensureAllLocaleKeys` ile başlangıçta tüm diller için boş string atanır
 *     (controlled input uyarısı verilmemesi için).
 *   - Tek satırlık (`input`) ya da çok satırlı (`textarea`) modlar.
 *
 * Kullanım:
 *   const [titleMap, setTitleMap] = useState<I18nFieldMap>(initial?.title_i18n ?? {})
 *   <I18nFieldEditor label="Başlık" value={titleMap} onChange={setTitleMap} />
 */

import React, { useId, useMemo, useState } from 'react'
import {
  SUPPORTED_LOCALE_CODES,
  ensureAllLocaleKeys,
  type I18nFieldMap,
} from '@/lib/i18n-field'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'

type LocaleCode = (typeof SUPPORTED_LOCALE_CODES)[number]

const LOCALE_LABELS: Record<LocaleCode, string> = {
  tr: 'TR',
  en: 'EN',
  de: 'DE',
  ru: 'RU',
  zh: 'ZH',
  fr: 'FR',
}

const LOCALE_NAMES: Record<LocaleCode, string> = SITE_LOCALE_CATALOG.reduce(
  (acc, l) => {
    acc[l.code] = l.name
    return acc
  },
  {} as Record<LocaleCode, string>,
)

export interface I18nFieldEditorProps {
  /** Üst etiket (TR), opsiyonel. */
  label?: React.ReactNode
  /** Kısa yardım metni (etiketin altında). */
  description?: React.ReactNode
  /** İki yönlü bağlama için harita (boş alan için kayıt yok). */
  value: I18nFieldMap
  onChange: (next: I18nFieldMap) => void
  /** `textarea` için satır sayısı; `input` modu için verilmezse `<input>` kullanılır. */
  rows?: number
  /** Placeholder; her dil için `'(örn) ...'` metnine ön ek olur. */
  placeholder?: string
  /** Form gönderiminde zorunlu olduğunu belirten görsel işaret. */
  required?: boolean
  /** TR alanı zorunluysa `true` (TR boşsa kaydetmek mantıksız olur). */
  requireTr?: boolean
  /** Maksimum karakter (UI ipucu; sert kısıt değil). */
  maxLength?: number
  /** Devre dışı bırakma. */
  disabled?: boolean
  /** Test/erişilebilirlik için ekstra sınıf. */
  className?: string
  /** Aynı sayfada birden fazla editor varsa benzersiz id ön eki. */
  idPrefix?: string
}

export default function I18nFieldEditor(props: I18nFieldEditorProps) {
  const {
    label,
    description,
    value,
    onChange,
    rows,
    placeholder,
    required,
    requireTr = true,
    maxLength,
    disabled = false,
    className = '',
    idPrefix,
  } = props

  const reactId = useId()
  const baseId = idPrefix ?? reactId
  const [active, setActive] = useState<LocaleCode>('tr')

  const filled = useMemo(() => ensureAllLocaleKeys(value), [value])

  const filledCount = SUPPORTED_LOCALE_CODES.reduce(
    (n, c) => n + (filled[c]?.trim() ? 1 : 0),
    0,
  )

  const updateLocale = (code: LocaleCode, next: string) => {
    const draft = { ...filled, [code]: next }
    const out: I18nFieldMap = {}
    for (const lc of SUPPORTED_LOCALE_CODES) {
      const v = draft[lc]
      if (typeof v === 'string' && v !== '') out[lc] = v
    }
    onChange(out)
  }

  const fillFromTr = () => {
    const tr = (filled.tr ?? '').trim()
    if (!tr) return
    const out: I18nFieldMap = { ...value }
    for (const lc of SUPPORTED_LOCALE_CODES) {
      if (lc === 'tr') continue
      const cur = (out[lc] ?? '').trim()
      if (!cur) out[lc] = tr
    }
    onChange(out)
  }

  const useTextarea = typeof rows === 'number' && rows > 1

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || description) && (
        <div className="flex items-start justify-between gap-2">
          <div>
            {label && (
              <label
                htmlFor={`${baseId}-${active}`}
                className="block text-sm font-medium text-neutral-800 dark:text-neutral-100"
              >
                {label}
                {required && <span className="ml-1 text-rose-600">*</span>}
                <span className="ml-2 text-xs font-normal text-neutral-500">
                  ({filledCount}/{SUPPORTED_LOCALE_CODES.length} dil dolu)
                </span>
              </label>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={fillFromTr}
            disabled={disabled || !(filled.tr ?? '').trim()}
            className="shrink-0 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            title="Boş diğer diller TR değeriyle doldurulur"
          >
            Diğer dilleri TR'den doldur
          </button>
        </div>
      )}

      <div
        role="tablist"
        className="flex flex-wrap gap-1 rounded-t-md border-b border-neutral-200 bg-neutral-50 px-1 pt-1 dark:border-neutral-800 dark:bg-neutral-900/60"
      >
        {SUPPORTED_LOCALE_CODES.map((code) => {
          const isActive = code === active
          const isFilled = (filled[code] ?? '').trim() !== ''
          const isRequired = requireTr && code === 'tr'
          const missingRequired = isRequired && !isFilled
          return (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(code)}
              title={LOCALE_NAMES[code]}
              className={[
                'inline-flex items-center gap-1.5 rounded-t-md px-2.5 py-1 text-xs font-medium transition',
                isActive
                  ? 'bg-white text-neutral-900 shadow-xs ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-white dark:ring-neutral-700'
                  : 'text-neutral-600 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900',
              ].join(' ')}
            >
              <span>{LOCALE_LABELS[code]}</span>
              {missingRequired ? (
                <span aria-hidden className="text-rose-500">!</span>
              ) : isFilled ? (
                <span aria-hidden className="text-emerald-500">✓</span>
              ) : (
                <span aria-hidden className="text-neutral-300 dark:text-neutral-600">○</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="rounded-b-md border border-t-0 border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950">
        {useTextarea ? (
          <textarea
            id={`${baseId}-${active}`}
            value={filled[active]}
            onChange={(e) => updateLocale(active, e.target.value)}
            rows={rows}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder ? `${placeholder} (${LOCALE_LABELS[active]})` : LOCALE_NAMES[active]}
            dir="ltr"
            className="block w-full resize-y border-0 bg-transparent text-sm text-neutral-900 outline-hidden placeholder:text-neutral-400 focus:ring-0 dark:text-neutral-50"
          />
        ) : (
          <input
            id={`${baseId}-${active}`}
            type="text"
            value={filled[active]}
            onChange={(e) => updateLocale(active, e.target.value)}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder ? `${placeholder} (${LOCALE_LABELS[active]})` : LOCALE_NAMES[active]}
            dir="ltr"
            className="block w-full border-0 bg-transparent text-sm text-neutral-900 outline-hidden placeholder:text-neutral-400 focus:ring-0 dark:text-neutral-50"
          />
        )}
        {typeof maxLength === 'number' && (
          <div className="mt-1 text-right text-[10px] text-neutral-400">
            {(filled[active] ?? '').length}/{maxLength}
          </div>
        )}
      </div>
    </div>
  )
}
