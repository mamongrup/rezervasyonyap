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

/** Bölüm başlığı (h3) — tek başına veya "Başlık :" ile başlayan segmentler. */
const SECTION_HEADING_RE =
  /^(Yatak Odaları|Salon|Mutfak|Havuz ve Bahçe|Temizlik ve Bakım|Depozito|Genel Özellikler|Konaklama Olanakları|Konaklama|Olanaklar|Kurallar|Not\s*\)?)\s*:?\s*$/iu

/** Etiketli satır: "1. Yatak Odası : …", "Salon : …", "Konum: …" */
const LABELED_LINE_RE =
  /^((?:\d+\.\s*)?(?:Yatak Odası|Salon|Mutfak|Havuz ve Bahçe|Temizlik ve Bakım|Depozito|Konum|Tasarım|Not\s*\)?))\s*:\s*(.+)$/isu

/** Ana bölüm etiketleri → h3 + gövde paragrafı */
const SECTION_LABEL_RE =
  /^(Salon|Mutfak|Havuz ve Bahçe|Temizlik ve Bakım|Depozito)$/iu

/**
 * Tek paragraf / düz metin duvarını bölüm başlıkları ve "Etiket :" satırlarına böler.
 */
function splitWallOfText(plain) {
  const text = String(plain || '').replace(/\s+/g, ' ').trim()
  if (!text) return []

  // Uzun ifadeler önce (Havuz ve Bahçe, Havuz/Bahçe ayrı kesilmesin)
  const parts = text.split(
    /(?=(?:Yatak Odaları|Temizlik ve Bakım|Havuz ve Bahçe|Genel Özellikler|Konaklama Olanakları|\d+\.\s*Yatak Odası\s*:|(?:Salon|Mutfak|Depozito|Konum|Tasarım)\s*:))/iu,
  )

  const blocks = []
  for (const part of parts) {
    const chunk = part.trim()
    if (!chunk) continue

    if (SECTION_HEADING_RE.test(chunk)) {
      const heading = chunk.replace(/[:：]\s*$/, '').trim()
      blocks.push({ type: 'h3', text: heading })
      continue
    }

    const labeled = chunk.match(LABELED_LINE_RE)
    if (labeled) {
      const label = labeled[1].replace(/[:：]\s*$/, '').trim()
      const body = labeled[2].trim()
      // Salon / Mutfak gibi ana bölümler → h3 + paragraf
      if (SECTION_LABEL_RE.test(label)) {
        blocks.push({ type: 'h3', text: label })
        if (body) blocks.push({ type: 'p', text: body })
      } else {
        blocks.push({ type: 'label', label, text: body })
      }
      continue
    }

    // "Yatak Odaları" ardından hemen oda satırı gelmiş olabilir
    const bareSection = chunk.match(
      /^(Yatak Odaları|Genel Özellikler|Konaklama Olanakları)\s+(.+)$/isu,
    )
    if (bareSection) {
      blocks.push({ type: 'h3', text: bareSection[1].trim() })
      const rest = bareSection[2].trim()
      for (const sub of splitWallOfText(rest)) blocks.push(sub)
      continue
    }

    blocks.push({ type: 'p', text: chunk })
  }
  return blocks
}

function blocksToSeoHtml(blocks, { title = '', subtitle = '' } = {}) {
  const titlePlain = stripTags(title)
  const subtitlePlain = stripTags(subtitle)
  const out = []
  if (titlePlain) out.push(`<h2>${escapeHtml(titlePlain)}</h2>`)
  if (subtitlePlain) out.push(`<h3>${escapeHtml(subtitlePlain)}</h3>`)

  for (const b of blocks) {
    if (b.type === 'h3') {
      // Başlık ile aynı metni tekrar h3 yapma
      if (titlePlain && b.text.toLocaleLowerCase('tr') === titlePlain.toLocaleLowerCase('tr')) continue
      if (subtitlePlain && b.text.toLocaleLowerCase('tr') === subtitlePlain.toLocaleLowerCase('tr')) continue
      out.push(`<h3>${escapeHtml(b.text)}</h3>`)
    } else if (b.type === 'label') {
      out.push(`<p><strong>${escapeHtml(b.label)}:</strong> ${escapeHtml(b.text)}</p>`)
    } else if (b.type === 'p' && b.text) {
      out.push(`<p>${escapeHtml(b.text)}</p>`)
    }
  }
  return out.join('\n').trim()
}

