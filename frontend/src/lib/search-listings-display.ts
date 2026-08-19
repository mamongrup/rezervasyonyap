import type { PublicListingItem } from '@/lib/travel-api'

const DETAIL_SEGMENT: Record<string, string> = {
  hotel: 'otel',
  holiday_home: 'tatil-evi',
  yacht_charter: 'yat',
  tour: 'tur',
  activity: 'aktivite',
  cruise: 'gemi-turu',
  transfer: 'tasima',
  car_rental: 'arac',
  ferry: 'feribot-rezervasyon',
  hajj: 'hac-paket',
  visa: 'vize-basvuru',
  flight: 'ucak-ilan',
}

export const SEARCH_MIN_QUERY_LEN = 3

function normalizeSlugKey(slug: string): string {
  return slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function isSlugLikeTitle(title: string, slug: string): boolean {
  const t = title.trim().toLowerCase()
  const s = slug.trim().toLowerCase()
  if (!t || !s) return false
  return t === s || t.replace(/\s+/g, '-') === s || t.replace(/[^a-z0-9]+/g, '') === s.replace(/[^a-z0-9]+/g, '')
}

function listingDisplayScore(item: PublicListingItem): number {
  let score = 0
  if (item.featured_image_url?.trim() || item.thumbnail_url?.trim()) score += 4
  if (!isSlugLikeTitle(item.title, item.slug)) score += 3
  if ((item.title?.length ?? 0) > (item.slug?.length ?? 0) + 2) score += 1
  return score
}

/**
 * Baransen yat ↔ Bravo villa id çakışması: slug villa adı, galeri /yatlar/{kanonik}/.
 * Arama/öneride bu bozuk kimlikler villa sanılıp "Yat kiralama" diye çıkmasın.
 */
export function isYachtIdentityCollision(item: PublicListingItem): boolean {
  if (item.category_code !== 'yacht_charter') return false
  const img = (item.featured_image_url || item.thumbnail_url || '').trim()
  const m = img.match(/\/yatlar\/([^/]+)\//i)
  if (!m) return false
  return normalizeSlugKey(m[1]) !== normalizeSlugKey(item.slug)
}

/** Aynı slug için çift kayıt (biri çeviri başlığı, biri ham slug) — en iyi satırı bırak.
 *  Kategori + slug ile ayır: holiday_home ugurlu-villa ile bozuk yacht ugurlu-villa çakışmasın.
 */
export function dedupeSearchListings(items: PublicListingItem[]): PublicListingItem[] {
  const byKey = new Map<string, PublicListingItem>()
  for (const item of items) {
    if (isYachtIdentityCollision(item)) continue
    const slugKey = normalizeSlugKey(item.slug)
    if (!slugKey) continue
    const key = `${item.category_code || ''}:${slugKey}`
    const prev = byKey.get(key)
    if (!prev || listingDisplayScore(item) > listingDisplayScore(prev)) {
      byKey.set(key, item)
    }
  }
  return [...byKey.values()]
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const CATEGORY_SEARCH_ALIASES: Partial<Record<string, string[]>> = {
  hotel: ['otel', 'hotel', 'hoteller', 'hotels', ' гостиница', 'отель', '酒店'],
  holiday_home: [
    'villa',
    'vila',
    'bungalov',
    'bungalow',
    'apart',
    'daire',
    'tatil evi',
    'holiday home',
    'ferienhaus',
    'ferienwohnung',
    'maison de vacances',
    'location vacances',
    'вилла',
    '度假屋',
    '别墅',
  ],
  yacht_charter: ['yat', 'tekne', 'gulet', 'yacht', 'boot', 'bateau', 'яхта', '游艇'],
  tour: ['tur', 'tour', 'tours', 'reise', 'reisen', 'circuit', 'excursion', 'тур', 'экскурсия', '旅游'],
  activity: ['aktivite', 'activity', 'aktivitat', 'activite', 'активность', '活动'],
  cruise: ['kruvaziyer', 'cruise', 'croisiere', 'kreuzfahrt', 'круиз', '邮轮'],
}

function words(value: string): string[] {
  return value.split(' ').filter(Boolean)
}

function containsWholePhrase(value: string, phrase: string): boolean {
  return ` ${value} `.includes(` ${phrase} `)
}

/** Tek harf hatası veya yan yana iki harfin yer değiştirmesi (vilal → villa). */
function isNearToken(value: string, expected: string): boolean {
  if (value === expected) return true
  if (value.length < 4 || expected.length < 4) return false
  if (Math.abs(value.length - expected.length) > 1) return false

  if (value.length === expected.length) {
    const mismatches: number[] = []
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== expected[index]) mismatches.push(index)
      if (mismatches.length > 2) return false
    }
    if (mismatches.length <= 1) return true
    const [first, second] = mismatches
    return (
      second === first + 1 &&
      value[first] === expected[second] &&
      value[second] === expected[first]
    )
  }

  const [shorter, longer] = value.length < expected.length
    ? [value, expected]
    : [expected, value]
  let shortIndex = 0
  let longIndex = 0
  let edits = 0
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1
      longIndex += 1
      continue
    }
    edits += 1
    longIndex += 1
    if (edits > 1) return false
  }
  return true
}

function tokenFieldScore(token: string, fieldWords: string[], field: string): number {
  if (fieldWords.includes(token)) return 120
  if (fieldWords.some((word) => word.startsWith(token))) return 90
  if (fieldWords.some((word) => isNearToken(word, token))) return 65
  if (field.includes(token)) return 35
  return 0
}

