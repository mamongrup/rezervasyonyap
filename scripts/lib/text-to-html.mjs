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

function stripTags(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Uuml;/gi, 'Ü')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&Ccedil;/gi, 'Ç')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

function unwrapStrong(html) {
  return String(html || '').replace(/<\/?strong\b[^>]*>/gi, '')
}

function stripInlineStyles(html) {
  return String(html || '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
}

/** Boş / yalnızca &nbsp; başlıkları atar; inline style temizler. */
function cleanExistingSeoHtml(html) {
  return stripInlineStyles(html)
    .replace(/<span\b[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<h([1-4])\b[^>]*>\s*(?:&nbsp;|\u00a0|\s)*<\/h\1>/gi, '')
    .replace(/(<\/p>)\s*(<p\b)/gi, '$1\n$2')
    .replace(/(<\/h[1-4]>)\s*/gi, '$1\n')
    .trim()
}

/**
 * Mamon villa tarzı SEO yapısı: h2 başlık, h3 bölümler, normal paragraflar,
 * "Etiket: açıklama" satırlarında yalnızca etiket kalın.
 * Aşırı <strong> duvarını (Akdeniz Villam vb.) okunabilir hiyerarşiye çevirir.
 */
export function toSeoListingDescriptionHtml(html, { title = '', subtitle = '' } = {}) {
  let s = String(html || '').trim()
  if (!s) return ''

  if (/<h[1-4]\b/i.test(s)) {
    return cleanExistingSeoHtml(s)
  }

  // Düz metinse önce paragrafla
  if (!/<[a-z][\s\S]*>/i.test(s)) {
    s = structuredPlainTextToHtml(s) || plainTextToHtmlParagraphs(s)
  }

  s = stripInlineStyles(s)
    .replace(/<span\b[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/&nbsp;/gi, ' ')

  const blocks = []
  const re = /<(p|h[1-6]|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m
  while ((m = re.exec(s)) !== null) {
    blocks.push({ tag: m[1].toLowerCase(), inner: m[2] })
  }
  if (!blocks.length) {
    s = plainTextToHtmlParagraphs(stripTags(s))
    return toSeoListingDescriptionHtml(s, { title })
  }

  const out = []
  const titlePlain = stripTags(title)

  for (const block of blocks) {
    if (block.tag !== 'p') {
      const plain = stripTags(block.inner)
      if (!plain) continue
      out.push(`<${block.tag}>${block.inner}</${block.tag}>`)
      continue
    }

    const plain = stripTags(block.inner)
    if (!plain) continue

    const onlyStrong = block.inner.match(/^\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*$/i)
    if (onlyStrong) {
      const heading = stripTags(onlyStrong[1]).replace(/[:：]\s*$/, '').trim()
      if (heading && heading.length <= 80) {
        out.push(`<h3>${escapeHtml(heading)}</h3>`)
        continue
      }
      // Uzun tamamen kalın paragraf → düz metin
      if (heading) {
        out.push(`<p>${escapeHtml(heading)}</p>`)
        continue
      }
    }

    const labelM = block.inner.match(
      /^\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*[:：]?\s*([\s\S]*)$/i,
    )
    if (labelM) {
      const label = stripTags(labelM[1]).replace(/[:：]\s*$/, '').trim()
      const restRaw = labelM[2].trim()
      const restPlain = stripTags(restRaw)
      // "Villa X</strong>, konumlanan…" cümle devamı — etiket değil
      const isSentenceContinuation = /^[,.;]/.test(restPlain)
      if (
        label &&
        label.length <= 60 &&
        restPlain.length >= 12 &&
        !isSentenceContinuation
      ) {
        out.push(`<p><strong>${escapeHtml(label)}:</strong> ${unwrapStrong(restRaw)}</p>`)
        continue
      }
    }

    // "Konum: …" (kalın yok) — etiketi kalınlaştır
    const plainLabel = plain.match(/^([^:]{2,40}):\s+(.+)$/s)
    if (plainLabel && !/<strong\b/i.test(block.inner)) {
      out.push(
        `<p><strong>${escapeHtml(plainLabel[1].trim())}:</strong> ${escapeHtml(plainLabel[2].trim())}</p>`,
      )
      continue
    }

    const strongCount = (block.inner.match(/<strong\b/gi) || []).length
    const body = strongCount >= 3 ? unwrapStrong(block.inner) : block.inner
    out.push(`<p>${body}</p>`)
  }

  let result = out.join('\n')
  const subtitlePlain = stripTags(subtitle)
  if (titlePlain && !/<h2\b/i.test(result)) {
    const head = [`<h2>${escapeHtml(titlePlain)}</h2>`]
    if (subtitlePlain) head.push(`<h3>${escapeHtml(subtitlePlain)}</h3>`)
    result = `${head.join('\n')}\n${result}`
  }
  return result.trim()
}
