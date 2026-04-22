'use client'

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import clsx from 'clsx'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useManageAiLocaleRows } from '@/hooks/use-manage-ai-locales'
import { callAiTranslate, type ManageAiContext } from '@/lib/manage-content-ai'
import { ManageAiTranslateToolbar } from '@/components/manage/ManageAiTranslateToolbar'
import { ManageStickyLangBar } from '@/components/manage/ManageStickyLangBar'
import { ManageStickyFormFooter } from '@/components/manage/ManageStickyFormFooter'
import { MANAGE_FORM_CONTAINER_CLASS } from '@/components/manage/ManageFormShell'
import { useVitrinHref } from '@/hooks/use-vitrin-href'

// ─── Types — keep in sync with /api/sliders ─────────────────────────────────

type SliderTextAlign = 'left' | 'center' | 'right'
type SliderTextTheme = 'light' | 'dark'
type LocalizedText = Record<string, string>

interface SliderItem {
  id: string
  enabled: boolean
  eyebrow: LocalizedText
  title: LocalizedText
  subtitle: LocalizedText
  ctaText: LocalizedText
  ctaHref: string
  imageUrl: string
  mobileImageUrl: string
  overlay: number
  textTheme: SliderTextTheme
  align: SliderTextAlign
}

interface SlidersConfig {
  autoplayMs: number
  height: 'short' | 'normal' | 'tall'
  showArrows: boolean
  showDots: boolean
  slides: SliderItem[]
  updatedAt: string
}

// ─── Available target pages ─────────────────────────────────────────────────

interface PageTab {
  key: string
  label: string
}

const PAGE_TABS: PageTab[] = [
  { key: 'homepage', label: 'Ana Sayfa' },
  { key: 'oteller', label: 'Oteller' },
  { key: 'tatil-evleri', label: 'Tatil Evleri' },
  { key: 'turlar', label: 'Turlar' },
  { key: 'aktiviteler', label: 'Aktiviteler' },
  { key: 'arac-kiralama', label: 'Araç Kiralama' },
  { key: 'yat-kiralama', label: 'Yat Kiralama' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'feribot', label: 'Feribot' },
  { key: 'kruvaziyer', label: 'Kruvaziyer' },
  { key: 'ucak-bileti', label: 'Uçak Bileti' },
  { key: 'hac-umre', label: 'Hac & Umre' },
  { key: 'vize', label: 'Vize' },
]

const HEIGHT_LABELS: Record<SlidersConfig['height'], string> = {
  short: 'Kısa (320px)',
  normal: 'Standart (480px)',
  tall: 'Geniş (640px)',
}

const HEIGHT_PREVIEW_PX: Record<SlidersConfig['height'], number> = {
  short: 320,
  normal: 480,
  tall: 640,
}

const DEFAULT_CONFIG: SlidersConfig = {
  autoplayMs: 6000,
  height: 'normal',
  showArrows: true,
  showDots: true,
  slides: [],
  updatedAt: '',
}

const EMPTY: LocalizedText = {}

function newSlide(primaryLocale: string): SliderItem {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    eyebrow: { [primaryLocale]: '' },
    title: { [primaryLocale]: '' },
    subtitle: { [primaryLocale]: '' },
    ctaText: { [primaryLocale]: '' },
    ctaHref: '',
    imageUrl: '',
    mobileImageUrl: '',
    overlay: 35,
    textTheme: 'light',
    align: 'center',
  }
}

/** İçeri gelen ham slayt verisini editör için normalize et (eski string formatı dahil). */
function toLocalized(raw: unknown, primaryLocale: string): LocalizedText {
  if (!raw) return {}
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed ? { [primaryLocale]: trimmed } : {}
  }
  if (typeof raw === 'object') {
    const out: LocalizedText = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string') out[k.toLowerCase()] = v
    }
    return out
  }
  return {}
}

