/** Düz metni okunabilir paragraf/satır sonlu basit HTML'e çevirir (rich-text sanitize profiliyle uyumlu). */

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * "\n\n" ile ayrılmış paragrafları <p>, paragraf içi tekil "\n" satırlarını <br /> yapar.
 * Girdi zaten düz metindir (HTML kaçışı bu fonksiyon içinde yapılır).
 */
export function plainTextToHtmlParagraphs(text) {
  const normalized = String(text || '')
    .replace(/\r\n?/g, '\n')
    .trim()
  if (!normalized) return ''

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

/** Bir metni kalın başlık paragrafıyla birlikte HTML'e ekler (örn. "Mekân" bölüm başlığı). */
export function labeledSectionToHtml(label, text) {
  const body = plainTextToHtmlParagraphs(text)
  if (!body) return ''
  if (!label) return body
  return `<p><strong>${escapeHtml(label)}</strong></p>${body}`
}
