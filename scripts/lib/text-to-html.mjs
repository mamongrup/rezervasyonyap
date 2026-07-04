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

const BULLET_PREFIX_RE = /^[\s\u00A0]*[-•*][\s\u00A0]+/
const NBSP_PREFIX_RE = /^[\u00A0]/
const HEADER_LINE_RE = /^.{1,60}:$/

/** Madde işareti tespiti orijinal (kırpılmamış) satırda yapılmalı — trim() NBSP'yi siler. */
function isBulletRawLine(rawLine) {
  return BULLET_PREFIX_RE.test(rawLine) || NBSP_PREFIX_RE.test(rawLine)
}

function stripBulletPrefix(rawLine) {
  return rawLine.replace(BULLET_PREFIX_RE, '').replace(NBSP_PREFIX_RE, '').trim()
}

/**
 * "Konaklama:\n- 6 misafir\n- 3 kabin" gibi başlık + madde listesi kalıplarını
 * (yat/tur sağlayıcılarının düz metin özet formatı) `<p><strong>` başlık ve
 * `<ul><li>` listeye çevirir. Boş satırla ayrılan diğer bloklar normal
 * paragraf olarak işlenir. Zaten HTML olan girdi için kullanılmamalıdır.
 */
export function structuredPlainTextToHtml(text) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''

  const blocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)

  const htmlBlocks = []
  for (const block of blocks) {
    const rawLines = block.split('\n').filter((l) => l.trim().length > 0)
    if (!rawLines.length) continue

    let headerLine = null
    let itemLines = rawLines
    if (rawLines.length > 1 && !isBulletRawLine(rawLines[0]) && HEADER_LINE_RE.test(rawLines[0].trim())) {
      headerLine = rawLines[0].trim()
      itemLines = rawLines.slice(1)
    }

    const bulletCount = itemLines.filter(isBulletRawLine).length
    const isListBlock = bulletCount >= 1 && bulletCount / itemLines.length >= 0.7

    if (isListBlock) {
      if (headerLine) htmlBlocks.push(`<p><strong>${escapeHtml(headerLine)}</strong></p>`)
      const items = itemLines.map(stripBulletPrefix).filter(Boolean)
      htmlBlocks.push(`<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`)
      continue
    }

    if (rawLines.length === 1 && HEADER_LINE_RE.test(rawLines[0].trim())) {
      htmlBlocks.push(`<p><strong>${escapeHtml(rawLines[0].trim())}</strong></p>`)
      continue
    }

    htmlBlocks.push(`<p>${rawLines.map((l) => escapeHtml(l.trim())).join('<br />')}</p>`)
  }

  return htmlBlocks.join('')
}