function categoryIntentScore(categoryCode: string, query: string, queryTokens: string[]): number {
  const aliases = CATEGORY_SEARCH_ALIASES[categoryCode] ?? []
  for (const rawAlias of aliases) {
    const alias = normalizeSearchText(rawAlias)
    if (!alias) continue
    if (query === alias || containsWholePhrase(query, alias)) return 240
    const aliasTokens = words(alias)
    if (
      aliasTokens.length === 1 &&
      queryTokens.some((token) => isNearToken(token, aliasTokens[0]))
    ) {
      return 180
    }
  }
  return 0
}

function listingQueryRelevance(item: PublicListingItem, query: string): number {
  const normalizedQuery = normalizeSearchText(query)
  const queryTokens = words(normalizedQuery)
  if (!normalizedQuery || queryTokens.length === 0) return 0

  const title = normalizeSearchText(item.title)
  const slug = normalizeSearchText(item.slug)
  const location = normalizeSearchText(item.location ?? '')
  const titleWords = words(title)
  const slugWords = words(slug)
  const locationWords = words(location)

  let score = categoryIntentScore(item.category_code, normalizedQuery, queryTokens)
  if (title === normalizedQuery) score += 10_000
  else if (slug === normalizedQuery) score += 9_500
  else if (containsWholePhrase(title, normalizedQuery)) score += 8_000
  else if (containsWholePhrase(slug, normalizedQuery)) score += 7_500

  let allTokensMatched = true
  for (const token of queryTokens) {
    const titleScore = tokenFieldScore(token, titleWords, title)
    const slugScore = tokenFieldScore(token, slugWords, slug)
    const locationScore = tokenFieldScore(token, locationWords, location)
    const best = Math.max(titleScore, slugScore, locationScore)
    if (best === 0) allTokensMatched = false
    score += titleScore * 5 + slugScore * 3 + locationScore * 2
  }

  if (allTokensMatched) score += 1_000
  if (title.startsWith(normalizedQuery)) score += 700
  else if (slug.startsWith(normalizedQuery)) score += 600
  else if (location.startsWith(normalizedQuery)) score += 350

  // Aynı eşleşme sınıfında kısa, doğrudan başlıklar uzun tur metinlerinden önce gelsin.
  score += Math.max(0, 120 - title.length)
  if (item.featured_image_url?.trim() || item.thumbnail_url?.trim()) score += 10
  return score
}

/**
 * Backend sıralamasına karşı koruma: tam ifade ve tam kelime eşleşmeleri daima
 * `Adagio … Village` gibi yalnızca önek eşleşen sonuçlardan önce gösterilir.
 */
export function rankSearchListings(
  items: PublicListingItem[],
  query: string,
): PublicListingItem[] {
  return items
    .map((item, index) => ({ item, index, score: listingQueryRelevance(item, query) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
}

export function publicListingDetailPath(categoryCode: string, slug: string): string {
  const seg = DETAIL_SEGMENT[categoryCode] ?? 'otel'
  return `/${seg}/${slug}`
}

/**
 * Arama / vitrin alt başlıkları: önce `listing.browseCategory`, yoksa
 * `categoryPage.verticalLabels`. Eksik browse anahtarında ham kod (`activity`) görünmez.
 */
export function searchCategoryLabelsFromMessages(msgs: {
  listing?: { browseCategory?: Record<string, string> }
  categoryPage?: { verticalLabels?: Record<string, string> }
}): Record<string, string> {
  return {
    ...(msgs.categoryPage?.verticalLabels ?? {}),
    ...(msgs.listing?.browseCategory ?? {}),
  }
}

export function categoryLabelForSearch(
  categoryCode: string,
  labels: Record<string, string> | undefined,
): string {
  const code = categoryCode.trim()
  if (!code) return ''
  const fromMessages = labels?.[code]
  if (fromMessages) return fromMessages
  return code.replace(/_/g, ' ')
}

/**
 * Hero / kategori yoluna göre `listing-search` için `category_code`.
 * Ana sayfa veya bilinmeyen yol → `undefined` (tüm kategoriler).
 */
export function listingCategoryCodeForHeroPath(path: string): string | undefined {
  const p = (path.split('?')[0] ?? path).trim() || '/'
  if (p.startsWith('/oteller') || p.includes('/oteller-harita')) return 'hotel'
  if (p.startsWith('/tatil-evleri') || p.includes('/tatil-evleri-harita')) return 'holiday_home'
  if (p.startsWith('/yat-kiralama') || p.includes('/yat-kiralama-harita')) return 'yacht_charter'
  if (
    p.startsWith('/turlar') ||
    p.includes('/turlar-harita') ||
    p.startsWith('/hac-umre') ||
    p.startsWith('/vize')
  ) {
    return 'tour'
  }
  if (p.startsWith('/kruvaziyer') || p.includes('/kruvaziyer-harita')) return 'cruise'
  if (
    p.startsWith('/aktiviteler') ||
    p.includes('/aktiviteler-harita') ||
    p.startsWith('/plaj-sezlong') ||
    p.startsWith('/sinema-biletleri') ||
    p.startsWith('/etkinlikler') ||
    p.startsWith('/restoran-rezervasyon')
  ) {
    return 'activity'
  }
  return undefined
}
