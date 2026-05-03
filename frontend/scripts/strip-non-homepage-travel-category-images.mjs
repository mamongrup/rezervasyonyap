#!/usr/bin/env node
/**
 * travel_category_images yalnızca homepage page-builder kaydında geçerlidir.
 * - homepage dışı *.json dosyalarından bu modül tipini siler.
 * - homepage.json içinde birden fazla varsa thumbnails birleştirilip tek modülde bırakılır.
 *
 * Çalıştır: npm run page-builder:strip-shared-category-images
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.join(__dirname, '..', 'public', 'page-builder')

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.json'))
  let updatedFiles = 0

  for (const file of files) {
    const slug = file.replace(/\.json$/i, '')
    const fp = path.join(DIR, file)
    const raw = await readFile(fp, 'utf8')
    let data
    try {
      data = JSON.parse(raw)
    } catch (e) {
      console.warn('skip (invalid JSON):', file, e.message)
      continue
    }
    if (!Array.isArray(data.modules)) continue

    const before = JSON.stringify(data.modules)

    if (slug === 'homepage') {
      const indices = data.modules
        .map((m, i) => (m.type === 'travel_category_images' ? i : -1))
        .filter((i) => i >= 0)
      if (indices.length <= 1) continue
      const mergedThumbnails = {}
      for (const i of indices) {
        const th = data.modules[i].config?.thumbnails
        if (th && typeof th === 'object' && !Array.isArray(th)) {
          Object.assign(mergedThumbnails, th)
        }
      }
      const keep = indices[0]
      data.modules[keep].config = {
        ...(typeof data.modules[keep].config === 'object' && data.modules[keep].config
          ? data.modules[keep].config
          : {}),
        thumbnails: mergedThumbnails,
      }
      for (let j = indices.length - 1; j >= 1; j--) {
        data.modules.splice(indices[j], 1)
      }
    } else {
      data.modules = data.modules.filter((m) => m.type !== 'travel_category_images')
    }

    if (JSON.stringify(data.modules) === before) continue

    await writeFile(fp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    updatedFiles += 1
    console.log('updated:', file)
  }

  if (updatedFiles === 0) {
    console.log('page-builder: strip-shared-category-images — değişiklik yok.')
  } else {
    console.log(`page-builder: strip-shared-category-images — ${updatedFiles} dosya güncellendi.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