function processParagraphBlocks(blocks) {
  const out = []
  for (const block of blocks) {
    if (block.tag !== 'p') {
      const plain = stripTags(block.inner)
      if (!plain) continue
      out.push(`<${block.tag}>${block.inner}</${block.tag}>`)
      continue
    }

    const plain = stripTags(block.inner)
    if (!plain) continue

    // Uzun tek paragraf duvarı → bölüm ayır
    if (plain.length > 280 && /Yatak Odaları|Salon\s*:|Mutfak\s*:|Depozito\s*:/i.test(plain)) {
      for (const b of splitWallOfText(plain)) {
        if (b.type === 'h3') out.push(`<h3>${escapeHtml(b.text)}</h3>`)
        else if (b.type === 'label') {
          out.push(`<p><strong>${escapeHtml(b.label)}:</strong> ${escapeHtml(b.text)}</p>`)
        } else out.push(`<p>${escapeHtml(b.text)}</p>`)
      }
      continue
    }

    const onlyStrong = block.inner.match(/^\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*$/i)
    if (onlyStrong) {
      const heading = stripTags(onlyStrong[1]).replace(/[:：]\s*$/, '').trim()
      if (heading && heading.length <= 80) {
        out.push(`<h3>${escapeHtml(heading)}</h3>`)
        continue
      }
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
      const isSentenceContinuation = /^[,.;]/.test(restPlain)
      if (label && label.length <= 60 && restPlain.length >= 12 && !isSentenceContinuation) {
        out.push(`<p><strong>${escapeHtml(label)}:</strong> ${unwrapStrong(restRaw)}</p>`)
        continue
      }
    }

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
  return out
}

/**
 * Mamon villa tarzı SEO yapısı: h2 başlık, h3 bölümler, normal paragraflar,
 * "Etiket: açıklama" satırlarında yalnızca etiket kalın.
 * Tek <p> duvarını da (üretimdeki Gülbay gibi) bölümlere ayırır.
 */
export function toSeoListingDescriptionHtml(html, { title = '', subtitle = '' } = {}) {
  let s = String(html || '').trim()
  if (!s) return ''

  const titlePlain = stripTags(title)
  const subtitlePlain = stripTags(subtitle)

  // Mevcut h2'den başlık al
  const h2m = s.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)
  const effectiveTitle = titlePlain || (h2m ? stripTags(h2m[1]) : '')

  // Zaten iyi yapılandırılmış (birden fazla h3 + birkaç blok)
  const h3Count = (s.match(/<h3\b/gi) || []).length
  const pCount = (s.match(/<p\b/gi) || []).length
  if (h3Count >= 2 && pCount >= 3) {
    return cleanExistingSeoHtml(s)
  }

  // Gövde metni (h2 hariç) — duvar tespiti
  const bodyHtml = s.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi, ' ')
  const bodyPlain = stripTags(bodyHtml)

  // Tek/az paragraf veya h3 yok + bölüm anahtarları → duvarı böl
  if (
    bodyPlain.length > 200 &&
    (h3Count === 0 || pCount <= 2) &&
    /Yatak Odaları|Salon\s*:|Mutfak\s*:|Depozito\s*:/i.test(bodyPlain)
  ) {
    return blocksToSeoHtml(splitWallOfText(bodyPlain), {
      title: effectiveTitle,
      subtitle: subtitlePlain,
    })
  }

  // Düz metinse önce paragrafla
  if (!/<[a-z][\s\S]*>/i.test(s)) {
    return blocksToSeoHtml(splitWallOfText(s), { title: effectiveTitle, subtitle: subtitlePlain })
  }

  s = stripInlineStyles(s)
    .replace(/<span\b[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/&nbsp;/gi, ' ')

  const blocks = []
  const re = /<(p|h[1-6]|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m
  while ((m = re.exec(s)) !== null) {
    // Mevcut h2'yi atla — başta yeniden ekleyeceğiz
    if (m[1].toLowerCase() === 'h2') continue
    blocks.push({ tag: m[1].toLowerCase(), inner: m[2] })
  }
  if (!blocks.length) {
    return blocksToSeoHtml(splitWallOfText(bodyPlain || stripTags(s)), {
      title: effectiveTitle,
      subtitle: subtitlePlain,
    })
  }

  const out = processParagraphBlocks(blocks)
  let result = out.join('\n')
  // Çıktıda h2 yoksa ekle
  if (effectiveTitle && !/<h2\b/i.test(result)) {
    const head = [`<h2>${escapeHtml(effectiveTitle)}</h2>`]
    if (subtitlePlain) head.push(`<h3>${escapeHtml(subtitlePlain)}</h3>`)
    result = `${head.join('\n')}\n${result}`
  }
  // Hâlâ h3 yok ve duvar kalıntısı varsa son bir deneme
  if (!/<h3\b/i.test(result) && /Yatak Odaları|Salon\s*:/i.test(stripTags(result))) {
    return blocksToSeoHtml(splitWallOfText(stripTags(result)), {
      title: effectiveTitle,
      subtitle: subtitlePlain,
    })
  }
  return result.trim()
}
