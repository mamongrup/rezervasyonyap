export type HotelGalleryImage = {
  storage_key: string
  alt_text_key?: string | null
}

const ROOM_HARD_RE =
  /(?:^|[-_.\s])(room|rooms|bedroom|bedrooms|suite|suites|oda|odasi|guestroom|guestrooms|beds?)(?:[-_.\s]|$)/i

const ROOM_SOFT_RE =
  /(?:^|[-_.\s])(interior|bathroom|banyo|living|salon|junior.?suite|penthouse|villa.?interior)(?:[-_.\s]|$)/i

const ROOM_REJECT_RE =
  /(?:^|[-_.\s])(restaurant|restaurants|dining|yemek|buffet|lobby|reception|bar|disco|nightclub|pool|havuz|beach|plaj|exterior|facade|amenities|facilities|business|conference|meeting|spa|wellness|gym|fitness|kids|child|children|aqua|waterpark|garden|park|terrace|skyline|aerial|map|logo|food|entertainment|animation|sport|sports|ballroom|cafe|poolside|marina)(?:[-_.\s]|$)/i

function normalizeLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function imageFileLabel(url: string | null | undefined): string {
  try {
    const path = String(url ?? '').split('?')[0]
    return decodeURIComponent(path.split('/').pop() || '').toLowerCase()
  } catch {
    return String(url ?? '').toLowerCase()
  }
}

function slugTokens(roomName: string): string[] {
  return String(roomName || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter((token) => token.length > 3)
    .slice(0, 4)
}

function classifyGalleryImage(image: HotelGalleryImage): 'room' | 'soft' | 'reject' | 'other' {
  const label = normalizeLabel(image.alt_text_key)
  if (['room', 'guest room', 'bedroom', 'hotel room'].includes(label)) return 'room'
  if (['living area', 'bathroom', 'private bathroom'].includes(label)) return 'soft'

  const file = imageFileLabel(image.storage_key)
  const hard = ROOM_HARD_RE.test(file)
  const reject = ROOM_REJECT_RE.test(file)
  if (reject && !hard) return 'reject'
  if (hard) return 'room'
  if (ROOM_SOFT_RE.test(file) && !reject) return 'soft'
  return 'other'
}

/**
 * Eski oda kayıtlarında meta_json.images boşsa yalnızca sağlayıcının açıkça
 * oda olarak etiketlediği veya dosya adına göre güvenle oda sayılabilen galeri
 * görsellerini kullanır. Havuz, lobi, restoran ve dış cephe fotoğrafları bu
 * fallback'e giremez.
 */
export function roomGalleryFallback(
  images: readonly HotelGalleryImage[],
  roomName: string,
): string[] {
  const primary: Array<{ url: string; score: number }> = []
  const secondary: Array<{ url: string; score: number }> = []
  const tokens = slugTokens(roomName)
  const preferSuite = /süit|suite|penthouse|villa/i.test(String(roomName || ''))

  for (const image of images) {
    const url = image.storage_key?.trim()
    if (!url) continue
    const file = imageFileLabel(url)
    let score = 0
    if (preferSuite && /suite|suit|penthouse/i.test(file)) score += 5
    if (!preferSuite && /suite|suit/i.test(file) && !/room/i.test(file)) score -= 1
    for (const token of tokens) {
      if (file.includes(token)) score += 3
    }

    const kind = classifyGalleryImage(image)
    if (kind === 'room') primary.push({ url, score })
    else if (kind === 'soft') secondary.push({ url, score })
  }

  const primaryUrls = [...new Set(primary
    .sort((a, b) => b.score - a.score)
    .map((item) => item.url))]
  if (primaryUrls.length === 0) return []

  const seed = [...roomName].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0)
  const offset = seed % primaryUrls.length
  const rotatedPrimary = [
    ...primaryUrls.slice(offset),
    ...primaryUrls.slice(0, offset),
  ]

  const secondaryUrls = [...new Set(secondary
    .sort((a, b) => b.score - a.score)
    .map((item) => item.url))]

  return [...new Set([...rotatedPrimary, ...secondaryUrls])].slice(0, 6)
}
