import { slugifyAsciiHyphenSlug } from '@/lib/slug-latin-tr'

/** Yönetim / AI içi etiketler — vitrinde gösterilmez. */
const INTERNAL_PREFIXES = ['ai-', 'ai_', 'location:', 'location_', 'system:', 'internal:'] as const

/** Kategori rozeti zaten gösterildiği için tekrar etiket olarak çıkmaz. */
const CATEGORY_MARKER_TAGS = new Set(['gezi-fikirleri', 'favori-mekanlar'])

const TITLE_TOPIC_SUFFIXES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\s+gezilecek\s+pop[uü]ler\s+yerler$/i, tag: 'populer-yerler' },
  { pattern: /\s+favori\s+mekanlar\s+rehberi$/i, tag: 'favori-mekanlar' },
  { pattern: /\s+hafta\s+sonu\s+gezi\s+rotas[iı]$/i, tag: 'hafta-sonu-rotasi' },
  { pattern: /\s+gezilecek\s+yerler$/i, tag: 'gezilecek-yerler' },
  { pattern: /\s+gezi\s+rehberi$/i, tag: 'gezi-rehberi' },
  { pattern: /\s+tatil\s+ve\s+konaklama\s+[iı]pu[cç]lar[iı]$/i, tag: 'tatil-ipuclari' },
  { pattern: /\s+tatil\s+[iı]pu[cç]lar[iı]$/i, tag: 'tatil-ipuclari' },
]

const SLUG_TOPIC_SUFFIXES = [
  'gezilecek-yerler',
  'gezi-rehberi',
  'tatil-ipuclari',
  'favori-mekanlar',
  'populer-yerler',
  'hafta-sonu-rotasi',
] as const

function isInternalBlogTag(tag: string): boolean {
  const t = tag.trim().toLowerCase()
  if (!t) return true
  if (INTERNAL_PREFIXES.some((p) => t.startsWith(p))) return true
  if (t.includes(':')) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return true
  return false
}

export function isPublicBlogTag(tag: string): boolean {
  const t = tag.trim().toLowerCase()
  if (!t || isInternalBlogTag(t)) return false
  if (CATEGORY_MARKER_TAGS.has(t)) return false
  return true
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const t = raw.trim().toLowerCase()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** Başlık / slug’dan yer + konu etiketleri (eski teknik-etiketli yazılar için). */
export function deriveBlogTagsFromTitleAndSlug(title: string, slug: string): string[] {
  const tags: string[] = []
  let placeTitle = (title || '').trim()
  let topic = ''

  for (const { pattern, tag } of TITLE_TOPIC_SUFFIXES) {
    if (pattern.test(placeTitle)) {
      topic = tag
      placeTitle = placeTitle.replace(pattern, '').trim()
      break
    }
  }

  const place = slugifyAsciiHyphenSlug(placeTitle)
  if (place) tags.push(place)

  let slugRest = (slug || '').trim().toLowerCase()
  for (const suffix of SLUG_TOPIC_SUFFIXES) {
    if (slugRest.endsWith(`-${suffix}`)) {
      if (!topic) topic = suffix
      slugRest = slugRest.slice(0, -(suffix.length + 1))
      break
    }
  }

  // slug_path son segmenti (tr-hakkari-cukurca → cukurca) yer adını güçlendirir
  const segments = slugRest.split('-').filter(Boolean)
  if (segments.length > 0) {
    const last = segments[segments.length - 1]
    if (last && !tags.includes(last) && last.length > 2 && !['tr', 'turkey', 'turkiye'].includes(last)) {
      // Başlıktan gelen yer etiketi yoksa veya farklıysa ekle
      if (!place) tags.push(last)
    }
    // İl segmenti: ...-hakkari-cukurca
    if (segments.length >= 2) {
      const province = segments[segments.length - 2]
      if (
        province &&
        province.length > 2 &&
        !tags.includes(province) &&
        !['tr', 'turkey', 'turkiye'].includes(province)
      ) {
        tags.push(province)
      }
    }
  }

  if (topic) tags.push(topic)
  return dedupeTags(tags)
}

/**
 * Vitrinde gösterilecek etiketler.
 * Teknik AI/location etiketleri ve kategori işaretleri elenir;
 * yalnızca bunlar kaldıysa başlık/slug’dan mantıklı etiket üretilir.
 */
export function resolvePublicBlogTags(
  rawTags: string[],
  opts: { title?: string; slug?: string } = {},
): string[] {
  const fromJson = dedupeTags(rawTags.filter(isPublicBlogTag))
  if (fromJson.length > 0) return fromJson
  return deriveBlogTagsFromTitleAndSlug(opts.title ?? '', opts.slug ?? '')
}
