#!/usr/bin/env node
/**
 * `migrate-external-images.mjs` ile aynı MD5 kuralı: URL → `/uploads/external/<hash>.avif`
 * Verilen dosyada (tek dosya) tüm eşleşen harici URL'leri yerel path ile değiştirir.
 *
 *   node scripts/patch-src-external-images-to-uploads.mjs src/data/listings.ts
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const EXTERNAL_HOSTS = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'images.pexels.com',
  'cdn.pixabay.com',
]
const hostAlt = EXTERNAL_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')
const URL_RE = new RegExp(`https?://(?:${hostAlt})/[^\\s"'<>\\\\)]+`, 'g')

function hashUrl(url) {
  return createHash('md5').update(url).digest('hex').slice(0, 20)
}

const file = process.argv[2]
if (!file) {
  console.error('Kullanım: node scripts/patch-src-external-images-to-uploads.mjs <dosya>')
  process.exit(1)
}
const full = path.resolve(process.cwd(), file)
let txt = readFileSync(full, 'utf8')
const found = new Set(txt.match(URL_RE) ?? [])
let n = 0
for (const u of found) {
  const local = `/uploads/external/${hashUrl(u)}.avif`
  const parts = txt.split(u)
  n += parts.length - 1
  txt = parts.join(local)
}
writeFileSync(full, txt, 'utf8')
console.log(`${file}: ${found.size} benzersiz URL, ${n} yer değişimi`)
