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
  generalTermsItems?: string[]
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

function textFromHtml(html: string): string {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanBodyFragment(html: string): string {
  let out = String(html ?? '')
    .replace(/^(\s|<br\s*\/?>|<\/p>|<\/div>)+/gi, '')
    .replace(/(<p[^>]*>\s*)+$/gi, '')
    .trim()
  if (!out) return ''
  if (!/^<(p|div|ul|ol|table|blockquote)\b/i.test(out)) out = `<p>${out}</p>`
  return out
}

function splitBodyHtmlByHeadings(section: HotelFacilityAccordionSection): HotelFacilityAccordionSection[] {
  const html = section.bodyHtml?.trim()
  if (!html) return [section]

  const headingPattern = /<(h[1-6]|strong|b)[^>]*>([\s\S]*?)<\/\1>/gi
  const matches = [...html.matchAll(headingPattern)]
    .map((match) => ({
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      title: textFromHtml(match[2] ?? ''),
    }))
    .filter((match) => match.title.length >= 3 && match.title.length <= 100)

  if (matches.length < 2) return [section]

  const out: HotelFacilityAccordionSection[] = []
  const introHtml = cleanBodyFragment(html.slice(0, matches[0].index))
  if (textFromHtml(introHtml)) {
    out.push({
      ...section,
      bodyHtml: introHtml,
    })
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const bodyHtml = cleanBodyFragment(html.slice(current.end, next?.index ?? html.length))
    if (!textFromHtml(bodyHtml)) continue
    out.push({
      id: `${section.id}-${i + 1}`,
      title: current.title,
      bodyHtml,
    })
  }

  return out.length > 1 ? out : [section]
}

export function expandHotelFacilitySections(
  sections: readonly HotelFacilityAccordionSection[],
): HotelFacilityAccordionSection[] {
  return sections.flatMap(splitBodyHtmlByHeadings)
}

export function buildHotelFacilityAccordionContent(input: {
  handle: string
  amenityKeys: readonly string[]
  amenityLabels: Record<string, string>
  campaignBadges?: readonly string[]
  generalTermsTitle: string
  generalTermsItems?: readonly string[]
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

  const filtered = expandHotelFacilitySections(sections).filter(sectionHasContent)
  // Sağlayıcıdan gelen summary alanı ilan tanıtımıdır; çoğu zaman başka dilde,
  // bozuk/kaçışlı HTML ile gelir ve "Genel Şartlar" değildir. Genel şartlar
  // gerçek, yapılandırılmış rezervasyon kurallarından ve sayfa dilinde üretilir.
  const generalTermsHtml = isDemo ? HOTEL_DEMO_GENERAL_TERMS_HTML : null
  const generalTermsItems = [...new Set((input.generalTermsItems ?? []).map((x) => x.trim()).filter(Boolean))]

  if (filtered.length === 0 && !generalTermsHtml?.trim() && generalTermsItems.length === 0) return null

  return {
    sections: filtered,
    generalTermsTitle: input.generalTermsTitle,
    generalTermsHtml,
    generalTermsItems,
  }
}