function normalizeSlide(raw: Record<string, unknown>, idx: number, primary: string): SliderItem {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `slide-${idx}-${Date.now()}`,
    enabled: raw.enabled !== false,
    eyebrow: toLocalized(raw.eyebrow, primary),
    title: toLocalized(raw.title, primary),
    subtitle: toLocalized(raw.subtitle, primary),
    ctaText: toLocalized(raw.ctaText, primary),
    ctaHref: typeof raw.ctaHref === 'string' ? raw.ctaHref : '',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    mobileImageUrl: typeof raw.mobileImageUrl === 'string' ? raw.mobileImageUrl : '',
    overlay:
      typeof raw.overlay === 'number' && Number.isFinite(raw.overlay)
        ? Math.min(80, Math.max(0, Math.round(raw.overlay)))
        : 35,
    textTheme: raw.textTheme === 'dark' ? 'dark' : 'light',
    align:
      raw.align === 'left' || raw.align === 'right'
        ? (raw.align as SliderTextAlign)
        : 'center',
  }
}

/** Önce istenen dil, sonra varsayılan dil, sonra ilk dolu olan. */
function pick(field: LocalizedText | undefined, locale: string, primary: string): string {
  if (!field) return ''
  return field[locale] || field[primary] || Object.values(field).find((v) => v?.trim()) || ''
}

// ─── Image upload field ─────────────────────────────────────────────────────

function ImageField({
  label,
  description,
  value,
  pageKey,
  slideId,
  variant,
  onChange,
}: {
  label: string
  description?: string
  value: string
  pageKey: string
  slideId: string
  variant: 'desktop' | 'mobile'
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (file: File) => {
      setUploading(true)
      setError(null)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'site')
        fd.append('subPath', `sliders/${pageKey}`)
        fd.append('prefix', `slide-${slideId.slice(-6)}-${variant}`)
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        })
        const json = await res.json()
        if (json.ok && json.url) onChange(json.url as string)
        else setError(json.error || 'Yüklenemedi.')
      } catch {
        setError('Bağlantı hatası.')
      } finally {
        setUploading(false)
      }
    },
    [pageKey, slideId, variant, onChange],
  )

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {description && (
          <span className="ml-1 font-normal text-neutral-400">({description})</span>
        )}
      </span>

      <div
        className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
            : 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-600'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) upload(f)
        }}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
              unoptimized={value.startsWith('/uploads/')}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              title="Kaldır"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <Upload className="h-6 w-6" />
            <span className="text-xs">Yükle veya sürükle</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload(f)
          }}
        />
      </div>

      <input
        type="url"
        placeholder="veya görsel URL girin"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Localized text input + AI translate helper ─────────────────────────────

