export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Meta/OG açıklamasında başlığın çift yazılmasını önler ("Villa X Villa X, …"). */
export function listingMetaDescription(title: string, htmlOrPlain: string | null | undefined): string {
  const plain = htmlOrPlain ? stripHtml(htmlOrPlain) : ''
  const t = title.trim()
  if (!plain) return t
  if (!t) return plain
  const lowerPlain = plain.toLowerCase()
  const lowerTitle = t.toLowerCase()
  if (lowerPlain === lowerTitle) return t
  if (lowerPlain.startsWith(lowerTitle)) {
    const rest = plain.slice(t.length).replace(/^[\s:–—\-|,.]+/, '').trim()
    return rest || t
  }
  return plain
}
