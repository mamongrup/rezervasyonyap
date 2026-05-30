/**
 * Kategori URL segmentlerinden bölge anahtarı — `/oteller/TR/agri` → `agri`.
 */
export function regionHandleFromParams(handle?: string[]): string | undefined {
  if (!handle?.length) return undefined
  if (handle[0]?.toUpperCase() === 'TR' && handle.length > 1) {
    return handle.slice(1).join('/')
  }
  if (handle.length === 1) return handle[0]
  return handle.join('/')
}

/** `location_pages.slug_path` → kategori hero dosya anahtarı (son segment veya ilçe yolu). */
export function regionHeroKeyFromSlugPath(slugPath: string): string {
  const parts = slugPath.split('/').filter(Boolean)
  if (parts.length >= 2 && parts[0]?.toLowerCase() === 'tr') {
    return parts.slice(1).join('/')
  }
  return parts[parts.length - 1] ?? slugPath
}
