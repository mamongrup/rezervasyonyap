/**
 * Google Drive klasöründeki görselleri (alt klasörler dahil) listeler.
 * İndirme URL'si: lh3.googleusercontent.com/d/{id} (uc?export=download bazı ortamlarda 500 verir).
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

/**
 * @param {string} folderId
 * @param {{ maxDepth?: number }} [opts]
 * @returns {Promise<{ id: string, name: string, folderPath: string }[]>}
 */
export async function listDriveFolderImages(folderId, opts = {}) {
  const maxDepth = opts.maxDepth ?? 2
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  async function listOne(page, fid) {
    await page.goto(`https://drive.google.com/drive/folders/${fid}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })
    await page.waitForTimeout(3500)
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 2200)
      await page.waitForTimeout(350)
    }
    return page.evaluate((rootId) => {
      const rows = [...document.querySelectorAll('tr[data-id]')]
      const out = []
      const seen = new Set()
      for (const row of rows) {
        const id = row.getAttribute('data-id')
        if (!id || id === rootId || seen.has(id)) continue
        seen.add(id)
        const text = (row.textContent || '').replace(/\s+/g, ' ').trim()
        const name =
          text
            .replace(/SharedOwner.*$/i, '')
            .replace(/Owner hidden.*$/i, '')
            .replace(/Download$/i, '')
            .trim() || id
        const isImage = /\.(jpe?g|png|webp|avif|gif|heic)$/i.test(name) || /Image/i.test(name)
        const isFolder =
          /folder/i.test(row.getAttribute('data-target') || '') ||
          (!isImage && !/\.(jpe?g|png|webp|pdf|mp4|mov|docx?|xlsx?)$/i.test(name) && !/Image/i.test(name))
        out.push({ id, name, isFolder: Boolean(isFolder && !isImage), isImage: Boolean(isImage) })
      }
      return out
    }, fid)
  }

  try {
    const page = await browser.newPage()
    /** @type {{ id: string, name: string, folderPath: string }[]} */
    const images = []
    const queue = [{ id: folderId, path: '', depth: 0 }]
    const visited = new Set()

    while (queue.length) {
      const cur = queue.shift()
      if (!cur || visited.has(cur.id) || cur.depth > maxDepth) continue
      visited.add(cur.id)
      const items = await listOne(page, cur.id)
      for (const item of items) {
        if (item.isFolder && cur.depth < maxDepth) {
          queue.push({
            id: item.id,
            path: cur.path ? `${cur.path}/${item.name}` : item.name,
            depth: cur.depth + 1,
          })
          continue
        }
        if (item.isImage || /\.(jpe?g|png|webp|avif|gif)$/i.test(item.name)) {
          images.push({
            id: item.id,
            name: item.name,
            folderPath: cur.path || '',
          })
        }
      }
    }

    // Genel görünüm önce, oda klasörleri sonra; küçük dosya / logo sonda
    images.sort((a, b) => {
      const aRoom = a.folderPath ? 1 : 0
      const bRoom = b.folderPath ? 1 : 0
      if (aRoom !== bRoom) return aRoom - bRoom
      const aLow = /dosya|logo|thumb/i.test(a.name) ? 1 : 0
      const bLow = /dosya|logo|thumb/i.test(b.name) ? 1 : 0
      if (aLow !== bLow) return aLow - bLow
      return a.name.localeCompare(b.name, 'tr')
    })

    return images
  } finally {
    await browser.close()
  }
}

/**
 * @param {string} folderId
 * @returns {Promise<string[]>}
 */
export async function driveFolderGalleryUrls(folderId) {
  const files = await listDriveFolderImages(folderId)
  return files.map((f) => driveFullImageUrl(f.id))
}
