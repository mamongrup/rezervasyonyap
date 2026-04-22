import sanitizeHtml from 'sanitize-html'

/**
 * CMS / panelden gelen HTML için XSS önlemli sanitize.
 *
 * - `inline`: hero başlığı — satır sonu + vurgu (br, span, strong…)
 * - `rich`: blog, ilan açıklaması, metin modülü — başlıklar, liste, bağlantı, görsel
 * - `siteUi`: Ayarlar → SEO → header/footer ham HTML — yalnızca meta/link ve
 *   **src’li** script (bilinen analitik / GTM alan adları); satır içi script kaldırılır
 */

const INLINE: sanitizeHtml.IOptions = {
  allowedTags: ['br', 'span', 'strong', 'em', 'b', 'i', 'small', 'u'],
  allowedAttributes: {
    span: ['class'],
    b: ['class'],
    i: ['class'],
    strong: ['class'],
    em: ['class'],
  },
  allowedClasses: {
    span: [/^[a-zA-Z0-9_\s:-]+$/],
    b: [/^[a-zA-Z0-9_\s:-]+$/],
    i: [/^[a-zA-Z0-9_\s:-]+$/],
    strong: [/^[a-zA-Z0-9_\s:-]+$/],
    em: [/^[a-zA-Z0-9_\s:-]+$/],
  },
  disallowedTagsMode: 'discard',
  allowedSchemes: [],
  allowProtocolRelative: false,
}

const RICH: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'div',
    'br',
    'span',
    'ul',
    'ol',
    'li',
    'a',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'blockquote',
    'hr',
    'img',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'code',
    'pre',
    'sup',
    'sub',
    'del',
    'ins',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    '*': ['class', 'id'],
  },
  allowedClasses: {
    '*': [/^[a-zA-Z0-9_\s:-]+$/],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  transformTags: {
    a: (tagName, attribs) => {
      const next = { ...attribs }
      if (next.target === '_blank') {
        next.rel = (next.rel ? `${next.rel} ` : '') + 'noopener noreferrer'
      }
      return { tagName, attribs: next }
    },
  },
  disallowedTagsMode: 'discard',
  allowProtocolRelative: false,
}

/** Harici script src — yalnızca yaygın analitik / reklam CDN’leri */
function isTrustedExternalScriptSrc(src: string): boolean {
  const s = src.trim()
  if (!s.startsWith('https://')) return false
  try {
    const u = new URL(s)
    const h = u.hostname.toLowerCase()
    const trusted = [
      'www.googletagmanager.com',
      'googletagmanager.com',
      'www.google-analytics.com',
      'ssl.google-analytics.com',
      'www.google.com',
      'www.gstatic.com',
      'pagead2.googlesyndication.com',
      'googleads.g.doubleclick.net',
      'connect.facebook.net',
      'www.clarity.ms',
      'scripts.clarity.ms',
    ]
    return trusted.some((t) => h === t || h.endsWith(`.${t}`))
  } catch {
    return false
  }
}

const SITE_UI: sanitizeHtml.IOptions = {
  allowedTags: ['meta', 'link', 'script', 'noscript', 'iframe'],
  allowedAttributes: {
    meta: ['charset', 'name', 'content', 'http-equiv', 'property'],
    link: ['href', 'rel', 'type', 'as', 'crossorigin', 'media', 'hreflang', 'sizes', 'integrity'],
    script: ['src', 'async', 'defer', 'type', 'crossorigin', 'integrity'],
    noscript: [],
    iframe: ['src', 'width', 'height', 'title', 'style'],
  },
  allowedSchemes: ['http', 'https', 'data'],
  allowProtocolRelative: false,
  exclusiveFilter(frame) {
    if (frame.tag === 'script') {
      const src = frame.attribs?.src
      if (!src || typeof src !== 'string') return true
      return !isTrustedExternalScriptSrc(src)
    }
    if (frame.tag === 'iframe') {
      const src = frame.attribs?.src
      if (!src || typeof src !== 'string') return true
      try {
        const h = new URL(src).hostname.toLowerCase()
        return !(h === 'www.googletagmanager.com' || h.endsWith('.googletagmanager.com'))
      } catch {
        return true
      }
    }
    return false
  },
  disallowedTagsMode: 'discard',
}

export type CmsHtmlProfile = 'inline' | 'rich' | 'siteUi'

export function sanitizeCmsHtml(html: string, profile: CmsHtmlProfile = 'rich'): string {
  if (html == null || typeof html !== 'string') return ''
  const trimmed = html.trim()
  if (!trimmed) return ''
  const opts = profile === 'inline' ? INLINE : profile === 'siteUi' ? SITE_UI : RICH
  return sanitizeHtml(trimmed, opts)
}

/** Hero başlık (kısa satır içi HTML) */
export function sanitizeHeroInlineHtml(html: string): string {
  return sanitizeCmsHtml(html, 'inline')
}

/** Blog gövdesi, ilan açıklaması, page builder metin blokları */
export function sanitizeRichCmsHtml(html: string): string {
  return sanitizeCmsHtml(html, 'rich')
}

/** Panel → SEO → header_html / footer_html (meta, link, sınırlı harici script) */
export function sanitizeSiteUiHtml(html: string): string {
  return sanitizeCmsHtml(html, 'siteUi')
}
