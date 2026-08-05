#!/usr/bin/env node
/**
 * Üretir: frontend/src/lib/repair-turkish-content-ascii.ts
 * (scripts/lib/bravo-turkish-ascii-repair.mjs ile aynı kalıplar — panel hydrate)
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAVO_TURKISH_ASCII_PAIRS } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../frontend/src/lib/repair-turkish-content-ascii.ts')

const pairsLit = BRAVO_TURKISH_ASCII_PAIRS.map(
  ([a, b]) => `  [${JSON.stringify(a)}, ${JSON.stringify(b)}],`,
).join('\n')

const src = `/**
 * Aktarımda Türkçe harfler ASCII \`?\` olmuş başlık/açıklama metinlerini onarır.
 * Sunucu migration 412 ve scripts/lib/bravo-turkish-ascii-repair.mjs ile aynı kalıplar.
 * Üret: node scripts/generate-repair-turkish-content-ascii-ts.mjs
 */

const CONTENT_ASCII_PAIRS: [string, string][] = [
${pairsLit}
]

export function repairTurkishContentAscii(input: string | null | undefined): string {
  if (input == null) return ''
  let out = String(input)
  for (const [from, to] of CONTENT_ASCII_PAIRS) {
    if (from === to) continue
    if (out.includes(from)) out = out.split(from).join(to)
  }
  return out
}
`

writeFileSync(outPath, src)
console.log(`wrote ${outPath} (${CONTENT_ASCII_PAIRS_LEN()} pairs)`)
function CONTENT_ASCII_PAIRS_LEN() {
  return BRAVO_TURKISH_ASCII_PAIRS.length
}
