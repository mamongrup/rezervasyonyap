import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import type { HotelFacilityAccordionSection } from '@/lib/hotel-facility-sections'

export type HotelVitrinFaqItem = { q: string; a: string }

export type HotelVitrinMeta = {
  general_terms_html?: string | null
  facility_sections?: HotelFacilityAccordionSection[] | null
  faq_items?: HotelVitrinFaqItem[] | null
}

export function parseHotelVitrinMeta(raw: unknown): HotelVitrinMeta {
  const data = unwrapVerticalMetaPayload(raw)
  const general_terms_html =
    typeof data.general_terms_html === 'string' ? data.general_terms_html : ''
  const facility_sections = parseFacilitySections(data.facility_sections)
  const faq_items = parseFaqItems(data.faq_items)
  return {
    general_terms_html: general_terms_html.trim() || null,
    facility_sections: facility_sections.length > 0 ? facility_sections : null,
    faq_items: faq_items.length > 0 ? faq_items : null,
  }
}

function parseFacilitySections(raw: unknown): HotelFacilityAccordionSection[] {
  if (!Array.isArray(raw)) return []
  const out: HotelFacilityAccordionSection[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `section_${out.length + 1}`
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    if (!title) continue
    const badges = parseStringArray(o.badges)
    const items = parseStringArray(o.items)
    const bodyHtml = typeof o.bodyHtml === 'string' ? o.bodyHtml : typeof o.body_html === 'string' ? o.body_html : null
    out.push({
      id,
      title,
      ...(badges.length > 0 ? { badges } : {}),
      ...(items.length > 0 ? { items } : {}),
      ...(bodyHtml?.trim() ? { bodyHtml: bodyHtml.trim() } : {}),
    })
  }
  return out
}

function parseFaqItems(raw: unknown): HotelVitrinFaqItem[] {
  if (!Array.isArray(raw)) return []
  const out: HotelVitrinFaqItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const q = typeof o.q === 'string' ? o.q.trim() : ''
    const a = typeof o.a === 'string' ? o.a.trim() : ''
    if (q && a) out.push({ q, a })
  }
  return out
}

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

export function serializeHotelVitrinMeta(meta: HotelVitrinMeta): Record<string, unknown> {
  return {
    general_terms_html: meta.general_terms_html?.trim() || null,
    facility_sections: (meta.facility_sections ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      badges: s.badges ?? [],
      items: s.items ?? [],
      bodyHtml: s.bodyHtml?.trim() || null,
    })),
    faq_items: (meta.faq_items ?? []).map((item) => ({ q: item.q.trim(), a: item.a.trim() })),
  }
}
