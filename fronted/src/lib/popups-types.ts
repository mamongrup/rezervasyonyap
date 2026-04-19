/**
 * Site geneli popup yapılandırma tipleri ve sanitizer.
 *
 * Tek bir JSON dosyasında (`public/popups/config.json`) tüm popup'lar listelenir.
 * Her popup; sayfa/ dil/ cihaz hedeflemesi, takvim, tetikleyici ve sıklık ayarları,
 * çoklu dilli içerik ve isteğe bağlı kampanya kartları içerir.
 *
 * Sunucu (API) ve istemci (renderer + editör) bu tipler etrafında çalışır.
 */

import { normalizeLocalizedText, type LocalizedText } from '@/lib/localized-text'

// ─── Enumerations ───────────────────────────────────────────────────────────

export type PopupPreset =
  | 'promo' /* Genel kampanya / tanıtım */
  | 'celebration' /* Kutlama (yılbaşı, doğum günü vs.) */
  | 'special_day' /* Özel günler (anneler/babalar günü, bayram) */
  | 'campaign' /* Kampanyalı ilanları sergileme */
  | 'newsletter' /* E-posta toplama */
  | 'announcement' /* Duyuru / bilgilendirme */

export type PopupLayout =
  | 'modal_center' /* Klasik modal — ortalanmış */
  | 'modal_split' /* Solda görsel + sağda içerik */
  | 'banner_bottom' /* Alt çubuk */
  | 'banner_top' /* Üst çubuk */
  | 'side_corner' /* Sağ alt köşe kutu */
  | 'fullscreen' /* Tüm ekran kaplayan */

export type PopupTextAlign = 'left' | 'center' | 'right'
export type PopupTheme = 'light' | 'dark'

export type PopupTrigger =
  | 'load' /* Sayfa yüklenir yüklenmez */
  | 'delay' /* `delayMs` sonra */
  | 'scroll' /* Sayfanın `scrollPercent`'i kaydırıldığında */
  | 'exit_intent' /* Kullanıcı sekmeyi kapatmak üzereyken */

export type PopupFrequency =
  | 'always' /* Her sayfa açılışında */
  | 'once_session' /* Oturum başına bir kez */
  | 'once_per_visitor' /* Bir kez gösterildikten sonra bir daha gösterilmez */
  | 'every_n_days' /* `everyNDays` günde bir */

export type PopupAudience = 'all' | 'guest' | 'logged_in' | 'returning' | 'first_visit'
export type PopupDevice = 'all' | 'desktop' | 'mobile'

// ─── Şema ───────────────────────────────────────────────────────────────────

export interface PopupCampaignCard {
  id: string
  imageUrl: string
  title: LocalizedText
  subtitle: LocalizedText
  /** Görüntülenecek fiyat etiketi — örn. "₺1.290'dan" (locale → metin) */
  priceLabel: LocalizedText
  href: string
  badge?: LocalizedText
}

export interface PopupTargeting {
  /** Sayfa anahtarları. Tek eleman `'*'` ise tüm sayfalar; aksi halde anahtar listesi. */
  pages: string[]
  /** Diller: `['*']` tüm diller veya `['tr','en',...]` */
  locales: string[]
  device: PopupDevice
  audience: PopupAudience
}

export interface PopupSchedule {
  /** ISO datetime — boşsa kısıtlama yok */
  startAt: string
  endAt: string
  /** 0=Pazar … 6=Cumartesi. Boş dizi → kısıtlama yok */
  daysOfWeek: number[]
  /** "HH:MM" — ikisi de doluysa o saatler arası göster */
  hourStart: string
  hourEnd: string
}

export interface PopupTriggerConfig {
  type: PopupTrigger
  /** trigger='delay' veya 'load' için: gösterimden önce beklenecek süre */
  delayMs: number
  /** trigger='scroll' için: 1..100 */
  scrollPercent: number
}

export interface PopupFrequencyConfig {
  mode: PopupFrequency
  everyNDays: number
}

export interface PopupItem {
  id: string
  enabled: boolean
  /** Yönetici etiketi — kullanıcıya gösterilmez */
  name: string
  preset: PopupPreset
  layout: PopupLayout
  priority: number

  // İçerik
  eyebrow?: LocalizedText
  title?: LocalizedText
  body?: LocalizedText
  ctaText?: LocalizedText
  ctaHref?: string
  ctaText2?: LocalizedText
  ctaHref2?: string

  // Görsel / tasarım
  imageUrl?: string
  mobileImageUrl?: string
  /** "#RRGGBB" — popup vurgu rengi */
  accentColor?: string
  theme: PopupTheme
  align: PopupTextAlign
  overlay: number /* 0..90 — fullscreen / modal arka plan karartma */
  /** Köşe ikonu / emoji (ör. "🎉", "🎂", "🌸") */
  icon?: string

