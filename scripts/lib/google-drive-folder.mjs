/**
 * Google Drive klasöründeki görselleri (alt klasörler dahil) listeler.
 * Logosuz galeri için yalnızca Drive kullanılır (Villagezegeni CDN filigranlı).
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadPlaywright() {
  const roots = [path.join(__dirname, '..', '..', 'frontend'), path.join(__dirname, '..')]
  let last
  for (const root of roots) {
    try {
      return createRequire(path.join(root, 'package.json'))('playwright')
    } catch (e) {
      last = e
    }
  }
  throw new Error(`playwright bulunamadı. ${last?.message || ''}`)
}

export function driveImageUrl(fileId) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w2000`
}

export function driveFullImageUrl(fileId) {
  return `https://drive.google.com/uc?id=${fileId}&export=download`
}

function looksLikeDriveId(id, folderId) {
  if (!id || id === folderId || id.startsWith('_')) return false
  if (id.length < 25 || id.length > 64) return false
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return false
  if (/v-?\d|h\d|Zm\d|L\d/.test(id) && id.length < 32) return false
  return true
}

/**
 * @param {import('playwright').Page} page
 * @param {string} fid
 */
async function listOne(page, fid) {
  await page.goto(`https://drive.google.com/drive/folders/${fid}?usp=sharing`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  await page.waitForTimeout(2500)

  for (const sel of [
    'button:has-text("Accept all")',
    'button:has-text("Tümünü kabul et")',
    'button:has-text("I agree")',
    'button:has-text("Kabul et")',
  ]) {
    const btn = page.locator(sel).first()
    if (await btn.count().catch(() => 0)) {
      await btn.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(1000)
    }
  }

  try {
    await page.waitForSelector('[data-id], tr[data-id], div[data-target="doc"]', { timeout: 45_000 })
  } catch {
    console.warn('[drive] selector timeout', fid, 'title=', await page.title())
  }

  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 2400)
    await page.waitForTimeout(400)
  }

  const fromDom = await page.evaluate((rootId) => {
    const nodes = [
      ...document.querySelectorAll('tr[data-id]'),
      ...document.querySelectorAll('[data-id][data-target]'),
      ...document.querySelectorAll('div[data-id][aria-label]'),
    ]
    const out = []
    const seen = new Set()
    for (const el of nodes) {
      const id = el.getAttribute('data-id')
      if (!id || id === rootId || id.startsWith('_') || seen.has(id)) continue
      seen.add(id)
      const target = el.getAttribute('data-target') || ''
      const label =
        el.getAttribute('aria-label') ||
        el.getAttribute('data-tooltip') ||
        (el.textContent || '').replace(/\s+/g, ' ').trim()
      const name = String(label)
        .replace(/SharedOwner.*$/i, '')
        .replace(/Owner hidden.*$/i, '')
        .replace(/Download$/i, '')
        .trim() || id
      const isImage =
        /\.(jpe?g|png|webp|avif|gif|heic)$/i.test(name) ||
        /Image/i.test(name) ||
        target === 'doc'
      const isFolder =
        target === 'folder' ||
        (/folder|klasör/i.test(name) && !/\.(jpe?g|png|webp)/i.test(name) && !/Image/i.test(name)) ||
        // Oda alt klasörleri (Double oda, Twin oda, Jakuzili Oda)
        (/oda/i.test(name) && !/\.(jpe?g|png|webp)/i.test(name) && !/Image/i.test(name) && target !== 'doc')
      out.push({
        id,
        name,
        isFolder: Boolean(isFolder && !/\.(jpe?g|png|webp)/i.test(name) && !/Image/i.test(name)),
        isImage: Boolean(isImage && target !== 'folder'),
      })
    }
    return out
  }, fid)

  if (fromDom.length) return fromDom

  const html = await page.content()
  const ids = [...new Set([...html.matchAll(/\b(1[a-zA-Z0-9_-]{24,})\b/g)].map((m) => m[1]))].filter(
    (id) => looksLikeDriveId(id, fid),
  )
  console.warn(`[drive] DOM boş, HTML fallback id=${ids.length} folder=${fid}`)
  return ids.map((id) => ({ id, name: id, isFolder: false, isImage: true }))
}

/**
 * @param {string} folderId
 * @param {{ maxDepth?: number }} [opts]
 */
export async function listDriveFolderImages(folderId, opts = {}) {
  const maxDepth = opts.maxDepth ?? 2
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await (
      await browser.newContext({
        locale: 'en-US',
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      })
    ).newPage()

    /** @type {{ id: string, name: string, folderPath: string }[]} */
    const images = []
    const queue = [{ id: folderId, path: '', depth: 0 }]
    const visited = new Set()

    while (queue.length) {
      const cur = queue.shift()
      if (!cur || visited.has(cur.id) || cur.depth > maxDepth) continue
      visited.add(cur.id)
      let items = []
      try {
        items = await listOne(page, cur.id)
      } catch (e) {
        console.warn('[drive] listOne fail', cur.id, e?.message || e)
        continue
      }
      console.log(`[drive] folder ${cur.path || '/'} items=${items.length}`)
      for (const item of items) {
        if (item.id === folderId) continue
        if (!looksLikeDriveId(item.id, cur.id) && item.id !== cur.id) continue
        if (item.isFolder && cur.depth < maxDepth) {
          queue.push({
            id: item.id,
            path: cur.path ? `${cur.path}/${item.name}` : item.name,
            depth: cur.depth + 1,
          })
          continue
        }
        if (item.isFolder) continue
        if (item.isImage || /\.(jpe?g|png|webp|avif|gif)$/i.test(item.name) || item.name === item.id) {
          images.push({ id: item.id, name: item.name, folderPath: cur.path || '' })
        }
      }
    }

    const seen = new Set()
    const unique = []
    for (const img of images) {
      if (seen.has(img.id)) continue
      seen.add(img.id)
      unique.push(img)
    }

    unique.sort((a, b) => {
      const aRoom = a.folderPath ? 1 : 0
      const bRoom = b.folderPath ? 1 : 0
      if (aRoom !== bRoom) return aRoom - bRoom
      const aLow = /dosya|logo|thumb/i.test(a.name) ? 1 : 0
      const bLow = /dosya|logo|thumb/i.test(b.name) ? 1 : 0
      if (aLow !== bLow) return aLow - bLow
      return a.name.localeCompare(b.name, 'tr')
    })

    return unique
  } finally {
    await browser.close()
  }
}

export async function driveFolderGalleryUrls(folderId) {
  const files = await listDriveFolderImages(folderId)
  if (!files.length) {
    throw new Error(
      `Drive klasöründe görsel bulunamadı (${folderId}). Klasör herkese açık mı / Playwright Chromium kurulu mu kontrol edin.`,
    )
  }
  return files.map((f) => driveImageUrl(f.id))
}
