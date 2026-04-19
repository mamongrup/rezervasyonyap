'use client'

import {
  ArrowDown,
  ArrowUp,
  Copy,
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
import {
  EMPTY_POPUPS_CONFIG,
  sanitizePopupItem,
  type PopupCampaignCard,
  type PopupItem,
  type PopupLayout,
  type PopupPreset,
  type PopupTextAlign,
  type PopupsConfig,
} from '@/lib/popups-types'
import PopupView from '@/components/popups/PopupView'

type LocalizedText = Record<string, string>

const PAGE_OPTIONS: { key: string; label: string }[] = [
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

const PRESET_LABELS: Record<PopupPreset, { label: string; emoji: string; hint: string }> = {
  promo: { label: 'Tanıtım / Kampanya', emoji: '🎯', hint: 'Genel kampanya tanıtımı' },
  celebration: { label: 'Kutlama', emoji: '🎉', hint: 'Yılbaşı, doğum günü vb.' },
  special_day: { label: 'Özel Gün', emoji: '🌸', hint: 'Anneler/Babalar Günü, Bayram' },
  campaign: { label: 'Kampanyalı İlanlar', emoji: '🏷️', hint: 'Listelenen ilan kartlarıyla' },
  newsletter: { label: 'Bülten Kaydı', emoji: '📧', hint: 'E-posta toplama' },
  announcement: { label: 'Duyuru', emoji: '📣', hint: 'Bilgilendirme amaçlı' },
}

const LAYOUT_LABELS: Record<PopupLayout, string> = {
  modal_center: 'Modal — ortalanmış',
  modal_split: 'Modal — görsel + yazı (yan yana)',
  banner_bottom: 'Alt çubuk',
  banner_top: 'Üst çubuk',
  side_corner: 'Köşe kutusu (sağ alt)',
  fullscreen: 'Tüm ekran',
}

const TRIGGER_LABELS: Record<PopupItem['trigger']['type'], string> = {
  load: 'Sayfa yüklendiğinde',
  delay: 'Belirli süre sonra',
  scroll: 'Belirli oranda kaydırınca',
  exit_intent: 'Çıkış niyetinde',
}

const FREQUENCY_LABELS: Record<PopupItem['frequency']['mode'], string> = {
  always: 'Her açılışta',
  once_session: 'Oturum başına bir kez',
  once_per_visitor: 'Ziyaretçi başına bir kez',
  every_n_days: 'N günde bir',
}

const AUDIENCE_LABELS: Record<PopupItem['targeting']['audience'], string> = {
  all: 'Herkes',
  guest: 'Sadece misafir',
  logged_in: 'Sadece giriş yapmış',
  first_visit: 'İlk ziyaret',
  returning: 'Geri dönen ziyaretçi',
}

const DEVICE_LABELS: Record<PopupItem['targeting']['device'], string> = {
  all: 'Tüm cihazlar',
  desktop: 'Sadece masaüstü',
  mobile: 'Sadece mobil',
}

const DOW = ['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

// ─── Locale text helper ─────────────────────────────────────────────────────

function pick(field: LocalizedText | undefined, locale: string, primary: string): string {
  if (!field) return ''
  return field[locale] || field[primary] || Object.values(field).find((v) => v?.trim()) || ''
}

function newPopup(primaryLocale: string, idx: number): PopupItem {
  return sanitizePopupItem(
    {
      id: `pop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      enabled: true,
      name: `Yeni Popup ${idx + 1}`,
      preset: 'promo',
      layout: 'modal_center',
      priority: 50,
      eyebrow: { [primaryLocale]: 'Yaz Kampanyası' },
      title: { [primaryLocale]: 'Erken Rezervasyonda %30 İndirim' },
      body: {
        [primaryLocale]: 'Sınırlı süre için tüm tatil paketlerinde geçerli özel fırsat.',
      },
      ctaText: { [primaryLocale]: 'Hemen İncele' },
      ctaHref: '/oteller',
      ctaText2: {},
      ctaHref2: '',
      imageUrl: '',
      mobileImageUrl: '',
      accentColor: '#0EA5E9',
      theme: 'light',
      align: 'center',
      overlay: 60,
      icon: '✨',
      cards: [],
      targeting: { pages: ['homepage'], locales: ['*'], device: 'all', audience: 'all' },
      schedule: { startAt: '', endAt: '', daysOfWeek: [], hourStart: '', hourEnd: '' },
      trigger: { type: 'delay', delayMs: 4000, scrollPercent: 40 },
      frequency: { mode: 'once_session', everyNDays: 7 },
      allowDismissForever: true,
    },
    idx,
  )
}

// ─── ImageField (re-used pattern) ───────────────────────────────────────────

function ImageField({
  label,
  description,
  value,
  popupId,
  variant,
  onChange,
}: {
  label: string
  description?: string
  value: string
  popupId: string
  variant: 'desktop' | 'mobile' | 'card'
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
        fd.append('subPath', `popups/${popupId.slice(-8)}`)
        fd.append('prefix', `${variant}`)
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
    [popupId, variant, onChange],
  )

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {description && <span className="ml-1 font-normal text-neutral-400">({description})</span>}
      </span>
      <div
        className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
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

// ─── LocalizedField with AI translate ───────────────────────────────────────

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

  const value = field?.[editLocale] ?? ''
  const sourceText = field?.[primaryLocale] ?? ''
  const isPrimary = editLocale === primaryLocale
  const canTranslate = !isPrimary && sourceText.trim().length > 0

  const translate = async () => {
    if (!canTranslate) return
    setErr(null)
    setTranslating(true)
    try {
      const out = await callAiTranslate({
        text: sourceText,
        context,
        sourceLocale: primaryLocale,
        targetLocale: editLocale,
      })
      if (out) onChange({ ...field, [editLocale]: out })
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
            onClick={translate}
            disabled={!canTranslate || translating}
            title={
              !sourceText.trim()
                ? `Önce "${primaryLocale.toUpperCase()}" alanını doldurun`
                : `${primaryLocale.toUpperCase()} → ${editLocale.toUpperCase()} çevir`
            }
            className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Çevir
          </button>
        )}
      </div>

      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange({ ...field, [editLocale]: e.target.value })}
          rows={rows ?? 3}
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

// ─── Multi-select chips (pages / locales) ───────────────────────────────────

function ChipMultiSelect<T extends string>({
  label,
  options,
  value,
  allLabel,
  onChange,
}: {
  label: string
  options: { key: T; label: string }[]
  value: T[] | ['*']
  allLabel: string
  onChange: (next: T[] | ['*']) => void
}) {
  const isAll = value[0] === '*'
  const selected = isAll ? new Set<T>() : new Set(value as T[])

  const toggle = (k: T) => {
    if (isAll) {
      onChange([k])
      return
    }
    const next = new Set(selected)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    if (next.size === 0) onChange(['*'])
    else onChange([...next] as T[])
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => onChange(['*'])}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            isAll ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
          }`}
        >
          {allLabel}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = !isAll && selected.has(opt.key)
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-neutral-200 text-neutral-600 hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-blue-700'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Single popup card editor ───────────────────────────────────────────────

function PopupCard({
  popup,
  index,
  total,
  editLocale,
  primaryLocale,
  onChange,
  onMove,
  onRemove,
  onDuplicate,
  onPreview,
  onTranslateAll,
  localeOptions,
}: {
  popup: PopupItem
  index: number
  total: number
  editLocale: string
  primaryLocale: string
  onChange: (next: PopupItem) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onDuplicate: () => void
  onPreview: () => void
  onTranslateAll: () => Promise<void>
  localeOptions: { code: string; label: string; flag: string }[]
}) {
  const [open, setOpen] = useState(index === 0)
  const [translatingAll, setTranslatingAll] = useState(false)
  const update = <K extends keyof PopupItem>(key: K, value: PopupItem[K]) =>
    onChange({ ...popup, [key]: value })

  const presetMeta = PRESET_LABELS[popup.preset]
  const cardTitle = pick(popup.title, editLocale, primaryLocale) || popup.name
  const isPrimary = editLocale === primaryLocale

  const handleTranslateAll = async () => {
    setTranslatingAll(true)
    try {
      await onTranslateAll()
    } finally {
      setTranslatingAll(false)
    }
  }

  const updateTargeting = <K extends keyof PopupItem['targeting']>(
    key: K,
    value: PopupItem['targeting'][K],
  ) => onChange({ ...popup, targeting: { ...popup.targeting, [key]: value } })

  const updateSchedule = <K extends keyof PopupItem['schedule']>(
    key: K,
    value: PopupItem['schedule'][K],
  ) => onChange({ ...popup, schedule: { ...popup.schedule, [key]: value } })

  const updateTrigger = <K extends keyof PopupItem['trigger']>(
    key: K,
    value: PopupItem['trigger'][K],
  ) => onChange({ ...popup, trigger: { ...popup.trigger, [key]: value } })

  const updateFrequency = <K extends keyof PopupItem['frequency']>(
    key: K,
    value: PopupItem['frequency'][K],
  ) => onChange({ ...popup, frequency: { ...popup.frequency, [key]: value } })

  const addCard = () => {
    const card: PopupCampaignCard = {
      id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      imageUrl: '',
      title: { [primaryLocale]: '' },
      subtitle: { [primaryLocale]: '' },
      priceLabel: { [primaryLocale]: '' },
      href: '',
      badge: {},
    }
    update('cards', [...popup.cards, card])
  }

  const removeCard = (id: string) => update('cards', popup.cards.filter((c) => c.id !== id))
  const updateCard = (id: string, next: PopupCampaignCard) =>
    update('cards', popup.cards.map((c) => (c.id === id ? next : c)))

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        popup.enabled
          ? 'border-neutral-200 dark:border-neutral-700'
          : 'border-dashed border-neutral-300 opacity-70 dark:border-neutral-600'
      } bg-white dark:bg-neutral-900`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/40">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {index + 1}
          </span>
          <span className="text-lg" title={presetMeta.hint}>
            {presetMeta.emoji}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {cardTitle}
            </div>
            <div className="truncate text-[11px] text-neutral-500">
              {presetMeta.label} · {LAYOUT_LABELS[popup.layout]}
              {popup.targeting.pages[0] !== '*' && ` · ${popup.targeting.pages.length} sayfa`}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          {!isPrimary && (
            <button
              type="button"
              onClick={handleTranslateAll}
              disabled={translatingAll}
              className="mr-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-300"
              title={`Tüm metinleri ${primaryLocale.toUpperCase()} → ${editLocale.toUpperCase()}`}
            >
              {translatingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Hepsini Çevir
            </button>
          )}
          <button
            type="button"
            onClick={onPreview}
            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            title="Önizle"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => update('enabled', !popup.enabled)}
            className={`rounded-lg p-1.5 ${popup.enabled ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            title={popup.enabled ? 'Yayını kapat' : 'Yayını aç'}
          >
            {popup.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Kopyala"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Yukarı"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Aşağı"
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

      {open && (
        <div className="space-y-5 p-4 lg:p-5">
          {/* Genel */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Genel</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Yönetici etiketi
                </label>
                <input
                  value={popup.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Tür / Şablon
                </label>
                <select
                  value={popup.preset}
                  onChange={(e) => update('preset', e.target.value as PopupPreset)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {Object.entries(PRESET_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.emoji} {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Yerleşim
                </label>
                <select
                  value={popup.layout}
                  onChange={(e) => update('layout', e.target.value as PopupLayout)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {(Object.keys(LAYOUT_LABELS) as PopupLayout[]).map((k) => (
                    <option key={k} value={k}>
                      {LAYOUT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Öncelik (yüksek önce)
                </label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={popup.priority}
                  onChange={(e) => update('priority', Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            </div>
          </section>

          {/* İçerik */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
              İçerik
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {editLocale}
              </span>
            </h3>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <ImageField
                  label="Görsel"
                  description="Modal/Fullscreen için 16:9, Modal-Split için dik"
                  value={popup.imageUrl ?? ''}
                  popupId={popup.id}
                  variant="desktop"
                  onChange={(url) => update('imageUrl', url)}
                />
                <ImageField
                  label="Mobil görsel (opsiyonel)"
                  description="küçük ekran"
                  value={popup.mobileImageUrl ?? ''}
                  popupId={popup.id}
                  variant="mobile"
                  onChange={(url) => update('mobileImageUrl', url)}
                />
              </div>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <LocalizedField
                    label="Üst etiket"
                    type="input"
                    placeholder="Yaz Kampanyası"
                    field={popup.eyebrow ?? {}}
                    editLocale={editLocale}
                    primaryLocale={primaryLocale}
                    context="title"
                    onChange={(v) => update('eyebrow', v)}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      İkon / Emoji
                      <span className="ml-1.5 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                        tüm dillerde
                      </span>
                    </label>
                    <input
                      value={popup.icon ?? ''}
                      onChange={(e) => update('icon', e.target.value)}
                      placeholder="🎉"
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </div>
                </div>
                <LocalizedField
                  label="Başlık"
                  type="input"
                  placeholder="Erken Rezervasyonda %30 İndirim"
                  field={popup.title ?? {}}
                  editLocale={editLocale}
                  primaryLocale={primaryLocale}
                  context="title"
                  onChange={(v) => update('title', v)}
                />
                <LocalizedField
                  label="Metin"
                  type="textarea"
                  rows={3}
                  placeholder="Sınırlı süre için tüm tatil paketlerinde geçerli özel fırsat."
                  field={popup.body ?? {}}
                  editLocale={editLocale}
                  primaryLocale={primaryLocale}
                  context="excerpt"
                  onChange={(v) => update('body', v)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <LocalizedField
                    label="Birincil buton metni"
                    type="input"
                    placeholder="Hemen İncele"
                    field={popup.ctaText ?? {}}
                    editLocale={editLocale}
                    primaryLocale={primaryLocale}
                    context="title"
                    onChange={(v) => update('ctaText', v)}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Birincil buton bağlantısı
                      <span className="ml-1.5 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                        tüm dillerde
                      </span>
                    </label>
                    <input
                      value={popup.ctaHref ?? ''}
                      onChange={(e) => update('ctaHref', e.target.value)}
                      placeholder="/oteller"
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LocalizedField
                    label="İkincil buton metni (opsiyonel)"
                    type="input"
                    placeholder="Daha Sonra"
                    field={popup.ctaText2 ?? {}}
                    editLocale={editLocale}
                    primaryLocale={primaryLocale}
                    context="title"
                    onChange={(v) => update('ctaText2', v)}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      İkincil buton bağlantısı
                    </label>
                    <input
                      value={popup.ctaHref2 ?? ''}
                      onChange={(e) => update('ctaHref2', e.target.value)}
                      placeholder=""
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tasarım */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Tasarım</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Vurgu rengi
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={popup.accentColor || '#0EA5E9'}
                    onChange={(e) => update('accentColor', e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700"
                  />
                  <input
                    value={popup.accentColor ?? ''}
                    onChange={(e) => update('accentColor', e.target.value)}
                    placeholder="#0EA5E9"
                    className="flex-1 rounded-lg border border-neutral-200 px-2 py-2 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Tema</label>
                <select
                  value={popup.theme}
                  onChange={(e) => update('theme', e.target.value as PopupItem['theme'])}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="light">Açık (beyaz)</option>
                  <option value="dark">Koyu (siyah)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Yazı hizası
                </label>
                <select
                  value={popup.align}
                  onChange={(e) => update('align', e.target.value as PopupTextAlign)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="left">Sol</option>
                  <option value="center">Orta</option>
                  <option value="right">Sağ</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Arka plan karartma %{popup.overlay}
                </label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={popup.overlay}
                  onChange={(e) => update('overlay', Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={popup.allowDismissForever}
                onChange={(e) => update('allowDismissForever', e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              "Bir daha gösterme" düğmesini göster
            </label>
          </section>

          {/* Hedefleme */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
              Hedefleme
            </h3>
            <div className="space-y-3">
              <ChipMultiSelect
                label="Hangi sayfalarda gösterilsin?"
                options={PAGE_OPTIONS.map((p) => ({ key: p.key, label: p.label }))}
                value={popup.targeting.pages}
                allLabel="Tüm sayfalar"
                onChange={(v) => updateTargeting('pages', v)}
              />
              <ChipMultiSelect
                label="Hangi dillerde gösterilsin?"
                options={localeOptions.map((l) => ({
                  key: l.code,
                  label: `${l.flag} ${l.code.toUpperCase()}`,
                }))}
                value={popup.targeting.locales}
                allLabel="Tüm diller"
                onChange={(v) => updateTargeting('locales', v)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Cihaz
                  </label>
                  <select
                    value={popup.targeting.device}
                    onChange={(e) =>
                      updateTargeting('device', e.target.value as PopupItem['targeting']['device'])
                    }
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {(Object.keys(DEVICE_LABELS) as Array<PopupItem['targeting']['device']>).map((k) => (
                      <option key={k} value={k}>
                        {DEVICE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Hedef kitle
                  </label>
                  <select
                    value={popup.targeting.audience}
                    onChange={(e) =>
                      updateTargeting('audience', e.target.value as PopupItem['targeting']['audience'])
                    }
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {(Object.keys(AUDIENCE_LABELS) as Array<PopupItem['targeting']['audience']>).map((k) => (
                      <option key={k} value={k}>
                        {AUDIENCE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Takvim */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
              Takvim
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Başlangıç
                </label>
                <input
                  type="datetime-local"
                  value={popup.schedule.startAt ? popup.schedule.startAt.slice(0, 16) : ''}
                  onChange={(e) =>
                    updateSchedule(
                      'startAt',
                      e.target.value ? new Date(e.target.value).toISOString() : '',
                    )
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Bitiş
                </label>
                <input
                  type="datetime-local"
                  value={popup.schedule.endAt ? popup.schedule.endAt.slice(0, 16) : ''}
                  onChange={(e) =>
                    updateSchedule(
                      'endAt',
                      e.target.value ? new Date(e.target.value).toISOString() : '',
                    )
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Saat aralığı (başlangıç)
                </label>
                <input
                  type="time"
                  value={popup.schedule.hourStart}
                  onChange={(e) => updateSchedule('hourStart', e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Saat aralığı (bitiş)
                </label>
                <input
                  type="time"
                  value={popup.schedule.hourEnd}
                  onChange={(e) => updateSchedule('hourEnd', e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Haftanın hangi günleri (boş = her gün)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DOW.map((d, i) => {
                  const active = popup.schedule.daysOfWeek.includes(i)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const cur = new Set(popup.schedule.daysOfWeek)
                        if (cur.has(i)) cur.delete(i)
                        else cur.add(i)
                        updateSchedule('daysOfWeek', [...cur].sort((a, b) => a - b))
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-neutral-200 text-neutral-600 hover:border-blue-300 dark:border-neutral-700 dark:text-neutral-400'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Tetikleyici & Sıklık */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                Tetikleyici
              </h3>
              <div className="grid gap-3">
                <select
                  value={popup.trigger.type}
                  onChange={(e) => updateTrigger('type', e.target.value as PopupItem['trigger']['type'])}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {(Object.keys(TRIGGER_LABELS) as Array<PopupItem['trigger']['type']>).map((k) => (
                    <option key={k} value={k}>
                      {TRIGGER_LABELS[k]}
                    </option>
                  ))}
                </select>
                {(popup.trigger.type === 'load' || popup.trigger.type === 'delay') && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Bekleme süresi: {(popup.trigger.delayMs / 1000).toFixed(1)} sn
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={30000}
                      step={500}
                      value={popup.trigger.delayMs}
                      onChange={(e) => updateTrigger('delayMs', Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                )}
                {popup.trigger.type === 'scroll' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Kaydırma eşiği: %{popup.trigger.scrollPercent}
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={popup.trigger.scrollPercent}
                      onChange={(e) => updateTrigger('scrollPercent', Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                Gösterim sıklığı
              </h3>
              <div className="grid gap-3">
                <select
                  value={popup.frequency.mode}
                  onChange={(e) =>
                    updateFrequency('mode', e.target.value as PopupItem['frequency']['mode'])
                  }
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {(Object.keys(FREQUENCY_LABELS) as Array<PopupItem['frequency']['mode']>).map((k) => (
                    <option key={k} value={k}>
                      {FREQUENCY_LABELS[k]}
                    </option>
                  ))}
                </select>
                {popup.frequency.mode === 'every_n_days' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Kaç günde bir: {popup.frequency.everyNDays}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={popup.frequency.everyNDays}
                      onChange={(e) =>
                        updateFrequency('everyNDays', Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Kampanya kartları */}
          {popup.preset === 'campaign' && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Kampanyalı İlan Kartları ({popup.cards.length}/8)
                </h3>
                <button
                  type="button"
                  onClick={addCard}
                  disabled={popup.cards.length >= 8}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Kart Ekle
                </button>
              </div>
              {popup.cards.length === 0 ? (
                <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-xs text-neutral-500 dark:border-neutral-700">
                  Henüz kart yok. Kampanyanızdaki ilanları kart kart ekleyin (görsel + başlık + fiyat
                  etiketi + bağlantı).
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {popup.cards.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase text-neutral-500">
                          Kart
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCard(c.id)}
                          className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <ImageField
                        label="Kart görseli"
                        value={c.imageUrl}
                        popupId={popup.id}
                        variant="card"
                        onChange={(url) => updateCard(c.id, { ...c, imageUrl: url })}
                      />
                      <div className="mt-2 space-y-2">
                        <LocalizedField
                          label="Başlık"
                          type="input"
                          field={c.title}
                          editLocale={editLocale}
                          primaryLocale={primaryLocale}
                          context="title"
                          onChange={(v) => updateCard(c.id, { ...c, title: v })}
                        />
                        <LocalizedField
                          label="Alt başlık"
                          type="input"
                          field={c.subtitle}
                          editLocale={editLocale}
                          primaryLocale={primaryLocale}
                          context="excerpt"
                          onChange={(v) => updateCard(c.id, { ...c, subtitle: v })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <LocalizedField
                            label="Fiyat etiketi"
                            type="input"
                            field={c.priceLabel}
                            editLocale={editLocale}
                            primaryLocale={primaryLocale}
                            context="title"
                            onChange={(v) => updateCard(c.id, { ...c, priceLabel: v })}
                          />
                          <LocalizedField
                            label="Rozet (ör. %20 indirim)"
                            type="input"
                            field={c.badge ?? {}}
                            editLocale={editLocale}
                            primaryLocale={primaryLocale}
                            context="title"
                            onChange={(v) => updateCard(c.id, { ...c, badge: v })}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            Bağlantı
                            <span className="ml-1.5 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                              tüm dillerde
                            </span>
                          </label>
                          <input
                            value={c.href}
                            onChange={(e) => updateCard(c.id, { ...c, href: e.target.value })}
                            placeholder="/ilan/akdeniz-tatili"
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main client ────────────────────────────────────────────────────────────

export default function PopupsManageClient() {
  const { allLocales, primaryLocale, translateTargets } = useManageAiLocaleRows()
  const vitrinPath = useVitrinHref()

  const [config, setConfig] = useState<PopupsConfig>(EMPTY_POPUPS_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [editLocale, setEditLocale] = useState<string>(primaryLocale)
  const [previewing, setPreviewing] = useState<PopupItem | null>(null)
  const submitIntentRef = useRef<'save' | 'save-show'>('save')
  // Üst toolbar — toplu AI çevirisi için hedef dil seçimi (primary hariç)
  const [bulkTargetLocale, setBulkTargetLocale] = useState<string>('')
  const [bulkTranslating, setBulkTranslating] = useState(false)

  useEffect(() => {
    setEditLocale((cur) => (allLocales.some((l) => l.code === cur) ? cur : primaryLocale))
  }, [primaryLocale, allLocales])

  useEffect(() => {
    if (translateTargets.length === 0) {
      setBulkTargetLocale('')
      return
    }
    setBulkTargetLocale((cur) =>
      translateTargets.some((l) => l.code === cur) ? cur : translateTargets[0].code,
    )
  }, [translateTargets])

  // Load
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/popups')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && data.config) {
          setConfig(data.config as PopupsConfig)
        } else {
          setConfig(EMPTY_POPUPS_CONFIG)
        }
      })
      .catch(() => setConfig(EMPTY_POPUPS_CONFIG))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Mutations
  const updatePopup = useCallback((id: string, next: PopupItem) => {
    setConfig((c) => ({ ...c, popups: c.popups.map((p) => (p.id === id ? next : p)) }))
  }, [])

  const movePopup = useCallback((id: string, dir: -1 | 1) => {
    setConfig((c) => {
      const arr = [...c.popups]
      const idx = arr.findIndex((p) => p.id === id)
      if (idx === -1) return c
      const target = idx + dir
      if (target < 0 || target >= arr.length) return c
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...c, popups: arr }
    })
  }, [])

  const removePopup = useCallback((id: string) => {
    if (!confirm('Bu popup silinsin mi?')) return
    setConfig((c) => ({ ...c, popups: c.popups.filter((p) => p.id !== id) }))
  }, [])

  const duplicatePopup = useCallback((id: string) => {
    setConfig((c) => {
      const orig = c.popups.find((p) => p.id === id)
      if (!orig) return c
      const copy: PopupItem = {
        ...orig,
        id: `pop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        name: `${orig.name} (kopya)`,
      }
      const idx = c.popups.findIndex((p) => p.id === id)
      const arr = [...c.popups]
      arr.splice(idx + 1, 0, copy)
      return { ...c, popups: arr }
    })
  }, [])

  const addPopup = useCallback(() => {
    setConfig((c) => ({ ...c, popups: [...c.popups, newPopup(primaryLocale, c.popups.length)] }))
  }, [primaryLocale])

  // Translate all text fields of a popup (incl. cards) primary → editLocale
  const translateAll = useCallback(
    async (id: string) => {
      const popup = config.popups.find((p) => p.id === id)
      if (!popup || editLocale === primaryLocale) return
      const next: PopupItem = { ...popup }

      const fields: Array<{ key: 'eyebrow' | 'title' | 'body' | 'ctaText' | 'ctaText2'; ctx: ManageAiContext }> = [
        { key: 'eyebrow', ctx: 'title' },
        { key: 'title', ctx: 'title' },
        { key: 'body', ctx: 'excerpt' },
        { key: 'ctaText', ctx: 'title' },
        { key: 'ctaText2', ctx: 'title' },
      ]
      for (const f of fields) {
        const src = (popup[f.key] ?? {})[primaryLocale]?.trim() ?? ''
        if (!src) continue
        try {
          const t = await callAiTranslate({
            text: src,
            context: f.ctx,
            sourceLocale: primaryLocale,
            targetLocale: editLocale,
          })
          if (t) next[f.key] = { ...(popup[f.key] ?? {}), [editLocale]: t }
        } catch {
          /* tek alan hatası diğerlerini engellemesin */
        }
      }

      // Kartlar
      next.cards = await Promise.all(
        popup.cards.map(async (c) => {
          const updated: PopupCampaignCard = { ...c }
          const cardFields: Array<{ key: 'title' | 'subtitle' | 'priceLabel' | 'badge'; ctx: ManageAiContext }> = [
            { key: 'title', ctx: 'title' },
            { key: 'subtitle', ctx: 'excerpt' },
            { key: 'priceLabel', ctx: 'title' },
            { key: 'badge', ctx: 'title' },
          ]
          for (const f of cardFields) {
            const src = (c[f.key] ?? {})[primaryLocale]?.trim() ?? ''
            if (!src) continue
            try {
              const t = await callAiTranslate({
                text: src,
                context: f.ctx,
                sourceLocale: primaryLocale,
                targetLocale: editLocale,
              })
              if (t) updated[f.key] = { ...(c[f.key] ?? {}), [editLocale]: t }
            } catch {
              /* yut */
            }
          }
          return updated
        }),
      )

      updatePopup(id, next)
    },
    [config.popups, editLocale, primaryLocale, updatePopup],
  )

  // Tüm popup'ları + kart alanlarını primary → bulkTargetLocale çevir
  const translateAllToBulkTarget = useCallback(async () => {
    if (!bulkTargetLocale || bulkTargetLocale === primaryLocale) return
    if (config.popups.length === 0) {
      setStatus({ type: 'error', msg: 'Çevrilecek popup yok.' })
      return
    }
    setBulkTranslating(true)
    setStatus(null)

    const popupFields: Array<{
      key: 'eyebrow' | 'title' | 'body' | 'ctaText' | 'ctaText2'
      ctx: ManageAiContext
    }> = [
      { key: 'eyebrow', ctx: 'title' },
      { key: 'title', ctx: 'title' },
      { key: 'body', ctx: 'excerpt' },
      { key: 'ctaText', ctx: 'title' },
      { key: 'ctaText2', ctx: 'title' },
    ]
    const cardFields: Array<{
      key: 'title' | 'subtitle' | 'priceLabel' | 'badge'
      ctx: ManageAiContext
    }> = [
      { key: 'title', ctx: 'title' },
      { key: 'subtitle', ctx: 'excerpt' },
      { key: 'priceLabel', ctx: 'title' },
      { key: 'badge', ctx: 'title' },
    ]

    let translatedFields = 0
    let errorCount = 0
    const updatedPopups: PopupItem[] = []

    for (const popup of config.popups) {
      const next: PopupItem = { ...popup }

      // Popup alanları paralel
      const popupResults = await Promise.all(
        popupFields.map(async (f) => {
          const src = (popup[f.key] ?? {})[primaryLocale]?.trim() ?? ''
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
        }),
      )
      for (const r of popupResults) {
        if (r) next[r.key] = { ...(popup[r.key] ?? {}), [bulkTargetLocale]: r.value }
      }

      // Kartlar — popup içinde sıralı, kart içinde paralel
      const updatedCards: PopupCampaignCard[] = []
      for (const card of popup.cards) {
        const cNext: PopupCampaignCard = { ...card }
        const cardResults = await Promise.all(
          cardFields.map(async (f) => {
            const src = (card[f.key] ?? {})[primaryLocale]?.trim() ?? ''
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
          }),
        )
        for (const r of cardResults) {
          if (r) cNext[r.key] = { ...(card[r.key] ?? {}), [bulkTargetLocale]: r.value }
        }
        updatedCards.push(cNext)
      }
      next.cards = updatedCards
      updatedPopups.push(next)
    }

    setConfig((c) => ({ ...c, popups: updatedPopups }))
    setEditLocale(bulkTargetLocale)
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
  }, [bulkTargetLocale, primaryLocale, config.popups, allLocales])

  // ── Vitrin önizleme yolu — ilk hedef sayfaya göre ────────
  const previewHref = useMemo(() => {
    // Önce etkin popup'ların hedeflediği ilk sayfaya bak; yoksa anasayfa
    const first = config.popups.find((p) => p.enabled) ?? config.popups[0]
    let pageKey = 'homepage'
    if (first) {
      const pages = first.targeting?.pages ?? []
      if (pages.length > 0 && pages[0] !== '*') pageKey = pages[0]
    }
    const internal = pageKey === 'homepage' ? '/' : `/${pageKey}`
    return vitrinPath(internal)
  }, [config.popups, vitrinPath])

  // Save / reset
  const save = useCallback(async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/popups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus({ type: 'success', msg: 'Kaydedildi.' })
        if (data.config) setConfig(data.config as PopupsConfig)
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
  }, [config, previewHref])

  const handleSave = useCallback(() => {
    submitIntentRef.current = 'save'
    void save()
  }, [save])

  const handleSaveAndShow = useCallback(() => {
    submitIntentRef.current = 'save-show'
    void save()
  }, [save])

  const resetAll = async () => {
    if (!confirm('Tüm popup yapılandırması silinecek. Onaylıyor musunuz?')) return
    setResetting(true)
    try {
      await fetch('/api/popups', { method: 'DELETE' })
      setConfig(EMPTY_POPUPS_CONFIG)
      setStatus({ type: 'success', msg: 'Sıfırlandı.' })
    } catch {
      setStatus({ type: 'error', msg: 'Sıfırlanamadı.' })
    } finally {
      setResetting(false)
      setTimeout(() => setStatus(null), 4000)
    }
  }

  const localeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const loc of allLocales) {
      counts[loc.code] = config.popups.filter((p) =>
        ['eyebrow', 'title', 'body', 'ctaText'].some(
          (k) => ((p[k as 'title'] ?? {})[loc.code] ?? '').trim().length > 0,
        ),
      ).length
    }
    return counts
  }, [config.popups, allLocales])

  const localeOptions = useMemo(
    () => allLocales.map((l) => ({ code: l.code, label: l.label, flag: l.flag })),
    [allLocales],
  )

  // ManageStickyLangBar tipi
  const langBarLocales = useMemo(
    () => allLocales.map((l) => ({ code: l.code, label: l.label, flag: l.flag })),
    [allLocales],
  )

  return (
    <div className="pb-28">
      {/* ── Üst sticky çubuğu: Geri · Başlık · Dil tabları · AI Çevir ── */}
      <ManageStickyLangBar
        backHref="/manage/admin"
        titlePrimary="Popup Yönetimi"
        titleSecondary={
          config.popups.length > 0
            ? `${config.popups.length} popup • ${config.popups.filter((p) => p.enabled).length} aktif`
            : 'Henüz popup tanımlanmamış'
        }
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
              disabled={loading || saving || config.popups.length === 0}
            />
          ) : null
        }
      />

      <div className={clsx(MANAGE_FORM_CONTAINER_CLASS, 'space-y-6 pt-4 sm:pt-6')}>
        {/* Yeni popup + Doluluk rozeti */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={addPopup}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-blue-400 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            <Plus className="h-4 w-4" /> Yeni Popup
          </button>

          {config.popups.length > 0 && (
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
                      filled === config.popups.length
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : filled > 0
                          ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                    }`}
                    title={`${loc.label}: ${filled}/${config.popups.length}`}
                  >
                    <span>{loc.flag}</span>
                    <span className="uppercase">{loc.code}</span>
                    <span>{filled}/{config.popups.length}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

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
      ) : config.popups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
          <ImageIcon className="mx-auto h-10 w-10 text-neutral-400" />
          <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Henüz popup tanımlanmamış
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            "Yeni Popup" düğmesi ile ilk kampanyanı oluştur — örneğin yaz kampanyası tanıtımı veya
            yılbaşı kutlaması.
          </p>
          <button
            type="button"
            onClick={addPopup}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> İlk popup'ı oluştur
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {config.popups.map((popup, idx) => (
            <PopupCard
              key={popup.id}
              popup={popup}
              index={idx}
              total={config.popups.length}
              editLocale={editLocale}
              primaryLocale={primaryLocale}
              onChange={(next) => updatePopup(popup.id, next)}
              onMove={(dir) => movePopup(popup.id, dir)}
              onRemove={() => removePopup(popup.id)}
              onDuplicate={() => duplicatePopup(popup.id)}
              onPreview={() => setPreviewing(popup)}
              onTranslateAll={() => translateAll(popup.id)}
              localeOptions={localeOptions}
            />
          ))}
        </div>
      )}

      {config.updatedAt && (
        <p className="text-center text-xs text-neutral-400">
          Son kayıt: {new Date(config.updatedAt).toLocaleString('tr-TR')}
        </p>
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
            onClick={() => void resetAll()}
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

      {/* Preview overlay */}
      {previewing && (
        <PopupView
          popup={previewing}
          locale={editLocale}
          onClose={() => setPreviewing(null)}
          onDismissForever={() => setPreviewing(null)}
        />
      )}
    </div>
  )
}