  // Kampanya kartları (preset='campaign' için listeleme)
  cards: PopupCampaignCard[]

  // Bağlam ayarları
  targeting: PopupTargeting
  schedule: PopupSchedule
  trigger: PopupTriggerConfig
  frequency: PopupFrequencyConfig

  /** İçerideki "Bir daha gösterme" düğmesi var mı (kullanıcı kapattığında kalıcı sustur) */
  allowDismissForever: boolean
}

export interface PopupsConfig {
  popups: PopupItem[]
  updatedAt: string
}

export const EMPTY_POPUPS_CONFIG: PopupsConfig = { popups: [], updatedAt: '' }

// ─── Sanitize ──────────────────────────────────────────────────────────────

const PRESETS: PopupPreset[] = [
  'promo',
  'celebration',
  'special_day',
  'campaign',
  'newsletter',
  'announcement',
]
const LAYOUTS: PopupLayout[] = [
  'modal_center',
  'modal_split',
  'banner_bottom',
  'banner_top',
  'side_corner',
  'fullscreen',
]
const TRIGGERS: PopupTrigger[] = ['load', 'delay', 'scroll', 'exit_intent']
const FREQUENCIES: PopupFrequency[] = [
  'always',
  'once_session',
  'once_per_visitor',
  'every_n_days',
]
const AUDIENCES: PopupAudience[] = ['all', 'guest', 'logged_in', 'returning', 'first_visit']
const DEVICES: PopupDevice[] = ['all', 'desktop', 'mobile']

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, Math.round(v)))
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function safeString(value: unknown, max = 500, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback
}

function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const v = value.trim()
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback
}

function sanitizeIso(value: unknown): string {
  if (typeof value !== 'string') return ''
  const v = value.trim()
  if (!v) return ''
  const t = Date.parse(v)
  return Number.isFinite(t) ? new Date(t).toISOString() : ''
}

function sanitizeHHMM(value: unknown): string {
  if (typeof value !== 'string') return ''
  const m = value.trim().match(/^(\d{1,2}):(\d{1,2})$/)
  if (!m) return ''
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const mm = Math.min(59, Math.max(0, Number(m[2])))
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function sanitizeStringArray(value: unknown, maxItems = 50, maxLen = 96): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .slice(0, maxItems)
    .map((v) => v.trim().toLowerCase().slice(0, maxLen))
}

function sanitizePages(value: unknown): string[] {
  if (Array.isArray(value) && value.length === 1 && value[0] === '*') return ['*']
  const arr = sanitizeStringArray(value)
  if (arr.length === 0 || arr.includes('*')) return ['*']
  return arr
}

function sanitizeLocales(value: unknown): string[] {
  if (Array.isArray(value) && value.length === 1 && value[0] === '*') return ['*']
  const arr = sanitizeStringArray(value, 50, 12)
  if (arr.length === 0 || arr.includes('*')) return ['*']
  return arr
}

function sanitizeDays(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const out: number[] = []
  for (const v of value) {
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0 && n <= 6 && !out.includes(n)) {
      out.push(n)
    }
  }
  return out.sort((a, b) => a - b)
}

function sanitizeCard(raw: Record<string, unknown>, idx: number): PopupCampaignCard {
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `card-${idx}-${Date.now()}`,
    imageUrl: safeString(raw.imageUrl, 500),
    title: normalizeLocalizedText(raw.title, 200),
    subtitle: normalizeLocalizedText(raw.subtitle, 400),
    priceLabel: normalizeLocalizedText(raw.priceLabel, 80),
    href: safeString(raw.href, 500),
    badge: normalizeLocalizedText(raw.badge, 60),
  }
}

