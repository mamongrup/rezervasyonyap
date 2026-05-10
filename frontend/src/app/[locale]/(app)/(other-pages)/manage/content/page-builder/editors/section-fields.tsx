'use client'

import type { ReactNode } from 'react'

export const PB_FIELD_LABEL_CLS = 'text-xs font-medium text-neutral-600 dark:text-neutral-400'

/** Kenarlık + tipografi (gerekirse başına `w-full` veya `flex-1 min-w-0` ekleyin) */
export const PB_TEXT_INPUT_CORE_CLS =
  'rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'

/** Tam genişlik tek satır metin — liste ve grid hücreleri için */
export const PB_TEXT_INPUT_CLS = `w-full ${PB_TEXT_INPUT_CORE_CLS}`

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
      <div className="flex flex-col gap-1">
        <label className={PB_FIELD_LABEL_CLS}>{labels?.heading ?? 'Başlık'}</label>
        <input
          type="text"
          placeholder={placeholders?.heading}
          value={(config[headingKey] as string) ?? ''}
          onChange={(e) => onChange({ ...config, [headingKey]: e.target.value })}
          className={PB_TEXT_INPUT_CLS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={PB_FIELD_LABEL_CLS}>{labels?.subheading ?? 'Alt Başlık'}</label>
        {subheadingAsTextarea ? (
          <textarea
            placeholder={placeholders?.subheading}
            value={(config[subheadingKey] as string) ?? ''}
            onChange={(e) => onChange({ ...config, [subheadingKey]: e.target.value })}
            rows={subheadingRows}
            className={`${PB_TEXT_INPUT_CLS} resize-none`}
          />
        ) : (
          <input
            type="text"
            placeholder={placeholders?.subheading}
            value={(config[subheadingKey] as string) ?? ''}
            onChange={(e) => onChange({ ...config, [subheadingKey]: e.target.value })}
            className={PB_TEXT_INPUT_CLS}
          />
        )}
      </div>
    </div>
  )
}
