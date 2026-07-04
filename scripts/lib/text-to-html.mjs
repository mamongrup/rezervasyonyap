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

/** Bilinen bölüm başlıkları (h3). Uzun ifadeler önce. */
const SECTION_NAMES = [
  'Yatak Odaları',
  'Temizlik ve Bakım',
  'Havuz ve Bahçe',
  'Genel Özellikler',
  'Konaklama Olanakları',
  'Fiyatlandırma Bilgilendirme',
  'Fiyata Dahil Olmayanlar',
  'Fiyata Dahil Olanlar',
  'Giriş ve Çıkış',
  'Giriş & Çıkış',
  'Villa Kuralları',
  'Uzaklıklar',
  'Ödeme Bilgisi',
  'Ödemeler',
  'Salon',
  'Mutfak',
  'Depozito',
  'Konum',
  'Tasarım',
  'Kurallar',
  'Fiyatlandırma',
  'Olanaklar',
  'Konaklama',
]

const SECTION_HEADING_RE = new RegExp(
  `^(${SECTION_NAMES.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|Not\\s*\\)?)\\s*:?\\s*$`,
  'iu',
)

const LABELED_LINE_RE = new RegExp(
  `^((?:\\d+\\.\\s*)?(?:${SECTION_NAMES.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|Not\\s*\\)?))\\s*:\\s*(.+)$`,
  'isu',
)

const SECTION_LABEL_RE = new RegExp(
  `^(${SECTION_NAMES.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`,
  'iu',
)

