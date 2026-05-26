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

const TUR_CODE_RE = /Tur Kodu[\s:\n]*(\d{4,6})/i
const PAGE_READY_MS = Number(process.env.GEIZINOMI_PAGE_READY_MS || 5500)

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
    return { tourCode: null, urls: [], pageUrl: null, error: 'tur_kodu_bulunamadi' }
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

  return { tourCode, urls, pageUrl, title, link }
}

async function extractTourPhotoUrls(page, tourCode) {
  const html = await page.content()
  const re = new RegExp(
    `https://images\\.gezinomi\\.com(?:/fit-in/\\d+x\\d+)?(?:/filters:[^"'\\s>]+)*?/assets/[^"'\\s>]*?-${tourCode}--\\d+-[^"'\\s>]+\\.(?:jpe?g|png|webp)`,
    'gi',
  )
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

export async function launchGezinomiBrowser() {
  let chromium
  try {
    ;({ chromium } = require('playwright'))
  } catch {
    throw new Error(
      'playwright yüklü değil. frontend dizininde: npm install -D playwright && npx playwright install chromium',
    )
  }
  return chromium.launch({ headless: true })
}

export async function newGezinomiPage(browser) {
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'tr-TR',
  })
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' })
  return page
}
