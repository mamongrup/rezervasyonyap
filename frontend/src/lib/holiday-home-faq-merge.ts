/**
 * Tatil evi vitrin SSS — şablon (`site_settings.catalog.holiday_home_default_faq`)
 * + ilan bazlı dikey meta (`vertical_holiday_home.data.faq`).
 */

export type HolidayHomeFaqLocalizedMap = Record<string, string>

export type HolidayHomeFaqStoredItem = {
  id: string
  question: HolidayHomeFaqLocalizedMap | string
  answer: HolidayHomeFaqLocalizedMap | string
}

export type HolidayHomeFaqTemplatePayload = {
  items: HolidayHomeFaqStoredItem[]
}

export type HolidayHomeFaqListingOverlay = {
  hidden_template_ids?: string[]
  extra_items?: HolidayHomeFaqStoredItem[]
}

export type HolidayHomeFaqAccordionItem = { q: string; a: string }

function langKey(locale: string): string {
  return locale.split('-')[0]?.trim().toLowerCase() || 'tr'
}

/** Tek bir çok dilli veya düz metin alanından vitrin metni seçer. */
export function pickHolidayHomeFaqText(
  val: HolidayHomeFaqLocalizedMap | string | undefined | null,
  locale: string,
): string {
  if (val == null) return ''
  if (typeof val === 'string') return val.trim()
  const lk = langKey(locale)
  const ordered = [lk, 'tr', 'en', 'de', 'ru', 'fr', 'zh']
  for (const k of ordered) {
    const s = val[k]
    if (typeof s === 'string' && s.trim()) return s.trim()
  }
  for (const v of Object.values(val)) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function normalizeStoredItem(raw: unknown): HolidayHomeFaqStoredItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : ''
  if (!id) return null
  let question: HolidayHomeFaqStoredItem['question'] = {}
  let answer: HolidayHomeFaqStoredItem['answer'] = {}
  if (typeof o.question === 'string') {
    question = { tr: o.question }
  } else if (o.question && typeof o.question === 'object' && !Array.isArray(o.question)) {
    question = o.question as HolidayHomeFaqLocalizedMap
  }
  if (typeof o.answer === 'string') {
    answer = { tr: o.answer }
  } else if (o.answer && typeof o.answer === 'object' && !Array.isArray(o.answer)) {
    answer = o.answer as HolidayHomeFaqLocalizedMap
  }
  return { id, question, answer }
}

export function parseHolidayHomeFaqTemplatePayload(raw: unknown): HolidayHomeFaqTemplatePayload {
  if (!raw || typeof raw !== 'object') return { items: [] }
  const arr = (raw as { items?: unknown }).items
  if (!Array.isArray(arr)) return { items: [] }
  const items = arr.map(normalizeStoredItem).filter((x): x is HolidayHomeFaqStoredItem => x != null)
  return { items }
}

export function parseHolidayHomeFaqListingOverlay(raw: unknown): HolidayHomeFaqListingOverlay {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const hid = o.hidden_template_ids
  const hidden_template_ids = Array.isArray(hid)
    ? hid.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
    : undefined
  const ex = o.extra_items
  const extra_items = Array.isArray(ex)
    ? ex.map(normalizeStoredItem).filter((x): x is HolidayHomeFaqStoredItem => x != null)
    : undefined
  return {
    ...(hidden_template_ids?.length ? { hidden_template_ids } : {}),
    ...(extra_items?.length ? { extra_items } : {}),
  }
}

/** Şablon + ilan üzerindeki gizleme / ekstra maddeler → vitrin satırları */
export function mergeHolidayHomeListingFaqs(
  templatePayload: HolidayHomeFaqTemplatePayload | null | undefined,
  overlay: HolidayHomeFaqListingOverlay | null | undefined,
  locale: string,
): HolidayHomeFaqAccordionItem[] {
  const hidden = new Set(overlay?.hidden_template_ids ?? [])
  const out: HolidayHomeFaqAccordionItem[] = []

  for (const it of templatePayload?.items ?? []) {
    if (!it.id || hidden.has(it.id)) continue
    const q = pickHolidayHomeFaqText(it.question, locale)
    const a = pickHolidayHomeFaqText(it.answer, locale)
    if (q && a) out.push({ q, a })
  }

  for (const it of overlay?.extra_items ?? []) {
    const q = pickHolidayHomeFaqText(it.question, locale)
    const a = pickHolidayHomeFaqText(it.answer, locale)
    if (q && a) out.push({ q, a })
  }

  return out
}