export function sanitizePopupItem(raw: Record<string, unknown>, idx: number): PopupItem {
  const targetingRaw = (raw.targeting ?? {}) as Record<string, unknown>
  const scheduleRaw = (raw.schedule ?? {}) as Record<string, unknown>
  const triggerRaw = (raw.trigger ?? {}) as Record<string, unknown>
  const frequencyRaw = (raw.frequency ?? {}) as Record<string, unknown>
  const cardsRaw = Array.isArray(raw.cards) ? (raw.cards as Array<Record<string, unknown>>) : []

  return {
    id:
      typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id.slice(0, 64)
        : `pop-${idx}-${Date.now().toString(36)}`,
    enabled: raw.enabled !== false,
    name: safeString(raw.name, 120, `Popup ${idx + 1}`),
    preset: pickEnum(raw.preset, PRESETS, 'promo'),
    layout: pickEnum(raw.layout, LAYOUTS, 'modal_center'),
    priority: clampInt(raw.priority, 0, 999, 50),

    eyebrow: normalizeLocalizedText(raw.eyebrow, 120),
    title: normalizeLocalizedText(raw.title, 220),
    body: normalizeLocalizedText(raw.body, 1200),
    ctaText: normalizeLocalizedText(raw.ctaText, 80),
    ctaHref: safeString(raw.ctaHref, 500),
    ctaText2: normalizeLocalizedText(raw.ctaText2, 80),
    ctaHref2: safeString(raw.ctaHref2, 500),

    imageUrl: safeString(raw.imageUrl, 500),
    mobileImageUrl: safeString(raw.mobileImageUrl, 500),
    accentColor: sanitizeColor(raw.accentColor, '#0EA5E9'),
    theme: raw.theme === 'dark' ? 'dark' : 'light',
    align: pickEnum(raw.align as PopupTextAlign, ['left', 'center', 'right'] as const, 'center'),
    overlay: clampInt(raw.overlay, 0, 90, 60),
    icon: safeString(raw.icon, 8),

    cards: cardsRaw.slice(0, 8).map((c, i) => sanitizeCard((c ?? {}) as Record<string, unknown>, i)),

    targeting: {
      pages: sanitizePages(targetingRaw.pages),
      locales: sanitizeLocales(targetingRaw.locales),
      device: pickEnum(targetingRaw.device, DEVICES, 'all'),
      audience: pickEnum(targetingRaw.audience, AUDIENCES, 'all'),
    },
    schedule: {
      startAt: sanitizeIso(scheduleRaw.startAt),
      endAt: sanitizeIso(scheduleRaw.endAt),
      daysOfWeek: sanitizeDays(scheduleRaw.daysOfWeek),
      hourStart: sanitizeHHMM(scheduleRaw.hourStart),
      hourEnd: sanitizeHHMM(scheduleRaw.hourEnd),
    },
    trigger: {
      type: pickEnum(triggerRaw.type, TRIGGERS, 'delay'),
      delayMs: clampInt(triggerRaw.delayMs, 0, 120_000, 4000),
      scrollPercent: clampInt(triggerRaw.scrollPercent, 1, 100, 40),
    },
    frequency: {
      mode: pickEnum(frequencyRaw.mode, FREQUENCIES, 'once_session'),
      everyNDays: clampInt(frequencyRaw.everyNDays, 1, 365, 7),
    },

    allowDismissForever: raw.allowDismissForever !== false,
  }
}

export function sanitizePopupsConfig(body: Record<string, unknown>): Omit<PopupsConfig, 'updatedAt'> {
  const list = Array.isArray(body.popups) ? (body.popups as Array<Record<string, unknown>>) : []
  return {
    popups: list.slice(0, 50).map((p, i) => sanitizePopupItem((p ?? {}) as Record<string, unknown>, i)),
  }
}

// ─── Public eligibility filtering ───────────────────────────────────────────

export interface EligibilityContext {
  pageKey: string
  locale: string
  /** Şu anki epoch ms — test için enjekte edilebilir */
  now: number
  /** İstemci tarafında dolu — sunucuda her zaman 'unknown' */
  device?: PopupDevice
}

/** Sunucu tarafı filtreleme: sayfa+dil+takvim. Cihaz/audience/sıklık istemcide. */
export function popupMatchesPageAndLocale(p: PopupItem, ctx: EligibilityContext): boolean {
  if (!p.enabled) return false
  const t = p.targeting
  if (t.pages[0] !== '*' && !t.pages.includes(ctx.pageKey.toLowerCase())) return false
  if (t.locales[0] !== '*' && !t.locales.includes(ctx.locale.toLowerCase())) return false
  return popupScheduleActive(p, ctx.now)
}

export function popupScheduleActive(p: PopupItem, now: number): boolean {
  const s = p.schedule
  if (s.startAt) {
    const t = Date.parse(s.startAt)
    if (Number.isFinite(t) && now < t) return false
  }
  if (s.endAt) {
    const t = Date.parse(s.endAt)
    if (Number.isFinite(t) && now > t) return false
  }
  if (s.daysOfWeek.length > 0) {
    const dow = new Date(now).getDay()
    if (!s.daysOfWeek.includes(dow)) return false
  }
  if (s.hourStart && s.hourEnd) {
    const d = new Date(now)
    const cur = d.getHours() * 60 + d.getMinutes()
    const [sh, sm] = s.hourStart.split(':').map(Number)
    const [eh, em] = s.hourEnd.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (start <= end) {
      if (cur < start || cur > end) return false
    } else {
      // Gece yarısını aşan aralık (örn. 22:00 → 02:00)
      if (cur < start && cur > end) return false
    }
  }
  return true
}