/** Split öncesi gürültü / kırık HTML temizliği */
function scrubDescriptionNoise(text) {
  return String(text || '')
    .replace(/<[^>]*$/g, '') // kesik etiket: <span class="tex
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/Daha Fazla Gör/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Etiketsiz paragrafları içeriğe göre bölüme ata */
function inferSectionFromParagraph(text) {
  const t = String(text || '').trim()
  if (!t || t.length < 20) return null
  if (/depozito\s*alın|depozito\s*sizlere|hasar sonucunda/i.test(t) && !/giriş saati|EFT|Sigara/i.test(t)) {
    return 'Depozito'
  }
  if (/giriş saati|çıkış saati|villaya giriş|villadan ayrılma|16\.00|10\.00’|10\.00'/i.test(t)) {
    return 'Giriş ve Çıkış'
  }
  if (/EFT|Havale|Swift|kredi kartı ödem|kurumsal banka/i.test(t)) {
    return 'Ödeme Bilgisi'
  }
  if (/Sigara İçilmez|Parti Düzenlenmez|evcil hayvan/i.test(t)) {
    return 'Kurallar'
  }
  if (/\b(Restoran|Restorant|Market|Plaj|Hava\s*Alan)\b/i.test(t) && /\d+\s*M\b/i.test(t)) {
    return 'Uzaklıklar'
  }
  if (/erken rezervasyon|ön ödeme|Fiyatlandırma/i.test(t)) {
    return 'Fiyatlandırma'
  }
  if (/Fiyata dahil olmayan|havalimanı transfer|günlük kiralık araç/i.test(t)) {
    return 'Fiyata Dahil Olmayanlar'
  }
  if (/Fiyata dahil olan|elektrik.*su.*gaz|havuz temizliği/i.test(t)) {
    return 'Fiyata Dahil Olanlar'
  }
  if (/Giriş\s*:\s*\d|Çıkış\s*:\s*\d/i.test(t)) {
    return 'Giriş ve Çıkış'
  }
  return null
}

/**
 * Tek paragraf / düz metin duvarını bölüm başlıkları ve "Etiket :" satırlarına böler.
 */
function splitWallOfText(plain) {
  let text = scrubDescriptionNoise(plain)
  if (!text) return []

  // "Giriş : 16:00 Çıkış : 10:00" → net bölüm
  text = text.replace(
    /Giriş\s*:\s*(\d{1,2}[:.]\d{2})\s*Çıkış\s*:\s*(\d{1,2}[:.]\d{2})/gi,
    'Giriş ve Çıkış: Giriş $1, çıkış $2.',
  )

  const splitRe = new RegExp(
    `(?=(?:Yatak Odaları|Temizlik ve Bakım|Havuz ve Bahçe|Genel Özellikler|Konaklama Olanakları|Fiyatlandırma Bilgilendirme|Fiyata Dahil Olmayanlar|Fiyata Dahil Olanlar|Giriş ve Çıkış|Giriş\\s*&\\s*Çıkış|Villa Kuralları|Uzaklıklar|Ödeme Bilgisi|\\d+\\.\\s*Yatak Odası\\s*:|(?:Salon|Mutfak|Depozito|Konum|Tasarım|Kurallar|Fiyatlandırma|Ödemeler)\\s*:))`,
    'iu',
  )

  const parts = text.split(splitRe)
  const blocks = []
  let lastSection = null

  for (const part of parts) {
    let chunk = part.trim()
    if (!chunk) continue

    // "Villa Kuralları Sigara İçilmez…" (iki nokta yok)
    const bareHead = chunk.match(
      /^(Yatak Odaları|Genel Özellikler|Konaklama Olanakları|Fiyatlandırma Bilgilendirme|Fiyata Dahil Olmayanlar|Fiyata Dahil Olanlar|Giriş ve Çıkış|Villa Kuralları|Uzaklıklar|Ödeme Bilgisi|Kurallar|Fiyatlandırma)\s+(.+)$/isu,
    )
    if (bareHead) {
      const heading = bareHead[1].replace(/Giriş\s*&\s*Çıkış/i, 'Giriş ve Çıkış').trim()
      blocks.push({ type: 'h3', text: heading })
      lastSection = heading
      chunk = bareHead[2].trim()
    }

    if (SECTION_HEADING_RE.test(chunk)) {
      const heading = chunk
        .replace(/[:：]\s*$/, '')
        .replace(/Giriş\s*&\s*Çıkış/i, 'Giriş ve Çıkış')
        .trim()
      blocks.push({ type: 'h3', text: heading })
      lastSection = heading
      continue
    }

    const labeled = chunk.match(LABELED_LINE_RE)
    if (labeled) {
      let label = labeled[1]
        .replace(/[:：]\s*$/, '')
        .replace(/Giriş\s*&\s*Çıkış/i, 'Giriş ve Çıkış')
        .trim()
      const body = labeled[2].trim()
      if (SECTION_LABEL_RE.test(label) && !/^\d+\./.test(label)) {
        // Uzun gövde karışık konular içeriyorsa cümle cümle böl
        if (body.length > 160 && /giriş saati|EFT|Sigara|Fiyata|Uzaklık/i.test(body)) {
          blocks.push({ type: 'h3', text: label })
          lastSection = label
          for (const sub of splitMixedParagraph(body, label)) {
            if (sub.type === 'h3') lastSection = sub.text
            blocks.push(sub)
          }
        } else {
          blocks.push({ type: 'h3', text: label })
          lastSection = label
          if (body) blocks.push({ type: 'p', text: body })
        }
      } else {
        blocks.push({ type: 'label', label, text: body })
      }
      continue
    }

    for (const sub of splitMixedParagraph(chunk, lastSection)) {
      if (sub.type === 'h3') lastSection = sub.text
      blocks.push(sub)
    }
  }
  return mergeAdjacentHeadings(blocks)
}

/** Karışık paragrafı cümle sınırında bölümlere ayırır. */
function splitMixedParagraph(chunk, currentSection) {
  const text = String(chunk || '').trim()
  if (!text) return []

  const sentences = text.split(/(?<=[.!?])\s+/u).filter((s) => s.trim())
  if (sentences.length < 2 || text.length < 160) {
    const inferred = inferSectionFromParagraph(text)
    const out = []
    if (inferred && inferred !== currentSection) out.push({ type: 'h3', text: inferred })
    out.push({ type: 'p', text })
    return out
  }

  const out = []
  let buf = []
  let bufSection = currentSection
  let lastSection = currentSection

  const flush = () => {
    if (!buf.length) return
    const para = buf.join(' ').trim()
    if (!para) return
    const sec = inferSectionFromParagraph(para) || bufSection
    if (sec && sec !== lastSection) {
      out.push({ type: 'h3', text: sec })
      lastSection = sec
    }
    out.push({ type: 'p', text: para })
    buf = []
  }

  for (const sent of sentences) {
    const s = sent.trim()
    if (!s) continue
    const sec = inferSectionFromParagraph(s)
    if (sec && buf.length && sec !== bufSection) {
      flush()
      bufSection = sec
    } else if (sec) {
      bufSection = sec
    }
    buf.push(s)
  }
  flush()
  return out
}

/** Yinelenen / eşanlamlı h3'leri tekilleştir (Villa Kuralları = Kurallar). */
function mergeAdjacentHeadings(blocks) {
  const ALIASES = {
    kurallar: 'Kurallar',
    'villa kuralları': 'Kurallar',
    fiyatlandırma: 'Fiyatlandırma',
    'fiyatlandırma bilgilendirme': 'Fiyatlandırma',
    ödemeler: 'Ödeme Bilgisi',
    'ödeme bilgisi': 'Ödeme Bilgisi',
    'giriş & çıkış': 'Giriş ve Çıkış',
    'giriş ve çıkış': 'Giriş ve Çıkış',
  }
  const norm = (t) => ALIASES[String(t).toLocaleLowerCase('tr')] || t
  const seen = new Set()
  const out = []
  for (const b of blocks) {
    if (b.type === 'h3') {
      const title = norm(b.text)
      const key = title.toLocaleLowerCase('tr')
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ type: 'h3', text: title })
      continue
    }
    out.push(b)
  }
  return out
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

    // Uzun paragraf / karışık konular → bölüm ayır
    const looksMixed =
      plain.length > 160 &&
      (/Yatak Odaları|Salon\s*:|Mutfak\s*:|Depozito|giriş saati|Fiyata Dahil|Uzaklıklar|EFT|Sigara İçilmez/i.test(
        plain,
      ) ||
        inferSectionFromParagraph(plain))
    if (looksMixed) {
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

function needsFullResplit(html) {
  const plain = scrubDescriptionNoise(stripTags(html))
  if (/class="tex|<span\b[^>]*$/i.test(html)) return true
  if (/Daha Fazla Gör|Fiyatlandırma Bilgilendirme|Fiyata Dahil Olanlar|Uzaklıklar/i.test(plain)) {
    return true
  }
  if (/Depozito/i.test(plain) && /giriş saati|EFT|Sigara|Uzaklık|Fiyata Dahil/i.test(plain)) {
    return true
  }
  if (/Yatak Odaları\s+\d|Salon\s*:|Mutfak\s*:/i.test(plain)) return true
  // Depozito sonrası uzun karışık gövde (ayrı h3 yok)
  const h3s = (html.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/gi) || []).map((h) => stripTags(h).toLowerCase())
  const hasGiris = h3s.some((h) => /giriş/.test(h))
  const hasOdeme = h3s.some((h) => /ödeme/.test(h))
  const hasKurallar = h3s.some((h) => /kural/.test(h))
  if (/giriş saati|16\.00/i.test(plain) && !hasGiris) return true
  if (/EFT|Havale|Swift/i.test(plain) && !hasOdeme) return true
  if (/Sigara İçilmez|Parti Düzenlenmez/i.test(plain) && !hasKurallar) return true
  return false
}

/**
 * Mamon villa tarzı SEO yapısı: h2 başlık, h3 bölümler, normal paragraflar.
 * Depozito sonrası giriş/çıkış, ödeme, kurallar, uzaklıklar vb. de ayrılır.
 * Tüm tatil evi ilanlarında backfill ile uygulanır.
 */
export function toSeoListingDescriptionHtml(html, { title = '', subtitle = '' } = {}) {
  let s = String(html || '').trim()
  if (!s) return ''

  // Kırık HTML artıkları
  s = s.replace(/<span\b[^>]*$/gi, '').replace(/class="tex[^"]*$/gi, '')

  const titlePlain = stripTags(title)
  const subtitlePlain = stripTags(subtitle)
  const h2m = s.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)
  const effectiveTitle = titlePlain || (h2m ? stripTags(h2m[1]) : '')

  const bodyHtml = s.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi, ' ')
  const bodyPlain = scrubDescriptionNoise(stripTags(bodyHtml))

  // Mamon gibi zaten temiz SEO + eksik bölüm yok → yalnızca stil temizliği
  if (!needsFullResplit(s) && /<h3\b/i.test(s) && (s.match(/<p\b/gi) || []).length >= 3) {
    return cleanExistingSeoHtml(s)
  }

  // Tam yeniden böl (duvar veya eksik ara başlıklar)
  if (bodyPlain.length > 80) {
    return blocksToSeoHtml(splitWallOfText(bodyPlain), {
      title: effectiveTitle,
      subtitle: subtitlePlain,
    })
  }

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
  if (effectiveTitle && !/<h2\b/i.test(result)) {
    const head = [`<h2>${escapeHtml(effectiveTitle)}</h2>`]
    if (subtitlePlain) head.push(`<h3>${escapeHtml(subtitlePlain)}</h3>`)
    result = `${head.join('\n')}\n${result}`
  }
  return result.trim()
}
