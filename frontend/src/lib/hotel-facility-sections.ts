import {
  HOTEL_DEMO_FACILITY_SECTIONS,
  HOTEL_DEMO_GENERAL_TERMS_HTML,
  HOTEL_DEMO_LISTING_HANDLE,
} from '@/lib/hotel-detail-demo-content'

export type HotelFacilityAccordionSection = {
  id: string
  title: string
  badges?: string[]
  items?: string[]
  bodyHtml?: string | null
}

export type HotelFacilityAccordionContent = {
  sections: HotelFacilityAccordionSection[]
  generalTermsTitle: string
  generalTermsHtml?: string | null
}

function sectionHasContent(section: HotelFacilityAccordionSection): boolean {
  return Boolean(
    (section.badges?.length ?? 0) > 0 ||
      (section.items?.length ?? 0) > 0 ||
      section.bodyHtml?.trim(),
  )
}

export function isHotelDistanceFacilitySection(section: HotelFacilityAccordionSection): boolean {
  const id = String(section.id ?? '').trim().toLowerCase()
  const title = String(section.title ?? '').trim().toLowerCase()
  return (
    id === 'distances' ||
    id === 'distance' ||
    id.includes('distance') ||
    id.includes('mesafe') ||
    title === 'mesafeler' ||
    title.includes('distance')
  )
}

export function buildHotelFacilityAccordionContent(input: {
  handle: string
  amenityKeys: readonly string[]
  amenityLabels: Record<string, string>
  campaignBadges?: readonly string[]
  generalTermsTitle: string
  /** Panel `vertical_hotel` meta */
  vitrinMeta?: {
    general_terms_html?: string | null
    facility_sections?: HotelFacilityAccordionSection[] | null
  } | null
  excludeDistanceSections?: boolean
  /** API / panel gelene kadar demo otel fallback */
  useDemoFallback?: boolean
}): HotelFacilityAccordionContent | null {
  const amenityItems = input.amenityKeys
    .map((key) => input.amenityLabels[key] ?? key.replace(/_/g, ' '))
    .filter(Boolean)

  const badges = [...new Set((input.campaignBadges ?? []).map((b) => b.trim()).filter(Boolean))]

  const sections: HotelFacilityAccordionSection[] = []

  if (amenityItems.length > 0 || badges.length > 0) {
    sections.push({
      id: 'facility_features',
      title: 'Tesis Özellikleri',
      badges,
      items: amenityItems,
    })
  }

  const isDemo = input.useDemoFallback !== false && input.handle === HOTEL_DEMO_LISTING_HANDLE

  if (isDemo) {
    for (const demo of HOTEL_DEMO_FACILITY_SECTIONS) {
      if (demo.id === 'facility_features') continue
      sections.push({ ...demo })
    }
  }

  for (const extra of input.vitrinMeta?.facility_sections ?? []) {
    if (extra.id === 'facility_features') continue
    if (input.excludeDistanceSections && isHotelDistanceFacilitySection(extra)) continue
    if (sectionHasContent(extra)) sections.push({ ...extra })
  }

  const filtered = sections.filter(sectionHasContent)
  const generalTermsHtml =
    input.vitrinMeta?.general_terms_html?.trim() ||
    (isDemo ? HOTEL_DEMO_GENERAL_TERMS_HTML : null)

  if (filtered.length === 0 && !generalTermsHtml?.trim()) return null

  return {
    sections: filtered,
    generalTermsTitle: input.generalTermsTitle,
    generalTermsHtml,
  }
}
