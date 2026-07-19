/**
 * Production Next.js sunucusu — App Router’da render-blocking CSS’i
 * kritik yoldan uzaklaştırır (PSI “Oluşturma engelleme istekleri”).
 *
 * Strateji:
 * - `experimental.inlineCss` HTML’i ~550KB×2 şişirir → kullanmıyoruz.
 * - `optimizeCss`/beasties streaming ile uyumsuz.
 * - Bu sunucu, belge HTML yanıtlarında `/_next/static/css/*.css`
 *   stylesheet linklerini preload+onload’a çevirir ve küçük critical CSS enjekte eder.
 *
 * RSC / prefetch / statik asset isteklerine dokunulmaz.
 * `TRAVEL_DEFER_CSS=0` ile kapatılabilir.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import next from 'next'

const __dirname = dirname(fileURLToPath(import.meta.url))
const port = Number.parseInt(process.env.PORT || '3000', 10)
const hostname = process.env.HOSTNAME || '127.0.0.1'
const deferCss = process.env.TRAVEL_DEFER_CSS !== '0'

let criticalCss = ''
try {
  criticalCss = readFileSync(join(__dirname, 'src/styles/critical-vitrin.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
} catch {
  criticalCss = ''
}

const app = next({ dev: false, hostname, port, dir: __dirname })
const handle = app.getRequestHandler()

/** @param {string} html */
function transformDocumentHtml(html) {
  let out = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=["']stylesheet["']/i.test(tag)) return tag
    const hrefMatch = tag.match(/\bhref=["'](\/_next\/static\/css\/[^"']+\.css)["']/i)
    if (!hrefMatch) return tag
    const href = hrefMatch[1]
    const precedence = tag.match(/\bdata-precedence=["'][^"']*["']/i)?.[0] || ''
    const extra = precedence ? ` ${precedence}` : ''
    return (
      `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'"${extra}/>` +
      `<noscript><link rel="stylesheet" href="${href}"${extra}/></noscript>`
    )
  })

  if (criticalCss && !out.includes('id="critical-vitrin"')) {
    const styleTag = `<style id="critical-vitrin">${criticalCss}</style>`
    if (out.includes('</head>')) {
      out = out.replace('</head>', `${styleTag}</head>`)
    } else if (/rel="preload"[^>]*as="style"/i.test(out)) {
      // </head> henüz gelmediyse preload’dan hemen sonra enjekte et
      out = out.replace(
        /(<link rel="preload"[^>]*as="style"[^>]*\/?>)/i,
        `$1${styleTag}`,
      )
    }
  }

  return out
}

/**
 * @param {import('node:http').ServerResponse} res
 */
function wrapHtmlResponse(res) {
  const originalWrite = res.write.bind(res)
  const originalEnd = res.end.bind(res)
  const originalSetHeader = res.setHeader.bind(res)
  const originalRemoveHeader = res.removeHeader.bind(res)

  /** @type {Buffer[]} */
  const pending = []
  let pendingLen = 0
  /** @type {'detect' | 'buffer' | 'passthrough'} */
  let mode = 'detect'
  let isHtml = false
  let lengthStripped = false

  const stripLength = () => {
    if (lengthStripped) return
    lengthStripped = true
    try {
      originalRemoveHeader('Content-Length')
    } catch {
      /* ignore */
    }
  }

  res.setHeader = (name, value) => {
    const key = String(name).toLowerCase()
    if (key === 'content-type' && String(value).toLowerCase().includes('text/html')) {
      isHtml = true
      stripLength()
    }
    if (key === 'content-length' && (isHtml || mode === 'buffer')) {
      return res
    }
    if (key === 'content-encoding' && String(value).toLowerCase().includes('gzip')) {
      // Dönüşüm için düz metin gerekir; Next’in gzip’ini engelle.
      return res
    }
    return originalSetHeader(name, value)
  }

  const flushBuffer = (transform) => {
    if (pending.length === 0) return
    let buf = Buffer.concat(pending, pendingLen)
    pending.length = 0
    pendingLen = 0
    if (transform) {
      buf = Buffer.from(transformDocumentHtml(buf.toString('utf8')), 'utf8')
      stripLength()
    }
    originalWrite(buf)
  }

  res.write = (chunk, encoding, cb) => {
    if (typeof encoding === 'function') {
      cb = encoding
      encoding = undefined
    }

    if (mode === 'passthrough') {
      return originalWrite(chunk, encoding, cb)
    }

    if (mode === 'detect') {
      const ct = String(res.getHeader('content-type') || '')
      isHtml = ct.toLowerCase().includes('text/html')
      if (!isHtml) {
        mode = 'passthrough'
        return originalWrite(chunk, encoding, cb)
      }
      stripLength()
      mode = 'buffer'
    }

    const buf = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk ?? '', typeof encoding === 'string' ? encoding : 'utf8')
    pending.push(buf)
    pendingLen += buf.length

    const sample = Buffer.concat(pending, Math.min(pendingLen, 128_000)).toString('utf8')
    const hasStylesheet = /rel=["']stylesheet["'][^>]{0,200}\/_next\/static\/css\//i.test(sample)
    const headClosed = sample.includes('</head>')

    if (hasStylesheet || headClosed || pendingLen > 96_000) {
      flushBuffer(true)
      mode = 'passthrough'
    }

    if (typeof cb === 'function') cb()
    return true
  }

  res.end = (chunk, encoding, cb) => {
    if (typeof chunk === 'function') {
      cb = chunk
      chunk = undefined
      encoding = undefined
    } else if (typeof encoding === 'function') {
      cb = encoding
      encoding = undefined
    }

    if (chunk !== undefined && chunk !== null && chunk !== '') {
      res.write(chunk, encoding)
    }

    if (mode === 'buffer') {
      flushBuffer(true)
      mode = 'passthrough'
    }

    return originalEnd(cb)
  }
}

await app.prepare()

createServer((req, res) => {
  const accept = String(req.headers.accept || '')
  const isRsc =
    req.headers.rsc === '1' ||
    typeof req.headers['next-router-state-tree'] === 'string' ||
    typeof req.headers['next-router-prefetch'] === 'string' ||
    typeof req.headers['next-router-segment-prefetch'] === 'string'
  const wantsHtml = accept.includes('text/html')

  if (deferCss && wantsHtml && !isRsc && req.method === 'GET') {
    // Next’in yanıtı gzip’lemesin; nginx kenarda sıkıştırır.
    delete req.headers['accept-encoding']
    wrapHtmlResponse(res)
  }

  return handle(req, res)
}).listen(port, hostname, () => {
  console.log(`ready on http://${hostname}:${port} (deferCss=${deferCss ? 'on' : 'off'})`)
})
