import { filterTourGalleryUrls } from './gezinomi-gallery.mjs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(__dirname, '..', '..', 'frontend', 'package.json'))

export const CATEGORY_PREFIXES = [
  'balkan-turlari',
  'kultur-turlari',
  'cruise-turlari',
  'yurt-disi-turlari',
  'otobuslu-turlar',
  'vizesiz-turlar',
  'her-hafta-hareketli-turlar',
  'firsat-turlar',
  'gunubirlik-turlar',
]

const TUR_CODE_RE = /Tur Kodu[\s:<]*(\d{4,6})/i
const PAGE_READY_MS = Number(process.env.GEIZINOMI_PAGE_READY_MS || 5500)
const FETCH_TIMEOUT_MS = Number(process.env.GEIZINOMI_FETCH_TIMEOUT_MS || 45000)

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

function photoUrlRegex(tourCode) {
  return new RegExp(
    String.raw`https://images\.gezinomi\.com(?:/fit-in/\d+x\d+)?(?:/filters:[^"'\s>]+)*?/assets/[^"'\s>]*?-${tourCode}--\d+-[^"'\s>]+\.(?:jpe?g|png|webp)`,
    'gi',
  )
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

function collectAssetUrlsFromHtml(html) {
  const out = []
  const patterns = [
    /https:\/\/images\.gezinomi\.com[^"'\\s>]+/gi,
    /https:\\\/\\\/images\.gezinomi\.com[^"'\\]+/gi,
  ]
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      out.push(m[0].replace(/\\\//g, '/'))
    }
  }
  return out
}

function extractTourPhotoUrlsFromHtml(html, tourCode) {
  const re = photoUrlRegex(tourCode)
  const fromRegex = [...html.matchAll(re)].map((m) => m[0])
  const fromAttrs = collectAssetUrlsFromHtml(html)
  return filterTourGalleryUrls([...fromRegex, ...fromAttrs], tourCode)
}

async function fetchGezinomiHtml(url) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
      signal: ac.signal,
    })
    const text = await resp.text()
    return { ok: resp.ok, status: resp.status, url: resp.url, html: text }
  } finally {
    clearTimeout(timer)
  }
}

/** Varsayılan: HTTP fetch (Playwright / apt gerekmez — AlmaLinux uyumlu) */
export async function fetchGezinomiTourGallery({ link, title }) {
  let tourCode = null
  let pageUrl = null
  let html = ''

  for (const prefix of CATEGORY_PREFIXES) {
    const url = `https://www.gezinomi.com/tur/${prefix}/${link}`
    let resp
    try {
      resp = await fetchGezinomiHtml(url)
    } catch {
      continue
    }
    if (!resp.ok) continue
    if (!resp.url.includes(link) && !resp.html.includes(link)) continue
    if (/Tur Bulunamadı/i.test(resp.html)) continue

    const bodyText = stripHtml(resp.html)
    const m = bodyText.match(TUR_CODE_RE) || resp.html.match(TUR_CODE_RE)
    if (!m) continue

    tourCode = m[1]
    pageUrl = resp.url
    html = resp.html
    break
  }

  if (!tourCode) {
    return { tourCode: null, urls: [], pageUrl: null, error: 'tur_kodu_bulunamadi', mode: 'fetch' }
  }

  const urls = extractTourPhotoUrlsFromHtml(html, tourCode)
  return { tourCode, urls, pageUrl, title, link, mode: 'fetch' }
}

export async function scrapeGezinomiTourGallery(page, { link, title }) {
  let tourCode = null
  let pageUrl = null

  for (const prefix of CATEGORY_PREFIXES) {
    const url = `https://www.gezinomi.com/tur/${prefix}/${link}`
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null)
    if (!resp || resp.status() >= 400) continue

    await page.waitForTimeout(PAGE_READY_MS)
    const currentUrl = page.url()
    if (!currentUrl.includes(link)) continue

    const bodyText = await page.locator('body').innerText().catch(() => '')
    if (/Tur Bulunamadı/i.test(bodyText)) continue

    const m = bodyText.match(TUR_CODE_RE)
    if (m) {
      tourCode = m[1]
      pageUrl = currentUrl
      break
    }
  }

  if (!tourCode) {
    return { tourCode: null, urls: [], pageUrl: null, error: 'tur_kodu_bulunamadi', mode: 'playwright' }
  }

  await page.waitForTimeout(2000)

  const showAll = page.getByRole('button', { name: /Tüm fotoğrafları/i })
  if (await showAll.count()) {
    await showAll.first().click({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(2500)
  }

  let urls = await extractTourPhotoUrls(page, tourCode)

  if (!urls.length) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)
    urls = await extractTourPhotoUrls(page, tourCode)
  }

  return { tourCode, urls, pageUrl, title, link, mode: 'playwright' }
}

async function extractTourPhotoUrls(page, tourCode) {
  const html = await page.content()
  const re = photoUrlRegex(tourCode)
  const fromHtml = [...html.matchAll(re)].map((m) => m[0])
  const fromDom = await collectAssetUrls(page)
  return filterTourGalleryUrls([...fromHtml, ...fromDom], tourCode)
}

async function collectAssetUrls(page) {
  return page.evaluate(() => {
    const fromImg = [...document.querySelectorAll('img')].map((i) => i.currentSrc || i.src || '')
    const fromSrcset = [...document.querySelectorAll('img[srcset]')].flatMap((i) =>
      String(i.srcset || '')
        .split(',')
        .map((p) => p.trim().split(/\s+/)[0]),
    )
    return [...fromImg, ...fromSrcset].filter((s) => s.includes('images.gezinomi.com/assets/'))
  })
}

/** fetch önce; az URL ve --playwright ise tarayıcı dene */
export async function scrapeGezinomiTourGalleryAuto(ctx, { link, title }, { usePlaywright = false } = {}) {
  const fetched = await fetchGezinomiTourGallery({ link, title })
  if (fetched.urls.length >= 3 || !usePlaywright) return fetched
  if (!ctx?.page) return fetched
  const pw = await scrapeGezinomiTourGallery(ctx.page, { link, title })
  if (pw.urls.length > fetched.urls.length) return pw
  return fetched.urls.length ? fetched : pw
}

export async function launchGezinomiBrowser() {
  let chromium
  try {
    ;({ chromium } = require('playwright'))
  } catch {
    throw new Error(
      'playwright yüklü değil. frontend dizininde: npm install -D playwright && npx playwright install chromium',
    )
  }
  try {
    return await chromium.launch({ headless: true })
  } catch (e) {
    const msg = String(e?.message || e)
    if (/missing dependencies|install-deps|libatk|libgbm|libasound/i.test(msg)) {
      throw new Error(
        `${msg}\n\nPlaywright gerekmez: node scripts/import-gezinomi-tour-images.mjs (varsayılan HTTP fetch)\nPlaywright için AlmaLinux: dnf install atk at-spi2-atk mesa-libgbm alsa-lib nss`,
      )
    }
    throw e
  }
}

export async function newGezinomiPage(browser) {
  const page = await browser.newPage({
    userAgent: FETCH_HEADERS['User-Agent'],
    locale: 'tr-TR',
  })
  await page.setExtraHTTPHeaders({ 'Accept-Language': FETCH_HEADERS['Accept-Language'] })
  return page
}