function LocalizedField({
  label,
  type,
  rows,
  placeholder,
  field,
  editLocale,
  primaryLocale,
  context,
  onChange,
}: {
  label: string
  type: 'input' | 'textarea'
  rows?: number
  placeholder?: string
  field: LocalizedText
  editLocale: string
  primaryLocale: string
  context: ManageAiContext
  onChange: (next: LocalizedText) => void
}) {
  const [translating, setTranslating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const value = field[editLocale] ?? ''
  const sourceText = field[primaryLocale] ?? ''
  const isPrimary = editLocale === primaryLocale
  const canTranslate = !isPrimary && sourceText.trim().length > 0

  const handleTranslate = async () => {
    if (!canTranslate) return
    setErr(null)
    setTranslating(true)
    try {
      const translated = await callAiTranslate({
        text: sourceText,
        context,
        sourceLocale: primaryLocale,
        targetLocale: editLocale,
      })
      if (translated) onChange({ ...field, [editLocale]: translated })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Çeviri başarısız')
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {label}
          {isPrimary && (
            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              kaynak
            </span>
          )}
        </label>
        {!isPrimary && (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={!canTranslate || translating}
            title={
              !sourceText.trim()
                ? `Önce "${primaryLocale.toUpperCase()}" alanını doldurun`
                : `${primaryLocale.toUpperCase()} → ${editLocale.toUpperCase()} çevir`
            }
            className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            {translating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI Çevir
          </button>
        )}
      </div>

      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange({ ...field, [editLocale]: e.target.value })}
          rows={rows ?? 2}
          placeholder={placeholder}
          className="w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange({ ...field, [editLocale]: e.target.value })}
          placeholder={placeholder}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      )}
      {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
    </div>
  )
}

// ─── Single slide editor ────────────────────────────────────────────────────

function SlideCard({
  slide,
  index,
  total,
  pageKey,
  editLocale,
  primaryLocale,
  onChange,
  onMove,
  onRemove,
  onTranslateAll,
}: {
  slide: SliderItem
  index: number
  total: number
  pageKey: string
  editLocale: string
  primaryLocale: string
  onChange: (next: SliderItem) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onTranslateAll: () => Promise<void>
}) {
  const [translatingAll, setTranslatingAll] = useState(false)
  const update = <K extends keyof SliderItem>(key: K, value: SliderItem[K]) =>
    onChange({ ...slide, [key]: value })

  const cardTitle = pick(slide.title, editLocale, primaryLocale)
  const cardEyebrow = pick(slide.eyebrow, editLocale, primaryLocale)

  const handleAllTranslate = async () => {
    setTranslatingAll(true)
    try {
      await onTranslateAll()
    } finally {
      setTranslatingAll(false)
    }
  }

  const isPrimary = editLocale === primaryLocale

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        slide.enabled
          ? 'border-neutral-200 dark:border-neutral-700'
          : 'border-dashed border-neutral-300 opacity-70 dark:border-neutral-600'
      } bg-white dark:bg-neutral-900`}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/40">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {cardTitle || cardEyebrow || 'Yeni slayt'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isPrimary && (
            <button
              type="button"
              onClick={handleAllTranslate}
              disabled={translatingAll}
              className="mr-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-300"
              title={`Tüm metinleri ${primaryLocale.toUpperCase()} → ${editLocale.toUpperCase()} çevir`}
            >
              {translatingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Hepsini Çevir
            </button>
          )}
          <button
            type="button"
            onClick={() => update('enabled', !slide.enabled)}
            className={`rounded-lg p-1.5 text-xs transition-colors ${
              slide.enabled
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={slide.enabled ? 'Yayını kapat' : 'Yayını aç'}
          >
            {slide.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Yukarı taşı"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Aşağı taşı"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Left — images (locale bağımsız) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <ImageField
            label="Masaüstü görseli"
            description="1920×1080"
            value={slide.imageUrl}
            pageKey={pageKey}
            slideId={slide.id}
            variant="desktop"
            onChange={(url) => update('imageUrl', url)}
          />
          <ImageField
            label="Mobil görsel (opsiyonel)"
            description="küçük ekran"
            value={slide.mobileImageUrl}
            pageKey={pageKey}
            slideId={slide.id}
            variant="mobile"
            onChange={(url) => update('mobileImageUrl', url)}
          />
        </div>

        {/* Right — text fields (locale'e göre) */}
        <div className="grid gap-3">
          <LocalizedField
            label="Üst etiket"
            type="input"
            placeholder="Yaz Kampanyası"
            field={slide.eyebrow}
            editLocale={editLocale}
            primaryLocale={primaryLocale}
            context="title"
            onChange={(v) => update('eyebrow', v)}
          />
          <LocalizedField
            label="Başlık"
            type="input"
            placeholder="Akdeniz'in incilerini keşfedin"
            field={slide.title}
            editLocale={editLocale}
            primaryLocale={primaryLocale}
            context="title"
            onChange={(v) => update('title', v)}
          />
          <LocalizedField
            label="Alt başlık / açıklama"
            type="textarea"
            rows={2}
            placeholder="Erken rezervasyonda %30'a varan indirimler"
            field={slide.subtitle}
            editLocale={editLocale}
            primaryLocale={primaryLocale}
            context="excerpt"
            onChange={(v) => update('subtitle', v)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <LocalizedField
              label="CTA buton metni"
              type="input"
              placeholder="Hemen İncele"
              field={slide.ctaText}
              editLocale={editLocale}
              primaryLocale={primaryLocale}
              context="title"
              onChange={(v) => update('ctaText', v)}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                CTA bağlantısı
                <span className="ml-1.5 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                  tüm dillerde aynı
                </span>
              </label>
              <input
                value={slide.ctaHref}
                onChange={(e) => update('ctaHref', e.target.value)}
                placeholder="/oteller"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Yazı hizası
              </label>
              <select
                value={slide.align}
                onChange={(e) => update('align', e.target.value as SliderTextAlign)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="left">Sol</option>
                <option value="center">Orta</option>
                <option value="right">Sağ</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Yazı teması
              </label>
              <select
                value={slide.textTheme}
                onChange={(e) => update('textTheme', e.target.value as SliderTextTheme)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="light">Açık (beyaz)</option>
                <option value="dark">Koyu (siyah)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Karartma %{slide.overlay}
              </label>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={slide.overlay}
                onChange={(e) => update('overlay', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Live preview ───────────────────────────────────────────────────────────

function SlidePreview({
  slide,
  height,
  editLocale,
  primaryLocale,
}: {
  slide: SliderItem
  height: SlidersConfig['height']
  editLocale: string
  primaryLocale: string
}) {
  const overlay = Math.min(80, Math.max(0, slide.overlay)) / 100
  const textColor = slide.textTheme === 'dark' ? 'text-neutral-900' : 'text-white'
  const align = slide.align
  const justify =
    align === 'left'
      ? 'items-start text-left'
      : align === 'right'
        ? 'items-end text-right'
        : 'items-center text-center'

  const eyebrow = pick(slide.eyebrow, editLocale, primaryLocale)
  const title = pick(slide.title, editLocale, primaryLocale)
  const subtitle = pick(slide.subtitle, editLocale, primaryLocale)
  const ctaText = pick(slide.ctaText, editLocale, primaryLocale)

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800"
      style={{ height: HEIGHT_PREVIEW_PX[height] }}
    >
      {slide.imageUrl ? (
        <Image
          src={slide.imageUrl}
          alt={title || 'preview'}
          fill
          className="object-cover"
          unoptimized={slide.imageUrl.startsWith('/uploads/')}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-neutral-400">
          <ImageIcon className="h-10 w-10" />
        </div>
      )}
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
      <div
        className={`relative flex h-full flex-col justify-center gap-3 px-8 ${justify} ${textColor}`}
      >
        {eyebrow && (
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide backdrop-blur-sm">
            {eyebrow}
          </span>
        )}
        {title && (
          <h3 className="max-w-2xl text-2xl font-bold leading-tight md:text-4xl">{title}</h3>
        )}
        {subtitle && <p className="max-w-xl text-sm opacity-90 md:text-base">{subtitle}</p>}
        {slide.ctaHref && ctaText && (
          <span className="mt-2 inline-flex w-fit items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-md">
            {ctaText}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SlidersManageClient() {
  const { allLocales, primaryLocale, translateTargets } = useManageAiLocaleRows()
  const vitrinPath = useVitrinHref()

  const [activePage, setActivePage] = useState<string>(PAGE_TABS[0].key)
  const [config, setConfig] = useState<SlidersConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [editLocale, setEditLocale] = useState<string>(primaryLocale)
  const submitIntentRef = useRef<'save' | 'save-show'>('save')
  // Üst toolbar — toplu AI çevirisi için hedef dil seçimi (primary hariç)
  const [bulkTargetLocale, setBulkTargetLocale] = useState<string>('')
  const [bulkTranslating, setBulkTranslating] = useState(false)

  // Primary locale değişirse aktif düzenleme dilini buna ayarla (initial)
  useEffect(() => {
    setEditLocale((cur) => (allLocales.some((l) => l.code === cur) ? cur : primaryLocale))
  }, [primaryLocale, allLocales])

  // Bulk hedef dili ilk uygun çeviri hedefine ayarla
  useEffect(() => {
    if (translateTargets.length === 0) {
      setBulkTargetLocale('')
      return
    }
    setBulkTargetLocale((cur) =>
      translateTargets.some((l) => l.code === cur) ? cur : translateTargets[0].code,
    )
  }, [translateTargets])

  // Load on page change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setStatus(null)
    setPreviewIndex(0)
    fetch(`/api/sliders?page=${activePage}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && data.config) {
          // Geriye dönük: API ham veri dönerse normalize et
          const cfgIn = data.config as Record<string, unknown>
          const slidesIn = Array.isArray(cfgIn.slides)
            ? (cfgIn.slides as Array<Record<string, unknown>>)
            : []
          setConfig({
            autoplayMs:
              typeof cfgIn.autoplayMs === 'number' && Number.isFinite(cfgIn.autoplayMs)
                ? cfgIn.autoplayMs
                : 6000,
            height:
              cfgIn.height === 'short' || cfgIn.height === 'tall'
                ? (cfgIn.height as SlidersConfig['height'])
                : 'normal',
            showArrows: cfgIn.showArrows !== false,
            showDots: cfgIn.showDots !== false,
            slides: slidesIn.map((s, i) => normalizeSlide(s, i, primaryLocale)),
            updatedAt: typeof cfgIn.updatedAt === 'string' ? cfgIn.updatedAt : '',
          })
        } else {
          setConfig(DEFAULT_CONFIG)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activePage, primaryLocale])

  // ── Mutations ─────────────────────────────────────────────
  const updateSlide = useCallback((id: string, next: SliderItem) => {
    setConfig((c) => ({ ...c, slides: c.slides.map((s) => (s.id === id ? next : s)) }))
  }, [])

  const moveSlide = useCallback((id: string, dir: -1 | 1) => {
    setConfig((c) => {
      const arr = [...c.slides]
      const idx = arr.findIndex((s) => s.id === id)
      if (idx === -1) return c
      const target = idx + dir
      if (target < 0 || target >= arr.length) return c
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...c, slides: arr }
    })
  }, [])

  const removeSlide = useCallback((id: string) => {
    setConfig((c) => ({ ...c, slides: c.slides.filter((s) => s.id !== id) }))
  }, [])

  const addSlide = useCallback(() => {
    setConfig((c) => ({ ...c, slides: [...c.slides, newSlide(primaryLocale)] }))
  }, [primaryLocale])

  // ── Slayt için tüm metin alanlarını çevir ─────────────────
  const translateSlideAll = useCallback(
    async (id: string) => {
      const slide = config.slides.find((s) => s.id === id)
      if (!slide || editLocale === primaryLocale) return

      const fields: Array<{ key: 'eyebrow' | 'title' | 'subtitle' | 'ctaText'; ctx: ManageAiContext }> = [
        { key: 'eyebrow', ctx: 'title' },
        { key: 'title', ctx: 'title' },
        { key: 'subtitle', ctx: 'excerpt' },
        { key: 'ctaText', ctx: 'title' },
      ]

      const next: SliderItem = { ...slide }
      for (const f of fields) {
        const src = (slide[f.key] ?? EMPTY)[primaryLocale]?.trim() ?? ''
        if (!src) continue
        try {
          const t = await callAiTranslate({
            text: src,
            context: f.ctx,
            sourceLocale: primaryLocale,
            targetLocale: editLocale,
          })
          if (t) next[f.key] = { ...(slide[f.key] ?? {}), [editLocale]: t }
        } catch {
          // Tek alan başarısız olsa diğerlerini denemeye devam et
        }
      }
      updateSlide(id, next)
    },
    [config.slides, editLocale, primaryLocale, updateSlide],
  )

  // ── Tüm slaytları primary → bulkTargetLocale çevir ────────
  const translateAllToBulkTarget = useCallback(async () => {
    if (!bulkTargetLocale || bulkTargetLocale === primaryLocale) return
    if (config.slides.length === 0) {
      setStatus({ type: 'error', msg: 'Çevrilecek slayt yok.' })
      return
    }
    setBulkTranslating(true)
    setStatus(null)

    const fields: Array<{ key: 'eyebrow' | 'title' | 'subtitle' | 'ctaText'; ctx: ManageAiContext }> = [
      { key: 'eyebrow', ctx: 'title' },
      { key: 'title', ctx: 'title' },
      { key: 'subtitle', ctx: 'excerpt' },
      { key: 'ctaText', ctx: 'title' },
    ]

    let translatedFields = 0
    let errorCount = 0
    const updatedSlides: SliderItem[] = []

    for (const slide of config.slides) {
      const next: SliderItem = { ...slide }
      // Aynı slayt içindeki alanları paralel çevir; slaytlar sıralı (rate-limit dostu)
      const promises = fields.map(async (f) => {
        const src = (slide[f.key] ?? EMPTY)[primaryLocale]?.trim() ?? ''
        if (!src) return null
        try {
          const t = await callAiTranslate({
            text: src,
            context: f.ctx,
            sourceLocale: primaryLocale,
            targetLocale: bulkTargetLocale,
          })
          if (t) {
            translatedFields += 1
            return { key: f.key, value: t }
          }
        } catch {
          errorCount += 1
        }
        return null
      })
      const results = await Promise.all(promises)
      for (const r of results) {
        if (r) next[r.key] = { ...(slide[r.key] ?? {}), [bulkTargetLocale]: r.value }
      }
      updatedSlides.push(next)
    }

    setConfig((c) => ({ ...c, slides: updatedSlides }))
    setEditLocale(bulkTargetLocale) // Sonucu görmek için tabı geçir
    setBulkTranslating(false)

    const label = allLocales.find((l) => l.code === bulkTargetLocale)?.label ?? bulkTargetLocale
    setStatus({
      type: errorCount === 0 ? 'success' : 'error',
      msg:
        errorCount === 0
          ? `${label} için ${translatedFields} alan çevrildi. Kaydetmeyi unutmayın.`
          : `${label}: ${translatedFields} alan çevrildi, ${errorCount} alan başarısız.`,
    })
    setTimeout(() => setStatus(null), 6000)
  }, [bulkTargetLocale, primaryLocale, config.slides, allLocales])

  // ── Vitrin (önizleme) yolu — sticky footer + Önizleme butonu için ───
  const previewHref = useMemo(() => {
    const internal = activePage === 'homepage' ? '/' : `/${activePage}`
    return vitrinPath(internal)
  }, [activePage, vitrinPath])

  // ── Save / reset ──────────────────────────────────────────
  const save = useCallback(async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/sliders?page=${activePage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus({ type: 'success', msg: 'Kaydedildi.' })
        if (data.config) {
          const cfgIn = data.config as Record<string, unknown>
          const slidesIn = Array.isArray(cfgIn.slides)
            ? (cfgIn.slides as Array<Record<string, unknown>>)
            : []
          setConfig((c) => ({
            ...c,
            slides: slidesIn.map((s, i) => normalizeSlide(s, i, primaryLocale)),
            updatedAt: typeof cfgIn.updatedAt === 'string' ? cfgIn.updatedAt : c.updatedAt,
          }))
        }
        if (submitIntentRef.current === 'save-show' && typeof window !== 'undefined') {
          window.open(previewHref, '_blank', 'noopener,noreferrer')
        }
        return true
      }
      setStatus({ type: 'error', msg: data.error || 'Kayıt başarısız.' })
      return false
    } catch {
      setStatus({ type: 'error', msg: 'Bağlantı hatası.' })
      return false
    } finally {
      setSaving(false)
      setTimeout(() => setStatus(null), 4000)
    }
  }, [activePage, config, primaryLocale, previewHref])

  const handleSave = useCallback(() => {
    submitIntentRef.current = 'save'
    void save()
  }, [save])

  const handleSaveAndShow = useCallback(() => {
    submitIntentRef.current = 'save-show'
    void save()
  }, [save])

  const resetConfig = async () => {
    if (!confirm('Bu sayfadaki tüm slaytlar silinecek. Onaylıyor musunuz?')) return
    setResetting(true)
    try {
      await fetch(`/api/sliders?page=${activePage}`, { method: 'DELETE' })
      setConfig(DEFAULT_CONFIG)
      setStatus({ type: 'success', msg: 'Sıfırlandı.' })
    } catch {
      setStatus({ type: 'error', msg: 'Sıfırlanamadı.' })
    } finally {
      setResetting(false)
      setTimeout(() => setStatus(null), 4000)
    }
  }

  // Locale rozeti — kaç slayt o dilde dolu
  const localeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const loc of allLocales) {
      counts[loc.code] = config.slides.filter((s) =>
        ['eyebrow', 'title', 'subtitle', 'ctaText'].some(
          (k) => (s[k as 'title']?.[loc.code] ?? '').trim().length > 0,
        ),
      ).length
    }
    return counts
  }, [config.slides, allLocales])

  const activeSlide = config.slides[previewIndex] ?? config.slides[0]

  // Sticky bar başlığı: aktif sayfa etiketi + slug bilgisi
  const activePageLabel =
    PAGE_TABS.find((t) => t.key === activePage)?.label ?? activePage
  const titleSecondary = activePage === 'homepage' ? '/' : `/${activePage}`

  // ManageStickyLangBar tipi (code/label/flag)
  const langBarLocales = useMemo(
    () => allLocales.map((l) => ({ code: l.code, label: l.label, flag: l.flag })),
    [allLocales],
  )

  return (
    <div className="pb-28">
      {/* ── Üst sticky çubuğu: Geri · Başlık · Dil tabları · AI Çevir ── */}
      <ManageStickyLangBar
        backHref="/manage/admin"
        titlePrimary={`Slider & Banner — ${activePageLabel}`}
        titleSecondary={titleSecondary}
        locales={langBarLocales}
        activeLocale={editLocale}
        onActiveLocaleChange={setEditLocale}
        toolbarRight={
          translateTargets.length > 0 && bulkTargetLocale ? (
            <ManageAiTranslateToolbar
              locales={translateTargets.map((l) => ({
                code: l.code,
                label: l.label,
                flag: l.flag,
              }))}
              targetLocale={bulkTargetLocale}
              onTargetLocaleChange={setBulkTargetLocale}
              onTranslate={() => void translateAllToBulkTarget()}
              translating={bulkTranslating}
              disabled={loading || saving || config.slides.length === 0}
            />
          ) : null
        }
      />

      <div className={clsx(MANAGE_FORM_CONTAINER_CLASS, 'space-y-6 pt-4 sm:pt-6')}>
        {/* Page tabs (slider yönetiminin kendi kapsam seçimi) */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Sayfa
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 p-1.5 dark:border-neutral-700 dark:bg-neutral-900">
            {PAGE_TABS.map((tab) => {
              const isActive = activePage === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActivePage(tab.key)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-sm dark:bg-neutral-800 dark:text-blue-300'
                      : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Locale doluluk rozetleri (yardımcı; düzenleme dili sticky bar'dan değişir) */}
        {config.slides.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold uppercase tracking-wide text-neutral-500">
              Doluluk:
            </span>
            {allLocales.map((loc) => {
              const filled = localeCounts[loc.code] ?? 0
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => setEditLocale(loc.code)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                    filled === config.slides.length
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : filled > 0
                        ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                  }`}
                  title={`${loc.label}: ${filled}/${config.slides.length}`}
                >
                  <span>{loc.flag}</span>
                  <span className="uppercase">{loc.code}</span>
                  <span>{filled}/{config.slides.length}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Status */}
        {status && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
            }`}
          >
            {status.msg}
          </div>
        )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          {/* Global settings */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <h2 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Genel Ayarlar
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Otomatik geçiş (sn)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={1}
                  value={Math.round(config.autoplayMs / 1000)}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      autoplayMs: Math.max(0, Number(e.target.value) * 1000),
                    }))
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
                <p className="mt-1 text-[11px] text-neutral-400">0 → otomatik geçiş kapalı</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Yükseklik
                </label>
                <select
                  value={config.height}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, height: e.target.value as SlidersConfig['height'] }))
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {(Object.keys(HEIGHT_LABELS) as SlidersConfig['height'][]).map((k) => (
                    <option key={k} value={k}>
                      {HEIGHT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">
                <input
                  type="checkbox"
                  checked={config.showArrows}
                  onChange={(e) => setConfig((c) => ({ ...c, showArrows: e.target.checked }))}
                  className="h-4 w-4 accent-blue-600"
                />
                Yön okları
              </label>
              <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700">
                <input
                  type="checkbox"
                  checked={config.showDots}
                  onChange={(e) => setConfig((c) => ({ ...c, showDots: e.target.checked }))}
                  className="h-4 w-4 accent-blue-600"
                />
                Nokta göstergesi
              </label>
            </div>
          </section>

          {/* Live preview */}
          {activeSlide && (
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Canlı Önizleme
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    {editLocale}
                  </span>
                </h2>
                {config.slides.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    {config.slides.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => setPreviewIndex(i)}
                        className={`h-2 w-6 rounded-full transition-colors ${
                          i === previewIndex
                            ? 'bg-blue-600'
                            : 'bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-600'
                        }`}
                        title={pick(s.title, editLocale, primaryLocale) || `Slayt ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <SlidePreview
                slide={activeSlide}
                height={config.height}
                editLocale={editLocale}
                primaryLocale={primaryLocale}
              />
            </section>
          )}

          {/* Slide list */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Slaytlar ({config.slides.length})
              </h2>
              <button
                onClick={addSlide}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-600 dark:text-neutral-300"
              >
                <Plus className="h-4 w-4" />
                Slayt Ekle
              </button>
            </div>

            {config.slides.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
                <ImageIcon className="mx-auto h-10 w-10 text-neutral-400" />
                <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Bu sayfa için henüz slayt yok
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Yukarıdaki "Slayt Ekle" düğmesiyle ilk slaydı oluşturun.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {config.slides.map((slide, idx) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    index={idx}
                    total={config.slides.length}
                    pageKey={activePage}
                    editLocale={editLocale}
                    primaryLocale={primaryLocale}
                    onChange={(next) => updateSlide(slide.id, next)}
                    onMove={(dir) => moveSlide(slide.id, dir)}
                    onRemove={() => removeSlide(slide.id)}
                    onTranslateAll={() => translateSlideAll(slide.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {config.updatedAt && (
            <p className="text-center text-xs text-neutral-400">
              Son kayıt: {new Date(config.updatedAt).toLocaleString('tr-TR')}
            </p>
          )}
        </>
      )}
      </div>

      {/* ── Alt sticky aksiyon çubuğu ── */}
      <ManageStickyFormFooter>
        <a
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          Önizleme
        </a>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => void resetConfig()}
            disabled={resetting || loading || saving}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Sıfırla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          <button
            type="button"
            onClick={handleSaveAndShow}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--manage-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kaydet ve Göster
          </button>
        </div>
      </ManageStickyFormFooter>
    </div>
  )
}
