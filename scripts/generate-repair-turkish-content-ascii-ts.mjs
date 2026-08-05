#!/usr/bin/env node
/**
 * Üretir: frontend/src/lib/repair-turkish-content-ascii.ts
 * scripts/lib/bravo-turkish-ascii-repair.mjs ile aynı sözlük + sistematik motor.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAVO_TURKISH_ASCII_PAIRS } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../frontend/src/lib/repair-turkish-content-ascii.ts')
const mjsPath = join(__dirname, 'lib/bravo-turkish-ascii-repair.mjs')

const pairsLit = BRAVO_TURKISH_ASCII_PAIRS.map(
  ([a, b]) => `  [${JSON.stringify(a)}, ${JSON.stringify(b)}],`,
).join('\n')

const mjs = readFileSync(mjsPath, 'utf8')
const start = mjs.indexOf('const TR_LETTER')
const end = mjs.indexOf('export function repairBravoTurkishDeep')
if (start < 0 || end < 0) throw new Error('markers not found in bravo-turkish-ascii-repair.mjs')

let body = mjs.slice(start, end)
body = body
  .replace(/export function applySystematicTurkishAsciiRepair/g, 'function applySystematicTurkishAsciiRepair')
  .replace(/BRAVO_TURKISH_ASCII_PAIRS/g, 'CONTENT_ASCII_PAIRS')
  .replace(/export function repairBravoTurkishAscii\(input\) \{[\s\S]*?\n\}\n\n/, '')

const src = `/**
 * Aktarımda Türkçe harfler ASCII \`?\` olmuş başlık/açıklama metinlerini onarır.
 * ç/ğ/ı/ö/ş/ü ve Ç/Ğ/İ/Ö/Ş/Ü (kelime başı + morfoloji).
 * Sunucu migration 416 ve scripts/lib/bravo-turkish-ascii-repair.mjs ile aynı kalıplar.
 * Üret: node scripts/generate-repair-turkish-content-ascii-ts.mjs
 */

const CONTENT_ASCII_PAIRS: [string, string][] = [
${pairsLit}
]

${body}
export function repairTurkishContentAscii(input: string | null | undefined): string {
  if (input == null) return ''
  let out = normalizeApostrophes(String(input))
  if (!out.includes('?') && !out.includes("'")) return out
  out = applyRepairPairs(out)
  if (out.includes('?')) out = applySystematicTurkishAsciiRepair(out)
  if (out.includes('?')) out = applyRepairPairs(out)
  out = out.replace(/Kaş'?n\\b/gi, "Kaş'ın")
  return out
}
`

src = src
  .replace('function escapeRegExp(s) {', 'function escapeRegExp(s: string): string {')
  .replace('function normalizeApostrophes(s) {', 'function normalizeApostrophes(s: string): string {')
  .replace('function applySystematicTurkishAsciiRepair(input) {', 'function applySystematicTurkishAsciiRepair(input: string): string {')
  .replace('function applyRepairPairs(input) {', 'function applyRepairPairs(input: string): string {')
  .replace(/\(_, a, b\) =>/g, '(_: string, a: string, b: string) =>')
  .replace(/\(_, l\) =>/g, '(_: string, l: string) =>')
  .replace(/\(_, pre\) =>/g, '(_: string, pre: string) =>')
  .replace(/\(m\) =>/g, '(m: string) =>')
writeFileSync(outPath, src)
console.log(`wrote ${outPath} (${BRAVO_TURKISH_ASCII_PAIRS.length} pairs)`)
