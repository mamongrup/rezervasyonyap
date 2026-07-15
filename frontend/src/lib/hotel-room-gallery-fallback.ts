export type HotelGalleryImage = {
  storage_key: string
  alt_text_key?: string | null
}

function normalizeLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Eski oda kayıtlarında meta_json.images boşsa yalnızca sağlayıcının açıkça
 * oda olarak etiketlediği otel galeri görsellerini kullanır. Havuz, lobi,
 * restoran ve dış cephe fotoğrafları bu fallback'e giremez.
 */
export function roomGalleryFallback(
  images: readonly HotelGalleryImage[],
  roomName: string,
): string[] {
  const primary: string[] = []
  const secondary: string[] = []
  for (const image of images) {
    const url = image.storage_key?.trim()
    const label = normalizeLabel(image.alt_text_key)
    if (!url) continue
    if (['room', 'guest room', 'bedroom', 'hotel room'].includes(label)) primary.push(url)
    else if (['living area', 'bathroom', 'private bathroom'].includes(label)) secondary.push(url)
  }
  const uniquePrimary = [...new Set(primary)]
  if (uniquePrimary.length === 0) return []

  const seed = [...roomName].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0)
  const offset = seed % uniquePrimary.length
  const rotatedPrimary = [
    ...uniquePrimary.slice(offset),
    ...uniquePrimary.slice(0, offset),
  ]
  return [...new Set([...rotatedPrimary, ...secondary])].slice(0, 6)
}
