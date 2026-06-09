import type { CategoryAccommodationRuleItem } from '@/lib/travel-api'
import {
  HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID,
} from '@/lib/holiday-home-rule-codes'
import type { StayBookingRules } from '@/types/listing-types'

export type ListingAccommodationRulesPayload = {
  rules: CategoryAccommodationRuleItem[]
  selectedIds: string[]
  checkInTime?: string
  checkOutTime?: string
  ruleCodes?: string[]
}

export type AccommodationRuleLine = {
  type: 'ok' | 'warn'
  text: string
}

type DetailPageRuleMessages = {
  checkInRuleTemplate: string
  checkOutRuleTemplate: string
  minStayRule?: string
  minAdvanceRule?: string
  shortStayFeeRule?: string
}

function normalizeTime(raw: string | undefined | null): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{1,2}:\d{2})/)
  return m ? m[1] : s
}

function fillTemplate(template: string, time: string): string {
  return template.replace(/\{time\}/g, time)
}

function pickRuleLabel(rule: CategoryAccommodationRuleItem, localeLang: string): string {
  return (
    rule.labels[localeLang]?.trim() ||
    rule.labels.tr?.trim() ||
    rule.labels.en?.trim() ||
    Object.values(rule.labels).find((s) => s.trim()) ||
    ''
  )
}

function resolveSelectedRuleIds(payload: ListingAccommodationRulesPayload | null): Set<string> {
  const selected = new Set(payload?.selectedIds ?? [])
  if (selected.size > 0) return selected

  for (const code of payload?.ruleCodes ?? []) {
    const id = HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID[String(code).trim()]
    if (id) selected.add(id)
  }
  return selected
}

/** Vitrin «Konaklama kuralları» satırları — giriş/çıkış, şablon kurallar, rezervasyon koşulları */
export function buildListingAccommodationRuleLines(
  payload: ListingAccommodationRulesPayload | null,
  opts: {
    localeLang: string
    messages: DetailPageRuleMessages
    stayBookingRules?: StayBookingRules
    listingCurrency?: string
  },
): AccommodationRuleLine[] {
  const lines: AccommodationRuleLine[] = []
  const checkIn = normalizeTime(payload?.checkInTime)
  const checkOut = normalizeTime(payload?.checkOutTime)

  if (checkIn) {
    lines.push({ type: 'ok', text: fillTemplate(opts.messages.checkInRuleTemplate, checkIn) })
  }
  if (checkOut) {
    lines.push({ type: 'ok', text: fillTemplate(opts.messages.checkOutRuleTemplate, checkOut) })
  }

  const selected = resolveSelectedRuleIds(payload)
  if (payload && selected.size > 0) {
    for (const rule of payload.rules) {
      if (!selected.has(rule.id)) continue
      const text = pickRuleLabel(rule, opts.localeLang)
      if (!text) continue
      lines.push({ type: rule.severity === 'warn' ? 'warn' : 'ok', text })
    }
  }

  const rules = opts.stayBookingRules
  if (rules?.minStayNights != null && rules.minStayNights > 1 && opts.messages.minStayRule) {
    lines.push({
      type: 'ok',
      text: opts.messages.minStayRule.replace('{n}', String(rules.minStayNights)),
    })
  }
  if (
    rules?.minAdvanceBookingDays != null &&
    rules.minAdvanceBookingDays > 0 &&
    opts.messages.minAdvanceRule
  ) {
    lines.push({
      type: 'ok',
      text: opts.messages.minAdvanceRule.replace('{n}', String(rules.minAdvanceBookingDays)),
    })
  }
  if (
    rules?.shortStayFeeAmount != null &&
    rules.shortStayFeeAmount > 0 &&
    rules.minShortStayNights != null &&
    rules.minShortStayNights > 0 &&
    opts.messages.shortStayFeeRule
  ) {
    const cur = (opts.listingCurrency ?? 'TRY').trim().toUpperCase()
    lines.push({
      type: 'warn',
      text: opts.messages.shortStayFeeRule
        .replace('{n}', String(rules.minShortStayNights))
        .replace('{amount}', String(rules.shortStayFeeAmount))
        .replace('{currency}', cur),
    })
  }

  return lines
}

/** Giriş/çıkış satırları — otel bilgi kutusu ve SSS için */
export function formatListingCheckInOutLines(
  payload: ListingAccommodationRulesPayload | null,
  templates: { checkInRuleTemplate: string; checkOutRuleTemplate: string },
): { checkInLine: string | null; checkOutLine: string | null } {
  const checkIn = normalizeTime(payload?.checkInTime)
  const checkOut = normalizeTime(payload?.checkOutTime)
  return {
    checkInLine: checkIn ? fillTemplate(templates.checkInRuleTemplate, checkIn) : null,
    checkOutLine: checkOut ? fillTemplate(templates.checkOutRuleTemplate, checkOut) : null,
  }
}

/** Seçili konaklama kuralı metnini anahtar kelime ile bul (evcil hayvan, sigara vb.) */
export function findAccommodationRuleText(
  payload: ListingAccommodationRulesPayload | null,
  localeLang: string,
  pattern: RegExp,
): string | null {
  if (!payload) return null
  const selected = resolveSelectedRuleIds(payload)
  for (const rule of payload.rules) {
    if (!selected.has(rule.id)) continue
    const text = pickRuleLabel(rule, localeLang)
    if (!text) continue
    if (pattern.test(text)) return text
  }
  return null
}
