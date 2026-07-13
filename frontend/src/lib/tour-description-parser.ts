/** Wtatil tur açıklamasını program + bilgi bölümlerine ayırır ve SEO dostu HTML üretir. */

export type TourInfoSection = {
  id: string
  title: string
  html: string
}

export type ParsedTourDescription = {
  programHtml: string
  infoSections: TourInfoSection[]
}

type SectionDef = {
  id: string
  title: string
  pattern: RegExp
}

/** Tur detay sayfasında bilgi bölümlerinin gösterim sırası */
export const TOUR_INFO_SECTION_DISPLAY_ORDER = [
  'tour-section-general-terms',
  'tour-section-guide-extras',
  'tour-section-paid',
  'tour-section-free',
  'tour-section-visa',
  'tour-section-flights-info',
  'tour-section-cancellation',
  'tour-section-other',
] as const

const INFO_SECTION_DEFS: SectionDef[] = [
  {
    id: 'tour-section-general-terms',
    title: 'Genel Şartlar',
    pattern: /(?:^|\s|[.)])\s*(?:GENEL\s*ŞARTLAR|Genel\s*Şartlar)/i,
  },
  {
    id: 'tour-section-guide-extras',
    title: 'Rehberlik Hizmetleri ve Ekstra Turlar',
    pattern: /(?:^|\s|[.)])\s*Rehberlik\s*Hizmetleri\s*ve\s*Ekstra\s*Turlar/i,
  },
  { id: 'tour-section-paid', title: 'Ücretli', pattern: /(?:^|\n)\s*Ücretli\s*:/i },
  {
    id: 'tour-section-free',
    title: 'Ücretsiz',
    pattern: /(?:^|\n)\s*(?:Ücretsiz|Dahil)\s*:/i,
  },
  {
    id: 'tour-section-visa',
    title: 'Vize ve Pasaport',
    pattern: /(?:^|\s|[.)])\s*Vize\s*ve\s*Pasaport/i,
  },
  {
    id: 'tour-section-flights-info',
    title: 'Uçuşlar Hakkında',
    pattern: /(?:^|\s|[.)])\s*Uçuşlar\s*Hakkında/i,
  },
  {
    id: 'tour-section-cancellation',
    title: 'İptal ve değişiklik',
    pattern: /(?:^|\s|[.)])\s*İptal\s*ve\s*değişiklik/i,
  },
  {
    id: 'tour-section-other',
    title: 'Diğer Hususlar',
    pattern: /(?:^|\s|[.)])\s*Diğer\s*Hususlar/i,
  },
]

/** Uçuş tablosu: «Uçuşlar Hakkında» varsa hemen sonra, yoksa «Diğer Hususlar» öncesi */
export function tourFlightScheduleInsertAfterSectionId(sections: Pick<TourInfoSection, 'id'>[]): string | undefined {
  if (sections.some((s) => s.id === 'tour-section-flights-info')) return 'tour-section-flights-info'
  const otherIdx = sections.findIndex((s) => s.id === 'tour-section-other')
  if (otherIdx > 0) return sections[otherIdx - 1]?.id
  if (sections.length > 0) return sections[sections.length - 1]?.id
  return undefined
}

export function sortTourInfoSections(sections: TourInfoSection[]): TourInfoSection[] {
  const order = TOUR_INFO_SECTION_DISPLAY_ORDER as readonly string[]
  return [...sections].sort((a, b) => {
    const ia = order.indexOf(a.id)
    const ib = order.indexOf(b.id)
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
  })
}

const FLIGHT_FOOTNOTE_LINES = [/^Kalkış ve varış saatleri yerel saatlerdir/i, /^Gruplarda fiyatlar geçerli değildir/i]

const DAY_HEADING_RE = /(?:^|\n)\s*(\d+)\.?\s*Gün\s*:?\s*([^\n]+)/gi

/** Wtatil marka adını sitede gösterilecek alan adıyla değiştirir. */
export function replaceTourBrandName(text: string): string {
  return text
    .replace(/Wtatil\s*[''´`]\s*(den|dan|de|da|nin|nın|nun|nün|yi|yı|yu|yü)/gi, "rezervasyonyap.com.tr'$1")
    .replace(/Wtatil/gi, 'rezervasyonyap.com.tr')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function normalizePlain(raw: string): string {
  return replaceTourBrandName(
    raw
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/[ \u00a0]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

function decodeHtmlEntities(raw: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    // Wtatil tur programında başlık ve gövde ayıracı olarak kullanılıyor.
    nbsp: ' ',
    quot: '"',
  }
  let text = raw
  for (let pass = 0; pass < 3; pass++) {
    const next = text.replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, (full, entity: string) => {
      const key = entity.toLowerCase()
      if (key.startsWith('#x')) {
        const code = Number.parseInt(key.slice(2), 16)
        return Number.isFinite(code) ? String.fromCodePoint(code) : full
      }
      if (key.startsWith('#')) {
        const code = Number.parseInt(key.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : full
      }
      return named[key] ?? full
    })
    if (next === text) break
    text = next
  }
  return text
}

function stripHtmlTags(raw: string): string {
  return decodeHtmlEntities(
    raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:div|h[1-6]|li|p|section|article)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+(?=\d+\s*\.?\s*Gün\s*:?)/gi, '\n')
}

function isSectionBoundary(plain: string, index: number): boolean {
  const before = plain.slice(Math.max(0, index - 24), index)
  return !/\d+\-\s*$/.test(before)
}

function findSectionMarkers(plain: string, from = 0): Array<{ index: number; def: SectionDef; matchLen: number }> {
  const markers: Array<{ index: number; def: SectionDef; matchLen: number }> = []

  for (const def of INFO_SECTION_DEFS) {
    const re = new RegExp(
      def.pattern.source,
      def.pattern.flags.includes('g') ? def.pattern.flags : `${def.pattern.flags}g`
    )
    const slice = plain.slice(from)
    for (const match of slice.matchAll(re)) {
      if (match.index == null) continue
      const index = from + match.index
      if (!isSectionBoundary(plain, index)) continue
      markers.push({ index, def, matchLen: match[0].length })
    }
  }

  markers.sort(
    (a, b) =>
      a.index - b.index ||
      INFO_SECTION_DEFS.findIndex((d) => d.id === a.def.id) - INFO_SECTION_DEFS.findIndex((d) => d.id === b.def.id)
  )

  const deduped: typeof markers = []
  for (const marker of markers) {
    const prev = deduped[deduped.length - 1]
    if (prev && marker.index === prev.index) continue
    deduped.push(marker)
  }

  return deduped
}

function findFirstInfoSectionIndex(plain: string): { index: number; def: SectionDef } | null {
  const markers = findSectionMarkers(plain)
  return markers[0] ? { index: markers[0].index, def: markers[0].def } : null
}

function extractFlightFootnotes(text: string): { body: string; footnotes: string[] } {
  const lines = text.replace(/\r/g, '').split('\n')
  const kept: string[] = []
  const footnotes: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      kept.push('')
      continue
    }
    if (FLIGHT_FOOTNOTE_LINES.some((re) => re.test(trimmed))) {
      footnotes.push(trimmed)
      continue
    }
    kept.push(line)
  }

  return {
    body: kept
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    footnotes,
  }
}

function stripLeadingClauseNumber(text: string): string {
  return text.replace(/^\d+\-\s*/, '').trim()
}

function splitNumberedClauses(body: string, sectionTitle: string): string[] {
  const plain = normalizePlain(body)
  if (!plain) return []

  let rest = plain
    .replace(new RegExp(`^${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*`, 'i'), '')
    .trim()

  const parts = rest
    .split(/\s+(?=\d+\-\s)/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return []

  return parts.map((part) => stripLeadingClauseNumber(part)).filter(Boolean)
}

function splitLineList(body: string, sectionTitle: string): string[] {
  const plain = normalizePlain(body)
  const lines = plain
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const first = lines[0].replace(new RegExp(`^${sectionTitle}\\s*:?\\s*`, 'i'), '').trim()
  const items: string[] = []

  if (first) {
    items.push(first)
  }

  for (let i = 1; i < lines.length; i++) {
    items.push(lines[i])
  }

  return items.filter(Boolean)
}

function formatInfoSectionBody(body: string, sectionTitle: string, kind: 'numbered' | 'list'): string {
  const items = kind === 'list' ? splitLineList(body, sectionTitle) : splitNumberedClauses(body, sectionTitle)

  if (items.length === 0) {
    const plain = normalizePlain(body)
    if (!plain) return ''
    return `<p class="text-sm leading-snug text-neutral-700 dark:text-neutral-300">${escapeHtml(plain)}</p>`
  }

  if (items.length === 1 && kind === 'numbered') {
    return `<p class="text-sm leading-snug text-neutral-700 dark:text-neutral-300">${escapeHtml(items[0])}</p>`
  }

  return `<ul class="mt-0 list-disc space-y-1.5 ps-5 text-sm leading-snug text-neutral-700 dark:text-neutral-300">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`
}

function formatProgramHtml(raw: string): string {
  const plain = normalizePlain(stripHtmlTags(raw))
  if (!plain) return ''

  const matches = [...plain.matchAll(DAY_HEADING_RE)]
  if (matches.length === 0) {
    return `<div class="space-y-3 text-sm font-normal leading-relaxed text-neutral-700 dark:text-neutral-300">${plain
      .split('\n\n')
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
      .join('')}</div>`
  }

  const articles: string[] = []

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const dayNum = (match[1] ?? '').trim()
    const title = (match[2] ?? '').trim()
    const dayHeading = dayNum ? `${dayNum}.Gün ${title}` : title
    const start = (match.index ?? 0) + match[0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? plain.length) : plain.length
    let dayBody = normalizePlain(plain.slice(start, end))
    if (i === matches.length - 1) {
      dayBody = dayBody.replace(/Konaklama\s*;[\s\S]*/i, '').trim()
    }

    articles.push(
      `<article class="space-y-2"><h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">${escapeHtml(dayHeading)}</h3>${
        dayBody
          ? `<p class="text-sm font-normal leading-relaxed text-neutral-700 dark:text-neutral-300">${escapeHtml(dayBody)}</p>`
          : ''
      }</article>`
    )
  }

  const lastMatch = matches[matches.length - 1]
  const afterLastDayStart = (lastMatch.index ?? 0) + lastMatch[0].length
  const afterLastDay = normalizePlain(plain.slice(afterLastDayStart))
  const konaklamaMatch = afterLastDay.match(/Konaklama\s*;?\s*([\s\S]*)/i)
  if (konaklamaMatch?.[1]?.trim()) {
    const note = normalizePlain(konaklamaMatch[1])
    articles.push(
      `<aside class="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"><h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Konaklama</h3><p class="mt-1 text-sm leading-snug text-neutral-700 dark:text-neutral-300">${escapeHtml(note)}</p></aside>`
    )
  }

  return `<div class="space-y-5">${articles.join('')}</div>`
}

/** Ham açıklamayı (uçuş tablosu çıkarılmış) program + bilgi kartlarına böler. */
export function parseTourDescription(raw: string): ParsedTourDescription {
  if (!raw.trim()) {
    return { programHtml: '', infoSections: [] }
  }

  const plain = normalizePlain(stripHtmlTags(raw))
  const firstSection = findFirstInfoSectionIndex(plain)

  let programRaw = firstSection ? plain.slice(0, firstSection.index) : plain
  let infoPlain = firstSection ? plain.slice(firstSection.index) : ''

  const { body: programWithoutFootnotes, footnotes } = extractFlightFootnotes(programRaw)
  programRaw = programWithoutFootnotes

  const sections: TourInfoSection[] = []
  const markers = findSectionMarkers(infoPlain)

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const bodyStart = marker.index + marker.matchLen
    const bodyEnd = i + 1 < markers.length ? markers[i + 1].index : infoPlain.length
    const body = infoPlain.slice(bodyStart, bodyEnd).trim()
    const kind = marker.def.id === 'tour-section-paid' || marker.def.id === 'tour-section-free' ? 'list' : 'numbered'
    let html = formatInfoSectionBody(body, marker.def.title, kind)

    if (marker.def.id === 'tour-section-flights-info' && footnotes.length > 0) {
      const notesHtml = footnotes
        .map((note) => `<p class="text-sm leading-snug text-neutral-700 dark:text-neutral-300">${escapeHtml(note)}</p>`)
        .join('')
      html = notesHtml + html
    }

    if (html.trim()) {
      sections.push({ id: marker.def.id, title: marker.def.title, html })
    }
  }

  if (footnotes.length > 0 && !sections.some((s) => s.id === 'tour-section-flights-info')) {
    sections.push({
      id: 'tour-section-flights-info',
      title: 'Uçuşlar Hakkında',
      html: footnotes
        .map((note) => `<p class="text-sm leading-snug text-neutral-700 dark:text-neutral-300">${escapeHtml(note)}</p>`)
        .join(''),
    })
  }

  return {
    programHtml: formatProgramHtml(programRaw),
    infoSections: sortTourInfoSections(sections),
  }
}
